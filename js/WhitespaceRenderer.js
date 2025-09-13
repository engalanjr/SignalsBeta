// WhitespaceRenderer - Renders the Whitespace heatmap view
class WhitespaceRenderer {
    
    static async renderWhitespace(container, app) {
        console.log('🗺️ Rendering Whitespace heatmap view');
        
        if (!container) {
            console.error('No container provided for Whitespace view');
            return;
        }
        
        try {
            // Show loading state
            container.innerHTML = `
                <div class="whitespace-container">
                    <div class="loading-state">
                        <i class="fas fa-chart-area fa-spin"></i>
                        <p>Building whitespace heatmap...</p>
                    </div>
                </div>
            `;
            
            // Get data and build heatmap
            const heatmapData = await this.buildHeatmapData(app);
            
            if (!heatmapData || heatmapData.accounts.length === 0) {
                container.innerHTML = this.renderEmptyState();
                return;
            }
            
            // Render the heatmap
            container.innerHTML = this.renderHeatmapGrid(heatmapData);
            
            // Add interactivity
            this.setupHeatmapInteractions(container);
            
        } catch (error) {
            console.error('Error rendering Whitespace view:', error);
            container.innerHTML = this.renderErrorState();
        }
    }
    
    static async buildHeatmapData(app) {
        const accountSignalMatrix = new Map();
        const allSignalCodes = new Set();
        const accountTotals = new Map();
        
        // Process signals to build the matrix
        if (app.signals && Array.isArray(app.signals)) {
            app.signals.forEach(signal => {
                const accountId = signal.account_id;
                const accountName = signal.account_name || `Account ${accountId}`;
                const signalCode = signal.signal || signal.signal_code || 'UNKNOWN';
                
                // Track all signal codes
                allSignalCodes.add(signalCode);
                
                // Initialize account if needed
                if (!accountSignalMatrix.has(accountId)) {
                    accountSignalMatrix.set(accountId, {
                        accountId,
                        accountName,
                        signals: new Map(),
                        total: 0
                    });
                }
                
                const accountData = accountSignalMatrix.get(accountId);
                
                // Count signals by code
                const currentCount = accountData.signals.get(signalCode) || 0;
                accountData.signals.set(signalCode, currentCount + 1);
                accountData.total++;
                
                // Track total for this account
                accountTotals.set(accountId, accountData.total);
            });
        }
        
        // Sort signal codes alphabetically
        const sortedSignalCodes = Array.from(allSignalCodes).sort((a, b) => {
            // Extract numbers from codes like ARCH-01, ARCH-02
            const getNumericPart = (code) => {
                const match = code.match(/(\d+)/);
                return match ? parseInt(match[1]) : 0;
            };
            
            const getPrefix = (code) => code.replace(/\d+/g, '');
            
            const prefixA = getPrefix(a);
            const prefixB = getPrefix(b);
            
            if (prefixA === prefixB) {
                return getNumericPart(a) - getNumericPart(b);
            }
            return prefixA.localeCompare(prefixB);
        });
        
        // Convert to array and sort by total signals (highest first)
        const accounts = Array.from(accountSignalMatrix.values())
            .sort((a, b) => b.total - a.total);
        
        // Calculate max value for color scaling
        let maxValue = 0;
        accounts.forEach(account => {
            account.signals.forEach((count) => {
                if (count > maxValue) maxValue = count;
            });
        });
        
        return {
            accounts,
            signalCodes: sortedSignalCodes,
            maxValue,
            totalAccounts: accounts.length,
            totalSignalTypes: sortedSignalCodes.length
        };
    }
    
