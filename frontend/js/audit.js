// Audit Logs JavaScript

class AuditManager {
    constructor() {
        this.authManager = window.authManager || new AuthManager();
        this.currentPage = 1;
        this.perPage = 25;
        this.filters = {
            startDate: '',
            endDate: '',
            action: '',
            search: ''
        };
        
        this.initializePage();
    }
    
    initializePage() {
        // Check authentication and admin role
        if (!this.authManager.isAuthenticated() || !this.authManager.isAdmin()) {
            window.location.href = 'login.html';
            return;
        }
        
        this.initializeEventListeners();
        this.loadAuditStats();
        this.loadAuditLogs();
    }
    
    initializeEventListeners() {
        // Back button
        document.getElementById('backBtn')?.addEventListener('click', () => {
            window.history.back();
        });
        
        // Apply filters
        document.getElementById('applyFiltersBtn')?.addEventListener('click', () => {
            this.applyFilters();
        });
        
        // Clear filters
        document.getElementById('clearFiltersBtn')?.addEventListener('click', () => {
            this.clearFilters();
        });
        
        // Search on enter
        document.getElementById('searchInput')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.applyFilters();
            }
        });
        
        // Pagination
        document.getElementById('prevPage')?.addEventListener('click', () => {
            if (this.currentPage > 1) {
                this.currentPage--;
                this.loadAuditLogs();
            }
        });
        
        document.getElementById('nextPage')?.addEventListener('click', () => {
            this.currentPage++;
            this.loadAuditLogs();
        });
        
        // Export buttons
        document.getElementById('exportCSVBtn')?.addEventListener('click', () => {
            this.exportLogs('csv');
        });
        
        document.getElementById('exportJSONBtn')?.addEventListener('click', () => {
            this.exportLogs('json');
        });
        
        // Date range presets
        this.addDatePresets();
    }
    
    addDatePresets() {
        const filterGroup = document.querySelector('.filter-group:first-child');
        if (!filterGroup) return;
        
        const presetDiv = document.createElement('div');
        presetDiv.style.marginTop = '10px';
        presetDiv.innerHTML = `
            <select id="datePreset" style="width: 100%; padding: 12px; border: 2px solid #e5e7eb; border-radius: 8px;">
                <option value="">Select Date Range</option>
                <option value="today">Today</option>
                <option value="yesterday">Yesterday</option>
                <option value="7days">Last 7 Days</option>
                <option value="30days">Last 30 Days</option>
                <option value="thisMonth">This Month</option>
                <option value="lastMonth">Last Month</option>
            </select>
        `;
        
        filterGroup.appendChild(presetDiv);
        
        document.getElementById('datePreset')?.addEventListener('change', (e) => {
            this.setDatePreset(e.target.value);
        });
    }
    
    setDatePreset(preset) {
        const today = new Date();
        let startDate = new Date();
        let endDate = new Date();
        
        switch (preset) {
            case 'today':
                startDate = today;
                endDate = today;
                break;
            case 'yesterday':
                startDate = new Date(today.setDate(today.getDate() - 1));
                endDate = new Date(today.setDate(today.getDate() + 1));
                break;
            case '7days':
                startDate = new Date(today.setDate(today.getDate() - 7));
                endDate = new Date();
                break;
            case '30days':
                startDate = new Date(today.setDate(today.getDate() - 30));
                endDate = new Date();
                break;
            case 'thisMonth':
                startDate = new Date(today.getFullYear(), today.getMonth(), 1);
                endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                break;
            case 'lastMonth':
                startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                endDate = new Date(today.getFullYear(), today.getMonth(), 0);
                break;
            default:
                return;
        }
        
        document.getElementById('startDate').value = this.formatDateForInput(startDate);
        document.getElementById('endDate').value = this.formatDateForInput(endDate);
    }
    
    formatDateForInput(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
    
    applyFilters() {
        this.filters = {
            startDate: document.getElementById('startDate')?.value || '',
            endDate: document.getElementById('endDate')?.value || '',
            action: document.getElementById('actionFilter')?.value || '',
            search: document.getElementById('searchInput')?.value || ''
        };
        
        this.currentPage = 1;
        this.loadAuditLogs();
    }
    
    clearFilters() {
        document.getElementById('startDate').value = '';
        document.getElementById('endDate').value = '';
        document.getElementById('actionFilter').value = '';
        document.getElementById('searchInput').value = '';
        document.getElementById('datePreset').value = '';
        
        this.filters = {
            startDate: '',
            endDate: '',
            action: '',
            search: ''
        };
        
        this.currentPage = 1;
        this.loadAuditLogs();
    }
    
    async loadAuditStats() {
        try {
            const response = await Utils.request('/audit/stats');
            if (response.success) {
                this.displayAuditStats(response.stats);
                this.createCharts(response.stats);
            }
        } catch (error) {
            console.error('Error loading audit stats:', error);
        }
    }
    
    displayAuditStats(stats) {
        const statsContainer = document.getElementById('auditStats');
        if (!statsContainer) return;
        
        statsContainer.innerHTML = `
            <div class="stat-card">
                <div class="stat-icon">
                    <i class="fas fa-clipboard-list"></i>
                </div>
                <div class="stat-info">
                    <h3>${stats.total_logs || 0}</h3>
                    <p>Total Events</p>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">
                    <i class="fas fa-calendar"></i>
                </div>
                <div class="stat-info">
                    <h3>${stats.logs_last_30_days || 0}</h3>
                    <p>Last 30 Days</p>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">
                    <i class="fas fa-check-circle"></i>
                </div>
                <div class="stat-info">
                    <h3>${stats.results_distribution?.Success || 0}</h3>
                    <p>Successful</p>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">
                    <i class="fas fa-exclamation-circle"></i>
                </div>
                <div class="stat-info">
                    <h3>${stats.results_distribution?.Failed || 0}</h3>
                    <p>Failed</p>
                </div>
            </div>
        `;
    }
    
    createCharts(stats) {
        // Destroy existing charts
        if (this.actionsChart) {
            this.actionsChart.destroy();
        }
        if (this.resultsChart) {
            this.resultsChart.destroy();
        }
        
        // Actions Chart
        const actionsCtx = document.getElementById('actionsChart')?.getContext('2d');
        if (actionsCtx && stats.actions_by_type) {
            const actions = Object.keys(stats.actions_by_type);
            const counts = Object.values(stats.actions_by_type);
            
            this.actionsChart = new Chart(actionsCtx, {
                type: 'doughnut',
                data: {
                    labels: actions,
                    datasets: [{
                        data: counts,
                        backgroundColor: [
                            '#4f46e5',
                            '#10b981',
                            '#f59e0b',
                            '#ef4444',
                            '#8b5cf6',
                            '#ec4899'
                        ],
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                padding: 20,
                                usePointStyle: true,
                                pointStyle: 'circle'
                            }
                        },
                        title: {
                            display: true,
                            text: 'Actions Distribution',
                            font: {
                                size: 16,
                                weight: '600'
                            },
                            padding: 20
                        }
                    }
                }
            });
        }
        
        // Results Chart
        const resultsCtx = document.getElementById('resultsChart')?.getContext('2d');
        if (resultsCtx && stats.results_distribution) {
            const results = Object.keys(stats.results_distribution);
            const counts = Object.values(stats.results_distribution);
            
            this.resultsChart = new Chart(resultsCtx, {
                type: 'pie',
                data: {
                    labels: results,
                    datasets: [{
                        data: counts,
                        backgroundColor: [
                            '#10b981',
                            '#ef4444',
                            '#f59e0b'
                        ],
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                padding: 20,
                                usePointStyle: true,
                                pointStyle: 'circle'
                            }
                        },
                        title: {
                            display: true,
                            text: 'Results Distribution',
                            font: {
                                size: 16,
                                weight: '600'
                            },
                            padding: 20
                        }
                    }
                }
            });
        }
    }
    
    async loadAuditLogs() {
        const loading = Utils.showLoading();
        
        try {
            let url = `/audit/logs?page=${this.currentPage}&per_page=${this.perPage}`;
            
            if (this.filters.startDate) url += `&start_date=${this.filters.startDate}`;
            if (this.filters.endDate) url += `&end_date=${this.filters.endDate}`;
            if (this.filters.action) url += `&action=${this.filters.action}`;
            if (this.filters.search) url += `&search=${encodeURIComponent(this.filters.search)}`;
            
            const response = await Utils.request(url);
            
            if (response.success) {
                this.displayAuditLogs(response.logs);
                this.updatePagination(response.pagination);
            }
        } catch (error) {
            console.error('Error loading audit logs:', error);
            Utils.showNotification('Error loading audit logs', 'error');
        } finally {
            loading.hide();
        }
    }
    
    displayAuditLogs(logs) {
        const tbody = document.getElementById('auditLogsBody');
        const emptyState = document.getElementById('emptyState');
        
        if (!tbody) return;
        
        if (!logs || logs.length === 0) {
            tbody.innerHTML = '';
            if (emptyState) emptyState.style.display = 'block';
            return;
        }
        
        if (emptyState) emptyState.style.display = 'none';
        
        tbody.innerHTML = logs.map(log => `
            <tr>
                <td>${this.formatTimestamp(log.timestamp)}</td>
                <td>
                    <strong>${log.user_name || 'System'}</strong>
                    <div style="font-size: 0.8rem; color: #64748b;">${log.user_id || ''}</div>
                </td>
                <td>
                    <span class="status-badge" style="background: ${this.getRoleColor(log.role)}20; color: ${this.getRoleColor(log.role)};">
                        ${log.role || 'N/A'}
                    </span>
                </td>
                <td>
                    <span class="action-badge">${log.action || 'N/A'}</span>
                </td>
                <td>
                    ${log.file_name ? `
                        <div><strong>${log.file_name}</strong></div>
                        <div style="font-size: 0.8rem; color: #4f46e5;">${log.file_id || ''}</div>
                    ` : 'N/A'}
                </td>
                <td>${log.ip_address || 'N/A'}</td>
                <td style="max-width: 200px;">
                    <div style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                        ${log.device_client || 'N/A'}
                    </div>
                </td>
                <td>
                    <span class="status-badge status-${log.result?.toLowerCase() || 'unknown'}">
                        ${log.result || 'Unknown'}
                    </span>
                </td>
                <td>
                    <button class="btn-icon" onclick="alert('${log.details || 'No details'}')">
                        <i class="fas fa-info-circle"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }
    
    formatTimestamp(timestamp) {
        if (!timestamp) return 'N/A';
        const date = new Date(timestamp);
        return date.toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }
    
    getRoleColor(role) {
        const colors = {
            'admin': '#4f46e5',
            'reader': '#10b981',
            'system': '#6b7280'
        };
        return colors[role?.toLowerCase()] || '#6b7280';
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
    
    async exportLogs(format) {
        try {
            const response = await Utils.request('/audit/logs/export', {
                method: 'POST',
                body: JSON.stringify({
                    format: format,
                    start_date: this.filters.startDate,
                    end_date: this.filters.endDate
                })
            });
            
            if (response.success) {
                // Create download link
                const blob = new Blob([response.content], { type: response.mimetype });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = response.filename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
                
                Utils.showNotification(`Logs exported as ${format.toUpperCase()}`, 'success');
            }
        } catch (error) {
            console.error('Export error:', error);
            Utils.showNotification('Error exporting logs', 'error');
        }
    }
}

// Initialize audit manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new AuditManager();
});