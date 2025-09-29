// Booking Management
class BookingManager {
    constructor() {
        this.currentBooking = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadBookings();
    }

    setupEventListeners() {
        // Booking form
        const bookingForm = document.getElementById('bookingForm');
        if (bookingForm) {
            bookingForm.addEventListener('submit', (e) => this.handleBookingSubmit(e));
        }

        // Booking filter
        const bookingFilter = document.getElementById('bookingFilter');
        if (bookingFilter) {
            bookingFilter.addEventListener('change', () => this.loadBookings());
        }
    }

    loadBookings() {
        const bookingsList = document.getElementById('bookingsList');
        if (!bookingsList) return;

        const currentUser = auth.getCurrentUser();
        if (!currentUser) return;

        let bookings = storage.getBookings();
        
        // Filter bookings based on user role
        if (auth.isParticipant()) {
            bookings = bookings.filter(booking => booking.userId === currentUser.id);
        } else if (auth.isOrganizer()) {
            // Show bookings for organizer's events
            const organizerEvents = storage.getEventsByOrganizer(currentUser.id);
            const eventIds = organizerEvents.map(event => event.id);
            bookings = bookings.filter(booking => eventIds.includes(booking.eventId));
        }

        // Apply status filter
        const filterValue = document.getElementById('bookingFilter')?.value;
        if (filterValue && filterValue !== 'all') {
            bookings = bookings.filter(booking => booking.status === filterValue);
        }

        // Sort by creation date (newest first)
        bookings.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        if (bookings.length === 0) {
            bookingsList.innerHTML = this.getEmptyStateHTML();
            return;
        }

        // Get event details for each booking
        const bookingsWithEvents = bookings.map(booking => {
            const event = storage.getEventById(booking.eventId);
            return { ...booking, event };
        }).filter(booking => booking.event); // Filter out bookings for deleted events

        bookingsList.innerHTML = bookingsWithEvents.map(booking => 
            this.getBookingCardHTML(booking)
        ).join('');
    }

    getBookingCardHTML(booking) {
        const currentUser = auth.getCurrentUser();
        const isOrganizer = auth.isOrganizer();
        const canManage = isOrganizer && booking.event.organizerId === currentUser.id;
        const canCancel = auth.isParticipant() && booking.userId === currentUser.id && 
                         booking.status === 'confirmed' && 
                         !Utils.isPastDate(booking.event.date);

        return `
            <div class="booking-card" data-booking-id="${booking.id}">
                <div class="booking-info">
                    <h4>${Utils.sanitizeHtml(booking.event.title)}</h4>
                    <div class="booking-details">
                        <span><i class="fas fa-calendar"></i> ${Utils.formatDate(booking.event.date)}</span>
                        <span><i class="fas fa-clock"></i> ${booking.event.time}</span>
                        <span><i class="fas fa-map-marker-alt"></i> ${Utils.sanitizeHtml(booking.event.location)}</span>
                        <span><i class="fas fa-ticket-alt"></i> ${booking.quantity} ticket(s)</span>
                        <span><i class="fas fa-dollar-sign"></i> ${Utils.formatCurrency(booking.totalAmount)}</span>
                        ${isOrganizer ? `<span><i class="fas fa-user"></i> ${Utils.sanitizeHtml(booking.participantName)}</span>` : ''}
                        <span><i class="fas fa-calendar-plus"></i> Booked ${Utils.formatDate(booking.createdAt, 'long')}</span>
                    </div>
                    ${booking.notes ? `
                        <div class="booking-notes">
                            <strong>Notes:</strong> ${Utils.sanitizeHtml(booking.notes)}
                        </div>
                    ` : ''}
                </div>
                
                <div class="booking-status ${booking.status}">
                    ${booking.status}
                </div>
                
                <div class="booking-actions">
                    ${canManage && booking.status === 'pending' ? `
                        <button class="btn btn-sm btn-accent" onclick="bookingManager.updateBookingStatus('${booking.id}', 'confirmed')">
                            <i class="fas fa-check"></i> Confirm
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="bookingManager.updateBookingStatus('${booking.id}', 'cancelled')">
                            <i class="fas fa-times"></i> Reject
                        </button>
                    ` : ''}
                    
                    ${canCancel ? `
                        <button class="btn btn-sm btn-danger" onclick="bookingManager.cancelBooking('${booking.id}')">
                            <i class="fas fa-ban"></i> Cancel
                        </button>
                    ` : ''}
                    
                    <button class="btn btn-sm btn-secondary" onclick="bookingManager.viewBookingDetails('${booking.id}')">
                        <i class="fas fa-eye"></i> Details
                    </button>
                    
                    ${booking.status === 'confirmed' && !Utils.isPastDate(booking.event.date) ? `
                        <button class="btn btn-sm btn-primary" onclick="bookingManager.downloadTicket('${booking.id}')">
                            <i class="fas fa-download"></i> Ticket
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }

