/* eslint-disable */
const express = require('express');
const cors = require('cors');
const fetch = global.fetch || ((...args) => import('node-fetch').then(({default: f}) => f(...args)));

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const POLYGON_KEY = process.env.POLYGON_API_KEY || '';
const FINNHUB_KEY = process.env.FINNHUB_API_KEY || '';
const IEX_TOKEN = process.env.IEX_CLOUD_TOKEN || '';
const ALPHA_VANTAGE_KEY = process.env.ALPHA_VANTAGE_KEY || '';
const TWELVE_DATA_KEY = process.env.TWELVE_DATA_KEY || '';
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://127.0.0.1:8001';

function ok(x) { return x && (x.status === 200 || x.ok); }

async function polygonQuote(symbol) {
  if (!POLYGON_KEY) throw new Error('no polygon');
  const url = `https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/tickers/${encodeURIComponent(symbol)}?apiKey=${POLYGON_KEY}`;
  const res = await fetch(url);
  if (!ok(res)) throw new Error('polygon bad');
  const j = await res.json();
  const t = j.ticker || {};
  if (!t || !t.lastTrade) throw new Error('polygon empty');
  return {
    provider: 'polygon',
    symbol: t.ticker || symbol,
    name: t.name || symbol,
    price: t.lastTrade.p,
    change: (t.day?.c ?? null),
    changePercent: (t.day?.cp ?? null),
    volume: t.day?.v ?? null,
    marketCap: t.marketCap ?? null,
    pe: null,
    previousClose: t.prevDay?.c ?? null,
    dayHigh: t.day?.h ?? null,
    dayLow: t.day?.l ?? null,
    currency: 'USD',
    exchangeName: t.primaryExchange || '—'
  };
}

async function finnhubQuote(symbol) {
  if (!FINNHUB_KEY) throw new Error('no finnhub');
  const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${FINNHUB_KEY}`;
  const res = await fetch(url);
  if (!ok(res)) throw new Error('finnhub bad');
  const q = await res.json();
  if (!q || !q.c) throw new Error('finnhub empty');
  return {
    provider: 'finnhub',
    symbol,
    name: symbol,
    price: q.c,
    change: q.d,
    changePercent: q.dp,
    volume: null,
    marketCap: null,
    pe: null,
    previousClose: q.pc,
    dayHigh: q.h,
    dayLow: q.l,
    currency: 'USD',
    exchangeName: '—'
  };
}

async function iexQuote(symbol) {
  if (!IEX_TOKEN) throw new Error('no iex');
  const url = `https://cloud.iexapis.com/stable/stock/${encodeURIComponent(symbol)}/quote?token=${IEX_TOKEN}`;
  const res = await fetch(url);
  if (!ok(res)) throw new Error('iex bad');
  const q = await res.json();
  if (!q || q.latestPrice == null) throw new Error('iex empty');
  return {
    provider: 'iex',
    symbol: q.symbol,
    name: q.companyName || symbol,
    price: q.latestPrice,
    change: q.change,
    changePercent: q.changePercent ? q.changePercent * 100 : null,
    volume: q.latestVolume,
    marketCap: q.marketCap,
    pe: q.peRatio,
    previousClose: q.previousClose,
    dayHigh: q.high,
    dayLow: q.low,
    currency: 'USD',
    exchangeName: q.primaryExchange || '—'
  };
}

