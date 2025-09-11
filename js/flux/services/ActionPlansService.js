// ActionPlansService - Handles action plans through Flux actions
class ActionPlansService {
    
    /**
     * Create a new action plan with optimistic updates
     * @param {string} signalId - Signal ID
     * @param {string} title - Plan title
     * @param {string} description - Plan description
     * @param {Array} tasks - Array of tasks (optional)
     * @param {string} userId - User ID (optional)
     */
    static async createActionPlan(signalId, title, description, tasks = [], userId = null) {
        // Get current user if not provided
        userId = userId || signalsStore.getState().userInfo.userId || 'user-1';
        
        if (!title || title.trim().length === 0) {
            dispatcher.dispatch(Actions.showMessage('Action plan title cannot be empty', 'error'));
            return;
        }
        
        console.log(`🎯 ActionPlansService: Creating action plan for signal ${signalId}`);
        
        // Dispatch optimistic request action
        const requestAction = Actions.requestActionPlan(signalId, title.trim(), description?.trim() || '', tasks, userId);
        dispatcher.dispatch(requestAction);
        
        const operationId = requestAction.payload.operationId;
        
        try {
            // Get signal info for account ID
            const state = signalsStore.getState();
            const signal = state.signalsById.get(signalId);
            const accountId = signal?.account_id;
            
            // Create plan object for API
            const planData = {
                signalId,
                accountId,
                title: title.trim(),
                description: description?.trim() || '',
                tasks: tasks || [],
                userId,
                status: 'active',
                createdAt: new Date().toISOString()
            };
            
            // Make API call in background
            const result = await SignalsRepository.saveActionPlan(planData);
            
            if (result.success) {
                // Dispatch success action with real plan data
                dispatcher.dispatch(Actions.actionPlanSucceeded(result.data, operationId));
                
                // Show success message
                dispatcher.dispatch(Actions.showMessage('Action plan created successfully', 'success'));
                
                return result.data;
                
            } else {
                // Dispatch failure action
                dispatcher.dispatch(Actions.actionPlanFailed(operationId, result.error));
                
                // Show error message
                dispatcher.dispatch(Actions.showMessage('Failed to save action plan - changes reverted', 'error'));
                
                return null;
            }
            
        } catch (error) {
            console.error('❌ ActionPlansService: Critical error in action plan creation:', error);
            
            // Dispatch failure action
            dispatcher.dispatch(Actions.actionPlanFailed(operationId, error.message));
            
            // Show error message
            dispatcher.dispatch(Actions.showMessage('Failed to save action plan - changes reverted', 'error'));
            
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
            // Make API call
            const result = await SignalsRepository.updateActionPlan(planId, updates);
            
            if (result.success) {
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
            dispatcher.dispatch(Actions.showMessage('Failed to update action plan', 'error'));
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
            // Make API call
            const result = await SignalsRepository.deleteActionPlan(planId);
            
            if (result.success) {
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
            dispatcher.dispatch(Actions.showMessage('Failed to delete action plan', 'error'));
            return false;
        }
    }
    
    /**
     * Get action plans for an account
     * @param {string} accountId - Account ID
     * @returns {Array} - Array of action plans
     */
    static getActionPlansForAccount(accountId) {
        const state = signalsStore.getState();
        return state.actionPlansByAccount.get(accountId) || [];
    }
    
    /**
     * Get an action plan by ID
     * @param {string} planId - Plan ID
     * @returns {Object|null} - Action plan or null
     */
    static getActionPlanById(planId) {
        const state = signalsStore.getState();
        return state.actionPlans.get(planId) || null;
    }
    
    /**
     * Add a task to an action plan
     * @param {string} planId - Plan ID
     * @param {Object} task - Task object
     */
    static async addTaskToPlan(planId, task) {
        const plan = this.getActionPlanById(planId);
        if (!plan) {
            dispatcher.dispatch(Actions.showMessage('Action plan not found', 'error'));
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
            dispatcher.dispatch(Actions.showMessage('Action plan not found', 'error'));
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