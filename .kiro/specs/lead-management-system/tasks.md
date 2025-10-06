# Implementation Plan

- [x] 1. Set up project structure and development environment
  - Initialize Node.js backend project with TypeScript configuration
  - Set up React frontend project with TypeScript and Material-UI
  - Configure ESLint, Prettier, and Jest for code quality
  - Create Docker configuration for development environment
  - Set up PostgreSQL and Redis containers
  - _Requirements: 10.3, 10.4_

- [x] 2. Implement core data models and database schema
  - Create PostgreSQL database schema with tables for leads, tasks, activities, users, and configuration
  - Implement database migration system using Knex.js or similar
  - Create TypeScript interfaces for all core entities (Lead, Task, Activity, User, AssignmentRule)
  - Set up database connection pooling and configuration
  - _Requirements: 1.1, 2.1, 6.1, 9.1_

- [x] 3. Build authentication and authorization system
  - Implement JWT-based authentication service with refresh token support
  - Create user registration and login endpoints
  - Implement role-based access control (RBAC) middleware
  - Create user management interfaces for Admin, Manager, Sales, Marketing roles
  - Add password hashing and security validation
  - _Requirements: 10.1, 10.2_

- [x] 4. Develop Lead Service core functionality
  - Create Lead model with validation rules for required fields
  - Implement CRUD operations for leads (create, read, update, delete, soft delete)
  - Add auto-generation logic for Account Lead ID in AL-YY-MM-XXX format
  - Implement lead search functionality with filters and pagination
  - Create audit logging for all lead operations
  - _Requirements: 1.1, 1.2, 2.1, 2.2, 2.3_

- [x] 5. Implement duplicate detection and data quality features

  - Create duplicate detection algorithm using email, phone, and company matching
  - Implement fuzzy matching logic for company names and contact information
  - Build lead merge functionality with field-level provenance tracking
  - Add data validation rules for email format, phone format, and required fields
  - Create blacklist/opt-out management system
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [ ] 6. Build lead scoring system
  - Create configurable scoring model with criteria for profile fit, behavior, and recency
  - Implement score calculation engine that processes industry, company size, B2B/B2C classification
  - Add behavioral scoring for email opens, replies, website visits, and form completions
  - Create score band management with automatic action triggers
  - Implement batch score recalculation functionality
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [ ] 7. Develop assignment and routing engine
  - Create assignment rules engine with support for round-robin, territory, expertise, and priority-based routing
  - Implement workload balancing across sales representatives
  - Add time-window routing based on working hours and availability
  - Create manual reassignment functionality with reason logging
  - Implement SLA timer system with escalation to managers
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ] 8. Build task management and activity tracking system
  - Create task model with due dates, assignees, priorities, and reminders
  - Implement activity logging for all lead interactions (create, update, email, call, status change)
  - Build chronological timeline view for lead activities
  - Add @mention functionality in comments with user notifications
  - Create task completion tracking and reminder system
  - _Requirements: 6.1, 6.2, 6.5_

- [ ] 9. Implement communication and email integration
  - Create email template system with variable substitution
  - Implement email sending functionality using SMTP or email service API
  - Build inbound email processing to associate replies with correct leads
  - Add email logging and communication history tracking
  - Create calendar integration for follow-up scheduling
  - _Requirements: 7.1, 7.4, 7.2_

- [ ] 10. Develop workflow automation system
  - Create workflow engine that can execute predefined automation sequences
  - Implement trigger system for lead created, assigned, score changed, and status updated events
  - Build automated email sequences and follow-up task creation
  - Add manager approval workflows for lead assignments
  - Create notification system for sales representatives and managers
  - _Requirements: 6.3, 6.4_