    static renderHeatmapGrid(data) {
        const { accounts, signalCodes, maxValue } = data;
        
        // Build the header row with signal codes
        const headerCells = signalCodes.map(code => `
            <th class="signal-header" title="${SecurityUtils.sanitizeHTML(code)}">
                ${SecurityUtils.sanitizeHTML(this.truncateSignalCode(code))}
            </th>
        `).join('');
        
        // Build the data rows
        const rows = accounts.map(account => {
            const cells = signalCodes.map(code => {
                const count = account.signals.get(code) || 0;
                const intensity = this.getColorIntensity(count, maxValue);
                const cellClass = count > 0 ? `heat-cell heat-${intensity}` : 'heat-cell heat-empty';
                
                return `
                    <td class="${cellClass}" 
                        data-account="${SecurityUtils.sanitizeHTML(account.accountId)}"
                        data-signal="${SecurityUtils.sanitizeHTML(code)}"
                        data-count="${count}"
                        title="${SecurityUtils.sanitizeHTML(account.accountName)} - ${SecurityUtils.sanitizeHTML(code)}: ${count} signal(s)">
                        ${count > 0 ? count : ''}
                    </td>
                `;
            }).join('');
            
            return `
                <tr class="heatmap-row">
                    <td class="account-name-cell" title="${SecurityUtils.sanitizeHTML(account.accountName)}">
                        <div class="account-name">
                            ${SecurityUtils.sanitizeHTML(this.truncateAccountName(account.accountName))}
                        </div>
                        <div class="account-total">Total: ${account.total}</div>
                    </td>
                    ${cells}
                </tr>
            `;
        }).join('');
        
        return `
            <div class="whitespace-container">
                <div class="whitespace-header">
                    <h2>Whitespace Analysis</h2>
                    <div class="whitespace-stats">
                        <span class="stat-item">
                            <i class="fas fa-building"></i> ${accounts.length} Accounts
                        </span>
                        <span class="stat-item">
                            <i class="fas fa-signal"></i> ${signalCodes.length} Signal Types
                        </span>
                    </div>
                </div>
                
                <div class="heatmap-scroll-container">
                    <table class="heatmap-table">
                        <thead>
                            <tr>
                                <th class="account-header">Account Name</th>
                                ${headerCells}
                            </tr>
                        </thead>
                        <tbody>
                            ${rows}
                        </tbody>
                    </table>
                </div>
                
                <div class="heatmap-legend">
                    <span class="legend-label">Signal Intensity:</span>
                    <div class="legend-scale">
                        <span class="legend-item heat-empty">0</span>
                        <span class="legend-item heat-1">Low</span>
                        <span class="legend-item heat-2"></span>
                        <span class="legend-item heat-3"></span>
                        <span class="legend-item heat-4"></span>
                        <span class="legend-item heat-5">High</span>
                    </div>
                </div>
            </div>
        `;
    }
    
    static getColorIntensity(value, maxValue) {
        if (value === 0) return 0;
        if (maxValue === 0) return 1;
        
        const percentage = (value / maxValue) * 100;
        
        if (percentage <= 20) return 1;
        if (percentage <= 40) return 2;
        if (percentage <= 60) return 3;
        if (percentage <= 80) return 4;
        return 5;
    }
    
    static truncateSignalCode(code) {
        // Keep signal codes short for header display
        if (code.length > 10) {
            return code.substring(0, 10) + '...';
        }
        return code;
    }
    
    static truncateAccountName(name) {
        // Truncate long account names
        if (name.length > 30) {
            return name.substring(0, 30) + '...';
        }
        return name;
    }
    
    static setupHeatmapInteractions(container) {
        // Add click handlers for cells
        container.addEventListener('click', (e) => {
            const cell = e.target.closest('.heat-cell');
            if (cell && cell.dataset.count > 0) {
                const accountId = cell.dataset.account;
                const signalCode = cell.dataset.signal;
                const count = cell.dataset.count;
                
                console.log(`Clicked: Account ${accountId}, Signal ${signalCode}, Count: ${count}`);
                
                // Could open a modal or navigate to filtered signals view
                this.showSignalDetails(accountId, signalCode, count);
            }
        });
        
        // Add hover effects
        container.addEventListener('mouseover', (e) => {
            const cell = e.target.closest('.heat-cell');
            if (cell && cell.dataset.count > 0) {
                cell.classList.add('heat-hover');
            }
        });
        
        container.addEventListener('mouseout', (e) => {
            const cell = e.target.closest('.heat-cell');
            if (cell) {
                cell.classList.remove('heat-hover');
            }
        });
    }
    
    static showSignalDetails(accountId, signalCode, count) {
        // Show a tooltip or modal with signal details
        console.log(`Would show details for ${count} ${signalCode} signals for account ${accountId}`);
        
        // For now, just show a notification
        if (typeof NotificationService !== 'undefined') {
            NotificationService.showInfo(`${count} ${signalCode} signal(s) for this account`);
        }
    }
    
    static renderEmptyState() {
        return `
            <div class="whitespace-container">
                <div class="empty-state">
                    <i class="fas fa-chart-area fa-3x"></i>
                    <h3>No Signal Data Available</h3>
                    <p>The whitespace analysis will appear here once signal data is loaded.</p>
                </div>
            </div>
        `;
    }
    
    static renderErrorState() {
        return `
            <div class="whitespace-container">
                <div class="error-state">
                    <i class="fas fa-exclamation-triangle fa-3x"></i>
                    <h3>Error Loading Heatmap</h3>
                    <p>Unable to generate the whitespace analysis. Please try refreshing the page.</p>
                </div>
            </div>
        `;
    }
}

// Make it available globally
window.WhitespaceRenderer = WhitespaceRenderer;