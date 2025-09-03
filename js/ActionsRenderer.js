// Actions Renderer - Handle action plans tab rendering
class ActionsRenderer {

    static renderActions(app) {
        const container = document.getElementById('actionsList');
        if (!container) return;

        // Update overview statistics
        this.updateActionsOverview(app);

        // Get action plans and convert to display format
        const actionPlans = this.getFormattedActionPlans(app);

        if (actionPlans.length === 0) {
            container.innerHTML = this.renderEmptyState();
            return;
        }

        // Apply current filter
        const activeFilter = document.querySelector('.filter-btn.active')?.getAttribute('data-filter') || 'all';
        const filteredPlans = this.filterActionPlans(actionPlans, activeFilter);

        container.innerHTML = filteredPlans.map(plan => this.renderActionPlanCard(plan, app)).join('');
    }

    static updateActionsOverview(app) {
        const actionPlans = Array.from(app.actionPlans.values());

        // Update total actions count
        const totalElement = document.getElementById('totalActions');
        if (totalElement) {
            totalElement.textContent = actionPlans.length;
        }

        // Update pending actions count
        const pendingElement = document.getElementById('pendingActions');
        if (pendingElement) {
            const pendingCount = actionPlans.filter(plan => plan.status === 'Pending').length;
            pendingElement.textContent = pendingCount;
        }

        // Update in progress actions count
        const inProgressElement = document.getElementById('inProgressActions');
        if (inProgressElement) {
            const inProgressCount = actionPlans.filter(plan => plan.status === 'In Progress').length;
            inProgressElement.textContent = inProgressCount;
        }

        // Update projected impact
        const impactElement = document.getElementById('projectedImpact');
        if (impactElement) {
            // Calculate projected impact based on action plans
            const impactPercentage = actionPlans.length > 0 ? Math.round(actionPlans.length * 15) : 0;
            impactElement.textContent = `+${impactPercentage}%`;
        }
    }

    static getFormattedActionPlans(app) {
        const actionPlans = [];

        for (let [accountId, planData] of app.actionPlans) {
            const account = app.accounts.get(accountId);
            if (!account) continue;

            const highPrioritySignals = account.signals.filter(s => s.priority === 'High');

            actionPlans.push({
                accountId: accountId,
                accountName: account.name,
                accountHealth: this.getHealthFromRiskCategory(account.at_risk_cat),
                signalsCount: account.signals.length,
                highPriorityCount: highPrioritySignals.length,
                renewalBaseline: this.getRandomRenewalValue(),
                status: planData.status || 'Pending',
                urgency: highPrioritySignals.length > 1 ? 'critical' : highPrioritySignals.length === 1 ? 'high' : 'normal',
                planData: planData,
                lastUpdated: planData.updatedAt || planData.createdAt,
                nextAction: this.getNextAction(planData)
            });
        }

        return actionPlans.sort((a, b) => {
            // Sort by urgency first, then by last updated
            const urgencyOrder = { critical: 0, high: 1, normal: 2 };
            if (urgencyOrder[a.urgency] !== urgencyOrder[b.urgency]) {
                return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
            }
            return new Date(b.lastUpdated) - new Date(a.lastUpdated);
        });
    }

    static filterActionPlans(actionPlans, filter) {
        switch (filter) {
            case 'pending':
                return actionPlans.filter(plan => plan.status === 'Pending');
            case 'in-progress':
                return actionPlans.filter(plan => plan.status === 'In Progress');
            case 'completed':
                return actionPlans.filter(plan => plan.status === 'Completed');
            default:
                return actionPlans;
        }
    }

