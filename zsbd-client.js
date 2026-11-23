/* ZSBD webshop: praat met de Shopzo API (api.shopzo.be). */

const SHOPZO_API_BASE = 'https://api.shopzo.be';
const SHOPZO_SELLER = 'zsbd';
const CART_KEY = `shopzo_cart_${SHOPZO_SELLER}`;
const PRODUCTS_CACHE_KEY = `shopzo_products_cache_${SHOPZO_SELLER}`;
const PRODUCTS_CACHE_TTL_MS = 5 * 60 * 1000;

// Contact (ook gebruikt als het online betalen nog niet actief is).
const CONTACT = {
  email: 'jenniferbeyens90@gmail.com',
  whatsapp: 'https://wa.me/32470138134'
};

// Volgorde van de categorieën in menu, filters en "Wat ik maak".
const CATEGORY_ORDER = ['Kerst', 'Kaarsen & schaaltjes', 'Beertjes met roosjes', 'Kaarten', 'Voor dierenvrienden'];
// Categorieën met een eigen (SEO-)pagina.
const CATEGORY_PAGES = { Kerst: '/kerst.html', 'Kaarsen & schaaltjes': '/kaarsen.html' };
function categoryUrl(cat) { return CATEGORY_PAGES[cat] || `/winkel.html?categorie=${encodeURIComponent(cat)}`; }

/* ---------- Winkelinstellingen (verzendkost, afhalen) uit het Shopzo-dashboard ---------- */
let SHOPZO_STORE = {
  checkout_enabled: false,
  shipping_fee_cents: 695,
  free_shipping_threshold_cents: 5000,
  pickup_enabled: true,
  pickup_instructions: null,
  ships_to_countries: ['BE'],
  country_names: { BE: 'België' }
};
let _storePromise = null;
function shopzoFetchStore() {
  if (_storePromise) return _storePromise;
  _storePromise = fetch(`${SHOPZO_API_BASE}/store?seller=${SHOPZO_SELLER}`)
    .then((r) => (r.ok ? r.json() : null))
    .then((d) => { if (d && d.store) SHOPZO_STORE = { ...SHOPZO_STORE, ...d.store }; return SHOPZO_STORE; })
    .catch(() => SHOPZO_STORE);
  return _storePromise;
}
function shippingCents(subtotal, method) {
  if (method === 'pickup') return 0;
  const t = SHOPZO_STORE.free_shipping_threshold_cents;
  if (t !== null && t !== undefined && subtotal >= t) return 0;
  return SHOPZO_STORE.shipping_fee_cents ?? 695;
}
function shippingText() {
  const fee = euro(SHOPZO_STORE.shipping_fee_cents ?? 695);
  const t = SHOPZO_STORE.free_shipping_threshold_cents;
  return t ? `${fee}, gratis vanaf ${euro(t)}` : fee;
}

/* ---------- Opslag (afgeschermd: privévensters kunnen fouten geven) ---------- */
function readJSON(store, key, fallback) { try { return JSON.parse(store.getItem(key)) ?? fallback; } catch { return fallback; } }
function writeJSON(store, key, value) { try { store.setItem(key, JSON.stringify(value)); } catch { /* niet bewaard */ } }

/* ---------- Mandje (een lijn = product, of product + variant) ---------- */
function getCart() { return readJSON(localStorage, CART_KEY, []); }
function saveCart(cart) { writeJSON(localStorage, CART_KEY, cart); renderCounts(); }
function lineKey(l) { return l.variant_id ? `${l.product_id}|${l.variant_id}` : String(l.product_id); }
function addToCart(productId, quantity, variantId) {
  const cart = getCart();
  const key = variantId ? `${productId}|${variantId}` : String(productId);
  const line = cart.find((l) => lineKey(l) === key);
  if (line) line.quantity += quantity;
  else cart.push(variantId ? { product_id: productId, variant_id: variantId, quantity } : { product_id: productId, quantity });
  saveCart(cart);
}
function setLineQuantity(key, quantity) {
  let cart = getCart();
  if (quantity < 1) cart = cart.filter((l) => lineKey(l) !== key);
  else { const l = cart.find((x) => lineKey(x) === key); if (l) l.quantity = quantity; }
  saveCart(cart);
}
function renderCounts() {
  const n = getCart().reduce((s, l) => s + l.quantity, 0);
  document.querySelectorAll('[data-count="bag"]').forEach((el) => { el.textContent = n; el.style.display = n ? 'inline-flex' : 'none'; });
}

