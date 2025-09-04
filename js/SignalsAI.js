// SignalsAI v8.0 Application - Main Class
class SignalsAI {
    constructor() {
        this.data = [];
        this.filteredData = [];
        this.accounts = [];
        this.actionPlans = new Map();
        this.viewedSignals = new Set();
        this.currentTab = 'signal-feed';
        this.signalComments = new Map(); // Store comments for each signal
        this.accountComments = new Map(); // Store comments for each account
        this.selectedSignal = null;
        this.init();
    }

    async init() {
        console.log('Initializing SignalsAI v8.0...');
        this.showLoading();

        try {
            console.log('Loading data...');
            await this.loadData();
            console.log('Processing accounts...');
            this.processAccounts();

            // Load account comments after accounts are processed
            console.log('Loading account comments...');
            this.accountComments = new Map();
            for (let [accountId, account] of this.accounts) {
                const accountCommentsResult = await DataService.getAccountComments(accountId);
                if (accountCommentsResult.success) {
                    this.accountComments.set(accountId, accountCommentsResult.comments);
                }
            }

            console.log('Creating mock action plans...');
            const mockPlans = DataService.generateMockActionPlans(this.accounts);
            // Keep actionPlans as a Map and populate it properly
            mockPlans.forEach(plan => {
                this.actionPlans.set(plan.accountId, plan);
            });
            console.log('Setting up event listeners...');
            this.setupEventListeners();
            console.log('Rendering current tab...');
            this.renderCurrentTab();
            console.log('Updating summary stats...');
            // Use setTimeout to ensure DOM is fully rendered
            setTimeout(() => {
                this.updateSummaryStats();
            }, 100);
            console.log('SignalsAI initialization complete');
        } catch (error) {
            console.error('Failed to initialize app at step:', error);
            console.error('Error details:', error.message);
            console.error('Stack trace:', error.stack);
            this.showErrorMessage('Failed to load SignalsAI data. Please refresh the page.');
        } finally {
            this.hideLoading();
        }
    }

    async loadData() {
        try {
            // Use DataService to load signals (with Domo API call and fallback to sample data)
            console.log('Loading signals...');
            this.data = await DataService.loadSignals();
            console.log(`Loaded ${this.data.length} signals via DataService`);

            // Remove duplicates based on signal ID
            const uniqueSignals = new Map();
            this.data.forEach(signal => {
                if (signal.id && !uniqueSignals.has(signal.id)) {
                    uniqueSignals.set(signal.id, signal);
                }
            });
            this.data = Array.from(uniqueSignals.values());
            console.log(`After deduplication: ${this.data.length} unique signals`);

            console.log('Loading interactions to restore feedback state...');
            await DataService.loadInteractions();
            console.log('Feedback state restored from interactions');

            console.log('Loading viewed signals...');
            this.viewedSignals = await DataService.loadViewedSignals();
            console.log('Viewed signals loaded:', this.viewedSignals.size, 'signals');

            console.log('Loading comments...');
            this.signalComments = await DataService.getComments();
            console.log('Signal comments loaded:', this.signalComments.size, 'signal groups');

            if (!this.data || this.data.length === 0) {
                throw new Error('No signals data loaded from DataService');
            }

            // Initialize comments for all signals (avoid duplicates)
            this.data.forEach(signal => {
                if (signal.id && !this.signalComments.has(signal.id)) {
                    this.signalComments.set(signal.id, []);
                }
            });

            // Mark old signals as viewed
            this.data.forEach(signal => {
                if (signal.id && signal.id.startsWith('old-signal-')) {
                    this.viewedSignals.add(signal.id);
                }
            });

            this.filteredData = [...this.data];
        } catch (error) {
            console.error('Error loading signals via DataService:', error);
            throw error;
        }
    }

