// Event Management
class EventManager {
    constructor() {
        this.currentEvent = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadEvents();
    }

    setupEventListeners() {
        // Create event button
        const createEventBtn = document.getElementById('createEventBtn');
        if (createEventBtn) {
            createEventBtn.addEventListener('click', () => this.showCreateEventModal());
        }

        // Event form
        const eventForm = document.getElementById('eventForm');
        if (eventForm) {
            eventForm.addEventListener('submit', (e) => this.handleEventSubmit(e));
        }

        // Event quantity change for booking
        const bookingQuantity = document.getElementById('bookingQuantity');
        if (bookingQuantity) {
            bookingQuantity.addEventListener('input', () => this.updateBookingSummary());
        }
    }

    loadEvents() {
        const eventsList = document.getElementById('eventsList');
        if (!eventsList) return;

        const events = storage.getEvents();
        const currentUser = auth.getCurrentUser();
        
        if (!currentUser) return;

        // Filter events based on user role
        let filteredEvents = events;
        if (auth.isOrganizer()) {
            filteredEvents = events.filter(event => event.organizerId === currentUser.id);
        }

        if (filteredEvents.length === 0) {
            eventsList.innerHTML = this.getEmptyStateHTML();
            return;
        }

        eventsList.innerHTML = filteredEvents.map(event => this.getEventCardHTML(event)).join('');
    }

    getEventCardHTML(event) {
        const currentUser = auth.getCurrentUser();
        const isOrganizer = auth.isOrganizer();
        const canEdit = isOrganizer && event.organizerId === currentUser.id;
        const eventStatus = Utils.getEventStatus(`${event.date} ${event.time}`);
        const availableTickets = event.capacity - (event.bookings || 0);

        return `
            <div class="event-card" data-event-id="${event.id}">
                <div class="event-header">
                    <div>
                        <h3 class="event-title">${Utils.sanitizeHtml(event.title)}</h3>
                        <p class="event-description">${Utils.sanitizeHtml(event.description)}</p>
                    </div>
                    <span class="event-status ${eventStatus}">${eventStatus}</span>
                </div>
                
                <div class="event-details">
                    <div class="event-detail">
                        <i class="fas fa-calendar"></i>
                        <span>${Utils.formatDate(event.date)}</span>
                    </div>
                    <div class="event-detail">
                        <i class="fas fa-clock"></i>
                        <span>${event.time}</span>
                    </div>
                    <div class="event-detail">
                        <i class="fas fa-map-marker-alt"></i>
                        <span>${Utils.sanitizeHtml(event.location)}</span>
                    </div>
                    <div class="event-detail">
                        <i class="fas fa-users"></i>
                        <span>${event.bookings || 0}/${event.capacity} attendees</span>
                    </div>
                    <div class="event-detail">
                        <i class="fas fa-dollar-sign"></i>
                        <span>${Utils.formatCurrency(event.price)}</span>
                    </div>
                    <div class="event-detail">
                        <i class="fas fa-ticket-alt"></i>
                        <span>${availableTickets} tickets available</span>
                    </div>
                </div>
                
                <div class="event-actions">
                    ${canEdit ? `
                        <button class="btn btn-sm btn-secondary" onclick="eventManager.editEvent('${event.id}')">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="eventManager.deleteEvent('${event.id}')">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    ` : ''}
                    
                    ${auth.isParticipant() && availableTickets > 0 && eventStatus !== 'completed' ? `
                        <button class="btn btn-sm btn-primary" onclick="eventManager.showBookingModal('${event.id}')">
                            <i class="fas fa-ticket-alt"></i> Book Now
                        </button>
                    ` : ''}
                    
                    ${isOrganizer && event.organizerId === currentUser.id ? `
                        <button class="btn btn-sm btn-accent" onclick="eventManager.viewEventBookings('${event.id}')">
                            <i class="fas fa-eye"></i> View Bookings
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }

