// Utility Functions
class Utils {
    // Generate unique ID
    static generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    // Format date
    static formatDate(date, format = 'short') {
        const d = new Date(date);
        const options = {
            short: { 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric' 
            },
            long: { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            },
            time: {
                hour: '2-digit',
                minute: '2-digit'
            }
        };
        
        return d.toLocaleDateString('en-US', options[format]);
    }

    // Format currency
    static formatCurrency(amount) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    }

    // Validate email
    static validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    // Validate password
    static validatePassword(password) {
        return password.length >= 6;
    }

    // Sanitize HTML
    static sanitizeHtml(str) {
        const temp = document.createElement('div');
        temp.textContent = str;
        return temp.innerHTML;
    }

    // Debounce function
    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Show toast notification
    static showToast(message, type = 'info', duration = 3000) {
        const toastContainer = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icons = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };

        toast.innerHTML = `
            <div class="toast-content">
                <i class="${icons[type]} toast-icon"></i>
                <div class="toast-message">
                    <div class="toast-text">${Utils.sanitizeHtml(message)}</div>
                </div>
                <button class="toast-close" onclick="this.parentElement.parentElement.remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;

        toastContainer.appendChild(toast);

        // Auto remove after duration
        setTimeout(() => {
            if (toast.parentElement) {
                toast.remove();
            }
        }, duration);

        return toast;
    }

    // Show loading state
    static showLoading(element, show = true) {
        if (show) {
            element.classList.add('loading');
            element.disabled = true;
        } else {
            element.classList.remove('loading');
            element.disabled = false;
        }
    }

    // Validate form
    static validateForm(formElement) {
        const errors = [];
        const formData = new FormData(formElement);
        
        // Check required fields
        const requiredFields = formElement.querySelectorAll('[required]');
        requiredFields.forEach(field => {
            if (!field.value.trim()) {
                errors.push(`${field.name || field.id} is required`);
                field.classList.add('error');
            } else {
                field.classList.remove('error');
            }
        });

        // Validate email fields
        const emailFields = formElement.querySelectorAll('input[type="email"]');
        emailFields.forEach(field => {
            if (field.value && !Utils.validateEmail(field.value)) {
                errors.push('Please enter a valid email address');
                field.classList.add('error');
            }
        });

        // Validate password fields
        const passwordFields = formElement.querySelectorAll('input[type="password"]');
        passwordFields.forEach(field => {
            if (field.value && !Utils.validatePassword(field.value)) {
                errors.push('Password must be at least 6 characters long');
                field.classList.add('error');
            }
        });

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    // Get form data as object
    static getFormData(formElement) {
        const formData = new FormData(formElement);
        const data = {};
        
        for (let [key, value] of formData.entries()) {
            data[key] = value;
        }
        
        return data;
    }

    // Calculate days between dates
    static daysBetween(date1, date2) {
        const oneDay = 24 * 60 * 60 * 1000;
        const firstDate = new Date(date1);
        const secondDate = new Date(date2);
        
        return Math.round(Math.abs((firstDate - secondDate) / oneDay));
    }

    // Check if date is in the past
    static isPastDate(date) {
        const today = new Date();
        const checkDate = new Date(date);
        today.setHours(0, 0, 0, 0);
        checkDate.setHours(0, 0, 0, 0);
        
        return checkDate < today;
    }

    // Get event status based on date
    static getEventStatus(eventDate) {
        const now = new Date();
        const eventDateTime = new Date(eventDate);
        
        if (eventDateTime < now) {
            return 'completed';
        } else if (Utils.daysBetween(now, eventDateTime) <= 7) {
            return 'upcoming';
        } else {
            return 'active';
        }
    }

    // Truncate text
    static truncateText(text, maxLength = 100) {
        if (text.length <= maxLength) return text;
        return text.substr(0, maxLength) + '...';
    }

    // Search in array of objects
    static searchObjects(objects, searchTerm, searchFields) {
        if (!searchTerm) return objects;
        
        const term = searchTerm.toLowerCase();
        return objects.filter(obj => {
            return searchFields.some(field => {
                const value = obj[field];
                return value && value.toString().toLowerCase().includes(term);
            });
        });
    }

    // Sort array of objects
    static sortObjects(objects, sortBy, sortOrder = 'asc') {
        return objects.sort((a, b) => {
            let aVal = a[sortBy];
            let bVal = b[sortBy];
            
            // Handle dates
            if (sortBy.includes('date') || sortBy.includes('time')) {
                aVal = new Date(aVal);
                bVal = new Date(bVal);
            }
            
            // Handle numbers
            if (typeof aVal === 'string' && !isNaN(aVal)) {
                aVal = parseFloat(aVal);
                bVal = parseFloat(bVal);
            }
            
            if (sortOrder === 'desc') {
                return bVal > aVal ? 1 : -1;
            } else {
                return aVal > bVal ? 1 : -1;
            }
        });
    }

    // Filter objects
    static filterObjects(objects, filters) {
        return objects.filter(obj => {
            return Object.keys(filters).every(key => {
                const filterValue = filters[key];
                const objValue = obj[key];
                
                if (filterValue === '' || filterValue === 'all') return true;
                
                return objValue === filterValue;
            });
        });
    }

    // Calculate percentage
    static calculatePercentage(value, total) {
        if (total === 0) return 0;
        return Math.round((value / total) * 100);
    }

    // Get random color
    static getRandomColor() {
        const colors = [
            '#3b82f6', '#10b981', '#f59e0b', '#ef4444', 
            '#8b5cf6', '#06b6d4', '#84cc16', '#f97316'
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    // Copy to clipboard
    static async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            Utils.showToast('Copied to clipboard!', 'success');
            return true;
        } catch (err) {
            console.error('Failed to copy: ', err);
            Utils.showToast('Failed to copy to clipboard', 'error');
            return false;
        }
    }

    // Download data as JSON
    static downloadJSON(data, filename = 'data.json') {
        const dataStr = JSON.stringify(data, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = filename;
        link.click();
        
        URL.revokeObjectURL(link.href);
    }

    // Get user initials
    static getUserInitials(name) {
        return name
            .split(' ')
            .map(word => word.charAt(0).toUpperCase())
            .join('')
            .substring(0, 2);
    }

    // Format file size
    static formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // Check if mobile device
    static isMobile() {
        return window.innerWidth <= 768;
    }

    // Smooth scroll to element
    static scrollToElement(elementId, offset = 0) {
        const element = document.getElementById(elementId);
        if (element) {
            const elementPosition = element.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - offset;
            
            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
            });
        }
    }
}

// Export for use in other modules
window.Utils = Utils;