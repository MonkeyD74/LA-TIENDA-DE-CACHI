export default async function handler(req, res) {
  const token = process.env.LOYVERSE_TOKEN;
  if (!token) {
    return res.status(500).json({ error: 'Token no configurado' });
  }
  try {
    let allItems = [];
    let cursor = null;
    do {
      const url = cursor
        ? `https://api.loyverse.com/v1.0/items?limit=250&cursor=${cursor}`
        : `https://api.loyverse.com/v1.0/items?limit=250`;
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      allItems = allItems.concat(data.items || []);
      cursor = data.cursor || null;
    } while (cursor);
    const catRes = await fetch('https://api.loyverse.com/v1.0/categories?limit=250', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const catData = await catRes.json();
    const categories = {};
    (catData.categories || []).forEach(c => { categories[c.id] = c.name; });
    const productos = allItems
      .map(item => {
        const v = item.variants?.[0] || {};
        const store = v.stores?.[0] || {};
        const precio = store.price || v.default_price || v.price || 0;
        const stock = store.in_stock != null ? Math.max(0, Math.floor(store.in_stock)) : 0;
        return {
          nombre: item.item_name || '',
          precio: precio,
          cat: categories[item.category_id] || 'Sin categoria',
          stock: stock,
          imagen: item.image_url || '',
        };
      })
      .filter(p => p.nombre && p.precio > 0)
      .sort((a, b) => a.cat.localeCompare(b.cat) || a.nombre.localeCompare(b.nombre));
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=60');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.json({ productos, total: productos.length, timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(500).json({ error: 'Error conectando con Loyverse', detail: error.message });
  }
}
