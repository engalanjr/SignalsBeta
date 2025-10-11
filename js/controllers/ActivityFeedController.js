// ActivityFeedController - Unified feed for Gong calls and notes
class ActivityFeedController {
    constructor() {
        this.activities = [];
        this.filteredActivities = [];
        this.filters = {
            accountId: 'all',
            dateRange: 'all', // 'today', 'week', 'month', '90days', 'all', 'custom'
            customStartDate: null,
            customEndDate: null,
            type: 'all' // 'all', 'gong', 'notes'
        };
        this.isDataLoaded = false;
        this.gongCallsLoaded = false;
        console.log('📊 ActivityFeedController initialized');
    }
    
    async initialize() {
        console.log('🔄 ActivityFeedController: Loading data...');
        
        try {
            // Load Gong Calls if not already loaded
            if (!this.gongCallsLoaded) {
                console.log('📞 Loading Gong calls...');
                await GongCallsRepository.loadGongCalls();
                this.gongCallsLoaded = true;
            }
            
            // Get notes from store
            const notes = signalsStore.getAllNotes();
            const gongCalls = signalsStore.getAllGongCalls();
            
            console.log(`📊 Loaded ${gongCalls.length} Gong calls and ${notes.length} notes`);
            
            // Warn if no Gong calls loaded
            if (gongCalls.length === 0) {
                console.warn('⚠️ No Gong calls loaded. Possible reasons:');
                console.warn('   1. No Domo dataset mapped to /data/v1/calls');
                console.warn('   2. Dataset exists but is empty');
                console.warn('   3. CSV fallback file not deployed (expected in production)');
                console.warn('💡 To fix: Map your Gong calls dataset to /data/v1/calls in Domo App settings');
            }
            
            // Merge activities
            this.activities = this.mergeActivities(gongCalls, notes);
            this.filteredActivities = [...this.activities];
            
            this.isDataLoaded = true;
            
            // Subscribe to global filter changes
            this.subscribeToGlobalFilters();
            
            console.log(`✅ Activity Feed initialized with ${this.activities.length} total activities`);
            
        } catch (error) {
            console.error('❌ Failed to initialize Activity Feed:', error);
            throw error;
        }
    }
    
    /**
     * Subscribe to global filter changes
     */
    subscribeToGlobalFilters() {
        if (!window.globalFilters) {
            console.warn('⚠️ GlobalFilters not available, skipping subscription');
            return;
        }
        
        // Listen for filter changes via store events
        signalsStore.subscribe('filters:changed', () => {
            console.log('🌐 Activity Feed: Global filters changed, re-applying filters');
            this.applyFilters();
            
            // Check if currently selected account is still available after global filtering
            if (this.filters.accountId && this.filters.accountId !== 'all') {
                const availableAccounts = this.getUniqueAccounts();
                const isStillAvailable = availableAccounts.some(acc => acc.id === this.filters.accountId);
                
                if (!isStillAvailable) {
                    console.log(`⚠️ Selected account ${this.filters.accountId} filtered out by global filters, resetting to 'all'`);
                    this.filters.accountId = 'all';
                    this.applyFilters(); // Re-apply without account filter
                }
            }
            
            // Re-render if already rendered
            if (this.isDataLoaded) {
                const container = document.getElementById('activity-feed');
                if (container && container.classList.contains('active')) {
                    const accounts = this.getUniqueAccounts();
                    ActivityFeedRenderer.render(container, this.filteredActivities, this.filters, accounts, this);
                }
            }
        });
        
        console.log('✅ Activity Feed subscribed to global filter changes');
    }
    
