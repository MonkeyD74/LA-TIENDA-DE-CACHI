import { Redis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';

const redis = Redis.fromEnv();
const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '10 m'),
  analytics: false,
  prefix: '@upstash/ratelimit/recompensas',
});

// Normaliza: mayusculas, sin guiones ni espacios. "k7mx-q2rp" -> "K7MXQ2RP"
function normalizar(v) {
  return String(v || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Metodo no permitido' });
  }
  try {
    // Rate limiting por IP
    const forwarded = req.headers['x-forwarded-for'] || '';
    const ip = forwarded.split(',')[0].trim() || 'unknown';
    const { success } = await ratelimit.limit(ip);
    if (!success) {
      return res.status(429).json({ error: 'Demasiados intentos, espera unos minutos' });
    }

    const token = process.env.LOYVERSE_TOKEN;
    if (!token) return res.status(500).json({ error: 'Token no configurado' });

    const codigo = normalizar((req.body || {}).codigo);
    if (codigo.length < 8) {
      return res.status(400).json({ error: 'Codigo invalido' });
    }

    // Busca el codigo recorriendo todas las paginas de clientes
    let found = null;
    let cursor = null;
    let loops = 0;
    do {
      loops++;
      const url = 'https://api.loyverse.com/v1.0/customers?limit=250' +
        (cursor ? '&cursor=' + encodeURIComponent(cursor) : '');
      const response = await fetch(url, {
        headers: { Authorization: 'Bearer ' + token }
      });
      if (!response.ok) {
        return res.status(502).json({ error: 'Error consultando Loyverse' });
      }
      const data = await response.json();
      found = (data.customers || []).find(c =>
        !c.deleted_at && normalizar(c.customer_code) === codigo
      ) || null;
      cursor = data.cursor || null;
    } while (!found && cursor && loops < 40);

    res.setHeader('Cache-Control', 'no-store');

    if (!found) {
      return res.json({
        encontrado: false,
        mensaje: 'Codigo no encontrado. Pregunta en la tienda.'
      });
    }

    // Solo se regresa el credito: nada de nombre, telefono ni gasto
    return res.json({
      encontrado: true,
      credito: Number(found.total_points || 0)
    });
  } catch (error) {
    return res.status(500).json({ error: 'Error interno' });
  }
}
