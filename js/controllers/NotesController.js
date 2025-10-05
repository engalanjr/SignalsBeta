// NotesController - Manages the notes view and interactions
class NotesController {
    
    constructor() {
        this.store = window.signalsStore;
        this.currentFilter = 'all';
        this.searchTerm = '';
        
        // Subscribe to store events
        this.subscribeToStore();
        
        console.log('📝 NotesController initialized');
    }
    
    subscribeToStore() {
        // Subscribe to notes-related store changes
        this.store.subscribe('notes:updated', () => this.handleNotesUpdated());
        this.store.subscribe('notes:selection-changed', () => this.handleSelectionChanged());
        this.store.subscribe('notes:confirmed', () => this.handleNoteSaved());
        
        console.log('🔌 NotesController: Subscribed to store events');
    }
    
    /**
     * Render the notes view
     */
    render() {
        const container = document.getElementById('notes-content');
        if (!container) {
            console.error('Notes container not found');
            return;
        }
        
        container.innerHTML = NotesRenderer.renderNotesView();
        NotesRenderer.setupEditorListeners(this);
        
        console.log('📝 Notes view rendered');
    }
    
    /**
     * Create a new note
     */
    async createNewNote() {
        const accounts = Array.from(this.store.normalizedData.accounts.values());
        const firstAccount = accounts[0];
        
        const noteData = {
            accountId: firstAccount?.account_id || null,
            accountName: firstAccount?.account_name || '',
            authorId: this.store.state.userInfo?.userId || 'current-user',
            authorName: this.store.state.userInfo?.userName || 'Current User',
            meetingDate: new Date().toISOString(),
            title: '',
            body: '',
            pinned: false,
            visibility: 'team'
        };
        
        const result = await NotesService.createNote(noteData);
        
        if (result.success) {
            console.log('✅ New note created:', result.note.id);
            // Select the new note
            Actions.selectNote(result.note.id);
        } else {
            console.error('Failed to create note:', result.error);
            alert('Failed to create note. Please try again.');
        }
    }
    
    /**
     * Select a note for editing
     */
    selectNote(noteId) {
        console.log('📝 Selecting note:', noteId);
        Actions.selectNote(noteId);
    }
    
    /**
     * Deselect current note
     */
    deselectNote() {
        console.log('📝 Deselecting note');
        Actions.deselectNote();
    }
    
    /**
     * Save the currently edited note
     */
    async saveCurrentNote() {
        const selectedNote = this.store.getSelectedNote();
        if (!selectedNote) {
            console.warn('No note selected to save');
            return;
        }
        
        const updates = this.collectNoteUpdates();
        if (!updates) return;
        
        console.log('💾 Saving note:', selectedNote.id);
        const saveBtn = document.getElementById('btnSaveNote');
        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        }
        
