/**
 * InsightsUtils - Shared utility for calculating portfolio insights
 * Used by both WhitespaceRenderer and PortfolioRenderer for consistent insights
 */
class InsightsUtils {
    
    /**
     * Calculate portfolio insights from account data
     * @param {Object} accountsData - Can be either chartData.accounts or state.accounts Map/Array
     * @returns {Object} Calculated insights object
     */
    static calculateInsights(accountsData) {
        // Normalize accounts data - handle both Map and Array formats
        let accounts = [];
        
        if (Array.isArray(accountsData)) {
            accounts = accountsData;
        } else if (accountsData instanceof Map) {
            accounts = Array.from(accountsData.values());
        } else if (accountsData && accountsData.accounts && Array.isArray(accountsData.accounts)) {
            accounts = accountsData.accounts;
        } else {
            console.warn('No valid accounts data provided to InsightsUtils');
            return this.getEmptyInsights();
        }

        if (accounts.length === 0) {
            return this.getEmptyInsights();
        }

        // Calculate basic metrics
        const totalAccounts = accounts.length;
        const totalSignals = accounts.reduce((sum, account) => sum + (account.signalCount || account.signals?.length || 0), 0);
        
        // Calculate polarity counts for each account if not already calculated
        const enrichedAccounts = accounts.map(account => this.enrichAccountData(account));
        
        // Calculate risk and opportunity metrics
        const highRiskAccounts = enrichedAccounts.filter(a => a.riskScore > 0.5).length;
        const highOpportunityAccounts = enrichedAccounts.filter(a => a.opportunityScore > 0.3).length;
        
        // Calculate renewal value metrics
        const totalRenewalValue = enrichedAccounts.reduce((sum, a) => sum + (a.renewalBaseline || 0), 0);
        const atRiskValue = enrichedAccounts
            .filter(a => a.riskScore > 0.5)
            .reduce((sum, a) => sum + (a.renewalBaseline || 0), 0);
        
        // Find top accounts by various criteria
        const topRiskAccounts = enrichedAccounts
            .filter(a => a.riskScore > 0)
            .sort((a, b) => b.riskScore - a.riskScore)
            .slice(0, 3);
            
        const topOpportunityAccounts = enrichedAccounts
            .filter(a => a.opportunityScore > 0)
            .sort((a, b) => (b.opportunityScore * b.renewalBaseline) - (a.opportunityScore * a.renewalBaseline))
            .slice(0, 3);

        // Calculate additional derived metrics
        const avgSignalsPerAccount = totalAccounts > 0 ? Math.round(totalSignals / totalAccounts) : 0;
        const riskOpportunityRatio = highOpportunityAccounts > 0 ? Math.round(highRiskAccounts / highOpportunityAccounts * 100) / 100 : highRiskAccounts;
        const portfolioRiskPercentage = totalRenewalValue > 0 ? Math.round(atRiskValue / totalRenewalValue * 100) : 0;

        return {
            totalAccounts,
            totalSignals,
            highRiskAccounts,
            highOpportunityAccounts,
            totalRenewalValue,
            atRiskValue,
            portfolioRiskPercentage,
            avgSignalsPerAccount,
            riskOpportunityRatio,
            topRiskAccounts: topRiskAccounts.map(account => ({
                id: account.id,
                name: account.name,
                riskScore: account.riskScore,
                riskPercentage: Math.round(account.riskScore * 100),
                renewalBaseline: account.renewalBaseline
            })),
            topOpportunityAccounts: topOpportunityAccounts.map(account => ({
                id: account.id,
                name: account.name,
                opportunityScore: account.opportunityScore,
                renewalBaseline: account.renewalBaseline,
                opportunityValue: account.opportunityScore * account.renewalBaseline
            })),
            // Raw enriched accounts for advanced use cases
            accounts: enrichedAccounts
        };
    }

    /**
     * Enrich account data with calculated metrics if not already present
     * @param {Object} account - Account object
     * @returns {Object} Enriched account with calculated scores
     */
    static enrichAccountData(account) {
        // If already enriched (has riskScore, opportunityScore), return as-is
        if (account.riskScore !== undefined && account.opportunityScore !== undefined) {
            return account;
        }

        // Clone account to avoid mutation
        const enriched = { ...account };
        
        // Ensure signals array exists
        const signals = enriched.signals || [];
        enriched.signals = signals;
        enriched.signalCount = signals.length;

        // Initialize polarity counts if not present
        if (!enriched.polarityCount) {
            enriched.polarityCount = { risk: 0, opportunity: 0, enrichment: 0 };
            
            // Count signals by polarity
            signals.forEach(signal => {
                const polarity = FormatUtils.normalizePolarityKey(
                    signal.polarity || signal.signal_polarity || signal['Signal Polarity']
                );
                if (enriched.polarityCount.hasOwnProperty(polarity)) {
                    enriched.polarityCount[polarity]++;
                }
            });
        }

        // Calculate scores
        enriched.riskScore = enriched.signalCount > 0 
            ? enriched.polarityCount.risk / enriched.signalCount 
            : 0;
        enriched.opportunityScore = enriched.signalCount > 0 
            ? enriched.polarityCount.opportunity / enriched.signalCount 
            : 0;

        // Determine dominant polarity
        const polarityCounts = enriched.polarityCount;
        enriched.dominantPolarity = Object.keys(polarityCounts).reduce((a, b) => 
            polarityCounts[a] > polarityCounts[b] ? a : b
        );

        // Ensure renewal baseline is a number
        enriched.renewalBaseline = parseFloat(
            enriched.renewalBaseline || 
            enriched.bks_renewal_baseline_usd || 
            enriched['BKS Renewal Baseline (USD)'] || 
            0
        );

        return enriched;
    }

