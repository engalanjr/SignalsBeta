// Signal Renderer - Handle signal feed rendering
class SignalRenderer {

    static renderSignalFeed(app) {
        const container = document.getElementById('signalsList');
        if (!container) return;

        if (app.filteredData.length === 0 && app.data.length > 0) {
            app.applyFilters();
        }

        const sortedSignals = [...app.filteredData].sort((a, b) => {
            const priorityOrder = { 'High': 3, 'Medium': 2, 'Low': 1 };
            const priorityA = priorityOrder[a.priority] || 0;
            const priorityB = priorityOrder[b.priority] || 0;

            if (priorityA !== priorityB) {
                return priorityB - priorityA;
            }

            const dateA = new Date(a.call_date);
            const dateB = new Date(b.call_date);
            return dateB - dateA;
        });

        // Filter signals based on any user interaction (not just viewed)
        const newSignals = sortedSignals.filter(signal => !this.hasUserInteraction(signal, app));
        const viewedSignals = sortedSignals.filter(signal => this.hasUserInteraction(signal, app));

        let html = '';

        // Add new signals section header
        html += this.renderNewSignalsHeader(newSignals.length);

        newSignals.forEach(signal => {
            html += this.renderSignalCard(signal, app, true);
        });

        if (newSignals.length > 0 && viewedSignals.length > 0) {
            html += this.renderSeparator();
        }

        viewedSignals.forEach(signal => {
            html += this.renderSignalCard(signal, app, false);
        });

        container.innerHTML = html;
        this.attachEventListeners(container, app);
    }

    static renderSignalCard(signal, app, isNew) {
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

        // Ensure required fields have fallback values
        const accountName = signal.account_name || 'Unknown Account';
        const signalName = signal.name || 'Unnamed Signal';
        const summary = signal.summary || 'No summary available';
        const rationale = signal.rationale || 'No rationale provided';

        return `
            <div class="signal-card ${cardClass} ${priorityClass}-priority ${feedbackClass}" data-signal-id="${signal.id}" style="${feedbackStyle}">
                <div class="signal-header">
                    <div class="signal-info">
                        <div class="signal-title">${accountName}</div>
                        <div class="signal-meta">
                            <span><i class="${signal.source_icon || 'fas fa-info-circle'}"></i> ${signalName}</span>
                            <span class="category-badge">${signal.category || 'General'}</span>
                            <span class="priority-badge priority-${priorityClass}">${priority}</span>
                            <span>${app.formatDate(signal.created_at || signal.created_date)}</span>
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
                ${this.renderInlineCommentsSection(signal.id, app)}
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

    static renderInlineCommentsSection(signalId, app) {
        const comments = app.signalComments.get(signalId) || [];
        console.log(`Rendering comments for signal ${signalId}:`, comments.length, 'comments');
        
        // Only show comments section if there are comments or to allow adding new ones
        return `
            <div class="linkedin-comments-section">
                <div class="comments-header">
                    <span class="comments-count">${comments.length} comment${comments.length !== 1 ? 's' : ''}</span>
                </div>
                ${comments.length > 0 ? `
                <div class="comments-list-linkedin">
                    ${comments.map(comment => `
                        <div class="comment-linkedin">
                            <div class="comment-avatar">
                                <span class="avatar-initials">${app.getInitials(comment.author)}</span>
                            </div>
                            <div class="comment-content">
                                <div class="comment-header">
                                    <span class="comment-author">${comment.author}</span>
                                    <span class="comment-time">${app.formatCommentTime(comment.timestamp)}</span>
                                </div>
                                <div class="comment-text" id="comment-text-${comment.id}">${comment.text}</div>
                                <div class="comment-actions">
                                    <button class="comment-action-btn" onclick="app.editComment('${comment.id}', '${signalId}')">
                                        <i class="fas fa-edit"></i> Edit
                                    </button>
                                    <button class="comment-action-btn delete-btn" onclick="app.deleteComment('${comment.id}', '${signalId}')">
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
                        <button class="comment-submit-btn">Comment</button>
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

    static hasUserInteraction(signal, app) {
        // Check if user has any interaction with this signal:
        // 1. Viewed the signal
        if (app.viewedSignals.has(signal.id)) {
            return true;
        }
        
        // 2. Liked or marked as not accurate
        if (signal.currentUserFeedback) {
            return true;
        }
        
        // 3. Created an action plan for this account
        let hasActionPlan = false;
        if (app.actionPlans instanceof Map) {
            // Check if any plan exists for this account (now that keys are plan IDs)
            hasActionPlan = Array.from(app.actionPlans.values()).some(plan => plan.accountId === signal.account_id);
        } else if (Array.isArray(app.actionPlans)) {
            hasActionPlan = app.actionPlans.some(plan => plan.accountId === signal.account_id);
        }
        if (!hasActionPlan && window.DataService && window.DataService.actionPlansByAccount) {
            hasActionPlan = window.DataService.actionPlansByAccount.has(signal.account_id);
        }
        if (hasActionPlan) {
            return true;
        }
        
        // 4. Removed from feed (this would be handled by removing from data entirely, 
        //    but we could also check a removedSignals set if implemented)
        
        return false;
    }

    static attachEventListeners(container, app) {
        // Set up intersection observer for auto-viewing signals on scroll
        this.setupScrollBasedViewing(container, app);

        // Signal card clicks
        container.querySelectorAll('.signal-card').forEach(card => {
            card.addEventListener('click', async (e) => {
                if (!e.target.closest('.linkedin-comments-section') &&
                    !e.target.closest('.add-comment-form') &&
                    !e.target.closest('.signal-actions') &&
                    !e.target.classList.contains('add-comment-btn') &&
                    !e.target.classList.contains('comment-input-linkedin') &&
                    !e.target.classList.contains('comment-submit-btn')) {
                    const signalId = e.currentTarget.getAttribute('data-signal-id');
                    await app.markSignalAsViewed(signalId);
                    SignalDetailsService.openSignalDetails(signalId, app);
                }
            });
        });

        // Comment submission
        container.querySelectorAll('.comment-submit-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                e.preventDefault();
                const signalId = btn.closest('.signal-card').getAttribute('data-signal-id');
                await CommentService.addComment(signalId, app);
            });
        });

