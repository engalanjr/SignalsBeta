// GongCallsRepository - Handles Gong Calls data operations
class GongCallsRepository {
    
    /**
     * Load Gong Calls from API or CSV fallback
     * @returns {Promise} - Promise that resolves with calls data
     */
    static async loadGongCalls() {
        try {
            console.log('📞 GongCallsRepository: Starting Gong Calls data load...');
            const startTime = performance.now();
            
            // Try Domo API first
            const calls = await this.loadGongCallsFromAPI();
            
            // Normalize and create indexes
            const normalized = this.normalizeGongCalls(calls);
            
            const loadTime = performance.now() - startTime;
            console.log(`⚡ Gong Calls load completed in ${loadTime.toFixed(2)}ms`);
            
            // Dispatch to store via Actions
            dispatcher.dispatch(Actions.gongCallsLoaded(
                normalized.calls,
                normalized.callsByAccount,
                normalized.callsByOpportunity
            ));
            
            return normalized;
            
        } catch (error) {
            console.error('❌ Failed to load Gong Calls:', error);
            dispatcher.dispatch(Actions.gongCallsLoadFailed(error));
            throw error;
        }
    }
    
    /**
     * Load Gong Calls from Domo API with CSV fallback
     */
    static async loadGongCallsFromAPI() {
        try {
            console.log('📡 Loading Gong Calls from API...');
            const response = await domo.get('/data/v1/calls');
            
            if (response && response.length > 0) {
                console.log(`✅ Loaded ${response.length} Gong calls from Domo API`);
                return response;
            } else {
                console.warn('⚠️ No calls from API, using CSV fallback');
                return await this.loadGongCallsCSV();
            }
        } catch (error) {
            console.error('❌ Failed to load Gong Calls from API:', error);
            console.warn('Falling back to CSV data');
            return await this.loadGongCallsCSV();
        }
    }
    
    /**
     * Load Gong Calls CSV fallback data
     */
    static async loadGongCallsCSV() {
        try {
            console.log('Loading Gong Calls CSV data...');
            
            const cacheBuster = `?v=${Date.now()}`;
            const response = await fetch(`./AccountSignalGongCalls.csv${cacheBuster}`);
            
            if (!response.ok) {
                throw new Error(`Failed to load CSV: ${response.status}`);
            }
            
            const csvText = await response.text();
            console.log('Gong Calls CSV loaded successfully, length:', csvText.length);
            
            const parsedData = this.parseCSV(csvText);
            console.log(`Parsed ${parsedData.length} Gong call records from CSV`);
            
            // Transform CSV data to entity model
            const transformedCalls = parsedData.map(row => this.transformCSVRowToEntity(row));
            
            return transformedCalls;
        } catch (error) {
            console.error('Error loading Gong Calls CSV:', error);
            return [];
        }
    }
    
    /**
     * Parse CSV text into raw data
     */
    static parseCSV(csvText) {
        console.log('🔍 Parsing Gong Calls CSV with stateful tokenizer...');
        const startTime = performance.now();
        
        const rows = this.tokenizeCSV(csvText);
        
        if (rows.length === 0) {
            console.warn('⚠️ No rows found in CSV');
            return [];
        }
        
        const headers = rows[0];
        console.log(`📋 Parsed ${headers.length} header columns from CSV`);
        
        const data = [];
        
        for (let i = 1; i < rows.length; i++) {
            const values = rows[i];
            const row = {};

            // Build row object from headers and values
            for (let j = 0; j < headers.length; j++) {
                const header = headers[j];
                const value = values[j] || '';
                row[header] = value;
            }

            data.push(row);
        }
        
        const parseTime = performance.now() - startTime;
        console.log(`⚡ CSV parsing completed in ${parseTime.toFixed(2)}ms`);
        
        return data;
    }
    