async function yahooQuote(symbol) {
  const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbol)}`;
  const res = await fetch(url);
  if (!ok(res)) throw new Error('yahoo bad');
  const data = await res.json();
  const q = (data.quoteResponse?.result || [])[0];
  if (!q) throw new Error('yahoo empty');
  const marketState = q.marketState;
  const pre = q.preMarketPrice;
  const post = q.postMarketPrice;
  const regular = q.regularMarketPrice;
  let displayPrice = regular;
  if ((marketState === 'PRE' || marketState === 'PREPRE') && pre != null) displayPrice = pre;
  else if ((marketState === 'POST' || marketState === 'POSTPOST' || marketState === 'CLOSED') && post != null) displayPrice = post;
  return {
    provider: 'yahoo',
    symbol: q.symbol,
    name: q.longName || q.shortName || q.symbol,
    price: displayPrice,
    change: q.regularMarketChange,
    changePercent: q.regularMarketChangePercent,
    volume: q.regularMarketVolume,
    marketCap: q.marketCap,
    pe: q.trailingPE,
    previousClose: q.regularMarketPreviousClose ?? q.previousClose,
    dayHigh: q.regularMarketDayHigh ?? q.dayHigh,
    dayLow: q.regularMarketDayLow ?? q.dayLow,
    currency: q.currency || 'USD',
    exchangeName: q.fullExchangeName || q.exchange || q.exchangeDisplay || '—'
  };
}

async function alphaVantageQuote(symbol) {
  if (!ALPHA_VANTAGE_KEY) throw new Error('no alpha vantage');
  const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(symbol)}&apikey=${ALPHA_VANTAGE_KEY}`;
  const res = await fetch(url);
  if (!ok(res)) throw new Error('alpha vantage bad');
  const data = await res.json();
  const q = data['Global Quote'];
  if (!q || !q['05. price']) throw new Error('alpha vantage empty');
  
  return {
    provider: 'alpha_vantage',
    symbol: q['01. symbol'],
    name: symbol,
    price: parseFloat(q['05. price']),
    change: parseFloat(q['09. change']),
    changePercent: parseFloat(q['10. change percent'].replace('%', '')),
    volume: parseInt(q['06. volume']),
    marketCap: null,
    pe: null,
    previousClose: parseFloat(q['08. previous close']),
    dayHigh: parseFloat(q['03. high']),
    dayLow: parseFloat(q['04. low']),
    currency: 'USD',
    exchangeName: '—',
    dataQuality: 'real-time',
    lastUpdate: new Date().toISOString()
  };
}

async function alphaVantageTimeSeries(symbol, interval = 'daily') {
  if (!ALPHA_VANTAGE_KEY) throw new Error('no alpha vantage');
  let functionName, outputsize = 'compact';
  
  switch(interval) {
    case 'intraday': functionName = 'TIME_SERIES_INTRADAY'; break;
    case 'daily': functionName = 'TIME_SERIES_DAILY'; break;
    case 'weekly': functionName = 'TIME_SERIES_WEEKLY'; break;
    case 'monthly': functionName = 'TIME_SERIES_MONTHLY'; break;
    default: functionName = 'TIME_SERIES_DAILY';
  }
  
  let url = `https://www.alphavantage.co/query?function=${functionName}&symbol=${encodeURIComponent(symbol)}&apikey=${ALPHA_VANTAGE_KEY}&outputsize=${outputsize}`;
  if (interval === 'intraday') {
    url += '&interval=5min';
  }
  
  const res = await fetch(url);
  if (!ok(res)) throw new Error('alpha vantage time series bad');
  const data = await res.json();
  
  let timeSeriesKey;
  switch(interval) {
    case 'intraday': timeSeriesKey = 'Time Series (5min)'; break;
    case 'daily': timeSeriesKey = 'Time Series (Daily)'; break;
    case 'weekly': timeSeriesKey = 'Weekly Time Series'; break;
    case 'monthly': timeSeriesKey = 'Monthly Time Series'; break;
  }
  
  const timeSeries = data[timeSeriesKey];
  if (!timeSeries) throw new Error('alpha vantage time series empty');
  
  const out = [];
  const entries = Object.entries(timeSeries).slice(0, 180); // Limit to 180 days
  for (const [date, values] of entries) {
    out.push({
      date: new Date(date),
      price: parseFloat(values['4. close']),
      open: parseFloat(values['1. open']),
      high: parseFloat(values['2. high']),
      low: parseFloat(values['3. low']),
      volume: parseInt(values['5. volume'])
    });
  }
  return out.sort((a, b) => a.date - b.date);
}

