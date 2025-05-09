from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel
import subprocess
import json
from ..auth.jwt import create_access_token, verify_token
from typing import Optional

router = APIRouter(prefix="/auth", tags=["Authentication"])

class UserLogin(BaseModel):
    username: str
    password: str

class UserRegister(BaseModel):
    username: str
    password: str
    email: Optional[str] = None

# This is a temporary user store - in production, use a proper database
users_db = {}

class LoginRequest(BaseModel):
    username: str
    password: str
    host: str
    port: str

def run_zowe_command(command: list) -> dict:
    try:
        result = subprocess.run(
            command,
            capture_output=True,
            text=True,
            check=True
        )
        return json.loads(result.stdout)
    except subprocess.CalledProcessError as e:
        print("Zowe CLI error:", e.stderr)
        print("Zowe CLI stdout:", e.stdout)
        raise HTTPException(status_code=401, detail=f"Zowe CLI error: {e.stderr}")
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Invalid response from Zowe CLI")

@router.post("/login")
async def login(data: LoginRequest):
    try:
        # Test connection by getting system info
        system_info = run_zowe_command([
            "zowe", "zosmf", "check", "status",
            "--host", data.host,
            "--port", str(data.port),
            "--user", data.username,
            "--password", data.password,
            "--reject-unauthorized", "false",
            "--rfj"
        ])
        
        # If connection successful, create a token
        access_token = create_access_token(data={
            "sub": data.username,
            "host": data.host,
            "port": data.port
        })
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "username": data.username,
                "host": data.host,
                "port": data.port
            },
            "system_info": system_info
        }
    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))

@router.post("/register")
async def register(user_data: UserRegister):
    if user_data.username in users_db:
        raise HTTPException(status_code=400, detail="Username already registered")
    
    # In production, hash the password before storing
    users_db[user_data.username] = {
        "password": user_data.password,
        "email": user_data.email
    }
    
    return {"message": "User registered successfully"}

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

@router.get("/me")
async def get_current_user(token: str = Depends(oauth2_scheme)):
    try:
        payload = verify_token(token)
        return {
            "username": payload.get("sub"),
            "host": payload.get("host"),
            "port": payload.get("port")
        }
    except Exception as e:
        raise HTTPException(status_code=401, detail="Invalid credentials")

@router.get("/test-connection")
async def test_connection(token: str):
    try:
        # Test connection using the profile
        system_info = run_zowe_command([
            "zowe", "zosmf", "check", "status",
            "--rfj",
            "--zosmf-p", token
        ])
        return {"status": "connected", "message": "Successfully connected to z/OS", "system_info": system_info}
    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))
