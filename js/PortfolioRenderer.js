// Portfolio Renderer - Handle portfolio tab rendering
class PortfolioRenderer {

    static renderMyPortfolio(app) {
        const container = document.getElementById('accountsList');
        if (!container) return;

        const sortedAccounts = Array.from(app.accounts.values()).sort((a, b) => {
            return a.name.localeCompare(b.name);
        });

        // Update dashboard card values
        this.updateDashboardCards(app);

        container.innerHTML = sortedAccounts.map(account => this.renderAccountCard(account, app)).join('');
    }

    static updateDashboardCards(app) {
        const allSignals = Array.from(app.accounts.values()).flatMap(account => account.signals);
        const highPrioritySignals = allSignals.filter(s => s.priority === 'High');
        const accountsWithSignals = Array.from(app.accounts.values()).filter(account => account.signals.length > 0);

        // Update Requires Attention count (high priority signals without acknowledged status)
        const requiresAttentionCount = highPrioritySignals.filter(s => !s.acknowledged).length;
        const requiresAttentionElement = document.getElementById('requiresAttentionCount');
        if (requiresAttentionElement) {
            requiresAttentionElement.textContent = requiresAttentionCount;
        }

        // Update High Priority count
        const highPriorityElement = document.getElementById('highPriorityDashboard');
        if (highPriorityElement) {
            highPriorityElement.textContent = highPrioritySignals.length;
        }

        // Update Active Accounts count
        const activeAccountsElement = document.getElementById('activeAccountsCount');
        if (activeAccountsElement) {
            activeAccountsElement.textContent = accountsWithSignals.length;
        }
    }

    static updateSingleAccount(accountId, app) {
        // Find the account
        const account = app.accounts.get(accountId);
        if (!account) return;

        // Find the existing account card in the DOM
        const container = document.getElementById('accountsList');
        if (!container) return;

        // Generate the updated account card HTML
        const updatedAccountHTML = this.renderAccountCard(account, app);

        // Create a temporary container to parse the HTML
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = updatedAccountHTML;
        const newAccountCard = tempDiv.firstElementChild;

        // Find the existing account card and replace it
        const existingCards = container.querySelectorAll('.portfolio-account-card');
        for (let existingCard of existingCards) {
            const accountName = existingCard.querySelector('.account-name');
            if (accountName && accountName.textContent === account.name) {
                // Preserve the expanded state
                const signalsContainer = existingCard.querySelector(`#signals-${accountId}`);
                const wasExpanded = signalsContainer && signalsContainer.classList.contains('expanded');
                
                // Replace the card
                existingCard.parentNode.replaceChild(newAccountCard, existingCard);
                
                // Restore expanded state if it was expanded
                if (wasExpanded) {
                    const newSignalsContainer = newAccountCard.querySelector(`#signals-${accountId}`);
                    const newChevron = newAccountCard.querySelector(`#chevron-${accountId}`);
                    if (newSignalsContainer && newChevron) {
                        newSignalsContainer.classList.add('expanded');
                        newChevron.classList.add('rotated');
                    }
                }
                break;
            }
        }
    }

