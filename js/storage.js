// Local Storage Management
class StorageManager {
    constructor() {
        this.keys = {
            USERS: 'ems_users',
            CURRENT_USER: 'ems_current_user',
            EVENTS: 'ems_events',
            BOOKINGS: 'ems_bookings',
            NOTIFICATIONS: 'ems_notifications',
            SETTINGS: 'ems_settings'
        };
        
        this.initializeStorage();
    }

    // Initialize storage with default data
    initializeStorage() {
        // Initialize users if not exists
        if (!this.getUsers()) {
            this.setItem(this.keys.USERS, []);
        }

        // Initialize events if not exists
        if (!this.getEvents()) {
            this.setItem(this.keys.EVENTS, this.getDefaultEvents());
        }

        // Initialize bookings if not exists
        if (!this.getBookings()) {
            this.setItem(this.keys.BOOKINGS, []);
        }

        // Initialize notifications if not exists
        if (!this.getNotifications()) {
            this.setItem(this.keys.NOTIFICATIONS, []);
        }

        // Initialize settings if not exists
        if (!this.getSettings()) {
            this.setItem(this.keys.SETTINGS, this.getDefaultSettings());
        }
    }

    // Generic storage methods
    setItem(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error('Error saving to localStorage:', error);
            Utils.showToast('Error saving data', 'error');
            return false;
        }
    }

    getItem(key) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : null;
        } catch (error) {
            console.error('Error reading from localStorage:', error);
            return null;
        }
    }

    removeItem(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error('Error removing from localStorage:', error);
            return false;
        }
    }

    // User management
    getUsers() {
        return this.getItem(this.keys.USERS) || [];
    }

    saveUser(user) {
        const users = this.getUsers();
        const existingIndex = users.findIndex(u => u.email === user.email);
        
        if (existingIndex !== -1) {
            users[existingIndex] = { ...users[existingIndex], ...user };
        } else {
            user.id = Utils.generateId();
            user.createdAt = new Date().toISOString();
            users.push(user);
        }
        
        return this.setItem(this.keys.USERS, users);
    }

    getUserByEmail(email) {
        const users = this.getUsers();
        return users.find(user => user.email === email);
    }

    getCurrentUser() {
        return this.getItem(this.keys.CURRENT_USER);
    }

    setCurrentUser(user) {
        return this.setItem(this.keys.CURRENT_USER, user);
    }

    logout() {
        return this.removeItem(this.keys.CURRENT_USER);
    }

    // Event management
    getEvents() {
        return this.getItem(this.keys.EVENTS) || [];
    }

    saveEvent(event) {
        const events = this.getEvents();
        const existingIndex = events.findIndex(e => e.id === event.id);
        
        if (existingIndex !== -1) {
            events[existingIndex] = { ...events[existingIndex], ...event };
        } else {
            event.id = Utils.generateId();
            event.createdAt = new Date().toISOString();
            event.bookings = 0;
            events.push(event);
        }
        
        return this.setItem(this.keys.EVENTS, events);
    }

    getEventById(id) {
        const events = this.getEvents();
        return events.find(event => event.id === id);
    }

    deleteEvent(id) {
        const events = this.getEvents();
        const filteredEvents = events.filter(event => event.id !== id);
        
        // Also delete related bookings
        const bookings = this.getBookings();
        const filteredBookings = bookings.filter(booking => booking.eventId !== id);
        this.setItem(this.keys.BOOKINGS, filteredBookings);
        
        return this.setItem(this.keys.EVENTS, filteredEvents);
    }

    getEventsByOrganizer(organizerId) {
        const events = this.getEvents();
        return events.filter(event => event.organizerId === organizerId);
    }

    // Booking management
    getBookings() {
        return this.getItem(this.keys.BOOKINGS) || [];
    }

    saveBooking(booking) {
        const bookings = this.getBookings();
        const existingIndex = bookings.findIndex(b => b.id === booking.id);
        
        if (existingIndex !== -1) {
            bookings[existingIndex] = { ...bookings[existingIndex], ...booking };
        } else {
            booking.id = Utils.generateId();
            booking.createdAt = new Date().toISOString();
            booking.status = booking.status || 'confirmed';
            bookings.push(booking);
            
            // Update event booking count
            this.updateEventBookingCount(booking.eventId);
        }
        
        return this.setItem(this.keys.BOOKINGS, bookings);
    }

    getBookingById(id) {
        const bookings = this.getBookings();
        return bookings.find(booking => booking.id === id);
    }

    getBookingsByUser(userId) {
        const bookings = this.getBookings();
        return bookings.filter(booking => booking.userId === userId);
    }

    getBookingsByEvent(eventId) {
        const bookings = this.getBookings();
        return bookings.filter(booking => booking.eventId === eventId);
    }

    updateBookingStatus(bookingId, status) {
        const bookings = this.getBookings();
        const bookingIndex = bookings.findIndex(b => b.id === bookingId);
        
        if (bookingIndex !== -1) {
            bookings[bookingIndex].status = status;
            bookings[bookingIndex].updatedAt = new Date().toISOString();
            return this.setItem(this.keys.BOOKINGS, bookings);
        }
        
        return false;
    }

    deleteBooking(id) {
        const bookings = this.getBookings();
        const booking = bookings.find(b => b.id === id);
        
        if (booking) {
            const filteredBookings = bookings.filter(b => b.id !== id);
            this.setItem(this.keys.BOOKINGS, filteredBookings);
            
            // Update event booking count
            this.updateEventBookingCount(booking.eventId);
            return true;
        }
        
        return false;
    }

    updateEventBookingCount(eventId) {
        const events = this.getEvents();
        const bookings = this.getBookings();
        const eventIndex = events.findIndex(e => e.id === eventId);
        
        if (eventIndex !== -1) {
            const eventBookings = bookings.filter(b => 
                b.eventId === eventId && b.status === 'confirmed'
            );
            
            events[eventIndex].bookings = eventBookings.reduce((total, booking) => 
                total + (booking.quantity || 1), 0
            );
            
            this.setItem(this.keys.EVENTS, events);
        }
    }

    // Notification management
    getNotifications() {
        return this.getItem(this.keys.NOTIFICATIONS) || [];
    }

    saveNotification(notification) {
        const notifications = this.getNotifications();
        notification.id = Utils.generateId();
        notification.createdAt = new Date().toISOString();
        notification.status = 'sent';
        
        notifications.unshift(notification); // Add to beginning
        
        // Keep only last 100 notifications
        if (notifications.length > 100) {
            notifications.splice(100);
        }
        
        return this.setItem(this.keys.NOTIFICATIONS, notifications);
    }

    // Settings management
    getSettings() {
        return this.getItem(this.keys.SETTINGS) || this.getDefaultSettings();
    }

    updateSettings(settings) {
        const currentSettings = this.getSettings();
        const updatedSettings = { ...currentSettings, ...settings };
        return this.setItem(this.keys.SETTINGS, updatedSettings);
    }

    // Default data
    getDefaultEvents() {
        return [
            {
                id: 'demo-event-1',
                title: 'Tech Conference 2024',
                description: 'Annual technology conference featuring the latest innovations and trends.',
                date: '2024-06-15',
                time: '09:00',
                location: 'Convention Center, Downtown',
                capacity: 500,
                price: 99.99,
                organizerId: 'demo-organizer',
                organizerName: 'Demo Organizer',
                createdAt: '2024-01-01T00:00:00.000Z',
                bookings: 0,
                category: 'Technology'
            },
            {
                id: 'demo-event-2',
                title: 'Music Festival',
                description: 'Three-day music festival featuring local and international artists.',
                date: '2024-07-20',
                time: '18:00',
                location: 'City Park Amphitheater',
                capacity: 2000,
                price: 149.99,
                organizerId: 'demo-organizer',
                organizerName: 'Demo Organizer',
                createdAt: '2024-01-01T00:00:00.000Z',
                bookings: 0,
                category: 'Music'
            }
        ];
    }

    getDefaultSettings() {
        return {
            theme: 'light',
            notifications: {
                email: true,
                sms: false,
                push: true
            },
            currency: 'USD',
            timezone: 'America/New_York',
            language: 'en'
        };
    }

    // Analytics data
    getAnalyticsData() {
        const events = this.getEvents();
        const bookings = this.getBookings();
        const users = this.getUsers();
        
        const totalEvents = events.length;
        const totalBookings = bookings.length;
        const totalRevenue = bookings
            .filter(b => b.status === 'confirmed')
            .reduce((sum, booking) => sum + (booking.totalAmount || 0), 0);
        
        const participantIds = new Set(bookings.map(b => b.userId));
        const totalParticipants = participantIds.size;
        
        // Popular events
        const eventBookingCounts = {};
        bookings.forEach(booking => {
            if (booking.status === 'confirmed') {
                eventBookingCounts[booking.eventId] = 
                    (eventBookingCounts[booking.eventId] || 0) + (booking.quantity || 1);
            }
        });
        
        const popularEvents = events
            .map(event => ({
                ...event,
                bookingCount: eventBookingCounts[event.id] || 0
            }))
            .sort((a, b) => b.bookingCount - a.bookingCount)
            .slice(0, 5);
        
        return {
            totalEvents,
            totalBookings,
            totalRevenue,
            totalParticipants,
            popularEvents,
            eventBookingCounts
        };
    }

    // Clear all data (for testing)
    clearAllData() {
        Object.values(this.keys).forEach(key => {
            this.removeItem(key);
        });
        this.initializeStorage();
    }

    // Export data
    exportData() {
        const data = {
            users: this.getUsers(),
            events: this.getEvents(),
            bookings: this.getBookings(),
            notifications: this.getNotifications(),
            settings: this.getSettings(),
            exportDate: new Date().toISOString()
        };
        
        return data;
    }

    // Import data
    importData(data) {
        try {
            if (data.users) this.setItem(this.keys.USERS, data.users);
            if (data.events) this.setItem(this.keys.EVENTS, data.events);
            if (data.bookings) this.setItem(this.keys.BOOKINGS, data.bookings);
            if (data.notifications) this.setItem(this.keys.NOTIFICATIONS, data.notifications);
            if (data.settings) this.setItem(this.keys.SETTINGS, data.settings);
            
            Utils.showToast('Data imported successfully', 'success');
            return true;
        } catch (error) {
            console.error('Error importing data:', error);
            Utils.showToast('Error importing data', 'error');
            return false;
        }
    }
}

// Create global instance
window.storage = new StorageManager();