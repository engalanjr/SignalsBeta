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
- Set up Python HTTP server for static file serving
- Configured proper headers for Replit environment
- Verified application functionality with sample data
- Configured deployment settings for autoscale target

## Deployment
Configured for autoscale deployment using the Python server to serve static files.