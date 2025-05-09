import os

# Project directories
dirs = [
    "mainframe_backend",
    "mainframe_backend/routers",
    "mainframe_backend/services",
    "mainframe_backend/models",
    "mainframe_backend/utils",
    "mainframe_backend/config",
    "mainframe_backend/tests"
]

# Core files with boilerplate content
files = {
    "mainframe_backend/__init__.py": "",
    "mainframe_backend/main.py": '''
from fastapi import FastAPI
from routers import auth, datasets, jobs, ai
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Mainframe Assistant API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(datasets.router)
app.include_router(jobs.router)
app.include_router(ai.router)

@app.get("/")
def root():
    return {"message": "Mainframe Backend is Running"}
''',

    "mainframe_backend/routers/auth.py": '''
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel

router = APIRouter(prefix="/auth", tags=["Auth"])

class LoginRequest(BaseModel):
    username: str
    password: str

@router.post("/login")
def login(data: LoginRequest):
    # Placeholder for z/OSMF login integration
    return {"token": "mock_token", "username": data.username}
''',

    "mainframe_backend/routers/datasets.py": '''
from fastapi import APIRouter

router = APIRouter(prefix="/datasets", tags=["Datasets"])

@router.get("/")
def list_datasets():
    # Call z/OSMF REST API to list datasets
    return {"datasets": ["USER1.COBOL", "USER1.REXX"]}

@router.get("/{dataset_name}")
def get_dataset(dataset_name: str):
    return {"dataset": dataset_name, "members": ["HELLO.JCL", "PRINT.CBL"]}
''',

    "mainframe_backend/routers/jobs.py": '''
from fastapi import APIRouter

router = APIRouter(prefix="/jobs", tags=["Jobs"])

@router.post("/submit")
def submit_job():
    # Submit job via z/OSMF
    return {"job_id": "JOB12345", "status": "SUBMITTED"}

@router.get("/{job_id}")
def get_job_output(job_id: str):
    return {"job_id": job_id, "output": "SYSOUT content..."}
''',

    "mainframe_backend/routers/ai.py": '''
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/agent", tags=["AI Assistant"])

class Prompt(BaseModel):
    question: str

@router.post("/assist")
def assist(prompt: Prompt):
    # Integrate with Groq or Gemini API here
    return {"response": f"Generated code for: {prompt.question}"}
''',

    "mainframe_backend/config/settings.py": '''
import os
from dotenv import load_dotenv

load_dotenv()

ZOSMF_BASE_URL = os.getenv("ZOSMF_BASE_URL", "https://zosmf.example.com")
ZOSMF_USER = os.getenv("ZOSMF_USER")
ZOSMF_PASS = os.getenv("ZOSMF_PASS")
AI_API_KEY = os.getenv("AI_API_KEY")
''',

    ".env": '''
ZOSMF_BASE_URL=https://zosmf.example.com
ZOSMF_USER=youruser
ZOSMF_PASS=yourpass
AI_API_KEY=your_ai_key
''',

    "requirements.txt": '''
fastapi
uvicorn[standard]
python-dotenv
httpx
pydantic
''',
}

# Create directories
for d in dirs:
    os.makedirs(d, exist_ok=True)

# Create files with content
for path, content in files.items():
    with open(path, "w") as f:
        f.write(content.strip() + "\n")

print("✅ FastAPI backend project scaffold created successfully!")
