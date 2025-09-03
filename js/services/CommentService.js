// Comment Service - Handle comment operations for both signals and accounts
class CommentService {

    static async addComment(signalId, app) {
        const commentText = document.getElementById(`inlineCommentText-${signalId}`)?.value ||
                          document.getElementById('newCommentText')?.value;
        if (!commentText || !commentText.trim()) {
            app.showErrorMessage('Please enter a comment');
            return;
        }

        try {
            // Call API to add comment
            const result = await DataService.createComment(signalId, commentText.trim());

            if (result.success) {
                if (!app.signalComments.has(signalId)) {
                    app.signalComments.set(signalId, []);
                }

                // Ensure we're using the flat comment structure
                const flatComment = result.comment.content || result.comment;

                // Check if comment already exists to prevent duplicates
                const existingComments = app.signalComments.get(signalId);
                const commentExists = existingComments.some(c => c.id === flatComment.id);

                if (!commentExists) {
                    app.signalComments.get(signalId).push(flatComment);
                } else {
                    console.log('Comment already exists, skipping duplicate:', flatComment.id);
                }

                // Clear input fields first
                if (document.getElementById(`inlineCommentText-${signalId}`)) {
                    document.getElementById(`inlineCommentText-${signalId}`).value = '';
                }
                if (document.getElementById('newCommentText')) {
                    document.getElementById('newCommentText').value = '';
                }

                // Re-render signal feed to show the new comment
                if (app.currentTab === 'signal-feed') {
                    SignalRenderer.renderSignalFeed(app);
                }

                // If we're in the signal drawer showing comments, refresh just the comments section
                const signalDrawer = document.getElementById('signalDrawer');
                if (signalDrawer && signalDrawer.classList.contains('open')) {
                    const commentsSection = document.getElementById('commentsList');
                    if (commentsSection) {
                        commentsSection.innerHTML = this.renderCommentsForSignal(signalId, app);
                    }
                }

                app.showSuccessMessage('Comment added!');
            } else {
                app.showErrorMessage('Failed to add comment');
            }
        } catch (error) {
            console.error('Error adding comment:', error);
            app.showErrorMessage('Failed to add comment');
        }
    }

    static async updateComment(commentId, newText, app) {
        if (!newText || !newText.trim()) {
            app.showErrorMessage('Please enter a comment');
            return;
        }

        try {
            const result = await DataService.updateComment(commentId, newText.trim());

            if (result.success) {
                // Update local state
                for (let [signalId, comments] of app.signalComments) {
                    const commentIndex = comments.findIndex(c => c.id === commentId);
                    if (commentIndex !== -1) {
                        comments[commentIndex] = result.comment;
                        // Re-render signal feed to show updated comment
                        if (app.currentTab === 'signal-feed') {
                            SignalRenderer.renderSignalFeed(app);
                        }
                        break;
                    }
                }
                app.showSuccessMessage('Comment updated!');
                return result.comment;
            } else {
                app.showErrorMessage('Failed to update comment');
            }
        } catch (error) {
            console.error('Error updating comment:', error);
            app.showErrorMessage('Failed to update comment');
        }
    }

    static async deleteComment(commentId, signalId, app) {
        try {
            const result = await DataService.deleteComment(commentId);

            if (result.success) {
                // Update local state
                if (app.signalComments.has(signalId)) {
                    const comments = app.signalComments.get(signalId);
                    const filteredComments = comments.filter(c => c.id !== commentId);
                    app.signalComments.set(signalId, filteredComments);
                }

                // Update UI
                this.updateCommentUI(signalId, app);

                // Re-render signal feed to update comment counts
                if (app.currentTab === 'signal-feed') {
                    SignalRenderer.renderSignalFeed(app);
                }

                app.showSuccessMessage('Comment deleted!');
            } else {
                app.showErrorMessage('Failed to delete comment');
            }
        } catch (error) {
            console.error('Error deleting comment:', error);
            app.showErrorMessage('Failed to delete comment');
        }
    }

    static editComment(commentId, signalId, app) {
        const commentTextElement = document.getElementById(`comment-text-${commentId}`);
        if (!commentTextElement) return;

        const currentText = commentTextElement.textContent;

        // Replace comment text with editable textarea
        commentTextElement.innerHTML = `
            <div class="edit-comment-form">
                <textarea id="edit-comment-${commentId}" class="edit-comment-input">${currentText}</textarea>
                <div class="edit-comment-actions">
                    <button class="btn btn-sm btn-primary" onclick="app.saveCommentEdit('${commentId}', '${signalId}')">Save</button>
                    <button class="btn btn-sm btn-secondary" onclick="app.cancelCommentEdit('${commentId}', '${signalId}', '${currentText.replace(/'/g, "&#39;")}')">Cancel</button>
                </div>
            </div>
        `;

        // Focus on the textarea
        const textarea = document.getElementById(`edit-comment-${commentId}`);
        if (textarea) {
            textarea.focus();
            textarea.setSelectionRange(textarea.value.length, textarea.value.length);
        }
    }

