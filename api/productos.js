export default async function handler(req, res) {
  const token = process.env.LOYVERSE_TOKEN;
  if (!token) {
    return res.status(500).json({ error: 'Token no configurado' });
  }
  try {
    let allItems = [];
    let cursor = null;
    var loops = 0;
    do {
      loops++;
      var url = cursor
        ? 'https://api.loyverse.com/v1.0/items?limit=250&cursor=' + cursor
        : 'https://api.loyverse.com/v1.0/items?limit=250';
      var response = await fetch(url, {
        headers: { 'Authorization': 'Bearer ' + token }
      });
      var data = await response.json();
      if (data.errors) {
        return res.status(500).json({ error: 'Loyverse error', details: data.errors });
      }
      allItems = allItems.concat(data.items || []);
      cursor = data.cursor || null;
    } while (cursor && loops < 20);
    var catRes = await fetch('https://api.loyverse.com/v1.0/categories?limit=250', {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    var catData = await catRes.json();
    var categories = {};
    (catData.categories || []).forEach(function(c) { categories[c.id] = c.name; });
    var productos = allItems
      .map(function(item) {
        var v = item.variants && item.variants[0] ? item.variants[0] : {};
        var stores = v.stores || [];
        var store = stores[0] || {};
        var precio = store.price !== undefined && store.price !== null ? store.price : (v.default_price || 0);
        var stock = store.in_stock !== undefined && store.in_stock !== null ? Math.max(0, Math.floor(store.in_stock)) : 0;
        return {
          nombre: item.item_name || '',
          precio: precio,
          cat: categories[item.category_id] || 'Sin categoria',
          stock: stock,
          imagen: item.image_url || ''
        };
      })
      .filter(function(p) { return p.nombre && p.precio > 0; })
      .sort(function(a, b) { return a.cat.localeCompare(b.cat) || a.nombre.localeCompare(b.nombre); });
    res.setHeader('Cache-Control', 'public, s-maxage=120, stale-while-revalidate=600');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.json({
      productos: productos,
      total: productos.length,
      totalRaw: allItems.length,
      categorias: Object.keys(categories).length,
      loops: loops,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message, stack: error.stack });
  }
}
