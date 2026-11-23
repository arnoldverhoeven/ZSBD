// Mandje: lijnen, afhalen (standaard) of verzenden, en afrekenen via Mollie.
let subtotal = 0;
const form = document.getElementById('checkout-form');
function method() { return form.querySelector('input[name="method"]:checked').value; }

function renderTotals() {
  const m = method();
  const ship = shippingCents(subtotal, m);
  document.getElementById('address').hidden = m !== 'ship';
  document.getElementById('sum-sub').textContent = euro(subtotal);
  document.getElementById('sum-ship-label').textContent = m === 'pickup' ? 'Afhalen in Temse' : 'Verzending';
  document.getElementById('sum-ship').textContent = ship ? euro(ship) : 'Gratis';
  document.getElementById('sum-total').textContent = euro(subtotal + ship);
  const t = SHOPZO_STORE.free_shipping_threshold_cents;
  document.getElementById('sum-hint').textContent = m === 'ship' && ship && t ? `Nog ${euro(t - subtotal)} tot gratis verzending.` : '';
  const shipFree = shippingCents(subtotal, 'ship') === 0;
  document.getElementById('ship-cost').textContent = shipFree ? 'Gratis' : euro(SHOPZO_STORE.shipping_fee_cents ?? 695);
}

async function renderBag() {
  const linesEl = document.getElementById('bag-lines');
  const summary = document.getElementById('summary');
  const cart = getCart();
  if (!cart.length) {
    summary.hidden = true;
    linesEl.innerHTML = '<div class="empty"><p>Je mandje is nog leeg.</p><a class="btn" href="/winkel.html">Naar de winkel</a></div>';
    return;
  }

  let products;
  try {
    await shopzoFetchStore();
    products = await shopzoFetchProducts();
  } catch {
    linesEl.innerHTML = '<p class="grid-note">Je mandje kon niet geladen worden. Vernieuw de pagina om het opnieuw te proberen.</p>';
    return;
  }

  const lines = cart.map((l) => {
    const p = products.find((x) => x.id === l.product_id);
    if (!p) return null;
    const v = l.variant_id ? (p.variants || []).find((x) => x.id === l.variant_id) : null;
    if (l.variant_id && !v) return null;
    return { key: lineKey(l), p, v, qty: l.quantity, max: v ? v.stock : p.stock };
  }).filter(Boolean);

  if (!lines.length) { saveCart([]); return renderBag(); }

  linesEl.innerHTML = lines.map(({ key, p, v, qty, max }) => {
    const unit = p.sale_price_cents ?? p.price_cents;
    const img = (v && v.image_url) || p.image_url;
    return `<div class="bag-line">
      <a href="/product.html?id=${encodeURIComponent(p.id)}"><img ${imgAttrs(img, 200, '')}></a>
      <div>
        <h3>${esc(p.name)}</h3>
        ${v ? `<div class="variant">${esc((p.options[0] || {}).name || 'Keuze')}: ${esc(v.title)}</div>` : ''}
        ${qty > max ? `<div class="variant" style="color:#94532F">Nog maar ${max} beschikbaar</div>` : ''}
        <div class="actions">
          <span class="stepper">
            <button type="button" data-key="${esc(key)}" data-qty="${qty - 1}" aria-label="Eén minder">−</button>
            <span>${qty}</span>
            <button type="button" data-key="${esc(key)}" data-qty="${qty + 1}" aria-label="Eén meer" ${qty >= max ? 'disabled' : ''}>+</button>
          </span>
          <button type="button" class="remove" data-key="${esc(key)}" data-qty="0">Verwijderen</button>
        </div>
      </div>
      <div class="line-price">${euro(unit * qty)}</div>
    </div>`;
  }).join('') + '<p style="margin-top:22px"><a class="text-link" href="/winkel.html">Verder winkelen</a></p>';

  subtotal = lines.reduce((n, l) => n + (l.p.sale_price_cents ?? l.p.price_cents) * l.qty, 0);

  // Afhalen uitgezet in het dashboard? Dan enkel verzenden.
  if (!SHOPZO_STORE.pickup_enabled) {
    document.getElementById('m-pickup').hidden = true;
    form.querySelector('input[value="ship"]').checked = true;
  }
  // Online betalen pas mogelijk zodra Mollie gekoppeld is in het Shopzo-dashboard.
  const payOff = SHOPZO_STORE.checkout_enabled === false;
  document.getElementById('pay-off').hidden = !payOff;
  document.getElementById('f-submit').disabled = payOff;

  renderTotals();
  summary.hidden = false;
}

document.getElementById('bag-lines').addEventListener('click', (e) => {
  const b = e.target.closest('[data-key]');
  if (!b) return;
  setLineQuantity(b.dataset.key, Number(b.dataset.qty));
  renderBag();
});
form.addEventListener('change', (e) => { if (e.target.name === 'method') renderTotals(); });

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const val = (id) => document.getElementById(id).value.trim();
  const errEl = document.getElementById('f-error');
  const fail = (m) => { errEl.textContent = m; errEl.style.display = 'block'; };
  errEl.style.display = 'none';
  const m = method();
  const name = val('f-name');
  const email = val('f-email');
  const phone = val('f-phone');
  if (!name || !email) return fail('Vul je naam en e-mailadres in.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail('Dat e-mailadres klopt niet helemaal.');
  if (m === 'pickup' && !phone) return fail('Vul je gsm-nummer in, zodat we een afhaalmoment kunnen afspreken.');
  const address = { name, street: val('f-street'), house_number: val('f-number'), postal_code: val('f-postal'), city: val('f-city'), country: 'BE' };
  if (m === 'ship' && (!address.street || !address.house_number || !address.postal_code || !address.city)) return fail('Vul je volledige adres in.');

  const btn = document.getElementById('f-submit');
  btn.disabled = true;
  btn.textContent = 'Even geduld…';
  try {
    const { checkout_url } = await shopzoCheckout({ method: m, name, email, phone, address, note: val('f-note') });
    location.href = checkout_url;
  } catch (err) {
    fail(err.message);
    btn.disabled = false;
    btn.textContent = 'Bestellen en betalen';
  }
});

renderBag();