        const result = await NotesService.updateNote(selectedNote.id, updates);
        
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.innerHTML = '<i class="fas fa-save"></i> Save Note';
        }
        
        if (result.success) {
            console.log('✅ Note saved successfully');
            this.updateLastSavedTimestamp();
        } else {
            console.error('Failed to save note:', result.error);
            alert('Failed to save note. Please try again.');
        }
    }
    
    /**
     * Auto-save (silent, no UI feedback)
     */
    async autoSaveCurrentNote() {
        const selectedNote = this.store.getSelectedNote();
        if (!selectedNote) return;
        
        const updates = this.collectNoteUpdates();
        if (!updates) return;
        
        console.log('💾 Auto-saving note:', selectedNote.id);
        const result = await NotesService.updateNote(selectedNote.id, updates);
        
        if (result.success) {
            this.updateLastSavedTimestamp();
        }
    }
    
    /**
     * Collect updates from editor form
     */
    collectNoteUpdates() {
        const titleInput = document.getElementById('noteTitleInput');
        const bodyEditor = document.getElementById('noteBodyEditor');
        const accountSelect = document.getElementById('noteAccountSelect');
        const meetingDateInput = document.getElementById('noteMeetingDateInput');
        
        if (!titleInput || !bodyEditor || !accountSelect || !meetingDateInput) {
            console.warn('Editor elements not found');
            return null;
        }
        
        const accounts = Array.from(this.store.normalizedData.accounts.values());
        const selectedAccountId = accountSelect.value;
        const selectedAccount = accounts.find(a => a.account_id === selectedAccountId);
        
        const body = bodyEditor.innerHTML;
        const bodyPlain = bodyEditor.textContent || bodyEditor.innerText || '';
        
        return {
            title: titleInput.value,
            body: body,
            bodyPlain: bodyPlain,
            accountId: selectedAccountId || null,
            accountName: selectedAccount?.account_name || '',
            meetingDate: meetingDateInput.value ? new Date(meetingDateInput.value).toISOString() : new Date().toISOString()
        };
    }
    
    /**
     * Toggle pin status
     */
    async togglePin(noteId, pinned) {
        console.log(`📌 ${pinned ? 'Pinning' : 'Unpinning'} note:`, noteId);
        await NotesService.togglePin(noteId, pinned);
    }
    
    /**
     * Delete a note
     */
    async deleteNote(noteId) {
        const confirmed = confirm('Are you sure you want to delete this note?');
        if (!confirmed) return;
        
        console.log('🗑️ Deleting note:', noteId);
        const result = await NotesService.deleteNote(noteId);
        
        if (result.success) {
            console.log('✅ Note deleted successfully');
            // Deselect if it was selected
            const selectedNote = this.store.getSelectedNote();
            if (selectedNote && selectedNote.id === noteId) {
                Actions.deselectNote();
            }
        } else {
            console.error('Failed to delete note:', result.error);
            alert('Failed to delete note. Please try again.');
        }
    }
    
    /**
     * Filter notes by search term
     */
    filterNotes(searchTerm) {
        this.searchTerm = searchTerm.toLowerCase();
        this.refreshNotesList();
    }
    
    /**
     * Apply filter (all, pinned, account)
     */
    applyFilter(filter) {
        this.currentFilter = filter;
        this.refreshNotesList();
    }
    
    /**
     * Refresh the notes list based on current filters
     */
    refreshNotesList() {
        const listContainer = document.getElementById('notesList');
        if (!listContainer) return;
        
        const selectedNote = this.store.getSelectedNote();
        
        // Handle "By Account" grouping separately
        if (this.currentFilter === 'account') {
            listContainer.outerHTML = NotesRenderer.renderNotesListGroupedByAccount(this.searchTerm, selectedNote?.id);
            return;
        }
        
        // Handle other filters
        let notes = this.store.getAllNotes();
        
        // Apply filter
        if (this.currentFilter === 'pinned') {
            notes = this.store.getPinnedNotes();
        }
        
        // Apply search
        if (this.searchTerm) {
            notes = notes.filter(note => {
                const searchableText = `${note.title} ${note.bodyPlain} ${note.accountName}`.toLowerCase();
                return searchableText.includes(this.searchTerm);
            });
        }
        
        // Re-render list (replace only the list container, not its parent)
        listContainer.outerHTML = NotesRenderer.renderNotesList(notes, selectedNote?.id);
    }
    
    /**
     * Update "last saved" timestamp
     */
    updateLastSavedTimestamp() {
        const lastSavedElement = document.getElementById('noteLastSaved');
        if (lastSavedElement) {
            lastSavedElement.textContent = 'Last saved: Just now';
        }
    }
    
    /**
     * Handle notes updated event
     */
    handleNotesUpdated() {
        console.log('📝 Notes updated, refreshing list');
        this.refreshNotesList();
    }
    
    /**
     * Handle note selection changed
     */
    handleSelectionChanged() {
        console.log('📝 Note selection changed, re-rendering');
        this.render();
    }
    
    /**
     * Handle note saved confirmation
     */
    handleNoteSaved() {
        console.log('✅ Note saved confirmation received');
    }
    
    /**
     * Cleanup
     */
    destroy() {
        // Remove store listeners if needed
        console.log('📝 NotesController destroyed');
    }
}

// Make globally available
window.NotesController = NotesController;

