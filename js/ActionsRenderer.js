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

        // Render as project management table
        container.innerHTML = this.renderProjectManagementTable(filteredPlans, app);
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

    static renderProjectManagementTable(actionPlans, app) {
        return `
            <div class="project-management-container">
                <div class="pm-table-header">
                    <div class="pm-header-cell checkbox-col">
                        <input type="checkbox" id="selectAll" onchange="ActionsRenderer.toggleAllTasks(this)">
                    </div>
                    <div class="pm-header-cell task-col">Task</div>
                    <div class="pm-header-cell due-date-col">Due Date</div>
                    <div class="pm-header-cell plays-col"># Plays</div>
                    <div class="pm-header-cell priority-col">Priority</div>
                    <div class="pm-header-cell assignee-col">Assignee</div>
                </div>
                
                ${actionPlans.map(plan => this.renderAccountGroup(plan, app)).join('')}
            </div>
        `;
    }

    static renderAccountGroup(plan, app) {
        const tasks = this.getTasksFromPlan(plan, app);
        
        return `
            <div class="account-group">
                <div class="account-group-header">
                    <div class="account-group-title">
                        <i class="fas fa-chevron-down group-toggle" onclick="ActionsRenderer.toggleGroup(this)"></i>
                        <span class="account-name">${plan.accountName}</span>
                        <span class="task-count">${tasks.length} tasks</span>
                        <span class="account-health health-${plan.accountHealth}">${plan.accountHealth}</span>
                        <span class="renewal-value">$${app.formatNumber(plan.renewalBaseline)}</span>
                    </div>
                </div>
                
                <div class="account-tasks">
                    ${tasks.map(task => this.renderTaskRow(task, app)).join('')}
                </div>
            </div>
        `;
    }

    static renderTaskRow(task, app) {
        return `
            <div class="pm-table-row task-row" data-task-id="${task.id}">
                <div class="pm-cell checkbox-col">
                    <input type="checkbox" class="task-checkbox" 
                           onchange="ActionsRenderer.toggleTaskComplete('${task.id}', this.checked)">
                </div>
                <div class="pm-cell task-col">
                    <div class="task-content">
                        <span class="task-title">${task.title}</span>
                        ${task.description ? `<div class="task-description">${task.description}</div>` : ''}
                    </div>
                </div>
                <div class="pm-cell due-date-col">
                    <span class="due-date ${task.overdue ? 'overdue' : ''}">${task.dueDate}</span>
                </div>
                <div class="pm-cell plays-col">
                    <button class="plays-button" onclick="ActionsRenderer.openPlaysModal('${task.actionId}', '${task.title}')">
                        <span class="plays-count">${task.playsCount}</span>
                        <span class="plays-label">plays</span>
                    </button>
                </div>
                <div class="pm-cell priority-col">
                    <span class="priority-badge priority-${task.priority.toLowerCase()}">${task.priority}</span>
                </div>
                <div class="pm-cell assignee-col">
                    <div class="assignee-avatar">
                        <span class="assignee-initials">${task.assigneeInitials}</span>
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

    // Project Management Helper Methods
    static getTasksFromPlan(plan, app) {
        const tasks = [];
        if (!plan.planData.actionItems) return tasks;

        plan.planData.actionItems.forEach((actionItem, index) => {
            // Get CS plays count for this action
            const playsCount = this.getPlaysCountForAction(actionItem.actionId, app);
            
            // Generate realistic due date (1-14 days from now)
            const dueDate = this.generateDueDate(index);
            
            // Determine priority based on urgency and high priority signals
            const priority = this.determinePriority(plan, index);
            
            // Generate assignee initials
            const assigneeInitials = this.generateAssigneeInitials();

            tasks.push({
                id: `${plan.accountId}-${index}`,
                title: actionItem.action || actionItem.title || actionItem,
                description: actionItem.rationale ? actionItem.rationale.substring(0, 100) + '...' : '',
                actionId: actionItem.actionId || `action-${index}`,
                dueDate: dueDate.formatted,
                overdue: dueDate.overdue,
                playsCount: playsCount,
                priority: priority,
                assigneeInitials: assigneeInitials,
                completed: false,
                accountId: plan.accountId
            });
        });

        return tasks;
    }

    static getPlaysCountForAction(actionId, app) {
        if (!actionId || !app.data) return 0;
        
        // Find signal with this action_id to get plays count
        const signal = app.data.find(s => s.action_id === actionId);
        if (!signal) return 0;

        let count = 0;
        if (signal.play_1_name && signal.play_1_name.trim()) count++;
        if (signal.play_2_name && signal.play_2_name.trim()) count++;
        if (signal.play_3_name && signal.play_3_name.trim()) count++;
        
        return count;
    }

    static generateDueDate(index) {
        const today = new Date();
        const daysToAdd = Math.floor(Math.random() * 14) + 1; // 1-14 days
        const dueDate = new Date(today.getTime() + (daysToAdd * 24 * 60 * 60 * 1000));
        
        // Sometimes make dates overdue for realism
        const isOverdue = Math.random() < 0.15; // 15% chance of overdue
        
        if (isOverdue && index > 0) {
            dueDate.setDate(dueDate.getDate() - Math.floor(Math.random() * 5) - 1);
        }

        const formatted = dueDate.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric' 
        });

        return {
            formatted,
            overdue: isOverdue && index > 0,
            date: dueDate
        };
    }

    static determinePriority(plan, index) {
        if (plan.urgency === 'critical') {
            return index === 0 ? 'High' : (Math.random() > 0.5 ? 'High' : 'Medium');
        } else if (plan.urgency === 'high') {
            return index === 0 ? 'High' : (Math.random() > 0.6 ? 'Medium' : 'Low');
        } else {
            return Math.random() > 0.7 ? 'Medium' : 'Low';
        }
    }

    static generateAssigneeInitials() {
        const names = ['JS', 'MK', 'AB', 'RT', 'LW', 'DM', 'SC', 'JH', 'KP', 'NR'];
        return names[Math.floor(Math.random() * names.length)];
    }

    // Interactive Methods
    static toggleAllTasks(checkbox) {
        const taskCheckboxes = document.querySelectorAll('.task-checkbox');
        taskCheckboxes.forEach(cb => {
            cb.checked = checkbox.checked;
            this.toggleTaskComplete(cb.closest('.task-row').dataset.taskId, cb.checked);
        });
    }

    static toggleGroup(chevron) {
        const group = chevron.closest('.account-group');
        const tasks = group.querySelector('.account-tasks');
        
        if (tasks.style.display === 'none') {
            tasks.style.display = 'block';
            chevron.classList.remove('fa-chevron-right');
            chevron.classList.add('fa-chevron-down');
        } else {
            tasks.style.display = 'none';
            chevron.classList.remove('fa-chevron-down');
            chevron.classList.add('fa-chevron-right');
        }
    }

    static toggleTaskComplete(taskId, completed) {
        const taskRow = document.querySelector(`[data-task-id="${taskId}"]`);
        if (taskRow) {
            if (completed) {
                taskRow.classList.add('task-completed');
            } else {
                taskRow.classList.remove('task-completed');
            }
        }
        
        // Update task completion in data (if we implement persistence)
        console.log(`Task ${taskId} marked as ${completed ? 'completed' : 'incomplete'}`);
    }

    static openPlaysModal(actionId, taskTitle) {
        // Reuse the existing modal functionality from PortfolioRenderer
        if (window.PortfolioRenderer && window.PortfolioRenderer.openAddToPlanModal) {
            window.PortfolioRenderer.openAddToPlanModal(actionId, taskTitle);
        } else {
            console.log(`Opening plays modal for action ${actionId}: ${taskTitle}`);
        }
    }
}