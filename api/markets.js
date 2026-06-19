const FRED_KEY = process.env.FRED_API_KEY;

const stooqSymbols = {
  sp500: "^spx",
  nasdaq: "^ndq",
  russell: "^rut",
  vix: "^vix",
  dxy: "dx.f",
  wti: "cl.f",
  gold: "gc.f",
  btc: "btcusd"
};

const fredSeries = {
  sofr: "SOFR",
  treasury2y: "DGS2",
  treasury10y: "DGS10"
};

async function getStooqQuote(symbol) {
  try {
    const url = `https://stooq.com/q/l/?s=${encodeURIComponent(symbol)}&f=sd2t2ohlcv&h&e=csv`;
    const res = await fetch(url);
    const text = await res.text();

    const lines = text.trim().split("\n");
    if (lines.length < 2) return null;

    const values = lines[1].split(",");
    const close = Number(values[6]);

    if (!Number.isFinite(close)) return null;

    return {
      price: close,
      change: null,
      date: values[1],
      time: values[2]
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
    const observations = json.observations || [];

    const obs = observations.find(o => o.value && o.value !== ".");

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
    Object.entries(stooqSymbols).map(async ([key, symbol]) => {
      const quote = await getStooqQuote(symbol);
      return [key, quote];
    })
  );

  const markets = Object.fromEntries(marketEntries);

  const [sofr, treasury2y, treasury10y] = await Promise.all([
    getFredLatest(fredSeries.sofr),
    getFredLatest(fredSeries.treasury2y),
    getFredLatest(fredSeries.treasury10y)
  ]);

  res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=300");

  res.status(200).json({
    updatedAt: new Date().toISOString(),
    ...markets,
    sofr,
    treasury2y,
    treasury10y
  });
}
