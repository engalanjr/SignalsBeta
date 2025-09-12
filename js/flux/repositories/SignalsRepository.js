// SignalsRepository - Handles all signal-related API operations with Flux integration
class SignalsRepository {
    
    /**
     * Load all application data (signals, comments, interactions, plans, user info)
     * @returns {Promise} - Promise that resolves with all data
     */
    static async loadAllData() {
        // Dispatch loading started action
        dispatcher.dispatch(Actions.startDataLoad());
        
        try {
            console.log('🚀 SignalsRepository: Starting parallel batch data load...');
            const startTime = performance.now();
            
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
            
            // Dispatch success action with the data
            dispatcher.dispatch(Actions.dataLoadSuccess(data));
            
            return data;
            
        } catch (error) {
            console.error('❌ SignalsRepository: Failed to load data:', error);
            
            // Dispatch failure action
            dispatcher.dispatch(Actions.dataLoadFailed(error));
            
            throw error;
        }
    }
    
    /**
     * Process Promise.allSettled result and handle failures gracefully
     */
    static processResult(result, name, defaultValue) {
        if (result.status === 'fulfilled') {
            return result.value;
        } else {
            console.warn(`⚠️ Failed to load ${name}:`, result.reason);
            return defaultValue;
        }
    }
    
    /**
     * Load signals from API or fallback to CSV
     */
    static async loadSignals() {
        try {
            console.log('📡 Loading signals...');
            const response = await domo.get('/data/v1/signals');
            
            if (response && response.length > 0) {
                console.log(`✅ Loaded ${response.length} signals from Domo API`);
                return this.parseDomoResponse(response);
            } else {
                console.warn('⚠️ No signals from API, using CSV fallback');
                return await this.loadMasterCSV();
            }
        } catch (error) {
            console.error('❌ Failed to load signals from API:', error);
            console.warn('Falling back to master CSV data');
            return await this.loadMasterCSV();
        }
    }
    
    /**
     * Load master CSV fallback data
     */
    static async loadMasterCSV() {
        try {
            console.log('Loading master CSV data...');
            
            // Fetch the master CSV file with cache-busting
            const cacheBuster = `?v=${Date.now()}`;
            const response = await fetch(`./data.csv${cacheBuster}`);
            
            if (!response.ok) {
                throw new Error(`Failed to load CSV: ${response.status}`);
            }
            
            const csvText = await response.text();
            console.log('Master CSV loaded successfully, length:', csvText.length);
            console.log('First few lines of CSV:', csvText.substring(0, 500));
            
            // Parse the CSV
            const parsedData = this.parseCSV(csvText);
            console.log(`Parsed ${parsedData.length} records from master CSV`);
            
            return parsedData;
        } catch (error) {
            console.error('Error loading master CSV:', error);
            // Fall back to sample data if CSV loading fails
            return this.getSampleData();
        }
    }
    
