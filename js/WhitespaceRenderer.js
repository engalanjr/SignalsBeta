// WhitespaceRenderer - Creates a heat map view showing signal distribution across accounts
class WhitespaceRenderer {
    
    /**
     * Render the whitespace heat map view
     * @param {Object} app - The app object containing data
     * @returns {string} - HTML string for the heat map
     */
    static async renderWhitespace(app) {
        try {
            console.log('🎯 WhitespaceRenderer: Starting whitespace heat map rendering');
            
            // Get all signals data
            const signalsData = await this.getSignalsData(app);
            if (!signalsData || signalsData.length === 0) {
                return this.renderEmptyState();
            }

            // Aggregate data for heat map
            const heatMapData = this.buildHeatMapData(signalsData);
            
            // Render the heat map
            return this.renderHeatMapTable(heatMapData);
            
        } catch (error) {
            console.error('❌ WhitespaceRenderer: Error rendering whitespace view:', error);
            return this.renderErrorState();
        }
    }

    /**
     * Get signals data from app or fallback sources
     */
    static async getSignalsData(app) {
        try {
            // Try to get data from app.data first
            if (app.data && Array.isArray(app.data)) {
                console.log(`📊 Using ${app.data.length} signals from app.data`);
                return app.data;
            }
            
            // Fallback to loading CSV data directly
            console.log('📊 Loading signals data from CSV...');
            const response = await fetch(`/data.csv?v=${Date.now()}`);
            const csvText = await response.text();
            
            // Parse CSV with robust parsing that handles quoted fields and embedded commas
            const data = this.parseCSV(csvText);
            
            console.log(`📊 Loaded ${data.length} signals from CSV`);
            return data;
            
        } catch (error) {
            console.error('❌ Failed to load signals data:', error);
            return [];
        }
    }

    /**
     * Robust CSV parsing that handles quoted fields, embedded commas, and CRLF variations
     * @param {string} csvText - The raw CSV text
     * @returns {Array} - Array of parsed records
     */
    static parseCSV(csvText) {
        if (!csvText || typeof csvText !== 'string') {
            return [];
        }

        // Normalize line endings - handle both CRLF and LF
        const normalizedText = csvText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        
        const lines = [];
        let currentLine = '';
        let inQuotes = false;
        let i = 0;
        
        // Parse character by character to handle quoted fields properly
        while (i < normalizedText.length) {
            const char = normalizedText[i];
            
            if (char === '"') {
                // Check if this is an escaped quote (double quote)
                if (inQuotes && normalizedText[i + 1] === '"') {
                    currentLine += '"'; // Add literal quote
                    i += 2; // Skip both quotes
                } else {
                    // Toggle quote state
                    inQuotes = !inQuotes;
                    i++;
                }
            } else if (char === '\n' && !inQuotes) {
                // End of line outside of quotes
                if (currentLine.trim()) {
                    lines.push(currentLine);
                }
                currentLine = '';
                i++;
            } else {
                currentLine += char;
                i++;
            }
        }
        
        // Add final line if it exists
        if (currentLine.trim()) {
            lines.push(currentLine);
        }
        
        if (lines.length === 0) {
            return [];
        }
        
        // Parse header row
        const headers = this.parseCSVLine(lines[0]);
        const data = [];
        
        // Parse data rows
        for (let i = 1; i < lines.length; i++) {
            const values = this.parseCSVLine(lines[i]);
            
            // Skip empty rows or rows with insufficient data
            if (values.length === 0 || (values.length === 1 && !values[0].trim())) {
                continue;
            }
            
            const record = {};
            headers.forEach((header, index) => {
                record[header] = index < values.length ? values[index] : '';
            });
            
            // Only add records that have at least an account ID
            if (this.getAccountId(record)) {
                data.push(record);
            }
        }
        
        return data;
    }

    /**
     * Parse a single CSV line handling quoted fields and embedded commas
     * @param {string} line - The CSV line to parse
     * @returns {Array} - Array of field values
     */
    static parseCSVLine(line) {
        const fields = [];
        let currentField = '';
        let inQuotes = false;
        let i = 0;
        
        while (i < line.length) {
            const char = line[i];
            
            if (char === '"') {
                // Check if this is an escaped quote
                if (inQuotes && line[i + 1] === '"') {
                    currentField += '"'; // Add literal quote
                    i += 2;
                } else {
                    // Toggle quote state
                    inQuotes = !inQuotes;
                    i++;
                }
            } else if (char === ',' && !inQuotes) {
                // Field separator outside of quotes
                fields.push(currentField.trim());
                currentField = '';
                i++;
            } else {
                currentField += char;
                i++;
            }
        }
        
        // Add the final field
        fields.push(currentField.trim());
        
        return fields;
    }