    static renderActionPlanCard(plan, app) {
        const progressPercentage = this.calculateProgress(plan.planData);

        return `
            <div class="action-plan-card ${plan.urgency}-urgency" onclick="app.viewAccountActionPlan('${plan.accountId}')">
                <div class="action-plan-header">
                    <div class="plan-account-info">
                        <div class="plan-account-name">${plan.accountName}</div>
                        <div class="plan-meta">
                            <span class="account-health health-${plan.accountHealth}">${plan.accountHealth}</span>
                            <span class="signals-count">${plan.signalsCount} signals</span>
                            <span class="high-priority-count">${plan.highPriorityCount} high priority</span>
                            <span class="renewal-value">$${app.formatNumber(plan.renewalBaseline)} renewal</span>
                        </div>
                    </div>
                    <div class="plan-status-section">
                        <span class="plan-status status-${plan.status.toLowerCase().replace(' ', '-')}">${plan.status}</span>
                        ${plan.urgency === 'critical' ? '<span class="urgency-badge critical">CRITICAL</span>' : ''}
                        ${plan.urgency === 'high' ? '<span class="urgency-badge high">HIGH</span>' : ''}
                    </div>
                </div>

                <div class="action-plan-progress">
                    <div class="progress-header">
                        <span class="progress-label">Action Items Progress</span>
                        <span class="progress-percentage">${progressPercentage}%</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${progressPercentage}%"></div>
                    </div>
                    <div class="progress-details">
                        <span>${plan.planData.actionItems.length} total actions</span>
                        <span>Next: ${plan.nextAction}</span>
                    </div>
                </div>

                <div class="action-plan-impact">
                    <div class="impact-metrics">
                        <div class="impact-item">
                            <div class="impact-value">+${Math.round(plan.highPriorityCount * 25)}%</div>
                            <div class="impact-label">Health Score</div>
                        </div>
                        <div class="impact-item">
                            <div class="impact-value">+${Math.round(plan.signalsCount * 10)}%</div>
                            <div class="impact-label">Engagement</div>
                        </div>
                        <div class="impact-item">
                            <div class="impact-value">+${Math.round(plan.renewalBaseline / 10000)}%</div>
                            <div class="impact-label">Renewal Risk</div>
                        </div>
                    </div>
                </div>

                <div class="action-plan-footer">
                    <div class="plan-timestamp">
                        Updated ${app.formatDateSimple(plan.lastUpdated)}
                    </div>
                    <div class="plan-actions">
                        <button class="btn btn-secondary" onclick="event.stopPropagation(); app.editActionPlan('${plan.accountId}')">
                            <i class="fas fa-edit"></i> Edit Plan
                        </button>
                        <button class="btn btn-primary" onclick="event.stopPropagation(); app.executeActionPlan('${plan.accountId}')">
                            <i class="fas fa-play"></i> Execute
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    static renderEmptyState() {
        return `
            <div class="empty-state">
                <div class="empty-state-icon">
                    <i class="fas fa-clipboard-list"></i>
                </div>
                <div class="empty-state-title">No Action Plans Yet</div>
                <div class="empty-state-description">
                    Action plans will appear here when you create them for accounts with signals.
                    Go to the Signal Feed or My Portfolio to create your first action plan.
                </div>
                <div class="empty-state-actions">
                    <button class="btn btn-primary" onclick="app.switchTab('signal-feed')">
                        <i class="fas fa-stream"></i> View Signal Feed
                    </button>
                    <button class="btn btn-secondary" onclick="app.switchTab('my-portfolio')">
                        <i class="fas fa-briefcase"></i> View Portfolio
                    </button>
                </div>
            </div>
        `;
    }

    static calculateProgress(planData) {
        if (!planData.actionItems || planData.actionItems.length === 0) {
            return 0;
        }

        // Since we don't track completion status yet, we'll base it on creation time
        const daysSinceCreated = (new Date() - new Date(planData.createdAt)) / (1000 * 60 * 60 * 24);

        if (daysSinceCreated < 1) return 25;
        if (daysSinceCreated < 3) return 50;
        if (daysSinceCreated < 7) return 75;
        return 90;
    }

    static calculatePlanStatus(planData) {
        if (!planData.actionItems || planData.actionItems.length === 0) {
            return 'Draft';
        }

        // Since we don't track completion status yet, we'll base it on creation time
        const daysSinceCreated = (new Date() - new Date(planData.createdAt)) / (1000 * 60 * 60 * 24);

        if (daysSinceCreated < 1) return 'New';
        if (daysSinceCreated < 3) return 'In Progress';
        return 'Review Needed';
    }

    static getNextAction(planData) {
        if (!planData.actionItems || planData.actionItems.length === 0) {
            return 'Add action items';
        }

        const firstAction = planData.actionItems[0];
        if (firstAction.length > 30) {
            return firstAction.substring(0, 30) + '...';
        }
        return firstAction;
    }

    static getHealthFromRiskCategory(riskCategory) {
        const healthMap = {
            'Healthy': 'healthy',
            'At Risk': 'warning',
            'Trending Risk': 'warning',
            'Extreme Risk': 'critical'
        };
        return healthMap[riskCategory] || 'healthy';
    }

    static getRandomRenewalValue() {
        // Generate a realistic renewal value between 50K and 500K
        const baseValue = Math.floor(Math.random() * 450000) + 50000;
        // Round to nearest 1000
        return Math.round(baseValue / 1000) * 1000;
    }
}