    static renderAccountCard(account, app) {
        const highPriorityCount = account.signals.filter(s => s.priority === 'High').length;
        const totalSignals = account.signals.length;

        // Sort signals by Priority (High > Medium > Low), then by call_date DESC within each priority
        const sortedSignals = account.signals.sort((a, b) => {
            // Define priority order
            const priorityOrder = { 'High': 3, 'Medium': 2, 'Low': 1 };
            
            // First sort by priority
            const priorityA = priorityOrder[a.priority] || 0;
            const priorityB = priorityOrder[b.priority] || 0;
            
            if (priorityA !== priorityB) {
                return priorityB - priorityA; // Higher priority first
            }
            
            // If same priority, sort by call_date DESC (fallback to created_date)
            const dateA = new Date(a.call_date || a.created_date);
            const dateB = new Date(b.call_date || b.created_date);
            return dateB - dateA;
        });
        
        // Initialize pagination state if not exists
        if (!account.signalsPagination) {
            account.signalsPagination = { currentPage: 0, pageSize: 3 };
        }
        
        const pageSize = account.signalsPagination.pageSize;
        const currentPage = account.signalsPagination.currentPage;
        const startIndex = 0;
        const endIndex = (currentPage + 1) * pageSize;
        const visibleSignals = sortedSignals.slice(startIndex, endIndex);
        const hasMoreSignals = endIndex < account.signals.length;

        // Ensure account has required properties
        account.health = account.health || this.getHealthFromRiskCategory(account.at_risk_cat);
        account.industry = account.industry || 'Technology';
        account.aiRecommendation = account.aiRecommendation || this.generateAIRecommendationForAccount(account);
        console.log('airecco: ', account.aiRecommendation);

        return `
            <div class="portfolio-account-card">
                <div class="account-header-row" onclick="event.target.closest('.create-plan-btn') ? null : window.app.toggleAccountSignals('${account.id}')">
                    <div class="account-title-section">
                        <i class="fas fa-chevron-right account-chevron" id="chevron-${account.id}"></i>
                        <div class="account-warning-icon">
                            <i class="fas fa-exclamation-triangle ${account.health === 'critical' ? 'critical-warning' : account.health === 'warning' ? 'warning-warning' : 'healthy-warning'}"></i>
                        </div>
                        <div class="account-name-info">
                            <h3 class="account-name">${account.name}</h3>
                            <div class="account-stats">${totalSignals} signals • ${highPriorityCount} high priority</div>
                        </div>
                    </div>
                    <div class="account-actions-section">
                        ${account.health === 'critical' ? '<span class="critical-badge">critical</span>' : ''}
                        <button class="btn btn-secondary view-details-btn" onclick="event.stopPropagation(); window.app.toggleAccountSignals('${account.id}')">
                            View Details
                        </button>
                    </div>
                </div>

                <div class="account-details" id="signals-${account.id}">
                    <div class="account-metrics">
                        <!-- Financial Metrics Box -->
                        <div class="financial-metrics-box">
                            <div class="financial-header">
                                <i class="fas fa-dollar-sign"></i>
                                <span>Account Overview</span>
                            </div>
                            <div class="financial-content">
                                <div class="financial-metric">
                                    <span class="financial-label">Renewal Baseline$</span>
                                    <span class="financial-value">${account.bks_renewal_baseline_usd > 0 ? app.formatCurrency(account.bks_renewal_baseline_usd) : '$0'}</span>
                                </div>
                                <div class="financial-metric">
                                    <span class="financial-label">GPA</span>
                                    <span class="financial-value">${account.gpa ? account.gpa.toFixed(1) : '0.0'}</span>
                                </div>
                                <div class="financial-metric">
                                    <span class="financial-label">% Pacing</span>
                                    <span class="financial-value">${account.pacing_percent ? (account.pacing_percent * 100).toFixed(1) : '0.0'}%</span>
                                </div>
                                <div class="financial-metric">
                                    <span class="financial-label">Next Renewal Date</span>
                                    <span class="financial-value">${account.next_renewal_date || 'TBD'}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="signals-section">
                        <div class="signals-header">
                            <div class="signals-header-left">
                                <i class="fas fa-bell signals-icon"></i>
                                <h4 class="signals-title">Recent Signals (${totalSignals})</h4>
                            </div>
                        </div>

                        <div class="signals-list-portfolio" id="signals-list-${account.id}">
                            ${visibleSignals.map(signal => `
                                <div class="portfolio-signal-row">
                                    <div class="signal-priority-badge">
                                        <span class="priority-tag priority-${signal.priority.toLowerCase()}">${signal.priority}</span>
                                    </div>
                                    <div class="signal-name-content">
                                        <span class="signal-name-text">${signal.name}</span>
                                    </div>
                                    <div class="signal-meta-actions">
                                        <span class="signal-date-text">${app.formatDateSimple(signal.call_date || signal.created_date)}</span>
                                        <a href="#" class="view-link" onclick="event.stopPropagation(); window.app.openSignalDetails('${signal.id}')">View</a>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                        
                        <div class="signals-pagination">
                            ${hasMoreSignals ? `<button class="btn btn-secondary show-more-btn" onclick="event.stopPropagation(); window.app.showMoreSignalsForAccount('${account.id}')">Show 3 more</button>` : ''}
                            ${currentPage > 0 ? `<button class="btn btn-outline show-less-btn" onclick="event.stopPropagation(); window.app.showLessSignalsForAccount('${account.id}')">Show Less</button>` : ''}
                        </div>
                    </div>

                    <div class="ai-recommendations-section">
                        <div class="ai-header">
                            <i class="fas fa-lightbulb ai-icon"></i>
                            <h4 class="ai-title">AI Recommendations</h4>
                        </div>

                        <div class="recommendation-priority">
                            <span class="${account.aiRecommendation.priority}-badge">${account.aiRecommendation.priority.toUpperCase()}</span>
                        </div>

                        <div class="recommendations-merged">
                            ${this.getMergedRecommendationsAndRationale(account)}
                        </div>
                    </div>

                    ${CommentService.renderAccountCommentsSection(account.id, app)}

                    <div class="action-plan-section">
                        <div class="action-plan-header">
                            <i class="fas fa-cogs action-plan-icon"></i>
                            <h4 class="action-plan-title">Action Plan & CS Toolbox</h4>
                        </div>

                        <div class="action-plan-content">
                            ${this.hasExistingPlan(account.id, app) ? `
                                <p class="action-plan-description">Edit existing action plan</p>
                                <div class="action-plan-buttons">
                                    <button class="btn btn-secondary" onclick="window.app.viewAccountActionPlan('${account.id}')">
                                        <i class="fas fa-eye"></i> View Plan
                                    </button>
                                    <button class="btn btn-primary" onclick="window.app.editActionPlan('${account.id}')">
                                        <i class="fas fa-edit"></i> Edit Plan
                                    </button>
                                </div>
                            ` : `
                                <p class="action-plan-description">Create plan with AI recommendations & CS plays</p>
                                <button class="btn btn-primary create-plan-btn" onclick="event.stopPropagation(); window.app.createActionPlanForAccount('${account.id}')">
                                    <i class="fas fa-plus"></i> Create Plan
                                </button>
                            `}
                        </div>
                    </div>
                </div>
            </div>
        `;
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

    static generateAIRecommendationForAccount(account) {
        const highPrioritySignals = account.signals.filter(s => s.priority === 'High');
        const allSignals = account.signals;

        // Extract unique recommendations from signals, prioritizing recommended_action field
        const actionMap = new Map(); // Map to track unique recommended_action with their action_ids

        allSignals.forEach(signal => {
            // First priority: Use recommended_action field
            if (signal.recommended_action && signal.recommended_action.trim() && signal.recommended_action !== 'No actions specified') {
                const action = signal.recommended_action.trim();
                const actionId = signal.action_id;
                
                console.log('Using recommended_action for signal:', signal.name, action, 'action_id:', actionId);
                
                // Store unique actions with their action_ids
                if (!actionMap.has(action)) {
                    actionMap.set(action, new Set());
                }
                if (actionId) {
                    actionMap.get(action).add(actionId);
                }
                return; // Skip to next signal since we found recommended_action
            }
            
            // Second priority: Use account_action_context or action_context
            const actionContext = signal.account_action_context || signal.action_context;
            console.log('OUTER Processing action context for signal:', actionContext);
            if (actionContext && actionContext.trim() && actionContext !== 'No actions specified') {
                console.log('Processing action context for signal:', signal.name, actionContext);

                // Enhanced parsing for numbered lists, bullet points, and sentences
                let actions = [];

                // Split by numbered items (1. 2. 3. etc.) - improved regex
                if (actionContext.match(/\d+\.\s+/)) {
                    // Use a more robust regex to capture numbered items
                    const matches = actionContext.match(/\d+\.\s*([^.]*(?:\.[^0-9][^.]*)*)/g);
                    if (matches) {
                        actions = matches.map(match => {
                            // Remove the number and period at the start
                            return match.replace(/^\d+\.\s*/, '').trim();
                        }).filter(action => action.length > 10);
                    }

                    // If that didn't work, try splitting differently
                    if (actions.length === 0) {
                        actions = actionContext.split(/\d+\.\s+/)
                            .filter(part => part.trim().length > 10)
                            .map(part => part.trim());
                    }
                }
                // Split by bullet points (• - * etc.)
                else if (actionContext.match(/[•\-\*]\s+/)) {
                    actions = actionContext.split(/(?=[•\-\*]\s+)/)
                        .map(action => action.replace(/^[•\-\*]\s*/, '').trim())
                        .filter(action => action.length > 10);
                }
                // Split by periods or semicolons for sentence-based actions
                else {
                    actions = actionContext.split(/[.;]\s*/)
                        .map(action => action.trim())
                        .filter(action => action.length > 10 && !action.match(/^\d+$/));
                }

                console.log('Parsed actions:', actions);
                // Add these actions to the map without action_ids
                actions.forEach(action => {
                    if (!actionMap.has(action)) {
                        actionMap.set(action, new Set());
                    }
                });
            }
        });

        // Convert map to array of unique actions, keeping only top 3
        const uniqueActions = Array.from(actionMap.keys())
            .filter(action => action.length > 10) // Ensure substantial actions
            .slice(0, 3); // Take top 3 actions

        console.log('Final unique actions for account:', account.name, uniqueActions);
        console.log('Action IDs mapping:', Array.from(actionMap.entries()));

        // If we have specific actions from context, use them
        if (uniqueActions.length > 0) {
            return {
                priority: highPrioritySignals.length > 0 ? 'immediate' : 'near-term',
                actions: uniqueActions
            };
        }

        // Fallback to default recommendations based on priority and signal category
        if (highPrioritySignals.length > 0) {
            // Generate more specific recommendations based on signal categories
            const categories = [...new Set(highPrioritySignals.map(s => s.category))];
            const categoryActions = {
                'Use Case': [
                    'Conduct business value assessment',
                    'Review use case implementation',
                    'Schedule stakeholder alignment call'
                ],
                'Architecture': [
                    'Review technical architecture',
                    'Optimize data connectors',
                    'Conduct performance analysis'
                ],
                'Relationship': [
                    'Map stakeholder engagement',
                    'Schedule executive check-in',
                    'Strengthen relationship touchpoints'
                ],
                'Enablement': [
                    'Provide governance training',
                    'Implement best practices',
                    'Create enablement roadmap'
                ]
            };

            const actions = categories.length > 0 && categoryActions[categories[0]]
                ? categoryActions[categories[0]]
                : [
                    'Schedule executive alignment call',
                    'Review technical implementation',
                    'Develop adoption roadmap'
                ];

            return {
                priority: 'immediate',
                actions: actions
            };
        } else {
            return {
                priority: 'near-term',
                actions: [
                    'Regular health check',
                    'Share best practices',
                    'Monitor usage metrics'
                ]
            };
        }
    }

    static getAccountActionContextRationale(account) {
        const allSignals = account.signals;

        // First priority: Collect all unique signal_rationale fields
        const uniqueSignalRationales = new Set();
        allSignals.forEach(signal => {
            if (signal.signal_rationale &&
                signal.signal_rationale.trim() &&
                signal.signal_rationale !== 'No rationale specified') {
                uniqueSignalRationales.add(signal.signal_rationale.trim());
            }
        });

        if (uniqueSignalRationales.size > 0) {
            const rationaleArray = Array.from(uniqueSignalRationales);
            
            // If multiple rationales, format as bullet points
            if (rationaleArray.length > 1) {
                return rationaleArray.map(rationale => `• ${rationale}`).join('<br>');
            } else {
                // Single rationale, format normally
                return this.formatRationaleText(rationaleArray[0]);
            }
        }

        // Second priority: Look for account_action_context_rationale in signals
        for (const signal of allSignals) {
            if (signal.account_action_context_rationale &&
                signal.account_action_context_rationale.trim() &&
                signal.account_action_context_rationale !== 'No rationale specified') {
                return this.formatRationaleText(signal.account_action_context_rationale);
            }
        }

        // Third priority: Check for signal rationale as a backup
        for (const signal of allSignals) {
            if (signal.rationale &&
                signal.rationale.trim() &&
                signal.rationale !== 'No rationale provided' &&
                signal.rationale.length > 50) {
                return this.formatRationaleText(signal.rationale);
            }
        }

        // Fallback to generated rationale if no specific rationale found
        return this.generateAccountSpecificRationale(account);
    }

    static formatRationaleText(text) {
        // Check if text contains comma-separated items that would benefit from bullet formatting
        if (text.includes(',') && text.length > 200) {
            // Split on periods to identify sentences
            const sentences = text.split(/\.\s+/).map(s => s.trim()).filter(s => s.length > 0);

            // If we have multiple sentences, format as bullet points
            if (sentences.length > 2) {
                const formattedSentences = sentences.map(sentence => {
                    // Add period back if not already there
                    const finalSentence = sentence.endsWith('.') ? sentence : sentence + '.';
                    return `• ${finalSentence}`;
                }).join('<br>');

                return formattedSentences;
            }
        }

        // For shorter text or single sentences, return as-is
        return text;
    }

    static getMergedRecommendationsAndRationale(account) {
        const actionDataMap = new Map();
        
        console.log(`Processing recommendations for account ${account.name} with ${account.signals.length} signals`);
        
        // Create map of recommended_action to data object with rationale, date, and action_id
        account.signals.forEach((signal, index) => {
            console.log(`Signal ${index + 1}: recommended_action="${signal.recommended_action}", action_id="${signal.action_id}"`);
            
            if (signal.recommended_action && 
                signal.recommended_action.trim() && 
                signal.recommended_action !== 'No actions specified' &&
                signal.signal_rationale &&
                signal.signal_rationale.trim() &&
                signal.signal_rationale !== 'No rationale specified') {
                
                const action = signal.recommended_action.trim();
                const rationale = signal.signal_rationale.trim();
                const date = signal.created_date || signal.call_date;
                const actionId = signal.action_id;
                
                if (!actionDataMap.has(action)) {
                    actionDataMap.set(action, {
                        rationale: rationale,
                        date: date,
                        actionId: actionId,
                        accountId: account.id
                    });
                    console.log(`Added unique action: "${action}" with rationale and date: ${date}`);
                }
            }
        });
        
        // If we have action-rationale pairs, display them
        if (actionDataMap.size > 0) {
            return Array.from(actionDataMap.entries()).slice(0, 3).map(([action, data]) => `
                <div class="merged-recommendation-item">
                    <div class="recommendation-action">
                        <div class="action-content">
                            • ${action}
                            <span class="recommendation-date">${window.app ? window.app.formatDateSimple(data.date) : data.date}</span>
                        </div>
                        <div class="action-buttons">
                            ${this.renderAddToPlanButton(data.actionId, action, data)}
                        </div>
                    </div>
                    <div class="recommendation-rationale">${data.rationale}</div>
                </div>
            `).join('');
        }
        
        // Fallback to separate sections if no paired data
        const uniqueActions = this.getUniqueRecommendedActions(account);
        const generalRationale = this.getAccountActionContextRationale(account);
        
        return `
            <div class="merged-recommendation-item">
                <div class="recommendation-actions-list">
                    ${uniqueActions.slice(0, 3).map(action => `
                        <div class="recommendation-action">• ${action}</div>
                    `).join('')}
                </div>
                <div class="recommendation-rationale">${generalRationale}</div>
            </div>
        `;
    }

    static getUniqueRecommendedActions(account) {
        const uniqueActions = new Set();
        
        // Extract recommended_action from all signals for this account
        account.signals.forEach(signal => {
            if (signal.recommended_action && 
                signal.recommended_action.trim() && 
                signal.recommended_action !== 'No actions specified') {
                uniqueActions.add(signal.recommended_action.trim());
            }
        });
        
        // Convert Set to Array
        const actionsArray = Array.from(uniqueActions);
        
        // If we have specific recommended actions, use them
        if (actionsArray.length > 0) {
            return actionsArray;
        }
        
        // Fall back to the existing aiRecommendation.actions if no recommended_action found
        return account.aiRecommendation?.actions || [
            'Schedule executive alignment call',
            'Review technical implementation',
            'Develop adoption roadmap'
        ];
    }

    static renderAddToPlanButton(actionId, actionTitle, data) {
        // Check if this action_id already exists in any plan
        if (this.isActionInPlan(actionId)) {
            return `<button class="btn-added-pill" disabled>Added!</button>`;
        }
        
        // Return clickable Add to Plan button
        return `<button class="btn-add-to-plan" onclick="PortfolioRenderer.openAddToPlanModal('${actionId}', '${actionTitle.replace(/'/g, "&#39;")}')">Add to Plan</button>`;
    }