async function alphaVantageTechnicalIndicator(symbol, indicator, interval = 'daily', timePeriod = 20) {
  if (!ALPHA_VANTAGE_KEY) throw new Error('no alpha vantage');
  
  let url = `https://www.alphavantage.co/query?function=${indicator}&symbol=${encodeURIComponent(symbol)}&interval=${interval}&time_period=${timePeriod}&series_type=close&apikey=${ALPHA_VANTAGE_KEY}`;
  
  const res = await fetch(url);
  if (!ok(res)) throw new Error('alpha vantage technical indicator bad');
  const data = await res.json();
  
  // Different indicators have different response structures
  let indicatorKey;
  switch(indicator) {
    case 'RSI': indicatorKey = 'Technical Analysis: RSI'; break;
    case 'MACD': indicatorKey = 'Technical Analysis: MACD'; break;
    case 'BBANDS': indicatorKey = 'Technical Analysis: BBANDS'; break;
    case 'SMA': indicatorKey = 'Technical Analysis: SMA'; break;
    case 'EMA': indicatorKey = 'Technical Analysis: EMA'; break;
    case 'STOCH': indicatorKey = 'Technical Analysis: STOCH'; break;
    default: indicatorKey = `Technical Analysis: ${indicator}`;
  }
  
  const technicalData = data[indicatorKey];
  if (!technicalData) throw new Error('alpha vantage technical indicator empty');
  
  return technicalData;
}

async function alphaVantageCompanyOverview(symbol) {
  if (!ALPHA_VANTAGE_KEY) throw new Error('no alpha vantage');
  const url = `https://www.alphavantage.co/query?function=OVERVIEW&symbol=${encodeURIComponent(symbol)}&apikey=${ALPHA_VANTAGE_KEY}`;
  const res = await fetch(url);
  if (!ok(res)) throw new Error('alpha vantage company overview bad');
  const data = await res.json();
  if (!data.Symbol) throw new Error('alpha vantage company overview empty');
  
  return {
    symbol: data.Symbol,
    name: data.Name,
    description: data.Description,
    sector: data.Sector,
    industry: data.Industry,
    marketCap: data.MarketCapitalization ? parseFloat(data.MarketCapitalization) : null,
    pe: data.PERatio ? parseFloat(data.PERatio) : null,
    peg: data.PEGRatio ? parseFloat(data.PEGRatio) : null,
    eps: data.EPS ? parseFloat(data.EPS) : null,
    dividendYield: data.DividendYield ? parseFloat(data.DividendYield) : null,
    beta: data.Beta ? parseFloat(data.Beta) : null,
    high52Week: data['52WeekHigh'] ? parseFloat(data['52WeekHigh']) : null,
    low52Week: data['52WeekLow'] ? parseFloat(data['52WeekLow']) : null,
    movingAverage50: data['50DayMovingAverage'] ? parseFloat(data['50DayMovingAverage']) : null,
    movingAverage200: data['200DayMovingAverage'] ? parseFloat(data['200DayMovingAverage']) : null,
    analystTargetPrice: data.AnalystTargetPrice ? parseFloat(data.AnalystTargetPrice) : null,
    analystRating: data.AnalystRating,
    lastUpdate: new Date().toISOString()
  };
}

async function twelveDataQuote(symbol) {
  if (!TWELVE_DATA_KEY) throw new Error('no twelve data');
  const url = `https://api.twelvedata.com/quote?symbol=${encodeURIComponent(symbol)}&apikey=${TWELVE_DATA_KEY}`;
  const res = await fetch(url);
  if (!ok(res)) throw new Error('twelve data bad');
  const q = await res.json();
  if (!q || !q.price) throw new Error('twelve data empty');
  
  return {
    provider: 'twelve_data',
    symbol: q.symbol,
    name: q.name || symbol,
    price: parseFloat(q.price),
    change: parseFloat(q.change),
    changePercent: parseFloat(q.percent_change),
    volume: parseInt(q.volume) || null,
    marketCap: q.market_cap ? parseFloat(q.market_cap) : null,
    pe: q.pe ? parseFloat(q.pe) : null,
    previousClose: q.close ? parseFloat(q.close) : null,
    dayHigh: q.high ? parseFloat(q.high) : null,
    dayLow: q.low ? parseFloat(q.low) : null,
    currency: 'USD',
    exchangeName: q.exchange || '—',
    dataQuality: 'real-time',
    lastUpdate: new Date().toISOString()
  };
}

