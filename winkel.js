// Winkel: filter op categorie (in de URL, zodat links gedeeld kunnen worden) en sorteren.
const params = new URLSearchParams(location.search);
const state = { cat: params.get('categorie') || '', sort: params.get('sorteer') || '' };
let products = [];

const INTRO = {
  Kerst: 'Kerststukken en decoratie, met de hand gemaakt. Vaak uniek: op is op.',
  'Kaarsen & schaaltjes': 'Handgevormde schaaltjes, met of zonder kaars.',
  'Beertjes met roosjes': 'Zachte beertjes, versierd met roosjes.',
  Kaarten: 'Handgemaakte kaarten voor elk moment.',
  'Voor dierenvrienden': 'Cadeautjes voor wie thuis een hond of kat heeft.'
};

function effective(p) { return p.sale_price_cents ?? p.price_cents; }

function syncUrl() {
  const q = new URLSearchParams();
  if (state.cat) q.set('categorie', state.cat);
  if (state.sort) q.set('sorteer', state.sort);
  history.replaceState(null, '', q.toString() ? `?${q}` : location.pathname);
}

function renderFilters() {
  const cats = [...new Set(products.map((p) => p.category).filter(Boolean))];
  cats.sort((a, b) => {
    const r = (c) => { const i = CATEGORY_ORDER.indexOf(c); return i < 0 ? 99 : i; };
    return r(a) - r(b);
  });
  document.getElementById('filter-cat').innerHTML = ['', ...cats].map((c) =>
    `<button type="button" class="chip" data-cat="${esc(c)}" aria-pressed="${state.cat === c}">${esc(c || 'Alles')}</button>`).join('');
  document.getElementById('sort').value = state.sort;
}

function apply() {
  let list = products.filter((p) => !state.cat || p.category === state.cat);
  if (state.sort === 'price-asc') list = [...list].sort((a, b) => effective(a) - effective(b));
  if (state.sort === 'price-desc') list = [...list].sort((a, b) => effective(b) - effective(a));

  const title = state.cat || 'Alle creaties';
  document.getElementById('shop-title').textContent = title;
  document.getElementById('crumb-current').textContent = state.cat || 'Winkel';
  document.getElementById('shop-intro').textContent = INTRO[state.cat] || 'Alles met de hand gemaakt in Temse. Bestel online en haal gratis af.';
  document.title = `${title} | ZSBD`;
  markNav(state.cat || 'Alles');

  document.getElementById('shop-grid').innerHTML = list.length
    ? list.map(productCard).join('')
    : `<p class="grid-note">Hier staat nog niets online. Op zoek naar iets speciaals? <a class="text-link" href="https://wa.me/32470138134" rel="noopener">Stuur me een berichtje</a>.</p>`;
  syncUrl();
}

document.getElementById('filters').addEventListener('click', (e) => {
  const b = e.target.closest('[data-cat]');
  if (!b) return;
  state.cat = b.dataset.cat;
  renderFilters();
  apply();
});
document.getElementById('sort').addEventListener('change', (e) => { state.sort = e.target.value; apply(); });

(async function () {
  try {
    products = await shopzoFetchProducts();
  } catch {
    document.getElementById('shop-grid').innerHTML = '<p class="grid-note">De producten konden niet geladen worden. Vernieuw de pagina om het opnieuw te proberen.</p>';
    return;
  }
  renderFilters();
  apply();
})();