    static isActionInPlan(actionId) {
        if (!actionId || !window.app?.dataService?.actionPlans) return false;
        
        // Check all existing plans for this actionId
        return window.app.dataService.actionPlans.some(plan => 
            plan.actionItems && plan.actionItems.some(item => item.actionId === actionId)
        );
    }

    static openAddToPlanModal(actionId, actionTitle) {
        // Store current action data
        window.currentAddToPlanData = {
            actionId: actionId,
            actionTitle: actionTitle
        };
        
        // Show the modal
        document.getElementById('addToPlanModal').classList.add('modal-open');
        document.getElementById('modalActionTitle').textContent = actionTitle;
        
        // Clear previous notes
        document.getElementById('planNotes').value = '';
        
        // Load CS plays specific to this action_id
        this.loadCSPlays(actionId);
    }

    static closeAddToPlanModal() {
        document.getElementById('addToPlanModal').classList.remove('modal-open');
        window.currentAddToPlanData = null;
    }

    static loadCSPlays(actionId) {
        // Find the signal with this action_id to get its specific plays
        let csPlays = [];
        
        if (actionId && window.app && window.app.dataService && window.app.dataService.signals) {
            const signal = window.app.dataService.signals.find(s => s.action_id === actionId);
            
            if (signal) {
                // Extract plays from play_1, play_2, play_3 fields
                const play1 = signal.play_1?.trim();
                const play2 = signal.play_2?.trim();
                const play3 = signal.play_3?.trim();
                
                if (play1) csPlays.push(play1);
                if (play2) csPlays.push(play2);
                if (play3) csPlays.push(play3);
            }
        }
        
        // Fallback to default plays if none found
        if (csPlays.length === 0) {
            csPlays = [
                'Executive Alignment',
                'Technical Enablement', 
                'Adoption Training',
                'Success Metrics Review',
                'Escalation Management',
                'Product Roadmap Discussion'
            ];
        }
        
        const playsContainer = document.getElementById('csPlaysContainer');
        if (!playsContainer) {
            console.error('csPlaysContainer element not found!');
            return;
        }
        
        const playCheckboxes = csPlays.map(play => `
            <label class="play-checkbox">
                <input type="checkbox" value="${play}" checked>
                <span>${play}</span>
            </label>
        `).join('');
        
        playsContainer.innerHTML = playCheckboxes;
    }

