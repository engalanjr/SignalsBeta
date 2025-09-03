
// Backup Service - Handle saving failed CRUD operations to JSON files
class BackupService {
    
    static async saveFailedOperation(operationType, collection, data, error) {
        const timestamp = new Date().toISOString();
        const failureRecord = {
            timestamp,
            operationType, // 'CREATE', 'UPDATE', 'DELETE', 'READ'
            collection,
            data,
            error: error.message || error.toString(),
            id: `failed_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        };

        try {
            // Try to read existing failures file
            let existingFailures = [];
            try {
                const response = await fetch('./attached_assets/failed_operations.json');
                if (response.ok) {
                    existingFailures = await response.json();
                }
            } catch (readError) {
                console.log('No existing failures file found, creating new one');
            }

            // Add new failure
            existingFailures.push(failureRecord);

            // Create blob and download as file to attached_assets
            const blob = new Blob([JSON.stringify(existingFailures, null, 2)], { 
                type: 'application/json' 
            });
            
            // Create download link
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `failed_operations_${timestamp.split('T')[0]}.json`;
            
            // Trigger download
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            console.log('Saved failed operation to backup file:', failureRecord);
            return { success: true, backup: failureRecord };
        } catch (backupError) {
            console.error('Failed to save backup operation:', backupError);
            return { success: false, error: backupError };
        }
    }

    static async saveFailedInteraction(signalId, interactionType, error) {
        return this.saveFailedOperation('CREATE', 'SignalAI.Interactions', {
            signalId,
            interactionType,
            timestamp: new Date().toISOString(),
            userId: 'current-user'
        }, error);
    }

    static async saveFailedComment(commentData, operationType, error) {
        return this.saveFailedOperation(operationType, 'SignalAI.Comments', commentData, error);
    }

    static async saveFailedActionPlan(planData, operationType, error) {
        return this.saveFailedOperation(operationType, 'SignalAI.ActionPlans', planData, error);
    }
}
