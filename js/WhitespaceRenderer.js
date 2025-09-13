/**
 * WhitespaceRenderer - Portfolio visualization for strategic whitespace analysis
 * Creates bubble charts and heat maps showing account signals vs renewal potential
 */
class WhitespaceRenderer {
    
    /**
     * Render the main Whitespace view with both visualizations
     */
    static renderWhitespace(app) {
        console.log('🔍 Rendering Whitespace analytics view');
        
        return `
            <div class="whitespace-container">
                <!-- Header Section -->
                <div class="whitespace-header">
                    <div class="header-content">
                        <h1>Portfolio Whitespace Analysis</h1>
                        <p class="header-description">
                            Strategic view of account signal distribution and renewal potential. 
                            Identify high-impact opportunities and risk areas across your portfolio.
                        </p>
                    </div>
                    
                    <div class="whitespace-legend">
                        <div class="legend-item">
                            <span class="legend-dot risk"></span>
                            <span>Risk Signals</span>
                        </div>
                        <div class="legend-item">
                            <span class="legend-dot opportunity"></span>
                            <span>Opportunities</span>
                        </div>
                        <div class="legend-item">
                            <span class="legend-dot enrichment"></span>
                            <span>Enrichment</span>
                        </div>
                    </div>
                </div>

                <!-- Bubble Chart Section -->
                <div class="visualization-section">
                    <div class="viz-header">
                        <h2>Signal Impact vs Renewal Potential</h2>
                        <p class="viz-description">
                            Each bubble represents an account. Position shows signal count vs renewal value, 
                            bubble size indicates signal magnitude, color shows dominant signal polarity.
                        </p>
                    </div>
                    <div class="bubble-chart-container">
                        <canvas id="bubbleChart" width="800" height="400"></canvas>
                        <div id="bubbleTooltip" class="chart-tooltip"></div>
                    </div>
                </div>

                <!-- Heat Map Section -->
                <div class="visualization-section">
                    <div class="viz-header">
                        <h2>Account Signal Activity Heat Map</h2>
                        <p class="viz-description">
                            Intensity map showing signal activity patterns. Darker colors indicate higher activity, 
                            with color hues representing signal polarity distribution.
                        </p>
                    </div>
                    <div class="heatmap-container">
                        <div id="heatmapChart"></div>
                        <div id="heatmapTooltip" class="chart-tooltip"></div>
                    </div>
                </div>

                <!-- Insights Panel -->
                <div class="insights-panel">
                    <h3>Strategic Insights</h3>
                    <div id="whitespaceInsights" class="insights-content">
                        <!-- Dynamic insights will be populated here -->
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Initialize interactive charts after DOM is rendered
     */
    static async initializeCharts(app) {
        console.log('📊 Initializing Whitespace charts');
        
        try {
            // Process data for visualizations
            const chartData = this.processAccountData(app);
            
            // Initialize bubble chart
            await this.initializeBubbleChart(chartData);
            
            // Initialize heat map
            await this.initializeHeatMap(chartData);
            
            // Generate strategic insights
            this.generateInsights(chartData);
            
            console.log('✅ Whitespace charts initialized successfully');
        } catch (error) {
            console.error('❌ Error initializing Whitespace charts:', error);
            this.showError('Failed to load portfolio visualizations');
        }
    }

    /**
     * Process account data for visualization
     */
    static processAccountData(app) {
        const accountData = [];
        const signalTypes = new Set();
        
        if (!app.accounts || !app.data) {
            console.warn('No account or signal data available');
            return { accounts: accountData, signalTypes: Array.from(signalTypes) };
        }

        // Process each account
        for (let [accountId, account] of app.accounts) {
            if (!account.signals || account.signals.length === 0) continue;
            
            // Calculate signal polarity distribution
            const polarityCount = { risk: 0, opportunities: 0, enrichment: 0 };
            const signalsByType = {};
            let totalSignalMagnitude = 0;
            
            account.signals.forEach(signal => {
                const polarity = FormatUtils.normalizePolarityToCanonical(signal.polarity || 'enrichment');
                polarityCount[polarity]++;
                
                // Group signals by type
                const signalType = signal.signal_type || signal.type || 'General';
                signalTypes.add(signalType);
                
                if (!signalsByType[signalType]) {
                    signalsByType[signalType] = { count: 0, polarity: {} };
                }
                signalsByType[signalType].count++;
                signalsByType[signalType].polarity[polarity] = 
                    (signalsByType[signalType].polarity[polarity] || 0) + 1;
                
                // Calculate magnitude (higher for risk/opportunity)
                totalSignalMagnitude += polarity === 'risk' ? 3 : polarity === 'opportunities' ? 2 : 1;
            });
            
            // Determine dominant polarity
            const dominantPolarity = Object.keys(polarityCount)
                .reduce((a, b) => polarityCount[a] > polarityCount[b] ? a : b);
            
            // Get renewal baseline (use actual field from CSV data)
            const renewalBaseline = parseFloat(account.bks_renewal_baseline_usd) || 0;
            
            accountData.push({
                id: accountId,
                name: account.name || `Account ${accountId}`,
                signalCount: account.signals.length,
                renewalBaseline: renewalBaseline,
                dominantPolarity: dominantPolarity,
                polarityDistribution: polarityCount,
                signalMagnitude: totalSignalMagnitude,
                signalsByType: signalsByType,
                riskScore: polarityCount.risk / account.signals.length,
                opportunityScore: polarityCount.opportunities / account.signals.length
            });
        }
        
        return { 
            accounts: accountData.sort((a, b) => b.signalMagnitude - a.signalMagnitude),
            signalTypes: Array.from(signalTypes).sort()
        };
    }

    /**
     * Initialize bubble chart visualization
     */
    static async initializeBubbleChart(chartData) {
        const canvas = document.getElementById('bubbleChart');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        const { accounts } = chartData;
        
        // Set up canvas dimensions
        const padding = 60;
        const chartWidth = canvas.width - (padding * 2);
        const chartHeight = canvas.height - (padding * 2);
        
        // Calculate scales
        const maxSignals = Math.max(...accounts.map(a => a.signalCount));
        const maxRenewal = Math.max(...accounts.map(a => a.renewalBaseline));
        const maxMagnitude = Math.max(...accounts.map(a => a.signalMagnitude));
        
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw axes
        this.drawBubbleChartAxes(ctx, canvas, padding, maxSignals, maxRenewal);
        
        // Draw bubbles
        accounts.forEach(account => {
            const x = padding + (account.signalCount / maxSignals) * chartWidth;
            const y = canvas.height - padding - (account.renewalBaseline / maxRenewal) * chartHeight;
            const radius = Math.max(8, (account.signalMagnitude / maxMagnitude) * 25);
            
            // Set color based on dominant polarity
            const colors = {
                risk: '#e53e3e',
                opportunities: '#38a169',
                enrichment: '#718096'
            };
            
            ctx.fillStyle = colors[account.dominantPolarity];
            ctx.globalAlpha = 0.7;
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fill();
            
            // Add border
            ctx.globalAlpha = 1;
            ctx.strokeStyle = colors[account.dominantPolarity];
            ctx.lineWidth = 2;
            ctx.stroke();
        });
        
        // Add interactivity
        this.addBubbleChartInteractivity(canvas, accounts, padding, chartWidth, chartHeight, maxSignals, maxRenewal, maxMagnitude);
    }

    /**
     * Draw bubble chart axes and labels
     */
    static drawBubbleChartAxes(ctx, canvas, padding, maxSignals, maxRenewal) {
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 1;
        ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
        ctx.fillStyle = '#64748b';
        
        // X-axis
        ctx.beginPath();
        ctx.moveTo(padding, canvas.height - padding);
        ctx.lineTo(canvas.width - padding, canvas.height - padding);
        ctx.stroke();
        
        // Y-axis
        ctx.beginPath();
        ctx.moveTo(padding, padding);
        ctx.lineTo(padding, canvas.height - padding);
        ctx.stroke();
        
        // X-axis labels
        for (let i = 0; i <= 5; i++) {
            const x = padding + (i / 5) * (canvas.width - padding * 2);
            const value = Math.round((i / 5) * maxSignals);
            ctx.textAlign = 'center';
            ctx.fillText(value.toString(), x, canvas.height - padding + 20);
        }
        
        // Y-axis labels
        for (let i = 0; i <= 5; i++) {
            const y = canvas.height - padding - (i / 5) * (canvas.height - padding * 2);
            const value = FormatUtils.formatCurrency((i / 5) * maxRenewal);
            ctx.textAlign = 'right';
            ctx.fillText(value, padding - 10, y + 4);
        }
        
        // Axis titles
        ctx.font = '14px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
        ctx.fillStyle = '#374151';
        
        // X-axis title
        ctx.textAlign = 'center';
        ctx.fillText('Signal Count', canvas.width / 2, canvas.height - 10);
        
        // Y-axis title (rotated)
        ctx.save();
        ctx.translate(20, canvas.height / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText('Renewal Baseline Value', 0, 0);
        ctx.restore();
    }

    /**
     * Add interactivity to bubble chart
     */
    static addBubbleChartInteractivity(canvas, accounts, padding, chartWidth, chartHeight, maxSignals, maxRenewal, maxMagnitude) {
        const tooltip = document.getElementById('bubbleTooltip');
        
        canvas.addEventListener('mousemove', (event) => {
            const rect = canvas.getBoundingClientRect();
            const mouseX = event.clientX - rect.left;
            const mouseY = event.clientY - rect.top;
            
            // Find hovered account
            const hoveredAccount = accounts.find(account => {
                const x = padding + (account.signalCount / maxSignals) * chartWidth;
                const y = canvas.height - padding - (account.renewalBaseline / maxRenewal) * chartHeight;
                const radius = Math.max(8, (account.signalMagnitude / maxMagnitude) * 25);
                
                const distance = Math.sqrt((mouseX - x) ** 2 + (mouseY - y) ** 2);
                return distance <= radius;
            });
            
            if (hoveredAccount) {
                // Show tooltip
                tooltip.innerHTML = `
                    <div class="tooltip-header">${SecurityUtils.sanitizeHTML(hoveredAccount.name)}</div>
                    <div class="tooltip-row">
                        <span>Signals:</span> 
                        <strong>${hoveredAccount.signalCount}</strong>
                    </div>
                    <div class="tooltip-row">
                        <span>Renewal Value:</span> 
                        <strong>${FormatUtils.formatCurrency(hoveredAccount.renewalBaseline)}</strong>
                    </div>
                    <div class="tooltip-row">
                        <span>Risk Signals:</span> 
                        <strong>${hoveredAccount.polarityDistribution.risk}</strong>
                    </div>
                    <div class="tooltip-row">
                        <span>Opportunities:</span> 
                        <strong>${hoveredAccount.polarityDistribution.opportunities}</strong>
                    </div>
                    <div class="tooltip-row">
                        <span>Dominant Type:</span> 
                        <strong class="polarity-${hoveredAccount.dominantPolarity}">${this.formatPolarity(hoveredAccount.dominantPolarity)}</strong>
                    </div>
                `;
                tooltip.style.display = 'block';
                tooltip.style.left = (event.clientX + 10) + 'px';
                tooltip.style.top = (event.clientY - 10) + 'px';
                canvas.style.cursor = 'pointer';
            } else {
                tooltip.style.display = 'none';
                canvas.style.cursor = 'default';
            }
        });
        
        canvas.addEventListener('mouseleave', () => {
            tooltip.style.display = 'none';
            canvas.style.cursor = 'default';
        });
        
        canvas.addEventListener('click', (event) => {
            const rect = canvas.getBoundingClientRect();
            const mouseX = event.clientX - rect.left;
            const mouseY = event.clientY - rect.top;
            
            // Find clicked account
            const clickedAccount = accounts.find(account => {
                const x = padding + (account.signalCount / maxSignals) * chartWidth;
                const y = canvas.height - padding - (account.renewalBaseline / maxRenewal) * chartHeight;
                const radius = Math.max(8, (account.signalMagnitude / maxMagnitude) * 25);
                
                const distance = Math.sqrt((mouseX - x) ** 2 + (mouseY - y) ** 2);
                return distance <= radius;
            });
            
            if (clickedAccount) {
                // Navigate to Portfolio view filtered by this account
                console.log('Navigate to account:', clickedAccount.name);
                if (window.app && typeof window.app.switchToPortfolioView === 'function') {
                    window.app.switchToPortfolioView(clickedAccount.id);
                }
            }
        });
    }

    /**
     * Initialize heat map visualization
     */
    static async initializeHeatMap(chartData) {
        const container = document.getElementById('heatmapChart');
        if (!container) return;
        
        const { accounts, signalTypes } = chartData;
        
        // Create heat map table
        const heatMapHTML = this.generateHeatMapHTML(accounts, signalTypes);
        container.innerHTML = heatMapHTML;
        
        // Add interactivity
        this.addHeatMapInteractivity(container);
    }

    /**
     * Generate heat map HTML
     */
    static generateHeatMapHTML(accounts, signalTypes) {
        // Limit accounts for readability
        const displayAccounts = accounts.slice(0, 20);
        
        let html = `
            <div class="heatmap-table">
                <div class="heatmap-header">
                    <div class="account-header">Account</div>
                    <div class="renewal-header">Renewal Value</div>
                    ${signalTypes.map(type => `<div class="signal-header">${SecurityUtils.sanitizeHTML(type)}</div>`).join('')}
                </div>
        `;
        
        displayAccounts.forEach(account => {
            html += `
                <div class="heatmap-row" data-account-id="${account.id}">
                    <div class="account-cell">
                        <span class="account-name">${SecurityUtils.sanitizeHTML(account.name)}</span>
                        <span class="signal-count">${account.signalCount} signals</span>
                    </div>
                    <div class="renewal-cell">
                        ${FormatUtils.formatCurrency(account.renewalBaseline)}
                    </div>
                    ${signalTypes.map(type => {
                        const typeData = account.signalsByType[type];
                        const intensity = typeData ? typeData.count : 0;
                        const dominantPolarity = this.getDominantPolarityForType(typeData);
                        const maxIntensity = 5; // Adjust based on your data
                        
                        return `
                            <div class="signal-cell ${dominantPolarity}" 
                                 data-intensity="${intensity}"
                                 data-signal-type="${type}"
                                 data-account="${account.name}"
                                 style="opacity: ${intensity > 0 ? Math.max(0.3, intensity / maxIntensity) : 0.1}">
                                ${intensity > 0 ? intensity : ''}
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
        });
        
        html += '</div>';
        return html;
    }

    /**
     * Get dominant polarity for a signal type
     */
    static getDominantPolarityForType(typeData) {
        if (!typeData || !typeData.polarity) return 'enrichment';
        
        const { polarity } = typeData;
        return Object.keys(polarity).reduce((a, b) => polarity[a] > polarity[b] ? a : b);
    }

    /**
     * Add heat map interactivity
     */
    static addHeatMapInteractivity(container) {
        const tooltip = document.getElementById('heatmapTooltip');
        
        container.addEventListener('mouseover', (event) => {
            const cell = event.target.closest('.signal-cell');
            if (cell) {
                const intensity = cell.dataset.intensity;
                const signalType = cell.dataset.signalType;
                const account = cell.dataset.account;
                
                if (intensity > 0) {
                    tooltip.innerHTML = `
                        <div class="tooltip-header">${SecurityUtils.sanitizeHTML(account)}</div>
                        <div class="tooltip-row">
                            <span>Signal Type:</span> 
                            <strong>${SecurityUtils.sanitizeHTML(signalType)}</strong>
                        </div>
                        <div class="tooltip-row">
                            <span>Count:</span> 
                            <strong>${intensity}</strong>
                        </div>
                    `;
                    tooltip.style.display = 'block';
                    tooltip.style.left = (event.clientX + 10) + 'px';
                    tooltip.style.top = (event.clientY - 10) + 'px';
                }
            }
        });
        
        container.addEventListener('mouseleave', () => {
            tooltip.style.display = 'none';
        });
        
        // Add click handlers for account rows
        container.addEventListener('click', (event) => {
            const row = event.target.closest('.heatmap-row');
            if (row) {
                const accountId = row.dataset.accountId;
                console.log('Navigate to account from heatmap:', accountId);
                if (window.app && typeof window.app.switchToPortfolioView === 'function') {
                    window.app.switchToPortfolioView(accountId);
                }
            }
        });
    }

    /**
     * Generate strategic insights
     */
    static generateInsights(chartData) {
        const container = document.getElementById('whitespaceInsights');
        if (!container) return;
        
        const { accounts } = chartData;
        
        // Calculate insights
        const totalAccounts = accounts.length;
        const highRiskAccounts = accounts.filter(a => a.riskScore > 0.5).length;
        const highOpportunityAccounts = accounts.filter(a => a.opportunityScore > 0.3).length;
        const totalRenewalValue = accounts.reduce((sum, a) => sum + a.renewalBaseline, 0);
        const atRiskValue = accounts
            .filter(a => a.riskScore > 0.5)
            .reduce((sum, a) => sum + a.renewalBaseline, 0);
        
        const topRiskAccounts = accounts
            .filter(a => a.riskScore > 0)
            .sort((a, b) => b.riskScore - a.riskScore)
            .slice(0, 3);
            
        const topOpportunityAccounts = accounts
            .filter(a => a.opportunityScore > 0)
            .sort((a, b) => (b.opportunityScore * b.renewalBaseline) - (a.opportunityScore * a.renewalBaseline))
            .slice(0, 3);

        container.innerHTML = `
            <div class="insights-grid">
                <div class="insight-card risk">
                    <div class="insight-header">
                        <i class="fas fa-exclamation-triangle"></i>
                        <h4>Risk Analysis</h4>
                    </div>
                    <div class="insight-metric">
                        <span class="metric-value">${highRiskAccounts}</span>
                        <span class="metric-label">High-Risk Accounts</span>
                    </div>
                    <div class="insight-detail">
                        ${FormatUtils.formatCurrency(atRiskValue)} at risk (${Math.round(atRiskValue / totalRenewalValue * 100)}% of portfolio)
                    </div>
                    <div class="insight-list">
                        <strong>Top Risk Accounts:</strong>
                        ${topRiskAccounts.map(a => 
                            `<div class="insight-item">${SecurityUtils.sanitizeHTML(a.name)} (${Math.round(a.riskScore * 100)}% risk signals)</div>`
                        ).join('')}
                    </div>
                </div>
                
                <div class="insight-card opportunity">
                    <div class="insight-header">
                        <i class="fas fa-chart-line"></i>
                        <h4>Growth Opportunities</h4>
                    </div>
                    <div class="insight-metric">
                        <span class="metric-value">${highOpportunityAccounts}</span>
                        <span class="metric-label">High-Opportunity Accounts</span>
                    </div>
                    <div class="insight-detail">
                        Focus on accounts with expansion potential
                    </div>
                    <div class="insight-list">
                        <strong>Top Opportunities:</strong>
                        ${topOpportunityAccounts.map(a => 
                            `<div class="insight-item">${SecurityUtils.sanitizeHTML(a.name)} (${FormatUtils.formatCurrency(a.renewalBaseline)} value)</div>`
                        ).join('')}
                    </div>
                </div>
                
                <div class="insight-card portfolio">
                    <div class="insight-header">
                        <i class="fas fa-chart-pie"></i>
                        <h4>Portfolio Overview</h4>
                    </div>
                    <div class="insight-metric">
                        <span class="metric-value">${totalAccounts}</span>
                        <span class="metric-label">Total Accounts</span>
                    </div>
                    <div class="insight-detail">
                        ${FormatUtils.formatCurrency(totalRenewalValue)} total renewal value
                    </div>
                    <div class="insight-list">
                        <div class="insight-item">Average signals per account: ${Math.round(accounts.reduce((sum, a) => sum + a.signalCount, 0) / totalAccounts)}</div>
                        <div class="insight-item">Risk/Opportunity ratio: ${Math.round(highRiskAccounts / Math.max(highOpportunityAccounts, 1) * 100) / 100}:1</div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Format polarity for display
     */
    static formatPolarity(polarity) {
        const formatted = {
            risk: 'Risk',
            opportunities: 'Opportunity', 
            enrichment: 'Enrichment'
        };
        return formatted[polarity] || 'Unknown';
    }

    /**
     * Show error message
     */
    static showError(message) {
        console.error('Whitespace error:', message);
        const container = document.querySelector('.whitespace-container');
        if (container) {
            container.innerHTML = `
                <div class="error-state">
                    <i class="fas fa-exclamation-circle"></i>
                    <h3>Unable to Load Whitespace Analysis</h3>
                    <p>${SecurityUtils.sanitizeHTML(message)}</p>
                    <button onclick="window.location.reload()" class="btn btn-primary">
                        <i class="fas fa-refresh"></i> Retry
                    </button>
                </div>
            `;
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WhitespaceRenderer;
}