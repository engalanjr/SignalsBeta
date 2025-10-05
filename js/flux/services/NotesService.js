// NotesService - Handles notes CRUD operations through Flux actions
class NotesService {
    
    /**
     * Get global dispatcher safely
     */
    static getDispatcher() {
        if (typeof dispatcher === 'undefined') {
            console.error('Dispatcher not available');
            return null;
        }
        return dispatcher;
    }
    
    /**
     * Create a new note
     */
    static async createNote(noteData) {
        const dispatcher = this.getDispatcher();
        if (!dispatcher) return { success: false, error: 'Dispatcher not available' };
        
        const now = new Date();
        const note = {
            id: `note-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            accountId: noteData.accountId || null,
            accountName: noteData.accountName || '',
            authorId: noteData.authorId || 'current-user',
            authorName: noteData.authorName || 'Current User',
            createdAt: now.toISOString(),
            updatedAt: now.toISOString(),
            meetingDate: noteData.meetingDate || now.toISOString(),
            title: noteData.title || '',
            body: noteData.body || '',
            bodyPlain: this.extractPlainText(noteData.body || ''),
            pinned: noteData.pinned || false,
            visibility: noteData.visibility || 'team',
            deletedAt: null,
            extJson: noteData.extJson || {}
        };
        
        console.log('📝 Creating note:', note.title || 'Untitled');
        
        // Optimistic update
        dispatcher.dispatch({
            type: 'NOTES_REQUESTED',
            note: note,
            operationId: note.id
        });
        
        try {
            // Try Domo API
            const response = await domo.post(
                '/domo/datastores/v1/collections/SignalAI.Notes/documents',
                note
            );
            
            dispatcher.dispatch({
                type: 'NOTES_SUCCEEDED',
                note: note,
                operationId: note.id
            });
            
            console.log('✅ Note created successfully');
            return { success: true, note };
            
        } catch (error) {
            console.warn('⚠️ Domo API error, using local storage fallback:', error);
            
            // Fallback: Store locally
            this.saveToLocalStorage(note);
            
            dispatcher.dispatch({
                type: 'NOTES_SUCCEEDED',
                note: note,
                operationId: note.id
            });
            
            return { success: true, note, fallback: true };
        }
    }
    
    /**
     * Update an existing note
     */
    static async updateNote(noteId, updates) {
        const dispatcher = this.getDispatcher();
        if (!dispatcher) return { success: false, error: 'Dispatcher not available' };
        
        const updateData = {
            ...updates,
            updatedAt: new Date().toISOString()
        };
        
        // If body is updated, update bodyPlain too
        if (updates.body !== undefined) {
            updateData.bodyPlain = this.extractPlainText(updates.body);
        }
        
        console.log('📝 Updating note:', noteId);
        
        // Optimistic update
        dispatcher.dispatch({
            type: 'NOTES_UPDATE_REQUESTED',
            noteId: noteId,
            updates: updateData,
            operationId: `update-${noteId}`
        });
        
        try {
            // Try Domo API
            await domo.patch(
                `/domo/datastores/v1/collections/SignalAI.Notes/documents/${noteId}`,
                updateData
            );
            
            dispatcher.dispatch({
                type: 'NOTES_UPDATE_SUCCEEDED',
                noteId: noteId,
                updates: updateData,
                operationId: `update-${noteId}`
            });
            
            console.log('✅ Note updated successfully');
            return { success: true };
            
        } catch (error) {
            console.warn('⚠️ Domo API error, using local storage fallback:', error);
            
            // Fallback: Update locally
            this.updateLocalStorage(noteId, updateData);
            
            dispatcher.dispatch({
                type: 'NOTES_UPDATE_SUCCEEDED',
                noteId: noteId,
                updates: updateData,
                operationId: `update-${noteId}`
            });
            
            return { success: true, fallback: true };
        }
    }
    
    /**
     * Delete a note (soft delete)
     */
    static async deleteNote(noteId) {
        return this.updateNote(noteId, {
            deletedAt: new Date().toISOString()
        });
    }
    
    /**
     * Restore a deleted note
     */
    static async restoreNote(noteId) {
        return this.updateNote(noteId, {
            deletedAt: null
        });
    }
    
    /**
     * Pin/unpin a note
     */
    static async togglePin(noteId, pinned) {
        return this.updateNote(noteId, { pinned });
    }
    
    /**
     * Change note visibility
     */
    static async updateVisibility(noteId, visibility) {
        return this.updateNote(noteId, { visibility });
    }
    
    /**
     * Extract plain text from HTML body
     */
    static extractPlainText(html) {
        if (!html) return '';
        
        // Simple HTML to text conversion
        const div = document.createElement('div');
        div.innerHTML = html;
        return div.textContent || div.innerText || '';
    }
    
    /**
     * LocalStorage fallback methods
     */
    static saveToLocalStorage(note) {
        try {
            const notes = this.getLocalNotes();
            notes.push(note);
            localStorage.setItem('signalai_notes', JSON.stringify(notes));
        } catch (error) {
            console.error('Error saving to localStorage:', error);
        }
    }
    
    static updateLocalStorage(noteId, updates) {
        try {
            const notes = this.getLocalNotes();
            const index = notes.findIndex(n => n.id === noteId);
            if (index !== -1) {
                notes[index] = { ...notes[index], ...updates };
                localStorage.setItem('signalai_notes', JSON.stringify(notes));
            }
        } catch (error) {
            console.error('Error updating localStorage:', error);
        }
    }
    
    static getLocalNotes() {
        try {
            const data = localStorage.getItem('signalai_notes');
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error('Error reading from localStorage:', error);
            return [];
        }
    }
}