    static async createPlanFromModal() {
        if (!window.currentAddToPlanData) return;
        
        const actionId = window.currentAddToPlanData.actionId;
        const actionTitle = window.currentAddToPlanData.actionTitle;
        const planNotes = document.getElementById('planNotes').value;
        
        // Get selected plays
        const selectedPlays = Array.from(document.querySelectorAll('#csPlaysContainer input[type="checkbox"]:checked'))
            .map(checkbox => checkbox.value);
        
        // Create the plan
        const planData = {
            planTitle: `Action Plan - ${actionTitle}`,
            notes: planNotes,
            actionItems: [{
                title: actionTitle,
                actionId: actionId,
                completed: false,
                plays: selectedPlays
            }]
        };
        
        try {
            const result = await window.app.dataService.createActionPlan(planData);
            if (result.success) {
                console.log('Plan created successfully:', result.plan);
                
                // Close modal
                this.closeAddToPlanModal();
                
                // Refresh the portfolio view to show updated button state
                if (window.app && window.app.renderCurrentTab) {
                    window.app.renderCurrentTab();
                }
                
                // Show success notification
                if (window.app.notificationService) {
                    window.app.notificationService.showNotification('Action plan created successfully!', 'success');
                }
            } else {
                console.error('Failed to create plan:', result.error);
                alert('Failed to create action plan. Please try again.');
            }
        } catch (error) {
            console.error('Error creating plan:', error);
            alert('Error creating action plan. Please try again.');
        }
    }

