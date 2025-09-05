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

    static async getFormattedActionPlans(app) {
        const actionPlans = [];

        // If no action plans from Domo, try loading fallback JSON
        if (app.actionPlans.size === 0) {
            try {
                console.log('No action plans from Domo, loading fallback data...');
                const fallbackPlans = await this.loadFallbackActionPlans(app);
                if (fallbackPlans.length > 0) {
                    console.log(`Loaded ${fallbackPlans.length} action plans from fallback JSON`);
                    return fallbackPlans;
                }
            } catch (error) {
                console.error('Failed to load fallback action plans:', error);
            }
        }

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
                    <button class="plays-button" data-task-id="${task.actionId}" data-task-title="${task.title}" data-onclick="openPlaysModal">
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
            // Handle both fallback JSON structure and original structure
            const title = actionItem.title || actionItem.action || actionItem;
            const actionId = actionItem.actionId || `action-${index}`;
            
            // Get CS plays count - try from real JSON data first, then fallback
            let playsCount = 0;
            if (actionItem.plays && Array.isArray(actionItem.plays)) {
                playsCount = actionItem.plays.length;
            } else {
                playsCount = this.getPlaysCountForAction(actionId, app);
            }
            
            // Debug log to see what's happening with plays
            console.log(`Action "${title}" has plays:`, actionItem.plays, 'count:', playsCount);
            
            // Generate realistic due date (1-14 days from now)
            const dueDate = this.generateDueDate(index);
            
            // Determine priority based on urgency and high priority signals
            const priority = this.determinePriority(plan, index);
            
            // Get assignee initials from plan data or generate
            let assigneeInitials;
            if (plan.planData.assignee) {
                assigneeInitials = plan.planData.assignee === 'Current User' ? 'CU' : 
                                 this.getInitialsFromName(plan.planData.assignee);
            } else {
                assigneeInitials = this.generateAssigneeInitials();
            }

            tasks.push({
                id: `${plan.accountId}-${index}`,
                title: title,
                description: actionItem.rationale ? actionItem.rationale.substring(0, 100) + '...' : 
                           actionItem.description ? actionItem.description.substring(0, 100) + '...' : '',
                actionId: actionId,
                dueDate: dueDate.formatted,
                overdue: dueDate.overdue,
                playsCount: playsCount,
                priority: priority,
                assigneeInitials: assigneeInitials,
                completed: actionItem.completed || false,
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

    static getInitialsFromName(fullName) {
        if (!fullName) return 'UN';
        
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
        const playTitle = playItem.querySelector('.play-title');
        const statusBadge = playItem.querySelector('.status-badge');
        
        if (isCompleted) {
            playTitle.classList.add('completed');
            statusBadge.textContent = 'Completed';
            statusBadge.className = 'status-badge completed';
        } else {
            playTitle.classList.remove('completed');
            statusBadge.textContent = 'Pending';
            statusBadge.className = 'status-badge pending';
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

    // Fallback Data Loading
    static async loadFallbackActionPlans(app) {
        try {
            const response = await fetch('/action-plans-fallback.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const fallbackData = await response.json();
            const formattedPlans = [];

            // Process each action plan from the JSON
            for (const record of fallbackData) {
                const planContent = record.content;
                if (!planContent || !planContent.actionItems || planContent.actionItems.length === 0) {
                    continue; // Skip plans with no action items
                }

                // Get account information from signal data
                const signal = planContent.signalId ? 
                              app.data.find(s => s.id === planContent.signalId) : null;
                
                const accountName = this.getAccountNameFromPlan(planContent, signal, app);
                const accountId = signal ? signal.account_id : `fallback-${planContent.id}`;

                // Determine urgency and health based on available data
                const urgency = this.determineFallbackUrgency(planContent, signal);
                const accountHealth = signal ? this.getHealthFromRiskCategory(signal.at_risk_cat) : 'healthy';
                
                // Get signals count for this account
                const accountSignals = signal ? 
                                     app.data.filter(s => s.account_id === signal.account_id) : [];

                formattedPlans.push({
                    accountId: accountId,
                    accountName: accountName,
                    accountHealth: accountHealth,
                    signalsCount: accountSignals.length,
                    highPriorityCount: accountSignals.filter(s => s.priority === 'High').length,
                    renewalBaseline: this.getFallbackRenewalValue(signal, app),
                    status: planContent.status || 'Pending',
                    urgency: urgency,
                    planData: {
                        id: planContent.id,
                        actionItems: planContent.actionItems,
                        status: planContent.status,
                        assignee: planContent.assignee,
                        createdAt: planContent.createdAt,
                        updatedAt: planContent.updatedAt,
                        notes: planContent.notes
                    },
                    lastUpdated: planContent.updatedAt || planContent.createdAt,
                    nextAction: planContent.actionItems[0]?.title || 'No actions defined'
                });
            }

            // Group by account and merge duplicates
            const groupedPlans = this.groupFallbackPlansByAccount(formattedPlans);
            
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
        // Try to get account name from plan title first
        if (planContent.planTitle && planContent.planTitle.includes(' - ')) {
            return planContent.planTitle.split(' - ').slice(1).join(' - ').trim();
        }
        
        // Try to get from signal data
        if (signal && signal.account_name) {
            return signal.account_name;
        }
        
        // Fallback to generic name
        return `Account ${planContent.id.slice(-8)}`;
    }

    static determineFallbackUrgency(planContent, signal) {
        // Determine urgency based on available information
        if (signal && signal.priority === 'High') {
            return 'high';
        }
        
        if (planContent.actionItems && planContent.actionItems.length > 2) {
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
        const grouped = new Map();
        
        for (const plan of formattedPlans) {
            const key = plan.accountId;
            if (grouped.has(key)) {
                // Merge action items for the same account
                const existing = grouped.get(key);
                existing.planData.actionItems = [
                    ...existing.planData.actionItems,
                    ...plan.planData.actionItems
                ];
                // Update last updated time if newer
                if (new Date(plan.lastUpdated) > new Date(existing.lastUpdated)) {
                    existing.lastUpdated = plan.lastUpdated;
                }
            } else {
                grouped.set(key, plan);
            }
        }
        
        return Array.from(grouped.values());
    }
}