    /**
     * Merge Gong calls and notes into unified activity format
     */
    mergeActivities(gongCalls, notes) {
        const activities = [];
        
        // Get portfolio data for account metadata enrichment
        const portfolioData = signalsStore.getState().portfolioData || [];
        const portfolioMap = new Map();
        portfolioData.forEach(account => {
            const accountId = account.bks_account_id || account['Account Id'];
            if (accountId) {
                portfolioMap.set(accountId, account);
            }
        });
        
        // Transform Gong calls
        gongCalls.forEach(call => {
            const activity = {
                id: `gong-${call.callId}`,
                type: 'gong',
                accountId: call.accountId,
                accountName: call.accountName || 'Unknown Account',
                title: call.callTitle || 'Untitled Call',
                content: call.callRecap || 'No recap available',
                date: call.callScheduledDateTime ? new Date(call.callScheduledDateTime) : new Date(),
                metadata: {
                    attendees: this.parseAttendees(call.callAttendeesSimple),
                    duration: call.callDurationFormatted || call.callDurationMin || '',
                    meetingType: call.meetingType || '',
                    callUrl: call.callUrl || '',
                    owner: call.callOwnerFullName || '',
                    opportunityName: call.opportunityName || ''
                },
                rawData: call
            };
            
            // Enrich with account metadata for global filtering
            activity.accountMetadata = this.extractAccountMetadata(call.accountId, portfolioMap);
            
            activities.push(activity);
        });
        
        // Transform notes
        notes.forEach(note => {
            // Skip deleted notes
            if (note.deletedAt) return;
            
            const activity = {
                id: `note-${note.id}`,
                type: 'note',
                accountId: note.accountId,
                accountName: note.accountName || 'Unknown Account',
                title: note.title || 'Untitled Note',
                content: this.truncateContent(note.bodyPlain || note.body || '', 255),
                date: note.meetingDate ? new Date(note.meetingDate) : new Date(note.createdAt),
                metadata: {
                    author: note.authorName || 'Unknown',
                    visibility: note.visibility || 'team',
                    pinned: note.pinned || false,
                    createdAt: note.createdAt,
                    updatedAt: note.updatedAt
                },
                rawData: note
            };
            
            // Enrich with account metadata for global filtering
            activity.accountMetadata = this.extractAccountMetadata(note.accountId, portfolioMap);
            
            activities.push(activity);
        });
        
        // Sort by date descending (most recent first)
        activities.sort((a, b) => b.date - a.date);
        
        // Debug: Log tier distribution
        const tierCounts = { tier1: 0, tier2: 0, tier3: 0, tier4: 0, null: 0 };
        activities.forEach(activity => {
            const tier = activity.accountMetadata?.tier || 'null';
            tierCounts[tier] = (tierCounts[tier] || 0) + 1;
        });
        console.log(`📊 Merged ${activities.length} activities (${gongCalls.length} calls + ${notes.filter(n => !n.deletedAt).length} notes)`);
        console.log(`📊 Tier distribution:`, tierCounts);
        
        return activities;
    }
    
    /**
     * Extract account metadata for filtering
     */
    extractAccountMetadata(accountId, portfolioMap) {
        const account = portfolioMap.get(accountId);
        
        if (!account) {
            return null; // No portfolio data for this account
        }
        
        // Extract key fields
        const renewalQuarter = account.bks_fq || '';
        const renewalDate = account.bks_renewal_date || '';
        const renewalAmount = parseFloat(account.bks_renewal_baseline_usd || 0);
        
        // Calculate tier using same logic as GlobalFilters.getAccountTier()
        let tier = null;
        if (window.globalFilters) {
            // Ensure tierThresholds are calculated
            if (!window.globalFilters.tierThresholds) {
                const portfolioData = signalsStore.getState().portfolioData || [];
                if (portfolioData.length > 0) {
                    window.globalFilters.calculateTierThresholds(portfolioData);
                }
            }
            
            tier = window.globalFilters.getAccountTier(account);
        }
        
        return {
            renewalQuarter,
            renewalDate,
            renewalAmount,
            tier, // Will be 'tier1', 'tier2', 'tier3', or 'tier4'
            account // Store full account for contract stage checks
        };
    }
    
    /**
     * Parse attendees string into array
     */
    parseAttendees(attendeesStr) {
        if (!attendeesStr) return [];
        return attendeesStr.split(',').map(name => name.trim()).filter(name => name);
    }
    
