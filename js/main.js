// Main Application Entry Point
class EventManagementSystem {
    constructor() {
        this.isInitialized = false;
        this.init();
    }

    async init() {
        try {
            // Show loading screen
            this.showLoading(true);
            
            // Initialize core systems
            await this.initializeCore();
            
            // Check authentication state
            this.checkAuthState();
            
            // Set up global event listeners
            this.setupGlobalEventListeners();
            
            // Initialize keyboard shortcuts
            this.setupKeyboardShortcuts();
            
            // Mark as initialized
            this.isInitialized = true;
            
            // Hide loading screen
            setTimeout(() => {
                this.showLoading(false);
            }, 1500);
            
            console.log('Event Management System initialized successfully');
            
        } catch (error) {
            console.error('Failed to initialize EMS:', error);
            Utils.showToast('Failed to initialize application', 'error');
            this.showLoading(false);
        }
    }

    async initializeCore() {
        // Core systems are already initialized via their constructors
        // This method can be used for any additional setup
        
        // Verify all managers are available
        const requiredManagers = [
            'storage', 'auth', 'eventManager', 'bookingManager', 
            'notificationManager', 'analyticsManager', 'testCaseManager', 'dashboard'
        ];
        
        const missingManagers = requiredManagers.filter(manager => !window[manager]);
        
        if (missingManagers.length > 0) {
            throw new Error(`Missing required managers: ${missingManagers.join(', ')}`);
        }
        
        // Initialize demo data if needed
        this.initializeDemoData();
    }

    initializeDemoData() {
        const users = storage.getUsers();
        
        // Create demo users if none exist
        if (users.length === 0) {
            const demoUsers = [
                {
                    name: 'Demo Organizer',
                    email: 'organizer@demo.com',
                    password: 'demo123',
                    role: 'organizer'
                },
                {
                    name: 'Demo Participant',
                    email: 'participant@demo.com',
                    password: 'demo123',
                    role: 'participant'
                }
            ];
            
            demoUsers.forEach(user => {
                storage.saveUser(user);
            });
            
            console.log('Demo users created');
        }
    }

    checkAuthState() {
        const currentUser = auth.getCurrentUser();
        
        if (currentUser) {
            // User is logged in, show dashboard
            this.showDashboard();
        } else {
            // User is not logged in, show auth
            this.showAuth();
        }
    }

    showAuth() {
        const authSection = document.getElementById('auth-section');
        const dashboardSection = document.getElementById('dashboard-section');
        
        if (authSection && dashboardSection) {
            authSection.classList.remove('hidden');
            dashboardSection.classList.add('hidden');
        }
    }

    showDashboard() {
        const authSection = document.getElementById('auth-section');
        const dashboardSection = document.getElementById('dashboard-section');
        
        if (authSection && dashboardSection) {
            authSection.classList.add('hidden');
            dashboardSection.classList.remove('hidden');
            
            // Initialize dashboard
            if (window.dashboard) {
                window.dashboard.init();
            }
        }
    }

    showLoading(show = true) {
        const loadingScreen = document.getElementById('loading');
        if (loadingScreen) {
            if (show) {
                loadingScreen.style.display = 'flex';
            } else {
                loadingScreen.style.display = 'none';
            }
        }
    }