async function tryProvidersQuote(symbol, preferred) {
  const order = ['finnhub','polygon','iex','alpha_vantage','twelve_data','yahoo'];
  if (preferred && order.includes(preferred)) {
    order.splice(order.indexOf(preferred),1);
    order.unshift(preferred);
  }
  
  for (const p of order) {
    try {
      if (p === 'finnhub') return await finnhubQuote(symbol);
      if (p === 'polygon') return await polygonQuote(symbol);
      if (p === 'iex') return await iexQuote(symbol);
      if (p === 'alpha_vantage') return await alphaVantageQuote(symbol);
      if (p === 'twelve_data') return await twelveDataQuote(symbol);
      if (p === 'yahoo') return await yahooQuote(symbol);
    } catch (e) {
      console.log(`Provider ${p} failed for ${symbol}:`, e.message);
    }
  }
  throw new Error('All providers failed');
}

async function polygonHistory(symbol) {
  if (!POLYGON_KEY) throw new Error('no polygon');
  const url = `https://api.polygon.io/v2/aggs/ticker/${encodeURIComponent(symbol)}/range/1/day/2023-01-01/2025-12-31?adjusted=true&limit=50000&apiKey=${POLYGON_KEY}`;
  const res = await fetch(url);
  if (!ok(res)) throw new Error('polygon bad');
  const j = await res.json();
  if (!Array.isArray(j.results)) throw new Error('polygon empty');
  return j.results.map(r => ({ date: new Date(r.t), price: r.c })).slice(-180);
}

async function finnhubHistory(symbol) {
  if (!FINNHUB_KEY) throw new Error('no finnhub');
  const now = Math.floor(Date.now()/1000);
  const start = now - 200 * 86400;
  const url = `https://finnhub.io/api/v1/stock/candle?symbol=${encodeURIComponent(symbol)}&resolution=D&from=${start}&to=${now}&token=${FINNHUB_KEY}`;
  const res = await fetch(url);
  if (!ok(res)) throw new Error('finnhub bad');
  const j = await res.json();
  if (j.s !== 'ok' || !Array.isArray(j.c) || !Array.isArray(j.t)) throw new Error('finnhub empty');
  const out = [];
  for (let i=0;i<j.t.length;i++) out.push({ date: new Date(j.t[i]*1000), price: j.c[i] });
  return out.slice(-180);
}