    getEmptyStateHTML() {
        const isParticipant = auth.isParticipant();
        
        return `
            <div class="empty-state">
                <i class="fas fa-ticket-alt"></i>
                <h3>${isParticipant ? 'No Bookings Yet' : 'No Bookings Found'}</h3>
                <p>${isParticipant ? 
                    'You haven\'t booked any events yet. Browse available events to make your first booking.' : 
                    'There are no bookings for your events yet.'
                }</p>
                ${isParticipant ? `
                    <button class="btn btn-primary" onclick="showSection('events')">
                        <i class="fas fa-calendar"></i> Browse Events
                    </button>
                ` : ''}
            </div>
        `;
    }

    async handleBookingSubmit(e) {
        e.preventDefault();
        
        const form = e.target;
        const formData = Utils.getFormData(form);
        
        if (!eventManager.currentEvent) {
            Utils.showToast('Event information not found', 'error');
            return;
        }

        const event = eventManager.currentEvent;
        const currentUser = auth.getCurrentUser();
        
        // Validate quantity
        const quantity = parseInt(formData.bookingQuantity);
        const availableTickets = event.capacity - (event.bookings || 0);
        
        if (quantity <= 0) {
            Utils.showToast('Quantity must be greater than 0', 'error');
            return;
        }
        
        if (quantity > availableTickets) {
            Utils.showToast(`Only ${availableTickets} tickets available`, 'error');
            return;
        }

        // Check if user already has a booking for this event
        const existingBookings = storage.getBookingsByUser(currentUser.id);
        const hasExistingBooking = existingBookings.some(booking => 
            booking.eventId === event.id && booking.status !== 'cancelled'
        );
        
        if (hasExistingBooking) {
            Utils.showToast('You already have a booking for this event', 'warning');
            return;
        }

        // Show loading state
        const submitBtn = form.querySelector('button[type="submit"]');
        Utils.showLoading(submitBtn, true);

        try {
            const totalAmount = quantity * event.price;
            
            const bookingData = {
                eventId: event.id,
                eventTitle: event.title,
                userId: currentUser.id,
                participantName: currentUser.name,
                participantEmail: currentUser.email,
                quantity: quantity,
                totalAmount: totalAmount,
                notes: formData.bookingNotes?.trim() || '',
                status: 'confirmed', // Auto-confirm for demo
                bookingReference: this.generateBookingReference()
            };

            const saved = storage.saveBooking(bookingData);
            
            if (saved) {
                Utils.showToast('Booking confirmed successfully!', 'success');
                
                // Close modal and refresh
                eventManager.closeModal('bookingModal');
                this.loadBookings();
                eventManager.loadEvents();
                
                // Refresh dashboard stats
                if (window.dashboard) {
                    window.dashboard.updateStats();
                }
                
                // Send confirmation notification
                this.sendBookingConfirmation(bookingData);
                
                // Show booking details
                setTimeout(() => {
                    this.showBookingSuccess(bookingData);
                }, 500);
                
            } else {
                Utils.showToast('Failed to create booking', 'error');
            }
        } catch (error) {
            console.error('Error creating booking:', error);
            Utils.showToast('An error occurred while creating the booking', 'error');
        } finally {
            Utils.showLoading(submitBtn, false);
        }
    }

    generateBookingReference() {
        const timestamp = Date.now().toString(36).toUpperCase();
        const random = Math.random().toString(36).substr(2, 4).toUpperCase();
        return `BK${timestamp}${random}`;
    }

    showBookingSuccess(booking) {
        Utils.showToast(
            `Booking confirmed! Reference: ${booking.bookingReference}`, 
            'success', 
            5000
        );
    }

