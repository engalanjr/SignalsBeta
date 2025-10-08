// HomeController - Manages the Home portfolio view
class HomeController {
    
    constructor() {
        console.log('🏠 Initializing HomeController...');
        this.isInitialized = false;
        this.subscriptionId = 'home-controller';
        
        // Subscribe to store changes
        this.subscribeToStore();
        
        console.log('✅ HomeController initialized');
        this.isInitialized = true;
    }
    
    /**
     * Subscribe to SignalsStore changes
     */
    subscribeToStore() {
        if (!window.signalsStore) {
            console.warn('⚠️ SignalsStore not available, will retry subscription');
            setTimeout(() => this.subscribeToStore(), 100);
            return;
        }
        
        console.log('🔌 HomeController: Subscribing to store changes');
        
        // Subscribe to data loaded events
        signalsStore.subscribe(this.subscriptionId, () => {
            this.handleStoreChange();
        });
        
        console.log('✅ HomeController: Store subscription established');
    }
    
    /**
     * Handle store changes
     */
    handleStoreChange() {
        if (!this.isInitialized) return;
        
        const state = signalsStore.getState();
        
        // Only re-render if we're on the home tab
        if (state.currentTab === 'home') {
            this.render(state);
        }
    }
    
    /**
     * Main render method
     */
    render(state) {
        try {
            console.log('🏠 HomeController: Rendering home view');
            
            // Ensure HomeRenderer is available
            if (typeof HomeRenderer === 'undefined') {
                console.error('❌ HomeRenderer not available');
                return;
            }
            
            // Render the home view
            HomeRenderer.renderHome(state);
            
            console.log('✅ HomeController: Home view rendered successfully');
            
        } catch (error) {
            console.error('❌ HomeController: Error rendering home view:', error);
        }
    }
    
    /**
     * Get portfolio data from store
     */
    getPortfolioData() {
        if (!window.signalsStore) {
            console.warn('⚠️ SignalsStore not available');
            return [];
        }
        
        return signalsStore.getPortfolioData();
    }
    
    /**
     * Filter portfolio data (future enhancement)
     */
    filterPortfolioData(filters) {
        const portfolioData = this.getPortfolioData();
        
        if (!filters || Object.keys(filters).length === 0) {
            return portfolioData;
        }
        
        return portfolioData.filter(row => {
            // Team filter
            if (filters.team && row.Team !== filters.team) {
                return false;
            }
            
            // Quarter filter
            if (filters.quarter && row.QTR !== filters.quarter) {
                return false;
            }
            
            // Category filter
            if (filters.category && row.Category !== filters.category) {
                return false;
            }
            
            // Active Services filter
            if (filters.activeServices !== undefined && row['Active Services?'] !== (filters.activeServices ? 'Yes' : 'No')) {
                return false;
            }
            
            return true;
        });
    }
    
    /**
     * Search portfolio data (future enhancement)
     */
    searchPortfolioData(searchTerm) {
        const portfolioData = this.getPortfolioData();
        
        if (!searchTerm || searchTerm.trim() === '') {
            return portfolioData;
        }
        
        const term = searchTerm.toLowerCase();
        
        return portfolioData.filter(row => {
            return (
                row.Account.toLowerCase().includes(term) ||
                row.Team.toLowerCase().includes(term) ||
                row['Support Package'].toLowerCase().includes(term) ||
                row['Ace Overview'].toLowerCase().includes(term) ||
                row['Adoption Consultants'].toLowerCase().includes(term) ||
                row['Service Team'].toLowerCase().includes(term)
            );
        });
    }
    
    /**
     * Export portfolio data (future enhancement)
     */
    exportPortfolioData(format = 'csv') {
        const portfolioData = this.getPortfolioData();
        
        if (format === 'csv') {
            this.exportAsCSV(portfolioData);
        } else if (format === 'json') {
            this.exportAsJSON(portfolioData);
        }
    }
    
    /**
     * Export data as CSV
     */
    exportAsCSV(data) {
        if (!data || data.length === 0) {
            console.warn('⚠️ No data to export');
            return;
        }
        
        const headers = Object.keys(data[0]);
        const csvContent = [
            headers.join(','),
            ...data.map(row => 
                headers.map(header => {
                    const value = row[header] || '';
                    // Escape quotes and wrap in quotes if contains comma
                    return value.includes(',') ? `"${value.replace(/"/g, '""')}"` : value;
                }).join(',')
            )
        ].join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `portfolio-data-${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        console.log('✅ Portfolio data exported as CSV');
    }
    
    /**
     * Export data as JSON
     */
    exportAsJSON(data) {
        if (!data || data.length === 0) {
            console.warn('⚠️ No data to export');
            return;
        }
        
        const jsonContent = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `portfolio-data-${new Date().toISOString().split('T')[0]}.json`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        console.log('✅ Portfolio data exported as JSON');
    }
    
    /**
     * Cleanup method
     */
    destroy() {
        if (window.signalsStore && this.subscriptionId) {
            signalsStore.unsubscribe(this.subscriptionId);
        }
        
        console.log('🧹 HomeController destroyed');
    }
}

// Make HomeController globally available
window.HomeController = HomeController;
