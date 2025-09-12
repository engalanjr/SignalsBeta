// ActionPlansService - Handles action plans through Flux actions
class ActionPlansService {
    
    /**
     * Get global dispatcher safely with robust error handling
     */
    static getDispatcher() {
        if (typeof window.dispatcher !== 'undefined' && window.dispatcher) {
            return window.dispatcher;
        }
        console.warn('⚠️ Dispatcher not available - Flux architecture may not be initialized');
        return null;
    }
    
    /**
     * Get global signals store safely with robust error handling
     */
    static getSignalsStore() {
        if (typeof window.signalsStore !== 'undefined' && window.signalsStore) {
            return window.signalsStore;
        }
        console.warn('⚠️ SignalsStore not available - Flux architecture may not be initialized');
        return null;
    }
    
    /**
     * Store action plan locally as fallback
     */
    static storeActionPlanLocally(plan) {
        try {
            const existingPlans = this.getLocalActionPlans();
            existingPlans[plan.id] = plan;
            localStorage.setItem('signalsai_action_plans', JSON.stringify(existingPlans));
            console.log('✅ Action plan stored locally:', plan.id);
        } catch (error) {
            console.warn('Could not store action plan locally:', error);
        }
    }
    
    /**
     * Get locally stored action plans
     */
    static getLocalActionPlans() {
        try {
            const stored = localStorage.getItem('signalsai_action_plans');
            return stored ? JSON.parse(stored) : {};
        } catch (error) {
            console.warn('Could not load local action plans:', error);
            return {};
        }
    }
    
    /**
     * Clear timestamp for failed action plan creation with robust accountId handling
     */
    static clearPlanCreationTimestamp(accountId) {
        if (!accountId) {
            console.warn('⚠️ Cannot clear plan timestamp: accountId is null or undefined');
            return;
        }
        
        try {
            const planTimestamps = JSON.parse(localStorage.getItem('signalsai_plan_timestamps') || '{}');
            if (planTimestamps[accountId]) {
                delete planTimestamps[accountId];
                localStorage.setItem('signalsai_plan_timestamps', JSON.stringify(planTimestamps));
                console.log(`🧹 Cleared plan timestamp for account ${accountId}`);
            } else {
                console.log(`ℹ️ No timestamp to clear for account ${accountId}`);
            }
        } catch (error) {
            console.warn('Could not clear plan timestamp:', error);
        }
    }
    
