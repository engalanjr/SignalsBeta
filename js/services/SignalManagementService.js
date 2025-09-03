
// Signal Management Service - Handle signal management operations
class SignalManagementService {
    
    static async removeSignalFromFeed(signalId, app) {
        const signalCard = document.querySelector(`[data-signal-id="${signalId}"]`);
        const closeBtn = signalCard?.querySelector('.signal-close-btn');

        // Record the signal removal interaction
        try {
            await SignalFeedbackService.recordSignalRemoval(signalId);
        } catch (error) {
            console.error('Failed to record signal removal interaction:', error);
        }

        if (closeBtn && signalCard) {
            closeBtn.classList.add('water-explosion');
            signalCard.classList.add('exploding');

            setTimeout(() => {
                app.filteredData = app.filteredData.filter(signal => signal.id !== signalId);
                app.data = app.data.filter(signal => signal.id !== signalId);
                app.viewedSignals.delete(signalId);
                
                app.updateSummaryStats();
                app.renderCurrentTab();
                app.showSuccessMessage('Signal removed from feed');
            }, 800);
        } else {
            app.filteredData = app.filteredData.filter(signal => signal.id !== signalId);
            app.data = app.data.filter(signal => signal.id !== signalId);
            app.viewedSignals.delete(signalId);
            app.updateSummaryStats();
            app.renderCurrentTab();
            app.showSuccessMessage('Signal removed from feed');
        }
    }
}
