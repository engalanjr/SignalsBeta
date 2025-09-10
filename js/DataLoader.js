// DataLoader - Centralized batch loading for all data types
class DataLoader {
    
    static async loadAllData() {
        console.log('🚀 Starting parallel batch data load...');
        const startTime = performance.now();
        
        try {
            // Execute all API calls in parallel for maximum speed
            const [
                signalsResult,
                interactionsResult, 
                commentsResult,
                actionPlansResult,
                userInfoResult
            ] = await Promise.allSettled([
                this.loadSignals(),
                this.loadInteractions(),
                this.loadComments(),
                this.loadActionPlans(),
                this.loadUserInfo()
            ]);

            const loadTime = performance.now() - startTime;
            console.log(`⚡ Batch data load completed in ${loadTime.toFixed(2)}ms`);

            // Process results and handle any failures gracefully
            const data = {
                signals: this.processResult(signalsResult, 'signals', []),
                interactions: this.processResult(interactionsResult, 'interactions', []),
                comments: this.processResult(commentsResult, 'comments', []),
                actionPlans: this.processResult(actionPlansResult, 'action plans', []),
                userInfo: this.processResult(userInfoResult, 'user info', { userId: 'user-1', userName: 'Current User' })
            };

            console.log('📊 Data load summary:', {
                signals: data.signals.length,
                interactions: data.interactions.length, 
                comments: data.comments.length,
                actionPlans: data.actionPlans.length,
                userInfo: data.userInfo.userName
            });

            return data;
            
        } catch (error) {
            console.error('❌ Critical error in batch data load:', error);
            throw error;
        }
    }

    static async loadSignals() {
        try {
            console.log('📡 Loading signals...');
            const response = await domo.get('/data/v1/signals');
            
            if (response && response.length > 0) {
                console.log(`✅ Loaded ${response.length} signals from Domo API`);
                return DataService.parseDomoResponse(response);
            } else {
                console.warn('⚠️ No signals from API, using CSV fallback');
                return await MasterDataLoader.loadMasterCSV();
            }
        } catch (error) {
            console.warn('⚠️ Signals API failed, using CSV fallback:', error.message);
            return await MasterDataLoader.loadMasterCSV();
        }
    }

    static async loadInteractions() {
        try {
            console.log('📡 Loading interactions...');
            const response = await domo.get('/domo/datastores/v1/collections/SignalAI.Interactions/documents');
            
            if (response && Array.isArray(response)) {
                const interactions = response.map(doc => doc.content || doc);
                console.log(`✅ Loaded ${interactions.length} interactions`);
                return interactions;
            }
            return [];
        } catch (error) {
            console.warn('⚠️ Interactions load failed:', error.message);
            return [];
        }
    }

    static async loadComments() {
        try {
            console.log('📡 Loading comments...');
            const response = await domo.get('/domo/datastores/v1/collections/SignalAI.Comments/documents');
            
            if (response && Array.isArray(response)) {
                const comments = response.map(doc => doc.content || doc);
                console.log(`✅ Loaded ${comments.length} comments`);
                return comments;
            }
            return [];
        } catch (error) {
            console.warn('⚠️ Comments load failed:', error.message);
            return [];
        }
    }

    static async loadActionPlans() {
        try {
            console.log('📡 Loading action plans...');
            const response = await domo.get('/domo/datastores/v1/collections/SignalAI.ActionPlans/documents');
            
            if (response && Array.isArray(response)) {
                const plans = response.map(doc => doc.content || doc);
                console.log(`✅ Loaded ${plans.length} action plans`);
                return plans;
            }
            return [];
        } catch (error) {
            console.warn('⚠️ Action plans load failed:', error.message);
            return [];
        }
    }

    static async loadUserInfo() {
        try {
            console.log('📡 Loading user info...');
            const user = await domo.get('/domo/environment/v1/');
            
            if (user && typeof user === 'object') {
                const userInfo = {
                    userId: user.userId || user.id || 'user-1',
                    userName: user.userName || user.name || user.displayName || 'Current User'
                };
                console.log(`✅ Loaded user info: ${userInfo.userName}`);
                return userInfo;
            }
            return { userId: 'user-1', userName: 'Current User' };
        } catch (error) {
            console.warn('⚠️ User info load failed:', error.message);
            return { userId: 'user-1', userName: 'Current User' };
        }
    }

    static processResult(promiseResult, dataType, fallback) {
        if (promiseResult.status === 'fulfilled') {
            return promiseResult.value;
        } else {
            console.error(`❌ Failed to load ${dataType}:`, promiseResult.reason);
            return fallback;
        }
    }
}