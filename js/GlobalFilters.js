// GlobalFilters - Handles global filtering logic for the entire app
class GlobalFilters {
    
    constructor() {
        this.currentFilters = {
            contractStage: 'all', // Show all data initially
            rankInBook: 'all', // Show all data initially
            renewalQuarter: 'all' // Show all data initially
        };
        this.tierThresholds = null; // Will be calculated from data
        this.setupEventListeners();
        this.populateRenewalQuarterFilters();
    }

    /**
     * Setup event listeners for filter changes
     */
    setupEventListeners() {
        // Contract Stage filters
        document.querySelectorAll('input[name="contractStage"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.currentFilters.contractStage = e.target.value;
                this.applyFilters();
            });
        });

        // Rank in MyBook filters
        document.querySelectorAll('input[name="rankInBook"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.currentFilters.rankInBook = e.target.value;
                this.applyFilters();
            });
        });

        // Renewal Quarter filters
        document.querySelectorAll('input[name="renewalQuarter"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.currentFilters.renewalQuarter = e.target.value;
                this.applyFilters();
            });
        });
    }

    /**
     * Populate renewal quarter filters dynamically
     */
    populateRenewalQuarterFilters() {
        const container = document.getElementById('renewalQuarterFilters');
        if (!container) return;

        // Generate current quarter and next 4 quarters
        const quarters = this.generateRenewalQuarters();
        
        const html = quarters.map(quarter => `
            <label class="filter-option">
                <input type="radio" name="renewalQuarter" value="${quarter.value}" ${quarter.value === 'all' ? 'checked' : ''}>
                <span class="checkbox-custom"></span>
                <span class="option-text">${quarter.label}</span>
            </label>
        `).join('');

        container.innerHTML = html;

        // Re-attach event listeners for the new elements
        document.querySelectorAll('input[name="renewalQuarter"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.currentFilters.renewalQuarter = e.target.value;
                this.applyFilters();
            });
        });
    }

    /**
     * Generate renewal quarters (current + next 4)
     */
    generateRenewalQuarters() {
        const quarters = [
            { value: 'all', label: 'All' }
        ];

        // Get current quarter
        const currentQuarter = this.getCurrentQuarter();
        quarters.push({ value: currentQuarter, label: this.formatQuarterLabel(currentQuarter) });

        // Get next 4 quarters
        let nextQuarter = this.getNextQuarter();
        for (let i = 0; i < 4; i++) {
            quarters.push({ value: nextQuarter, label: this.formatQuarterLabel(nextQuarter) });
            nextQuarter = this.getNextQuarterFromQuarter(nextQuarter);
        }

        return quarters;
    }

    /**
     * Format quarter label for display (e.g., "FY26 Q3")
     */
    formatQuarterLabel(quarter) {
        const match = quarter.match(/FY(\d+)Q(\d+)/);
        if (!match) return quarter;
        
        const fy = match[1];
        const q = match[2];
        return `FY${fy} Q${q}`;
    }

    /**
     * Get next quarter from a given quarter
     */
    getNextQuarterFromQuarter(quarter) {
        const match = quarter.match(/FY(\d+)Q(\d+)/);
        if (!match) return quarter;

        let fy = parseInt(match[1]);
        let q = parseInt(match[2]);

        q++;
        if (q > 4) {
            q = 1;
            fy++;
        }

        return `FY${fy}Q${q}`;
    }

    /**
     * Calculate tier thresholds based on renewal amounts
     */
    calculateTierThresholds(portfolioData) {
        if (!portfolioData || portfolioData.length === 0) return;

        // Sort by renewal amount (bks_renewal_baseline_usd column) in descending order
        const sortedData = [...portfolioData].sort((a, b) => {
            const amountA = parseFloat(a.bks_renewal_baseline_usd) || 0;
            const amountB = parseFloat(b.bks_renewal_baseline_usd) || 0;
            return amountB - amountA;
        });

        const totalAccounts = sortedData.length;
        
        // Calculate percentile thresholds
        this.tierThresholds = {
            tier1: {
                minPercentile: 0,
                maxPercentile: 10,
                minAmount: sortedData[Math.floor(totalAccounts * 0.10) - 1]?.bks_renewal_baseline_usd || 0,
                maxAmount: sortedData[0]?.bks_renewal_baseline_usd || 0
            },
            tier2: {
                minPercentile: 10,
                maxPercentile: 50,
                minAmount: sortedData[Math.floor(totalAccounts * 0.50) - 1]?.bks_renewal_baseline_usd || 0,
                maxAmount: sortedData[Math.floor(totalAccounts * 0.10)]?.bks_renewal_baseline_usd || 0
            },
            tier3: {
                minPercentile: 50,
                maxPercentile: 90,
                minAmount: sortedData[Math.floor(totalAccounts * 0.90) - 1]?.bks_renewal_baseline_usd || 0,
                maxAmount: sortedData[Math.floor(totalAccounts * 0.50)]?.bks_renewal_baseline_usd || 0
            },
            tier4: {
                minPercentile: 90,
                maxPercentile: 100,
                minAmount: sortedData[totalAccounts - 1]?.bks_renewal_baseline_usd || 0,
                maxAmount: sortedData[Math.floor(totalAccounts * 0.90)]?.bks_renewal_baseline_usd || 0
            }
        };

        console.log('📊 Tier thresholds calculated:', this.tierThresholds);
    }

    /**
     * Determine which tier an account belongs to based on renewal amount
     */
    getAccountTier(account) {
        if (!this.tierThresholds) return 'tier4';

        const renewalAmount = parseFloat(account.bks_renewal_baseline_usd) || 0;

        if (renewalAmount >= this.tierThresholds.tier1.minAmount) {
            return 'tier1';
        } else if (renewalAmount >= this.tierThresholds.tier2.minAmount) {
            return 'tier2';
        } else if (renewalAmount >= this.tierThresholds.tier3.minAmount) {
            return 'tier3';
        } else {
            return 'tier4';
        }
    }

    /**
     * Get current quarter based on fiscal year (FY starts Feb 1)
     */
    getCurrentQuarter() {
        const today = new Date();
        const currentMonth = today.getMonth(); // 0-11
        const currentYear = today.getFullYear();

        // Determine current FY and quarter (FY starts Feb 1)
        let currentFY, currentQ;
        if (currentMonth >= 1) { // Feb (1) onwards
            currentFY = currentYear + 1;
            if (currentMonth >= 1 && currentMonth <= 4) currentQ = 1;       // Feb-May
            else if (currentMonth >= 5 && currentMonth <= 7) currentQ = 2;  // Jun-Aug
            else if (currentMonth >= 8 && currentMonth <= 10) currentQ = 3; // Sep-Nov
            else currentQ = 4;                                 // Dec-Jan
        } else {
            currentFY = currentYear;
            currentQ = 4;
        }

        return `FY${currentFY}Q${currentQ}`;
    }

    /**
     * Get next quarter
     */
    getNextQuarter() {
        const currentQuarter = this.getCurrentQuarter();
        const match = currentQuarter.match(/FY(\d+)Q(\d+)/);
        if (!match) return currentQuarter;

        let fy = parseInt(match[1]);
        let q = parseInt(match[2]);

        q++;
        if (q > 4) {
            q = 1;
            fy++;
        }

        return `FY${fy}Q${q}`;
    }

    /**
     * Get account renewal quarter from renewal date
     */
    getAccountRenewalQuarter(renewalDate) {
        if (!renewalDate) return 'Unknown';

        const date = new Date(renewalDate);
        const month = date.getMonth(); // 0-11
        const year = date.getFullYear();

        // Determine FY and Quarter (FY starts Feb 1)
        let fy, quarter;
        if (month >= 1) { // Feb (1) onwards
            fy = year + 1;
            if (month >= 1 && month <= 4) quarter = 1;       // Feb-May
            else if (month >= 5 && month <= 7) quarter = 2;  // Jun-Aug
            else if (month >= 8 && month <= 10) quarter = 3; // Sep-Nov
            else quarter = 4;                                 // Dec-Jan
        } else {
            fy = year;
            quarter = 4;
        }

        return `FY${fy}Q${quarter}`;
    }

    /**
     * Check if account matches contract stage filter
     */
    matchesContractStage(account) {
        // If "all" is selected, skip this filter
        if (this.currentFilters.contractStage === 'all') {
            return true;
        }

        // Use bks_renewal_date from portfolio data (actual renewal date)
        const renewalDate = account.bks_renewal_date || account.renewal_date;
        const renewalQuarter = this.getAccountRenewalQuarter(renewalDate);
        const currentQuarter = this.getCurrentQuarter();
        const nextQuarter = this.getNextQuarter();

        switch (this.currentFilters.contractStage) {
            case 'atBat':
                return renewalQuarter === currentQuarter;
            case 'atBatPlus1':
                return renewalQuarter === nextQuarter;
            case 'adopt':
                // Any quarter after AT BAT + 1
                return renewalQuarter !== currentQuarter && renewalQuarter !== nextQuarter && renewalQuarter !== 'Unknown';
            case 'onboard':
                // Show but do nothing for now
                return true;
            default:
                return true;
        }
    }

    /**
     * Check if account matches rank filter
     */
    matchesRankInBook(account) {
        // If "all" is selected, skip this filter
        if (this.currentFilters.rankInBook === 'all') {
            return true;
        }

        const accountTier = this.getAccountTier(account);
        return accountTier === this.currentFilters.rankInBook;
    }

    /**
     * Check if account matches renewal quarter filter
     */
    matchesRenewalQuarter(account) {
        // If "all" is selected, skip this filter
        if (this.currentFilters.renewalQuarter === 'all') {
            return true;
        }

        // Get the account's renewal quarter from the bks_fq field
        const accountQuarter = account.bks_fq;
        if (!accountQuarter) {
            return false; // No quarter data, exclude from results
        }

        return accountQuarter === this.currentFilters.renewalQuarter;
    }

    /**
     * Apply filters to data
     */
    applyFilters() {
        console.log('🔍 Applying global filters:', this.currentFilters);

        // Get current data from store
        const state = signalsStore.getState();
        const portfolioData = state.portfolioData || [];
        const accounts = state.accounts || new Map();
        
        console.log('📊 Portfolio data available:', portfolioData.length, 'records');
        console.log('📊 Accounts available:', accounts.size, 'accounts');

        // Calculate tier thresholds if not already done
        if (!this.tierThresholds && portfolioData.length > 0) {
            this.calculateTierThresholds(portfolioData);
        }

        // Filter portfolio data
        const filteredPortfolioData = portfolioData.filter(account => {
            const matchesContract = this.matchesContractStage(account);
            const matchesRank = this.matchesRankInBook(account);
            const matchesRenewalQuarter = this.matchesRenewalQuarter(account);
            return matchesContract && matchesRank && matchesRenewalQuarter;
        });
        
        console.log('📊 After filtering:', filteredPortfolioData.length, 'portfolio records match filters');

        // Filter accounts
        const filteredAccounts = new Map();
        accounts.forEach((account, accountId) => {
            // Find corresponding portfolio data for this account
            const portfolioAccount = portfolioData.find(p => 
                p.Account === account.account_name || p.account_name === account.account_name
            );
            
            if (portfolioAccount) {
                const matchesContract = this.matchesContractStage(portfolioAccount);
                const matchesRank = this.matchesRankInBook(portfolioAccount);
                const matchesRenewalQuarter = this.matchesRenewalQuarter(portfolioAccount);
                
                if (matchesContract && matchesRank && matchesRenewalQuarter) {
                    filteredAccounts.set(accountId, account);
                }
            }
        });

        // Filter signals based on filtered accounts
        const filteredSignals = state.signals.filter(signal => {
            return filteredAccounts.has(signal.account_id);
        });

        // Filter recommendedActions based on their enriched portfolio data
        const recommendedActions = signalsStore.normalizedData?.recommendedActions || new Map();
        const filteredRecommendedActions = new Map();
        
        recommendedActions.forEach((action, actionId) => {
            // Check if action has the enriched portfolio data fields
            if (action.bks_renewal_date && action.bks_renewal_baseline_usd) {
                const matchesContract = this.matchesContractStage(action);
                const matchesRank = this.matchesRankInBook(action);
                const matchesRenewalQuarter = this.matchesRenewalQuarter(action);
                
                if (matchesContract && matchesRank && matchesRenewalQuarter) {
                    filteredRecommendedActions.set(actionId, action);
                }
            } else {
                // If no portfolio data, include by default (fallback for safety)
                filteredRecommendedActions.set(actionId, action);
            }
        });

        // Filter signals based on their enriched portfolio data
        const signals = signalsStore.normalizedData?.signals || new Map();
        const filteredSignalsMap = new Map();
        
        signals.forEach((signal, signalId) => {
            if (signal.bks_renewal_date && signal.bks_renewal_baseline_usd) {
                const matchesContract = this.matchesContractStage(signal);
                const matchesRank = this.matchesRankInBook(signal);
                const matchesRenewalQuarter = this.matchesRenewalQuarter(signal);
                
                if (matchesContract && matchesRank && matchesRenewalQuarter) {
                    filteredSignalsMap.set(signalId, signal);
                }
            } else {
                // If no portfolio data, include by default (fallback for safety)
                filteredSignalsMap.set(signalId, signal);
            }
        });
        
        // Filter actionPlans based on their enriched portfolio data
        const actionPlans = signalsStore.normalizedData?.actionPlans || new Map();
        const filteredActionPlans = new Map();
        
        actionPlans.forEach((plan, planId) => {
            if (plan.bks_renewal_date && plan.bks_renewal_baseline_usd) {
                const matchesContract = this.matchesContractStage(plan);
                const matchesRank = this.matchesRankInBook(plan);
                const matchesRenewalQuarter = this.matchesRenewalQuarter(plan);
                
                if (matchesContract && matchesRank && matchesRenewalQuarter) {
                    filteredActionPlans.set(planId, plan);
                }
            } else {
                // If no portfolio data, include by default (fallback for safety)
                filteredActionPlans.set(planId, plan);
            }
        });
        
        // Filter notes based on their enriched portfolio data
        const notes = signalsStore.normalizedData?.notes || new Map();
        const filteredNotes = new Map();
        
        notes.forEach((note, noteId) => {
            if (note.bks_renewal_date && note.bks_renewal_baseline_usd) {
                const matchesContract = this.matchesContractStage(note);
                const matchesRank = this.matchesRankInBook(note);
                const matchesRenewalQuarter = this.matchesRenewalQuarter(note);
                
                if (matchesContract && matchesRank && matchesRenewalQuarter) {
                    filteredNotes.set(noteId, note);
                }
            } else {
                // If no portfolio data, include by default (fallback for safety)
                filteredNotes.set(noteId, note);
            }
        });

        // Update store with filtered data
        signalsStore.setState({
            ...state,
            filteredPortfolioData: filteredPortfolioData,
            filteredAccounts: filteredAccounts,
            filteredSignals: filteredSignals,
            filteredSignalsMap: filteredSignalsMap,
            filteredRecommendedActions: filteredRecommendedActions,
            filteredActionPlans: filteredActionPlans,
            filteredNotes: filteredNotes
        });

        // Trigger re-render of current tab
        if (window.appController) {
            window.appController.renderCurrentTab();
        }

        console.log(`📊 Filters applied: ${filteredPortfolioData.length}/${portfolioData.length} portfolio items, ${filteredAccounts.size}/${accounts.size} accounts, ${filteredSignals.length}/${state.signals.length} signals (array), ${filteredSignalsMap.size}/${signals.size} signals (map), ${filteredRecommendedActions.size}/${recommendedActions.size} actions, ${filteredActionPlans.size}/${actionPlans.size} plans, ${filteredNotes.size}/${notes.size} notes`);
    }

    /**
     * Get current filter state
     */
    getCurrentFilters() {
        return { ...this.currentFilters };
    }

    /**
     * Initialize filters with data
     */
    initialize(portfolioData) {
        this.calculateTierThresholds(portfolioData);
        this.applyFilters();
    }
}

// Make globally available
window.GlobalFilters = GlobalFilters;
