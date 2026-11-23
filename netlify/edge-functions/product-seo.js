// Zet per product de titel, beschrijving, canonical, Open Graph en schema.org/Product
// al in de HTML van product.html, zodat Google en sociale media ze zien zonder JavaScript.
// Lukt het ophalen niet (snel genoeg), dan gaat de gewone pagina ongewijzigd door.

const API = 'https://api.shopzo.be/products?seller=zsbd';
const SITE = 'https://zsbd.be';

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export default async (request, context) => {
  const url = new URL(request.url);
  const id = url.searchParams.get('id') || '';
  const response = await context.next();
  if (!/^[0-9a-f-]{36}$/i.test(id)) return response;

  try {
    const res = await fetch(`${API}&id=${id}`, { signal: AbortSignal.timeout(2500) });
    if (!res.ok) return response;
    // Met ?id= geeft de API { store, product } terug (zonder id: { products: [...] }).
    const data = await res.json();
    const p = data.product || (data.products && data.products[0]);
    if (!p) return response;

    const pageUrl = `${SITE}/product.html?id=${id}`;
    const title = `${p.name} | Handgemaakt in Temse | ZSBD`;
    const desc = (p.description || `${p.name}, met de hand gemaakt in Temse.`).replace(/\s+/g, ' ').slice(0, 155);
    const images = [p.image_url, ...(p.images || [])].filter(Boolean);
    const ld = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: p.name,
      description: p.description || undefined,
      image: images,
      category: p.category || undefined,
      brand: { '@type': 'Brand', name: 'ZSBD' },
      url: pageUrl,
      offers: {
        '@type': 'Offer',
        url: pageUrl,
        priceCurrency: 'EUR',
        price: ((p.sale_price_cents ?? p.price_cents) / 100).toFixed(2),
        availability: p.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
        itemCondition: 'https://schema.org/NewCondition',
        seller: { '@type': 'Organization', name: 'ZSBD' }
      }
    };

    let html = await response.text();
    html = html
      .replace(/<title>[^<]*<\/title>/, `<title>${esc(title)}</title>`)
      .replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${esc(desc)}">`)
      .replace(/<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${esc(title)}">`)
      .replace(/<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${esc(desc)}">`)
      .replace(/<meta property="og:url" content="[^"]*">/, `<meta property="og:url" content="${esc(pageUrl)}">`)
      .replace(/<meta property="og:type" content="[^"]*">/, '<meta property="og:type" content="product">')
      .replace(/<meta property="og:image" content="[^"]*">/, `<meta property="og:image" content="${esc(images[0] || '')}">`)
      .replace('</head>', `<link rel="canonical" href="${esc(pageUrl)}">\n<script type="application/ld+json" data-product-ld="1">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>\n</head>`);

    const headers = new Headers(response.headers);
    headers.delete('content-length');
    headers.set('content-type', 'text/html; charset=utf-8');
    return new Response(html, { status: response.status, headers });
  } catch {
    return response;
  }
};

export const config = { path: '/product.html' };
