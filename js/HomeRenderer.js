// HomeRenderer - Portfolio table view for AEs and CSMs
class HomeRenderer {
    
    /**
     * Main render method for Home portfolio table
     */
    static renderHome(state) {
        const container = document.getElementById('home');
        if (!container) {
            console.error('Home container not found');
            return;
        }

        // Get portfolio data from state (use filtered data if available)
        let portfolioData = state.filteredPortfolioData || state.portfolioData || [];
        
        if (!portfolioData || portfolioData.length === 0) {
            container.innerHTML = `
                <div class="home-container">
                    <div class="home-header">
                        <h2>Home</h2>
                        <p class="home-subtitle">Portfolio overview for AEs and CSMs</p>
                    </div>
                    <div class="no-data-message">
                        <i class="fas fa-info-circle"></i>
                        <p>No portfolio data available</p>
                    </div>
                </div>
            `;
            return;
        }

        // Apply default sort: Quarter ASC, then Baseline DESC, then Date ASC
        portfolioData = this.applyDefaultSort(portfolioData);

        // Calculate grand total
        const grandTotal = this.calculateGrandTotal(portfolioData);
        
        // Store state reference for signal/action counting
        this.currentState = state;
        
        // Generate HTML
        container.innerHTML = `
            <div class="home-container">
                <div class="home-header">
                    <h2>Home</h2>
                    <p class="home-subtitle">Portfolio overview for AEs and CSMs</p>
                </div>
                
                <!-- Portfolio Table -->
                <div class="portfolio-table-container">
                    <table class="portfolio-table">
                        <thead>
                            <tr>
                                <th class="sortable" data-column="Account">Account</th>
                                <th class="sortable" data-column="Renewal QTR">Renewal QTR</th>
                                <th class="sortable" data-column="Baseline">Baseline</th>
                                <th class="sortable" data-column="FCST">FCST (FCST Delta)</th>
                                <th class="signal-pill-header">Signals & Actions</th>
                                <th class="sortable" data-column="Category">Category</th>
                                <th class="sortable" data-column="Pacing">% Pacing</th>
                                <th class="health-grade-header">Health Grade 90/180/360</th>
                                <th class="sortable" data-column="Active Upsells">Active Upsells</th>
                                <th class="sortable" data-column="Upsell FQ">Upsell Next Close FQ</th>
                                <th class="sortable" data-column="Last Renewal">Last Renewal</th>
                            </tr>
                        </thead>
                        <tbody>
                            <!-- Grand Total Row -->
                            <tr class="grand-total-row">
                                <td><strong>GRAND TOTAL</strong></td>
                                <td></td>
                                <td class="currency">${this.formatCurrencyShorthand(grandTotal.baseline)}</td>
                                <td class="currency">${this.formatCurrencyShorthand(grandTotal.fcst)} (${this.formatCurrencyShorthand(grandTotal.fcstDelta)})</td>
                                <td></td>
                                <td></td>
                                <td class="percentage">${this.formatPercentage(grandTotal.pacing)}</td>
                                <td></td>
                                <td class="currency">${this.formatCurrencyShorthand(grandTotal.upsellACV)}</td>
                                <td></td>
                                <td></td>
                            </tr>
                            
                            <!-- Data Rows -->
                            ${portfolioData.map(row => this.renderPortfolioRow(row)).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        // Attach event listeners
        this.attachEventListeners();
    }
    
    /**
     * Render a single portfolio row with new 11 columns
     */
    static renderPortfolioRow(row) {
        const accountId = row.bks_account_id || row.account_id;
        
        // Get signal and action counts
        const signalCounts = this.getSignalCounts(accountId);
        const smartActionCount = this.getSmartActionCount(accountId);
        
        // Format FCST with Delta
        const fcst = parseFloat(row['FCST'] || row.bks_forecast_new || row.bks_renewal_amount || 0);
        const fcstDelta = parseFloat(row['FCST Delta'] || row.bks_forecast_delta || 0);
        const fcstDisplay = `${this.formatCurrencyShorthand(fcst)} (${this.formatCurrencyShorthand(fcstDelta)})`;
        
        // Format Active Upsells
        const upsellACV = parseFloat(row['Active Upsells ACV'] || row.upsell_total_acv || 0);
        const upsellCount = parseInt(row['Active Upsells Count'] || row.upsell_total_opportunities || 0);
        const upsellDisplay = `${this.formatCurrencyShorthand(upsellACV)} (${upsellCount})`;
        
        // Format Last Renewal with downsell flag and percentage
        const lastRenewalData = this.formatLastRenewal(row);
        
        return `
            <tr class="portfolio-row" data-account="${this.escapeHtml(row.Account)}" data-account-id="${this.escapeHtml(accountId)}">
                <td class="account-name">
                    <a href="#" class="account-link" data-account-id="${this.escapeHtml(accountId)}" data-account-name="${this.escapeHtml(row.Account)}">
                        ${this.escapeHtml(row.Account)}
                    </a>
                </td>
                <td class="quarter">${this.escapeHtml(row['Renewal QTR'] || row.QTR || row.bks_fq || '')}</td>
                <td class="currency">${this.formatCurrencyShorthand(row.bks_renewal_baseline_usd || row.Baseline)}</td>
                <td class="fcst-cell ${fcstDelta < 0 ? 'negative' : ''}">${fcstDisplay}</td>
                <td class="signal-pill-cell">${this.renderSignalActionPill(signalCounts.riskCount, signalCounts.growthCount, smartActionCount)}</td>
                <td class="category ${this.getCategoryClass(row.Category)}">${this.escapeHtml(row.Category)}</td>
                <td class="percentage">${this.formatPercentage(row['Pacing %'] || row['Credit Pacing %'] || row['% Pacing'])}</td>
                <td class="health-grade-cell">${this.renderHealthGradeSections(
                    row['Current HG'],
                    row['HG 90 Change'] || row['HG 90-Day Change'],
                    row['HG 180 Change'] || row['HG 180-Day Change'],
                    row['HG 360 Change'] || row['HG 360-Day Change']
                )}</td>
                <td class="upsell-cell">${upsellDisplay}</td>
                <td class="upsell-fq">${this.escapeHtml(row['Upsell Next Close FQ'] || row.upsell_FQ || '')}</td>
                <td class="renewal ${lastRenewalData.cssClass}">${this.escapeHtml(lastRenewalData.display)}</td>
            </tr>
        `;
    }
    
    /**
     * Render 3-section connected pill for Signals & Actions
     */
    static renderSignalActionPill(riskCount, growthCount, actionCount) {
        return `
            <div class="signal-action-pill">
                <div class="pill-section risk-section" title="${riskCount} Risk Signals">
                    <span class="pill-label">Risk</span>
                    <span class="pill-count">${riskCount}</span>
                </div>
                <div class="pill-section growth-section" title="${growthCount} Growth Levers">
                    <span class="pill-label">Growth</span>
                    <span class="pill-count">${growthCount}</span>
                </div>
                <div class="pill-section action-section" title="${actionCount} Smart Actions">
                    <span class="pill-label">Actions</span>
                    <span class="pill-count">${actionCount}</span>
                </div>
            </div>
        `;
    }
    
    /**
     * Render 4-section Health Grade display
     */
    static renderHealthGradeSections(currentHG, hg90, hg180, hg360) {
        // Parse HG changes as numbers
        const hg90Num = parseFloat(hg90) || 0;
        const hg180Num = parseFloat(hg180) || 0;
        const hg360Num = parseFloat(hg360) || 0;
        
        // Determine color classes based on threshold
        const getHGChangeClass = (value) => {
            if (value < -0.1) return 'hg-negative'; // Less than -10%
            if (value > 0.1) return 'hg-positive';  // Greater than 10%
            return '';
        };
        
        return `
            <div class="health-grade-sections">
                <div class="hg-current ${this.getHealthGradeClass(currentHG)}" title="Current Health Grade">
                    ${this.escapeHtml(currentHG || 'N/A')}
                </div>
                <div class="hg-changes-pill">
                    <div class="hg-change ${getHGChangeClass(hg90Num)}" title="90-Day Change: ${this.formatPercentage(hg90)}">
                        ${this.formatPercentage(hg90)}
                    </div>
                    <div class="hg-change ${getHGChangeClass(hg180Num)}" title="180-Day Change: ${this.formatPercentage(hg180)}">
                        ${this.formatPercentage(hg180)}
                    </div>
                    <div class="hg-change ${getHGChangeClass(hg360Num)}" title="360-Day Change: ${this.formatPercentage(hg360)}">
                        ${this.formatPercentage(hg360)}
                    </div>
                </div>
            </div>
        `;
    }
    
    /**
     * Get signal counts by polarity for an account
     */
    static getSignalCounts(accountId) {
        if (!accountId || !this.currentState) {
            return { riskCount: 0, growthCount: 0 };
        }
        
        // Try to get from SignalsRepository if available
        if (typeof SignalsRepository !== 'undefined' && this.currentState.rawSignals) {
            return SignalsRepository.countSignalsByPolarity(accountId, this.currentState.rawSignals);
        }
        
        // Fallback: count from state.signals
        const signals = Array.from(this.currentState.signals?.values() || []);
        let riskCount = 0;
        let growthCount = 0;
        
        signals.forEach(signal => {
            const signalAccountId = signal.account_id || signal.bks_account_id;
            if (signalAccountId === accountId) {
                const polarity = (signal.signal_polarity || signal['Signal Polarity'] || '').toLowerCase().trim();
                
                if (polarity === 'risk' || polarity === 'risk signal') {
                    riskCount++;
                } else if (polarity === 'growth' || polarity === 'growth lever' || polarity === 'enrichment') {
                    growthCount++;
                }
            }
        });
        
        return { riskCount, growthCount };
    }
    
    /**
     * Get Smart Action count for an account (unique action_ids)
     */
    static getSmartActionCount(accountId) {
        if (!accountId || !this.currentState) {
            return 0;
        }
        
        // Try to get from SignalsRepository if available
        if (typeof SignalsRepository !== 'undefined' && this.currentState.rawSignals) {
            return SignalsRepository.countSmartActions(accountId, this.currentState.rawSignals);
        }
        
        // Fallback: count from state.signals
        const signals = Array.from(this.currentState.signals?.values() || []);
        const uniqueActionIds = new Set();
        
        signals.forEach(signal => {
            const signalAccountId = signal.account_id || signal.bks_account_id;
            if (signalAccountId === accountId) {
                const actionId = signal.action_id || signal['Action Id'];
                if (actionId) {
                    uniqueActionIds.add(actionId);
                }
            }
        });
        
        return uniqueActionIds.size;
    }
    
    /**
     * Calculate grand total values
     */
    static calculateGrandTotal(data) {
        const total = data.reduce((acc, row) => {
            acc.baseline += parseFloat(row.bks_renewal_baseline_usd || row.Baseline) || 0;
            acc.fcst += parseFloat(row['FCST'] || row.bks_forecast_new || row.bks_renewal_amount) || 0;
            acc.fcstDelta += parseFloat(row['FCST Delta'] || row.bks_forecast_delta) || 0;
            acc.pacing += parseFloat(row['Pacing %'] || row['Credit Pacing %'] || row['% Pacing']) || 0;
            acc.upsellACV += parseFloat(row['Active Upsells ACV'] || row.upsell_total_acv) || 0;
            return acc;
        }, { baseline: 0, fcst: 0, fcstDelta: 0, pacing: 0, upsellACV: 0 });
        
        // Calculate average for percentage-based metrics
        const dataLength = data.length > 0 ? data.length : 1;
        total.pacing = total.pacing / dataLength;
        
        return total;
    }
    
    /**
     * Format currency with shorthand (e.g., $1.2M, $369.1K)
     */
    static formatCurrencyShorthand(value) {
        const num = parseFloat(value);
        if (isNaN(num)) return '$0';
        
        const absNum = Math.abs(num);
        const sign = num < 0 ? '-' : '';
        
        if (absNum >= 1000000) {
            return `${sign}$${(absNum / 1000000).toFixed(1)}M`;
        } else if (absNum >= 1000) {
            return `${sign}$${(absNum / 1000).toFixed(1)}K`;
        } else {
            return `${sign}$${absNum.toFixed(0)}`;
        }
    }
    
    /**
     * Format percentage values
     */
    static formatPercentage(value) {
        const num = parseFloat(value);
        if (isNaN(num)) return '0%';
        
        // Handle both decimal (0.5) and percentage (50) formats
        const displayValue = Math.abs(num) <= 1 ? num * 100 : num;
        const sign = num < 0 ? '-' : '';
        
        return `${sign}${Math.abs(displayValue).toFixed(0)}%`;
    }
    
    /**
     * Get CSS class for category
     */
    static getCategoryClass(category) {
        if (!category) return '';
        
        const categoryLower = category.toLowerCase();
        
        // Closed Won - Green
        if (categoryLower.includes('closed won')) return 'category-closed-won';
        
        // Closed Lost - Red
        if (categoryLower.includes('closed lost') || categoryLower.includes('closed lst')) return 'category-closed-lost';
        
        // FCST Closed Lost - Red
        if (categoryLower.includes('fcst closed lost')) return 'category-closed-lost';
        
        // Risk - Warning color
        if (categoryLower.includes('risk') || category.includes('4 - RISK')) return 'category-risk';
        
        // Legacy cases
        if (category.includes('3 - WCP')) return 'category-wcp';
        if (category.includes('0 - NO FCST')) return 'category-no-fcst';
        
        return '';
    }
    
    /**
     * Get CSS class for health grade
     */
    static getHealthGradeClass(grade) {
        if (!grade) return '';
        
        if (grade === 'A') return 'grade-a';
        if (grade === 'B') return 'grade-b';
        if (grade === 'C') return 'grade-c';
        if (grade === 'D') return 'grade-d';
        if (grade === 'F') return 'grade-f';
        
        return '';
    }
    
    /**
     * Format Last Renewal with downsell flag and percentage
     */
    static formatLastRenewal(row) {
        const downsellFlag = row.last_renewal_downsell_flag || '';
        const downsellPercent = parseFloat(row['last_renewal_downsell_%']) || 0;
        const renewalDate = row.last_renewal_date || row['Last Renewal'] || '';
        
        // Check if this is a downsell
        const isDownsell = downsellFlag && downsellFlag.toUpperCase().includes('DOWNSELL');
        
        // Format the display string
        let display = '';
        if (downsellFlag) {
            // Show format: "DOWNSELL - 15%" or "OTHER - 0%" (whole percentage)
            display = `${downsellFlag} - ${Math.round(downsellPercent * 100)}%`;
        } else if (renewalDate) {
            // Show date if no flag
            const date = new Date(renewalDate);
            if (!isNaN(date.getTime())) {
                display = date.toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'short', 
                    day: 'numeric' 
                });
            } else {
                display = renewalDate;
            }
        }
        
        return {
            display: display || '',
            cssClass: isDownsell ? 'renewal-downsell' : ''
        };
    }
    
    /**
     * Get CSS class for renewal status (legacy support)
     */
    static getRenewalClass(renewal) {
        if (!renewal) return '';
        
        if (renewal.includes('DOWNSELL') || renewal.includes('Downsell')) return 'renewal-downsell';
        if (renewal.includes('OTHER')) return 'renewal-other';
        
        return '';
    }
    
    /**
     * Escape HTML to prevent XSS
     */
    static escapeHtml(text) {
        if (!text && text !== 0) return '';
        const div = document.createElement('div');
        div.textContent = String(text);
        return div.innerHTML;
    }
    
    /**
     * Apply default sort: Quarter ASC, then Baseline DESC, then Date ASC
     */
    static applyDefaultSort(data) {
        return [...data].sort((a, b) => {
            // Primary sort: Quarter (bks_fq) ASC
            const quarterA = a['Renewal QTR'] || a.QTR || a.bks_fq || '';
            const quarterB = b['Renewal QTR'] || b.QTR || b.bks_fq || '';
            
            if (quarterA !== quarterB) {
                return quarterA.localeCompare(quarterB); // Ascending (FY26-Q3 before FY26-Q4)
            }
            
            // Secondary sort: Baseline DESC (within same quarter)
            const baselineA = parseFloat(a.bks_renewal_baseline_usd || a.Baseline || 0);
            const baselineB = parseFloat(b.bks_renewal_baseline_usd || b.Baseline || 0);
            
            if (baselineA !== baselineB) {
                return baselineB - baselineA; // Descending (highest first)
            }
            
            // Tertiary sort: Renewal Date ASC (tiebreaker)
            const dateA = new Date(a.bks_renewal_date || 0);
            const dateB = new Date(b.bks_renewal_date || 0);
            return dateA - dateB; // Ascending
        });
    }
    
    /**
     * Attach event listeners for sorting and account links
     */
    static attachEventListeners() {
        const sortableHeaders = document.querySelectorAll('.portfolio-table .sortable');
        
        sortableHeaders.forEach(header => {
            header.addEventListener('click', (e) => {
                const column = e.target.getAttribute('data-column');
                this.sortTable(column);
            });
            
            // Add hover effect
            header.addEventListener('mouseenter', () => {
                header.style.cursor = 'pointer';
            });
        });
        
        // Add account link click handlers
        const accountLinks = document.querySelectorAll('.account-link');
        accountLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const accountId = e.target.getAttribute('data-account-id');
                const accountName = e.target.getAttribute('data-account-name');
                
                if (accountId) {
                    this.navigateToPortfolio(accountId, accountName);
                }
            });
        });
    }
    
    /**
     * Navigate to My Portfolio and expand the account
     */
    static navigateToPortfolio(accountId, accountName) {
        console.log(`📍 Navigating to Portfolio for account: ${accountName} (${accountId})`);
        
        // Store the account ID to expand after navigation
        sessionStorage.setItem('expandAccountId', accountId);
        sessionStorage.setItem('expandAccountName', accountName);
        
        // Switch to My Portfolio tab
        const portfolioTab = document.querySelector('.nav-tab[data-tab="my-portfolio"]');
        if (portfolioTab) {
            portfolioTab.click();
            
            // Wait for the portfolio to render, then collapse all and expand just this one
            setTimeout(() => {
                // First, collapse ALL accounts
                document.querySelectorAll('.account-details').forEach(details => {
                    details.classList.remove('expanded');
                });
                document.querySelectorAll('.account-chevron').forEach(chevron => {
                    chevron.classList.remove('rotated');
                });
                
                // Now expand only the target account
                const signalsContainer = document.getElementById(`signals-${accountId}`);
                const chevron = document.getElementById(`chevron-${accountId}`);
                
                if (signalsContainer && chevron) {
                    signalsContainer.classList.add('expanded');
                    chevron.classList.add('rotated');
                    
                    // Dispatch expand action
                    if (typeof Actions !== 'undefined' && typeof dispatcher !== 'undefined') {
                        dispatcher.dispatch(Actions.expandAccount(accountId));
                    }
                    
                    // Scroll the account into view with slight offset
                    const accountCard = signalsContainer.closest('.portfolio-account-card');
                    if (accountCard) {
                        accountCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        
                        // Optional: Add a subtle highlight effect
                        accountCard.style.transition = 'background-color 0.3s';
                        accountCard.style.backgroundColor = '#FCEFD9'; // Brand cream color
                        setTimeout(() => {
                            accountCard.style.backgroundColor = '';
                        }, 1500);
                    }
                }
                
                // Clear the session storage
                sessionStorage.removeItem('expandAccountId');
                sessionStorage.removeItem('expandAccountName');
            }, 500);
        }
    }
    
    /**
     * Sort table by column
     */
    static sortTable(column) {
        const table = document.querySelector('.portfolio-table');
        const tbody = table.querySelector('tbody');
        const rows = Array.from(tbody.querySelectorAll('.portfolio-row'));
        
        // Remove grand total row for sorting
        const grandTotalRow = tbody.querySelector('.grand-total-row');
        if (grandTotalRow) {
            grandTotalRow.remove();
        }
        
        rows.sort((a, b) => {
            const aValue = a.querySelector(`td:nth-child(${this.getColumnIndex(column)})`).textContent.trim();
            const bValue = b.querySelector(`td:nth-child(${this.getColumnIndex(column)})`).textContent.trim();
            
            // Try to parse as numbers first
            const aNum = parseFloat(aValue.replace(/[$,%()KM]/g, ''));
            const bNum = parseFloat(bValue.replace(/[$,%()KM]/g, ''));
            
            if (!isNaN(aNum) && !isNaN(bNum)) {
                return bNum - aNum; // Descending order for numbers
            }
            
            // String comparison
            return aValue.localeCompare(bValue);
        });
        
        // Re-append sorted rows
        rows.forEach(row => tbody.appendChild(row));
        
        // Re-append grand total row at the top
        if (grandTotalRow) {
            tbody.insertBefore(grandTotalRow, tbody.firstChild);
        }
        
        // Update sort indicators
        this.updateSortIndicators(column);
    }
    
    /**
     * Get column index for sorting
     */
    static getColumnIndex(columnName) {
        const headers = [
            'Account', 'Renewal QTR', 'Baseline', 'FCST', 'Signals', 
            'Category', 'Pacing', 'Health Grade', 'Active Upsells', 
            'Upsell FQ', 'Last Renewal'
        ];
        
        return headers.indexOf(columnName) + 1;
    }
    
    /**
     * Update sort indicators on headers
     */
    static updateSortIndicators(activeColumn) {
        const headers = document.querySelectorAll('.portfolio-table .sortable');
        
        headers.forEach(header => {
            header.classList.remove('sort-asc', 'sort-desc');
            
            if (header.getAttribute('data-column') === activeColumn) {
                header.classList.add('sort-desc'); // Default to descending
            }
        });
    }
}

// Make HomeRenderer globally available
window.HomeRenderer = HomeRenderer;
