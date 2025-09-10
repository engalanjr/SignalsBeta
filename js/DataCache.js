// DataCache - In-memory data management and fast filtering
class DataCache {
    
    // Static data stores
    static signals = [];
    static comments = new Map(); // signalId/accountId → comments[]
    static interactions = new Map(); // signalId → interactions[]
    static actionPlans = new Map(); // planId → plan
    static userInfo = {};
    
    // Indexed lookups for performance
    static signalsById = new Map();
    static signalsByAccount = new Map();
    static interactionsByUser = new Map();
    static actionPlansByAccount = new Map();

    /**
     * Initialize cache with batch-loaded data
     */
    static initialize(data) {
        console.log('🗄️ Initializing data cache...');
        
        this.signals = data.signals || [];
        this.userInfo = data.userInfo || {};
        
        // Build signal indexes
        this.buildSignalIndexes();
        
        // Process and index comments
        this.processComments(data.comments || []);
        
        // Process and index interactions  
        this.processInteractions(data.interactions || []);
        
        // Process and index action plans
        this.processActionPlans(data.actionPlans || []);
        
        console.log('✅ Data cache initialized with fast lookup indexes');
    }

    static buildSignalIndexes() {
        this.signalsById.clear();
        this.signalsByAccount.clear();
        
        this.signals.forEach(signal => {
            // Index by signal ID
            this.signalsById.set(signal.id, signal);
            
            // Index by account ID
            const accountId = signal.account_id;
            if (!this.signalsByAccount.has(accountId)) {
                this.signalsByAccount.set(accountId, []);
            }
            this.signalsByAccount.get(accountId).push(signal);
        });
    }

    static processComments(comments) {
        this.comments.clear();
        
        comments.forEach(comment => {
            const key = comment.signalId || comment.accountId;
            if (key) {
                if (!this.comments.has(key)) {
                    this.comments.set(key, []);
                }
                this.comments.get(key).push(comment);
            }
        });
    }

    static processInteractions(interactions) {
        this.interactions.clear();
        this.interactionsByUser.clear();
        
        interactions.forEach(interaction => {
            const signalId = interaction.signalId;
            const userId = interaction.userId;
            
            // Index by signal ID
            if (signalId) {
                if (!this.interactions.has(signalId)) {
                    this.interactions.set(signalId, []);
                }
                this.interactions.get(signalId).push(interaction);
            }
            
            // Index by user ID
            if (userId) {
                if (!this.interactionsByUser.has(userId)) {
                    this.interactionsByUser.set(userId, []);
                }
                this.interactionsByUser.get(userId).push(interaction);
            }
        });
    }

    static processActionPlans(actionPlans) {
        this.actionPlans.clear();
        this.actionPlansByAccount.clear();
        
        actionPlans.forEach(plan => {
            const planId = plan.id;
            const accountId = plan.accountId;
            
            // Index by plan ID
            if (planId) {
                this.actionPlans.set(planId, plan);
            }
            
            // Index by account ID
            if (accountId) {
                if (!this.actionPlansByAccount.has(accountId)) {
                    this.actionPlansByAccount.set(accountId, []);
                }
                this.actionPlansByAccount.get(accountId).push(plan);
            }
        });
    }

    /**
     * Fast lookup methods - no API calls needed!
     */
    
    static getSignalById(signalId) {
        return this.signalsById.get(signalId);
    }
    
    static getSignalsForAccount(accountId) {
        return this.signalsByAccount.get(accountId) || [];
    }
    
    static getCommentsForSignal(signalId) {
        return this.comments.get(signalId) || [];
    }
    
    static getCommentsForAccount(accountId) {
        return this.comments.get(accountId) || [];
    }
    
    static getInteractionsForSignal(signalId) {
        return this.interactions.get(signalId) || [];
    }
    
    static getInteractionsForUser(userId) {
        return this.interactionsByUser.get(userId) || [];
    }
    
    static getActionPlansForAccount(accountId) {
        return this.actionPlansByAccount.get(accountId) || [];
    }
    
    static getActionPlanById(planId) {
        return this.actionPlans.get(planId);
    }