- [ ] 11. Build lead conversion and handover functionality
  - Implement lead to opportunity conversion with data transfer
  - Create account and contact creation during conversion process
  - Add duplicate account prevention during conversion
  - Implement Won/Lost/Disqualified closure with reason taxonomy
  - Create audit trail linking leads to converted opportunities
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [ ] 12. Create frontend lead management interface
  - Build responsive lead creation form with all required fields (Company, Contact, Source, Assignment, etc.)
  - Implement lead list view with filtering, sorting, and pagination
  - Create Kanban board view for lead status management with drag-and-drop
  - Build detailed lead view with activity timeline and communication history
  - Add bulk operations for lead assignment, status changes, and labeling
  - _Requirements: 1.1, 2.4, 2.5, 8.1, 8.2_

- [ ] 13. Implement search and filtering capabilities
  - Integrate Elasticsearch for full-text search across leads, notes, and attachments
  - Create advanced search interface with multiple filter criteria
  - Implement saved search functionality for frequently used filters
  - Add real-time search suggestions and autocomplete
  - Create shareable search URLs for team collaboration
  - _Requirements: 8.1, 8.2_

- [ ] 14. Build reporting and analytics dashboard
  - Create funnel metrics dashboard showing conversion rates at each stage
  - Implement time-to-first-touch and SLA compliance reporting
  - Build source effectiveness reports with cost-per-lead and conversion rates
  - Create sales representative performance dashboards
  - Add data quality reports showing duplicates and missing field statistics
  - _Requirements: 8.3, 8.4, 8.5_

- [ ] 15. Implement file upload and attachment management
  - Create secure file upload system with virus scanning
  - Implement file storage using cloud storage (AWS S3 or compatible)
  - Add file association with lead records and activity logging
  - Create file download and preview functionality
  - Implement file access control based on user permissions
  - _Requirements: 1.6, 10.5_

- [ ] 16. Add import/export functionality
  - Create CSV/XLSX import system with data validation and error reporting
  - Implement duplicate detection during import process
  - Build export functionality for leads, reports, and analytics data
  - Add scheduled report email functionality
  - Create import history and rollback capabilities
  - _Requirements: 1.3, 8.4_

- [ ] 17. Implement system configuration and customization
  - Create custom field management system for leads
  - Build picklist management for Status, Source, Product Type, and AdType
  - Implement configurable status workflows with Thai/English labels
  - Add working hours and holiday calendar configuration
  - Create email template management interface
  - _Requirements: 10.3, 10.4, 10.5_

- [ ] 18. Build user interface for mobile responsiveness
  - Optimize all frontend components for mobile and tablet devices
  - Implement touch-friendly interactions for Kanban boards and forms
  - Create responsive navigation and menu systems
  - Add mobile-specific features like click-to-call and email
  - Test and optimize performance on mobile devices
  - _Requirements: 10.5_

- [ ] 19. Implement security features and compliance
  - Add input validation and sanitization for all user inputs
  - Implement rate limiting for API endpoints
  - Create audit logging for all security-relevant actions
  - Add GDPR compliance features (data export, deletion, consent tracking)
  - Implement multi-factor authentication support
  - _Requirements: 10.1, 10.2, 10.5_

- [ ] 20. Create comprehensive test suite
  - Write unit tests for all service classes and business logic
  - Create integration tests for API endpoints and database operations
  - Implement end-to-end tests for critical user workflows
  - Add performance tests for lead creation, search, and reporting
  - Create security tests for authentication and authorization
  - _Requirements: All requirements validation_

- [ ] 21. Set up monitoring and deployment infrastructure
  - Configure application performance monitoring and alerting
  - Set up centralized logging with structured log format
  - Create health check endpoints for all services
  - Implement automated deployment pipeline with staging and production environments
  - Add database backup and recovery procedures
  - _Requirements: System reliability and maintenance_

- [ ] 22. Integrate external services and APIs
  - Implement email service integration (Microsoft 365/Gmail)
  - Add calendar API integration for follow-up scheduling
  - Create webhook endpoints for external form submissions
  - Implement CRM/ERP integration capabilities via REST APIs
  - Add support for Meta Lead Ads and Google Forms integration
  - _Requirements: 7.2, 7.3, Integration requirements_
