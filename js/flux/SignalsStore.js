// SignalsStore - Main application store following Flux pattern
class SignalsStore extends Store {
    
    constructor() {
        super('SignalsStore');
        
        // Initialize state structure
        this.setInitialState({
            // Core data
            signals: [],
            accounts: new Map(),
            comments: new Map(),
            interactions: new Map(),
            actionPlans: new Map(),
            userInfo: {},
            
            // Indexes for performance
            signalsById: new Map(),
            signalsByAccount: new Map(),
            interactionsByUser: new Map(),
            actionPlansByAccount: new Map(),
            
            // UI state
            currentTab: 'signal-feed',
            selectedSignal: null,
            filteredSignals: [],
            loading: false,
            message: null,
            
            // View state with filters
            viewState: {
                filters: {
                    priority: 'all',
                    category: 'all',
                    searchText: ''
                },
                pagination: {
                    page: 1,
                    pageSize: 20
                }
            },
            
            // Modal/Drawer state
            modal: { isOpen: false, type: null, data: null },
            drawer: { isOpen: false, type: null, data: null }
        });
    }
    
    /**
     * Main dispatch handler - routes actions to reducers
     */
    dispatch(action) {
        const { type, payload } = action;
        
        switch (type) {
            // App Lifecycle
            case Actions.Types.APP_INITIALIZED:
                this.handleAppInitialized(payload);
                break;
            case Actions.Types.TAB_CHANGED:
                this.handleTabChanged(payload);
                break;
                
            // Data Loading
            case Actions.Types.DATA_LOAD_REQUESTED:
                this.handleDataLoadRequested();
                break;
            case Actions.Types.DATA_LOAD_STARTED:
                this.handleDataLoadStarted();
                break;
            case Actions.Types.DATA_LOAD_SUCCESS:
                this.handleDataLoadSuccess(payload);
                break;
            case Actions.Types.DATA_LOAD_FAILED:
                this.handleDataLoadFailed(payload);
                break;
                
            // Signal Management
            case Actions.Types.SIGNALS_FILTERED:
                this.handleSignalsFiltered(payload);
                break;
            case Actions.Types.SIGNAL_VIEWED:
                this.handleSignalViewed(payload);
                break;
            case Actions.Types.SIGNAL_SELECTED:
                this.handleSignalSelected(payload);
                break;
            case Actions.Types.SIGNAL_REMOVED:
                this.handleSignalRemoved(payload);
                break;
            case Actions.Types.SIGNAL_DETAILS_OPENED:
                this.handleSignalDetailsOpened(payload);
                break;
                
            // Feedback (Optimistic Updates)
            case Actions.Types.FEEDBACK_REQUESTED:
                this.handleFeedbackRequested(payload);
                break;
            case Actions.Types.FEEDBACK_SUCCEEDED:
                this.handleFeedbackSucceeded(payload);
                break;
            case Actions.Types.FEEDBACK_FAILED:
                this.handleFeedbackFailed(payload);
                break;
                
            // Comments
            case Actions.Types.COMMENT_REQUESTED:
                this.handleCommentRequested(payload);
                break;
            case Actions.Types.COMMENT_SUCCEEDED:
                this.handleCommentSucceeded(payload);
                break;
            case Actions.Types.COMMENT_FAILED:
                this.handleCommentFailed(payload);
                break;
                
            // Action Plans
            case Actions.Types.ACTION_PLAN_REQUESTED:
                this.handleActionPlanRequested(payload);
                break;
            case Actions.Types.ACTION_PLAN_SUCCEEDED:
                this.handleActionPlanSucceeded(payload);
                break;
            case Actions.Types.ACTION_PLAN_FAILED:
                this.handleActionPlanFailed(payload);
                break;
            case Actions.Types.ACTION_PLAN_UPDATED:
                this.handleUpdateActionPlan(payload);
                break;
            case Actions.Types.ACTION_PLAN_DELETED:
                this.handleDeleteActionPlan(payload);
                break;
                
            // UI State
            case Actions.Types.LOADING_SHOWN:
                this.handleLoadingShown();
                break;
            case Actions.Types.LOADING_HIDDEN:
                this.handleLoadingHidden();
                break;
            case Actions.Types.MESSAGE_SHOWN:
                this.handleMessageShown(payload);
                break;
            case Actions.Types.MESSAGE_HIDDEN:
                this.handleMessageHidden();
                break;
            case Actions.Types.PLAN_DRAWER_CLOSED:
                this.handlePlanDrawerClosed();
                break;
            case Actions.Types.SIGNAL_DRAWER_CLOSED:
                this.handleSignalDrawerClosed();
                break;
            case Actions.Types.PORTFOLIO_FILTERED:
                this.handlePortfolioFiltered(payload);
                break;
                
            // Modal/Drawer
            case Actions.Types.MODAL_OPENED:
                this.handleModalOpened(payload);
                break;
            case Actions.Types.MODAL_CLOSED:
                this.handleModalClosed();
                break;
            case Actions.Types.DRAWER_OPENED:
                this.handleDrawerOpened(payload);
                break;
            case Actions.Types.DRAWER_CLOSED:
                this.handleDrawerClosed();
                break;
                
            default:
                console.log(`Unhandled action type: ${type}`);
        }
    }
    