    /**
     * Derived data methods
     */
    
    static getUserFeedbackForSignal(signalId, userId = null) {
        userId = userId || this.userInfo.userId;
        const interactions = this.getInteractionsForSignal(signalId);
        
        const userInteraction = interactions.find(i => 
            i.userId === userId && (i.interactionType === 'like' || i.interactionType === 'not-accurate')
        );
        
        return userInteraction ? userInteraction.interactionType : null;
    }
    
    static getViewedSignalsForUser(userId = null) {
        userId = userId || this.userInfo.userId;
        const userInteractions = this.getInteractionsForUser(userId);
        
        return new Set(
            userInteractions
                .filter(i => i.interactionType === 'viewed')
                .map(i => i.signalId)
        );
    }
    
    static getSignalCounts(signalId) {
        const interactions = this.getInteractionsForSignal(signalId);
        
        const likes = interactions.filter(i => i.interactionType === 'like').length;
        const notAccurate = interactions.filter(i => i.interactionType === 'not-accurate').length;
        
        return { likes, notAccurate };
    }

    /**
     * Cache update methods - keep cache in sync when data changes
     */
    
    static addComment(comment) {
        const key = comment.signalId || comment.accountId;
        if (key) {
            if (!this.comments.has(key)) {
                this.comments.set(key, []);
            }
            this.comments.get(key).push(comment);
        }
    }
    
    static updateComment(commentId, updates) {
        for (let [key, comments] of this.comments) {
            const commentIndex = comments.findIndex(c => c.id === commentId);
            if (commentIndex !== -1) {
                comments[commentIndex] = { ...comments[commentIndex], ...updates };
                return true;
            }
        }
        return false;
    }
    
    static removeComment(commentId) {
        for (let [key, comments] of this.comments) {
            const commentIndex = comments.findIndex(c => c.id === commentId);
            if (commentIndex !== -1) {
                comments.splice(commentIndex, 1);
                return true;
            }
        }
        return false;
    }
    
    static addInteraction(interaction) {
        const signalId = interaction.signalId;
        const userId = interaction.userId;
        
        if (signalId) {
            if (!this.interactions.has(signalId)) {
                this.interactions.set(signalId, []);
            }
            this.interactions.get(signalId).push(interaction);
        }
        
        if (userId) {
            if (!this.interactionsByUser.has(userId)) {
                this.interactionsByUser.set(userId, []);
            }
            this.interactionsByUser.get(userId).push(interaction);
        }
    }
    
    static addActionPlan(plan) {
        const planId = plan.id;
        const accountId = plan.accountId;
        
        if (planId) {
            this.actionPlans.set(planId, plan);
        }
        
        if (accountId) {
            if (!this.actionPlansByAccount.has(accountId)) {
                this.actionPlansByAccount.set(accountId, []);
            }
            this.actionPlansByAccount.get(accountId).push(plan);
        }
    }
    
    static updateActionPlan(planId, updates) {
        const plan = this.actionPlans.get(planId);
        if (plan) {
            const updatedPlan = { ...plan, ...updates };
            this.actionPlans.set(planId, updatedPlan);
            
            // Update in account index too
            const accountId = updatedPlan.accountId;
            if (accountId) {
                const accountPlans = this.actionPlansByAccount.get(accountId) || [];
                const planIndex = accountPlans.findIndex(p => p.id === planId);
                if (planIndex !== -1) {
                    accountPlans[planIndex] = updatedPlan;
                }
            }
            
            return updatedPlan;
        }
        return null;
    }
    
    static removeActionPlan(planId) {
        const plan = this.actionPlans.get(planId);
        if (plan) {
            this.actionPlans.delete(planId);
            
            // Remove from account index
            const accountId = plan.accountId;
            if (accountId) {
                const accountPlans = this.actionPlansByAccount.get(accountId) || [];
                const planIndex = accountPlans.findIndex(p => p.id === planId);
                if (planIndex !== -1) {
                    accountPlans.splice(planIndex, 1);
                }
            }
            
            return true;
        }
        return false;
    }
}