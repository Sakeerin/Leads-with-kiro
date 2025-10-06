# Lead Management System

A comprehensive platform designed to centralize, qualify, score, assign, and route leads from multiple channels to sales teams.

## Features

- **Multi-channel Lead Capture**: Web forms, email, chat, phone, events, referrals, vendor lists, ads
- **Automated Lead Scoring**: Profile fit, behavior, and recency-based scoring with configurable criteria
- **Intelligent Routing**: Territory, expertise, workload, and priority-based assignment rules
- **Complete Lead Lifecycle**: From initial capture through conversion to opportunities
- **Bilingual Support**: Thai and English interfaces
- **Communication Integration**: Email templates, calendar sync, WhatsApp/LINE/SMS support
- **Analytics & Reporting**: Funnel metrics, SLA compliance, source effectiveness, performance dashboards

## Tech Stack

### Frontend
- React.js with TypeScript
- Material-UI for components
- React Query for state management
- Vite for build tooling

### Backend
- Node.js with Express.js
- TypeScript for type safety
- PostgreSQL for primary database
- Redis for caching and session management
- JWT authentication

## Development Setup

### Prerequisites
- Node.js 18+
- Docker and Docker Compose
- Git

### Quick Start

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd lead-management-system
   ```

2. **Start development environment**
   ```bash
   # Start PostgreSQL and Redis containers
   docker-compose up -d postgres redis
   
   # Install backend dependencies
   cd backend
   npm install
   cp .env.example .env
   
   # Install frontend dependencies
   cd ../frontend
   npm install
   cp .env.example .env
   ```

3. **Run database migrations**
   ```bash
   cd backend
   npm run migrate:latest
   ```

4. **Start development servers**
   ```bash
   # Terminal 1: Backend
   cd backend
   npm run dev
   
   # Terminal 2: Frontend
   cd frontend
   npm run dev
   ```

5. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001
   - API Health Check: http://localhost:3001/health

### Using Docker for Full Development

```bash
# Start all services including backend and frontend
docker-compose up

# Or run in background
docker-compose up -d
```

## Available Scripts

### Backend
- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm test` - Run tests
- `npm run lint` - Run ESLint
- `npm run migrate:latest` - Run database migrations

### Frontend
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm test` - Run tests with Vitest
- `npm run lint` - Run ESLint

## Project Structure

```
lead-management-system/
├── backend/                 # Node.js/Express backend
│   ├── src/
│   │   ├── services/       # Business logic services
│   │   ├── controllers/    # API route handlers
│   │   ├── models/         # Database models
│   │   ├── middleware/     # Express middleware
│   │   └── config/         # Configuration files
│   ├── migrations/         # Database migrations
│   └── tests/              # Backend tests
├── frontend/               # React.js frontend
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── pages/          # Page components
│   │   ├── services/       # API services
│   │   └── types/          # TypeScript types
│   └── public/             # Static assets
├── shared/                 # Shared types and utilities
└── docker/                 # Docker configuration
```

## Environment Variables

Copy `.env.example` files in both `backend/` and `frontend/` directories and update with your configuration.

### Backend Environment Variables
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `JWT_SECRET` - JWT signing secret
- `SMTP_*` - Email configuration

### Frontend Environment Variables
- `VITE_API_URL` - Backend API URL

## Testing

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test

# E2E tests
cd frontend
npm run test:e2e
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## License

MIT License