
// Signal Feedback Service - Handle signal feedback operations
class SignalFeedbackService {
    
    static async acknowledgeSignal(signalId, feedbackType, app) {
        const operationId = `feedback_${signalId}_${Date.now()}`;
        
        try {
            // 🔄 STEP 1: Create snapshot for rollback capability
            DataCache.createSnapshot(operationId);
            
            // 🚀 STEP 2: OPTIMISTIC UPDATE - Update cache immediately 
            const currentFeedback = DataCache.getUserFeedbackForSignal(signalId);
            const isAlreadySelected = currentFeedback === feedbackType;
            
            if (!isAlreadySelected) {
                // Add/change feedback
                DataCache.toggleUserFeedback(signalId, feedbackType);
                app.showSuccessMessage(`Signal marked as ${feedbackType}`);
            } else {
                // Remove feedback (toggle off)
                DataCache.removeUserFeedback(signalId);
                app.showSuccessMessage('Feedback removed');
            }
            
            // ⚡ STEP 3: UI UPDATES IMMEDIATELY - refresh with new cache data
            this.updateSignalDisplayCounts(signalId, app);
            
            if (app && typeof app.renderCurrentTab === 'function') {
                app.renderCurrentTab();
            }

            // 🔄 STEP 4: Background persistence to API
            const interactionType = !isAlreadySelected ? feedbackType : 'removed_' + feedbackType;
            const saveResult = await this.saveInteraction(signalId, interactionType);
            
            if (saveResult.success) {
                // ✅ STEP 5: Success - commit the optimistic changes
                DataCache.commitSnapshot(operationId);
                console.log(`✅ Feedback persisted successfully: ${interactionType} for signal ${signalId}`);
            } else {
                // ❌ STEP 6: API Failed - rollback optimistic changes
                console.error('API failed, rolling back optimistic changes:', saveResult.error);
                DataCache.rollback(operationId);
                
                // Update UI to reflect rollback
                this.updateSignalDisplayCounts(signalId, app);
                if (app && typeof app.renderCurrentTab === 'function') {
                    app.renderCurrentTab();
                }
                
                app.showErrorMessage('Failed to save feedback - changes reverted');
            }
            
        } catch (error) {
            // ❌ Critical error - rollback and show error
            console.error('Critical error in optimistic feedback:', error);
            DataCache.rollback(operationId);
            
            this.updateSignalDisplayCounts(signalId, app);
            if (app && typeof app.renderCurrentTab === 'function') {
                app.renderCurrentTab();
            }
            
            app.showErrorMessage('Failed to update signal feedback');
        }
    }

    // Helper method to sync display data with cache
    static updateSignalDisplayCounts(signalId, app) {
        const signal = app.data.find(s => s.id === signalId);
        const filteredSignal = app.filteredData.find(s => s.id === signalId);
        
        if (signal) {
            const counts = DataCache.getSignalCounts(signalId);
            const userFeedback = DataCache.getUserFeedbackForSignal(signalId);
            
            signal.likeCount = counts.likes;
            signal.notAccurateCount = counts.notAccurate;
            signal.currentUserFeedback = userFeedback;
        }
        
        if (filteredSignal) {
            const counts = DataCache.getSignalCounts(signalId);
            const userFeedback = DataCache.getUserFeedbackForSignal(signalId);
            
            filteredSignal.likeCount = counts.likes;
            filteredSignal.notAccurateCount = counts.notAccurate;
            filteredSignal.currentUserFeedback = userFeedback;
        }
    }

    static async saveSignalFeedback(signalId, feedbackType, app) {
        try {
            const result = await this.saveInteraction(signalId, feedbackType);
            const signal = app.data.find(s => s.id === signalId);
            if (signal) {
                signal.feedbackType = feedbackType;
            }
            return result;
        } catch (error) {
            console.error('Error saving signal feedback:', error);
            throw error;
        }
    }

    static async unsaveSignalFeedback(signalId, app) {
        try {
            const result = await this.saveInteraction(signalId, 'feedback_removed');
            const signal = app.data.find(s => s.id === signalId);
            if (signal) {
                delete signal.feedbackType;
            }
            return result;
        } catch (error) {
            console.error('Error removing signal feedback:', error);
            throw error;
        }
    }

