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
- **Updated master data source to new PDP dataset**: "View of SignalsAI _ CORE _ WIP _ PDP_1757418159244.csv" containing 295 comprehensive signal records with expanded field set
- **Enhanced signals data model**: Added new fields including signal_id, call_id, call_date, and extended play metadata (play types, roles, documentation locations)
- **Improved CSV parsing**: Updated DataService.js to handle all new columns from the PDP dataset including AI context fields and enhanced play information
- Implemented priority-based signal sorting (High > Medium > Low, then by call_date DESC for chronological accuracy)
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
- **Removed "Add to Plan" modal system**: Completely cleaned up the previous modal implementation to prepare for fresh redesign - removed all HTML, CSS, JavaScript functions, and event handlers related to the centered modal approach
- **Redesigned Action Plans interface**: Transformed from card-based to modern project management table layout inspired by Asana/Monday.com with columns for checkbox, task, due date, # plays, priority, and assignee
- **Implemented account grouping**: Action plans organized by customer account with collapsible sections and task counts
- **Added JSON fallback system**: Action Plans now load real data from `action-plans-fallback.json` when Domo endpoints fail, preserving actual account names, tasks, and Customer Success plays
- **Enhanced data processing**: Real action plan data is transformed and grouped by account, with proper assignee mapping and CS plays count extraction
- **Implemented action-level plan creation drawer**: Added "Add to Plan" buttons to individual AI recommendations with sliding drawer modal
- **Created comprehensive drawer workflow**: Features blue box display of recommended action, "Toolbox of Plays" with 0-3 play checkboxes based on action_id, and "Plan Details" text area for user notes
- **Connected drawer to Action Plan CRUD**: Form submission properly creates action plans with selected plays and user comments using existing service methods
- **Enhanced UI/UX**: Professional right-sliding drawer with backdrop, responsive design, and proper styling matching application theme
- **Fixed Action Plans plays count display**: Corrected plays count calculation to properly read from action plan plays arrays, ensuring accurate display of CS plays for each action item
- **Implemented plays management drawer modal**: Created full plays drawer interface that opens when clicking the plays button in Action Plans view, showing all associated CS plays with completion tracking
- **Added play completion functionality**: Users can now mark individual CS plays as "complete" or "pending" with visual feedback including checkboxes, status badges, and strike-through text for completed plays
- **Enhanced play status persistence**: Play completion status is saved to action plan data and persists across sessions, with real-time updates to the Action Plans view
- **Added success/error notifications**: Implemented toast-style notifications for play update operations with proper styling and auto-dismiss functionality
- **Implemented comprehensive task details modal**: Fixed task modal content to show actual action names instead of "No Title", renamed "Associated CS Plays" to "Sub Tasks", and resolved data structure issues for proper display
- **Connected task details Save Changes to CRUD methods**: Task property updates (due date, priority, assignee, status) now use ActionPlanService.updateActionPlan() for proper data persistence, with complete error handling and UI refresh functionality
- **Replaced "# Plays" column with "Task Status"**: Action Plans table now displays task status badges instead of plays count, sourcing data from live action plan objects using CRUD methods
- **Implemented task sorting by priority and due date**: Tasks within each account are now sorted by Priority (High > Medium > Low) then Due Date (ascending), providing logical task organization
- **Added comprehensive status badge styling**: Professional color-coded status badges for Pending, In Progress, Complete, Cancelled, and On Hold states
- **Fixed critical action plan data integrity issue**: Resolved missing account associations that prevented proper account grouping by creating Python script to map 8,544 signal-to-account relationships from CSV data, fixing 10 of 16 broken action plans
- **Enhanced ActionPlanService with 4-method account resolution system**: Added robust account ID resolution using selectedSignal lookup, signal-to-account mapping, drawer title parsing, and account name matching for graceful fallbacks
- **Implemented comprehensive data validation system**: Added automatic validation during action plan creation and loading with auto-fix capabilities, pre-save validation, and clear error messaging to prevent future association issues
- **Added professional task deletion with multi-select functionality**: Implemented Ctrl/Cmd + click multi-selection, right-click context menu for single and bulk deletion, professional confirmation modal with task count display, and full integration with ActionPlanService CRUD operations
- **Resolved production deployment errors**: Fixed fallback JSON loading, assignee type validation, and portfolio error messaging for clean deployment to Domo production environment
- **Fixed multiple action plans display issue**: Corrected storage logic that was overwriting plans with same account ID - now uses unique plan IDs as storage keys, allowing multiple tasks per account to display correctly
- **Fixed user ID resolution consistency**: Resolved issue where Action Plans table showed raw user IDs (621623466) while task details drawer showed proper names - implemented comprehensive user ID mapping system that converts numeric IDs to proper names (e.g., 621623466 → "Ed Engalan") with consistent initials generation ("EE") across both Action Plans table and task details drawer
- **Simplified data source consistency**: Streamlined task details drawer to use same data source (`getFormattedActionPlans()`) as Action Plans table, eliminating complex dual-lookup system and ensuring perfect data consistency between grid and drawer views
- **Fixed task details drawer opening issue**: Resolved "Could not find task data" error by correcting the data structure mismatch between grid display and drawer lookup - drawer now properly accesses plan data structure from formatted action plans
- **Fixed CS Plays display issue**: Resolved problem where CS Plays section showed "Play 1" instead of actual play names - updated rendering logic to handle plays stored as strings (most common format) rather than objects, now correctly displays full play names like "Advanced Roadmaps - Drive growth with detailed, strategic roadmaps aligned to your unique business goals."
- **Fixed auto-save functionality in task details drawer**: Resolved issue where changing task properties (status, priority, due date, assignee) wasn't persisting to app database - fixed local state synchronization between DataService.actionPlans array and app.actionPlans Map, enhanced data structure compatibility for proper field updates, and added comprehensive debugging for save operations
- **Fixed signal feedback button visual states**: Resolved issue where "Like" and "Not Accurate" buttons weren't showing visual feedback after being clicked - buttons now immediately update to show "Liked!" or "Not Accurate" state with proper icons and styling by re-rendering the current tab after feedback is successfully saved
- Configured deployment settings for autoscale target

## Deployment
Configured for autoscale deployment using the Python server to serve static files.