async function yahooHistory(symbol, range) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${encodeURIComponent(range)}&interval=1d&events=div,splits`;
  const res = await fetch(url);
  if (!ok(res)) throw new Error('yahoo bad');
  const json = await res.json();
  const result = json.chart?.result?.[0];
  if (!result) throw new Error('yahoo empty');
  const ts = result.timestamp || [];
  const quote = result.indicators?.quote?.[0] || {};
  const closes = quote.close || [];
  const out = [];
  for (let i = 0; i < ts.length; i++) if (closes[i] != null) out.push({ date: new Date(ts[i]*1000), price: closes[i] });
  return out;
}

async function tryProvidersHistory(symbol, range, preferred) {
  const order = ['finnhub','polygon','alpha_vantage','yahoo'];
  if (preferred && order.includes(preferred)) {
    order.splice(order.indexOf(preferred),1);
    order.unshift(preferred);
  }
  for (const p of order) {
    try {
      if (p === 'finnhub') return await finnhubHistory(symbol);
      if (p === 'polygon') return await polygonHistory(symbol);
      if (p === 'alpha_vantage') return await alphaVantageTimeSeries(symbol, 'daily');
      if (p === 'yahoo') return await yahooHistory(symbol, range);
    } catch {}
  }
  throw new Error('All providers failed');
}

app.get('/api/quote', async (req, res) => {
  const symbol = (req.query.symbol || '').toUpperCase();
  const preferred = (req.query.provider || '').toLowerCase();
  if (!symbol) return res.status(400).json({ error: 'symbol required' });
  try {
    const q = await tryProvidersQuote(symbol, preferred);
    res.json(q);
  } catch (e) {
    res.status(502).json({ error: 'providers_failed' });
  }
});

app.get('/api/history', async (req, res) => {
  const symbol = (req.query.symbol || '').toUpperCase();
  const range = req.query.range || '1mo';
  const preferred = (req.query.provider || '').toLowerCase();
  if (!symbol) return res.status(400).json({ error: 'symbol required' });
  try {
    const h = await tryProvidersHistory(symbol, range, preferred);
    res.json(h);
  } catch (e) {
    res.status(502).json({ error: 'providers_failed' });
  }
});

// Alpha Vantage specific endpoints
app.get('/api/alpha-vantage/timeseries', async (req, res) => {
  const symbol = (req.query.symbol || '').toUpperCase();
  const interval = req.query.interval || 'daily';
  if (!symbol) return res.status(400).json({ error: 'symbol required' });
  if (!ALPHA_VANTAGE_KEY) return res.status(503).json({ error: 'alpha_vantage_not_configured' });
  
  try {
    const data = await alphaVantageTimeSeries(symbol, interval);
    res.json(data);
  } catch (e) {
    res.status(502).json({ error: 'alpha_vantage_timeseries_failed', message: e.message });
  }
});

// ML prediction proxy
app.post('/api/ml/predict', async (req, res) => {
  try {
    const body = req.body || {};
    const url = `${ML_SERVICE_URL.replace(/\/$/, '')}/predict`;
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!ok(r)) return res.status(502).json({ error: 'ml_service_failed' });
    const j = await r.json();
    res.json(j);
  } catch (e) {
    res.status(502).json({ error: 'ml_proxy_error', message: e.message });
  }
});

app.get('/api/alpha-vantage/technical/:indicator', async (req, res) => {
  const symbol = (req.query.symbol || '').toUpperCase();
  const indicator = req.params.indicator.toUpperCase();
  const interval = req.query.interval || 'daily';
  const timePeriod = parseInt(req.query.time_period) || 20;
  
  if (!symbol) return res.status(400).json({ error: 'symbol required' });
  if (!ALPHA_VANTAGE_KEY) return res.status(503).json({ error: 'alpha_vantage_not_configured' });
  
  try {
    const data = await alphaVantageTechnicalIndicator(symbol, indicator, interval, timePeriod);
    res.json(data);
  } catch (e) {
    res.status(502).json({ error: 'alpha_vantage_technical_failed', message: e.message });
  }
});

app.get('/api/alpha-vantage/overview', async (req, res) => {
  const symbol = (req.query.symbol || '').toUpperCase();
  if (!symbol) return res.status(400).json({ error: 'symbol required' });
  if (!ALPHA_VANTAGE_KEY) return res.status(503).json({ error: 'alpha_vantage_not_configured' });
  
  try {
    const data = await alphaVantageCompanyOverview(symbol);
    res.json(data);
  } catch (e) {
    res.status(502).json({ error: 'alpha_vantage_overview_failed', message: e.message });
  }
});

// Enhanced history endpoint with Alpha Vantage support
app.get('/api/history/alpha-vantage', async (req, res) => {
  const symbol = (req.query.symbol || '').toUpperCase();
  const interval = req.query.interval || 'daily';
  if (!symbol) return res.status(400).json({ error: 'symbol required' });
  if (!ALPHA_VANTAGE_KEY) return res.status(503).json({ error: 'alpha_vantage_not_configured' });
  
  try {
    const data = await alphaVantageTimeSeries(symbol, interval);
    res.json(data);
  } catch (e) {
    res.status(502).json({ error: 'alpha_vantage_history_failed', message: e.message });
  }
});

// Serve static html for convenience
app.use(express.static(process.cwd()));

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
  console.log('Professional data sources available:');
  console.log('- Finnhub (real-time) [PRIMARY]:', FINNHUB_KEY ? '✓' : '✗');
  console.log('- Polygon (real-time):', POLYGON_KEY ? '✓' : '✗');
  console.log('- IEX Cloud (real-time):', IEX_TOKEN ? '✓' : '✗');
  console.log('- Alpha Vantage (real-time):', ALPHA_VANTAGE_KEY ? '✓' : '✗');
  console.log('- Twelve Data (real-time):', TWELVE_DATA_KEY ? '✓' : '✗');
  console.log('- Yahoo (delayed): ✓');
});
