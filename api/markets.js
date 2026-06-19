const FRED_KEY = process.env.FRED_API_KEY;

const yahooSymbols = {
  sp500: "%5EGSPC",
  nasdaq: "%5EIXIC",
  russell: "%5ERUT",
  vix: "%5EVIX",
  dxy: "DX-Y.NYB",
  wti: "CL%3DF",
  gold: "GC%3DF",
  btc: "BTC-USD"
};

const fredSeries = {
  sofr: "SOFR",
  treasury2y: "DGS2",
  treasury10y: "DGS10"
};

async function getYahooChart(encodedSymbol) {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodedSymbol}?range=1d&interval=1m`;

    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Accept": "application/json"
      }
    });

    const json = await res.json();
    const result = json.chart?.result?.[0];
    const meta = result?.meta;

    if (!meta?.regularMarketPrice) return null;

    return {
      price: meta.regularMarketPrice,
      change: meta.regularMarketChangePercent ?? null
    };
  } catch {
    return null;
  }
}

async function getFredLatest(seriesId) {
  try {
    if (!FRED_KEY) return null;

    const url =
      `https://api.stlouisfed.org/fred/series/observations` +
      `?series_id=${seriesId}` +
      `&api_key=${FRED_KEY}` +
      `&file_type=json` +
      `&sort_order=desc` +
      `&limit=10`;

    const res = await fetch(url);
    const json = await res.json();

    const obs = json.observations?.find(o => o.value && o.value !== ".");

    if (!obs) return null;

    return {
      price: Number(obs.value),
      change: null,
      date: obs.date
    };
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  const marketEntries = await Promise.all(
    Object.entries(yahooSymbols).map(async ([key, symbol]) => {
      return [key, await getYahooChart(symbol)];
    })
  );

  const [sofr, treasury2y, treasury10y] = await Promise.all([
    getFredLatest(fredSeries.sofr),
    getFredLatest(fredSeries.treasury2y),
    getFredLatest(fredSeries.treasury10y)
  ]);

  res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=300");

  res.status(200).json({
    updatedAt: new Date().toISOString(),
    ...Object.fromEntries(marketEntries),
    sofr,
    treasury2y,
    treasury10y
  });
}
