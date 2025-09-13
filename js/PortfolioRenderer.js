// Portfolio Renderer - Pure view for rendering portfolio tab
class PortfolioRenderer {

    static renderMyPortfolio(accounts, actionPlans, comments) {
        const container = document.getElementById('accountsList');
        if (!container) return;

        // Update dashboard card values
        this.updateDashboardCards(accounts, actionPlans);

        // Get all accounts
        const allAccounts = Array.from(accounts.values());

        // Filter accounts with recent high priority Risk or Opportunities signals
        const accountsWithRiskOrOpportunitySignals = allAccounts
            .filter(account => account.signals.some(signal => {
                const polarity = signal.signal_polarity || signal['Signal Polarity'] || '';
                const normalizedPolarity = FormatUtils.normalizePolarityKey(polarity);
                return signal.priority === 'High' && (normalizedPolarity === 'risk' || normalizedPolarity === 'opportunities');
            }))
            .map(account => {
                // Find the most recent high priority Risk/Opportunities signal for sorting
                const qualifyingSignals = account.signals.filter(signal => {
                    const polarity = signal.signal_polarity || signal['Signal Polarity'] || '';
                    const normalizedPolarity = FormatUtils.normalizePolarityKey(polarity);
                    return signal.priority === 'High' && (normalizedPolarity === 'risk' || normalizedPolarity === 'opportunities');
                });
                
                // Sort qualifying signals by polarity priority (Risk > Opportunities) then by call_date DESC
                const sortedQualifyingSignals = qualifyingSignals.sort((a, b) => {
                    const polarityA = a.signal_polarity || a['Signal Polarity'] || '';
                    const polarityB = b.signal_polarity || b['Signal Polarity'] || '';
                    const normalizedPolarityA = FormatUtils.normalizePolarityKey(polarityA);
                    const normalizedPolarityB = FormatUtils.normalizePolarityKey(polarityB);
                    const polarityOrder = { 'risk': 2, 'opportunities': 1, 'enrichment': 0 };
                    const polarityScoreA = polarityOrder[normalizedPolarityA] || 0;
                    const polarityScoreB = polarityOrder[normalizedPolarityB] || 0;
                    
                    if (polarityScoreA !== polarityScoreB) {
                        return polarityScoreB - polarityScoreA; // Risk before Opportunities
                    }
                    
                    // Same polarity, sort by call_date DESC
                    const dateA = new Date(a.call_date || a.created_date);
                    const dateB = new Date(b.call_date || b.created_date);
                    return dateB - dateA;
                });
                
                const mostRecentQualifyingDate = sortedQualifyingSignals.length > 0 
                    ? new Date(sortedQualifyingSignals[0].call_date || sortedQualifyingSignals[0].created_date).getTime()
                    : 0;
                const topSignalPolarity = sortedQualifyingSignals.length > 0 
                    ? FormatUtils.normalizePolarityKey(sortedQualifyingSignals[0].signal_polarity || sortedQualifyingSignals[0]['Signal Polarity'] || '')
                    : '';
                    
                return { ...account, mostRecentQualifyingDate, topSignalPolarity };
            })
            .sort((a, b) => {
                const polarityOrder = { 'risk': 2, 'opportunities': 1, 'enrichment': 0 };
                const polarityScoreA = polarityOrder[a.topSignalPolarity] || 0;
                const polarityScoreB = polarityOrder[b.topSignalPolarity] || 0;
                
                // First sort by signal polarity (Risk before Opportunities)
                if (polarityScoreA !== polarityScoreB) {
                    return polarityScoreB - polarityScoreA;
                }
                
                // Same polarity, sort by most recent qualifying signal date (descending)
                return b.mostRecentQualifyingDate - a.mostRecentQualifyingDate;
            });

        // Sort all accounts alphabetically
        const sortedAllAccounts = allAccounts.sort((a, b) => {
            return a.name.localeCompare(b.name);
        });

        let html = '';

        // Render "Accounts with a recent Risk or Opportunities Identified" section
        if (accountsWithRiskOrOpportunitySignals.length > 0) {
            html += `
                <div class="portfolio-section">
                    <h3 class="portfolio-section-header">Accounts with Risk or Opportunities Identified</h3>
                    <div class="portfolio-section-content">
                        ${accountsWithRiskOrOpportunitySignals.map(account => this.renderAccountCard(account, actionPlans, comments, ['Risk', 'Opportunities'])).join('')}
                    </div>
                </div>
            `;
        }

        // Render "All Accounts" section
        html += `
            <div class="portfolio-section">
                <h3 class="portfolio-section-header">All Accounts</h3>
                <div class="portfolio-section-content">
                    ${sortedAllAccounts.map(account => this.renderAccountCard(account, actionPlans, comments)).join('')}
                </div>
            </div>
        `;

        container.innerHTML = html;
    }

    static updateDashboardCards(accounts, actionPlans) {
        const allSignals = Array.from(accounts.values()).flatMap(account => account.signals);
        const accountsWithSignals = Array.from(accounts.values()).filter(account => account.signals.length > 0);

        // Count recommended actions by signal polarity
        const recommendedActionsWithPolarity = allSignals.filter(signal => 
            signal.recommended_action && 
            signal.recommended_action.trim() && 
            signal.recommended_action !== 'No actions specified' &&
            signal.action_id &&
            signal.action_id.trim()
        );

        // Count Risk polarity actions
        const riskActionsCount = recommendedActionsWithPolarity.filter(signal => {
            const polarity = signal.signal_polarity || signal['Signal Polarity'] || '';
            return polarity.toLowerCase() === 'risk';
        }).length;

        // Count Opportunities polarity actions  
        const opportunityActionsCount = recommendedActionsWithPolarity.filter(signal => {
            const polarity = signal.signal_polarity || signal['Signal Polarity'] || '';
            return polarity.toLowerCase() === 'opportunities';
        }).length;

        // Update Risks count
        const requiresAttentionElement = document.getElementById('requiresAttentionCount');
        if (requiresAttentionElement) {
            requiresAttentionElement.textContent = riskActionsCount;
        }

        // Update Opportunities count
        const highPriorityElement = document.getElementById('highPriorityDashboard');
        if (highPriorityElement) {
            highPriorityElement.textContent = opportunityActionsCount;
        }

        // Update Active Accounts count
        const activeAccountsElement = document.getElementById('activeAccountsCount');
        if (activeAccountsElement) {
            activeAccountsElement.textContent = accountsWithSignals.length;
        }
    }

