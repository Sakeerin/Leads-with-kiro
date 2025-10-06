@echo off
REM Lead Management System - Development Setup Script for Windows

echo 🚀 Setting up Lead Management System development environment...

REM Check if Docker is installed
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker is not installed. Please install Docker first.
    exit /b 1
)

REM Check if Docker Compose is installed
docker-compose --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker Compose is not installed. Please install Docker Compose first.
    exit /b 1
)

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js 18+ first.
    exit /b 1
)

echo ✅ Prerequisites check passed

REM Start PostgreSQL and Redis containers
echo 🐳 Starting PostgreSQL and Redis containers...
docker-compose up -d postgres redis

REM Wait for databases to be ready
echo ⏳ Waiting for databases to be ready...
timeout /t 10 /nobreak >nul

REM Install backend dependencies
echo 📦 Installing backend dependencies...
cd backend
if not exist ".env" (
    copy .env.example .env
    echo 📝 Created backend .env file from example
)
call npm install

REM Install frontend dependencies
echo 📦 Installing frontend dependencies...
cd ..\frontend
if not exist ".env" (
    copy .env.example .env
    echo 📝 Created frontend .env file from example
)
call npm install

REM Go back to root
cd ..

REM Run database migrations
echo 🗄️  Running database migrations...
cd backend
call npm run migrate:latest

echo ✅ Development environment setup complete!
echo.
echo 🎯 Next steps:
echo 1. Start the backend: cd backend ^&^& npm run dev
echo 2. Start the frontend: cd frontend ^&^& npm run dev
echo 3. Or start both: npm run dev
echo.
echo 🌐 Access points:
echo - Frontend: http://localhost:3000
echo - Backend API: http://localhost:3001
echo - Health Check: http://localhost:3001/health