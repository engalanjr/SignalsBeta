// SignalsController - Handles signal feed tab and signal interactions
class SignalsController {
    constructor() {
        this.subscribeToStore();
        this.setupEventListeners();
        console.log('🎯 SignalsController initialized');
    }
    
    subscribeToStore() {
        // Subscribe to store changes relevant to signals
        signalsStore.subscribe('feedback-updated', (state, data) => {
            console.log(`🎯 SignalsController received feedback-updated event`);
            this.render();
        });
        
        signalsStore.subscribe('signals-updated', (state, data) => {
            console.log(`🎯 SignalsController received signals-updated event`);
            this.render();
        });
        
        signalsStore.subscribe('comments-updated', (state, data) => {
            console.log(`🎯 SignalsController received comments-updated event`, data);
            console.log(`🎯 Current state.comments size:`, state.comments?.size || 0);
            this.render();
        });
        
        signalsStore.subscribe('signal-viewed', (state, data) => {
            console.log(`🎯 SignalsController received signal-viewed event`);
            this.render();
        });
        
        signalsStore.subscribe('signals:filtered', (state, data) => {
            console.log(`🎯 SignalsController received signals:filtered event`);
            this.render();
        });
        
        signalsStore.subscribe('signal-removed', (state, data) => {
            console.log(`🎯 SignalsController received signal-removed event`);
            this.render();
        });
        
        signalsStore.subscribe('accounts-updated', (state, data) => {
            console.log(`🎯 SignalsController received accounts-updated event`);
            this.render();
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
        
        // Feed mode toggle
        const toggleButtons = document.querySelectorAll('.segmented-toggle .toggle-button');
        toggleButtons.forEach(button => {
            button.addEventListener('click', () => {
                const feedMode = button.getAttribute('data-feed-mode');
                this.switchFeedMode(feedMode);
            });
        });
        
        // Filter events for signal feed
        const categoryFilter = document.getElementById('categoryFilter');
        if (categoryFilter) {
            categoryFilter.addEventListener('change', () => {
                this.applyFilters();
            });
        }
        
        const priorityFilter = document.getElementById('priorityFilter');
        if (priorityFilter) {
            priorityFilter.addEventListener('change', () => {
                this.applyFilters();
            });
        }
        
        // Search input with debounce
        const searchInput = document.getElementById('feedSearchInput');
        if (searchInput) {
            let searchTimeout;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.applyFilters();
                }, 200);
            });
        }
        
        // Sort select
        const sortSelect = document.getElementById('feedSortSelect');
        if (sortSelect) {
            sortSelect.addEventListener('change', () => {
                const state = signalsStore.getState();
                state.viewState.sort = sortSelect.value;
                this.render(state);
            });
        }
    }
    
    switchFeedMode(feedMode) {
        // Update toggle button states
        document.querySelectorAll('.segmented-toggle .toggle-button').forEach(btn => {
            const isActive = btn.getAttribute('data-feed-mode') === feedMode;
            btn.classList.toggle('active', isActive);
            btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
        });
        
        // Update state
        const state = signalsStore.getState();
        state.viewState.feedMode = feedMode;
        
        // Update section title and count
        const sectionTitle = document.getElementById('feedSectionTitle');
        if (sectionTitle) {
            sectionTitle.textContent = feedMode === 'signals' ? 'Latest Signals' : 'Recommended Actions';
        }
        
        // Update sort options based on mode
        const sortSelect = document.getElementById('feedSortSelect');
        if (sortSelect) {
            sortSelect.innerHTML = feedMode === 'signals' 
                ? `<option value="newest">Sort: Newest</option>
                   <option value="confidence">Sort: Confidence</option>
                   <option value="priority">Sort: Priority</option>
                   <option value="account">Sort: Account</option>`
                : `<option value="priority">Sort: Priority</option>
                   <option value="confidence">Sort: Confidence</option>
                   <option value="lastUpdated">Sort: Last Updated</option>
                   <option value="account">Sort: Account</option>`;
        }
        
        // Save to localStorage
        try {
            localStorage.setItem('feedMode', feedMode);
        } catch (e) {
            console.warn('Could not save feed mode to localStorage:', e);
        }
        
        // Re-render
        this.render(state);
    }
    
    applyFilters() {
        const category = document.getElementById('categoryFilter')?.value || 'all';
        const priority = document.getElementById('priorityFilter')?.value || 'all';
        const searchText = document.getElementById('feedSearchInput')?.value || '';
        
        const state = signalsStore.getState();
        state.viewState.filters = {
            ...state.viewState.filters,
            category,
            priority,
            searchText
        };
        
        this.render(state);
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
            
            // Update feed summary
            this.updateFeedSummary(state);
            
            // Determine which mode we're in
            const feedMode = state.viewState.feedMode || 'actions';
            
            if (feedMode === 'signals') {
                // Render signals
                const filteredSignals = this.filterSignals(state);
                
                // Create comments map for SignalRenderer
                const commentsMap = new Map();
                filteredSignals.forEach(signal => {
                    const signalComments = signalsStore.getComments(signal.id);
                    commentsMap.set(signal.id, signalComments);
                });
                
                // Call the pure SignalRenderer with store data
                SignalRenderer.renderSignalFeed(
                    filteredSignals,
                    state.viewState,
                    commentsMap,
                    state.interactions,
                    state.actionPlans
                );
                
                // Update count
                this.updateItemCount(filteredSignals.length, 'signal');
                
                console.log(`🎨 Rendered ${filteredSignals.length} signals in feed`);
            } else {
                // Render actions
                const filteredActions = this.filterActions(state);
                const allSignals = signalsStore.getSignals();
                
                // Call ActionFeedRenderer
                ActionFeedRenderer.renderActionFeed(
                    filteredActions,
                    state.viewState,
                    allSignals,
                    state.interactions
                );
                
                // Update count
                this.updateItemCount(filteredActions.length, 'action');
                
                console.log(`🎨 Rendered ${filteredActions.length} actions in feed`);
            }
        }
    }
    
    filterSignals(state) {
        const allSignals = signalsStore.getSignals();
        const filters = state.viewState.filters;
        
        return allSignals.filter(signal => {
            // Category filter
            if (filters.category && filters.category !== 'all') {
                const polarity = FormatUtils.normalizePolarityKey(signal.signal_polarity || signal['Signal Polarity'] || '');
                if (polarity !== filters.category) return false;
            }
            
            // Priority filter
            if (filters.priority && filters.priority !== 'all') {
                if (signal.priority !== filters.priority) return false;
            }
            
            // Search filter
            if (filters.searchText) {
                const searchLower = filters.searchText.toLowerCase();
                const accountName = (signal.account_name || '').toLowerCase();
                if (!accountName.includes(searchLower)) return false;
            }
            
            return true;
        });
    }
    
    filterActions(state) {
        const allActions = signalsStore.getRecommendedActions();
        const filters = state.viewState.filters;
        
        return allActions.filter(action => {
            // Category filter (based on related signals)
            if (filters.category && filters.category !== 'all') {
                const hasMatchingSignal = (action.relatedSignals || []).some(signal => {
                    const polarity = FormatUtils.normalizePolarityKey(signal.signal_polarity || signal['Signal Polarity'] || '');
                    return polarity === filters.category;
                });
                if (!hasMatchingSignal) return false;
            }
            
            // Priority filter
            if (filters.priority && filters.priority !== 'all') {
                if (action.priority !== filters.priority) return false;
            }
            
            // Search filter
            if (filters.searchText) {
                const searchLower = filters.searchText.toLowerCase();
                const accountName = (action.accountName || '').toLowerCase();
                if (!accountName.includes(searchLower)) return false;
            }
            
            return true;
        });
    }
    
    updateItemCount(count, type) {
        const countElement = document.getElementById('feedItemCount');
        if (countElement) {
            countElement.textContent = `${count} ${type}${count !== 1 ? 's' : ''}`;
        }
    }
    
    updateFeedSummary(state) {
        try {
            const feedMode = state.viewState.feedMode || 'actions';
            const summaryElement = document.getElementById('feed-summary-text');
            if (!summaryElement) return;
            
            if (feedMode === 'signals') {
                this.updateSignalSummary(state, summaryElement);
            } else {
                this.updateActionSummary(state, summaryElement);
            }
        } catch (error) {
            console.error('Error updating feed summary:', error);
        }
    }
    
    updateSignalSummary(state, summaryElement) {
        const allSignals = state.signals || [];
        const accounts = state.accounts || new Map();
        
        // Filter for high priority signals
        const highPrioritySignals = allSignals.filter(signal => 
            signal.priority === 'High' || signal.priority === 'high'
        );
        
        // Get unique account IDs from high priority signals
        const uniqueAccountIds = new Set(
            highPrioritySignals.map(signal => signal.account_id).filter(id => id)
        );
        
        // Calculate total renewal baseline for unique accounts
        let totalRenewalBaseline = 0;
        const processedAccountIds = new Set();
        
        for (const signal of highPrioritySignals) {
            if (signal.account_id && !processedAccountIds.has(signal.account_id)) {
                const account = accounts.get(signal.account_id);
                if (account) {
                    const renewalBaseline = account.bks_baseline_renewal_usd || 
                                         account.bks_renewal_baseline_usd || 
                                         account['Renewal Baseline USD'] || 
                                         0;
                    totalRenewalBaseline += parseFloat(renewalBaseline) || 0;
                    processedAccountIds.add(signal.account_id);
                }
            }
        }
        
        // Format the summary text
        const count = highPrioritySignals.length;
        const formattedAmount = FormatUtils.formatCurrency(totalRenewalBaseline);
        const summaryText = `${count} high priority signal${count !== 1 ? 's' : ''} identified representing ${formattedAmount} of Renewal Baseline`;
        
        summaryElement.textContent = summaryText;
        console.log(`📊 Signal Feed Summary: ${count} high priority signals, ${formattedAmount} total renewal baseline`);
    }
    
    updateActionSummary(state, summaryElement) {
        const allActions = signalsStore.getRecommendedActions();
        const accounts = state.accounts || new Map();
        
        // Filter for high priority actions
        const highPriorityActions = allActions.filter(action => 
            action.priority === 'High' || action.priority === 'high'
        );
        
        // Get unique account IDs and calculate total renewal baseline
        let totalRenewalBaseline = 0;
        const processedAccountIds = new Set();
        
        for (const action of highPriorityActions) {
            if (action.accountId && !processedAccountIds.has(action.accountId)) {
                const account = accounts.get(action.accountId);
                if (account) {
                    const renewalBaseline = account.bks_baseline_renewal_usd || 
                                         account.bks_renewal_baseline_usd || 
                                         account['Renewal Baseline USD'] || 
                                         0;
                    totalRenewalBaseline += parseFloat(renewalBaseline) || 0;
                    processedAccountIds.add(action.accountId);
                }
            }
        }
        
        // Format the summary text
        const count = highPriorityActions.length;
        const formattedAmount = FormatUtils.formatCurrency(totalRenewalBaseline);
        const summaryText = `${count} high priority action${count !== 1 ? 's' : ''} identified representing ${formattedAmount} of Renewal Baseline`;
        
        summaryElement.textContent = summaryText;
        console.log(`📊 Action Feed Summary: ${count} high priority actions, ${formattedAmount} total renewal baseline`);
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