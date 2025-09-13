// WhitespaceRenderer - Signal Heat Map Analysis
class WhitespaceRenderer {
    
    /**
     * Main render method for Whitespace view
     */
    static async renderWhitespace(app) {
        try {
            console.log('🎯 Rendering Whitespace heatmap view');
            
            // Process signals into matrix format
            const { matrix, signalTypes, accounts, stats } = this.processSignalsMatrix(app.signals, app.accounts);
            
            console.log(`📊 Processed ${stats.totalAccounts} accounts, ${stats.totalSignalTypes} signal types, ${stats.totalOccurrences} total occurrences`);
            
            // Get the main content container
            const contentContainer = document.querySelector('.main-content');
            if (!contentContainer) {
                console.error('❌ Main content container not found');
                return;
            }
            
            // Create whitespace tab content
            let whitespaceTab = document.getElementById('whitespace');
            if (!whitespaceTab) {
                whitespaceTab = document.createElement('div');
                whitespaceTab.id = 'whitespace';
                whitespaceTab.className = 'tab-content';
                contentContainer.appendChild(whitespaceTab);
            }
            
            // Render the heatmap content
            whitespaceTab.innerHTML = this.generateWhitespaceHTML(matrix, signalTypes, accounts, stats);
            
            // Setup basic interactivity
            this.setupEventListeners();
            
            console.log('✅ Whitespace view rendered successfully');
            
        } catch (error) {
            console.error('❌ Error rendering Whitespace view:', error);
        }
    }
    
    /**
     * Process signals data into heatmap matrix format
     */
    static processSignalsMatrix(signals, accounts) {
        console.log('🔄 Processing signals into heatmap matrix...');
        
        const matrix = {};
        const signalTypes = new Set();
        const accountSet = new Set();
        const signalPolarities = {};
        
        let totalOccurrences = 0;
        
        // Process each signal
        for (let [signalId, signal] of signals) {
            const accountId = signal.account_id;
            const accountName = accounts.get(accountId)?.name || `Account ${accountId}`;
            
            // Create signal type key (combining category and name for uniqueness)
            const signalKey = signal.code ? 
                `${signal.code}: ${signal.name}` : 
                `${signal.category || 'General'}: ${signal.name}`;
            
            signalTypes.add(signalKey);
            accountSet.add(accountName);
            
            // Store polarity for this signal type
            signalPolarities[signalKey] = signal.signal_polarity;
            
            // Initialize matrix structure
            if (!matrix[accountName]) {
                matrix[accountName] = {};
            }
            
            if (!matrix[accountName][signalKey]) {
                matrix[accountName][signalKey] = {
                    count: 0,
                    polarity: signal.signal_polarity,
                    accountId: accountId
                };
            }
            
            // Increment count
            matrix[accountName][signalKey].count++;
            totalOccurrences++;
        }
        
        // Calculate statistics
        const stats = {
            totalAccounts: accountSet.size,
            totalSignalTypes: signalTypes.size,
            totalOccurrences,
            avgSignalsPerAccount: accountSet.size > 0 ? (totalOccurrences / accountSet.size).toFixed(1) : 0
        };
        
        console.log(`✅ Matrix processing complete:`, stats);
        
        return {
            matrix,
            signalTypes: Array.from(signalTypes).sort(),
            accounts: Array.from(accountSet).sort(),
            stats,
            signalPolarities
        };
    }
    
    /**
     * Generate the HTML structure for the Whitespace view
     */
    static generateWhitespaceHTML(matrix, signalTypes, accounts, stats) {
        return `
            <div class="whitespace-container">
                <div class="whitespace-header">
                    <div class="header-content">
                        <div class="header-title">
                            <i class="fas fa-th header-icon"></i>
                            <h1>Whitespace Analysis</h1>
                        </div>
                        <div class="header-subtitle">
                            Signal distribution patterns across your portfolio
                        </div>
                    </div>
                </div>
                
                <div class="whitespace-stats">
                    <div class="stat-card">
                        <div class="stat-value">${stats.totalAccounts}</div>
                        <div class="stat-label">Total Accounts</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${stats.totalSignalTypes}</div>
                        <div class="stat-label">Signal Types</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${stats.totalOccurrences}</div>
                        <div class="stat-label">Total Signals</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${stats.avgSignalsPerAccount}</div>
                        <div class="stat-label">Avg per Account</div>
                    </div>
                </div>
                
                <div class="whitespace-content">
                    <div class="heatmap-wrapper">
                        ${this.generateHeatmapTable(matrix, signalTypes, accounts)}
                    </div>
                </div>
                
                <div class="whitespace-legend">
                    <div class="legend-item">
                        <span class="legend-label">Opportunity:</span>
                        <div class="legend-scale">
                            <div class="legend-box opportunity-1">1</div>
                            <div class="legend-box opportunity-2">2</div>
                            <div class="legend-box opportunity-3">3</div>
                            <div class="legend-box opportunity-4">4</div>
                            <div class="legend-box opportunity-5">5+</div>
                        </div>
                    </div>
                    <div class="legend-item">
                        <span class="legend-label">Risk:</span>
                        <div class="legend-scale">
                            <div class="legend-box risk-1">1</div>
                            <div class="legend-box risk-2">2</div>
                            <div class="legend-box risk-3">3</div>
                            <div class="legend-box risk-4">4</div>
                            <div class="legend-box risk-5">5+</div>
                        </div>
                    </div>
                    <div class="legend-item">
                        <span class="legend-label">Enrichment:</span>
                        <div class="legend-scale">
                            <div class="legend-box enrichment-1">1</div>
                            <div class="legend-box enrichment-2">2</div>
                            <div class="legend-box enrichment-3">3</div>
                            <div class="legend-box enrichment-4">4</div>
                            <div class="legend-box enrichment-5">5+</div>
                        </div>
                    </div>
                </div>
                
                <div class="whitespace-tooltip" id="whitespaceTooltip"></div>
            </div>
        `;
    }
    
