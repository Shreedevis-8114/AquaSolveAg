from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.app.database.connection import engine, Base
from backend.app.api.routes import (
    analysis,
    recommendations,
    simulation,
    scenarios,
    reports,
    samples,
    health,
    research
)

# Initialize database schemas
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="AquaSolve API",
    description="Interactive Environmental Chemistry-Based Water Quality Analysis and Treatment Recommendation Engine",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json"
)

# Configure CORS for Vite frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routes
app.include_router(health.router, prefix="/api")
app.include_router(analysis.router, prefix="/api")
app.include_router(recommendations.router, prefix="/api")
app.include_router(simulation.router, prefix="/api")
app.include_router(scenarios.router, prefix="/api")
app.include_router(reports.router, prefix="/api")
app.include_router(samples.router, prefix="/api")
app.include_router(research.router, prefix="/api")

@app.get("/")
def root():
    return {
        "title": "AquaSolve Environmental Chemistry System",
        "description": "API is operational. Visit /api/docs for interactive OpenAPI documentation.",
        "status": "online"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host="127.0.0.1", port=8000, reload=True)
