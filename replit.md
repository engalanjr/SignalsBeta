# SignalsAI v8.0 - Customer Success Management

## Overview
SignalsAI is a customer success management application that helps track and manage customer signals, relationships, and action plans. This is a frontend-only web application built with vanilla HTML, CSS, and JavaScript.

## Project Structure
- `index.html` - Main application entry point
- `app.css` - Application styles with Domo brand colors
- `js/` - JavaScript modules and services
  - `SignalsAI.js` - Main application class
  - `DataService.js` - Data loading and management
  - `services/` - Various service modules for different features
- `server.py` - Python HTTP server for serving static files
- `manifest.json` - Web app manifest for PWA functionality

## Technology Stack
- Frontend: Vanilla HTML5, CSS3, JavaScript (ES6+)
- Server: Python 3.11 HTTP server
- External Dependencies: Font Awesome, Domo.js utility library

## Development Setup
The application runs on port 5000 using a Python HTTP server that:
- Serves static files with proper cache headers
- Includes CORS support for cross-origin requests
- Binds to 0.0.0.0 for Replit environment compatibility

## Key Features
- Signal Feed management with filtering and categorization
- Portfolio overview with account summaries
- Action Plans tracking and management
- Customer relationship insights
- Interactive comments and feedback system

## Configuration
- Frontend serves on port 5000 (required for Replit)
- Server configured with no-cache headers to prevent caching issues
- Application gracefully falls back to sample data when Domo APIs are unavailable

## Recent Changes
- Updated master data source to use comprehensive CSV file: "SignalsAI _ CORE _ WIP 4_1757016310504.csv" containing all 9,568 signal records
- Implemented priority-based signal sorting (High > Medium > Low, then by call_date DESC)
- Added pagination system for portfolio view showing 3 signals at a time with "+X more" functionality
- Fixed Map.get() error and renderCurrentTab() function reference issues
- Fixed scroll jump issue: "+X more" pagination now expands in place without page movement
- Updated financial metrics box: replaced "ARR" with "Renewal Baseline$", consolidated GPA and % Pacing into blue box, changed to "Next Renewal Date"
- Removed second row of metrics (MAU, TENURE) for cleaner, consolidated layout
- Fixed field mapping for bks_renewal_baseline_usd and % Pacing to display real data from CSV
- Updated % Pacing to multiply by 100 and show one decimal place (e.g., 85.0%)
- Changed "Financial Overview" label to "Account Overview"
- Simplified signal detail experience: removed Recommended Actions, Event Source, Comments sections and Acknowledge/Create Plan buttons
- Like and Not Accurate buttons now properly connected to existing interaction CRUD methods
- Added toggle functionality: clicking "Liked!" or "Marked Inaccurate" will remove that feedback and return to default state
- Updated pagination system: replaced "+X more" with "Show 3 more" and "Show Less" buttons positioned at bottom of signals section
- Made AI Recommendations priority badge data-driven: shows "IMMEDIATE" for accounts with high priority signals, "NEAR-TERM" for others
- Added dates to AI Recommendations: each recommended action now displays its creation date from the CSV data using the created_date field
- **Implemented "Add to Plan" functionality**: Each AI recommended action now has an "Add to Plan" button that opens a modal with action title, pre-checked Customer Success plays, plan notes area, and "Create Plan" button
- **Fixed Customer Success Plays display**: Resolved CSV field mapping issues (play_1_name, play_2_name, play_3_name) to properly show actual play data from CSV
- **Converted to centered modal**: Changed from side drawer to modern centered modal with fade+scale animation and improved user experience
- **Enhanced modal layout**: Increased width to 600px, fixed Customer Success Plays to use proper Play Name fields, enabled text wrapping for better readability, and centered checkboxes properly
- Added smart button state management: actions already in existing plans show "Added!" pill button (non-clickable)
- Created comprehensive action plan integration with proper data-driven checks and plan creation workflow
- **Redesigned Action Plans interface**: Transformed from card-based to modern project management table layout inspired by Asana/Monday.com with columns for checkbox, task, due date, # plays, priority, and assignee
- **Implemented account grouping**: Action plans organized by customer account with collapsible sections and task counts
- **Added JSON fallback system**: Action Plans now load real data from `action-plans-fallback.json` when Domo endpoints fail, preserving actual account names, tasks, and Customer Success plays
- **Enhanced data processing**: Real action plan data is transformed and grouped by account, with proper assignee mapping and CS plays count extraction
- Configured deployment settings for autoscale target

## Deployment
Configured for autoscale deployment using the Python server to serve static files.