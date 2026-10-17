from fastapi import FastAPI
from pydantic import BaseModel, Field
from typing import Literal
import joblib
import pandas as pd
from fastapi.middleware.cors import CORSMiddleware

model = joblib.load('Loan_Approval_Model.pkl')

app = FastAPI()

app.add_middleware(
    CORSMiddleware, 
    allow_origins=['*'],
    allow_methods=['*'],
    allow_headers=['*']
)

COLUMNS = ['no_of_dependents', 'education', 'self_employed', 'income_annum', 'loan_amount', 'loan_term', 'cibil_score', 'residential_assets_value', 'commercial_assets_value', 'luxury_assets_value', 'bank_asset_value']

class LoanRequest(BaseModel):
    no_of_dependents: int = Field(..., ge=0, le=20, examples=[2])
    education: Literal["Graduate", "Not Graduate"] = Field(..., examples=["Graduate"])
    self_employed: Literal["Yes", "No"] = Field(..., examples=["No"])
    income_annum: float = Field(..., gt=0, description="Annual Income", examples=[9600000])
    loan_amount: float = Field(..., gt=0, examples=[29900000])
    loan_term: int = Field(..., ge=1, le=40, description="Loan term in years", examples=[12])
    cibil_score: int = Field(..., ge=300, le=900, examples=[778])
    residential_assets_value: float = Field(..., ge=0, examples=[2400000])
    commercial_assets_value: float = Field(..., ge=0, examples=[17600000])
    luxury_assets_value: float = Field(..., ge=0, examples=[22700000])
    bank_asset_value: float = Field(..., ge=0, examples=[8000000])

@app.get('/')
def greet():
    return{'message': 'Loan Approval API is running'}

@app.post('/predict')
def predict(data: LoanRequest):
    row = pd.DataFrame([data.model_dump()], columns=COLUMNS) 
    prediction = model.predict(row)[0]
    proba = model.predict_proba(row)[0] 

    approved_index = list(model.classes_).index('Approved')
    approved_proba = float(proba[approved_index]) 

    return {
        'prediction': prediction,
        'approved_probability': round(approved_proba, 4),
        'status': 'Approved' if prediction == 'Approved' else 'Rejected'
    }