    /**
     * Truncate content to specified length
     */
    truncateContent(content, maxLength) {
        if (!content) return '';
        if (content.length <= maxLength) return content;
        return content.substring(0, maxLength) + '...';
    }
    
    /**
     * Apply filters to activities
     */
    applyFilters() {
        let filtered = [...this.activities];
        
        // Apply local filters first
        
        // Filter by account
        if (this.filters.accountId && this.filters.accountId !== 'all') {
            filtered = filtered.filter(activity => activity.accountId === this.filters.accountId);
        }
        
        // Filter by type
        if (this.filters.type && this.filters.type !== 'all') {
            filtered = filtered.filter(activity => activity.type === this.filters.type);
        }
        
        // Filter by date range
        if (this.filters.dateRange !== 'all') {
            const now = new Date();
            let startDate = null;
            
            switch (this.filters.dateRange) {
                case 'today':
                    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                    break;
                case 'week':
                    startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                    break;
                case 'month':
                    startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                    break;
                case '90days':
                    startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
                    break;
                case 'custom':
                    if (this.filters.customStartDate && this.filters.customEndDate) {
                        filtered = filtered.filter(activity => {
                            return activity.date >= this.filters.customStartDate && 
                                   activity.date <= this.filters.customEndDate;
                        });
                    }
                    break;
            }
            
            if (startDate && this.filters.dateRange !== 'custom') {
                filtered = filtered.filter(activity => activity.date >= startDate);
            }
        }
        
        // Apply global filters if available
        if (window.globalFilters) {
            const beforeGlobalFilter = filtered.length;
            filtered = filtered.filter(activity => this.matchesGlobalFilters(activity));
            console.log(`🌐 Global filters applied: ${beforeGlobalFilter} → ${filtered.length} activities`);
        }
        
        this.filteredActivities = filtered;
        console.log(`🔍 Total filtered to ${filtered.length} activities`);
        
        return filtered;
    }
    
    /**
     * Check if activity matches global filters
     */
    matchesGlobalFilters(activity) {
        if (!activity.accountMetadata) {
            // No account metadata - include by default
            return true;
        }
        
        const globalFilters = window.globalFilters;
        
        // Check contract stage filter
        if (globalFilters.currentFilters.contractStage !== 'all') {
            if (!this.matchesContractStage(activity)) {
                return false;
            }
        }
        
        // Check rank in book filter
        if (globalFilters.currentFilters.rankInBook !== 'all') {
            if (!this.matchesRankInBook(activity)) {
                return false;
            }
        }
        
        return true;
    }
    
    /**
     * Check if activity matches contract stage filter
     */
    matchesContractStage(activity) {
        const metadata = activity.accountMetadata;
        if (!metadata || !metadata.account) return false;
        
        const globalFilters = window.globalFilters;
        const account = metadata.account;
        
        // Use GlobalFilters' matchesContractStage method
        return globalFilters.matchesContractStage(account);
    }
    
    /**
     * Check if activity matches rank in book filter
     */
    matchesRankInBook(activity) {
        const metadata = activity.accountMetadata;
        if (!metadata || !metadata.tier) {
            console.log(`⚠️ Activity ${activity.id} has no tier metadata`);
            return false;
        }
        
        const globalFilters = window.globalFilters;
        const selectedTier = globalFilters.currentFilters.rankInBook;
        
        // Debug first activity
        if (this._firstTierDebug !== selectedTier) {
            console.log(`🔍 Tier filter debug - Selected: '${selectedTier}', Activity tier: '${metadata.tier}', Match: ${metadata.tier === selectedTier}`);
            this._firstTierDebug = selectedTier;
        }
        
        // Match the selected tier (tier values are strings: 'tier1', 'tier2', 'tier3', 'tier4')
        return metadata.tier === selectedTier;
    }
    
    /**
     * Set filter and re-render
     */
    setFilter(filterType, value) {
        this.filters[filterType] = value;
        
        // Save filters to localStorage
        try {
            localStorage.setItem('activityFeed_filters', JSON.stringify(this.filters));
        } catch (e) {
            console.warn('Failed to save filters to localStorage:', e);
        }
        
        this.applyFilters();
        this.render();
    }
    
