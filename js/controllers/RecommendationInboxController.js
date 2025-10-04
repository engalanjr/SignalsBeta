// RecommendationInboxController - Flux controller for recommendation inbox view
class RecommendationInboxController {
    constructor() {
        this.subscriptions = [];
        console.log('📥 RecommendationInboxController initialized');
        
        // Set up store subscriptions
        this.subscribeToStore();
    }

    /**
     * Subscribe to store changes
     */
    subscribeToStore() {
        // Subscribe to store changes for real-time updates
        signalsStore.subscribe('inbox-controller', (state) => {
            this.handleStoreChange(state);
        });

        // Subscribe to specific action events
        signalsStore.subscribe('action:viewed', () => {
            this.refreshInbox();
        });

        // OPTIMISTIC: Subscribe to feedback updates for instant UI refresh
        signalsStore.subscribe('action:feedback-updated', (state, actionId) => {
            console.log('📡 Feedback event received for action:', actionId);
            console.log('📡 Currently selected action:', RecommendationInboxRenderer.selectedActionId);
            this.refreshDetailPaneOnly(actionId);
        });

        signalsStore.subscribe('action_plan:created', () => {
            this.refreshInbox();
        });

        signalsStore.subscribe('action_plan:updated', () => {
            this.refreshInbox();
        });
    }

    /**
     * Handle store changes
     */
    handleStoreChange(state) {
        // Only refresh if inbox tab is active
        const currentTab = document.querySelector('.nav-tab[data-tab="recommendation-inbox"]');
        if (currentTab && currentTab.classList.contains('active')) {
            // Debounce to avoid too many renders
            clearTimeout(this.renderTimeout);
            this.renderTimeout = setTimeout(() => {
                this.refreshInbox();
            }, 100);
        }
    }

    /**
     * Render the inbox view
     */
    render(state) {
        console.log('📥 RecommendationInboxController: Rendering inbox');
        
        if (!state) {
            state = signalsStore.getState();
        }

        // Use store methods directly instead of state properties
        const actions = signalsStore.getRecommendedActions() || [];
        // Get denormalized signals (each action already has relatedSignals, but we need the full list for context)
        const signals = signalsStore.getDenormalizedSignals() || state.signals || [];
        const interactions = state.actionInteractions || new Map();
        const viewState = state.viewState || {};

        console.log('📊 Inbox data:', {
            actionsCount: actions.length,
            signalsCount: signals.length,
            sampleAction: actions[0]
        });

        if (typeof RecommendationInboxRenderer !== 'undefined') {
            RecommendationInboxRenderer.renderInbox(actions, viewState, signals, interactions);
        } else {
            console.error('RecommendationInboxRenderer not available');
        }
    }

    /**
     * Refresh the inbox view
     */
    refreshInbox() {
        const state = signalsStore.getState();
        this.render(state);
    }

    /**
     * Refresh only the detail pane (optimistic updates for feedback)
     */
    refreshDetailPaneOnly(actionId) {
        const state = signalsStore.getState();
        const actions = signalsStore.getRecommendedActions() || [];
        const signals = signalsStore.getDenormalizedSignals() || state.signals || [];
        
        // Only refresh if this action is currently selected
        if (RecommendationInboxRenderer.selectedActionId === actionId) {
            const action = actions.find(a => (a.id || a.action_id) === actionId);
            if (action) {
                console.log('🔄 Refreshing detail pane for action:', actionId);
                const detailPane = document.querySelector('.inbox-detail-pane');
                if (detailPane) {
                    detailPane.innerHTML = `
                        ${RecommendationInboxRenderer.renderDetailHeader(action)}
                        ${RecommendationInboxRenderer.renderDetailContent(action, signals)}
                    `;
                }
            }
        }
    }

    /**
     * Clean up subscriptions
     */
    destroy() {
        this.subscriptions.forEach(unsubscribe => unsubscribe());
        this.subscriptions = [];
        console.log('📥 RecommendationInboxController destroyed');
    }
}

// Make globally available
window.RecommendationInboxController = RecommendationInboxController;

