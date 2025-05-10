from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Dict, Any
from ..services.groq_service import GroqService
from ..auth import get_current_user

router = APIRouter(prefix="/groq", tags=["Groq AI"])
groq_service = GroqService()

class PromptRequest(BaseModel):
    prompt: str

class AnalysisResponse(BaseModel):
    analysis: str
    recommendations: List[str]

@router.post("/generate")
async def generate_code(
    prompt: str,
    current_user: str = Depends(get_current_user)
) -> Dict[str, Any]:
    try:
        response = await groq_service.generate_code(prompt)
        # Return the content directly in the format expected by the frontend
        return {
            "content": response.get("response", ""),
            "response": response.get("response", ""),
            "explanation": response.get("explanation", "")
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/analyze")
async def analyze_structure(current_user: dict = Depends(get_current_user)):
    try:
        result = await groq_service.analyze_zos_structure()
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/analyze")
async def analyze_system(
    system_info: str,
    current_user: str = Depends(get_current_user)
) -> Dict[str, Any]:
    try:
        response = await groq_service.analyze_system(system_info)
        return {"response": response}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 