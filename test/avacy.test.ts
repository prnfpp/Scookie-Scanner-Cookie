import assert from 'node:assert/strict';
import { test } from 'node:test';
import { checkAvacy } from '../src/cmp/adapters/avacy.js';
import { TEXTS, isPreferences } from '../src/cmp/heuristic.js';
import { ADAPTERS } from '../src/cmp/registry.js';
import { HOSTED_POLICY_HOSTS } from '../src/declared/find.js';

test('testi: "Accetta cookie" è un\'accettazione, "Accetta solo i necessari" no', () => {
  for (const t of ['Accetta cookie', 'Accetta i cookie', 'Accetta tutti i cookie', 'Accetto cookies', 'Accetta']) assert.ok(TEXTS.accept.test(t), t);
  assert.ok(!TEXTS.accept.test('Accetta solo i necessari'));
  assert.ok(!TEXTS.accept.test('Continua senza accettare'));
});

test('preferenze: "Maggiori informazioni" vale solo come pulsante, non come link a un\'altra pagina', () => {
  assert.ok(isPreferences({ text: 'Maggiori informazioni', href: null }));
  assert.ok(isPreferences({ text: 'Maggiori informazioni', href: 'https://esempio.it/#' }));
  assert.ok(isPreferences({ text: 'Maggiori informazioni', href: 'javascript:void(0)' }));
  assert.ok(!isPreferences({ text: 'Maggiori informazioni', href: 'https://esempio.it/cookie-policy/' }));
  assert.ok(isPreferences({ text: 'Personalizza', href: null }));
  assert.ok(!isPreferences({ text: 'Rifiuta tutto', href: null }));
});

test('avacy: registrato prima di TCF', () => {
  const ids = ADAPTERS.map((a) => a.id);
  assert.ok(ids.includes('avacy'));
  assert.ok(ids.indexOf('avacy') < ids.indexOf('tcf'));
});

test('avacy: verifica dello stato dopo rifiuto e accettazione', () => {
  const rejected = { purposes: { 1: false, 2: false }, customVendors: [{ id: 'd116', c: 0 }], gcm: [] };
  const accepted = { purposes: { 1: true, 2: true }, customVendors: [{ id: 'd116', c: 1 }], gcm: ['analytics_storage'] };
  assert.equal(checkAvacy(rejected, 'rifiuta').consistent, true);
  assert.equal(checkAvacy(accepted, 'rifiuta').consistent, false);
  assert.equal(checkAvacy(accepted, 'accetta').consistent, true);
  assert.equal(checkAvacy(rejected, 'accetta').consistent, false);
  // dopo "Disattiva tutto" e "Salva" Avacy restituisce un oggetto vuoto per le finalità
  assert.equal(checkAvacy({ purposes: {}, customVendors: [], gcm: [] }, 'rifiuta').consistent, true);
  assert.equal(checkAvacy(null, 'rifiuta').consistent, null);
});

test('informativa ospitata dal gestore del consenso', () => {
  assert.ok(HOSTED_POLICY_HOSTS.test('api.avacy.eu'));
  assert.ok(HOSTED_POLICY_HOSTS.test('www.iubenda.com'));
  assert.ok(!HOSTED_POLICY_HOSTS.test('avacy.eu.esempio.it'));
  assert.ok(!HOSTED_POLICY_HOSTS.test('notiubenda.com'));
});

test('avacy, personalizza: "solo statistica" = Google Analytics senza pubblicità né profilazione', async () => {
  const { checkAvacyStats, PERSONALIZERS } = await import('../src/cmp/personalize.js');
  assert.ok(PERSONALIZERS.avacy);
  const p = (on: string[]) => Object.fromEntries(['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'].map((k) => [k, on.includes(k)]));
  assert.equal(checkAvacyStats({ purposes: p(['1', '8', '9']), gcm: ['analytics_storage'] }).consistent, true);
  // pubblicità in Consent Mode o finalità 7 (misura degli annunci): non è solo statistica
  assert.equal(checkAvacyStats({ purposes: p(['1', '8', '9']), gcm: ['analytics_storage', 'ad_storage'] }).consistent, false);
  assert.equal(checkAvacyStats({ purposes: p(['1', '7', '8', '9']), gcm: ['analytics_storage'] }).consistent, false);
  // statistica non accettata
  assert.equal(checkAvacyStats({ purposes: p([]), gcm: [] }).consistent, false);
  assert.equal(checkAvacyStats(null).consistent, null);
});
