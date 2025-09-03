// Event Handlers - Manage all UI event listeners
class EventHandlers {

    static setupEventListeners(app) {
        // Tab navigation
        const navTabs = document.querySelectorAll('.nav-tab');
        navTabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                const tabName = e.target.getAttribute('data-tab');
                app.switchTab(tabName);
            });
        });

        // Filter events
        const categoryFilter = document.getElementById('categoryFilter');
        if (categoryFilter) {
            categoryFilter.addEventListener('change', () => {
                app.applyFilters();
                if (app.currentTab === 'signal-feed') {
                    SignalRenderer.renderSignalFeed(app);
                }
            });
        }

        const priorityFilter = document.getElementById('priorityFilter');
        if (priorityFilter) {
            priorityFilter.addEventListener('change', () => {
                app.applyFilters();
                if (app.currentTab === 'signal-feed') {
                    SignalRenderer.renderSignalFeed(app);
                }
            });
        }

        // Drawer events
        const closePlanDrawer = document.getElementById('closePlanDrawer');
        if (closePlanDrawer) {
            closePlanDrawer.addEventListener('click', () => ActionPlanService.closePlanDrawer());
        }

        const closeSignalDrawer = document.getElementById('closeSignalDrawer');
        if (closeSignalDrawer) {
            closeSignalDrawer.addEventListener('click', () => SignalDetailsService.closeSignalDrawer());
        }

        const createPlan = document.getElementById('createPlan');
        if (createPlan) {
            createPlan.addEventListener('click', () => ActionPlanService.createActionPlan(app));
        }

        const cancelPlan = document.getElementById('cancelPlan');
        if (cancelPlan) {
            cancelPlan.addEventListener('click', () => ActionPlanService.closePlanDrawer());
        }

        // Portfolio filters
        const filterBtns = document.querySelectorAll('.filter-btn');
        filterBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                app.applyPortfolioFilter(e.target.getAttribute('data-filter'));
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

        // Drawer close buttons
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('drawer-close') || e.target.id === 'closePlanDrawer') {
                ActionPlanService.closePlanDrawer();
            }
            if (e.target.classList.contains('drawer-close') || e.target.id === 'closeSignalDrawer') {
                SignalDetailsService.closeSignalDrawer();
            }
        });

        // Close drawer when clicking backdrop
        document.addEventListener('click', (e) => {
            if (e.target.id === 'createPlanDrawerBackdrop') {
                ActionPlanService.closePlanDrawer();
            }
        });
    }
}