    static formatTenure(years) {
        if (years < 1) {
            const months = Math.round(years * 12);
            return `${months}m`;
        } else {
            return `${years.toFixed(1)}y`;
        }
    }

    static formatCurrencyDetailed(amount) {
        if (amount >= 1000000) {
            return `$${(amount / 1000000).toFixed(1)}M`;
        } else if (amount >= 1000) {
            return `$${(amount / 1000).toFixed(1)}K`;
        } else {
            return `$${amount.toFixed(0)}`;
        }
    }

    static formatForecastWithDelta(delta) {
        const deltaFormatted = this.formatCurrencyDetailed(Math.abs(delta));
        const sign = delta >= 0 ? '+' : '-';
        const color = delta >= 0 ? 'positive' : 'negative';
        
        return `<span class="delta ${color}">${sign}${deltaFormatted}</span>`;
    }

    static hasExistingPlan(accountId, app) {
        // Check Map-based plans first
        if (app.actionPlans && app.actionPlans.has && app.actionPlans.has(accountId)) {
            return true;
        }
        
        // Check Array-based plans
        if (Array.isArray(app.actionPlans)) {
            return app.actionPlans.some(plan => plan.accountId === accountId);
        }
        
        // Check DataService plans by account if available
        if (window.DataService && window.DataService.actionPlansByAccount) {
            const accountPlans = window.DataService.actionPlansByAccount.get(accountId);
            return accountPlans && accountPlans.length > 0;
        }
        
        // Check if any action plan exists for signals belonging to this account
        const account = app.accounts.get(accountId);
        if (account && account.signals) {
            return account.signals.some(signal => {
                if (app.actionPlans && app.actionPlans.has) {
                    return app.actionPlans.has(signal.id);
                }
                if (Array.isArray(app.actionPlans)) {
                    return app.actionPlans.some(plan => plan.signalId === signal.id);
                }
                return false;
            });
        }
        
        return false;
    }

