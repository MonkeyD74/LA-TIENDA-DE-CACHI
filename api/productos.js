export default async function handler(req, res) {
  const token = process.env.LOYVERSE_TOKEN;
  if (!token) {
    return res.status(500).json({ error: 'Token no configurado' });
  }
  try {
    const response = await fetch('https://api.loyverse.com/v1.0/items?limit=5', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await response.json();
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
