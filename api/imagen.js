export default async function handler(req, res) {
  try {
    const token = process.env.LOYVERSE_TOKEN;
    const url = req.query.url;

    if (!token) return res.status(500).send('Token no configurado');
    if (!url || !url.startsWith('https://api.loyverse.com/image/')) {
      return res.status(400).send('URL invalida');
    }

    const r = await fetch(url, {
      headers: { Authorization: 'Bearer ' + token }
    });

    if (!r.ok) return res.status(r.status).send('Error cargando imagen');

    const buffer = Buffer.from(await r.arrayBuffer());
    res.setHeader('Content-Type', r.headers.get('content-type') || 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.send(buffer);
  } catch (e) {
    return res.status(500).send(e.message);
  }
}
