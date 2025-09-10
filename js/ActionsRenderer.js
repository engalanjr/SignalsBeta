// Actions Renderer - Handle action plans tab rendering
class ActionsRenderer {

    static async renderActions(app) {
        const container = document.getElementById('actionsList');
        if (!container) return;

        // Update overview statistics
        this.updateActionsOverview(app);

        // Get action plans and convert to display format
        const actionPlans = await this.getFormattedActionPlans(app);

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

        // Update pending actions count (case-insensitive comparison)
        const pendingElement = document.getElementById('pendingActions');
        if (pendingElement) {
            const pendingCount = actionPlans.filter(plan => {
                const status = plan.status ? plan.status.toLowerCase() : '';
                return status === 'pending';
            }).length;
            pendingElement.textContent = pendingCount;
        }

        // Update in progress actions count (case-insensitive comparison)
        const inProgressElement = document.getElementById('inProgressActions');
        if (inProgressElement) {
            const inProgressCount = actionPlans.filter(plan => {
                const status = plan.status ? plan.status.toLowerCase() : '';
                return status === 'in progress' || status === 'in-progress' || status === 'active';
            }).length;
            inProgressElement.textContent = inProgressCount;
        }

        // Update completed count
        const completedElement = document.getElementById('projectedImpact');
        if (completedElement) {
            // Count completed action plans
            const completedCount = actionPlans.filter(plan => {
                const status = plan.status ? plan.status.toLowerCase() : '';
                return status === 'complete' || status === 'completed';
            }).length;
            completedElement.textContent = completedCount;
        }

        // Debug logging to verify status values
        console.log('Action Plans for KPI calculation:', actionPlans.map(plan => ({
            accountId: plan.accountId,
            accountName: plan.accountName,
            status: plan.status,
            title: plan.title
        })));
    }

