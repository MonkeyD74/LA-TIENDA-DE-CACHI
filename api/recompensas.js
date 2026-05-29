export default async function handler(req, res) {
  var token = process.env.LOYVERSE_TOKEN;
  if (!token) { return res.status(500).json({ error: 'Token no configurado' }); }
  var phone = (req.query.phone || '').replace(/[^0-9]/g, '');
  if (phone.length < 7) { return res.status(400).json({ error: 'Numero invalido' }); }
  try {
    var allCustomers = [], cursor = null, loops = 0;
    do {
      loops++;
      var url = cursor ? 'https://api.loyverse.com/v1.0/customers?limit=250&cursor=' + cursor : 'https://api.loyverse.com/v1.0/customers?limit=250';
      var response = await fetch(url, { headers: { 'Authorization': 'Bearer ' + token } });
      var data = await response.json();
      allCustomers = allCustomers.concat(data.customers || []);
      cursor = data.cursor || null;
    } while (cursor && loops < 10);
    var phoneLast = phone.slice(-10);
    var found = null;
    for (var i = 0; i < allCustomers.length; i++) {
      var c = allCustomers[i];
      var cPhone = (c.phone_number || '').replace(/[^0-9]/g, '');
      if (cPhone.slice(-10) === phoneLast) { found = c; break; }
    }
    if (!found) { return res.json({ encontrado: false, mensaje: 'No encontramos tu numero. Pregunta en la tienda para registrarte.' }); }
    var puntos = found.total_points || 0;
    var puntosParaPremio = 100;
    var valorPremio = 50;
    res.setHeader('Cache-Control', 'no-cache, no-store');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.json({ encontrado: true, nombre: found.name || 'Cliente', puntos: puntos, visitas: found.total_visits || 0, gastado: found.total_money_spent || 0, progreso: Math.min(100, Math.round((puntos / puntosParaPremio) * 100)), falta: Math.max(0, puntosParaPremio - puntos), puntosParaPremio: puntosParaPremio, valorPremio: valorPremio, tienePremio: puntos >= puntosParaPremio });
  } catch (error) { res.status(500).json({ error: error.message }); }
}
