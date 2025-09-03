// SignalsAI v8.0 Application
class SignalsAI {
    constructor() {
        this.data = [];
        this.filteredData = [];
        this.accounts = new Map();
        this.actionPlans = new Map(); // Track action plans by account
        this.viewedSignals = new Set(); // Track which signals have been viewed
        this.currentTab = 'signal-feed';
        this.signalComments = new Map(); // Store comments for each signal
        this.init();
    }

    async init() {
        console.log('Initializing SignalsAI v8.0...');
        this.showLoading();

        try {
            console.log('Loading data...');
            await this.loadData();
            console.log('Processing accounts...');
            this.processAccounts();
            console.log('Setting up event listeners...');
            this.setupEventListeners();
            console.log('Rendering current tab...');
            this.renderCurrentTab();
            console.log('Updating summary stats...');
            this.updateSummaryStats();
            console.log('SignalsAI initialization complete');
        } catch (error) {
            console.error('Failed to initialize app at step:', error);
            console.error('Error details:', error.message);
            console.error('Stack trace:', error.stack);
            // Show error message to user
            this.showErrorMessage('Failed to load SignalsAI data. Please refresh the page.');
        } finally {
            this.hideLoading();
        }
    }

    async loadData() {
        try {
            // Parse CSV data from the provided sample
            const csvData = `account_id,account_name,category,code,name,summary,rationale,priority,confidence,action_context,Signal Id,Account Id,Relationship,Content Creation,User Engagement,Support,Commercial,Education,Platform Utilization,Value Realization,Total Lifetime Billings,Daily Active Users (DAU),Weekly Active Users (WAU),Monthly Active Users (MAU),Total Data Sets,Total Rows,Dataflows,Cards,Health Score,is Consumption,at_risk_cat,Account GPA Table Card Column,Account GPA,Industry (Domo),Customer Tenure (Years),Type of Next Renewal,Numeric Grade,Account GPA Numeric,Relationship - Value,Content Creation - Value,User Engagement - Value,Support - Value,Commercial - Value,Education - Value,Platform Utilization - Value,Value Realization - Value,Prior Account GPA Numeric,Prior Value,180 Day GPA Trend ,Data Source,bks_status_grouping,bks_renewal_baseline_usd,bks_forecast_new,bks_forecast_delta,% Pacing,bks_fq,rank
0013000000DXZ1fAAH,Falvey Insurance Group Ltd,Architecture,ARCH-01,CDW Identified,"Customer is implementing MongoDB as a data source for a new program with significant data volume. This represents a new data architecture component that will impact how data is stored, processed, and consumed in Domo, affecting credit consumption.",Matt M stated: 'We're actually writing all this data to a MongoDB database' and 'we're going to be using the MongoDB connector.' He specifically mentioned this is for 'a new program coming on' that will have 'quite a bit of data' in terms of volume.,Medium,0.9,1. Provide guidance on MongoDB connector best practices. 2. Review potential credit consumption impact based on expected data volume. 3. Schedule a follow-up after initial implementation to optimize connector configuration.,700fda5b-bb99-441a-8c51-bcb347568ef0,0013000000DXZ1fAAH,C,S,A,S,D,,C,,1633599.9300000002,1,79,129,2514,574867333,337,6269,0.8265554371086927,true,Healthy,B,B,Insurance,11,,,3.1336,2,4.666666666666667,3.6666666666666665,4.666666666666667,1,0,2,,3.1003,3.1003,-0.06600000000000028,Current Grade,0 - NO FCST,136718.4,0,-136718.4,,FY27-Q3,1
0013000000DXZ1fAAH,Falvey Insurance Group Ltd,Use Case,UC-04,Key Stakeholder Identified,Customer has set a specific launch date for their new program that will use MongoDB data. This timeline creates urgency around ensuring the MongoDB connector is properly configured and credit consumption is understood before the go-live date.,Matt M explicitly stated: 'we're launching actually next Friday' when discussing their timeline for the new program that will utilize MongoDB and require reporting through Domo.,High,0.95,1. Prioritize MongoDB connector configuration support before next Friday's launch. 2. Schedule a pre-launch check-in to ensure all technical questions are addressed. 3. Plan for post-launch monitoring of data volumes and credit consumption.,3235801a-c794-4a04-8779-27c038baf312,0013000000DXZ1fAAH,C,S,A,S,D,,C,,1633599.9300000002,1,79,129,2514,574867333,337,6269,0.8265554371086927,true,Healthy,B,B,Insurance,11,,,3.1336,2,4.666666666666667,3.6666666666666665,4.666666666666667,1,0,2,,3.1003,3.1003,-0.06600000000000028,Current Grade,0 - NO FCST,136718.4,0,-136718.4,,FY27-Q3,1
0013800001C0Qy3AAF,Redstone Residential Inc,Relationship,REL-05,Relationship Gap / Exposure,"The call indicates knowledge gaps due to team transitions, with Fui mentioning 'tribal knowledge that was left' due to personnel changes. This signals a potential relationship risk where institutional knowledge has been lost, requiring rebuilding.","Fui explicitly mentioned 'the tribal knowledge that was left, right? Given some of the transitions that had taken place.' This indicates that key personnel who understood the Domo implementation have departed, creating a knowledge gap that needs to be addressed.",High,0.85,1. Document current state of implementation and knowledge. 2. Identify specific knowledge gaps from previous team members. 3. Create transition plan to rebuild institutional knowledge with current stakeholders.,77a1b4c8-af26-43d8-baad-f656bfa58f47,0013800001C0Qy3AAF,S,D,C,B,B,F,C,C,296924.36000000004,0,7,15,515,70832928,245,666,0.22940944818060477,true,At Risk,C,C,Other,7,,,2.2498000000000005,5,1.3333333333333333,2,3,3,0,2,2,2.5498000000000003,2.5498000000000003,0.8662000000000005,Current Grade,0 - NO FCST,54671.95,54671.95,0,1.1813749999999998,FY27-Q2,1
0013800001FjROjAAN,"Magnolia Market, LLC",Relationship,REL-01,Decision-Maker Identified or lost,"Ryan has been identified as the decision-maker who manages the applications and engineering team at Magnolia. He oversees Domo administration, data integrations, and approves cards for consumption across the organization, indicating he has significant authority over the Domo implementation.","Ryan stated: 'I manage the applications and engineering team here at magnolia. So I oversee the administration of our Domo implementation. And then some of the presentation layer as well... most of the cards that are approved for consumption across the organization, go through our team.'",High,0.9,Ensure Ryan is included in all strategic discussions about the Domo implementation. Develop a relationship with him as the key decision-maker for Domo at Magnolia. Address his concerns and priorities as they will significantly impact the success of the engagement.,b027cbe1-ae8f-4e88-a009-098db9511d01,0013800001FjROjAAN,C,D,C,,F,,C,,848068.24,3,36,57,1190,1526378236,236,3964,0.5390818767933085,true,Healthy,D,D,Media,8,,,1.2331,2.3333333333333335,1.3333333333333333,2,0,0,0,2,,1.2331,1.2331,-0.20000000000000018,Current Grade,0 - NO FCST,108070,108070,0,0.031871960263530064,FY27-Q1,1
0013000000I5mBfAAJ,"Lewis Media Partners, LLC",Use Case,UC-08,Business Value Realized,Lewis Media is redesigning their website and has expressed interest in integrating Domo Everywhere to create a more professional look and potentially drive more traffic to their website. This represents expansion of Domo's value into new areas of their business.,"Katie stated: 'We are in the process of redoing our website. So the Domo everywhere has definitely sparked a lot of interest in terms of, you know, as we're going through this redesign, you know, kind of having a more professional look if integrating it into our own website, you know, potentially driving more traffic to our website.' She also mentioned that this has 'definitely perked some ears over here at Lewis media' including her executive team.",High,0.95,1. Schedule a dedicated Domo Everywhere demo with Nick as soon as possible. 2. Prepare use cases specific to website integration and traffic generation. 3. Engage with the website redesign team to understand timeline and requirements.,02b5aae8-0805-4150-b7d2-a8ab2bce000b,0013000000I5mBfAAJ,B,S,A,S,C,D,B,,500186.98,0,23,45,3607,713294536,1386,29852,0.6850055105480134,true,Healthy,B,B,Media,7,,,3.4501999999999997,3,4.666666666666667,3.6666666666666665,5,2,1,3,,3.1668000000000003,3.1668000000000003,0.25019999999999953,Current Grade,0 - NO FCST,105001,105001,0,0.5449929359076351,FY27-Q1,1
0013000000Jm7h4AAB,"Stephen F Austin Community Health Center, Inc.",Relationship,REL-03,Detractor Identified,"The customer expressed significant dissatisfaction with Domo, stating they plan to cancel their subscription next year. After nearly two years with the platform, they feel they haven't made enough progress or derived sufficient value from Domo.","Linh explicitly stated: 'we plan to cancel the subscription by next year to be honest with you' and 'we haven't done anything much. I mean, our cow almost like idol.' She also expressed frustration with the pace of implementation: 'we didn't move too much or too fast enough as we asked for, we expect Domo to be with us.'",High,0.95,1. Immediately develop a retention plan focused on demonstrating quick wins. 2. Schedule a deep-dive session to understand specific pain points and unmet expectations. 3. Consider assigning dedicated resources to accelerate implementation and show tangible value before renewal.,00277b09-0458-4c8a-93d9-9c03b4697e51,0013000000Jm7h4AAB,S,F,D,,F,,D,,193000,0,0,0,270,47779315,29,637,0.29923801065991146,true,At Risk,D,D,Non Profit Org,2,,,0.6662000000000001,4.666666666666667,0,0.6666666666666666,0,0,0,1,,0.5997000000000001,0.5997000000000001,-0.7335,Current Grade,0 - NO FCST,52000,0,-52000,0.16457264150943396,FY27-Q1,1
0015000000odwL5AAI,"Bass Pro, LLC",Use Case,UC-01,Umbrella Use Case Identified,"Loss prevention was identified as a potential AI use case for Bass Pro, similar to other retail organizations. This represents a specific business problem that could be addressed through Domo's analytics and AI capabilities.","Kevin mentioned 'We do a lot of work with their loss prevention group' and noted that 'getting AI signal on loss prevention' is 'one that keeps falling out' as a natural fit. He elaborated that with 'all of their little items that they have in 6,500 stores figuring out what's lost and what isn't lost can be a bit of a challenge.'",High,0.9,Develop a specific proposal for a loss prevention analytics solution leveraging Domo's AI capabilities. Gather case studies from other retail customers with similar use cases. Schedule a follow-up meeting focused specifically on this use case opportunity.,1c6e188f-1546-4d6f-8b52-840d7f71707b,0015000000odwL5AAI,A,B,A,C,C,F,C,C,7996680.52,778,2006,2401,3305,19151586811,594,29363,0.7892358116187441,true,Extreme Risk,B,B,Retail,11,,,2.9331,4.333333333333333,3,3.6666666666666665,2,2,0,2,2,3.0331,3.0331,-0.6002000000000001,Current Grade,4 - RISK,671500,350000,-321500,1.1815087997512437,FY27-Q1,1
0015000000YrkyqAAB,"Home Depot U.S.A., Inc.",Use Case,UC-01,Umbrella Use Case Identified,"Home Depot has articulated a clear business problem around consumer insights analysis (called 'buzz analysis') that they want to solve with Domo. They currently use an offshore vendor for scraping data and manual insight analysis, but find the process inefficient and want to improve it.","Roger explicitly described their current 'buzz analysis' process where they collect consumer insights from different retailers to understand customer pain points and preferences before product development. He stated: 'We have a process we call buzz analysis today where we want to understand the consumer insights from, you know, different retailers, both pros and cons, right?' He also mentioned the inefficiency of their current approach: 'that third party would scrape the data for us and then perform some manual insight analysis which is very, not very efficient.'",High,0.95,1. Document the current 'buzz analysis' workflow in detail to identify specific pain points. 2. Prepare a demonstration of how Domo can automate data collection and analysis for consumer insights. 3. Explore how OneMagnify's voice of customer expertise can enhance Home Depot's consumer insights capabilities.,0b751ef9-b652-4e1e-9cc8-7b1b3e69dbda,0015000000YrkyqAAB,S,C,C,S,F,,B,A,696923.1599999999,0,22,36,1774,958997180,150,2133,0.21868804934256267,true,Trending Risk,C,C,Retail,3,,,1.9500000000000002,5,2,2,5,0,0,3,4,1.95,1.95,-0.3833000000000002,Current Grade,3 - WCP,9999,9999,0,0.29619087095356295,FY26-Q4,1
0013000000OLD001,Tech Solutions Corp,Architecture,ARCH-02,Legacy Data Pipeline Architecture,"Customer is using outdated data pipeline architecture that is causing performance issues and increased costs. The current setup is not optimized for modern data volumes and processing requirements.","Technical team mentioned during quarterly review that their current pipeline processes are 'getting slower each month' and costs are 'spiraling beyond what we budgeted for.' They specifically noted issues with batch processing delays.",Medium,0.8,1. Review current data pipeline architecture and identify bottlenecks. 2. Propose modern data pipeline solutions using Domo capabilities. 3. Develop migration plan to optimize performance and costs.,old-signal-001,013000000OLD001,B,C,B,A,C,D,B,C,845000,15,120,250,1800,456000000,180,2500,0.75,true,Healthy,B,B,Technology,5,,,2.8,3,2.5,3.5,2.8,2,1,2.5,2.9,2.85,0.05,Current Grade,1 - COMMIT,89500,89500,0,1.0,FY27-Q2,2
0013000000OLD002,Retail Dynamics Inc,Relationship,REL-06,Champion Departure,"Key champion and primary contact has left the organization. This creates a relationship gap and potential risk to continued platform adoption and renewal discussions.","During last month's check-in call, we learned that Jennifer, our main point of contact for 3 years, has moved to a different company. Her replacement, Mark, seems less familiar with Domo's value proposition.",High,0.88,1. Schedule introductory meeting with new champion Mark. 2. Provide comprehensive platform overview and value demonstration. 3. Identify other stakeholders to build broader relationship network.,old-signal-002,013000000OLD002,C,B,C,B,B,C,B,B,1200000,45,280,450,2500,890000000,320,4200,0.82,true,Healthy,A,A,Retail,8,,,3.2,2,3.8,3.2,3.0,3,2,3.1,3.15,3.18,0.03,Current Grade,2 - BEST CASE,125000,125000,0,1.0,FY27-Q1,3
0013000000OLD003,Financial Partners LLC,User Engagement,UE-03,Declining Usage Patterns,"Platform usage metrics show consistent decline over the past 3 months. Daily active users have dropped by 30% and dashboard views are down significantly.","Monthly usage reports indicate a concerning trend with DAU dropping from 85 to 60 users, and average session time decreasing by 40%. Department heads report that teams are reverting to spreadsheet-based reporting.",Medium,0.85,1. Conduct user experience audit to identify friction points. 2. Provide refresher training sessions for key user groups. 3. Implement user adoption campaign with gamification elements.,old-signal-003,0013000000OLD003,B,C,D,B,C,C,C,D,675000,60,180,320,1200,234000000,150,1800,0.68,true,At Risk,C,C,Financial Services,4,,,2.1,4,2.8,2.0,2.5,2,2,1.8,2.3,2.25,-0.05,Current Grade,2 - BEST CASE,78000,78000,0,0.95,FY27-Q2,4
0013000000OLD004,Manufacturing Solutions,Business,BUS-04,Budget Constraints,"Organization is facing budget cuts and reviewing all software subscriptions. Domo renewal is being questioned due to budget pressures and competing priorities.","CFO mentioned in last quarter's business review that they need to 'trim 15% from all technology spending' and are 'reviewing the ROI of every platform we pay for.' Domo renewal is part of this review process.",High,0.92,1. Prepare comprehensive ROI analysis showing Domo's business impact. 2. Schedule presentation with CFO and finance team. 3. Explore potential contract modifications to address budget concerns.,old-signal-004,013000000OLD004,B,B,C,C,D,B,C,C,920000,25,150,280,1600,445000000,200,2200,0.71,true,At Risk,C,C,Manufacturing,6,,,2.4,4,2.8,2.2,2.1,3,2,2.5,2.6,2.55,-0.05,Current Grade,3 - WCP,95000,85000,-10000,0.89,FY27-Q1,5
0013000000OLD005,Healthcare Innovations,Enablement,EN-02,Training Gaps,"Recent user survey indicates significant knowledge gaps among platform users. Many features are underutilized due to lack of proper training and onboarding.","User satisfaction survey results show that 65% of users feel 'undertrained' on platform capabilities, and 40% report they 'only use basic features.' Training completion rates are below 30% for advanced modules.",Low,0.78,1. Design comprehensive training program for different user personas. 2. Implement mandatory onboarding for new users. 3. Create self-service learning resources and documentation.,old-signal-005,013000000OLD005,A,B,C,B,C,D,B,C,550000,30,95,180,800,167000000,120,1200,0.79,true,Healthy,B,B,Healthcare,3,,,2.7,3,3.2,2.5,2.8,1,2,2.6,2.8,2.75,-0.05,Current Grade,1 - COMMIT,65000,65000,0,1.0,FY27-Q3,6`;
            const oldSignalsData = `0013000000OLD001,Tech Solutions Corp,Architecture,ARCH-02,Legacy Data Pipeline Architecture,"Customer is using outdated data pipeline architecture that is causing performance issues and increased costs. The current setup is not optimized for modern data volumes and processing requirements.","Technical team mentioned during quarterly review that their current pipeline processes are 'getting slower each month' and costs are 'spiraling beyond what we budgeted for.' They specifically noted issues with batch processing delays.",Medium,0.8,1. Review current data pipeline architecture and identify bottlenecks. 2. Propose modern data pipeline solutions using Domo capabilities. 3. Develop migration plan to optimize performance and costs.,old-signal-001,013000000OLD001,B,C,B,A,C,D,B,C,845000,15,120,250,1800,456000000,180,2500,0.75,true,Healthy,B,B,Technology,5,,,2.8,3,2.5,3.5,2.8,2,1,2.5,2.9,2.85,0.05,Current Grade,1 - COMMIT,89500,89500,0,1.0,FY27-Q2,2
0013000000OLD002,Retail Dynamics Inc,Relationship,REL-06,Champion Departure,"Key champion and primary contact has left the organization. This creates a relationship gap and potential risk to continued platform adoption and renewal discussions.","During last month's check-in call, we learned that Jennifer, our main point of contact for 3 years, has moved to a different company. Her replacement, Mark, seems less familiar with Domo's value proposition.",High,0.88,1. Schedule introductory meeting with new champion Mark. 2. Provide comprehensive platform overview and value demonstration. 3. Identify other stakeholders to build broader relationship network.,old-signal-002,013000000OLD002,C,B,C,B,B,C,B,B,1200000,45,280,450,2500,890000000,320,4200,0.82,true,Healthy,A,A,Retail,8,,,3.2,2,3.8,3.2,3.0,3,2,3.1,3.15,3.18,0.03,Current Grade,2 - BEST CASE,125000,125000,0,1.0,FY27-Q1,3
0013000000OLD003,Financial Partners LLC,User Engagement,UE-03,Declining Usage Patterns,"Platform usage metrics show consistent decline over the past 3 months. Daily active users have dropped by 30% and dashboard views are down significantly.","Monthly usage reports indicate a concerning trend with DAU dropping from 85 to 60 users, and average session time decreasing by 40%. Department heads report that teams are reverting to spreadsheet-based reporting.",Medium,0.85,1. Conduct user experience audit to identify friction points. 2. Provide refresher training sessions for key user groups. 3. Implement user adoption campaign with gamification elements.,old-signal-003,0013000000OLD003,B,C,D,B,C,C,C,D,675000,60,180,320,1200,234000000,150,1800,0.68,true,At Risk,C,C,Financial Services,4,,,2.1,4,2.8,2.0,2.5,2,2,1.8,2.3,2.25,-0.05,Current Grade,2 - BEST CASE,78000,78000,0,0.95,FY27-Q2,4
0013000000OLD004,Manufacturing Solutions,Business,BUS-04,Budget Constraints,"Organization is facing budget cuts and reviewing all software subscriptions. Domo renewal is being questioned due to budget pressures and competing priorities.","CFO mentioned in last quarter's business review that they need to 'trim 15% from all technology spending' and are 'reviewing the ROI of every platform we pay for.' Domo renewal is part of this review process.",High,0.92,1. Prepare comprehensive ROI analysis showing Domo's business impact. 2. Schedule presentation with CFO and finance team. 3. Explore potential contract modifications to address budget concerns.,old-signal-004,013000000OLD004,B,B,C,C,D,B,C,C,920000,25,150,280,1600,445000000,200,2200,0.71,true,At Risk,C,C,Manufacturing,6,,,2.4,4,2.8,2.2,2.1,3,2,2.5,2.6,2.55,-0.05,Current Grade,3 - WCP,95000,85000,-10000,0.89,FY27-Q1,5
0013000000OLD005,Healthcare Innovations,Enablement,EN-02,Training Gaps,"Recent user survey indicates significant knowledge gaps among platform users. Many features are underutilized due to lack of proper training and onboarding.","User satisfaction survey results show that 65% of users feel 'undertrained' on platform capabilities, and 40% report they 'only use basic features.' Training completion rates are below 30% for advanced modules.",Low,0.78,1. Design comprehensive training program for different user personas. 2. Implement mandatory onboarding for new users. 3. Create self-service learning resources and documentation.,old-signal-005,013000000OLD005,A,B,C,B,C,D,B,C,550000,30,95,180,800,167000000,120,1200,0.79,true,Healthy,B,B,Healthcare,3,,,2.7,3,3.2,2.5,2.8,1,2,2.6,2.8,2.75,-0.05,Current Grade,1 - COMMIT,65000,65000,0,1.0,FY27-Q3,6`;

            const combinedData = csvData + '\n' + oldSignalsData;

            this.data = this.parseCSV(combinedData);

            // Validate that we have data
            if (!this.data || this.data.length === 0) {
                throw new Error('No signals data loaded');
            }

            // Initialize comments for all signals
            this.data.forEach(signal => {
                if (signal.id) {
                    this.signalComments.set(signal.id, []);
                }
            });

            // Mark the old signals as viewed
            this.data.forEach(signal => {
                if (signal.id && signal.id.startsWith('old-signal-')) {
                    this.viewedSignals.add(signal.id);
                }
            });

            this.filteredData = [...this.data]; // Initialize filteredData with all data
            console.log(`Loaded ${this.data.length} signals`);
        } catch (error) {
            console.error('Error loading CSV data:', error);
            throw error;
        }
    }

