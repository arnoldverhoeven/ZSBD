// Landingspagina's (kaarsen, kerst): toont de passende producten.
const LANDING = {
  kaars: (p) => p.category === 'Kaarsen & schaaltjes' || (p.tags || []).includes('kaars'),
  kerst: (p) => p.category === 'Kerst',
  'kerst-extra': (p) => p.category !== 'Kerst'
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
  if (location.pathname.includes('kerst')) markNav('Kerst');
  if (location.pathname.includes('kaarsen')) markNav('Kaarsen & schaaltjes');
})();
