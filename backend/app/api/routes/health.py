from fastapi import APIRouter
from datetime import datetime

router = APIRouter(tags=["System Health"])

@router.get("/health")
def health_check():
    """System health check endpoint."""
    return {
        "status": "healthy",
        "service": "AquaSolve Environmental Chemistry API",
        "version": "1.0.0",
        "timestamp": datetime.utcnow().isoformat(),
        "database": "SQLite Connected"
    }
