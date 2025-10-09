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
                                <th class="sortable" data-column="Recommendations"># of Recommendations</th>
                                <th class="sortable" data-column="Team">Team</th>
                                <th class="sortable" data-column="QTR">QTR</th>
                                <th class="sortable" data-column="Baseline">Baseline</th>
                                <th class="sortable" data-column="FCST Delta">FCST Delta</th>
                                <th class="sortable" data-column="Category">Category</th>
                                <th class="sortable" data-column="Credit Pacing %">Credit Pacing %</th>
                                <th class="sortable" data-column="Current HG">Current HG</th>
                                <th class="sortable" data-column="HG 90-Day Change">HG 90-Day Change</th>
                                <th class="sortable" data-column="HG 180-Day Change">HG 180-Day Change</th>
                                <th class="sortable" data-column="HG 360-Day Change">HG 360-Day Change</th>
                                <th class="sortable" data-column="Last Renewal">Last Renewal</th>
                                <th class="sortable" data-column="Support Package">Support Package</th>
                                <th class="sortable" data-column="Ace Overview">Ace Overview</th>
                                <th class="sortable" data-column="Adoption Consultants">Adoption Consultants</th>
                                <th class="sortable" data-column="Active Services?">Active Services?</th>
                                <th class="sortable" data-column="Svcs Summary AI">Account Insight AI</th>
                                <th class="sortable" data-column="Service Team">Service Team</th>
                            </tr>
                        </thead>
                        <tbody>
                            <!-- Grand Total Row -->
                            <tr class="grand-total-row">
                                <td><strong>GRAND TOTAL</strong></td>
                                <td></td>
                                <td></td>
                                <td></td>
                                <td class="currency">${this.formatCurrency(grandTotal.baseline)}</td>
                                <td class="currency ${grandTotal.fcstDelta < 0 ? 'negative' : ''}">${this.formatCurrency(grandTotal.fcstDelta)}</td>
                                <td></td>
                                <td class="percentage">${this.formatPercentage(grandTotal.creditPacing)}</td>
                                <td></td>
                                <td class="percentage ${grandTotal.hg90Change >= 0 ? 'positive' : 'negative'}">${this.formatPercentage(grandTotal.hg90Change)}</td>
                                <td class="percentage ${grandTotal.hg180Change >= 0 ? 'positive' : 'negative'}">${this.formatPercentage(grandTotal.hg180Change)}</td>
                                <td class="percentage ${grandTotal.hg360Change >= 0 ? 'positive' : 'negative'}">${this.formatPercentage(grandTotal.hg360Change)}</td>
                                <td></td>
                                <td></td>
                                <td></td>
                                <td></td>
                                <td></td>
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
     * Render a single portfolio row
     */
    static renderPortfolioRow(row) {
        // Get recommendation count for this account
        const recommendationCount = this.getRecommendationCount(row);
        const accountId = row.bks_account_id || row.account_id;
        
        return `
            <tr class="portfolio-row" data-account="${this.escapeHtml(row.Account)}" data-account-id="${this.escapeHtml(accountId)}">
                <td class="account-name">
                    <a href="#" class="account-link" data-account-id="${this.escapeHtml(accountId)}" data-account-name="${this.escapeHtml(row.Account)}">
                        ${this.escapeHtml(row.Account)}
                    </a>
                </td>
                <td class="recommendation-count">${recommendationCount}</td>
                <td class="team">${this.escapeHtml(row.Team)}</td>
                <td class="quarter">${this.escapeHtml(row.QTR)}</td>
                <td class="currency">${this.formatCurrency(row.bks_renewal_baseline_usd || row.Baseline)}</td>
                <td class="currency ${parseFloat(row['FCST Delta']) < 0 ? 'negative' : ''}">${this.formatCurrency(row['FCST Delta'])}</td>
                <td class="category ${this.getCategoryClass(row.Category)}">${this.escapeHtml(row.Category)}</td>
                <td class="percentage">${this.formatPercentage(row['Credit Pacing %'])}</td>
                <td class="health-grade ${this.getHealthGradeClass(row['Current HG'])}">${this.escapeHtml(row['Current HG'])}</td>
                <td class="percentage ${parseFloat(row['HG 90-Day Change']) >= 0 ? 'positive' : 'negative'}">${this.formatPercentage(row['HG 90-Day Change'])}</td>
                <td class="percentage ${parseFloat(row['HG 180-Day Change']) >= 0 ? 'positive' : 'negative'}">${this.formatPercentage(row['HG 180-Day Change'])}</td>
                <td class="percentage ${parseFloat(row['HG 360-Day Change']) >= 0 ? 'positive' : 'negative'}">${this.formatPercentage(row['HG 360-Day Change'])}</td>
                <td class="renewal ${this.getRenewalClass(row['Last Renewal'])}">${this.escapeHtml(row['Last Renewal'])}</td>
                <td class="support-package">${this.escapeHtml(row['Support Package'])}</td>
                <td class="ace-overview">${this.escapeHtml(row['Ace Overview'])}</td>
                <td class="adoption-consultants">${this.escapeHtml(row['Adoption Consultants'])}</td>
                <td class="active-services ${row['Active Services?'] === 'Yes' ? 'active' : 'inactive'}">${this.escapeHtml(row['Active Services?'])}</td>
                <td class="services-summary">${this.renderServicesSummary(row['Svcs Summary AI'])}</td>
                <td class="service-team">${this.escapeHtml(row['Service Team'])}</td>
            </tr>
        `;
    }
    
    /**
     * Render services summary with icons
     */
    static renderServicesSummary(summary) {
        if (!summary) return '';
        
        // Preserve emoji icons and formatting
        return this.escapeHtml(summary).replace(/(✅|🔧|⚠️|👥|⏳)/g, '<span class="service-icon">$1</span>');
    }
    
    /**
     * Calculate grand total values
     */
    static calculateGrandTotal(data) {
        const total = data.reduce((acc, row) => {
            acc.baseline += parseFloat(row.bks_renewal_baseline_usd || row.Baseline) || 0;
            acc.fcstDelta += parseFloat(row['FCST Delta']) || 0;
            acc.creditPacing += parseFloat(row['Credit Pacing %']) || 0;
            acc.hg90Change += parseFloat(row['HG 90-Day Change']) || 0;
            acc.hg180Change += parseFloat(row['HG 180-Day Change']) || 0;
            acc.hg360Change += parseFloat(row['HG 360-Day Change']) || 0;
            return acc;
        }, { baseline: 0, fcstDelta: 0, creditPacing: 0, hg90Change: 0, hg180Change: 0, hg360Change: 0 });
        
        // Calculate averages for percentage-based metrics
        const dataLength = data.length > 0 ? data.length : 1;
        total.creditPacing = total.creditPacing / dataLength;
        total.hg90Change = total.hg90Change / dataLength;
        total.hg180Change = total.hg180Change / dataLength;
        total.hg360Change = total.hg360Change / dataLength;
        
        return total;
    }
    
    /**
     * Format currency values
     */
    static formatCurrency(value) {
        const num = parseFloat(value);
        if (isNaN(num)) return '$0';
        
        if (Math.abs(num) >= 1000000) {
            return `$${(num / 1000000).toFixed(1)}M`;
        } else if (Math.abs(num) >= 1000) {
            return `$${(num / 1000).toFixed(0)}K`;
        } else {
            return `$${num.toFixed(0)}`;
        }
    }
    
    /**
     * Format percentage values
     */
    static formatPercentage(value) {
        const num = parseFloat(value);
        if (isNaN(num)) return '0%';
        
        return `${(num * 100).toFixed(0)}%`;
    }
    
    /**
     * Get CSS class for category
     */
    static getCategoryClass(category) {
        if (!category) return '';
        
        if (category.includes('3 - WCP')) return 'category-wcp';
        if (category.includes('4 - RISK')) return 'category-risk';
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
        
        return '';
    }
    
    /**
     * Get CSS class for renewal status
     */
    static getRenewalClass(renewal) {
        if (!renewal) return '';
        
        if (renewal.includes('DOWNSELL')) return 'renewal-downsell';
        if (renewal.includes('OTHER')) return 'renewal-other';
        
        return '';
    }
    
    /**
     * Get recommendation count for an account
     */
    static getRecommendationCount(row) {
        const accountId = row.bks_account_id || row.account_id;
        if (!accountId) return 0;
        
        const store = window.signalsStore;
        if (!store || !store.normalizedData) return 0;
        
        // Get unique action IDs for this account
        const actionsByAccount = store.indexes?.actionsByAccount;
        if (!actionsByAccount) return 0;
        
        const actionIds = actionsByAccount.get(accountId);
        return actionIds ? actionIds.size : 0;
    }
    
    /**
     * Escape HTML to prevent XSS
     */
    static escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    /**
     * Apply default sort: Quarter ASC, then Baseline DESC, then Date ASC
     */
    static applyDefaultSort(data) {
        return [...data].sort((a, b) => {
            // Primary sort: Quarter (bks_fq) ASC
            const quarterA = a.bks_fq || '';
            const quarterB = b.bks_fq || '';
            
            if (quarterA !== quarterB) {
                return quarterA.localeCompare(quarterB); // Ascending (FY26-Q3 before FY26-Q4)
            }
            
            // Secondary sort: Baseline DESC (within same quarter)
            const baselineA = parseFloat(a.bks_renewal_baseline_usd || 0);
            const baselineB = parseFloat(b.bks_renewal_baseline_usd || 0);
            
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
            
            // Wait for the portfolio to render, then expand the account
            setTimeout(() => {
                const signalsContainer = document.getElementById(`signals-${accountId}`);
                const chevron = document.getElementById(`chevron-${accountId}`);
                
                if (signalsContainer && chevron && !signalsContainer.classList.contains('expanded')) {
                    signalsContainer.classList.add('expanded');
                    chevron.classList.add('rotated');
                    
                    // Dispatch expand action
                    if (typeof Actions !== 'undefined' && typeof dispatcher !== 'undefined') {
                        dispatcher.dispatch(Actions.expandAccount(accountId));
                    }
                    
                    // Scroll the account into view
                    const accountCard = document.querySelector(`[data-account-id="${accountId}"]`);
                    if (accountCard) {
                        accountCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
            const aNum = parseFloat(aValue.replace(/[$,%]/g, ''));
            const bNum = parseFloat(bValue.replace(/[$,%]/g, ''));
            
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
            'Account', 'Team', 'QTR', 'Baseline', 'FCST Delta', 'Category',
            'Credit Pacing %', 'Current HG', 'HG 90-Day Change', 'HG 180-Day Change',
            'HG 360-Day Change', 'Last Renewal', 'Support Package', 'Ace Overview',
            'Adoption Consultants', 'Active Services?', 'Svcs Summary AI', 'Service Team'
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