    /**
     * Stateful CSV tokenizer
     */
    static tokenizeCSV(csvText) {
        const rows = [];
        let currentRow = [];
        let currentField = '';
        let inQuotes = false;
        let i = 0;
        
        console.log('🔄 Tokenizing CSV...');
        
        while (i < csvText.length) {
            const char = csvText[i];
            const nextChar = csvText[i + 1];
            
            if (char === '"') {
                if (inQuotes && nextChar === '"') {
                    currentField += '"';
                    i += 2;
                    continue;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                currentRow.push(currentField);
                currentField = '';
            } else if ((char === '\n' || char === '\r') && !inQuotes) {
                currentRow.push(currentField);
                
                if (currentRow.some(field => field.trim() !== '')) {
                    rows.push(currentRow);
                }
                
                currentRow = [];
                currentField = '';
                
                if (char === '\r' && nextChar === '\n') {
                    i++;
                }
            } else {
                currentField += char;
            }
            
            i++;
        }
        
        if (currentField !== '' || currentRow.length > 0) {
            currentRow.push(currentField);
            if (currentRow.some(field => field.trim() !== '')) {
                rows.push(currentRow);
            }
        }
        
        console.log(`✅ Tokenized ${rows.length} rows`);
        return rows;
    }
    
    /**
     * Transform CSV row to GongCall entity model
     */
    static transformCSVRowToEntity(row) {
        return {
            // Core identifiers
            callId: row['Call Id'] || '',
            accountId: row['Account ID'] || row['account_id'] || '',
            opportunityId: row['Opportunity ID'] || '',
            
            // Call metadata
            callTitle: row['Call Title'] || '',
            callUrl: row['Call URL'] || '',
            callScheduledDate: row['Call Scheduled Date'] || '',
            callScheduledDateTime: row['Call Scheduled DateTime'] || '',
            
            // Duration fields
            callDurationSec: row['Call Duration (Sec)'] || '',
            callDurationMin: row['Call Duration (Min)'] || '',
            callDurationFormatted: row['Call Duration (Formatted)'] || '',
            
            // Meeting information
            meetingType: row['Meeting Type'] || '',
            callAttendees: row['Call Attendees'] || '',
            callAttendeesEnriched: row['Call Attendees Enriched'] || '',
            callAttendeesSimple: row['Call Attendees (Simple)'] || '',
            
            // Content
            callRecap: row['Call Recap'] || '',
            
            // Call owner
            callOwnerId: row['Call Owner ID'] || '',
            callOwnerFullName: row['Call Owner Full Name'] || '',
            callOwnerEmail: row['Call Owner Email'] || '',
            
            // Account details
            accountName: row['Account Name'] || '',
            customerWebsite: row['Customer Website'] || '',
            customerTenure: row['Customer Tenure'] || '',
            customerIndustry: row['Customer Industry'] || '',
            customerEmployees: row['Customer Employees'] || '',
            customerRevenueBand: row['Customer Revenue Band'] || '',
            
            // Opportunity details
            opportunityName: row['Opportunity Name'] || '',
            opportunityType: row['Opportunity Type'] || '',
            opportunityLeadType: row['Opportunity Lead Type'] || '',
            opportunityStage: row['Opportunity Stage'] || '',
            opportunityOwner: row['Opportunity Owner'] || '',
            opportunityCloseDate: row['Opportunity Close Date'] || '',
            
            // Financial
            arr: row['ARR'] || '',
            consumptionFlag: row['Consumption Flag'] || '',
            salesTeam: row['sales team'] || '',
            
            // Opportunity pipeline stage dates
            stageDatePrePipeline: row['StageDate1 Pre-Pipeline'] || '',
            stageDateDetermineNeeds: row['StageDate2 Determine Needs'] || '',
            stageDateDemonstrateValue: row['StageDate3 Demonstrate Value'] || '',
            stageDateConfirmSolution: row['StageDate4 Confirm Solution'] || '',
            stageDateNegotiations: row['StageDate5 Negotiations'] || '',
            stageDateClosedWon: row['StageDate Closed Won'] || '',
            stageDateClosedLost: row['StageDate Closed Lost'] || ''
        };
    }
    
    /**
     * Normalize Gong Calls data and create relationship indexes
     */
    static normalizeGongCalls(rawCalls) {
        console.log('🔄 Normalizing Gong Calls data...');
        
        const calls = new Map();
        const callsByAccount = new Map();
        const callsByOpportunity = new Map();
        
        rawCalls.forEach(call => {
            const callId = call.callId;
            const accountId = call.accountId;
            const opportunityId = call.opportunityId;
            
            // Store call by ID
            if (callId) {
                calls.set(callId, call);
                
                // Index by account
                if (accountId) {
                    if (!callsByAccount.has(accountId)) {
                        callsByAccount.set(accountId, new Set());
                    }
                    callsByAccount.get(accountId).add(callId);
                }
                
                // Index by opportunity
                if (opportunityId) {
                    if (!callsByOpportunity.has(opportunityId)) {
                        callsByOpportunity.set(opportunityId, new Set());
                    }
                    callsByOpportunity.get(opportunityId).add(callId);
                }
            }
        });
        
        console.log(`✅ Normalized ${calls.size} calls`);
        console.log(`📊 Indexed ${callsByAccount.size} accounts with calls`);
        console.log(`📊 Indexed ${callsByOpportunity.size} opportunities with calls`);
        
        return {
            calls,
            callsByAccount,
            callsByOpportunity
        };
    }
    
    /**
     * Query Methods - Use SignalsStore for data access
     */
    
    /**
     * Get a single call by ID
     */
    static getCallById(callId) {
        if (typeof signalsStore === 'undefined') {
            console.error('SignalsStore not available');
            return null;
        }
        return signalsStore.getGongCall(callId);
    }
    
    /**
     * Get all calls for an account
     */
    static getCallsByAccount(accountId) {
        if (typeof signalsStore === 'undefined') {
            console.error('SignalsStore not available');
            return [];
        }
        return signalsStore.getGongCallsByAccount(accountId);
    }
    
    /**
     * Get all calls for an opportunity
     */
    static getCallsByOpportunity(opportunityId) {
        if (typeof signalsStore === 'undefined') {
            console.error('SignalsStore not available');
            return [];
        }
        return signalsStore.getGongCallsByOpportunity(opportunityId);
    }
    
    /**
     * Get all calls
     */
    static getAllCalls() {
        if (typeof signalsStore === 'undefined') {
            console.error('SignalsStore not available');
            return [];
        }
        return signalsStore.getAllGongCalls();
    }
    
    /**
     * Get calls by date range
     */
    static getCallsByDateRange(startDate, endDate) {
        const allCalls = this.getAllCalls();
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        return allCalls.filter(call => {
            if (!call.callScheduledDateTime) return false;
            const callDate = new Date(call.callScheduledDateTime);
            return callDate >= start && callDate <= end;
        });
    }
    
    /**
     * Get calls by owner
     */
    static getCallsByOwner(ownerId) {
        const allCalls = this.getAllCalls();
        return allCalls.filter(call => call.callOwnerId === ownerId);
    }
    
    /**
     * Search calls by query string
     * Searches in: callTitle, callRecap, accountName
     */
    static searchCalls(query) {
        if (!query || query.trim() === '') {
            return this.getAllCalls();
        }
        
        const allCalls = this.getAllCalls();
        const lowerQuery = query.toLowerCase();
        
        return allCalls.filter(call => {
            const titleMatch = call.callTitle && call.callTitle.toLowerCase().includes(lowerQuery);
            const recapMatch = call.callRecap && call.callRecap.toLowerCase().includes(lowerQuery);
            const accountMatch = call.accountName && call.accountName.toLowerCase().includes(lowerQuery);
            
            return titleMatch || recapMatch || accountMatch;
        });
    }
    
    /**
     * Get calls by meeting type
     */
    static getCallsByMeetingType(meetingType) {
        const allCalls = this.getAllCalls();
        return allCalls.filter(call => call.meetingType === meetingType);
    }
    
    /**
     * Get recent calls (last N days)
     */
    static getRecentCalls(days = 30) {
        const allCalls = this.getAllCalls();
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        
        return allCalls.filter(call => {
            if (!call.callScheduledDateTime) return false;
            const callDate = new Date(call.callScheduledDateTime);
            return callDate >= cutoffDate;
        }).sort((a, b) => {
            // Sort by date descending (most recent first)
            const dateA = new Date(a.callScheduledDateTime);
            const dateB = new Date(b.callScheduledDateTime);
            return dateB - dateA;
        });
    }
}

