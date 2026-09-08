const token = localStorage.getItem('token');
const user = (() => {
    try {
        return JSON.parse(localStorage.getItem('keysiyos:user') || '{}');
    } catch (error) {
        return null;
    }
})();

if (!token || !user || user.role !== 'Admin') {
    window.location.href = 'index.html';
}

const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
const toast = document.getElementById('adminToast');
const adminName = document.getElementById('adminName');
const adminDate = document.getElementById('adminDate');
const kpiContainer = document.getElementById('kpiContainer');
const categoryChartBody = document.getElementById('categoryChartBody');
const heatmapBody = document.getElementById('heatmapBody');
const staffPerformanceBody = document.getElementById('staffPerformanceBody');
const ticketsTable = document.getElementById('ticketsTable');
const ticketStatusFilter = document.getElementById('ticketStatusFilter');
const categoryList = document.getElementById('categoryList');
const categoryForm = document.getElementById('categoryForm');
const assignModal = document.getElementById('assignModal');
const assignForm = document.getElementById('assignForm');
const assignTicketId = document.getElementById('assignTicketId');
const assignStaffSelect = document.getElementById('assignStaff');
const assignNote = document.getElementById('assignNote');
const logoutBtn = document.getElementById('adminLogout');
const usersTable = document.getElementById('usersTable');
const navItems = document.querySelectorAll('.nav-item[data-target]');

if (adminName) adminName.textContent = user.full_name;
if (adminDate) adminDate.textContent = new Date().toLocaleDateString('tr-TR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

const showToast = (message, type = 'info') => {
    if (!toast) return;
    toast.textContent = message;
    toast.style.background = type === 'success' ? 'var(--brand-secondary)' : 'var(--brand-primary)';
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2600);
};

const fetchWithAuth = async (url, options = {}) => {
    const response = await fetch(url, {
        ...options,
        headers: { ...headers, ...(options.headers || {}) }
    });

    if (response.status === 401 || response.status === 403) {
        localStorage.clear();
        window.location.href = 'index.html';
        return null;
    }

    return response;
};

const escapeHtml = (str) => {
    if (str == null) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
};

const renderKpis = (kpis) => {
    if (!kpiContainer) return;
    const labels = {
        openTickets: 'Açık Talep',
        avgResolutionHours: 'Ort. Çözüm Süresi (saat)',
        lastSevenDays: '7 Günlük Yeni Talep',
        criticalTickets: 'Kritik Talepler'
    };
    kpiContainer.innerHTML = Object.entries(kpis || {}).map(([key, value]) => `
        <div class="card kpi-card">
            <span class="muted">${labels[key] || key}</span>
            <span class="value">${value ?? 0}</span>
        </div>
    `).join('');
};

const renderProgressList = (items, total) => {
    const max = total || items.reduce((sum, item) => sum + Number(item.count || 0), 0) || 1;
    return items.map((item) => {
        const percent = Math.round(((item.count || 0) / max) * 100);
        const title = escapeHtml(item.category_name || item.block_name || item.staff_name);
        return `
            <div class="card" style="padding:16px; gap:8px;">
                <div class="form-group">
                    <strong>${title}</strong>
                    <span class="muted">${item.count ?? item.total ?? 0} kayıt</span>
                </div>
                <div style="height:6px; background:var(--surface-200); border-radius:999px; overflow:hidden;">
                    <div style="width:${percent}%; height:100%; background:var(--brand-primary);"></div>
                </div>
            </div>
        `;
    }).join('');
};

