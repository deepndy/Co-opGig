from typing import Any, Optional
from pydantic import BaseModel, Field

class DemandRequest(BaseModel):
    analysisId: Optional[str] = None
    areaId: Optional[str] = None
    features: list[dict[str, Any]] = Field(default_factory=list)

class PotentialDemand(BaseModel):
    category: str
    level: str
    confidence: None = None
    basis: str

class DemandData(BaseModel):
    areaId: Optional[str]
    potentialDemand: list[PotentialDemand]
    explanation: str
    limitations: list[str]

class SuccessEnvelope(BaseModel):
    data: dict[str, Any]
    requestId: Optional[str] = None
