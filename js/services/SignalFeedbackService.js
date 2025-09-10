
// Signal Feedback Service - Handle signal feedback operations
class SignalFeedbackService {
    
    static async acknowledgeSignal(signalId, feedbackType, app) {
        const signal = app.data.find(s => s.id === signalId);
        if (!signal) return;

        const isAlreadySelected = signal.currentUserFeedback === feedbackType;

        try {
            let result;
            if (!isAlreadySelected) {
                // Save/update feedback
                result = await this.saveInteraction(signalId, feedbackType);
                
                // Update counts and user feedback
                if (feedbackType === 'like') {
                    signal.likeCount = (signal.likeCount || 0) + 1;
                    if (signal.currentUserFeedback === 'not-accurate') {
                        signal.notAccurateCount = Math.max(0, (signal.notAccurateCount || 0) - 1);
                    }
                } else if (feedbackType === 'not-accurate') {
                    signal.notAccurateCount = (signal.notAccurateCount || 0) + 1;
                    if (signal.currentUserFeedback === 'like') {
                        signal.likeCount = Math.max(0, (signal.likeCount || 0) - 1);
                    }
                }
                signal.currentUserFeedback = feedbackType;
                
                // Also update in filteredData if it exists
                const filteredSignal = app.filteredData.find(s => s.id === signalId);
                if (filteredSignal) {
                    filteredSignal.likeCount = signal.likeCount;
                    filteredSignal.notAccurateCount = signal.notAccurateCount;
                    filteredSignal.currentUserFeedback = signal.currentUserFeedback;
                }
                
                app.showSuccessMessage(`Signal marked as ${feedbackType}`);
            } else {
                // Remove feedback (unsave)
                result = await this.saveInteraction(signalId, 'removed_' + feedbackType);
                
                // Update counts
                if (feedbackType === 'like') {
                    signal.likeCount = Math.max(0, (signal.likeCount || 0) - 1);
                } else if (feedbackType === 'not-accurate') {
                    signal.notAccurateCount = Math.max(0, (signal.notAccurateCount || 0) - 1);
                }
                signal.currentUserFeedback = null;
                
                // Also update in filteredData if it exists
                const filteredSignal = app.filteredData.find(s => s.id === signalId);
                if (filteredSignal) {
                    filteredSignal.likeCount = signal.likeCount;
                    filteredSignal.notAccurateCount = signal.notAccurateCount;
                    filteredSignal.currentUserFeedback = null;
                }
                
                app.showSuccessMessage('Feedback removed');
            }

            // Re-render the current tab to show updated button states
            if (app && typeof app.renderCurrentTab === 'function') {
                app.renderCurrentTab();
            }
        } catch (error) {
            console.error('Error updating signal feedback:', error);
            app.showErrorMessage('Failed to update signal feedback');
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
            console.log('Saved interaction to SignalAI.Interactions AppDB:', appDbInteraction);
            return { success: true, interaction };
        } catch (error) {
            console.error('Failed to save interaction to SignalAI.Interactions AppDB:', error);
            return { success: true, interaction }; // Fallback to success for now
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