    // Reducer methods for each action type
    
    handleAppInitialized(payload) {
        this.initializeWithData(payload.data);
        this.emitChange('app:initialized');
    }
    
    handleTabChanged(payload) {
        this.setState({
            currentTab: payload.tabName
        });
        this.emitChange('tab:changed', payload.tabName);
    }
    
    handleDataLoadRequested() {
        this.setState({ loading: true });
        this.emitChange('data:load-requested');
    }
    
    handleSignalRemoved(payload) {
        const { signalId } = payload;
        const currentSignals = this.getState().signals;
        const updatedSignals = currentSignals.filter(signal => signal.id !== signalId);
        
        this.setState({ signals: updatedSignals });
        // Rebuild indexes and accounts to keep them in sync with signals
        this.rebuildIndexesAndAccounts();
        this.emitChange('signal-removed', signalId);
        this.emitChange('accounts-updated');
    }
    
    handleSignalDetailsOpened(payload) {
        const { signalId } = payload;
        this.setState({ 
            selectedSignal: signalId,
            drawer: { isOpen: true, type: 'signal-details', data: { signalId } }
        });
        this.emitChange('signal-details-opened', signalId);
    }
    
    handlePlanDrawerClosed() {
        this.setState({ 
            drawer: { isOpen: false, type: null, data: null }
        });
        this.emitChange('plan-drawer-closed');
    }
    
    handleSignalDrawerClosed() {
        this.setState({ 
            drawer: { isOpen: false, type: null, data: null },
            selectedSignal: null
        });
        this.emitChange('signal-drawer-closed');
    }
    
    handlePortfolioFiltered(payload) {
        const { filterType } = payload;
        // Portfolio filtering logic would go here
        this.emitChange('portfolio-filtered', filterType);
    }
    
    handleDataLoadStarted() {
        this.setState({ loading: true });
        this.emitChange('loading:started');
    }
    
    handleDataLoadSuccess(payload) {
        console.log('📦 SignalsStore: handleDataLoadSuccess called');
        this.initializeWithData(payload.data);
        this.setState({ loading: false });
        console.log('🔔 SignalsStore: Emitting data:loaded event');
        this.emitChange('data:loaded');
    }
    
    handleDataLoadFailed(payload) {
        this.setState({ 
            loading: false,
            message: { text: 'Failed to load data', type: 'error' }
        });
        this.emitChange('data:load_failed', payload.error);
    }
    
    handleSignalsFiltered(payload) {
        // Update the viewState filters
        const newViewState = {
            ...this.state.viewState,
            filters: payload.filters || this.state.viewState.filters
        };
        
        // Apply filters and update filteredSignals
        const filteredSignals = this.applyFilters(payload.filters);
        this.setState({ 
            filteredSignals,
            viewState: newViewState
        });
        this.emitChange('signals:filtered', filteredSignals);
    }
    