    /**
     * Generate the heatmap table HTML
     */
    static generateHeatmapTable(matrix, signalTypes, accounts) {
        let tableHTML = `
            <table class="heatmap-table">
                <thead>
                    <tr>
                        <th class="account-header">Account Name</th>
                        ${signalTypes.map(signalType => `
                            <th class="signal-header" title="${signalType}">
                                ${this.truncateSignalName(signalType)}
                            </th>
                        `).join('')}
                    </tr>
                </thead>
                <tbody>
        `;
        
        // Generate rows for each account
        accounts.forEach(accountName => {
            tableHTML += `<tr>`;
            tableHTML += `<td class="account-name">${SecurityUtils.sanitizeHTML(accountName)}</td>`;
            
            signalTypes.forEach(signalType => {
                const cellData = matrix[accountName]?.[signalType];
                const count = cellData?.count || 0;
                const polarity = cellData?.polarity || 'Enrichment';
                
                const colorClass = this.getColorClass(count, polarity);
                const cellTitle = count > 0 ? `${accountName}\n${signalType}\nCount: ${count}\nType: ${polarity}` : '';
                
                tableHTML += `
                    <td class="data-cell ${colorClass}" 
                        title="${cellTitle}"
                        data-account="${SecurityUtils.sanitizeHTML(accountName)}"
                        data-signal="${SecurityUtils.sanitizeHTML(signalType)}"
                        data-count="${count}"
                        data-polarity="${polarity}">
                        ${count > 0 ? count : ''}
                    </td>
                `;
            });
            
            tableHTML += `</tr>`;
        });
        
        tableHTML += `
                </tbody>
            </table>
        `;
        
        return tableHTML;
    }
    
    /**
     * Get CSS color class based on count and polarity
     */
    static getColorClass(count, polarity) {
        if (count === 0) return '';
        
        const intensity = Math.min(count, 5);
        const polarityClass = polarity.toLowerCase();
        
        // Map polarity variations to consistent class names
        let normalizedPolarity = polarityClass;
        if (polarityClass === 'opportunities' || polarityClass === 'opportunity') {
            normalizedPolarity = 'opportunity';
        } else if (polarityClass === 'risks') {
            normalizedPolarity = 'risk';
        }
        
        return `${normalizedPolarity}-${intensity}`;
    }
    
    /**
     * Truncate long signal names for table headers
     */
    static truncateSignalName(signalName) {
        const maxLength = 15;
        if (signalName.length <= maxLength) return signalName;
        
        // Try to split on colon and take the code part
        if (signalName.includes(':')) {
            const parts = signalName.split(':');
            const code = parts[0].trim();
            if (code.length <= maxLength) return code;
        }
        
        return signalName.substring(0, maxLength - 3) + '...';
    }
    
    /**
     * Setup basic event listeners
     */
    static setupEventListeners() {
        // Basic hover effects for data cells
        const dataCells = document.querySelectorAll('.data-cell');
        dataCells.forEach(cell => {
            cell.addEventListener('mouseenter', (e) => this.showTooltip(e));
            cell.addEventListener('mouseleave', () => this.hideTooltip());
        });
    }
    
    /**
     * Show tooltip on cell hover
     */
    static showTooltip(event) {
        const tooltip = document.getElementById('whitespaceTooltip');
        const cell = event.target;
        
        const account = cell.dataset.account;
        const signal = cell.dataset.signal;
        const count = cell.dataset.count;
        const polarity = cell.dataset.polarity;
        
        if (count && count !== '0') {
            tooltip.innerHTML = `
                <strong>Account:</strong> ${SecurityUtils.sanitizeHTML(account)}<br>
                <strong>Signal:</strong> ${SecurityUtils.sanitizeHTML(signal)}<br>
                <strong>Count:</strong> ${count}<br>
                <strong>Type:</strong> ${SecurityUtils.sanitizeHTML(polarity)}
            `;
            
            tooltip.style.display = 'block';
            tooltip.style.left = event.pageX + 10 + 'px';
            tooltip.style.top = event.pageY + 10 + 'px';
        }
    }
    
    /**
     * Hide tooltip
     */
    static hideTooltip() {
        const tooltip = document.getElementById('whitespaceTooltip');
        if (tooltip) {
            tooltip.style.display = 'none';
        }
    }
}