# Stock ML Service

A minimal FastAPI service for stock price prediction. Starts with a deterministic AR(1)+drift baseline; you can swap in trained models (XGBoost/LSTM) later.

## Setup

python3 -m venv .venv
source .venv/bin/activate
pip install -r ml/requirements.txt
uvicorn ml.app:app --reload --host 0.0.0.0 --port 8001

## Endpoint

POST /predict
{
  "symbol": "AAPL",
  "days": 30,
  "closes": [ ... recent close prices ... ]
}

## Upgrading the model
- Replace implementation in ml/app.py with a trained model
- Use features: macro (VIX, rates), sector ETFs, earnings flags, technical features
- Return predictions aligned to closes[-1] anchor

