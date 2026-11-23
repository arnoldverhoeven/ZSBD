// Dynamische sitemap: vaste pagina's + alle producten die nu online staan in Shopzo.
// Zo komen nieuwe producten vanzelf in Google, zonder de site opnieuw te publiceren.

const SITE = 'https://zsbd.be';
const STATIC = [
  ['/', '1.0', 'weekly'],
  ['/kerst.html', '0.9', 'weekly'],
  ['/kaarsen.html', '0.9', 'weekly'],
  ['/winkel.html', '0.8', 'daily'],
  ['/winkel.html?categorie=Voor%20dierenvrienden', '0.6', 'weekly']
];

const xmlEsc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

export default async () => {
  let products = [];
  try {
    const res = await fetch('https://api.shopzo.be/products?seller=zsbd', { signal: AbortSignal.timeout(4000) });
    if (res.ok) products = (await res.json()).products || [];
  } catch { /* sitemap zonder producten */ }

  const today = new Date().toISOString().slice(0, 10);
  const urls = [
    ...STATIC.map(([path, prio, freq]) => `<url><loc>${xmlEsc(SITE + path)}</loc><lastmod>${today}</lastmod><changefreq>${freq}</changefreq><priority>${prio}</priority></url>`),
    ...products.map((p) => {
      const img = p.image_url ? `<image:image><image:loc>${xmlEsc(p.image_url)}</image:loc></image:image>` : '';
      return `<url><loc>${xmlEsc(`${SITE}/product.html?id=${p.id}`)}</loc><changefreq>weekly</changefreq><priority>0.7</priority>${img}</url>`;
    })
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${urls.join('\n')}\n</urlset>\n`;
  return new Response(xml, { headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, max-age=3600' } });
};

export const config = { path: '/sitemap.xml' };
