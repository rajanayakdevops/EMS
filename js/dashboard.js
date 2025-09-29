// Dashboard Management
class DashboardManager {
    constructor() {
        this.currentSection = 'overview';
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.updateUserWelcome();
        this.updateStats();
        this.showSection('overview');
    }

    setupEventListeners() {
        // Sidebar navigation
        const sidebarLinks = document.querySelectorAll('.sidebar-menu a');
        sidebarLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const section = link.getAttribute('data-section');
                this.showSection(section);
            });
        });

        // Quick action buttons
        const quickActionBtns = document.querySelectorAll('.action-buttons .btn');
        quickActionBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const onclick = btn.getAttribute('onclick');
                if (onclick && onclick.includes('showSection')) {
                    const section = onclick.match(/showSection\('([^']+)'\)/)[1];
                    this.showSection(section);
                }
            });
        });
    }

    showSection(sectionName) {
        // Update sidebar active state
        const sidebarLinks = document.querySelectorAll('.sidebar-menu a');
        sidebarLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('data-section') === sectionName) {
                link.classList.add('active');
            }
        });

        // Update content sections
        const contentSections = document.querySelectorAll('.content-section');
        contentSections.forEach(section => {
            section.classList.remove('active');
        });

        const targetSection = document.getElementById(`${sectionName}-section`);
        if (targetSection) {
            targetSection.classList.add('active');
            this.currentSection = sectionName;
            
            // Load section-specific data
            this.loadSectionData(sectionName);
        }
    }

    loadSectionData(sectionName) {
        switch (sectionName) {
            case 'overview':
                this.updateStats();
                break;
            case 'events':
                if (window.eventManager) {
                    window.eventManager.loadEvents();
                }
                break;
            case 'bookings':
                if (window.bookingManager) {
                    window.bookingManager.loadBookings();
                }
                break;
            case 'analytics':
                if (window.analyticsManager) {
                    window.analyticsManager.loadAnalytics();
                }
                break;
            case 'notifications':
                if (window.notificationManager) {
                    window.notificationManager.loadNotifications();
                }
                break;
            case 'test-cases':
                if (window.testCaseManager) {
                    window.testCaseManager.clearTestResults();
                }
                break;
        }
    }

    updateUserWelcome() {
        const userWelcome = document.getElementById('userWelcome');
        const currentUser = auth.getCurrentUser();
        
        if (userWelcome && currentUser) {
            userWelcome.textContent = `Welcome, ${currentUser.name}`;
        }
    }

    updateStats() {
        const currentUser = auth.getCurrentUser();
        if (!currentUser) return;

        const analyticsData = storage.getAnalyticsData();
        
        // Update overview stats based on user role
        if (auth.isOrganizer()) {
            this.updateOrganizerStats(analyticsData);
        } else if (auth.isParticipant()) {
            this.updateParticipantStats(analyticsData);
        }
    }

    updateOrganizerStats(analyticsData) {
        const currentUser = auth.getCurrentUser();
        const events = storage.getEventsByOrganizer(currentUser.id);
        const allBookings = storage.getBookings();
        
        // Filter bookings for organizer's events
        const eventIds = events.map(event => event.id);
        const organizerBookings = allBookings.filter(booking => 
            eventIds.includes(booking.eventId)
        );
        
        const confirmedBookings = organizerBookings.filter(b => b.status === 'confirmed');
        const totalRevenue = confirmedBookings.reduce((sum, booking) => 
            sum + (booking.totalAmount || 0), 0
        );
        
        // Get unique participants
        const participantIds = new Set(confirmedBookings.map(b => b.userId));
        
        // Update DOM elements
        this.updateStatElement('totalEvents', events.length);
        this.updateStatElement('totalBookings', organizerBookings.length);
        this.updateStatElement('totalParticipants', participantIds.size);
        this.updateStatElement('totalRevenue', Utils.formatCurrency(totalRevenue));
    }

    updateParticipantStats(analyticsData) {
        const currentUser = auth.getCurrentUser();
        const userBookings = storage.getBookingsByUser(currentUser.id);
        const allEvents = storage.getEvents();
        
        const confirmedBookings = userBookings.filter(b => b.status === 'confirmed');
        const totalSpent = confirmedBookings.reduce((sum, booking) => 
            sum + (booking.totalAmount || 0), 0
        );
        
        // Count upcoming events user is attending
        const upcomingEvents = confirmedBookings.filter(booking => {
            const event = storage.getEventById(booking.eventId);
            return event && !Utils.isPastDate(event.date);
        }).length;
        
        // Update DOM elements with participant-relevant stats
        this.updateStatElement('totalEvents', allEvents.length, 'Available Events');
        this.updateStatElement('totalBookings', userBookings.length, 'My Bookings');
        this.updateStatElement('totalParticipants', upcomingEvents, 'Upcoming Events');
        this.updateStatElement('totalRevenue', Utils.formatCurrency(totalSpent), 'Total Spent');
        
        // Update labels for participant view
        this.updateStatLabel('totalEvents', 'Available Events');
        this.updateStatLabel('totalBookings', 'My Bookings');
        this.updateStatLabel('totalParticipants', 'Upcoming Events');
        this.updateStatLabel('totalRevenue', 'Total Spent');
    }

    updateStatElement(elementId, value, label) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = value;
        }
        
        if (label) {
            this.updateStatLabel(elementId, label);
        }
    }

    updateStatLabel(elementId, label) {
        const element = document.getElementById(elementId);
        if (element) {
            const labelElement = element.parentElement.querySelector('p');
            if (labelElement) {
                labelElement.textContent = label;
            }
        }
    }

    // Refresh all dashboard data
    refreshDashboard() {
        this.updateUserWelcome();
        this.updateStats();
        this.loadSectionData(this.currentSection);
        
        Utils.showToast('Dashboard refreshed', 'success');
    }

    // Get dashboard summary for current user
    getDashboardSummary() {
        const currentUser = auth.getCurrentUser();
        if (!currentUser) return null;

        const events = storage.getEvents();
        const bookings = storage.getBookings();
        const notifications = storage.getNotifications();

        let summary = {
            user: {
                name: currentUser.name,
                email: currentUser.email,
                role: currentUser.role,
                lastLogin: currentUser.lastLogin
            },
            stats: {},
            recentActivity: []
        };

        if (auth.isOrganizer()) {
            const organizerEvents = events.filter(event => event.organizerId === currentUser.id);
            const eventIds = organizerEvents.map(event => event.id);
            const organizerBookings = bookings.filter(booking => eventIds.includes(booking.eventId));
            
            summary.stats = {
                totalEvents: organizerEvents.length,
                totalBookings: organizerBookings.length,
                totalRevenue: organizerBookings
                    .filter(b => b.status === 'confirmed')
                    .reduce((sum, booking) => sum + (booking.totalAmount || 0), 0),
                upcomingEvents: organizerEvents.filter(event => 
                    !Utils.isPastDate(event.date)
                ).length
            };

            // Recent activity for organizers
            summary.recentActivity = [
                ...organizerBookings.slice(0, 5).map(booking => ({
                    type: 'booking',
                    description: `New booking for ${booking.eventTitle}`,
                    timestamp: booking.createdAt
                })),
                ...organizerEvents.slice(0, 3).map(event => ({
                    type: 'event',
                    description: `Created event: ${event.title}`,
                    timestamp: event.createdAt
                }))
            ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 5);

        } else if (auth.isParticipant()) {
            const userBookings = bookings.filter(booking => booking.userId === currentUser.id);
            
            summary.stats = {
                totalBookings: userBookings.length,
                confirmedBookings: userBookings.filter(b => b.status === 'confirmed').length,
                totalSpent: userBookings
                    .filter(b => b.status === 'confirmed')
                    .reduce((sum, booking) => sum + (booking.totalAmount || 0), 0),
                upcomingEvents: userBookings.filter(booking => {
                    const event = storage.getEventById(booking.eventId);
                    return event && !Utils.isPastDate(event.date) && booking.status === 'confirmed';
                }).length
            };

            // Recent activity for participants
            summary.recentActivity = userBookings.slice(0, 5).map(booking => ({
                type: 'booking',
                description: `Booked: ${booking.eventTitle}`,
                timestamp: booking.createdAt
            })).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        }

        return summary;
    }

    // Export dashboard data
    exportDashboardData() {
        const summary = this.getDashboardSummary();
        if (!summary) {
            Utils.showToast('No data to export', 'warning');
            return;
        }

        const exportData = {
            ...summary,
            exportDate: new Date().toISOString(),
            systemInfo: {
                version: '1.0.0',
                userAgent: navigator.userAgent
            }
        };

        Utils.downloadJSON(exportData, `dashboard-${summary.user.role}-${new Date().toISOString().split('T')[0]}.json`);
        Utils.showToast('Dashboard data exported successfully', 'success');
    }

    // Handle responsive sidebar toggle
    toggleSidebar() {
        const sidebar = document.querySelector('.sidebar');
        if (sidebar) {
            sidebar.classList.toggle('collapsed');
        }
    }

    // Search functionality across sections
    searchDashboard(query) {
        if (!query.trim()) return;

        const results = [];
        const events = storage.getEvents();
        const bookings = storage.getBookings();
        const notifications = storage.getNotifications();

        // Search events
        const eventResults = Utils.searchObjects(events, query, ['title', 'description', 'location']);
        eventResults.forEach(event => {
            results.push({
                type: 'event',
                title: event.title,
                description: event.description,
                section: 'events',
                id: event.id
            });
        });

        // Search bookings
        const bookingResults = bookings.filter(booking => 
            booking.eventTitle.toLowerCase().includes(query.toLowerCase()) ||
            booking.participantName.toLowerCase().includes(query.toLowerCase())
        );
        bookingResults.forEach(booking => {
            results.push({
                type: 'booking',
                title: `Booking: ${booking.eventTitle}`,
                description: `${booking.participantName} - ${booking.quantity} ticket(s)`,
                section: 'bookings',
                id: booking.id
            });
        });

        // Search notifications
        const notificationResults = Utils.searchObjects(notifications, query, ['subject', 'message']);
        notificationResults.forEach(notification => {
            results.push({
                type: 'notification',
                title: notification.subject,
                description: notification.message,
                section: 'notifications',
                id: notification.id
            });
        });

        return results;
    }

    // Show search results
    displaySearchResults(results) {
        if (results.length === 0) {
            Utils.showToast('No results found', 'info');
            return;
        }

        // For now, show results in toast
        // In a full implementation, this would show in a search results modal
        Utils.showToast(`Found ${results.length} result(s) for your search`, 'success');
        
        // Navigate to first result's section
        if (results.length > 0) {
            this.showSection(results[0].section);
        }
    }

    // Keyboard shortcuts
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Only handle shortcuts when not typing in inputs
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                return;
            }

            // Ctrl/Cmd + number keys for section navigation
            if ((e.ctrlKey || e.metaKey) && e.key >= '1' && e.key <= '6') {
                e.preventDefault();
                const sections = ['overview', 'events', 'bookings', 'analytics', 'notifications', 'test-cases'];
                const sectionIndex = parseInt(e.key) - 1;
                if (sections[sectionIndex]) {
                    this.showSection(sections[sectionIndex]);
                }
            }

            // Escape key to close modals
            if (e.key === 'Escape') {
                const activeModals = document.querySelectorAll('.modal.active');
                activeModals.forEach(modal => {
                    modal.classList.remove('active');
                    modal.style.display = 'none';
                });
            }
        });
    }
}

// Global function for section navigation (used by onclick handlers)
window.showSection = function(sectionName) {
    if (window.dashboard) {
        window.dashboard.showSection(sectionName);
    }
};

// Create global instance
window.dashboard = new DashboardManager();