    static async saveCommentEdit(commentId, signalId, app) {
        const textarea = document.getElementById(`edit-comment-${commentId}`);
        if (!textarea) return;

        const newText = textarea.value.trim();
        if (!newText) {
            app.showErrorMessage('Comment cannot be empty');
            return;
        }

        try {
            const result = await this.updateComment(commentId, newText, app);
            if (result) {
                // Update the UI with the new text
                const commentTextElement = document.getElementById(`comment-text-${commentId}`);
                if (commentTextElement) {
                    commentTextElement.textContent = newText;
                }
                app.showSuccessMessage('Comment updated successfully');
            }
        } catch (error) {
            console.error('Error saving comment edit:', error);
            app.showErrorMessage('Failed to save comment');
        }
    }

    static cancelCommentEdit(commentId, signalId, originalText, app) {
        const commentTextElement = document.getElementById(`comment-text-${commentId}`);
        if (commentTextElement) {
            commentTextElement.textContent = originalText;
        }
    }

    static updateCommentUI(signalId, app) {
        const commentCount = app.signalComments.get(signalId)?.length || 0;

        // Update comment count badge on the comment button
        const commentButton = document.querySelector(`[data-signal-id="${signalId}"][data-action="comment"]`);
        if (commentButton) {
            let commentCountSpan = commentButton.querySelector('.comment-count');
            if (commentCountSpan) {
                commentCountSpan.textContent = commentCount;
            } else if (commentCount > 0) {
                commentButton.innerHTML += `<span class="comment-count">${commentCount}</span>`;
            }
        }

        // Update any comment count displays in the signal card
        const signalCard = document.querySelector(`[data-signal-id="${signalId}"]`);
        if (signalCard) {
            const commentCountElements = signalCard.querySelectorAll('.comments-count, .comment-indicator');
            commentCountElements.forEach(element => {
                if (element.classList.contains('comments-count')) {
                    element.textContent = `Comments (${commentCount})`;
                } else if (element.classList.contains('comment-indicator')) {
                    element.textContent = commentCount;
                }
            });
        }
    }

    static renderSignalCommentsSection(signalId, app) {
        const comments = app.signalComments.get(signalId) || [];
        let commentsHtml = `
            <div class="detail-section">
                <h3>Comments (${comments.length})</h3>
                <div class="comments-list">
                    ${comments.slice(0, 3).map(comment => `
                        <div class="comment-preview">
                            <div class="comment-author-preview">${comment.author}</div>
                            <div class="comment-text-preview">${comment.text.substring(0, 60)}...</div>
                        </div>
                    `).join('')}
                    ${comments.length > 3 ? `<div class="view-all-comments" onclick="app.openSignalCommentsDrawer('${signalId}')">View all ${comments.length} comments</div>` : ''}
                </div>
                <div class="add-comment-form-inline">
                    <textarea id="inlineCommentText-${signalId}" placeholder="Add a comment..."></textarea>
                    <button class="btn btn-secondary add-comment-btn">Comment</button>
                </div>
            </div>
        `;
        return commentsHtml;
    }

    static renderCommentsForSignal(signalId, app) {
        const comments = app.signalComments.get(signalId) || [];
        if (comments.length === 0) {
            return '<p>No comments yet. Be the first to add one!</p>';
        }

        return comments.map(comment => `
            <div class="comment">
                <div class="comment-author">${comment.author}</div>
                <div class="comment-date">${app.formatCommentTime(comment.timestamp)}</div>
                <div class="comment-text">${comment.text}</div>
            </div>
        `).join('');
    }

    static openSignalCommentsDrawer(signalId, app) {
        const signal = app.data.find(s => s.id === signalId);
        if (!signal) return;

        document.getElementById('signalTitle').textContent = `${signal.name} - Comments`;
        document.getElementById('signalDetails').innerHTML = `
            <div class="signal-detail-content">
                <div class="detail-section comments-section">
                    <h3>Comments for ${signal.name}</h3>
                    <div id="commentsList">
                        ${this.renderCommentsForSignal(signalId, app)}
                    </div>
                    <div class="add-comment-form">
                        <textarea id="newCommentText" placeholder="Add a new comment..."></textarea>
                        <button class="btn btn-primary" onclick="app.addComment('${signalId}')">Add Comment</button>
                    </div>
                </div>
            </div>
        `;
        document.getElementById('signalDrawer').classList.add('open');
    }

