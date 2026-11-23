// Startpagina: "Wat ik maak" (categorieën) en de producten die nu online staan.
const MAKES = {
  Kerstpakketten: { text: 'Handgemaakte kerstgeschenken, ook op maat', img: '/img/zsbd-kerstpakket-warm-welkom.jpg' },
  'Geurkaarsen & schaaltjes': { text: 'Geurkaarsen in handgevormde schaaltjes', img: '/img/zsbd-kaarsschaaltje-koper.jpg' },
  Kerst: { text: 'Kerststukken en kerstdecoratie', img: '/img/zsbd-kerststuk-roze-droom.jpg' },
  'Beertjes met roosjes': { text: 'Beertjes afgewerkt met bloemen' },
  Kaarten: { text: 'Handgemaakt, voor elk moment' },
  'Voor dierenvrienden': { text: 'Voor wie thuis een hond of kat heeft', img: '/img/zsbd-kerstbal-ik-ben-de-baas.jpg' }
};

(async function () {
  const grid = document.getElementById('home-products');
  const makesEl = document.getElementById('home-makes');
  let products = [];
  try {
    products = await shopzoFetchProducts();
  } catch {
    grid.innerHTML = '<p class="grid-note">De producten konden niet geladen worden. Vernieuw de pagina om het opnieuw te proberen.</p>';
  }

  makesEl.innerHTML = CATEGORY_ORDER.map((cat) => {
    const m = MAKES[cat] || { text: '' };
    const inCat = products.filter((p) => p.category === cat);
    // Foto: eerst een productfoto uit die categorie, anders de vaste foto.
    const photo = (inCat.find((p) => p.image_url) || {}).image_url || m.img;
    if (!inCat.length) {
      return `<a class="make make--soon" href="/#over">
        <div class="make-text"><h3>${esc(cat)}</h3><span>${esc(m.text)}</span><span class="soon">Binnenkort online, vraag gerust</span></div>
      </a>`;
    }
    return `<a class="make" href="${categoryUrl(cat)}">
      ${photo ? `<div class="make-photo"><img ${imgAttrs(photo, 480, cat)}></div>` : ''}
      <div class="make-text"><h3>${esc(cat)}</h3><span>${esc(m.text)}</span></div>
    </a>`;
  }).join('');

  if (products.length) grid.innerHTML = products.slice(0, 8).map(productCard).join('');
  else if (!grid.querySelector('.grid-note')?.textContent.includes('niet geladen')) grid.innerHTML = '<p class="grid-note">Binnenkort staan hier de eerste creaties.</p>';
})();
