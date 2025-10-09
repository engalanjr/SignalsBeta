// GlobalFilters - Handles global filtering logic for the entire app
class GlobalFilters {
    
    constructor() {
        this.currentFilters = {
            contractStage: 'all', // Show all data initially
            rankInBook: 'all' // Show all data initially
        };
        this.tierThresholds = null; // Will be calculated from data
        this.populateContractStageFilters();
        this.setupEventListeners();
    }

    /**
     * Setup event listeners for filter changes
     */
    setupEventListeners() {
        // Rank in MyBook filters
        document.querySelectorAll('input[name="rankInBook"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.currentFilters.rankInBook = e.target.value;
                this.applyFilters();
            });
        });
    }

    /**
     * Populate contract stage filters dynamically with quarters
     */
    populateContractStageFilters() {
        const container = document.getElementById('contractStageFilters');
        if (!container) return;

        const currentQ = this.getCurrentQuarter();
        const nextQ = this.getNextQuarter();
        const next2Q = this.getNextQuarterFromQuarter(nextQ);
        const next3Q = this.getNextQuarterFromQuarter(next2Q);

        const stages = [
            { value: 'all', label: 'All' },
            { value: 'atBat', label: `AT BAT (${currentQ})` },
            { value: 'atBatPlus1', label: `AT BAT + 1 (${nextQ})` },
            { value: 'atBatPlus2', label: `AT BAT + 2 (${next2Q})` },
            { value: 'atBatPlus3', label: `AT BAT + 3 (${next3Q})` },
            { value: 'onboard', label: 'ONBOARD' },
            { value: 'adopt', label: 'ADOPT' }
        ];

        const html = stages.map(stage => `
            <label class="filter-option">
                <input type="radio" name="contractStage" value="${stage.value}" ${stage.value === 'all' ? 'checked' : ''}>
                <span class="checkbox-custom"></span>
                <span class="option-text">${stage.label}</span>
            </label>
        `).join('');

        container.innerHTML = html;

        // Attach event listeners for the new elements
        document.querySelectorAll('input[name="contractStage"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.currentFilters.contractStage = e.target.value;
                this.applyFilters();
            });
        });
    }

    /**
     * Get next quarter from a given quarter
     */
    getNextQuarterFromQuarter(quarter) {
        const match = quarter.match(/FY(\d+)-?Q(\d+)/);
        if (!match) return quarter;

        let fy = parseInt(match[1]);
        let q = parseInt(match[2]);

        q++;
        if (q > 4) {
            q = 1;
            fy++;
        }

        // Ensure 2-digit year format
        const fyShort = fy.toString().slice(-2);
        return `FY${fyShort}-Q${q}`;
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
            if (currentMonth >= 1 && currentMonth <= 3) currentQ = 1;       // Feb-Apr (1-3)
            else if (currentMonth >= 4 && currentMonth <= 6) currentQ = 2;  // May-Jul (4-6)
            else if (currentMonth >= 7 && currentMonth <= 9) currentQ = 3;  // Aug-Oct (7-9)
            else currentQ = 4;                                               // Nov-Dec (10-11)
        } else {
            currentFY = currentYear;
            currentQ = 4;  // Jan (0) is Q4 of previous FY
        }

        // Use 2-digit year format (e.g., FY26-Q3)
        const fyShort = currentFY.toString().slice(-2);
        return `FY${fyShort}-Q${currentQ}`;
    }

    /**
     * Get next quarter
     */
    getNextQuarter() {
        const currentQuarter = this.getCurrentQuarter();
        const match = currentQuarter.match(/FY(\d+)-?Q(\d+)/);
        if (!match) return currentQuarter;

        let fy = parseInt(match[1]);
        let q = parseInt(match[2]);

        q++;
        if (q > 4) {
            q = 1;
            fy++;
        }

        // Ensure 2-digit year format
        const fyShort = fy.toString().slice(-2);
        return `FY${fyShort}-Q${q}`;
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
            if (month >= 1 && month <= 3) quarter = 1;       // Feb-Apr (1-3)
            else if (month >= 4 && month <= 6) quarter = 2;  // May-Jul (4-6)
            else if (month >= 7 && month <= 9) quarter = 3;  // Aug-Oct (7-9)
            else quarter = 4;                                 // Nov-Dec (10-11)
        } else {
            fy = year;
            quarter = 4;  // Jan (0) is Q4 of previous FY
        }

        // Use 2-digit year format (e.g., FY27-Q1)
        const fyShort = fy.toString().slice(-2);
        return `FY${fyShort}-Q${quarter}`;
    }

    /**
     * Get contract start date for onboarding calculation
     */
    getContractStartDate(account) {
        // Use last_renewal_date if available
        if (account.last_renewal_date && account.last_renewal_date.trim() !== '') {
            return new Date(account.last_renewal_date);
        }
        
        // Calculate: bks_renewal_date - 12 months
        if (account.bks_renewal_date && account.bks_renewal_date.trim() !== '') {
            const renewalDate = new Date(account.bks_renewal_date);
            const startDate = new Date(renewalDate);
            startDate.setFullYear(startDate.getFullYear() - 1);
            return startDate;
        }
        
        return null; // No valid date
    }

    /**
     * Check if account is in onboarding window (first 90 days)
     */
    isInOnboardingWindow(account) {
        const contractStartDate = this.getContractStartDate(account);
        if (!contractStartDate) return false;
        
        const today = new Date();
        const daysSinceStart = Math.floor((today - contractStartDate) / (1000 * 60 * 60 * 24));
        
        // Only show accounts in first 90 days (0-90 days inclusive)
        // Exclude accounts with future start dates
        return daysSinceStart >= 0 && daysSinceStart <= 90;
    }

    /**
     * Check if account matches contract stage filter
     */
    matchesContractStage(account) {
        // If "all" is selected, skip this filter
        if (this.currentFilters.contractStage === 'all') {
            return true;
        }

        // ONBOARD filter works independently (doesn't need bks_fq)
        if (this.currentFilters.contractStage === 'onboard') {
            return this.isInOnboardingWindow(account);
        }

        // For quarter-based filters, we need bks_fq
        const renewalQuarter = account.bks_fq;
        if (!renewalQuarter) return false;

        const currentQ = this.getCurrentQuarter();
        const nextQ = this.getNextQuarter();
        const next2Q = this.getNextQuarterFromQuarter(nextQ);
        const next3Q = this.getNextQuarterFromQuarter(next2Q);

        switch (this.currentFilters.contractStage) {
            case 'atBat':
                return renewalQuarter === currentQ;
            case 'atBatPlus1':
                return renewalQuarter === nextQ;
            case 'atBatPlus2':
                return renewalQuarter === next2Q;
            case 'atBatPlus3':
                return renewalQuarter === next3Q;
            case 'adopt':
                // Show quarters beyond AT BAT+3
                return renewalQuarter !== currentQ && 
                       renewalQuarter !== nextQ && 
                       renewalQuarter !== next2Q && 
                       renewalQuarter !== next3Q && 
                       renewalQuarter !== 'Unknown';
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
     * Apply filters to data
     */
    applyFilters() {
        // Get current data from store
        const state = signalsStore.getState();
        const portfolioData = state.portfolioData || [];
        const accounts = state.accounts || new Map();

        // Calculate tier thresholds if not already done
        if (!this.tierThresholds && portfolioData.length > 0) {
            this.calculateTierThresholds(portfolioData);
        }

        // Filter portfolio data
        const filteredPortfolioData = portfolioData.filter(account => {
            const matchesContract = this.matchesContractStage(account);
            const matchesRank = this.matchesRankInBook(account);
            return matchesContract && matchesRank;
        });

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
                
                if (matchesContract && matchesRank) {
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
                
                if (matchesContract && matchesRank) {
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
                
                if (matchesContract && matchesRank) {
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
                
                if (matchesContract && matchesRank) {
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
                
                if (matchesContract && matchesRank) {
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