    static async saveInteraction(signalId, interactionType) {
        // Call the "me" endpoint to get current user info
        let user;
        let userName = 'Current User';
        let userId = 'user-1';
        
        try {
            user = await domo.get(`/domo/environment/v1/`);
            console.log("User Info:", user);
            userId = user.userId;
            userName = user.userName;
        } catch (error) {
            console.warn('Could not get user info, using defaults:', error);
        }

        const interaction = {
            id: `interaction-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            signalId: signalId,
            interactionType: interactionType,
            timestamp: new Date().toISOString(),
            userId: userId,
            userName: userName,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        try {
            console.log(`Saving interaction: ${interactionType} for signal ${signalId}`);
            
            // For AppDB, wrap in content structure
            const appDbInteraction = {
                content: interaction
            };
            
            const response = await domo.post('/domo/datastores/v1/collections/SignalAI.Interactions/documents', appDbInteraction);
            console.log('✅ Saved interaction to SignalAI.Interactions AppDB:', appDbInteraction);
            return { success: true, interaction };
        } catch (error) {
            console.error('❌ Failed to save interaction to SignalAI.Interactions AppDB:', error);
            // 🚨 CRITICAL FIX: Return actual failure to trigger rollback
            return { success: false, error: error.message, interaction };
        }
    }

    static async recordSignalRemoval(signalId) {
        return this.saveInteraction(signalId, 'signal_removed');
    }

    // Viewed Signal CRUD Methods
    static async recordSignalViewed(signalId) {
        return this.saveInteraction(signalId, 'signal_viewed');
    }

    static async markSignalAsViewed(signalId, app) {
        try {
            // Record the view interaction
            await this.recordSignalViewed(signalId);
            
            // Add to viewed signals set
            if (app && app.viewedSignals) {
                app.viewedSignals.add(signalId);
            }

            console.log(`Signal ${signalId} marked as viewed`);
            return { success: true };
        } catch (error) {
            console.error('Error marking signal as viewed:', error);
            return { success: false, error };
        }
    }

    static async getViewedSignals(app) {
        // ⚡ OPTIMIZED: Use cached data instead of API calls
        console.log('📋 Getting viewed signals from cache (no API calls needed)');
        
        const userId = DataCache.userInfo.userId || 'user-1';
        const viewedSignalIds = DataCache.getViewedSignalsForUser(userId);

        // Update app's viewedSignals set if app is provided
        if (app && app.viewedSignals) {
            viewedSignalIds.forEach(signalId => {
                app.viewedSignals.add(signalId);
            });
        }

        console.log(`✅ Retrieved ${viewedSignalIds.size} viewed signals for user ${userId} from cache`);
        return { success: true, viewedSignals: viewedSignalIds };
    }

    static async unmarkSignalAsViewed(signalId, app) {
        try {
            // Record the unview interaction (for tracking purposes)
            await this.saveInteraction(signalId, 'signal_unviewed');
            
            // Remove from viewed signals set
            if (app && app.viewedSignals) {
                app.viewedSignals.delete(signalId);
            }

            console.log(`Signal ${signalId} unmarked as viewed`);
            return { success: true };
        } catch (error) {
            console.error('Error unmarking signal as viewed:', error);
            return { success: false, error };
        }
    }

    static async isSignalViewed(signalId, app) {
        try {
            // Check local viewed signals set first
            if (app && app.viewedSignals && app.viewedSignals.has(signalId)) {
                return { success: true, isViewed: true };
            }

            // If not in local set, check database
            const viewedResult = await this.getViewedSignals();
            const isViewed = viewedResult.viewedSignals.has(signalId);
            
            return { success: true, isViewed };
        } catch (error) {
            console.error('Error checking if signal is viewed:', error);
            return { success: false, error, isViewed: false };
        }
    }

    static async getViewedSignalsCount(userId = null) {
        // ⚡ OPTIMIZED: Use cached data instead of API calls
        console.log('📋 Getting viewed signals count from cache (no API calls needed)');
        
        userId = userId || DataCache.userInfo.userId || 'user-1';
        const viewedSignals = DataCache.getViewedSignalsForUser(userId);
        const viewedCount = viewedSignals.size;
        
        console.log(`✅ User ${userId} has viewed ${viewedCount} unique signals (from cache)`);
        return { success: true, count: viewedCount };
    }
}
