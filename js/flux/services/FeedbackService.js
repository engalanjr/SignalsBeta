// FeedbackService - Handles user feedback through Flux actions
class FeedbackService {
    
    /**
     * Handle user feedback (like/not-accurate) with optimistic updates
     * @param {string} signalId - Signal ID
     * @param {string} feedbackType - Type of feedback ('like', 'not-accurate')
     * @param {string} userId - User ID (optional, defaults to current user)
     */
    static async handleFeedback(signalId, feedbackType, userId = null) {
        // Get current user if not provided
        userId = userId || signalsStore.getState().userInfo.userId || 'user-1';
        
        console.log(`🎯 FeedbackService: Handling ${feedbackType} for signal ${signalId}`);
        
        // Dispatch optimistic request action
        const requestAction = Actions.requestFeedback(signalId, feedbackType, userId);
        dispatcher.dispatch(requestAction);
        
        const operationId = requestAction.payload.operationId;
        
        try {
            // Make API call in background
            const result = await SignalsRepository.saveFeedbackInteraction(signalId, feedbackType, userId);
            
            if (result.success) {
                // Dispatch success action
                dispatcher.dispatch(Actions.feedbackSucceeded(signalId, feedbackType, operationId));
                
                // Show success message
                dispatcher.dispatch(Actions.showMessage(`Signal marked as ${feedbackType}`, 'success'));
                
            } else {
                // Dispatch failure action
                dispatcher.dispatch(Actions.feedbackFailed(signalId, feedbackType, operationId, result.error));
                
                // Show error message
                dispatcher.dispatch(Actions.showMessage('Failed to save feedback - changes reverted', 'error'));
            }
            
        } catch (error) {
            console.error('❌ FeedbackService: Critical error in feedback handling:', error);
            
            // Dispatch failure action
            dispatcher.dispatch(Actions.feedbackFailed(signalId, feedbackType, operationId, error.message));
            
            // Show error message
            dispatcher.dispatch(Actions.showMessage('Failed to save feedback - changes reverted', 'error'));
        }
    }
    
    /**
     * Remove user feedback for a signal
     * @param {string} signalId - Signal ID
     * @param {string} userId - User ID (optional)
     */
    static async removeFeedback(signalId, userId = null) {
        userId = userId || signalsStore.getState().userInfo.userId || 'user-1';
        
        console.log(`🎯 FeedbackService: Removing feedback for signal ${signalId}`);
        
        // Dispatch remove feedback action
        dispatcher.dispatch(Actions.removeFeedback(signalId, userId));
        
        // Show success message
        dispatcher.dispatch(Actions.showMessage('Feedback removed', 'info'));
    }
    
    /**
     * Get current user feedback for a signal
     * @param {string} signalId - Signal ID
     * @param {string} userId - User ID (optional)
     * @returns {string|null} - Feedback type or null
     */
    static getUserFeedback(signalId, userId = null) {
        const state = signalsStore.getState();
        userId = userId || state.userInfo.userId || 'user-1';
        
        const interactions = state.interactions.get(signalId) || [];
        const userInteraction = interactions.find(i => 
            i.userId === userId && (i.interactionType === 'like' || i.interactionType === 'not-accurate')
        );
        
        return userInteraction ? userInteraction.interactionType : null;
    }
    
    /**
     * Get signal feedback counts
     * @param {string} signalId - Signal ID
     * @returns {Object} - Object with likes and notAccurate counts
     */
    static getSignalCounts(signalId) {
        const state = signalsStore.getState();
        const interactions = state.interactions.get(signalId) || [];
        
        const likes = interactions.filter(i => i.interactionType === 'like').length;
        const notAccurate = interactions.filter(i => i.interactionType === 'not-accurate').length;
        
        return { likes, notAccurate };
    }
}

// Make globally available
window.FeedbackService = FeedbackService;