    processAccounts() {
        // Clear existing accounts
        this.accounts = new Map();

        // Group signals by account using Map operations
        this.data.forEach(signal => {
            if (!this.accounts.has(signal.account_id)) {
                this.accounts.set(signal.account_id, {
                    id: signal.account_id,
                    name: signal.account_name,
                    signals: [],
                    at_risk_cat: signal.at_risk_cat || 'Healthy',

                    // Account-level information from the enhanced data model
                    industry: signal.industry || 'Unknown',
                    health: this.getHealthStatus(signal.at_risk_cat),
                    gpa: signal.account_gpa_numeric || 0,
                    arr: signal.total_lifetime_billings || 0,
                    health_score: signal.health_score || 0,
                    customer_tenure_years: signal.customer_tenure_years || 0,
                    account_gpa: signal.account_gpa || '',
                    numeric_grade: signal.numeric_grade || 0,
                    type_of_next_renewal: signal.type_of_next_renewal || '',

                    // Usage metrics
                    daily_active_users: signal.daily_active_users || 0,
                    weekly_active_users: signal.weekly_active_users || 0,
                    monthly_active_users: signal.monthly_active_users || 0,
                    total_data_sets: signal.total_data_sets || 0,
                    total_rows: signal.total_rows || 0,
                    dataflows: signal.dataflows || 0,
                    cards: signal.cards || 0,
                    is_consumption: signal.is_consumption || false,

                    // Business and forecasting metrics
                    bks_renewal_baseline_usd: signal.bks_renewal_baseline_usd || 0,
                    bks_forecast_new: signal.bks_forecast_new || 0,
                    bks_forecast_delta: signal.bks_forecast_delta || 0,
                    bks_status_grouping: signal.bks_status_grouping || '',
                    pacing_percent: signal.pacing_percent || 0,
                    bks_fq: signal.bks_fq || '',

                    // GPA component scores
                    relationship_value: signal.relationship_value || 0,
                    content_creation_value: signal.content_creation_value || 0,
                    user_engagement_value: signal.user_engagement_value || 0,
                    support_value: signal.support_value || 0,
                    commercial_value: signal.commercial_value || 0,
                    education_value: signal.education_value || 0,
                    platform_utilization_value: signal.platform_utilization_value || 0,
                    value_realization_value: signal.value_realization_value || 0,

                    // Historical metrics
                    prior_account_gpa_numeric: signal.prior_account_gpa_numeric || 0,
                    day_180_gpa_trend: signal.day_180_gpa_trend || 0,

                    // AI-generated insights
                    ai_account_signal_context: signal.ai_account_signal_context || '',
                    account_action_context: signal.account_action_context || '',

                    // Account ownership and management
                    account_owner: signal.account_owner || '',
                    avp: signal.avp || '',
                    rvp: signal.rvp || '',
                    ae: signal.ae || '',
                    csm: signal.csm || '',
                    ae_email: signal.ae_email || '',
                    next_renewal_date: signal.next_renewal_date || '',

                    // Generate AI recommendation
                    aiRecommendation: this.generateAIRecommendation(signal)
                });
            }
            this.accounts.get(signal.account_id).signals.push(signal);
        });

        console.log(`Processed ${this.accounts.size} accounts`);
    }

    getHealthStatus(riskCategory) {
        const statusMap = {
            'Healthy': 'healthy',
            'At Risk': 'critical',
            'Trending Risk': 'warning',
            'Extreme Risk': 'critical'
        };
        return statusMap[riskCategory] || 'healthy';
    }

    generateAIRecommendation(signal) {
        const recommendations = {
            'High': {
                priority: 'immediate',
                summary: 'Immediate action required based on high-priority signals',
                actions: ['Schedule executive alignment call', 'Engage technical success team', 'Review usage patterns']
            },
            'Medium': {
                priority: 'near-term',
                summary: 'Monitor closely and prepare strategic response',
                actions: ['Schedule check-in call', 'Provide training resources', 'Review implementation plan']
            },
            'Low': {
                priority: 'monitor',
                summary: 'Continue monitoring for trend changes',
                actions: ['Regular health check', 'Share best practices', 'Monitor usage metrics']
            }
        };

        return recommendations[signal.priority] || recommendations['Low'];
    }

    switchTab(tabName) {
        // Clean up scroll observer when leaving signal feed
        if (this.currentTab === 'signal-feed' && this.scrollObserver) {
            this.scrollObserver.disconnect();
            this.scrollObserver = null;
        }

        // Update active tab
        document.querySelectorAll('.nav-tab').forEach(tab => tab.classList.remove('active'));
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // Update active content
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        document.getElementById(tabName).classList.add('active');

        this.currentTab = tabName;
        this.renderCurrentTab();
    }

    renderCurrentTab() {
        switch (this.currentTab) {
            case 'signal-feed':
                SignalRenderer.renderSignalFeed(this);
                break;
            case 'my-portfolio':
                PortfolioRenderer.renderMyPortfolio(this);
                break;
            case 'actions':
                ActionsRenderer.renderActions(this);
                break;
        }
    }

