class DataService {
    // Store data as arrays of objects
    static signals = [];
    static accounts = [];
    static actionPlans = [];
    static comments = [];

    SIGNALS_DS_ID = "signals";
    // COMMENTS_COLLECTION_ID = "SignalAI.Comments";
    INTERACTIONS_COLLECTION_ID = "SignalAI.Interactions";
    ACTIONPLANS_COLLECTION_ID = "SignalAI.ActionPlans";

    static async loadSignals() {
        try {
            console.log('Calling domo.get() for signals data...');
            const response = await domo.get('/data/v1/signals'); // Replace with your actual signals dataset ID or endpoint

            if (response && response.length > 0) {
                console.log(`Successfully loaded ${response.length} records from Domo API`);

                // Parse the Domo response data into signals format
                this.signals = this.parseDomoResponse(response);
                console.log(`Processed ${this.signals.length} signals from Domo data`);

                return [...this.signals]; // Return copy of array
            } else {
                console.warn('No data returned from Domo API, falling back to master CSV data');
                this.signals = await MasterDataLoader.loadMasterCSV();
                return [...this.signals];
            }
        } catch (error) {
            console.error('Failed to load signals from Domo API:', error.message || error);
            console.warn('Attempting to call domo.get() but failed - falling back to master CSV data');

            // Fallback to master CSV data when API call fails
            this.signals = await MasterDataLoader.loadMasterCSV();
            console.log(`Successfully loaded ${this.signals.length} signals from master CSV fallback`);
            return [...this.signals]; // Return copy of array
        }
    }

    static async loadAccounts() {
        // Accounts are derived from the same signals data
        // Since loadSignals() already processes the data, we extract unique accounts
        if (this.signals && this.signals.length > 0) {
            this.accounts = this.extractAccountsFromSignals(this.signals);
            console.log(`Extracted ${this.accounts.length} unique accounts from signals data`);
            return [...this.accounts]; // Return copy of array
        } else {
            console.warn('No signals data available to extract accounts from');
            this.accounts = [];
            return [...this.accounts];
        }
    }

    static async updateSignal(signalId, updateData) {
        // Find and update signal in array
        const signalIndex = this.signals.findIndex(signal => signal.id === signalId);
        if (signalIndex !== -1) {
            this.signals[signalIndex] = { ...this.signals[signalIndex], ...updateData };
            return { success: true, signal: this.signals[signalIndex] };
        }
        return { success: false, error: 'Signal not found' };
    }

    static async deleteSignal(signalId) {
        // Remove signal from array
        const signalIndex = this.signals.findIndex(signal => signal.id === signalId);
        if (signalIndex !== -1) {
            const deletedSignal = this.signals.splice(signalIndex, 1)[0];
            return { success: true, deletedSignal };
        }
        return { success: false, error: 'Signal not found' };
    }

    static async addSignal(signalData) {
        // Add new signal to array
        const newSignal = {
            id: `signal-${Date.now()}`,
            created_date: new Date().toISOString().split('T')[0],
            source_icon: this.getSourceIcon(signalData.category),
            ...signalData
        };
        this.signals.push(newSignal);
        return { success: true, signal: newSignal };
    }

    // Comprehensive Action Plan CRUD operations with action_id support
    static async createActionPlan(planData) {
        // Get current user info with comprehensive error handling
        let userName = 'Current User';
        let userId = 'user-1';

        try {
            const user = await domo.get(`/domo/environment/v1/`);
            console.log("User Info:", user);
            
            // Safely extract user properties with fallbacks
            if (user && typeof user === 'object') {
                userId = user.userId || user.id || userId;
                userName = user.userName || user.name || user.displayName || userName;
            }
        } catch (error) {
            console.warn('Could not get user info from Domo API, using defaults:', error.message || error);
        }

        // Handle new single-action-per-plan data model
        const newPlan = {
            id: planData.id || `plan-${Date.now()}`,
            createdAt: planData.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            status: planData.status || 'pending',
            assignee: planData.assignee || null,
            createdBy: planData.createdBy || userName,
            createdByUserId: planData.createdByUserId || userId,
            planTitle: planData.planTitle || `Action Plan - ${new Date().toLocaleDateString()}`,
            accountId: planData.accountId,
            signalId: planData.signalId,
            actionId: planData.actionId,
            title: planData.title,
            description: planData.description || '',
            plays: planData.plays || [],
            priority: planData.priority || 'medium',
            dueDate: planData.dueDate || null,
            createdDate: planData.createdDate || new Date().toISOString(),
            actionItems: planData.actionItems || [] // Usually empty for new single-action model
        };

        try {
            console.log('Creating action plan via Domo AppDB:', newPlan);
            
            // For AppDB, wrap in content structure
            const appDbPlan = {
                content: newPlan
            };
            
            const response = await domo.post(`/domo/datastores/v1/collections/SignalAI.ActionPlans/documents`, appDbPlan);

            // Add to local array for immediate access
            this.actionPlans.push(newPlan);
            console.log('Created action plan via Domo AppDB:', newPlan);
            return { success: true, plan: newPlan };
        } catch (error) {
            console.error('Failed to create action plan in Domo AppDB:', error.message || error);

            // Add to local array as fallback (same as comments pattern)
            this.actionPlans.push(newPlan);
            console.log('Action plan saved locally as fallback:', newPlan.id);
            return { success: true, plan: newPlan };
        }
    }

    static async updateActionPlan(planId, updateData) {
        // Get current user info with comprehensive error handling
        let userName = 'Current User';
        let userId = 'user-1';

        try {
            const user = await domo.get(`/domo/environment/v1/`);
            console.log("User Info:", user);
            
            // Safely extract user properties with fallbacks
            if (user && typeof user === 'object') {
                userId = user.userId || user.id || userId;
                userName = user.userName || user.name || user.displayName || userName;
            }
        } catch (error) {
            console.warn('Could not get user info from Domo API, using defaults:', error.message || error);
        }

        // Find the plan to update
        const planIndex = this.actionPlans.findIndex(plan => plan.id === planId);
        if (planIndex === -1) {
            return { success: false, error: 'Action plan not found' };
        }

        // Ensure actionItems maintain proper structure with action_ids
        if (updateData.actionItems) {
            updateData.actionItems = updateData.actionItems.map(item => {
                if (typeof item === 'string') {
                    return { title: item, actionId: null, completed: false, plays: [] };
                }
                return {
                    title: item.title || item,
                    actionId: item.actionId || null,
                    completed: item.completed || false,
                    plays: item.plays || []
                };
            });
        }

        const updatedPlan = {
            ...this.actionPlans[planIndex],
            ...updateData,
            updatedAt: new Date(),
            lastUpdatedBy: userName,
            lastUpdatedByUserId: userId
        };

        try {
            console.log('Updating action plan via Domo AppDB:', updatedPlan);
            
            // For AppDB, wrap in content structure
            const appDbPlan = {
                content: updatedPlan
            };
            
            const response = await domo.put(`/domo/datastores/v1/collections/SignalAI.ActionPlans/documents/${planId}`, appDbPlan);

            // Update local array
            this.actionPlans[planIndex] = updatedPlan;
            console.log('Updated action plan via Domo AppDB:', updatedPlan);
            return { success: true, plan: updatedPlan };
        } catch (error) {
            console.warn('Domo AppDB unavailable, saving action plan locally:', planId);

            // Update local array as fallback (same as comments pattern)
            this.actionPlans[planIndex] = updatedPlan;
            console.log('✅ Action plan updated successfully (local storage):', planId);
            return { success: true, plan: updatedPlan, warning: 'Changes saved locally (Domo API unavailable)' };
        }
    }

