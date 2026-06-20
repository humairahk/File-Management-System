// Upload Page JavaScript - DEBUG VERSION

class UploadManager {
    constructor() {
        console.log('🚀 UploadManager constructor started');
        this.authManager = window.authManager || new AuthManager();
        this.selectedFile = null;
        this.nextNumbers = {};
        
        console.log('🔍 AuthManager:', this.authManager);
        console.log('🔍 Is authenticated:', this.authManager.isAuthenticated());
        console.log('🔍 Is admin:', this.authManager.isAdmin());
        
        this.initializePage();
    }
    
    initializePage() {
        console.log('📄 initializePage started');
        
        // Check authentication and admin role
        if (!this.authManager.isAuthenticated()) {
            console.log('❌ Not authenticated, redirecting to login');
            window.location.href = 'login.html';
            return;
        }
        
        if (!this.authManager.isAdmin()) {
            console.log('❌ Not admin, redirecting to reader dashboard');
            Utils.showNotification('Access denied. Admin only.', 'error');
            setTimeout(() => {
                window.location.href = 'reader-dashboard.html';
            }, 2000);
            return;
        }
        
        console.log('✅ Authentication passed');
        this.initializeEventListeners();
        this.loadNextNumbers();
    }
    
    initializeEventListeners() {
        console.log('🎯 initializeEventListeners started');
        
        // Back button
        const backBtn = document.getElementById('backBtn');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                console.log('🔙 Back button clicked');
                window.history.back();
            });
        }
        
        // Cancel button
        const cancelBtn = document.getElementById('cancelBtn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                console.log('❌ Cancel button clicked');
                this.resetForm();
            });
        }
        
        // Upload area
        const uploadArea = document.getElementById('uploadArea');
        const fileInput = document.getElementById('fileInput');
        
        console.log('📁 Upload area found:', !!uploadArea);
        console.log('📁 File input found:', !!fileInput);
        
        if (uploadArea) {
            uploadArea.addEventListener('click', () => {
                console.log('👆 Upload area clicked');
                if (fileInput) fileInput.click();
            });
            
            uploadArea.addEventListener('dragover', (e) => {
                e.preventDefault();
                uploadArea.classList.add('dragover');
            });
            
            uploadArea.addEventListener('dragleave', () => {
                uploadArea.classList.remove('dragover');
            });
            
            uploadArea.addEventListener('drop', (e) => {
                e.preventDefault();
                uploadArea.classList.remove('dragover');
                
                const files = e.dataTransfer.files;
                console.log('📥 Files dropped:', files);
                if (files.length > 0) {
                    this.handleFileSelect(files[0]);
                }
            });
        }
        
        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                console.log('📤 File input changed');
                if (e.target.files.length > 0) {
                    console.log('📄 Selected file:', e.target.files[0]);
                    this.handleFileSelect(e.target.files[0]);
                }
            });
        }
        
        const categorySelect = document.getElementById('category');
        if (categorySelect) {
            categorySelect.addEventListener('change', () => {
                console.log('📂 Category changed to:', categorySelect.value);
                this.updateFileNumberPreview();
            });
        }
        
        const uploadForm = document.getElementById('uploadForm');
        if (uploadForm) {
            uploadForm.addEventListener('submit', (e) => {
                console.log('📤 Form submitted');
                e.preventDefault();
                this.uploadFile();
            });
        }
        
        console.log('✅ Event listeners attached');
    }
    
    async loadNextNumbers() {
        console.log('🔄 Loading next numbers...');
        try {
            const response = await Utils.request('stats');
            console.log('📊 Stats response:', response);
            if (response.success && response.stats.next_numbers) {
                this.nextNumbers = response.stats.next_numbers;
                this.displayNextNumbers();
                console.log('✅ Next numbers loaded:', this.nextNumbers);
            }
        } catch (error) {
            console.error('❌ Error loading next numbers:', error);
        }
    }
    
    displayNextNumbers() {
        const grid = document.getElementById('nextNumbersGrid');
        if (!grid) return;
        
        const categories = [
            { name: 'Letters', prefix: 'LR' },
            { name: 'Certificates', prefix: 'CR' },
            { name: 'Test Reports', prefix: 'TR' },
            { name: 'Component Reports', prefix: 'STR' }
        ];
        
        grid.innerHTML = categories.map(cat => {
            const nextNumber = this.nextNumbers[cat.name] || `${cat.prefix}0001`;
            return `
                <div class="number-item">
                    <span class="number-category">${cat.name}</span>
                    <span class="number-value">${nextNumber}</span>
                </div>
            `;
        }).join('');
    }
    
    handleFileSelect(file) {
        console.log('📄 handleFileSelect called with:', file);
        console.log('📄 File type:', file.type);
        console.log('📄 File size:', file.size);
        
        if (file.type !== 'application/pdf') {
            console.log('❌ Invalid file type');
            Utils.showNotification('Only PDF files are allowed', 'error');
            return;
        }
        
        if (file.size > 100 * 1024 * 1024) {
            console.log('❌ File too large');
            Utils.showNotification('File size exceeds 100MB limit', 'error');
            return;
        }
        
        this.selectedFile = file;
        console.log('✅ File selected:', file.name);
        
        const uploadArea = document.getElementById('uploadArea');
        const fileInfo = document.getElementById('fileInfo');
        const fileName = document.getElementById('fileName');
        const fileSize = document.getElementById('fileSize');
        const submitBtn = document.getElementById('submitBtn');
        
        if (uploadArea) uploadArea.classList.add('has-file');
        if (fileInfo) fileInfo.style.display = 'block';
        if (fileName) fileName.textContent = file.name;
        if (fileSize) fileSize.textContent = `(${(file.size / (1024 * 1024)).toFixed(2)} MB)`;
        
        this.checkFormValidity();
        this.updateFileNumberPreview();
    }
    
    updateFileNumberPreview() {
        const category = document.getElementById('category')?.value;
        const previewContainer = document.getElementById('fileNumberPreview');
        const previewCategory = document.getElementById('previewCategory');
        const previewFileNumber = document.getElementById('previewFileNumber');
        
        if (category && this.selectedFile) {
            const nextNumber = this.nextNumbers[category] || this.getDefaultNumber(category);
            if (previewCategory) previewCategory.textContent = category;
            if (previewFileNumber) previewFileNumber.textContent = nextNumber;
            if (previewContainer) previewContainer.style.display = 'block';
        } else {
            if (previewContainer) previewContainer.style.display = 'none';
        }
    }
    
    getDefaultNumber(category) {
        const prefixes = {
            'Letters': 'LR0001',
            'Certificates': 'CR0001',
            'Test Reports': 'TR0001',
            'Component Reports': 'STR0001'
        };
        return prefixes[category] || 'DOC0001';
    }
    
    checkFormValidity() {
        const category = document.getElementById('category')?.value;
        const submitBtn = document.getElementById('submitBtn');
        
        if (submitBtn) {
            submitBtn.disabled = !(this.selectedFile && category);
            console.log('🔘 Submit button enabled:', !submitBtn.disabled);
        }
    }
    
    resetForm() {
        console.log('🔄 Resetting form');
        this.selectedFile = null;
        const fileInput = document.getElementById('fileInput');
        if (fileInput) fileInput.value = '';
        
        const uploadArea = document.getElementById('uploadArea');
        const fileInfo = document.getElementById('fileInfo');
        const previewContainer = document.getElementById('fileNumberPreview');
        
        if (uploadArea) uploadArea.classList.remove('has-file');
        if (fileInfo) fileInfo.style.display = 'none';
        if (previewContainer) previewContainer.style.display = 'none';
        
        const form = document.getElementById('uploadForm');
        if (form) form.reset();
        
        const submitBtn = document.getElementById('submitBtn');
        if (submitBtn) submitBtn.disabled = true;
        
        this.resetProgress();
    }
    
    resetProgress() {
        const progress = document.getElementById('uploadProgress');
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');
        
        if (progress) progress.style.display = 'none';
        if (progressFill) progressFill.style.width = '0%';
        if (progressText) progressText.textContent = '0% Uploaded';
    }
    
    async uploadFile() {
        console.log('🚀 uploadFile called');
        
        const category = document.getElementById('category').value;
        const description = document.getElementById('description').value;
        
        console.log('📂 Category:', category);
        console.log('📝 Description:', description);
        console.log('📄 Selected file:', this.selectedFile);
        
        if (!this.selectedFile) {
            console.log('❌ No file selected');
            Utils.showNotification('Please select a file', 'error');
            return;
        }
        
        if (!category) {
            console.log('❌ No category selected');
            Utils.showNotification('Please select a category', 'error');
            return;
        }
        
        const progress = document.getElementById('uploadProgress');
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');
        const submitBtn = document.getElementById('submitBtn');
        
        if (progress) progress.style.display = 'block';
        if (submitBtn) submitBtn.disabled = true;
        
        const formData = new FormData();
        formData.append('file', this.selectedFile);
        formData.append('category', category);
        formData.append('description', description);
        
        console.log('📦 FormData created');
        console.log('📦 File in FormData:', formData.get('file'));
        console.log('📦 Category in FormData:', formData.get('category'));
        
        try {
            console.log('🌐 Sending XHR request to: upload');
            const xhr = new XMLHttpRequest();
            xhr.open('POST', 'upload', true);
            xhr.withCredentials = true;
            
            xhr.upload.addEventListener('progress', (e) => {
                if (e.lengthComputable) {
                    const percentComplete = (e.loaded / e.total) * 100;
                    if (progressFill) progressFill.style.width = percentComplete + '%';
                    if (progressText) progressText.textContent = Math.round(percentComplete) + '% Uploaded';
                }
            });
            
            xhr.onload = () => {
                console.log('📨 XHR onload - Status:', xhr.status);
                console.log('📨 XHR response:', xhr.responseText);
                
                if (xhr.status === 201 || xhr.status === 200) {
                    try {
                        const response = JSON.parse(xhr.responseText);
                        console.log('📨 Parsed response:', response);
                        
                        if (response.success) {
                            Utils.showNotification('File uploaded successfully!', 'success');
                            this.showSuccessMessage(response.file);
                            this.resetForm();
                            this.loadNextNumbers();
                            
                            setTimeout(() => {
                                window.location.href = 'admin-dashboard.html';
                            }, 3000);
                        } else {
                            Utils.showNotification(response.message || 'Upload failed', 'error');
                            this.resetProgress();
                            if (submitBtn) submitBtn.disabled = false;
                        }
                    } catch (e) {
                        console.error('❌ Failed to parse response:', e);
                        Utils.showNotification('Server error', 'error');
                        this.resetProgress();
                        if (submitBtn) submitBtn.disabled = false;
                    }
                } else {
                    console.error('❌ Server returned error status:', xhr.status);
                    Utils.showNotification('Upload failed. Please try again.', 'error');
                    this.resetProgress();
                    if (submitBtn) submitBtn.disabled = false;
                }
            };
            
            xhr.onerror = (e) => {
                console.error('❌ XHR error:', e);
                Utils.showNotification('Network error. Please check your connection.', 'error');
                this.resetProgress();
                if (submitBtn) submitBtn.disabled = false;
            };
            
            console.log('📤 Sending XHR...');
            xhr.send(formData);
            console.log('✅ XHR sent');
            
        } catch (error) {
            console.error('❌ Upload error:', error);
            Utils.showNotification('Upload failed. Please try again.', 'error');
            this.resetProgress();
            if (submitBtn) submitBtn.disabled = false;
        }
    }
    
    showSuccessMessage(file) {
        const alertContainer = document.getElementById('alertContainer');
        if (!alertContainer) return;
        
        alertContainer.innerHTML = `
            <div class="alert alert-success">
                <i class="fas fa-check-circle"></i>
                <div>
                    <strong>Upload Successful!</strong>
                    <p style="margin-top: 5px;">File ${file.file_number} has been uploaded successfully.</p>
                </div>
                <button class="btn-icon" onclick="this.parentElement.remove()" style="margin-left: auto;">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        
        setTimeout(() => {
            const alert = alertContainer.querySelector('.alert');
            if (alert) alert.remove();
        }, 5000);
    }
}

// Initialize upload manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM loaded, initializing UploadManager');
    new UploadManager();
});

console.log('✅ upload.js loaded');