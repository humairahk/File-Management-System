// Reader Dashboard JavaScript

class ReaderDashboard {
    constructor() {
        this.authManager = window.authManager || new AuthManager();
        this.currentPage = 1;
        this.perPage = 20;
        this.currentCategory = '';
        this.searchTerm = '';
        this.sortBy = 'newest';
        
        this.initializeDashboard();
    }
    
    initializeDashboard() {
        // Check authentication
        if (!this.authManager.isAuthenticated()) {
            window.location.href = 'login.html';
            return;
        }
        
        // Check if reader
        if (this.authManager.isAdmin()) {
            window.location.href = 'admin-dashboard.html';
            return;
        }
        
        this.initializeEventListeners();
        this.loadDashboardData();
        this.loadFiles();
        this.updateUserInfo();
    }
    
    initializeEventListeners() {
        // Logout button
        document.getElementById('logoutBtn')?.addEventListener('click', () => {
            this.authManager.logout();
        });
        
        // Search input
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', Utils.debounce(() => {
                this.searchTerm = searchInput.value;
                this.currentPage = 1;
                this.loadFiles();
            }, 300));
        }
        
        // Search button
        document.getElementById('searchBtn')?.addEventListener('click', () => {
            const searchInput = document.getElementById('searchInput');
            this.searchTerm = searchInput.value;
            this.currentPage = 1;
            this.loadFiles();
        });
        
        // Category filter
        document.getElementById('categoryFilter')?.addEventListener('change', (e) => {
            this.currentCategory = e.target.value;
            this.currentPage = 1;
            this.loadFiles();
            this.updateFilesSectionTitle();
        });
        
        // Sort filter
        document.getElementById('sortFilter')?.addEventListener('change', (e) => {
            this.sortBy = e.target.value;
            this.loadFiles();
        });
        
        // Pagination
        document.getElementById('prevPage')?.addEventListener('click', () => {
            if (this.currentPage > 1) {
                this.currentPage--;
                this.loadFiles();
            }
        });
        
        document.getElementById('nextPage')?.addEventListener('click', () => {
            this.currentPage++;
            this.loadFiles();
        });
        
        // Refresh button
        document.getElementById('refreshBtn')?.addEventListener('click', () => {
            this.loadDashboardData();
            this.loadFiles();
        });
        
        // Category cards
        document.addEventListener('click', (e) => {
            const categoryCard = e.target.closest('.category-card');
            if (categoryCard) {
                const category = categoryCard.dataset.category;
                this.filterByCategory(category);
            }
        });
        
        // Theme toggle
        const themeToggle = document.getElementById('themeToggle');
        const darkModeStyle = document.getElementById('dark-mode-style');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                const isDark = darkModeStyle.disabled;
                darkModeStyle.disabled = !isDark;
                themeToggle.innerHTML = isDark ? 
                    '<i class="fas fa-sun"></i> Light Mode' : 
                    '<i class="fas fa-moon"></i> Dark Mode';
                localStorage.setItem('darkMode', isDark);
                document.body.classList.toggle('dark-mode', !isDark);
            });
            
            // Restore theme
            if (localStorage.getItem('darkMode') === 'true') {
                darkModeStyle.disabled = false;
                themeToggle.innerHTML = '<i class="fas fa-sun"></i> Light Mode';
                document.body.classList.add('dark-mode');
            }
        }
        
        // Navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', () => {
                const view = item.dataset.view;
                this.switchView(view);
            });
        });
    }
    
    updateUserInfo() {
        const user = this.authManager.getCurrentUser();
        if (user) {
            const userName = document.getElementById('userName');
            const userEmail = document.getElementById('userEmail');
            
            if (userName) userName.textContent = user.name;
            if (userEmail) userEmail.textContent = user.email;
        }
    }
    
    async loadDashboardData() {
        try {
            // Load stats
            const statsResponse = await Utils.request('/stats');
            if (statsResponse.success) {
                this.updateStats(statsResponse.stats);
            }
            
            // Load categories
            const categoriesResponse = await Utils.request('/categories');
            if (categoriesResponse.success) {
                this.updateCategories(categoriesResponse.categories);
                this.updateCategoryFilter(categoriesResponse.categories);
            }
            
        } catch (error) {
            console.error('Error loading dashboard data:', error);
        }
    }
    
    updateStats(stats) {
        const statsContainer = document.getElementById('statsContainer');
        if (!statsContainer) return;
        
        statsContainer.innerHTML = `
            <div class="stat-card">
                <div class="stat-icon">
                    <i class="fas fa-file-pdf"></i>
                </div>
                <div class="stat-info">
                    <h3>${stats.total_files}</h3>
                    <p>Total Documents</p>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">
                    <i class="fas fa-folder"></i>
                </div>
                <div class="stat-info">
                    <h3>${Object.keys(stats.category_stats).length}</h3>
                    <p>Categories</p>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">
                    <i class="fas fa-database"></i>
                </div>
                <div class="stat-info">
                    <h3>${stats.total_storage_mb} MB</h3>
                    <p>Total Size</p>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">
                    <i class="fas fa-clock"></i>
                </div>
                <div class="stat-info">
                    <h3>${stats.today_uploads}</h3>
                    <p>New Today</p>
                </div>
            </div>
        `;
    }
    
    updateCategories(categories) {
        const categoriesContainer = document.getElementById('categoriesContainer');
        if (!categoriesContainer) return;
        
        if (!categories || categories.length === 0) {
            categoriesContainer.innerHTML = `
                <div class="empty-state" style="grid-column: 1/-1;">
                    <i class="fas fa-folder-open"></i>
                    <p>No categories found</p>
                </div>
            `;
            return;
        }
        
        categoriesContainer.innerHTML = categories.map(cat => {
            const prefix = cat.prefix || this.getCategoryPrefix(cat.name);
            return `
                <div class="category-card" data-category="${cat.name}">
                    <div class="category-icon">
                        <i class="${this.getCategoryIcon(cat.name)}"></i>
                    </div>
                    <h3>${cat.name}</h3>
                    <div class="category-count">${cat.file_count || 0}</div>
                    <div class="category-prefix">${prefix}XXXX</div>
                </div>
            `;
        }).join('');
    }
    
    getCategoryPrefix(category) {
        const prefixes = {
            'Letters': 'LR',
            'Certificates': 'CR',
            'Test Reports': 'TR',
            'Component Reports': 'STR'
        };
        return prefixes[category] || 'DOC';
    }
    
    getCategoryIcon(category) {
        const icons = {
            'Letters': 'fas fa-envelope',
            'Certificates': 'fas fa-certificate',
            'Test Reports': 'fas fa-flask',
            'Component Reports': 'fas fa-microchip'
        };
        return icons[category] || 'fas fa-folder';
    }
    
    updateCategoryFilter(categories) {
        const filterSelect = document.getElementById('categoryFilter');
        if (!filterSelect) return;
        
        filterSelect.innerHTML = `
            <option value="">All Categories</option>
            ${categories.map(cat => `
                <option value="${cat.name}" ${this.currentCategory === cat.name ? 'selected' : ''}>
                    ${cat.name} (${cat.file_count || 0})
                </option>
            `).join('')}
        `;
    }
    
    updateFilesSectionTitle() {
        const titleElement = document.getElementById('filesSectionTitle');
        if (!titleElement) return;
        
        if (this.currentCategory) {
            titleElement.innerHTML = `<i class="fas fa-folder"></i> ${this.currentCategory}`;
        } else {
            titleElement.innerHTML = `<i class="fas fa-file-pdf"></i> All Documents`;
        }
    }
    
    filterByCategory(category) {
        this.currentCategory = category;
        this.currentPage = 1;
        
        // Update category filter dropdown
        const filterSelect = document.getElementById('categoryFilter');
        if (filterSelect) {
            filterSelect.value = category;
        }
        
        // Update section title
        this.updateFilesSectionTitle();
        
        // Highlight active category
        document.querySelectorAll('.category-card').forEach(card => {
            card.classList.toggle('active', card.dataset.category === category);
        });
        
        // Load files
        this.loadFiles();
    }
    
    switchView(view) {
        // Update navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.view === view);
        });
        
        // For reader, both views show files with different context
        if (view === 'dashboard') {
            document.querySelector('.stats-grid').style.display = 'grid';
            document.querySelector('.categories-grid').style.display = 'grid';
            document.getElementById('filesSectionTitle').innerHTML = '<i class="fas fa-file-pdf"></i> Recent Documents';
            this.currentPage = 1;
            this.loadFiles();
        } else {
            document.querySelector('.stats-grid').style.display = 'none';
            document.querySelector('.categories-grid').style.display = 'none';
            document.getElementById('filesSectionTitle').innerHTML = '<i class="fas fa-files"></i> All Documents';
            this.currentPage = 1;
            this.loadFiles();
        }
    }
    
    async loadFiles() {
        const loading = Utils.showLoading();
        
        try {
            let url = `/files?page=${this.currentPage}&per_page=${this.perPage}`;
            if (this.currentCategory) url += `&category=${encodeURIComponent(this.currentCategory)}`;
            if (this.searchTerm) url += `&search=${encodeURIComponent(this.searchTerm)}`;
            
            const response = await Utils.request(url);
            
            if (response.success) {
                this.sortFiles(response.files);
                this.displayFiles(response.files);
                this.updatePagination(response.pagination);
            }
        } catch (error) {
            Utils.showNotification('Error loading files', 'error');
        } finally {
            loading.hide();
        }
    }
    
    sortFiles(files) {
        switch (this.sortBy) {
            case 'newest':
                files.sort((a, b) => new Date(b.upload_date) - new Date(a.upload_date));
                break;
            case 'oldest':
                files.sort((a, b) => new Date(a.upload_date) - new Date(b.upload_date));
                break;
            case 'name':
                files.sort((a, b) => a.original_name.localeCompare(b.original_name));
                break;
            case 'size':
                files.sort((a, b) => b.file_size - a.file_size);
                break;
        }
    }
    
    displayFiles(files) {
        const filesContainer = document.getElementById('filesContainer');
        if (!filesContainer) return;
        
        if (files.length === 0) {
            filesContainer.innerHTML = `
                <div class="empty-state" style="grid-column: 1/-1;">
                    <i class="fas fa-search"></i>
                    <p>No documents found</p>
                    <p class="empty-subtext">Try a different search or category</p>
                </div>
            `;
            return;
        }
        
        filesContainer.innerHTML = files.map(file => `
            <div class="file-card">
                <div class="file-header">
                    <div class="file-icon">
                        <i class="fas fa-file-pdf"></i>
                    </div>
                    <div class="file-title">
                        <h4>${this.truncateText(file.original_name, 40)}</h4>
                        <div class="file-tags">
                            <span class="tag tag-number">${file.file_number}</span>
                            <span class="tag tag-category">${file.category}</span>
                        </div>
                    </div>
                </div>
                <div class="file-body">
                    <p class="file-description">${file.description || 'No description available'}</p>
                    <div class="file-meta">
                        <div class="meta-item">
                            <i class="fas fa-calendar"></i>
                            <span>${Utils.formatDate(file.upload_date)}</span>
                        </div>
                        <div class="meta-item">
                            <i class="fas fa-weight"></i>
                            <span>${file.file_size.toFixed(2)} MB</span>
                        </div>
                    </div>
                </div>
                <div class="file-actions">
                    <button class="btn btn-sm btn-primary view-file" data-id="${file.id}">
                        <i class="fas fa-eye"></i>
                        Preview
                    </button>
                    <button class="btn btn-sm btn-secondary download-file" data-id="${file.id}">
                        <i class="fas fa-download"></i>
                        Download
                    </button>
                </div>
            </div>
        `).join('');
        
        // Add event listeners
        filesContainer.querySelectorAll('.view-file').forEach(btn => {
            btn.addEventListener('click', () => this.viewFile(btn.dataset.id));
        });
        
        filesContainer.querySelectorAll('.download-file').forEach(btn => {
            btn.addEventListener('click', () => this.downloadFile(btn.dataset.id));
        });
    }
    
    truncateText(text, maxLength) {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }
    
    updatePagination(pagination) {
        const prevBtn = document.getElementById('prevPage');
        const nextBtn = document.getElementById('nextPage');
        const pageInfo = document.getElementById('pageInfo');
        
        if (prevBtn) {
            prevBtn.disabled = this.currentPage === 1;
        }
        
        if (nextBtn) {
            nextBtn.disabled = this.currentPage >= pagination.pages;
        }
        
        if (pageInfo) {
            pageInfo.textContent = `Page ${this.currentPage} of ${pagination.pages || 1}`;
        }
    }
    
    async viewFile(fileId) {
        try {
            const response = await Utils.request(`/files/${fileId}`);
            if (response.success) {
                this.showFilePreview(response.file);
            }
        } catch (error) {
            Utils.showNotification('Error loading file', 'error');
        }
    }
    
    showFilePreview(file) {
        // Create preview modal
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>${file.original_name}</h3>
                    <button class="modal-close">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="file-preview-info">
                        <div class="info-row">
                            <strong>File Number:</strong>
                            <span>${file.file_number}</span>
                        </div>
                        <div class="info-row">
                            <strong>Category:</strong>
                            <span>${file.category}</span>
                        </div>
                        <div class="info-row">
                            <strong>Upload Date:</strong>
                            <span>${Utils.formatDate(file.upload_date)}</span>
                        </div>
                        <div class="info-row">
                            <strong>File Size:</strong>
                            <span>${file.file_size.toFixed(2)} MB</span>
                        </div>
                        <div class="info-row">
                            <strong>Description:</strong>
                            <p>${file.description || 'No description'}</p>
                        </div>
                    </div>
                    <div class="preview-actions">
                        <button class="btn btn-primary" id="downloadPreviewBtn">
                            <i class="fas fa-download"></i>
                            Download
                        </button>
                        <button class="btn btn-secondary" id="closePreviewBtn">
                            <i class="fas fa-times"></i>
                            Close
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Add modal styles if not present
        if (!document.querySelector('#modal-styles')) {
            const style = document.createElement('style');
            style.id = 'modal-styles';
            style.textContent = `
                .modal {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0,0,0,0.5);
                    backdrop-filter: blur(5px);
                    z-index: 9999;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 20px;
                }
                
                .modal-content {
                    background: white;
                    border-radius: 15px;
                    max-width: 600px;
                    width: 100%;
                    max-height: 80vh;
                    overflow-y: auto;
                    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                }
                
                .modal-header {
                    padding: 20px;
                    border-bottom: 1px solid #e5e7eb;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                
                .modal-header h3 {
                    margin: 0;
                    color: #1e293b;
                }
                
                .modal-close {
                    background: none;
                    border: none;
                    color: #64748b;
                    cursor: pointer;
                    padding: 5px;
                }
                
                .modal-close:hover {
                    color: #1e293b;
                }
                
                .modal-body {
                    padding: 20px;
                }
                
                .file-preview-info {
                    margin-bottom: 30px;
                }
                
                .info-row {
                    margin-bottom: 15px;
                    display: flex;
                    align-items: flex-start;
                }
                
                .info-row strong {
                    width: 120px;
                    color: #4b5563;
                }
                
                .info-row span,
                .info-row p {
                    flex: 1;
                    color: #6b7280;
                }
                
                .preview-actions {
                    display: flex;
                    gap: 15px;
                }
                
                .preview-actions .btn {
                    flex: 1;
                }
            `;
            document.head.appendChild(style);
        }
        
        // Event listeners
        modal.querySelector('.modal-close').addEventListener('click', () => {
            modal.remove();
        });
        
        modal.querySelector('#closePreviewBtn').addEventListener('click', () => {
            modal.remove();
        });
        
        modal.querySelector('#downloadPreviewBtn').addEventListener('click', () => {
            this.downloadFile(file.id);
            modal.remove();
        });
    }
    
    async downloadFile(fileId) {
        try {
            const token = localStorage.getItem('token');
            const url = `http://localhost:5000/api/files/${fileId}/download`;
            
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', '');
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            Utils.showNotification('Download started', 'success');
        } catch (error) {
            Utils.showNotification('Error downloading file', 'error');
        }
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ReaderDashboard();
});