const form = document.getElementById('loginForm');
const toast = document.getElementById('toast');

const redirectByRole = (role) => {
    const map = {
        Admin: 'admin.html',
        Staff: 'staff.html',
        Resident: 'resident.html'
    };
    window.location.href = map[role] || 'resident.html';
};

const showToast = (message, type = 'error') => {
    if (!toast) return;
    toast.textContent = message;
    toast.style.background = type === 'success' ? 'var(--brand-secondary)' : 'var(--brand-primary)';
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
};

const token = localStorage.getItem('token');
const storedUser = localStorage.getItem('keysiyos:user');
if (token && storedUser) {
    try {
        const parsed = JSON.parse(storedUser);
        if (parsed.role) {
            redirectByRole(parsed.role);
        }
    } catch (error) {
        localStorage.removeItem('token');
        localStorage.removeItem('keysiyos:user');
    }
}

if (form) {
    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const email = form.email.value.trim();
        const password = form.password.value.trim();

        if (!email || !password) {
            showToast('Lütfen tüm alanları doldurun.');
            return;
        }

        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (!response.ok) {
                showToast(data.error || 'Giriş başarısız.');
                return;
            }

            localStorage.setItem('token', data.token);
            localStorage.setItem('keysiyos:user', JSON.stringify(data.user));
            showToast('Giriş başarılı. Yönlendiriliyorsunuz...', 'success');
            setTimeout(() => redirectByRole(data.user.role), 600);
        } catch (error) {
            showToast('Sunucuya bağlanırken hata oluştu.');
        }
    });
}