    /**
     * Clear all filters
     */
    clearFilters() {
        this.filters = {
            accountId: 'all',
            dateRange: 'all',
            customStartDate: null,
            customEndDate: null,
            type: 'all'
        };
        
        localStorage.removeItem('activityFeed_filters');
        
        this.applyFilters();
        this.render();
    }
    
    /**
     * Load filters from localStorage
     */
    loadSavedFilters() {
        try {
            const saved = localStorage.getItem('activityFeed_filters');
            if (saved) {
                const filters = JSON.parse(saved);
                // Convert date strings back to Date objects
                if (filters.customStartDate) {
                    filters.customStartDate = new Date(filters.customStartDate);
                }
                if (filters.customEndDate) {
                    filters.customEndDate = new Date(filters.customEndDate);
                }
                this.filters = { ...this.filters, ...filters };
            }
        } catch (e) {
            console.warn('Failed to load saved filters:', e);
        }
    }
    
    /**
     * Get unique accounts from activities (respecting global filters)
     */
    getUniqueAccounts() {
        const accountsMap = new Map();
        
        // Use filteredActivities if global filters are active, otherwise use all activities
        const activitiesToScan = window.globalFilters && 
                                  (window.globalFilters.currentFilters.contractStage !== 'all' || 
                                   window.globalFilters.currentFilters.rankInBook !== 'all')
            ? this.filteredActivities
            : this.activities;
        
        activitiesToScan.forEach(activity => {
            if (activity.accountId && activity.accountName) {
                accountsMap.set(activity.accountId, activity.accountName);
            }
        });
        
        return Array.from(accountsMap.entries())
            .map(([id, name]) => ({ id, name }))
            .sort((a, b) => a.name.localeCompare(b.name));
    }
    
    /**
     * Render the activity feed
     */
    async render() {
        const container = document.getElementById('activity-feed');
        if (!container) {
            console.error('Activity feed container not found');
            return;
        }
        
        // Initialize if not loaded
        if (!this.isDataLoaded) {
            await this.initialize();
        }
        
        // Load saved filters
        this.loadSavedFilters();
        
        // Apply filters
        this.applyFilters();
        
        // Get unique accounts for filter dropdown
        const accounts = this.getUniqueAccounts();
        
        // Render using ActivityFeedRenderer
        ActivityFeedRenderer.render(container, this.filteredActivities, this.filters, accounts, this);
    }
    
    /**
     * Handle activity click
     */
    handleActivityClick(activityId) {
        const activity = this.activities.find(a => a.id === activityId);
        if (!activity) return;
        
        if (activity.type === 'gong') {
            this.openGongCallDetails(activity);
        } else if (activity.type === 'note') {
            this.openNoteDetails(activity);
        }
    }
    
    /**
     * Open Gong call details
     */
    openGongCallDetails(activity) {
        if (activity.metadata.callUrl) {
            window.open(activity.metadata.callUrl, '_blank');
        } else {
            console.log('Gong call details:', activity.rawData);
            // Could open a modal with full details
        }
    }
    
    /**
     * Open note details
     */
    openNoteDetails(activity) {
        // Use the existing notes controller to edit
        if (window.notesController) {
            const noteId = activity.id.replace('note-', '');
            dispatcher.dispatch(Actions.selectNote(noteId));
            // Could switch to notes tab or open modal
            dispatcher.dispatch(Actions.switchTab('signal-notes'));
        }
    }
    
    /**
     * Navigate to account in portfolio
     */
    navigateToAccount(accountId) {
        console.log('Navigating to account:', accountId);
        
        // Set global filter for the account
        if (window.GlobalFilters) {
            GlobalFilters.setRenewalQuarterFilter(accountId);
        }
        
        // Switch to portfolio tab
        dispatcher.dispatch(Actions.switchTab('my-portfolio'));
    }
}