    /**
     * Get empty insights structure for when no data is available
     * @returns {Object} Empty insights object
     */
    static getEmptyInsights() {
        return {
            totalAccounts: 0,
            totalSignals: 0,
            highRiskAccounts: 0,
            highOpportunityAccounts: 0,
            totalRenewalValue: 0,
            atRiskValue: 0,
            portfolioRiskPercentage: 0,
            avgSignalsPerAccount: 0,
            riskOpportunityRatio: 0,
            topRiskAccounts: [],
            topOpportunityAccounts: [],
            accounts: []
        };
    }

    /**
     * Generate compact hero cards HTML for Portfolio view
     * @param {Object} insights - Insights object from calculateInsights()
     * @returns {string} HTML string for hero cards
     */
    static generateHeroCardsHTML(insights) {
        return `
            <div class="portfolio-hero-cards">
                <div class="hero-card risk">
                    <div class="hero-card-icon">
                        <i class="fas fa-exclamation-triangle"></i>
                    </div>
                    <div class="hero-card-content">
                        <div class="hero-card-metric">${insights.highRiskAccounts}</div>
                        <div class="hero-card-label">High-Risk Accounts</div>
                        <div class="hero-card-detail">
                            ${FormatUtils.formatCurrency(insights.atRiskValue)} at risk
                            ${insights.portfolioRiskPercentage > 0 ? ` (${insights.portfolioRiskPercentage}%)` : ''}
                        </div>
                    </div>
                </div>

                <div class="hero-card opportunity">
                    <div class="hero-card-icon">
                        <i class="fas fa-chart-line"></i>
                    </div>
                    <div class="hero-card-content">
                        <div class="hero-card-metric">${insights.highOpportunityAccounts}</div>
                        <div class="hero-card-label">Growth Opportunities</div>
                        <div class="hero-card-detail">
                            Focus accounts with expansion potential
                        </div>
                    </div>
                </div>

                <div class="hero-card portfolio">
                    <div class="hero-card-icon">
                        <i class="fas fa-chart-pie"></i>
                    </div>
                    <div class="hero-card-content">
                        <div class="hero-card-metric">${insights.totalAccounts}</div>
                        <div class="hero-card-label">Total Accounts</div>
                        <div class="hero-card-detail">
                            ${FormatUtils.formatCurrency(insights.totalRenewalValue)} total value
                        </div>
                    </div>
                </div>

                <div class="hero-card signals">
                    <div class="hero-card-icon">
                        <i class="fas fa-bell"></i>
                    </div>
                    <div class="hero-card-content">
                        <div class="hero-card-metric">${insights.totalSignals}</div>
                        <div class="hero-card-label">Active Signals</div>
                        <div class="hero-card-detail">
                            ${insights.avgSignalsPerAccount} avg per account
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Generate full insights cards HTML for Whitespace view (original format)
     * @param {Object} insights - Insights object from calculateInsights()
     * @returns {string} HTML string for full insights cards
     */
    static generateFullInsightsHTML(insights) {
        return `
            <div class="insights-grid">
                <div class="insight-card risk">
                    <div class="insight-header">
                        <i class="fas fa-exclamation-triangle"></i>
                        <h4>Risk Analysis</h4>
                    </div>
                    <div class="insight-metric">
                        <span class="metric-value">${insights.highRiskAccounts}</span>
                        <span class="metric-label">High-Risk Accounts</span>
                    </div>
                    <div class="insight-detail">
                        ${FormatUtils.formatCurrency(insights.atRiskValue)} at risk 
                        ${insights.portfolioRiskPercentage > 0 ? `(${insights.portfolioRiskPercentage}% of portfolio)` : ''}
                    </div>
                    <div class="insight-list">
                        <strong>Top Risk Accounts:</strong>
                        ${insights.topRiskAccounts.map(account => 
                            `<div class="insight-item">${SecurityUtils.sanitizeHTML(account.name)} (${account.riskPercentage}% risk signals)</div>`
                        ).join('')}
                    </div>
                </div>
                
                <div class="insight-card opportunity">
                    <div class="insight-header">
                        <i class="fas fa-chart-line"></i>
                        <h4>Growth Opportunities</h4>
                    </div>
                    <div class="insight-metric">
                        <span class="metric-value">${insights.highOpportunityAccounts}</span>
                        <span class="metric-label">High-Opportunity Accounts</span>
                    </div>
                    <div class="insight-detail">
                        Focus on accounts with expansion potential
                    </div>
                    <div class="insight-list">
                        <strong>Top Opportunities:</strong>
                        ${insights.topOpportunityAccounts.map(account => 
                            `<div class="insight-item">${SecurityUtils.sanitizeHTML(account.name)} (${FormatUtils.formatCurrency(account.renewalBaseline)} value)</div>`
                        ).join('')}
                    </div>
                </div>
                
                <div class="insight-card portfolio">
                    <div class="insight-header">
                        <i class="fas fa-chart-pie"></i>
                        <h4>Portfolio Overview</h4>
                    </div>
                    <div class="insight-metric">
                        <span class="metric-value">${insights.totalAccounts}</span>
                        <span class="metric-label">Total Accounts</span>
                    </div>
                    <div class="insight-detail">
                        ${FormatUtils.formatCurrency(insights.totalRenewalValue)} total renewal value
                    </div>
                    <div class="insight-list">
                        <div class="insight-item">Average signals per account: ${insights.avgSignalsPerAccount}</div>
                        <div class="insight-item">Risk/Opportunity ratio: ${insights.riskOpportunityRatio}:1</div>
                    </div>
                </div>
            </div>
        `;
    }
}

// Make globally available
window.InsightsUtils = InsightsUtils;

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = InsightsUtils;
}