    async updateBookingStatus(bookingId, newStatus) {
        const booking = storage.getBookingById(bookingId);
        if (!booking) {
            Utils.showToast('Booking not found', 'error');
            return;
        }

        // Verify permission
        const currentUser = auth.getCurrentUser();
        const event = storage.getEventById(booking.eventId);
        
        if (!auth.isOrganizer() || event.organizerId !== currentUser.id) {
            Utils.showToast('You do not have permission to modify this booking', 'error');
            return;
        }

        try {
            const updated = storage.updateBookingStatus(bookingId, newStatus);
            
            if (updated) {
                const statusText = newStatus === 'confirmed' ? 'confirmed' : 'rejected';
                Utils.showToast(`Booking ${statusText} successfully`, 'success');
                
                this.loadBookings();
                
                // Send notification to participant
                this.sendStatusUpdateNotification(booking, newStatus);
                
                // Refresh dashboard stats
                if (window.dashboard) {
                    window.dashboard.updateStats();
                }
            } else {
                Utils.showToast('Failed to update booking status', 'error');
            }
        } catch (error) {
            console.error('Error updating booking status:', error);
            Utils.showToast('An error occurred while updating the booking', 'error');
        }
    }

    async cancelBooking(bookingId) {
        const booking = storage.getBookingById(bookingId);
        if (!booking) {
            Utils.showToast('Booking not found', 'error');
            return;
        }

        const currentUser = auth.getCurrentUser();
        
        // Verify permission
        if (auth.isParticipant() && booking.userId !== currentUser.id) {
            Utils.showToast('You can only cancel your own bookings', 'error');
            return;
        }

        // Check if event is in the past
        const event = storage.getEventById(booking.eventId);
        if (Utils.isPastDate(event.date)) {
            Utils.showToast('Cannot cancel booking for past events', 'error');
            return;
        }

        const confirmed = confirm('Are you sure you want to cancel this booking?');
        if (!confirmed) return;

        try {
            const updated = storage.updateBookingStatus(bookingId, 'cancelled');
            
            if (updated) {
                Utils.showToast('Booking cancelled successfully', 'success');
                
                this.loadBookings();
                eventManager.loadEvents();
                
                // Send cancellation notification
                this.sendCancellationNotification(booking);
                
                // Refresh dashboard stats
                if (window.dashboard) {
                    window.dashboard.updateStats();
                }
            } else {
                Utils.showToast('Failed to cancel booking', 'error');
            }
        } catch (error) {
            console.error('Error cancelling booking:', error);
            Utils.showToast('An error occurred while cancelling the booking', 'error');
        }
    }

    viewBookingDetails(bookingId) {
        const booking = storage.getBookingById(bookingId);
        if (!booking) {
            Utils.showToast('Booking not found', 'error');
            return;
        }

        const event = storage.getEventById(booking.eventId);
        if (!event) {
            Utils.showToast('Event not found', 'error');
            return;
        }

        // Create a detailed view modal or expand the card
        const details = `
            <div class="booking-details-modal">
                <h3>Booking Details</h3>
                <div class="detail-grid">
                    <div><strong>Reference:</strong> ${booking.bookingReference}</div>
                    <div><strong>Event:</strong> ${event.title}</div>
                    <div><strong>Date:</strong> ${Utils.formatDate(event.date, 'long')}</div>
                    <div><strong>Location:</strong> ${event.location}</div>
                    <div><strong>Quantity:</strong> ${booking.quantity} ticket(s)</div>
                    <div><strong>Total Amount:</strong> ${Utils.formatCurrency(booking.totalAmount)}</div>
                    <div><strong>Status:</strong> ${booking.status}</div>
                    <div><strong>Booked:</strong> ${Utils.formatDate(booking.createdAt, 'long')}</div>
                    ${booking.notes ? `<div><strong>Notes:</strong> ${booking.notes}</div>` : ''}
                </div>
            </div>
        `;

        // For now, show as toast with more details
        Utils.showToast(
            `Booking ${booking.bookingReference} for ${event.title} - ${booking.quantity} ticket(s) - ${Utils.formatCurrency(booking.totalAmount)}`,
            'info',
            5000
        );
    }

