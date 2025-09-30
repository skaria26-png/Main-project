# Alpha Vantage API Integration

This project now includes comprehensive Alpha Vantage API integration for enhanced stock market data and analysis.

## Features Added

### 1. Enhanced Quote Data
- Real-time stock quotes via Alpha Vantage Global Quote endpoint
- Integrated into the existing provider fallback chain
- Provides real-time data quality indicators

### 2. Time Series Data
- **Daily**: `TIME_SERIES_DAILY` - Daily OHLCV data
- **Weekly**: `TIME_SERIES_WEEKLY` - Weekly OHLCV data  
- **Monthly**: `TIME_SERIES_MONTHLY` - Monthly OHLCV data
- **Intraday**: `TIME_SERIES_INTRADAY` - 5-minute interval data

### 3. Technical Indicators
- **RSI** (Relative Strength Index) - Momentum oscillator
- **MACD** (Moving Average Convergence Divergence) - Trend following indicator
- **BBANDS** (Bollinger Bands) - Volatility indicator
- **SMA** (Simple Moving Average) - Trend indicator
- **EMA** (Exponential Moving Average) - Trend indicator
- **STOCH** (Stochastic Oscillator) - Momentum indicator

### 4. Company Overview
- Fundamental data including P/E ratio, market cap, sector, industry
- 52-week high/low prices
- Moving averages (50-day, 200-day)
- Analyst ratings and target prices
- Dividend yield and beta coefficient

## API Endpoints

### Server Endpoints
- `GET /api/alpha-vantage/timeseries?symbol=AAPL&interval=daily`
- `GET /api/alpha-vantage/technical/RSI?symbol=AAPL&time_period=20`
- `GET /api/alpha-vantage/overview?symbol=AAPL`
- `GET /api/history/alpha-vantage?symbol=AAPL&interval=daily`

### Frontend Features
- **Alpha Vantage Analysis Section**: Displays technical indicators and company overview
- **Load Alpha Vantage Data Button**: Fetches and displays comprehensive Alpha Vantage data
- **Enhanced Provider Selection**: Alpha Vantage is included in the provider dropdown
- **Real-time Indicators**: RSI with color-coded signals (🔴 overbought, 🟢 oversold, 🟡 neutral)

## Setup Instructions

1. **Get Alpha Vantage API Key**:
   - Visit [Alpha Vantage](https://www.alphavantage.co/support/#api-key)
   - Sign up for a free API key
   - Set the environment variable: `ALPHA_VANTAGE_KEY=your_api_key_here`

2. **Start the Server**:
   ```bash
   npm start
   ```

3. **Access the Application**:
4. **(Optional) Start ML Service for Advanced Predictions**:
   - Create venv and install requirements
     - `python3 -m venv .venv && source .venv/bin/activate`
     - `pip install -r ml/requirements.txt`
   - Run service
     - `uvicorn ml.app:app --reload --host 0.0.0.0 --port 8001`
   - In another terminal, export: `ML_SERVICE_URL=http://127.0.0.1:8001` then `npm start`

   - Open `http://localhost:3000` in your browser
   - Select "Alpha Vantage" from the provider dropdown
   - Analyze any stock symbol to see Alpha Vantage data

## Data Quality

- **Real-time Data**: Alpha Vantage provides real-time stock quotes
- **Historical Data**: 20+ years of historical data available
- **Professional Grade**: Used by institutional traders and financial institutions
- **Reliable**: High uptime and data accuracy

## Rate Limits

- **Free Tier**: 5 API calls per minute, 500 calls per day
- **Premium Tiers**: Higher limits available for commercial use
- **Caching**: The application implements intelligent caching to minimize API calls

## Integration Benefits

1. **Enhanced Analysis**: Professional-grade technical indicators
2. **Comprehensive Data**: Both real-time and historical data
3. **Fundamental Analysis**: Company overview and financial metrics
4. **Reliability**: Multiple data providers with Alpha Vantage as premium option
5. **Educational Value**: Learn about professional trading indicators

## Technical Implementation

- **Backend**: Express.js server with Alpha Vantage API integration
- **Frontend**: Vanilla JavaScript with Chart.js for visualization
- **Caching**: Intelligent caching system to optimize API usage
- **Error Handling**: Graceful fallbacks when Alpha Vantage is unavailable
- **Provider Chain**: Alpha Vantage integrated into multi-provider fallback system

The integration maintains the existing functionality while adding powerful new capabilities for professional-grade stock analysis.