    getEmptyStateHTML() {
        const isOrganizer = auth.isOrganizer();
        
        return `
            <div class="empty-state">
                <i class="fas fa-calendar-plus"></i>
                <h3>${isOrganizer ? 'No Events Created' : 'No Events Available'}</h3>
                <p>${isOrganizer ? 
                    'Create your first event to get started with event management.' : 
                    'There are no events available for booking at the moment.'
                }</p>
                ${isOrganizer ? `
                    <button class="btn btn-primary" onclick="eventManager.showCreateEventModal()">
                        <i class="fas fa-plus"></i> Create Your First Event
                    </button>
                ` : ''}
            </div>
        `;
    }

    showCreateEventModal() {
        this.currentEvent = null;
        const modal = document.getElementById('eventModal');
        const modalTitle = document.getElementById('eventModalTitle');
        const form = document.getElementById('eventForm');
        
        if (modal && modalTitle && form) {
            modalTitle.textContent = 'Create Event';
            form.reset();
            
            // Set minimum date to today
            const dateInput = document.getElementById('eventDate');
            if (dateInput) {
                const today = new Date().toISOString().split('T')[0];
                dateInput.min = today;
            }
            
            this.showModal('eventModal');
        }
    }

    editEvent(eventId) {
        const event = storage.getEventById(eventId);
        if (!event) {
            Utils.showToast('Event not found', 'error');
            return;
        }

        // Check if user can edit this event
        const currentUser = auth.getCurrentUser();
        if (!auth.isOrganizer() || event.organizerId !== currentUser.id) {
            Utils.showToast('You do not have permission to edit this event', 'error');
            return;
        }

        this.currentEvent = event;
        const modal = document.getElementById('eventModal');
        const modalTitle = document.getElementById('eventModalTitle');
        const form = document.getElementById('eventForm');
        
        if (modal && modalTitle && form) {
            modalTitle.textContent = 'Edit Event';
            
            // Populate form with event data
            document.getElementById('eventTitle').value = event.title;
            document.getElementById('eventDescription').value = event.description;
            document.getElementById('eventDate').value = event.date;
            document.getElementById('eventTime').value = event.time;
            document.getElementById('eventLocation').value = event.location;
            document.getElementById('eventCapacity').value = event.capacity;
            document.getElementById('eventPrice').value = event.price;
            
            this.showModal('eventModal');
        }
    }

    async deleteEvent(eventId) {
        const event = storage.getEventById(eventId);
        if (!event) {
            Utils.showToast('Event not found', 'error');
            return;
        }

        // Check if user can delete this event
        const currentUser = auth.getCurrentUser();
        if (!auth.isOrganizer() || event.organizerId !== currentUser.id) {
            Utils.showToast('You do not have permission to delete this event', 'error');
            return;
        }

        // Check if event has bookings
        const bookings = storage.getBookingsByEvent(eventId);
        if (bookings.length > 0) {
            const confirmed = confirm(
                `This event has ${bookings.length} booking(s). Deleting it will cancel all bookings. Are you sure?`
            );
            if (!confirmed) return;
        }

        try {
            const deleted = storage.deleteEvent(eventId);
            
            if (deleted) {
                Utils.showToast('Event deleted successfully', 'success');
                this.loadEvents();
                
                // Refresh dashboard stats
                if (window.dashboard) {
                    window.dashboard.updateStats();
                }
                
                // Send notification to participants with bookings
                if (bookings.length > 0) {
                    this.notifyEventCancellation(event, bookings);
                }
            } else {
                Utils.showToast('Failed to delete event', 'error');
            }
        } catch (error) {
            console.error('Error deleting event:', error);
            Utils.showToast('An error occurred while deleting the event', 'error');
        }
    }