    handleSignalViewed(payload) {
        this.addInteractionToState({
            id: `interaction_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            signalId: payload.signalId,
            userId: this.state.userInfo.userId || 'user-1',
            interactionType: 'viewed',
            timestamp: new Date().toISOString()
        });
        this.emitChange('signal:viewed', payload.signalId);
    }
    
    handleSignalSelected(payload) {
        this.setState({ selectedSignal: payload.signal });
        this.emitChange('signal:selected', payload.signal);
    }
    
    handleFeedbackRequested(payload) {
        const { signalId, feedbackType, userId, operationId } = payload;
        
        // Create snapshot for rollback
        this.createSnapshot(operationId);
        
        // Apply optimistic update
        this.toggleUserFeedbackOptimistic(signalId, feedbackType, userId);
        
        this.emitChange('feedback:requested', { signalId, feedbackType });
    }
    
    handleFeedbackSucceeded(payload) {
        const { operationId } = payload;
        this.commitSnapshot(operationId);
        this.emitChange('feedback:succeeded', payload);
    }
    
    handleFeedbackFailed(payload) {
        const { operationId, error } = payload;
        this.rollback(operationId);
        this.setState({
            message: { text: 'Failed to save feedback', type: 'error' }
        });
        this.emitChange('feedback:failed', { error });
    }
    
    handleCommentRequested(payload) {
        const { signalId, accountId, text, userId, operationId } = payload;
        
        this.createSnapshot(operationId);
        
        // Create optimistic comment
        const comment = {
            id: `comment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            signalId,
            accountId,
            text,
            userId,
            timestamp: new Date().toISOString(),
            isOptimistic: true
        };
        
        this.addCommentToState(comment);
        this.emitChange('comment:requested', comment);
    }
    
    handleCommentSucceeded(payload) {
        const { comment, operationId } = payload;
        
        // Replace optimistic comment with real one
        this.updateOptimisticComment(comment);
        this.commitSnapshot(operationId);
        this.emitChange('comment:succeeded', comment);
    }
    
    handleCommentFailed(payload) {
        const { operationId, error } = payload;
        this.rollback(operationId);
        this.setState({
            message: { text: 'Failed to save comment', type: 'error' }
        });
        this.emitChange('comment:failed', { error });
    }
    
    handleActionPlanRequested(payload) {
        const { signalId, title, description, tasks, userId, operationId } = payload;
        
        this.createSnapshot(operationId);
        
        // Create optimistic action plan
        const plan = {
            id: `plan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            signalId,
            title,
            description,
            tasks: tasks || [],
            userId,
            timestamp: new Date().toISOString(),
            isOptimistic: true
        };
        
        this.addActionPlanToState(plan);
        this.emitChange('action_plan:requested', plan);
    }
    
    handleActionPlanSucceeded(payload) {
        const { plan, operationId } = payload;
        this.updateOptimisticActionPlan(plan);
        this.commitSnapshot(operationId);
        this.emitChange('action_plan:succeeded', plan);
    }
    
    handleActionPlanFailed(payload) {
        const { operationId, error } = payload;
        this.rollback(operationId);
        this.setState({
            message: { text: 'Failed to save action plan', type: 'error' }
        });
        this.emitChange('action_plan:failed', { error });
    }
    
    handleUpdateActionPlan(payload) {
        const { planId, updates } = payload;
        this.updateActionPlanInState(planId, updates);
        this.emitChange('action_plan:updated', { planId, updates });
    }
    
    handleDeleteActionPlan(payload) {
        const { planId } = payload;
        this.removeActionPlanFromState(planId);
        this.emitChange('action_plan:deleted', { planId });
    }
    
    handleLoadingShown() {
        this.setState({ loading: true });
        this.emitChange('loading:shown');
    }
    
    handleLoadingHidden() {
        this.setState({ loading: false });
        this.emitChange('loading:hidden');
    }
    
    handleMessageShown(payload) {
        this.setState({
            message: { text: payload.message, type: payload.type }
        });
        this.emitChange('message:shown', payload);
    }
    
    handleMessageHidden() {
        this.setState({ message: null });
        this.emitChange('message:hidden');
    }
    
    handleModalOpened(payload) {
        this.setState({
            modal: { 
                isOpen: true, 
                type: payload.modalType, 
                data: payload.data 
            }
        });
        this.emitChange('modal:opened', payload);
    }
    
    handleModalClosed() {
        this.setState({
            modal: { isOpen: false, type: null, data: null }
        });
        this.emitChange('modal:closed');
    }
    
    handleDrawerOpened(payload) {
        this.setState({
            drawer: { 
                isOpen: true, 
                type: payload.drawerType, 
                data: payload.data 
            }
        });
        this.emitChange('drawer:opened', payload);
    }
    
    handleDrawerClosed() {
        this.setState({
            drawer: { isOpen: false, type: null, data: null }
        });
        this.emitChange('drawer:closed');
    }
    
    // Data manipulation methods (similar to DataCache but working with state)
    
    initializeWithData(data) {
        const signals = data.signals || [];
        const comments = new Map();
        const interactions = new Map();
        const actionPlans = new Map();
        const userInfo = data.userInfo || {};
        
        // Build indexes
        const signalsById = new Map();
        const signalsByAccount = new Map();
        const interactionsByUser = new Map();
        const actionPlansByAccount = new Map();
        
        // Process signals
        signals.forEach(signal => {
            signalsById.set(signal.id, signal);
            const accountId = signal.account_id;
            if (!signalsByAccount.has(accountId)) {
                signalsByAccount.set(accountId, []);
            }
            signalsByAccount.get(accountId).push(signal);
        });
        
        // Build accounts Map from signals
        const accounts = new Map();
        signalsByAccount.forEach((accountSignals, accountId) => {
            if (accountSignals.length > 0) {
                // Get account info from the first signal (all signals for same account should have same account_name)
                const firstSignal = accountSignals[0];
                accounts.set(accountId, {
                    id: accountId,
                    name: firstSignal.account_name || `Account ${accountId}`,
                    signals: accountSignals,
                    at_risk_cat: firstSignal.at_risk_cat || 'Healthy',
                    health_score: firstSignal.health_score || 0,
                    bks_renewal_baseline_usd: firstSignal.bks_renewal_baseline_usd || 0,
                    pacing_percent: firstSignal.pacing_percent || 0,
                    next_renewal_date: firstSignal.next_renewal_date || '',
                    industry: firstSignal.industry || 'Unknown',
                    monthly_active_users: firstSignal.monthly_active_users || 0,
                    total_lifetime_billings: firstSignal.total_lifetime_billings || 0
                });
            }
        });
        
        // Process comments
        (data.comments || []).forEach(comment => {
            const key = comment.signalId || comment.accountId;
            if (key) {
                if (!comments.has(key)) {
                    comments.set(key, []);
                }
                comments.get(key).push(comment);
            }
        });
        
        // Process interactions
        (data.interactions || []).forEach(interaction => {
            const signalId = interaction.signalId;
            const userId = interaction.userId;
            
            if (signalId) {
                if (!interactions.has(signalId)) {
                    interactions.set(signalId, []);
                }
                interactions.get(signalId).push(interaction);
            }
            
            if (userId) {
                if (!interactionsByUser.has(userId)) {
                    interactionsByUser.set(userId, []);
                }
                interactionsByUser.get(userId).push(interaction);
            }
        });
        
        // Process action plans
        (data.actionPlans || []).forEach(plan => {
            actionPlans.set(plan.id, plan);
            if (plan.accountId) {
                if (!actionPlansByAccount.has(plan.accountId)) {
                    actionPlansByAccount.set(plan.accountId, []);
                }
                actionPlansByAccount.get(plan.accountId).push(plan);
            }
        });
        
        this.setState({
            signals,
            accounts,
            comments,
            interactions,
            actionPlans,
            userInfo,
            signalsById,
            signalsByAccount,
            interactionsByUser,
            actionPlansByAccount,
            filteredSignals: [...signals]
        });
    }
    
    toggleUserFeedbackOptimistic(signalId, feedbackType, userId) {
        const currentState = this.getState();
        const interactions = new Map(currentState.interactions);
        const interactionsByUser = new Map(currentState.interactionsByUser);
        
        // Remove existing feedback
        const signalInteractions = interactions.get(signalId) || [];
        const userInteractions = interactionsByUser.get(userId) || [];
        
        // Filter out existing feedback
        const filteredSignalInteractions = signalInteractions.filter(i => 
            !(i.userId === userId && (i.interactionType === 'like' || i.interactionType === 'not-accurate'))
        );
        const filteredUserInteractions = userInteractions.filter(i => 
            !(i.signalId === signalId && (i.interactionType === 'like' || i.interactionType === 'not-accurate'))
        );
        
        // Add new feedback
        const newInteraction = {
            id: `interaction_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            signalId,
            userId,
            interactionType: feedbackType,
            timestamp: new Date().toISOString()
        };
        
        filteredSignalInteractions.push(newInteraction);
        filteredUserInteractions.push(newInteraction);
        
        interactions.set(signalId, filteredSignalInteractions);
        interactionsByUser.set(userId, filteredUserInteractions);
        
        this.setState({ interactions, interactionsByUser });
    }
    
    addInteractionToState(interaction) {
        const currentState = this.getState();
        const interactions = new Map(currentState.interactions);
        const interactionsByUser = new Map(currentState.interactionsByUser);
        
        const signalId = interaction.signalId;
        const userId = interaction.userId;
        
        if (signalId) {
            if (!interactions.has(signalId)) {
                interactions.set(signalId, []);
            }
            interactions.get(signalId).push(interaction);
        }
        
        if (userId) {
            if (!interactionsByUser.has(userId)) {
                interactionsByUser.set(userId, []);
            }
            interactionsByUser.get(userId).push(interaction);
        }
        
        this.setState({ interactions, interactionsByUser });
    }
    
    addCommentToState(comment) {
        const currentState = this.getState();
        const comments = new Map(currentState.comments);
        
        const key = comment.signalId || comment.accountId;
        if (key) {
            if (!comments.has(key)) {
                comments.set(key, []);
            }
            comments.get(key).push(comment);
        }
        
        this.setState({ comments });
    }
    
    updateOptimisticComment(realComment) {
        const currentState = this.getState();
        const comments = new Map(currentState.comments);
        
        // Find and replace optimistic comment
        for (let [key, commentList] of comments) {
            const optimisticIndex = commentList.findIndex(c => 
                c.isOptimistic && c.signalId === realComment.signalId && c.accountId === realComment.accountId
            );
            if (optimisticIndex !== -1) {
                commentList[optimisticIndex] = { ...realComment, isOptimistic: false };
                break;
            }
        }
        
        this.setState({ comments });
    }
    
    addActionPlanToState(plan) {
        const currentState = this.getState();
        const actionPlans = new Map(currentState.actionPlans);
        const actionPlansByAccount = new Map(currentState.actionPlansByAccount);
        
        actionPlans.set(plan.id, plan);
        
        if (plan.accountId) {
            if (!actionPlansByAccount.has(plan.accountId)) {
                actionPlansByAccount.set(plan.accountId, []);
            }
            actionPlansByAccount.get(plan.accountId).push(plan);
        }
        
        this.setState({ actionPlans, actionPlansByAccount });
    }
    
    updateOptimisticActionPlan(realPlan) {
        const currentState = this.getState();
        const actionPlans = new Map(currentState.actionPlans);
        const actionPlansByAccount = new Map(currentState.actionPlansByAccount);
        
        // Find optimistic plan and replace
        for (let [id, plan] of actionPlans) {
            if (plan.isOptimistic && plan.signalId === realPlan.signalId) {
                actionPlans.delete(id);
                actionPlans.set(realPlan.id, { ...realPlan, isOptimistic: false });
                
                // Update account index
                if (plan.accountId && realPlan.accountId) {
                    const accountPlans = actionPlansByAccount.get(plan.accountId) || [];
                    const planIndex = accountPlans.findIndex(p => p.id === id);
                    if (planIndex !== -1) {
                        accountPlans[planIndex] = realPlan;
                    }
                }
                break;
            }
        }
        
        this.setState({ actionPlans, actionPlansByAccount });
    }
    
    applyFilters(filters) {
        const { signals } = this.getState();
        
        // Apply filters to signals array
        let filtered = [...signals];
        
        // Apply priority filter
        if (filters.priority && filters.priority !== 'all' && filters.priority !== '') {
            filtered = filtered.filter(signal => signal.priority === filters.priority);
        }
        
        // Apply category filter
        if (filters.category && filters.category !== 'all' && filters.category !== '') {
            filtered = filtered.filter(signal => signal.category === filters.category);
        }
        
        // Apply account filter
        if (filters.account && filters.account !== 'all') {
            filtered = filtered.filter(signal => signal.account_name === filters.account);
        }
        
        // Apply search text filter
        if (filters.searchText && filters.searchText.trim() !== '') {
            const searchLower = filters.searchText.toLowerCase();
            filtered = filtered.filter(signal => 
                signal.name?.toLowerCase().includes(searchLower) ||
                signal.summary?.toLowerCase().includes(searchLower) ||
                signal.account_name?.toLowerCase().includes(searchLower)
            );
        }
        
        return filtered;
    }
    
    updateActionPlanInState(planId, updates) {
        const currentState = this.getState();
        const actionPlans = new Map(currentState.actionPlans);
        const actionPlansByAccount = new Map(currentState.actionPlansByAccount);
        
        const existingPlan = actionPlans.get(planId);
        if (existingPlan) {
            const updatedPlan = { ...existingPlan, ...updates };
            actionPlans.set(planId, updatedPlan);
            
            // Update in account index too
            if (updatedPlan.accountId) {
                const accountPlans = actionPlansByAccount.get(updatedPlan.accountId) || [];
                const planIndex = accountPlans.findIndex(p => p.id === planId);
                if (planIndex !== -1) {
                    accountPlans[planIndex] = updatedPlan;
                }
            }
            
            this.setState({ actionPlans, actionPlansByAccount });
        }
    }
    
    removeActionPlanFromState(planId) {
        const currentState = this.getState();
        const actionPlans = new Map(currentState.actionPlans);
        const actionPlansByAccount = new Map(currentState.actionPlansByAccount);
        
        const plan = actionPlans.get(planId);
        if (plan) {
            actionPlans.delete(planId);
            
            // Remove from account index
            if (plan.accountId) {
                const accountPlans = actionPlansByAccount.get(plan.accountId) || [];
                const planIndex = accountPlans.findIndex(p => p.id === planId);
                if (planIndex !== -1) {
                    accountPlans.splice(planIndex, 1);
                }
            }
            
            this.setState({ actionPlans, actionPlansByAccount });
        }
    }
    
    /**
     * Rebuilds all indexes and accounts Map from current signals
     * Ensures accounts Map stays in sync when signals are added/removed/modified
     */
    rebuildIndexesAndAccounts() {
        const currentState = this.getState();
        const signals = currentState.signals || [];
        
        // Rebuild all signal indexes
        const signalsById = new Map();
        const signalsByAccount = new Map();
        
        // Process signals and build indexes
        signals.forEach(signal => {
            signalsById.set(signal.id, signal);
            const accountId = signal.account_id;
            if (!signalsByAccount.has(accountId)) {
                signalsByAccount.set(accountId, []);
            }
            signalsByAccount.get(accountId).push(signal);
        });
        
        // Rebuild accounts Map from current signals
        const accounts = new Map();
        signalsByAccount.forEach((accountSignals, accountId) => {
            if (accountSignals.length > 0) {
                // Get account info from the first signal
                const firstSignal = accountSignals[0];
                accounts.set(accountId, {
                    id: accountId,
                    name: firstSignal.account_name || `Account ${accountId}`,
                    signals: accountSignals,
                    at_risk_cat: firstSignal.at_risk_cat || 'Healthy',
                    health_score: firstSignal.health_score || 0,
                    bks_renewal_baseline_usd: firstSignal.bks_renewal_baseline_usd || 0,
                    pacing_percent: firstSignal.pacing_percent || 0,
                    next_renewal_date: firstSignal.next_renewal_date || '',
                    industry: firstSignal.industry || 'Unknown',
                    monthly_active_users: firstSignal.monthly_active_users || 0,
                    total_lifetime_billings: firstSignal.total_lifetime_billings || 0
                });
            }
        });
        
        // Apply current filters to get updated filtered signals
        const filteredSignals = this.applyFilters(currentState.viewState.filters);
        
        // Update state with rebuilt indexes and accounts
        this.setState({
            signalsById,
            signalsByAccount,
            accounts,
            filteredSignals
        });
    }
}

// Create singleton instance
const signalsStore = new SignalsStore();

// Make globally available
window.SignalsStore = SignalsStore;
window.signalsStore = signalsStore;