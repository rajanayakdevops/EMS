// Notification Management
class NotificationManager {
    constructor() {
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadNotifications();
    }

    setupEventListeners() {
        // Send notification button
        const sendNotificationBtn = document.getElementById('sendNotificationBtn');
        if (sendNotificationBtn) {
            sendNotificationBtn.addEventListener('click', () => this.showNotificationModal());
        }

        // Notification form
        const notificationForm = document.getElementById('notificationForm');
        if (notificationForm) {
            notificationForm.addEventListener('submit', (e) => this.handleNotificationSubmit(e));
        }
    }

    loadNotifications() {
        const notificationsList = document.getElementById('notificationsList');
        if (!notificationsList) return;

        const notifications = storage.getNotifications();
        const currentUser = auth.getCurrentUser();
        
        if (!currentUser) return;

        // Filter notifications based on user role
        let filteredNotifications = notifications;
        
        if (auth.isParticipant()) {
            // Participants see notifications relevant to them
            filteredNotifications = notifications.filter(notification => {
                return notification.recipients === 'all' || 
                       notification.recipients === 'participants' ||
                       (notification.bookingId && this.isUserBooking(notification.bookingId, currentUser.id));
            });
        }

        if (filteredNotifications.length === 0) {
            notificationsList.innerHTML = this.getEmptyStateHTML();
            return;
        }

        notificationsList.innerHTML = filteredNotifications.map(notification => 
            this.getNotificationCardHTML(notification)
        ).join('');
    }

    getNotificationCardHTML(notification) {
        const isOrganizer = auth.isOrganizer();
        const timeAgo = this.getTimeAgo(notification.createdAt);
        
        return `
            <div class="notification-card" data-notification-id="${notification.id}">
                <div class="notification-header">
                    <h4 class="notification-title">
                        <i class="fas ${this.getNotificationIcon(notification.type)}"></i>
                        ${Utils.sanitizeHtml(notification.subject)}
                    </h4>
                    <span class="notification-time">${timeAgo}</span>
                </div>
                
                <div class="notification-content">
                    ${Utils.sanitizeHtml(notification.message)}
                </div>
                
                <div class="notification-meta">
                    <span><i class="fas fa-paper-plane"></i> ${notification.type.toUpperCase()}</span>
                    <span><i class="fas fa-users"></i> ${this.getRecipientsText(notification.recipients)}</span>
                    <span><i class="fas fa-check-circle"></i> ${notification.status}</span>
                    ${notification.metadata && notification.metadata.eventTitle ? 
                        `<span><i class="fas fa-calendar"></i> ${notification.metadata.eventTitle}</span>` : ''
                    }
                    ${isOrganizer && notification.metadata && notification.metadata.affectedBookings ? 
                        `<span><i class="fas fa-ticket-alt"></i> ${notification.metadata.affectedBookings} booking(s)</span>` : ''
                    }
                </div>
            </div>
        `;
    }

    getEmptyStateHTML() {
        return `
            <div class="empty-state">
                <i class="fas fa-bell"></i>
                <h3>No Notifications</h3>
                <p>You don't have any notifications yet.</p>
                ${auth.isOrganizer() ? `
                    <button class="btn btn-primary" onclick="notificationManager.showNotificationModal()">
                        <i class="fas fa-paper-plane"></i> Send Notification
                    </button>
                ` : ''}
            </div>
        `;
    }

    showNotificationModal() {
        if (!auth.isOrganizer()) {
            Utils.showToast('Only organizers can send notifications', 'error');
            return;
        }

        const modal = document.getElementById('notificationModal');
        const form = document.getElementById('notificationForm');
        
        if (modal && form) {
            form.reset();
            eventManager.showModal('notificationModal');
        }
    }

    async handleNotificationSubmit(e) {
        e.preventDefault();
        
        const form = e.target;
        const formData = Utils.getFormData(form);
        
        // Validate form
        const validation = Utils.validateForm(form);
        if (!validation.isValid) {
            validation.errors.forEach(error => {
                Utils.showToast(error, 'error');
            });
            return;
        }

        // Show loading state
        const submitBtn = form.querySelector('button[type="submit"]');
        Utils.showLoading(submitBtn, true);

        try {
            const currentUser = auth.getCurrentUser();
            
            const notificationData = {
                type: formData.notificationType,
                recipients: formData.notificationRecipients,
                subject: formData.notificationSubject.trim(),
                message: formData.notificationMessage.trim(),
                senderId: currentUser.id,
                senderName: currentUser.name,
                metadata: {
                    recipientCount: this.getRecipientCount(formData.notificationRecipients)
                }
            };

            // Simulate sending notification
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            const saved = storage.saveNotification(notificationData);
            
            if (saved) {
                Utils.showToast('Notification sent successfully!', 'success');
                
                eventManager.closeModal('notificationModal');
                this.loadNotifications();
                
                // Show sending simulation
                this.simulateNotificationSending(notificationData);
            } else {
                Utils.showToast('Failed to send notification', 'error');
            }
        } catch (error) {
            console.error('Error sending notification:', error);
            Utils.showToast('An error occurred while sending the notification', 'error');
        } finally {
            Utils.showLoading(submitBtn, false);
        }
    }

    simulateNotificationSending(notification) {
        const recipientCount = notification.metadata.recipientCount;
        const type = notification.type;
        
        // Show progress simulation
        Utils.showToast(
            `Sending ${type.toUpperCase()} notification to ${recipientCount} recipient(s)...`,
            'info',
            2000
        );
        
        setTimeout(() => {
            Utils.showToast(
                `${type.toUpperCase()} notification delivered to ${recipientCount} recipient(s)`,
                'success',
                3000
            );
        }, 2000);
    }

