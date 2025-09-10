// ActionsRenderer.js - Handles action plan display and management

class ActionsRenderer {
    static currentAccountIndex = 0;
    static totalAccounts = 0;
    static currentView = 'list'; // 'list' or 'cards'

    static render(app) {
        console.log('📋 Rendering action plans...');
        
        const container = document.getElementById('mainContent');
        if (!container) {
            console.error('Main content container not found');
            return;
        }

        // Get formatted action plans
        this.getFormattedActionPlans(app)
            .then(formattedPlans => {
                console.log(`Found ${formattedPlans.length} action plans to display`);
                
                // Calculate statistics
                const totalTasks = formattedPlans.reduce((total, plan) => {
                    return total + (plan.planData.actionItems ? plan.planData.actionItems.length : 0);
                }, 0);
                
                // Calculate completed tasks
                const completedTasks = formattedPlans.reduce((total, plan) => {
                    if (plan.planData.actionItems) {
                        return total + plan.planData.actionItems.filter(item => 
                            item.status === 'complete' || item.status === 'completed'
                        ).length;
                    }
                    return total;
                }, 0);
                
                this.totalAccounts = this.getUniqueAccountsCount(formattedPlans);
                
                const html = `
                    <div class="action-plans-header">
                        <div class="header-content">
                            <div class="header-left">
                                <h1><i class="fas fa-tasks"></i> Action Plans</h1>
                                <div class="header-stats">
                                    <span class="stat-item">
                                        <i class="fas fa-list"></i>
                                        ${totalTasks} Tasks
                                    </span>
                                    <span class="stat-item">
                                        <i class="fas fa-check-circle"></i>
                                        ${completedTasks} Completed
                                    </span>
                                    <span class="stat-item">
                                        <i class="fas fa-building"></i>
                                        ${this.totalAccounts} Accounts
                                    </span>
                                </div>
                            </div>
                            <div class="header-right">
                                <div class="view-controls">
                                    <button class="btn btn-outline ${this.currentView === 'list' ? 'active' : ''}" 
                                            onclick="ActionsRenderer.setView('list')">
                                        <i class="fas fa-list"></i> List
                                    </button>
                                    <button class="btn btn-outline ${this.currentView === 'cards' ? 'active' : ''}" 
                                            onclick="ActionsRenderer.setView('cards')">
                                        <i class="fas fa-th-large"></i> Cards
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="action-plans-content">
                        ${this.renderActionPlansView(formattedPlans)}
                    </div>
                `;
                
                container.innerHTML = html;
            })
            .catch(error => {
                console.error('Error rendering action plans:', error);
                container.innerHTML = `
                    <div class="error-container">
                        <i class="fas fa-exclamation-triangle"></i>
                        <h2>Error Loading Action Plans</h2>
                        <p>${error.message}</p>
                    </div>
                `;
            });
    }

    static renderActionPlansView(formattedPlans) {
        if (formattedPlans.length === 0) {
            return `
                <div class="empty-state">
                    <i class="fas fa-clipboard-list"></i>
                    <h2>No Action Plans Found</h2>
                    <p>Create your first action plan by reviewing signals and adding recommended actions.</p>
                </div>
            `;
        }

        if (this.currentView === 'cards') {
            return this.renderCardsView(formattedPlans);
        } else {
            return this.renderListView(formattedPlans);
        }
    }

