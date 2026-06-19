const FRED_KEY = process.env.FRED_API_KEY;

export default async function handler(req, res) {
  const results = {};

  try {
    const stooqUrl = "https://stooq.com/q/l/?s=%5Espx&f=sd2t2ohlcv&h&e=csv";
    const stooqRes = await fetch(stooqUrl);
    const stooqText = await stooqRes.text();

    results.stooq = {
      status: stooqRes.status,
      ok: stooqRes.ok,
      sample: stooqText.slice(0, 300)
    };
  } catch (err) {
    results.stooq = {
      error: err.message
    };
  }

  try {
    results.fredKeyExists = !!FRED_KEY;

    const fredUrl =
      `https://api.stlouisfed.org/fred/series/observations` +
      `?series_id=DGS10&api_key=${FRED_KEY}&file_type=json&sort_order=desc&limit=3`;

    const fredRes = await fetch(fredUrl);
    const fredText = await fredRes.text();

    results.fred = {
      status: fredRes.status,
      ok: fredRes.ok,
      sample: fredText.slice(0, 300)
    };
  } catch (err) {
    results.fred = {
      error: err.message
    };
  }

  res.status(200).json({
    updatedAt: new Date().toISOString(),
    results
  });
}
