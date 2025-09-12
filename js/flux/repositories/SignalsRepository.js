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
            
            // Log complete header row without truncation
            const firstNewlineIndex = csvText.indexOf('\n');
            const headerRow = csvText.slice(0, firstNewlineIndex);
            console.log('Complete CSV headers (' + firstNewlineIndex + ' chars):', headerRow);
            
            // Parse the CSV
            const parsedData = this.parseCSV(csvText);
            console.log(`Parsed ${parsedData.length} records from master CSV`);
            
            // Log unmapped fields discovered across multiple records
            if (parsedData.length > 0) {
                const allUnmappedFields = new Set();
                const sampleSize = Math.min(100, parsedData.length);
                
                // Aggregate unmapped fields from first 100 records
                for (let i = 0; i < sampleSize; i++) {
                    if (parsedData[i].extras) {
                        Object.keys(parsedData[i].extras).forEach(field => allUnmappedFields.add(field));
                    }
                }
                
                const unmappedFieldsArray = Array.from(allUnmappedFields).sort();
                if (unmappedFieldsArray.length > 0) {
                    console.log(`🆕 Discovered ${unmappedFieldsArray.length} unmapped CSV columns across ${sampleSize} records:`, unmappedFieldsArray);
                } else {
                    console.log(`✅ All CSV columns are properly mapped to the data model (checked ${sampleSize} records)`);
                }
            }
            
            return parsedData;
        } catch (error) {
            console.error('Error loading master CSV:', error);
            // Fall back to sample data if CSV loading fails
            return this.getSampleData();
        }
    }
    
    /**
     * Known fields that we explicitly map in parseDomoResponse
     */
    static KNOWN_FIELDS = new Set([
        // Core signal fields
        'id', 'Signal Id', 'account_id', 'Account Id', 'account id', 'account_name', 'category', 'code', 'name', 'summary', 'rationale', 'priority', 'confidence', 'action_context',
        
        // Account metrics and status
        'at_risk_cat', 'account_gpa', 'Account GPA', 'Account GPA Table Card Column', 'account_gpa_numeric', 'Account GPA Numeric', 'health_score', 'Health Score',
        
        // Financial metrics
        'total_lifetime_billings', 'Total Lifetime Billings', 'bks_renewal_baseline_usd', 'bks_forecast_new', 'bks_forecast_delta', 'bks_status_grouping', 'pacing_percent', '% Pacing', 'bks_fq', 'rank',
        
        // Usage metrics
        'daily_active_users', 'Daily Active Users (DAU)', 'weekly_active_users', 'Weekly Active Users (WAU)', 'monthly_active_users', 'Monthly Active Users (MAU)',
        'total_data_sets', 'Total Data Sets', 'total_rows', 'Total Rows', 'dataflows', 'Dataflows', 'cards', 'Cards', 'is_consumption', 'is Consumption',
        
        // Account information
        'industry', 'Industry (Domo)', 'customer_tenure_years', 'Customer Tenure (Years)', 'type_of_next_renewal', 'Type of Next Renewal', 'numeric_grade', 'Numeric Grade',
        
        // GPA component values (numeric)
        'relationship_value', 'Relationship - Value', 'content_creation_value', 'Content Creation - Value', 'user_engagement_value', 'User Engagement - Value',
        'support_value', 'Support - Value', 'commercial_value', 'Commercial - Value', 'education_value', 'Education - Value',
        'platform_utilization_value', 'Platform Utilization - Value', 'value_realization_value', 'Value Realization - Value',
        
        // GPA component grades (letter grades)
        'Relationship', 'Content Creation', 'User Engagement', 'Support', 'Commercial', 'Education', 'Platform Utilization', 'Value Realization',
        
        // Historical metrics
        'prior_account_gpa_numeric', 'Prior Account GPA Numeric', 'Prior Value', 'day_180_gpa_trend', '180 Day GPA Trend', 'Data Source',
        
        // Account ownership and contacts
        'account_owner', 'Account Owner', 'avp', 'AVP', 'rvp', 'RVP', 'ae', 'AE', 'csm', 'CSM', 'ae_email', 'AE Email', 'CSM Manager', 'level 3 leader', 'next_renewal_date', 'Next Renewal Date',
        
        // AI and recommendation fields
        'recommended_action', 'signal_rationale', 'signal_confidence', 'action_id',
        'AI Signal Context', 'AI Account Signal Context', 'AI Account Signal Context Rationale', 'Account Action Context', 'Account Action Context Rationale',
        
        // CS Play basic fields
        'play_1', 'play_2', 'play_3', 'Play 1 Name', 'Play 1 Description', 'Play 2 Name', 'Play 2 Description', 'Play 3 Name', 'Play 3 Description',
        
        // CS Play detailed metadata
        'play_1_description', 'play_1_play_type', 'play_1_initiating_role', 'play_1_executing_role', 'play_1_doc_location',
        'play_2_description', 'play_2_play_type', 'play_2_initiating_role', 'play_2_executing_role', 'play_2_doc_location', 
        'play_3_description', 'play_3_play_type', 'play_3_initiating_role', 'play_3_executing_role', 'play_3_doc_location',
        
        // Call information
        'call_id', 'call_date', 'call_title', 'call_outcome',
        
        // Signal polarity and timestamps
        'Signal Polarity', 'signal_polarity', 'created_at', 'created_date'
    ]);

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
            account_gpa_table_card_column: item['Account GPA Table Card Column'] || item.account_gpa_table_card_column || '',
            data_source: item['Data Source'] || item.data_source || '',
            rank: parseInt(item.rank) || 0,
            
            // GPA component scores (numeric values)
            relationship_value: parseFloat(item['Relationship - Value'] || item.relationship_value) || 0,
            content_creation_value: parseFloat(item['Content Creation - Value'] || item.content_creation_value) || 0,
            user_engagement_value: parseFloat(item['User Engagement - Value'] || item.user_engagement_value) || 0,
            support_value: parseFloat(item['Support - Value'] || item.support_value) || 0,
            commercial_value: parseFloat(item['Commercial - Value'] || item.commercial_value) || 0,
            education_value: parseFloat(item['Education - Value'] || item.education_value) || 0,
            platform_utilization_value: parseFloat(item['Platform Utilization - Value'] || item.platform_utilization_value) || 0,
            value_realization_value: parseFloat(item['Value Realization - Value'] || item.value_realization_value) || 0,
            
            // GPA component grades (letter grades)
            relationship_grade: item['Relationship'] || item.relationship_grade || '',
            content_creation_grade: item['Content Creation'] || item.content_creation_grade || '',
            user_engagement_grade: item['User Engagement'] || item.user_engagement_grade || '',
            support_grade: item['Support'] || item.support_grade || '',
            commercial_grade: item['Commercial'] || item.commercial_grade || '',
            education_grade: item['Education'] || item.education_grade || '',
            platform_utilization_grade: item['Platform Utilization'] || item.platform_utilization_grade || '',
            value_realization_grade: item['Value Realization'] || item.value_realization_grade || '',
            
            // Historical metrics
            prior_account_gpa_numeric: parseFloat(item['Prior Account GPA Numeric'] || item.prior_account_gpa_numeric) || 0,
            prior_value: parseFloat(item['Prior Value'] || item.prior_value) || 0,
            day_180_gpa_trend: parseFloat(item['180 Day GPA Trend'] || item.day_180_gpa_trend) || 0,
            
            // Account ownership and contacts
            account_owner: item['Account Owner'] || item.account_owner || '',
            avp: item['AVP'] || item.avp || '',
            rvp: item['RVP'] || item.rvp || '',
            ae: item['AE'] || item.ae || '',
            csm: item['CSM'] || item.csm || '',
            ae_email: item['AE Email'] || item.ae_email || '',
            csm_manager: item['CSM Manager'] || item.csm_manager || '',
            level_3_leader: item['level 3 leader'] || item.level_3_leader || '',
            next_renewal_date: item['Next Renewal Date'] || item.next_renewal_date || '',
            
            // Recommendation and action fields
            recommended_action: item.recommended_action || '',
            signal_rationale: item.signal_rationale || '',
            signal_confidence: item.signal_confidence || '',
            action_id: item.action_id || '',
            
            // AI context fields
            ai_signal_context: item['AI Signal Context'] || item.ai_signal_context || '',
            ai_account_signal_context: item['AI Account Signal Context'] || item.ai_account_signal_context || '',
            ai_account_signal_context_rationale: item['AI Account Signal Context Rationale'] || item.ai_account_signal_context_rationale || '',
            account_action_context: item['Account Action Context'] || item.account_action_context || '',
            account_action_context_rationale: item['Account Action Context Rationale'] || item.account_action_context_rationale || '',
            
            // CS Play basic fields
            play_1: item.play_1 || '',
            play_2: item.play_2 || '',
            play_3: item.play_3 || '',
            'Play 1 Name': item['Play 1 Name'] || '',
            'Play 1 Description': item['Play 1 Description'] || '',
            'Play 2 Name': item['Play 2 Name'] || '',
            'Play 2 Description': item['Play 2 Description'] || '',
            'Play 3 Name': item['Play 3 Name'] || '',
            'Play 3 Description': item['Play 3 Description'] || '',
            
            // CS Play detailed metadata
            play_1_description: item.play_1_description || '',
            play_1_play_type: item.play_1_play_type || '',
            play_1_initiating_role: item.play_1_initiating_role || '',
            play_1_executing_role: item.play_1_executing_role || '',
            play_1_doc_location: item.play_1_doc_location || '',
            play_2_description: item.play_2_description || '',
            play_2_play_type: item.play_2_play_type || '',
            play_2_initiating_role: item.play_2_initiating_role || '',
            play_2_executing_role: item.play_2_executing_role || '',
            play_2_doc_location: item.play_2_doc_location || '',
            play_3_description: item.play_3_description || '',
            play_3_play_type: item.play_3_play_type || '',
            play_3_initiating_role: item.play_3_initiating_role || '',
            play_3_executing_role: item.play_3_executing_role || '',
            play_3_doc_location: item.play_3_doc_location || '',
            
            // Call information
            call_id: item.call_id || '',
            call_date: item.call_date || '',
            call_title: item.call_title || '',
            call_outcome: item.call_outcome || '',
            
            // New fields from comprehensive dataset
            signal_polarity: item['Signal Polarity'] || item.signal_polarity || '',
            
            // Support both created_at (from new CSV) and created_date (legacy)
            created_date: item.created_at || item.created_date || new Date().toISOString(),
            created_at: item.created_at || item.created_date || new Date().toISOString(),
            isViewed: false,
            feedback: null,
            
            // Capture any unmapped fields for discovery
            extras: Object.fromEntries(
                Object.entries(item)
                    .filter(([key]) => !this.KNOWN_FIELDS.has(key))
                    .filter(([key, value]) => value !== '' && value != null)
            )
        }));
    }
    
    /**
     * Parse CSV text into signals data using stateful tokenizer
     */
    static parseCSV(csvText) {
        console.log('🔍 Starting stateful CSV parsing with multi-line field support...');
        const startTime = performance.now();
        
        // Use stateful tokenizer to properly handle quoted newlines
        const rows = this.tokenizeCSV(csvText);
        
        if (rows.length === 0) {
            console.warn('⚠️ No rows found in CSV');
            return [];
        }
        
        const headers = rows[0];
        console.log(`📋 Parsed ${headers.length} header columns from CSV`);
        console.log('📊 CSV parsing stats:', {
            totalRows: rows.length,
            dataRows: rows.length - 1,
            columns: headers.length
        });
        
        const data = [];
        const discoveredFields = new Set();
        const sampleSize = Math.min(100, rows.length - 1); // Check first 100 data rows for field discovery
        
        for (let i = 1; i < rows.length; i++) {
            const values = rows[i];
            const row = {};

            // Build row object from headers and values
            for (let j = 0; j < headers.length; j++) {
                const header = headers[j];
                const value = values[j] || '';
                row[header] = value;
                
                // Track field discovery for first 100 records
                if (i <= sampleSize && value !== '' && value != null) {
                    discoveredFields.add(header);
                }
            }

            // Transform to signal format using parseDomoResponse for consistency
            const signal = this.parseDomoResponse([row])[0];
            
            // Only override ID if not present - preserve actual dates from CSV
            if (!signal.id) {
                signal.id = row['Signal Id'] || `signal-${i}`;
            }
            // Note: Removed created_date override - let parseDomoResponse handle actual CSV dates

            data.push(signal);
        }
        
        const parseTime = performance.now() - startTime;
        console.log(`⚡ CSV parsing completed in ${parseTime.toFixed(2)}ms`);
        console.log(`🆕 Discovered ${discoveredFields.size} total fields across first ${sampleSize} records`);
        
        return data;
    }
    
    /**
     * Stateful CSV tokenizer that properly handles quoted newlines and multi-line fields
     * This replaces parseCSVLine and handles the entire CSV content as a stream
     */
    static tokenizeCSV(csvText) {
        const rows = [];
        let currentRow = [];
        let currentField = '';
        let inQuotes = false;
        let i = 0;
        
        console.log('🔄 Tokenizing CSV with stateful parser...');
        
        while (i < csvText.length) {
            const char = csvText[i];
            const nextChar = csvText[i + 1];
            
            if (char === '"') {
                if (inQuotes && nextChar === '"') {
                    // Handle escaped quotes: "" inside quoted field becomes "
                    currentField += '"';
                    i += 2; // Skip both quotes
                    continue;
                } else {
                    // Toggle quote state
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                // Field separator - end current field
                currentRow.push(currentField);
                currentField = '';
            } else if ((char === '\n' || char === '\r') && !inQuotes) {
                // Row separator - end current row (only when not in quotes)
                currentRow.push(currentField);
                
                if (currentRow.some(field => field.trim() !== '')) {
                    // Only add non-empty rows
                    rows.push(currentRow);
                }
                
                currentRow = [];
                currentField = '';
                
                // Handle \r\n line endings
                if (char === '\r' && nextChar === '\n') {
                    i++; // Skip the \n
                }
            } else {
                // Regular character - add to current field
                currentField += char;
            }
            
            i++;
        }
        
        // Handle the last field and row if not empty
        if (currentField !== '' || currentRow.length > 0) {
            currentRow.push(currentField);
            if (currentRow.some(field => field.trim() !== '')) {
                rows.push(currentRow);
            }
        }
        
        console.log(`✅ Tokenized ${rows.length} rows (including header)`);
        return rows;
    }
    
    /**
     * Legacy method kept for compatibility - now delegates to tokenizeCSV
     * @deprecated Use tokenizeCSV for new implementations
     */
    static parseCSVLine(line) {
        console.warn('⚠️ parseCSVLine is deprecated - use tokenizeCSV for proper multi-line support');
        return this.tokenizeCSV(line + '\n')[0] || [];
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
     * Load action plans from API with local persistence integration
     */
    static async loadActionPlans() {
        let apiPlans = [];
        let localPlans = [];
        
        try {
            console.log('📋 Loading action plans...');
            
            // First, try the API
            const response = await domo.get('/domo/datastores/v1/collections/SignalAI.ActionPlans/documents');
            
            if (response && response.length > 0) {
                console.log(`✅ Loaded ${response.length} action plans from API`);
                apiPlans = response;
            }
            
            // If no API plans, try fallback JSON file
            if (apiPlans.length === 0) {
                console.log('📁 No action plans in API, checking for fallback file...');
                const fallbackResponse = await fetch('./action-plans-fallback.json?v=' + Date.now());
                
                if (fallbackResponse.ok) {
                    const fallbackData = await fallbackResponse.json();
                    if (fallbackData && fallbackData.length > 0) {
                        console.log(`✅ Loaded ${fallbackData.length} action plans from fallback file`);
                        apiPlans = fallbackData;
                    }
                }
            }
            
        } catch (error) {
            console.error('Failed to load action plans from API:', error);
            
            // Try the fallback file as a last resort
            try {
                const fallbackResponse = await fetch('./action-plans-fallback.json?v=' + Date.now());
                if (fallbackResponse.ok) {
                    const fallbackData = await fallbackResponse.json();
                    if (fallbackData && fallbackData.length > 0) {
                        console.log(`✅ Loaded ${fallbackData.length} action plans from fallback (error recovery)`);
                        apiPlans = fallbackData;
                    }
                }
            } catch (fallbackError) {
                console.error('Failed to load fallback action plans:', fallbackError);
            }
        }
        
        // Load local persistence as additional source (integration with ActionPlansService)
        try {
            const localActionPlansData = localStorage.getItem('signalsai_action_plans');
            if (localActionPlansData) {
                const localPlansMap = JSON.parse(localActionPlansData);
                localPlans = Object.values(localPlansMap);
                
                if (localPlans.length > 0) {
                    console.log(`📦 Found ${localPlans.length} locally persisted action plans`);
                }
            }
        } catch (error) {
            console.warn('Could not load locally persisted action plans:', error);
        }
        
        // Merge API/fallback plans with local plans, avoiding duplicates by ID
        const allPlans = [...apiPlans];
        const apiPlanIds = new Set(apiPlans.map(plan => plan.id));
        
        // Add local plans that don't exist in API plans
        localPlans.forEach(localPlan => {
            if (!apiPlanIds.has(localPlan.id)) {
                allPlans.push(localPlan);
                console.log(`🔄 Hydrating locally persisted plan: ${localPlan.id}`);
            }
        });
        
        if (allPlans.length > 0) {
            console.log(`✅ Total action plans loaded: ${allPlans.length} (${apiPlans.length} from API/fallback, ${allPlans.length - apiPlans.length} local-only)`);
        }
        
        return allPlans;
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