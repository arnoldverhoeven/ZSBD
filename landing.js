// Landingspagina's (geurkaarsen, kerstpakketten): toont de passende producten.
const LANDING = {
  geurkaars: (p) => p.category === 'Geurkaarsen & schaaltjes' || (p.tags || []).includes('geurkaars'),
  kerstpakket: (p) => p.category === 'Kerstpakketten',
  'kerst-extra': (p) => p.category !== 'Kerstpakketten'
};

(async function () {
  const grids = [...document.querySelectorAll('[data-landing]')];
  let products = [];
  try {
    products = await shopzoFetchProducts();
  } catch {
    grids.forEach((g) => { g.innerHTML = '<p class="grid-note">De producten konden niet geladen worden. Vernieuw de pagina om het opnieuw te proberen.</p>'; });
    return;
  }
  grids.forEach((g) => {
    const list = products.filter(LANDING[g.dataset.landing] || (() => false));
    g.innerHTML = list.length
      ? sortByCategory(list).slice(0, 8).map(productCard).join('')
      : '<p class="grid-note">Binnenkort weer beschikbaar. Op zoek naar iets speciaals? <a class="text-link" href="https://wa.me/32470138134" rel="noopener">Stuur ons een berichtje</a>.</p>';
  });
  if (location.pathname.includes('kerstpakket')) markNav('Kerstpakketten');
  if (location.pathname.includes('geurkaars')) markNav('Geurkaarsen & schaaltjes');
})();
