// ActivityFeedRenderer - Beautiful two-pane UI for activity feed
class ActivityFeedRenderer {
    
    /**
     * Main render method
     */
    static render(container, activities, filters, accounts, controller) {
        if (!container) return;
        
        const html = `
            <div class="activity-feed-container">
                ${this.renderFiltersPane(filters, accounts, controller)}
                ${this.renderFeedPane(activities, controller)}
            </div>
        `;
        
        container.innerHTML = html;
        
        // Attach event listeners
        this.attachEventListeners(controller);
    }
    
    /**
     * Render left filters pane (25%)
     */
    static renderFiltersPane(filters, accounts, controller) {
        return `
            <div class="activity-filters-pane">
                <div class="filters-header">
                    <h3><i class="fas fa-filter"></i> Filters</h3>
                    <button class="clear-filters-btn" onclick="activityFeedController.clearFilters()">
                        <i class="fas fa-times"></i> Clear All
                    </button>
                </div>
                
                <div class="filter-group">
                    <label class="filter-label">
                        <i class="fas fa-building"></i> Account
                    </label>
                    <select class="filter-select" id="accountFilter">
                        <option value="all" ${filters.accountId === 'all' ? 'selected' : ''}>All Accounts</option>
                        ${accounts.map(account => `
                            <option value="${account.id}" ${filters.accountId === account.id ? 'selected' : ''}>
                                ${account.name}
                            </option>
                        `).join('')}
                    </select>
                </div>
                
                <div class="filter-group">
                    <label class="filter-label">
                        <i class="fas fa-calendar"></i> Date Range
                    </label>
                    <div class="date-filter-buttons">
                        <button class="date-filter-btn ${filters.dateRange === 'today' ? 'active' : ''}" data-range="today">
                            Today
                        </button>
                        <button class="date-filter-btn ${filters.dateRange === 'week' ? 'active' : ''}" data-range="week">
                            Last 7 Days
                        </button>
                        <button class="date-filter-btn ${filters.dateRange === 'month' ? 'active' : ''}" data-range="month">
                            Last 30 Days
                        </button>
                        <button class="date-filter-btn ${filters.dateRange === '90days' ? 'active' : ''}" data-range="90days">
                            Last 90 Days
                        </button>
                        <button class="date-filter-btn ${filters.dateRange === 'all' ? 'active' : ''}" data-range="all">
                            All Time
                        </button>
                    </div>
                </div>
                
                <div class="filter-group">
                    <label class="filter-label">
                        <i class="fas fa-layer-group"></i> Activity Type
                    </label>
                    <div class="type-filter-buttons">
                        <button class="type-filter-btn ${filters.type === 'all' ? 'active' : ''}" data-type="all">
                            <i class="fas fa-list"></i> All
                        </button>
                        <button class="type-filter-btn ${filters.type === 'gong' ? 'active' : ''}" data-type="gong">
                            <i class="fas fa-phone"></i> Gong Calls
                        </button>
                        <button class="type-filter-btn ${filters.type === 'notes' ? 'active' : ''}" data-type="notes">
                            <i class="fas fa-sticky-note"></i> Notes
                        </button>
                    </div>
                </div>
                
                <div class="filter-stats">
                    <div class="stat-item">
                        <div class="stat-value">${controller.filteredActivities.length}</div>
                        <div class="stat-label">Activities Shown</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">${controller.activities.filter(a => a.type === 'gong').length}</div>
                        <div class="stat-label">Total Calls</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">${controller.activities.filter(a => a.type === 'note').length}</div>
                        <div class="stat-label">Total Notes</div>
                    </div>
                </div>
            </div>
        `;
    }
    
    /**
     * Render right feed pane (75%)
     */
    static renderFeedPane(activities, controller) {
        if (!activities || activities.length === 0) {
            return `
                <div class="activity-feed-pane">
                    ${this.renderEmptyState()}
                </div>
            `;
        }
        
        // Group activities by date
        const groupedActivities = this.groupActivitiesByDate(activities);
        
        return `
            <div class="activity-feed-pane">
                <div class="feed-header">
                    <h2><i class="fas fa-stream"></i> Activity Feed</h2>
                    <div class="feed-count">${activities.length} activities</div>
                </div>
                
                <div class="activity-timeline">
                    ${Object.entries(groupedActivities).map(([dateLabel, dateActivities]) => `
                        ${this.renderDateSeparator(dateLabel)}
                        ${dateActivities.map(activity => this.renderActivityCard(activity)).join('')}
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    /**
     * Group activities by date label
     */
    static groupActivitiesByDate(activities) {
        const groups = {};
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
        const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        
        activities.forEach(activity => {
            let label;
            
            if (activity.date >= today) {
                label = 'Today';
            } else if (activity.date >= yesterday) {
                label = 'Yesterday';
            } else if (activity.date >= lastWeek) {
                label = 'Last 7 Days';
            } else {
                const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                                  'July', 'August', 'September', 'October', 'November', 'December'];
                label = `${monthNames[activity.date.getMonth()]} ${activity.date.getFullYear()}`;
            }
            
            if (!groups[label]) {
                groups[label] = [];
            }
            groups[label].push(activity);
        });
        
        return groups;
    }
    
    /**
     * Render date separator
     */
    static renderDateSeparator(dateLabel) {
        return `
            <div class="activity-date-separator">
                <span class="date-label">${dateLabel}</span>
            </div>
        `;
    }
    
    /**
     * Render activity card (delegates to specific type)
     */
    static renderActivityCard(activity) {
        if (activity.type === 'gong') {
            return this.renderGongCard(activity);
        } else if (activity.type === 'note') {
            return this.renderNoteCard(activity);
        }
        return '';
    }
    
