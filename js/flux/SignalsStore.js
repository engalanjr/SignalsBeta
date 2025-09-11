// SignalsStore - Main application store following Flux pattern
class SignalsStore extends Store {
    
    constructor() {
        super('SignalsStore');
        
        // Initialize state structure
        this.setInitialState({
            // Core data
            signals: [],
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
    
    handleDataLoadStarted() {
        this.setState({ loading: true });
        this.emitChange('loading:started');
    }
    
    handleDataLoadSuccess(payload) {
        this.initializeWithData(payload.data);
        this.setState({ loading: false });
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
        const filteredSignals = this.applyFilters(payload.filters);
        this.setState({ filteredSignals });
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
        // This is a simplified version - implement your specific filter logic
        let filtered = [...signals];
        
        if (filters.priority) {
            filtered = filtered.filter(signal => signal.priority === filters.priority);
        }
        
        if (filters.account) {
            filtered = filtered.filter(signal => signal.account_name === filters.account);
        }
        
        return filtered;
    }
}

// Create singleton instance
const signalsStore = new SignalsStore();

// Make globally available
window.SignalsStore = SignalsStore;
window.signalsStore = signalsStore;