    async handleEventSubmit(e) {
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

        // Additional validation
        const eventDateTime = new Date(`${formData.eventDate} ${formData.eventTime}`);
        if (eventDateTime <= new Date()) {
            Utils.showToast('Event date and time must be in the future', 'error');
            return;
        }

        if (parseInt(formData.eventCapacity) <= 0) {
            Utils.showToast('Event capacity must be greater than 0', 'error');
            return;
        }

        if (parseFloat(formData.eventPrice) < 0) {
            Utils.showToast('Event price cannot be negative', 'error');
            return;
        }

        // Show loading state
        const submitBtn = form.querySelector('button[type="submit"]');
        Utils.showLoading(submitBtn, true);

        try {
            const currentUser = auth.getCurrentUser();
            
            const eventData = {
                title: formData.eventTitle.trim(),
                description: formData.eventDescription.trim(),
                date: formData.eventDate,
                time: formData.eventTime,
                location: formData.eventLocation.trim(),
                capacity: parseInt(formData.eventCapacity),
                price: parseFloat(formData.eventPrice),
                organizerId: currentUser.id,
                organizerName: currentUser.name
            };

            // If editing, preserve the existing ID and bookings
            if (this.currentEvent) {
                eventData.id = this.currentEvent.id;
                eventData.bookings = this.currentEvent.bookings;
                eventData.createdAt = this.currentEvent.createdAt;
                eventData.updatedAt = new Date().toISOString();
            }

            const saved = storage.saveEvent(eventData);
            
            if (saved) {
                const action = this.currentEvent ? 'updated' : 'created';
                Utils.showToast(`Event ${action} successfully!`, 'success');
                
                this.closeModal('eventModal');
                this.loadEvents();
                
                // Refresh dashboard stats
                if (window.dashboard) {
                    window.dashboard.updateStats();
                }
                
                // If editing and event details changed, notify participants
                if (this.currentEvent) {
                    this.notifyEventUpdate(eventData);
                }
            } else {
                Utils.showToast('Failed to save event', 'error');
            }
        } catch (error) {
            console.error('Error saving event:', error);
            Utils.showToast('An error occurred while saving the event', 'error');
        } finally {
            Utils.showLoading(submitBtn, false);
        }
    }

    showBookingModal(eventId) {
        const event = storage.getEventById(eventId);
        if (!event) {
            Utils.showToast('Event not found', 'error');
            return;
        }

        const availableTickets = event.capacity - (event.bookings || 0);
        if (availableTickets <= 0) {
            Utils.showToast('Sorry, this event is fully booked', 'warning');
            return;
        }

        // Populate event details in booking modal
        const eventDetails = document.getElementById('bookingEventDetails');
        if (eventDetails) {
            eventDetails.innerHTML = `
                <div class="event-details-card">
                    <h4>${Utils.sanitizeHtml(event.title)}</h4>
                    <div class="event-details-grid">
                        <div class="event-detail-item">
                            <i class="fas fa-calendar"></i>
                            <span><strong>Date:</strong> ${Utils.formatDate(event.date)}</span>
                        </div>
                        <div class="event-detail-item">
                            <i class="fas fa-clock"></i>
                            <span><strong>Time:</strong> ${event.time}</span>
                        </div>
                        <div class="event-detail-item">
                            <i class="fas fa-map-marker-alt"></i>
                            <span><strong>Location:</strong> ${Utils.sanitizeHtml(event.location)}</span>
                        </div>
                        <div class="event-detail-item">
                            <i class="fas fa-ticket-alt"></i>
                            <span><strong>Available:</strong> ${availableTickets} tickets</span>
                        </div>
                    </div>
                </div>
            `;
        }

        // Set up quantity limits
        const quantityInput = document.getElementById('bookingQuantity');
        if (quantityInput) {
            quantityInput.max = Math.min(availableTickets, 10); // Max 10 tickets per booking
            quantityInput.value = 1;
        }

        // Store event data for booking
        this.currentEvent = event;
        this.updateBookingSummary();
        
        this.showModal('bookingModal');
    }

