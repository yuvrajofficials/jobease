import os
from dotenv import load_dotenv
from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache

load_dotenv()

class Settings(BaseSettings):
    # API Keys
    GROQ_API_KEY: str = ""
    
    # JWT Settings
    SECRET_KEY: str = "your-secret-key-here"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # z/OS Connection Settings
    ZOS_HOST: str = ""
    ZOS_PORT: str = ""
    ZOS_USERNAME: str = ""
    ZOS_PASSWORD: str = ""
    
    # z/OSMF Settings
    ZOSMF_BASE_URL: str = "https://zosmf.example.com"
    ZOSMF_USER: str = ""
    ZOSMF_PASS: str = ""
    
    # AI Settings
    GROQ_URL: str = "https://api.groq.com/openai/v1/chat/completions"
    AI_API_KEY: str = ""

    model_config = SettingsConfigDict(env_file=".env")

@lru_cache()
def get_settings():
    return Settings()

settings = get_settings()
