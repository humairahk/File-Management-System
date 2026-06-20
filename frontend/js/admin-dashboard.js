// SIMPLIFIED ADMIN DASHBOARD

class AdminDashboard {
    constructor() {
        this.authManager = window.authManager;
        
        // Check authentication
        if (!this.authManager.isAuthenticated()) {
            window.location.href = 'login.html';
            return;
        }
        
        if (!this.authManager.isAdmin()) {
            window.location.href = 'reader-dashboard.html';
            return;
        }
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.loadUserInfo();
        this.loadStats();
        this.loadFiles();
    }
    
    setupEventListeners() {
        // Logout
        document.getElementById('logoutBtn')?.addEventListener('click', () => {
            this.authManager.logout();
        });
        
        // Upload button
        document.getElementById('uploadBtn')?.addEventListener('click', () => {
            window.location.href = 'upload.html';
        });
        
        // Audit logs button
        document.getElementById('auditLogsBtn')?.addEventListener('click', () => {
            window.location.href = 'audit-logs.html';
        });
        
        // Refresh button
        document.getElementById('refreshBtn')?.addEventListener('click', () => {
            this.loadStats();
            this.loadFiles();
        });
        
        // Theme toggle
        document.getElementById('themeToggle')?.addEventListener('click', function() {
            document.body.classList.toggle('dark-mode');
            const isDark = document.body.classList.contains('dark-mode');
            this.innerHTML = isDark ? 
                '<i class="fas fa-sun"></i> Light Mode' : 
                '<i class="fas fa-moon"></i> Dark Mode';
            localStorage.setItem('darkMode', isDark);
        });
        
        // Restore theme
        if (localStorage.getItem('darkMode') === 'true') {
            document.body.classList.add('dark-mode');
            document.getElementById('themeToggle').innerHTML = '<i class="fas fa-sun"></i> Light Mode';
        }
    }
    
    loadUserInfo() {
        const user = this.authManager.getCurrentUser();
        if (user) {
            document.getElementById('userName').textContent = user.name;
            document.getElementById('userEmail').textContent = user.email;
        }
    }
    
    async loadStats() {
        try {
            const response = await Utils.request('/stats');
            if (response.success) {
                this.updateStats(response.stats);
            }
        } catch (error) {
            console.error('Error loading stats:', error);
        }
    }
    
    updateStats(stats) {
        const container = document.getElementById('statsContainer');
        if (!container) return;
        
        container.innerHTML = `
            <div class="stat-card">
                <div class="stat-icon"><i class="fas fa-file-pdf"></i></div>
                <div class="stat-info">
                    <h3>${stats.total_files}</h3>
                    <p>Total Files</p>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon"><i class="fas fa-upload"></i></div>
                <div class="stat-info">
                    <h3>${stats.today_uploads}</h3>
                    <p>Today's Uploads</p>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon"><i class="fas fa-database"></i></div>
                <div class="stat-info">
                    <h3>${stats.total_storage_mb} MB</h3>
                    <p>Storage Used</p>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon"><i class="fas fa-folder"></i></div>
                <div class="stat-info">
                    <h3>4</h3>
                    <p>Categories</p>
                </div>
            </div>
        `;
    }
    
    async loadFiles() {
        try {
            const response = await Utils.request('/files');
            if (response.success) {
                this.displayRecentFiles(response.files);
                this.displayAllFiles(response.files);
            }
        } catch (error) {
            console.error('Error loading files:', error);
        }
    }
    
    displayRecentFiles(files) {
        const container = document.getElementById('recentFiles');
        if (!container) return;
        
        if (!files || files.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-inbox"></i>
                    <p>No files uploaded yet</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = files.slice(0, 5).map(file => `
            <div class="recent-file">
                <div class="file-icon"><i class="fas fa-file-pdf"></i></div>
                <div class="file-info">
                    <h4>${file.original_name || 'Sample File'}</h4>
                    <p class="file-meta">
                        <span class="file-number">${file.file_number || 'LR0001'}</span>
                        <span class="file-category">${file.category || 'Letters'}</span>
                    </p>
                </div>
            </div>
        `).join('');
    }
    
    displayAllFiles(files) {
        const container = document.getElementById('filesContainer');
        if (!container) return;
        
        if (!files || files.length === 0) {
            container.innerHTML = `
                <div class="empty-state" style="grid-column: 1/-1;">
                    <i class="fas fa-folder-open"></i>
                    <p>No files found</p>
                    <p class="empty-subtext">Click "Upload Files" to add your first document</p>
                </div>
            `;
            return;
        }
    }
}

// Initialize dashboard
document.addEventListener('DOMContentLoaded', () => {
    window.dashboard = new AdminDashboard();
});