    downloadTicket(bookingId) {
        const booking = storage.getBookingById(bookingId);
        if (!booking) {
            Utils.showToast('Booking not found', 'error');
            return;
        }

        const event = storage.getEventById(booking.eventId);
        if (!event) {
            Utils.showToast('Event not found', 'error');
            return;
        }

        // Generate ticket data
        const ticketData = {
            bookingReference: booking.bookingReference,
            eventTitle: event.title,
            eventDate: Utils.formatDate(event.date, 'long'),
            eventTime: event.time,
            eventLocation: event.location,
            participantName: booking.participantName,
            quantity: booking.quantity,
            totalAmount: booking.totalAmount,
            status: booking.status,
            qrCode: `EMS-${booking.id}-${event.id}` // Simple QR code data
        };

        // Download as JSON (in a real app, this would be a PDF)
        Utils.downloadJSON(ticketData, `ticket-${booking.bookingReference}.json`);
        Utils.showToast('Ticket downloaded successfully', 'success');
    }

    sendBookingConfirmation(booking) {
        const notification = {
            type: 'email',
            recipients: 'participants',
            subject: `Booking Confirmed: ${booking.eventTitle}`,
            message: `Your booking for "${booking.eventTitle}" has been confirmed. Reference: ${booking.bookingReference}`,
            bookingId: booking.id,
            metadata: {
                bookingReference: booking.bookingReference,
                eventTitle: booking.eventTitle,
                quantity: booking.quantity,
                totalAmount: booking.totalAmount
            }
        };

        storage.saveNotification(notification);
    }

    sendStatusUpdateNotification(booking, newStatus) {
        const statusText = newStatus === 'confirmed' ? 'confirmed' : 'rejected';
        const event = storage.getEventById(booking.eventId);
        
        const notification = {
            type: 'email',
            recipients: 'participants',
            subject: `Booking ${statusText}: ${event.title}`,
            message: `Your booking for "${event.title}" has been ${statusText}. Reference: ${booking.bookingReference}`,
            bookingId: booking.id,
            metadata: {
                bookingReference: booking.bookingReference,
                eventTitle: event.title,
                newStatus: newStatus
            }
        };

        storage.saveNotification(notification);
    }

    sendCancellationNotification(booking) {
        const event = storage.getEventById(booking.eventId);
        
        const notification = {
            type: 'email',
            recipients: 'participants',
            subject: `Booking Cancelled: ${event.title}`,
            message: `Your booking for "${event.title}" has been cancelled. Reference: ${booking.bookingReference}`,
            bookingId: booking.id,
            metadata: {
                bookingReference: booking.bookingReference,
                eventTitle: event.title,
                refundAmount: booking.totalAmount
            }
        };

        storage.saveNotification(notification);
    }

    filterByEvent(eventId) {
        // This method can be called to filter bookings by a specific event
        const bookings = storage.getBookings().filter(booking => booking.eventId === eventId);
        
        const bookingsList = document.getElementById('bookingsList');
        if (bookingsList) {
            if (bookings.length === 0) {
                bookingsList.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-ticket-alt"></i>
                        <h3>No Bookings for This Event</h3>
                        <p>This event doesn't have any bookings yet.</p>
                    </div>
                `;
                return;
            }

            const bookingsWithEvents = bookings.map(booking => {
                const event = storage.getEventById(booking.eventId);
                return { ...booking, event };
            }).filter(booking => booking.event);

            bookingsList.innerHTML = bookingsWithEvents.map(booking => 
                this.getBookingCardHTML(booking)
            ).join('');
        }
    }

    getBookingStats() {
        const currentUser = auth.getCurrentUser();
        let bookings = storage.getBookings();
        
        if (auth.isParticipant()) {
            bookings = bookings.filter(booking => booking.userId === currentUser.id);
        } else if (auth.isOrganizer()) {
            const organizerEvents = storage.getEventsByOrganizer(currentUser.id);
            const eventIds = organizerEvents.map(event => event.id);
            bookings = bookings.filter(booking => eventIds.includes(booking.eventId));
        }

        const totalBookings = bookings.length;
        const confirmedBookings = bookings.filter(b => b.status === 'confirmed').length;
        const pendingBookings = bookings.filter(b => b.status === 'pending').length;
        const cancelledBookings = bookings.filter(b => b.status === 'cancelled').length;
        const totalRevenue = bookings
            .filter(b => b.status === 'confirmed')
            .reduce((sum, booking) => sum + (booking.totalAmount || 0), 0);

        return {
            totalBookings,
            confirmedBookings,
            pendingBookings,
            cancelledBookings,
            totalRevenue
        };
    }
}

// Create global instance
window.bookingManager = new BookingManager();