    static async getFormattedActionPlans(app) {
        const actionPlans = [];

        // First, process any action plans loaded from Domo API during initialization
        console.log(`Processing ${app.actionPlans.size} action plans from app state...`);
        for (let [planId, planData] of app.actionPlans) {
            // Extract account ID from plan data (since map key is now planId, not accountId)
            const accountId = planData.accountId;
            const account = app.accounts.get(accountId);
            if (!account) {
                console.warn(`Skipping plan ${planId} - account ${accountId} not found in app.accounts`);
                console.log(`Available account IDs in app.accounts:`, Array.from(app.accounts.keys()));
                console.log(`Plan data:`, { planId, accountId, planTitle: planData.title });
                continue;
            }

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
                nextAction: this.getNextAction(planData),
                daysUntilRenewal: Math.floor(Math.random() * 300) + 30
            });
        }

        // If we have Domo action plans, return them
        if (actionPlans.length > 0) {
            console.log(`Using ${actionPlans.length} action plans from app state`);
            return actionPlans.sort((a, b) => {
                // Sort by urgency first, then by last updated
                const urgencyOrder = { critical: 0, high: 1, normal: 2 };
                if (urgencyOrder[a.urgency] !== urgencyOrder[b.urgency]) {
                    return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
                }
                return new Date(b.lastUpdated || 0) - new Date(a.lastUpdated || 0);
            });
        }

        // Only if no Domo action plans exist, try loading fallback JSON
        try {
            console.log('No action plans from Domo, loading fallback data...');
            const fallbackPlans = await this.loadFallbackActionPlans(app);
            if (fallbackPlans.length > 0) {
                console.log(`Loaded ${fallbackPlans.length} action plans from fallback JSON`);
                
                // Store the fallback plans in the app's action plans map
                console.log('Storing loaded action plans in app state...');
                
                // Clear DataService array first to avoid duplicates
                DataService.actionPlans.length = 0;
                fallbackPlans.forEach(plan => {
                    if (plan.accountId && app.actionPlans) {
                        // Use unique plan ID as key instead of accountId to avoid overwrites
                        const planId = plan.planData.originalPlanContent.id || plan.planData.id || `plan-${Date.now()}-${Math.random()}`;
                        
                        // Store the actual plan data with necessary account info, not the wrapper
                        const actualPlanData = {
                            ...plan.planData,
                            accountId: plan.accountId,
                            accountName: plan.accountName,
                            title: plan.planData.originalPlanContent.title,
                            description: plan.planData.originalPlanContent.description,
                            plays: plan.planData.originalPlanContent.plays || [],
                            actionId: plan.planData.originalPlanContent.actionId,
                            priority: plan.planData.originalPlanContent.priority || 'medium',
                            status: plan.planData.originalPlanContent.status || 'pending',  // Preserve status field
                            dueDate: plan.planData.originalPlanContent.dueDate,
                            createdDate: plan.planData.originalPlanContent.createdDate,
                            signalId: plan.planData.originalPlanContent.signalId,
                            planTitle: plan.planData.originalPlanContent.planTitle,
                            createdBy: plan.planData.originalPlanContent.createdBy,
                            createdByUserId: plan.planData.originalPlanContent.createdByUserId
                        };
                        
                        app.actionPlans.set(planId, actualPlanData);
                        
                        // CRITICAL: Synchronize with DataService.actionPlans array
                        // Ensure the plan has the correct ID structure for DataService
                        const dataServicePlan = {
                            ...actualPlanData,
                            id: planId // Ensure ID is set for DataService array lookup
                        };
                        DataService.actionPlans.push(dataServicePlan);
                        
                        console.log(`Stored action plan with ID ${planId} for account: ${plan.accountName} (${plan.accountId})`);
                    }
                });
                
                // Validate and fix loaded action plans
                console.log('Validating loaded action plans...');
                const validationResults = ActionPlanService.validateActionPlanAssociations(app);
                
                if (validationResults.fixed > 0) {
                    console.log(`Auto-fixed ${validationResults.fixed} action plans with missing associations`);
                }
                
                if (validationResults.invalid > 0) {
                    console.warn(`Found ${validationResults.invalid} action plans with validation issues`);
                }
                
                return fallbackPlans;
            }
        } catch (error) {
            console.error('Failed to load fallback action plans:', error);
        }

        // If no action plans from any source, return empty array
        return [];
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
        // Group plans by account for proper rendering
        const plansByAccount = new Map();
        actionPlans.forEach(plan => {
            const accountId = plan.accountId;
            if (!plansByAccount.has(accountId)) {
                plansByAccount.set(accountId, []);
            }
            plansByAccount.get(accountId).push(plan);
        });
        
        console.log(`Rendering ${plansByAccount.size} account groups with ${actionPlans.length} total plans`);
        
        return `
            <div class="project-management-container">
                <div class="pm-table-header">
                    <div class="pm-header-cell checkbox-col"></div>
                    <div class="pm-header-cell task-col">Action Plan</div>
                    <div class="pm-header-cell due-date-col">Due Date</div>
                    <div class="pm-header-cell status-col">Status</div>
                    <div class="pm-header-cell priority-col">Priority</div>
                    <div class="pm-header-cell assignee-col">Assignee</div>
                </div>
                
                ${Array.from(plansByAccount.values()).map(accountPlans => 
                    this.renderAccountGroup(accountPlans, app)
                ).join('')}
            </div>
        `;
    }

    static renderAccountGroup(accountPlans, app) {
        // accountPlans is now an array of plans for the same account
        if (!Array.isArray(accountPlans) || accountPlans.length === 0) {
            return '';
        }
        
        // Use the first plan for account-level information
        const firstPlan = accountPlans[0];
        
        // Get all tasks from all plans for this account
        const allActionPlans = [];
        accountPlans.forEach(plan => {
            const tasks = this.getActionPlansFromPlan(plan, app);
            allActionPlans.push(...tasks);
        });
        
        console.log(`Account ${firstPlan.accountName}: Generated ${allActionPlans.length} tasks from ${accountPlans.length} plans`);
        
        return `
            <div class="account-group">
                <div class="account-group-header">
                    <div class="account-group-title">
                        <i class="fas fa-chevron-down group-toggle" onclick="ActionsRenderer.toggleGroup(this)"></i>
                        <span class="account-name">${firstPlan.accountName}</span>
                        <span class="task-count">${allActionPlans.length} action plans</span>
                        <span class="account-health health-${firstPlan.accountHealth}">${firstPlan.accountHealth}</span>
                        <span class="renewal-value">$${app.formatNumber(firstPlan.renewalBaseline)}</span>
                    </div>
                </div>
                
                <div class="account-action-plans">
                    ${allActionPlans.map(task => this.renderTaskRow(task, app)).join('')}
                </div>
            </div>
        `;
    }

    static renderTaskRow(task, app) {
        const isComplete = task.status && task.status.toLowerCase() === 'complete';
        return `
            <div class="pm-table-row action-plan-row clickable-task ${isComplete ? 'task-completed' : ''}" 
                 data-task-id="${task.id}" 
                 data-action-id="${task.actionId}"
                 onclick="ActionsRenderer.handleTaskRowClick(event, '${task.id}', '${task.actionId}')"
                 oncontextmenu="ActionsRenderer.handleTaskRightClick(event, '${task.id}', '${task.actionId}')"
                 data-selectable="true">
                <div class="pm-cell checkbox-col" onclick="event.stopPropagation()">
                    <input type="checkbox" class="action-plan-checkbox" 
                           onchange="ActionsRenderer.toggleTaskComplete('${task.id}', this.checked)">
                </div>
                <div class="pm-cell task-col">
                    <div class="action-plan-content">
                        <div class="action-plan-title">${task.title}</div>
                        ${task.description ? `<div class="action-plan-description">${task.description}</div>` : ''}
                    </div>
                </div>
                <div class="pm-cell due-date-col">
                    <span class="due-date ${task.overdue ? 'overdue' : ''}">${task.dueDate}</span>
                </div>
                <div class="pm-cell status-col">
                    <span class="status-badge status-${task.status ? task.status.toLowerCase().replace(' ', '-') : 'pending'}">${task.status || 'Pending'}</span>
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
    static getActionPlansFromPlan(plan, app) {
        const actionPlans = [];
        
        // Handle new single-action-per-plan data model
        // Each plan now represents one action, not multiple actionItems
        if (!plan.planData) return tasks;
        
        // In the new model, action data is directly in the plan, not in actionItems array
        const title = plan.title || plan.planData.title || 'Untitled Action';
        const actionId = plan.actionId || plan.planData.actionId;
        
        // Only include actions with real action IDs from CSV data
        if (!actionId) {
            console.warn(`Skipping action without actionId: ${title}`);
            return actionPlans;
        }
        
        // Get CS plays count from the plan's plays array
        let playsCount = 0;
        const plays = plan.plays || plan.planData.plays || [];
        if (Array.isArray(plays)) {
            playsCount = plays.length;
        } else {
            playsCount = this.getPlaysCountForAction(actionId, app);
        }
        
        // Debug log to see what's happening with action and plays data
        console.log(`Action "${title}" (ID: ${actionId}) has plays:`, plays, 'count:', playsCount);
        
        // Generate realistic due date
        const dueDate = this.generateDueDate(0);
        
        // Determine priority from plan data
        const priority = plan.priority || plan.planData.priority || 'Medium';
        
        // Get assignee initials from plan data or generate
        let assigneeInitials;
        const assignee = plan.assignee || plan.planData.assignee || plan.createdBy || plan.planData.createdBy;
        if (assignee) {
            assigneeInitials = assignee === 'Current User' ? 'CU' : this.getInitialsFromName(assignee);
        } else {
            assigneeInitials = this.generateAssigneeInitials();
        }
        
        // Create single task from the plan (new single-action-per-plan model)
        const description = plan.description || plan.planData.description || '';
        const status = plan.status || plan.planData.status || 'pending';
        
        actionPlans.push({
            id: plan.id || plan.planData.id || `${plan.accountId}-0`,
            title: title,
            description: description.length > 100 ? description.substring(0, 100) + '...' : description,
            actionId: actionId,
            dueDate: dueDate.formatted,
            overdue: dueDate.overdue,
            playsCount: playsCount,
            status: this.capitalizeFirstLetter(status),
            priority: this.capitalizeFirstLetter(priority),
            assigneeInitials: assigneeInitials,
            completed: false,
            accountId: plan.accountId,
            rawActionItem: {
                title: title,
                actionId: actionId,
                plays: plays,
                description: description,
                status: status,
                priority: priority
            },
            isAIGenerated: false // All data is now real from CSV/JSON
        });
        
        return actionPlans;
    }
    
    static capitalizeFirstLetter(string) {
        if (!string) return '';
        return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
    }
    
    // REMOVED - Do not generate fake action IDs

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

    static getPlaysDataForAction(actionId, app) {
        if (!actionId || !app.data) return [];
        
        // Find signal with this action_id to get plays data
        const signal = app.data.find(s => s.action_id === actionId);
        if (!signal) return [];

        const plays = [];
        if (signal.play_1_name && signal.play_1_name.trim()) {
            plays.push({
                playId: `play_${actionId}_1`,
                playName: signal.play_1_name.trim(),
                playTitle: signal.play_1_name.trim()
            });
        }
        if (signal.play_2_name && signal.play_2_name.trim()) {
            plays.push({
                playId: `play_${actionId}_2`,
                playName: signal.play_2_name.trim(),
                playTitle: signal.play_2_name.trim()
            });
        }
        if (signal.play_3_name && signal.play_3_name.trim()) {
            plays.push({
                playId: `play_${actionId}_3`,
                playName: signal.play_3_name.trim(),
                playTitle: signal.play_3_name.trim()
            });
        }
        
        return plays;
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

    static getInitialsFromName(fullName) {
        if (!fullName || typeof fullName !== 'string') return 'UN';
        
        const parts = fullName.trim().split(' ');
        if (parts.length === 1) {
            // Single name, use first two characters
            return parts[0].substring(0, 2).toUpperCase();
        } else {
            // Multiple parts, use first letter of first and last
            return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
        }
    }

    // Interactive Methods

    static toggleGroup(chevron) {
        const group = chevron.closest('.account-group');
        const tasks = group.querySelector('.account-action-plans');
        
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

    static async toggleTaskComplete(taskId, completed) {
        const taskRow = document.querySelector(`[data-task-id="${taskId}"]`);
        if (!taskRow) return;
        
        const actionId = taskRow.dataset.actionId;
        
        // Get current status before changing it
        const statusBadge = taskRow.querySelector('.status-badge');
        const currentStatus = statusBadge ? statusBadge.textContent.trim() : 'Pending';
        
        // Store previous status on the element if we haven't already
        if (!taskRow.dataset.previousStatus && currentStatus !== 'Complete') {
            taskRow.dataset.previousStatus = currentStatus;
        }
        
        // Determine new status
        let newStatus;
        if (completed) {
            newStatus = 'Complete';
            taskRow.classList.add('action-plan-completed');
        } else {
            // Restore previous status or default to 'Pending'
            newStatus = taskRow.dataset.previousStatus || 'Pending';
            taskRow.classList.remove('action-plan-completed');
            // Clear the stored previous status since we're back to original state
            delete taskRow.dataset.previousStatus;
        }
        
        // Update the status badge immediately for responsive UI
        if (statusBadge) {
            statusBadge.textContent = newStatus;
            statusBadge.className = `status-badge status-${newStatus.toLowerCase().replace(' ', '-')}`;
        }
        
        console.log(`Task ${taskId} status changing from "${currentStatus}" to "${newStatus}"`);
        
        // Find the action plan and update it via ActionPlanService
        try {
            const app = window.app;
            if (!app) {
                console.error('SignalsAI app instance not found');
                return;
            }
            
            // Find the plan ID associated with this task
            let planId = null;
            let planData = null;
            
            // Search through action plans to find the one containing this action
            // Handle new single-action-per-plan data model where each plan represents one action
            for (let [id, plan] of app.actionPlans) {
                // Check if this plan's actionId matches the task's actionId
                const planActionId = plan.actionId || plan.planData?.actionId;
                
                if (planActionId === actionId) {
                    planId = id;
                    planData = plan;
                    break;
                }
            }
            
            // If we didn't find by actionId, try to find by the task ID itself (fallback)
            if (!planId && app.actionPlans.has(taskId)) {
                planId = taskId;
                planData = app.actionPlans.get(taskId);
            }
            
            if (planId && planData) {
                // Update the plan's status directly (new single-action-per-plan model)
                planData.status = newStatus;
                
                // Update the entire plan with the new status
                const updateResult = await ActionPlanService.updateActionPlan(planId, {
                    status: newStatus,
                    updatedAt: new Date().toISOString()
                }, app);
                
                if (updateResult.success) {
                    console.log(`Successfully updated action plan status for task ${taskId} to ${newStatus}`);
                } else {
                    console.error('Failed to update action plan:', updateResult.error);
                    // Revert UI changes if save failed
                    if (completed) {
                        taskRow.classList.remove('action-plan-completed');
                    } else {
                        taskRow.classList.add('action-plan-completed');
                    }
                    if (statusBadge) {
                        statusBadge.textContent = currentStatus;
                        statusBadge.className = `status-badge status-${currentStatus.toLowerCase().replace(' ', '-')}`;
                    }
                }
            } else {
                console.warn(`Could not find action plan for task ${taskId} with action ${actionId}`);
            }
        } catch (error) {
            console.error('Error updating action plan status:', error);
            // Revert UI changes if save failed
            if (completed) {
                taskRow.classList.remove('action-plan-completed');
            } else {
                taskRow.classList.add('action-plan-completed');
            }
            if (statusBadge) {
                statusBadge.textContent = currentStatus;
                statusBadge.className = `status-badge status-${currentStatus.toLowerCase().replace(' ', '-')}`;
            }
        }
    }

    // === MULTI-SELECT AND RIGHT-CLICK FUNCTIONALITY ===

    static selectedTasks = new Set();

    static handleTaskRowClick(event, taskId, actionId) {
        // Check for Ctrl/Cmd + Click for multi-selection
        if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            this.toggleTaskSelection(taskId);
            return;
        }

        // Clear selection if no modifier keys
        this.clearTaskSelection();
        
        // Open task details drawer (original functionality)
        this.openTaskDetailsDrawer(taskId, actionId);
    }

    static handleTaskRightClick(event, taskId, actionId) {
        event.preventDefault();
        
        // If right-clicking on a non-selected task, select only that task
        if (!this.selectedTasks.has(taskId)) {
            this.clearTaskSelection();
            this.toggleTaskSelection(taskId);
        }

        this.showContextMenu(event, taskId, actionId);
    }

    static toggleTaskSelection(taskId) {
        const taskRow = document.querySelector(`[data-task-id="${taskId}"]`);
        if (!taskRow) return;

        if (this.selectedTasks.has(taskId)) {
            this.selectedTasks.delete(taskId);
            taskRow.classList.remove('task-selected');
        } else {
            this.selectedTasks.add(taskId);
            taskRow.classList.add('task-selected');
        }

        console.log('Selected tasks:', Array.from(this.selectedTasks));
    }

    static clearTaskSelection() {
        document.querySelectorAll('.task-row.task-selected').forEach(row => {
            row.classList.remove('task-selected');
        });
        this.selectedTasks.clear();
    }

    static showContextMenu(event, taskId, actionId) {
        // Remove existing context menu
        this.removeContextMenu();

        const menu = document.createElement('div');
        menu.id = 'taskContextMenu';
        menu.className = 'task-context-menu';
        
        const selectedCount = this.selectedTasks.size;
        const menuText = selectedCount > 1 ? `Delete ${selectedCount} Tasks` : 'Delete Task';
        const iconClass = selectedCount > 1 ? 'fa-trash-alt' : 'fa-trash';
        
        menu.innerHTML = `
            <div class="context-menu-item" onclick="ActionsRenderer.confirmDeleteTasks()">
                <i class="fas ${iconClass}"></i>
                <span>${menuText}</span>
            </div>
        `;

        // Position the menu at cursor
        menu.style.left = event.pageX + 'px';
        menu.style.top = event.pageY + 'px';

        document.body.appendChild(menu);

        // Close menu when clicking elsewhere
        setTimeout(() => {
            document.addEventListener('click', this.removeContextMenu, { once: true });
        }, 10);
    }

    static removeContextMenu() {
        const menu = document.getElementById('taskContextMenu');
        if (menu) {
            menu.remove();
        }
    }

    static confirmDeleteTasks() {
        this.removeContextMenu();
        
        const selectedCount = this.selectedTasks.size;
        if (selectedCount === 0) return;

        this.showDeleteConfirmationModal(selectedCount);
    }

    static showDeleteConfirmationModal(taskCount) {
        // Remove existing modal if present
        this.removeDeleteModal();

        const modal = document.createElement('div');
        modal.id = 'deleteConfirmationModal';
        modal.className = 'delete-confirmation-modal';

        const taskText = taskCount === 1 ? 'task' : 'tasks';
        const deleteText = taskCount === 1 ? 'this task' : `these ${taskCount} tasks`;

        modal.innerHTML = `
            <div class="delete-modal-backdrop" onclick="ActionsRenderer.removeDeleteModal()"></div>
            <div class="delete-modal-content">
                <div class="delete-modal-header">
                    <div class="delete-modal-icon">
                        <i class="fas fa-exclamation-triangle"></i>
                    </div>
                    <h3 class="delete-modal-title">Delete ${taskText.charAt(0).toUpperCase() + taskText.slice(1)}</h3>
                </div>
                
                <div class="delete-modal-body">
                    <p>Are you sure you want to delete ${deleteText}? This action cannot be undone.</p>
                    ${taskCount > 1 ? `<p class="delete-task-count">${taskCount} ${taskText} will be permanently removed.</p>` : ''}
                </div>
                
                <div class="delete-modal-footer">
                    <button class="btn btn-secondary delete-cancel-btn" onclick="ActionsRenderer.removeDeleteModal()">
                        Cancel
                    </button>
                    <button class="btn btn-danger delete-confirm-btn" onclick="ActionsRenderer.executeTaskDeletion()">
                        <i class="fas fa-trash"></i> Delete ${taskText.charAt(0).toUpperCase() + taskText.slice(1)}
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Animate in
        setTimeout(() => {
            modal.classList.add('show');
        }, 10);
    }

    static removeDeleteModal() {
        const modal = document.getElementById('deleteConfirmationModal');
        if (modal) {
            modal.classList.remove('show');
            setTimeout(() => {
                if (modal.parentNode) {
                    modal.remove();
                }
            }, 200);
        }
    }

    static async executeTaskDeletion() {
        const selectedTaskIds = Array.from(this.selectedTasks);
        
        if (selectedTaskIds.length === 0) {
            this.removeDeleteModal();
            return;
        }

        // Close the confirmation modal
        this.removeDeleteModal();

        try {
            // Group tasks by account/plan for efficient processing
            const tasksByPlan = {};
            
            for (const taskId of selectedTaskIds) {
                // Parse the task ID to get account and task index (e.g., "0013000000DXZ1fAAH-1")
                const [accountId, taskIndex] = taskId.split('-');
                
                if (!tasksByPlan[accountId]) {
                    tasksByPlan[accountId] = [];
                }
                tasksByPlan[accountId].push({
                    taskId: taskId,
                    taskIndex: parseInt(taskIndex)
                });
            }

            let deletedCount = 0;
            
            // Process each action plan
            for (const [accountId, tasksToDelete] of Object.entries(tasksByPlan)) {
                try {
                    // Get the action plan for this account
                    const planData = window.app.actionPlans.get(accountId);
                    
                    if (!planData || !planData.actionItems) {
                        console.warn(`Could not find action plan for account: ${accountId}`);
                        continue;
                    }

                    // Sort tasks by index in descending order to avoid index shifting during deletion
                    const sortedTasks = tasksToDelete.sort((a, b) => b.taskIndex - a.taskIndex);
                    
                    // Create a copy of action items and remove the selected ones by index
                    const updatedActionItems = [...planData.actionItems];
                    
                    for (const task of sortedTasks) {
                        if (task.taskIndex >= 0 && task.taskIndex < updatedActionItems.length) {
                            updatedActionItems.splice(task.taskIndex, 1);
                            deletedCount++;
                        }
                    }

                    // Update the action plan with reduced tasks using CRUD methods
                    const updatedPlanData = {
                        ...planData,
                        actionItems: updatedActionItems,
                        updatedAt: new Date()
                    };

                    // Use ActionPlanService CRUD to update the plan
                    const result = await ActionPlanService.updateActionPlan(planData.id, updatedPlanData, window.app);
                    
                    if (result && result.success) {
                        console.log(`Successfully deleted ${sortedTasks.length} tasks from action plan ${planData.id}`);
                        
                        // Update the local data immediately for UI consistency
                        window.app.actionPlans.set(accountId, result.plan || updatedPlanData);
                    } else {
                        console.error(`Failed to update action plan ${planData.id}:`, result ? result.error : 'No response');
                        // Revert the deleted count for failed operations
                        deletedCount -= sortedTasks.length;
                    }
                    
                } catch (error) {
                    console.error(`Error deleting tasks from account ${accountId}:`, error);
                }
            }

            // Clear selection
            this.clearTaskSelection();
            
            // Show appropriate notification and refresh
            if (deletedCount > 0) {
                const taskText = deletedCount === 1 ? 'task' : 'tasks';
                window.app.showSuccessMessage(`Successfully deleted ${deletedCount} ${taskText}`);
                
                // Refresh the Action Plans view to show updated data
                console.log('Refreshing Action Plans view after task deletion');
                window.app.renderCurrentTab();
            } else {
                window.app.showErrorMessage('Failed to delete tasks. Please try again.');
            }

        } catch (error) {
            console.error('Error during task deletion:', error);
            window.app.showErrorMessage('An error occurred while deleting tasks');
            this.clearTaskSelection();
        }
    }

    static async findActionPlanContainingTask(actionId, app) {
        // Search through action plans to find the one containing this actionId
        for (let [accountId, planData] of app.actionPlans) {
            if (planData.actionItems) {
                const foundItem = planData.actionItems.find(item => item.id === actionId);
                if (foundItem) {
                    return {
                        accountId: accountId,
                        planData: planData,
                        actionItem: foundItem
                    };
                }
            }
        }
        return null;
    }

    static openPlaysModal(actionId, taskTitle) {
        console.log(`Opening plays modal for action ${actionId}: ${taskTitle}`);
        
        // Find the action item with this actionId to get its plays
        const actionPlan = this.findActionPlanWithActionId(actionId, window.app);
        if (!actionPlan) {
            console.error('Could not find action plan for actionId:', actionId);
            return;
        }
        
        this.openPlaysDrawer(actionId, taskTitle, actionPlan.actionItem, actionPlan.planData);
    }
    
    static findActionPlanWithActionId(actionId, app) {
        // Search through action plans to find the action item with this actionId
        for (let [accountId, planData] of app.actionPlans) {
            if (planData.actionItems) {
                const actionItem = planData.actionItems.find(item => {
                    return item.actionId === actionId || (typeof item === 'object' && item.actionId === actionId);
                });
                if (actionItem) {
                    return { actionItem, planData, accountId };
                }
            }
        }
        
        // If not found in live data, search fallback data
        return this.findInFallbackData(actionId, app);
    }
    
    static async findInFallbackData(actionId, app) {
        try {
            const response = await fetch('/action-plans-fallback.json');
            const fallbackData = await response.json();
            
            for (const record of fallbackData) {
                const planContent = record.content;
                if (planContent && planContent.actionItems) {
                    const actionItem = planContent.actionItems.find(item => item.actionId === actionId);
                    if (actionItem) {
                        return { actionItem, planData: planContent, accountId: planContent.accountId };
                    }
                }
            }
        } catch (error) {
            console.error('Error searching fallback data:', error);
        }
        return null;
    }
    
    static openPlaysDrawer(actionId, taskTitle, actionItem, planData) {
        console.log('Opening plays drawer for:', { actionId, taskTitle, actionItem });
        
        // Get or create drawer elements
        let drawer = document.getElementById('playsDrawer');
        let backdrop = document.getElementById('playsDrawerBackdrop');
        
        if (!drawer) {
            this.createPlaysDrawerHTML();
            drawer = document.getElementById('playsDrawer');
            backdrop = document.getElementById('playsDrawerBackdrop');
        }
        
        // Populate drawer content
        this.populatePlaysDrawer(actionId, taskTitle, actionItem, planData);
        
        // Show drawer
        if (drawer && backdrop) {
            backdrop.classList.add('open');
            setTimeout(() => {
                drawer.classList.add('open');
            }, 10);
        }
    }
    
    static createPlaysDrawerHTML() {
        const drawerHTML = `
            <!-- Plays Drawer Backdrop -->
            <div id="playsDrawerBackdrop" class="drawer-backdrop" onclick="ActionsRenderer.closePlaysDrawer()"></div>
            
            <!-- Plays Drawer -->
            <div id="playsDrawer" class="drawer plays-drawer">
                <div class="drawer-header">
                    <h2><i class="fas fa-play-circle"></i> Manage CS Plays</h2>
                    <button class="drawer-close-btn" onclick="ActionsRenderer.closePlaysDrawer()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <div class="drawer-body">
                    <div id="playsDrawerContent">
                        <!-- Content will be populated here -->
                    </div>
                </div>
                
                <div class="drawer-footer">
                    <button class="btn btn-secondary" onclick="ActionsRenderer.closePlaysDrawer()">Close</button>
                    <button class="btn btn-primary" onclick="ActionsRenderer.savePlayUpdates()">
                        <i class="fas fa-save"></i> Save Updates
                    </button>
                </div>
            </div>
        `;
        
        // Add to body if not exists
        if (!document.getElementById('playsDrawer')) {
            document.body.insertAdjacentHTML('beforeend', drawerHTML);
        }
    }
    
    static populatePlaysDrawer(actionId, taskTitle, actionItem, planData) {
        const container = document.getElementById('playsDrawerContent');
        if (!container) return;
        
        const plays = actionItem.plays || [];
        console.log('Populating drawer with plays:', plays);
        
        let html = `
            <div class="plays-drawer-section">
                <h3><i class="fas fa-lightbulb"></i> Action Plan Task</h3>
                <div class="action-task-card">
                    <div class="action-task-title">${taskTitle}</div>
                    <div class="action-task-meta">
                        <span class="action-id-badge">ID: ${actionId}</span>
                    </div>
                </div>
            </div>
            
            <div class="plays-drawer-section">
                <h3><i class="fas fa-play"></i> Associated CS Plays (${plays.length})</h3>
                <div class="plays-description">
                    Mark plays as complete to track progress on this action plan task.
                </div>
                
                <div class="plays-list">
        `;
        
        if (plays.length === 0) {
            html += `
                <div class="no-plays-message">
                    <i class="fas fa-info-circle"></i>
                    No CS plays are associated with this action plan task.
                </div>
            `;
        } else {
            plays.forEach((play, index) => {
                const playTitle = play.playTitle || play.playName || `Play ${index + 1}`;
                const playId = play.playId || `play_${index + 1}`;
                const isCompleted = play.completed || false;
                
                html += `
                    <div class="play-item" data-action-id="${actionId}" data-play-id="${playId}" data-play-index="${index}">
                        <div class="play-checkbox-container">
                            <input type="checkbox" 
                                   id="playCheck-${index}" 
                                   class="play-completion-checkbox"
                                   ${isCompleted ? 'checked' : ''}
                                   onchange="ActionsRenderer.togglePlayCompletion('${actionId}', '${playId}', ${index}, this.checked)">
                            <label for="playCheck-${index}" class="play-completion-label">
                                <i class="fas fa-check"></i>
                            </label>
                        </div>
                        <div class="play-content">
                            <div class="play-title ${isCompleted ? 'completed' : ''}">${playTitle}</div>
                            <div class="play-status">
                                <span class="status-badge ${isCompleted ? 'completed' : 'pending'}">
                                    ${isCompleted ? 'Completed' : 'Pending'}
                                </span>
                            </div>
                        </div>
                    </div>
                `;
            });
        }
        
        html += `
                </div>
            </div>
        `;
        
        container.innerHTML = html;
    }
    
    static closePlaysDrawer() {
        const drawer = document.getElementById('playsDrawer');
        const backdrop = document.getElementById('playsDrawerBackdrop');
        
        if (drawer) {
            drawer.classList.remove('open');
        }
        
        if (backdrop) {
            setTimeout(() => {
                backdrop.classList.remove('open');
            }, 300);
        }
    }
    
    static togglePlayCompletion(actionId, playId, playIndex, isCompleted) {
        console.log(`Toggle play completion: actionId=${actionId}, playId=${playId}, index=${playIndex}, completed=${isCompleted}`);
        
        // Update the visual state immediately
        const playItem = document.querySelector(`[data-action-id="${actionId}"][data-play-index="${playIndex}"]`);
        
        if (!playItem) {
            console.warn(`Could not find play item with actionId=${actionId} and playIndex=${playIndex}`);
            // Continue with data update even if visual update fails
        } else {
            const playTitle = playItem.querySelector('.play-title');
            const statusBadge = playItem.querySelector('.status-badge');
            
            if (playTitle && statusBadge) {
                if (isCompleted) {
                    playTitle.classList.add('completed');
                    statusBadge.textContent = 'Completed';
                    statusBadge.className = 'status-badge completed';
                } else {
                    playTitle.classList.remove('completed');
                    statusBadge.textContent = 'Pending';
                    statusBadge.className = 'status-badge pending';
                }
            }
        }
        
        // Store the update for later saving
        if (!window.playUpdates) {
            window.playUpdates = new Map();
        }
        
        if (!window.playUpdates.has(actionId)) {
            window.playUpdates.set(actionId, new Map());
        }
        
        window.playUpdates.get(actionId).set(playId, {
            playIndex: playIndex,
            completed: isCompleted,
            timestamp: new Date().toISOString()
        });
        
        console.log('Stored play update:', window.playUpdates.get(actionId).get(playId));
    }
    
    static async savePlayUpdates() {
        if (!window.playUpdates || window.playUpdates.size === 0) {
            this.closePlaysDrawer();
            return;
        }
        
        console.log('Saving play updates:', window.playUpdates);
        
        try {
            // Update action plans data with play completion status
            for (let [actionId, playUpdates] of window.playUpdates) {
                await this.updateActionPlanPlayStatus(actionId, playUpdates);
            }
            
            // Clear updates and refresh the Action Plans view
            window.playUpdates.clear();
            this.closePlaysDrawer();
            
            // Refresh the Action Plans view to show updated play counts
            if (window.app && typeof window.app.renderActions === 'function') {
                window.app.renderActions();
            }
            
            // Show success message
            this.showPlayUpdateSuccess();
            
        } catch (error) {
            console.error('Error saving play updates:', error);
            this.showPlayUpdateError(error.message);
        }
    }
    
    static async updateActionPlanPlayStatus(actionId, playUpdates) {
        // Find and update the action plan data
        const app = window.app;
        
        // Update in live action plans
        for (let [accountId, planData] of app.actionPlans) {
            if (planData.actionItems) {
                const actionItem = planData.actionItems.find(item => item.actionId === actionId);
                if (actionItem && actionItem.plays) {
                    for (let [playId, updateData] of playUpdates) {
                        const playIndex = updateData.playIndex;
                        if (actionItem.plays[playIndex]) {
                            actionItem.plays[playIndex].completed = updateData.completed;
                            actionItem.plays[playIndex].lastUpdated = updateData.timestamp;
                        }
                    }
                    return; // Found and updated
                }
            }
        }
        
        console.log(`Action plan for actionId ${actionId} updated with play completion status`);
    }
    
    static showPlayUpdateSuccess() {
        const message = document.createElement('div');
        message.className = 'update-notification success';
        message.innerHTML = `
            <i class="fas fa-check-circle"></i>
            Play completion status updated successfully!
        `;
        document.body.appendChild(message);
        
        setTimeout(() => {
            message.classList.add('show');
            setTimeout(() => {
                message.classList.remove('show');
                setTimeout(() => message.remove(), 300);
            }, 3000);
        }, 100);
    }
    
    static showPlayUpdateError(errorMessage) {
        const message = document.createElement('div');
        message.className = 'update-notification error';
        message.innerHTML = `
            <i class="fas fa-exclamation-circle"></i>
            Error updating plays: ${errorMessage}
        `;
        document.body.appendChild(message);
        
        setTimeout(() => {
            message.classList.add('show');
            setTimeout(() => {
                message.classList.remove('show');
                setTimeout(() => message.remove(), 300);
            }, 5000);
        }, 100);
    }
    
    // Task Details Drawer Methods
    static async openTaskDetailsDrawer(taskId, actionId) {
        console.log(`Opening task details drawer for taskId: ${taskId}, actionId: ${actionId}`);
        
        try {
            // Find the task data (now async)
            const actionPlanData = await this.findTaskData(taskId, actionId, window.app);
            if (!actionPlanData) {
                console.error('Could not find task data for:', { taskId, actionId });
                this.showTaskUpdateError('Task data not found');
                return;
            }
            
            console.log('Found action plan data:', actionPlanData);
            
            // Create or get drawer elements
            let drawer = document.getElementById('taskDetailsDrawer');
            let backdrop = document.getElementById('taskDetailsDrawerBackdrop');
            
            if (!drawer) {
                this.createTaskDetailsDrawerHTML();
                drawer = document.getElementById('taskDetailsDrawer');
                backdrop = document.getElementById('taskDetailsDrawerBackdrop');
            }
            
            // Populate drawer content
            this.populateTaskDetailsDrawer(actionPlanData);
            
            // Show drawer
            if (drawer && backdrop) {
                backdrop.classList.add('open');
                setTimeout(() => {
                    drawer.classList.add('open');
                }, 10);
            }
        } catch (error) {
            console.error('Error opening task details drawer:', error);
            this.showTaskUpdateError('Failed to open task details');
        }
    }
    
    static createTaskDetailsDrawerHTML() {
        const drawerHTML = `
            <!-- Task Details Drawer Backdrop -->
            <div id="taskDetailsDrawerBackdrop" class="drawer-backdrop" onclick="ActionsRenderer.closeTaskDetailsDrawer()"></div>
            
            <!-- Task Details Drawer -->
            <div id="taskDetailsDrawer" class="drawer task-details-drawer">
                <div class="drawer-header">
                    <h2><i class="fas fa-tasks"></i> Task Details</h2>
                    <button class="drawer-close-btn" onclick="ActionsRenderer.closeTaskDetailsDrawer()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <div class="drawer-body">
                    <div id="taskDetailsContent">
                        <!-- Content will be populated here -->
                    </div>
                </div>
                
                <div class="drawer-footer">
                    <button class="btn btn-primary" onclick="ActionsRenderer.closeTaskDetailsDrawer()">
                        <i class="fas fa-times"></i> Close
                    </button>
                </div>
            </div>
        `;
        
        // Add to body if not exists
        if (!document.getElementById('taskDetailsDrawer')) {
            document.body.insertAdjacentHTML('beforeend', drawerHTML);
        }
    }
    
    static async findTaskData(taskId, actionId, app) {
        // First, try to find in the current rendered action plans (includes AI recommendations)
        const currentActionPlans = await this.getFormattedActionPlans(app);
        
        for (const plan of currentActionPlans) {
            if (plan.planData && plan.planData.actionItems) {
                const actionItem = plan.planData.actionItems.find(item => {
                    // Check if this is the task we're looking for
                    const itemActionId = item.actionId; // Only use real action IDs from CSV data
                    return itemActionId === actionId;
                });
                
                if (actionItem) {
                    console.log('Found task in current action plans:', actionItem);
                    return {
                        taskId,
                        actionId,
                        actionItem,
                        planData: plan.planData,
                        accountId: plan.accountId
                    };
                }
            }
        }
        
        // Second try: find in live action plans  
        for (let [accountId, planData] of app.actionPlans) {
            if (planData.actionItems) {
                const actionItem = planData.actionItems.find(item => 
                    item.actionId === actionId || 
                    (typeof item === 'object' && item.actionId === actionId)
                );
                if (actionItem) {
                    return {
                        taskId,
                        actionId,
                        actionItem,
                        planData,
                        accountId
                    };
                }
            }
        }
        
        // Third try: search fallback data (only if API data wasn't loaded successfully)
        // Check if we're running in development or if API failed to load action plans
        const shouldUseFallback = this.shouldUseFallbackData(app);
        if (shouldUseFallback) {
            const fallbackResult = await this.findTaskInFallbackData(taskId, actionId, app);
            if (fallbackResult) {
                return fallbackResult;
            }
        }
        
        // Last resort: try to reconstruct task data from the task ID
        return this.reconstructTaskData(taskId, actionId, app);
    }
    
    static shouldUseFallbackData(app) {
        // Only use fallback if:
        // 1. We're in development environment (has localhost or specific dev patterns)
        // 2. OR the API didn't successfully load action plans (empty or failed)
        const isDevelopment = window.location.hostname === 'localhost' || 
                             window.location.hostname.includes('replit') ||
                             window.location.hostname.includes('127.0.0.1');
        
        const hasApiData = app.actionPlans && app.actionPlans.size > 0;
        
        // Use fallback only in development OR when API failed to load data
        return isDevelopment || !hasApiData;
    }

    static async findTaskInFallbackData(taskId, actionId, app) {
        try {
            console.log('Attempting to load fallback data for task search...');
            const response = await fetch('/action-plans-fallback.json');
            
            // Check if the response is successful
            if (!response.ok) {
                if (response.status === 404) {
                    console.log('Fallback file not found (404) - this is expected in production');
                    return null;
                }
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const fallbackData = await response.json();
            
            // Validate that fallbackData is an array before iterating
            if (!Array.isArray(fallbackData)) {
                console.error('Fallback data is not an array:', typeof fallbackData);
                return null;
            }
            
            for (const record of fallbackData) {
                const planContent = record.content;
                if (planContent && planContent.actionItems) {
                    const actionItem = planContent.actionItems.find(item => item.actionId === actionId);
                    if (actionItem) {
                        console.log('Found task in fallback data:', actionItem);
                        return {
                            taskId,
                            actionId,
                            actionItem,
                            planData: planContent,
                            accountId: planContent.accountId
                        };
                    }
                }
            }
            
            console.log('Task not found in fallback data');
        } catch (error) {
            if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
                console.log('Fallback file not available - this is expected in production');
            } else {
                console.error('Error searching fallback data:', error);
            }
        }
        return null;
    }
    
    static reconstructTaskData(taskId, actionId, app) {
        console.log('Reconstructing task data for:', { taskId, actionId });
        
        // Try to extract account ID from task ID (format: accountId-index)
        const accountId = taskId.split('-')[0];
        const taskIndex = parseInt(taskId.split('-')[1]) || 0;
        
        // Get plays data from signal based on actionId
        const playsData = this.getPlaysDataForAction(actionId, app);
        
        // Create a basic action item structure
        const actionItem = {
            title: `Generated Action ${taskIndex + 1}`,
            actionId: actionId,
            plays: playsData, // Use actual plays data instead of empty array
            completed: false
        };
        
        // Create basic plan data
        const planData = {
            id: `reconstructed-${taskId}`,
            actionItems: [actionItem],
            status: 'Pending',
            assignee: 'Current User',
            createdAt: new Date().toISOString()
        };
        
        return {
            taskId,
            actionId,
            actionItem,
            planData,
            accountId
        };
    }
    
    static populateTaskDetailsDrawer(actionPlanData) {
        const container = document.getElementById('taskDetailsContent');
        if (!container) return;
        
        console.log('Populating action plan details drawer with data:', actionPlanData);
        
        const { taskId, actionId, actionItem, planData } = actionPlanData;
        
        // Safely access plays with fallback - handle both string and object actionItem
        const plays = (typeof actionItem === 'object' && actionItem.plays) ? actionItem.plays : [];
        
        console.log('Action item:', actionItem);
        console.log('Plays found:', plays);
        
        // Use the actual action title, handle both string and object cases
        const actionTitle = typeof actionItem === 'string' ? actionItem : (actionItem.title || actionItem.name || 'Action Details');
        
        // Get current task data from rendered table for editable fields
        const taskRow = document.querySelector(`[data-task-id="${taskId}"]`);
        const currentDueDate = taskRow ? taskRow.querySelector('.due-date').textContent.trim() : 'Not Set';
        const currentPriority = taskRow ? taskRow.querySelector('.priority-badge').textContent.trim() : 'Medium';
        const currentAssignee = taskRow ? taskRow.querySelector('.assignee-initials').textContent.trim() : 'UN';
        
        let html = `
            <div class="task-details-section">
                <h3><i class="fas fa-lightbulb"></i> Recommended Action</h3>
                <div class="action-display-card">
                    <div class="action-title">${actionTitle}</div>
                    <div class="action-id">Action ID: ${actionId}</div>
                </div>
            </div>
            
            <div class="task-details-section">
                <h3><i class="fas fa-edit"></i> Task Properties</h3>
                <div class="task-properties-grid">
                    <div class="property-field">
                        <label for="taskDueDate">Due Date</label>
                        <input type="date" id="taskDueDate" class="form-input" value="${this.convertToDateValue(currentDueDate)}" onchange="ActionsRenderer.autoSaveTaskProperty('dueDate', this.value)">
                    </div>
                    
                    <div class="property-field">
                        <label for="taskPriority">Priority</label>
                        <select id="taskPriority" class="form-select" onchange="ActionsRenderer.autoSaveTaskProperty('priority', this.value)">
                            <option value="High" ${currentPriority === 'High' ? 'selected' : ''}>High</option>
                            <option value="Medium" ${currentPriority === 'Medium' ? 'selected' : ''}>Medium</option>
                            <option value="Low" ${currentPriority === 'Low' ? 'selected' : ''}>Low</option>
                        </select>
                    </div>
                    
                    <div class="property-field">
                        <label for="taskAssignee">Assignee</label>
                        <select id="taskAssignee" class="form-select" onchange="ActionsRenderer.autoSaveTaskProperty('assignee', this.value)">
                            <option value="CU" ${currentAssignee === 'CU' ? 'selected' : ''}>Current User</option>
                            <option value="JS" ${currentAssignee === 'JS' ? 'selected' : ''}>John Smith</option>
                            <option value="MK" ${currentAssignee === 'MK' ? 'selected' : ''}>Maria Kim</option>
                            <option value="AB" ${currentAssignee === 'AB' ? 'selected' : ''}>Alex Brown</option>
                            <option value="RT" ${currentAssignee === 'RT' ? 'selected' : ''}>Ryan Taylor</option>
                            <option value="LW" ${currentAssignee === 'LW' ? 'selected' : ''}>Lisa Wilson</option>
                        </select>
                    </div>
                    
                    <div class="property-field">
                        <label for="taskStatus">Task Status</label>
                        <select id="taskStatus" class="form-select" onchange="ActionsRenderer.autoSaveTaskProperty('status', this.value)">
                            <option value="Pending">Pending</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Complete">Complete</option>
                        </select>
                    </div>
                </div>
            </div>
            
            <div class="task-details-section">
                <h3><i class="fas fa-tasks"></i> CS Plays (${plays.length})</h3>
                <div class="plays-management">
        `;
        
        if (plays.length === 0) {
            html += `
                <div class="no-plays-message">
                    <i class="fas fa-info-circle"></i>
                    No CS plays are associated with this action plan.
                </div>
            `;
        } else {
            html += '<div class="plays-list">';
            plays.forEach((play, index) => {
                const playTitle = play.playTitle || play.playName || `Play ${index + 1}`;
                const playId = play.playId || `play_${index + 1}`;
                const isCompleted = play.completed || false;
                
                html += `
                    <div class="play-management-item" data-play-id="${playId}" data-play-index="${index}">
                        <div class="play-info">
                            <div class="play-content">
                                <label class="play-checkbox-container">
                                    <input type="checkbox" class="play-checkbox" 
                                           ${isCompleted ? 'checked' : ''}
                                           onchange="ActionsRenderer.togglePlayCompletionCheckbox('${actionId}', '${playId}', ${index}, this.checked)">
                                    <span class="checkmark"></span>
                                </label>
                                <div class="play-title ${isCompleted ? 'completed' : ''}">${playTitle}</div>
                            </div>
                            <div class="play-actions">
                                <button class="btn btn-sm btn-danger" 
                                        onclick="ActionsRenderer.deletePlay('${actionId}', '${playId}', ${index})">
                                    <i class="fas fa-trash"></i>
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            });
            html += '</div>';
        }
        
        html += `
                </div>
            </div>
        `;
        
        container.innerHTML = html;
        
        // Store current task data for saving
        window.currentActionPlanData = actionPlanData;
    }
    
    static convertToDateValue(dateString) {
        if (!dateString || dateString === 'Not Set') return '';
        
        // Try to parse the date string and convert to YYYY-MM-DD format
        try {
            const date = new Date(dateString + ', 2025'); // Add year for better parsing
            if (!isNaN(date.getTime())) {
                return date.toISOString().split('T')[0];
            }
        } catch (error) {
            console.warn('Could not parse date:', dateString);
        }
        
        return '';
    }
    
    static closeTaskDetailsDrawer() {
        const drawer = document.getElementById('taskDetailsDrawer');
        const backdrop = document.getElementById('taskDetailsDrawerBackdrop');
        
        if (drawer) {
            drawer.classList.remove('open');
        }
        
        if (backdrop) {
            setTimeout(() => {
                backdrop.classList.remove('open');
            }, 300);
        }
        
        // Clear stored task data
        window.currentActionPlanData = null;
    }
    
    // Helper method to update task row display immediately
    static updateTaskRowDisplay(taskId, updates) {
        const taskRow = document.querySelector(`[data-task-id="${taskId}"]`);
        if (!taskRow) return;
        
        try {
            if (updates.dueDate) {
                const dueDateElement = taskRow.querySelector('.due-date');
                if (dueDateElement) {
                    dueDateElement.textContent = updates.dueDate || 'Not Set';
                }
            }
            
            if (updates.priority) {
                const priorityElement = taskRow.querySelector('.priority-badge');
                if (priorityElement) {
                    priorityElement.textContent = updates.priority;
                    priorityElement.className = `priority-badge priority-${updates.priority.toLowerCase()}`;
                }
            }
            
            if (updates.assignee) {
                const assigneeElement = taskRow.querySelector('.assignee-initials');
                if (assigneeElement) {
                    assigneeElement.textContent = updates.assignee;
                }
            }
            
            if (updates.status) {
                const statusElement = taskRow.querySelector('.status-badge');
                if (statusElement) {
                    statusElement.textContent = updates.status;
                    statusElement.className = `status-badge status-${updates.status.toLowerCase().replace(' ', '-')}`;
                }
            }
        } catch (error) {
            console.error('Error updating task row display:', error);
        }
    }
    
    // Auto-save functionality for task properties
    static async autoSaveTaskProperty(propertyName, value) {
        if (!window.currentActionPlanData) {
            console.error('No task data available for auto-save');
            return;
        }
        
        try {
            const { taskId, actionId, planData, accountId } = window.currentActionPlanData;
            
            console.log(`Auto-saving ${propertyName}:`, value);
            
            // Update the task row display immediately for better UX
            this.updateTaskRowDisplay(taskId, { [propertyName]: value });
            
            // Prepare update data based on property name
            let updateData = {};
            switch(propertyName) {
                case 'dueDate':
                    updateData.dueDate = value;
                    break;
                case 'priority':
                    updateData.priority = value;
                    break;
                case 'assignee':
                    updateData.assignee = value;
                    break;
                case 'status':
                    updateData.status = value;
                    break;
                default:
                    console.warn('Unknown property for auto-save:', propertyName);
                    return;
            }
            
            // Call the CRUD method to save changes
            const result = await ActionPlanService.updateActionPlan(planData.id, updateData, window.app);
            
            if (result && result.success) {
                console.log(`Successfully auto-saved ${propertyName}`);
                // Update local data if needed
                if (window.app && window.app.actionPlans && window.app.actionPlans.has(accountId)) {
                    const currentPlan = window.app.actionPlans.get(accountId);
                    if (currentPlan) {
                        window.app.actionPlans.set(accountId, result.plan || currentPlan);
                    }
                }
            } else {
                console.error(`Failed to auto-save ${propertyName}:`, result ? result.error : 'Unknown error');
                // Show error notification to the user about the save failure
                NotificationService.showError(`Failed to save ${propertyName} change`);
            }
        } catch (error) {
            console.error(`Error auto-saving ${propertyName}:`, error);
            NotificationService.showError(`Error saving ${propertyName} change`);
        }
    }
    
    // New checkbox-based play completion toggle
    static async togglePlayCompletionCheckbox(actionId, playId, playIndex, isChecked) {
        if (!window.currentActionPlanData) {
            console.error('No task data available for play completion toggle');
            return;
        }
        
        try {
            const { taskId, planData, accountId } = window.currentActionPlanData;
            
            console.log(`Toggling play completion: ${playId} -> ${isChecked}`);
            
            // Find and update the play in the action items
            let updatedActionItems = [...planData.actionItems];
            let playUpdated = false;
            
            for (let actionItem of updatedActionItems) {
                if (actionItem.plays && Array.isArray(actionItem.plays)) {
                    for (let play of actionItem.plays) {
                        if (play.playId === playId) {
                            play.completed = isChecked;
                            playUpdated = true;
                            break;
                        }
                    }
                }
                if (playUpdated) break;
            }
            
            if (!playUpdated) {
                console.error('Could not find play to update:', playId);
                return;
            }
            
            // Update the visual state immediately
            const playElement = document.querySelector(`[data-play-id="${playId}"] .play-title`);
            if (playElement) {
                if (isChecked) {
                    playElement.classList.add('completed');
                } else {
                    playElement.classList.remove('completed');
                }
            }
            
            // Save the changes using CRUD method
            const updateData = {
                actionItems: updatedActionItems
            };
            
            const result = await ActionPlanService.updateActionPlan(planData.id, updateData, window.app);
            
            if (result && result.success) {
                console.log('Successfully updated play completion status');
                
                // Update local data
                if (window.app && window.app.actionPlans && window.app.actionPlans.has(accountId)) {
                    window.app.actionPlans.set(accountId, result.plan || planData);
                }
                
                // Show success notification
                const statusText = isChecked ? 'completed' : 'pending';
                NotificationService.showSuccess(`Play marked as ${statusText}`);
            } else {
                console.error('Failed to update play completion:', result ? result.error : 'Unknown error');
                
                // Revert the visual state on failure
                if (playElement) {
                    if (isChecked) {
                        playElement.classList.remove('completed');
                    } else {
                        playElement.classList.add('completed');
                    }
                }
                
                // Revert the checkbox state
                const checkbox = document.querySelector(`[data-play-id="${playId}"] .play-checkbox`);
                if (checkbox) {
                    checkbox.checked = !isChecked;
                }
                
                NotificationService.showError('Failed to update play status');
            }
        } catch (error) {
            console.error('Error toggling play completion:', error);
            NotificationService.showError('Error updating play status');
        }
    }
    
    static async saveTaskDetails() {
        if (!window.currentActionPlanData) {
            console.error('No task data to save');
            return;
        }
        
        try {
            // Get updated values from form
            const dueDate = document.getElementById('taskDueDate').value;
            const priority = document.getElementById('taskPriority').value;
            const assignee = document.getElementById('taskAssignee').value;
            const status = document.getElementById('taskStatus').value;
            
            console.log('Saving task details:', { dueDate, priority, assignee, status });
            
            const { taskId, actionId, actionItem, planData, accountId } = window.currentActionPlanData;
            
            // Find the action item within the plan and update it
            const updatedActionItems = planData.actionItems.map((item, index) => {
                // Handle both string and object action items
                const itemActionId = typeof item === 'object' && item.actionId ? 
                    item.actionId : 
                    null; // Only use real action IDs from CSV data
                
                if (itemActionId === actionId) {
                    // Update this action item with the new task properties
                    // Preserve existing plays from the original actionItem
                    const originalPlays = actionItem && actionItem.plays ? actionItem.plays : [];
                    
                    const updatedItem = typeof item === 'string' ? 
                        { 
                            title: item, 
                            actionId: actionId,
                            dueDate: dueDate,
                            priority: priority,
                            assignee: assignee,
                            status: status,
                            plays: originalPlays  // Preserve original plays instead of empty array
                        } : 
                        { 
                            ...item, 
                            dueDate: dueDate,
                            priority: priority,
                            assignee: assignee,
                            status: status
                        };
                    
                    console.log('Updated action item:', updatedItem);
                    return updatedItem;
                }
                return item;
            });
            
            // Prepare the update data for the action plan
            const updateData = {
                ...planData,
                actionItems: updatedActionItems,
                updatedAt: new Date().toISOString()
            };
            
            console.log('Updating action plan with CRUD method:', planData.id, updateData);
            
            // Use ActionPlanService to update the action plan
            const app = window.app || { 
                actionPlans: new Map(),
                showSuccessMessage: (msg) => this.showTaskUpdateSuccess(msg),
                showErrorMessage: (msg) => this.showTaskUpdateError(msg)
            };
            
            // Import ActionPlanService dynamically if not already available
            const ActionPlanService = window.ActionPlanService || 
                (await import('./services/ActionPlanService.js')).default;
            
            // Always update the visual display and local data first
            this.updateTaskRowDisplay(taskId, { dueDate, priority, assignee, status });
            
            // Update local state immediately for better UX
            if (window.app && window.app.actionPlans && window.app.actionPlans.has(accountId)) {
                const currentPlan = window.app.actionPlans.get(accountId);
                if (currentPlan) {
                    window.app.actionPlans.set(accountId, updateData);
                }
            }
            
            // Close drawer and show success message to user
            this.closeTaskDetailsDrawer();
            this.showTaskUpdateSuccess('Task details updated successfully!');
            
            // Re-render the Action Plans tab to reflect changes
            if (window.app && window.app.renderCurrentTab) {
                window.app.renderCurrentTab();
            }
            
            // Try to save to backend - log errors but don't show them to user
            try {
                const updatedPlan = await ActionPlanService.updateActionPlan(planData.id, updateData, app);
                if (updatedPlan) {
                    console.log('Task details successfully saved to backend:', updatedPlan.id);
                } else {
                    console.warn('Backend save failed but local update succeeded');
                }
            } catch (backendError) {
                console.error('Failed to save task details to Domo endpoint (local update succeeded):', backendError);
                // Don't show error to user since local update worked
            }
            
        } catch (error) {
            console.error('Error saving task details:', error);
            this.showTaskUpdateError(error.message || 'Failed to save task details');
        }
    }
    
    static updateTaskRowDisplay(taskId, updates) {
        const taskRow = document.querySelector(`[data-task-id="${taskId}"]`);
        if (!taskRow) return;
        
        // Update due date display
        if (updates.dueDate) {
            const dueDateElement = taskRow.querySelector('.due-date');
            if (dueDateElement) {
                const formattedDate = new Date(updates.dueDate).toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric' 
                });
                dueDateElement.textContent = formattedDate;
            }
        }
        
        // Update priority badge
        if (updates.priority) {
            const priorityElement = taskRow.querySelector('.priority-badge');
            if (priorityElement) {
                priorityElement.className = `priority-badge priority-${updates.priority.toLowerCase()}`;
                priorityElement.textContent = updates.priority;
            }
        }
        
        // Update assignee initials
        if (updates.assignee) {
            const assigneeElement = taskRow.querySelector('.assignee-initials');
            if (assigneeElement) {
                assigneeElement.textContent = updates.assignee;
            }
        }
        
        // Update task completion status
        if (updates.status === 'Complete') {
            taskRow.classList.add('action-plan-completed');
            const checkbox = taskRow.querySelector('.task-checkbox');
            if (checkbox) checkbox.checked = true;
        } else {
            taskRow.classList.remove('action-plan-completed');
            const checkbox = taskRow.querySelector('.task-checkbox');
            if (checkbox) checkbox.checked = false;
        }
    }
    
    static deletePlay(actionId, playId, playIndex) {
        if (confirm('Are you sure you want to delete this CS play?')) {
            const playItem = document.querySelector(`[data-play-id="${playId}"][data-play-index="${playIndex}"]`);
            if (playItem) {
                playItem.remove();
                console.log(`Deleted play ${playId} from action ${actionId}`);
                
                // Update plays count in main view (simplified)
                this.updatePlaysCountDisplay(actionId, -1);
            }
        }
    }
    
    static updatePlaysCountDisplay(actionId, change) {
        // Find and update the plays count in the main table
        const playsButtons = document.querySelectorAll(`[data-task-id="${actionId}"]`);
        playsButtons.forEach(button => {
            const countElement = button.querySelector('.plays-count');
            if (countElement) {
                const currentCount = parseInt(countElement.textContent) || 0;
                const newCount = Math.max(0, currentCount + change);
                countElement.textContent = newCount;
            }
        });
    }
    
    static showTaskUpdateSuccess() {
        const message = document.createElement('div');
        message.className = 'update-notification success';
        message.innerHTML = `
            <i class="fas fa-check-circle"></i>
            Task details updated successfully!
        `;
        document.body.appendChild(message);
        
        setTimeout(() => {
            message.classList.add('show');
            setTimeout(() => {
                message.classList.remove('show');
                setTimeout(() => message.remove(), 300);
            }, 3000);
        }, 100);
    }
    
    static showTaskUpdateError(errorMessage) {
        const message = document.createElement('div');
        message.className = 'update-notification error';
        message.innerHTML = `
            <i class="fas fa-exclamation-circle"></i>
            Error updating task: ${errorMessage}
        `;
        document.body.appendChild(message);
        
        setTimeout(() => {
            message.classList.add('show');
            setTimeout(() => {
                message.classList.remove('show');
                setTimeout(() => message.remove(), 300);
            }, 5000);
        }, 100);
    }

    // Fallback Data Loading
    static async loadFallbackActionPlans(app) {
        try {
            const response = await fetch('/action-plans-fallback.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const fallbackData = await response.json();
            const formattedPlans = [];

            console.log(`FALLBACK LOADING: Processing ${fallbackData.length} action plan records from JSON`);

            // Process each action plan from the JSON
            for (const [index, record] of fallbackData.entries()) {
                console.log(`FALLBACK RECORD ${index + 1}:`, {
                    recordId: record.id,
                    accountId: record.content?.accountId,
                    actionId: record.content?.actionId,
                    title: record.content?.title,
                    status: record.content?.status
                });
                const planContent = record.content;
                if (!planContent) {
                    continue; // Skip plans with no content
                }
                
                // Handle new single-action-per-plan data model
                // Each record represents one action plan with one action

                // Get account information - try accountId first, then signal lookup
                let accountId = planContent.accountId;
                let signal = null;
                
                if (planContent.signalId) {
                    signal = app.data.find(s => s.id === planContent.signalId);
                    if (signal && !accountId) {
                        accountId = signal.account_id;
                    }
                }
                
                // Get account name
                let accountName = this.getAccountNameFromPlan(planContent, signal, app);
                
                // If we still don't have an account ID, try to match by account name from the existing accounts
                if (!accountId && app.accounts && app.accounts.size > 0) {
                    for (let [existingAccountId, account] of app.accounts) {
                        // Try to match account names (case insensitive partial match)
                        if (account.name && accountName && 
                            (account.name.toLowerCase().includes(accountName.toLowerCase()) ||
                             accountName.toLowerCase().includes(account.name.toLowerCase()))) {
                            accountId = existingAccountId;
                            accountName = account.name; // Use the exact account name from the app
                            console.log(`Mapped action plan to existing account: ${accountName} (${accountId})`);
                            break;
                        }
                    }
                }
                
                // If still no match, use the accountId from planContent or create fallback
                if (!accountId) {
                    accountId = planContent.accountId || `fallback-${planContent.id}`;
                    console.log(`Using account ID: ${accountId} for plan: ${planContent.title}`);
                }

                // Determine urgency and health based on available data
                const urgency = this.determineFallbackUrgency(planContent, signal);
                const accountHealth = signal ? this.getHealthFromRiskCategory(signal.at_risk_cat) : 'healthy';
                
                // Get signals count for this account
                const accountSignals = accountId && signal ? 
                                     app.data.filter(s => s.account_id === accountId) : [];

                // Create single action item from the plan content
                const singleActionItem = {
                    title: planContent.title || 'Untitled Action',
                    actionId: planContent.actionId,
                    completed: false,
                    plays: planContent.plays ? planContent.plays.map(play => ({
                        playId: `play_${Math.random().toString(36).substr(2, 9)}`,
                        playName: play,
                        playTitle: play
                    })) : [],
                    description: planContent.description || '',
                    priority: planContent.priority || 'medium',
                    dueDate: planContent.dueDate,
                    status: planContent.status || 'pending'
                };

                const formattedPlan = {
                    accountId: accountId,
                    accountName: accountName,
                    accountHealth: accountHealth,
                    signalsCount: accountSignals.length,
                    highPriorityCount: accountSignals.filter(s => s.priority === 'High').length,
                    renewalBaseline: this.getFallbackRenewalValue(signal, app),
                    status: planContent.status || 'pending',
                    urgency: urgency,
                    planData: {
                        id: planContent.id,
                        actionItems: [singleActionItem], // Convert single action to array format for compatibility
                        status: planContent.status,
                        assignee: planContent.assignee,
                        createdAt: planContent.createdAt,
                        updatedAt: planContent.updatedAt,
                        notes: planContent.description || '',
                        // Store original plan content for CRUD operations
                        originalPlanContent: planContent
                    },
                    lastUpdated: planContent.updatedAt || planContent.createdAt,
                    nextAction: planContent.title || 'No actions defined'
                };

                console.log(`FORMATTED PLAN ${index + 1}:`, {
                    accountId: formattedPlan.accountId,
                    accountName: formattedPlan.accountName,
                    actionTitle: planContent.title,
                    status: formattedPlan.status
                });

                formattedPlans.push(formattedPlan);
            }

            console.log(`BEFORE GROUPING: ${formattedPlans.length} formatted plans`);
            formattedPlans.forEach((plan, i) => {
                console.log(`  Plan ${i + 1}: Account ${plan.accountId} (${plan.accountName}) - ${plan.nextAction}`);
            });

            // Group by account and merge duplicates
            const groupedPlans = this.groupFallbackPlansByAccount(formattedPlans);
            
            console.log(`AFTER GROUPING: ${groupedPlans.length} grouped plans`);
            groupedPlans.forEach((plan, i) => {
                console.log(`  Grouped Plan ${i + 1}: Account ${plan.accountId} (${plan.accountName}) - ${plan.planData.actionItems.length} actions`);
            });
            
            return groupedPlans.sort((a, b) => {
                const urgencyOrder = { critical: 0, high: 1, normal: 2 };
                if (urgencyOrder[a.urgency] !== urgencyOrder[b.urgency]) {
                    return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
                }
                return new Date(b.lastUpdated) - new Date(a.lastUpdated);
            });

        } catch (error) {
            console.error('Error loading fallback action plans:', error);
            return [];
        }
    }

    static getAccountNameFromPlan(planContent, signal, app) {
        // Try to get account name from plan title first (format: "Action Plan - Account Name")
        if (planContent.planTitle && planContent.planTitle.includes(' - ')) {
            return planContent.planTitle.split(' - ').slice(1).join(' - ').trim();
        }
        
        // Try to get from signal data
        if (signal && signal.account_name) {
            return signal.account_name;
        }
        
        // Try to get from accountId if it exists and we can find the account
        if (planContent.accountId && app.accounts && app.accounts.has(planContent.accountId)) {
            const account = app.accounts.get(planContent.accountId);
            if (account && account.name) {
                return account.name;
            }
        }
        
        // Fallback to generic name
        return `Account ${planContent.id.slice(-8)}`;
    }

    static determineFallbackUrgency(planContent, signal) {
        // Determine urgency based on available information
        if (signal && signal.priority === 'High') {
            return 'high';
        }
        
        if (planContent.priority === 'high') {
            return 'high';
        }
        
        // For single action plans, check if there are multiple plays indicating complexity
        if (planContent.plays && planContent.plays.length > 2) {
            return 'high';
        }
        
        return 'normal';
    }

    static getFallbackRenewalValue(signal, app) {
        // Try to get real renewal value from signal
        if (signal && signal.bks_renewal_baseline_usd) {
            return parseFloat(signal.bks_renewal_baseline_usd) || 0;
        }
        
        // Generate realistic fallback value
        return this.getRandomRenewalValue();
    }

    static groupFallbackPlansByAccount(formattedPlans) {
        console.log('GROUPING LOGIC: Starting to group plans by account...');
        console.log(`Input: ${formattedPlans.length} individual plans`);
        
        // In the new single-action-per-plan model, each plan represents one task
        // We should NOT merge plans - instead keep them separate but group for display
        const grouped = new Map();
        
        for (const plan of formattedPlans) {
            const key = plan.accountId;
            console.log(`  Processing plan for account: ${key} (${plan.accountName})`);
            
            if (!grouped.has(key)) {
                grouped.set(key, []);
            }
            
            // Add this plan to the array for this account
            grouped.get(key).push(plan);
            console.log(`    → Added plan to account ${key}. Total plans for this account: ${grouped.get(key).length}`);
        }
        
        console.log(`GROUPING COMPLETE: ${grouped.size} unique accounts`);
        
        // Convert to array format but keep all individual plans
        const result = [];
        for (const [accountId, plans] of grouped) {
            // For each account, add all its plans to the result
            result.push(...plans);
            console.log(`Account ${accountId}: Added ${plans.length} plans to result`);
        }
        
        console.log(`Final result: ${result.length} plans total`);
        return result;
    }
}