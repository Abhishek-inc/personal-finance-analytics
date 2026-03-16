from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import joblib
import numpy as np

app = FastAPI()

# Allow browser requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

model = joblib.load("financial_health_model.pkl")

class HealthInput(BaseModel):
    annual_income: float
    annual_expenses: float
    total_savings: float
    savings_ratio: float
    expense_ratio: float


@app.post("/score")
def predict_health(data: HealthInput):

    features = np.array([[
        data.annual_income,
        data.annual_expenses,
        data.total_savings,
        data.savings_ratio,
        data.expense_ratio
    ]])

    prediction = model.predict(features)[0]

    return {
        "health_score": int(prediction)
    }