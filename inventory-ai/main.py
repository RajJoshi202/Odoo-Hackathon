"""
Inventory AI — FastAPI Microservice
====================================
Exposes two AI-powered endpoints that the main inventory website calls:

  POST /predict-demand   →  Predict next-day demand from sales history
  POST /reorder          →  Get smart reorder recommendations

Run with:
  uvicorn main:app --reload
  → http://localhost:8000
  → Swagger docs at http://localhost:8000/docs
"""

from typing import List
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator

from forecasting import predict_demand
from reorder import calculate_reorder

# ────────────────────────────────────────────
#  App Setup
# ────────────────────────────────────────────
app = FastAPI(
    title="Inventory AI Service",
    description="Demand Forecasting & Smart Reorder Recommendation engine",
    version="1.0.0",
)

# Allow the Vite dev server (and any other origin) to call these endpoints
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ────────────────────────────────────────────
#  Request / Response Schemas
# ────────────────────────────────────────────
class SalesEntry(BaseModel):
    """A single day's sales figure."""
    sales: float = Field(..., description="Number of units sold on this day")

    @field_validator("sales")
    @classmethod
    def sales_must_be_non_negative(cls, v):
        if v < 0:
            raise ValueError("Sales value cannot be negative.")
        return v


class ReorderRequest(BaseModel):
    """Input for the reorder recommendation endpoint."""
    stock: float = Field(..., ge=0, description="Current on-hand inventory")
    demand: float = Field(..., ge=0, description="Predicted daily demand")
    lead_time: float = Field(..., ge=0, description="Supplier lead time in days")
    safety_stock: float = Field(..., ge=0, description="Safety stock buffer in units")


class DemandResponse(BaseModel):
    """Response from the demand prediction endpoint."""
    predicted_daily_demand: float


class ReorderResponse(BaseModel):
    """Response from the reorder recommendation endpoint."""
    reorder: bool
    reorder_point: float
    recommended_order: float


# ────────────────────────────────────────────
#  Health Check
# ────────────────────────────────────────────
@app.get("/", tags=["Health"])
def root():
    """Health-check endpoint. Returns a simple status message."""
    return {"message": "Inventory AI running"}


# ────────────────────────────────────────────
#  Demand Forecasting Endpoint
# ────────────────────────────────────────────
@app.post(
    "/predict-demand",
    response_model=DemandResponse,
    tags=["Forecasting"],
    summary="Predict next-day demand",
)
def api_predict_demand(sales_history: List[SalesEntry]):
    """
    Accepts an array of daily sales data and returns the predicted demand
    for the next day using Linear Regression.

    **Minimum 2 data points required.**

    Example body:
    ```json
    [{"sales": 5}, {"sales": 6}, {"sales": 7}]
    ```
    """
    try:
        # Convert Pydantic models to plain dicts for the forecasting module
        history = [entry.model_dump() for entry in sales_history]
        predicted = predict_demand(history)
        return DemandResponse(predicted_daily_demand=predicted)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")


# ────────────────────────────────────────────
#  Reorder Recommendation Endpoint
# ────────────────────────────────────────────
@app.post(
    "/reorder",
    response_model=ReorderResponse,
    tags=["Reorder"],
    summary="Get smart reorder recommendation",
)
def api_reorder(req: ReorderRequest):
    """
    Given current stock, predicted demand, lead time and safety stock,
    calculates whether a reorder is needed and the recommended quantity.

    Example body:
    ```json
    {
      "stock": 40,
      "demand": 6,
      "lead_time": 5,
      "safety_stock": 10
    }
    ```
    """
    try:
        result = calculate_reorder(
            stock=req.stock,
            demand=req.demand,
            lead_time=req.lead_time,
            safety_stock=req.safety_stock,
        )
        return ReorderResponse(**result)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Reorder calculation failed: {str(e)}"
        )