    // Account comment operations
    static async addAccountComment(accountId, app) {
        const commentText = document.getElementById(`accountCommentText-${accountId}`)?.value;
        if (!commentText || !commentText.trim()) {
            app.showErrorMessage('Please enter a comment');
            return;
        }

        try {
            const result = await DataService.createAccountComment(accountId, commentText.trim());

            if (result.success) {
                if (!app.accountComments.has(accountId)) {
                    app.accountComments.set(accountId, []);
                }

                // Check if comment already exists to prevent duplicates
                const existingComments = app.accountComments.get(accountId);
                const commentExists = existingComments.some(c => c.id === result.comment.id);

                if (!commentExists) {
                    app.accountComments.get(accountId).push(result.comment);
                } else {
                    console.log('Account comment already exists, skipping duplicate:', result.comment.id);
                }

                // Update UI
                this.updateAccountCommentUI(accountId, app);

                // Clear input field
                if (document.getElementById(`accountCommentText-${accountId}`)) {
                    document.getElementById(`accountCommentText-${accountId}`).value = '';
                }

                // Update just the comments section instead of re-rendering entire portfolio
                if (app.currentTab === 'my-portfolio') {
                    this.refreshAccountCommentsSection(accountId, app);
                }

                app.showSuccessMessage('Comment added!');
            } else {
                app.showErrorMessage('Failed to add comment');
            }
        } catch (error) {
            console.error('Error adding account comment:', error);
            app.showErrorMessage('Failed to add comment');
        }
    }

    static async updateAccountComment(commentId, newText, app) {
        if (!newText || !newText.trim()) {
            app.showErrorMessage('Please enter a comment');
            return;
        }

        try {
            const result = await DataService.updateAccountComment(commentId, newText.trim());

            if (result.success) {
                // Update local state
                for (let [accountId, comments] of app.accountComments) {
                    const commentIndex = comments.findIndex(c => c.id === commentId);
                    if (commentIndex !== -1) {
                        comments[commentIndex] = result.comment;
                        // Update just the comments section instead of re-rendering entire portfolio
                        if (app.currentTab === 'my-portfolio') {
                            this.refreshAccountCommentsSection(accountId, app);
                        }
                        break;
                    }
                }
                app.showSuccessMessage('Comment updated!');
                return result.comment;
            } else {
                app.showErrorMessage('Failed to update comment');
            }
        } catch (error) {
            console.error('Error updating account comment:', error);
            app.showErrorMessage('Failed to update comment');
        }
    }

    static async deleteAccountComment(commentId, accountId, app) {
        try {
            const result = await DataService.deleteAccountComment(commentId);

            if (result.success) {
                // Update local state
                if (app.accountComments.has(accountId)) {
                    const comments = app.accountComments.get(accountId);
                    const filteredComments = comments.filter(c => c.id !== commentId);
                    app.accountComments.set(accountId, filteredComments);
                }

                // Update UI
                this.updateAccountCommentUI(accountId, app);

                // Update just the comments section instead of re-rendering entire portfolio
                if (app.currentTab === 'my-portfolio') {
                    this.refreshAccountCommentsSection(accountId, app);
                }

                app.showSuccessMessage('Comment deleted!');
            } else {
                app.showErrorMessage('Failed to delete comment');
            }
        } catch (error) {
            console.error('Error deleting account comment:', error);
            app.showErrorMessage('Failed to delete comment');
        }
    }

    static editAccountComment(commentId, accountId, app) {
        const commentTextElement = document.getElementById(`account-comment-text-${commentId}`);
        if (!commentTextElement) return;

        const currentText = commentTextElement.textContent;

        // Replace comment text with editable textarea
        commentTextElement.innerHTML = `
            <div class="edit-comment-form">
                <textarea id="edit-account-comment-${commentId}" class="edit-comment-input">${currentText}</textarea>
                <div class="edit-comment-actions">
                    <button class="btn btn-sm btn-primary" onclick="app.saveAccountCommentEdit('${commentId}', '${accountId}')">Save</button>
                    <button class="btn btn-sm btn-secondary" onclick="app.cancelAccountCommentEdit('${commentId}', '${accountId}', '${currentText.replace(/'/g, "&#39;")}')">Cancel</button>
                </div>
            </div>
        `;

        // Focus on the textarea
        const textarea = document.getElementById(`edit-account-comment-${commentId}`);
        if (textarea) {
            textarea.focus();
            textarea.setSelectionRange(textarea.value.length, textarea.value.length);
        }
    }