    applyFilters() {
        const categoryFilter = document.getElementById('categoryFilter')?.value || '';
        const priorityFilter = document.getElementById('priorityFilter')?.value || '';

        this.filteredData = this.data.filter(signal => {
            const categoryMatch = !categoryFilter || signal.category === categoryFilter;
            const priorityMatch = !priorityFilter || signal.priority === priorityFilter;
            return categoryMatch && priorityMatch;
        });
    }

    updateSummaryStats() {
        // Ensure we are filtering from the original data for accurate summary - ONLY High priority signals
        const highPrioritySignals = this.data.filter(signal => signal.priority === 'High');

        // Get distinct account IDs with high priority signals
        const distinctAccountIds = [...new Set(highPrioritySignals.map(signal => signal.account_id))];
        const distinctAccountCount = distinctAccountIds.length;

        // Only calculate baseline for accounts that have HIGH priority signals
        const renewalBaselineSum = this.calculateDistinctRenewalBaseline(highPrioritySignals);

        console.log('High priority signals:', highPrioritySignals);
        console.log('Distinct accounts with high priority signals:', distinctAccountCount);
        console.log('Renewal baseline sum:', renewalBaselineSum);

        // Try multiple selectors to find the banner element
        let banner = document.querySelector('.priority-alert-banner .alert-text');
        if (!banner) {
            banner = document.querySelector('.alert-text');
        }
        if (!banner) {
            banner = document.querySelector('.priority-alert-banner span');
        }

        if (banner) {
            banner.textContent = `${distinctAccountCount} High priority accounts identified representing ${renewalBaselineSum} of Renewal Baseline`;
            console.log('Updated banner text to:', banner.textContent);
        } else {
            console.error('Banner element not found with any selector');
            console.log('Available elements:', document.querySelectorAll('.priority-alert-banner *'));
        }
    }

    calculateDistinctRenewalBaseline(highPrioritySignals) {
        // ONLY calculate for accounts that have HIGH priority signals
        // Get distinct account IDs to avoid double counting - these are already filtered to high priority
        const distinctAccountIds = [...new Set(highPrioritySignals.map(signal => signal.account_id))];

        let totalBaseline = 0;

        distinctAccountIds.forEach(accountId => {
            // Find any high priority signal for this account (they all have the same renewal baseline per account)
            const accountSignal = highPrioritySignals.find(signal => signal.account_id === accountId);
            if (accountSignal) {
                // Try multiple possible field names for the renewal baseline
                const renewalAmount = parseFloat(
                    accountSignal.bks_renewal_baseline_usd || 
                    accountSignal['BKS Renewal Baseline (USD)'] || 
                    accountSignal['bks_renewal_baseline_usd'] || 
                    accountSignal.total_lifetime_billings || 
                    0
                );
                
                if (renewalAmount > 0) {
                    totalBaseline += renewalAmount;
                    console.log(`High Priority Account ${accountId}: Adding $${renewalAmount} to baseline (total now: $${totalBaseline})`);
                } else {
                    console.log(`High Priority Account ${accountId}: No renewal baseline found`, {
                        bks_renewal_baseline_usd: accountSignal.bks_renewal_baseline_usd,
                        'BKS Renewal Baseline (USD)': accountSignal['BKS Renewal Baseline (USD)'],
                        total_lifetime_billings: accountSignal.total_lifetime_billings
                    });
                }
            }
        });

        console.log(`Total distinct renewal baseline from HIGH PRIORITY accounts: $${totalBaseline} across ${distinctAccountIds.length} high priority accounts`);
        
        // Format as currency
        return this.formatCurrency(totalBaseline);
    }

    formatCurrency(amount) {
        if (amount >= 1000000) {
            return `$${(amount / 1000000).toFixed(1)}M`;
        } else if (amount >= 1000) {
            return `$${(amount / 1000).toFixed(0)}k`;
        } else {
            return `$${amount.toFixed(0)}`;
        }
    }

    showLoading() {
        document.getElementById('loadingOverlay').style.display = 'flex';
    }

    hideLoading() {
        document.getElementById('loadingOverlay').style.display = 'none';
    }

    async markSignalAsViewed(signalId) {
        // Use the new SignalFeedbackService method
        await SignalFeedbackService.markSignalAsViewed(signalId, this);
        
        // Don't re-render immediately - let the signal stay visible until refresh
        // The signal will move to "Previously Viewed" section on next load/refresh
    }

