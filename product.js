// Productpagina: foto's, keuzes (bv. geur of kleur), voorraad en in het mandje.
(async function () {
  const id = new URLSearchParams(location.search).get('id');
  const loading = document.getElementById('pd-loading');
  let products = [];
  try { products = await shopzoFetchProducts(); } catch { /* hieronder afgehandeld */ }
  const p = products.find((x) => x.id === id);
  if (!p) {
    loading.innerHTML = 'Dit stuk vond ik niet terug, misschien is het intussen verkocht. <a class="text-link" href="winkel.html">Bekijk de winkel</a>.';
    return;
  }

  document.title = `${p.name} | ZSBD`;
  document.querySelector('meta[name="description"]').setAttribute('content', (p.description || '').slice(0, 155));
  const crumbCat = document.getElementById('pd-crumb-cat');
  crumbCat.textContent = p.category || 'Winkel';
  crumbCat.href = p.category ? `winkel.html?categorie=${encodeURIComponent(p.category)}` : 'winkel.html';
  document.getElementById('pd-crumb-name').textContent = p.name;
  document.getElementById('pd-cat').textContent = p.category || '';
  document.getElementById('pd-name').textContent = p.name;
  document.getElementById('pd-desc').textContent = p.description || '';
  document.getElementById('pd-price').innerHTML = p.sale_price_cents
    ? `${euro(p.sale_price_cents)}<span class="price-old">${euro(p.price_cents)}</span>`
    : euro(p.price_cents);
  markNav(p.category);

  const specs = (p.specs || []).filter((s) => s.label && s.value);
  document.getElementById('pd-specs').innerHTML = specs.map((s) => `<div><dt>${esc(s.label)}</dt><dd>${esc(s.value)}</dd></div>`).join('');

  /* ---- Foto's ---- */
  const imgEl = document.getElementById('pd-img');
  const thumbsEl = document.getElementById('pd-thumbs');
  let gallery = [];
  function show(i) {
    if (!gallery.length) return;
    const g = gallery[i];
    imgEl.dataset.fallback = '';
    imgEl.dataset.orig = g.url;
    imgEl.src = optImg(g.url, 1100);
    imgEl.alt = g.alt;
    thumbsEl.querySelectorAll('.pd-thumb').forEach((t, k) => t.setAttribute('aria-current', k === i));
  }
  function setGallery(items) {
    const same = items.length === gallery.length && items.every((g, i) => g.url === gallery[i].url);
    if (same) return;
    gallery = items;
    thumbsEl.innerHTML = gallery.length > 1
      ? gallery.map((g, i) => `<button type="button" class="pd-thumb" data-i="${i}" aria-label="Foto ${i + 1}"><img ${imgAttrs(g.url, 180, '')}></button>`).join('')
      : '';
    show(0);
  }
  thumbsEl.addEventListener('click', (e) => { const t = e.target.closest('.pd-thumb'); if (t) show(Number(t.dataset.i)); });

  /* ---- Keuzes ---- */
  const variants = hasVariants(p);
  const options = variants ? p.options : [];
  // Start met de eerste keuze die nog beschikbaar is.
  const selected = options.map(() => null);
  options.forEach((o, i) => { selected[i] = o.values.find((val) => valueAvailable(p, selected, i, val)) || null; });
  const optionsEl = document.getElementById('pd-options');
  const hintEl = document.getElementById('pd-hint');
  const stockEl = document.getElementById('pd-stock');
  const addBtn = document.getElementById('pd-add');

  function renderOptions() {
    optionsEl.innerHTML = options.map((o, i) => {
      const values = o.values.filter((val) => p.variants.some((v) => v.option_values[i] === val));
      const buttons = values.map((val) => {
        const ok = valueAvailable(p, selected.map((x, k) => (k < i ? x : null)), i, val);
        return `<button type="button" class="opt${ok ? '' : ' soldout'}" data-i="${i}" data-v="${esc(val)}" aria-pressed="${selected[i] === val}" aria-label="${esc(val + (ok ? '' : ', uitverkocht'))}">${esc(val)}</button>`;
      }).join('');
      return `<div class="pd-option" role="group" aria-label="${esc(o.name)}">
        <div class="pd-option-head"><strong>${esc(o.name)}</strong>${selected[i] ? ` <span class="chosen">${esc(selected[i])}</span>` : ''}</div>
        <div class="pd-values">${buttons}</div>
      </div>`;
    }).join('');
  }
  function currentVariant() { return variants && selected.every(Boolean) ? findVariant(p, selected) : null; }

  function render() {
    setGallery(variants ? galleryForSelection(p, selected) : galleryItems(p));
    if (variants) renderOptions();
    const v = currentVariant();
    const stock = variants ? (v ? v.stock : null) : p.stock;
    addBtn.disabled = p.stock <= 0 || stock === 0;
    addBtn.textContent = p.stock <= 0 ? 'Uitverkocht' : stock === 0 ? 'Niet meer beschikbaar in deze keuze' : 'In mijn mandje';
    const unique = isUnique(p);
    if (p.stock <= 0) stockEl.textContent = 'Dit stuk is uitverkocht. Vraag gerust of ik er nog een kan maken.';
    else if (stock === null) stockEl.textContent = `Kies eerst je ${options[selected.findIndex((x) => !x)].name.toLowerCase()}.`;
    else if (stock === 0) stockEl.textContent = 'Deze keuze is uitverkocht. Kies een andere.';
    else if (unique && stock === 1) stockEl.innerHTML = '<span class="low">Uniek stuk:</span> er is er maar één van.';
    else if (stock <= 3) stockEl.innerHTML = `<span class="low">Nog ${stock} beschikbaar.</span>`;
    else stockEl.textContent = 'Beschikbaar.';
  }

  optionsEl.addEventListener('click', (e) => {
    const b = e.target.closest('[data-v]');
    if (!b) return;
    selected[Number(b.dataset.i)] = b.dataset.v;
    hintEl.textContent = '';
    optionsEl.classList.remove('pd-missing');
    render();
  });

  addBtn.addEventListener('click', () => {
    if (variants) {
      const missing = options.find((o, i) => !selected[i]);
      if (missing) {
        hintEl.textContent = `Kies eerst je ${missing.name.toLowerCase()}.`;
        optionsEl.classList.add('pd-missing');
        return;
      }
      const v = currentVariant();
      if (!v || v.stock <= 0) return;
      addToCart(p.id, 1, v.id);
    } else {
      addToCart(p.id, 1);
    }
    location.href = 'mandje.html';
  });

  render();

  /* ---- Ook bekijken: eerst dezelfde categorie ---- */
  const related = [...products.filter((x) => x.id !== p.id && x.category === p.category), ...products.filter((x) => x.id !== p.id && x.category !== p.category)].slice(0, 4);
  if (related.length) {
    document.getElementById('related-grid').innerHTML = related.map(productCard).join('');
    document.getElementById('related').hidden = false;
  }

  loading.hidden = true;
  document.getElementById('pd-content').hidden = false;
})();
