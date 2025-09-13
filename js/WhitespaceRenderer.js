// WhitespaceRenderer - Signal Heat Map Analysis
class WhitespaceRenderer {
    
    /**
     * Main render method for Whitespace view
     */
    static async renderWhitespace(state) {
        try {
            console.log('🎯 Rendering Whitespace heatmap view');
            
            // Get data from Flux store state - handle both array and Map formats
            const signals = Array.isArray(state.signals) ? state.signals : 
                           (state.signals && typeof state.signals[Symbol.iterator] === 'function' ? 
                            Array.from(state.signals.values()) : []);
            
            const accounts = state.accounts || new Map();
            
            console.log(`🔍 Processing ${signals.length} signals`);
            
            // Process signals into matrix format
            const { matrix, signalTypes, accountNames, stats, signalPolarities } = this.processSignalsMatrix(signals, accounts);
            
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
            whitespaceTab.innerHTML = this.generateWhitespaceHTML(matrix, signalTypes, accountNames, stats, signalPolarities);
            
            // Setup event listeners
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
        const signalTypesMap = new Map(); // Use Map to preserve order and store metadata
        const accountMap = new Map();
        const signalPolarities = {};
        
        let totalOccurrences = 0;
        
        // Process each signal from the signals array
        for (let signal of signals) {
            if (!signal || !signal.account_id) {
                continue;
            }
            
            const accountId = signal.account_id;
            
            // Get account name - handle different account data structures
            let accountName = signal.account_name || signal.accountName || `Account ${accountId}`;
            if (accounts) {
                if (accounts.get && typeof accounts.get === 'function') {
                    const account = accounts.get(accountId);
                    if (account) accountName = account.name || accountName;
                } else if (accounts[accountId]) {
                    accountName = accounts[accountId].name || accountName;
                }
            }
            
            // Store account info
            if (!accountMap.has(accountId)) {
                accountMap.set(accountId, accountName);
            }
            
            // Create signal type key - use code if available, otherwise truncate name
            const signalCode = signal.code || signal.signal_code || '';
            const signalName = signal.name || signal.signal_name || 'Unknown';
            const signalKey = signalCode || signalName.substring(0, 20);
            
            // Store full signal info for tooltips
            if (!signalTypesMap.has(signalKey)) {
                signalTypesMap.set(signalKey, {
                    code: signalCode,
                    name: signalName,
                    category: signal.category || 'General'
                });
            }
            
            // Store polarity for this signal type
            const polarity = signal.signal_polarity || signal['Signal Polarity'] || 'Enrichment';
            signalPolarities[signalKey] = polarity;
            
            // Initialize matrix structure
            if (!matrix[accountName]) {
                matrix[accountName] = {};
            }
            
            if (!matrix[accountName][signalKey]) {
                matrix[accountName][signalKey] = {
                    count: 0,
                    polarity: polarity,
                    accountId: accountId,
                    fullSignalName: signalName
                };
            }
            
            // Increment count
            matrix[accountName][signalKey].count++;
            totalOccurrences++;
        }
        
        // Sort accounts and signal types
        const sortedAccounts = Array.from(accountMap.values()).sort();
        const sortedSignalTypes = Array.from(signalTypesMap.keys()).sort();
        
        // Calculate statistics
        const stats = {
            totalAccounts: sortedAccounts.length,
            totalSignalTypes: sortedSignalTypes.length,
            totalOccurrences,
            avgSignalsPerAccount: sortedAccounts.length > 0 ? (totalOccurrences / sortedAccounts.length).toFixed(1) : 0
        };
        
        console.log(`✅ Matrix processing complete:`, stats);
        
        return {
            matrix,
            signalTypes: sortedSignalTypes,
            accountNames: sortedAccounts,
            stats,
            signalPolarities,
            signalTypesMap
        };
    }
    
    /**
     * Generate the HTML structure for the Whitespace view
     */
    static generateWhitespaceHTML(matrix, signalTypes, accountNames, stats, signalPolarities) {
        return `
            <div class="whitespace-container">
                <div class="whitespace-header">
                    <div class="whitespace-header-content">
                        <i class="fas fa-th whitespace-header-icon"></i>
                        <h1 class="whitespace-title">Whitespace Analysis</h1>
                        <p class="whitespace-subtitle">Signal distribution patterns across your portfolio</p>
                    </div>
                </div>
                
                <div class="whitespace-stats">
                    <div class="whitespace-stat-card">
                        <div class="stat-value">${stats.totalAccounts}</div>
                        <div class="stat-label">TOTAL ACCOUNTS</div>
                    </div>
                    <div class="whitespace-stat-card">
                        <div class="stat-value">${stats.totalSignalTypes}</div>
                        <div class="stat-label">SIGNAL TYPES</div>
                    </div>
                    <div class="whitespace-stat-card">
                        <div class="stat-value">${stats.totalOccurrences}</div>
                        <div class="stat-label">TOTAL SIGNALS</div>
                    </div>
                    <div class="whitespace-stat-card">
                        <div class="stat-value">${stats.avgSignalsPerAccount}</div>
                        <div class="stat-label">AVG PER ACCOUNT</div>
                    </div>
                </div>
                
                <div class="whitespace-table-container">
                    <div class="heatmap-scroll-wrapper">
                        ${this.generateHeatmapTable(matrix, signalTypes, accountNames, signalPolarities)}
                    </div>
                </div>
                
                <div class="whitespace-legend">
                    <div class="legend-group">
                        <span class="legend-label">Opportunity:</span>
                        <div class="legend-items">
                            <span class="legend-item opportunity-1">1</span>
                            <span class="legend-item opportunity-2">2</span>
                            <span class="legend-item opportunity-3">3</span>
                            <span class="legend-item opportunity-4">4</span>
                            <span class="legend-item opportunity-5">5+</span>
                        </div>
                    </div>
                    <div class="legend-group">
                        <span class="legend-label">Risk:</span>
                        <div class="legend-items">
                            <span class="legend-item risk-1">1</span>
                            <span class="legend-item risk-2">2</span>
                            <span class="legend-item risk-3">3</span>
                            <span class="legend-item risk-4">4</span>
                            <span class="legend-item risk-5">5+</span>
                        </div>
                    </div>
                    <div class="legend-group">
                        <span class="legend-label">Enrichment:</span>
                        <div class="legend-items">
                            <span class="legend-item enrichment-1">1</span>
                            <span class="legend-item enrichment-2">2</span>
                            <span class="legend-item enrichment-3">3</span>
                            <span class="legend-item enrichment-4">4</span>
                            <span class="legend-item enrichment-5">5+</span>
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
    static generateHeatmapTable(matrix, signalTypes, accountNames, signalPolarities) {
        let tableHTML = `
            <table class="whitespace-heatmap-table">
                <thead>
                    <tr class="heatmap-header-row">
                        <th class="heatmap-corner-cell">Account Name</th>
                        ${signalTypes.map(signalType => {
                            const sanitizedSignal = SecurityUtils.sanitizeHTML(signalType);
                            return `
                                <th class="heatmap-header-cell">
                                    <div class="rotated-header" title="${sanitizedSignal}">
                                        <span>${sanitizedSignal}</span>
                                    </div>
                                </th>
                            `;
                        }).join('')}
                    </tr>
                </thead>
                <tbody>
        `;
        
        // Generate rows for each account
        accountNames.forEach(accountName => {
            const sanitizedAccountName = SecurityUtils.sanitizeHTML(accountName);
            tableHTML += `
                <tr class="heatmap-row">
                    <td class="heatmap-account-cell">${sanitizedAccountName}</td>
            `;
            
            signalTypes.forEach(signalType => {
                const cellData = matrix[accountName]?.[signalType];
                const count = cellData?.count || 0;
                const polarity = cellData?.polarity || signalPolarities[signalType] || 'Enrichment';
                
                const colorClass = this.getColorClass(count, polarity);
                const sanitizedSignalType = SecurityUtils.sanitizeHTML(signalType);
                const fullSignalName = cellData?.fullSignalName || signalType;
                
                tableHTML += `
                    <td class="heatmap-data-cell ${colorClass}" 
                        data-account="${sanitizedAccountName}"
                        data-signal="${sanitizedSignalType}"
                        data-signal-full="${SecurityUtils.sanitizeHTML(fullSignalName)}"
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
        if (count === 0) return 'empty-cell';
        
        const intensity = Math.min(count, 5);
        const polarityClass = (polarity || 'enrichment').toLowerCase();
        
        // Normalize polarity variations
        let normalizedPolarity = polarityClass;
        if (polarityClass === 'opportunities' || polarityClass === 'opportunity') {
            normalizedPolarity = 'opportunity';
        } else if (polarityClass === 'risks' || polarityClass === 'risk') {
            normalizedPolarity = 'risk';
        } else {
            normalizedPolarity = 'enrichment';
        }
        
        return `${normalizedPolarity}-${intensity}`;
    }
    
    /**
     * Setup event listeners for interactivity
     */
    static setupEventListeners() {
        // Add hover effects for data cells
        const dataCells = document.querySelectorAll('.heatmap-data-cell');
        dataCells.forEach(cell => {
            cell.addEventListener('mouseenter', (e) => this.showTooltip(e));
            cell.addEventListener('mouseleave', () => this.hideTooltip());
            cell.addEventListener('click', (e) => this.handleCellClick(e));
        });
    }
    
    /**
     * Show enhanced tooltip on cell hover
     */
    static showTooltip(event) {
        const tooltip = document.getElementById('whitespaceTooltip');
        const cell = event.target;
        
        const account = cell.dataset.account;
        const signal = cell.dataset.signal;
        const signalFull = cell.dataset.signalFull;
        const count = cell.dataset.count;
        const polarity = cell.dataset.polarity;
        
        if (count && count !== '0') {
            tooltip.innerHTML = `
                <div class="tooltip-content">
                    <div class="tooltip-header">${SecurityUtils.sanitizeHTML(account)}</div>
                    <div class="tooltip-signal">${SecurityUtils.sanitizeHTML(signalFull || signal)}</div>
                    <div class="tooltip-stats">
                        <span class="tooltip-count">Count: ${count}</span>
                        <span class="tooltip-polarity ${polarity.toLowerCase()}">${SecurityUtils.sanitizeHTML(polarity)}</span>
                    </div>
                </div>
            `;
            
            // Position tooltip near cursor
            const rect = cell.getBoundingClientRect();
            tooltip.style.display = 'block';
            tooltip.style.left = (rect.left + rect.width / 2) + 'px';
            tooltip.style.top = (rect.top - 10) + 'px';
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
    
    /**
     * Handle cell click for drill-down functionality
     */
    static handleCellClick(event) {
        const cell = event.target;
        const count = cell.dataset.count;
        
        if (count && count !== '0') {
            const account = cell.dataset.account;
            const signal = cell.dataset.signalFull || cell.dataset.signal;
            console.log(`Cell clicked: ${account} - ${signal} (${count} signals)`);
            // Future: Navigate to filtered signal view
        }
    }
}