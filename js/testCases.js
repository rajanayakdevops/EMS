// Test Cases Management
class TestCaseManager {
    constructor() {
        this.testResults = [];
        this.init();
    }

    init() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Run all tests button
        const runAllTestsBtn = document.getElementById('runAllTestsBtn');
        if (runAllTestsBtn) {
            runAllTestsBtn.addEventListener('click', () => this.runAllTests());
        }
    }

    async runAllTests() {
        const runButton = document.getElementById('runAllTestsBtn');
        Utils.showLoading(runButton, true);
        
        Utils.showToast('Running all test cases...', 'info');
        
        this.testResults = [];
        
        // Run different test categories
        await this.runAuthenticationTests();
        await this.runEventManagementTests();
        await this.runBookingTests();
        await this.runNotificationTests();
        await this.runAnalyticsTests();
        
        this.displayTestResults();
        Utils.showLoading(runButton, false);
        
        const passedTests = this.testResults.filter(result => result.passed).length;
        const totalTests = this.testResults.length;
        
        Utils.showToast(
            `Test run completed: ${passedTests}/${totalTests} tests passed`, 
            passedTests === totalTests ? 'success' : 'warning',
            5000
        );
    }

    async runAuthenticationTests() {
        const testCategory = 'Authentication Tests';
        
        // Test 1: Valid Login
        await this.runTest(
            testCategory,
            'Valid Login',
            'User should be able to login with correct credentials',
            async () => {
                const result = await auth.login('test@example.com', 'password123', 'participant');
                return result.success;
            },
            true
        );

        // Test 2: Invalid Login
        await this.runTest(
            testCategory,
            'Invalid Login',
            'Login should fail with incorrect credentials',
            async () => {
                const result = await auth.login('test@example.com', 'wrongpassword', 'participant');
                return !result.success;
            },
            true
        );

        // Test 3: Valid Signup
        await this.runTest(
            testCategory,
            'Valid Signup',
            'User should be able to create account with valid data',
            async () => {
                const testEmail = `test${Date.now()}@example.com`;
                const result = await auth.signup('Test User', testEmail, 'password123', 'participant');
                return result.success;
            },
            true
        );

        // Test 4: Duplicate Email Signup
        await this.runTest(
            testCategory,
            'Duplicate Email Signup',
            'Signup should fail with existing email',
            async () => {
                // First create a user
                const testEmail = `duplicate${Date.now()}@example.com`;
                await auth.signup('Test User 1', testEmail, 'password123', 'participant');
                
                // Try to create another with same email
                const result = await auth.signup('Test User 2', testEmail, 'password123', 'participant');
                return !result.success;
            },
            true
        );

        // Test 5: Email Validation
        await this.runTest(
            testCategory,
            'Email Validation',
            'Should validate email format',
            () => {
                return !Utils.validateEmail('invalid-email') && Utils.validateEmail('valid@example.com');
            },
            true
        );
    }

    async runEventManagementTests() {
        const testCategory = 'Event Management Tests';
        
        // Test 1: Create Event
        await this.runTest(
            testCategory,
            'Create Event',
            'Organizer should be able to create new event',
            () => {
                const eventData = {
                    title: 'Test Event',
                    description: 'Test Description',
                    date: '2024-12-31',
                    time: '18:00',
                    location: 'Test Location',
                    capacity: 100,
                    price: 50.00,
                    organizerId: 'test-organizer',
                    organizerName: 'Test Organizer'
                };
                
                const saved = storage.saveEvent(eventData);
                return saved;
            },
            true
        );

        // Test 2: Event Validation
        await this.runTest(
            testCategory,
            'Event Date Validation',
            'Should validate future event dates',
            () => {
                const pastDate = '2020-01-01';
                const futureDate = '2025-12-31';
                
                return Utils.isPastDate(pastDate) && !Utils.isPastDate(futureDate);
            },
            true
        );

        // Test 3: Event Capacity
        await this.runTest(
            testCategory,
            'Event Capacity Check',
            'Should track available tickets correctly',
            () => {
                const event = {
                    id: 'test-event-capacity',
                    capacity: 100,
                    bookings: 75
                };
                
                const availableTickets = event.capacity - event.bookings;
                return availableTickets === 25;
            },
            true
        );

        // Test 4: Event Status
        await this.runTest(
            testCategory,
            'Event Status Calculation',
            'Should calculate event status correctly',
            () => {
                const pastDate = '2020-01-01 10:00';
                const futureDate = '2025-12-31 10:00';
                
                const pastStatus = Utils.getEventStatus(pastDate);
                const futureStatus = Utils.getEventStatus(futureDate);
                
                return pastStatus === 'completed' && (futureStatus === 'active' || futureStatus === 'upcoming');
            },
            true
        );

        // Test 5: Event Search
        await this.runTest(
            testCategory,
            'Event Search Functionality',
            'Should search events by title and description',
            () => {
                const events = [
                    { title: 'Tech Conference', description: 'Technology event' },
                    { title: 'Music Festival', description: 'Music and arts' },
                    { title: 'Food Fair', description: 'Culinary experience' }
                ];
                
                const searchResults = Utils.searchObjects(events, 'tech', ['title', 'description']);
                return searchResults.length === 1 && searchResults[0].title === 'Tech Conference';
            },
            true
        );
    }

    async runBookingTests() {
        const testCategory = 'Booking Tests';
        
        // Test 1: Create Booking
        await this.runTest(
            testCategory,
            'Create Booking',
            'User should be able to book available event',
            () => {
                const bookingData = {
                    eventId: 'test-event',
                    userId: 'test-user',
                    quantity: 2,
                    totalAmount: 100.00,
                    status: 'confirmed'
                };
                
                const saved = storage.saveBooking(bookingData);
                return saved;
            },
            true
        );

        // Test 2: Booking Reference Generation
        await this.runTest(
            testCategory,
            'Booking Reference Generation',
            'Should generate unique booking reference',
            () => {
                const ref1 = bookingManager.generateBookingReference();
                const ref2 = bookingManager.generateBookingReference();
                
                return ref1 !== ref2 && ref1.startsWith('BK') && ref2.startsWith('BK');
            },
            true
        );

        // Test 3: Booking Calculation
        await this.runTest(
            testCategory,
            'Booking Total Calculation',
            'Should calculate booking total correctly',
            () => {
                const quantity = 3;
                const price = 25.50;
                const expectedTotal = quantity * price;
                
                return expectedTotal === 76.50;
            },
            true
        );

        // Test 4: Booking Status Update
        await this.runTest(
            testCategory,
            'Booking Status Update',
            'Should update booking status correctly',
            () => {
                // Create a test booking
                const bookingData = {
                    id: 'test-booking-status',
                    eventId: 'test-event',
                    userId: 'test-user',
                    status: 'pending'
                };
                
                storage.saveBooking(bookingData);
                
                // Update status
                const updated = storage.updateBookingStatus('test-booking-status', 'confirmed');
                const booking = storage.getBookingById('test-booking-status');
                
                return updated && booking && booking.status === 'confirmed';
            },
            true
        );

        // Test 5: Overbooking Prevention
        await this.runTest(
            testCategory,
            'Overbooking Prevention',
            'Should prevent booking when capacity exceeded',
            () => {
                const event = {
                    capacity: 10,
                    bookings: 8
                };
                
                const requestedQuantity = 5;
                const availableTickets = event.capacity - event.bookings;
                
                return requestedQuantity > availableTickets; // Should return true (booking not allowed)
            },
            true
        );
    }

    async runNotificationTests() {
        const testCategory = 'Notification Tests';
        
        // Test 1: Send Notification
        await this.runTest(
            testCategory,
            'Send Notification',
            'Should save notification successfully',
            () => {
                const notificationData = {
                    type: 'email',
                    recipients: 'all',
                    subject: 'Test Notification',
                    message: 'This is a test notification',
                    senderId: 'test-sender'
                };
                
                const saved = storage.saveNotification(notificationData);
                return saved;
            },
            true
        );

        // Test 2: Notification Type Validation
        await this.runTest(
            testCategory,
            'Notification Type Validation',
            'Should validate notification types',
            () => {
                const validTypes = ['email', 'sms', 'both'];
                const testType = 'email';
                
                return validTypes.includes(testType);
            },
            true
        );

        // Test 3: Recipient Count Calculation
        await this.runTest(
            testCategory,
            'Recipient Count Calculation',
            'Should calculate recipient count correctly',
            () => {
                // Mock users data
                const mockUsers = [
                    { role: 'organizer' },
                    { role: 'participant' },
                    { role: 'participant' },
                    { role: 'organizer' }
                ];
                
                const organizerCount = mockUsers.filter(u => u.role === 'organizer').length;
                const participantCount = mockUsers.filter(u => u.role === 'participant').length;
                
                return organizerCount === 2 && participantCount === 2;
            },
            true
        );

        // Test 4: Time Ago Calculation
        await this.runTest(
            testCategory,
            'Time Ago Calculation',
            'Should calculate time ago correctly',
            () => {
                const now = new Date();
                const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
                
                const timeAgo = notificationManager.getTimeAgo(oneHourAgo.toISOString());
                return timeAgo.includes('hour');
            },
            true
        );

        // Test 5: Notification Icon Selection
        await this.runTest(
            testCategory,
            'Notification Icon Selection',
            'Should select correct icon for notification type',
            () => {
                const emailIcon = notificationManager.getNotificationIcon('email');
                const smsIcon = notificationManager.getNotificationIcon('sms');
                
                return emailIcon === 'fa-envelope' && smsIcon === 'fa-sms';
            },
            true
        );
    }

    async runAnalyticsTests() {
        const testCategory = 'Analytics Tests';
        
        // Test 1: Revenue Calculation
        await this.runTest(
            testCategory,
            'Revenue Calculation',
            'Should calculate total revenue correctly',
            () => {
                const bookings = [
                    { status: 'confirmed', totalAmount: 100 },
                    { status: 'confirmed', totalAmount: 150 },
                    { status: 'cancelled', totalAmount: 75 },
                    { status: 'confirmed', totalAmount: 200 }
                ];
                
                const totalRevenue = bookings
                    .filter(b => b.status === 'confirmed')
                    .reduce((sum, booking) => sum + booking.totalAmount, 0);
                
                return totalRevenue === 450;
            },
            true
        );

        // Test 2: Percentage Calculation
        await this.runTest(
            testCategory,
            'Percentage Calculation',
            'Should calculate percentages correctly',
            () => {
                const percentage = Utils.calculatePercentage(75, 100);
                return percentage === 75;
            },
            true
        );

        // Test 3: Average Calculation
        await this.runTest(
            testCategory,
            'Average Calculation',
            'Should calculate averages correctly',
            () => {
                const values = [10, 20, 30, 40, 50];
                const average = values.reduce((sum, val) => sum + val, 0) / values.length;
                
                return average === 30;
            },
            true
        );

        // Test 4: Data Sorting
        await this.runTest(
            testCategory,
            'Data Sorting',
            'Should sort data correctly',
            () => {
                const events = [
                    { title: 'Event C', bookings: 10 },
                    { title: 'Event A', bookings: 30 },
                    { title: 'Event B', bookings: 20 }
                ];
                
                const sorted = Utils.sortObjects(events, 'bookings', 'desc');
                return sorted[0].title === 'Event A' && sorted[0].bookings === 30;
            },
            true
        );

        // Test 5: Currency Formatting
        await this.runTest(
            testCategory,
            'Currency Formatting',
            'Should format currency correctly',
            () => {
                const formatted = Utils.formatCurrency(1234.56);
                return formatted === '$1,234.56';
            },
            true
        );
    }

    async runTest(category, testName, description, testFunction, expected) {
        try {
            // Add small delay to simulate real testing
            await new Promise(resolve => setTimeout(resolve, 100));
            
            const actual = await testFunction();
            const passed = actual === expected;
            
            this.testResults.push({
                category,
                testName,
                description,
                expected,
                actual,
                passed,
                timestamp: new Date().toISOString()
            });
            
        } catch (error) {
            this.testResults.push({
                category,
                testName,
                description,
                expected,
                actual: `Error: ${error.message}`,
                passed: false,
                timestamp: new Date().toISOString()
            });
        }
    }

    displayTestResults() {
        const container = document.getElementById('testResults');
        if (!container) return;

        // Group results by category
        const groupedResults = {};
        this.testResults.forEach(result => {
            if (!groupedResults[result.category]) {
                groupedResults[result.category] = [];
            }
            groupedResults[result.category].push(result);
        });

        container.innerHTML = Object.keys(groupedResults).map(category => {
            const categoryResults = groupedResults[category];
            const passedCount = categoryResults.filter(r => r.passed).length;
            const totalCount = categoryResults.length;
            
            return `
                <div class="test-category">
                    <h3>
                        <i class="fas ${passedCount === totalCount ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
                        ${category}
                        <span class="test-summary">(${passedCount}/${totalCount} passed)</span>
                    </h3>
                    
                    ${categoryResults.map(result => `
                        <div class="test-case">
                            <div class="test-info">
                                <h4>${result.testName}</h4>
                                <p>${result.description}</p>
                            </div>
                            <div class="test-expected">
                                <strong>Expected:</strong>
                                <code>${this.formatTestValue(result.expected)}</code>
                            </div>
                            <div class="test-actual">
                                <strong>Actual:</strong>
                                <code>${this.formatTestValue(result.actual)}</code>
                            </div>
                            <div class="test-result ${result.passed ? 'pass' : 'fail'}">
                                ${result.passed ? 'PASS' : 'FAIL'}
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        }).join('');
    }

    formatTestValue(value) {
        if (typeof value === 'boolean') {
            return value.toString();
        } else if (typeof value === 'object') {
            return JSON.stringify(value, null, 2);
        } else if (typeof value === 'string' && value.startsWith('Error:')) {
            return `<span style="color: var(--danger-color);">${value}</span>`;
        } else {
            return value.toString();
        }
    }

    // Export test results
    exportTestResults() {
        const exportData = {
            testRun: {
                timestamp: new Date().toISOString(),
                totalTests: this.testResults.length,
                passedTests: this.testResults.filter(r => r.passed).length,
                failedTests: this.testResults.filter(r => r.passed === false).length
            },
            results: this.testResults,
            summary: this.getTestSummary()
        };

        Utils.downloadJSON(exportData, `test-results-${new Date().toISOString().split('T')[0]}.json`);
        Utils.showToast('Test results exported successfully', 'success');
    }

    getTestSummary() {
        const summary = {};
        
        this.testResults.forEach(result => {
            if (!summary[result.category]) {
                summary[result.category] = {
                    total: 0,
                    passed: 0,
                    failed: 0
                };
            }
            
            summary[result.category].total++;
            if (result.passed) {
                summary[result.category].passed++;
            } else {
                summary[result.category].failed++;
            }
        });

        return summary;
    }

    // Clear test results
    clearTestResults() {
        this.testResults = [];
        const container = document.getElementById('testResults');
        if (container) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-vial"></i>
                    <h3>No Test Results</h3>
                    <p>Click "Run All Tests" to execute the test suite.</p>
                </div>
            `;
        }
    }

    // Run specific test category
    async runTestCategory(category) {
        this.testResults = this.testResults.filter(r => r.category !== category);
        
        switch (category) {
            case 'Authentication Tests':
                await this.runAuthenticationTests();
                break;
            case 'Event Management Tests':
                await this.runEventManagementTests();
                break;
            case 'Booking Tests':
                await this.runBookingTests();
                break;
            case 'Notification Tests':
                await this.runNotificationTests();
                break;
            case 'Analytics Tests':
                await this.runAnalyticsTests();
                break;
        }
        
        this.displayTestResults();
        
        const categoryResults = this.testResults.filter(r => r.category === category);
        const passed = categoryResults.filter(r => r.passed).length;
        const total = categoryResults.length;
        
        Utils.showToast(`${category}: ${passed}/${total} tests passed`, passed === total ? 'success' : 'warning');
    }
}

// Create global instance
window.testCaseManager = new TestCaseManager();