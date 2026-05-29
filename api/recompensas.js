export default async function handler(req, res) {
  try {
    const token = process.env.LOYVERSE_TOKEN;
    if (!token) return res.status(500).json({ error: 'Token no configurado' });

    const phone = String(req.query.phone || '').replace(/[^0-9]/g, '');
    if (phone.length < 7) return res.status(400).json({ error: 'Numero invalido' });

    const response = await fetch('https://api.loyverse.com/v1.0/customers?limit=250', {
      headers: { Authorization: 'Bearer ' + token }
    });

    if (!response.ok) {
      return res.status(response.status).json({
        error: 'Error consultando Loyverse',
        detalle: await response.text()
      });
    }

    const data = await response.json();
    const phoneLast = phone.slice(-10);

    const found = (data.customers || []).find(c => {
      const cPhone = String(c.phone_number || '').replace(/[^0-9]/g, '');
      return cPhone.slice(-10) === phoneLast;
    });

    if (!found) {
      return res.json({
        encontrado: false,
        mensaje: 'No encontramos tu numero. Pregunta en la tienda para registrarte.'
      });
    }

    const puntos = Number(found.total_points || 0);
    const gastado = Number(found.total_money_spent || 0);
    const credito = +(puntos * 0.01).toFixed(2);

    return res.json({
      encontrado: true,
      nombre: found.name || 'Cliente',
      telefono: found.phone_number || '',
      puntos,
      gastado,
      credito,
      mensaje: 'Credito acumulado calculado desde puntos'
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
