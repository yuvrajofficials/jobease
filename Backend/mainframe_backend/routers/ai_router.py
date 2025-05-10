from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from ..auth.jwt import get_current_user
from ..services.groq_service import GroqService
import subprocess
import json
import os
import logging
import re
from ..models.credentials import Credentials

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/ai", tags=["AI"])
groq_service = GroqService()

class AnalysisResponse(BaseModel):
    analysis: str
    recommendations: List[str]

class GenerateRequest(BaseModel):
    prompt: str
    mode: str = "chat"  # Default to chat mode

class GenerateResponse(BaseModel):
    files: List[dict]

class CommandRequest(BaseModel):
    command: str
    credentials: Credentials

def extract_command_from_response(response_text: str) -> str:
    """Extract the actual command from the AI response."""
    try:
        # Try to find JSON in the response
        json_match = re.search(r'```json\n([\s\S]*?)\n```', response_text)
        if json_match:
            json_str = json_match.group(1)
            data = json.loads(json_str)
            if isinstance(data, dict) and "commands" in data and data["commands"]:
                return data["commands"][0]["command"]
        
        # If no JSON found, try to find a command line
        command_match = re.search(r'zowe\s+[\w-]+\s+[\w-]+.*?(?=\n|$)', response_text)
        if command_match:
            return command_match.group(0).strip()
        
        raise ValueError("No valid command found in response")
    except Exception as e:
        logger.error(f"Error extracting command: {str(e)}")
        raise ValueError(f"Failed to extract command: {str(e)}")

@router.get("/analyze", response_model=AnalysisResponse)
async def analyze_system(current_user: dict = Depends(get_current_user)):
    """Analyze the current z/OS system state and provide recommendations."""
    try:
        result = await groq_service.analyze_zos_structure()
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/generate")
async def generate_code(request: GenerateRequest, current_user: dict = Depends(get_current_user)):
    """Generate code or commands based on the user's prompt."""
    try:
        response = await groq_service.generate_code(request.prompt, request.mode)
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/execute")
async def execute_command(request: CommandRequest, current_user: dict = Depends(get_current_user)):
    """Execute a z/OS command using Zowe CLI."""
    try:
        logger.info(f"Received command request: {request.command}")
        
        # Extract the actual command from the response
        try:
            actual_command = extract_command_from_response(request.command)
            logger.info(f"Extracted command: {actual_command}")
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
        
        # Clean and validate the command
        command = actual_command.strip()
        if not command:
            raise HTTPException(status_code=400, detail="Empty command")
        
        # Extract the base command without zowe prefix
        command_parts = command.split()
        if not command_parts or command_parts[0] != "zowe":
            raise HTTPException(status_code=400, detail="Command must start with 'zowe'")
        
        # Build the full Zowe CLI command with credentials
        full_command = [
            "zowe",
            *command_parts[1:],  # Add all parts after 'zowe'
            "--host", request.credentials.host,
            "--port", str(request.credentials.port),
            "--user", request.credentials.username,
            "--password", request.credentials.password,
            "--reject-unauthorized", "false",
            "--rfj"  # Request JSON format
        ]
        
        logger.info(f"Full command: {' '.join(full_command)}")
        
        # Execute the command using subprocess
        process = subprocess.Popen(
            full_command,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        
        stdout, stderr = process.communicate()
        logger.info(f"Command stdout: {stdout[:200]}...")  # Log first 200 chars
        logger.info(f"Command stderr: {stderr}")
        
        if process.returncode != 0:
            error_msg = stderr if stderr else "Command execution failed"
            logger.error(f"Command failed: {error_msg}")
            raise HTTPException(
                status_code=400,
                detail=f"Command execution failed: {error_msg}"
            )
        
        try:
            # Try to parse the output as JSON since we used --rfj
            output = json.loads(stdout)
            return {
                "output": output,
                "error": stderr,
                "return_code": process.returncode
            }
        except json.JSONDecodeError:
            # If not JSON, return as plain text
            return {
                "output": stdout,
                "error": stderr,
                "return_code": process.returncode
            }
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}") 