    /**
     * Parse Domo API response into signals format
     */
    static parseDomoResponse(response) {
        // Transform Domo response data into our signal format
        return response.map(item => ({
            id: item['Signal Id'] || item.id || `signal_${Math.random().toString(36).substr(2, 9)}`,
            account_id: item['Account Id'] || item.account_id,
            account_name: item.account_name,
            category: item.category,
            code: item.code,
            name: item.name,
            summary: item.summary,
            rationale: item.rationale,
            priority: item.priority,
            confidence: parseFloat(item.confidence) || 0,
            action_context: item.action_context,
            
            // Account metrics
            at_risk_cat: item.at_risk_cat || 'Healthy',
            account_gpa: item['Account GPA'] || item.account_gpa,
            account_gpa_numeric: parseFloat(item['Account GPA Numeric'] || item.account_gpa_numeric) || 0,
            health_score: parseFloat(item['Health Score'] || item.health_score) || 0,
            
            // Business metrics
            total_lifetime_billings: parseFloat(item['Total Lifetime Billings'] || item.total_lifetime_billings) || 0,
            bks_renewal_baseline_usd: parseFloat(item.bks_renewal_baseline_usd) || 0,
            bks_forecast_new: parseFloat(item.bks_forecast_new) || 0,
            bks_forecast_delta: parseFloat(item.bks_forecast_delta) || 0,
            bks_status_grouping: item.bks_status_grouping || '',
            pacing_percent: parseFloat(item['% Pacing'] || item.pacing_percent) || 0,
            bks_fq: item.bks_fq || '',
            
            // Usage metrics
            daily_active_users: parseInt(item['Daily Active Users (DAU)'] || item.daily_active_users) || 0,
            weekly_active_users: parseInt(item['Weekly Active Users (WAU)'] || item.weekly_active_users) || 0,
            monthly_active_users: parseInt(item['Monthly Active Users (MAU)'] || item.monthly_active_users) || 0,
            total_data_sets: parseInt(item['Total Data Sets'] || item.total_data_sets) || 0,
            total_rows: parseInt(item['Total Rows'] || item.total_rows) || 0,
            dataflows: parseInt(item.Dataflows || item.dataflows) || 0,
            cards: parseInt(item.Cards || item.cards) || 0,
            is_consumption: item['is Consumption'] === 'true' || item.is_consumption === true,
            
            // Additional fields
            industry: item['Industry (Domo)'] || item.industry || 'Unknown',
            customer_tenure_years: parseInt(item['Customer Tenure (Years)'] || item.customer_tenure_years) || 0,
            type_of_next_renewal: item['Type of Next Renewal'] || item.type_of_next_renewal || '',
            numeric_grade: parseFloat(item['Numeric Grade'] || item.numeric_grade) || 0,
            
            // GPA component scores
            relationship_value: parseFloat(item['Relationship - Value'] || item.relationship_value) || 0,
            content_creation_value: parseFloat(item['Content Creation - Value'] || item.content_creation_value) || 0,
            user_engagement_value: parseFloat(item['User Engagement - Value'] || item.user_engagement_value) || 0,
            support_value: parseFloat(item['Support - Value'] || item.support_value) || 0,
            commercial_value: parseFloat(item['Commercial - Value'] || item.commercial_value) || 0,
            education_value: parseFloat(item['Education - Value'] || item.education_value) || 0,
            platform_utilization_value: parseFloat(item['Platform Utilization - Value'] || item.platform_utilization_value) || 0,
            value_realization_value: parseFloat(item['Value Realization - Value'] || item.value_realization_value) || 0,
            
            // Historical metrics
            prior_account_gpa_numeric: parseFloat(item['Prior Account GPA Numeric'] || item.prior_account_gpa_numeric) || 0,
            day_180_gpa_trend: parseFloat(item['180 Day GPA Trend'] || item.day_180_gpa_trend) || 0,
            
            // Account ownership
            account_owner: item.account_owner || '',
            avp: item.avp || '',
            rvp: item.rvp || '',
            ae: item.ae || '',
            csm: item.csm || '',
            ae_email: item.ae_email || '',
            next_renewal_date: item.next_renewal_date || '',
            
            // Recommendation and action fields
            recommended_action: item.recommended_action || '',
            signal_rationale: item.signal_rationale || '',
            signal_confidence: item.signal_confidence || '',
            action_id: item.action_id || '',
            
            // CS Play fields
            play_1: item.play_1 || '',
            play_2: item.play_2 || '',
            play_3: item.play_3 || '',
            'Play 1 Name': item['Play 1 Name'] || '',
            'Play 1 Description': item['Play 1 Description'] || '',
            'Play 2 Name': item['Play 2 Name'] || '',
            'Play 2 Description': item['Play 2 Description'] || '',
            'Play 3 Name': item['Play 3 Name'] || '',
            'Play 3 Description': item['Play 3 Description'] || '',
            
            // Call information
            call_id: item.call_id || '',
            call_date: item.call_date || '',
            call_title: item.call_title || '',
            call_outcome: item.call_outcome || '',
            
            // Computed fields
            created_date: item.created_date || new Date().toISOString(),
            isViewed: false,
            feedback: null
        }));
    }
    
