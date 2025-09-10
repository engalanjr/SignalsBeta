// Action Plan Service - Handle action plan operations
class ActionPlanService {
    
    static initializeEventListeners() {
        // Event delegation for all problematic onclick handlers
        document.addEventListener('click', (e) => {
            if (e.target.matches('.add-action-btn[data-onclick="addToolboxPlay"]')) {
                const playTitle = e.target.getAttribute('data-title');
                if (playTitle) {
                    this.addToolboxPlay(playTitle, e.target);
                }
                e.preventDefault();
                e.stopPropagation();
            } else if (e.target.matches('.add-action-btn[data-onclick="addRecommendationAction"]')) {
                const actionTitle = e.target.getAttribute('data-title');
                if (actionTitle) {
                    this.addRecommendationAction(actionTitle, e.target);
                }
                e.preventDefault();
                e.stopPropagation();
            } else if (e.target.matches('.plays-button[data-onclick="openPlaysModal"]') || e.target.closest('.plays-button[data-onclick="openPlaysModal"]')) {
                const button = e.target.matches('.plays-button[data-onclick="openPlaysModal"]') ? e.target : e.target.closest('.plays-button[data-onclick="openPlaysModal"]');
                const taskId = button.getAttribute('data-task-id');
                const taskTitle = button.getAttribute('data-task-title');
                if (taskId && taskTitle) {
                    ActionsRenderer.openPlaysModal(taskId, taskTitle);
                }
                e.preventDefault();
                e.stopPropagation();
            } else if (e.target.matches('[data-onclick="cancelCommentEdit"]')) {
                const commentId = e.target.getAttribute('data-comment-id');
                const signalId = e.target.getAttribute('data-signal-id');
                const commentText = e.target.getAttribute('data-comment-text');
                if (commentId && signalId && commentText !== null) {
                    window.app.cancelCommentEdit(commentId, signalId, commentText);
                }
                e.preventDefault();
                e.stopPropagation();
            }
        });
    }

    static createPlan(signalId, app) {
        this.openCreatePlanDrawer(signalId, app);
    }

    static openCreatePlanDrawer(signalId = null, app) {
        const signal = signalId ? app.data.find(s => s.id === signalId) : null;
        app.selectedSignal = signal;

        // 🔧 CRITICAL FIX: Find existing plan by searching for matching signalId
        // (app.actionPlans is keyed by planId, not signalId)
        let existingPlan = null;
        if (signalId) {
            for (let [planId, planData] of app.actionPlans) {
                if (planData.signalId === signalId) {
                    existingPlan = planData;
                    break;
                }
            }
        }
        const isEditMode = !!existingPlan;

        // Populate the drawer content
        this.populateCreatePlanDrawer(signal, app, isEditMode, existingPlan);

        // Get drawer elements
        const drawer = document.getElementById('createPlanDrawer');
        const backdrop = document.getElementById('createPlanDrawerBackdrop');

        if (drawer && backdrop) {
            // Show backdrop first
            backdrop.classList.add('open');

            // Small delay to ensure backdrop is rendered, then show drawer
            setTimeout(() => {
                drawer.classList.add('open');
            }, 10);
        } else {
            console.error('Drawer elements not found:', { drawer: !!drawer, backdrop: !!backdrop });
        }
    }

    static populateCreatePlanDrawer(selectedSignal = null, app, isEditMode = false, existingPlan = null) {
        if (selectedSignal) {
            this.populateAccountCentricPlan(selectedSignal, app, isEditMode, existingPlan);
        } else {
            this.populateGeneralPlan(app, isEditMode, existingPlan);
        }
    }

    static populateAccountCentricPlan(selectedSignal, app, isEditMode = false, existingPlan = null) {
        const account = app.accounts.get(selectedSignal.account_id);
        const accountSignals = account ? account.signals : [selectedSignal];

        document.querySelector('#createPlanDrawer .drawer-header h2').innerHTML = `
            <i class="fas fa-lightbulb"></i> ${isEditMode ? 'Edit' : 'Create'} Action Plan for ${selectedSignal.account_name}
        `;

        document.querySelector('#createPlanDrawer .drawer-body').innerHTML = `
            <div class="plan-section">
                <h3><i class="fas fa-bullseye"></i> Current Signal</h3>
                <div class="current-signal-card">
                    <div class="signal-title">${selectedSignal.name}</div>
                    <div class="signal-meta">
                        <span class="category-badge">${selectedSignal.category}</span>
                        <span class="priority-badge priority-${selectedSignal.priority.toLowerCase()}">${selectedSignal.priority}</span>
                    </div>
                    <div class="signal-summary">${selectedSignal.summary}</div>
                </div>
            </div>

            ${accountSignals.length > 1 ? `
            <div class="plan-section">
                <h3><i class="fas fa-layer-group"></i> Other Account Signals (${accountSignals.length - 1} more)</h3>
                <div class="other-signals-list">
                    ${accountSignals
                        .filter(s => s.id !== selectedSignal.id)
                        .slice(0, 3)
                        .map(signal => `
                        <div class="other-signal-item" onclick="app.switchToSignal('${signal.id}')">
                            <span class="signal-name">${signal.name}</span>
                            <span class="priority-badge priority-${signal.priority.toLowerCase()}">${signal.priority}</span>
                        </div>
                    `).join('')}
                    ${accountSignals.length > 4 ? `
                        <div class="more-signals-indicator">
                            +${accountSignals.length - 4} more signals for this account
                        </div>
                    ` : ''}
                </div>
            </div>
            ` : ''}

            <div class="plan-section">
                <h3><i class="fas fa-robot"></i> AI Recommendations & CS Toolbox Plays</h3>
                <div class="recommendations-description">
                    Select AI recommendations and choose supporting CS Toolbox plays for each recommendation.
                </div>
                <div id="aiRecommendationsWithPlays" class="recommendations-with-plays">
                    ${this.generateAIRecommendationsWithPlaysForSignal(selectedSignal)}
                </div>
            </div>

            <div class="plan-section">
                <h3><i class="fas fa-list"></i> Action Items</h3>
                <div id="actionItems" class="action-items">
                    <!-- Action items will be populated here -->
                </div>
            </div>

            <div class="plan-section">
                <h3><i class="fas fa-tag"></i> Plan Details</h3>
                <div class="plan-details-grid">
                    <div class="plan-field">
                        <label for="planTitle">Plan Title</label>
                        <input type="text" id="planTitle" class="plan-title-input" 
                               placeholder="Enter a title for this action plan..." 
                               value="${existingPlan ? existingPlan.planTitle || '' : `Action Plan - ${selectedSignal.account_name}`}">
                    </div>
                </div>
            </div>

            <div class="plan-section">
                <h3><i class="fas fa-sticky-note"></i> Plan Notes</h3>
                <textarea id="planNotes" class="plan-notes" placeholder="Add notes about this action plan for ${selectedSignal.account_name}...">${existingPlan ? existingPlan.notes || '' : ''}</textarea>
            </div>
        `;

        // Update the create/update button text
        const createPlanButton = document.getElementById('createPlan');
        if (createPlanButton) {
            createPlanButton.textContent = isEditMode ? 'Update Plan' : 'Create Plan';
        }

        // If editing existing plan, load existing action items and pre-select recommendations/plays
        if (isEditMode && existingPlan && existingPlan.actionItems) {
            setTimeout(() => {
                existingPlan.actionItems.forEach(item => {
                    // Handle both old string format and new object format
                    if (typeof item === 'string') {
                        this.addActionItem(item);
                    } else {
                        this.addActionItem(item.title, item.actionId);
                        // Note: Checkboxes removed from UI, completion status preserved in data
                    }
                });

                // Pre-select recommendations and plays based on existing action items
                this.preselectRecommendationsAndPlays(existingPlan);
            }, 100);
        }
    }