    static async deleteActionPlan(planId) {
        // Get current user info
        let user;
        let userName = 'Current User';
        let userId = 'user-1';

        try {
            user = await domo.get(`/domo/environment/v1/`);
            console.log("User Info:", user);
            
            // Safely extract user properties with fallbacks
            if (user && typeof user === 'object') {
                userId = user.userId || user.id || userId;
                userName = user.userName || user.name || user.displayName || userName;
            }
        } catch (error) {
            console.warn('Could not get user info from Domo API, using defaults:', error.message || error);
        }

        const planIndex = this.actionPlans.findIndex(plan => plan.id === planId);
        if (planIndex === -1) {
            return { success: false, error: 'Action plan not found' };
        }

        try {
            console.log('Deleting action plan via Domo AppDB:', planId, 'by user:', userName);
            const response = await domo.delete(`/domo/datastores/v1/collections/SignalAI.ActionPlans/documents/${planId}`);

            // Remove from local array
            this.actionPlans.splice(planIndex, 1);
            console.log('Deleted action plan via Domo AppDB:', planId);
            return { success: true, deletedBy: userName, deletedByUserId: userId };
        } catch (error) {
            console.error('Failed to delete action plan in Domo AppDB:', error);

            // Remove from local array as fallback (same as comments pattern)
            this.actionPlans.splice(planIndex, 1);
            console.log('Action plan deleted locally as fallback:', planId);
            return { success: true, deletedBy: userName, deletedByUserId: userId };
        }
    }

    static async getActionPlans() {
        try {
            console.log('Fetching action plans from Domo AppDB...');
            const response = await domo.get(`/domo/datastores/v1/collections/SignalAI.ActionPlans/documents`);
            
            // Log the raw domo.get response object for debugging
            console.log('Raw domo.get response object:', response);

            if (response && Array.isArray(response)) {
                // Handle both direct plan structure and content wrapper structure
                const plans = response.map(doc => {
                    const planData = doc.content || doc;
                    // Ensure proper structure
                    return {
                        ...planData,
                        actionItems: planData.actionItems ? planData.actionItems.map(item => {
                            if (typeof item === 'string') {
                                return { title: item, actionId: null, completed: false, plays: [] };
                            }
                            return {
                                title: item.title || item,
                                actionId: item.actionId || null,
                                completed: item.completed || false,
                                plays: item.plays || []
                            };
                        }) : []
                    };
                });

                // Group plans by accountId for easier access
                const plansByAccount = new Map();
                plans.forEach(plan => {
                    if (plan.accountId) {
                        if (!plansByAccount.has(plan.accountId)) {
                            plansByAccount.set(plan.accountId, []);
                        }
                        plansByAccount.get(plan.accountId).push(plan);
                    }
                });

                this.actionPlans = plans;
                this.actionPlansByAccount = plansByAccount;
                console.log('Retrieved action plans from Domo AppDB:', plans.length, 'plans');
                return { success: true, plans: plans, plansByAccount: plansByAccount };
            }

            console.log('No action plans found in Domo AppDB');
            return { success: true, plans: [] };
        } catch (error) {
            console.error('Failed to get action plans from Domo AppDB:', error);

            // Return empty plans instead of mock data
            return { success: true, plans: [] };
        }
    }

    static async getActionPlanById(planId) {
        try {
            console.log('Fetching action plan by ID from Domo AppDB:', planId);
            const response = await domo.get(`/domo/datastores/v1/collections/SignalAI.ActionPlans/documents/${planId}`);

            if (response) {
                const planData = response.content || response;
                // Ensure proper structure
                const plan = {
                    ...planData,
                    actionItems: planData.actionItems ? planData.actionItems.map(item => {
                        if (typeof item === 'string') {
                            return { title: item, actionId: null, completed: false, plays: [] };
                        }
                        return {
                            title: item.title || item,
                            actionId: item.actionId || null,
                            completed: item.completed || false,
                            plays: item.plays || []
                        };
                    }) : []
                };

                console.log('Retrieved action plan from Domo AppDB:', plan);
                return { success: true, plan: plan };
            }

            return { success: false, error: 'Action plan not found' };
        } catch (error) {
            console.error('Failed to get action plan from Domo AppDB:', error);
            return { success: false, error: 'Failed to retrieve action plan' };
        }
    }

    static async getActionPlansByAccount(accountId) {
        try {
            console.log('Fetching action plans by account from Domo AppDB:', accountId);
            // Get all action plans and filter client-side for now since AppDB filtering may not work as expected
            const response = await domo.get(`/domo/datastores/v1/collections/SignalAI.ActionPlans/documents`);

            if (response && Array.isArray(response)) {
                // Filter plans by accountId on the client side
                const accountPlans = response.filter(doc => {
                    const planData = doc.content || doc;
                    return planData.accountId === accountId;
                }).map(doc => {
                    const planData = doc.content || doc;
                    // Ensure proper structure
                    return {
                        ...planData,
                        actionItems: planData.actionItems ? planData.actionItems.map(item => {
                            if (typeof item === 'string') {
                                return { title: item, actionId: null, completed: false, plays: [] };
                            }
                            return {
                                title: item.title || item,
                                actionId: item.actionId || null,
                                completed: item.completed || false,
                                plays: item.plays || []
                            };
                        }) : []
                    };
                });

                console.log('Filtered action plans for account', accountId, ':', accountPlans.length, 'plans');
                return { success: true, plans: accountPlans };
            }

            return { success: true, plans: [] };
        } catch (error) {
            console.error('Failed to get action plans by account from Domo AppDB:', error);
            return { success: true, plans: [] };
        }
    }

    static async getActionPlansBySignal(signalId) {
        try {
            console.log('Fetching action plans by signal from Domo AppDB:', signalId);
            // Get all action plans and filter client-side for now since AppDB filtering may not work as expected
            const response = await domo.get(`/domo/datastores/v1/collections/SignalAI.ActionPlans/documents`);

            if (response && Array.isArray(response)) {
                // Filter plans by signalId on the client side
                const signalPlans = response.filter(doc => {
                    const planData = doc.content || doc;
                    return planData.signalId === signalId;
                }).map(doc => {
                    const planData = doc.content || doc;
                    // Ensure proper structure
                    return {
                        ...planData,
                        actionItems: planData.actionItems ? planData.actionItems.map(item => {
                            if (typeof item === 'string') {
                                return { title: item, actionId: null, completed: false, plays: [] };
                            }
                            return {
                                title: item.title || item,
                                actionId: item.actionId || null,
                                completed: item.completed || false,
                                plays: item.plays || []
                            };
                        }) : []
                    };
                });

                console.log('Filtered action plans for signal', signalId, ':', signalPlans.length, 'plans');
                return { success: true, plans: signalPlans };
            }

            return { success: true, plans: [] };
        } catch (error) {
            console.error('Failed to get action plans by signal from Domo AppDB:', error);
            return { success: true, plans: [] };
        }
    }

    static async markActionItemComplete(planId, actionItemIndex, completed = true) {
        // Get current user info
        let user;
        let userName = 'Current User';
        let userId = 'user-1';

        try {
            user = await domo.get(`/domo/environment/v1/`);
            console.log("User Info:", user);
            
            // Safely extract user properties with fallbacks
            if (user && typeof user === 'object') {
                userId = user.userId || user.id || userId;
                userName = user.userName || user.name || user.displayName || userName;
            }
        } catch (error) {
            console.warn('Could not get user info from Domo API, using defaults:', error.message || error);
        }

        const planIndex = this.actionPlans.findIndex(plan => plan.id === planId);
        if (planIndex === -1 || !this.actionPlans[planIndex].actionItems || actionItemIndex < 0 || actionItemIndex >= this.actionPlans[planIndex].actionItems.length) {
            console.error('Action plan or action item not found for marking complete:', { planId, actionItemIndex });
            return { success: false, error: 'Action plan or action item not found' };
        }

        // Create a new object for the updated plan to avoid direct mutation issues
        const updatedPlan = {
            ...this.actionPlans[planIndex],
            updatedAt: new Date(),
            lastUpdatedBy: userName,
            lastUpdatedByUserId: userId,
            actionItems: this.actionPlans[planIndex].actionItems.map((item, index) =>
                index === actionItemIndex ? { 
                    ...item, 
                    completed: completed,
                    completedBy: completed ? userName : null,
                    completedByUserId: completed ? userId : null,
                    completedAt: completed ? new Date() : null
                } : item
            )
        };

        try {
            console.log(`Marking action item ${actionItemIndex} complete in Domo AppDB for plan ${planId}`);
            
            // For AppDB, wrap in content structure
            const appDbPlan = {
                content: updatedPlan
            };
            
            const response = await domo.put(`/domo/datastores/v1/collections/SignalAI.ActionPlans/documents/${planId}`, appDbPlan);

            // Update local array
            this.actionPlans[planIndex] = updatedPlan;
            console.log('Marked action item complete via Domo AppDB:', { planId, actionItemIndex, completed });
            return { success: true, plan: updatedPlan };
        } catch (error) {
            console.error('Failed to update action item completion in Domo AppDB:', error);

            // Update local array as fallback
            this.actionPlans[planIndex] = updatedPlan;
            return { success: true, plan: updatedPlan, error: 'Failed to save to database, updated locally' };
        }
    }

