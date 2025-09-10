// DataCache - In-memory data management and fast filtering with optimistic CRUD
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

    // Event system for cache changes
    static eventListeners = new Map();
    
    // Rollback snapshots for failed API calls
    static rollbackSnapshots = new Map();

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
     * Event System - for immediate UI updates
     */
    
    static addEventListener(event, callback) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(callback);
    }
    
    static removeEventListener(event, callback) {
        const listeners = this.eventListeners.get(event);
        if (listeners) {
            const index = listeners.indexOf(callback);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
    }
    
    static emit(event, data) {
        const listeners = this.eventListeners.get(event) || [];
        listeners.forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error('Event listener error:', error);
            }
        });
    }

    /**
     * Rollback System - for failed API calls
     */
    
    static createSnapshot(operationId) {
        // ⚠️ DEEP CLONE for proper rollback - clone Maps AND their array/object contents
        const deepCloneMap = (originalMap) => {
            const clonedMap = new Map();
            for (let [key, value] of originalMap) {
                if (Array.isArray(value)) {
                    // Deep clone arrays and their objects
                    clonedMap.set(key, value.map(item => 
                        typeof item === 'object' && item !== null ? { ...item } : item
                    ));
                } else if (typeof value === 'object' && value !== null) {
                    // Deep clone objects
                    clonedMap.set(key, { ...value });
                } else {
                    // Primitives can be copied directly
                    clonedMap.set(key, value);
                }
            }
            return clonedMap;
        };

        this.rollbackSnapshots.set(operationId, {
            comments: deepCloneMap(this.comments),
            interactions: deepCloneMap(this.interactions),
            actionPlans: deepCloneMap(this.actionPlans),
            interactionsByUser: deepCloneMap(this.interactionsByUser),
            actionPlansByAccount: deepCloneMap(this.actionPlansByAccount)
        });
        
        console.log(`📸 Created deep snapshot for operation: ${operationId}`);
    }
    
    static rollback(operationId) {
        const snapshot = this.rollbackSnapshots.get(operationId);
        if (snapshot) {
            this.comments = snapshot.comments;
            this.interactions = snapshot.interactions;
            this.actionPlans = snapshot.actionPlans;
            this.interactionsByUser = snapshot.interactionsByUser;
            this.actionPlansByAccount = snapshot.actionPlansByAccount;
            
            this.rollbackSnapshots.delete(operationId);
            this.emit('cache:rollback', { operationId });
            return true;
        }
        return false;
    }
    
    static commitSnapshot(operationId) {
        this.rollbackSnapshots.delete(operationId);
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
            this.emit('comment:added', { comment, key });
        }
    }
    
    static updateComment(commentId, updates) {
        for (let [key, comments] of this.comments) {
            const commentIndex = comments.findIndex(c => c.id === commentId);
            if (commentIndex !== -1) {
                const oldComment = { ...comments[commentIndex] };
                comments[commentIndex] = { ...comments[commentIndex], ...updates };
                this.emit('comment:updated', { commentId, oldComment, newComment: comments[commentIndex], key });
                return true;
            }
        }
        return false;
    }
    
    static removeComment(commentId) {
        for (let [key, comments] of this.comments) {
            const commentIndex = comments.findIndex(c => c.id === commentId);
            if (commentIndex !== -1) {
                const removedComment = comments.splice(commentIndex, 1)[0];
                this.emit('comment:removed', { commentId, removedComment, key });
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
        
        this.emit('interaction:added', { interaction, signalId, userId });
    }

    static toggleUserFeedback(signalId, feedbackType, userId = null) {
        userId = userId || this.userInfo.userId || 'user-1';
        
        // Remove any existing feedback from this user for this signal
        this.removeUserFeedback(signalId, userId);
        
        // Add new feedback interaction
        const interaction = {
            id: `interaction_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            signalId: signalId,
            userId: userId,
            interactionType: feedbackType, // 'like' or 'not-accurate'
            timestamp: new Date().toISOString()
        };
        
        this.addInteraction(interaction);
        this.emit('feedback:toggled', { signalId, feedbackType, userId, interaction });
        
        return interaction;
    }
    
    static removeUserFeedback(signalId, userId = null) {
        userId = userId || this.userInfo.userId || 'user-1';
        
        // Remove from signal interactions
        const signalInteractions = this.interactions.get(signalId) || [];
        const toRemove = signalInteractions.filter(i => 
            i.userId === userId && (i.interactionType === 'like' || i.interactionType === 'not-accurate')
        );
        
        toRemove.forEach(interaction => {
            const index = signalInteractions.indexOf(interaction);
            if (index > -1) {
                signalInteractions.splice(index, 1);
            }
        });
        
        // Remove from user interactions
        const userInteractions = this.interactionsByUser.get(userId) || [];
        toRemove.forEach(interaction => {
            const index = userInteractions.indexOf(interaction);
            if (index > -1) {
                userInteractions.splice(index, 1);
            }
        });
        
        if (toRemove.length > 0) {
            this.emit('feedback:removed', { signalId, userId, removedInteractions: toRemove });
        }
        
        return toRemove.length > 0;
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
        
        this.emit('actionplan:added', { plan, planId, accountId });
    }
    
    static updateActionPlan(planId, updates) {
        const plan = this.actionPlans.get(planId);
        if (plan) {
            const oldPlan = { ...plan };
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
            
            this.emit('actionplan:updated', { planId, oldPlan, updatedPlan, accountId });
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
            
            this.emit('actionplan:removed', { planId, removedPlan: plan, accountId });
            return true;
        }
        return false;
    }
}