    static generateAccountSpecificRationale(account) {
        const highPrioritySignals = account.signals.filter(s => s.priority === 'High');
        const totalSignals = account.signals.length;
        const industry = account.industry || 'Industry';
        const health = account.health;

        if (highPrioritySignals.length > 1) {
            return `${account.name} has ${highPrioritySignals.length} high-priority signals indicating potential risks to renewal. As a ${industry.toLowerCase()} company with ${health} health status, immediate executive alignment is critical to address implementation gaps and ensure platform adoption success. Quick action now will prevent escalation and maintain the strategic partnership.`;
        } else if (highPrioritySignals.length === 1) {
            const signal = highPrioritySignals[0];
            const signalType = signal.category.toLowerCase();

            if (signalType.includes('relationship')) {
                return `The relationship signal for ${account.name} suggests stakeholder gaps that could impact renewal decisions. In the ${industry.toLowerCase()} sector, maintaining strong executive relationships is essential for platform expansion. Addressing this proactively will strengthen partnership and unlock growth opportunities.`;
            } else if (signalType.includes('use case')) {
                return `${account.name}'s use case signal indicates untapped value potential. For ${industry.toLowerCase()} organizations, demonstrating clear ROI through expanded use cases drives platform stickiness. Acting on this opportunity will increase consumption and justify continued investment.`;
            } else if (signalType.includes('architecture')) {
                return `Technical architecture concerns at ${account.name} could impact data reliability and user experience. ${industry} companies rely heavily on data accuracy for decision-making. Resolving these technical challenges will improve user satisfaction and prevent churn.`;
            } else {
                return `${account.name}'s signal requires immediate attention to maintain account health. Given their ${industry.toLowerCase()} focus and current ${health} status, these recommended actions will address key concerns and strengthen the customer relationship for long-term success.`;
            }
        } else {
            return `While ${account.name} shows ${health} overall health, proactive engagement in the ${industry.toLowerCase()} sector is key to identifying expansion opportunities and preventing any emerging risks. These actions will strengthen the partnership and drive continued growth.`;
        }
    }
}