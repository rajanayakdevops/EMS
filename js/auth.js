// Authentication Management
class AuthManager {
    constructor() {
        this.currentUser = null;
        this.init();
    }

    init() {
        // Check if user is already logged in
        this.currentUser = storage.getCurrentUser();
        
        // Set up event listeners
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Login form
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        // Signup form
        const signupForm = document.getElementById('signupForm');
        if (signupForm) {
            signupForm.addEventListener('submit', (e) => this.handleSignup(e));
        }

        // Form switching
        const showSignupBtn = document.getElementById('showSignup');
        const showLoginBtn = document.getElementById('showLogin');
        
        if (showSignupBtn) {
            showSignupBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.showSignupForm();
            });
        }

        if (showLoginBtn) {
            showLoginBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.showLoginForm();
            });
        }

        // Logout button
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.logout());
        }
    }

    async handleLogin(e) {
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
            // Simulate API delay
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            const result = await this.login(formData.loginEmail, formData.loginPassword, formData.loginRole);
            
            if (result.success) {
                Utils.showToast('Login successful!', 'success');
                this.redirectToDashboard();
            } else {
                Utils.showToast(result.message, 'error');
            }
        } catch (error) {
            console.error('Login error:', error);
            Utils.showToast('An error occurred during login', 'error');
        } finally {
            Utils.showLoading(submitBtn, false);
        }
    }

    async handleSignup(e) {
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
        if (formData.signupPassword.length < 6) {
            Utils.showToast('Password must be at least 6 characters long', 'error');
            return;
        }

        // Show loading state
        const submitBtn = form.querySelector('button[type="submit"]');
        Utils.showLoading(submitBtn, true);

        try {
            // Simulate API delay
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            const result = await this.signup(
                formData.signupName,
                formData.signupEmail,
                formData.signupPassword,
                formData.signupRole
            );
            
            if (result.success) {
                Utils.showToast('Account created successfully!', 'success');
                this.showLoginForm();
                
                // Pre-fill login form
                document.getElementById('loginEmail').value = formData.signupEmail;
                document.getElementById('loginRole').value = formData.signupRole;
            } else {
                Utils.showToast(result.message, 'error');
            }
        } catch (error) {
            console.error('Signup error:', error);
            Utils.showToast('An error occurred during signup', 'error');
        } finally {
            Utils.showLoading(submitBtn, false);
        }
    }

    async login(email, password, role) {
        try {
            // Validate input
            if (!email || !password || !role) {
                return {
                    success: false,
                    message: 'All fields are required'
                };
            }

            if (!Utils.validateEmail(email)) {
                return {
                    success: false,
                    message: 'Please enter a valid email address'
                };
            }

            // Check if user exists
            const user = storage.getUserByEmail(email);
            
            if (!user) {
                return {
                    success: false,
                    message: 'User not found. Please check your email or sign up.'
                };
            }

            // Verify password (in real app, this would be hashed)
            if (user.password !== password) {
                return {
                    success: false,
                    message: 'Invalid password'
                };
            }

            // Verify role
            if (user.role !== role) {
                return {
                    success: false,
                    message: 'Invalid role selected'
                };
            }

            // Update last login
            user.lastLogin = new Date().toISOString();
            storage.saveUser(user);

            // Set current user
            this.currentUser = user;
            storage.setCurrentUser(user);

            return {
                success: true,
                user: user
            };

        } catch (error) {
            console.error('Login error:', error);
            return {
                success: false,
                message: 'An error occurred during login'
            };
        }
    }

    async signup(name, email, password, role) {
        try {
            // Validate input
            if (!name || !email || !password || !role) {
                return {
                    success: false,
                    message: 'All fields are required'
                };
            }

            if (!Utils.validateEmail(email)) {
                return {
                    success: false,
                    message: 'Please enter a valid email address'
                };
            }

            if (!Utils.validatePassword(password)) {
                return {
                    success: false,
                    message: 'Password must be at least 6 characters long'
                };
            }

            // Check if user already exists
            const existingUser = storage.getUserByEmail(email);
            if (existingUser) {
                return {
                    success: false,
                    message: 'An account with this email already exists'
                };
            }

            // Create new user
            const newUser = {
                name: name.trim(),
                email: email.toLowerCase().trim(),
                password: password, // In real app, this would be hashed
                role: role,
                createdAt: new Date().toISOString(),
                isActive: true
            };

            // Save user
            const saved = storage.saveUser(newUser);
            
            if (saved) {
                return {
                    success: true,
                    user: newUser
                };
            } else {
                return {
                    success: false,
                    message: 'Failed to create account. Please try again.'
                };
            }

        } catch (error) {
            console.error('Signup error:', error);
            return {
                success: false,
                message: 'An error occurred during signup'
            };
        }
    }

    logout() {
        this.currentUser = null;
        storage.logout();
        
        Utils.showToast('Logged out successfully', 'success');
        this.redirectToAuth();
    }

    showLoginForm() {
        const loginForm = document.getElementById('login-form');
        const signupForm = document.getElementById('signup-form');
        
        if (loginForm && signupForm) {
            loginForm.classList.add('active');
            signupForm.classList.remove('active');
            
            // Clear forms
            document.getElementById('loginForm').reset();
        }
    }

    showSignupForm() {
        const loginForm = document.getElementById('login-form');
        const signupForm = document.getElementById('signup-form');
        
        if (loginForm && signupForm) {
            signupForm.classList.add('active');
            loginForm.classList.remove('active');
            
            // Clear forms
            document.getElementById('signupForm').reset();
        }
    }

    redirectToDashboard() {
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

    redirectToAuth() {
        const authSection = document.getElementById('auth-section');
        const dashboardSection = document.getElementById('dashboard-section');
        
        if (authSection && dashboardSection) {
            dashboardSection.classList.add('hidden');
            authSection.classList.remove('hidden');
            
            // Clear forms
            const forms = document.querySelectorAll('form');
            forms.forEach(form => form.reset());
        }
    }

    getCurrentUser() {
        return this.currentUser;
    }

    isLoggedIn() {
        return this.currentUser !== null;
    }

    hasRole(role) {
        return this.currentUser && this.currentUser.role === role;
    }

    isOrganizer() {
        return this.hasRole('organizer');
    }

    isParticipant() {
        return this.hasRole('participant');
    }

    // Password reset (simulation)
    async resetPassword(email) {
        try {
            const user = storage.getUserByEmail(email);
            
            if (!user) {
                return {
                    success: false,
                    message: 'User not found'
                };
            }

            // In a real app, this would send an email
            // For demo purposes, we'll just show a success message
            Utils.showToast('Password reset instructions sent to your email', 'info');
            
            return {
                success: true,
                message: 'Password reset instructions sent'
            };

        } catch (error) {
            console.error('Password reset error:', error);
            return {
                success: false,
                message: 'An error occurred'
            };
        }
    }

    // Update user profile
    async updateProfile(updates) {
        try {
            if (!this.currentUser) {
                return {
                    success: false,
                    message: 'Not logged in'
                };
            }

            // Validate email if being updated
            if (updates.email && !Utils.validateEmail(updates.email)) {
                return {
                    success: false,
                    message: 'Invalid email address'
                };
            }

            // Check if email is already taken by another user
            if (updates.email && updates.email !== this.currentUser.email) {
                const existingUser = storage.getUserByEmail(updates.email);
                if (existingUser) {
                    return {
                        success: false,
                        message: 'Email already in use'
                    };
                }
            }

            // Update user
            const updatedUser = { ...this.currentUser, ...updates };
            updatedUser.updatedAt = new Date().toISOString();
            
            const saved = storage.saveUser(updatedUser);
            
            if (saved) {
                this.currentUser = updatedUser;
                storage.setCurrentUser(updatedUser);
                
                return {
                    success: true,
                    user: updatedUser
                };
            } else {
                return {
                    success: false,
                    message: 'Failed to update profile'
                };
            }

        } catch (error) {
            console.error('Profile update error:', error);
            return {
                success: false,
                message: 'An error occurred'
            };
        }
    }
}

// Create global instance
window.auth = new AuthManager();