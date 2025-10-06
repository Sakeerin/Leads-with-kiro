# Technology Stack & Development Guidelines

## Architecture

**Pattern**: Microservices architecture with layered design
- API Gateway layer with authentication and rate limiting
- Application services (Lead, Scoring, Routing, Communication, Workflow, Reporting)
- Data layer with primary database, cache, search, and file storage
- External integrations for email, calendar, CRM, and forms

## Tech Stack

### Frontend
- **Framework**: React.js with TypeScript
- **UI Library**: Material-UI for components
- **State Management**: React Query
- **Testing**: Jest for unit tests, Playwright for E2E

### Backend
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript for type safety
- **API Documentation**: OpenAPI 3.0 with Swagger UI

### Database & Storage
- **Primary Database**: PostgreSQL with normalized schema
- **Caching**: Redis for session management and frequently accessed data
- **Search**: Elasticsearch for full-text search and analytics
- **File Storage**: AWS S3 or compatible object storage
- **Message Queue**: Redis Pub/Sub for real-time notifications, Bull Queue for background jobs

### Security & Authentication
- **Authentication**: JWT tokens with refresh token rotation
- **Encryption**: AES-256 for data at rest, TLS 1.3 for data in transit
- **Access Control**: Role-based access control (RBAC)

## Common Commands

### Development Setup
```bash
# Install dependencies
npm install

# Start development environment with Docker
docker-compose up -d

# Run database migrations
npm run migrate

# Start backend development server
npm run dev:backend

# Start frontend development server
npm run dev:frontend
```

### Testing
```bash
# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run integration tests
npm run test:integration

# Run E2E tests
npm run test:e2e

# Generate test coverage report
npm run test:coverage
```

### Database Operations
```bash
# Create new migration
npm run migrate:make migration_name

# Run migrations
npm run migrate:latest

# Rollback last migration
npm run migrate:rollback

# Seed database with test data
npm run seed:run
```

### Build & Deployment
```bash
# Build for production
npm run build

# Start production server
npm start

# Run linting
npm run lint

# Format code
npm run format
```

## Code Quality Standards

- **Coverage Requirement**: 90%+ code coverage for unit tests
- **Linting**: ESLint with TypeScript rules
- **Formatting**: Prettier for consistent code style
- **Type Safety**: Strict TypeScript configuration
- **Error Handling**: Comprehensive error classification and graceful degradation