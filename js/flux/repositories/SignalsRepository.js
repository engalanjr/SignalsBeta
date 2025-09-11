// SignalsRepository - Handles all signal-related API operations with Flux integration
class SignalsRepository {
    
    /**
     * Load all application data (signals, comments, interactions, plans, user info)
     * @returns {Promise} - Promise that resolves with all data
     */
    static async loadAllData() {
        // Dispatch loading started action
        dispatcher.dispatch(Actions.startDataLoad());
        
        try {
            console.log('🚀 SignalsRepository: Starting parallel batch data load...');
            
            // Use the existing DataLoader for now but wrap it with Flux actions
            const data = await DataLoader.loadAllData();
            
            // Dispatch success action with the data
            dispatcher.dispatch(Actions.dataLoadSuccess(data));
            
            return data;
            
        } catch (error) {
            console.error('❌ SignalsRepository: Failed to load data:', error);
            
            // Dispatch failure action
            dispatcher.dispatch(Actions.dataLoadFailed(error));
            
            throw error;
        }
    }
    
    /**
     * Save user feedback interaction (like/not-accurate)
     * @param {string} signalId - Signal ID
     * @param {string} interactionType - Type of interaction ('like', 'not-accurate')
     * @param {string} userId - User ID
     * @returns {Promise} - Promise that resolves with result
     */
    static async saveFeedbackInteraction(signalId, interactionType, userId) {
        try {
            console.log(`💾 SignalsRepository: Saving feedback ${interactionType} for signal ${signalId}`);
            
            // Use existing service for actual API call
            const result = await SignalFeedbackService.saveInteraction(signalId, interactionType);
            
            return {
                success: true,
                data: result
            };
            
        } catch (error) {
            console.error('❌ SignalsRepository: Failed to save feedback:', error);
            
            return {
                success: false,
                error: error.message || 'Failed to save feedback'
            };
        }
    }
    
    /**
     * Save a new comment
     * @param {Object} comment - Comment data
     * @returns {Promise} - Promise that resolves with saved comment
     */
    static async saveComment(comment) {
        try {
            console.log('💾 SignalsRepository: Saving comment...');
            
            // Use existing service for actual API call
            const savedComment = await CommentService.saveComment(comment);
            
            return {
                success: true,
                data: savedComment
            };
            
        } catch (error) {
            console.error('❌ SignalsRepository: Failed to save comment:', error);
            
            return {
                success: false,
                error: error.message || 'Failed to save comment'
            };
        }
    }
    
    /**
     * Update an existing comment
     * @param {string} commentId - Comment ID to update
     * @param {Object} updates - Comment updates
     * @returns {Promise} - Promise that resolves with updated comment
     */
    static async updateComment(commentId, updates) {
        try {
            console.log(`💾 SignalsRepository: Updating comment ${commentId}...`);
            
            // Use existing service for actual API call
            const updatedComment = await CommentService.updateComment(commentId, updates);
            
            return {
                success: true,
                data: updatedComment
            };
            
        } catch (error) {
            console.error('❌ SignalsRepository: Failed to update comment:', error);
            
            return {
                success: false,
                error: error.message || 'Failed to update comment'
            };
        }
    }
    
    /**
     * Delete a comment
     * @param {string} commentId - Comment ID to delete
     * @returns {Promise} - Promise that resolves with result
     */
    static async deleteComment(commentId) {
        try {
            console.log(`💾 SignalsRepository: Deleting comment ${commentId}...`);
            
            // Use existing service for actual API call
            const result = await CommentService.deleteComment(commentId);
            
            return {
                success: true,
                data: result
            };
            
        } catch (error) {
            console.error('❌ SignalsRepository: Failed to delete comment:', error);
            
            return {
                success: false,
                error: error.message || 'Failed to delete comment'
            };
        }
    }
    
    /**
     * Save a new action plan
     * @param {Object} plan - Action plan data
     * @returns {Promise} - Promise that resolves with saved plan
     */
    static async saveActionPlan(plan) {
        try {
            console.log('💾 SignalsRepository: Saving action plan...');
            
            // Use existing service for actual API call
            const savedPlan = await ActionPlanService.saveActionPlan(plan);
            
            return {
                success: true,
                data: savedPlan
            };
            
        } catch (error) {
            console.error('❌ SignalsRepository: Failed to save action plan:', error);
            
            return {
                success: false,
                error: error.message || 'Failed to save action plan'
            };
        }
    }
    
    /**
     * Update an existing action plan
     * @param {string} planId - Plan ID to update
     * @param {Object} updates - Plan updates
     * @returns {Promise} - Promise that resolves with updated plan
     */
    static async updateActionPlan(planId, updates) {
        try {
            console.log(`💾 SignalsRepository: Updating action plan ${planId}...`);
            
            // Use existing service for actual API call
            const updatedPlan = await ActionPlanService.updateActionPlan(planId, updates);
            
            return {
                success: true,
                data: updatedPlan
            };
            
        } catch (error) {
            console.error('❌ SignalsRepository: Failed to update action plan:', error);
            
            return {
                success: false,
                error: error.message || 'Failed to update action plan'
            };
        }
    }
    
    /**
     * Delete an action plan
     * @param {string} planId - Plan ID to delete
     * @returns {Promise} - Promise that resolves with result
     */
    static async deleteActionPlan(planId) {
        try {
            console.log(`💾 SignalsRepository: Deleting action plan ${planId}...`);
            
            // Use existing service for actual API call
            const result = await ActionPlanService.deleteActionPlan(planId);
            
            return {
                success: true,
                data: result
            };
            
        } catch (error) {
            console.error('❌ SignalsRepository: Failed to delete action plan:', error);
            
            return {
                success: false,
                error: error.message || 'Failed to delete action plan'
            };
        }
    }
}

// Make globally available
window.SignalsRepository = SignalsRepository;