        // Comment input handling
        container.querySelectorAll('.comment-input-linkedin').forEach(input => {
            input.addEventListener('click', (e) => e.stopPropagation());
            input.addEventListener('focus', (e) => e.stopPropagation());
            input.addEventListener('keydown', async (e) => {
                e.stopPropagation();
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    const signalId = input.closest('.signal-card').getAttribute('data-signal-id');
                    await CommentService.addComment(signalId, app);
                }
            });
        });

        // Action buttons
        container.querySelectorAll('[data-action="like"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const signalId = btn.getAttribute('data-signal-id');
                console.log(`👍 Like button clicked for signal: ${signalId}`);
                SignalFeedbackService.acknowledgeSignal(signalId, 'like', app);
            });
        });

        container.querySelectorAll('[data-action="not-accurate"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const signalId = btn.getAttribute('data-signal-id');
                console.log(`👎 Not accurate button clicked for signal: ${signalId}`);
                SignalFeedbackService.acknowledgeSignal(signalId, 'not-accurate', app);
            });
        });

        container.querySelectorAll('[data-action="take-action"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const signalId = btn.getAttribute('data-signal-id');
                ActionPlanService.createPlan(signalId, app);
            });
        });

        container.querySelectorAll('[data-action="remove-signal"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const signalId = btn.getAttribute('data-signal-id');
                SignalManagementService.removeSignalFromFeed(signalId, app);
            });
        });
    }

    static setupScrollBasedViewing(container, app) {
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
                                // Mark as viewed but don't refresh immediately - let it stay visible
                                app.markSignalAsViewed(signalId);
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

        // Store the observer on the app instance so we can disconnect it later
        if (app.scrollObserver) {
            app.scrollObserver.disconnect();
        }
        app.scrollObserver = observer;
    }
}