    updateBookingSummary() {
        if (!this.currentEvent) return;

        const quantityInput = document.getElementById('bookingQuantity');
        const ticketPrice = document.getElementById('ticketPrice');
        const ticketQuantity = document.getElementById('ticketQuantity');
        const totalPrice = document.getElementById('totalPrice');

        if (quantityInput && ticketPrice && ticketQuantity && totalPrice) {
            const quantity = parseInt(quantityInput.value) || 1;
            const price = this.currentEvent.price;
            const total = quantity * price;

            ticketPrice.textContent = Utils.formatCurrency(price);
            ticketQuantity.textContent = quantity;
            totalPrice.textContent = Utils.formatCurrency(total);
        }
    }

    viewEventBookings(eventId) {
        // Switch to bookings section and filter by event
        if (window.dashboard) {
            window.dashboard.showSection('bookings');
            
            // Set filter to show only this event's bookings
            setTimeout(() => {
                if (window.bookingManager) {
                    window.bookingManager.filterByEvent(eventId);
                }
            }, 100);
        }
    }

    notifyEventUpdate(event) {
        const bookings = storage.getBookingsByEvent(event.id);
        if (bookings.length === 0) return;

        const notification = {
            type: 'email',
            recipients: 'participants',
            subject: `Event Updated: ${event.title}`,
            message: `The event "${event.title}" has been updated. Please check the latest details.`,
            eventId: event.id,
            metadata: {
                eventTitle: event.title,
                eventDate: event.date,
                eventTime: event.time,
                affectedBookings: bookings.length
            }
        };

        storage.saveNotification(notification);
    }

    notifyEventCancellation(event, bookings) {
        const notification = {
            type: 'email',
            recipients: 'participants',
            subject: `Event Cancelled: ${event.title}`,
            message: `We regret to inform you that the event "${event.title}" has been cancelled. Refunds will be processed automatically.`,
            eventId: event.id,
            metadata: {
                eventTitle: event.title,
                cancelledBookings: bookings.length,
                refundAmount: bookings.reduce((sum, booking) => sum + (booking.totalAmount || 0), 0)
            }
        };

        storage.saveNotification(notification);
    }

    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('active');
            modal.style.display = 'flex';
        }
    }

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
            modal.style.display = 'none';
        }
    }

    // Search and filter events
    searchEvents(searchTerm) {
        const events = storage.getEvents();
        const currentUser = auth.getCurrentUser();
        
        let filteredEvents = events;
        if (auth.isOrganizer()) {
            filteredEvents = events.filter(event => event.organizerId === currentUser.id);
        }

        if (searchTerm) {
            filteredEvents = Utils.searchObjects(filteredEvents, searchTerm, [
                'title', 'description', 'location', 'organizerName'
            ]);
        }

        return filteredEvents;
    }

    filterEventsByStatus(status) {
        const events = storage.getEvents();
        const currentUser = auth.getCurrentUser();
        
        let filteredEvents = events;
        if (auth.isOrganizer()) {
            filteredEvents = events.filter(event => event.organizerId === currentUser.id);
        }

        if (status && status !== 'all') {
            filteredEvents = filteredEvents.filter(event => {
                const eventStatus = Utils.getEventStatus(`${event.date} ${event.time}`);
                return eventStatus === status;
            });
        }

        return filteredEvents;
    }

    getEventStats() {
        const events = storage.getEvents();
        const currentUser = auth.getCurrentUser();
        
        let userEvents = events;
        if (auth.isOrganizer()) {
            userEvents = events.filter(event => event.organizerId === currentUser.id);
        }

        const totalEvents = userEvents.length;
        const activeEvents = userEvents.filter(event => {
            const status = Utils.getEventStatus(`${event.date} ${event.time}`);
            return status === 'active' || status === 'upcoming';
        }).length;

        const completedEvents = userEvents.filter(event => {
            const status = Utils.getEventStatus(`${event.date} ${event.time}`);
            return status === 'completed';
        }).length;

        const totalBookings = userEvents.reduce((sum, event) => sum + (event.bookings || 0), 0);

        return {
            totalEvents,
            activeEvents,
            completedEvents,
            totalBookings
        };
    }
}

// Global modal close function
window.closeModal = function(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        modal.style.display = 'none';
    }
};

// Create global instance
window.eventManager = new EventManager();