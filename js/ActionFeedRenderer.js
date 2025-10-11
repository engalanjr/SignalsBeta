// ActionFeedRenderer - Pure view for rendering action feed cards
class ActionFeedRenderer {
    
    static cachedActions = [];
    static lastRenderTime = 0;

    /**
     * Render the action feed with filtering and sorting
     */
    static renderActionFeed(actions, viewState, signals, interactions) {
        const container = document.getElementById('signalsList');
        if (!container) return;

        // Sort actions based on viewState.sort
        const sortedActions = this.sortActions([...actions], viewState);

        // Separate new vs viewed actions
        const newActions = sortedActions.filter(action => !this.hasUserInteraction(action, interactions));
        const viewedActions = sortedActions.filter(action => this.hasUserInteraction(action, interactions));

        let html = '';

        // Add new actions section header
        if (newActions.length > 0) {
            html += this.renderNewActionsHeader(newActions.length);
            newActions.forEach(action => {
                html += this.renderActionCard(action, signals, true);
            });
        }

        if (newActions.length > 0 && viewedActions.length > 0) {
            html += this.renderSeparator();
        }

        // Add viewed actions section header
        if (viewedActions.length > 0) {
            html += this.renderViewedActionsHeader(viewedActions.length);
            viewedActions.forEach(action => {
                html += this.renderActionCard(action, signals, false);
            });
        }

        // Empty state
        if (newActions.length === 0 && viewedActions.length === 0) {
            html = this.renderEmptyState();
        }

        container.innerHTML = html;
        this.attachEventListeners(container);
        
        // Cache the actions for fast tab switching
        this.cachedActions = sortedActions;
        this.lastRenderTime = Date.now();
    }

