// PortfolioController - Handles portfolio tab and account management
class PortfolioController {
    constructor() {
        this.subscribeToStore();
        this.setupEventListeners();
        console.log('🎯 PortfolioController initialized');
    }
    
    subscribeToStore() {
        // Subscribe to store changes relevant to portfolio
        signalsStore.subscribe('portfolio-controller', (eventType) => {
            if (eventType === 'accounts-updated' || 
                eventType === 'action-plans-updated' || 
                eventType === 'comments-updated') {
                this.render();
            }
        });
    }
    
    setupEventListeners() {
        // Set up delegated event handling for portfolio interactions - scoped to portfolio only
        const portfolioContainer = document.getElementById('my-portfolio');
        if (portfolioContainer) {
            portfolioContainer.addEventListener('click', (e) => {
                const target = e.target.closest('[data-action]');
                if (!target) return;
                
                const action = target.getAttribute('data-action');
                const accountId = target.getAttribute('data-account-id');
                const signalId = target.getAttribute('data-signal-id');
                
                // Only handle portfolio-related actions (excluding comments and view-signal)
                if (this.isPortfolioAction(action)) {
                    e.preventDefault();
                    e.stopPropagation();
                    this.handlePortfolioAction(action, accountId, signalId, target);
                }
            });
        }
        
        // Portfolio filter buttons
        const filterBtns = document.querySelectorAll('.filter-btn');
        filterBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                // Update active state
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                
                // Dispatch filter action
                const filterType = e.target.getAttribute('data-filter');
                dispatcher.dispatch(Actions.applyPortfolioFilter(filterType));
            });
        });
    }
    
    isPortfolioAction(action) {
        const portfolioActions = [
            'toggle-account-signals', 'show-more-signals', 'show-less-signals', 'view-signal'
        ];
        return portfolioActions.includes(action);
    }
    
    handlePortfolioAction(action, accountId, signalId, target) {
        switch (action) {
            case 'toggle-account-signals':
                this.toggleAccountSignals(accountId);
                break;
                
            case 'show-more-signals':
                this.showMoreSignalsForAccount(accountId);
                break;
                
            case 'show-less-signals':
                this.showLessSignalsForAccount(accountId);
                break;
                
            case 'view-signal':
                // Handle view-signal from portfolio context only
                if (signalId) {
                    dispatcher.dispatch(Actions.markSignalAsViewed(signalId));
                    dispatcher.dispatch(Actions.openSignalDetails(signalId));
                }
                break;
                
            default:
                console.warn(`Unknown portfolio action: ${action}`);
        }
    }
    
    toggleAccountSignals(accountId) {
        const signalsContainer = document.getElementById(`signals-${accountId}`);
        const chevron = document.getElementById(`chevron-${accountId}`);
        
        if (signalsContainer && chevron) {
            const isExpanded = signalsContainer.classList.contains('expanded');
            
            if (isExpanded) {
                signalsContainer.classList.remove('expanded');
                chevron.classList.remove('rotated');
                dispatcher.dispatch(Actions.collapseAccount(accountId));
            } else {
                signalsContainer.classList.add('expanded');
                chevron.classList.add('rotated');
                dispatcher.dispatch(Actions.expandAccount(accountId));
            }
        }
    }
    
    showMoreSignalsForAccount(accountId) {
        dispatcher.dispatch(Actions.showMoreSignalsForAccount(accountId));
        // Re-render just this account card
        this.updateSingleAccount(accountId);
    }
    
    showLessSignalsForAccount(accountId) {
        dispatcher.dispatch(Actions.showLessSignalsForAccount(accountId));
        // Re-render just this account card
        this.updateSingleAccount(accountId);
    }
    
    handleAddAccountComment(accountId, target) {
        const inputElement = document.getElementById(`accountCommentInput-${accountId}`);
        if (inputElement && inputElement.value.trim()) {
            dispatcher.dispatch(Actions.addAccountComment(accountId, inputElement.value.trim()));
            inputElement.value = '';
        }
    }
    
    render(state = null) {
        if (!state) {
            state = signalsStore.getState();
        }
        
        // Check if we're on the portfolio tab
        if (document.getElementById('my-portfolio')?.classList.contains('active')) {
            
            // Call the pure PortfolioRenderer with store data
            PortfolioRenderer.renderMyPortfolio(
                state.accounts,
                state.actionPlans,
                state.comments
            );
            
            console.log(`🎨 Rendered ${state.accounts.size} accounts in portfolio`);
        }
    }
    
    updateSingleAccount(accountId) {
        const state = signalsStore.getState();
        
        // Use the pure PortfolioRenderer method with store data
        PortfolioRenderer.updateSingleAccount(
            accountId,
            state.accounts,
            state.actionPlans,
            state.comments
        );
    }
    
    // Helper methods for external usage
    createActionPlanForAccount(accountId) {
        const state = signalsStore.getState();
        const account = state.accounts.get(accountId);
        
        if (account && account.signals.length > 0) {
            // Use the highest priority signal from this account, or the most recent one
            const highPrioritySignals = account.signals.filter(s => s.priority === 'High');
            const selectedSignal = highPrioritySignals.length > 0
                ? highPrioritySignals.sort((a, b) => new Date(b.created_date || Date.now()) - new Date(a.created_date || Date.now()))[0]
                : account.signals.sort((a, b) => new Date(b.created_date || Date.now()) - new Date(a.created_date || Date.now()))[0];

            dispatcher.dispatch(Actions.createActionPlanForAccount(accountId, selectedSignal.id));
        } else {
            dispatcher.dispatch(Actions.createActionPlanForAccount(accountId, null));
        }
    }
    
    selectActionPlanToEdit(accountId) {
        const state = signalsStore.getState();
        
        // Get all plans for this account
        const accountPlans = Array.from(state.actionPlans.values())
            .filter(plan => plan.accountId === accountId);
        
        if (accountPlans.length === 1) {
            // Only one plan, edit it directly
            dispatcher.dispatch(Actions.editActionPlan(accountPlans[0].id));
        } else if (accountPlans.length > 1) {
            // Multiple plans, show selection modal
            dispatcher.dispatch(Actions.showPlanSelectionModal(accountId, accountPlans));
        } else {
            // No plans found, create new one
            this.createActionPlanForAccount(accountId);
        }
    }
    
    refreshPortfolio() {
        this.render();
    }
}

// Make globally available
window.PortfolioController = PortfolioController;