    // ========== SIGNAL FEEDBACK CRUD ==========

    static async saveSignalFeedback(signalId, feedbackType) {
        // TODO: Replace with actual API call
        // const response = await fetch(`/api/signals/${signalId}/feedback`, {
        //     method: 'PUT',
        //     headers: { 'Content-Type': 'application/json' },
        //     body: JSON.stringify({ feedbackType, timestamp: new Date() })
        // });

        console.log(`Saving feedback: ${feedbackType} for signal ${signalId}`);
        return { success: true, feedbackType, timestamp: new Date() };
    }

    static async unsaveSignalFeedback(signalId) {
        // TODO: Replace with actual API call
        // const response = await fetch(`/api/signals/${signalId}/feedback`, {
        //     method: 'DELETE'
        // });

        console.log(`Removing feedback for signal ${signalId}`);
        return { success: true };
    }

    static async getSignalFeedback(signalId) {
        // TODO: Replace with actual API call
        // const response = await fetch(`/api/signals/${signalId}/feedback`);
        // return await response.json();

        return { success: true, feedback: null };
    }

    // ========== COMMENTS CRUD ==========

    static async createComment(signalId, commentText) {
        // Call the "me" endpoint
        let user;
        let userName = 'Current User';
        let userId = 'user-1';

        try {
            user = await domo.get(`/domo/environment/v1/`);
            console.log("User Info:", user);
            
            // Safely extract user properties with fallbacks
            if (user && typeof user === 'object') {
                userId = user.userId || user.id || userId;
                userName = user.userName || user.name || user.displayName || userName;
            }
        } catch (error) {
            console.warn('Could not get user info from Domo API, using defaults:', error.message || error);
        }

        const newComment = {
            id: `comment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            signalId: signalId,
            author: userName,
            authorId: userId,
            text: commentText,
            timestamp: new Date(),
            createdAt: new Date(),
            updatedAt: new Date()
        };

        console.log("New Comment:", newComment);

        try {
            // For AppDB, wrap in content structure
            const appDbComment = {
                content: newComment
            };

            await domo.post(`/domo/datastores/v1/collections/SignalAI.Comments/documents`, appDbComment);
            console.log('Saved comment to SignalAI.Comments AppDB:', appDbComment);

            // Store flat structure locally
            this.comments.push(newComment);

            return { success: true, comment: newComment };
        } catch (error) {
            console.error('Failed to save comment to SignalAI.Comments AppDB:', error);
            // Add to local array as fallback
            this.comments.push(newComment);
            return { success: true, comment: newComment };
        }
    }

    static async updateComment(commentId, commentText) {
        try {
            console.log(`Updating comment ${commentId} in AppDB`);

            // Get all documents to find the one to update
            const response = await domo.get(`/domo/datastores/v1/collections/SignalAI.Comments/documents`);
            const documents = response || [];

            // Find the document containing our comment
            const docToUpdate = documents.find(doc => doc.content && doc.content.id === commentId);

            if (!docToUpdate) {
                throw new Error('Comment not found');
            }

            // Update the comment content
            const updatedComment = {
                ...docToUpdate.content,
                text: commentText,
                edited: true,
                editTimestamp: new Date(),
                updatedAt: new Date()
            };

            // Update the document
            const updatedDoc = {
                content: updatedComment
            };

            await domo.put(`/domo/datastores/v1/collections/SignalAI.Comments/documents/${docToUpdate.id}`, updatedDoc);
            console.log('Updated comment in AppDB:', updatedDoc);

            // Update local state
            const commentIndex = this.comments.findIndex(comment => comment.id === commentId);
            if (commentIndex !== -1) {
                this.comments[commentIndex] = updatedComment;
            }

            console.log(`Successfully updated comment ${commentId} in AppDB`);
            return { success: true, comment: updatedComment };
        } catch (error) {
            console.error(`Error updating comment in AppDB: ${error.message}`);

            // Fallback to local update
            const commentIndex = this.comments.findIndex(comment => comment.id === commentId);
            if (commentIndex !== -1) {
                const updatedComment = {
                    ...this.comments[commentIndex],
                    text: commentText,
                    edited: true,
                    editTimestamp: new Date(),
                    updatedAt: new Date()
                };
                this.comments[commentIndex] = updatedComment;
                return { success: true, comment: updatedComment };
            }

            return { success: false, error: 'Comment not found' };
        }
    }

    static async deleteComment(commentId) {
        // Get current user info
        let user;
        let userName = 'Current User';
        let userId = 'user-1';

        try {
            user = await domo.get(`/domo/environment/v1/`);
            console.log("User Info:", user);
            
            // Safely extract user properties with fallbacks
            if (user && typeof user === 'object') {
                userId = user.userId || user.id || userId;
                userName = user.userName || user.name || user.displayName || userName;
            }
        } catch (error) {
            console.warn('Could not get user info from Domo API, using defaults:', error.message || error);
        }

        const commentIndex = this.comments.findIndex(comment => comment.id === commentId);
        if (commentIndex !== -1) {
            const deletedComment = this.comments[commentIndex];

            try {
                // Delete from Domo AppDB
                console.log('Deleting comment via Domo AppDB:', commentId, 'by user:', userName);
                await domo.delete(`/domo/datastores/v1/collections/SignalAI.Comments/documents/${commentId}`);
                this.comments.splice(commentIndex, 1);
                console.log('Deleted comment via Domo AppDB:', deletedComment);
                return { success: true, deletedComment, deletedBy: userName, deletedByUserId: userId };
            } catch (error) {
                console.error('Failed to delete comment from Domo AppDB:', error);

                // Save to backup file
                try {
                    await BackupService.saveFailedComment(deletedComment, 'DELETE', error);
                    console.log('Saved failed comment deletion to backup file');
                } catch (backupError) {
                    console.error('Failed to save comment deletion backup:', backupError);
                }

                // Fallback to local deletion
                this.comments.splice(commentIndex, 1);
                return { success: true, deletedComment, deletedBy: userName, deletedByUserId: userId };
            }
        }
        return { success: false, error: 'Comment not found' };
    }

    static async getCommentsBySignal(signalId) {
        try {
            const response = await domo.get(`/domo/datastores/v1/collections/SignalAI.Comments/documents?filter=signalId:${signalId}`);
            console.log('Retrieved comments from Domo AppDB for signal:', signalId);
            return { success: true, comments: response };
        } catch (error) {
            console.error('Failed to get comments from Domo AppDB:', error);
            // Fallback to local storage
            const signalComments = this.comments.filter(comment => comment.signalId === signalId);
            return { success: true, comments: signalComments };
        }
    }

    static async getComments() {
        try {
            // Load all comments from AppDB
            const response = await domo.get(`/domo/datastores/v1/collections/SignalAI.Comments/documents`);
            console.log('Retrieved all comments from SignalAI.Comments AppDB:', response);

            // Clear local comments array and repopulate with AppDB data
            this.comments = response || [];

            // Return all comments organized by signalId
            const commentsBySignal = new Map();

            this.comments.forEach(comment => {
                const signalId = comment.content?.signalId || comment.signalId;
                if (signalId) {
                    if (!commentsBySignal.has(signalId)) {
                        commentsBySignal.set(signalId, []);
                    }
                    // Flatten the comment structure if needed
                    const flatComment = comment.content || comment;
                    commentsBySignal.get(signalId).push(flatComment);
                    console.log(`Added comment for signal ${signalId}:`, flatComment.text?.substring(0, 50) + '...');
                }
            });

            console.log(`Loaded ${this.comments.length} comments from AppDB, organized into ${commentsBySignal.size} signal groups`);
            console.log('Comment groups by signal:', Array.from(commentsBySignal.keys()));
            return commentsBySignal;

        } catch (error) {
            console.error('Failed to load comments from SignalAI.Comments AppDB:', error);

            // Fallback to local mock data
            const commentsBySignal = new Map();

            // Initialize with some mock comments for demonstration
            if (this.comments.length === 0) {
                this.initializeMockComments();
            }

            this.comments.forEach(comment => {
                if (!commentsBySignal.has(comment.signalId)) {
                    commentsBySignal.set(comment.signalId, []);
                }
                commentsBySignal.get(comment.signalId).push(comment);
            });

            return commentsBySignal;
        }
    }

    static async loadInteractions() {
        try {
            // Load all interactions from AppDB
            const response = await domo.get(`/domo/datastores/v1/collections/SignalAI.Interactions/documents`);
            console.log('Retrieved all interactions from SignalAI.Interactions AppDB:', response);

            // Get current user info for user-specific feedback
            let currentUserId = 'user-1';
            try {
                const user = await domo.get(`/domo/environment/v1/`);
                currentUserId = user.userId;
            } catch (error) {
                console.warn('Could not get current user info, using default:', error);
            }

            // Process interactions to track counts and user-specific state
            const signalInteractions = new Map(); // signalId -> { likes: Set, notAccurate: Set, currentUserFeedback: string }

            response.forEach(interaction => {
                const interactionData = interaction.content || interaction;
                const signalId = interactionData.signalId;
                const interactionType = interactionData.interactionType;
                const userId = interactionData.userId || 'unknown';

                if (signalId && interactionType && interactionType !== 'signal_removed') {
                    if (!signalInteractions.has(signalId)) {
                        signalInteractions.set(signalId, {
                            likes: new Set(),
                            notAccurate: new Set(),
                            currentUserFeedback: null
                        });
                    }

                    const signalData = signalInteractions.get(signalId);

                    if (interactionType === 'like') {
                        signalData.likes.add(userId);
                        signalData.notAccurate.delete(userId); // Remove from opposite if exists
                        if (userId === currentUserId) {
                            signalData.currentUserFeedback = 'like';
                        }
                    } else if (interactionType === 'not-accurate') {
                        signalData.notAccurate.add(userId);
                        signalData.likes.delete(userId); // Remove from opposite if exists
                        if (userId === currentUserId) {
                            signalData.currentUserFeedback = 'not-accurate';
                        }
                    } else if (interactionType === 'removed_like') {
                        signalData.likes.delete(userId);
                        if (userId === currentUserId) {
                            signalData.currentUserFeedback = null;
                        }
                    } else if (interactionType === 'removed_not-accurate') {
                        signalData.notAccurate.delete(userId);
                        if (userId === currentUserId) {
                            signalData.currentUserFeedback = null;
                        }
                    }
                }
            });

            // Apply interaction data to signals
            this.signals.forEach(signal => {
                const interactions = signalInteractions.get(signal.id);
                if (interactions) {
                    signal.likeCount = interactions.likes.size;
                    signal.notAccurateCount = interactions.notAccurate.size;
                    signal.currentUserFeedback = interactions.currentUserFeedback;
                    console.log(`Updated signal ${signal.id}: ${signal.likeCount} likes, ${signal.notAccurateCount} not accurate, user feedback: ${signal.currentUserFeedback}`);
                } else {
                    signal.likeCount = 0;
                    signal.notAccurateCount = 0;
                    signal.currentUserFeedback = null;
                }
            });

            console.log(`Processed interactions for ${signalInteractions.size} signals`);
            return signalInteractions;

        } catch (error) {
            console.error('Failed to load interactions from SignalAI.Interactions AppDB:', error);
            // Initialize signals with zero counts
            this.signals.forEach(signal => {
                signal.likeCount = 0;
                signal.notAccurateCount = 0;
                signal.currentUserFeedback = null;
            });
            return new Map();
        }
    }

    static async loadViewedSignals() {
        try {
            // Get current user info
            let currentUserId = 'user-1';
            try {
                const user = await domo.get(`/domo/environment/v1/`);
                currentUserId = user.userId;
            } catch (error) {
                console.warn('Could not get current user info, using default:', error);
            }

            // Load all interactions from AppDB
            const response = await domo.get(`/domo/datastores/v1/collections/SignalAI.Interactions/documents`);
            console.log('Retrieved interactions for viewed signals processing:', response.length);

            const viewedSignalIds = new Set();

            // Process interactions to find viewed signals for current user
            response.forEach(interaction => {
                const interactionData = interaction.content || interaction;
                const signalId = interactionData.signalId;
                const interactionType = interactionData.interactionType;
                const userId = interactionData.userId || 'unknown';

                if (signalId && interactionType === 'signal_viewed' && userId === currentUserId) {
                    viewedSignalIds.add(signalId);
                }
            });

            console.log(`Loaded ${viewedSignalIds.size} viewed signals for user ${currentUserId}`);
            return viewedSignalIds;

        } catch (error) {
            console.error('Failed to load viewed signals from SignalAI.Interactions AppDB:', error);
            return new Set();
        }
    }

    static initializeMockComments() {
        // Add some mock comments for demonstration
        const mockComments = [
            {
                id: 'comment-1',
                signalId: 'signal-1',
                text: 'This signal requires immediate attention from our technical team.',
                author: 'Sarah Chen',
                timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
            },
            {
                id: 'comment-2',
                signalId: 'signal-1',
                text: 'I\'ve scheduled a call with the customer for tomorrow.',
                author: 'Mike Rodriguez',
                timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000) // 1 hour ago
            }
        ];

        this.comments.push(...mockComments);
    }

    static async addComment(signalId, commentText) {
        // Alias for createComment to maintain backward compatibility
        return this.createComment(signalId, commentText);
    }

    // Account comment operations
    static async createAccountComment(accountId, commentText) {
        console.log('Creating account comment for:', accountId, commentText);

        // Call the "me" endpoint to get user info
        let user;
        let userName = 'Current User';
        let userId = 'user-1';

        try {
            user = await domo.get(`/domo/environment/v1/`);
            console.log("User Info:", user);
            
            // Safely extract user properties with fallbacks
            if (user && typeof user === 'object') {
                userId = user.userId || user.id || userId;
                userName = user.userName || user.name || user.displayName || userName;
            }
        } catch (error) {
            console.warn('Could not get user info from Domo API, using defaults:', error.message || error);
        }

        const newComment = {
            id: 'comment_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            accountId: accountId,
            text: commentText,
            author: userName,
            authorId: userId,
            timestamp: new Date(),
            createdAt: new Date(),
            updatedAt: new Date()
        };

        try {
            // For AppDB, wrap in content structure like signal comments
            const appDbComment = {
                content: newComment
            };

            const response = await domo.post(`/domo/datastores/v1/collections/SignalAI.Comments/documents`, appDbComment);
            console.log('Created account comment via Domo AppDB:', appDbComment);
            return { success: true, comment: newComment };
        } catch (error) {
            console.error('Failed to create account comment in Domo AppDB:', error);
            return { success: true, comment: newComment };
        }
    }

    static async updateAccountComment(commentId, newText) {
        try {
            console.log(`Updating account comment ${commentId} in AppDB`);

            // Get all documents to find the one to update
            const response = await domo.get(`/domo/datastores/v1/collections/SignalAI.Comments/documents`);
            const documents = response || [];

            // Find the document containing our comment
            const docToUpdate = documents.find(doc => {
                const comment = doc.content || doc;
                return comment.id === commentId;
            });

            if (!docToUpdate) {
                throw new Error('Account comment not found');
            }

            // Update the comment content
            const updatedComment = {
                ...docToUpdate.content,
                text: newText,
                edited: true,
                editTimestamp: new Date(),
                updatedAt: new Date()
            };

            // Update the document
            const updatedDoc = {
                content: updatedComment
            };

            await domo.put(`/domo/datastores/v1/collections/SignalAI.Comments/documents/${docToUpdate.id}`, updatedDoc);
            console.log('Updated account comment in AppDB:', updatedDoc);

            console.log(`Successfully updated account comment ${commentId} in AppDB`);
            return { success: true, comment: updatedComment };
        } catch (error) {
            console.error(`Error updating account comment in AppDB: ${error.message}`);
            return { success: false, error: 'Account comment not found' };
        }
    }

    static async deleteAccountComment(commentId) {
        // Get current user info
        let user;
        let userName = 'Current User';
        let userId = 'user-1';

        try {
            user = await domo.get(`/domo/environment/v1/`);
            console.log("User Info:", user);
            
            // Safely extract user properties with fallbacks
            if (user && typeof user === 'object') {
                userId = user.userId || user.id || userId;
                userName = user.userName || user.name || user.displayName || userName;
            }
        } catch (error) {
            console.warn('Could not get user info from Domo API, using defaults:', error.message || error);
        }

        console.log('Deleting account comment:', commentId, 'by user:', userName);

        try {
            await domo.delete(`/domo/datastores/v1/collections/SignalAI.Comments/documents/${commentId}`);
            console.log('Deleted account comment via Domo AppDB:', commentId);
            return { success: true, deletedBy: userName, deletedByUserId: userId };
        } catch (error) {
            console.error('Failed to delete account comment from Domo AppDB:', error);
            return { success: true, deletedBy: userName, deletedByUserId: userId };
        }
    }

    static async getAccountComments(accountId) {
        console.log('Getting account comments for:', accountId);

        try {
            // Get all comments and filter client-side for now since AppDB filtering may not work as expected
            const response = await domo.get(`/domo/datastores/v1/collections/SignalAI.Comments/documents`);
            console.log('Retrieved all comments from Domo AppDB:', response?.length || 0, 'total comments');

            // Filter comments by accountId on the client side
            const accountComments = (response || []).filter(doc => {
                const comment = doc.content || doc;
                return comment.accountId === accountId;
            });

            console.log('Filtered account comments for', accountId, ':', accountComments.length, 'comments');
            return { success: true, comments: accountComments };
        } catch (error) {
            console.error('Failed to get account comments from Domo AppDB:', error);

            // Return empty comments instead of mock data
            return { success: true, comments: [] };
        }
    }

    // DO NOT GENERATE FAKE ACTION PLANS - only use real data from CSV
    static generateMockActionPlans(accountsMap) {
        console.log('Mock action plan generation disabled - only real CSV data will be used');
        this.actionPlans = [];
        return [];
    }

    // REMOVED - Do not generate fake action items

    static updateSignalFeedback(signalId, feedbackType) {
        // TODO: Replace with actual API call
        console.log('Updating signal feedback:', signalId, feedbackType);

        // Update in local array
        const signalIndex = this.signals.findIndex(signal => signal.id === signalId);
        if (signalIndex !== -1) {
            this.signals[signalIndex].feedbackType = feedbackType;
        }

        return { success: true };
    }

    static async addComment(signalId, commentText) {
        // TODO: Replace with actual API call
        console.log('Adding comment:', signalId, commentText);

        const newComment = {
            id: `comment-${Date.now()}`,
            signalId: signalId,
            author: 'Current User',
            timestamp: new Date(),
            text: commentText
        };

        // Add to comments array
        this.comments.push(newComment);

        return newComment;
    }

    static getCommentsBySignalId(signalId) {
        return this.comments.filter(comment => comment.signalId === signalId);
    }


    static getSignalById(signalId) {
        return this.signals.find(signal => signal.id === signalId);
    }

    static getSignalsByAccountId(accountId) {
        return this.signals.filter(signal => signal.account_id === accountId);
    }

    static getActionPlansByAccountId(accountId) {
        return this.actionPlans.filter(plan => plan.accountId === accountId);
    }

    static parseDomoResponse(domoData) {
        console.log('Parsing Domo response data...');

        // Use a Map to track unique signals by ID to prevent duplicates
        const signalMap = new Map();

        domoData.forEach((row, index) => {
            const signalId = row['Signal Id'] || row['signal_id'] || row['SIGNAL ID'] || `signal-${index + 1}`;

            // Skip if we already have this signal ID
            if (signalMap.has(signalId)) {
                console.warn(`Duplicate signal ID detected: ${signalId}, skipping duplicate`);
                return;
            }

            // Filter out obviously corrupted account IDs (invalid Salesforce format)
            const accountId = row['account_id'] || row['Account Id'] || row['ACCOUNT_ID'] || '';
            
            // Basic validation: Salesforce IDs are 15-18 chars, start with numbers/letters, no spaces
            const isSalesforceFormat = /^[a-zA-Z0-9]{15,18}$/.test(accountId);
            const isObviouslyInvalid = accountId.length > 100 || 
                                     accountId.includes('Teaching') || 
                                     accountId.includes('assistance') || 
                                     accountId.includes('Consulting') ||
                                     accountId.includes('Billed') ||
                                     accountId.includes(' ');
            
            if (!accountId || !isSalesforceFormat || isObviouslyInvalid) {
                console.warn(`Invalid account ID format detected: "${accountId}", skipping row ${index + 1}`);
                return;
            }

            // Handle multiple possible column name variations from Domo and CSV
            const signalName = row['name'] || row['Name'] || row['NAME'] || 'Unknown Signal';
            const summary = row['summary'] || row['Summary'] || row['SUMMARY'] || 'No summary available';
            const rationale = row['rationale'] || row['Rationale'] || row['RATIONALE'] || 'No rationale provided';
            const confidence = parseFloat(row['confidence'] || row['Confidence'] || row['CONFIDENCE'] || '0.7') || 0.7;
            const priority = row['priority'] || row['Priority'] || row['PRIORITY'] || 'Medium';
            const category = row['category'] || row['Category'] || row['CATEGORY'] || 'General';

            // Clean and validate account name
            let accountName = row['account_name'] || row['Account Name'] || row['ACCOUNT_NAME'] || 'Unknown Account';

            // Check if account name looks like action context, play description, or other invalid content
            const invalidKeywords = ['build', 'develop', 'implement', 'provide', 'schedule', 'create', 'review', 'analyze', 'teaching', 'assistance', 'consulting', 'offering', 'enablement', 'billed', 'non-billed', 'hours-based'];
            const looksLikeInvalidData = invalidKeywords.some(keyword =>
                accountName.toLowerCase().includes(keyword)
            ) || accountName.length > 100 || accountName.toLowerCase().includes('domo');

            if (looksLikeInvalidData) {
                // Use a lookup table for known account IDs and their correct names from CSV analysis
                const accountIdMap = {
                    '0013000000DXZ1fAAH': 'Falvey Insurance Group Ltd',
                    '00138000016Nd5jAAC': 'Brigham Young University-Hawaii',
                    '00138000017icJoAAI': 'Eye Five Inc.'
                };
                
                const accountId = row['account_id'] || row['Account Id'] || '';
                accountName = accountIdMap[accountId] || `Account ${accountId.substring(0, 15)}`;
                console.warn(`Invalid account name detected for row ${index + 1}: "${row['account_name']}", using fallback: ${accountName}`);
            }

            const signal = {
                // Core signal fields
                id: signalId,
                account_id: accountId,
                account_name: accountName,
                name: signalName,
                category: category,
                priority: priority,
                summary: summary,
                rationale: rationale,
                action_context: row['action_context'] || row['Action Context'] || row['ACTION_CONTEXT'] || 'No actions specified',
                confidence: confidence,
                created_date: row['created_at'] || row['created_date'] || row['Created Date'] || row['Created At'] || this.getRandomRecentDate(),
                created_at: row['created_at'] || row['Created At'] || row['created_date'] || row['Created Date'] || this.getRandomRecentDate(),
                source_icon: this.getSourceIcon(category),
                code: row['code'] || row['Code'] || row['CODE'] || '',

                // Enhanced signal fields from new data model
                recommended_action: row['recommended_action'] || row['Recommended Action'] || row['RECOMMENDED_ACTION'] || '',
                signal_rationale: row['signal_rationale'] || row['Signal Rationale'] || row['SIGNAL_RATIONALE'] || '',
                signal_confidence: parseFloat(row['signal_confidence'] || row['Signal Confidence'] || row['SIGNAL_CONFIDENCE'] || '0') || 0.7,
                action_id: row['action_id'] || row['Action Id'] || row['ACTION_ID'] || '', // GUID of the action

                // Play recommendations - correct CSV field mapping
                play_1: row['play_1'] || row['Play 1'] || row['PLAY_1'] || '',
                play_2: row['play_2'] || row['Play 2'] || row['PLAY_2'] || '',
                play_3: row['play_3'] || row['Play 3'] || row['PLAY_3'] || '',
                
                // Correct mapping: Use Play Name fields for shorter titles, not descriptions
                play_1_name: row['Play 1 Name'] || row['play_1'] || '', // Use the actual name field
                play_1_description: row['Play 1 Description'] || 'Customer Success enablement play',
                play_2_name: row['Play 2 Name'] || row['play_2'] || '', // Use the actual name field  
                play_2_description: row['Play 2 Description'] || 'Customer Success management play',
                play_3_name: row['Play 3 Name'] || row['play_3'] || '', // Use the actual name field
                play_3_description: row['Play 3 Description'] || 'Customer Success optimization play',

                // Account health metrics (GPA components)
                relationship: row['Relationship'] || row['RELATIONSHIP'] || '',
                content_creation: row['Content Creation'] || row['CONTENT CREATION'] || '',
                user_engagement: row['User Engagement'] || row['USER ENGAGEMENT'] || '',
                support: row['Support'] || row['SUPPORT'] || '',
                commercial: row['Commercial'] || row['COMMERCIAL'] || '',
                education: row['Education'] || row['EDUCATION'] || '',
                platform_utilization: row['Platform Utilization'] || row['PLATFORM UTILIZATION'] || '',
                value_realization: row['Value Realization'] || row['VALUE REALIZATION'] || '',

                // Usage and billing metrics
                total_lifetime_billings: parseFloat(row['Total Lifetime Billings'] || row['TOTAL LIFETIME BILLINGS'] || '0') || 0,
                daily_active_users: parseInt(row['Daily Active Users (DAU)'] || row['DAILY ACTIVE USERS (DAU)'] || '0') || 0,
                weekly_active_users: parseInt(row['Weekly Active Users (WAU)'] || row['WEEKLY ACTIVE USERS (WAU)'] || '0') || 0,
                monthly_active_users: parseInt(row['Monthly Active Users (MAU)'] || row['MONTHLY ACTIVE USERS (MAU)'] || '0') || 0,
                total_data_sets: parseInt(row['Total Data Sets'] || row['TOTAL DATA SETS'] || '0') || 0,
                total_rows: parseInt(row['Total Rows'] || row['TOTAL ROWS'] || '0') || 0,
                dataflows: parseInt(row['Dataflows'] || row['DATAFLOWS'] || '0') || 0,
                cards: parseInt(row['Cards'] || row['CARDS'] || '0') || 0,
                health_score: parseFloat(row['Health Score'] || row['HEALTH SCORE'] || '0') || 0,
                is_consumption: row['is Consumption'] === 'true' || row['is Consumption'] === true || row['IS CONSUMPTION'] === 'true',

                // Account information and risk assessment
                at_risk_cat: row['at_risk_cat'] || row['At Risk Cat'] || row['AT_RISK_CAT'] || 'Healthy',
                account_gpa_table_card_column: row['Account GPA Table Card Column'] || row['ACCOUNT GPA TABLE CARD COLUMN'] || '',
                account_gpa: row['Account GPA'] || row['ACCOUNT GPA'] || '',
                industry: row['Industry (Domo)'] || row['INDUSTRY (DOMO)'] || 'Unknown',
                customer_tenure_years: parseFloat(row['Customer Tenure (Years)'] || row['CUSTOMER TENURE (YEARS)'] || '0') || 0,
                type_of_next_renewal: row['Type of Next Renewal'] || row['TYPE OF NEXT RENEWAL'] || '',
                numeric_grade: parseFloat(row['Numeric Grade'] || row['NUMERIC GRADE'] || '0') || 0,
                account_gpa_numeric: parseFloat(row['Account GPA Numeric'] || row['ACCOUNT GPA NUMERIC'] || '0') || 0,

                // Component numeric values
                relationship_value: parseFloat(row['Relationship - Value'] || row['RELATIONSHIP - VALUE'] || '0') || 0,
                content_creation_value: parseFloat(row['Content Creation - Value'] || row['CONTENT CREATION - VALUE'] || '0') || 0,
                user_engagement_value: parseFloat(row['User Engagement - Value'] || row['USER ENGAGEMENT - VALUE'] || '0') || 0,
                support_value: parseFloat(row['Support - Value'] || row['SUPPORT - VALUE'] || '0') || 0,
                commercial_value: parseFloat(row['Commercial - Value'] || row['COMMERCIAL - VALUE'] || '0') || 0,
                education_value: parseFloat(row['Education - Value'] || row['EDUCATION - VALUE'] || '0') || 0,
                platform_utilization_value: parseFloat(row['Platform Utilization - Value'] || row['PLATFORM UTILIZATION - VALUE'] || '0') || 0,
                value_realization_value: parseFloat(row['Value Realization - Value'] || row['VALUE REALIZATION - VALUE'] || '0') || 0,

                // Historical data
                prior_account_gpa_numeric: parseFloat(row['Prior Account GPA Numeric'] || row['PRIOR ACCOUNT GPA NUMERIC'] || '0') || 0,
                prior_value: parseFloat(row['Prior Value'] || row['PRIOR VALUE'] || '0') || 0,
                day_180_gpa_trend: parseFloat(row['180 Day GPA Trend '] || row['180 DAY GPA TREND '] || '0') || 0,
                data_source: row['Data Source'] || row['DATA SOURCE'] || '',

                // Business and forecasting data
                bks_renewal_baseline_usd: parseFloat(row['bks_renewal_baseline_usd'] || row['BKS Renewal Baseline (USD)'] || row['Total Lifetime Billings'] || '0') || 0,
                bks_forecast_new: parseFloat(row['BKS Forecast New'] || row['BKS FORECAST NEW'] || row['bks_forecast_new'] || '0') || 0,
                bks_forecast_delta: parseFloat(row['BKS Forecast Delta'] || row['BKS FORECAST DELTA'] || row['bks_forecast_delta'] || '0') || 0,
                bks_status_grouping: row['BKS Status Grouping'] || row['BKS STATUS GROUPING'] || row['bks_status_grouping'] || '',
                pacing_percent: parseFloat(row['% Pacing'] || row['Pacing Percent'] || row['PACING PERCENT'] || row['pacing_percent'] || '0') || 0,
                bks_fq: row['BKS FQ'] || row['BKS_FQ'] || row['bks_fq'] || '',
                rank: parseInt(row['rank'] || row['RANK'] || '0') || 0,

                // AI-generated context fields
                ai_signal_context: row['AI Signal Context'] || row['AI SIGNAL CONTEXT'] || '',
                ai_account_signal_context: row['AI Account Signal Context'] || row['AI ACCOUNT SIGNAL CONTEXT'] || '',
                ai_account_signal_context_rationale: row['AI Account Signal Context Rationale'] || row['AI ACCOUNT SIGNAL CONTEXT RATIONALE'] || '',
                account_action_context: row['Account Action Context'] || row['ACCOUNT ACTION CONTEXT'] || '',
                account_action_context_rationale: row['Account Action Context Rationale'] || row['ACCOUNT ACTION CONTEXT RATIONALE'] || '',

                // Account ownership and management fields
                account_owner: row['Account Owner'] || row['ACCOUNT OWNER'] || '',
                avp: row['AVP'] || row['avp'] || '',
                rvp: row['RVP'] || row['rvp'] || '',
                ae: row['AE'] || row['ae'] || '',
                csm: row['CSM'] || row['csm'] || '',
                ae_email: row['AE Email'] || row['AE_EMAIL'] || row['ae_email'] || '',

                // Additional renewal and forecasting fields
                next_renewal_date: row['Next Renewal Date'] || row['NEXT_RENEWAL_DATE'] || row['next_renewal_date'] || ''
            };

            signalMap.set(signalId, signal);
        });

        const uniqueSignals = Array.from(signalMap.values());
        console.log(`Returning ${uniqueSignals.length} unique parsed signals from Domo data (filtered from ${domoData.length} rows)`);
        return uniqueSignals;
    }

    static extractAccountsFromSignals(signals) {
        const accountsMap = new Map();

        signals.forEach(signal => {
            const accountId = signal.account_id;

            if (!accountsMap.has(accountId)) {
                // Create account from first signal row - all account data is on every signal row
                accountsMap.set(accountId, {
                    id: accountId,
                    name: signal.account_name,
                    industry: signal.industry || 'Unknown',
                    health_score: signal.health_score || 0,
                    account_gpa_numeric: signal.account_gpa_numeric || 0,
                    total_lifetime_billings: signal.total_lifetime_billings || 0,
                    at_risk_cat: signal.at_risk_cat || 'Healthy',
                    customer_tenure_years: signal.customer_tenure_years || 0,
                    daily_active_users: signal.daily_active_users || 0,
                    weekly_active_users: signal.weekly_active_users || 0,
                    monthly_active_users: signal.monthly_active_users || 0,
                    total_data_sets: signal.total_data_sets || 0,
                    dataflows: signal.dataflows || 0,
                    cards: signal.cards || 0,
                    bks_renewal_baseline_usd: signal.bks_renewal_baseline_usd || 0,
                    bks_forecast_new: signal.bks_forecast_new || 0,
                    bks_status_grouping: signal.bks_status_grouping || '',

                    // GPA component scores (same across all signals for an account)
                    relationship_value: signal.relationship_value || 0,
                    content_creation_value: signal.content_creation_value || 0,
                    user_engagement_value: signal.user_engagement_value || 0,
                    support_value: signal.support_value || 0,
                    commercial_value: signal.commercial_value || 0,
                    education_value: signal.education_value || 0,
                    platform_utilization_value: signal.platform_utilization_value || 0,
                    value_realization_value: signal.value_realization_value || 0,

                    // Account-level AI context (same across signals for an account)
                    ai_account_signal_context: signal.ai_account_signal_context || '',
                    account_action_context: signal.account_action_context || '',
                    account_action_context_rationale: signal.account_action_context_rationale || '',

                    // Account ownership and management
                    account_owner: signal.account_owner || '',
                    avp: signal.avp || '',
                    rvp: signal.rvp || '',
                    ae: signal.ae || '',
                    csm: signal.csm || '',
                    ae_email: signal.ae_email || '',
                    next_renewal_date: signal.next_renewal_date || '',

                    signals: []
                });
            }

            // Add this signal to the account's signals array
            // Each signal will have its own recommended_action, action_id, and plays
            accountsMap.get(accountId).signals.push(signal);
        });

        return Array.from(accountsMap.values());
    }

    static parseCSV(csvText) {
        const lines = csvText.trim().split('\n');
        const headers = lines[0].split(',');
        const csvData = []; // Use local variable instead of this.csvData

        for (let i = 1; i < lines.length; i++) {
            const values = this.parseCSVLine(lines[i]);
            const row = {};

            for (let j = 0; j < headers.length; j++) {
                // Ensure headers[j] is not undefined before using it as a key
                if (headers[j]) {
                    row[headers[j].trim()] = values[j] || '';
                }
            }
            csvData.push(row);
        }

        console.log(`Parsed ${csvData.length} rows from CSV`);
        console.log('Sample CSV row structure:', csvData[0] ? Object.keys(csvData[0]) : 'No data');
        console.log('Sample CSV data:', csvData[0]);

        return this.parseDomoResponse(csvData);
    }

    static parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            const nextChar = line[i + 1];

            if (char === '"') {
                if (inQuotes && nextChar === '"') {
                    current += '"';
                    i++;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                let value = current.trim();
                if (value.startsWith('"') && value.endsWith('"')) {
                    value = value.slice(1, -1);
                }
                result.push(value);
                current = '';
            } else {
                current += char;
            }
        }

        let value = current.trim();
        if (value.startsWith('"') && value.endsWith('"')) {
            value = value.slice(1, -1);
        }
        result.push(value);
        return result;
    }

    static getRandomRecentDate() {
        const now = new Date();
        const daysAgo = Math.floor(Math.random() * 7);
        const date = new Date(now - daysAgo * 24 * 60 * 60 * 1000);
        return date.toISOString().split('T')[0];
    }

    static getSourceIcon(category) {
        const icons = {
            'Architecture': 'fas fa-cogs',
            'Relationship': 'fas fa-users',
            'Use Case': 'fas fa-lightbulb',
            'User Engagement': 'fas fa-chart-line',
            'Business': 'fas fa-briefcase',
            'Enablement': 'fas fa-graduation-cap'
        };
        return icons[category] || 'fas fa-info-circle';
    }

    static generateFallbackAction(category, priority) {
        const actionTemplates = {
            'Architecture': {
                'High': ['Schedule technical assessment', 'Plan architecture review', 'Evaluate integration options'],
                'Medium': ['Review technical requirements', 'Assess current architecture', 'Plan optimization strategy'],
                'Low': ['Monitor technical performance', 'Document current setup', 'Plan future enhancements']
            },
            'Use Case': {
                'High': ['Schedule use case workshop', 'Define implementation roadmap', 'Prioritize feature requirements'],
                'Medium': ['Review use case requirements', 'Assess implementation options', 'Plan development timeline'],
                'Low': ['Document use case details', 'Monitor progress', 'Schedule check-in']
            },
            'User Engagement': {
                'High': ['Plan engagement strategy', 'Schedule user training', 'Implement adoption program'],
                'Medium': ['Review engagement metrics', 'Plan training session', 'Assess user needs'],
                'Low': ['Monitor user activity', 'Send engagement resources', 'Schedule follow-up']
            },
            'Enablement': {
                'High': ['Schedule enablement session', 'Plan comprehensive training', 'Assign dedicated support'],
                'Medium': ['Provide training resources', 'Schedule guidance session', 'Create learning path'],
                'Low': ['Send documentation', 'Offer self-service resources', 'Schedule check-in']
            }
        };

        const categoryActions = actionTemplates[category] || actionTemplates['Use Case'];
        const priorityActions = categoryActions[priority] || categoryActions['Medium'];
        const randomIndex = Math.floor(Math.random() * priorityActions.length);
        return priorityActions[randomIndex];
    }

    static generateFallbackRationale(summary) {
        if (!summary || summary === 'No summary available') {
            return 'This signal requires attention based on customer activity patterns and platform usage data.';
        }
        return `Based on the signal summary: "${summary.substring(0, 100)}${summary.length > 100 ? '...' : ''}", this action is recommended to address the identified opportunity or concern.`;
    }

    static generateActionId() {
        // Generate a UUID-like string for action ID
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    // Sample data - now loads from the master CSV file
    static getSampleData() {
        const csvData = `account_id,account_name,category,code,name,summary,rationale,priority,confidence,action_context,Signal Id,recommended_action,signal_rationale,signal_confidence,action_id,created_at,play_1,play_2,play_3,Play 1 Name,Play 1 Description,Play 2 Name,Play 2 Description,Play 3 Name,Play 3 Description,Account Id,Relationship,Content Creation,User Engagement,Support,Commercial,Education,Platform Utilization,Value Realization,Total Lifetime Billings,Daily Active Users (DAU),Weekly Active Users (WAU),Monthly Active Users (MAU),Total Data Sets,Total Rows,Dataflows,Cards,Health Score,is Consumption,at_risk_cat,Account GPA Table Card Column,Account GPA,Industry (Domo),Customer Tenure (Years),Type of Next Renewal,Numeric Grade,Account GPA Numeric,Relationship - Value,Content Creation - Value,User Engagement - Value,Support - Value,Commercial - Value,Education - Value,Platform Utilization - Value,Value Realization - Value,Prior Account GPA Numeric,Prior Value,180 Day GPA Trend ,Data Source,Next Renewal Date,bks_status_grouping,bks_renewal_baseline_usd,bks_forecast_new,bks_forecast_delta,% Pacing,bks_fq,rank,AI Signal Context,AI Account Signal Context,AI Account Signal Context Rationale,Account Action Context,Account Action Context Rationale,Account Owner,AVP,RVP,AE,CSM,AE Email
0013000000DXZ1fAAH,Falvey Insurance Group Ltd,Architecture,ARCH-01,CDW Identified,The customer is implementing MongoDB as a database for a new program with significant data volume. This represents an important architectural component that will impact how they structure their data pipeline and reporting in Domo.,Matt M. explicitly stated: 'We're actually writing all this data to a mongodb database' and discussed using 'the mongodb connector' to bring this data into Domo for reporting purposes.,Medium,0.95,1. Provide documentation on best practices for MongoDB integration with Domo. 2. Schedule a follow-up after initial implementation to review performance and optimization. 3. Consider offering technical guidance on JSON parsing strategies within Domo.,00dca050-ef6e-44ae-bedd-af0b1f3300bf,Schedule a MongoDB connector enablement session before next Friday's launch,"The customer is implementing MongoDB for a new program with a firm launch date of 'next Friday' and needs guidance on connecting this data to Domo for client reporting. Given the urgency (UC-11) and the technical nature of the integration (ARCH-01), a targeted enablement session would help ensure successful implementation.",0.9,468376df-5f25-424f-a4bf-234835feab09,2025-08-20T21:57:06,PLAY-001,PLAY-040,,Feature Demo/Deep Dive Enablement (ACE),"ACE Team-led feature tour and customized enablement session as structured ""micro-engagements""",Domo Best Practices Demo/Deep Dive Enablement (ACE),"ACE Subject Matter Experts who can add significant value by ensuring the accuracy and also provide expert insights and recommendations to customers who don't need help to build, but just education to execute on roadmaps, architecture, governance, use cases and migrations",,,0013000000DXZ1fAAH,C,S,A,S,D,,C,,1633599.9300000002,5,65,89,1850,425000000,285,5200,0.78,true,Healthy,B,B,Insurance,11,Standard,B,3.1336,2.0,4.666666666666667,3.6666666666666665,4.666666666666667,1,0,2,3.2,3.1003,3.1003,-0.066,Current Grade,2025-12-15,0 - NO FCST,136718.4,0.0,-136718.4,0.0,FY27-Q3,1,Customer is implementing MongoDB as a database for a new program with significant data volume.,Schedule a MongoDB connector enablement session before next Friday's launch Conduct data volume assessment to estimate credit impact,The customer is implementing MongoDB for a new program with a firm launch date of next Friday and needs guidance on connecting this data to Domo for client reporting.,Schedule a MongoDB connector enablement session before next Friday's launch,The customer is implementing MongoDB for a new program with a firm launch date of next Friday and needs guidance on connecting this data to Domo for client reporting.,John Smith,Sarah Johnson,Mike Davis,Emily Chen,David Rodriguez,emily.chen@company.com
0013800001C0Qy3AAF,Redstone Residential Inc,Relationship,REL-05,Relationship Gap / Exposure,"The call indicates knowledge gaps due to team transitions, with Fui mentioning 'tribal knowledge that was left' due to personnel changes.","Fui explicitly mentioned 'the tribal knowledge that was left, right? Given some of the transitions that had taken place.' This indicates that key personnel who understood the Domo implementation have departed.",High,0.85,1. Document current state of implementation and knowledge. 2. Identify specific knowledge gaps from previous team members. 3. Create transition plan to rebuild institutional knowledge.,77a1b4c8-af26-43d8-baad-f656bfa58f47,Schedule a Configuration Architecture session to document and rebuild institutional knowledge,"The signals indicate a significant knowledge gap due to team transitions with tribal knowledge being lost.",0.85,1fefafdc-4d83-44af-af86-03505166c5ae,2025-08-14T20:12:09,PLAY-050,PLAY-089,,Configuration Architecture,"Setting up your Domo architecture for innovation manageability and governance.",Product Onboard Implementation Best Practices,"During New Logo or New Use Case onboard that involves new use cases or deployment of Domo.",,,,0013800001C0Qy3AAF,S,D,C,B,B,F,C,C,296924.36,0,7,15,515,70832928,245,666,0.22940944818060477,true,At Risk,C,C,Other,7,Standard,C,2.2498,5.0,1.3333333333333333,2.0,3.0,3,0,2,2.0,2.5498,2.5498,0.8662,Current Grade,2025-09-30,0 - NO FCST,54671.95,54671.95,0.0,1.247008474576271,FY27-Q2,1,The call indicates knowledge gaps due to team transitions.,Schedule a Configuration Architecture session to document and rebuild institutional knowledge,The signals indicate a significant knowledge gap due to team transitions with tribal knowledge being lost.,Schedule a Configuration Architecture session to document and rebuild institutional knowledge,The signals indicate a significant knowledge gap due to team transitions with tribal knowledge being lost.,Lisa Thompson,Robert Kim,Jennifer Lee,Mark Wilson,Amanda Foster,mark.wilson@company.com
0013800001FjROjAAN,"Magnolia Market, LLC",Relationship,REL-01,Decision-Maker Identified or lost,"Ryan has been identified as the decision-maker who manages the applications and engineering team at Magnolia.","Ryan stated: 'I manage the applications and engineering team here at magnolia. So I oversee the administration of our internal business systems like Netsuite and Domo and Shopify.'",High,0.9,Ensure Ryan is included in all strategic discussions about the Domo implementation. Develop a relationship with him as the key decision-maker for Domo at Magnolia.,b027cbe1-ae8f-4e88-a009-098db9511d01,Schedule a Configuration Architecture session with Ryan and Mason,"Ryan has been identified as the key decision-maker who oversees Domo administration while Mason is the technical influencer handling data integrations.",0.85,cb6d6d57-bbf7-4adb-9287-2695c8aeda9b,2025-08-14T20:12:09,PLAY-050,,,Configuration Architecture,"Setting up your Domo architecture for innovation manageability and governance.",,,,,0013800001FjROjAAN,C,D,C,,F,,C,,848068.24,3,36,57,1190,1526378236,236,3964,0.5390818767933085,true,Healthy,D,D,Media,8,Standard,D,1.2331,2.3333333333333335,1.3333333333333333,2.0,0.0,0,0,2,1.1,1.2331,1.2331,-0.2,Current Grade,2025-11-20,0 - NO FCST,108070.0,108070.0,0.0,0.03193398520705097,FY27-Q1,1,Ryan has been identified as the decision-maker who manages the applications and engineering team.,Schedule a Configuration Architecture session with Ryan and Mason,Ryan has been identified as the key decision-maker who oversees Domo administration while Mason is the technical influencer handling data integrations.,Schedule a Configuration Architecture session with Ryan and Mason,Ryan has been identified as the key decision-maker who oversees Domo administration while Mason is the technical influencer handling data integrations.,Carlos Rodriguez,Michelle Brown,Tom Anderson,Jessica Park,Ryan Mitchell,jessica.park@company.com`;

        return this.parseCSV(csvData);
    }
}