    parseCSV(csvText) {
        const lines = csvText.trim().split('\n');
        const headers = lines[0].split(',');
        const data = [];

        for (let i = 1; i < lines.length; i++) {
            const values = this.parseCSVLine(lines[i]);
            const row = {};

            for (let j = 0; j < headers.length; j++) {
                row[headers[j]] = values[j] || '';
            }

            // Add computed fields
            row.id = row['Signal Id'] || `signal-${i}`;
            row.created_date = this.getRandomRecentDate();
            row.source_icon = this.getSourceIcon(row.category);

            data.push(row);
        }

        return data;
    }

    parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            const nextChar = line[i + 1];

            if (char === '"') {
                if (inQuotes && nextChar === '"') {
                    // Handle escaped quotes inside quoted field
                    current += '"';
                    i++; // Skip the next quote
                } else {
                    // Toggle quote state
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                // Remove surrounding quotes if present
                let value = current.trim();
                if (value.startsWith('"') && value.endsWith('"')) {
                    value = value.slice(1, -1);
                }
                result.push(value);
                current = '';
            } else {
                current += char;
            }
        }

        // Handle the last field
        let value = current.trim();
        if (value.startsWith('"') && value.endsWith('"')) {
            value = value.slice(1, -1);
        }
        result.push(value);
        return result;
    }

    getRandomRecentDate() {
        const now = new Date();
        const daysAgo = Math.floor(Math.random() * 7);
        const date = new Date(now - daysAgo * 24 * 60 * 60 * 1000);
        return date.toISOString().split('T')[0];
    }

    getSourceIcon(category) {
        const icons = {
            'Architecture': 'fas fa-cogs',
            'Relationship': 'fas fa-users',
            'Use Case': 'fas fa-lightbulb',
            'User Engagement': 'fas fa-chart-line',
            'Business': 'fas fa-briefcase',
            'Enablement': 'fas fa-graduation-cap'
        };
        return icons[category] || 'fas fa-info-circle';
    }

    getActionButtonHtml(signal) {
        const hasExistingPlan = this.actionPlans.has(signal.account_id);

        if (hasExistingPlan) {
            return `<button class="btn btn-primary plan-exists" data-action="take-action" data-signal-id="${signal.id}">
                <i class="fas fa-edit"></i> Update Plan
            </button>`;
        } else {
            return `<button class="btn btn-primary" data-action="take-action" data-signal-id="${signal.id}">
                <i class="fas fa-play"></i> Take Action
            </button>`;
        }
    }

    getCommentCountIndicator(signalId) {
        const comments = this.signalComments.get(signalId) || [];
        if (comments.length > 0) {
            return `<span class="comment-count">${comments.length}</span>`;
        }
        return '';
    }


    processAccounts() {
        this.accounts.clear();

        this.data.forEach(signal => {
            const accountId = signal.account_id;

            if (!this.accounts.has(accountId)) {
                this.accounts.set(accountId, {
                    id: accountId,
                    name: signal.account_name,
                    industry: signal['Industry (Domo)'],
                    health: this.getHealthStatus(signal.at_risk_cat),
                    gpa: parseFloat(signal['Account GPA Numeric']) || 0,
                    arr: parseFloat(signal['Total Lifetime Billings']) || 0,
                    signals: [],
                    aiRecommendation: this.generateAIRecommendation(signal)
                });
            }

            this.accounts.get(accountId).signals.push(signal);
        });
    }

    getHealthStatus(riskCategory) {
        const statusMap = {
            'Healthy': 'healthy',
            'At Risk': 'critical',
            'Trending Risk': 'warning',
            'Extreme Risk': 'critical'
        };
        return statusMap[riskCategory] || 'healthy';
    }

    generateAIRecommendation(signal) {
        const recommendations = {
            'High': {
                priority: 'immediate',
                summary: 'Immediate action required based on high-priority signals',
                actions: ['Schedule executive alignment call', 'Engage technical success team', 'Review usage patterns']
            },
            'Medium': {
                priority: 'near-term',
                summary: 'Monitor closely and prepare strategic response',
                actions: ['Schedule check-in call', 'Provide training resources', 'Review implementation plan']
            },
            'Low': {
                priority: 'monitor',
                summary: 'Continue monitoring for trend changes',
                actions: ['Regular health check', 'Share best practices', 'Monitor usage metrics']
            }
        };

        return recommendations[signal.priority] || recommendations['Low'];
    }

    setupEventListeners() {
        // Tab navigation
        const navTabs = document.querySelectorAll('.nav-tab');
        navTabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                const tabName = e.target.getAttribute('data-tab');
                this.switchTab(tabName);
            });
        });

        // Confidence slider - optional element
        const confidenceSlider = document.getElementById('signalConfidence');
        if (confidenceSlider) {
            confidenceSlider.addEventListener('input', (e) => {
                const confidenceDisplay = document.querySelector('.confidence-display');
                if (confidenceDisplay) {
                    confidenceDisplay.textContent = e.target.value + '%';
                }
            });
        }

        // Filter events
        const categoryFilter = document.getElementById('categoryFilter');
        if (categoryFilter) {
            categoryFilter.addEventListener('change', () => {
                this.applyFilters();
                if (this.currentTab === 'signal-feed') {
                    this.renderSignalFeed();
                }
            });
        }

        const priorityFilter = document.getElementById('priorityFilter');
        if (priorityFilter) {
            priorityFilter.addEventListener('change', () => {
                this.applyFilters();
                if (this.currentTab === 'signal-feed') {
                    this.renderSignalFeed();
                }
            });
        }

        // Drawer events
        const postSignalBtn = document.getElementById('postSignalBtn');
        if (postSignalBtn) {
            postSignalBtn.addEventListener('click', () => this.openCreatePlanDrawer());
        }

        const closePlanDrawer = document.getElementById('closePlanDrawer');
        if (closePlanDrawer) {
            closePlanDrawer.addEventListener('click', () => this.closePlanDrawer());
        }

        const closeSignalDrawer = document.getElementById('closeSignalDrawer');
        if (closeSignalDrawer) {
            closeSignalDrawer.addEventListener('click', () => this.closeSignalDrawer());
        }

        const createPlan = document.getElementById('createPlan');
        if (createPlan) {
            createPlan.addEventListener('click', () => this.createActionPlan());
        }

        const cancelPlan = document.getElementById('cancelPlan');
        if (cancelPlan) {
            cancelPlan.addEventListener('click', () => this.closePlanDrawer());
        }

        // Add backdrop click handler
        const backdrop = document.getElementById('createPlanDrawerBackdrop');
        if (backdrop) {
            backdrop.addEventListener('click', () => this.closePlanDrawer());
        }

        // Portfolio filters
        const filterBtns = document.querySelectorAll('.filter-btn');
        filterBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.applyPortfolioFilter(e.target.getAttribute('data-filter'));
            });
        });
    }

    switchTab(tabName) {
        // Update active tab
        document.querySelectorAll('.nav-tab').forEach(tab => tab.classList.remove('active'));
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // Update active content
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        document.getElementById(tabName).classList.add('active');

        this.currentTab = tabName;
        this.renderCurrentTab();
    }

    renderCurrentTab() {
        switch (this.currentTab) {
            case 'signal-feed':
                this.renderSignalFeed();
                break;
            case 'my-portfolio':
                this.renderMyPortfolio();
                break;
            case 'actions':
                this.renderActions();
                break;
        }
    }

    renderSignalFeed() {
        const container = document.getElementById('signalsList');
        if (!container) return;

        // Apply filters first if filteredData is empty
        if (this.filteredData.length === 0 && this.data.length > 0) {
            this.applyFilters();
        }

        // Sort signals by priority (High > Medium > Low) and then by date descending
        const sortedSignals = [...this.filteredData].sort((a, b) => {
            // Priority sorting (High = 3, Medium = 2, Low = 1)
            const priorityOrder = { 'High': 3, 'Medium': 2, 'Low': 1 };
            const priorityA = priorityOrder[a.priority] || 0;
            const priorityB = priorityOrder[b.priority] || 0;

            if (priorityA !== priorityB) {
                return priorityB - priorityA; // Higher priority first
            }

            // If priority is the same, sort by date descending (newest first)
            const dateA = new Date(a.created_date);
            const dateB = new Date(b.created_date);
            return dateB - dateA;
        });

        // Separate new and viewed signals
        const newSignals = sortedSignals.filter(signal => !this.viewedSignals.has(signal.id));
        const viewedSignals = sortedSignals.filter(signal => this.viewedSignals.has(signal.id));

        let html = '';

        // Render new signals with vibrant styling
        newSignals.forEach(signal => {
            const feedbackClass = signal.feedbackType ? `signal-${signal.feedbackType}` : '';
            const feedbackStyle = this.getFeedbackStyle(signal);
            const likeButtonHtml = this.getLikeButtonHtml(signal);
            const notAccurateButtonHtml = this.getNotAccurateButtonHtml(signal);

            html += `
                <div class="signal-card signal-new ${signal.priority.toLowerCase()}-priority ${feedbackClass}" data-signal-id="${signal.id}" style="${feedbackStyle}">
                    <div class="signal-header">
                        <div class="signal-info">
                            <div class="signal-title">${signal.account_name}</div>
                            <div class="signal-meta">
                                <span><i class="${signal.source_icon}"></i> ${signal.name}</span>
                                <span class="category-badge">${signal.category}</span>
                                <span class="priority-badge priority-${signal.priority.toLowerCase()}">${signal.priority}</span>
                                <span>${this.formatDate(signal.created_date)}</span>
                                <span class="new-badge">NEW</span>
                            </div>
                        </div>
                        <button class="signal-close-btn" data-action="remove-signal" data-signal-id="${signal.id}">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="signal-summary">
                        <div class="summary-text">${signal.summary}</div>
                        <div class="rationale-text">
                            <strong>Here's what we noticed:</strong> ${signal.rationale}
                        </div>
                    </div>
                    <div class="signal-footer">
                        <span class="confidence">Confidence: ${Math.round(signal.confidence * 100)}%</span>
                        <div class="signal-actions">
                            ${likeButtonHtml}
                            ${notAccurateButtonHtml}
                            ${this.getActionButtonHtml(signal)}
                        </div>
                    </div>
                    ${this.renderInlineCommentsSection(signal.id)}
                </div>
            `;
        });

        // Add separator line if there are both new and viewed signals
        if (newSignals.length > 0 && viewedSignals.length > 0) {
            html += `
                <div class="signal-separator">
                    <div class="separator-line"></div>
                    <div class="separator-text">Previously Viewed</div>
                    <div class="separator-line"></div>
                </div>
            `;
        }

        // Render viewed signals with muted styling
        viewedSignals.forEach(signal => {
            const feedbackClass = signal.feedbackType ? `signal-${signal.feedbackType}` : '';
            const feedbackStyle = this.getFeedbackStyle(signal);
            const likeButtonHtml = this.getLikeButtonHtml(signal);
            const notAccurateButtonHtml = this.getNotAccurateButtonHtml(signal);

            html += `
                <div class="signal-card signal-viewed ${signal.priority.toLowerCase()}-priority ${feedbackClass}" data-signal-id="${signal.id}" style="${feedbackStyle}">
                    <div class="signal-header">
                        <div class="signal-info">
                            <div class="signal-title">${signal.account_name}</div>
                            <div class="signal-meta">
                                <span><i class="${signal.source_icon}"></i> ${signal.name}</span>
                                <span class="category-badge">${signal.category}</span>
                                <span class="priority-badge priority-${signal.priority.toLowerCase()}">${signal.priority}</span>
                                <span>${this.formatDate(signal.created_date)}</span>
                            </div>
                        </div>
                        <button class="signal-close-btn" data-action="remove-signal" data-signal-id="${signal.id}">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="signal-summary">
                        <div class="summary-text">${signal.summary}</div>
                        <div class="rationale-text">
                            <strong>Here's what we noticed:</strong> ${signal.rationale}
                        </div>
                    </div>
                    <div class="signal-footer">
                        <span class="confidence">Confidence: ${Math.round(signal.confidence * 100)}%</span>
                        <div class="signal-actions">
                            ${likeButtonHtml}
                            ${notAccurateButtonHtml}
                            ${this.getActionButtonHtml(signal)}
                        </div>
                    </div>
                    ${this.renderInlineCommentsSection(signal.id)}
                </div>
            `;
        });

        container.innerHTML = html;

        // Add event listeners after rendering
        container.querySelectorAll('.signal-card').forEach(card => {
            card.addEventListener('click', (e) => {
                // Check if the click was on the comment input, add button, or any part of the LinkedIn comments section
                if (!e.target.closest('.linkedin-comments-section') &&
                    !e.target.closest('.add-comment-form') &&
                    !e.target.classList.contains('add-comment-btn') &&
                    !e.target.classList.contains('comment-input-linkedin') &&
                    !e.target.classList.contains('comment-submit-btn')) {
                    const signalId = e.currentTarget.getAttribute('data-signal-id');
                    this.markSignalAsViewed(signalId);
                    this.openSignalDetails(signalId);
                }
            });
        });

        // Add event listeners for comment submission
        container.querySelectorAll('.comment-submit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const signalId = btn.closest('.signal-card').getAttribute('data-signal-id');
                this.addComment(signalId);
            });
        });

        // Add event listeners for comment input to prevent propagation
        container.querySelectorAll('.comment-input-linkedin').forEach(input => {
            input.addEventListener('click', (e) => {
                e.stopPropagation();
            });
            input.addEventListener('focus', (e) => {
                e.stopPropagation();
            });
            input.addEventListener('keydown', (e) => {
                e.stopPropagation();
                // Allow Enter key to submit comment
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    const signalId = input.closest('.signal-card').getAttribute('data-signal-id');
                    this.addComment(signalId);
                }
            });
        });


        container.querySelectorAll('[data-action="like"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const signalId = btn.getAttribute('data-signal-id');
                this.acknowledgeSignal(signalId, 'like');
            });
        });

        container.querySelectorAll('[data-action="not-accurate"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const signalId = btn.getAttribute('data-signal-id');
                this.acknowledgeSignal(signalId, 'not-accurate');
            });
        });

        container.querySelectorAll('[data-action="take-action"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const signalId = btn.getAttribute('data-signal-id');
                this.markSignalAsViewed(signalId);
                this.takeAction(signalId);
            });
        });

        container.querySelectorAll('[data-action="comment"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const signalId = btn.getAttribute('data-signal-id');
                this.markSignalAsViewed(signalId);
                this.openSignalCommentsDrawer(signalId);
            });
        });

        container.querySelectorAll('[data-action="remove-signal"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const signalId = btn.getAttribute('data-signal-id');
                this.removeSignalFromFeed(signalId);
            });
        });
    }

    renderMyPortfolio() {
        const container = document.getElementById('accountsList');
        if (!container) return;

        // Sort accounts by most recent high priority signal date, then alphabetically
        const sortedAccounts = Array.from(this.accounts.values()).sort((a, b) => {
            // Get the most recent high priority signal for each account
            const aHighPrioritySignals = a.signals.filter(s => s.priority === 'High')
                .sort((s1, s2) => new Date(s2.created_date) - new Date(s1.created_date));
            const bHighPrioritySignals = b.signals.filter(s => s.priority === 'High')
                .sort((s1, s2) => new Date(s2.created_date) - new Date(s1.created_date));

            const aMostRecentHighPriority = aHighPrioritySignals[0];
            const bMostRecentHighPriority = bHighPrioritySignals[0];

            // If both have high priority signals, sort by most recent date
            if (aMostRecentHighPriority && bMostRecentHighPriority) {
                return new Date(bMostRecentHighPriority.created_date) - new Date(aMostRecentHighPriority.created_date);
            }

            // If only one has high priority signals, prioritize that one
            if (aMostRecentHighPriority && !bMostRecentHighPriority) return -1;
            if (!aMostRecentHighPriority && bMostRecentHighPriority) return 1;

            // If neither has high priority signals, sort alphabetically
            return a.name.localeCompare(b.name);
        });

        container.innerHTML = sortedAccounts.map(account => {
            const highPriorityCount = account.signals.filter(s => s.priority === 'High').length;
            const totalSignals = account.signals.length;

            // Sort signals by date descending (newest first), then show up to 5 recent signals
            const sortedSignals = account.signals.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
            const recentSignals = sortedSignals.slice(0, 5);
            const hasMoreSignals = account.signals.length > 5;

            // Get overall rationale from all signals for this account
            const combinedRationale = this.generateCombinedRationale(account.signals);

            return `
                <div class="portfolio-account-card">
                    <div class="account-header-row" onclick="toggleAccountSignals('${account.id}')">
                        <div class="account-title-section">
                            <i class="fas fa-chevron-right account-chevron" id="chevron-${account.id}"></i>
                            <div class="account-warning-icon">
                                <i class="fas fa-exclamation-triangle ${account.health === 'critical' ? 'critical-warning' : account.health === 'warning' ? 'warning-warning' : 'healthy-warning'}"></i>
                            </div>
                            <div class="account-name-info">
                                <h3 class="account-name">${account.name}</h3>
                                <div class="account-stats">${totalSignals} signals • ${highPriorityCount} high priority</div>
                            </div>
                        </div>
                        <div class="account-actions-section">
                            ${account.health === 'critical' ? '<span class="critical-badge">critical</span>' : ''}
                            <button class="btn btn-secondary view-details-btn" onclick="event.stopPropagation(); viewAccountDetails('${account.id}')">
                                View Details
                            </button>
                        </div>
                    </div>

                    <div class="account-details" id="signals-${account.id}">
                        <div class="signals-section">
                            <div class="signals-header">
                                <i class="fas fa-bell signals-icon"></i>
                                <h4 class="signals-title">Recent Signals (Last 7 Days) (${totalSignals})</h4>
                                ${hasMoreSignals ? '<span class="more-signals-link">+2 more</span>' : ''}
                            </div>

                            <div class="signals-list-portfolio">
                                ${recentSignals.map(signal => `
                                    <div class="portfolio-signal-item" onclick="openSignalDetails('${signal.id}')">
                                        <div class="signal-priority-section">
                                            <span class="priority-badge-small priority-${signal.priority.toLowerCase()}">${signal.priority}</span>
                                        </div>
                                        <div class="signal-name-section">
                                            <span class="signal-name">${signal.name}</span>
                                        </div>
                                        <div class="signal-date-section">
                                            <span class="signal-date-small">${this.formatDateSimple(signal.created_date)}</span>
                                            <button class="view-signal-btn" onclick="event.stopPropagation(); openSignalDetails('${signal.id}')">View</button>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>

                        <div class="ai-recommendations-section">
                            <div class="ai-header">
                                <i class="fas fa-lightbulb ai-icon"></i>
                                <h4 class="ai-title">AI Recommendations</h4>
                            </div>

                            <div class="recommendation-priority">
                                <span class="immediate-badge">immediate</span>
                            </div>

                            <div class="recommendations-two-column">
                                <div class="recommendations-actions-column">
                                    <h5 class="column-title">Recommended Actions</h5>
                                    <div class="recommendation-bullets">
                                        ${account.aiRecommendation.actions.slice(0, 3).map(action => `
                                            <div class="recommendation-bullet">• ${action}</div>
                                        `).join('')}
                                    </div>
                                </div>

                                <div class="recommendations-rationale-column">
                                    <h5 class="column-title">Why We Recommend This</h5>
                                    <div class="rationale-summary">
                                        ${this.generateAccountSpecificRationale(account)}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="action-plan-section">
                            <div class="action-plan-header">
                                <i class="fas fa-cogs action-plan-icon"></i>
                                <h4 class="action-plan-title">Action Plan & CS Toolbox</h4>
                            </div>

                            <div class="action-plan-content">
                                <p class="action-plan-description">Create plan with AI recommendations & CS plays</p>
                                <button class="btn btn-primary create-plan-btn" onclick="createActionPlanForAccount('${account.id}')">
                                    <i class="fas fa-plus"></i> Create Plan
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }



    renderActions() {
        // Mock action data for demonstration
        const actions = this.generateMockActions();

        this.updateActionsOverview(actions);

        const container = document.getElementById('actionsList');
        if (!container) return;

        container.innerHTML = actions.map(action => `
            <div class="action-card ${action.urgency}" onclick="viewActionDetails('${action.id}')">
                <div class="action-header">
                    <div class="action-info">
                        <div class="action-title">${action.title}</div>
                        <div class="action-meta">
                            <span>${action.account}</span>
                            <span>Due: ${action.dueDate}</span>
                            <span>Assigned: ${action.assignee}</span>
                        </div>
                    </div>
                    <div class="action-badges">
                        <span class="status-badge status-${action.status.toLowerCase().replace(' ', '-')}">${action.status}</span>
                        ${action.urgency === 'urgent' ? '<span class="priority-badge priority-high">URGENT</span>' : ''}
                    </div>
                </div>
                <div class="action-description">${action.description}</div>
                <div class="action-metrics">
                    <div class="metric-item">
                        <div class="metric-value">${action.creditImpact}</div>
                        <div class="metric-label">Credit Impact</div>
                    </div>
                    <div class="metric-item">
                        <div class="metric-value">${action.renewalImpact}</div>
                        <div class="metric-label">Renewal Impact</div>
                    </div>
                    <div class="metric-item">
                        <div class="metric-value">${action.csatImpact}</div>
                        <div class="metric-label">CSAT Impact</div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    generateMockActions() {
        const accounts = Array.from(this.accounts.values());
        const actionTypes = [
            'Executive Alignment Action Plan',
            'Technical Architecture Action Plan',
            'Training Program Action Plan',
            'Usage Analysis Action Plan',
            'Renewal Strategy Action Plan'
        ];

        return accounts.slice(0, 5).map((account, index) => ({
            id: `action-${index + 1}`,
            title: actionTypes[index],
            account: account.name,
            description: `Comprehensive action plan for ${account.name} to address current signals and improve health score.`,
            status: ['Pending', 'In Progress', 'Completed'][index % 3],
            urgency: account.health === 'critical' ? 'urgent' : 'normal',
            dueDate: this.getRandomFutureDate(),
            assignee: 'Current User',
            creditImpact: `+${Math.floor(Math.random() * 30 + 10)}%`,
            renewalImpact: `+${Math.floor(Math.random() * 25 + 5)}%`,
            csatImpact: `+${Math.floor(Math.random() * 2) + 1}.${Math.floor(Math.random() * 9)}`
        }));
    }

    getRandomFutureDate() {
        const now = new Date();
        const futureDate = new Date(now.getTime() + Math.random() * 30 * 24 * 60 * 60 * 1000);
        return futureDate.toLocaleDateString();
    }

    updateActionsOverview(actions) {
        const totalActions = actions.length;
        const pendingActions = actions.filter(a => a.status === 'Pending').length;
        const inProgressActions = actions.filter(a => a.status === 'In Progress').length;
        const avgImpact = Math.floor(Math.random() * 15 + 5);

        document.getElementById('totalActions').textContent = totalActions;
        document.getElementById('pendingActions').textContent = pendingActions;
        document.getElementById('inProgressActions').textContent = inProgressActions;
        document.getElementById('projectedImpact').textContent = `+${avgImpact}%`;
    }

    applyFilters() {
        const categoryFilter = document.getElementById('categoryFilter')?.value || '';
        const priorityFilter = document.getElementById('priorityFilter')?.value || '';

        this.filteredData = this.data.filter(signal => {
            const categoryMatch = !categoryFilter || signal.category === categoryFilter;
            const priorityMatch = !priorityFilter || signal.priority === priorityFilter;
            return categoryMatch && priorityMatch;
        });
    }

    updateSummaryStats() {
        const highPrioritySignals = this.data.filter(s => s.priority === 'High').length;
        const totalSignals = this.data.length;

        const newSignalsCount = document.getElementById('newSignalsCount');
        if (newSignalsCount) {
            newSignalsCount.textContent = totalSignals;
        }

        const highPriorityCount = document.getElementById('highPriorityCount');
        if (highPriorityCount) {
            highPriorityCount.textContent = highPrioritySignals;
        }

        const portfolioNewSignals = document.getElementById('portfolioNewSignals');
        if (portfolioNewSignals) {
            portfolioNewSignals.textContent = totalSignals;
        }

        const portfolioHighPriority = document.getElementById('portfolioHighPriority');
        if (portfolioHighPriority) {
            portfolioHighPriority.textContent = highPrioritySignals;
        }
    }

    // Event Handlers
    openSignalDetails(signalId) {
        const signal = this.data.find(s => s.id === signalId);
        if (!signal) return;

        const eventSource = this.generateEventSource(signal);

        document.getElementById('signalTitle').textContent = signal.name;
        document.getElementById('signalDetails').innerHTML = `
            <div class="signal-detail-content">
                <div class="detail-section">
                    <h3>Signal Information</h3>
                    <p><strong>Account:</strong> ${signal.account_name}</p>
                    <p><strong>Category:</strong> ${signal.category}</p>
                    <p><strong>Priority:</strong> ${signal.priority}</p>
                    <p><strong>Confidence:</strong> ${Math.round(signal.confidence * 100)}%</p>
                </div>
                <div class="detail-section">
                    <h3>Summary</h3>
                    <p>${signal.summary}</p>
                </div>
                <div class="detail-section">
                    <h3>Rationale</h3>
                    <p>${signal.rationale}</p>
                </div>
                <div class="detail-section">
                    <h3>Recommended Actions</h3>
                    <p>${signal.action_context}</p>
                </div>
                <div class="detail-section">
                    <h3>Event Source</h3>
                    <div class="event-source-card">
                        <div class="event-source-header">
                            <i class="${eventSource.icon}"></i>
                            <div class="event-source-info">
                                <div class="event-source-type">${eventSource.type}</div>
                                <div class="event-source-date">${eventSource.date}</div>
                            </div>
                        </div>
                        <div class="event-source-title">${eventSource.title}</div>
                        <a href="${eventSource.link}" target="_blank" class="event-source-link">
                            <i class="fas fa-external-link-alt"></i>
                            ${eventSource.linkText}
                        </a>
                    </div>
                </div>
                ${this.renderSignalCommentsSection(signalId)}
            </div>
        `;

        document.getElementById('signalDrawer').classList.add('open');
    }

    closeSignalDrawer() {
        document.getElementById('signalDrawer').classList.remove('open');
    }

    openSignalCommentsDrawer(signalId) {
        const signal = this.data.find(s => s.id === signalId);
        if (!signal) return;

        document.getElementById('signalTitle').textContent = `${signal.name} - Comments`;
        document.getElementById('signalDetails').innerHTML = `
            <div class="signal-detail-content">
                <div class="detail-section comments-section">
                    <h3>Comments for ${signal.name}</h3>
                    <div id="commentsList">
                        ${this.renderCommentsForSignal(signalId)}
                    </div>
                    <div class="add-comment-form">
                        <textarea id="newCommentText" placeholder="Add a new comment..."></textarea>
                        <button class="btn btn-primary" onclick="addComment('${signalId}')">Add Comment</button>
                    </div>
                </div>
            </div>
        `;
        document.getElementById('signalDrawer').classList.add('open');
    }

    renderCommentsForSignal(signalId) {
        const comments = this.signalComments.get(signalId) || [];
        if (comments.length === 0) {
            return '<p>No comments yet. Be the first to add one!</p>';
        }

        return comments.map(comment => `
            <div class="comment">
                <div class="comment-author">${comment.author}</div>
                <div class="comment-date">${this.formatCommentDate(comment.timestamp)}</div>
                <div class="comment-text">${comment.text}</div>
            </div>
        `).join('');
    }

    renderSignalCommentsSection(signalId) {
        const comments = this.signalComments.get(signalId) || [];
        return `
            <div class="detail-section">
                <h3>Comments (${comments.length})</h3>
                <div class="comments-list">
                    ${comments.slice(0, 3).map(comment => `
                        <div class="comment-preview">
                            <div class="comment-author-preview">${comment.author}</div>
                            <div class="comment-text-preview">${comment.text.substring(0, 60)}...</div>
                        </div>
                    `).join('')}
                    ${comments.length > 3 ? `<div class="view-all-comments" onclick="openSignalCommentsDrawer('${signalId}')">View all ${comments.length} comments</div>` : ''}
                </div>
                <div class="add-comment-form-inline">
                    <textarea id="inlineCommentText-${signalId}" placeholder="Add a comment..."></textarea>
                    <button class="btn btn-secondary add-comment-btn">Comment</button>
                </div>
            </div>
        `;
    }

    addComment(signalId) {
        const commentText = document.getElementById(`inlineCommentText-${signalId}`)?.value || document.getElementById('newCommentText')?.value;
        if (!commentText) {
            return;
        }

        const newComment = {
            id: `comment-${Date.now()}`,
            signalId: signalId,
            author: 'Current User', // Replace with actual user if available
            timestamp: new Date(),
            text: commentText
        };

        if (!this.signalComments.has(signalId)) {
            this.signalComments.set(signalId, []);
        }
        this.signalComments.get(signalId).push(newComment);

        // Update the UI to show the new comment count and the comment itself if in the drawer
        const commentButton = document.querySelector(`[data-signal-id="${signalId}"][data-action="comment"]`);
        if (commentButton) {
            const commentCountSpan = commentButton.querySelector('.comment-count');
            if (commentCountSpan) {
                commentCountSpan.textContent = this.signalComments.get(signalId).length;
            } else {
                commentButton.innerHTML += `<span class="comment-count">${this.signalComments.get(signalId).length}</span>`;
            }
        }

        // If we are in the signal details drawer showing comments, refresh the comments list
        const currentSignalIdInDrawer = document.querySelector('#signalDetails .comments-section')?.innerHTML.includes(`id="newCommentText-${signalId}"`) ? signalId : null;
        if (currentSignalIdInDrawer === signalId) {
            this.openSignalCommentsDrawer(signalId);
        } else {
            // Optionally show a temporary success message
            this.showSuccessMessage('Comment added!');
        }

        // Clear the input fields
        if (document.getElementById(`inlineCommentText-${signalId}`)) {
            document.getElementById(`inlineCommentText-${signalId}`).value = '';
        }
        if (document.getElementById('newCommentText')) {
            document.getElementById('newCommentText').value = '';
        }

        // Re-render signal feed to update comment counts on buttons
        if (this.currentTab === 'signal-feed') {
            this.renderSignalFeed();
        }
    }

    getFeedbackStyle(signal) {
        if (signal.feedbackType === 'like') {
            return 'background-color: #d4f6d4; border-left: 4px solid #28a745; border: 1px solid #c3e6cb;';
        } else if (signal.feedbackType === 'not-accurate') {
            return 'background-color: #f8d7da; border-left: 4px solid #dc3545; border: 1px solid #f5c6cb;';
        }
        return '';
    }

    getLikeButtonHtml(signal) {
        if (signal.feedbackType === 'like') {
            return `<button class="btn btn-secondary liked-btn" data-action="like" data-signal-id="${signal.id}">
                <i class="fas fa-check"></i> Liked!
            </button>`;
        } else {
            return `<button class="btn btn-secondary" data-action="like" data-signal-id="${signal.id}">
                <i class="fas fa-thumbs-up"></i> Like
            </button>`;
        }
    }

    getNotAccurateButtonHtml(signal) {
        if (signal.feedbackType === 'not-accurate') {
            return `<button class="btn btn-secondary not-accurate-btn" data-action="not-accurate" data-signal-id="${signal.id}">
                <i class="fas fa-thumbs-down"></i> Not Accurate
            </button>`;
        } else {
            return `<button class="btn btn-secondary" data-action="not-accurate" data-signal-id="${signal.id}">
                <i class="fas fa-thumbs-down"></i> Not Accurate
            </button>`;
        }
    }


    formatCommentDate(date) {
        return date.toLocaleString();
    }

    renderInlineCommentsSection(signalId) {
        const comments = this.signalComments.get(signalId) || [];
        return `
            <div class="linkedin-comments-section">
                <div class="comments-header">
                    <span class="comments-count">${comments.length} comment${comments.length !== 1 ? 's' : ''}</span>
                </div>
                <div class="comments-list-linkedin">
                    ${comments.map(comment => `
                        <div class="comment-linkedin">
                            <div class="comment-avatar">
                                <span class="avatar-initials">${this.getInitials(comment.author)}</span>
                            </div>
                            <div class="comment-content">
                                <div class="comment-header">
                                    <span class="comment-author">${comment.author}</span>
                                    <span class="comment-time">${this.formatCommentTime(comment.timestamp)}</span>
                                </div>
                                <div class="comment-text">${comment.text}</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
                <div class="add-comment-linkedin">
                    <div class="comment-input-avatar">
                        <span class="avatar-initials">JS</span>
                    </div>
                    <div class="comment-input-container">
                        <input type="text" id="inlineCommentText-${signalId}" placeholder="Write a comment..." class="comment-input-linkedin">
                        <button class="comment-submit-btn" onclick="addComment('${signalId}')">Comment</button>
                    </div>
                </div>
            </div>
        `;
    }


    acknowledgeSignal(signalId, feedbackType) {
        // Find the signal data
        const signal = this.data.find(s => s.id === signalId);
        if (!signal) return;

        // Check if this signal already has this feedback type
        const isAlreadySelected = signal.feedbackType === feedbackType;

        // Store the feedback type in the signal data
        if (!isAlreadySelected) {
            signal.feedbackType = feedbackType;
        } else {
            // If clicking the same feedback type, remove it
            delete signal.feedbackType;
        }

        // Re-render the signal feed to show the updated state
        if (this.currentTab === 'signal-feed') {
            this.renderSignalFeed();
        }
    }

    resetSignalState(signalCard, signal) {
        // Remove all feedback classes
        signalCard.classList.remove('signal-like', 'signal-not-accurate');

        // Reset styles to default
        signalCard.style.backgroundColor = '';
        signalCard.style.borderLeft = '';
        signalCard.style.border = '';

        // Reset action buttons to original state
        const likeButton = signalCard.querySelector('[data-action="like"]');
        if (likeButton) {
            likeButton.innerHTML = '<i class="fas fa-thumbs-up"></i> Like';
            likeButton.style.backgroundColor = '';
            likeButton.style.color = '';
            likeButton.style.borderColor = '';
            likeButton.disabled = false;
        }

        const notAccurateButton = signalCard.querySelector('[data-action="not-accurate"]');
        if (notAccurateButton) {
            notAccurateButton.innerHTML = '<i class="fas fa-thumbs-down"></i> Not Accurate';
            notAccurateButton.style.backgroundColor = '';
            notAccurateButton.style.color = '';
            notAccurateButton.style.borderColor = '';
            notAccurateButton.disabled = false;
        }

        // Remove feedback indicators
        const feedbackIndicators = signalCard.querySelectorAll('.feedback-indicator');
        feedbackIndicators.forEach(indicator => indicator.remove());

        // Clear feedback type from signal data
        delete signal.feedbackType;
    }

    takeAction(signalId) {
        // Use ActionPlanService instead of local implementation
        ActionPlanService.openCreatePlanDrawer(signalId, this);
    }

    openCreatePlanDrawer(signalId = null) {
        // Delegate to ActionPlanService
        ActionPlanService.openCreatePlanDrawer(signalId, this);
    }



    switchToSignal(signalId) {
        const signal = this.data.find(s => s.id === signalId);
        if (signal) {
            ActionPlanService.populateAccountCentricPlan(signal, this);
        }
    }

    closePlanDrawer() {
        ActionPlanService.closePlanDrawer();
    }



    addRecommendationAction(action, buttonElement) {
        // Check if the action is already added to prevent duplicates
        const actionItemsContainer = document.getElementById('actionItems');
        const existingActionElements = actionItemsContainer.querySelectorAll('.action-text');
        let isAlreadyAdded = false;
        existingActionElements.forEach(el => {
            if (el.textContent === action) {
                isAlreadyAdded = true;
            }
        });

        if (!isAlreadyAdded) {
            this.addActionItem(action);
            // Update button to "Added!"
            buttonElement.textContent = "Added!";
            buttonElement.classList.add('added');
            buttonElement.disabled = true;
        } else {
            console.log("Action already added.");
        }
    }

    addToolboxPlay(playTitle, buttonElement) {
        // Check if the action is already added to prevent duplicates
        const actionItemsContainer = document.getElementById('actionItems');
        const existingActionElements = actionItemsContainer.querySelectorAll('.action-text');
        let isAlreadyAdded = false;
        existingActionElements.forEach(el => {
            if (el.textContent === playTitle) {
                isAlreadyAdded = true;
            }
        });

        if (!isAlreadyAdded) {
            this.addActionItem(playTitle);
            // Update button to "Added!"
            buttonElement.textContent = "Added!";
            buttonElement.classList.add('added');
            buttonElement.disabled = true; // Optionally disable after adding
        } else {
            // If the user wants to re-add, we need a way to enable it again.
            // For now, we'll just alert if it's already added and not re-add.
            console.log("Action already added.");
        }
    }

    addActionItem(title) {
        const container = document.getElementById('actionItems');
        const actionId = `action-${Date.now()}`;

        const actionHtml = `
            <div class="action-item" id="${actionId}">
                <input type="checkbox" class="action-checkbox" id="checkbox-${actionId}">
                <span class="action-text">${title}</span>
                <button class="btn btn-secondary" onclick="app.removeActionItem('${actionId}')">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;

        container.insertAdjacentHTML('beforeend', actionHtml);
    }

    removeActionItem(actionId) {
        const actionItemElement = document.getElementById(actionId);
        if (actionItemElement) {
            const actionText = actionItemElement.querySelector('.action-text').textContent;
            actionItemElement.remove();

            // Update the corresponding buttons (both AI recommendations and toolbox plays)
            const allButtons = document.querySelectorAll('.add-action-btn');
            allButtons.forEach(button => {
                if (button.getAttribute('data-title') === actionText && button.classList.contains('added')) {
                    // Check if it's a toolbox play or AI recommendation
                    const isToolboxPlay = button.closest('.toolbox-play') !== null;
                    button.textContent = isToolboxPlay ? "+ Add Play" : "+ Add as Action";
                    button.classList.remove('added');
                    button.disabled = false;
                }
            });
        }
    }

    createActionPlan() {
        ActionPlanService.createActionPlan(this);
    }

    showSuccessMessage(message) {
        // Create and show a success notification
        const notification = document.createElement('div');
        notification.className = 'success-notification';
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-check-circle"></i>
                <span>${message}</span>
            </div>
        `;

        document.body.appendChild(notification);

        // Animate in
        setTimeout(() => notification.classList.add('show'), 100);

        // Remove after 3 seconds
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    showErrorMessage(message) {
        // Create and show an error notification
        const notification = document.createElement('div');
        notification.className = 'error-notification';
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-exclamation-circle"></i>
                <span>${message}</span>
            </div>
        `;

        document.body.appendChild(notification);

        // Animate in
        setTimeout(() => notification.classList.add('show'), 100);

        // Remove after 5 seconds for errors
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 5000);
    }

    toggleAccountSignals(accountId) {
        const signalsContainer = document.getElementById(`signals-${accountId}`);
        const chevron = document.getElementById(`chevron-${accountId}`);
        const isExpanded = signalsContainer.classList.contains('expanded');

        // Close all other expanded accounts
        document.querySelectorAll('.account-details.expanded').forEach(container => {
            container.classList.remove('expanded');
        });
        document.querySelectorAll('.account-chevron').forEach(icon => {
            icon.classList.remove('rotated');
        });

        // Toggle current account
        if (!isExpanded) {
            signalsContainer.classList.add('expanded');
            chevron.classList.add('rotated');
        }
    }

    generateCombinedRationale(signals) {
        const highPrioritySignals = signals.filter(s => s.priority === 'High');
        if (highPrioritySignals.length === 0) {
            return "Monitor account health and continue engagement activities.";
        }

        if (highPrioritySignals.length === 1) {
            return `IMMEDIATE ACTION REQUIRED: ${highPrioritySignals[0].summary}`;
        }

        return `IMMEDIATE ACTION REQUIRED: Multiple high-priority signals detected. ${highPrioritySignals.length} recommended actions based on ${signals.length} signals.`;
    }

    generateAccountSpecificRationale(account) {
        const highPrioritySignals = account.signals.filter(s => s.priority === 'High');
        const totalSignals = account.signals.length;
        const industry = account.industry || 'Industry';
        const health = account.health;

        // Generate tailored rationale based on account characteristics
        if (highPrioritySignals.length > 1) {
            return `${account.name} has ${highPrioritySignals.length} high-priority signals indicating potential risks to renewal. As a ${industry.toLowerCase()} company with ${health} health status, immediate executive alignment is critical to address implementation gaps and ensure platform adoption success. Quick action now will prevent escalation and maintain the strategic partnership.`;
        } else if (highPrioritySignals.length === 1) {
            const signal = highPrioritySignals[0];
            const signalType = signal.category.toLowerCase();

            if (signalType.includes('relationship')) {
                return `The relationship signal for ${account.name} suggests stakeholder gaps that could impact renewal decisions. In the ${industry.toLowerCase()} sector, maintaining strong executive relationships is essential for platform expansion. Addressing this proactively will strengthen partnership and unlock growth opportunities.`;
            } else if (signalType.includes('use case')) {
                return `${account.name}'s use case signal indicates untapped value potential. For ${industry.toLowerCase()} organizations, demonstrating clear ROI through expanded use cases drives platform stickiness. Acting on this opportunity will increase consumption and justify continued investment.`;
            } else if (signalType.includes('architecture')) {
                return `Technical architecture concerns at ${account.name} could impact data reliability and user experience. ${industry} companies rely heavily on data accuracy for decision-making. Resolving these technical challenges will improve user satisfaction and prevent churn.`;
            } else {
                return `${account.name}'s signal requires immediate attention to maintain account health. Given their ${industry.toLowerCase()} focus and current ${health} status, these recommended actions will address key concerns and strengthen the customer relationship for long-term success.`;
            }
        } else {
            return `While ${account.name} shows ${health} overall health, proactive engagement in the ${industry.toLowerCase()} sector is key to identifying expansion opportunities and preventing any emerging risks. These actions will strengthen the partnership and drive continued growth.`;
        }
    }

    formatDateSimple(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = now - date;
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;

        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    createActionPlanForAccount(accountId) {
        const account = this.accounts.get(accountId);
        if (account && account.signals.length > 0) {
            // Use the first signal of the account to open the account-centric view
            this.openCreatePlanDrawer(account.signals[0].id);
        } else {
            this.openCreatePlanDrawer();
        }
    }

    viewAccountDetails(accountId) {
        console.log('Viewing account details for:', accountId);
    }

    applyPortfolioFilter(filter) {
        console.log('Applying portfolio filter:', filter);
    }

    // Utility methods
    formatNumber(num) {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toString();
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = now - date;
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;

        return date.toLocaleDateString();
    }

    showLoading() {
        document.getElementById('loadingOverlay').style.display = 'flex';
    }

    hideLoading() {
        document.getElementById('loadingOverlay').style.display = 'none';
    }

    markSignalAsViewed(signalId) {
        this.viewedSignals.add(signalId);
        // Re-render to update visual state
        if (this.currentTab === 'signal-feed') {
            this.renderSignalFeed();
        }
    }

    markSignalAsViewedAndRefresh(signalId) {
        this.markSignalAsViewed(signalId);
        this.renderCurrentTab();
    }

    generateEventSource(signal) {
        // Generate mock event sources based on signal type and category
        const eventTypes = {
            'Architecture': [
                {
                    type: 'Gong Call Recording',
                    icon: 'fas fa-video',
                    title: 'Technical Architecture Discussion',
                    linkText: 'View Call Recording',
                    link: 'https://app.gong.io/call?id=mock-call-123'
                },
                {
                    type: 'Support Ticket',
                    icon: 'fas fa-ticket-alt',
                    title: 'Performance Issues with Data Pipeline',
                    linkText: 'View Ticket',
                    link: 'https://support.company.com/ticket/arch-456'
                }
            ],
            'Relationship': [
                {
                    type: 'Gong Call Recording',
                    icon: 'fas fa-video',
                    title: 'Quarterly Business Review',
                    linkText: 'View Call Recording',
                    link: 'https://app.gong.io/call?id=mock-qbr-789'
                },
                {
                    type: 'Email Thread',
                    icon: 'fas fa-envelope',
                    title: 'Stakeholder Change Notification',
                    linkText: 'View Email Thread',
                    link: 'https://outlook.office.com/mail/id/rel-email-123'
                }
            ],
            'Use Case': [
                {
                    type: 'Gong Call Recording',
                    icon: 'fas fa-video',
                    title: 'Use Case Discovery Session',
                    linkText: 'View Call Recording',
                    link: 'https://app.gong.io/call?id=mock-discovery-456'
                },
                {
                    type: 'Meeting Notes',
                    icon: 'fas fa-file-alt',
                    title: 'Requirements Gathering Meeting',
                    linkText: 'View Meeting Notes',
                    link: 'https://docs.company.com/meeting/uc-notes-789'
                }
            ],
            'User Engagement': [
                {
                    type: 'Usage Analytics',
                    icon: 'fas fa-chart-line',
                    title: 'Weekly Usage Report',
                    linkText: 'View Analytics Dashboard',
                    link: 'https://analytics.company.com/dashboard/usage-123'
                },
                {
                    type: 'User Survey',
                    icon: 'fas fa-poll',
                    title: 'Customer Satisfaction Survey',
                    linkText: 'View Survey Results',
                    link: 'https://surveys.company.com/results/csat-456'
                }
            ],
            'Business': [
                {
                    type: 'Gong Call Recording',
                    icon: 'fas fa-video',
                    title: 'Budget Review Meeting',
                    linkText: 'View Call Recording',
                    link: 'https://app.gong.io/call?id=mock-budget-789'
                },
                {
                    type: 'Contract Discussion',
                    icon: 'fas fa-handshake',
                    title: 'Renewal Strategy Session',
                    linkText: 'View Contract Details',
                    link: 'https://contracts.company.com/renewal/bus-123'
                }
            ],
            'Enablement': [
                {
                    type: 'Training Session',
                    icon: 'fas fa-graduation-cap',
                    title: 'Platform Training Workshop',
                    linkText: 'View Training Materials',
                    link: 'https://training.company.com/session/enable-456'
                },
                {
                    type: 'User Feedback',
                    icon: 'fas fa-comments',
                    title: 'Training Effectiveness Survey',
                    linkText: 'View Feedback',
                    link: 'https://feedback.company.com/training/survey-789'
                }
            ]
        };

        const categoryEvents = eventTypes[signal.category] || eventTypes['Use Case'];
        const randomEvent = categoryEvents[Math.floor(Math.random() * categoryEvents.length)];

        // Generate a realistic date within the last 30 days
        const eventDate = new Date();
        eventDate.setDate(eventDate.getDate() - Math.floor(Math.random() * 30));

        return {
            ...randomEvent,
            date: eventDate.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            })
        };
    }

    removeSignalFromFeed(signalId) {
        const signalCard = document.querySelector(`[data-signal-id="${signalId}"]`);
        const closeBtn = signalCard?.querySelector('.signal-close-btn');

        if (closeBtn && signalCard) {
            // Add water explosion animation
            closeBtn.classList.add('water-explosion');
            signalCard.classList.add('exploding');

            // Wait for animation to complete before removing
            setTimeout(() => {
                // Remove from filtered data
                this.filteredData = this.filteredData.filter(signal => signal.id !== signalId);

                // Remove from main data
                this.data = this.data.filter(signal => signal.id !== signalId);

                // Remove from viewed signals
                this.viewedSignals.delete(signalId);

                // Update summary stats
                this.updateSummaryStats();

                // Re-render current tab
                this.renderCurrentTab();

                // Show confirmation message
                this.showSuccessMessage('Signal removed from feed');
            }, 800); // Match the animation duration
        } else {
            // Fallback if elements not found
            this.filteredData = this.filteredData.filter(signal => signal.id !== signalId);
            this.data = this.data.filter(signal => signal.id !== signalId);
            this.viewedSignals.delete(signalId);
            this.updateSummaryStats();
            this.renderCurrentTab();
            this.showSuccessMessage('Signal removed from feed');
        }
    }

    // Helper function to get initials from a name
    getInitials(name) {
        if (!name) return '';
        const nameParts = name.split(' ');
        if (nameParts.length >= 2) {
            return nameParts[0].charAt(0).toUpperCase() + nameParts[1].charAt(0).toUpperCase();
        } else if (nameParts.length === 1) {
            return nameParts[0].charAt(0).toUpperCase();
        }
        return '';
    }

    // Helper function to format comment time (e.g., "Just now", "2m ago")
    formatCommentTime(timestamp) {
        const now = new Date();
        const commentTime = new Date(timestamp);
        const diffSeconds = Math.floor((now - commentTime) / 1000);

        if (diffSeconds < 60) {
            return 'Just now';
        } else if (diffSeconds < 3600) {
            const diffMinutes = Math.floor(diffSeconds / 60);
            return `${diffMinutes}m ago`;
        } else if (diffSeconds < 86400) {
            const diffHours = Math.floor(diffSeconds / 3600);
            return `${diffHours}h ago`;
        } else {
            return commentTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }
    }

}

// Initialize the application
window.app = null; // Make app globally accessible

// Globally exposed functions for HTML onclick handlers

function toggleAccountSignals(accountId) {
    if (window.app) {
        window.app.toggleAccountSignals(accountId);
    }
}

function createActionPlanForAccount(accountId) {
    if (window.app) {
        window.app.createActionPlanForAccount(accountId);
    }
}

function viewAccountDetails(accountId) {
    if (window.app) {
        window.app.viewAccountDetails(accountId);
    }
}

function openSignalDetails(signalId) {
    if (window.app) {
        window.app.openSignalDetails(signalId);
    }
}

function switchToSignal(signalId) {
    if (window.app) {
        window.app.switchToSignal(signalId);
    }
}

function addComment(signalId) {
    if (window.app) {
        window.app.addComment(signalId);
    }
}

function openSignalCommentsDrawer(signalId) {
    if (window.app) {
        window.app.openSignalCommentsDrawer(signalId);
    }
}

function viewActionDetails(actionId) {
    console.log('Viewing action details for:', actionId);
}

function applyPortfolioFilter(filter) {
    console.log('Applying portfolio filter:', filter);
}

document.addEventListener('DOMContentLoaded', () => {
    window.app = new SignalsAI();
});