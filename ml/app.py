from fastapi import FastAPI
from pydantic import BaseModel
from typing import List, Optional
import math

app = FastAPI(title='Stock ML Service', version='0.1.0')

class PredictRequest(BaseModel):
    symbol: str
    days: int = 30
    closes: List[float]
    volumes: Optional[List[float]] = None
    features: Optional[dict] = None

class PredictResponse(BaseModel):
    symbol: str
    model: str
    predictions: List[float]
    accuracy: Optional[float] = None
    r2_score: Optional[float] = None
    mse: Optional[float] = None

@app.post('/predict', response_model=PredictResponse)
def predict(req: PredictRequest):
    # Simple placeholder: AR(1)+drift with volatility aware noise. Replace with trained model later.
    closes = req.closes[-120:] if req.closes else []
    if len(closes) < 2:
        base = closes[-1] if closes else 100.0
        return PredictResponse(symbol=req.symbol, model='baseline', predictions=[base]*req.days)

    rets = []
    for i in range(1, len(closes)):
        if closes[i-1] > 0:
            rets.append((closes[i] - closes[i-1]) / closes[i-1])
    mu = sum(rets)/len(rets) if rets else 0.0
    var = sum((r-mu)**2 for r in rets)/len(rets) if rets else 0.0
    sigma = math.sqrt(var)

    # AR(1) parameter (very light persistence)
    phi = 0.15
    last = closes[-1]
    preds = []
    ar = rets[-1] if rets else 0.0
    for i in range(req.days):
        # drift + AR term, noise scaled by sigma
        drift = mu * 0.6
        ar = phi*ar + (1-phi)*mu
        eps = 0.0  # keep deterministic for now; can add noise later
        r = drift + ar + eps
        last = max(0.01, last * (1 + r))
        preds.append(last)

    return PredictResponse(symbol=req.symbol, model='AR1_drift', predictions=preds, accuracy=None)

