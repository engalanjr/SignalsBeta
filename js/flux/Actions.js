// Actions - Centralized action types and creators for Flux architecture
class Actions {
    
    // Action Types - All possible actions in the application
    static Types = {
        // App Lifecycle
        APP_INITIALIZED: 'APP_INITIALIZED',
        TAB_CHANGED: 'TAB_CHANGED',
        
        // Data Loading
        DATA_LOAD_STARTED: 'DATA_LOAD_STARTED',
        DATA_LOAD_SUCCESS: 'DATA_LOAD_SUCCESS',
        DATA_LOAD_FAILED: 'DATA_LOAD_FAILED',
        
        // Signal Management
        SIGNALS_FILTERED: 'SIGNALS_FILTERED',
        SIGNAL_VIEWED: 'SIGNAL_VIEWED',
        SIGNAL_SELECTED: 'SIGNAL_SELECTED',
        
        // Feedback Actions (with optimistic flow)
        FEEDBACK_REQUESTED: 'FEEDBACK_REQUESTED',
        FEEDBACK_SUCCEEDED: 'FEEDBACK_SUCCEEDED',
        FEEDBACK_FAILED: 'FEEDBACK_FAILED',
        FEEDBACK_REMOVED: 'FEEDBACK_REMOVED',
        
        // Comments
        COMMENT_REQUESTED: 'COMMENT_REQUESTED',
        COMMENT_SUCCEEDED: 'COMMENT_SUCCEEDED',
        COMMENT_FAILED: 'COMMENT_FAILED',
        COMMENT_UPDATED: 'COMMENT_UPDATED',
        COMMENT_DELETED: 'COMMENT_DELETED',
        
        // Action Plans
        ACTION_PLAN_REQUESTED: 'ACTION_PLAN_REQUESTED',
        ACTION_PLAN_SUCCEEDED: 'ACTION_PLAN_SUCCEEDED',
        ACTION_PLAN_FAILED: 'ACTION_PLAN_FAILED',
        ACTION_PLAN_UPDATED: 'ACTION_PLAN_UPDATED',
        ACTION_PLAN_DELETED: 'ACTION_PLAN_DELETED',
        
        // UI State
        LOADING_SHOWN: 'LOADING_SHOWN',
        LOADING_HIDDEN: 'LOADING_HIDDEN',
        MESSAGE_SHOWN: 'MESSAGE_SHOWN',
        MESSAGE_HIDDEN: 'MESSAGE_HIDDEN',
        
        // Modal/Drawer State
        MODAL_OPENED: 'MODAL_OPENED',
        MODAL_CLOSED: 'MODAL_CLOSED',
        DRAWER_OPENED: 'DRAWER_OPENED',
        DRAWER_CLOSED: 'DRAWER_CLOSED'
    };
    
    // Action Creators - Functions that create action objects
    
    // App Lifecycle Actions
    static initializeApp(data) {
        return {
            type: this.Types.APP_INITIALIZED,
            payload: { data },
            timestamp: Date.now()
        };
    }
    
    static changeTab(tabName) {
        return {
            type: this.Types.TAB_CHANGED,
            payload: { tabName },
            timestamp: Date.now()
        };
    }
    
    // Data Loading Actions
    static startDataLoad() {
        return {
            type: this.Types.DATA_LOAD_STARTED,
            timestamp: Date.now()
        };
    }
    
    static dataLoadSuccess(data) {
        return {
            type: this.Types.DATA_LOAD_SUCCESS,
            payload: { data },
            timestamp: Date.now()
        };
    }
    
    static dataLoadFailed(error) {
        return {
            type: this.Types.DATA_LOAD_FAILED,
            payload: { error },
            timestamp: Date.now()
        };
    }
    
    // Signal Actions
    static filterSignals(filters) {
        return {
            type: this.Types.SIGNALS_FILTERED,
            payload: { filters },
            timestamp: Date.now()
        };
    }
    
    static viewSignal(signalId) {
        return {
            type: this.Types.SIGNAL_VIEWED,
            payload: { signalId },
            timestamp: Date.now()
        };
    }
    
    static selectSignal(signal) {
        return {
            type: this.Types.SIGNAL_SELECTED,
            payload: { signal },
            timestamp: Date.now()
        };
    }
    
