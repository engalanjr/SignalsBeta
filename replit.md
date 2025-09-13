# SignalsAI v8.0 - Customer Success Management

## Overview
SignalsAI is a frontend-only web application built with vanilla HTML, CSS, and JavaScript for customer success management. Its purpose is to track and manage customer signals, relationships, and action plans. Key capabilities include signal feed management, portfolio overviews, action plan tracking, customer relationship insights, interactive feedback systems, and advanced portfolio analytics through the new Whitespace dashboard. The project aims to provide a comprehensive, intuitive platform for managing customer success, leveraging detailed data models and AI recommendations to enhance user decision-making.

## User Preferences
I prefer detailed explanations and iterative development. Ask before making major changes. Do not make changes to files outside the `js/` directory unless absolutely necessary for core functionality. Ensure changes maintain consistency with the existing vanilla JavaScript, HTML, and CSS structure.

## System Architecture
The application is a frontend-only web application utilizing vanilla HTML5, CSS3, and JavaScript (ES6+). It's served by a Python 3.11 HTTP server that handles static files, caching, and CORS.

**UI/UX Decisions:**
- Uses Domo brand colors defined in `app.css`.
- Action Plans interface redesigned to a modern project management table layout (inspired by Asana/Monday.com) with account grouping and collapsible sections.
- Priority-based signal sorting and pagination for improved readability.
- Professional, color-coded status badges for action plan tasks.
- Right-sliding drawers for adding to plans and managing plays.
- Portfolio view is structured into "Accounts with a recent high Priority Signal" and "All Accounts" sections.
- **New Whitespace Dashboard:** Executive analytics view featuring bubble charts and heat maps for portfolio-wide risk/opportunity identification with polarity-based color coding.

**Technical Implementations & Feature Specifications:**
- **Data Handling:** Normalized relational data model with separate entities (Account, Signal, RecommendedAction, Interaction, Comment, ActionPlan) to eliminate ~80% data duplication. Features comprehensive CSV data integration with robust parsing for complex fields, including signal polarity and a wide range of additional fields. Uses normalized storage with relationship indexes and denormalization for UI compatibility. Optimistic CRUD operations with instant UI feedback and a snapshot rollback system for data consistency.
- **Performance:** Implemented parallel batch loading with in-memory data caching to reduce load times. Normalized relational model reduces memory footprint by ~80% through data deduplication.
- **Action Plans:** Full CRUD functionality for action plans with optimistic updates. Supports task sorting by priority and due date. Includes play management with completion tracking and persistence. Features a comprehensive task details modal for editing properties with auto-save and robust validation. Multi-select and bulk deletion capabilities are also implemented. Resilient local storage fallback for offline functionality.
- **Signal Feedback:** "Like" and "Not Accurate" buttons provide visual feedback and are connected to interaction CRUD methods.
- **AI Recommendations:** Redesigned display with priority badges (IMMEDIATE/NEAR-TERM/LONG-TERM) and dates, with "Add to Plan" functionality.
- **Account Grouping & Filtering:** Action plans are organized by customer account. Portfolio view groups accounts based on recent high-priority signals.
- **User ID Resolution:** Implements a comprehensive user ID mapping system to convert numeric IDs to readable names and initials for consistency across the application.
- **Status Normalization:** Centralized status normalization system handles various status formats for consistent display and functionality.
- **Whitespace Analytics:** New executive dashboard featuring interactive bubble charts showing signal density vs renewal value, and heat maps displaying account signal activity patterns. Uses polarity-based color coding (Risk=red, Opportunity=green, Enrichment=blue/gray) with interactive tooltips and detailed insights panels.

**System Design Choices:**
- Frontend relies on a modular JavaScript structure within the `js/` directory.
- Normalized relational data model with 6 main entities and proper foreign key relationships.
- SignalsRepository handles data normalization, SignalsStore maintains normalized storage with denormalization for backward compatibility.
- Application gracefully falls back to sample or JSON data when external APIs are unavailable.
- Designed for Replit compatibility with specific port and binding configurations.
- Deployment configured for autoscale using the Python server.
- **New WhitespaceRenderer:** Dedicated renderer for executive analytics with Canvas-based charting, interactive features, and comprehensive data visualization capabilities.

## External Dependencies
- **Font Awesome:** For icons.
- **Domo.js:** A utility library.
- **External Data Sources:** Utilizes CSV datasets (e.g., "View of SignalsAI _ CORE _ WIP _ PDP_1757418159244.csv") for comprehensive signal and action plan data.
- **action-plans-fallback.json:** Used as a fallback data source for action plans when Domo endpoints fail.

## Recent Changes
- **Portfolio Hero Cards Integration (September 2025):** Successfully moved the three executive insight cards (Risk Analysis, Growth Opportunities, Portfolio Overview) from the Whitespace dashboard to become compact hero cards at the top of the My Portfolio page, providing immediate strategic value upon landing on the portfolio view.
- **InsightsUtils Shared Library (September 2025):** Created a reusable insights calculation utility that provides consistent metrics across both Portfolio and Whitespace views, eliminating code duplication and ensuring data consistency.
- **Enhanced Action Plans (September 2025):** Implemented comprehensive optimistic updates with immediate UI feedback and resilient local storage fallback for better user experience even when APIs fail.
- **Executive Whitespace Dashboard (September 2025):** Added new analytics tab featuring bubble charts for signal density vs renewal value analysis and heat maps showing account signal activity patterns with polarity-based visualizations.
- **Polarity-Based Visualizations:** Enhanced all visualizations with consistent polarity color coding (Risk=red, Opportunity=green, Enrichment=blue/gray) for better portfolio risk assessment.
- **Modal System Improvements:** Fixed critical issues with modal state management and implemented safe navigation with fallback values for robust multi-modal interactions.