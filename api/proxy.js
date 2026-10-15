export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const target = req.query.url;
  if (!target) {
    return res.status(400).json({ error: 'URL kosong' });
  }

  if (!target.startsWith('https://www.tikwm.com')) {
    return res.status(403).json({ error: 'Domain ga diizinin' });
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 25000);

    const r = await fetch(target, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
        'Accept': 'application/json'
      },
      signal: controller.signal
    });

    clearTimeout(timer);
    const text = await r.text();

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.status(200).send(text);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}