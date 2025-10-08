// NotesRenderer - Two-pane notes interface with list and rich text editor
class NotesRenderer {
    
    /**
     * Render the main notes view (two-pane layout)
     */
    static renderNotesView() {
        const store = window.signalsStore;
        const notes = store.getAllNotes();
        const accounts = Array.from(store.normalizedData.accounts.values());
        const selectedNote = store.getSelectedNote();
        
        return `
            <div class="notes-container">
                <!-- Left pane: Notes list -->
                <div class="notes-list-pane">
                    ${this.renderNotesListHeader(notes.length)}
                    ${this.renderNotesFilters()}
                    ${this.renderNotesList(notes, selectedNote?.id)}
                </div>
                
                <!-- Right pane: Note editor -->
                <div class="notes-editor-pane">
                    ${selectedNote ? this.renderNoteEditor(selectedNote, accounts) : this.renderEmptyState()}
                </div>
            </div>
        `;
    }
    
    /**
     * Render notes list header with new note button
     */
    static renderNotesListHeader(totalCount) {
        return `
            <div class="notes-list-header">
                <h2 class="notes-list-title">
                    <i class="fas fa-sticky-note"></i>
                    Signal Notes
                    <span class="notes-count">${totalCount}</span>
                </h2>
                <button class="btn-new-note" id="btnNewNote">
                    <i class="fas fa-plus"></i>
                    New Note
                </button>
            </div>
        `;
    }
    
    /**
     * Render filters (search, account filter, pinned filter)
     */
    static renderNotesFilters() {
        return `
            <div class="notes-filters">
                <div class="notes-search">
                    <i class="fas fa-search"></i>
                    <input type="text" 
                           id="notesSearchInput" 
                           placeholder="Search notes..." 
                           class="notes-search-input">
                </div>
                <div class="notes-filter-buttons">
                    <button class="filter-btn active" data-filter="all">
                        <i class="fas fa-list"></i> All
                    </button>
                    <button class="filter-btn" data-filter="pinned">
                        <i class="fas fa-thumbtack"></i> Pinned
                    </button>
                    <button class="filter-btn" data-filter="account">
                        <i class="fas fa-building"></i> By Account
                    </button>
                </div>
            </div>
        `;
    }
    
    /**
     * Render notes list
     */
    static renderNotesList(notes, selectedNoteId) {
        if (notes.length === 0) {
            return `
                <div class="notes-list-empty">
                    <i class="fas fa-sticky-note"></i>
                    <p>No notes yet</p>
                    <p class="empty-subtitle">Click "New Note" to get started</p>
                </div>
            `;
        }
        
        return `
            <div class="notes-list" id="notesList">
                ${notes.map(note => this.renderNoteListItem(note, selectedNoteId === note.id)).join('')}
            </div>
        `;
    }
    
    /**
     * Render notes list grouped by account
     */
    static renderNotesListGroupedByAccount(searchTerm = '', selectedNoteId = null) {
        const store = window.signalsStore;
        const state = store.getState();
        
        // Use globally filtered accounts if available
        const accountsMap = state.filteredAccounts || store.normalizedData.accounts;
        const accounts = Array.from(accountsMap.values());
        
        // Sort accounts alphabetically
        accounts.sort((a, b) => a.account_name.localeCompare(b.account_name));
        
        let hasNotes = false;
        let accountGroupsHTML = '';
        
        for (const account of accounts) {
            let notes = store.getNotesByAccount(account.account_id);
            
            // Apply global filters if available (filter by filteredNotes)
            if (state.filteredNotes) {
                notes = notes.filter(note => state.filteredNotes.has(note.id));
            }
            
            // Apply search filter if present
            if (searchTerm) {
                notes = notes.filter(note => {
                    const searchableText = `${note.title} ${note.bodyPlain} ${note.accountName}`.toLowerCase();
                    return searchableText.includes(searchTerm.toLowerCase());
                });
            }
            
            // Sort notes: pinned first, then by updatedAt descending
            notes.sort((a, b) => {
                if (a.pinned !== b.pinned) {
                    return b.pinned ? 1 : -1; // Pinned notes first
                }
                return new Date(b.updatedAt) - new Date(a.updatedAt);
            });
            
            if (notes.length > 0) {
                hasNotes = true;
                accountGroupsHTML += `
                    <div class="notes-account-group">
                        <div class="notes-account-header">
                            <i class="fas fa-building"></i>
                            <span class="account-name">${SecurityUtils.sanitizeHTML(account.account_name)}</span>
                            <span class="account-note-count">${notes.length}</span>
                        </div>
                        <div class="notes-account-items">
                            ${notes.map(note => this.renderNoteListItem(note, selectedNoteId === note.id)).join('')}
                        </div>
                    </div>
                `;
            }
        }
        
        if (!hasNotes) {
            return `
                <div class="notes-list-empty">
                    <i class="fas fa-sticky-note"></i>
                    <p>No notes found</p>
                    <p class="empty-subtitle">${searchTerm ? 'Try a different search term' : 'Click "New Note" to get started'}</p>
                </div>
            `;
        }
        
        return `
            <div class="notes-list notes-list-grouped" id="notesList">
                ${accountGroupsHTML}
            </div>
        `;
    }
    
