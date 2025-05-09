# JOBEASE

**jobease** is a platform designed to automate mainframe job submissions using Zowe Explorer, leveraging agents and automation workflows through a unified web interface.

## Table of Contents
1. [Project Overview](#project-overview)  
2. [Features](#features)  
3. [Architecture](#architecture)  
4. [Prerequisites](#prerequisites)  
5. [Configuration](#configuration)  
6. [Backend Setup (FastAPI)](#backend-setup-fastapi)  
7. [Frontend Setup (React)](#frontend-setup-react)  
8. [Running the Application](#running-the-application)  
9. [Automated Tests](#automated-tests)  
10. [Folder Structure](#folder-structure)  
11. [Contributing](#contributing)  
12. [License](#license)  

---

# Project Structure

jobease/
├── Backend/mainframe_backend/   Backend API (FastAPI)
│   ├── routers/                 API endpoints (auth, datasets, jobs, AI)
│   ├── services/                Zowe & AI service logic
│   ├── models/                  Pydantic models
│   ├── utils/                   Helper functions
│   ├── config/                  Environment & settings
│   └── tests/                   Automated tests
├── Frontend/                    React app (Vite)
│   ├── src/
│   │   ├── components/          React components
│   │   ├── context/             React context for state
│   │   └── App.jsx              Entry point
│   └── public/                  Static assets
├── LICENSE                      Project license
└── README.md                    This file


## Project Overview

jobease streamlines the submission and management of z/OS jobs via Zowe Explorer. It provides:

- **Job Submission**: Send JCL decks to mainframe systems  
- **Dataset Management**: Browse, upload, and manage datasets  
- **AI Agent Integration**: Use AI prompts to generate or validate JCL  
- **User Authentication**: Secure access with token-based auth  
- **Web UI**: Single-page React app for seamless interaction  

## Features

- Submit, monitor, and retrieve job output  
- List and manage datasets on z/OS  
- Token-based authentication (OAuth2)  
- AI-assisted JCL generation (via Groq or in-house AI service)  
- CORS-enabled FastAPI backend  
- Modular architecture for easy extension  

## Architecture


- **Frontend**: React + Vite, communicates with backend via REST.  
- **Backend**: FastAPI, routers for auth, datasets, jobs, AI.  
- **AI Services**: `ai_service.py`, `groq_service.py` for AI-powered tasks.  
- **Mainframe Integration**: Uses Zowe CLI subprocess calls under the hood.  

## Prerequisites

- **Node.js** (v16+) and **npm** or **yarn**  
- **Python** (3.9+)  
- **Zowe CLI** installed and configured (profiles in `~/.zowe`)  
- Access to a z/OS system  

## Configuration

1. **Backend**: Edit `Backend/mainframe_backend/config/settings.py` to set:  
   - `ZOWE_PROFILE` (zowe CLI profile name)  
   - `ZOWE_HOST`, `ZOWE_USER`, `ZOWE_PASS` (optional overrides)  
   - AI service endpoints and keys if using external provider.  

2. **Frontend**: Create a `.env` file in `Frontend/`:
   ```env
   VITE_API_URL=http://localhost:8000

# Backend Setup (FastAPI)

# 1. Navigate to backend folder
cd Backend/mainframe_backend

# 2. Create Python virtual environment
python -m venv venv
source venv/bin/activate  # Linux/macOS
venv\Scripts\activate     # Windows

# 3. Install dependencies
pip install -r requirements.txt

# 4. Start the API server
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Frontend Setup (React)

# 1. Navigate to frontend folder
cd Frontend

# 2. Install packages
npm install    # or yarn install

# 3. Start development server
npm run dev    # or yarn dev

