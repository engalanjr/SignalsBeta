// SignalsController - Handles signal feed tab and signal interactions
class SignalsController {
    constructor() {
        this.subscribeToStore();
        this.setupEventListeners();
        console.log('🎯 SignalsController initialized');
    }
    
    subscribeToStore() {
        // Subscribe to store changes relevant to signals
        signalsStore.subscribe('signals-controller', (eventType) => {
            if (eventType === 'signals-updated' || 
                eventType === 'comments-updated' || 
                eventType === 'feedback-updated' ||
                eventType === 'signal-viewed' ||
                eventType === 'signals:filtered' ||
                eventType === 'signal-removed' ||
                eventType === 'accounts-updated') {
                this.render();
            }
        });
    }
    
    setupEventListeners() {
        // Set up delegated event handling for signal interactions - scoped to signal feed only
        const signalFeedContainer = document.getElementById('signal-feed');
        if (signalFeedContainer) {
            signalFeedContainer.addEventListener('click', (e) => {
                const target = e.target.closest('[data-action]');
                if (!target) return;
                
                const action = target.getAttribute('data-action');
                const signalId = target.getAttribute('data-signal-id');
                
                // Only handle signal-related actions (excluding comments)
                if (this.isSignalAction(action)) {
                    e.preventDefault();
                    e.stopPropagation();
                    this.handleSignalAction(action, signalId, target);
                }
            });
        }
        
        // Filter events for signal feed
        const categoryFilter = document.getElementById('categoryFilter');
        if (categoryFilter) {
            categoryFilter.addEventListener('change', () => {
                const priority = document.getElementById('priorityFilter')?.value || 'all';
                const category = categoryFilter.value;
                dispatcher.dispatch(Actions.applyFilters({ priority, category }));
            });
        }
        
        const priorityFilter = document.getElementById('priorityFilter');
        if (priorityFilter) {
            priorityFilter.addEventListener('change', () => {
                const category = document.getElementById('categoryFilter')?.value || 'all';
                const priority = priorityFilter.value;
                dispatcher.dispatch(Actions.applyFilters({ priority, category }));
            });
        }
    }
    
    isSignalAction(action) {
        const signalActions = [
            'remove-signal', 'view-signal'
        ];
        return signalActions.includes(action);
    }
    
    handleSignalAction(action, signalId, target) {
        const commentId = target.getAttribute('data-comment-id');
        
        switch (action) {
            case 'remove-signal':
                if (confirm('Are you sure you want to remove this signal from your feed?')) {
                    dispatcher.dispatch(Actions.removeSignalFromFeed(signalId));
                }
                break;
                
            case 'view-signal':
                dispatcher.dispatch(Actions.markSignalAsViewed(signalId));
                dispatcher.dispatch(Actions.openSignalDetails(signalId));
                break;
                
            default:
                console.warn(`Unknown signal action: ${action}`);
        }
    }
    
    handleEditComment(commentId, signalId) {
        const commentElement = document.getElementById(`comment-text-${commentId}`);
        if (!commentElement) return;
        
        const currentText = commentElement.textContent;
        const newText = prompt('Edit comment:', currentText);
        
        if (newText !== null && newText.trim() !== currentText) {
            dispatcher.dispatch(Actions.updateComment(commentId, signalId, newText.trim()));
        }
    }
    
    render(state = null) {
        if (!state) {
            state = signalsStore.getState();
        }
        
        // Check if we're on the signal feed tab
        if (document.getElementById('signal-feed')?.classList.contains('active')) {
            
            // Use the centralized filteredSignals from the store
            // The store already manages filtering based on viewState.filters
            const filteredSignals = state.filteredSignals || [];
            
            // Call the pure SignalRenderer with store data
            SignalRenderer.renderSignalFeed(
                filteredSignals,
                state.viewState,
                state.comments,
                state.interactions,
                state.actionPlans
            );
            
            console.log(`🎨 Rendered ${filteredSignals.length} signals in feed`);
        }
    }
    
    // DEPRECATED: Filtering is now centralized in SignalsStore
    // Use state.filteredSignals directly instead of calling this method
    getFilteredSignals(state) {
        console.warn('getFilteredSignals is deprecated. Use state.filteredSignals directly.');
        return state.filteredSignals || [];
    }
    
    applyFilters(priority = 'all', category = 'all', searchText = '') {
        dispatcher.dispatch(Actions.applyFilters({
            priority,
            category,
            searchText
        }));
    }
    
    markSignalAsViewed(signalId) {
        dispatcher.dispatch(Actions.markSignalAsViewed(signalId));
    }
    
    // Helper method for external usage
    refreshSignalFeed() {
        this.render();
    }
}

// Make globally available
window.SignalsController = SignalsController;