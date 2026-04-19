from fastapi import FastAPI
import joblib
import pandas as pd

app = FastAPI()
model = joblib.load("RandomForestRegressor.pkl")

@app.post("/predict")
def predict(data: dict):
    df = pd.DataFrame([data])
    pred = model.predict(df)
    return {"stress_score": float(pred[0])}

# run this file with uvicorn server:app --reload

# below code to update in app.js
js="""
const response = await fetch("http://localhost:8000/predict", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(features)
});
const { stress_score } = await response.json();
console.log("Predicted stress score:", stress_score);
"""