    static async saveAccountCommentEdit(commentId, accountId, app) {
        const textarea = document.getElementById(`edit-account-comment-${commentId}`);
        if (!textarea) return;

        const newText = textarea.value.trim();
        if (!newText) {
            app.showErrorMessage('Comment cannot be empty');
            return;
        }

        try {
            const result = await this.updateAccountComment(commentId, newText, app);
            if (result) {
                // Update the UI with the new text
                const commentTextElement = document.getElementById(`account-comment-text-${commentId}`);
                if (commentTextElement) {
                    commentTextElement.textContent = newText;
                }
                app.showSuccessMessage('Comment updated successfully');
            }
        } catch (error) {
            console.error('Error saving account comment edit:', error);
            app.showErrorMessage('Failed to save comment');
        }
    }

    static cancelAccountCommentEdit(commentId, accountId, originalText, app) {
        const commentTextElement = document.getElementById(`account-comment-text-${commentId}`);
        if (commentTextElement) {
            commentTextElement.textContent = originalText;
        }
    }

    static updateAccountCommentUI(accountId, app) {
        // Update comment count in the UI if needed
        const commentCount = app.accountComments.get(accountId)?.length || 0;
        const commentSection = document.getElementById(`account-comments-section-${accountId}`);
        if (commentSection) {
            const header = commentSection.querySelector('.comments-count');
            if (header) {
                header.textContent = `Comments (${commentCount})`;
            }
        }
    }

    static renderAccountCommentsSection(accountId, app) {
        const comments = app.accountComments.get(accountId) || [];

        return `
            <div class="account-comments-section" id="account-comments-section-${accountId}">
                <div class="comments-header">
                    <i class="fas fa-comments comments-icon"></i>
                    <h4 class="comments-count">Comments (${comments.length})</h4>
                </div>

                <div class="comments-list-linkedin">
                    ${comments.map(comment => {
                        // Handle both AppDB structure (with content wrapper) and direct comment structure
                        const commentData = comment.content || comment;
                        return `
                        <div class="comment-linkedin">
                            <div class="comment-avatar">
                                <div class="avatar-initials">${commentData.author ? app.getInitials(commentData.author) : 'U'}</div>
                            </div>
                            <div class="comment-content">
                                <div class="comment-header">
                                    <span class="comment-author">${commentData.author || 'Unknown User'}</span>
                                    <span class="comment-time">${app.formatCommentTime(commentData.timestamp)}</span>
                                </div>
                                <div class="comment-text" id="account-comment-text-${commentData.id}">${commentData.text || ''}</div>
                                <div class="comment-actions">
                                    <button class="comment-action-btn" onclick="app.editAccountComment('${commentData.id}', '${accountId}')">
                                        <i class="fas fa-edit"></i> Edit
                                    </button>
                                    <button class="comment-action-btn delete-btn" onclick="app.deleteAccountComment('${commentData.id}', '${accountId}')">
                                        <i class="fas fa-trash"></i> Delete
                                    </button>
                                </div>
                            </div>
                        </div>`;
                    }).join('')}
                </div>

                <div class="add-comment-linkedin">
                    <div class="comment-avatar">
                        <div class="avatar-initials">SC</div>
                    </div>
                    <div class="comment-input-container">
                        <textarea id="accountCommentText-${accountId}" class="comment-input-linkedin" placeholder="Add a comment..."></textarea>
                        <button class="comment-submit-btn" onclick="app.addAccountComment('${accountId}')">Comment</button>
                    </div>
                </div>
            </div>
        `;
    }

    // Helper function to refresh only the comments section for an account
    static refreshAccountCommentsSection(accountId, app) {
        const commentsHtml = this.renderAccountCommentsSection(accountId, app);
        const accountCommentsSection = document.getElementById(`account-comments-section-${accountId}`);
        if (accountCommentsSection) {
            accountCommentsSection.outerHTML = commentsHtml;
        } else {
            // If the section doesn't exist, we might need to find the parent element
            // and inject the new HTML. This logic might need to be more specific
            // based on the actual HTML structure of the portfolio view.
            console.warn(`Could not find account comments section for account ID: ${accountId} to refresh.`);
        }
    }
}