    /**
     * Render individual note list item
     */
    static renderNoteListItem(note, isSelected) {
        const meetingDate = new Date(note.meetingDate);
        const updatedDate = new Date(note.updatedAt);
        const isRecent = (Date.now() - updatedDate.getTime()) < (24 * 60 * 60 * 1000); // 24 hours
        
        return `
            <div class="note-list-item ${isSelected ? 'selected' : ''}" 
                 data-note-id="${note.id}"
                 onclick="window.notesController?.selectNote('${note.id}')">
                
                <div class="note-item-header">
                    <div class="note-item-title-row">
                        ${note.pinned ? '<i class="fas fa-thumbtack note-pinned-icon"></i>' : ''}
                        <h3 class="note-item-title">${SecurityUtils.sanitizeHTML(note.title || 'Untitled Note')}</h3>
                        ${isRecent ? '<span class="note-recent-badge">New</span>' : ''}
                    </div>
                    <button class="note-pin-btn" 
                            onclick="event.stopPropagation(); window.notesController?.togglePin('${note.id}', ${!note.pinned});"
                            title="${note.pinned ? 'Unpin' : 'Pin'}">
                        <i class="fas fa-thumbtack ${note.pinned ? 'pinned' : ''}"></i>
                    </button>
                </div>
                
                <div class="note-item-meta">
                    <span class="note-account-name">
                        <i class="fas fa-building"></i>
                        ${SecurityUtils.sanitizeHTML(note.accountName || 'No Account')}
                    </span>
                    <span class="note-meeting-date">
                        <i class="fas fa-calendar"></i>
                        ${FormatUtils.formatDate(note.meetingDate)}
                    </span>
                </div>
                
                <div class="note-item-preview">
                    ${this.truncateText(note.bodyPlain || '', 120)}
                </div>
                
                <div class="note-item-footer">
                    <span class="note-author">
                        <i class="fas fa-user"></i>
                        ${SecurityUtils.sanitizeHTML(note.authorName)}
                    </span>
                    <span class="note-updated">
                        ${this.formatRelativeTime(updatedDate)}
                    </span>
                </div>
            </div>
        `;
    }
    
    /**
     * Render empty state (no note selected)
     */
    static renderEmptyState() {
        return `
            <div class="notes-editor-empty">
                <i class="fas fa-sticky-note"></i>
                <h3>No Note Selected</h3>
                <p>Select a note from the list or create a new one</p>
            </div>
        `;
    }
    