const loadDashboard = async () => {
    const response = await fetchWithAuth('/api/admin/dashboard');
    if (!response) return;
    const data = await response.json();
    renderKpis(data.kpis);

    if (categoryChartBody) {
        categoryChartBody.innerHTML = renderProgressList(data.categoryDistribution || []);
        const total = (data.categoryDistribution || []).reduce((sum, item) => sum + Number(item.count || 0), 0);
        const totalElement = document.getElementById('categoryTotal');
        if (totalElement) totalElement.textContent = `${total} kayıt`;
    }

    if (heatmapBody) {
        heatmapBody.innerHTML = renderProgressList(data.blockHeatmap || []);
    }

    if (staffPerformanceBody) {
        staffPerformanceBody.innerHTML = (data.staffPerformance || []).map((item) => `
            <div class="card" style="padding:16px; gap:6px;">
                <strong>${escapeHtml(item.staff_name || 'Tanımsız')}</strong>
                <span class="muted">${(item.avg_hours || 0).toFixed ? item.avg_hours.toFixed(1) : Number(item.avg_hours || 0).toFixed(1)} saat</span>
                <span class="muted">${item.total || 0} talep</span>
            </div>
        `).join('');
    }
};

let staffUsers = [];

const loadUsers = async () => {
    const response = await fetchWithAuth('/api/admin/users');
    if (!response) return;
    const data = await response.json();
    const users = data.users || [];

    staffUsers = users.filter((item) => item.role === 'Staff');

    if (usersTable) {
        usersTable.innerHTML = users.map((item) => `
            <div class="card" style="padding:16px;">
                <strong>${escapeHtml(item.full_name)}</strong>
                <div class="muted">${escapeHtml(item.email)}</div>
                <div class="muted">${escapeHtml(item.role)}</div>
                <div class="muted">${item.block_name ? `${escapeHtml(item.block_name)} / Kapı ${escapeHtml(item.door_number || '-')}` : 'Daire ataması yok'}</div>
            </div>
        `).join('');
    }

    if (assignStaffSelect) {
        assignStaffSelect.innerHTML = staffUsers.map((staff) => `
            <option value="${staff.id}">${escapeHtml(staff.full_name)}</option>
        `).join('');
    }
};

const renderTickets = (tickets) => {
    if (!ticketsTable) return;
    ticketsTable.innerHTML = tickets.length ? tickets.map((ticket) => `
        <div class="card" style="padding:20px; gap:12px;" data-ticket="${ticket.id}">
            <div class="ticket-meta">
                ${escapeHtml(ticket.category_name || 'Kategori yok')}
                ${renderStatus(ticket.status)}
                ${renderPriority(ticket.priority)}
                <span>${ticket.block_name ? escapeHtml(ticket.block_name) : 'Genel'}</span>
            </div>
            <h3>${escapeHtml(ticket.title)}</h3>
            <p class="muted">${escapeHtml(ticket.description)}</p>
            <div class="muted">Talep Sahibi: ${escapeHtml(ticket.requester_name)}</div>
            <div class="muted">Atanan: ${escapeHtml(ticket.assigned_full_name || 'Henüz atanmadı')}</div>
            <div class="form-grid" style="grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));">
                <button class="btn btn-secondary" data-assign="${ticket.id}">Atama Yap</button>
                <select class="status-select" data-id="${ticket.id}">
                    ${['Open', 'Assigned', 'In_Progress', 'Pending', 'Resolved', 'Closed'].map((status) => `
                        <option value="${status}" ${status === ticket.status ? 'selected' : ''}>${status}</option>
                    `).join('')}
                </select>
            </div>
        </div>
    `).join('') : '<div class="muted">Seçilen süzgece göre talep bulunmuyor.</div>';

    ticketsTable.querySelectorAll('[data-assign]').forEach((btn) => {
        btn.addEventListener('click', () => openAssignModal(btn.dataset.assign));
    });

    ticketsTable.querySelectorAll('.status-select').forEach((select) => {
        select.addEventListener('change', () => updateTicketStatus(select.dataset.id, select.value));
    });
};

const renderStatus = (status) => {
    const map = {
        Open: 'status-open',
        Assigned: 'status-assigned',
        In_Progress: 'status-in-progress',
        Pending: 'status-assigned',
        Resolved: 'status-resolved',
        Closed: 'status-closed'
    };
    const labelMap = {
        Open: 'Yeni',
        Assigned: 'Atandı',
        In_Progress: 'İşlemde',
        Pending: 'Beklemede',
        Resolved: 'Çözüldü',
        Closed: 'Kapandı'
    };
    return `<span class="status-badge ${map[status] || 'status-open'}">${labelMap[status] || status}</span>`;
};