    markSignalAsViewedAndRefresh(signalId) {
        this.markSignalAsViewed(signalId);
        this.renderCurrentTab();
    }

    toggleAccountSignals(accountId) {
        const signalsContainer = document.getElementById(`signals-${accountId}`);
        const chevron = document.getElementById(`chevron-${accountId}`);
        const isExpanded = signalsContainer.classList.contains('expanded');

        // Close all other expanded accounts
        document.querySelectorAll('.account-details.expanded').forEach(container => {
            container.classList.remove('expanded');
        });
        document.querySelectorAll('.account-chevron').forEach(icon => {
            icon.classList.remove('rotated');
        });

        // Toggle current account
        if (!isExpanded) {
            signalsContainer.classList.add('expanded');
            chevron.classList.add('rotated');
        }
    }

    showMoreSignalsForAccount(accountId) {
        // Find the account using Map.get() since this.accounts is a Map
        const account = this.accounts.get(accountId);
        if (!account) return;

        // Save current scroll position
        const currentScrollY = window.scrollY;

        // Increment the current page
        if (!account.signalsPagination) {
            account.signalsPagination = { currentPage: 0, pageSize: 3 };
        }
        account.signalsPagination.currentPage++;

        // Re-render the current tab to update the signals display
        this.renderCurrentTab();
        
        // Keep the account expanded and restore scroll position after re-render
        setTimeout(() => {
            const signalsContainer = document.getElementById(`signals-${accountId}`);
            const chevron = document.getElementById(`chevron-${accountId}`);
            if (signalsContainer && chevron) {
                signalsContainer.classList.add('expanded');
                chevron.classList.add('rotated');
            }
            
            // Restore scroll position with a slight offset down to show new content
            const offsetDown = 100; // Scroll down by 100px to show new content
            window.scrollTo({
                top: currentScrollY + offsetDown,
                behavior: 'smooth'
            });
        }, 100);
    }

    // Utility methods
    formatNumber(num) {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toString();
    }

    formatDate(dateString) {
        if (!dateString) return 'Unknown date';
        
        const date = new Date(dateString);
        
        // Handle invalid dates
        if (isNaN(date.getTime())) return 'Invalid date';
        
        const now = new Date();
        const diffTime = now - date;
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;

        return date.toLocaleDateString();
    }