    /**
     * Render note editor
     */
    static renderNoteEditor(note, accounts) {
        return `
            <div class="note-editor" data-note-id="${note.id}">
                <!-- Editor header -->
                <div class="note-editor-header">
                    <div class="note-editor-meta">
                        <input type="text" 
                               class="note-title-input" 
                               id="noteTitleInput"
                               placeholder="Note Title..."
                               value="${SecurityUtils.sanitizeHTML(note.title || '')}">
                        
                        <div class="note-editor-toolbar">
                            <div class="note-toolbar-left">
                                <select class="note-account-select" id="noteAccountSelect">
                                    <option value="">-- No Account --</option>
                                    ${accounts.map(acc => `
                                        <option value="${acc.account_id}" 
                                                ${acc.account_id === note.accountId ? 'selected' : ''}>
                                            ${SecurityUtils.sanitizeHTML(acc.account_name)}
                                        </option>
                                    `).join('')}
                                </select>
                                
                                <input type="date" 
                                       class="note-meeting-date-input" 
                                       id="noteMeetingDateInput"
                                       value="${note.meetingDate ? note.meetingDate.split('T')[0] : ''}">
                            </div>
                            
                            <div class="note-toolbar-right">
                                <button class="btn-note-action" 
                                        onclick="window.notesController?.togglePin('${note.id}', ${!note.pinned});"
                                        title="${note.pinned ? 'Unpin' : 'Pin'} Note">
                                    <i class="fas fa-thumbtack ${note.pinned ? 'pinned' : ''}"></i>
                                </button>
                                <button class="btn-note-action btn-note-delete" 
                                        onclick="window.notesController?.deleteNote('${note.id}');"
                                        title="Delete Note">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Rich text editor -->
                <div class="note-editor-body">
                    <div class="note-editor-formatting-toolbar">
                        <button class="format-btn" data-command="bold" title="Bold (Ctrl+B)">
                            <i class="fas fa-bold"></i>
                        </button>
                        <button class="format-btn" data-command="italic" title="Italic (Ctrl+I)">
                            <i class="fas fa-italic"></i>
                        </button>
                        <button class="format-btn" data-command="underline" title="Underline (Ctrl+U)">
                            <i class="fas fa-underline"></i>
                        </button>
                        <span class="toolbar-divider"></span>
                        <button class="format-btn" data-command="insertUnorderedList" title="Bullet List">
                            <i class="fas fa-list-ul"></i>
                        </button>
                        <button class="format-btn" data-command="insertOrderedList" title="Numbered List">
                            <i class="fas fa-list-ol"></i>
                        </button>
                        <span class="toolbar-divider"></span>
                        <button class="format-btn" data-command="formatBlock" data-value="h3" title="Heading">
                            <i class="fas fa-heading"></i>
                        </button>
                        <button class="format-btn" data-command="removeFormat" title="Clear Formatting">
                            <i class="fas fa-eraser"></i>
                        </button>
                    </div>
                    
                    <div class="note-editor-content" 
                         contenteditable="true" 
                         id="noteBodyEditor"
                         data-placeholder="Start typing your note...">${note.body || ''}</div>
                </div>
                
                <!-- Editor footer -->
                <div class="note-editor-footer">
                    <div class="note-editor-status">
                        <span class="note-last-saved" id="noteLastSaved">
                            Last saved: ${this.formatRelativeTime(new Date(note.updatedAt))}
                        </span>
                    </div>
                    <div class="note-editor-actions">
                        <button class="btn btn-secondary" onclick="window.notesController?.deselectNote();">
                            Close
                        </button>
                        <button class="btn btn-primary" id="btnSaveNote">
                            <i class="fas fa-save"></i>
                            Save Note
                        </button>
                    </div>
                </div>
            </div>
        `;
    }
    
    /**
     * Truncate text with ellipsis
     */
    static truncateText(text, maxLength) {
        if (!text) return '';
        if (text.length <= maxLength) return SecurityUtils.sanitizeHTML(text);
        return SecurityUtils.sanitizeHTML(text.substring(0, maxLength)) + '...';
    }
    
    /**
     * Format relative time (e.g., "2 hours ago")
     */
    static formatRelativeTime(date) {
        const now = Date.now();
        const diffMs = now - date.getTime();
        const diffMins = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        
        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
        if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
        
        // FormatUtils.formatDate expects a string, so convert Date to ISO string
        return FormatUtils.formatDate(date.toISOString());
    }
    
    /**
     * Setup event listeners for note editor
     */
    static setupEditorListeners(controller) {
        // Format buttons
        document.querySelectorAll('.format-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const command = btn.dataset.command;
                const value = btn.dataset.value || null;
                document.execCommand(command, false, value);
            });
        });
        
        // Auto-save on content change (debounced)
        const editor = document.getElementById('noteBodyEditor');
        const titleInput = document.getElementById('noteTitleInput');
        const accountSelect = document.getElementById('noteAccountSelect');
        const meetingDateInput = document.getElementById('noteMeetingDateInput');
        
        let autoSaveTimeout;
        const debouncedSave = () => {
            clearTimeout(autoSaveTimeout);
            autoSaveTimeout = setTimeout(() => {
                controller.autoSaveCurrentNote();
            }, 2000); // Auto-save after 2 seconds of inactivity
        };
        
        if (editor) {
            editor.addEventListener('input', debouncedSave);
            editor.addEventListener('paste', debouncedSave);
        }
        
        if (titleInput) titleInput.addEventListener('input', debouncedSave);
        if (accountSelect) accountSelect.addEventListener('change', debouncedSave);
        if (meetingDateInput) meetingDateInput.addEventListener('change', debouncedSave);
        
        // Save button
        const saveBtn = document.getElementById('btnSaveNote');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => controller.saveCurrentNote());
        }
        
        // New note button
        const newNoteBtn = document.getElementById('btnNewNote');
        if (newNoteBtn) {
            newNoteBtn.addEventListener('click', () => controller.createNewNote());
        }
        
        // Search input
        const searchInput = document.getElementById('notesSearchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                controller.filterNotes(e.target.value);
            });
        }
        
        // Filter buttons
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                controller.applyFilter(btn.dataset.filter);
            });
        });
    }
}

// Make globally available
window.NotesRenderer = NotesRenderer;