    /**
     * Build heat map data structure from signals
     */
    static buildHeatMapData(signalsData) {
        console.log('🔥 Building heat map data structure...');
        
        const accountMap = new Map();
        const signalCodeMap = new Map();
        
        // Process each signal
        signalsData.forEach(signal => {
            const accountId = this.getAccountId(signal);
            const accountName = this.getAccountName(signal, accountId);
            const signalCode = this.getSignalCode(signal);
            const signalName = this.getSignalName(signal);
            const signalPolarity = this.getSignalPolarity(signal);
            const renewalDate = this.getRenewalDate(signal);
            const renewalBaseline = this.getRenewalBaseline(signal);
            
            // Only skip if we have no account ID - allow rows with empty signal codes for whitespace analysis
            if (!accountId) return;
            
            // Initialize account if not exists
            if (!accountMap.has(accountId)) {
                accountMap.set(accountId, {
                    accountId,
                    accountName,
                    renewalDate,
                    renewalBaseline,
                    signals: new Map()
                });
            }
            
            // Track signal codes globally - include codes even with empty names for completeness
            if (signalCode) {
                signalCodeMap.set(signalCode, signalName || `Signal ${signalCode}`);
            }
            
            // Aggregate signal counts by code and polarity - only if we have a signal code
            const account = accountMap.get(accountId);
            if (signalCode) {
                if (!account.signals.has(signalCode)) {
                    account.signals.set(signalCode, {
                        risk: 0,
                        opportunities: 0,
                        enrichment: 0,
                        total: 0
                    });
                }
                
                const signalStats = account.signals.get(signalCode);
                const normalizedPolarity = this.normalizePolarityForCount(signalPolarity);
                signalStats[normalizedPolarity]++;
                signalStats.total++;
            }
        });

        // Convert to array format for rendering
        const accounts = Array.from(accountMap.values());
        const signalCodes = Array.from(signalCodeMap.entries()).sort();
        
        console.log(`🔥 Heat map data: ${accounts.length} accounts, ${signalCodes.length} signal codes`);
        
        return {
            accounts,
            signalCodes,
            accountMap,
            signalCodeMap
        };
    }

    /**
     * Normalize polarity for counting (case insensitive)
     */
    static normalizePolarityForCount(polarity) {
        const normalized = (polarity || '').toLowerCase();
        if (normalized.includes('risk')) return 'risk';
        if (normalized.includes('opportunit')) return 'opportunities';
        return 'enrichment';
    }