    /**
     * Render Gong call card
     */
    static renderGongCard(call) {
        const attendees = call.metadata.attendees || [];
        const formattedDate = this.formatDateTime(call.date);
        
        return `
            <div class="activity-card activity-card-gong" data-activity-id="${call.id}">
                <div class="activity-card-header">
                    <div class="activity-type-icon gong-icon">
                        <i class="fas fa-phone"></i>
                    </div>
                    <div class="activity-header-content">
                        <div class="activity-account" onclick="activityFeedController.navigateToAccount('${call.accountId}')">
                            <i class="fas fa-building"></i> ${call.accountName}
                        </div>
                        <div class="activity-title">${this.escapeHtml(call.title)}</div>
                    </div>
                    <div class="activity-actions">
                        ${call.metadata.callUrl ? `
                            <a href="${call.metadata.callUrl}" target="_blank" class="activity-action-btn" title="Open in Gong">
                                <i class="fas fa-external-link-alt"></i>
                            </a>
                        ` : ''}
                    </div>
                </div>
                
                <div class="activity-card-body">
                    <div class="activity-content">
                        ${this.escapeHtml(call.content)}
                    </div>
                    
                    <div class="activity-metadata">
                        <span class="metadata-item">
                            <i class="fas fa-clock"></i> ${formattedDate}
                        </span>
                        ${call.metadata.duration ? `
                            <span class="metadata-item">
                                <i class="fas fa-hourglass-half"></i> ${call.metadata.duration}
                            </span>
                        ` : ''}
                        ${call.metadata.meetingType ? `
                            <span class="metadata-badge badge-${call.metadata.meetingType.toLowerCase()}">
                                ${call.metadata.meetingType}
                            </span>
                        ` : ''}
                        ${call.metadata.opportunityName ? `
                            <span class="metadata-item">
                                <i class="fas fa-handshake"></i> ${this.escapeHtml(call.metadata.opportunityName)}
                            </span>
                        ` : ''}
                    </div>
                    
                    ${attendees.length > 0 ? `
                        <div class="activity-attendees">
                            <span class="attendees-label"><i class="fas fa-users"></i> Attendees:</span>
                            <div class="attendee-pills">
                                ${attendees.slice(0, 5).map(attendee => `
                                    <div class="attendee-pill" title="${this.escapeHtml(attendee)}">
                                        <div class="attendee-avatar">${this.getInitials(attendee)}</div>
                                        <span class="attendee-name">${this.escapeHtml(attendee)}</span>
                                    </div>
                                `).join('')}
                                ${attendees.length > 5 ? `
                                    <div class="attendee-pill more-attendees" title="${attendees.slice(5).join(', ')}">
                                        +${attendees.length - 5}
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }
    
    /**
     * Render note card
     */
    static renderNoteCard(note) {
        const formattedDate = this.formatDateTime(note.date);
        
        return `
            <div class="activity-card activity-card-note" data-activity-id="${note.id}" onclick="activityFeedController.handleActivityClick('${note.id}')">
                <div class="activity-card-header">
                    <div class="activity-type-icon note-icon">
                        <i class="fas fa-sticky-note"></i>
                    </div>
                    <div class="activity-header-content">
                        <div class="activity-account" onclick="event.stopPropagation(); activityFeedController.navigateToAccount('${note.accountId}')">
                            <i class="fas fa-building"></i> ${note.accountName}
                        </div>
                        <div class="activity-title">${this.escapeHtml(note.title)}</div>
                    </div>
                    <div class="activity-actions">
                        ${note.metadata.pinned ? `
                            <span class="activity-pinned-badge" title="Pinned">
                                <i class="fas fa-thumbtack"></i>
                            </span>
                        ` : ''}
                    </div>
                </div>
                
                <div class="activity-card-body">
                    <div class="activity-content">
                        ${this.escapeHtml(note.content)}
                    </div>
                    
                    <div class="activity-metadata">
                        <span class="metadata-item">
                            <i class="fas fa-clock"></i> ${formattedDate}
                        </span>
                        <span class="metadata-item">
                            <i class="fas fa-user"></i> ${this.escapeHtml(note.metadata.author)}
                        </span>
                        ${note.metadata.visibility ? `
                            <span class="metadata-badge badge-${note.metadata.visibility}">
                                ${note.metadata.visibility}
                            </span>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }
    
    /**
     * Render empty state
     */
    static renderEmptyState() {
        return `
            <div class="activity-empty-state">
                <div class="empty-state-icon">
                    <i class="fas fa-inbox"></i>
                </div>
                <h3>No Activities Found</h3>
                <p>Try adjusting your filters to see more activities</p>
            </div>
        `;
    }
    
    /**
     * Attach event listeners
     */
    static attachEventListeners(controller) {
        // Account filter
        const accountFilter = document.getElementById('accountFilter');
        if (accountFilter) {
            accountFilter.addEventListener('change', (e) => {
                controller.setFilter('accountId', e.target.value);
            });
        }
        
        // Date range filters
        document.querySelectorAll('.date-filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const range = e.target.getAttribute('data-range');
                controller.setFilter('dateRange', range);
            });
        });
        
        // Type filters
        document.querySelectorAll('.type-filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const type = e.target.getAttribute('data-type');
                controller.setFilter('type', type);
            });
        });
    }
    
    /**
     * Format date and time
     */
    static formatDateTime(date) {
        if (!date) return '';
        
        const options = { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
        };
        
        return date.toLocaleDateString('en-US', options);
    }
    
    /**
     * Get initials from name
     */
    static getInitials(name) {
        if (!name) return '?';
        const parts = name.trim().split(' ');
        if (parts.length >= 2) {
            return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        }
        return name.substring(0, 2).toUpperCase();
    }
    
    /**
     * Escape HTML to prevent XSS
     */
    static escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

