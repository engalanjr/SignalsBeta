// ActionFeedbackService - Handles action feedback (useful/not-relevant)
class ActionFeedbackService {
    
    /**
     * Get action feedback counts
     * @param {string} actionId - Action ID
     * @returns {Object} - Object with useful and notRelevant counts
     */
    static getActionCounts(actionId) {
        // Access the store's normalized data and indexes directly, not through state
        const interactions = signalsStore.normalizedData?.interactions || new Map();
        const interactionsByAction = signalsStore.indexes?.interactionsByAction || new Map();
        
        // Get interaction IDs for this action
        const actionInteractionIds = interactionsByAction.get(actionId) || new Set();
        
        let useful = 0;
        let notRelevant = 0;
        
        // Count interactions
        for (const interactionId of actionInteractionIds) {
            const interaction = interactions.get(interactionId);
            if (interaction) {
                if (interaction.interactionType === 'useful') {
                    useful++;
                } else if (interaction.interactionType === 'not_relevant') {
                    notRelevant++;
                }
            }
        }
        
        return { useful, notRelevant };
    }
    
    /**
     * Get current user's feedback for an action
     * @param {string} actionId - Action ID
     * @param {string} userId - User ID (optional)
     * @returns {string|null} - Feedback type or null
     */
    static getUserActionFeedback(actionId, userId = null) {
        const state = signalsStore.getState();
        userId = userId || state.userInfo?.userId || 'user-1';
        
        // Access the store's normalized data and indexes directly, not through state
        const interactions = signalsStore.normalizedData?.interactions || new Map();
        const interactionsByAction = signalsStore.indexes?.interactionsByAction || new Map();
        
        // Get interaction IDs for this action
        const actionInteractionIds = interactionsByAction.get(actionId) || new Set();
        
        console.log(`🔍 getUserActionFeedback for action ${actionId}:`, {
            userId,
            totalInteractions: interactions.size,
            actionInteractionIdsCount: actionInteractionIds.size,
            actionInteractionIds: Array.from(actionInteractionIds),
            hasInteractionsByAction: interactionsByAction.has(actionId)
        });
        
        // Find user's interaction
        for (const interactionId of actionInteractionIds) {
            const interaction = interactions.get(interactionId);
            console.log(`  Checking interaction ${interactionId}:`, interaction);
            if (interaction && interaction.userId === userId) {
                if (interaction.interactionType === 'useful' || interaction.interactionType === 'not_relevant') {
                    console.log(`  ✅ Found matching interaction: ${interaction.interactionType}`);
                    return interaction.interactionType;
                }
            }
        }
        
        console.log(`  ❌ No matching interaction found`);
        return null;
    }
}

// Make globally available
window.ActionFeedbackService = ActionFeedbackService;

