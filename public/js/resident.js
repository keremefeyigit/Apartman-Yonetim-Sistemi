const token = localStorage.getItem('token');
const user = (() => {
    try {
        return JSON.parse(localStorage.getItem('keysiyos:user') || '{}');
    } catch (error) {
        return null;
    }
})();

if (!token || !user || user.role !== 'Resident') {
    window.location.href = 'index.html';
}

const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
const toast = document.getElementById('residentToast');
const residentName = document.getElementById('residentName');
const apartmentInfo = document.getElementById('apartmentInfo');
const ticketsContainer = document.getElementById('residentTickets');
const issuesContainer = document.getElementById('commonIssues');
const categoryFilter = document.getElementById('categoryFilter');
const statusFilter = document.getElementById('statusFilter');
const createTicketForm = document.getElementById('createTicketForm');
const quickTicketForm = document.getElementById('quickTicketForm');
const ticketModal = document.getElementById('ticketModal');
const openTicketModalBtn = document.getElementById('openTicketModal');
const logoutBtn = document.getElementById('logoutBtn');
const triggerUpload = document.getElementById('triggerUpload');
const attachmentInput = document.getElementById('ticketAttachments');
const attachmentPreview = document.getElementById('attachmentPreview');
const stepIndicators = Array.from(document.querySelectorAll('.step')); 
const navItems = document.querySelectorAll('.nav-item[data-target]');

if (residentName) {
    residentName.textContent = user.full_name;
}

if (apartmentInfo) {
    if (user.apartment) {
        apartmentInfo.textContent = `${user.apartment.block_name} • Kapı ${user.apartment.door_number}`;
    } else {
        apartmentInfo.textContent = 'Daire bilgisi tanımlı değil';
    }
}

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
        localStorage.removeItem('token');
        localStorage.removeItem('siyos:user');
        window.location.href = 'index.html';
        return null;
    }

    return response;
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
    const cls = map[status] || 'status-open';
    const labelMap = {
        Open: 'Yeni',
        Assigned: 'Atandı',
        In_Progress: 'İşlemde',
        Pending: 'Beklemede',
        Resolved: 'Çözüldü',
        Closed: 'Kapandı'
    };
    return `<span class="status-badge ${cls}">${labelMap[status] || status}</span>`;
};

const renderPriority = (priority) => {
    const map = {
        Low: 'muted',
        Medium: 'status-assigned',
        High: 'status-in-progress',
        Critical: 'status-critical'
    };
    const cls = map[priority] || 'muted';
    return `<span class="pill ${cls === 'muted' ? '' : cls}">${priority}</span>`;
};

