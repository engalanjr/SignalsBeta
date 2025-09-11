// CommentsService - Handles comments through Flux actions
class CommentsService {
    
    /**
     * Add a new comment with optimistic updates
     * @param {string} signalId - Signal ID (optional if accountId provided)
     * @param {string} accountId - Account ID (optional if signalId provided)
     * @param {string} text - Comment text
     * @param {string} userId - User ID (optional)
     */
    static async addComment(signalId = null, accountId = null, text, userId = null) {
        // Get current user if not provided
        userId = userId || signalsStore.getState().userInfo.userId || 'user-1';
        
        if (!text || text.trim().length === 0) {
            dispatcher.dispatch(Actions.showMessage('Comment cannot be empty', 'error'));
            return;
        }
        
        console.log(`🎯 CommentsService: Adding comment for ${signalId ? 'signal' : 'account'} ${signalId || accountId}`);
        
        // Dispatch optimistic request action
        const requestAction = Actions.requestComment(signalId, accountId, text.trim(), userId);
        dispatcher.dispatch(requestAction);
        
        const operationId = requestAction.payload.operationId;
        
        try {
            // Create comment object for API
            const commentData = {
                signalId,
                accountId,
                text: text.trim(),
                userId,
                timestamp: new Date().toISOString()
            };
            
            // Make API call in background
            const result = await SignalsRepository.saveComment(commentData);
            
            if (result.success) {
                // Dispatch success action with real comment data
                dispatcher.dispatch(Actions.commentSucceeded(result.data, operationId));
                
                // Show success message
                dispatcher.dispatch(Actions.showMessage('Comment added successfully', 'success'));
                
            } else {
                // Dispatch failure action
                dispatcher.dispatch(Actions.commentFailed(operationId, result.error));
                
                // Show error message
                dispatcher.dispatch(Actions.showMessage('Failed to save comment - changes reverted', 'error'));
            }
            
        } catch (error) {
            console.error('❌ CommentsService: Critical error in comment handling:', error);
            
            // Dispatch failure action
            dispatcher.dispatch(Actions.commentFailed(operationId, error.message));
            
            // Show error message
            dispatcher.dispatch(Actions.showMessage('Failed to save comment - changes reverted', 'error'));
        }
    }
    
    /**
     * Update an existing comment
     * @param {string} commentId - Comment ID
     * @param {string} newText - New comment text
     */
    static async updateComment(commentId, newText) {
        if (!newText || newText.trim().length === 0) {
            dispatcher.dispatch(Actions.showMessage('Comment cannot be empty', 'error'));
            return;
        }
        
        console.log(`🎯 CommentsService: Updating comment ${commentId}`);
        
        try {
            // Make API call
            const result = await SignalsRepository.updateComment(commentId, { text: newText.trim() });
            
            if (result.success) {
                // Dispatch update action
                dispatcher.dispatch(Actions.updateComment(commentId, newText.trim()));
                
                // Show success message
                dispatcher.dispatch(Actions.showMessage('Comment updated successfully', 'success'));
                
            } else {
                // Show error message
                dispatcher.dispatch(Actions.showMessage('Failed to update comment', 'error'));
            }
            
        } catch (error) {
            console.error('❌ CommentsService: Failed to update comment:', error);
            dispatcher.dispatch(Actions.showMessage('Failed to update comment', 'error'));
        }
    }
    
    /**
     * Delete a comment
     * @param {string} commentId - Comment ID
     */
    static async deleteComment(commentId) {
        console.log(`🎯 CommentsService: Deleting comment ${commentId}`);
        
        try {
            // Make API call
            const result = await SignalsRepository.deleteComment(commentId);
            
            if (result.success) {
                // Dispatch delete action
                dispatcher.dispatch(Actions.deleteComment(commentId));
                
                // Show success message
                dispatcher.dispatch(Actions.showMessage('Comment deleted successfully', 'success'));
                
            } else {
                // Show error message
                dispatcher.dispatch(Actions.showMessage('Failed to delete comment', 'error'));
            }
            
        } catch (error) {
            console.error('❌ CommentsService: Failed to delete comment:', error);
            dispatcher.dispatch(Actions.showMessage('Failed to delete comment', 'error'));
        }
    }
    
    /**
     * Get comments for a signal
     * @param {string} signalId - Signal ID
     * @returns {Array} - Array of comments
     */
    static getCommentsForSignal(signalId) {
        const state = signalsStore.getState();
        return state.comments.get(signalId) || [];
    }
    
    /**
     * Get comments for an account
     * @param {string} accountId - Account ID
     * @returns {Array} - Array of comments
     */
    static getCommentsForAccount(accountId) {
        const state = signalsStore.getState();
        return state.comments.get(accountId) || [];
    }
}

// Make globally available
window.CommentsService = CommentsService;