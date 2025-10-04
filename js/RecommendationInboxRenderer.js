// RecommendationInboxRenderer - Two-pane Outlook-style inbox for recommended actions
class RecommendationInboxRenderer {
    
    static selectedActionId = null;
    static cachedActions = [];
    static currentFilters = {
        search: '',
        renewalQuarter: 'all',
        view: 'new'
    };

    /**
     * Main render method for Recommendation Inbox
     */
    static renderInbox(actions, viewState, signals, interactions) {
        const container = document.getElementById('recommendation-inbox');
        if (!container) {
            console.error('Recommendation inbox container not found');
            return;
        }

        console.log('📥 Rendering Recommendation Inbox:', actions.length, 'actions');
        console.log('📊 Store state:', {
            actions: actions.length,
            signals: signals.length,
            interactionsSize: interactions ? interactions.size : 0
        });

        // Sort and filter actions
        const sortedActions = this.sortActions([...actions], viewState);
        const filteredActions = this.filterActions(sortedActions, interactions);

        // Cache for quick access
        this.cachedActions = filteredActions;

        // Build inbox HTML
        const html = `
            <div class="inbox-container">
                ${this.renderToolbar(filteredActions, interactions)}
                <div class="inbox-main">
                    ${this.renderListPane(filteredActions, signals, interactions)}
                    ${this.renderDetailPane(filteredActions, signals)}
                </div>
            </div>
        `;

        container.innerHTML = html;
        this.attachEventListeners(container, signals);

        // Auto-select first item if none selected
        if (!this.selectedActionId && filteredActions.length > 0) {
            this.selectAction(filteredActions[0].id, signals);
        }
    }

    /**
     * Render toolbar with filters and search
     */
    static renderToolbar(actions, interactions) {
        const renewalQuarters = this.generateRenewalQuarters();

        return `
            <div class="inbox-toolbar">
                <div class="inbox-toolbar-left">
                    <h2 class="inbox-title">
                        <i class="fas fa-inbox"></i> Recommended Actions Inbox
                    </h2>
                </div>
                <div class="inbox-toolbar-right">
                    <div class="inbox-search">
                        <i class="fas fa-search"></i>
                        <input type="text" 
                               placeholder="Search recommendations..." 
                               class="inbox-search-input"
                               value="${this.currentFilters.search}">
                    </div>
                    <select class="inbox-filter-select" data-filter="renewalQuarter">
                        <option value="all">Select a Renewal Quarter</option>
                        ${renewalQuarters.map(q => `
                            <option value="${q.value}" ${this.currentFilters.renewalQuarter === q.value ? 'selected' : ''}>
                                ${q.label}
                            </option>
                        `).join('')}
                    </select>
                </div>
            </div>
        `;
    }

    /**
     * Render left pane - list of recommendations
     */
    static renderListPane(actions, signals, interactions) {
        const newCount = actions.filter(a => !this.hasUserInteraction(a, interactions)).length;
        const allCount = actions.length;
        const actedCount = actions.filter(a => this.hasActionPlan(a)).length;
        const dismissedCount = actions.filter(a => this.isDismissed(a, interactions)).length;

        if (actions.length === 0) {
            return `
                <div class="inbox-list-pane">
                    <div class="inbox-list-header">
                        <div class="inbox-view-tabs">
                            <button class="inbox-view-tab ${this.currentFilters.view === 'new' ? 'active' : ''}" data-view="new">
                                New <span class="view-count-tab">${newCount}</span>
                            </button>
                            <button class="inbox-view-tab ${this.currentFilters.view === 'all' ? 'active' : ''}" data-view="all">
                                All <span class="view-count-tab">${allCount}</span>
                            </button>
                            <button class="inbox-view-tab ${this.currentFilters.view === 'acted' ? 'active' : ''}" data-view="acted">
                                Acted On <span class="view-count-tab">${actedCount}</span>
                            </button>
                            <button class="inbox-view-tab ${this.currentFilters.view === 'dismissed' ? 'active' : ''}" data-view="dismissed">
                                Dismissed <span class="view-count-tab">${dismissedCount}</span>
                            </button>
                        </div>
                    </div>
                    <div class="inbox-empty-state">
                        <i class="fas fa-inbox empty-icon"></i>
                        <h3>No recommendations</h3>
                        <p>All caught up! No new recommendations match your filters.</p>
                    </div>
                </div>
            `;
        }

        const listItems = actions.map(action => this.renderListItem(action, signals, interactions)).join('');

        return `
            <div class="inbox-list-pane">
                <div class="inbox-list-header">
                    <div class="inbox-view-tabs">
                        <button class="inbox-view-tab ${this.currentFilters.view === 'new' ? 'active' : ''}" data-view="new">
                            New <span class="view-count-tab">${newCount}</span>
                        </button>
                        <button class="inbox-view-tab ${this.currentFilters.view === 'all' ? 'active' : ''}" data-view="all">
                            All <span class="view-count-tab">${allCount}</span>
                        </button>
                        <button class="inbox-view-tab ${this.currentFilters.view === 'acted' ? 'active' : ''}" data-view="acted">
                            Acted On <span class="view-count-tab">${actedCount}</span>
                        </button>
                        <button class="inbox-view-tab ${this.currentFilters.view === 'dismissed' ? 'active' : ''}" data-view="dismissed">
                            Dismissed <span class="view-count-tab">${dismissedCount}</span>
                        </button>
                    </div>
                </div>
                <div class="inbox-list-items">
                    ${listItems}
                </div>
            </div>
        `;
    }