    setupGlobalEventListeners() {
        // Handle modal clicks outside content
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                e.target.classList.remove('active');
                e.target.style.display = 'none';
            }
        });

        // Handle form submissions to prevent default behavior
        document.addEventListener('submit', (e) => {
            // Let the specific form handlers deal with submission
            // This is just a safety net
        });

        // Handle window resize for responsive adjustments
        window.addEventListener('resize', () => {
            this.handleResize();
        });

        // Handle online/offline status
        window.addEventListener('online', () => {
            Utils.showToast('Connection restored', 'success');
        });

        window.addEventListener('offline', () => {
            Utils.showToast('Connection lost - working offline', 'warning');
        });

        // Handle beforeunload for unsaved changes warning
        window.addEventListener('beforeunload', (e) => {
            // Only show warning if there are unsaved changes
            // This would be implemented based on form states
        });
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Global shortcuts
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case 'k':
                        e.preventDefault();
                        this.showQuickSearch();
                        break;
                    case 'n':
                        e.preventDefault();
                        if (auth.isOrganizer()) {
                            eventManager.showCreateEventModal();
                        }
                        break;
                    case 'r':
                        e.preventDefault();
                        this.refreshApplication();
                        break;
                    case 'e':
                        e.preventDefault();
                        this.exportData();
                        break;
                }
            }

            // Escape key handling
            if (e.key === 'Escape') {
                this.handleEscapeKey();
            }
        });
    }

    handleResize() {
        // Handle responsive behavior
        const isMobile = window.innerWidth <= 768;
        
        // Update mobile-specific behaviors
        if (isMobile) {
            // Close any open dropdowns
            const activeDropdowns = document.querySelectorAll('.dropdown.active');
            activeDropdowns.forEach(dropdown => {
                dropdown.classList.remove('active');
            });
        }
    }

    showQuickSearch() {
        // Implement quick search functionality
        const searchTerm = prompt('Quick Search:');
        if (searchTerm && window.dashboard) {
            const results = window.dashboard.searchDashboard(searchTerm);
            window.dashboard.displaySearchResults(results);
        }
    }

    refreshApplication() {
        if (window.dashboard) {
            window.dashboard.refreshDashboard();
        }
    }

    exportData() {
        const currentUser = auth.getCurrentUser();
        if (!currentUser) return;

        const exportData = storage.exportData();
        Utils.downloadJSON(exportData, `ems-export-${new Date().toISOString().split('T')[0]}.json`);
        Utils.showToast('Data exported successfully', 'success');
    }

    handleEscapeKey() {
        // Close any open modals
        const activeModals = document.querySelectorAll('.modal.active');
        activeModals.forEach(modal => {
            modal.classList.remove('active');
            modal.style.display = 'none';
        });

        // Close any open dropdowns
        const activeDropdowns = document.querySelectorAll('.dropdown.active');
        activeDropdowns.forEach(dropdown => {
            dropdown.classList.remove('active');
        });
    }

    // Application health check
    healthCheck() {
        const health = {
            timestamp: new Date().toISOString(),
            status: 'healthy',
            checks: {
                storage: this.checkStorageHealth(),
                auth: this.checkAuthHealth(),
                managers: this.checkManagersHealth()
            }
        };

        // Determine overall status
        const failedChecks = Object.values(health.checks).filter(check => !check.status);
        if (failedChecks.length > 0) {
            health.status = 'unhealthy';
        }

        return health;
    }

    checkStorageHealth() {
        try {
            // Test localStorage availability
            const testKey = 'ems_health_check';
            localStorage.setItem(testKey, 'test');
            localStorage.removeItem(testKey);
            
            // Check if core data structures exist
            const users = storage.getUsers();
            const events = storage.getEvents();
            const bookings = storage.getBookings();
            
            return {
                status: true,
                message: 'Storage is healthy',
                details: {
                    users: users.length,
                    events: events.length,
                    bookings: bookings.length
                }
            };
        } catch (error) {
            return {
                status: false,
                message: 'Storage error',
                error: error.message
            };
        }
    }

    checkAuthHealth() {
        try {
            const currentUser = auth.getCurrentUser();
            const isLoggedIn = auth.isLoggedIn();
            
            return {
                status: true,
                message: 'Auth is healthy',
                details: {
                    isLoggedIn,
                    userRole: currentUser ? currentUser.role : null
                }
            };
        } catch (error) {
            return {
                status: false,
                message: 'Auth error',
                error: error.message
            };
        }
    }

    checkManagersHealth() {
        const requiredManagers = [
            'eventManager', 'bookingManager', 'notificationManager', 
            'analyticsManager', 'testCaseManager', 'dashboard'
        ];
        
        const managerStatus = {};
        let allHealthy = true;
        
        requiredManagers.forEach(manager => {
            const exists = window[manager] !== undefined;
            managerStatus[manager] = exists;
            if (!exists) allHealthy = false;
        });
        
        return {
            status: allHealthy,
            message: allHealthy ? 'All managers healthy' : 'Some managers missing',
            details: managerStatus
        };
    }

    // Performance monitoring
    getPerformanceMetrics() {
        if (!performance || !performance.getEntriesByType) {
            return { error: 'Performance API not available' };
        }

        const navigation = performance.getEntriesByType('navigation')[0];
        const resources = performance.getEntriesByType('resource');
        
        return {
            timestamp: new Date().toISOString(),
            navigation: {
                domContentLoaded: Math.round(navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart),
                loadComplete: Math.round(navigation.loadEventEnd - navigation.loadEventStart),
                totalLoadTime: Math.round(navigation.loadEventEnd - navigation.fetchStart)
            },
            resources: {
                totalResources: resources.length,
                totalSize: resources.reduce((sum, resource) => sum + (resource.transferSize || 0), 0),
                slowestResource: resources.reduce((slowest, resource) => 
                    resource.duration > (slowest.duration || 0) ? resource : slowest, {}
                )
            },
            memory: performance.memory ? {
                used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
                total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
                limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024)
            } : null
        };
    }

    // Error handling and reporting
    setupErrorHandling() {
        window.addEventListener('error', (e) => {
            console.error('Global error:', e.error);
            this.reportError('JavaScript Error', e.error);
        });

        window.addEventListener('unhandledrejection', (e) => {
            console.error('Unhandled promise rejection:', e.reason);
            this.reportError('Promise Rejection', e.reason);
        });
    }

    reportError(type, error) {
        const errorReport = {
            type,
            message: error.message || error,
            stack: error.stack,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href,
            user: auth.getCurrentUser()?.email || 'anonymous'
        };

        // In a real application, this would be sent to an error reporting service
        console.error('Error Report:', errorReport);
        
        // Store locally for debugging
        const errors = JSON.parse(localStorage.getItem('ems_errors') || '[]');
        errors.push(errorReport);
        
        // Keep only last 10 errors
        if (errors.length > 10) {
            errors.splice(0, errors.length - 10);
        }
        
        localStorage.setItem('ems_errors', JSON.stringify(errors));
    }

    // Development helpers
    getDebugInfo() {
        return {
            version: '1.0.0',
            initialized: this.isInitialized,
            currentUser: auth.getCurrentUser(),
            currentSection: window.dashboard?.currentSection,
            health: this.healthCheck(),
            performance: this.getPerformanceMetrics(),
            storage: {
                users: storage.getUsers().length,
                events: storage.getEvents().length,
                bookings: storage.getBookings().length,
                notifications: storage.getNotifications().length
            }
        };
    }

    // Console commands for development
    setupConsoleCommands() {
        if (typeof window !== 'undefined') {
            window.EMS = {
                health: () => this.healthCheck(),
                debug: () => this.getDebugInfo(),
                export: () => this.exportData(),
                clear: () => {
                    if (confirm('Clear all data? This cannot be undone.')) {
                        storage.clearAllData();
                        location.reload();
                    }
                },
                demo: () => {
                    console.log('Demo credentials:');
                    console.log('Organizer: organizer@demo.com / demo123');
                    console.log('Participant: participant@demo.com / demo123');
                }
            };
        }
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.ems = new EventManagementSystem();
    
    // Setup console commands in development
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        window.ems.setupConsoleCommands();
        console.log('EMS Console commands available: EMS.health(), EMS.debug(), EMS.export(), EMS.clear(), EMS.demo()');
    }
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EventManagementSystem;
}