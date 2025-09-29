// Analytics Management
class AnalyticsManager {
    constructor() {
        this.init();
    }

    init() {
        this.loadAnalytics();
    }

    loadAnalytics() {
        this.updateEventPerformance();
        this.updateRevenueTrends();
        this.updatePopularEvents();
        this.updateFeedbackSummary();
    }

    updateEventPerformance() {
        const container = document.getElementById('eventPerformance');
        if (!container) return;

        const currentUser = auth.getCurrentUser();
        if (!currentUser) return;

        const events = storage.getEvents();
        const bookings = storage.getBookings();
        
        let userEvents = events;
        if (auth.isOrganizer()) {
            userEvents = events.filter(event => event.organizerId === currentUser.id);
        }

        if (userEvents.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-chart-line"></i>
                    <p>No event data available</p>
                </div>
            `;
            return;
        }

        // Calculate performance metrics
        const performanceData = userEvents.map(event => {
            const eventBookings = bookings.filter(b => 
                b.eventId === event.id && b.status === 'confirmed'
            );
            
            const totalBookings = eventBookings.reduce((sum, booking) => 
                sum + (booking.quantity || 1), 0
            );
            
            const revenue = eventBookings.reduce((sum, booking) => 
                sum + (booking.totalAmount || 0), 0
            );
            
            const occupancyRate = (totalBookings / event.capacity) * 100;
            
            return {
                title: event.title,
                bookings: totalBookings,
                capacity: event.capacity,
                revenue: revenue,
                occupancyRate: Math.round(occupancyRate),
                status: Utils.getEventStatus(`${event.date} ${event.time}`)
            };
        });

        // Sort by occupancy rate
        performanceData.sort((a, b) => b.occupancyRate - a.occupancyRate);

        container.innerHTML = `
            <div class="performance-list">
                ${performanceData.map(event => `
                    <div class="performance-item">
                        <div class="performance-header">
                            <h5>${Utils.sanitizeHtml(event.title)}</h5>
                            <span class="badge badge-${this.getStatusBadgeClass(event.status)}">${event.status}</span>
                        </div>
                        <div class="performance-metrics">
                            <div class="metric">
                                <span class="metric-label">Bookings:</span>
                                <span class="metric-value">${event.bookings}/${event.capacity}</span>
                            </div>
                            <div class="metric">
                                <span class="metric-label">Occupancy:</span>
                                <span class="metric-value">${event.occupancyRate}%</span>
                            </div>
                            <div class="metric">
                                <span class="metric-label">Revenue:</span>
                                <span class="metric-value">${Utils.formatCurrency(event.revenue)}</span>
                            </div>
                        </div>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${event.occupancyRate}%"></div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    updateRevenueTrends() {
        const container = document.getElementById('revenueTrends');
        if (!container) return;

        const currentUser = auth.getCurrentUser();
        if (!currentUser) return;

        const bookings = storage.getBookings();
        const events = storage.getEvents();
        
        let relevantBookings = bookings.filter(b => b.status === 'confirmed');
        
        if (auth.isOrganizer()) {
            const organizerEvents = events.filter(event => event.organizerId === currentUser.id);
            const eventIds = organizerEvents.map(event => event.id);
            relevantBookings = relevantBookings.filter(booking => eventIds.includes(booking.eventId));
        }

        if (relevantBookings.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-chart-bar"></i>
                    <p>No revenue data available</p>
                </div>
            `;
            return;
        }

        // Group bookings by month
        const monthlyRevenue = {};
        const monthlyBookings = {};
        
        relevantBookings.forEach(booking => {
            const date = new Date(booking.createdAt);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            
            monthlyRevenue[monthKey] = (monthlyRevenue[monthKey] || 0) + (booking.totalAmount || 0);
            monthlyBookings[monthKey] = (monthlyBookings[monthKey] || 0) + 1;
        });

        // Get last 6 months
        const months = [];
        const now = new Date();
        for (let i = 5; i >= 0; i--) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            months.push({
                key: monthKey,
                label: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
                revenue: monthlyRevenue[monthKey] || 0,
                bookings: monthlyBookings[monthKey] || 0
            });
        }

        const maxRevenue = Math.max(...months.map(m => m.revenue));
        const totalRevenue = months.reduce((sum, m) => sum + m.revenue, 0);
        const totalBookings = months.reduce((sum, m) => sum + m.bookings, 0);

        container.innerHTML = `
            <div class="revenue-summary">
                <div class="summary-stats">
                    <div class="stat">
                        <span class="stat-label">Total Revenue (6 months)</span>
                        <span class="stat-value">${Utils.formatCurrency(totalRevenue)}</span>
                    </div>
                    <div class="stat">
                        <span class="stat-label">Total Bookings</span>
                        <span class="stat-value">${totalBookings}</span>
                    </div>
                    <div class="stat">
                        <span class="stat-label">Average per Booking</span>
                        <span class="stat-value">${Utils.formatCurrency(totalBookings > 0 ? totalRevenue / totalBookings : 0)}</span>
                    </div>
                </div>
                <div class="revenue-chart">
                    ${months.map(month => `
                        <div class="chart-bar">
                            <div class="bar-fill" style="height: ${maxRevenue > 0 ? (month.revenue / maxRevenue) * 100 : 0}%"></div>
                            <div class="bar-label">${month.label}</div>
                            <div class="bar-value">${Utils.formatCurrency(month.revenue)}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    updatePopularEvents() {
        const container = document.getElementById('popularEvents');
        if (!container) return;

        const analyticsData = storage.getAnalyticsData();
        const currentUser = auth.getCurrentUser();
        
        let popularEvents = analyticsData.popularEvents;
        
        if (auth.isOrganizer()) {
            popularEvents = popularEvents.filter(event => event.organizerId === currentUser.id);
        }

        if (popularEvents.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-star"></i>
                    <p>No popular events data</p>
                </div>
            `;
            return;
        }

        container.innerHTML = popularEvents.slice(0, 5).map((event, index) => `
            <div class="popular-event-item">
                <div class="event-rank">#${index + 1}</div>
                <div class="event-info">
                    <div class="popular-event-name">${Utils.sanitizeHtml(event.title)}</div>
                    <div class="event-meta">
                        <span>${Utils.formatDate(event.date)}</span>
                        <span>${Utils.formatCurrency(event.price)}</span>
                    </div>
                </div>
                <div class="popular-event-bookings">
                    <strong>${event.bookingCount}</strong>
                    <small>bookings</small>
                </div>
            </div>
        `).join('');
    }

    updateFeedbackSummary() {
        const container = document.getElementById('feedbackSummary');
        if (!container) return;

        // Simulate feedback data (in a real app, this would come from a feedback system)
        const feedbackData = this.generateSimulatedFeedback();

        if (feedbackData.totalFeedback === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-comments"></i>
                    <p>No feedback data available</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="feedback-stats">
                <div class="feedback-stat">
                    <div class="stat-icon">
                        <i class="fas fa-star"></i>
                    </div>
                    <div class="stat-info">
                        <div class="stat-value">${feedbackData.averageRating.toFixed(1)}</div>
                        <div class="stat-label">Average Rating</div>
                    </div>
                </div>
                <div class="feedback-stat">
                    <div class="stat-icon">
                        <i class="fas fa-comments"></i>
                    </div>
                    <div class="stat-info">
                        <div class="stat-value">${feedbackData.totalFeedback}</div>
                        <div class="stat-label">Total Reviews</div>
                    </div>
                </div>
            </div>
            
            <div class="rating-breakdown">
                ${[5, 4, 3, 2, 1].map(rating => {
                    const count = feedbackData.ratingBreakdown[rating] || 0;
                    const percentage = feedbackData.totalFeedback > 0 ? (count / feedbackData.totalFeedback) * 100 : 0;
                    return `
                        <div class="rating-row">
                            <span class="rating-stars">
                                ${Array(rating).fill().map(() => '<i class="fas fa-star"></i>').join('')}
                            </span>
                            <div class="rating-bar">
                                <div class="rating-fill" style="width: ${percentage}%"></div>
                            </div>
                            <span class="rating-count">${count}</span>
                        </div>
                    `;
                }).join('')}
            </div>
            
            <div class="feedback-highlights">
                <h5>Recent Feedback</h5>
                ${feedbackData.recentComments.map(comment => `
                    <div class="feedback-comment">
                        <div class="comment-rating">
                            ${Array(comment.rating).fill().map(() => '<i class="fas fa-star"></i>').join('')}
                        </div>
                        <div class="comment-text">"${comment.text}"</div>
                        <div class="comment-meta">${comment.eventTitle} - ${Utils.formatDate(comment.date, 'short')}</div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    generateSimulatedFeedback() {
        const events = storage.getEvents();
        const bookings = storage.getBookings();
        const currentUser = auth.getCurrentUser();
        
        let relevantEvents = events;
        if (auth.isOrganizer()) {
            relevantEvents = events.filter(event => event.organizerId === currentUser.id);
        }

        const completedEvents = relevantEvents.filter(event => 
            Utils.getEventStatus(`${event.date} ${event.time}`) === 'completed'
        );

        if (completedEvents.length === 0) {
            return { totalFeedback: 0, averageRating: 0, ratingBreakdown: {}, recentComments: [] };
        }

        // Simulate feedback based on completed events
        const feedbackComments = [
            "Great event! Well organized and informative.",
            "Loved the venue and the speakers were excellent.",
            "Good event but could use better catering.",
            "Amazing experience, will definitely attend again!",
            "The event was okay, met my expectations.",
            "Outstanding organization and great networking opportunities.",
            "Could improve on time management but overall good.",
            "Fantastic event with great value for money.",
            "The content was relevant and well-presented.",
            "Excellent event, highly recommend to others."
        ];

        const totalFeedback = Math.min(completedEvents.length * 3, 50); // Simulate 3 reviews per event max
        const ratingBreakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
        const recentComments = [];

        // Generate ratings (weighted towards positive)
        for (let i = 0; i < totalFeedback; i++) {
            const random = Math.random();
            let rating;
            if (random < 0.4) rating = 5;
            else if (random < 0.7) rating = 4;
            else if (random < 0.85) rating = 3;
            else if (random < 0.95) rating = 2;
            else rating = 1;
            
            ratingBreakdown[rating]++;
            
            // Add to recent comments (last 5)
            if (recentComments.length < 5) {
                const randomEvent = completedEvents[Math.floor(Math.random() * completedEvents.length)];
                recentComments.push({
                    rating: rating,
                    text: feedbackComments[Math.floor(Math.random() * feedbackComments.length)],
                    eventTitle: randomEvent.title,
                    date: randomEvent.date
                });
            }
        }

        const averageRating = totalFeedback > 0 ? 
            Object.keys(ratingBreakdown).reduce((sum, rating) => 
                sum + (parseInt(rating) * ratingBreakdown[rating]), 0
            ) / totalFeedback : 0;

        return {
            totalFeedback,
            averageRating,
            ratingBreakdown,
            recentComments
        };
    }

    getStatusBadgeClass(status) {
        switch (status) {
            case 'completed':
                return 'secondary';
            case 'upcoming':
                return 'warning';
            case 'active':
                return 'success';
            default:
                return 'primary';
        }
    }

    // Export analytics data
    exportAnalyticsData() {
        const currentUser = auth.getCurrentUser();
        const events = storage.getEvents();
        const bookings = storage.getBookings();
        
        let userEvents = events;
        let userBookings = bookings;
        
        if (auth.isOrganizer()) {
            userEvents = events.filter(event => event.organizerId === currentUser.id);
            const eventIds = userEvents.map(event => event.id);
            userBookings = bookings.filter(booking => eventIds.includes(booking.eventId));
        } else if (auth.isParticipant()) {
            userBookings = bookings.filter(booking => booking.userId === currentUser.id);
        }

        const analyticsData = {
            user: {
                name: currentUser.name,
                email: currentUser.email,
                role: currentUser.role
            },
            summary: {
                totalEvents: userEvents.length,
                totalBookings: userBookings.length,
                totalRevenue: userBookings
                    .filter(b => b.status === 'confirmed')
                    .reduce((sum, booking) => sum + (booking.totalAmount || 0), 0)
            },
            events: userEvents.map(event => ({
                title: event.title,
                date: event.date,
                capacity: event.capacity,
                bookings: event.bookings || 0,
                revenue: userBookings
                    .filter(b => b.eventId === event.id && b.status === 'confirmed')
                    .reduce((sum, booking) => sum + (booking.totalAmount || 0), 0)
            })),
            bookings: userBookings.map(booking => ({
                eventTitle: booking.eventTitle,
                date: booking.createdAt,
                quantity: booking.quantity,
                amount: booking.totalAmount,
                status: booking.status
            })),
            exportDate: new Date().toISOString()
        };

        Utils.downloadJSON(analyticsData, `analytics-${currentUser.role}-${new Date().toISOString().split('T')[0]}.json`);
        Utils.showToast('Analytics data exported successfully', 'success');
    }

    // Get comprehensive analytics summary
    getAnalyticsSummary() {
        const currentUser = auth.getCurrentUser();
        const events = storage.getEvents();
        const bookings = storage.getBookings();
        const users = storage.getUsers();
        
        let userEvents = events;
        let userBookings = bookings;
        
        if (auth.isOrganizer()) {
            userEvents = events.filter(event => event.organizerId === currentUser.id);
            const eventIds = userEvents.map(event => event.id);
            userBookings = bookings.filter(booking => eventIds.includes(booking.eventId));
        } else if (auth.isParticipant()) {
            userBookings = bookings.filter(booking => booking.userId === currentUser.id);
        }

        const totalRevenue = userBookings
            .filter(b => b.status === 'confirmed')
            .reduce((sum, booking) => sum + (booking.totalAmount || 0), 0);

        const averageTicketPrice = userEvents.length > 0 ? 
            userEvents.reduce((sum, event) => sum + event.price, 0) / userEvents.length : 0;

        const averageBookingValue = userBookings.length > 0 ? totalRevenue / userBookings.length : 0;

        const upcomingEvents = userEvents.filter(event => 
            Utils.getEventStatus(`${event.date} ${event.time}`) !== 'completed'
        ).length;

        return {
            totalEvents: userEvents.length,
            upcomingEvents,
            totalBookings: userBookings.length,
            confirmedBookings: userBookings.filter(b => b.status === 'confirmed').length,
            totalRevenue,
            averageTicketPrice,
            averageBookingValue,
            totalUsers: users.length,
            conversionRate: userEvents.length > 0 ? 
                (userBookings.filter(b => b.status === 'confirmed').length / userEvents.reduce((sum, event) => sum + event.capacity, 0)) * 100 : 0
        };
    }
}

// Create global instance
window.analyticsManager = new AnalyticsManager();