const renderPriority = (priority) => {
    const map = {
        Low: 'muted',
        Medium: 'status-assigned',
        High: 'status-in-progress',
        Critical: 'status-critical'
    };
    return `<span class="pill ${map[priority] || ''}">${priority}</span>`;
};

const loadTickets = async () => {
    const status = ticketStatusFilter ? ticketStatusFilter.value : '';
    const query = status ? `?status=${encodeURIComponent(status)}` : '';
    const response = await fetchWithAuth(`/api/admin/tickets${query}`);
    if (!response) return;
    const data = await response.json();
    renderTickets(data.tickets || []);
};

const loadCategories = async () => {
    const response = await fetchWithAuth('/api/admin/categories');
    if (!response) return;
    const data = await response.json();
    const categories = data.categories || [];

    if (categoryList) {
        categoryList.innerHTML = categories.length ? categories.map((cat) => `
            <div class="card" style="padding:16px;">
                <strong>${escapeHtml(cat.name)}</strong>
                <div class="muted">SLA: ${cat.sla_hours} saat</div>
            </div>
        `).join('') : '<div class="muted">Henüz kategori yok.</div>';
    }
};

const openAssignModal = (ticketId) => {
    if (!assignModal) return;
    assignTicketId.value = ticketId;
    assignModal.classList.add('open');
};

const closeAssignModal = () => {
    if (!assignModal) return;
    assignModal.classList.remove('open');
    assignTicketId.value = '';
    assignNote.value = '';
};

const updateTicketStatus = async (ticketId, status) => {
    const response = await fetchWithAuth(`/api/admin/tickets/${ticketId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status })
    });
    if (!response) return;
    const data = await response.json();
    if (!response.ok) {
        showToast(data.error || 'Durum güncellenemedi.');
        return;
    }
    showToast('Durum güncellendi.', 'success');
    loadTickets();
    loadDashboard();
};

const initNavigation = () => {
    navItems.forEach((item) => {
        item.addEventListener('click', () => {
            if (item.id === 'adminLogout') return;
            navItems.forEach((i) => i.classList.remove('active'));
            item.classList.add('active');
            const target = item.dataset.target;
            document.querySelectorAll('main section').forEach((section) => {
                section.style.display = section.id === target ? 'grid' : 'none';
            });
        });
    });
};

const init = async () => {
    initNavigation();
    await loadDashboard();
    await loadUsers();
    await loadCategories();
    await loadTickets();
};

if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        localStorage.clear();
        window.location.href = 'index.html';
    });
}

if (ticketStatusFilter) {
    ticketStatusFilter.addEventListener('change', loadTickets);
}

if (categoryForm) {
    categoryForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const payload = {
            name: document.getElementById('categoryName').value.trim(),
            sla_hours: Number(document.getElementById('categorySla').value || 24)
        };
        const response = await fetchWithAuth('/api/admin/categories', {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        if (!response) return;
        const data = await response.json();
        if (!response.ok) {
            showToast(data.error || 'Kategori eklenemedi.');
            return;
        }
        categoryForm.reset();
        showToast('Kategori eklendi.', 'success');
        loadCategories();
    });
}

if (assignModal) {
    assignModal.addEventListener('click', (event) => {
        if (event.target.dataset.close !== undefined || event.target === assignModal) {
            closeAssignModal();
        }
    });
}

if (assignForm) {
    assignForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const ticketId = assignTicketId.value;
        const payload = {
            staff_id: assignStaffSelect.value,
            note: assignNote.value.trim()
        };
        const response = await fetchWithAuth(`/api/admin/tickets/${ticketId}/assign`, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        if (!response) return;
        const data = await response.json();
        if (!response.ok) {
            showToast(data.error || 'Atama yapılamadı.');
            return;
        }
        showToast('Atama tamamlandı.', 'success');
        closeAssignModal();
        loadTickets();
        loadDashboard();
    });
}

init();
