from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routers import auth, datasets, jobs, ai_router, groq_router

app = FastAPI(title="Mainframe Platform API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router)  # No prefix needed as it's defined in the router
app.include_router(datasets.router)  # Prefix is defined in the router
app.include_router(jobs.router)  # Prefix is defined in the router
app.include_router(ai_router.router)  # Prefix is defined in the router
app.include_router(groq_router.router)  # Prefix is defined in the router

@app.get("/")
async def root():
    return {"message": "Welcome to Mainframe Platform API"}
