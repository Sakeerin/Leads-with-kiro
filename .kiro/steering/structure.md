# Project Structure & Organization

## Root Directory Layout

```
lead-management-system/
├── backend/                 # Node.js/Express backend services
│   ├── src/
│   │   ├── services/       # Core business logic services
│   │   ├── controllers/    # API route handlers
│   │   ├── models/         # Database models and schemas
│   │   ├── middleware/     # Authentication, validation, logging
│   │   ├── utils/          # Helper functions and utilities
│   │   └── config/         # Configuration files
│   ├── migrations/         # Database migration files
│   ├── seeds/              # Database seed data
│   └── tests/              # Backend test files
├── frontend/               # React.js frontend application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Page-level components
│   │   ├── services/       # API client services
│   │   ├── hooks/          # Custom React hooks
│   │   ├── utils/          # Frontend utilities
│   │   └── types/          # TypeScript type definitions
│   └── public/             # Static assets
├── shared/                 # Shared TypeScript types and utilities
├── docker/                 # Docker configuration files
├── docs/                   # Project documentation
└── .kiro/                  # Kiro configuration and specs
```

## Backend Service Organization

### Core Services Structure
- **LeadService**: CRUD operations, validation, duplicate detection
- **ScoringService**: Lead scoring algorithms and calculations
- **RoutingService**: Assignment rules and lead distribution
- **CommunicationService**: Email templates and messaging
- **WorkflowService**: Automation and business processes
- **ReportingService**: Analytics and dashboard data

### Model Hierarchy
- **Lead**: Core entity with contact, company, scoring, assignment data
- **Task**: Follow-up activities and reminders
- **Activity**: Audit trail and interaction history
- **User**: Authentication and role management
- **AssignmentRule**: Routing configuration
- **Template**: Communication templates

## Frontend Component Structure

### Page Components
- **LeadManagement**: Main lead interface with list/kanban views
- **LeadDetail**: Individual lead view with timeline
- **Dashboard**: Analytics and reporting interface
- **Administration**: System configuration and user management

### Shared Components
- **LeadForm**: Create/edit lead form with validation
- **ActivityTimeline**: Chronological activity display
- **KanbanBoard**: Drag-and-drop status management
- **SearchFilters**: Advanced search and filtering
- **ReportBuilder**: Interactive report creation

## Database Schema Organization

### Core Tables
- `leads`: Primary lead data with all contact and company information
- `tasks`: Follow-up activities and reminders
- `activities`: Audit trail for all lead interactions
- `users`: User accounts and authentication
- `assignment_rules`: Lead routing configuration
- `templates`: Email and communication templates

### Supporting Tables
- `companies`: Normalized company data for deduplication
- `lead_scores`: Historical scoring data
- `attachments`: File uploads associated with leads
- `workflows`: Automation rule definitions
- `audit_logs`: System-wide audit trail

## Configuration Management

### Environment-Specific Config
- Development, staging, and production configurations
- Database connection strings and credentials
- External service API keys and endpoints
- Feature flags for gradual rollouts

### Business Configuration
- Lead status workflows and transitions
- Scoring model parameters and weights
- Assignment rule priorities and conditions
- Email templates and communication settings

## File Naming Conventions

- **Components**: PascalCase (e.g., `LeadForm.tsx`, `ActivityTimeline.tsx`)
- **Services**: camelCase with Service suffix (e.g., `leadService.ts`)
- **Models**: PascalCase (e.g., `Lead.ts`, `AssignmentRule.ts`)
- **Utilities**: camelCase (e.g., `dateUtils.ts`, `validationHelpers.ts`)
- **Tests**: Match source file with `.test.ts` or `.spec.ts` suffix
- **Database**: snake_case for tables and columns