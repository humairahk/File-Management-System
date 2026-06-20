// auth.js - Simplified session-based authentication

class AuthManager {
    constructor() {
        this.currentUser = null;
        this.init();
    }

    async init() {
        // Try to restore session from server
        await this.checkSession();
        this.setupEventListeners();
    }

    async checkSession() {
        try {
            const response = await fetch('/api/auth/check-session', {
                credentials: 'include'
            });
            const data = await response.json();
            if (data.authenticated) {
                this.currentUser = data.user;
                // Also store in localStorage for quick access
                localStorage.setItem('fileorganiser_user', JSON.stringify(data.user));
            } else {
                this.currentUser = null;
                localStorage.removeItem('fileorganiser_user');
            }
        } catch (error) {
            console.error('Session check failed:', error);
            this.currentUser = null;
            localStorage.removeItem('fileorganiser_user');
        }
    }

    setupEventListeners() {
        // Login form
        const loginForm = document.getElementById('loginFormElement');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        // Role selection on login page
        const roleOptions = document.querySelectorAll('.role-option');
        roleOptions.forEach(opt => {
            opt.addEventListener('click', () => {
                roleOptions.forEach(o => o.classList.remove('active'));
                opt.classList.add('active');
            });
        });

        // Password toggle
        document.querySelectorAll('.password-toggle').forEach(toggle => {
            toggle.addEventListener('click', function() {
                const input = this.parentElement.querySelector('input');
                const icon = this.querySelector('i');
                if (input.type === 'password') {
                    input.type = 'text';
                    icon.className = 'fas fa-eye-slash';
                } else {
                    input.type = 'password';
                    icon.className = 'fas fa-eye';
                }
            });
        });

        // Logout buttons
        document.querySelectorAll('#logoutBtn').forEach(btn => {
            btn.addEventListener('click', () => this.logout());
        });
    }

    async handleLogin(e) {
        e.preventDefault();

        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const roleElement = document.querySelector('.role-option.active');
        const role = roleElement ? roleElement.dataset.role : 'reader';

        // Disable button and show loading
        const submitBtn = document.getElementById('loginSubmit');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing In...';
        submitBtn.disabled = true;

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, role }),
                credentials: 'include'
            });

            const data = await response.json();

            if (data.success) {
                this.currentUser = data.user;
                localStorage.setItem('fileorganiser_user', JSON.stringify(data.user));
                Utils.showNotification('Login successful! Redirecting...', 'success');

                // Redirect based on role
                setTimeout(() => {
                    if (data.user.role === 'admin') {
                        window.location.href = 'admin-dashboard.html';
                    } else {
                        window.location.href = 'reader-dashboard.html';
                    }
                }, 1000);
            } else {
                Utils.showNotification(data.message || 'Login failed', 'error');
            }
        } catch (error) {
            Utils.showNotification('Connection error. Please try again.', 'error');
        } finally {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    }

    async logout() {
        await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
        this.currentUser = null;
        localStorage.removeItem('fileorganiser_user');
        window.location.href = 'index.html';
    }

    getCurrentUser() {
        if (!this.currentUser) {
            const saved = localStorage.getItem('fileorganiser_user');
            if (saved) {
                try {
                    this.currentUser = JSON.parse(saved);
                } catch {
                    this.currentUser = null;
                }
            }
        }
        return this.currentUser;
    }

    isAuthenticated() {
        return !!this.getCurrentUser();
    }

    isAdmin() {
        const user = this.getCurrentUser();
        return user && user.role === 'admin';
    }
}

// Initialize auth manager
window.authManager = new AuthManager();