    // Feedback Actions (Optimistic Pattern)
    static requestFeedback(signalId, feedbackType, userId) {
        return {
            type: this.Types.FEEDBACK_REQUESTED,
            payload: { 
                signalId, 
                feedbackType, 
                userId,
                operationId: `feedback_${signalId}_${Date.now()}`
            },
            timestamp: Date.now()
        };
    }
    
    static feedbackSucceeded(signalId, feedbackType, operationId) {
        return {
            type: this.Types.FEEDBACK_SUCCEEDED,
            payload: { signalId, feedbackType, operationId },
            timestamp: Date.now()
        };
    }
    
    static feedbackFailed(signalId, feedbackType, operationId, error) {
        return {
            type: this.Types.FEEDBACK_FAILED,
            payload: { signalId, feedbackType, operationId, error },
            timestamp: Date.now()
        };
    }
    
    static removeFeedback(signalId, userId) {
        return {
            type: this.Types.FEEDBACK_REMOVED,
            payload: { signalId, userId },
            timestamp: Date.now()
        };
    }
    
    // Comment Actions
    static requestComment(signalId, accountId, text, userId) {
        return {
            type: this.Types.COMMENT_REQUESTED,
            payload: { 
                signalId, 
                accountId, 
                text, 
                userId,
                operationId: `comment_${signalId || accountId}_${Date.now()}`
            },
            timestamp: Date.now()
        };
    }
    
    static commentSucceeded(comment, operationId) {
        return {
            type: this.Types.COMMENT_SUCCEEDED,
            payload: { comment, operationId },
            timestamp: Date.now()
        };
    }
    
    static commentFailed(operationId, error) {
        return {
            type: this.Types.COMMENT_FAILED,
            payload: { operationId, error },
            timestamp: Date.now()
        };
    }
    
    static updateComment(commentId, text) {
        return {
            type: this.Types.COMMENT_UPDATED,
            payload: { commentId, text },
            timestamp: Date.now()
        };
    }
    
    static deleteComment(commentId) {
        return {
            type: this.Types.COMMENT_DELETED,
            payload: { commentId },
            timestamp: Date.now()
        };
    }
    
    // Action Plan Actions
    static requestActionPlan(signalId, title, description, tasks, userId) {
        return {
            type: this.Types.ACTION_PLAN_REQUESTED,
            payload: { 
                signalId, 
                title, 
                description, 
                tasks, 
                userId,
                operationId: `plan_${signalId}_${Date.now()}`
            },
            timestamp: Date.now()
        };
    }
    
    static actionPlanSucceeded(plan, operationId) {
        return {
            type: this.Types.ACTION_PLAN_SUCCEEDED,
            payload: { plan, operationId },
            timestamp: Date.now()
        };
    }
    
    static actionPlanFailed(operationId, error) {
        return {
            type: this.Types.ACTION_PLAN_FAILED,
            payload: { operationId, error },
            timestamp: Date.now()
        };
    }
    
    // UI State Actions
    static showLoading() {
        return {
            type: this.Types.LOADING_SHOWN,
            timestamp: Date.now()
        };
    }
    
    static hideLoading() {
        return {
            type: this.Types.LOADING_HIDDEN,
            timestamp: Date.now()
        };
    }
    
    static showMessage(message, type = 'info') {
        return {
            type: this.Types.MESSAGE_SHOWN,
            payload: { message, type },
            timestamp: Date.now()
        };
    }
    
    static hideMessage() {
        return {
            type: this.Types.MESSAGE_HIDDEN,
            timestamp: Date.now()
        };
    }
    
    // Modal/Drawer Actions
    static openModal(modalType, data = null) {
        return {
            type: this.Types.MODAL_OPENED,
            payload: { modalType, data },
            timestamp: Date.now()
        };
    }
    
    static closeModal() {
        return {
            type: this.Types.MODAL_CLOSED,
            timestamp: Date.now()
        };
    }
    
    static openDrawer(drawerType, data = null) {
        return {
            type: this.Types.DRAWER_OPENED,
            payload: { drawerType, data },
            timestamp: Date.now()
        };
    }
    
    static closeDrawer() {
        return {
            type: this.Types.DRAWER_CLOSED,
            timestamp: Date.now()
        };
    }
}

// Make Actions globally available
window.Actions = Actions;