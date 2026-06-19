const FRED_KEY = process.env.FRED_API_KEY;

const yahooSymbols = {
  sp500: "^GSPC",
  nasdaq: "^IXIC",
  russell: "^RUT",
  vix: "^VIX",
  dxy: "DX-Y.NYB",
  wti: "CL=F",
  gold: "GC=F",
  btc: "BTC-USD"
};

const fredSeries = {
  sofr: "SOFR",
  treasury2y: "DGS2",
  treasury10y: "DGS10"
};

async function getYahooQuotes() {
  const symbols = Object.values(yahooSymbols).join(",");
  const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbols)}`;

  const res = await fetch(url);
  const json = await res.json();

  const bySymbol = {};
  for (const item of json.quoteResponse.result) {
    bySymbol[item.symbol] = {
      price: item.regularMarketPrice,
      change: item.regularMarketChangePercent,
      time: item.regularMarketTime
    };
  }

  return {
    sp500: bySymbol["^GSPC"],
    nasdaq: bySymbol["^IXIC"],
    russell: bySymbol["^RUT"],
    vix: bySymbol["^VIX"],
    dxy: bySymbol["DX-Y.NYB"],
    wti: bySymbol["CL=F"],
    gold: bySymbol["GC=F"],
    btc: bySymbol["BTC-USD"]
  };
}

async function getFredLatest(seriesId) {
  if (!FRED_KEY) return null;

  const url =
    `https://api.stlouisfed.org/fred/series/observations` +
    `?series_id=${seriesId}&api_key=${FRED_KEY}&file_type=json&sort_order=desc&limit=1`;

  const res = await fetch(url);
  const json = await res.json();

  const obs = json.observations?.[0];

  return {
    price: obs?.value === "." ? null : Number(obs?.value),
    change: null,
    date: obs?.date
  };
}

export default async function handler(req, res) {
  try {
    const yahoo = await getYahooQuotes();

    const [sofr, treasury2y, treasury10y] = await Promise.all([
      getFredLatest(fredSeries.sofr),
      getFredLatest(fredSeries.treasury2y),
      getFredLatest(fredSeries.treasury10y)
    ]);

    res.setHeader("Cache-Control", "s-maxage=30, stale-while-revalidate=60");

    res.status(200).json({
      updatedAt: new Date().toISOString(),
      ...yahoo,
      sofr,
      treasury2y,
      treasury10y
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch market data" });
  }
}