    static generateAIRecommendationsWithPlaysForSignal(signal) {
        // Get AI recommendations
        const account = window.app.accounts.get(signal.account_id);
        if (!account) {
            return this.generateGeneralAIRecommendationsWithPlays();
        }

        const actionMap = new Map(); // Map to track unique recommended_action with their action_ids

        account.signals.forEach(accountSignal => {
            // Use recommended_action from signal data
            if (accountSignal.recommended_action && accountSignal.recommended_action.trim() && 
                accountSignal.recommended_action !== 'No actions specified' && 
                accountSignal.recommended_action !== 'N/A' &&
                accountSignal.recommended_action !== '') {

                const action = accountSignal.recommended_action.trim();
                const actionId = accountSignal.action_id;

                // Store unique actions with their action_ids and associated plays
                if (!actionMap.has(action)) {
                    actionMap.set(action, {
                        actionIds: new Set(),
                        plays: this.getPlaysForSignal(accountSignal)
                    });
                }
                if (actionId) {
                    actionMap.get(action).actionIds.add(actionId);
                }
            }
        });

        // Convert map to array of unique actions
        const uniqueActions = Array.from(actionMap.entries())
            .filter(([action]) => action.length > 10) // Ensure substantial actions
            .slice(0, 5); // Take top 5 actions for action plan drawer

        // Final fallback: Generate general recommendations
        if (uniqueActions.length === 0) {
            return this.generateGeneralAIRecommendationsWithPlays();
        }

        // Format recommendations with selectable plays
        let html = uniqueActions.map(([action, data], index) => {
            const plays = data.plays;
            const recommendationId = `recommendation-${index}`;

            return `
                <div class="recommendation-with-plays" data-recommendation-id="${recommendationId}">
                    <div class="recommendation-header">
                        <div class="recommendation-content">
                            <input type="checkbox" class="recommendation-checkbox" id="rec-${recommendationId}"
                                   data-recommendation-id="${recommendationId}"
                                   onchange="ActionPlanService.toggleRecommendationSelection('${recommendationId}')">
                            <label for="rec-${recommendationId}" class="recommendation-text">
                                ${action.trim()}
                            </label>
                        </div>
                    </div>

                    <div class="plays-section" id="plays-${recommendationId}">
                        <div class="plays-header">
                            <span class="plays-label">Supporting CS Toolbox Plays (select up to 3):</span>
                        </div>
                        <div class="plays-grid">
                            ${plays.length > 0 ? plays.map((play, playIndex) => `
                                <div class="play-option" id="play-option-${recommendationId}-${playIndex}">
                                    <input type="checkbox" class="play-checkbox" id="play-${recommendationId}-${playIndex}"
                                           data-play-title="${play.title}" 
                                           data-recommendation-id="${recommendationId}"
                                           data-play-field="${play.fieldName}"
                                           onchange="ActionPlanService.togglePlaySelection('${recommendationId}', '${playIndex}')">
                                    <label for="play-${recommendationId}-${playIndex}" class="play-label">
                                        <div class="play-header">
                                            <span class="play-title">${play.title}</span>
                                            <span class="play-priority-badge ${play.priority}">${play.priority.toUpperCase()}</span>
                                        </div>
                                        <div class="play-description">${this.truncateText(play.description, 250)}</div>
                                        <div class="play-owner">
                                            <span class="play-owner-label">Play Owner:</span>
                                            <span class="play-owner-value">${play.executingRole || 'Not specified'}</span>
                                        </div>
                                    </label>
                                </div>
                            `).join('') : '<div class="no-plays">No specific plays available for this recommendation</div>'}
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        // Add the single "Add Recommendations" button at the bottom
        html += `
            <div class="add-recommendations-section">
                <button class="btn btn-primary add-all-recommendations-btn" onclick="ActionPlanService.addSelectedRecommendations()">
                    <i class="fas fa-plus"></i> Add Selected Recommendations
                </button>
            </div>
        `;

        return html;
    }

    static getPlaysForSignal(signal) {
        const plays = [];
        const signalPriority = this.mapPriorityToStatus(signal.priority);

        // Debug: Log play field values
        console.log('Checking plays for signal:', signal.id);
        console.log('play_1_name:', signal.play_1_name);
        console.log('play_2_name:', signal.play_2_name);
        console.log('play_3_name:', signal.play_3_name);

        // Check for Play 1 using correct field names
        if (signal.play_1_name && signal.play_1_name.trim() && 
            signal.play_1_name !== 'N/A' && signal.play_1_name !== '') {
            plays.push({
                title: signal.play_1_name.trim(),
                description: signal.play_1_description || signal.play_1 || 'No description available',
                executingRole: signal.play_1_executing_role || 'Not specified',
                priority: signalPriority,
                fieldName: 'play_1'
            });
        } else if (signal.play_1 && signal.play_1.trim() && 
                   signal.play_1 !== 'N/A' && signal.play_1 !== '') {
            plays.push({
                title: signal.play_1.trim(),
                description: 'No description available',
                executingRole: signal.play_1_executing_role || 'Not specified',
                priority: signalPriority,
                fieldName: 'play_1'
            });
        }

        // Check for Play 2
        if (signal.play_2_name && signal.play_2_name.trim() && 
            signal.play_2_name !== 'N/A' && signal.play_2_name !== '') {
            plays.push({
                title: signal.play_2_name.trim(),
                description: signal.play_2_description || signal.play_2 || 'No description available',
                executingRole: signal.play_2_executing_role || 'Not specified',
                priority: signalPriority,
                fieldName: 'play_2'
            });
        } else if (signal.play_2 && signal.play_2.trim() && 
                   signal.play_2 !== 'N/A' && signal.play_2 !== '') {
            plays.push({
                title: signal.play_2.trim(),
                description: 'No description available',
                executingRole: signal.play_2_executing_role || 'Not specified',
                priority: signalPriority,
                fieldName: 'play_2'
            });
        }

        // Check for Play 3
        if (signal.play_3_name && signal.play_3_name.trim() && 
            signal.play_3_name !== 'N/A' && signal.play_3_name !== '') {
            plays.push({
                title: signal.play_3_name.trim(),
                description: signal.play_3_description || signal.play_3 || 'No description available',
                executingRole: signal.play_3_executing_role || 'Not specified',
                priority: signalPriority,
                fieldName: 'play_3'
            });
        } else if (signal.play_3 && signal.play_3.trim() && 
                   signal.play_3 !== 'N/A' && signal.play_3 !== '') {
            plays.push({
                title: signal.play_3.trim(),
                description: 'No description available',
                executingRole: signal.play_3_executing_role || 'Not specified',
                priority: signalPriority,
                fieldName: 'play_3'
            });
        }

        console.log(`Found ${plays.length} plays for signal ${signal.id}:`, plays.map(p => p.title));
        return plays;
    }

    static preselectRecommendationsAndPlays(existingPlan) {
        if (!existingPlan || !existingPlan.actionItems) return;

        existingPlan.actionItems.forEach(item => {
            // If action item has plays, find and check the corresponding recommendation and plays
            if (item.plays && item.plays.length > 0) {
                // Find the recommendation matching the item's title
                const recommendationText = item.title.trim();
                const recommendationCheckbox = Array.from(document.querySelectorAll('.recommendation-text')).find(el => el.textContent.trim() === recommendationText);

                if (recommendationCheckbox) {
                    const recommendationId = recommendationCheckbox.getAttribute('data-recommendation-id');
                    const recCheckboxElement = document.getElementById(`rec-${recommendationId}`);
                    if (recCheckboxElement) {
                        recCheckboxElement.checked = true;
                        // Trigger the selection toggle to check associated plays
                        this.toggleRecommendationSelection(recommendationId);

                        // Now, specifically check the plays that were part of this action item
                        item.plays.forEach(planPlay => {
                            const playTitle = planPlay.playName || planPlay.playTitle;
                            if (playTitle) {
                                const playLabel = Array.from(document.querySelectorAll('.play-label .play-title')).find(el => el.textContent.trim() === playTitle.trim());
                                if (playLabel) {
                                    const playCheckbox = playLabel.closest('.play-option').querySelector('.play-checkbox');
                                    if (playCheckbox) {
                                        playCheckbox.checked = true;
                                        playLabel.closest('.play-option').classList.add('play-selected');
                                    }
                                }
                            }
                        });
                    }
                }
            }
        });
    }

    static generateGeneralAIRecommendationsWithPlays() {
        const generalRecs = [
            {
                action: 'Schedule executive alignment call within 48 hours',
                plays: [
                    { title: 'Executive Alignment Call', priority: 'high', description: 'Schedule a strategic alignment call with key stakeholders', fieldName: 'general_play_1' },
                    { title: 'Stakeholder Mapping', priority: 'medium', description: 'Identify and map key decision makers', fieldName: 'general_play_2' }
                ]
            },
            {
                action: 'Engage technical success team for architecture review',
                plays: [
                    { title: 'Technical Architecture Review', priority: 'high', description: 'Review current technical setup and optimization opportunities', fieldName: 'general_play_3' },
                    { title: 'Performance Analysis', priority: 'medium', description: 'Analyze system performance and identify bottlenecks', fieldName: 'general_play_4' }
                ]
            }
        ];

        let html = generalRecs.map((rec, index) => {
            const recommendationId = `general-recommendation-${index}`;
            return `
                <div class="recommendation-with-plays" data-recommendation-id="${recommendationId}">
                    <div class="recommendation-header">
                        <div class="recommendation-content">
                            <input type="checkbox" class="recommendation-checkbox" id="rec-${recommendationId}"
                                   data-recommendation-id="${recommendationId}"
                                   onchange="ActionPlanService.toggleRecommendationSelection('${recommendationId}')">
                            <label for="rec-${recommendationId}" class="recommendation-text">${rec.action}</label>
                        </div>
                    </div>

                    <div class="plays-section" id="plays-${recommendationId}">
                        <div class="plays-header">
                            <span class="plays-label">Supporting CS Toolbox Plays (select up to 3):</span>
                        </div>
                        <div class="plays-grid">
                            ${rec.plays.map((play, playIndex) => `
                                <div class="play-option" id="play-option-${recommendationId}-${playIndex}">
                                    <input type="checkbox" class="play-checkbox" id="play-${recommendationId}-${playIndex}" 
                                           data-play-title="${play.title}"
                                           data-recommendation-id="${recommendationId}"
                                           data-play-field="${play.fieldName}"
                                           onchange="ActionPlanService.togglePlaySelection('${recommendationId}', '${playIndex}')">
                                    <label for="play-${recommendationId}-${playIndex}" class="play-label">
                                        <div class="play-header">
                                            <span class="play-title">${play.title}</span>
                                            <span class="play-priority-badge ${play.priority}">${play.priority.toUpperCase()}</span>
                                        </div>
                                        <div class="play-description">${this.truncateText(play.description, 250)}</div>
                                        <div class="play-owner">
                                            <span class="play-owner-label">Play Owner:</span>
                                            <span class="play-owner-value">${play.executingRole || 'Not specified'}</span>
                                        </div>
                                    </label>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        // Add the single "Add Recommendations" button at the bottom
        html += `
            <div class="add-recommendations-section">
                <button class="btn btn-primary add-all-recommendations-btn" onclick="ActionPlanService.addSelectedRecommendations()">
                    <i class="fas fa-plus"></i> Add Selected Recommendations
                </button>
            </div>
        `;

        return html;
    }

    static toggleRecommendationSelection(recommendationId) {
        const recommendationCheckbox = document.getElementById(`rec-${recommendationId}`);
        const playCheckboxes = document.querySelectorAll(`input[data-recommendation-id="${recommendationId}"].play-checkbox`);

        if (recommendationCheckbox.checked) {
            // Auto-check all plays when recommendation is selected
            playCheckboxes.forEach(playCheckbox => {
                playCheckbox.checked = true;
                const playOption = playCheckbox.closest('.play-option');
                playOption.classList.add('play-selected');
            });
        } else {
            // Uncheck all plays when recommendation is deselected
            playCheckboxes.forEach(playCheckbox => {
                playCheckbox.checked = false;
                const playOption = playCheckbox.closest('.play-option');
                playOption.classList.remove('play-selected');
            });
        }
    }

    static addSelectedRecommendations() {
        const selectedRecommendations = document.querySelectorAll('.recommendation-checkbox:checked');

        selectedRecommendations.forEach(recCheckbox => {
            const recommendationId = recCheckbox.getAttribute('data-recommendation-id');
            const recommendationContainer = recCheckbox.closest('.recommendation-with-plays');
            const recommendationText = recommendationContainer.querySelector('.recommendation-text').textContent.trim();

            // Get selected plays for this recommendation
            const selectedPlays = [];
            const selectedPlayCheckboxes = recommendationContainer.querySelectorAll('.play-checkbox:checked');

            selectedPlayCheckboxes.forEach(playCheckbox => {
                const playTitle = playCheckbox.getAttribute('data-play-title');
                const playOption = playCheckbox.closest('.play-option');
                const playLabel = playOption.querySelector('.play-title');
                const playFieldName = playCheckbox.getAttribute('data-play-field');

                if (playTitle && playLabel && playFieldName) {
                    selectedPlays.push({
                        playId: playFieldName,
                        playName: playTitle,
                        playTitle: playLabel.textContent
                    });
                }
            });

            // Check if this recommendation is already added
            const actionItemsContainer = document.getElementById('actionItems');
            const existingActionElements = actionItemsContainer.querySelectorAll('.action-text');
            let isAlreadyAdded = false;
            existingActionElements.forEach(el => {
                if (el.textContent === recommendationText) {
                    isAlreadyAdded = true;
                }
            });

            if (!isAlreadyAdded) {
                // Generate GUID for actionId
                const actionId = this.generateGUID();
                this.addActionItemWithPlays(recommendationText, selectedPlays, actionId);
            }
        });

        // Reset all checkboxes after adding
        document.querySelectorAll('.recommendation-checkbox').forEach(checkbox => {
            checkbox.checked = false;
        });
        document.querySelectorAll('.play-checkbox').forEach(checkbox => {
            checkbox.checked = false;
            const playOption = checkbox.closest('.play-option');
            playOption.classList.remove('play-selected');
        });
    }

    static togglePlaySelection(recommendationId, playIndex) {
        const checkbox = document.getElementById(`play-${recommendationId}-${playIndex}`);
        const playOption = document.getElementById(`play-option-${recommendationId}-${playIndex}`);

        if (checkbox.checked) {
            // Check if we already have 3 selected
            const allCheckboxes = document.querySelectorAll(`input[data-recommendation-id="${recommendationId}"]`);
            const checkedCount = Array.from(allCheckboxes).filter(cb => cb.checked).length;

            if (checkedCount > 3) {
                checkbox.checked = false;
                alert('You can select up to 3 plays per recommendation.');
                return;
            }

            // Highlight the play option
            playOption.classList.add('play-selected');
        } else {
            // Remove highlight
            playOption.classList.remove('play-selected');
        }
    }


    static generateAIRecommendationsForSignal(signal) {
        // For action plan drawer, we want to show ALL related recommendations for the account
        const account = window.app.accounts.get(signal.account_id);
        if (!account) {
            return this.generateGeneralAIRecommendations();
        }

        const actionMap = new Map(); // Map to track unique recommended_action with their action_ids

        account.signals.forEach(accountSignal => {
            // Use recommended_action from signal data
            if (accountSignal.recommended_action && accountSignal.recommended_action.trim() && 
                accountSignal.recommended_action !== 'No actions specified' && 
                accountSignal.recommended_action !== 'N/A' &&
                accountSignal.recommended_action !== '') {

                const action = accountSignal.recommended_action.trim();
                const actionId = accountSignal.action_id;

                // Store unique actions with their action_ids
                if (!actionMap.has(action)) {
                    actionMap.set(action, new Set());
                }
                if (actionId) {
                    actionMap.get(action).add(actionId);
                }
            }
        });

        // Convert map to array of unique actions
        const uniqueActions = Array.from(actionMap.keys())
            .filter(action => action.length > 10) // Ensure substantial actions
            .slice(0, 5); // Take top 5 actions for action plan drawer

        // Final fallback: Generate general recommendations
        if (uniqueActions.length === 0) {
            return this.generateGeneralAIRecommendations();
        }

        // Format recommendations without action_id information
        return uniqueActions.map(action => {
            return `
                <div class="recommendation-item">
                    ${action.trim()}
                    <button class="add-action-btn" data-title="${action.trim()}" data-onclick="addRecommendationAction">+ Add as Action</button>
                </div>
            `;
        }).join('');
    }

    static generateToolboxPlaysForSignal(signal) {
        // Extract plays from signal data using correct field names
        const plays = [];
        const signalPriority = this.mapPriorityToStatus(signal.priority);

        // Check for Play 1 using correct field names
        if (signal.play_1_name && signal.play_1_name.trim() && 
            signal.play_1_name !== 'N/A' && signal.play_1_name !== '') {
            plays.push({
                title: signal.play_1_name.trim(),
                description: signal.play_1_description || signal.play_1 || 'No description available',
                priority: signalPriority
            });
        } else if (signal.play_1 && signal.play_1.trim() && 
                   signal.play_1 !== 'N/A' && signal.play_1 !== '') {
            plays.push({
                title: signal.play_1.trim(),
                description: 'No description available',
                priority: signalPriority
            });
        }

        // Check for Play 2 using correct field names
        if (signal.play_2_name && signal.play_2_name.trim() && 
            signal.play_2_name !== 'N/A' && signal.play_2_name !== '') {
            plays.push({
                title: signal.play_2_name.trim(),
                description: signal.play_2_description || signal.play_2 || 'No description available',
                priority: signalPriority
            });
        } else if (signal.play_2 && signal.play_2.trim() && 
                   signal.play_2 !== 'N/A' && signal.play_2 !== '') {
            plays.push({
                title: signal.play_2.trim(),
                description: 'No description available',
                priority: signalPriority
            });
        }

        // Check for Play 3 using correct field names
        if (signal.play_3_name && signal.play_3_name.trim() && 
            signal.play_3_name !== 'N/A' && signal.play_3_name !== '') {
            plays.push({
                title: signal.play_3_name.trim(),
                description: signal.play_3_description || signal.play_3 || 'No description available',
                priority: signalPriority
            });
        } else if (signal.play_3 && signal.play_3.trim() && 
                   signal.play_3 !== 'N/A' && signal.play_3 !== '') {
            plays.push({
                title: signal.play_3.trim(),
                description: 'No description available',
                priority: signalPriority
            });
        }

        // If no plays found in signal data, return general plays
        if (plays.length === 0) {
            return this.generateGeneralToolboxPlays();
        }

        return plays.map(play => `
            <div class="toolbox-play">
                <div class="play-header">
                    <span class="play-title">${play.title}</span>
                    <span class="play-badge ${play.priority}">${play.priority.toUpperCase()}</span>
                </div>
                <div class="play-description">${play.description}</div>
                <button class="btn btn-primary add-action-btn" data-title="${play.title}" data-onclick="addToolboxPlay">+ Add Play</button>
            </div>
        `).join('');
    }

    static populateGeneralPlan(app, isEditMode = false, existingPlan = null) {
        const drawerBody = document.querySelector('#createPlanDrawer .drawer-body');
        const selectedSignal = app.selectedSignal;

        if (!selectedSignal) return;

        drawerBody.innerHTML = `
            <div class="plan-section">
                <h3><i class="fas fa-robot"></i> AI Recommendations & CS Toolbox Plays</h3>
                <div class="recommendations-description">
                    Select AI recommendations and choose supporting CS Toolbox plays for each recommendation.
                </div>
                <div id="aiRecommendationsWithPlays" class="recommendations-with-plays">
                    ${this.generateGeneralAIRecommendationsWithPlays()}
                </div>
            </div>

            <div class="plan-section">
                <h3><i class="fas fa-list"></i> Action Items</h3>
                <div id="actionItems" class="action-items">
                    <!-- Action items will be populated here -->
                </div>
            </div>

            <div class="plan-section">
                <h3><i class="fas fa-tag"></i> Plan Details</h3>
                <div class="plan-details-grid">
                    <div class="plan-field">
                        <label for="planTitle">Plan Title</label>
                        <input type="text" id="planTitle" class="plan-title-input" 
                               placeholder="Enter a title for this action plan..." 
                               value="${existingPlan ? existingPlan.planTitle || '' : `Action Plan - ${selectedSignal.account_name}`}">
                    </div>
                </div>
            </div>

            <div class="plan-section">
                <h3><i class="fas fa-sticky-note"></i> Plan Notes</h3>
                <textarea id="planNotes" class="plan-notes" placeholder="Add notes about this action plan for ${selectedSignal.account_name}...">${existingPlan ? existingPlan.notes || '' : ''}</textarea>
            </div>
        `;

        // Update the create/update button text
        const createPlanButton = document.getElementById('createPlan');
        if (createPlanButton) {
            createPlanButton.textContent = isEditMode ? 'Update Plan' : 'Create Plan';
        }

        // If editing existing plan, load existing action items and pre-select recommendations/plays
        if (isEditMode && existingPlan && existingPlan.actionItems) {
            setTimeout(() => {
                existingPlan.actionItems.forEach(item => {
                    // Handle both old string format and new object format
                    if (typeof item === 'string') {
                        this.addActionItem(item);
                    } else {
                        this.addActionItem(item.title, item.actionId);
                        // Note: Checkboxes removed from UI, completion status preserved in data
                    }
                });

                // Pre-select recommendations and plays based on existing action items
                this.preselectRecommendationsAndPlays(existingPlan);
            }, 100);
        }
    }

    static generateGeneralAIRecommendations() {
        const generalRecs = [
            'Schedule executive alignment call within 48 hours',
            'Engage technical success team for architecture review',
            'Initiate renewal discussion and expansion opportunities'
        ];

        return generalRecs.map(rec => `
            <div class="recommendation-item">
                ${rec}
                <button class="add-action-btn" data-title="${rec}" data-onclick="addRecommendationAction">+ Add as Action</button>
            </div>
        `).join('');
    }

    static generateGeneralToolboxPlays() {
        const generalPlays = [
            {
                title: 'Executive Alignment Call',
                priority: 'high',
                description: 'Schedule a strategic alignment call with key stakeholders'
            },
            {
                title: 'Health Check Review',
                priority: 'medium',
                description: 'Comprehensive review of account health and usage patterns'
            },
            {
                title: 'Technical Architecture Review',
                priority: 'medium',
                description: 'Review current technical setup and optimization opportunities'
            }
        ];

        return generalPlays.map(play => `
            <div class="toolbox-play">
                <div class="play-header">
                    <span class="play-title">${play.title}</span>
                    <span class="play-badge ${play.priority}">${play.priority}</span>
                </div>
                <div class="play-description">${play.description}</div>
                <button class="btn btn-primary add-action-btn" data-title="${play.title}" data-onclick="addToolboxPlay">+ Add Play</button>
            </div>
        `).join('');
    }

    static addRecommendationAction(action, buttonElement) {
        const actionItemsContainer = document.getElementById('actionItems');
        const existingActionElements = actionItemsContainer.querySelectorAll('.action-text');
        let isAlreadyAdded = false;
        existingActionElements.forEach(el => {
            if (el.textContent === action) {
                isAlreadyAdded = true;
            }
        });

        if (!isAlreadyAdded) {
            // Get selected plays for this recommendation
            const recommendationContainer = buttonElement.closest('.recommendation-with-plays');
            const selectedPlays = [];
            if (recommendationContainer) {
                const selectedPlayCheckboxes = recommendationContainer.querySelectorAll('.play-checkbox:checked');
                selectedPlayCheckboxes.forEach(playCheckbox => {
                    const playTitle = playCheckbox.getAttribute('data-play-title');
                    const playOption = playCheckbox.closest('.play-option');
                    const playLabel = playOption.querySelector('.play-title');
                    const playFieldName = playCheckbox.getAttribute('data-play-field'); // Get the actual play field name

                    if (playTitle && playLabel && playFieldName) {
                        selectedPlays.push({
                            playId: playFieldName, // Use the actual play field name (play_1, play_2, play_3)
                            playName: playTitle,
                            playTitle: playLabel.textContent
                        });
                    }
                });
            }

            // Generate GUID for actionId
            const actionId = this.generateGUID();
            this.addActionItemWithPlays(action, selectedPlays, actionId);
            buttonElement.textContent = "Added!";
            buttonElement.classList.add('added');
            buttonElement.disabled = true;
        }
    }

    static addToolboxPlay(playTitle, buttonElement) {
        const actionItemsContainer = document.getElementById('actionItems');
        const existingActionElements = actionItemsContainer.querySelectorAll('.action-text');
        let isAlreadyAdded = false;
        existingActionElements.forEach(el => {
            if (el.textContent === playTitle) {
                isAlreadyAdded = true;
            }
        });

        if (!isAlreadyAdded) {
            const actionId = this.generateGUID();
            this.addActionItem(playTitle, actionId);
            buttonElement.textContent = "Added!";
            buttonElement.classList.add('added');
            buttonElement.disabled = true;
        }
    }

    static addActionItem(title, actionId = null) {
        const container = document.getElementById('actionItems');
        const uniqueActionId = actionId || this.generateGUID();

        const actionHtml = `
            <div class="action-item" id="${uniqueActionId}">
                <span class="action-text">${title}</span>
                <button class="btn btn-remove" onclick="ActionPlanService.removeActionItem('${uniqueActionId}')" title="Remove action item">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;

        container.insertAdjacentHTML('beforeend', actionHtml);
    }

    static addActionItemWithPlays(action, plays, actionId = null) {
        const container = document.getElementById('actionItems');
        const uniqueActionId = actionId || this.generateGUID();

        let playsHtml = '';
        if (plays.length > 0) {
            playsHtml = `
                <div class="action-plays">
                    <div class="plays-label">Supporting Plays:</div>
                    ${plays.map(play => `
                        <div class="play-item">• ${typeof play === 'string' ? play : play.playName || play.playTitle || play.play}</div>
                    `).join('')}
                </div>
            `;
        }

        const actionHtml = `
            <div class="action-item nested-action" id="${uniqueActionId}" data-plays='${JSON.stringify(plays)}'>
                <div class="action-header">
                    <span class="action-text">${action}</span>
                    <button class="btn btn-remove" onclick="ActionPlanService.removeActionItem('${uniqueActionId}')" title="Remove action item">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                ${playsHtml}
            </div>
        `;

        container.insertAdjacentHTML('beforeend', actionHtml);
    }

    static removeActionItem(actionId) {
        const actionItemElement = document.getElementById(actionId);
        if (actionItemElement) {
            const actionText = actionItemElement.querySelector('.action-text').textContent;
            actionItemElement.remove();

            const allButtons = document.querySelectorAll('.add-action-btn');
            allButtons.forEach(button => {
                if (button.getAttribute('data-title') === actionText && button.classList.contains('added')) {
                    const isToolboxPlay = button.closest('.toolbox-play') !== null;
                    button.textContent = isToolboxPlay ? "+ Add Play" : "+ Add as Action";
                    button.classList.remove('added');
                    button.disabled = false;
                }
            });
        }
    }

    static async createActionPlan(app) {
        const notes = document.getElementById('planNotes').value;
        const planTitle = document.getElementById('planTitle').value;
        const actionItemElements = document.querySelectorAll('#actionItems .action-item');

        const planActionItems = Array.from(actionItemElements).map(item => {
            const title = item.querySelector('.action-text').textContent;
            const actionId = item.id; // This is the unique GUID generated for the action item
            const playsData = item.getAttribute('data-plays');
            let plays = [];

            if (playsData) {
                try {
                    plays = JSON.parse(playsData);
                } catch (e) {
                    console.warn('Failed to parse plays data:', e);
                }
            }

            return { 
                title, 
                actionId,
                plays: plays
            };
        });

        let accountId = null;
        let signalId = null;

        // Method 1: Get from selectedSignal object
        if (app.selectedSignal) {
            signalId = app.selectedSignal.id;
            accountId = app.selectedSignal.account_id;
            console.log('Method 1 - selectedSignal:', { accountId, signalId });
        }

        // Method 2: If no accountId but we have signalId, look up signal in data to get account
        if (!accountId && signalId && app.data) {
            const signalData = app.data.find(signal => signal.id === signalId);
            if (signalData && signalData.account_id) {
                accountId = signalData.account_id;
                console.log('Method 2 - found accountId via signal lookup:', accountId);
            }
        }

        // Method 3: Try to extract from drawer title (existing fallback)
        if (!accountId) {
            const drawerTitle = document.querySelector('#createPlanDrawer .drawer-header h2')?.textContent;
            if (drawerTitle && drawerTitle.includes('for ')) {
                const accountName = drawerTitle.split('for ')[1]?.trim();
                if (accountName && app.accounts) {
                    for (let [id, account] of app.accounts) {
                        if (account.name === accountName) {
                            accountId = id;
                            console.log('Method 3 - got accountId from drawer title:', accountId);
                            break;
                        }
                    }
                }
            }
        }

        // Method 4: If we have a signalId but still no accountId, search all signals
        if (!accountId && signalId && app.data) {
            for (const signal of app.data) {
                if (signal.id === signalId || signal.signal_id === signalId) {
                    accountId = signal.account_id;
                    console.log('Method 4 - found accountId via comprehensive signal search:', accountId);
                    break;
                }
            }
        }

        // Enhanced validation with informative error messages
        if (!accountId && !signalId) {
            const error = 'Critical Error: Unable to determine accountId or signalId for action plan creation. No signal context available.';
            console.error(error);
            this.showPlanErrorMessage(error);
            throw new Error(error);
        }
        
        if (!accountId) {
            const warning = `Warning: Could not determine accountId for signalId: ${signalId}. Plan will be created without account association.`;
            console.warn(warning);
        }

        // Validate that the account exists in our system
        if (accountId && app.accounts && !app.accounts.has(accountId)) {
            const warning = `Warning: Account ${accountId} not found in loaded accounts. Plan may not display correctly.`;
            console.warn(warning);
        }

        // Check if this is an edit operation
        const existingPlan = accountId ? app.actionPlans.get(accountId) : 
                           signalId ? app.actionPlans.get(signalId) : null;
        const isEdit = !!existingPlan;

        // Show loading state on create button
        const createButton = document.querySelector('.create-plan-btn');
        const originalButtonText = createButton.innerHTML;
        createButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        createButton.disabled = true;

        // Clear any existing error messages
        this.clearPlanErrorMessage();

        try {
            // Get current user info
            let userId = 'user-1'; // Default fallback
            try {
                const user = await domo.get(`/domo/environment/v1/`);
                userId = user.userId || 'user-1';
            } catch (error) {
                console.warn('Could not get user info, using default:', error);
            }

            // Handle new single-action-per-plan data model
            // In the new model, each plan represents ONE action, not multiple actionItems
            if (planActionItems.length === 0) {
                this.showPlanErrorMessage('Please add at least one action to the plan');
                return;
            }
            
            if (planActionItems.length > 1) {
                // For the new single-action model, create multiple separate plans
                // instead of one plan with multiple actionItems
                for (let i = 0; i < planActionItems.length; i++) {
                    const singleAction = planActionItems[i];
                    const singlePlanData = {
                        id: `plan-${Date.now()}-${i}`,
                        createdAt: isEdit ? existingPlan.createdAt : new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                        status: isEdit ? existingPlan.status : 'pending',
                        assignee: null,
                        createdBy: 'Ed Engalan', // This should come from user context
                        createdByUserId: userId,
                        planTitle: planTitle || `Action Plan - ${new Date().toLocaleDateString()}`,
                        accountId: accountId,
                        actionId: singleAction.actionId,
                        title: singleAction.title,
                        description: notes,
                        plays: singleAction.plays ? singleAction.plays.map(play => play.playName || play.playTitle || play) : [],
                        priority: 'medium',
                        dueDate: null,
                        createdDate: new Date().toISOString(),
                        actionItems: [] // Empty for new model
                    };
                    
                    const singleResult = await DataService.createActionPlan(singlePlanData);
                    if (!singleResult || !singleResult.success) {
                        console.error('Failed to create action plan for action:', singleAction.title);
                    }
                }
                
                // Show success for multiple plans
                NotificationService.showSuccess(`${planActionItems.length} action plans created successfully!`);
                this.closePlanDrawer();
                
                // Re-render the current tab
                if (app.currentTab === 'actions') {
                    ActionsRenderer.renderActions(app);
                } else if (app.currentTab === 'my-portfolio') {
                    PortfolioRenderer.renderMyPortfolio(app);
                }
                return;
            }
            
            // Single action - create one plan with new data model structure
            const singleAction = planActionItems[0];
            const planData = {
                id: `plan-${Date.now()}`,
                createdAt: isEdit ? existingPlan.createdAt : new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                status: isEdit ? existingPlan.status : 'pending',
                assignee: null,
                createdBy: 'Ed Engalan', // This should come from user context
                createdByUserId: userId,
                planTitle: planTitle || `Action Plan - ${new Date().toLocaleDateString()}`,
                accountId: accountId,
                signalId: signalId,
                actionId: singleAction.actionId,
                title: singleAction.title,
                description: notes,
                plays: singleAction.plays ? singleAction.plays.map(play => play.playName || play.playTitle || play) : [],
                priority: 'medium',
                dueDate: null,
                createdDate: new Date().toISOString(),
                actionItems: [] // Empty for new model
            };

            // Validate the plan data before saving
            const validation = this.validateActionPlanForSave(planData, app);
            
            if (!validation.canSave) {
                const errorMessage = `Cannot save action plan: ${validation.errors.join(', ')}`;
                console.error(errorMessage);
                this.showPlanErrorMessage(errorMessage);
                return;
            }
            
            // Show warnings if any, but allow save to continue
            if (validation.warnings.length > 0) {
                console.warn('Action plan validation warnings:', validation.warnings);
            }

            let result;
            if (isEdit) {
                // Update existing plan
                const planId = existingPlan.id || accountId || signalId;
                result = await DataService.updateActionPlan(planId, planData);
            } else {
                // Create new plan
                result = await DataService.createActionPlan(planData);
            }

            if (result && result.success) {
                // Store the action plan in memory with proper key and ensure accountId is preserved
                let message;
                let storageKey;
                
                // Ensure the plan has the correct accountId stored
                if (accountId) {
                    result.plan.accountId = accountId;
                    storageKey = accountId;
                } else if (signalId) {
                    // If no accountId but we have signalId, try to get accountId from signal
                    if (app.selectedSignal && app.selectedSignal.account_id) {
                        result.plan.accountId = app.selectedSignal.account_id;
                        storageKey = app.selectedSignal.account_id;
                    } else {
                        result.plan.signalId = signalId;
                        storageKey = signalId;
                    }
                } else {
                    // Fallback if neither accountId nor signalId is available
                    storageKey = `temp-plan-${Date.now()}`;
                    console.warn('Creating action plan without accountId or signalId, using temp key:', storageKey);
                }
                
                app.actionPlans.set(storageKey, result.plan);
                message = isEdit ? 'Action plan updated successfully!' : 'Action plan created successfully!';
                
                console.log('Stored action plan with key:', storageKey, 'Plan accountId:', result.plan.accountId);

                // Show success message
                if (result.warning) {
                    NotificationService.showWarning(`${message} (${result.warning})`);
                } else {
                    NotificationService.showSuccess(message);
                }

                // Re-render the current tab to show updates
                if (app.currentTab === 'signal-feed') {
                    SignalRenderer.renderSignalFeed(app);
                } else if (app.currentTab === 'actions') {
                    ActionsRenderer.renderActions(app);
                } else if (app.currentTab === 'my-portfolio') {
                    PortfolioRenderer.renderMyPortfolio(app);
                }

                this.closePlanDrawer();

                // Clear form
                document.getElementById('planNotes').value = '';
                document.getElementById('planTitle').value = ''; // Clear plan title
                document.getElementById('actionItems').innerHTML = '';
            } else {
                // Show error near the Create Plan button (matching comments pattern)
                console.error('Failed to create/update action plan:', result ? result.error : 'No response');
                this.showPlanErrorMessage(result ? result.error || 'Failed to save action plan' : 'No response from server');
            }
        } catch (error) {
            console.error('Error creating/updating action plan:', error);
            this.showPlanErrorMessage('Failed to save action plan');
        } finally {
            // Restore button state
            createButton.innerHTML = originalButtonText;
            createButton.disabled = false;
        }
    }

    static async updateActionPlan(planId, updateData, app) {
        try {
            console.log(`🔍 [DEBUG] ActionPlanService.updateActionPlan called with:`, {
                planId,
                planIdType: typeof planId,
                planIdLength: planId ? planId.length : 'null',
                updateData,
                hasApp: !!app,
                actionPlansMapSize: app?.actionPlans?.size || 0
            });
            
            const result = await DataService.updateActionPlan(planId, updateData);

            if (result.success) {
                // Update local state
                console.log(`🔍 [DEBUG] Update successful, looking for plan in local state:`, {
                    planId,
                    actionPlansMapKeys: Array.from(app.actionPlans.keys()),
                    actionPlansMapSize: app.actionPlans.size
                });
                
                let foundPlan = false;
                for (let [key, plan] of app.actionPlans) {
                    console.log(`🔍 [DEBUG] Checking plan:`, {
                        key,
                        planId: plan.id,
                        keyMatchesPlanId: key === planId,
                        planIdMatchesPlanId: plan.id === planId
                    });
                    
                    if (plan.id === planId || key === planId) {
                        console.log(`🔍 [DEBUG] Found matching plan, updating:`, { key, planId: plan.id });
                        app.actionPlans.set(key, result.plan);
                        foundPlan = true;
                        break;
                    }
                }
                
                if (!foundPlan) {
                    console.warn(`🔍 [DEBUG] Plan not found in local state for planId: ${planId}`);
                }

                // Show success message, but also handle warnings (like local-only saves)
                if (result.warning) {
                    NotificationService.showWarning(result.warning);
                } else {
                    NotificationService.showSuccess('Action plan updated successfully!');
                }
                
                return { success: true, plan: result.plan };
            } else {
                NotificationService.showError(result.error || 'Failed to update action plan');
                return { success: false, error: result.error || 'Update failed' };
            }
        } catch (error) {
            console.error('Error updating action plan:', error);
            NotificationService.showError('Failed to update action plan');
            return { success: false, error: error.message || 'Unexpected error occurred' };
        }
    }

    static async deleteActionPlan(planId, app) {
        try {
            const result = await DataService.deleteActionPlan(planId);

            if (result.success) {
                // Update local state
                for (let [key, plan] of app.actionPlans) {
                    if (plan.id === planId || key === planId) {
                        app.actionPlans.delete(key);
                        break;
                    }
                }

                NotificationService.showSuccess('Action plan deleted successfully!');

                // Re-render current tab
                if (app.currentTab === 'actions') {
                    ActionsRenderer.renderActions(app);
                } else if (app.currentTab === 'my-portfolio') {
                    PortfolioRenderer.renderMyPortfolio(app);
                }
            } else {
                NotificationService.showError('Failed to delete action plan');
            }
        } catch (error) {
            console.error('Error deleting action plan:', error);
            NotificationService.showError('Failed to delete action plan');
        }
    }

    static closePlanDrawer() {
        const drawer = document.getElementById('createPlanDrawer');
        const backdrop = document.getElementById('createPlanDrawerBackdrop');

        if (drawer) {
            drawer.classList.remove('open');
        }

        // Delay backdrop removal to allow drawer animation to complete
        setTimeout(() => {
            if (backdrop) {
                backdrop.classList.remove('open');
            }
        }, 300);

        // Clear any error messages when closing
        this.clearPlanErrorMessage();
    }

    static showPlanErrorMessage(message) {
        // Clear any existing error message first
        this.clearPlanErrorMessage();
        
        // Find the create button container
        const createButton = document.querySelector('.create-plan-btn');
        if (createButton && createButton.parentElement) {
            const errorDiv = document.createElement('div');
            errorDiv.className = 'plan-error-message';
            errorDiv.innerHTML = `
                <div style="
                    background: #fee2e2; 
                    border: 1px solid #fecaca; 
                    color: #dc2626; 
                    padding: 8px 12px; 
                    border-radius: 4px; 
                    margin-top: 8px; 
                    font-size: 14px;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                ">
                    <i class="fas fa-exclamation-triangle"></i>
                    <span>${message}</span>
                </div>
            `;
            
            // Insert after the button container
            createButton.parentElement.insertAdjacentElement('afterend', errorDiv);
        }
    }

    static clearPlanErrorMessage() {
        const existingError = document.querySelector('.plan-error-message');
        if (existingError) {
            existingError.remove();
        }
    }

    // === DATA VALIDATION METHODS ===
    
    /**
     * Validate all loaded action plans for proper account associations
     */
    static validateActionPlanAssociations(app) {
        if (!app.actionPlans || app.actionPlans.size === 0) {
            console.log('No action plans to validate');
            return { valid: 0, invalid: 0, fixed: 0 };
        }

        let validPlans = 0;
        let invalidPlans = 0;
        let fixedPlans = 0;

        console.log('=== Action Plan Association Validation ===');

        for (let [key, plan] of app.actionPlans) {
            const validation = this.validateSingleActionPlan(plan, app);
            
            if (validation.isValid) {
                validPlans++;
            } else {
                invalidPlans++;
                console.warn(`Invalid plan found: ${plan.id || key}`, validation.issues);
                
                // Attempt to fix the plan
                const fixAttempt = this.attemptToFixActionPlan(plan, app);
                if (fixAttempt.fixed) {
                    fixedPlans++;
                    console.log(`Successfully fixed plan: ${plan.id || key}`);
                }
            }
        }

        const results = { valid: validPlans, invalid: invalidPlans, fixed: fixedPlans };
        console.log('Validation Results:', results);
        return results;
    }

    /**
     * Validate a single action plan
     */
    static validateSingleActionPlan(plan, app) {
        const issues = [];
        let isValid = true;

        // Check for required fields
        if (!plan.id) {
            issues.push('Missing plan ID');
            isValid = false;
        }

        // Check account association
        if (!plan.accountId) {
            issues.push('Missing accountId');
            isValid = false;
        } else {
            // Verify account exists in system
            if (app.accounts && !app.accounts.has(plan.accountId)) {
                issues.push(`Account ${plan.accountId} not found in system`);
                isValid = false;
            }
        }

        // Check signal association if present
        if (plan.signalId) {
            if (app.data) {
                const signalExists = app.data.some(signal => 
                    signal.id === plan.signalId || signal.signal_id === plan.signalId
                );
                if (!signalExists) {
                    issues.push(`Signal ${plan.signalId} not found in system`);
                    isValid = false;
                }
            }
        }

        // Check action items
        if (!plan.actionItems || !Array.isArray(plan.actionItems)) {
            issues.push('Missing or invalid actionItems array');
            isValid = false;
        }

        return { isValid, issues };
    }

    /**
     * Attempt to automatically fix a broken action plan
     */
    static attemptToFixActionPlan(plan, app) {
        let fixed = false;
        const fixes = [];

        // Try to fix missing accountId using signalId
        if (!plan.accountId && plan.signalId && app.data) {
            const signalData = app.data.find(signal => 
                signal.id === plan.signalId || signal.signal_id === plan.signalId
            );
            
            if (signalData && signalData.account_id) {
                plan.accountId = signalData.account_id;
                fixes.push(`Set accountId from signal: ${signalData.account_id}`);
                fixed = true;
            }
        }

        // Try to fix missing signalId if we have plan title with account context
        if (!plan.signalId && plan.planTitle && app.data) {
            // Look for signals from the same account that match plan context
            if (plan.accountId) {
                const accountSignals = app.data.filter(signal => signal.account_id === plan.accountId);
                if (accountSignals.length === 1) {
                    plan.signalId = accountSignals[0].id;
                    fixes.push(`Set signalId from account context: ${accountSignals[0].id}`);
                    fixed = true;
                }
            }
        }

        if (fixed) {
            console.log(`Applied fixes to plan ${plan.id}:`, fixes);
        }

        return { fixed, fixes };
    }

    /**
     * Validate action plan before creation/update
     */
    static validateActionPlanForSave(planData, app) {
        const errors = [];
        const warnings = [];

        // Critical validations - these will prevent save
        if (!planData.accountId && !planData.signalId) {
            errors.push('Action plan must have either an accountId or signalId');
        }

        if (!planData.actionItems || planData.actionItems.length === 0) {
            errors.push('Action plan must have at least one action item');
        }

        // Warning validations - these allow save but show warnings
        if (!planData.accountId) {
            warnings.push('Action plan missing accountId - may not display in account groupings');
        }

        if (planData.accountId && app.accounts && !app.accounts.has(planData.accountId)) {
            warnings.push(`Account ${planData.accountId} not found in system - plan may not display correctly`);
        }

        if (!planData.notes || planData.notes.trim().length === 0) {
            warnings.push('Consider adding notes to provide context for this action plan');
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings,
            canSave: errors.length === 0
        };
    }

    static createActionPlanForAccount(accountId, app) {
        const account = app.accounts.get(accountId);
        if (account && account.signals.length > 0) {
            // Use the first signal of the account to open the account-centric view
            // If editing, we might need to check if an action plan already exists for this account
            // For now, we'll assume creating a new one or opening the first signal's plan.
            // If an action plan already exists, this should ideally open the edit view.
            const existingPlanForAccount = Array.from(app.actionPlans.values()).find(plan => plan.accountId === accountId);
            if (existingPlanForAccount) {
                 // Find the signal associated with this existing plan
                 const associatedSignal = account.signals.find(signal => signal.id === existingPlanForAccount.signalId);
                 if (associatedSignal) {
                    this.openCreatePlanDrawer(associatedSignal.id, app);
                 } else {
                    // Fallback if signal not found but plan exists
                    this.openCreatePlanDrawer(account.signals[0].id, app);
                 }
            } else {
                // No existing plan for this account, create a new one using the first signal
                this.openCreatePlanDrawer(account.signals[0].id, app);
            }
        } else {
            // No signals for the account, open a general plan
            this.openCreatePlanDrawer(null, app);
        }
    }

    static setupEventDelegation() {
        const body = document.body;

        body.addEventListener('click', (e) => {
            if (e.target.matches('[data-action="take-action"]')) {
                const signalId = e.target.getAttribute('data-signal-id');
                // Check if there's an existing plan for this signal or account
                const existingPlan = window.app.actionPlans.get(signalId);
                if (existingPlan) {
                    // If editing, we should open the drawer in edit mode
                    this.openCreatePlanDrawer(signalId, window.app);
                } else {
                    // If creating, open the drawer normally
                    this.openCreatePlanDrawer(signalId, window.app);
                }
            }
        });

        // Update create plan button text based on edit mode
        document.addEventListener('DOMContentLoaded', () => {
            const createPlanButton = document.getElementById('createPlan');
            if (createPlanButton) {
                // This logic should be tied to the drawer's open state and whether it's editing
                // For now, a placeholder, as the actual state management is complex.
                // A better approach would be to pass isEditMode to this setup function or check it contextually.
            }
        });
    }

    static mapPriorityToStatus(priority) {
        const priorityMap = {
            'High': 'high',
            'Medium': 'medium', 
            'Low': 'low'
        };
        return priorityMap[priority] || 'medium';
    }

    static truncateText(text, maxLength) {
        if (!text || text.length <= maxLength) return text;
        return text.substring(0, maxLength).trim() + '...';
    }

    static generateGUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    static generateToolboxPlaysForAccount(account) {
        const playMap = new Map(); // Use Map to track unique plays

        // Extract all unique plays from account signals using new field names
        console.log(`Extracting plays for account ${account.name} from ${account.signals.length} signals`);

        account.signals.forEach((signal, index) => {
            console.log(`Signal ${index + 1} plays: play_1_name="${signal.play_1_name}", play_2_name="${signal.play_2_name}", play_3_name="${signal.play_3_name}"`);

            const signalPriority = this.mapPriorityToStatus(signal.priority);

            // Check for Play 1 using correct field names
            if (signal.play_1_name && signal.play_1_name.trim() && 
                signal.play_1_name !== 'N/A' && signal.play_1_name !== '') {
                const title = signal.play_1_name.trim();
                if (!playMap.has(title)) {
                    playMap.set(title, {
                        title: title,
                        description: signal.play_1_description || signal.play_1 || 'No description available',
                        priority: signalPriority
                    });
                    console.log(`Added unique play 1: "${title}"`);
                }
            } else if (signal.play_1 && signal.play_1.trim() && 
                       signal.play_1 !== 'N/A' && signal.play_1 !== '') {
                const title = signal.play_1.trim();
                if (!playMap.has(title)) {
                    playMap.set(title, {
                        title: title,
                        description: 'No description available',
                        priority: signalPriority
                    });
                    console.log(`Added unique play 1 (fallback): "${title}"`);
                }
            }

            // Check for Play 2 using correct field names
            if (signal.play_2_name && signal.play_2_name.trim() && 
                signal.play_2_name !== 'N/A' && signal.play_2_name !== '') {
                const title = signal.play_2_name.trim();
                if (!playMap.has(title)) {
                    playMap.set(title, {
                        title: title,
                        description: signal.play_2_description || signal.play_2 || 'No description available',
                        priority: signalPriority
                    });
                }
            } else if (signal.play_2 && signal.play_2.trim() && 
                       signal.play_2 !== 'N/A' && signal.play_2 !== '') {
                const title = signal.play_2.trim();
                if (!playMap.has(title)) {
                    playMap.set(title, {
                        title: title,
                        description: 'No description available',
                        priority: signalPriority
                    });
                }
            }

            // Check for Play 3 using correct field names
            if (signal.play_3_name && signal.play_3_name.trim() && 
                signal.play_3_name !== 'N/A' && signal.play_3_name !== '') {
                const title = signal.play_3_name.trim();
                if (!playMap.has(title)) {
                    playMap.set(title, {
                        title: title,
                        description: signal.play_3_description || signal.play_3 || 'No description available',
                        priority: signalPriority
                    });
                }
            } else if (signal.play_3 && signal.play_3.trim() && 
                       signal.play_3 !== 'N/A' && signal.play_3 !== '') {
                const title = signal.play_3.trim();
                if (!playMap.has(title)) {
                    playMap.set(title, {
                        title: title,
                        description: 'No description available',
                        priority: signalPriority
                    });
                }
            }
        });

        // Convert Map to array and filter out empty plays
        const uniquePlays = Array.from(playMap.values()).filter(play => 
            play.title && play.title.trim() && 
            !play.title.toLowerCase().includes('no play') &&
            play.title.trim() !== ''
        );

        // If no plays found, return general fallback plays
        if (uniquePlays.length === 0) {
            return this.generateGeneralToolboxPlays();
        }

        return uniquePlays.map(play => `
            <div class="toolbox-play">
                <div class="play-header">
                    <span class="play-title">${play.title}</span>
                    <span class="play-badge ${play.priority}">${play.priority.toUpperCase()}</span>
                </div>
                <div class="play-description">${play.description}</div>
                <button class="btn btn-primary add-action-btn" data-title="${play.title}" data-onclick="addToolboxPlay">+ Add Play</button>
            </div>
        `).join('');
    }
}