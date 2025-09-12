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

function ok(x) { return x && (x.status === 200 || x.ok); }

async function tryProvidersQuote(symbol) {
  // Polygon
  if (POLYGON_KEY) {
    try {
      const url = `https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/tickers/${encodeURIComponent(symbol)}?apiKey=${POLYGON_KEY}`;
      const res = await fetch(url);
      if (ok(res)) {
        const j = await res.json();
        const t = j.ticker || {};
        if (t && t.lastTrade) {
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
      }
    } catch {}
  }
  // Finnhub
  if (FINNHUB_KEY) {
    try {
      const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${FINNHUB_KEY}`;
      const res = await fetch(url);
      if (ok(res)) {
        const q = await res.json();
        if (q && q.c) {
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
      }
    } catch {}
  }
  // IEX Cloud (sandbox/paid)
  if (IEX_TOKEN) {
    try {
      const url = `https://cloud.iexapis.com/stable/stock/${encodeURIComponent(symbol)}/quote?token=${IEX_TOKEN}`;
      const res = await fetch(url);
      if (ok(res)) {
        const q = await res.json();
        if (q && q.latestPrice != null) {
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
      }
    } catch {}
  }
  // Yahoo fallback
  try {
    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbol)}`;
    const res = await fetch(url);
    if (ok(res)) {
      const data = await res.json();
      const q = (data.quoteResponse?.result || [])[0];
      if (q) {
        return {
          provider: 'yahoo',
          symbol: q.symbol,
          name: q.longName || q.shortName || q.symbol,
          price: q.regularMarketPrice,
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
    }
  } catch {}
  throw new Error('All providers failed');
}

async function tryProvidersHistory(symbol, range) {
  // Normalize range to days
  const map = { '7d': '1M', '1mo': '1M', '3mo': '3M', '6mo': '6M' };
  const polyRange = map[range] || '3M';
  if (POLYGON_KEY) {
    try {
      // Daily aggregates last N range
      const url = `https://api.polygon.io/v2/aggs/ticker/${encodeURIComponent(symbol)}/range/1/day/2023-01-01/2025-12-31?adjusted=true&limit=50000&apiKey=${POLYGON_KEY}`;
      const res = await fetch(url);
      if (ok(res)) {
        const j = await res.json();
        if (Array.isArray(j.results)) {
          const out = j.results.map(r => ({ date: new Date(r.t), price: r.c }));
          return out.slice(-180); // cap
        }
      }
    } catch {}
  }
  if (FINNHUB_KEY) {
    try {
      const now = Math.floor(Date.now()/1000);
      const start = now - 200 * 86400;
      const url = `https://finnhub.io/api/v1/stock/candle?symbol=${encodeURIComponent(symbol)}&resolution=D&from=${start}&to=${now}&token=${FINNHUB_KEY}`;
      const res = await fetch(url);
      if (ok(res)) {
        const j = await res.json();
        if (j.s === 'ok' && Array.isArray(j.c) && Array.isArray(j.t)) {
          const out = [];
          for (let i = 0; i < j.t.length; i++) out.push({ date: new Date(j.t[i]*1000), price: j.c[i] });
          return out.slice(-180);
        }
      }
    } catch {}
  }
  // Yahoo fallback
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${encodeURIComponent(range)}&interval=1d&events=div,splits`;
    const res = await fetch(url);
    if (ok(res)) {
      const json = await res.json();
      const result = json.chart?.result?.[0];
      if (result) {
        const ts = result.timestamp || [];
        const quote = result.indicators?.quote?.[0] || {};
        const closes = quote.close || [];
        const out = [];
        for (let i = 0; i < ts.length; i++) if (closes[i] != null) out.push({ date: new Date(ts[i]*1000), price: closes[i] });
        return out;
      }
    }
  } catch {}
  throw new Error('All providers failed');
}

app.get('/api/quote', async (req, res) => {
  const symbol = (req.query.symbol || '').toUpperCase();
  if (!symbol) return res.status(400).json({ error: 'symbol required' });
  try {
    const q = await tryProvidersQuote(symbol);
    res.json(q);
  } catch (e) {
    res.status(502).json({ error: 'providers_failed' });
  }
});

app.get('/api/history', async (req, res) => {
  const symbol = (req.query.symbol || '').toUpperCase();
  const range = req.query.range || '1mo';
  if (!symbol) return res.status(400).json({ error: 'symbol required' });
  try {
    const h = await tryProvidersHistory(symbol, range);
    res.json(h);
  } catch (e) {
    res.status(502).json({ error: 'providers_failed' });
  }
});

// Serve static html for convenience
app.use(express.static(process.cwd()));

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
