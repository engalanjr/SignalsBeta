// AppController - Main application controller for Flux architecture
class AppController {
    constructor() {
        this.currentTab = 'signal-feed';
        this.isInitialized = false;
        this.controllers = new Map();
        
        console.log('🚀 Initializing AppController with Flux architecture...');
    }

    async init() {
        try {
            this.showLoading();
            
            // Initialize Flux store with data
            console.log('📡 Loading initial data through Flux actions...');
            dispatcher.dispatch(Actions.dataLoadRequested());
            
            // Load all data through SignalsRepository (which uses Flux actions)
            await SignalsRepository.loadAllData();
            
            // Initialize focused controllers
            this.initializeControllers();
            
            // Set up tab navigation
            this.setupTabNavigation();
            
            // Subscribe to store changes for app-level updates
            this.subscribeToStore();
            
            // Render initial tab
            this.renderCurrentTab();
            
            console.log('✅ AppController initialization complete!');
            this.isInitialized = true;
            
        } catch (error) {
            console.error('❌ Failed to initialize AppController:', error);
            this.showErrorMessage('Failed to load application. Please refresh the page.');
        } finally {
            this.hideLoading();
        }
    }
    
    initializeControllers() {
        // Create focused controllers for different app areas
        this.controllers.set('signals', new SignalsController());
        this.controllers.set('portfolio', new PortfolioController());
        this.controllers.set('feedback', new FeedbackController());
        this.controllers.set('comments', new CommentsController());
        
        console.log('🎯 Focused controllers initialized');
    }
    
    setupTabNavigation() {
        const navTabs = document.querySelectorAll('.nav-tab');
        navTabs.forEach(tab => {
            const handleTabSwitch = (e) => {
                e.preventDefault();
                const tabName = e.target.getAttribute('data-tab');
                this.switchTab(tabName);
            };

            tab.addEventListener('click', handleTabSwitch);
            tab.addEventListener('touchend', handleTabSwitch, { passive: false });
        });
    }
    
    subscribeToStore() {
        // Subscribe to store changes for app-level updates
        signalsStore.subscribe('app-controller', () => {
            this.updateSummaryStats();
        });
        
        // Subscribe to data loading states
        signalsStore.subscribe('data-load', (eventType) => {
            if (eventType === 'data-load-succeeded') {
                this.updateSummaryStats();
                this.renderCurrentTab();
            } else if (eventType === 'data-load-failed') {
                this.showErrorMessage('Failed to load data. Please refresh the page.');
            }
        });
    }
    
    switchTab(tabName) {
        if (this.currentTab === tabName) return;
        
        console.log(`🔄 Switching from ${this.currentTab} to ${tabName}`);
        
        // Update active tab in UI
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.classList.remove('active');
            if (tab.getAttribute('data-tab') === tabName) {
                tab.classList.add('active');
            }
        });
        
        // Update content containers
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(tabName)?.classList.add('active');
        
        this.currentTab = tabName;
        this.renderCurrentTab();
        
        // Dispatch action to track tab switch
        dispatcher.dispatch(Actions.tabSwitched(tabName));
    }
    
    renderCurrentTab() {
        const state = signalsStore.getState();
        
        switch (this.currentTab) {
            case 'signal-feed':
                this.controllers.get('signals')?.render(state);
                break;
            case 'my-portfolio':
                this.controllers.get('portfolio')?.render(state);
                break;
            case 'actions':
                // Handle actions tab if ActionsRenderer exists
                if (typeof ActionsRenderer !== 'undefined') {
                    console.log('📋 Rendering Actions tab');
                    // For now, use the existing ActionsRenderer until it's converted
                    ActionsRenderer.renderActions({
                        actionPlans: state.actionPlans,
                        accounts: state.accounts
                    }).catch(error => {
                        console.error('Error rendering actions:', error);
                    });
                } else {
                    console.error('ActionsRenderer not available');
                }
                break;
            default:
                console.warn(`Unknown tab: ${this.currentTab}`);
        }
    }
    
    updateSummaryStats() {
        const state = signalsStore.getState();
        
        // Update dashboard stats from store state
        const allSignals = Array.from(state.signals.values());
        const highPrioritySignals = allSignals.filter(s => s.priority === 'High');
        const accountsWithSignals = Array.from(state.accounts.values()).filter(account => account.signals.length > 0);
        
        // Update Requires Attention count (accounts without action plans)
        const planAccountIds = new Set(
            Array.from(state.actionPlans.values())
                .map(plan => plan.accountId)
                .filter(accountId => accountId)
        );
        const accountsWithoutPlans = Array.from(state.accounts.values()).filter(account => 
            !planAccountIds.has(account.id)
        );
        
        // Update DOM elements
        const updateElement = (id, value) => {
            const element = document.getElementById(id);
            if (element) element.textContent = value;
        };
        
        updateElement('requiresAttentionCount', accountsWithoutPlans.length);
        updateElement('highPriorityDashboard', highPrioritySignals.length);
        updateElement('activeAccountsCount', accountsWithSignals.length);
    }
    
    showLoading() {
        const loader = document.getElementById('loading');
        if (loader) loader.style.display = 'flex';
    }
    
    hideLoading() {
        const loader = document.getElementById('loading');
        if (loader) loader.style.display = 'none';
    }
    
    showErrorMessage(message) {
        // Use the notification service for consistent error display
        if (window.NotificationService) {
            window.NotificationService.showNotification(message, 'error');
        } else {
            console.error(message);
            alert(message); // Fallback
        }
    }
    
    showSuccessMessage(message) {
        if (window.NotificationService) {
            window.NotificationService.showNotification(message, 'success');
        } else {
            console.log(message);
        }
    }
}

// AppController is now initialized from HTML bootstrap code
// Make class globally available for debugging
window.AppController = AppController;