    static renderListView(formattedPlans) {
        // Group plans by account for the table display
        const groupedPlans = this.groupPlansByAccount(formattedPlans);
        
        let html = `
            <div class="action-plans-table-container">
                <table class="action-plans-table">
                    <thead>
                        <tr>
                            <th width="3%">
                                <input type="checkbox" class="select-all-checkbox" 
                                       onchange="ActionsRenderer.toggleSelectAll(this.checked)">
                            </th>
                            <th width="35%">Action</th>
                            <th width="12%">Due Date</th>
                            <th width="12%">Task Status</th>
                            <th width="10%">Priority</th>
                            <th width="15%">Assignee</th>
                            <th width="13%">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        for (const [accountId, accountData] of groupedPlans) {
            const { accountName, plans } = accountData;
            
            // Sort plans within account by priority and due date
            const sortedPlans = this.sortPlansByPriority(plans);
            
            // Account header row
            html += `
                <tr class="account-header-row" data-account-id="${accountId}">
                    <td colspan="7" class="account-header">
                        <div class="account-header-content">
                            <button class="account-toggle" onclick="ActionsRenderer.toggleAccountExpansion('${accountId}')">
                                <i class="fas fa-chevron-down"></i>
                            </button>
                            <div class="account-info">
                                <span class="account-name">${accountName}</span>
                                <span class="task-count">${sortedPlans.length} task${sortedPlans.length !== 1 ? 's' : ''}</span>
                            </div>
                        </div>
                    </td>
                </tr>
            `;

            // Task rows for this account
            for (const plan of sortedPlans) {
                const actionItem = plan.planData.actionItems[0]; // Each plan has one action item
                if (!actionItem) continue;

                const taskId = plan.planData.id;
                const actionId = actionItem.actionId;
                const title = actionItem.title || 'Untitled Action';
                const dueDate = actionItem.dueDate ? this.formatDate(actionItem.dueDate) : 'Not Set';
                const priority = actionItem.priority || 'Medium';
                const status = actionItem.status || 'pending';
                const assignee = plan.planData.assignee || 'Unassigned';
                const playsCount = actionItem.plays ? actionItem.plays.length : 0;

                html += `
                    <tr class="task-row" data-task-id="${taskId}" data-account-id="${accountId}"
                        onclick="ActionsRenderer.handleTaskRowClick(event, '${taskId}', '${actionId}')"
                        oncontextmenu="ActionsRenderer.handleTaskRightClick(event, '${taskId}', '${actionId}')">
                        <td class="task-checkbox-cell">
                            <input type="checkbox" class="task-checkbox" data-task-id="${taskId}"
                                   onclick="event.stopPropagation()" 
                                   onchange="ActionsRenderer.handleTaskCheckboxChange('${taskId}', this.checked)">
                        </td>
                        <td class="task-title">
                            <div class="action-title">${title}</div>
                            <div class="action-meta">
                                <span class="plays-count">
                                    <i class="fas fa-play-circle"></i> ${playsCount} play${playsCount !== 1 ? 's' : ''}
                                </span>
                            </div>
                        </td>
                        <td class="due-date">${dueDate}</td>
                        <td class="task-status">
                            <span class="status-badge status-${status.toLowerCase().replace(' ', '-')}">${this.capitalizeFirstLetter(status)}</span>
                        </td>
                        <td class="priority">
                            <span class="priority-badge priority-${priority.toLowerCase()}">${priority}</span>
                        </td>
                        <td class="assignee">
                            <div class="assignee-info">
                                <span class="assignee-initials">${this.getInitials(assignee)}</span>
                                <span class="assignee-name">${assignee}</span>
                            </div>
                        </td>
                        <td class="task-actions">
                            <button class="btn btn-sm btn-outline" 
                                    onclick="event.stopPropagation(); ActionsRenderer.showPlaysDrawer('${actionId}', '${taskId}')"
                                    title="View CS Plays">
                                <i class="fas fa-play"></i>
                            </button>
                        </td>
                    </tr>
                `;
            }
        }

        html += `
                    </tbody>
                </table>
            </div>
        `;

        return html;
    }

    static renderCardsView(formattedPlans) {
        // Group plans by account for cards display  
        const groupedPlans = this.groupPlansByAccount(formattedPlans);
        
        let html = '<div class="action-plans-cards-container">';
        
        for (const [accountId, accountData] of groupedPlans) {
            const { accountName, plans } = accountData;
            const sortedPlans = this.sortPlansByPriority(plans);
            
            html += `
                <div class="account-card" data-account-id="${accountId}">
                    <div class="account-card-header">
                        <h3>${accountName}</h3>
                        <span class="task-count">${sortedPlans.length} task${sortedPlans.length !== 1 ? 's' : ''}</span>
                    </div>
                    <div class="account-card-content">
            `;
            
            for (const plan of sortedPlans) {
                const actionItem = plan.planData.actionItems[0];
                if (!actionItem) continue;

                const taskId = plan.planData.id;
                const actionId = actionItem.actionId;
                const title = actionItem.title || 'Untitled Action';
                const dueDate = actionItem.dueDate ? this.formatDate(actionItem.dueDate) : 'Not Set';
                const priority = actionItem.priority || 'Medium';
                const status = actionItem.status || 'pending';
                const assignee = plan.planData.assignee || 'Unassigned';
                const playsCount = actionItem.plays ? actionItem.plays.length : 0;

                html += `
                    <div class="task-card" data-task-id="${taskId}"
                         onclick="ActionsRenderer.handleTaskRowClick(event, '${taskId}', '${actionId}')">
                        <div class="task-card-header">
                            <div class="task-title">${title}</div>
                            <div class="task-meta">
                                <span class="priority-badge priority-${priority.toLowerCase()}">${priority}</span>
                                <span class="status-badge status-${status.toLowerCase().replace(' ', '-')}">${this.capitalizeFirstLetter(status)}</span>
                            </div>
                        </div>
                        <div class="task-card-body">
                            <div class="task-info">
                                <div class="info-item">
                                    <i class="fas fa-calendar"></i>
                                    <span>${dueDate}</span>
                                </div>
                                <div class="info-item">
                                    <i class="fas fa-user"></i>
                                    <span>${assignee}</span>
                                </div>
                                <div class="info-item">
                                    <i class="fas fa-play-circle"></i>
                                    <span>${playsCount} play${playsCount !== 1 ? 's' : ''}</span>
                                </div>
                            </div>
                        </div>
                        <div class="task-card-actions">
                            <button class="btn btn-sm btn-outline" 
                                    onclick="event.stopPropagation(); ActionsRenderer.showPlaysDrawer('${actionId}', '${taskId}')"
                                    title="View CS Plays">
                                <i class="fas fa-play"></i> Plays
                            </button>
                        </div>
                    </div>
                `;
            }
            
            html += `
                    </div>
                </div>
            `;
        }
        
        html += '</div>';
        return html;
    }

    // === UTILITY METHODS ===
    
    static setView(view) {
        this.currentView = view;
        if (window.app) {
            this.render(window.app);
        }
    }

    static getUniqueAccountsCount(formattedPlans) {
        const uniqueAccounts = new Set(formattedPlans.map(plan => plan.accountId));
        return uniqueAccounts.size;
    }

    static groupPlansByAccount(formattedPlans) {
        const grouped = new Map();
        
        for (const plan of formattedPlans) {
            const accountId = plan.accountId;
            const accountName = plan.accountName;
            
            if (!grouped.has(accountId)) {
                grouped.set(accountId, {
                    accountName,
                    plans: []
                });
            }
            
            grouped.get(accountId).plans.push(plan);
        }
        
        return grouped;
    }

    static sortPlansByPriority(plans) {
        const priorityOrder = { 'High': 0, 'Medium': 1, 'Low': 2 };
        
        return plans.sort((a, b) => {
            const aItem = a.planData.actionItems[0];
            const bItem = b.planData.actionItems[0];
            
            const aPriority = aItem?.priority || 'Medium';
            const bPriority = bItem?.priority || 'Medium';
            
            // First sort by priority
            if (priorityOrder[aPriority] !== priorityOrder[bPriority]) {
                return priorityOrder[aPriority] - priorityOrder[bPriority];
            }
            
            // Then by due date (earliest first)
            const aDate = aItem?.dueDate ? new Date(aItem.dueDate) : new Date('9999-12-31');
            const bDate = bItem?.dueDate ? new Date(bItem.dueDate) : new Date('9999-12-31');
            
            return aDate - bDate;
        });
    }

    static formatDate(dateString) {
        if (!dateString) return 'Not Set';
        
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric' 
            });
        } catch (error) {
            return 'Invalid Date';
        }
    }

    static capitalizeFirstLetter(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }

    static getInitials(name) {
        if (!name) return 'UN';
        
        return name
            .split(' ')
            .map(word => word.charAt(0).toUpperCase())
            .slice(0, 2)
            .join('');
    }

    // === INTERACTION METHODS ===
    
    static toggleAccountExpansion(accountId) {
        const accountRow = document.querySelector(`[data-account-id="${accountId}"]`);
        const taskRows = document.querySelectorAll(`tr.task-row[data-account-id="${accountId}"]`);
        const toggleButton = accountRow?.querySelector('.account-toggle i');
        
        if (accountRow && taskRows.length > 0) {
            const isExpanded = !accountRow.classList.contains('collapsed');
            
            if (isExpanded) {
                // Collapse
                accountRow.classList.add('collapsed');
                taskRows.forEach(row => row.style.display = 'none');
                if (toggleButton) toggleButton.className = 'fas fa-chevron-right';
            } else {
                // Expand
                accountRow.classList.remove('collapsed');
                taskRows.forEach(row => row.style.display = '');
                if (toggleButton) toggleButton.className = 'fas fa-chevron-down';
            }
        }
    }

    static toggleSelectAll(checked) {
        const checkboxes = document.querySelectorAll('.task-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.checked = checked;
            this.handleTaskCheckboxChange(checkbox.dataset.taskId, checked);
        });
    }

    static handleTaskCheckboxChange(taskId, checked) {
        if (checked) {
            this.selectedTasks.add(taskId);
        } else {
            this.selectedTasks.delete(taskId);
        }
        
        // Update select all checkbox state
        const selectAllCheckbox = document.querySelector('.select-all-checkbox');
        const allCheckboxes = document.querySelectorAll('.task-checkbox');
        const checkedCheckboxes = document.querySelectorAll('.task-checkbox:checked');
        
        if (selectAllCheckbox) {
            selectAllCheckbox.indeterminate = checkedCheckboxes.length > 0 && checkedCheckboxes.length < allCheckboxes.length;
            selectAllCheckbox.checked = checkedCheckboxes.length === allCheckboxes.length;
        }
    }

    // Task Details functionality removed - to be reimplemented

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
        
        // Task details functionality removed - to be reimplemented
        console.log('Task clicked:', { taskId, actionId });
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
        this.hideContextMenu();

        const selectedTasksArray = Array.from(this.selectedTasks);
        const isMultiSelect = selectedTasksArray.length > 1;
        
        const contextMenu = document.createElement('div');
        contextMenu.className = 'context-menu';
        contextMenu.id = 'taskContextMenu';
        
        let menuItems = '';
        
        if (isMultiSelect) {
            menuItems = `
                <div class="context-menu-item" onclick="ActionsRenderer.bulkDeleteTasks()">
                    <i class="fas fa-trash"></i>
                    Delete ${selectedTasksArray.length} Tasks
                </div>
                <div class="context-menu-item" onclick="ActionsRenderer.bulkUpdateStatus('complete')">
                    <i class="fas fa-check"></i>
                    Mark as Complete
                </div>
                <div class="context-menu-item" onclick="ActionsRenderer.bulkUpdateStatus('in_progress')">
                    <i class="fas fa-play"></i>
                    Mark as In Progress
                </div>
            `;
        } else {
            menuItems = `
                <div class="context-menu-item" onclick="ActionsRenderer.deleteSingleTask('${taskId}')">
                    <i class="fas fa-trash"></i>
                    Delete Task
                </div>
                <div class="context-menu-item" onclick="ActionsRenderer.updateTaskStatus('${taskId}', 'complete')">
                    <i class="fas fa-check"></i>
                    Mark as Complete
                </div>
                <div class="context-menu-item" onclick="ActionsRenderer.updateTaskStatus('${taskId}', 'in_progress')">
                    <i class="fas fa-play"></i>
                    Mark as In Progress
                </div>
                <div class="context-menu-item" onclick="ActionsRenderer.showPlaysDrawer('${actionId}', '${taskId}')">
                    <i class="fas fa-play-circle"></i>
                    View CS Plays
                </div>
            `;
        }
        
        contextMenu.innerHTML = menuItems;
        
        // Position the context menu
        contextMenu.style.position = 'absolute';
        contextMenu.style.left = event.pageX + 'px';
        contextMenu.style.top = event.pageY + 'px';
        contextMenu.style.zIndex = '1000';
        
        document.body.appendChild(contextMenu);
        
        // Add click outside listener to close menu
        setTimeout(() => {
            document.addEventListener('click', this.hideContextMenu, { once: true });
        }, 10);
    }

    static hideContextMenu() {
        const existingMenu = document.getElementById('taskContextMenu');
        if (existingMenu) {
            existingMenu.remove();
        }
    }

    // === TASK MANAGEMENT METHODS ===

    static async deleteSingleTask(taskId) {
        const confirmed = await this.showDeleteConfirmation([taskId]);
        if (!confirmed) return;

        try {
            await ActionPlanService.deleteActionPlan(taskId, window.app);
            this.showTaskUpdateSuccess('Task deleted successfully');
            
            // Re-render to reflect changes
            if (window.app && window.app.renderCurrentTab) {
                window.app.renderCurrentTab();
            }
        } catch (error) {
            console.error('Error deleting task:', error);
            this.showTaskUpdateError('Failed to delete task');
        }
    }

    static async bulkDeleteTasks() {
        const selectedTasksArray = Array.from(this.selectedTasks);
        if (selectedTasksArray.length === 0) return;

        const confirmed = await this.showDeleteConfirmation(selectedTasksArray);
        if (!confirmed) return;

        try {
            for (const taskId of selectedTasksArray) {
                await ActionPlanService.deleteActionPlan(taskId, window.app);
            }
            
            this.showTaskUpdateSuccess(`${selectedTasksArray.length} tasks deleted successfully`);
            this.clearTaskSelection();
            
            // Re-render to reflect changes
            if (window.app && window.app.renderCurrentTab) {
                window.app.renderCurrentTab();
            }
        } catch (error) {
            console.error('Error deleting tasks:', error);
            this.showTaskUpdateError('Failed to delete some tasks');
        }
    }

    static showDeleteConfirmation(taskIds) {
        return new Promise((resolve) => {
            const taskCount = taskIds.length;
            const taskText = taskCount === 1 ? 'task' : 'tasks';
            
            const modal = document.createElement('div');
            modal.className = 'modal-overlay';
            modal.innerHTML = `
                <div class="modal delete-confirmation-modal">
                    <div class="modal-header">
                        <h3><i class="fas fa-exclamation-triangle"></i> Confirm Deletion</h3>
                    </div>
                    <div class="modal-body">
                        <p>Are you sure you want to delete ${taskCount} ${taskText}? This action cannot be undone.</p>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-outline" onclick="ActionsRenderer.closeDeleteConfirmation(false)">
                            Cancel
                        </button>
                        <button class="btn btn-danger" onclick="ActionsRenderer.closeDeleteConfirmation(true)">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            
            // Store resolve function for later use
            window.deleteConfirmationResolve = resolve;
        });
    }

    static closeDeleteConfirmation(confirmed) {
        const modal = document.querySelector('.modal-overlay');
        if (modal) {
            modal.remove();
        }
        
        if (window.deleteConfirmationResolve) {
            window.deleteConfirmationResolve(confirmed);
            delete window.deleteConfirmationResolve;
        }
    }

    static async updateTaskStatus(taskId, newStatus) {
        try {
            const updateData = {
                actionItems: [{
                    status: newStatus
                }]
            };
            
            await ActionPlanService.updateActionPlan(taskId, updateData, window.app);
            this.showTaskUpdateSuccess(`Task marked as ${newStatus.replace('_', ' ')}`);
            
            // Re-render to reflect changes
            if (window.app && window.app.renderCurrentTab) {
                window.app.renderCurrentTab();
            }
        } catch (error) {
            console.error('Error updating task status:', error);
            this.showTaskUpdateError('Failed to update task status');
        }
    }

    static async bulkUpdateStatus(newStatus) {
        const selectedTasksArray = Array.from(this.selectedTasks);
        if (selectedTasksArray.length === 0) return;

        try {
            for (const taskId of selectedTasksArray) {
                await this.updateTaskStatus(taskId, newStatus);
            }
            
            this.showTaskUpdateSuccess(`${selectedTasksArray.length} tasks updated successfully`);
            this.clearTaskSelection();
        } catch (error) {
            console.error('Error bulk updating tasks:', error);
            this.showTaskUpdateError('Failed to update some tasks');
        }
    }

    // === CS PLAYS DRAWER ===

    static showPlaysDrawer(actionId, taskId) {
        console.log('Opening plays drawer for:', { actionId, taskId });
        
        // Find the action plan data
        this.findTaskData(taskId, actionId, window.app)
            .then(actionPlanData => {
                if (!actionPlanData) {
                    console.error('Could not find action plan data for plays drawer');
                    return;
                }
                
                this.createPlaysDrawerHTML();
                this.populatePlaysDrawer(actionPlanData);
                this.openPlaysDrawer();
            })
            .catch(error => {
                console.error('Error opening plays drawer:', error);
                this.showTaskUpdateError('Failed to load CS plays');
            });
    }

    static createPlaysDrawerHTML() {
        const existingDrawer = document.getElementById('playsDrawer');
        if (existingDrawer) return;

        const drawerHTML = `
            <div id="playsDrawerBackdrop" class="drawer-backdrop" onclick="ActionsRenderer.closePlaysDrawer()"></div>
            <div id="playsDrawer" class="drawer plays-drawer">
                <div class="drawer-header">
                    <h2><i class="fas fa-play-circle"></i> CS Plays Management</h2>
                    <button class="drawer-close-btn" onclick="ActionsRenderer.closePlaysDrawer()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="drawer-body">
                    <div id="playsDrawerContent">
                        <!-- Content will be populated here -->
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', drawerHTML);
    }

    static populatePlaysDrawer(actionPlanData) {
        const container = document.getElementById('playsDrawerContent');
        if (!container) return;

        const { taskId, actionId, actionItem, planData } = actionPlanData;
        const plays = actionItem.plays || [];
        const actionTitle = actionItem.title || 'Untitled Action';

        let html = `
            <div class="plays-drawer-header">
                <h3>${actionTitle}</h3>
                <p class="action-id">Action ID: ${actionId}</p>
            </div>
            
            <div class="plays-section">
                <h4><i class="fas fa-tasks"></i> CS Plays (${plays.length})</h4>
        `;

        if (plays.length === 0) {
            html += `
                <div class="no-plays-message">
                    <i class="fas fa-info-circle"></i>
                    <p>No CS plays are associated with this action plan.</p>
                </div>
            `;
        } else {
            html += '<div class="plays-list">';
            
            plays.forEach((play, index) => {
                const playTitle = play.playTitle || play.playName || `Play ${index + 1}`;
                const playId = play.playId || `play_${index}`;
                const isCompleted = play.completed || false;
                
                html += `
                    <div class="play-item ${isCompleted ? 'completed' : ''}" data-play-id="${playId}">
                        <div class="play-content">
                            <div class="play-header">
                                <label class="play-checkbox-container">
                                    <input type="checkbox" class="play-checkbox" 
                                           ${isCompleted ? 'checked' : ''}
                                           onchange="ActionsRenderer.togglePlayCompletion('${actionId}', '${playId}', ${index}, this.checked)">
                                    <span class="checkmark"></span>
                                </label>
                                <div class="play-title">${playTitle}</div>
                                <div class="play-status">
                                    <span class="status-badge ${isCompleted ? 'status-complete' : 'status-pending'}">
                                        ${isCompleted ? 'Complete' : 'Pending'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            });
            
            html += '</div>';
        }

        html += '</div>';
        container.innerHTML = html;
        
        // Store current data for updates
        window.currentPlaysData = actionPlanData;
    }

    static openPlaysDrawer() {
        const drawer = document.getElementById('playsDrawer');
        const backdrop = document.getElementById('playsDrawerBackdrop');
        
        if (drawer && backdrop) {
            backdrop.classList.add('open');
            setTimeout(() => {
                drawer.classList.add('open');
            }, 10);
        }
    }

    static closePlaysDrawer() {
        const drawer = document.getElementById('playsDrawer');
        const backdrop = document.getElementById('playsDrawerBackdrop');
        
        if (drawer && backdrop) {
            drawer.classList.remove('open');
            setTimeout(() => {
                backdrop.classList.remove('open');
            }, 300);
        }
        
        // Clear stored data
        window.currentPlaysData = null;
    }

    static async togglePlayCompletion(actionId, playId, playIndex, isCompleted) {
        if (!window.currentPlaysData) {
            console.error('No plays data available for update');
            return;
        }

        try {
            const { taskId, planData, actionItem } = window.currentPlaysData;
            const plays = [...actionItem.plays]; // Create copy
            
            if (plays[playIndex]) {
                plays[playIndex].completed = isCompleted;
                
                // Update the action item with new plays data
                const updatedActionItems = [...planData.actionItems];
                updatedActionItems[0] = {
                    ...actionItem,
                    plays: plays
                };
                
                const updateData = {
                    actionItems: updatedActionItems
                };
                
                await ActionPlanService.updateActionPlan(planData.id, updateData, window.app);
                
                // Update the visual indicator
                const playItem = document.querySelector(`[data-play-id="${playId}"]`);
                if (playItem) {
                    if (isCompleted) {
                        playItem.classList.add('completed');
                        playItem.querySelector('.status-badge').textContent = 'Complete';
                        playItem.querySelector('.status-badge').className = 'status-badge status-complete';
                    } else {
                        playItem.classList.remove('completed');
                        playItem.querySelector('.status-badge').textContent = 'Pending';
                        playItem.querySelector('.status-badge').className = 'status-badge status-pending';
                    }
                }
                
                this.showPlayUpdateSuccess(`Play marked as ${isCompleted ? 'complete' : 'pending'}`);
                
                // Update stored data
                window.currentPlaysData.actionItem.plays = plays;
                
                // Re-render main view to reflect changes
                if (window.app && window.app.renderCurrentTab) {
                    window.app.renderCurrentTab();
                }
                
            } else {
                console.error('Play not found at index:', playIndex);
            }
        } catch (error) {
            console.error('Error updating play completion:', error);
            this.showPlayUpdateError('Failed to update play status');
        }
    }

    // === NOTIFICATION METHODS ===
    
    static showTaskUpdateSuccess(message) {
        const notification = document.createElement('div');
        notification.className = 'update-notification success';
        notification.innerHTML = `
            <i class="fas fa-check-circle"></i>
            ${message}
        `;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('show');
            setTimeout(() => {
                notification.classList.remove('show');
                setTimeout(() => notification.remove(), 300);
            }, 3000);
        }, 100);
    }

    static showTaskUpdateError(errorMessage) {
        const notification = document.createElement('div');
        notification.className = 'update-notification error';
        notification.innerHTML = `
            <i class="fas fa-exclamation-circle"></i>
            Error: ${errorMessage}
        `;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('show');
            setTimeout(() => {
                notification.classList.remove('show');
                setTimeout(() => notification.remove(), 300);
            }, 5000);
        }, 100);
    }

    static showPlayUpdateSuccess(message) {
        const notification = document.createElement('div');
        notification.className = 'update-notification success';
        notification.innerHTML = `
            <i class="fas fa-check-circle"></i>
            ${message}
        `;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('show');
            setTimeout(() => {
                notification.classList.remove('show');
                setTimeout(() => notification.remove(), 300);
            }, 3000);
        }, 100);
    }

    static showPlayUpdateError(errorMessage) {
        const notification = document.createElement('div');
        notification.className = 'update-notification error';
        notification.innerHTML = `
            <i class="fas fa-exclamation-circle"></i>
            Error updating plays: ${errorMessage}
        `;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('show');
            setTimeout(() => {
                notification.classList.remove('show');
                setTimeout(() => notification.remove(), 300);
            }, 5000);
        }, 100);
    }

    // === DATA LOADING METHODS ===

    static async getFormattedActionPlans(app) {
        try {
            // Try to load from Domo API first
            const liveActionPlans = await this.loadLiveActionPlans(app);
            if (liveActionPlans && liveActionPlans.length > 0) {
                console.log('Using live action plans from Domo API:', liveActionPlans.length);
                return liveActionPlans;
            }
            
            // Fall back to local JSON file
            const fallbackPlans = await this.loadFallbackActionPlans(app);
            console.log('Using fallback action plans:', fallbackPlans.length);
            return fallbackPlans;
            
        } catch (error) {
            console.error('Error loading action plans:', error);
            return [];
        }
    }

    static async loadLiveActionPlans(app) {
        try {
            const actionPlansArray = [];
            
            // Convert Map to array and process each plan
            for (let [accountId, planData] of app.actionPlans) {
                // Validate the plan has required data
                if (!planData.actionItems || planData.actionItems.length === 0) {
                    console.log(`Skipping plan ${planData.id} - no action items`);
                    continue;
                }

                // Find account name from app.accounts if available
                let accountName = 'Unknown Account';
                if (app.accounts && app.accounts.has(accountId)) {
                    const account = app.accounts.get(accountId);
                    accountName = account.name || account.account_name || accountName;
                } else if (planData.accountName) {
                    accountName = planData.accountName;
                }

                // Create formatted plan object
                const formattedPlan = {
                    planData: planData,
                    accountId: accountId,
                    accountName: accountName,
                    urgency: this.determinePlanUrgency(planData, app),
                    renewalValue: this.getPlanRenewalValue(planData, app)
                };
                
                actionPlansArray.push(formattedPlan);
            }
            
            return actionPlansArray;
            
        } catch (error) {
            console.error('Error processing live action plans:', error);
            return [];
        }
    }

    static async loadFallbackActionPlans(app) {
        try {
            console.log('Attempting to load fallback action plans...');
            const response = await fetch('/action-plans-fallback.json');
            
            if (!response.ok) {
                if (response.status === 404) {
                    console.log('Fallback file not found (404) - this is expected in production');
                    return [];
                }
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const fallbackData = await response.json();
            
            if (!Array.isArray(fallbackData)) {
                console.error('Fallback data is not an array:', typeof fallbackData);
                return [];
            }
            
            const formattedPlans = [];
            
            for (const record of fallbackData) {
                const planContent = record.content;
                if (!planContent || !planContent.actionItems) continue;
                
                // Find related signal for account information
                const signal = app.signals?.find(s => s.action_id === planContent.actionItems[0]?.actionId);
                
                const accountName = this.getAccountNameFromPlan(planContent, signal, app);
                const urgency = this.determineFallbackUrgency(planContent, signal);
                const renewalValue = this.getFallbackRenewalValue(signal, app);
                
                const formattedPlan = {
                    planData: planContent,
                    accountId: planContent.accountId || record.id,
                    accountName: accountName,
                    urgency: urgency,
                    renewalValue: renewalValue,
                    lastUpdated: planContent.createdAt || new Date().toISOString()
                };
                
                formattedPlans.push(formattedPlan);
            }
            
            // Sort by urgency then by last updated
            const urgencyOrder = { 'high': 0, 'normal': 1, 'low': 2 };
            return formattedPlans
                .sort((a, b) => {
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

    static determinePlanUrgency(planData, app) {
        // Determine urgency based on action items priority and due dates
        if (planData.actionItems && planData.actionItems.length > 0) {
            const hasHighPriority = planData.actionItems.some(item => item.priority === 'High');
            if (hasHighPriority) return 'high';
            
            const hasOverdueTasks = planData.actionItems.some(item => {
                if (!item.dueDate) return false;
                return new Date(item.dueDate) < new Date();
            });
            if (hasOverdueTasks) return 'high';
        }
        
        return 'normal';
    }

    static getPlanRenewalValue(planData, app) {
        // Try to find renewal value from associated signal or account data
        if (planData.accountId && app.accounts && app.accounts.has(planData.accountId)) {
            const account = app.accounts.get(planData.accountId);
            if (account && account.bks_renewal_baseline_usd) {
                return parseFloat(account.bks_renewal_baseline_usd) || 0;
            }
        }
        
        return 0;
    }

    static getRandomRenewalValue() {
        // Generate realistic renewal values for demonstration
        const ranges = [
            { min: 50000, max: 100000 },
            { min: 100000, max: 250000 },
            { min: 250000, max: 500000 },
            { min: 500000, max: 1000000 }
        ];
        
        const selectedRange = ranges[Math.floor(Math.random() * ranges.length)];
        return Math.floor(Math.random() * (selectedRange.max - selectedRange.min) + selectedRange.min);
    }

    // Helper method to find task data (simplified version)
    static async findTaskData(taskId, actionId, app) {
        // Try to find in current action plans
        for (let [accountId, planData] of app.actionPlans) {
            if (planData.id === taskId) {
                const actionItem = planData.actionItems?.find(item => item.actionId === actionId);
                if (actionItem) {
                    return {
                        taskId,
                        actionId,
                        actionItem,
                        planData,
                        accountId: planData.accountId || accountId
                    };
                }
            }
        }
        
        // If not found, return null
        return null;
    }
}