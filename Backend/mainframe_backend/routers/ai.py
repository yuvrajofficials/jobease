from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/agent", tags=["AI Assistant"])

class Prompt(BaseModel):
    question: str

@router.post("/assist")
def assist(prompt: Prompt):
    # Integrate with Groq or Gemini API here
    return {"response": f"Generated code for: {prompt.question}"}