    /**
     * Parse CSV text into signals data
     */
    static parseCSV(csvText) {
        const lines = csvText.trim().split('\n');
        const headers = lines[0].split(',');
        const data = [];

        for (let i = 1; i < lines.length; i++) {
            const values = this.parseCSVLine(lines[i]);
            const row = {};

            for (let j = 0; j < headers.length; j++) {
                row[headers[j]] = values[j] || '';
            }

            // Transform to our signal format using parseDomoResponse for consistency
            const signal = this.parseDomoResponse([row])[0];
            
            // Override with CSV-specific fields
            signal.id = row['Signal Id'] || `signal-${i}`;
            signal.created_date = this.getRandomRecentDate();

            data.push(signal);
        }

        return data;
    }
    
    /**
     * Parse a single CSV line handling quoted fields
     */
    static parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            const nextChar = line[i + 1];

            if (char === '"') {
                if (inQuotes && nextChar === '"') {
                    // Handle escaped quotes inside quoted field
                    current += '"';
                    i++; // Skip the next quote
                } else {
                    // Toggle quote state
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                // Remove surrounding quotes if present
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

        // Handle the last field
        let value = current.trim();
        if (value.startsWith('"') && value.endsWith('"')) {
            value = value.slice(1, -1);
        }
        result.push(value);
        return result;
    }
    
    /**
     * Generate a random recent date for demo purposes
     */
    static getRandomRecentDate() {
        const now = new Date();
        const daysAgo = Math.floor(Math.random() * 7);
        const date = new Date(now - daysAgo * 24 * 60 * 60 * 1000);
        return date.toISOString();
    }
    
    /**
     * Load user interactions from API with proper fallback
     */
    static async loadInteractions() {
        try {
            console.log('👍 Loading interactions from Domo API...');
            const response = await domo.get('/domo/datastores/v1/collections/SignalAI.Interactions/documents');
            
            if (response && response.length > 0) {
                console.log(`✅ Loaded ${response.length} interactions from Domo API`);
                return response;
            } else {
                console.warn('⚠️ No interactions from API, using fallback data');
                return this.getDefaultInteractions();
            }
        } catch (error) {
            console.error('❌ Failed to load interactions from API:', error);
            console.log('📁 Loading fallback interactions...');
            return this.getDefaultInteractions();
        }
    }
    
    /**
     * Load comments from API with proper fallback
     */
    static async loadComments() {
        try {
            console.log('💬 Loading comments from Domo API...');
            const response = await domo.get('/domo/datastores/v1/collections/SignalAI.Comments/documents');
            
            if (response && response.length > 0) {
                console.log(`✅ Loaded ${response.length} comments from Domo API`);
                return response;
            } else {
                console.warn('⚠️ No comments from API, using fallback data');
                return this.getDefaultComments();
            }
        } catch (error) {
            console.error('❌ Failed to load comments from API:', error);
            console.log('📁 Loading fallback comments...');
            return this.getDefaultComments();
        }
    }
    
    /**
     * Load action plans from API
     */
    static async loadActionPlans() {
        try {
            console.log('📋 Loading action plans...');
            
            // First, try the API
            const response = await domo.get('/domo/datastores/v1/collections/SignalAI.ActionPlans/documents');
            
            if (response && response.length > 0) {
                console.log(`✅ Loaded ${response.length} action plans from API`);
                return response;
            }
            
            // Fallback: Try loading from the fallback JSON file
            console.log('📁 No action plans in API, checking for fallback file...');
            const fallbackResponse = await fetch('./action-plans-fallback.json?v=' + Date.now());
            
            if (fallbackResponse.ok) {
                const fallbackData = await fallbackResponse.json();
                if (fallbackData && fallbackData.length > 0) {
                    console.log(`✅ Loaded ${fallbackData.length} action plans from fallback file`);
                    return fallbackData;
                }
            }
            
            return [];
        } catch (error) {
            console.error('Failed to load action plans:', error);
            
            // Try the fallback file as a last resort
            try {
                const fallbackResponse = await fetch('./action-plans-fallback.json?v=' + Date.now());
                if (fallbackResponse.ok) {
                    const fallbackData = await fallbackResponse.json();
                    if (fallbackData && fallbackData.length > 0) {
                        console.log(`✅ Loaded ${fallbackData.length} action plans from fallback (error recovery)`);
                        return fallbackData;
                    }
                }
            } catch (fallbackError) {
                console.error('Failed to load fallback action plans:', fallbackError);
            }
            
            return [];
        }
    }
    
    /**
     * Load user info from API with proper fallback
     */
    static async loadUserInfo() {
        try {
            console.log('👤 Loading user info from Domo API...');
            const response = await domo.get('/domo/environment/v1/');
            
            if (response && response.userId) {
                console.log('✅ Loaded user info from Domo API:', response.userName);
                return {
                    userId: response.userId,
                    userName: response.userName || 'Current User',
                    email: response.userEmail || ''
                };
            } else {
                console.warn('⚠️ No user info from API, using fallback data');
                return this.getDefaultUserInfo();
            }
        } catch (error) {
            console.error('❌ Failed to load user info from API:', error);
            console.log('📁 Loading fallback user info...');
            return this.getDefaultUserInfo();
        }
    }
    
    /**
     * Get sample data for fallback
     */
    static getSampleData() {
        console.log('Using sample data fallback...');
        return [
            {
                id: 'sample-001',
                account_id: 'ACC001',
                account_name: 'Sample Account',
                category: 'Architecture',
                code: 'ARCH-01',
                name: 'Sample Signal',
                summary: 'This is a sample signal for demo purposes',
                rationale: 'Sample rationale text',
                priority: 'High',
                confidence: 0.9,
                action_context: 'Sample action context',
                at_risk_cat: 'Healthy',
                account_gpa: 'B',
                account_gpa_numeric: 3.0,
                health_score: 0.75,
                total_lifetime_billings: 100000,
                bks_renewal_baseline_usd: 50000,
                industry: 'Technology',
                customer_tenure_years: 3,
                daily_active_users: 10,
                weekly_active_users: 50,
                monthly_active_users: 100,
                created_date: new Date().toISOString(),
                isViewed: false,
                feedback: null
            }
        ];
    }
    
    /**
     * Save user feedback interaction (like/not-accurate)
     * @param {string} signalId - Signal ID
     * @param {string} interactionType - Type of interaction ('like', 'not-accurate', 'viewed')
     * @param {string} userId - User ID
     * @returns {Promise} - Promise that resolves with result
     */
    static async saveFeedbackInteraction(signalId, interactionType, userId = 'user-1') {
        try {
            console.log(`💾 SignalsRepository: Saving feedback ${interactionType} for signal ${signalId}`);
            
            // Create interaction object
            const interaction = {
                id: `interaction_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                signalId: signalId,
                type: interactionType,
                userId: userId,
                timestamp: new Date().toISOString(),
                createdAt: new Date().toISOString()
            };
            
            // Try to save to Domo API
            try {
                const response = await domo.post('/domo/datastores/v1/collections/SignalAI.Interactions/documents', interaction);
                console.log('✅ Interaction saved to API:', response);
                return {
                    success: true,
                    data: response || interaction
                };
            } catch (apiError) {
                // API failed but we can still return success for optimistic updates
                console.warn('⚠️ API save failed, but continuing with optimistic update:', apiError);
                return {
                    success: true,
                    data: interaction
                };
            }
            
        } catch (error) {
            console.error('❌ SignalsRepository: Failed to save feedback:', error);
            
            return {
                success: false,
                error: error.message || 'Failed to save feedback'
            };
        }
    }
    
    /**
     * Save a new comment
     * @param {Object} comment - Comment data
     * @returns {Promise} - Promise that resolves with saved comment
     */
    static async saveComment(comment) {
        try {
            console.log('💾 SignalsRepository: Saving comment...');
            
            // Ensure comment has all required fields
            const commentToSave = {
                id: comment.id || `comment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                signalId: comment.signalId,
                accountId: comment.accountId,
                text: comment.text,
                author: comment.author || 'Current User',
                authorId: comment.userId || 'user-1',
                timestamp: comment.timestamp || new Date().toISOString(),
                createdAt: comment.createdAt || new Date().toISOString(),
                updatedAt: comment.updatedAt || new Date().toISOString()
            };
            
            // Try to save to Domo API
            try {
                const response = await domo.post('/domo/datastores/v1/collections/SignalAI.Comments/documents', commentToSave);
                console.log('✅ Comment saved to API:', response);
                return {
                    success: true,
                    data: response || commentToSave
                };
            } catch (apiError) {
                // API failed but we can still return success for optimistic updates
                console.warn('⚠️ API save failed, but continuing with optimistic update:', apiError);
                return {
                    success: true,
                    data: commentToSave
                };
            }
            
        } catch (error) {
            console.error('❌ SignalsRepository: Failed to save comment:', error);
            
            return {
                success: false,
                error: error.message || 'Failed to save comment'
            };
        }
    }
    
    /**
     * Update an existing comment
     * @param {string} commentId - Comment ID to update
     * @param {Object} updates - Comment updates
     * @returns {Promise} - Promise that resolves with updated comment
     */
    static async updateComment(commentId, updates) {
        try {
            console.log(`💾 SignalsRepository: Updating comment ${commentId}...`);
            
            // Try to update via Domo API
            try {
                const response = await domo.put(`/domo/datastores/v1/collections/SignalAI.Comments/documents/${commentId}`, updates);
                console.log('✅ Comment updated in API:', response);
                return {
                    success: true,
                    data: response || { ...updates, id: commentId }
                };
            } catch (apiError) {
                console.warn('⚠️ API update failed, but continuing with optimistic update:', apiError);
                return {
                    success: true,
                    data: { ...updates, id: commentId }
                };
            }
            
        } catch (error) {
            console.error('❌ SignalsRepository: Failed to update comment:', error);
            
            return {
                success: false,
                error: error.message || 'Failed to update comment'
            };
        }
    }
    
    /**
     * Delete a comment
     * @param {string} commentId - Comment ID to delete
     * @returns {Promise} - Promise that resolves with result
     */
    static async deleteComment(commentId) {
        try {
            console.log(`💾 SignalsRepository: Deleting comment ${commentId}...`);
            
            // Try to delete via Domo API
            try {
                const response = await domo.delete(`/domo/datastores/v1/collections/SignalAI.Comments/documents/${commentId}`);
                console.log('✅ Comment deleted from API');
                return {
                    success: true,
                    data: { deleted: true, commentId }
                };
            } catch (apiError) {
                console.warn('⚠️ API delete failed, but continuing with optimistic update:', apiError);
                return {
                    success: true,
                    data: { deleted: true, commentId }
                };
            }
            
        } catch (error) {
            console.error('❌ SignalsRepository: Failed to delete comment:', error);
            
            return {
                success: false,
                error: error.message || 'Failed to delete comment'
            };
        }
    }
    
    /**
     * Save a new action plan
     * @param {Object} plan - Action plan data
     * @returns {Promise} - Promise that resolves with saved plan
     */
    static async saveActionPlan(plan) {
        try {
            console.log('💾 SignalsRepository: Saving action plan...');
            
            // Ensure plan has all required fields
            const planToSave = {
                id: plan.id || `plan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                signalId: plan.signalId,
                accountId: plan.accountId,
                title: plan.title,
                description: plan.description || '',
                tasks: plan.tasks || [],
                status: plan.status || 'active',
                userId: plan.userId || 'user-1',
                createdAt: plan.createdAt || new Date().toISOString(),
                updatedAt: plan.updatedAt || new Date().toISOString()
            };
            
            // Try to save to Domo API
            try {
                const response = await domo.post('/domo/datastores/v1/collections/SignalAI.ActionPlans/documents', planToSave);
                console.log('✅ Action plan saved to API:', response);
                return {
                    success: true,
                    data: response || planToSave
                };
            } catch (apiError) {
                console.warn('⚠️ API save failed, but continuing with optimistic update:', apiError);
                return {
                    success: true,
                    data: planToSave
                };
            }
            
        } catch (error) {
            console.error('❌ SignalsRepository: Failed to save action plan:', error);
            
            return {
                success: false,
                error: error.message || 'Failed to save action plan'
            };
        }
    }
    
    /**
     * Update an existing action plan
     * @param {string} planId - Plan ID to update
     * @param {Object} updates - Plan updates
     * @returns {Promise} - Promise that resolves with updated plan
     */
    static async updateActionPlan(planId, updates) {
        try {
            console.log(`💾 SignalsRepository: Updating action plan ${planId}...`);
            
            // Try to update via Domo API
            try {
                const response = await domo.put(`/domo/datastores/v1/collections/SignalAI.ActionPlans/documents/${planId}`, updates);
                console.log('✅ Action plan updated in API:', response);
                return {
                    success: true,
                    data: response || { ...updates, id: planId }
                };
            } catch (apiError) {
                console.warn('⚠️ API update failed, but continuing with optimistic update:', apiError);
                return {
                    success: true,
                    data: { ...updates, id: planId }
                };
            }
            
        } catch (error) {
            console.error('❌ SignalsRepository: Failed to update action plan:', error);
            
            return {
                success: false,
                error: error.message || 'Failed to update action plan'
            };
        }
    }
    
    /**
     * Delete an action plan
     * @param {string} planId - Plan ID to delete
     * @returns {Promise} - Promise that resolves with result
     */
    static async deleteActionPlan(planId) {
        try {
            console.log(`💾 SignalsRepository: Deleting action plan ${planId}...`);
            
            // Try to delete via Domo API
            try {
                const response = await domo.delete(`/domo/datastores/v1/collections/SignalAI.ActionPlans/documents/${planId}`);
                console.log('✅ Action plan deleted from API');
                return {
                    success: true,
                    data: { deleted: true, planId }
                };
            } catch (apiError) {
                console.warn('⚠️ API delete failed, but continuing with optimistic update:', apiError);
                return {
                    success: true,
                    data: { deleted: true, planId }
                };
            }
            
        } catch (error) {
            console.error('❌ SignalsRepository: Failed to delete action plan:', error);
            
            return {
                success: false,
                error: error.message || 'Failed to delete action plan'
            };
        }
    }
    
    /**
     * Get default interactions for fallback
     */
    static getDefaultInteractions() {
        console.log('📦 Using default interactions (empty)');
        // Return empty array for now - in production, you could load from a JSON file
        // or return some sample interactions for demo purposes
        return [];
    }
    
    /**
     * Get default comments for fallback
     */
    static getDefaultComments() {
        console.log('📦 Using default comments (empty)');
        // Return empty array for now - in production, you could load from a JSON file
        // or return some sample comments for demo purposes
        return [];
    }
    
    /**
     * Get default user info for fallback
     */
    static getDefaultUserInfo() {
        console.log('📦 Using default user info');
        return {
            userId: 'user-1',
            userName: 'Current User',
            email: 'user@example.com'
        };
    }
}

// Make globally available
window.SignalsRepository = SignalsRepository;