    static renderAccountCommentsSection(accountId, comments) {
        const accountComments = comments.get ? comments.get(accountId) || [] : comments[accountId] || [];
        
        return `
            <div class="account-comments-section">
                <div class="comments-header">
                    <h4 class="comments-title">Account Comments</h4>
                    <span class="comments-count">${accountComments.length} comment${accountComments.length !== 1 ? 's' : ''}</span>
                </div>
                ${accountComments.length > 0 ? `
                <div class="comments-list">
                    ${accountComments.map(comment => `
                        <div class="account-comment">
                            <div class="comment-header">
                                <span class="comment-author">${SecurityUtils.sanitizeHTML(comment.author)}</span>
                                <span class="comment-time">${FormatUtils.formatCommentTime(comment.timestamp)}</span>
                            </div>
                            <div class="comment-text">${SecurityUtils.sanitizeHTML(comment.text)}</div>
                        </div>
                    `).join('')}
                </div>
                ` : ''}
                <div class="add-comment-section">
                    <input type="text" placeholder="Add a comment about this account..." class="account-comment-input" id="accountCommentInput-${accountId}">
                    <button class="btn btn-primary" data-action="add-account-comment" data-account-id="${accountId}">Add Comment</button>
                </div>
            </div>
        `;
    }

    static updateSingleAccount(accountId, accounts, actionPlans, comments) {
        // Find the account
        const account = accounts.get(accountId);
        if (!account) return;

        // Find the existing account card in the DOM
        const container = document.getElementById('accountsList');
        if (!container) return;

        // Generate the updated account card HTML
        const updatedAccountHTML = this.renderAccountCard(account, actionPlans, comments);

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

    static renderAccountCard(account, actionPlans, comments, filterPolarities = null) {
        // Count distinct action_id values by signal polarity (each account has 0-3 AI Recommendations)
        const uniqueActionIds = new Set();
        const riskActionIds = new Set();
        const opportunityActionIds = new Set();
        
        // Extract unique action_ids and categorize by polarity
        account.signals.forEach(signal => {
            if (signal.action_id && signal.action_id.trim()) {
                uniqueActionIds.add(signal.action_id);
                const polarity = signal.signal_polarity || signal['Signal Polarity'] || '';
                const normalizedPolarity = FormatUtils.normalizePolarityKey(polarity);
                
                if (normalizedPolarity === 'risk') {
                    riskActionIds.add(signal.action_id);
                } else if (normalizedPolarity === 'opportunities') {
                    opportunityActionIds.add(signal.action_id);
                }
            }
        });
        
        const riskActions = riskActionIds.size;
        const opportunityActions = opportunityActionIds.size;
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
        // console.log('airecco: ', account.aiRecommendation);

        return `
            <div class="portfolio-account-card">
                <div class="account-header-row" data-action="toggle-account-signals" data-account-id="${account.id}">
                    <div class="account-title-section">
                        <i class="fas fa-chevron-right account-chevron" id="chevron-${account.id}"></i>
                        <div class="account-warning-icon">
                            <i class="fas fa-exclamation-triangle ${account.health === 'critical' ? 'critical-warning' : account.health === 'warning' ? 'warning-warning' : 'healthy-warning'}"></i>
                        </div>
                        <div class="account-name-info">
                            <h3 class="account-name">${SecurityUtils.sanitizeHTML(account.name)}</h3>
                            <div class="account-stats">${riskActions} Risks, ${opportunityActions} Opportunities</div>
                        </div>
                    </div>
                    <div class="account-actions-section">
                        ${account.health === 'critical' ? '<span class="critical-badge">critical</span>' : ''}
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
                                    <span class="financial-value">${account.bks_renewal_baseline_usd > 0 ? FormatUtils.formatCurrency(account.bks_renewal_baseline_usd) : '$0'}</span>
                                </div>
                                <div class="financial-metric">
                                    <span class="financial-label">GPA</span>
                                    <span class="financial-value">${account['Account GPA'] ? parseFloat(account['Account GPA']).toFixed(1) : '0.0'}</span>
                                </div>
                                <div class="financial-metric">
                                    <span class="financial-label">% Pacing</span>
                                    <span class="financial-value">${account['% Pacing'] ? (parseFloat(account['% Pacing']) * 100).toFixed(1) : '0.0'}%</span>
                                </div>
                                <div class="financial-metric">
                                    <span class="financial-label">Next Renewal Date</span>
                                    <span class="financial-value">${account['Next Renewal Date'] || 'TBD'}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="ai-recommendations-section">
                        <div class="recommendations-header">
                            <i class="fas fa-exclamation-triangle recommendation-warning-icon"></i>
                            <h4 class="recommendations-title">AI Recommendations</h4>
                        </div>

                        <div class="recommendations-list-container">
                            ${this.getMergedRecommendationsAndRationale(account, filterPolarities)}
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
                                        <span class="signal-name-text">${SecurityUtils.sanitizeHTML(signal.name)}</span>
                                    </div>
                                    <div class="signal-meta-actions">
                                        <span class="signal-date-text">${FormatUtils.formatDateSimple(signal.call_date || signal.created_date)}</span>
                                        <a href="#" class="view-link" data-action="view-signal" data-signal-id="${signal.id}" onclick="event.stopPropagation();">View</a>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                        
                        <div class="signals-pagination">
                            ${hasMoreSignals ? `<button class="btn btn-secondary show-more-btn" data-action="show-more-signals" data-account-id="${account.id}" onclick="event.stopPropagation();">Show 3 more</button>` : ''}
                            ${currentPage > 0 ? `<button class="btn btn-outline show-less-btn" data-action="show-less-signals" data-account-id="${account.id}" onclick="event.stopPropagation();">Show Less</button>` : ''}
                        </div>
                    </div>

                    ${this.renderAccountCommentsSection(account.id, comments)}

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
                
                // console.log('Using recommended_action for signal:', signal.name, action, 'action_id:', actionId);
                
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
            // console.log('OUTER Processing action context for signal:', actionContext);
            if (actionContext && actionContext.trim() && actionContext !== 'No actions specified') {
                // console.log('Processing action context for signal:', signal.name, actionContext);

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

                // console.log('Parsed actions:', actions);
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

        // console.log('Final unique actions for account:', account.name, uniqueActions);
        // console.log('Action IDs mapping:', Array.from(actionMap.entries()));

        // If we have specific actions from context, use them
        if (uniqueActions.length > 0) {
            return {
                priority: highPrioritySignals.length > 0 ? 'immediate' : 'near-term',
                actions: uniqueActions,
                actionMap: actionMap  // Include the action map for polarity lookup
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

    static isActionAlreadyInPlan(actionId, app) {
        // Check if this actionId already exists in any action plan
        if (!app || !app.actionPlans) return false;
        
        for (let [planId, planData] of app.actionPlans) {
            if (planData && planData.actionId === actionId) {
                return true;
            }
        }
        return false;
    }
    
    static getActionPlanInfo(actionId, appInstance) {
        // First check if we have a stored timestamp for this actionId
        const actionTimestamps = this.getActionTimestamps();
        if (actionTimestamps[actionId]) {
            const timeSinceAdded = this.getRelativeTimestamp(actionTimestamps[actionId]);
            return {
                isInPlan: true,
                timeSinceAdded: timeSinceAdded
            };
        }
        
        // Check existing action plans for this actionId
        if (appInstance && appInstance.actionPlans) {
            for (const [key, plan] of appInstance.actionPlans) {
                // Check if the plan contains this actionId
                if (plan && plan.actionId === actionId) {
                    // Calculate time since added
                    const timeSinceAdded = this.calculateTimeSinceAdded(plan.createdDate);
                    return {
                        isInPlan: true,
                        timeSinceAdded: timeSinceAdded
                    };
                }
                // Also check action items for associated signals
                if (plan.actionItems) {
                    for (const actionItem of plan.actionItems) {
                        if (actionItem.associatedSignals && actionItem.associatedSignals.includes(actionId)) {
                            const timeSinceAdded = this.calculateTimeSinceAdded(plan.createdDate);
                            return {
                                isInPlan: true,
                                timeSinceAdded: timeSinceAdded
                            };
                        }
                    }
                }
            }
        }
        return {
            isInPlan: false,
            timeSinceAdded: null
        };
    }
    
    static calculateTimeSinceAdded(createdDate) {
        if (!createdDate) return null;
        
        const created = new Date(createdDate);
        const now = new Date();
        const diffInMs = now - created;
        const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
        
        if (diffInDays === 0) {
            const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
            if (diffInHours === 0) {
                const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
                return diffInMinutes === 1 ? '1 minute' : `${diffInMinutes} minutes`;
            }
            return diffInHours === 1 ? '1 hour' : `${diffInHours} hours`;
        } else if (diffInDays < 7) {
            return diffInDays === 1 ? '1 day' : `${diffInDays} days`;
        } else if (diffInDays < 30) {
            const weeks = Math.floor(diffInDays / 7);
            return weeks === 1 ? '1 week' : `${weeks} weeks`;
        } else if (diffInDays < 365) {
            const months = Math.floor(diffInDays / 30);
            return months === 1 ? '1 month' : `${months} months`;
        } else {
            const years = Math.floor(diffInDays / 365);
            return years === 1 ? '1 year' : `${years} years`;
        }
    }

    static getMergedRecommendationsAndRationale(account, filterPolarities = null) {
        const actionDataMap = new Map();
        
        // Filter signals by polarity if specified
        let signalsToProcess = account.signals;
        if (filterPolarities && Array.isArray(filterPolarities)) {
            signalsToProcess = account.signals.filter(signal => {
                const polarity = signal.signal_polarity || signal['Signal Polarity'] || '';
                return filterPolarities.includes(polarity);
            });
        }
        
        // Create map of recommended_action to data object with priority, date, and action_id
        signalsToProcess.forEach((signal, index) => {
            // Extra validation to ensure signal belongs to this account
            if (signal.account_id !== account.id) {
                console.error(`ERROR: Signal ${signal.id} has account_id ${signal.account_id} but is in account ${account.id} signals array!`);
                return; // Skip this signal as it doesn't belong to this account
            }
            
            if (signal.recommended_action && 
                signal.recommended_action.trim() && 
                signal.recommended_action !== 'No actions specified' &&
                signal.action_id &&
                signal.action_id.trim()) {
                
                const action = signal.recommended_action.trim();
                const actionId = signal.action_id;
                const priority = signal.priority || 'Medium';
                
                // Get the date from the RecommendedAction object (when the action was created)
                const signalsStore = window.signalsStore;
                const recommendedAction = signalsStore?.normalizedData?.recommendedActions?.get(actionId);
                const date = recommendedAction?.created_at || signal.call_date || signal.created_date || '';
                
                // Get Signal Polarity from signal
                const signalPolarity = signal.signal_polarity || signal['Signal Polarity'] || 'Enrichment';
                const polarityClass = signalPolarity.toLowerCase();
                
                if (!actionDataMap.has(action)) {
                    const actionData = {
                        date: date,
                        actionId: actionId,
                        accountId: account.id,
                        priority: priority,
                        signalPolarity: signalPolarity,
                        polarityClass: polarityClass,
                        rationale: signal.signal_rationale || ''
                    };
                    actionDataMap.set(action, actionData);
                }
            }
        });
        
        // If we have action items, display them in the new list format
        if (actionDataMap.size > 0) {
            // Get account-level polarity class for consistent color coding
            const accountPolarityClass = this.getAccountPolarityClass(account);
            
            return Array.from(actionDataMap.entries()).slice(0, 5).map(([action, data]) => {
                // Check if already in plan and calculate time since added
                const planInfo = this.getActionPlanInfo(data.actionId, window.app);
                const isInPlan = planInfo.isInPlan;
                const timeSinceAdded = planInfo.timeSinceAdded;
                
                // Get related calls for this action
                const relatedCalls = this.getRelatedCallsForAction(data.actionId, account);
                
                return `
                    <div class="recommendation-list-item">
                        <div class="recommendation-content">
                            <div class="recommendation-text">
                                ${SecurityUtils.sanitizeHTML(action)}
                            </div>
                            ${data.rationale ? `
                                <div class="recommendation-rationale">
                                    <div class="polarity-badge polarity-${accountPolarityClass}">
                                        ${accountPolarityClass === 'opportunities' ? 'Opportunities' : accountPolarityClass === 'risk' ? 'Risk' : 'Enrichment'}
                                    </div>
                                    <br>
                                    ${SecurityUtils.sanitizeHTML(data.rationale)}
                                </div>
                            ` : ''}
                            ${relatedCalls.length > 0 ? `
                                <div class="related-calls-section">
                                    <span class="related-calls-label">Related Calls:</span>
                                    <div class="related-calls-list">
                                        ${relatedCalls.map((call, index) => {
                                            const callData = JSON.stringify({
                                                title: call.title,
                                                date: call.date,
                                                attendees: call.attendees,
                                                recap: call.recap,
                                                url: call.url,
                                                relatedSignals: call.relatedSignals
                                            }).replace(/"/g, '&quot;');
                                            
                                            return `<span class="call-link" data-call-info="${callData}">${SecurityUtils.sanitizeHTML(call.title)}</span>${index < relatedCalls.length - 1 ? ', ' : ''}`;
                                        }).join('')}
                                    </div>
                                </div>
                            ` : ''}
                        </div>
                        <div class="recommendation-date">
                            ${FormatUtils.formatDateSimple(data.date)}
                        </div>
                        <div class="recommendation-action-button">
                            ${isInPlan ? 
                                `<span class="btn-added-status">${timeSinceAdded ? `Added ${timeSinceAdded} ago` : 'Added!'}</span>` : 
                                `<button class="btn-add-to-plan" data-action-id="${data.actionId}" data-action-title="${action}" data-account-id="${data.accountId}" onclick="PortfolioRenderer.openAddToPlanDrawer('${data.actionId}', '${action.replace(/'/g, "\\'")}', '${data.accountId}')">
                                    Add to Plan
                                </button>`
                            }
                        </div>
                    </div>
                `;
            }).join('');
        }
        
        // Note: We only show recommendations that have actual action_ids from signals
        // This ensures that CS plays are available for each recommendation
        
        // Only show "No recommendations" if truly no recommendations exist
        return `
            <div class="recommendation-list-item">
                <div class="no-recommendations-message">
                    No AI recommendations available for this account.
                </div>
            </div>
        `;
    }

    /**
     * Get account-level polarity color class based on all recommendations
     * @param {Object} account - The account object containing signals
     * @returns {string} - Color class ('risk', 'opportunities', or 'enrichment')
     */
    static getAccountPolarityClass(account) {
        if (!account || !account.signals) {
            return 'enrichment';
        }
        
        const polarities = new Set();
        
        // Extract polarities from all signals that have recommended actions and action_ids
        account.signals.forEach(signal => {
            if (signal.recommended_action && 
                signal.recommended_action.trim() && 
                signal.recommended_action !== 'No actions specified' &&
                signal.action_id &&
                signal.action_id.trim()) {
                const polarity = signal.signal_polarity || signal['Signal Polarity'] || 'Enrichment';
                polarities.add(polarity.toLowerCase());
            }
        });
        
        // Priority logic: Risk > Opportunities > Enrichment
        if (polarities.has('risk')) {
            return 'risk';
        } else if (polarities.has('opportunities') && !polarities.has('risk')) {
            return 'opportunities';
        } else {
            return 'enrichment';
        }
    }

    static getUniqueRecommendedActions(account) {
        const uniqueActions = new Set();
        
        // Extract recommended_action from all signals for this account - ONLY if they have action_id
        account.signals.forEach(signal => {
            if (signal.recommended_action && 
                signal.recommended_action.trim() && 
                signal.recommended_action !== 'No actions specified' &&
                signal.action_id &&
                signal.action_id.trim()) {
                uniqueActions.add(signal.recommended_action.trim());
            }
        });
        
        // Convert Set to Array
        const actionsArray = Array.from(uniqueActions);
        
        // Only return specific recommended actions that have action_ids - no fallback
        return actionsArray;
    }


    /**
     * Get related calls for a specific action ID
     * @param {string} actionId - The action ID to find related calls for
     * @param {Object} account - The account object containing signals
     * @returns {Array} Array of unique call objects with title, date, attendees, and related signals
     */
    static getRelatedCallsForAction(actionId, account) {
        if (!actionId || !account || !account.signals) {
            return [];
        }
        
        const callsMap = new Map(); // Use Map to ensure unique calls by title
        
        // Find all signals with this actionId
        account.signals.forEach(signal => {
            if (signal.action_id === actionId && signal.call_context) {
                const callContext = signal.call_context;
                const callTitle = callContext.call_title;
                
                // Only include calls that have a title
                if (callTitle && callTitle.trim()) {
                    if (!callsMap.has(callTitle)) {
                        callsMap.set(callTitle, {
                            title: callTitle,
                            date: callContext.call_date || callContext.call_scheduled_date || '',
                            attendees: callContext.call_attendees || '',
                            recap: callContext.call_recap || '',
                            url: callContext.call_url || callContext['Call URL'] || '',
                            relatedSignals: []
                        });
                    }
                    
                    // Add this signal to the related signals list
                    callsMap.get(callTitle).relatedSignals.push({
                        id: signal.signal_id,
                        name: signal.name,
                        summary: signal.summary || '',
                        priority: signal.priority,
                        polarity: signal.signal_polarity
                    });
                }
            }
        });
        
        return Array.from(callsMap.values());
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

    /**
     * Initialize click functionality for call links
     * Should be called after rendering the portfolio
     */
    static initializeCallTooltips() {
        // Remove any existing modals first
        const existingModals = document.querySelectorAll('.call-modal');
        existingModals.forEach(modal => modal.remove());
        
        // Add click event listeners to all call links
        const callLinks = document.querySelectorAll('.call-link');
        callLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.showCallModal(e);
            });
        });
        
        // Close modal when clicking outside
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('call-modal-overlay')) {
                this.hideCallModal();
            }
        });
    }
    
    /**
     * Show call modal on click
     * @param {Event} event - Click event
     */
    static showCallModal(event) {
        // Hide any existing modal first
        this.hideCallModal();
        
        const callLink = event.target;
        const callData = JSON.parse(callLink.getAttribute('data-call-info').replace(/&quot;/g, '"'));
        
        // Create modal overlay
        const modalOverlay = document.createElement('div');
        modalOverlay.className = 'call-modal-overlay';
        modalOverlay.id = 'call-modal-overlay';
        
        // Create modal content
        const modal = document.createElement('div');
        modal.className = 'call-modal';
        modal.id = 'call-modal';
        
        // Build modal content
        let modalHTML = `
            <div class="call-modal-header">
                <div class="call-modal-title-section">
                    <div class="call-modal-title">${SecurityUtils.sanitizeHTML(callData.title)}</div>
                    ${callData.url ? `<a href="${SecurityUtils.sanitizeHTML(callData.url)}" target="_blank" rel="noopener noreferrer" class="call-modal-link">
                        <i class="fas fa-external-link-alt"></i> View Call
                    </a>` : ''}
                </div>
                <button class="call-modal-close" onclick="PortfolioRenderer.hideCallModal()">&times;</button>
            </div>
            <div class="call-modal-content">
        `;
        
        if (callData.date) {
            modalHTML += `<div class="call-modal-date"><strong>Date:</strong> ${FormatUtils.formatDateSimple(callData.date)}</div>`;
        }
        
        if (callData.attendees) {
            modalHTML += `<div class="call-modal-attendees"><strong>Attendees:</strong> ${SecurityUtils.sanitizeHTML(callData.attendees)}</div>`;
        }
        
        if (callData.recap) {
            modalHTML += `
                <div class="call-modal-recap">
                    <strong>Call Recap:</strong>
                    <div class="call-modal-recap-content">${SecurityUtils.sanitizeHTML(callData.recap)}</div>
                </div>
            `;
        }
        
        if (callData.relatedSignals && callData.relatedSignals.length > 0) {
            modalHTML += `
                <div class="call-modal-signals">
                    <div class="call-modal-signals-title"><strong>Related Signals:</strong></div>
                    <div class="call-modal-signals-list">
                        ${callData.relatedSignals.map(signal => `
                            <div class="call-modal-signal">
                                <div class="call-modal-signal-header">
                                    <span class="call-modal-signal-priority ${signal.priority.toLowerCase()}">${signal.priority}</span>
                                    <span class="call-modal-signal-name">${SecurityUtils.sanitizeHTML(signal.name)}</span>
                                </div>
                                ${signal.summary ? `<div class="call-modal-signal-summary">${SecurityUtils.sanitizeHTML(signal.summary)}</div>` : ''}
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }
        
        modalHTML += `</div>`;
        
        modal.innerHTML = modalHTML;
        modalOverlay.appendChild(modal);
        document.body.appendChild(modalOverlay);
        
        // Show modal with animation
        setTimeout(() => modalOverlay.classList.add('show'), 10);
    }
    
    /**
     * Hide call modal
     */
    static hideCallModal() {
        const modalOverlay = document.getElementById('call-modal-overlay');
        if (modalOverlay) {
            modalOverlay.classList.remove('show');
            setTimeout(() => modalOverlay.remove(), 200);
        }
    }

    static openAddToPlanDrawer(actionId, actionTitle, accountId) {
        // Store current action data
        window.currentDrawerData = {
            actionId: actionId,
            actionTitle: actionTitle,
            accountId: accountId
        };
        
        // Show the drawer
        const drawer = document.getElementById('addToPlanDrawer');
        const backdrop = document.getElementById('addToPlanDrawerBackdrop');
        
        drawer.classList.add('open');
        backdrop.classList.add('open');
        
        // Set the action title
        document.getElementById('drawerActionTitle').textContent = actionTitle;
        
        // Clear previous plan details
        document.getElementById('drawerPlanDetails').value = '';
        
        // Load CS plays specific to this action_id
        this.loadDrawerCSPlays(actionId);
        
        // Add backdrop click to close
        backdrop.addEventListener('click', () => {
            this.closeAddToPlanDrawer();
        });
    }

    static closeAddToPlanDrawer() {
        const drawer = document.getElementById('addToPlanDrawer');
        const backdrop = document.getElementById('addToPlanDrawerBackdrop');
        
        drawer.classList.remove('open');
        backdrop.classList.remove('open');
        
        // Clear any errors when closing
        this.clearDrawerError();
        
        window.currentDrawerData = null;
    }
    
    static isAccountExpanded(accountId) {
        const signalsContainer = document.getElementById(`signals-${accountId}`);
        return signalsContainer && signalsContainer.classList.contains('expanded');
    }
    
    static expandAccount(accountId) {
        const signalsContainer = document.getElementById(`signals-${accountId}`);
        const chevron = document.getElementById(`chevron-${accountId}`);
        if (signalsContainer) {
            signalsContainer.classList.add('expanded');
            if (chevron) {
                chevron.classList.add('rotated');
            }
        }
    }

    static truncateText(text, maxLength) {
        if (!text || text.length <= maxLength) return text;
        return text.substring(0, maxLength).trim() + '...';
    }

    static loadDrawerCSPlays(actionId) {
        // Find plays for this action_id from the normalized data model
        let csPlays = [];
        
        // Get the normalized store directly to access recommended actions
        const store = window.signalsStore;
        if (!store || !actionId) {
            console.warn('Cannot load plays: store or actionId not available');
        } else {
            // Try to get the recommended action from normalized data
            let recommendedAction = null;
            
            // Check if we have the getRecommendedAction method
            if (store.getRecommendedAction && typeof store.getRecommendedAction === 'function') {
                recommendedAction = store.getRecommendedAction(actionId);
            } else if (store.normalizedData && store.normalizedData.recommendedActions) {
                // Direct access to normalized data
                recommendedAction = store.normalizedData.recommendedActions.get(actionId);
            }
            
            // If we found the recommended action, extract its plays
            if (recommendedAction && recommendedAction.plays && Array.isArray(recommendedAction.plays)) {
                csPlays = recommendedAction.plays.filter(play => 
                    play && play.name && play.name.trim() && 
                    play.name !== 'N/A' && play.name !== ''
                ).map(play => ({
                    title: play.name || play.title || '',
                    description: play.description || play.full_description || 'No description available',
                    executingRole: play.executing_role || play.executingRole || 'Adoption Consulting'
                }));
            } else {
                // Fallback: Try to find plays from denormalized signals
                const state = store.getState ? store.getState() : store.state;
                const signals = state?.signals || [];
                
                if (signals.length > 0) {
                    const signal = signals.find(s => s.action_id === actionId);
                    
                    if (signal && signal.plays && Array.isArray(signal.plays)) {
                        // Use plays array from denormalized signal
                        csPlays = signal.plays.filter(play => 
                            play && play.name && play.name.trim() && 
                            play.name !== 'N/A' && play.name !== ''
                        ).map(play => ({
                            title: play.name || play.title || '',
                            description: play.description || play.full_description || 'No description available',
                            executingRole: play.executing_role || play.executingRole || 'Adoption Consulting'
                        }));
                    }
                }
            }
        }
        
        const playsContainer = document.getElementById('drawerPlaysContainer');
        if (!playsContainer) {
            console.error('drawerPlaysContainer element not found!');
            return;
        }
        
        // Show message if no plays found, otherwise show checkboxes
        if (csPlays.length === 0) {
            playsContainer.innerHTML = '<p class="no-plays-message">No recommended plays for this action.</p>';
        } else {
            // Ensure we have a valid array of play objects
            const validPlays = csPlays.filter(play => play && play.title && play.title.trim().length > 0);
            
            if (validPlays.length === 0) {
                playsContainer.innerHTML = '<p class="no-plays-message">No valid plays found.</p>';
                return;
            }
            
            const playCheckboxes = validPlays.map((play, index) => {
                return `
                    <div class="drawer-play-item">
                        <input type="checkbox" id="drawerPlay${index}" value="${play.title}" checked>
                        <label for="drawerPlay${index}" class="drawer-play-label">
                            <div class="play-header">
                                <span class="play-title">${play.title}</span>
                            </div>
                            <div class="play-description">${this.truncateText(play.description, 250)}</div>
                            <div class="play-owner">
                                <span class="play-owner-label">Play Owner:</span>
                                <span class="play-owner-value">${play.executingRole || 'Not specified'}</span>
                            </div>
                        </label>
                    </div>
                `;
            }).join('');
            
            playsContainer.innerHTML = playCheckboxes;
        }
    }

    static async createPlanFromDrawer() {
        if (!window.currentDrawerData) return;
        
        // Clear any previous errors
        this.clearDrawerError();
        
        const actionId = window.currentDrawerData.actionId;
        const actionTitle = window.currentDrawerData.actionTitle;
        const accountId = window.currentDrawerData.accountId;
        const planDetails = document.getElementById('drawerPlanDetails').value;
        
        // Get selected plays
        const selectedPlays = Array.from(document.querySelectorAll('#drawerPlaysContainer input[type="checkbox"]:checked'))
            .map(checkbox => checkbox.value);
        
        // Get current user info for assignee
        let userName = 'Current User';
        let userId = 621623466; // Default numeric ID
        
        try {
            const user = await domo.get(`/domo/environment/v1/`);
            if (user && typeof user === 'object') {
                userId = parseInt(user.userId) || parseInt(user.id) || userId;
                userName = user.userName || user.name || user.displayName || userName;
            }
        } catch (error) {
            console.warn('Could not get user info, using defaults:', error);
        }
        
        // Get signal polarity from the signal with this actionId
        let signalPolarity = 'Enrichment'; // Default value
        const store = window.signalsStore;
        if (store) {
            const state = store.getState ? store.getState() : store.state;
            const signals = state?.signals || [];
            const signalWithAction = signals.find(s => s.action_id === actionId);
            if (signalWithAction) {
                signalPolarity = signalWithAction.signal_polarity || signalWithAction['Signal Polarity'] || 'Enrichment';
            }
        }
        
        // Set due date to TODAY + 7 days
        const today = new Date();
        const dueDate = new Date(today.getTime() + (7 * 24 * 60 * 60 * 1000));
        const dueDateString = dueDate.toISOString().split('T')[0]; // Format as YYYY-MM-DD
        
        // Format plan title as "Action Plan - MM/DD/YYYY"
        const planDate = today.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' });
        const planTitle = `Action Plan - ${planDate}`;
        
        // Create the plan data structure matching exact database model
        const planData = {
            accountId: accountId,
            actionId: actionId,
            title: actionTitle,
            description: planDetails,
            plays: selectedPlays,
            status: 'pending',
            priority: 'Medium', // Capitalized
            dueDate: dueDateString, // YYYY-MM-DD format
            assignee: userId, // Numeric ID
            createdDate: new Date().toISOString(),
            planTitle: planTitle,
            createdBy: userName,
            createdByUserId: userId,
            signalPolarity: signalPolarity // NEW FIELD
        };
        
        try {
            // 🎯 OPTIMISTIC UI: Update specific action button immediately
            this.updateSpecificActionButton(actionId, 'added');
            
            // Store plan creation timestamp for this specific action
            this.storePlanCreationTimestamp(actionId);
            
            // 🔄 USE PROPER FLUX ARCHITECTURE: ActionPlansService for real persistence
            const result = await ActionPlansService.createActionPlan(
                actionId,
                accountId,
                actionTitle,
                planDetails,
                selectedPlays, // Pass plays as-is (strings or objects)
                userId,
                userName,
                planTitle,
                dueDateString,
                'Medium', // Priority
                signalPolarity // Pass signal polarity
            );
            
            if (result) {
                // console.log('Plan created successfully from drawer:', result.plan);
                
                // ActionPlansService already handles state updates through Flux
                // No need for manual state management here
                
                // Store expanded account state before closing drawer
                const wasAccountExpanded = this.isAccountExpanded(accountId);
                
                // Close drawer
                this.closeAddToPlanDrawer();
                
                // Show success notification first
                if (window.app && window.app.notificationService) {
                    window.app.notificationService.showNotification('🎉 Action plan created successfully!', 'success');
                }
                
                // Refresh the portfolio view to show updated state
                if (window.app && window.app.renderCurrentTab) {
                    window.app.renderCurrentTab();
                    
                    // Restore expanded account state after render is complete
                    if (wasAccountExpanded) {
                        setTimeout(() => {
                            this.expandAccount(accountId);
                        }, 150);
                    }
                }
            } else {
                console.error('Failed to create plan from drawer:', result ? result.error : 'Unknown error');
                
                // 🔄 REVERT OPTIMISTIC UI: Reset button state and clear timestamp on error
                this.updateSpecificActionButton(actionId, 'default');
                this.clearPlanCreationTimestamp(actionId); // Clean up optimistic timestamp
                
                this.showDrawerError('Failed to create action plan. Please check your connection and try again.');
            }
        } catch (error) {
            console.error('Error creating plan from drawer:', error);
            
            // 🔄 REVERT OPTIMISTIC UI: Reset button state and clear timestamp on error
            this.updateSpecificActionButton(actionId, 'default');
            this.clearPlanCreationTimestamp(actionId); // Clean up optimistic timestamp
            
            // Handle specific error types for better user experience
            if (error.message && error.message.includes('Failed to fetch')) {
                this.showDrawerError('Unable to connect to the server. Please check your internet connection and try again.');
            } else if (error.message && error.message.includes('404')) {
                this.showDrawerError('Action Plan service endpoint not found. Please contact your administrator.');
            } else {
                this.showDrawerError('An unexpected error occurred while creating the action plan. Please try again.');
            }
        }
    }

    static showDrawerError(message) {
        const errorElement = document.getElementById('planDrawerError');
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
        }
    }

    static clearDrawerError() {
        const errorElement = document.getElementById('planDrawerError');
        if (errorElement) {
            errorElement.style.display = 'none';
            errorElement.textContent = '';
        }
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

    // 🎯 OPTIMISTIC UI & TIMESTAMP TRACKING METHODS

    /**
     * Update specific action button by actionId
     * @param {string} actionId - Action ID
     * @param {string} state - Button state ('added', 'default')
     */
    static updateSpecificActionButton(actionId, state) {
        // Find the specific button for this actionId
        const button = document.querySelector(`[data-action-id="${actionId}"]`);
        
        if (button) {
            if (state === 'added') {
                // Get relative timestamp for display
                const timestamp = this.getActionTimestamps()[actionId];
                const relativeTime = this.getRelativeTimestamp(timestamp);
                
                button.classList.remove('btn-add-to-plan');
                button.classList.add('btn-added-status');
                button.textContent = relativeTime !== 'Add to Plan' ? relativeTime : 'Added!';
                button.disabled = true;
                
                // Remove the onclick handler to prevent accidental clicks
                button.removeAttribute('onclick');
            } else {
                button.classList.remove('btn-added-status');
                button.classList.add('btn-add-to-plan');
                button.textContent = 'Add to Plan';
                button.disabled = false;
            }
        }
    }

    /**
     * Store action plan creation timestamp for a specific actionId
     * @param {string} actionId - Action ID
     */
    static storePlanCreationTimestamp(actionId) {
        const timestamp = Date.now();
        const actionTimestamps = this.getActionTimestamps();
        actionTimestamps[actionId] = timestamp;
        
        try {
            localStorage.setItem('signalsai_action_timestamps', JSON.stringify(actionTimestamps));
        } catch (error) {
            console.warn('Could not store action timestamp:', error);
        }
    }

    /**
     * Get all action timestamps from localStorage
     * @returns {Object} Object with actionId -> timestamp mappings
     */
    static getActionTimestamps() {
        try {
            const stored = localStorage.getItem('signalsai_action_timestamps');
            return stored ? JSON.parse(stored) : {};
        } catch (error) {
            console.warn('Could not load action timestamps:', error);
            return {};
        }
    }

    /**
     * Clear action plan creation timestamp for a specific actionId
     * @param {string} actionId - Action ID
     */
    static clearPlanCreationTimestamp(actionId) {
        if (!actionId) {
            console.warn('⚠️ Cannot clear action timestamp: actionId is null or undefined');
            return;
        }
        
        try {
            const actionTimestamps = this.getActionTimestamps();
            if (actionTimestamps[actionId]) {
                delete actionTimestamps[actionId];
                localStorage.setItem('signalsai_action_timestamps', JSON.stringify(actionTimestamps));
                console.log(`🧹 Cleared action timestamp for action ${actionId}`);
            } else {
                console.log(`ℹ️ No timestamp to clear for action ${actionId}`);
            }
        } catch (error) {
            console.warn('Could not clear action timestamp:', error);
        }
    }

    /**
     * Update the "Add to Plan" button state with optimistic UI (legacy method for account-level updates)
     * @param {string} accountId - Account ID
     * @param {string} state - Button state ('added-today', 'added', 'default')
     */
    static updateAddToPlanButtonState(accountId, state) {
        const containers = document.querySelectorAll(`[data-account-id="${accountId}"] .recommendation-action-button`);
        
        containers.forEach(container => {
            const button = container.querySelector('.btn-add-to-plan');
            if (!button) return;
            
            if (state === 'added-today') {
                button.classList.remove('btn-add-to-plan');
                button.classList.add('btn-added-status');
                button.textContent = 'Added Today';
                button.disabled = true;
            } else if (state === 'added') {
                const timestamp = this.getPlanCreationTimestamp(accountId);
                const relativeTime = this.getRelativeTimestamp(timestamp);
                button.classList.remove('btn-add-to-plan');
                button.classList.add('btn-added-status');
                button.textContent = relativeTime;
                button.disabled = true;
            } else {
                button.classList.remove('btn-added-status');
                button.classList.add('btn-add-to-plan');
                button.textContent = 'Add to Plan';
                button.disabled = false;
            }
        });
    }

    /**
     * Store plan creation timestamp for an account
     * @param {string} accountId - Account ID
     */
    static storePlanCreationTimestamp(accountId) {
        const timestamp = Date.now();
        const planTimestamps = this.getPlanTimestamps();
        planTimestamps[accountId] = timestamp;
        
        try {
            localStorage.setItem('signalsai_plan_timestamps', JSON.stringify(planTimestamps));
        } catch (error) {
            console.warn('Could not store plan timestamp:', error);
        }
    }

    /**
     * Get plan creation timestamp for an account
     * @param {string} accountId - Account ID
     * @returns {number|null} Timestamp or null if not found
     */
    static getPlanCreationTimestamp(accountId) {
        const planTimestamps = this.getPlanTimestamps();
        return planTimestamps[accountId] || null;
    }

    /**
     * Get all plan timestamps from localStorage
     * @returns {Object} Object with accountId -> timestamp mappings
     */
    static getPlanTimestamps() {
        try {
            const stored = localStorage.getItem('signalsai_plan_timestamps');
            return stored ? JSON.parse(stored) : {};
        } catch (error) {
            console.warn('Could not load plan timestamps:', error);
            return {};
        }
    }

    /**
     * Clear plan creation timestamp for an account (for cleanup on failures)
     * @param {string} accountId - Account ID
     */
    static clearPlanCreationTimestamp(accountId) {
        if (!accountId) {
            console.warn('⚠️ Cannot clear plan timestamp: accountId is null or undefined');
            return;
        }
        
        try {
            const planTimestamps = this.getPlanTimestamps();
            if (planTimestamps[accountId]) {
                delete planTimestamps[accountId];
                localStorage.setItem('signalsai_plan_timestamps', JSON.stringify(planTimestamps));
                console.log(`🧹 Cleared plan timestamp for account ${accountId}`);
            } else {
                console.log(`ℹ️ No timestamp to clear for account ${accountId}`);
            }
        } catch (error) {
            console.warn('Could not clear plan timestamp:', error);
        }
    }

    /**
     * Convert timestamp to relative time display (always rounds up)
     * @param {number} timestamp - Unix timestamp
     * @returns {string} Relative time string
     */
    static getRelativeTimestamp(timestamp) {
        if (!timestamp) return 'Add to Plan';
        
        const now = Date.now();
        const diffMs = now - timestamp;
        
        // Calculate time units (always round up)
        const diffMinutes = Math.ceil(diffMs / (1000 * 60));
        const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        const diffWeeks = Math.ceil(diffDays / 7);
        const diffMonths = Math.ceil(diffDays / 30);
        
        if (diffMinutes < 60) {
            return diffMinutes === 1 ? 'Added 1 minute ago' : `Added ${diffMinutes} minutes ago`;
        } else if (diffHours < 24) {
            return diffHours === 1 ? 'Added 1 hour ago' : `Added ${diffHours} hours ago`;
        } else if (diffDays < 7) {
            return diffDays === 1 ? 'Added 1 day ago' : `Added ${diffDays} days ago`;
        } else if (diffWeeks < 4) {
            return diffWeeks === 1 ? 'Added 1 week ago' : `Added ${diffWeeks} weeks ago`;
        } else {
            return diffMonths === 1 ? 'Added 1 month ago' : `Added ${diffMonths} months ago`;
        }
    }

    /**
     * Initialize button states based on stored timestamps
     * Call this when rendering the portfolio
     * @param {Object} app - App state
     */
    static initializePlanButtonStates(app) {
        const planTimestamps = this.getPlanTimestamps();
        
        Object.keys(planTimestamps).forEach(accountId => {
            if (this.hasExistingPlan(accountId, app)) {
                this.updateAddToPlanButtonState(accountId, 'added');
            }
        });
    }
}