    /**
     * Render the heat map table
     */
    static renderHeatMapTable(heatMapData) {
        const { accounts, signalCodes } = heatMapData;
        
        // Sort accounts by renewal baseline (descending)
        accounts.sort((a, b) => (b.renewalBaseline || 0) - (a.renewalBaseline || 0));

        const tableHTML = `
            <div class="whitespace-container">
                <div class="whitespace-header">
                    <h2><i class="fas fa-th"></i> Whitespace Heat Map</h2>
                    <p class="heat-map-description">
                        Signal distribution across accounts showing concentration and whitespace opportunities. 
                        <span class="legend">
                            <span class="legend-item risk">Risk</span>
                            <span class="legend-item opportunities">Opportunities</span>
                            <span class="legend-item enrichment">Enrichment</span>
                        </span>
                    </p>
                </div>
                
                <div class="heat-map-scroll-container">
                    <table class="heat-map-table">
                        <thead>
                            <tr>
                                <th class="account-col sticky-col">Account Name</th>
                                <th class="renewal-col sticky-col">Renewal</th>
                                <th class="baseline-col sticky-col">Renewal Baseline</th>
                                ${signalCodes.map(([code, name]) => 
                                    `<th class="signal-col" title="${SecurityUtils.sanitizeAttribute(name)}">
                                        <div class="signal-header">
                                            <div class="signal-code">${SecurityUtils.sanitizeHTML(code)}</div>
                                            <div class="signal-name">${SecurityUtils.sanitizeHTML(this.truncateText(name, 25))}</div>
                                        </div>
                                    </th>`
                                ).join('')}
                            </tr>
                        </thead>
                        <tbody>
                            ${accounts.map(account => this.renderAccountRow(account, signalCodes)).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        return tableHTML;
    }

    /**
     * Render a single account row
     */
    static renderAccountRow(account, signalCodes) {
        const formattedBaseline = FormatUtils.formatCurrency(account.renewalBaseline || 0);
        const renewalDate = account.renewalDate ? new Date(account.renewalDate).toLocaleDateString('en-US', { 
            month: 'short', 
            year: 'numeric' 
        }) : 'N/A';

        return `
            <tr class="account-row" data-account-id="${SecurityUtils.sanitizeAttribute(account.accountId)}">
                <td class="account-col sticky-col">
                    <div class="account-info">
                        <span class="account-name" title="${SecurityUtils.sanitizeAttribute(account.accountName)}">
                            ${SecurityUtils.sanitizeHTML(this.truncateText(account.accountName, 30))}
                        </span>
                    </div>
                </td>
                <td class="renewal-col sticky-col">
                    <span class="renewal-date">${SecurityUtils.sanitizeHTML(renewalDate)}</span>
                </td>
                <td class="baseline-col sticky-col">
                    <span class="baseline-amount">${SecurityUtils.sanitizeHTML(formattedBaseline)}</span>
                </td>
                ${signalCodes.map(([code]) => this.renderSignalCell(account, code)).join('')}
            </tr>
        `;
    }

    /**
     * Render a signal cell with heat map coloring
     */
    static renderSignalCell(account, signalCode) {
        const signalStats = account.signals.get(signalCode);
        
        if (!signalStats || signalStats.total === 0) {
            // Whitespace - no signals
            return `<td class="signal-cell whitespace" data-signal-code="${SecurityUtils.sanitizeAttribute(signalCode)}"></td>`;
        }

        // Determine dominant polarity and intensity
        const { polarity, intensity, count } = this.calculateCellProperties(signalStats);
        
        return `
            <td class="signal-cell ${polarity} intensity-${intensity}" 
                data-signal-code="${SecurityUtils.sanitizeAttribute(signalCode)}" 
                data-count="${SecurityUtils.sanitizeAttribute(count)}"
                title="${SecurityUtils.sanitizeAttribute(count + ' ' + polarity + ' signal' + (count !== 1 ? 's' : ''))}">
                <span class="signal-count">${SecurityUtils.sanitizeHTML(count)}</span>
            </td>
        `;
    }

    /**
     * Calculate cell properties (polarity, intensity, count)
     */
    static calculateCellProperties(signalStats) {
        const { risk, opportunities, enrichment, total } = signalStats;
        
        // Determine dominant polarity
        let polarity = 'enrichment';
        let count = enrichment;
        
        if (risk > opportunities && risk > enrichment) {
            polarity = 'risk';
            count = risk;
        } else if (opportunities > risk && opportunities > enrichment) {
            polarity = 'opportunities';
            count = opportunities;
        }
        
        // If tied, prioritize: Risk > Opportunities > Enrichment
        if (risk === opportunities && risk > enrichment) {
            polarity = 'risk';
            count = risk;
        } else if (risk === enrichment && risk > opportunities) {
            polarity = 'risk';
            count = risk;
        } else if (opportunities === enrichment && opportunities > risk) {
            polarity = 'opportunities';
            count = opportunities;
        }

        // Calculate intensity (1-4 based on count)
        let intensity = 1;
        if (count >= 10) intensity = 4;
        else if (count >= 5) intensity = 3;
        else if (count >= 2) intensity = 2;

        // Ensure polarity is safe for CSS class names
        polarity = SecurityUtils.validateInput(polarity, 'id');
        
        return { polarity, intensity, count: total };
    }

    /**
     * Get account ID from signal with comprehensive field mapping
     */
    static getAccountId(signal) {
        const accountIdFields = [
            'account_id', 'accountId', 'AccountId', 'Account ID', 'account id',
            'ACCOUNT_ID', 'Account_ID', 'account-id', 'accountid'
        ];
        
        for (const field of accountIdFields) {
            if (signal[field] && String(signal[field]).trim()) {
                return String(signal[field]).trim();
            }
        }
        return null;
    }

    /**
     * Get account name from signal with comprehensive field mapping
     */
    static getAccountName(signal, accountId) {
        const accountNameFields = [
            'account_name', 'accountName', 'AccountName', 'Account Name', 'account name',
            'ACCOUNT_NAME', 'Account_Name', 'account-name', 'name', 'Name',
            'company_name', 'companyName', 'Company Name', 'Company'
        ];
        
        for (const field of accountNameFields) {
            if (signal[field] && String(signal[field]).trim()) {
                return String(signal[field]).trim();
            }
        }
        return accountId ? `Account ${accountId}` : 'Unknown Account';
    }

    /**
     * Get signal code from signal with comprehensive field mapping
     */
    static getSignalCode(signal) {
        const signalCodeFields = [
            'code', 'Code', 'CODE', 'signal_code', 'signalCode', 'SignalCode',
            'Signal Code', 'signal code', 'SIGNAL_CODE', 'Signal_Code',
            'signal-code', 'signalcode', 'id', 'ID', 'Id'
        ];
        
        for (const field of signalCodeFields) {
            if (signal[field] && String(signal[field]).trim()) {
                return String(signal[field]).trim();
            }
        }
        return '';
    }

    /**
     * Get signal name from signal with comprehensive field mapping
     */
    static getSignalName(signal) {
        const signalNameFields = [
            'name', 'Name', 'NAME', 'signal_name', 'signalName', 'SignalName',
            'Signal Name', 'signal name', 'SIGNAL_NAME', 'Signal_Name',
            'signal-name', 'signalname', 'title', 'Title', 'description', 'Description'
        ];
        
        for (const field of signalNameFields) {
            if (signal[field] && String(signal[field]).trim()) {
                return String(signal[field]).trim();
            }
        }
        return '';
    }

    /**
     * Get signal polarity from signal with comprehensive field mapping
     */
    static getSignalPolarity(signal) {
        const polarityFields = [
            'Signal Polarity', 'signal_polarity', 'signalPolarity', 'polarity',
            'Polarity', 'POLARITY', 'SIGNAL_POLARITY', 'Signal_Polarity',
            'signal-polarity', 'type', 'Type', 'category', 'Category'
        ];
        
        for (const field of polarityFields) {
            if (signal[field] && String(signal[field]).trim()) {
                return String(signal[field]).trim();
            }
        }
        return 'Enrichment';
    }

    /**
     * Get renewal date from signal with comprehensive field mapping
     */
    static getRenewalDate(signal) {
        const renewalDateFields = [
            'Next Renewal Date', 'next_renewal_date', 'nextRenewalDate', 'renewal_date',
            'renewalDate', 'RenewalDate', 'RENEWAL_DATE', 'Renewal_Date',
            'renewal-date', 'renewal date', 'next renewal', 'Next Renewal',
            'expiry_date', 'expiryDate', 'expiry', 'Expiry Date'
        ];
        
        for (const field of renewalDateFields) {
            if (signal[field] && String(signal[field]).trim()) {
                return String(signal[field]).trim();
            }
        }
        return '';
    }

    /**
     * Get renewal baseline from signal with comprehensive field mapping
     */
    static getRenewalBaseline(signal) {
        const renewalBaselineFields = [
            'bks_renewal_baseline_usd', 'BKS Renewal Baseline (USD)', 'renewal_baseline',
            'renewalBaseline', 'RenewalBaseline', 'RENEWAL_BASELINE', 'Renewal_Baseline',
            'renewal-baseline', 'baseline', 'Baseline', 'revenue', 'Revenue',
            'amount', 'Amount', 'value', 'Value', 'bks_renewal_baseline'
        ];
        
        for (const field of renewalBaselineFields) {
            if (signal[field] !== undefined && signal[field] !== null && signal[field] !== '') {
                const value = parseFloat(String(signal[field]).replace(/[^0-9.-]/g, ''));
                if (!isNaN(value)) {
                    return value;
                }
            }
        }
        return 0;
    }

    /**
     * Truncate text to specified length
     */
    static truncateText(text, maxLength) {
        if (!text || text.length <= maxLength) return text;
        return text.substring(0, maxLength).trim() + '...';
    }

    /**
     * Render empty state
     */
    static renderEmptyState() {
        return `
            <div class="empty-state">
                <div class="empty-content">
                    <i class="fas fa-th empty-icon"></i>
                    <h3>No Signal Data Available</h3>
                    <p>Load signal data to view the whitespace heat map.</p>
                </div>
            </div>
        `;
    }

    /**
     * Render error state
     */
    static renderErrorState() {
        return `
            <div class="error-state">
                <div class="error-content">
                    <i class="fas fa-exclamation-triangle error-icon"></i>
                    <h3>Error Loading Heat Map</h3>
                    <p>Unable to generate whitespace visualization. Please try again.</p>
                </div>
            </div>
        `;
    }
}

// Make available globally
window.WhitespaceRenderer = WhitespaceRenderer;