// PortfolioOverviewRenderer - Dashboard view for AE/CSMs
class PortfolioOverviewRenderer {
    
    /**
     * Main render method for Portfolio Overview
     */
    static renderOverview(state) {
        const container = document.getElementById('portfolio-overview');
        if (!container) {
            console.error('Portfolio Overview container not found');
            return;
        }

        // Get data from state
        const accounts = state.accounts || new Map();
        const signals = state.signals || [];
        const interactions = state.interactions || new Map();
        const plansByAction = state.plansByAction || new Map();

        // Calculate metrics
        const metrics = this.calculateOverviewMetrics(accounts, signals, interactions, plansByAction);
        
        // Generate HTML
        container.innerHTML = `
            <div class="overview-container">
                <div class="overview-header">
                    <h2>Overview</h2>
                    <p class="overview-subtitle">Key metrics and account health visualization for your portfolio</p>
                </div>
                
                <!-- Key Metrics Cards -->
                <div class="overview-metrics-grid">
                    ${this.renderMetricsCard('New Recommendations', 'Since Last Visit', metrics.newRecommendations, 'fa-bell', 'new')}
                    ${this.renderMetricsCard('Actionable Recommendations', 'Renewing This Quarter', metrics.thisQuarter, 'fa-calendar-check', 'thisQ')}
                    ${this.renderMetricsCard('Actionable Recommendations', 'Renewing Next Quarter', metrics.nextQuarter, 'fa-calendar-alt', 'nextQ')}
                    ${this.renderMetricsCard('Actionable Recommendations', 'Renewing Quarter After', metrics.quarterAfter, 'fa-calendar-plus', 'afterQ')}
                </div>
                
                <!-- Two Column Layout: Quarter Breakdown (left) and Risk/Growth Compass (right) -->
                <div class="overview-two-column-layout">
                    <!-- Quarter Breakdown Tables (Column 1) -->
                    <div class="quarter-breakdown-section">
                        <h3>Recommendations by Renewal Quarter</h3>
                        ${this.renderQuarterBreakdown(metrics.quarterBreakdown)}
                    </div>
                    
                    <!-- Risk/Growth Compass Radar (Column 2) -->
                    <div class="compass-radar-section">
                        <div class="compass-header">
                            <h3>Risk/Growth Compass Radar</h3>
                            <div class="compass-legend">
                                <span class="legend-item"><span class="legend-dot risk-dot"></span> Risk Signal</span>
                                <span class="legend-item"><span class="legend-dot growth-dot"></span> Growth Signal</span>
                                <span class="legend-item"><span class="legend-dot stable-dot"></span> Stable</span>
                            </div>
                        </div>
                        <div class="compass-radar-container">
                            ${this.renderCompassRadar(metrics.accountsData)}
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Attach event listeners
        this.attachEventListeners();
    }

    /**
     * Calculate overview metrics
     */
    static calculateOverviewMetrics(accounts, signals, interactions, plansByAction) {
        const currentTime = new Date();
        const lastVisitTime = this.getLastVisitTime();
        
        // Count new recommendations since last visit
        let newRecommendations = 0;
        
        // Get unique actions (recommendations)
        const actionMap = new Map();
        signals.forEach(signal => {
            if (signal.action_id && !actionMap.has(signal.action_id)) {
                actionMap.set(signal.action_id, signal);
                
                // Check if created since last visit
                const createdAt = new Date(signal.created_at || signal.call_date);
                if (createdAt > lastVisitTime) {
                    newRecommendations++;
                }
            }
        });

        // Calculate actionable recommendations by quarter
        // Actionable = recommended actions that do NOT have an action plan
        const { thisQuarter, nextQuarter, quarterAfter } = this.getNextThreeQuarters();
        
        const quarterBreakdown = {
            thisQuarter: { quarter: thisQuarter, accounts: [], count: 0 },
            nextQuarter: { quarter: nextQuarter, accounts: [], count: 0 },
            quarterAfter: { quarter: quarterAfter, accounts: [], count: 0 }
        };

        const accountsData = [];

        accounts.forEach((account, accountId) => {
            // Check if account has actionable recommendations
            const hasActionableRecs = this.hasActionableRecommendations(accountId, signals, plansByAction);
            
            if (!hasActionableRecs) return;

            // Get renewal quarter
            const renewalQuarter = this.getAccountRenewalQuarter(account);
            
            // Get signal counts by polarity
            const accountSignals = signals.filter(s => s.account_id === accountId);
            const riskSignals = accountSignals.filter(s => {
                const polarity = (s.signal_polarity || s['Signal Polarity'] || '').toLowerCase();
                return polarity === 'risk' || polarity === 'risk signal';
            });
            const growthSignals = accountSignals.filter(s => {
                const polarity = (s.signal_polarity || s['Signal Polarity'] || '').toLowerCase();
                return polarity === 'growth' || polarity === 'growth lever' || polarity === 'enrichment';
            });
            
            // Calculate account position for radar
            const accountData = {
                id: accountId,
                name: account.account_name || account.name,
                arr: account.financial?.bks_renewal_baseline_usd || account.bks_renewal_baseline_usd || 0,
                renewalDate: account.financial?.next_renewal_date || account.next_renewal_date || account.renewal_date || 'Unknown',
                riskLevel: this.calculateRiskLevel(account, signals),
                growthTrend: this.calculateGrowthTrend(account, signals),
                signalIntensity: this.calculateSignalIntensity(account, signals),
                renewalQuarter: renewalQuarter,
                actionableCount: this.getActionableCount(accountId, signals, plansByAction),
                riskSignalCount: riskSignals.length,
                growthSignalCount: growthSignals.length
            };
            
            accountsData.push(accountData);

            // Categorize by quarter
            if (renewalQuarter === thisQuarter) {
                quarterBreakdown.thisQuarter.accounts.push(accountData);
                quarterBreakdown.thisQuarter.count += accountData.actionableCount;
            } else if (renewalQuarter === nextQuarter) {
                quarterBreakdown.nextQuarter.accounts.push(accountData);
                quarterBreakdown.nextQuarter.count += accountData.actionableCount;
            } else if (renewalQuarter === quarterAfter) {
                quarterBreakdown.quarterAfter.accounts.push(accountData);
                quarterBreakdown.quarterAfter.count += accountData.actionableCount;
            }
        });

        // Update last visit time
        this.updateLastVisitTime();

        return {
            newRecommendations,
            thisQuarter: quarterBreakdown.thisQuarter.count,
            nextQuarter: quarterBreakdown.nextQuarter.count,
            quarterAfter: quarterBreakdown.quarterAfter.count,
            accountsData,
            quarterBreakdown
        };
    }

    /**
     * Render metrics card
     */
    static renderMetricsCard(title, subtitle, value, icon, type) {
        return `
            <div class="overview-metric-card ${type}">
                <div class="metric-icon">
                    <i class="fas ${icon}"></i>
                </div>
                <div class="metric-content">
                    <div class="metric-label-main">${title}</div>
                    <div class="metric-value">${value}</div>
                    <div class="metric-label-sub">${subtitle}</div>
                </div>
            </div>
        `;
    }
    
    /**
     * Check if an action has an associated action plan
     */
    static hasActionPlan(actionId, plansByAction) {
        if (!plansByAction || !actionId) return false;
        const plans = plansByAction.get(actionId);
        return plans && plans.size > 0;
    }

    /**
     * Render the compass radar visualization
     */
    static renderCompassRadar(accountsData) {
        const width = 600;
        const height = 600;
        const centerX = width / 2;
        const centerY = height / 2;
        const maxRadius = Math.min(width, height) / 2 - 40;

        // Calculate quadrant path coordinates
        const quadrantRadius = maxRadius;
        
        // Generate SVG
        let svg = `
            <svg width="${width}" height="${height}" class="compass-radar-svg" viewBox="0 0 ${width} ${height}">
                <!-- Quadrant background colors -->
                <!-- Top Right: Growth & Healthy (Green) -->
                <path d="M ${centerX} ${centerY} L ${centerX} ${centerY - quadrantRadius} A ${quadrantRadius} ${quadrantRadius} 0 0 1 ${centerX + quadrantRadius} ${centerY} Z" 
                      fill="rgba(40, 167, 69, 0.05)" class="quadrant-bg quadrant-growth-healthy"/>
                
                <!-- Top Left: Risk but Growing (Orange) -->
                <path d="M ${centerX} ${centerY} L ${centerX - quadrantRadius} ${centerY} A ${quadrantRadius} ${quadrantRadius} 0 0 1 ${centerX} ${centerY - quadrantRadius} Z" 
                      fill="rgba(253, 126, 20, 0.05)" class="quadrant-bg quadrant-risk-growing"/>
                
                <!-- Bottom Right: Stable but Flat (Gray) -->
                <path d="M ${centerX} ${centerY} L ${centerX + quadrantRadius} ${centerY} A ${quadrantRadius} ${quadrantRadius} 0 0 1 ${centerX} ${centerY + quadrantRadius} Z" 
                      fill="rgba(173, 181, 189, 0.05)" class="quadrant-bg quadrant-stable-flat"/>
                
                <!-- Bottom Left: Risk and Declining (Red) -->
                <path d="M ${centerX} ${centerY} L ${centerX} ${centerY + quadrantRadius} A ${quadrantRadius} ${quadrantRadius} 0 0 1 ${centerX - quadrantRadius} ${centerY} Z" 
                      fill="rgba(220, 53, 69, 0.05)" class="quadrant-bg quadrant-risk-declining"/>
                
                <!-- Background circles -->
                <circle cx="${centerX}" cy="${centerY}" r="${maxRadius}" fill="none" stroke="#dee2e6" stroke-width="1"/>
                <circle cx="${centerX}" cy="${centerY}" r="${maxRadius * 0.66}" fill="none" stroke="#dee2e6" stroke-width="1"/>
                <circle cx="${centerX}" cy="${centerY}" r="${maxRadius * 0.33}" fill="none" stroke="#dee2e6" stroke-width="1"/>
                
                <!-- Axis lines -->
                <line x1="${centerX}" y1="${centerY - maxRadius}" x2="${centerX}" y2="${centerY + maxRadius}" stroke="#adb5bd" stroke-width="2"/>
                <line x1="${centerX - maxRadius}" y1="${centerY}" x2="${centerX + maxRadius}" y2="${centerY}" stroke="#adb5bd" stroke-width="2"/>
                
                <!-- Quadrant labels -->
                <text x="${centerX + maxRadius/2}" y="${centerY - maxRadius/2 - 10}" text-anchor="middle" class="quadrant-label" fill="#28a745">Growth & Healthy</text>
                <text x="${centerX - maxRadius/2}" y="${centerY - maxRadius/2 - 10}" text-anchor="middle" class="quadrant-label" fill="#fd7e14">Risk but Growing</text>
                <text x="${centerX + maxRadius/2}" y="${centerY + maxRadius/2 + 20}" text-anchor="middle" class="quadrant-label" fill="#adb5bd">Stable but Flat</text>
                <text x="${centerX - maxRadius/2}" y="${centerY + maxRadius/2 + 20}" text-anchor="middle" class="quadrant-label" fill="#dc3545">Risk and Declining</text>
                
                <!-- Account nodes -->
                ${accountsData.map(account => {
                    const position = this.calculateRadarPosition(account, centerX, centerY, maxRadius);
                    const nodeSize = this.calculateNodeSize(account.arr);
                    const nodeColor = this.getNodeColor(account.signalIntensity, account.riskLevel);
                    
                    return `
                        <circle 
                            cx="${position.x}" 
                            cy="${position.y}" 
                            r="${nodeSize}" 
                            fill="${nodeColor}" 
                            opacity="0.8"
                            class="account-node"
                            data-account-id="${account.id}"
                            data-account-name="${SecurityUtils.sanitizeHTML(account.name)}"
                            data-arr="${account.arr}"
                            data-actionable="${account.actionableCount}">
                            <title>${account.name}
━━━━━━━━━━━━━━━━━━━━━━
Actionable Recommendations: ${account.actionableCount}
Risk Signals: ${account.riskSignalCount}
Growth Lever Signals: ${account.growthSignalCount}
━━━━━━━━━━━━━━━━━━━━━━
Renewal ARR: ${FormatUtils.formatCurrency(account.arr)}
Renewal Date: ${this.formatRenewalDate(account.renewalDate)}
Renewal Quarter: ${account.renewalQuarter}</title>
                        </circle>
                    `;
                }).join('')}
            </svg>
        `;

        return svg;
    }

    /**
     * Calculate radar position for an account
     */
    static calculateRadarPosition(account, centerX, centerY, maxRadius) {
        // X-axis: Growth trend (-1 to 1, left to right)
        // Y-axis: Risk level (1 to -1, top to bottom, inverted)
        
        const xOffset = (account.growthTrend * maxRadius * 0.8);
        const yOffset = -(account.riskLevel * maxRadius * 0.8); // Negative because SVG Y increases downward
        
        return {
            x: centerX + xOffset,
            y: centerY + yOffset
        };
    }

    /**
     * Calculate node size based on ARR
     */
    static calculateNodeSize(arr) {
        const minSize = 6;
        const maxSize = 20;
        const logArr = Math.log(arr + 1);
        const maxLogArr = Math.log(10000000); // $10M
        
        return minSize + (logArr / maxLogArr) * (maxSize - minSize);
    }

    /*static calculateNodeSize(arr) {
        // v2: Enhanced bubble sizing with more dramatic differences
        const minSize = 8;      // Increased from 6 for better visibility
        const maxSize = 28;     // Increased from 20 for more dramatic differences
        const logArr = Math.log(arr + 1);
        const maxLogArr = Math.log(10000000); // $10M
        
        // Apply a slight exponential curve to amplify differences
        const normalizedValue = logArr / maxLogArr;
        const amplifiedValue = Math.pow(normalizedValue, 0.85); // Amplify mid-range values
        
        return minSize + (amplifiedValue * (maxSize - minSize));
    }*/

    /**
     * Get node color based on signal intensity and risk
     */
    static getNodeColor(intensity, riskLevel) {
        if (riskLevel > 0.5) {
            // High risk - red gradient
            return `rgba(220, 53, 69, ${0.5 + intensity * 0.5})`;
        } else if (riskLevel < -0.2) {
            // Growth - green gradient
            return `rgba(40, 167, 69, ${0.5 + intensity * 0.5})`;
        } else {
            // Neutral/stable - blue gradient
            return `rgba(0, 125, 186, ${0.5 + intensity * 0.5})`;
        }
    }

    /**
     * Calculate risk level (-1 to 1)
     */
    static calculateRiskLevel(account, signals) {
        const accountSignals = signals.filter(s => s.account_id === account.account_id);
        if (accountSignals.length === 0) return 0;

        let riskScore = 0;
        accountSignals.forEach(signal => {
            const polarity = FormatUtils.normalizePolarityKey(signal.signal_polarity || signal['Signal Polarity']);
            if (polarity === 'risk') riskScore += 1;
            else if (polarity === 'opportunities') riskScore -= 0.5;
        });

        // Normalize to -1 to 1
        return Math.max(-1, Math.min(1, riskScore / accountSignals.length));
    }

    /**
     * Calculate growth trend (-1 to 1)
     */
    static calculateGrowthTrend(account, signals) {
        const accountSignals = signals.filter(s => s.account_id === account.account_id);
        if (accountSignals.length === 0) return 0;

        let growthScore = 0;
        accountSignals.forEach(signal => {
            const polarity = FormatUtils.normalizePolarityKey(signal.signal_polarity || signal['Signal Polarity']);
            if (polarity === 'opportunities') growthScore += 1;
            else if (polarity === 'risk') growthScore -= 0.5;
        });

        // Check usage metrics
        if (account.usage_metrics) {
            const mau = account.usage_metrics.monthly_active_users || 0;
            if (mau > 100) growthScore += 0.5;
        }

        // Normalize to -1 to 1
        return Math.max(-1, Math.min(1, growthScore / (accountSignals.length + 1)));
    }

    /**
     * Calculate signal intensity (0 to 1)
     */
    static calculateSignalIntensity(account, signals) {
        const accountSignals = signals.filter(s => s.account_id === account.account_id);
        const maxSignals = 10;
        return Math.min(1, accountSignals.length / maxSignals);
    }

    /**
     * Check if account has actionable recommendations
     * Actionable = recommended actions that do NOT have an action plan
     */
    static hasActionableRecommendations(accountId, signals, plansByAction) {
        const accountSignals = signals.filter(s => s.account_id === accountId);
        
        // Get distinct action_ids from signals for this account
        const actionIds = new Set(
            accountSignals
                .map(s => s.action_id)
                .filter(id => id != null)
        );
        
        // Check if any action doesn't have a plan
        for (const actionId of actionIds) {
            if (!this.hasActionPlan(actionId, plansByAction)) {
                return true;
            }
        }
        
        return false;
    }

    /**
     * Get count of actionable recommendations (distinct action_ids without action plans)
     */
    static getActionableCount(accountId, signals, plansByAction) {
        const accountSignals = signals.filter(s => s.account_id === accountId);
        
        // Get distinct action_ids from signals for this account
        const distinctActionIds = new Set(
            accountSignals
                .map(s => s.action_id)
                .filter(id => id != null)
        );
        
        // Count actions that don't have plans
        let actionableCount = 0;
        for (const actionId of distinctActionIds) {
            if (!this.hasActionPlan(actionId, plansByAction)) {
                actionableCount++;
            }
        }
        
        return actionableCount;
    }

    /**
     * Format renewal date for display
     */
    static formatRenewalDate(dateString) {
        if (!dateString || dateString === 'Unknown') return 'Unknown';
        
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return 'Unknown';
            
            return date.toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric', 
                year: 'numeric' 
            });
        } catch (e) {
            return 'Unknown';
        }
    }

    /**
     * Get account renewal quarter
     */
    static getAccountRenewalQuarter(account) {
        const renewalDate = account.financial?.next_renewal_date || account.renewal_date;
        if (!renewalDate) return 'Unknown';

        const date = new Date(renewalDate);
        const month = date.getMonth(); // 0-11
        const year = date.getFullYear();

        // Determine FY and Quarter (FY starts Feb 1)
        let fy, quarter;
        if (month >= 1) { // Feb (1) onwards
            fy = year + 1;
            if (month >= 1 && month <= 4) quarter = 1;       // Feb-May
            else if (month >= 5 && month <= 7) quarter = 2;  // Jun-Aug
            else if (month >= 8 && month <= 10) quarter = 3; // Sep-Nov
            else quarter = 4;                                 // Dec-Jan
        } else {
            fy = year;
            quarter = 4;
        }

        return `FY${fy}Q${quarter}`;
    }

    /**
     * Get next three quarters
     */
    static getNextThreeQuarters() {
        const today = new Date();
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();

        // Determine current FY and quarter
        let currentFY, currentQ;
        if (currentMonth >= 1) {
            currentFY = currentYear + 1;
            if (currentMonth >= 1 && currentMonth <= 4) currentQ = 1;
            else if (currentMonth >= 5 && currentMonth <= 7) currentQ = 2;
            else if (currentMonth >= 8 && currentMonth <= 10) currentQ = 3;
            else currentQ = 4;
        } else {
            currentFY = currentYear;
            currentQ = 4;
        }

        // Calculate next three quarters
        const quarters = [];
        for (let i = 0; i < 3; i++) {
            let q = currentQ + i;
            let fy = currentFY;
            
            while (q > 4) {
                q -= 4;
                fy += 1;
            }
            
            quarters.push(`FY${fy}Q${q}`);
        }

        return {
            thisQuarter: quarters[0],
            nextQuarter: quarters[1],
            quarterAfter: quarters[2]
        };
    }

    /**
     * Render quarter breakdown table
     */
    static renderQuarterBreakdown(quarterBreakdown) {
        const quarters = [quarterBreakdown.thisQuarter, quarterBreakdown.nextQuarter, quarterBreakdown.quarterAfter];
        
        return quarters.map(q => {
            // Sort accounts by ARR (Renewal Baseline USD) in descending order
            const sortedAccounts = [...q.accounts].sort((a, b) => b.arr - a.arr);
            
            return `
                    <div class="quarter-breakdown-card">
                        <div class="quarter-breakdown-header">
                            <h4>${q.quarter}</h4>
                            <span class="quarter-count">${q.count} actionable recommendations</span>
                        </div>
                        <div class="quarter-accounts-list">
                            ${sortedAccounts.length > 0 ? 
                                sortedAccounts.map(acc => `
                                    <div class="quarter-account-item" data-account-id="${acc.id}">
                                        <div class="account-info">
                                            <span class="account-name">${SecurityUtils.sanitizeHTML(acc.name)}</span>
                                            <span class="account-arr">${FormatUtils.formatCurrency(acc.arr)}</span>
                                        </div>
                                        <span class="account-badge">${acc.actionableCount} recs</span>
                                    </div>
                                `).join('') 
                                : '<p class="empty-message">No actionable recommendations</p>'
                            }
                        </div>
                    </div>
            `;
        }).join('');
    }

    /**
     * Get/set last visit time from localStorage
     */
    static getLastVisitTime() {
        const stored = localStorage.getItem('portfolioOverview_lastVisit');
        return stored ? new Date(stored) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // Default to 7 days ago
    }

    static updateLastVisitTime() {
        localStorage.setItem('portfolioOverview_lastVisit', new Date().toISOString());
    }

    /**
     * Attach event listeners with hash navigation
     */
    static attachEventListeners() {
        // Node click handler - navigate to Portfolio tab with hash
        document.querySelectorAll('.account-node').forEach(node => {
            node.addEventListener('click', (e) => {
                const accountId = e.target.getAttribute('data-account-id');
                // Set hash and switch to portfolio tab
                window.location.hash = `account/${accountId}`;
                dispatcher.dispatch(Actions.switchTab('my-portfolio'));
            });
        });

        // Quarter account click handler - navigate to Portfolio tab with hash
        document.querySelectorAll('.quarter-account-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const accountId = e.currentTarget.getAttribute('data-account-id');
                // Set hash and switch to portfolio tab
                window.location.hash = `account/${accountId}`;
                dispatcher.dispatch(Actions.switchTab('my-portfolio'));
            });
        });
    }
}

// Make globally available
window.PortfolioOverviewRenderer = PortfolioOverviewRenderer;

