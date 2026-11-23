# zsbd.be

Webshop van ZSBD (Jennifer Beyens, Temse), gebouwd op [Shopzo](https://www.shopzo.be).

- Statische site, gehost op Netlify (project `zsbd`), domein zsbd.be.
- Producten, voorraad, bestellingen, Mollie en Sendcloud worden beheerd in het Shopzo-dashboard (app.shopzo.be), verkoper `zsbd`.
- De site praat met `https://api.shopzo.be` (zie `zsbd-client.js`): `/products`, `/store` en `/checkout`.
- Afhalen in Temse is de standaard bij afrekenen; verzenden kan ook (kosten en drempel komen uit het dashboard).

## Aanpassen
- Teksten en opbouw van de pagina's: `index.html`, `winkel.html`, … (header en footer zijn in elke pagina gelijk).
- Huisstijl: `zsbd.css`.
- Bij het klonen van deze winkel voor een andere klant: pas `SHOPZO_SELLER` aan in `zsbd-client.js` (de mandje-sleutel volgt automatisch).
