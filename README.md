# 📈 Stock Price Predictor

A sophisticated web application that analyzes stock market data and predicts whether stock prices will go up or down using technical analysis indicators.

## 🚀 Features

- **Real-time Stock Analysis**: Enter any stock symbol to get instant predictions
- **Technical Indicators**: RSI, MACD, Moving Averages (20-day & 50-day)
- **Confidence Scoring**: Percentage-based confidence in predictions
- **Detailed Reasoning**: Explains why the prediction was made
- **Modern UI**: Beautiful, responsive design with gradient backgrounds
- **Mobile Friendly**: Works on all device sizes

## 🎯 Supported Stocks

- **AAPL** - Apple Inc.
- **GOOGL** - Alphabet Inc. (Google)
- **MSFT** - Microsoft Corporation
- **TSLA** - Tesla, Inc.

## 🔧 Technical Analysis

The predictor uses multiple technical indicators:

1. **RSI (Relative Strength Index)**: Identifies overbought/oversold conditions
2. **MACD**: Analyzes trend momentum and crossover signals
3. **Moving Averages**: Compares current price to 20-day and 50-day averages
4. **Volume Analysis**: Considers trading volume patterns
5. **P/E Ratio**: Evaluates valuation metrics

## 🎨 How to Use

1. Open `stock_predictor.html` in your web browser
2. Enter a stock symbol (e.g., AAPL, GOOGL, MSFT, TSLA)
3. Click "Analyze Stock" or press Enter
4. View the prediction with detailed reasoning and technical indicators

## 📊 Prediction Algorithm

The tool uses a weighted scoring system that considers:

### Bullish Signals:
- RSI oversold (< 30)
- MACD bullish crossover
- Price above moving averages
- High volume with price increase
- Low P/E ratio

### Bearish Signals:
- RSI overbought (> 70)
- MACD bearish crossover
- Price below moving averages
- High volume with price decrease
- High P/E ratio

## 🛠️ Technologies Used

- **HTML5**: Structure and semantic markup
- **CSS3**: Modern styling with gradients and animations
- **JavaScript**: Technical analysis calculations and prediction logic
- **Git**: Version control

## 📱 Screenshots

The application features:
- Clean, modern interface with gradient backgrounds
- Color-coded predictions (green for up, red for down)
- Interactive technical indicators display
- Responsive design for mobile devices
- Loading animations and error handling

## ⚠️ Disclaimer

This is a demonstration tool using mock data for educational purposes. It should not be used for actual investment decisions. Always consult with financial professionals before making investment choices.

## 🔮 Future Enhancements

- Integration with real stock market APIs
- Additional technical indicators (Bollinger Bands, Stochastic)
- Historical performance tracking
- Portfolio analysis features
- Real-time data updates

## 📄 License

This project is open source and available under the MIT License.

---

**Note**: This tool is for educational purposes only and should not be used for actual trading decisions.
