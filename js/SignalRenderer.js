// Signal Renderer - Pure view for rendering signal feed
class SignalRenderer {

    static renderSignalFeed(signals, viewState, comments, interactions, actionPlans) {
        const container = document.getElementById('signalsList');
        if (!container) return;

        // Sort signals by priority and date
        const sortedSignals = [...signals].sort((a, b) => {
            // 1. Priority - high, medium, low
            const priorityOrder = { 'High': 3, 'Medium': 2, 'Low': 1 };
            const priorityA = priorityOrder[a.priority] || 0;
            const priorityB = priorityOrder[b.priority] || 0;

            if (priorityA !== priorityB) {
                return priorityB - priorityA;
            }

            // 2. Signal Polarity - Risk, Opportunities, Enrichment
            const polarityOrder = { 'Risk': 3, 'Opportunities': 2, 'Enrichment': 1 };
            const polarityA = a.signal_polarity || a['Signal Polarity'] || 'Enrichment';
            const polarityB = b.signal_polarity || b['Signal Polarity'] || 'Enrichment';
            const polarityScoreA = polarityOrder[polarityA] || 0;
            const polarityScoreB = polarityOrder[polarityB] || 0;

            if (polarityScoreA !== polarityScoreB) {
                return polarityScoreB - polarityScoreA;
            }

            // 3. call_date DESC
            const dateA = new Date(a.call_date);
            const dateB = new Date(b.call_date);
            return dateB - dateA;
        });

        // Filter signals based on any user interaction
        const newSignals = sortedSignals.filter(signal => !this.hasUserInteraction(signal, viewState, interactions, actionPlans));
        const viewedSignals = sortedSignals.filter(signal => this.hasUserInteraction(signal, viewState, interactions, actionPlans));

        let html = '';

        // Add new signals section header
        html += this.renderNewSignalsHeader(newSignals.length);

        newSignals.forEach(signal => {
            html += this.renderSignalCard(signal, comments, true);
        });

        if (newSignals.length > 0 && viewedSignals.length > 0) {
            html += this.renderSeparator();
        }

        viewedSignals.forEach(signal => {
            html += this.renderSignalCard(signal, comments, false);
        });

        container.innerHTML = html;
        this.attachEventListeners(container);
    }

    static renderSignalCard(signal, comments, isNew) {
        // Safety check for signal data
        if (!signal || !signal.id) {
            console.error('Invalid signal data:', signal);
            return '';
        }

        const feedbackClass = signal.currentUserFeedback ? `signal-${signal.currentUserFeedback}` : '';
        const feedbackStyle = this.getFeedbackStyle(signal);
        const likeButtonHtml = this.getLikeButtonHtml(signal);
        const notAccurateButtonHtml = this.getNotAccurateButtonHtml(signal);
        const priority = signal.priority || 'Low';
        const cardClass = isNew ? 'signal-new' : 'signal-viewed';
        const priorityClass = priority.toLowerCase();

        // Ensure required fields have fallback values and sanitize user content
        const accountName = SecurityUtils.sanitizeHTML(signal.account_name || 'Unknown Account');
        const signalName = SecurityUtils.sanitizeHTML(signal.name || 'Unnamed Signal');
        const summary = SecurityUtils.sanitizeHTML(signal.summary || 'No summary available');
        const rationale = SecurityUtils.sanitizeHTML(signal.rationale || 'No rationale provided');
        const category = SecurityUtils.sanitizeHTML(signal.category || 'General');
        
        // Get Signal Polarity for pill display
        const signalPolarity = signal.signal_polarity || signal['Signal Polarity'] || 'Enrichment';
        const polarityClass = signalPolarity.toLowerCase();

        return `
            <div class="signal-card ${cardClass} ${priorityClass}-priority ${feedbackClass}" data-signal-id="${signal.id}" style="${feedbackStyle}">
                <div class="signal-header">
                    <div class="signal-info">
                        <div class="signal-title">${accountName}</div>
                        <div class="signal-meta">
                            <span><i class="${signal.source_icon || 'fas fa-info-circle'}"></i> ${signalName}</span>
                            <span class="category-badge">${category}</span>
                            <span class="priority-badge priority-${priorityClass}">${priority}</span>
                            <span class="polarity-badge polarity-${polarityClass}">${FormatUtils.normalizePolarityLabel(signalPolarity)}</span>
                            <span>${FormatUtils.formatDate(signal.created_at || signal.created_date)}</span>
                            ${isNew ? '<span class="new-badge">NEW</span>' : ''}
                        </div>
                    </div>
                    <button class="signal-close-btn" data-action="remove-signal" data-signal-id="${signal.id}">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="signal-summary">
                    <div class="summary-text">${summary}</div>
                    <div class="rationale-text">
                        <strong>Here's what we noticed:</strong> ${rationale}
                    </div>
                </div>
                <div class="signal-footer">
                    <span class="confidence">Confidence: ${Math.round(signal.confidence * 100)}%</span>
                    <div class="signal-actions">
                        ${likeButtonHtml}
                        ${notAccurateButtonHtml}
                    </div>
                </div>
                ${this.renderInlineCommentsSection(signal.id, comments)}
            </div>
        `;
    }

