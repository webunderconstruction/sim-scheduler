# AI Assistant Instructions

This is a full-stack web application with a React frontend and Node.js backend. The project is structured to support modern development practices with TypeScript integration.

## Project Overview

This project consists of two main components:

1. Frontend (React + TypeScript + Vite):
   - Located in `/frontend`
   - Development server runs on port 5173
   - Built with modern React practices and TypeScript

2. Backend (Node.js + Express + TypeScript):
   - Located in `/backend`
   - API server runs on port 3000
   - RESTful API endpoints with TypeScript type safety

- Major components and their responsibilities
- Service boundaries and communication patterns
- Data flows and integration points
- Key architectural decisions and their rationales

## Development Workflow

### Local Development Setup

1. Install dependencies for all projects:
   ```bash
   npm run install-all
   ```

2. Start the development environment:
   ```bash
   npm run dev
   ```
   This will concurrently run:
   - Frontend at http://localhost:5173
   - Backend API at http://localhost:3000

### Individual Service Commands

Frontend (in `/frontend` directory):
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

Backend (in `/backend` directory):
- `npm run dev` - Start development server with hot-reload
- `npm run build` - Compile TypeScript to JavaScript
- `npm start` - Run production server

## Project Conventions

As patterns emerge in the codebase, this section will capture:

- Code organization and structure
- Naming conventions
- Error handling patterns
- Testing approaches
- Documentation standards

## Key Integration Points

This section will track:

- External dependencies
- Third-party service integrations
- Inter-service communication patterns
- Configuration management

## Reference Examples

This section will link to examples of:

- Component implementations
- Test patterns
- Configuration files
- Common workflows

---
Note: This is an initial template. As the project grows, these sections should be updated with specific, actionable guidance based on actual patterns and practices that emerge in the codebase.