    formatDateSimple(dateString) {
        if (!dateString) return 'Unknown';
        
        const date = new Date(dateString);
        
        // Handle invalid dates
        if (isNaN(date.getTime())) return 'Invalid';
        
        const now = new Date();
        const diffTime = now - date;
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;

        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    getInitials(name) {
        if (!name) return '';
        const nameParts = name.split(' ');
        if (nameParts.length >= 2) {
            return nameParts[0].charAt(0).toUpperCase() + nameParts[1].charAt(0).toUpperCase();
        } else if (nameParts.length === 1) {
            return nameParts[0].charAt(0).toUpperCase();
        }
        return '';
    }

    formatCommentTime(timestamp) {
        const now = new Date();
        const commentTime = new Date(timestamp);
        const diffSeconds = Math.floor((now - commentTime) / 1000);

        if (diffSeconds < 60) {
            return 'Just now';
        } else if (diffSeconds < 3600) {
            const diffMinutes = Math.floor(diffSeconds / 60);
            return `${diffMinutes}m ago`;
        } else if (diffSeconds < 86400) {
            const diffHours = Math.floor(diffSeconds / 3600);
            return `${diffHours}h ago`;
        } else {
            return commentTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }
    }

    showSuccessMessage(message) {
        NotificationService.showSuccess(message);
    }

    showErrorMessage(message) {
        NotificationService.showError(message);
    }

    setupEventListeners() {
        // Tab navigation with touch optimization
        const navTabs = document.querySelectorAll('.nav-tab');
        navTabs.forEach(tab => {
            // Use both click and touchend for better mobile responsiveness
            const handleTabSwitch = (e) => {
                e.preventDefault();
                const tabName = e.target.getAttribute('data-tab');
                this.switchTab(tabName);
            };

            tab.addEventListener('click', handleTabSwitch);
            tab.addEventListener('touchend', handleTabSwitch, { passive: false });
        });

        EventHandlers.setupEventListeners(this);
        ActionPlanService.setupEventDelegation();
    }

    // Action Plan methods
    createActionPlanForAccount(accountId) {
        const account = this.accounts.get(accountId);
        if (account && account.signals.length > 0) {
            // Use the highest priority signal from this account, or the most recent one
            const highPrioritySignals = account.signals.filter(s => s.priority === 'High');
            const selectedSignal = highPrioritySignals.length > 0
                ? highPrioritySignals.sort((a, b) => new Date(b.created_date || Date.now()) - new Date(a.created_date || Date.now()))[0]
                : account.signals.sort((a, b) => new Date(b.created_date || Date.now()) - new Date(a.created_date || Date.now()))[0];

            ActionPlanService.openCreatePlanDrawer(selectedSignal.id, this);
        } else {
            ActionPlanService.openCreatePlanDrawer(null, this);
        }
    }

    selectActionPlanToEdit(accountId) {
        // Get all plans for this account
        let accountPlans = [];

        // Check Map-based plans
        if (this.actionPlans instanceof Map && this.actionPlans.has(accountId)) {
            const plan = this.actionPlans.get(accountId);
            accountPlans = Array.isArray(plan) ? plan : [plan];
        }

        // Check Array-based plans
        if (Array.isArray(this.actionPlans)) {
            accountPlans = this.actionPlans.filter(plan => plan.accountId === accountId);
        }

        // Check DataService plans by account
        if (accountPlans.length === 0 && window.DataService && window.DataService.actionPlansByAccount) {
            accountPlans = window.DataService.actionPlansByAccount.get(accountId) || [];
        }

        if (accountPlans.length === 1) {
            // Only one plan, edit it directly
            const account = this.accounts.get(accountId);
            if (account && account.signals.length > 0) {
                const selectedSignal = account.signals[0];
                this.selectedActionPlan = accountPlans[0];
                ActionPlanService.openCreatePlanDrawer(selectedSignal.id, this);
            }
        } else if (accountPlans.length > 1) {
            // Multiple plans, show selection modal
            this.showPlanSelectionModal(accountId, accountPlans);
        } else {
            // No plans found, create new one
            this.createActionPlanForAccount(accountId);
        }
    }

    showPlanSelectionModal(accountId, plans) {
        const account = this.accounts.get(accountId);
        const accountName = account ? account.name : 'Account';

        // Create modal HTML
        const modalHtml = `
            <div class="modal-backdrop" id="planSelectionBackdrop">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h3>Select Action Plan to Edit - ${accountName}</h3>
                            <button class="modal-close" onclick="app.closePlanSelectionModal()">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                        <div class="modal-body">
                            <div class="plan-selection-list">
                                ${plans.map(plan => `
                                    <div class="plan-selection-item" onclick="app.editSelectedPlan('${accountId}', '${plan.id}')">
                                        <div class="plan-info">
                                            <div class="plan-title">${plan.planTitle || 'Action Plan'}</div>
                                            <div class="plan-meta">
                                                <span>Created: ${this.formatDateSimple(plan.createdAt)}</span>
                                                <span>By: ${plan.createdBy || 'Unknown'}</span>
                                                <span class="status-badge status-${plan.status?.toLowerCase() || 'pending'}">${plan.status || 'Pending'}</span>
                                            </div>
                                            <div class="plan-items">${plan.actionItems?.length || 0} action items</div>
                                        </div>
                                        <i class="fas fa-chevron-right"></i>
                                    </div>
                                `).join('')}
                            </div>
                            <div class="modal-actions">
                                <button class="btn btn-secondary" onclick="app.createActionPlanForAccount('${accountId}')">
                                    <i class="fas fa-plus"></i> Create New Plan
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Add modal to page
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    closePlanSelectionModal() {
        const modal = document.getElementById('planSelectionBackdrop');
        if (modal) {
            modal.remove();
        }
    }

    editSelectedPlan(accountId, planId) {
        // Find the selected plan
        let selectedPlan = null;

        if (Array.isArray(this.actionPlans)) {
            selectedPlan = this.actionPlans.find(plan => plan.id === planId);
        }

        if (!selectedPlan && window.DataService && window.DataService.actionPlansByAccount) {
            const accountPlans = window.DataService.actionPlansByAccount.get(accountId) || [];
            selectedPlan = accountPlans.find(plan => plan.id === planId);
        }

        if (selectedPlan) {
            this.selectedActionPlan = selectedPlan;
            const account = this.accounts.get(accountId);
            if (account && account.signals.length > 0) {
                const selectedSignal = account.signals[0];
                ActionPlanService.openCreatePlanDrawer(selectedSignal.id, this);
            }
        }

        this.closePlanSelectionModal();
    }

    openSignalDetails(signalId) {
        SignalDetailsService.openSignalDetails(signalId, this);
    }

    viewAccountDetails(accountId) {
        console.log('Viewing account details for:', accountId);
        // This could open a detailed account view in the future
        // For now, we'll just log it
    }

    switchToSignal(signalId) {
        const signal = this.data.find(s => s.id === signalId);
        if (signal) {
            ActionPlanService.populateAccountCentricPlan(signal, this);
        }
    }

    async addComment(signalId) {
        await CommentService.addComment(signalId, this);
    }

    async deleteComment(commentId, signalId) {
        await CommentService.deleteComment(commentId, signalId, this);
    }

    editComment(commentId, signalId) {
        CommentService.editComment(commentId, signalId, this);
    }

    async saveCommentEdit(commentId, signalId) {
        await CommentService.saveCommentEdit(commentId, signalId, this);
    }

    cancelCommentEdit(commentId, signalId, originalText) {
        CommentService.cancelCommentEdit(commentId, signalId, originalText, this);
    }

    // Account comment management methods
    async addAccountComment(accountId) {
        await CommentService.addAccountComment(accountId, this);
    }

    async deleteAccountComment(commentId, accountId) {
        await CommentService.deleteAccountComment(commentId, accountId, this);
    }

    editAccountComment(commentId, accountId) {
        CommentService.editAccountComment(commentId, accountId, this);
    }

    async saveAccountCommentEdit(commentId, accountId) {
        await CommentService.saveAccountCommentEdit(commentId, accountId, this);
    }

    cancelAccountCommentEdit(commentId, accountId, originalText) {
        CommentService.cancelAccountCommentEdit(commentId, accountId, originalText, this);
    }

    // Action Plan Management Methods
    viewAccountActionPlan(accountId) {
        const account = this.accounts.get(accountId);
        const planData = this.actionPlans.get(accountId);

        if (account && planData) {
            console.log('Viewing action plan for account:', account.name);
            // In the future, this could open a detailed action plan view
            // For now, we'll open the edit drawer
            this.editActionPlan(accountId);
        }
    }

    editActionPlan(accountId) {
        const account = this.accounts.get(accountId);
        if (account && account.signals.length > 0) {
            // Use the highest priority signal to populate the plan editor
            const highPrioritySignals = account.signals.filter(s => s.priority === 'High');
            const selectedSignal = highPrioritySignals.length > 0
                ? highPrioritySignals.sort((a, b) => new Date(b.created_date || Date.now()) - new Date(a.created_date || Date.now()))[0]
                : account.signals.sort((a, b) => new Date(b.created_date || Date.now()) - new Date(a.created_date || Date.now()))[0];

            ActionPlanService.openCreatePlanDrawer(selectedSignal.id, this);
        }
    }

    executeActionPlan(accountId) {
        const account = this.accounts.get(accountId);
        const planData = this.actionPlans.get(accountId);

        if (account && planData) {
            console.log('Executing action plan for:', account.name);
            this.showSuccessMessage(`Action plan execution started for ${account.name}`);

            // In a real implementation, this would:
            // 1. Create calendar events
            // 2. Send notifications
            // 3. Update CRM
            // 4. Track progress

            // For demo, we'll just show a success message
            setTimeout(() => {
                this.showSuccessMessage(`Action items for ${account.name} have been scheduled and assigned`);
            }, 1500);
        }
    }

    // New method to create a plan
    createPlan(signalId) {
        // Use ActionPlanService instead of local implementation
        ActionPlanService.openCreatePlanDrawer(signalId, this);
    }

    // Helper to get the button HTML for a signal
    getActionButtonHtml(signal) {
        const hasExistingPlan = this.actionPlans.has(signal.account_id);

        if (hasExistingPlan) {
            return `<button class="btn btn-primary plan-exists" data-action="take-action" data-signal-id="${signal.id}">
                <i class="fas fa-edit"></i> Update Plan
            </button>`;
        } else {
            return `<button class="btn btn-primary" data-action="take-action" data-signal-id="${signal.id}">
                <i class="fas fa-plus"></i> Create Plan
            </button>`;
        }
    }
}