    /**
     * Sort actions based on current sort option
     */
    static sortActions(actions, viewState) {
        const sortOption = viewState.sort || 'priority';
        
        return actions.sort((a, b) => {
            switch (sortOption) {
                case 'priority':
                    const priorityOrder = { 'High': 3, 'Medium': 2, 'Low': 1 };
                    const diff = (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
                    if (diff !== 0) return diff;
                    return new Date(b.lastUpdated || b.createdAt) - new Date(a.lastUpdated || a.createdAt);
                
                case 'confidence':
                    return (b.confidence || 0) - (a.confidence || 0);
                
                case 'lastUpdated':
                    return new Date(b.lastUpdated || b.createdAt) - new Date(a.lastUpdated || a.createdAt);
                
                case 'account':
                    return (a.accountName || '').localeCompare(b.accountName || '');
                
                default:
                    return 0;
            }
        });
    }

    /**
     * Check if user has interacted with this action
     */
    static hasUserInteraction(action, interactions) {
        if (!interactions || !action.id) return false;
        const actionInteractions = interactions.get(action.id) || [];
        return actionInteractions.some(i => 
            i.interactionType === 'useful' || 
            i.interactionType === 'not_relevant' ||
            i.interactionType === 'action_viewed' ||
            i.interactionType === 'plan_created'
        );
    }

    /**
     * Render an individual action card
     */
    static renderActionCard(action, signals, isNew) {
        // Validate action has an ID (use action_id as fallback)
        const actionId = action.id || action.action_id;
        if (!action || !actionId) {
            console.error('Invalid action data - missing id:', action);
            return '';
        }
        
        // Use actionId for all operations
        action.id = actionId;

        const priority = action.priority || 'Medium';
        const priorityClass = priority.toLowerCase();
        const status = action.status || 'PENDING';
        const cardClass = isNew ? 'action-new' : 'action-viewed';
        
        // Get related signals for this action
        const relatedSignals = this.getRelatedSignals(action, signals);
        const signalCounts = this.getSignalCounts(relatedSignals);
        
        // Get plays for this action
        const plays = action.plays || [];
        const recommendedPlays = plays.filter(p => p.recommended).slice(0, 3);
        const allPlays = plays.slice(0, 3);
        const displayPlays = recommendedPlays.length > 0 ? recommendedPlays : allPlays;
        
        // Sanitize content
        const headline = SecurityUtils.sanitizeHTML(action.recommended_action || action.title || 'Recommended Action');
        const accountName = SecurityUtils.sanitizeHTML(action.account_name || 'Unknown Account');
        const whySummary = SecurityUtils.sanitizeHTML(action.whySummary || action.signal_rationale || 'Action recommended based on signal analysis');
        
        return `
            <div class="action-card ${cardClass} ${priorityClass}-priority" data-action-id="${action.id}" data-account-id="${action.accountId || ''}">
                <div class="action-card-border action-border-${priorityClass}"></div>
                
                <div class="action-header">
                    <div class="action-headline">${headline}</div>
                    <div class="action-status-pill status-${status.toLowerCase()}">${status}</div>
                </div>
                
                <div class="action-subheader">
                    <span class="account-chip">${accountName}</span>
                    ${isNew ? '<span class="new-badge">NEW</span>' : ''}
                    <span class="lineage-badge risk-badge" title="Risk signals">
                        <i class="fas fa-exclamation-triangle"></i> ${signalCounts.risk}
                    </span>
                    <span class="lineage-badge opportunity-badge" title="Opportunity signals">
                        <i class="fas fa-arrow-up"></i> ${signalCounts.opportunity}
                    </span>
                    <span class="lineage-badge enrichment-badge" title="Enrichment signals">
                        <i class="fas fa-info-circle"></i> ${signalCounts.enrichment}
                    </span>
                    <button class="view-signals-btn" data-action="toggle-signals" data-action-id="${action.id}">
                        <i class="fas fa-eye"></i> View Signals
                    </button>
                </div>
                
                <div class="action-why-block">
                    <div class="why-label">Why this matters:</div>
                    <div class="why-summary">${whySummary}</div>
                </div>
                
                ${this.renderRelatedCalls(action, relatedSignals)}
                
                <div class="action-signals-list" id="signals-${action.id}" style="display: none;">
                    ${this.renderRelatedSignals(relatedSignals)}
                </div>
                
                ${displayPlays.length > 0 ? this.renderPlaysSection(action.id, displayPlays) : ''}
                
                <div class="action-controls">
                    ${this.getActionButtonHtml(action, headline)}
                    <div class="action-feedback">
                        ${this.getNotRelevantButtonHtml(action)}
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Get action button HTML (Take Action or Edit Plan based on plan existence)
     */
    static getActionButtonHtml(action, headline) {
        const existingPlan = this.getActionPlanForActionId(action.id);
        
        if (existingPlan) {
            // Plan exists - show Edit Plan button
            return `
                <button class="btn-primary edit-plan-btn" data-action="take-action" data-action-id="${action.id}" data-action-title="${SecurityUtils.sanitizeHTML(headline)}" data-account-id="${action.accountId || ''}">
                    <i class="fas fa-edit"></i> Edit Plan
                </button>
            `;
        } else {
            // No plan - show Take Action button
            return `
                <button class="btn-primary take-action-btn" data-action="take-action" data-action-id="${action.id}" data-action-title="${SecurityUtils.sanitizeHTML(headline)}" data-account-id="${action.accountId || ''}">
                    <i class="fas fa-bolt"></i> Take Action
                </button>
            `;
        }
    }

    /**
     * Get related signals for an action
     */
    static getRelatedSignals(action, signals) {
        if (!signals || !action.id) return [];
        return signals.filter(s => s.action_id === action.id);
    }

    /**
     * Get signal counts by polarity
     */
    static getSignalCounts(signals) {
        const counts = { risk: 0, opportunity: 0, enrichment: 0 };
        signals.forEach(signal => {
            const polarity = signal.signal_polarity || signal['Signal Polarity'] || '';
            const normalized = FormatUtils.normalizePolarityKey(polarity);
            if (normalized === 'risk') counts.risk++;
            else if (normalized === 'growth levers') counts.opportunity++;
            else counts.enrichment++;
        });
        return counts;
    }

    /**
     * Render related calls section (reuse Portfolio pattern)
     */
    static renderRelatedCalls(action, signals) {
        const relatedCalls = this.getRelatedCallsForAction(action.id, signals);
        
        if (!relatedCalls || relatedCalls.length === 0) {
            return ''; // Don't render if no calls
        }
        
        return `
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
        `;
    }
    
    /**
     * Get related calls for a specific action ID (from signals)
     * Adapted from PortfolioRenderer.getRelatedCallsForAction
     */
    static getRelatedCallsForAction(actionId, signals) {
        if (!actionId || !signals || signals.length === 0) {
            return [];
        }
        
        const callsMap = new Map(); // Use Map to ensure unique calls by title
        
        // Find all signals with this actionId that have call context
        signals.forEach(signal => {
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
    
    /**
     * Render related signals mini-list
     */
    static renderRelatedSignals(signals) {
        if (!signals || signals.length === 0) {
            return '<div class="no-signals">No related signals found</div>';
        }
        
        return signals.map(signal => {
            const polarity = signal.signal_polarity || signal['Signal Polarity'] || '';
            const normalized = FormatUtils.normalizePolarityKey(polarity);
            const polarityLabel = FormatUtils.normalizePolarityLabel(polarity);
            const signalName = SecurityUtils.sanitizeHTML(signal.name || 'Unnamed Signal');
            const date = FormatUtils.formatDate(signal.created_at || signal.call_date);
            const confidence = Math.round((signal.confidence || 0) * 100);
            
            return `
                <div class="mini-signal-row">
                    <span class="mini-signal-polarity polarity-${normalized}">${polarityLabel}</span>
                    <span class="mini-signal-name">${signalName}</span>
                    <span class="mini-signal-date">${date}</span>
                    <span class="mini-signal-confidence">${confidence}%</span>
                </div>
            `;
        }).join('');
    }

    /**
     * Render plays section
     */
    static renderPlaysSection(actionId, plays) {
        return `
            <div class="action-plays-container">
                <button class="view-plays-btn" data-action="toggle-plays" data-action-id="${actionId}">
                    <i class="fas fa-eye"></i> View Recommended Plays (${plays.length})
                </button>
                
                <div class="action-plays" id="plays-${actionId}" style="display: none;">
                    <div class="plays-header">Recommended Plays</div>
                    <div class="plays-list">
                        ${plays.map((play, index) => `
                            <div class="play-item">
                                <input type="checkbox" 
                                       id="play-${actionId}-${index}" 
                                       class="play-checkbox"
                                       data-action-id="${actionId}"
                                       data-play-id="${play.id || index}"
                                       ${play.recommended ? 'checked' : ''}>
                                <label for="play-${actionId}-${index}" class="play-label">
                                    <div class="play-title">${SecurityUtils.sanitizeHTML(play.title || play.name || 'Untitled Play')}</div>
                                    <div class="play-meta">
                                        ${play.owner ? `<span class="play-owner"><i class="fas fa-user"></i> ${SecurityUtils.sanitizeHTML(play.owner)}</span>` : ''}
                                        <span class="play-description">${SecurityUtils.sanitizeHTML(play.description || '')}</span>
                                    </div>
                                </label>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Render section headers
     */
    static renderNewActionsHeader(count) {
        return `
            <div class="section-header">
                <h3 class="section-title">New Actions</h3>
                <span class="section-count">${count} action${count !== 1 ? 's' : ''}</span>
            </div>
        `;
    }

    static renderViewedActionsHeader(count) {
        return `
            <div class="section-header viewed-header">
                <h3 class="section-title">Previously Viewed</h3>
                <span class="section-count">${count} action${count !== 1 ? 's' : ''}</span>
            </div>
        `;
    }

    static renderSeparator() {
        return `
            <div class="action-separator">
                <div class="separator-line"></div>
            </div>
        `;
    }

    static renderEmptyState() {
        return `
            <div class="empty-state">
                <i class="fas fa-inbox empty-icon"></i>
                <h3>No actions match your filters</h3>
                <p>Clear filters or broaden your search.</p>
            </div>
        `;
    }

    /**
     * Get feedback button HTML
     */
    static getUsefulButtonHtml(action) {
        const hasUseful = action.currentUserFeedback === 'useful';
        const activeClass = hasUseful ? 'active' : '';
        return `
            <button class="feedback-btn useful-btn ${activeClass}" 
                    data-action="mark-useful" 
                    data-action-id="${action.id}"
                    aria-label="Mark as useful">
                <i class="fas fa-thumbs-up"></i> Useful
            </button>
        `;
    }

    static getNotRelevantButtonHtml(action) {
        const hasNotRelevant = action.currentUserFeedback === 'not_relevant';
        const activeClass = hasNotRelevant ? 'active' : '';
        return `
            <button class="feedback-btn not-relevant-btn ${activeClass}" 
                    data-action="mark-not-relevant" 
                    data-action-id="${action.id}"
                    aria-label="Mark as not relevant">
                <i class="fas fa-thumbs-down"></i> Not Relevant
            </button>
        `;
    }

    /**
     * Attach event listeners
     */
    static attachEventListeners(container) {
        // Toggle signals view
        container.addEventListener('click', (e) => {
            const toggleBtn = e.target.closest('[data-action="toggle-signals"]');
            if (toggleBtn) {
                const actionId = toggleBtn.getAttribute('data-action-id');
                const signalsList = document.getElementById(`signals-${actionId}`);
                if (signalsList) {
                    const isVisible = signalsList.style.display !== 'none';
                    signalsList.style.display = isVisible ? 'none' : 'block';
                    toggleBtn.innerHTML = isVisible 
                        ? '<i class="fas fa-eye"></i> View Signals'
                        : '<i class="fas fa-eye-slash"></i> Hide Signals';
                }
            }

            // Toggle plays view
            const togglePlaysBtn = e.target.closest('[data-action="toggle-plays"]');
            if (togglePlaysBtn) {
                const actionId = togglePlaysBtn.getAttribute('data-action-id');
                const playsList = document.getElementById(`plays-${actionId}`);
                if (playsList) {
                    const isVisible = playsList.style.display !== 'none';
                    playsList.style.display = isVisible ? 'none' : 'block';
                    const playsCount = playsList.querySelectorAll('.play-item').length;
                    togglePlaysBtn.innerHTML = isVisible 
                        ? `<i class="fas fa-eye"></i> View Recommended Plays (${playsCount})`
                        : `<i class="fas fa-eye-slash"></i> Hide Recommended Plays`;
                }
            }

            // Handle take action (open drawer)
            const takeActionBtn = e.target.closest('[data-action="take-action"]');
            if (takeActionBtn) {
                const actionId = takeActionBtn.getAttribute('data-action-id');
                const actionTitle = takeActionBtn.getAttribute('data-action-title');
                let accountId = takeActionBtn.getAttribute('data-account-id');
                
                // If accountId is empty, try to get it from the action card or related signals
                if (!accountId || accountId === '') {
                    console.warn('⚠️ accountId is empty, attempting to retrieve from action data');
                    const actionCard = takeActionBtn.closest('.action-card');
                    if (actionCard) {
                        accountId = actionCard.getAttribute('data-account-id');
                    }
                    
                    // Last resort: get from store
                    if (!accountId || accountId === '') {
                        const store = window.signalsStore;
                        if (store && store.normalizedData) {
                            const action = store.normalizedData.recommendedActions.get(actionId);
                            if (action) {
                                accountId = action.account_id;
                                console.log('📦 Retrieved accountId from store:', accountId);
                            }
                        }
                    }
                }
                
                console.log('🎯 Opening drawer with:', { actionId, actionTitle, accountId });
                this.openAddToPlanDrawer(actionId, actionTitle, accountId);
            }

            // Handle not relevant feedback
            const notRelevantBtn = e.target.closest('[data-action="mark-not-relevant"]');
            if (notRelevantBtn) {
                const actionId = notRelevantBtn.getAttribute('data-action-id');
                dispatcher.dispatch(Actions.markActionNotRelevant(actionId));
            }
            
            // Handle related call clicks
            const callLink = e.target.closest('.call-link');
            if (callLink) {
                e.preventDefault();
                e.stopPropagation();
                // Use our own showCallModal method
                ActionFeedRenderer.showCallModal(e);
            }
        });

        // Track play selections
        container.addEventListener('change', (e) => {
            if (e.target.classList.contains('play-checkbox')) {
                const actionId = e.target.getAttribute('data-action-id');
                const createPlanBtn = container.querySelector(`[data-action="create-plan"][data-action-id="${actionId}"]`);
                if (createPlanBtn) {
                    const anyChecked = container.querySelectorAll(`.play-checkbox[data-action-id="${actionId}"]:checked`).length > 0;
                    createPlanBtn.disabled = !anyChecked;
                }
            }
        });

        // Setup intersection observer for viewed tracking
        this.setupScrollBasedViewing(container);
    }

    /**
     * Get existing action plan for an action_id
     */
    static getActionPlanForActionId(actionId) {
        const store = window.signalsStore;
        if (!store) return null;
        
        const state = store.getState();
        const actionPlans = state.actionPlans;
        
        console.log(`🔍 Looking for plan with actionId: "${actionId}"`);
        console.log(`📋 Total action plans in store: ${actionPlans.size}`);
        
        // Find plan with matching actionId
        for (const [planId, plan] of actionPlans.entries()) {
            console.log(`  Checking plan ${planId}: plan.actionId = "${plan.actionId}"`);
            if (plan.actionId === actionId) {
                console.log(`  ✅ MATCH FOUND!`);
                return plan;
            }
        }
        
        console.log(`  ❌ No match found in store`);
        
        // Fallback: check localStorage
        try {
            const localPlans = JSON.parse(localStorage.getItem('signalsai_action_plans') || '{}');
            console.log(`📦 Checking localStorage, found ${Object.keys(localPlans).length} plans`);
            for (const planId in localPlans) {
                const plan = localPlans[planId];
                console.log(`  Checking localStorage plan ${planId}: plan.actionId = "${plan.actionId}"`);
                if (plan.actionId === actionId) {
                    console.log(`  ✅ MATCH FOUND in localStorage!`);
                    return plan;
                }
            }
        } catch (error) {
            console.warn('Could not check local action plans:', error);
        }
        
        console.log(`  ❌ No match found anywhere`);
        return null;
    }

    /**
     * Open the Add to Plan drawer (same as Portfolio view)
     */
    static openAddToPlanDrawer(actionId, actionTitle, accountId, editMode = false) {
        // Check if plan exists for edit mode
        const existingPlan = this.getActionPlanForActionId(actionId);
        
        // Store current drawer data globally
        window.currentDrawerData = {
            actionId: actionId,
            actionTitle: actionTitle,
            accountId: accountId,
            editMode: editMode || !!existingPlan,
            planId: existingPlan?.id || null,
            existingPlan: existingPlan
        };
        
        // Show the drawer
        const drawer = document.getElementById('addToPlanDrawer');
        const backdrop = document.getElementById('addToPlanDrawerBackdrop');
        
        if (!drawer || !backdrop) {
            console.error('Drawer elements not found');
            return;
        }
        
        drawer.classList.add('open');
        backdrop.classList.add('open');
        
        // Update drawer title based on mode
        const drawerTitle = document.querySelector('.plan-drawer-header h2');
        if (drawerTitle) {
            drawerTitle.textContent = window.currentDrawerData.editMode ? 'Edit Action Plan' : 'Add Action to Plan';
        }
        
        // Set the action title
        const drawerActionTitle = document.getElementById('drawerActionTitle');
        if (drawerActionTitle) {
            drawerActionTitle.textContent = actionTitle;
        }
        
        // Load or clear plan details
        const drawerPlanDetails = document.getElementById('drawerPlanDetails');
        if (drawerPlanDetails) {
            drawerPlanDetails.value = existingPlan?.description || '';
        }
        
        // Load CS plays specific to this action_id
        this.loadDrawerCSPlays(actionId, existingPlan);
        
        // Update button text based on mode
        const createPlanBtn = document.getElementById('createPlanBtn');
        if (createPlanBtn) {
            createPlanBtn.textContent = window.currentDrawerData.editMode ? 'Update Plan' : 'Create Plan';
        }
        
        // Add backdrop click to close
        backdrop.addEventListener('click', () => {
            this.closeAddToPlanDrawer();
        });
    }
    
    /**
     * Close the Add to Plan drawer
     */
    static closeAddToPlanDrawer() {
        console.log('🚪 closeAddToPlanDrawer called');
        const drawer = document.getElementById('addToPlanDrawer');
        const backdrop = document.getElementById('addToPlanDrawerBackdrop');

        if (drawer) {
            drawer.classList.remove('open');
            console.log('✅ Drawer closed');
        } else {
            console.warn('⚠️ Drawer element not found');
        }

        if (backdrop) {
            backdrop.classList.remove('open');
            console.log('✅ Backdrop closed');
        } else {
            console.warn('⚠️ Backdrop element not found');
        }

        // Clear any errors when closing
        this.clearDrawerError();

        window.currentDrawerData = null;
        console.log('✅ Drawer data cleared');
    }
    
    /**
     * Load CS Plays for the drawer
     */
    static loadDrawerCSPlays(actionId, existingPlan = null) {
        console.log('🎮 loadDrawerCSPlays called with actionId:', actionId);
        let csPlays = [];
        let selectedPlayIds = new Set();

        // If editing, get selected plays from existing plan
        if (existingPlan && existingPlan.plays) {
            existingPlan.plays.forEach(play => {
                if (play.id) {
                    selectedPlayIds.add(play.id);
                } else if (play.name) {
                    // For legacy plays without ID, match by name
                    selectedPlayIds.add(play.name);
                }
            });
        }

        const store = window.signalsStore;
        if (!store || !actionId) {
            console.warn('❌ Cannot load plays: store or actionId not available');
        } else {
            // Try to get the recommended action from normalized data
            let recommendedAction = null;

            if (store.normalizedData && store.normalizedData.recommendedActions) {
                recommendedAction = store.normalizedData.recommendedActions.get(actionId);
                console.log('🔍 Found recommendedAction:', recommendedAction);
            }

            // If we found the recommended action, extract its plays
            if (recommendedAction && recommendedAction.plays && Array.isArray(recommendedAction.plays)) {
                console.log('📦 Raw plays from action:', recommendedAction.plays);
                csPlays = recommendedAction.plays.filter(play =>
                    play && play.name && play.name.trim() &&
                    play.name !== 'N/A' && play.name !== ''
                ).map(play => {
                    const playId = play.id || play.name;
                    return {
                        id: playId,
                        title: play.name || play.title || '',
                        description: play.description || play.full_description || 'No description available',
                        executingRole: play.executing_role || play.executingRole || 'Adoption Consulting',
                        selected: selectedPlayIds.has(playId) || selectedPlayIds.has(play.name)
                    };
                });
                console.log(`✅ Loaded ${csPlays.length} plays for drawer`);
            } else {
                console.warn('⚠️ No plays found in recommendedAction');
            }
        }

        // Render the plays in the drawer
        this.renderDrawerPlays(csPlays);
    }
    
    /**
     * Render plays in the drawer
     */
    static renderDrawerPlays(plays) {
        const playsContainer = document.getElementById('drawerPlaysContainer');
        if (!playsContainer) return;
        
        if (plays.length === 0) {
            playsContainer.innerHTML = '<p class="no-plays-message">No plays available for this action.</p>';
            return;
        }
        
        const playsHTML = plays.map(play => `
            <div class="cs-play-item">
                <input type="checkbox" 
                       id="drawer-play-${play.id}" 
                       class="play-checkbox" 
                       data-play-id="${play.id}"
                       data-play-title="${SecurityUtils.sanitizeHTML(play.title)}"
                       ${play.selected ? 'checked' : ''}>
                <label for="drawer-play-${play.id}" class="play-label">
                    <div class="play-title">${SecurityUtils.sanitizeHTML(play.title)}</div>
                    <div class="play-description">${SecurityUtils.sanitizeHTML(play.description)}</div>
                    <div class="play-role"><i class="fas fa-user"></i> ${SecurityUtils.sanitizeHTML(play.executingRole)}</div>
                </label>
            </div>
        `).join('');
        
        playsContainer.innerHTML = playsHTML;
        
        // Add event listeners for checkbox changes
        const checkboxes = playsContainer.querySelectorAll('.play-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const playItem = e.target.closest('.cs-play-item');
                if (playItem) {
                    if (e.target.checked) {
                        playItem.classList.add('selected');
                    } else {
                        playItem.classList.remove('selected');
                    }
                }
            });
            
            // Set initial state
            const playItem = checkbox.closest('.cs-play-item');
            if (playItem && checkbox.checked) {
                playItem.classList.add('selected');
            }
        });
        
        // Also make clicking the card toggle the checkbox
        const playItems = playsContainer.querySelectorAll('.cs-play-item');
        playItems.forEach(item => {
            item.addEventListener('click', (e) => {
                // Don't toggle if clicking the checkbox itself or label
                if (e.target.type === 'checkbox' || e.target.tagName === 'LABEL') {
                    return;
                }
                
                const checkbox = item.querySelector('.play-checkbox');
                if (checkbox) {
                    checkbox.checked = !checkbox.checked;
                    checkbox.dispatchEvent(new Event('change'));
                }
            });
        });
    }
    
    /**
     * Create or update action plan from drawer
     */
    static async handleCreateOrUpdatePlan() {
        console.log('🎯 handleCreateOrUpdatePlan called');
        
        // Check if ActionPlansService is available
        if (!window.ActionPlansService) {
            console.error('❌ ActionPlansService not available');
            this.showDrawerError('Action Plans Service is not loaded');
            return;
        }
        
        const drawerData = window.currentDrawerData;
        if (!drawerData) {
            console.error('❌ No drawer data available');
            return;
        }
        
        console.log('📋 Drawer data:', drawerData);
        console.log('✅ ActionPlansService available:', window.ActionPlansService);
        
        // Get selected plays
        const selectedPlays = [];
        const checkboxes = document.querySelectorAll('#drawerPlaysContainer .play-checkbox:checked');
        console.log(`✅ Found ${checkboxes.length} checked checkboxes`);
        
        checkboxes.forEach(checkbox => {
            const playId = checkbox.getAttribute('data-play-id');
            const playTitle = checkbox.getAttribute('data-play-title');
            selectedPlays.push({
                id: playId,
                name: playTitle,
                title: playTitle
            });
        });
        
        console.log('📦 Selected plays:', selectedPlays);
        
        if (selectedPlays.length === 0) {
            console.warn('⚠️ No plays selected');
            this.showDrawerError('Please select at least one play from the toolbox below');

            // Re-enable button
            if (createPlanBtn) {
                createPlanBtn.disabled = false;
                createPlanBtn.textContent = originalText;
            }
            return;
        }
        
        // Get plan details
        const description = document.getElementById('drawerPlanDetails')?.value || '';
        const actionTitle = drawerData.actionTitle || 'Action Plan';
        
        console.log('📝 Action title:', actionTitle);
        console.log('📝 Description:', description);
        
        // Show loading state
        const createPlanBtn = document.getElementById('createPlanBtn');
        const originalText = createPlanBtn?.textContent;
        if (createPlanBtn) {
            createPlanBtn.disabled = true;
            createPlanBtn.textContent = drawerData.editMode ? 'Updating...' : 'Creating...';
        }
        
        try {
            let result;
            
            if (drawerData.editMode && drawerData.planId) {
                // UPDATE existing plan
                console.log('🔄 Updating plan:', drawerData.planId);
                result = await window.ActionPlansService.updateActionPlan(drawerData.planId, {
                    description: description,
                    plays: selectedPlays,
                    updatedAt: new Date().toISOString()
                });
            } else {
                // CREATE new plan
                console.log('✨ Creating new plan for action:', drawerData.actionId);
                console.log('🏢 Account ID:', drawerData.accountId);
                
                result = await window.ActionPlansService.createActionPlan(
                    drawerData.actionId,
                    drawerData.accountId,
                    actionTitle,
                    description,
                    selectedPlays
                );
            }
            
            console.log('💾 Save result:', result);
            
            // ActionPlansService.createActionPlan returns the plan object directly, not {success: true}
            // updateActionPlan returns {success: true, data: plan}
            const isSuccess = drawerData.editMode ? (result && result.success) : (result && result.id);
            
            if (isSuccess) {
                // Show success message
                const message = drawerData.editMode ? 'Action plan updated successfully!' : 'Action plan created successfully!';
                console.log('✅ Success:', message);

                // Show success notification
                if (window.NotificationService) {
                    try {
                        window.NotificationService.showSuccess(message);
                    } catch (notifError) {
                        console.warn('⚠️ Notification service error:', notifError);
                        alert(message);
                    }
                } else {
                    // Fallback: show alert
                    alert(message);
                }

                // Close drawer immediately (optimistic)
                console.log('🚪 Closing drawer...');
                this.closeAddToPlanDrawer();

                // Re-enable the button for next time
                if (createPlanBtn) {
                    createPlanBtn.disabled = false;
                    createPlanBtn.textContent = originalText;
                }

                // Note: No need to manually refresh - the store automatically emits 'action_plan:created'
                // which triggers RecommendationInboxController.refreshInbox() via subscription
                console.log('✅ Action plan created - store will auto-refresh subscribed views');
            } else {
                console.error('❌ Save failed:', result);
                this.showDrawerError('Failed to save action plan. Please try again.');
                
                // Re-enable button on failure
                if (createPlanBtn) {
                    createPlanBtn.disabled = false;
                    createPlanBtn.textContent = originalText;
                }
            }
        } catch (error) {
            console.error('❌ Error saving action plan:', error);

            // Only show error if the plan wasn't actually created
            // Check if this is just a UI error after successful save
            if (!result || !result.id) {
                this.showDrawerError('An error occurred while saving the plan');

                // Re-enable button on error
                if (createPlanBtn) {
                    createPlanBtn.disabled = false;
                    createPlanBtn.textContent = originalText;
                }
            } else {
                // Plan was created successfully, just a UI error - close drawer anyway
                console.log('⚠️ Plan saved but UI error occurred, closing drawer');
                this.closeAddToPlanDrawer();
            }
        }
    }
    
    /**
     * Show error in drawer
     */
    static showDrawerError(message) {
        const errorContainer = document.getElementById('drawerErrorMessage');
        if (errorContainer) {
            errorContainer.textContent = message;
            errorContainer.style.display = 'block';
        }
    }
    
    /**
     * Clear drawer error
     */
    static clearDrawerError() {
        const errorContainer = document.getElementById('drawerErrorMessage');
        if (errorContainer) {
            errorContainer.style.display = 'none';
            errorContainer.textContent = '';
        }
    }

    /**
     * Setup intersection observer for scroll-based viewing
     */
    static setupScrollBasedViewing(container) {
        if (window.actionScrollObserver) {
            window.actionScrollObserver.disconnect();
        }

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const actionCard = entry.target;
                    const actionId = actionCard.getAttribute('data-action-id');
                    
                    if (actionCard.classList.contains('action-new')) {
                        setTimeout(() => {
                            if (entry.isIntersecting) {
                                // TODO: Mark action as viewed
                                dispatcher.dispatch(Actions.markActionAsViewed(actionId));
                            }
                        }, 800);
                    }
                }
            });
        }, {
            threshold: 0.6,
            rootMargin: '0px'
        });

        container.querySelectorAll('.action-card').forEach(card => {
            observer.observe(card);
        });

        window.actionScrollObserver = observer;
    }
    
    /**
     * Show call modal (adapted from PortfolioRenderer)
     */
    static showCallModal(event) {
        console.log('📞 showCallModal called');
        // Hide any existing modal first
        this.hideCallModal();
        
        const callLink = event.target;
        console.log('📞 Call link element:', callLink);
        console.log('📞 Call data attribute:', callLink.getAttribute('data-call-info'));
        
        const callData = JSON.parse(callLink.getAttribute('data-call-info').replace(/&quot;/g, '"'));
        console.log('📞 Parsed call data:', callData);
        
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
                <button class="call-modal-close" onclick="ActionFeedRenderer.hideCallModal()">&times;</button>
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
                        ${callData.relatedSignals.map(signal => {
                            // Get signal polarity and normalize it
                            let polarity = signal.polarity || 'Enrichment';
                            
                            // Business rule: UC-01 signals should be treated as Opportunity
                            if (signal.name && signal.name.includes('Umbrella Use Case Identified')) {
                                polarity = 'Opportunity';
                            }
                            
                            const normalizedPolarity = FormatUtils.normalizePolarityKey(polarity);
                            const polarityDisplay = normalizedPolarity === 'opportunities' ? FormatUtils.normalizePolarityLabel(polarity) : 
                                                   normalizedPolarity === 'risk' ? 'Risk' : 'Enrichment';
                            const polarityClass = normalizedPolarity === 'opportunities' ? 'polarity-opportunities' : 
                                                 normalizedPolarity === 'risk' ? 'polarity-risk' : 'polarity-enrichment';
                            
                            return `
                            <div class="call-modal-signal">
                                <div class="call-modal-signal-header">
                                    <span class="call-modal-signal-priority ${polarityClass}">${polarityDisplay}</span>
                                    <span class="call-modal-signal-name">${SecurityUtils.sanitizeHTML(signal.name)}</span>
                                </div>
                                ${signal.summary ? `<div class="call-modal-signal-summary">${SecurityUtils.sanitizeHTML(signal.summary)}</div>` : ''}
                            </div>
                            `;
                        }).join('')}
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
        
        // Close on overlay click
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) {
                this.hideCallModal();
            }
        });
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
}

// Make ActionFeedRenderer globally available
window.ActionFeedRenderer = ActionFeedRenderer;