    /**
     * Create a new action plan with optimistic updates
     * @param {string} actionId - Action ID (recommended action ID)
     * @param {string} accountId - Account ID (required for direct association)
     * @param {string} title - Plan title
     * @param {string} description - Plan description
     * @param {Array} tasks - Array of tasks (optional)
     * @param {string} userId - User ID (optional)
     */
    static async createActionPlan(actionId, accountId, title, description, tasks = [], userId = null) {
        const dispatcher = this.getDispatcher();
        const signalsStore = this.getSignalsStore();
        
        // Guard against missing dependencies
        if (!dispatcher) {
            console.error('❌ Cannot create action plan: Dispatcher not available');
            return null;
        }
        
        if (!signalsStore) {
            console.error('❌ Cannot create action plan: SignalsStore not available');
            return null;
        }
        
        // Validate required parameters
        if (!accountId) {
            console.error('❌ Cannot create action plan: accountId is required');
            dispatcher.dispatch(Actions.showMessage('Account ID is required for action plan creation', 'error'));
            return null;
        }
        
        // Get current user if not provided
        userId = userId || signalsStore.getState().userInfo.userId || 'user-1';
    
        if (!title || title.trim().length === 0) {
            dispatcher.dispatch(Actions.showMessage('Action plan title cannot be empty', 'error'));
            return null;
        }
    
        console.log(`🎯 ActionPlansService: Creating action plan for action ${actionId}`);
        
        // Dispatch optimistic request action (using actionId instead of signalId)
        const requestAction = Actions.requestActionPlan(actionId, title.trim(), description?.trim() || '', tasks, userId);
        dispatcher.dispatch(requestAction);
        
        const operationId = requestAction.payload.operationId; // Store in broader scope for catch block
        
        try {
            // Create plan object for API with proper ID (using actionId instead of signalId)
            const planData = {
                id: `plan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                actionId,  // Store the action ID (recommended action)
                accountId, // Use directly passed accountId
                title: title.trim(),
                description: description?.trim() || '',
                tasks: tasks || [],
                userId,
                status: 'active',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            
            // Make API call in background
            const result = await SignalsRepository.saveActionPlan(planData);
            
            // SignalsRepository always returns success:true for optimistic updates
            // but we still implement local persistence as fallback
            if (result && result.success) {
                // Store locally as fallback persistence
                this.storeActionPlanLocally(result.data || planData);
                
                // Dispatch success action with real plan data
                dispatcher.dispatch(Actions.actionPlanSucceeded(result.data || planData, operationId));
                
                // Show success message
                dispatcher.dispatch(Actions.showMessage('Action plan created successfully', 'success'));
                
                console.log('✅ Action plan created successfully:', result.data || planData);
                return result.data || planData;
                
            } else {
                // Clear any optimistic timestamps from UI with robust handling
                this.clearPlanCreationTimestamp(accountId); // Now handles undefined accountId gracefully
                
                // Dispatch failure action
                dispatcher.dispatch(Actions.actionPlanFailed(operationId, result?.error || 'Unknown error'));
                
                // Show error message
                dispatcher.dispatch(Actions.showMessage('Failed to save action plan - changes reverted', 'error'));
                
                console.error('❌ Action plan creation failed:', result?.error);
                return null;
            }
            
        } catch (error) {
            console.error('❌ ActionPlansService: Critical error in action plan creation:', error);
            
            try {
                const dispatcher = this.getDispatcher();
                
                // Clear any optimistic timestamps from UI using directly passed accountId
                this.clearPlanCreationTimestamp(accountId); // Use directly passed accountId instead of fragile inference
                
                // Use the preserved operationId from the original request action for proper rollback correlation
                dispatcher.dispatch(Actions.actionPlanFailed(operationId, error.message));
                
                // Show error message
                dispatcher.dispatch(Actions.showMessage('Failed to save action plan - changes reverted', 'error'));
                
            } catch (cleanupError) {
                console.error('❌ Additional error during cleanup:', cleanupError);
            }
            
            return null;
        }
    }
    
    /**
     * Update an existing action plan
     * @param {string} planId - Plan ID
     * @param {Object} updates - Plan updates
     */
    static async updateActionPlan(planId, updates) {
        console.log(`🎯 ActionPlansService: Updating action plan ${planId}`);
        
        try {
            const dispatcher = this.getDispatcher();
            
            // Make API call
            const result = await SignalsRepository.updateActionPlan(planId, updates);
            
            if (result && result.success) {
                // Update local storage as fallback
                const existingPlans = this.getLocalActionPlans();
                if (existingPlans[planId]) {
                    existingPlans[planId] = { ...existingPlans[planId], ...updates, updatedAt: new Date().toISOString() };
                    this.storeActionPlanLocally(existingPlans[planId]);
                }
                
                // Dispatch update action
                dispatcher.dispatch(Actions.updateActionPlan(planId, updates));
                
                // Show success message
                dispatcher.dispatch(Actions.showMessage('Action plan updated successfully', 'success'));
                
                return result.data;
                
            } else {
                // Show error message
                dispatcher.dispatch(Actions.showMessage('Failed to update action plan', 'error'));
                
                return null;
            }
            
        } catch (error) {
            console.error('❌ ActionPlansService: Failed to update action plan:', error);
            try {
                const dispatcher = this.getDispatcher();
                dispatcher.dispatch(Actions.showMessage('Failed to update action plan', 'error'));
            } catch (dispatchError) {
                console.error('❌ Failed to dispatch error message:', dispatchError);
            }
            return null;
        }
    }
    
    /**
     * Delete an action plan
     * @param {string} planId - Plan ID
     */
    static async deleteActionPlan(planId) {
        console.log(`🎯 ActionPlansService: Deleting action plan ${planId}`);
        
        try {
            const dispatcher = this.getDispatcher();
            
            // Make API call
            const result = await SignalsRepository.deleteActionPlan(planId);
            
            if (result && result.success) {
                // Remove from local storage
                const existingPlans = this.getLocalActionPlans();
                delete existingPlans[planId];
                localStorage.setItem('signalsai_action_plans', JSON.stringify(existingPlans));
                
                // Dispatch delete action
                dispatcher.dispatch(Actions.deleteActionPlan(planId));
                
                // Show success message
                dispatcher.dispatch(Actions.showMessage('Action plan deleted successfully', 'success'));
                
                return true;
                
            } else {
                // Show error message
                dispatcher.dispatch(Actions.showMessage('Failed to delete action plan', 'error'));
                
                return false;
            }
            
        } catch (error) {
            console.error('❌ ActionPlansService: Failed to delete action plan:', error);
            try {
                const dispatcher = this.getDispatcher();
                dispatcher.dispatch(Actions.showMessage('Failed to delete action plan', 'error'));
            } catch (dispatchError) {
                console.error('❌ Failed to dispatch error message:', dispatchError);
            }
            return false;
        }
    }
    
    /**
     * Get action plans for an account
     * @param {string} accountId - Account ID
     * @returns {Array} - Array of action plans
     */
    static getActionPlansForAccount(accountId) {
        try {
            const signalsStore = this.getSignalsStore();
            const state = signalsStore.getState();
            return state.actionPlansByAccount.get(accountId) || [];
        } catch (error) {
            console.warn('Could not get action plans from store, checking local storage:', error);
            // Fallback to local storage
            const localPlans = this.getLocalActionPlans();
            return Object.values(localPlans).filter(plan => plan.accountId === accountId);
        }
    }
    
    /**
     * Get an action plan by ID
     * @param {string} planId - Plan ID
     * @returns {Object|null} - Action plan or null
     */
    static getActionPlanById(planId) {
        try {
            const signalsStore = this.getSignalsStore();
            const state = signalsStore.getState();
            return state.actionPlans.get(planId) || null;
        } catch (error) {
            console.warn('Could not get action plan from store, checking local storage:', error);
            // Fallback to local storage
            const localPlans = this.getLocalActionPlans();
            return localPlans[planId] || null;
        }
    }
    
    /**
     * Add a task to an action plan
     * @param {string} planId - Plan ID
     * @param {Object} task - Task object
     */
    static async addTaskToPlan(planId, task) {
        const plan = this.getActionPlanById(planId);
        if (!plan) {
            try {
                const dispatcher = this.getDispatcher();
                dispatcher.dispatch(Actions.showMessage('Action plan not found', 'error'));
            } catch (error) {
                console.error('Could not show error message:', error);
            }
            return;
        }
        
        const updatedTasks = [...(plan.tasks || []), task];
        await this.updateActionPlan(planId, { tasks: updatedTasks });
    }
    
    /**
     * Remove a task from an action plan
     * @param {string} planId - Plan ID
     * @param {number} taskIndex - Task index to remove
     */
    static async removeTaskFromPlan(planId, taskIndex) {
        const plan = this.getActionPlanById(planId);
        if (!plan) {
            try {
                const dispatcher = this.getDispatcher();
                dispatcher.dispatch(Actions.showMessage('Action plan not found', 'error'));
            } catch (error) {
                console.error('Could not show error message:', error);
            }
            return;
        }
        
        const updatedTasks = [...(plan.tasks || [])];
        if (taskIndex >= 0 && taskIndex < updatedTasks.length) {
            updatedTasks.splice(taskIndex, 1);
            await this.updateActionPlan(planId, { tasks: updatedTasks });
        }
    }
}

// Make globally available
window.ActionPlansService = ActionPlansService;