    getRecipientCount(recipients) {
        const users = storage.getUsers();
        
        switch (recipients) {
            case 'all':
                return users.length;
            case 'organizers':
                return users.filter(user => user.role === 'organizer').length;
            case 'participants':
                return users.filter(user => user.role === 'participant').length;
            default:
                return 0;
        }
    }

    getRecipientsText(recipients) {
        switch (recipients) {
            case 'all':
                return 'All Users';
            case 'organizers':
                return 'Organizers';
            case 'participants':
                return 'Participants';
            default:
                return 'Unknown';
        }
    }

    getNotificationIcon(type) {
        switch (type) {
            case 'email':
                return 'fa-envelope';
            case 'sms':
                return 'fa-sms';
            case 'both':
                return 'fa-paper-plane';
            default:
                return 'fa-bell';
        }
    }

    getTimeAgo(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);
        
        if (diffInSeconds < 60) {
            return 'Just now';
        } else if (diffInSeconds < 3600) {
            const minutes = Math.floor(diffInSeconds / 60);
            return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
        } else if (diffInSeconds < 86400) {
            const hours = Math.floor(diffInSeconds / 3600);
            return `${hours} hour${hours > 1 ? 's' : ''} ago`;
        } else if (diffInSeconds < 2592000) {
            const days = Math.floor(diffInSeconds / 86400);
            return `${days} day${days > 1 ? 's' : ''} ago`;
        } else {
            return Utils.formatDate(date, 'short');
        }
    }

    isUserBooking(bookingId, userId) {
        const booking = storage.getBookingById(bookingId);
        return booking && booking.userId === userId;
    }

    // Send automatic notifications for system events
    sendEventCreatedNotification(event) {
        if (!auth.isOrganizer()) return;
        
        const notification = {
            type: 'email',
            recipients: 'participants',
            subject: `New Event Available: ${event.title}`,
            message: `A new event "${event.title}" is now available for booking. Check it out!`,
            eventId: event.id,
            senderId: event.organizerId,
            senderName: event.organizerName,
            metadata: {
                eventTitle: event.title,
                eventDate: event.date,
                eventPrice: event.price,
                recipientCount: this.getRecipientCount('participants')
            }
        };

        storage.saveNotification(notification);
    }

    sendBookingReminderNotification(booking, event) {
        const notification = {
            type: 'email',
            recipients: 'participants',
            subject: `Event Reminder: ${event.title}`,
            message: `Don't forget! Your event "${event.title}" is coming up soon. We look forward to seeing you there!`,
            bookingId: booking.id,
            eventId: event.id,
            metadata: {
                eventTitle: event.title,
                eventDate: event.date,
                eventTime: event.time,
                bookingReference: booking.bookingReference
            }
        };

        storage.saveNotification(notification);
    }

    sendEventCapacityWarning(event) {
        if (!auth.isOrganizer()) return;
        
        const availableTickets = event.capacity - (event.bookings || 0);
        const percentageFull = ((event.bookings || 0) / event.capacity) * 100;
        
        if (percentageFull >= 90) {
            const notification = {
                type: 'email',
                recipients: 'organizers',
                subject: `Event Almost Full: ${event.title}`,
                message: `Your event "${event.title}" is ${Math.round(percentageFull)}% full with only ${availableTickets} tickets remaining.`,
                eventId: event.id,
                metadata: {
                    eventTitle: event.title,
                    percentageFull: Math.round(percentageFull),
                    availableTickets: availableTickets
                }
            };

            storage.saveNotification(notification);
        }
    }

    // Bulk notification methods
    sendBulkEventReminders() {
        const events = storage.getEvents();
        const bookings = storage.getBookings();
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split('T')[0];
        
        // Find events happening tomorrow
        const upcomingEvents = events.filter(event => event.date === tomorrowStr);
        
        upcomingEvents.forEach(event => {
            const eventBookings = bookings.filter(booking => 
                booking.eventId === event.id && booking.status === 'confirmed'
            );
            
            eventBookings.forEach(booking => {
                this.sendBookingReminderNotification(booking, event);
            });
        });
        
        if (upcomingEvents.length > 0) {
            Utils.showToast(`Sent reminders for ${upcomingEvents.length} upcoming event(s)`, 'success');
        }
    }

    // Get notification statistics
    getNotificationStats() {
        const notifications = storage.getNotifications();
        const currentUser = auth.getCurrentUser();
        
        let userNotifications = notifications;
        if (auth.isOrganizer()) {
            userNotifications = notifications.filter(n => n.senderId === currentUser.id);
        }
        
        const totalSent = userNotifications.length;
        const emailNotifications = userNotifications.filter(n => n.type === 'email' || n.type === 'both').length;
        const smsNotifications = userNotifications.filter(n => n.type === 'sms' || n.type === 'both').length;
        
        const recentNotifications = userNotifications.filter(n => {
            const notificationDate = new Date(n.createdAt);
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            return notificationDate >= weekAgo;
        }).length;
        
        return {
            totalSent,
            emailNotifications,
            smsNotifications,
            recentNotifications
        };
    }

    // Clear old notifications (keep last 50)
    cleanupOldNotifications() {
        const notifications = storage.getNotifications();
        
        if (notifications.length > 50) {
            const recentNotifications = notifications.slice(0, 50);
            storage.setItem(storage.keys.NOTIFICATIONS, recentNotifications);
            
            const removedCount = notifications.length - 50;
            Utils.showToast(`Cleaned up ${removedCount} old notification(s)`, 'info');
        }
    }
}

// Create global instance
window.notificationManager = new NotificationManager();