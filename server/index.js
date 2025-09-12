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
  const order = ['polygon','iex','alpha_vantage','twelve_data','finnhub','yahoo'];
  if (preferred && order.includes(preferred)) {
    order.splice(order.indexOf(preferred),1);
    order.unshift(preferred);
  }
  
  for (const p of order) {
    try {
      if (p === 'polygon') return await polygonQuote(symbol);
      if (p === 'iex') return await iexQuote(symbol);
      if (p === 'alpha_vantage') return await alphaVantageQuote(symbol);
      if (p === 'twelve_data') return await twelveDataQuote(symbol);
      if (p === 'finnhub') return await finnhubQuote(symbol);
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
  const order = ['polygon','finnhub','yahoo'];
  if (preferred && order.includes(preferred)) {
    order.splice(order.indexOf(preferred),1);
    order.unshift(preferred);
  }
  for (const p of order) {
    try {
      if (p === 'polygon') return await polygonHistory(symbol);
      if (p === 'finnhub') return await finnhubHistory(symbol);
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

// Serve static html for convenience
app.use(express.static(process.cwd()));

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
  console.log('Professional data sources available:');
  console.log('- Polygon (real-time):', POLYGON_KEY ? '✓' : '✗');
  console.log('- IEX Cloud (real-time):', IEX_TOKEN ? '✓' : '✗');
  console.log('- Alpha Vantage (real-time):', ALPHA_VANTAGE_KEY ? '✓' : '✗');
  console.log('- Twelve Data (real-time):', TWELVE_DATA_KEY ? '✓' : '✗');
  console.log('- Finnhub (real-time):', FINNHUB_KEY ? '✓' : '✗');
  console.log('- Yahoo (delayed): ✓');
});