    static renderSeparator() {
        return `
            <div class="signal-separator">
                <div class="separator-line"></div>
                <div class="separator-text">
                    <i class="fas fa-eye"></i>
                    Previously Viewed Signals
                </div>
                <div class="separator-line"></div>
            </div>
        `;
    }

    static renderNewSignalsHeader(count) {
        if (count === 0) return '';
        
        return `
            <div class="signals-section-header new-signals">
                <div class="section-header-content">
                    <i class="fas fa-bell"></i>
                    <h3>New Signals (${count})</h3>
                    <span class="section-subtitle">Scroll through signals to mark them as viewed</span>
                </div>
            </div>
        `;
    }

    static renderInlineCommentsSection(signalId, comments) {
        const signalComments = comments.get(signalId) || [];
        
        // Only show comments section if there are comments or to allow adding new ones
        return `
            <div class="linkedin-comments-section">
                <div class="comments-header">
                    <span class="comments-count">${signalComments.length} comment${signalComments.length !== 1 ? 's' : ''}</span>
                </div>
                ${signalComments.length > 0 ? `
                <div class="comments-list-linkedin">
                    ${signalComments.map(comment => `
                        <div class="comment-linkedin">
                            <div class="comment-avatar">
                                <span class="avatar-initials">${FormatUtils.getInitials(comment.author)}</span>
                            </div>
                            <div class="comment-content">
                                <div class="comment-header">
                                    <span class="comment-author">${SecurityUtils.sanitizeHTML(comment.author)}</span>
                                    <span class="comment-time">${FormatUtils.formatCommentTime(comment.timestamp)}</span>
                                </div>
                                <div class="comment-text" id="comment-text-${comment.id}">${SecurityUtils.sanitizeHTML(comment.text)}</div>
                                <div class="comment-actions">
                                    <button class="comment-action-btn" data-action="edit-comment" data-comment-id="${comment.id}" data-signal-id="${signalId}">
                                        <i class="fas fa-edit"></i> Edit
                                    </button>
                                    <button class="comment-action-btn delete-btn" data-action="delete-comment" data-comment-id="${comment.id}" data-signal-id="${signalId}">
                                        <i class="fas fa-trash"></i> Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
                ` : ''}
                <div class="add-comment-linkedin">
                    <div class="comment-input-avatar">
                        <span class="avatar-initials">JS</span>
                    </div>
                    <div class="comment-input-container">
                        <input type="text" id="inlineCommentText-${signalId}" placeholder="Write a comment..." class="comment-input-linkedin">
                        <button class="comment-submit-btn" data-action="add-comment" data-signal-id="${signalId}">Comment</button>
                    </div>
                </div>
            </div>
        `;
    }

    static getFeedbackStyle(signal) {
        if (signal.currentUserFeedback === 'like') {
            return 'background-color: #d4f6d4; border-left: 4px solid #28a745; border: 1px solid #c3e6cb;';
        } else if (signal.currentUserFeedback === 'not-accurate') {
            return 'background-color: #f8d7da; border-left: 4px solid #dc3545; border: 1px solid #f5c6cb;';
        }
        return '';
    }

    static getLikeButtonHtml(signal) {
        const likeCount = signal.likeCount || 0;
        const isLiked = signal.currentUserFeedback === 'like';
        
        if (isLiked) {
            return `<button class="btn btn-secondary liked-btn" data-action="like" data-signal-id="${signal.id}">
                <i class="fas fa-check"></i> Liked! ${likeCount > 0 ? `(${likeCount})` : ''}
            </button>`;
        } else {
            return `<button class="btn btn-secondary" data-action="like" data-signal-id="${signal.id}">
                <i class="fas fa-thumbs-up"></i> Like ${likeCount > 0 ? `(${likeCount})` : ''}
            </button>`;
        }
    }

    static getNotAccurateButtonHtml(signal) {
        const notAccurateCount = signal.notAccurateCount || 0;
        const isNotAccurate = signal.currentUserFeedback === 'not-accurate';
        
        if (isNotAccurate) {
            return `<button class="btn btn-secondary not-accurate-btn" data-action="not-accurate" data-signal-id="${signal.id}">
                <i class="fas fa-thumbs-down"></i> Not Accurate ${notAccurateCount > 0 ? `(${notAccurateCount})` : ''}
            </button>`;
        } else {
            return `<button class="btn btn-secondary" data-action="not-accurate" data-signal-id="${signal.id}">
                <i class="fas fa-thumbs-down"></i> Not Accurate ${notAccurateCount > 0 ? `(${notAccurateCount})` : ''}
            </button>`;
        }
    }

    static getActionButtonHtml(signal, app) {
        // Check if there are any action plans for this account
        let hasActionPlan = false;
        
        // Check both Map-based and Array-based action plans
        if (app.actionPlans instanceof Map) {
            // Check if any plan exists for this account (now that keys are plan IDs)
            hasActionPlan = Array.from(app.actionPlans.values()).some(plan => plan.accountId === signal.account_id);
        } else if (Array.isArray(app.actionPlans)) {
            hasActionPlan = app.actionPlans.some(plan => plan.accountId === signal.account_id);
        }

        // Also check if DataService has plans by account
        if (!hasActionPlan && window.DataService && window.DataService.actionPlansByAccount) {
            hasActionPlan = window.DataService.actionPlansByAccount.has(signal.account_id);
        }

        if (hasActionPlan) {
            return `
                <button class="btn btn-primary btn-sm action-btn" onclick="app.selectActionPlanToEdit('${signal.account_id}')">
                    <i class="fas fa-edit"></i> Edit Plan
                </button>
            `;
        } else {
            return `
                <button class="btn btn-secondary btn-sm action-btn" onclick="app.createActionPlanForAccount('${signal.account_id}')">
                    <i class="fas fa-plus"></i> Create Plan
                </button>
            `;
        }
    }

    static hasUserInteraction(signal, viewState, interactions, actionPlans) {
        // Check if user has any interaction with this signal:
        // 1. Viewed the signal
        if (viewState.viewedSignals && viewState.viewedSignals.has(signal.id)) {
            return true;
        }
        
        // 2. Liked or marked as not accurate
        if (signal.currentUserFeedback) {
            return true;
        }
        
        // 3. Created an action plan for this account
        if (actionPlans instanceof Map) {
            // Check if any plan exists for this account
            const hasActionPlan = Array.from(actionPlans.values()).some(plan => plan.accountId === signal.account_id);
            if (hasActionPlan) {
                return true;
            }
        }
        
        return false;
    }

    static attachEventListeners(container) {
        // Remove any existing listeners to prevent duplication
        if (container._signalListenersAttached) {
            return; // Already attached, no need to re-attach
        }
        container._signalListenersAttached = true;
        
        // Set up intersection observer for auto-viewing signals on scroll
        this.setupScrollBasedViewing(container);

        // Use event delegation for all clicks on the container
        container.addEventListener('click', (e) => {
            // Handle signal card clicks (but not on interactive elements)
            const signalCard = e.target.closest('.signal-card');
            if (signalCard && 
                !e.target.closest('.linkedin-comments-section') &&
                !e.target.closest('.add-comment-form') &&
                !e.target.closest('.signal-actions') &&
                !e.target.classList.contains('add-comment-btn') &&
                !e.target.classList.contains('comment-input-linkedin') &&
                !e.target.classList.contains('comment-submit-btn') &&
                !e.target.closest('[data-action]')) {
                const signalId = signalCard.getAttribute('data-signal-id');
                dispatcher.dispatch(Actions.markSignalAsViewed(signalId));
                dispatcher.dispatch(Actions.openSignalDetails(signalId));
                return;
            }
            
            // Handle action buttons using data attributes
            const target = e.target.closest('[data-action]');
            if (!target) return;
            
            e.stopPropagation();
            e.preventDefault();
            
            const action = target.getAttribute('data-action');
            const signalId = target.getAttribute('data-signal-id');
            const commentId = target.getAttribute('data-comment-id');
            
            switch (action) {
                case 'like':
                    const userId = signalsStore.getState().userInfo?.userId || 'user-1';
                    dispatcher.dispatch(Actions.requestFeedback(signalId, 'like', userId));
                    break;
                case 'not-accurate':
                    const userId2 = signalsStore.getState().userInfo?.userId || 'user-1';
                    dispatcher.dispatch(Actions.requestFeedback(signalId, 'not-accurate', userId2));
                    break;
                case 'remove-signal':
                    dispatcher.dispatch(Actions.removeSignalFromFeed(signalId));
                    break;
                case 'add-comment':
                    const inputElement = document.getElementById(`inlineCommentText-${signalId}`);
                    if (inputElement && inputElement.value.trim()) {
                        const state = signalsStore.getState();
                        const signal = state.signalsById.get(signalId);
                        const accountId = signal?.account_id || signal?.account_name || 'unknown';
                        const userId3 = state.userInfo?.userId || 'user-1';
                        dispatcher.dispatch(Actions.requestComment(signalId, accountId, inputElement.value.trim(), userId3));
                        inputElement.value = '';
                    }
                    break;
                case 'edit-comment':
                    const commentElement = document.getElementById(`comment-text-${commentId}`);
                    if (commentElement) {
                        const currentText = commentElement.textContent;
                        const newText = prompt('Edit comment:', currentText);
                        if (newText !== null && newText.trim() !== currentText) {
                            dispatcher.dispatch(Actions.updateComment(commentId, newText.trim()));
                        }
                    }
                    break;
                case 'delete-comment':
                    dispatcher.dispatch(Actions.deleteComment(commentId, signalId));
                    break;
            }
        });

        // Comment input handling using event delegation
        container.addEventListener('click', (e) => {
            if (e.target.classList.contains('comment-input-linkedin')) {
                e.stopPropagation();
            }
        });
        
        container.addEventListener('focus', (e) => {
            if (e.target.classList.contains('comment-input-linkedin')) {
                e.stopPropagation();
            }
        }, true);
        
        container.addEventListener('keydown', (e) => {
            if (e.target.classList.contains('comment-input-linkedin')) {
                e.stopPropagation();
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    const signalId = e.target.closest('.signal-card').getAttribute('data-signal-id');
                    if (e.target.value.trim()) {
                        dispatcher.dispatch(Actions.addComment(signalId, e.target.value.trim()));
                        e.target.value = '';
                    }
                }
            }
        });
    }

    static setupScrollBasedViewing(container) {
        // Create intersection observer to detect when signals come into view
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const signalCard = entry.target;
                    const signalId = signalCard.getAttribute('data-signal-id');
                    
                    // Only mark new signals as viewed (not already viewed ones)
                    if (signalCard.classList.contains('signal-new')) {
                        // Add a small delay to ensure the user actually scrolled through it
                        setTimeout(() => {
                            if (entry.isIntersecting) { // Check if still in view after delay
                                // Mark as viewed through Flux action
                                dispatcher.dispatch(Actions.markSignalAsViewed(signalId));
                            }
                        }, 1500); // 1.5 second delay
                    }
                }
            });
        }, {
            // Trigger when 50% of the signal card is visible
            threshold: 0.5,
            // Add some margin to trigger slightly before/after the element is fully visible
            rootMargin: '0px 0px -20% 0px'
        });

        // Observe all signal cards
        container.querySelectorAll('.signal-card.signal-new').forEach(card => {
            observer.observe(card);
        });

        // Store the observer globally so we can disconnect it later
        if (window.signalScrollObserver) {
            window.signalScrollObserver.disconnect();
        }
        window.signalScrollObserver = observer;
    }
}