    /**
     * Render individual list item (compact view)
     */
    static renderListItem(action, signals, interactions) {
        const actionId = action.id || action.action_id;
        const isSelected = this.selectedActionId === actionId;
        const isNew = !this.hasUserInteraction(action, interactions);
        const priority = action.priority || 'Medium';
        const priorityClass = priority.toLowerCase();
        
        const relatedSignals = this.getRelatedSignals(action, signals);
        const signalCounts = this.getSignalCounts(relatedSignals);
        
        const headline = SecurityUtils.sanitizeHTML(action.recommended_action || action.title || 'Recommended Action');
        const accountName = SecurityUtils.sanitizeHTML(action.account_name || 'Unknown Account');
        const whySummary = SecurityUtils.sanitizeHTML(action.whySummary || action.signal_rationale || 'Action recommended based on signal analysis');
        const timeAgo = FormatUtils.formatCommentTime(action.lastUpdated || action.createdAt);
        const confidence = Math.round((action.confidence || 0.85) * 100);
        
        const hasPlan = this.hasActionPlan(action);
        
        return `
            <div class="inbox-list-item ${isSelected ? 'selected' : ''} ${isNew ? 'is-new' : ''} priority-${priorityClass}" 
                 data-action-id="${actionId}"
                 data-account-id="${action.accountId || ''}">
                <div class="list-item-priority-bar priority-bar-${priorityClass}"></div>
                <div class="list-item-content">
                    <div class="list-item-header">
                        ${isNew ? '<span class="list-item-new-dot"></span>' : ''}
                        <span class="list-item-account">${accountName}</span>
                        <span class="list-item-time">${timeAgo}</span>
                    </div>
                    <div class="list-item-title">${headline}</div>
                    <div class="list-item-meta">
                        <span class="list-item-priority priority-${priorityClass}">${priority}</span>
                        <span class="list-item-signals">
                            ${signalCounts.risk > 0 ? `<i class="fas fa-exclamation-triangle text-danger"></i>${signalCounts.risk}` : ''}
                            ${signalCounts.opportunity > 0 ? `<i class="fas fa-arrow-up text-success"></i>${signalCounts.opportunity}` : ''}
                            ${signalCounts.enrichment > 0 ? `<i class="fas fa-info-circle text-info"></i>${signalCounts.enrichment}` : ''}
                        </span>
                        <span class="list-item-confidence">${confidence}%</span>
                    </div>
                    <div class="list-item-preview">${whySummary.substring(0, 70)}${whySummary.length > 70 ? '...' : ''}</div>
                    <div class="list-item-status">
                        ${hasPlan ? '<span class="status-badge status-acted"><i class="fas fa-check-circle"></i> Plan Created</span>' : '<span class="status-badge status-action-required"><i class="fas fa-bolt"></i> Action Required</span>'}
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Render right pane - recommendation details
     */
    static renderDetailPane(actions, signals) {
        if (!this.selectedActionId) {
            return `
                <div class="inbox-detail-pane">
                    <div class="detail-empty-state">
                        <i class="fas fa-mouse-pointer empty-icon"></i>
                        <h3>Select a recommendation</h3>
                        <p>Choose a recommendation from the list to view details</p>
                    </div>
                </div>
            `;
        }

        const action = actions.find(a => (a.id || a.action_id) === this.selectedActionId);
        if (!action) {
            return `
                <div class="inbox-detail-pane">
                    <div class="detail-empty-state">
                        <i class="fas fa-exclamation-circle empty-icon"></i>
                        <h3>Recommendation not found</h3>
                    </div>
                </div>
            `;
        }

        return `
            <div class="inbox-detail-pane">
                ${this.renderDetailHeader(action)}
                ${this.renderDetailContent(action, signals)}
            </div>
        `;
    }

    /**
     * Render detail pane header with action buttons (Outlook-style)
     */
    static renderDetailHeader(action) {
        const accountName = SecurityUtils.sanitizeHTML(action.account_name || 'Unknown Account');
        const headline = SecurityUtils.sanitizeHTML(action.recommended_action || action.title || 'Recommended Action');
        const priority = action.priority || 'Medium';
        const priorityClass = priority.toLowerCase();
        const timeAgo = FormatUtils.formatCommentTime(action.lastUpdated || action.createdAt);
        const confidence = Math.round((action.confidence || 0.85) * 100);
        const status = action.status || 'PENDING';
        
        const existingPlan = this.getActionPlanForActionId(action.id);
        
        // Get feedback counts and user's feedback
        const actionId = action.id || action.action_id;
        const counts = typeof ActionFeedbackService !== 'undefined' 
            ? ActionFeedbackService.getActionCounts(actionId) 
            : { useful: 0, notRelevant: 0 };
        const userFeedback = typeof ActionFeedbackService !== 'undefined'
            ? ActionFeedbackService.getUserActionFeedback(actionId)
            : null;
        
        const isUseful = userFeedback === 'useful';
        const isNotRelevant = userFeedback === 'not_relevant';
        
        console.log(`🎨 Rendering action ${actionId} - userFeedback: ${userFeedback}, isUseful: ${isUseful}, isNotRelevant: ${isNotRelevant}, counts:`, counts);
        
        return `
            <div class="detail-header">
                <div class="detail-header-top">
                    <button class="detail-back-btn" title="Back to list">
                        <i class="fas fa-arrow-left"></i>
                    </button>
                    <div class="detail-account-info">
                        <i class="fas fa-building"></i>
                        <span>${accountName}</span>
                    </div>
                    <div class="detail-actions">
                        ${existingPlan ? `
                            <button class="detail-action-btn btn-primary" data-action="edit-plan" title="Edit Plan">
                                <i class="fas fa-edit"></i> Edit Plan
                            </button>
                        ` : `
                            <button class="detail-action-btn btn-primary" data-action="create-plan" title="Create Action Plan">
                                <i class="fas fa-bolt"></i> Create Plan
                            </button>
                        `}
                        <button class="detail-action-btn btn-secondary ${isUseful ? 'active-useful' : ''}" 
                                data-action="useful" 
                                title="${isUseful ? 'Remove Useful Mark' : 'Mark as Useful'}">
                            <i class="${isUseful ? 'fas' : 'far'} fa-thumbs-up"></i>
                            ${isUseful ? '<i class="fas fa-check-circle feedback-check"></i>' : ''}
                            ${counts.useful > 0 ? `<span class="count-badge">${counts.useful}</span>` : ''}
                        </button>
                        <button class="detail-action-btn btn-secondary ${isNotRelevant ? 'active-not-relevant' : ''}" 
                                data-action="not-relevant" 
                                title="${isNotRelevant ? 'Remove Not Relevant Mark' : 'Mark as Not Relevant'}">
                            <i class="${isNotRelevant ? 'fas' : 'far'} fa-thumbs-down"></i>
                            ${isNotRelevant ? '<i class="fas fa-check-circle feedback-check"></i>' : ''}
                            ${counts.notRelevant > 0 ? `<span class="count-badge">${counts.notRelevant}</span>` : ''}
                        </button>
                        <div class="detail-more-dropdown">
                            <button class="detail-action-btn btn-secondary" data-action="more" title="More Actions">
                                <i class="fas fa-ellipsis-v"></i>
                            </button>
                            <div class="detail-more-menu" style="display: none;">
                                <button data-action="snooze"><i class="fas fa-clock"></i> Snooze</button>
                                <button data-action="share"><i class="fas fa-share"></i> Share</button>
                                <button data-action="assign"><i class="fas fa-user-plus"></i> Assign to...</button>
                                <button data-action="copy-link"><i class="fas fa-link"></i> Copy Link</button>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="detail-header-bottom">
                    <div class="detail-title-section">
                        <span class="detail-priority priority-${priorityClass}">
                            <i class="fas fa-flag"></i> ${priority.toUpperCase()} PRIORITY
                        </span>
                        <h2 class="detail-title">${headline}</h2>
                        <div class="detail-meta">
                            <span class="detail-meta-item">
                                <i class="fas fa-clock"></i> ${timeAgo}
                            </span>
                            <span class="detail-meta-item">
                                <i class="fas fa-chart-line"></i> Confidence: ${confidence}%
                            </span>
                            <span class="detail-meta-item detail-status-${status.toLowerCase()}">
                                <i class="fas ${status === 'PENDING' ? 'fa-bolt' : 'fa-check-circle'}"></i> 
                                ${status === 'PENDING' ? 'Action Required' : 'Plan Created'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Render detail pane content sections
     */
    static renderDetailContent(action, signals) {
        console.log('🎨 renderDetailContent called:', {
            actionId: action.id || action.action_id,
            accountId: action.accountId || action.account_id,
            signalsArrayLength: signals?.length || 0,
            actionRelatedSignalsLength: action.relatedSignals?.length || 0
        });
        
        const relatedSignals = this.getRelatedSignals(action, signals);
        console.log('📊 Related signals after getRelatedSignals:', relatedSignals?.length || 0);
        
        const whySummary = SecurityUtils.sanitizeHTML(action.whySummary || action.signal_rationale || 'Action recommended based on signal analysis');
        const plays = action.plays || [];

        return `
            <div class="detail-content">
                ${this.renderWhySection(whySummary, action)}
                ${this.renderSignalsSection(relatedSignals)}
                ${this.renderPlaysSection(action, plays)}
                ${this.renderRelatedCallsSection(action, relatedSignals)}
                ${this.renderCommentsSection(action)}
            </div>
        `;
    }

    /**
     * Render "Why This Matters" section
     */
    static renderWhySection(whySummary, action) {
        return `
            <div class="detail-section">
                <div class="section-header">
                    <h3><i class="fas fa-lightbulb"></i> Why This Matters</h3>
                </div>
                <div class="section-content">
                    <p class="why-summary">${whySummary}</p>
                </div>
            </div>
        `;
    }

    /**
     * Render signals section
     */
    static renderSignalsSection(signals) {
        console.log('🔍 renderSignalsSection called with:', signals?.length || 0, 'signals');
        if (!signals || signals.length === 0) {
            console.log('⚠️ No signals to render');
            return '';
        }

        const signalCounts = this.getSignalCounts(signals);
        const riskSignals = signals.filter(s => {
            const polarity = s.signal_polarity || s['Signal Polarity'] || '';
            return FormatUtils.normalizePolarityKey(polarity) === 'risk';
        });
        const opportunitySignals = signals.filter(s => {
            const polarity = s.signal_polarity || s['Signal Polarity'] || '';
            return FormatUtils.normalizePolarityKey(polarity) === 'growth levers';
        });
        const enrichmentSignals = signals.filter(s => {
            const polarity = s.signal_polarity || s['Signal Polarity'] || '';
            const norm = FormatUtils.normalizePolarityKey(polarity);
            return norm !== 'risk' && norm !== 'growth levers';
        });

        return `
            <div class="detail-section detail-section-signals">
                <div class="section-header section-header-expandable" data-section="signals">
                    <h3>
                        <i class="fas fa-signal"></i> Signals Driving This Recommendation
                        <span class="signal-summary">
                            ${signalCounts.risk > 0 ? `<span class="signal-count risk-count"><i class="fas fa-exclamation-triangle"></i> ${signalCounts.risk}</span>` : ''}
                            ${signalCounts.opportunity > 0 ? `<span class="signal-count opportunity-count"><i class="fas fa-arrow-up"></i> ${signalCounts.opportunity}</span>` : ''}
                            ${signalCounts.enrichment > 0 ? `<span class="signal-count enrichment-count"><i class="fas fa-info-circle"></i> ${signalCounts.enrichment}</span>` : ''}
                        </span>
                    </h3>
                    <button class="section-toggle"><i class="fas fa-chevron-up"></i></button>
                </div>
                <div class="section-content section-content-collapsible section-expanded" data-section-content="signals">
                    ${riskSignals.length > 0 ? this.renderSignalGroup('Risk Signals', riskSignals, 'risk') : ''}
                    ${opportunitySignals.length > 0 ? this.renderSignalGroup('Opportunity Signals', opportunitySignals, 'opportunity') : ''}
                    ${enrichmentSignals.length > 0 ? this.renderSignalGroup('Enrichment Signals', enrichmentSignals, 'enrichment') : ''}
                </div>
            </div>
        `;
    }

    /**
     * Render signal group
     */
    static renderSignalGroup(title, signals, type) {
        const icon = type === 'risk' ? 'fa-exclamation-triangle' : type === 'opportunity' ? 'fa-arrow-up' : 'fa-info-circle';
        const colorClass = type === 'risk' ? 'text-danger' : type === 'opportunity' ? 'text-success' : 'text-info';

        return `
            <div class="signal-group signal-group-${type}">
                <h4 class="signal-group-title">
                    <i class="fas ${icon} ${colorClass}"></i> ${title} (${signals.length})
                </h4>
                <div class="signal-cards">
                    ${signals.map(signal => this.renderSignalCard(signal, type)).join('')}
                </div>
            </div>
        `;
    }

    /**
     * Render individual signal card
     */
    static renderSignalCard(signal, type) {
        const signalName = SecurityUtils.sanitizeHTML(signal.name || 'Unnamed Signal');
        const summary = SecurityUtils.sanitizeHTML(signal.summary || signal.signal_summary || '');
        const confidence = Math.round((signal.confidence || 0) * 100);
        const date = FormatUtils.formatDateSimple(signal.created_at || signal.call_date);

        return `
            <div class="signal-card signal-card-${type}">
                <div class="signal-card-header">
                    <span class="signal-name">${signalName}</span>
                    <span class="signal-confidence">${confidence}%</span>
                </div>
                ${summary ? `<div class="signal-summary">${summary}</div>` : ''}
                <div class="signal-footer">
                    <span class="signal-date"><i class="fas fa-calendar"></i> ${date}</span>
                </div>
            </div>
        `;
    }

    /**
     * Render recommended plays section
     */
    static renderPlaysSection(action, plays) {
        if (!plays || plays.length === 0) {
            return '';
        }

        const validPlays = plays.filter(play => play && play.name && play.name !== 'N/A');
        if (validPlays.length === 0) {
            return '';
        }

        return `
            <div class="detail-section detail-section-plays">
                <div class="section-header">
                    <h3><i class="fas fa-play-circle"></i> Recommended CS Plays (${validPlays.length})</h3>
                </div>
                <div class="section-content">
                    <p class="section-instruction">Select plays to include in your action plan:</p>
                    <div class="plays-list">
                        ${validPlays.map((play, index) => this.renderPlayCard(action, play, index)).join('')}
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Render individual play card
     */
    static renderPlayCard(action, play, index) {
        const playTitle = SecurityUtils.sanitizeHTML(play.name || play.title || 'Untitled Play');
        const playDescription = SecurityUtils.sanitizeHTML(play.description || play.full_description || 'No description available');
        const executingRole = SecurityUtils.sanitizeHTML(play.executing_role || play.executingRole || 'CS Team');
        const playId = play.id || play.name;

        return `
            <div class="play-card">
                <input type="checkbox" 
                       id="play-${action.id}-${index}" 
                       class="play-checkbox"
                       data-action-id="${action.id}"
                       data-play-id="${playId}"
                       ${play.recommended ? 'checked' : ''}>
                <label for="play-${action.id}-${index}" class="play-card-label">
                    <div class="play-card-header">
                        <span class="play-title">${playTitle}</span>
                        ${play.recommended ? '<span class="play-recommended-badge"><i class="fas fa-star"></i> Recommended</span>' : ''}
                    </div>
                    <div class="play-description">${playDescription}</div>
                    <div class="play-footer">
                        <span class="play-owner"><i class="fas fa-user"></i> ${executingRole}</span>
                    </div>
                </label>
            </div>
        `;
    }

    /**
     * Render related calls section
     */
    static renderRelatedCallsSection(action, signals) {
        console.log('🔍 renderRelatedCallsSection called:', {
            actionId: action.id || action.action_id,
            signalsCount: signals?.length || 0
        });
        const relatedCalls = ActionFeedRenderer.getRelatedCallsForAction(action.id || action.action_id, signals);
        console.log('📞 Found related calls:', relatedCalls?.length || 0);
        
        if (!relatedCalls || relatedCalls.length === 0) {
            console.log('⚠️ No related calls to render');
            return '';
        }

        return `
            <div class="detail-section detail-section-calls">
                <div class="section-header section-header-expandable" data-section="calls">
                    <h3><i class="fas fa-phone"></i> Related Calls (${relatedCalls.length})</h3>
                    <button class="section-toggle"><i class="fas fa-chevron-up"></i></button>
                </div>
                <div class="section-content section-content-collapsible section-expanded" data-section-content="calls">
                    <div class="calls-list">
                        ${relatedCalls.map(call => this.renderCallCard(call)).join('')}
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Render individual call card
     */
    static renderCallCard(call) {
        const callTitle = SecurityUtils.sanitizeHTML(call.title);
        const callDate = FormatUtils.formatDateSimple(call.date);
        const attendees = SecurityUtils.sanitizeHTML(call.attendees || '');

        const callData = JSON.stringify({
            title: call.title,
            date: call.date,
            attendees: call.attendees,
            recap: call.recap,
            url: call.url,
            relatedSignals: call.relatedSignals
        }).replace(/"/g, '&quot;');

        return `
            <div class="call-card" data-call-info="${callData}">
                <div class="call-card-header">
                    <i class="fas fa-video call-icon"></i>
                    <div class="call-info">
                        <div class="call-title">${callTitle}</div>
                        <div class="call-meta">
                            <span class="call-date"><i class="fas fa-calendar"></i> ${callDate}</span>
                            ${attendees ? `<span class="call-attendees"><i class="fas fa-users"></i> ${attendees}</span>` : ''}
                        </div>
                    </div>
                </div>
                ${call.url ? `<a href="${SecurityUtils.sanitizeHTML(call.url)}" target="_blank" class="call-link"><i class="fas fa-external-link-alt"></i> View Recording</a>` : ''}
            </div>
        `;
    }

    /**
     * Render comments section
     */
    static renderCommentsSection(action) {
        return `
            <div class="detail-section detail-section-comments">
                <div class="section-header">
                    <h3><i class="fas fa-comments"></i> Comments & Collaboration</h3>
                </div>
                <div class="section-content">
                    <div class="comment-input-container">
                        <textarea class="comment-input" placeholder="Add a comment or @mention a colleague..." rows="2"></textarea>
                        <button class="btn-primary comment-submit-btn">
                            <i class="fas fa-paper-plane"></i> Comment
                        </button>
                    </div>
                    <div class="comments-list" id="comments-${action.id}">
                        <p class="no-comments">No comments yet. Be the first to comment!</p>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Attach event listeners
     */
    static attachEventListeners(container, signals) {
        // List item click - select action
        container.addEventListener('click', (e) => {
            // Detail actions - check this FIRST and stop propagation immediately
            const actionBtn = e.target.closest('[data-action]');
            if (actionBtn) {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation(); // Prevent other handlers on the same element
                const action = actionBtn.getAttribute('data-action');
                this.handleAction(action, e);
                return; // Exit early
            }

            const listItem = e.target.closest('.inbox-list-item');
            if (listItem) {
                const actionId = listItem.getAttribute('data-action-id');
                this.selectAction(actionId, signals);
                return; // Exit early
            }

            // Section toggle
            const toggleBtn = e.target.closest('.section-toggle');
            if (toggleBtn) {
                const header = toggleBtn.closest('.section-header-expandable');
                const section = header.getAttribute('data-section');
                const content = container.querySelector(`[data-section-content="${section}"]`);
                if (content) {
                    const isExpanded = content.classList.contains('section-expanded');
                    if (isExpanded) {
                        content.classList.remove('section-expanded');
                        content.classList.add('collapsed');
                        toggleBtn.querySelector('i').classList.remove('fa-chevron-up');
                        toggleBtn.querySelector('i').classList.add('fa-chevron-down');
                    } else {
                        content.classList.remove('collapsed');
                        content.classList.add('section-expanded');
                        toggleBtn.querySelector('i').classList.remove('fa-chevron-down');
                        toggleBtn.querySelector('i').classList.add('fa-chevron-up');
                    }
                }
            }

            // Call card click
            const callCard = e.target.closest('.call-card');
            if (callCard && !e.target.closest('.call-link')) {
                ActionFeedRenderer.showCallModal({ target: callCard });
            }

            // Back button
            const backBtn = e.target.closest('.detail-back-btn');
            if (backBtn) {
                const listPane = container.querySelector('.inbox-list-pane');
                const detailPane = container.querySelector('.inbox-detail-pane');
                if (listPane && detailPane) {
                    listPane.classList.remove('mobile-hidden');
                    detailPane.classList.remove('mobile-visible');
                }
            }
        });

        // View filter tabs
        container.addEventListener('click', (e) => {
            const viewTab = e.target.closest('.inbox-view-tab');
            if (viewTab) {
                const view = viewTab.getAttribute('data-view');
                this.currentFilters.view = view;
                
                // Update active state
                container.querySelectorAll('.inbox-view-tab').forEach(btn => btn.classList.remove('active'));
                viewTab.classList.add('active');
                
                // Re-render
                this.refreshView();
            }
        });

        // Search input
        const searchInput = container.querySelector('.inbox-search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.currentFilters.search = e.target.value;
                this.refreshView();
            });
        }

        // Renewal quarter filter
        const renewalSelect = container.querySelector('[data-filter="renewalQuarter"]');
        if (renewalSelect) {
            renewalSelect.addEventListener('change', (e) => {
                this.currentFilters.renewalQuarter = e.target.value;
                this.refreshView();
            });
        }
    }

    /**
     * Select an action and show its details
     */
    static selectAction(actionId, signals) {
        this.selectedActionId = actionId;
        
        // Update list item selection
        document.querySelectorAll('.inbox-list-item').forEach(item => {
            item.classList.remove('selected');
            if (item.getAttribute('data-action-id') === actionId) {
                item.classList.add('selected');
            }
        });

        // Re-render detail pane
        const action = this.cachedActions.find(a => (a.id || a.action_id) === actionId);
        if (action) {
            const detailPane = document.querySelector('.inbox-detail-pane');
            if (detailPane) {
                detailPane.innerHTML = `
                    ${this.renderDetailHeader(action)}
                    ${this.renderDetailContent(action, signals)}
                `;
            }

            // Mark as viewed
            setTimeout(() => {
                dispatcher.dispatch(Actions.markActionAsViewed(actionId));
            }, 800);

            // Mobile: show detail pane
            const listPane = document.querySelector('.inbox-list-pane');
            if (listPane && detailPane) {
                listPane.classList.add('mobile-hidden');
                detailPane.classList.add('mobile-visible');
            }
        }
    }

    /**
     * Handle action button clicks
     */
    static handleAction(actionType, event) {
        // Prevent double-triggering from event bubbling
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }

        // Debounce: Prevent double-clicks within 100ms
        const now = Date.now();
        const debounceKey = `${actionType}-${this.selectedActionId}`;
        if (this.lastActionTime && this.lastActionKey === debounceKey && (now - this.lastActionTime) < 100) {
            console.log('⏭️ Skipping duplicate action within 100ms');
            return;
        }
        this.lastActionTime = now;
        this.lastActionKey = debounceKey;

        const action = this.cachedActions.find(a => (a.id || a.action_id) === this.selectedActionId);
        if (!action) return;

        const actionId = action.id || action.action_id;
        const accountId = action.accountId || action.account_id;
        const actionTitle = action.recommended_action || action.title || 'Recommended Action';

        switch (actionType) {
            case 'create-plan':
            case 'edit-plan':
                ActionFeedRenderer.openAddToPlanDrawer(actionId, actionTitle, accountId);
                break;
            case 'useful':
                dispatcher.dispatch(Actions.markActionUseful(actionId));
                break;
            case 'not-relevant':
                dispatcher.dispatch(Actions.markActionNotRelevant(actionId));
                break;
            case 'more':
                const menu = event.target.closest('.detail-more-dropdown').querySelector('.detail-more-menu');
                if (menu) {
                    menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
                }
                break;
            case 'snooze':
                console.log('Snooze action:', actionId);
                // TODO: Implement snooze functionality
                break;
            case 'share':
                console.log('Share action:', actionId);
                // TODO: Implement share functionality
                break;
            case 'assign':
                console.log('Assign action:', actionId);
                // TODO: Implement assign functionality
                break;
            case 'copy-link':
                console.log('Copy link:', actionId);
                // TODO: Implement copy link functionality
                break;
        }
    }

    /**
     * Filter actions based on current filters
     */
    static filterActions(actions, interactions) {
        let filtered = [...actions];

        // Filter by view
        switch (this.currentFilters.view) {
            case 'new':
                filtered = filtered.filter(a => !this.hasUserInteraction(a, interactions));
                break;
            case 'acted':
                filtered = filtered.filter(a => this.hasActionPlan(a));
                break;
            case 'dismissed':
                filtered = filtered.filter(a => this.isDismissed(a, interactions));
                break;
            // 'all' - no filter
        }

        // Filter by renewal quarter
        if (this.currentFilters.renewalQuarter !== 'all') {
            const beforeCount = filtered.length;
            filtered = filtered.filter(a => this.matchesRenewalQuarter(a, this.currentFilters.renewalQuarter));
            console.log(`🗓️ Renewal filter '${this.currentFilters.renewalQuarter}': ${beforeCount} → ${filtered.length} actions`);
        }

        // Filter by search
        if (this.currentFilters.search) {
            const search = this.currentFilters.search.toLowerCase();
            filtered = filtered.filter(a => {
                const title = (a.recommended_action || a.title || '').toLowerCase();
                const account = (a.account_name || '').toLowerCase();
                const summary = (a.whySummary || a.signal_rationale || '').toLowerCase();
                return title.includes(search) || account.includes(search) || summary.includes(search);
            });
        }

        return filtered;
    }
    
    /**
     * Check if action matches renewal quarter filter
     */
    static matchesRenewalQuarter(action, quarterFilter) {
        if (quarterFilter === 'all') return true;
        
        const renewalDate = action.renewal_date || action.renewalDate;
        if (!renewalDate) {
            console.log(`⚠️ No renewal date for action: ${action.action_id}`, action);
            return false; // No renewal date, exclude from filtered results
        }
        
        // Parse the renewal date
        const date = new Date(renewalDate);
        if (isNaN(date.getTime())) return false; // Invalid date
        
        const renewalMonth = date.getMonth(); // 0-11
        const renewalYear = date.getFullYear();
        
        // Determine FY and Quarter for the renewal date (FY starts Feb 1)
        let renewalFY = renewalMonth >= 1 ? renewalYear + 1 : renewalYear; // Feb-Dec = next year, Jan = current year
        
        let renewalQuarter;
        if (renewalMonth >= 1 && renewalMonth <= 3) renewalQuarter = 1; // Feb, Mar, Apr = Q1
        else if (renewalMonth >= 4 && renewalMonth <= 6) renewalQuarter = 2; // May, Jun, Jul = Q2
        else if (renewalMonth >= 7 && renewalMonth <= 9) renewalQuarter = 3; // Aug, Sep, Oct = Q3
        else renewalQuarter = 4; // Nov, Dec, Jan = Q4
        
        // Handle "beyond" filter (all quarters beyond current +4)
        if (quarterFilter === 'beyond') {
            const today = new Date();
            const currentMonth = today.getMonth();
            const currentYear = today.getFullYear();
            const currentFY = currentMonth >= 1 ? currentYear + 1 : currentYear;
            
            let currentQuarter;
            if (currentMonth >= 1 && currentMonth <= 3) currentQuarter = 1;
            else if (currentMonth >= 4 && currentMonth <= 6) currentQuarter = 2;
            else if (currentMonth >= 7 && currentMonth <= 9) currentQuarter = 3;
            else currentQuarter = 4;
            
            // Calculate quarters from now
            const currentQuarterTotal = (currentFY - 2000) * 4 + currentQuarter;
            const renewalQuarterTotal = (renewalFY - 2000) * 4 + renewalQuarter;
            const quartersDiff = renewalQuarterTotal - currentQuarterTotal;
            
            return quartersDiff > 4; // Beyond current +4
        }
        
        // Parse the filter (e.g., "FY2026Q2")
        const match = quarterFilter.match(/FY(\d{4})Q(\d)/);
        if (!match) return false;
        
        const filterFY = parseInt(match[1]);
        const filterQ = parseInt(match[2]);
        
        return renewalFY === filterFY && renewalQuarter === filterQ;
    }

    /**
     * Sort actions - default to created_at desc
     */
    static sortActions(actions, viewState) {
        return actions.sort((a, b) => {
            const dateA = new Date(a.created_at || a.createdAt || 0);
            const dateB = new Date(b.created_at || b.createdAt || 0);
            return dateB - dateA; // Descending (newest first)
        });
    }
    
    /**
     * Generate renewal quarter options (FY starts Feb 1)
     */
    static generateRenewalQuarters() {
        const quarters = [];
        const today = new Date();
        const currentMonth = today.getMonth(); // 0-11
        const currentYear = today.getFullYear();
        
        // Determine current FY (starts Feb 1)
        const currentFY = currentMonth >= 1 ? currentYear + 1 : currentYear; // Feb-Dec = next year, Jan = current year
        
        // Determine current quarter (Q1=Feb-Apr, Q2=May-Jul, Q3=Aug-Oct, Q4=Nov-Jan)
        let currentQuarter;
        if (currentMonth >= 1 && currentMonth <= 3) currentQuarter = 1; // Feb, Mar, Apr
        else if (currentMonth >= 4 && currentMonth <= 6) currentQuarter = 2; // May, Jun, Jul
        else if (currentMonth >= 7 && currentMonth <= 9) currentQuarter = 3; // Aug, Sep, Oct
        else currentQuarter = 4; // Nov, Dec, Jan
        
        // Generate quarters: Current-1, Current, Current+1, +2, +3, +4
        for (let offset = -1; offset <= 4; offset++) {
            let fy = currentFY;
            let q = currentQuarter + offset;
            
            // Handle quarter rollover
            while (q > 4) {
                q -= 4;
                fy++;
            }
            while (q < 1) {
                q += 4;
                fy--;
            }
            
            quarters.push({
                label: `FY${fy.toString().substring(2)} Q${q}`,
                value: `FY${fy}Q${q}`,
                fy: fy,
                quarter: q
            });
        }
        
        // Add "All Beyond" option
        quarters.push({
            label: 'All Beyond',
            value: 'beyond',
            fy: null,
            quarter: null
        });
        
        return quarters;
    }

    /**
     * Get related signals
     */
    static getRelatedSignals(action, signals) {
        // Use action's embedded relatedSignals if available (from getRecommendedActions)
        if (action.relatedSignals && action.relatedSignals.length > 0) {
            console.log('✅ Using action.relatedSignals:', action.relatedSignals.length);
            return action.relatedSignals;
        }
        // Fallback to filtering full signals list
        console.log('⚠️ Fallback: filtering signals array');
        const filtered = ActionFeedRenderer.getRelatedSignals(action, signals);
        console.log('📊 Filtered signals:', filtered?.length || 0);
        return filtered;
    }

    /**
     * Get signal counts
     */
    static getSignalCounts(signals) {
        return ActionFeedRenderer.getSignalCounts(signals);
    }

    /**
     * Get action plan for action
     */
    static getActionPlanForActionId(actionId) {
        return ActionFeedRenderer.getActionPlanForActionId(actionId);
    }

    /**
     * Check if user has interacted with action
     */
    static hasUserInteraction(action, interactions) {
        return ActionFeedRenderer.hasUserInteraction(action, interactions);
    }

    /**
     * Check if action has a plan
     */
    static hasActionPlan(action) {
        return !!this.getActionPlanForActionId(action.id || action.action_id);
    }

    /**
     * Check if action is dismissed
     */
    static isDismissed(action, interactions) {
        if (!interactions || !action.id) return false;
        const actionInteractions = interactions.get(action.id) || [];
        return actionInteractions.some(i => i.interactionType === 'not_relevant');
    }

    /**
     * Refresh the view
     */
    static refreshView() {
        const state = signalsStore.getState();
        const actions = signalsStore.getRecommendedActions() || [];
        const signals = state.signals || [];
        const interactions = state.actionInteractions || new Map();
        
        this.renderInbox(actions, state.viewState || {}, signals, interactions);
    }
}

// Make globally available
window.RecommendationInboxRenderer = RecommendationInboxRenderer;

