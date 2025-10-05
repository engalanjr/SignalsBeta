// PortfolioOverviewController - Controller for portfolio overview tab
class PortfolioOverviewController {
    constructor() {
        console.log('📊 PortfolioOverviewController initialized');
    }

    render(state) {
        console.log('📊 Rendering Portfolio Overview');
        PortfolioOverviewRenderer.renderOverview(state);
    }
}

// Make globally available
window.PortfolioOverviewController = PortfolioOverviewController;