/* ---------- API ---------- */
let _productsPromise = null;
async function shopzoFetchProducts() {
  const cached = readJSON(sessionStorage, PRODUCTS_CACHE_KEY, null);
  if (cached && Date.now() - cached.t < PRODUCTS_CACHE_TTL_MS) return cached.products;
  if (_productsPromise) return _productsPromise;
  _productsPromise = fetch(`${SHOPZO_API_BASE}/products?seller=${SHOPZO_SELLER}`)
    .then((r) => { if (!r.ok) throw new Error('De producten konden niet geladen worden.'); return r.json(); })
    .then((d) => { writeJSON(sessionStorage, PRODUCTS_CACHE_KEY, { products: d.products, t: Date.now() }); return d.products; })
    .finally(() => { _productsPromise = null; });
  return _productsPromise;
}

async function shopzoCheckout(details) {
  const cart = getCart();
  if (!cart.length) throw new Error('Je mandje is leeg.');
  const shipping = details.method === 'pickup'
    ? { method: 'pickup' }
    : { method: 'ship', address: details.address };
  const res = await fetch(`${SHOPZO_API_BASE}/checkout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      seller: SHOPZO_SELLER,
      customer: { name: details.name, email: details.email, phone: details.phone },
      shipping,
      note: details.note || null,
      locale: 'nl',
      items: cart.map((l) => (l.variant_id
        ? { product_id: l.product_id, variant_id: l.variant_id, quantity: l.quantity }
        : { product_id: l.product_id, quantity: l.quantity })),
      redirect_url: new URL(`/bedankt.html?methode=${details.method}`, window.location.origin).href
    })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data.error || '';
    if (/mollie/i.test(msg)) throw new Error('Online betalen is nog niet geactiveerd. Je mandje blijft bewaard; stuur Jennifer gerust een berichtje.');
    if (/stock/i.test(msg)) throw new Error('Een van de stukken in je mandje is intussen niet meer (genoeg) beschikbaar. Pas je mandje aan en probeer opnieuw.');
    if (/pickup/i.test(msg)) throw new Error('Afhalen is op dit moment niet mogelijk. Kies voor verzending.');
    throw new Error(msg || 'Afrekenen lukte niet. Probeer het zo meteen opnieuw.');
  }
  return data;
}

/* ---------- Producthulpjes ---------- */
function hasVariants(p) { return Array.isArray(p.variants) && p.variants.length > 0; }
function findVariant(p, values) { return p.variants.find((v) => v.option_values.every((x, i) => x === values[i])) || null; }
function valueAvailable(p, selected, idx, value) {
  return p.variants.some((v) => v.stock > 0 && v.option_values[idx] === value &&
    v.option_values.every((x, i) => i === idx || !selected[i] || selected[i] === x));
}
function galleryItems(p) {
  const alts = p.image_alts || [];
  const seen = new Set();
  return [p.image_url, ...(p.images || [])].map((url, i) => ({ url, alt: (alts[i] || '').trim() || p.name }))
    .filter((g) => g.url && !seen.has(g.url) && seen.add(g.url));
}
function galleryForSelection(p, selected) {
  const all = galleryItems(p);
  const opts = p.options || [];
  for (let i = 0; i < opts.length; i++) {
    const urls = opts[i] && opts[i].images && opts[i].images[selected[i]];
    if (Array.isArray(urls) && urls.length) return urls.map((u) => all.find((g) => g.url === u) || { url: u, alt: p.name });
  }
  return all;
}
function isUnique(p) { return (p.tags || []).includes('uniek') || (p.specs || []).some((s) => /^uniek/i.test(s.label)); }
function sortByCategory(list) {
  const rank = (c) => { const i = CATEGORY_ORDER.indexOf(c); return i < 0 ? 99 : i; };
  return [...list].sort((a, b) => rank(a.category) - rank(b.category));
}

/* ---------- Foto's: verkleind via de image-CDN van Netlify, origineel als reserve ---------- */
const OWN_HOSTS = ['https://zsbd.be/', 'https://www.zsbd.be/', 'https://zsbd.netlify.app/'];
const SITE_URL = 'https://zsbd.be';
function optImg(url, width) {
  if (!url) return url;
  let path = null;
  const own = OWN_HOSTS.find((h) => url.startsWith(h));
  if (own) path = url.slice(own.length - 1);
  else if (url.indexOf('/storage/v1/object/public/product-images/') !== -1) path = url;
  if (!path || location.hostname === 'localhost' || location.protocol === 'file:') return url;
  return `/.netlify/images?url=${encodeURIComponent(path)}&w=${width}&fm=webp&q=80`;
}
function imgAttrs(url, width, alt) {
  const src = optImg(url, width);
  return `src="${esc(src)}"${src !== url ? ` data-orig="${esc(url)}"` : ''} alt="${esc(alt || '')}" loading="lazy" decoding="async"`;
}
document.addEventListener('error', (e) => {
  const t = e.target;
  if (t && t.tagName === 'IMG' && t.dataset.orig && !t.dataset.fallback) { t.dataset.fallback = '1'; t.src = t.dataset.orig; }
}, true);

/* ---------- Opmaak ---------- */
function esc(s) { const d = document.createElement('div'); d.textContent = s ?? ''; return d.innerHTML.replace(/"/g, '&quot;'); }
function euro(cents) { return (cents / 100).toLocaleString('nl-BE', { style: 'currency', currency: 'EUR' }); }
function priceHtml(p) {
  return p.sale_price_cents
    ? `<span class="price">${euro(p.sale_price_cents)}<span class="price-old">${euro(p.price_cents)}</span></span>`
    : `<span class="price">${euro(p.price_cents)}</span>`;
}
function productCard(p) {
  let tag = '';
  if (p.stock <= 0) tag = '<span class="card-tag card-tag--out">Uitverkocht</span>';
  else if (p.sale_price_cents) tag = '<span class="card-tag">Promo</span>';
  else if (isUnique(p)) tag = '<span class="card-tag card-tag--unique">Uniek stuk</span>';
  const opt = (p.options || [])[0];
  const optText = opt && opt.values.length > 1 ? `${opt.values.length} keuzes` : '';
  return `
    <a class="card" href="/product.html?id=${encodeURIComponent(p.id)}">
      <div class="card-photo">
        <img ${imgAttrs(p.image_url, 640, (p.image_alts || [])[0] || p.name)}>
        ${tag}
      </div>
      <div class="card-body">
        ${p.category ? `<div class="card-cat">${esc(p.category)}</div>` : ''}
        <div class="card-name">${esc(p.name)}</div>
        <div class="card-meta">${priceHtml(p)}${optText ? `<span class="card-opts">${esc(optText)}</span>` : ''}</div>
      </div>
    </a>`;
}

/* Actief menu-item markeren. */
function markNav(name) {
  document.querySelectorAll('.main-nav a').forEach((a) => {
    if (a.dataset.nav === name) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
}

/* SEO: canonical en og:url bijwerken voor pagina's die met parameters werken. */
function setCanonical(pathAndQuery) {
  const href = SITE_URL + pathAndQuery;
  let link = document.querySelector('link[rel="canonical"]');
  if (!link) { link = document.createElement('link'); link.rel = 'canonical'; document.head.appendChild(link); }
  link.href = href;
  const og = document.querySelector('meta[property="og:url"]');
  if (og) og.setAttribute('content', href);
}

/* Velden met data-ship vullen met de actuele verzendkost uit het dashboard. */
async function fillShippingTexts() {
  await shopzoFetchStore();
  document.querySelectorAll('[data-ship]').forEach((el) => { el.textContent = shippingText(); });
}

document.addEventListener('DOMContentLoaded', () => { renderCounts(); fillShippingTexts(); });

/* Product-gegevens voor Google (schema.org/Product). Ook gebruikt door de edge function. */
function productJsonLd(p) {
  const url = `${SITE_URL}/product.html?id=${encodeURIComponent(p.id)}`;
  const price = ((p.sale_price_cents ?? p.price_cents) / 100).toFixed(2);
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.name,
    description: p.description || undefined,
    image: galleryItems(p).map((g) => g.url),
    category: p.category || undefined,
    brand: { '@type': 'Brand', name: 'ZSBD' },
    url,
    offers: {
      '@type': 'Offer',
      url,
      priceCurrency: 'EUR',
      price,
      availability: p.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      itemCondition: 'https://schema.org/NewCondition',
      seller: { '@type': 'Organization', name: 'ZSBD' }
    }
  };
}
