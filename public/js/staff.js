const token = localStorage.getItem('token');
const user = (() => {
    try {
        return JSON.parse(localStorage.getItem('keysiyos:user') || '{}');
    } catch (error) {
        return null;
    }
})();

if (!token || !user || user.role !== 'Staff') {
    window.location.href = 'index.html';
}

const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
const toast = document.getElementById('staffToast');
const staffName = document.getElementById('staffName');
const staffStats = document.getElementById('staffStats');
const staffTickets = document.getElementById('staffTickets');
const logoutBtn = document.getElementById('staffLogout');

if (staffName) staffName.textContent = user.full_name;

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

const statusBadge = (status) => {
    const map = {
        Assigned: 'status-assigned',
        In_Progress: 'status-in-progress',
        Pending: 'status-assigned',
        Resolved: 'status-resolved'
    };
    const label = {
        Assigned: 'Atandı',
        In_Progress: 'İşlemde',
        Pending: 'Beklemede',
        Resolved: 'Çözüldü'
    }[status] || status;

    return `<span class="status-badge ${map[status] || 'status-open'}">${label}</span>`;
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

const renderTickets = (tickets) => {
    if (!staffTickets) return;
    staffTickets.innerHTML = tickets.length ? tickets.map((ticket) => `
        <div class="card" style="padding:20px; gap:12px;" data-ticket="${ticket.id}">
            <div class="ticket-meta">
                ${statusBadge(ticket.status)}
                <span>${escapeHtml(ticket.category_name || 'Kategori yok')}</span>
                <span>${ticket.block_name ? `${escapeHtml(ticket.block_name)} • Kapı ${escapeHtml(ticket.door_number || '-')}` : 'Genel'}</span>
            </div>
            <h3>${escapeHtml(ticket.title)}</h3>
            <p class="muted">${escapeHtml(ticket.description)}</p>
            <textarea class="note" rows="3" placeholder="Not bırakın (isteğe bağlı)"></textarea>
            <div class="form-grid" style="grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));">
                <button class="btn btn-secondary" data-action="In_Progress">İşe Başla</button>
                <button class="btn btn-primary" data-action="Resolved">Tamamlandı</button>
                <button class="btn btn-ghost" data-action="Pending">Beklemeye Al</button>
            </div>
        </div>
    `).join('') : '<div class="muted">Size atanmış aktif görev bulunmuyor.</div>';

    staffTickets.querySelectorAll('.card').forEach((card) => {
        card.querySelectorAll('[data-action]').forEach((btn) => {
            btn.addEventListener('click', () => {
                const ticketId = card.dataset.ticket;
                const note = card.querySelector('.note').value.trim();
                updateTicketStatus(ticketId, btn.dataset.action, note);
            });
        });
    });

    if (staffStats) {
        const inProgress = tickets.filter((ticket) => ticket.status === 'In_Progress').length;
        staffStats.textContent = `${tickets.length} görev • ${inProgress} işlemde`;
    }
};

const loadTickets = async () => {
    const response = await fetchWithAuth('/api/staff/tickets');
    if (!response) return;
    const data = await response.json();
    renderTickets(data.tickets || []);
};

const updateTicketStatus = async (ticketId, status, note) => {
    const response = await fetchWithAuth(`/api/staff/tickets/${ticketId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status, note })
    });
    if (!response) return;
    const data = await response.json();
    if (!response.ok) {
        showToast(data.error || 'Durum güncellenemedi.');
        return;
    }
    showToast('Durum kaydedildi.', 'success');
    loadTickets();
};

if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        localStorage.clear();
        window.location.href = 'index.html';
    });
}

loadTickets();