const ratingTemplate = (ticket) => {
    if (!['Resolved', 'Closed'].includes(ticket.status) || ticket.satisfaction_score) {
        return '';
    }
    return `
        <div class="form-group">
            <label>Memnuniyet</label>
            <div class="rating" data-ticket="${ticket.id}">
                ${[1, 2, 3, 4, 5].map((value) => `<button type="button" class="btn btn-ghost" data-rate="${value}">${value}★</button>`).join('')}
            </div>
        </div>
    `;
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

const buildTicketCard = (ticket) => `
    <article class="ticket-card" data-id="${ticket.id}" data-status="${escapeHtml(ticket.status)}" data-category="${ticket.category_id}">
        <div class="ticket-meta">
            ${renderStatus(ticket.status)}
            ${renderPriority(ticket.priority)}
            <span>${escapeHtml(ticket.category_name || 'Kategori yok')}</span>
            <span>${new Date(ticket.created_at).toLocaleString('tr-TR')}</span>
        </div>
        <h3>${escapeHtml(ticket.title)}</h3>
        <p class="muted">${escapeHtml(ticket.description)}</p>
        <div class="muted">Atanan: ${escapeHtml(ticket.assigned_full_name || 'Henüz atanmadı')}</div>
        ${ticket.attachments && ticket.attachments.length ? `<div class="attachment-list">${ticket.attachments.map((name) => `<span class="pill">${escapeHtml(name)}</span>`).join('')}</div>` : ''}
        ${ratingTemplate(ticket)}
    </article>
`;

const buildIssueCard = (issue) => `
    <article class="ticket-card">
        <div class="ticket-meta">
            ${renderStatus(issue.status)}
            ${renderPriority(issue.priority)}
        </div>
        <h3>${escapeHtml(issue.title)}</h3>
        <p class="muted">${escapeHtml(issue.category_name || '')} • ${issue.block_name ? `${escapeHtml(issue.block_name)}${issue.door_number ? ' - Kapı ' + escapeHtml(issue.door_number) : ''}` : 'Genel'}</p>
        <span class="muted">${new Date(issue.created_at).toLocaleString('tr-TR')}</span>
    </article>
`;

let cachedTickets = [];
let cachedCategories = [];

const loadCategories = async () => {
    const response = await fetchWithAuth('/api/resident/categories');
    if (!response) return;
    const data = await response.json();
    cachedCategories = data.categories || [];

    const targets = [categoryFilter, document.getElementById('ticketCategory'), document.getElementById('quickCategory')];
    targets.forEach((select) => {
        if (!select) return;
        select.innerHTML = '';
        if (select === categoryFilter) {
            const defaultOption = document.createElement('option');
            defaultOption.value = '';
            defaultOption.textContent = 'Tümü';
            select.appendChild(defaultOption);
        }
        cachedCategories.forEach((cat) => {
            const option = document.createElement('option');
            option.value = cat.id;
            option.textContent = `${cat.name} (${cat.sla_hours} saat)`;
            select.appendChild(option);
        });
    });
};

const renderTickets = () => {
    if (!ticketsContainer) return;
    const statusValue = statusFilter ? statusFilter.value : '';
    const categoryValue = categoryFilter ? Number(categoryFilter.value) : '';

    const filtered = cachedTickets.filter((ticket) => {
        const statusMatch = !statusValue || ticket.status === statusValue;
        const categoryMatch = !categoryValue || ticket.category_id === categoryValue;
        return statusMatch && categoryMatch;
    });

    ticketsContainer.innerHTML = filtered.length
        ? filtered.map(buildTicketCard).join('')
        : '<div class="card">Henüz talebiniz bulunmuyor.</div>';

    document.querySelectorAll('.rating button').forEach((btn) => {
        btn.addEventListener('click', onRateClick);
    });
};

const loadTickets = async () => {
    const response = await fetchWithAuth('/api/resident/tickets');
    if (!response) return;
    const data = await response.json();
    cachedTickets = (data.tickets || []).map((ticket) => ({
        ...ticket,
        attachments: ticket.attachments || []
    }));
    renderTickets();
};

const loadCommonIssues = async () => {
    const response = await fetchWithAuth('/api/resident/common-issues');
    if (!response) return;
    const data = await response.json();
    if (!issuesContainer) return;
    const issues = data.issues || [];
    issuesContainer.innerHTML = issues.length
        ? issues.map(buildIssueCard).join('')
        : '<div class="muted">Şu anda paylaşılan bir genel sorun bulunmuyor.</div>';
};

const readAttachments = async (files) => {
    const maxFiles = 3;
    const selected = Array.from(files).slice(0, maxFiles);
    if (attachmentPreview) {
        attachmentPreview.textContent = selected.length
            ? selected.map((file) => file.name).join(', ')
            : 'Seçilen dosya yok.';
    }

    return selected.map((file) => file.name);
};

const onRateClick = async (event) => {
    const score = event.currentTarget.dataset.rate;
    const ticketId = event.currentTarget.closest('.rating').dataset.ticket;
    const response = await fetchWithAuth(`/api/resident/tickets/${ticketId}/rate`, {
        method: 'POST',
        body: JSON.stringify({ score })
    });
    if (!response) return;
    const data = await response.json();
    if (!response.ok) {
        showToast(data.error || 'Puanlama yapılamadı.');
        return;
    }
    showToast('Teşekkürler! Geri bildiriminiz kaydedildi.', 'success');
    loadTickets();
};

const handleCreateTicket = async (event) => {
    event.preventDefault();
    const payload = {
        category_id: Number(document.getElementById('ticketCategory').value),
        priority: document.getElementById('ticketPriority').value,
        title: document.getElementById('ticketTitle').value.trim(),
        description: document.getElementById('ticketDescription').value.trim(),
        attachments: attachmentInput && attachmentInput.files ? await readAttachments(attachmentInput.files) : []
    };

    const response = await fetchWithAuth('/api/resident/tickets', {
        method: 'POST',
        body: JSON.stringify(payload)
    });

    if (!response) return;
    const data = await response.json();
    if (!response.ok) {
        showToast(data.error || 'Talep oluşturulamadı.');
        return;
    }

    showToast('Talebiniz iletildi.', 'success');
    createTicketForm.reset();
    attachmentPreview.textContent = '';
    loadTickets();
};

const handleQuickTicket = async (event) => {
    event.preventDefault();
    const payload = {
        category_id: Number(document.getElementById('quickCategory').value),
        title: document.getElementById('quickTitle').value.trim(),
        description: document.getElementById('quickDescription').value.trim(),
        priority: 'Medium',
        attachments: []
    };

    const response = await fetchWithAuth('/api/resident/tickets', {
        method: 'POST',
        body: JSON.stringify(payload)
    });

    if (!response) return;
    const data = await response.json();
    if (!response.ok) {
        showToast(data.error || 'Talep oluşturulamadı.');
        return;
    }

    showToast('Talebiniz iletildi.', 'success');
    quickTicketForm.reset();
    toggleModal(false);
    loadTickets();
};

const toggleModal = (open) => {
    if (!ticketModal) return;
    ticketModal.classList.toggle('open', open);
};

const initNavigation = () => {
    navItems.forEach((item) => {
        item.addEventListener('click', () => {
            navItems.forEach((i) => i.classList.remove('active'));
            item.classList.add('active');
            const target = item.dataset.target;
            document.querySelectorAll('main section').forEach((section) => {
                section.style.display = section.id === target ? 'grid' : 'none';
            });
        });
    });
};

const initStepIndicator = () => {
    const groups = createTicketForm ? Array.from(createTicketForm.querySelectorAll('[data-step]')) : [];
    groups.forEach((group) => {
        const stepValue = Number(group.dataset.step);
        group.addEventListener('focusin', () => {
            stepIndicators.forEach((step, index) => {
                step.classList.toggle('active', index < stepValue);
            });
        });
    });
};

const init = async () => {
    initNavigation();
    initStepIndicator();

    await loadCategories();
    await loadTickets();
    await loadCommonIssues();
};

if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        localStorage.clear();
        window.location.href = 'index.html';
    });
}

if (statusFilter) statusFilter.addEventListener('change', renderTickets);
if (categoryFilter) categoryFilter.addEventListener('change', renderTickets);
if (createTicketForm) createTicketForm.addEventListener('submit', handleCreateTicket);
if (quickTicketForm) quickTicketForm.addEventListener('submit', handleQuickTicket);
if (openTicketModalBtn) openTicketModalBtn.addEventListener('click', () => toggleModal(true));
if (ticketModal) {
    ticketModal.addEventListener('click', (event) => {
        if (event.target.dataset.close !== undefined || event.target === ticketModal) {
            toggleModal(false);
        }
    });
}
if (triggerUpload && attachmentInput) {
    triggerUpload.addEventListener('click', () => attachmentInput.click());
    attachmentInput.addEventListener('change', () => readAttachments(attachmentInput.files));
}

init();
