// Terug van Mollie: de bestelling is geplaatst, het mandje begint weer leeg.
saveCart([]);
if (new URLSearchParams(location.search).get('methode') === 'ship') {
  document.getElementById('thanks-pickup').hidden = true;
  document.getElementById('thanks-ship').hidden = false;
}
