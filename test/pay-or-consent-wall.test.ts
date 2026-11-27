import assert from 'node:assert/strict';
import { test } from 'node:test';
import { chromium } from 'playwright';
import { heuristicChoose } from '../src/cmp/heuristic.js';

// Banner come quello di gazzetta.it: nelle preferenze "RIFIUTA TUTTO" spegne solo gli interruttori (non chiude il
// banner da solo); il salvataggio è un unico pulsante "SALVA E ABBONATI" che porta a un'offerta a pagamento.
const PAY_OR_CONSENT_WALL = `<div id="notice" style="position:fixed;inset:0;background:#fff">
  <p>Cookie: rifiuta o abbonati per navigare senza pubblicità profilata.</p>
  <button id="prefs">Preferenze</button>
  <div id="panel" style="display:none">
    <button id="rejectall" onclick="window.rejectClicked=true">RIFIUTA TUTTO</button>
    <button id="save" onclick="document.getElementById('notice').remove()">SALVA E ABBONATI</button>
  </div>
  <script>document.getElementById('prefs').onclick = () => { document.getElementById('panel').style.display = 'block'; };</script>
</div>`;

// Stesso schema, ma qui il salvataggio è gratuito (es. un utente che ha già accettato e ora rivede la scelta).
const FREE_SAVE_AFTER_REJECT = `<div id="notice" style="position:fixed;inset:0;background:#fff">
  <p>Cookie: gestisci le tue preferenze.</p>
  <button id="prefs">Preferenze</button>
  <div id="panel" style="display:none">
    <button id="rejectall" onclick="window.rejectClicked=true">RIFIUTA TUTTO</button>
    <button id="save" onclick="document.getElementById('notice').remove()">SALVA</button>
  </div>
  <script>document.getElementById('prefs').onclick = () => { document.getElementById('panel').style.display = 'block'; };</script>
</div>`;

test('pay or consent wall: "Rifiuta tutto" nelle preferenze non chiude da solo il banner, il salvataggio porta a un\'offerta a pagamento', async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.setContent(PAY_OR_CONSENT_WALL);
    const r = await heuristicChoose(page, 'rifiuta');
    assert.equal(r.ok, false, JSON.stringify(r));
    assert.match(r.detail, /offerta a pagamento.*SALVA E ABBONATI/);
    // il pulsante di rifiuto è stato comunque provato, ma quello di salvataggio no: resta cliccabile
    assert.ok(await page.evaluate(() => (window as unknown as { rejectClicked?: boolean }).rejectClicked));
    assert.equal(await page.evaluate(() => !!document.getElementById('notice')), true);
  } finally {
    await browser.close();
  }
});

test('nessun pay-wall: "Rifiuta tutto" poi un salvataggio gratuito vengono entrambi cliccati con successo', async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.setContent(FREE_SAVE_AFTER_REJECT);
    const r = await heuristicChoose(page, 'rifiuta');
    assert.ok(r.ok, JSON.stringify(r));
    assert.match(r.detail, /SALVA/);
    assert.equal(await page.evaluate(() => !!document.getElementById('notice')), false);
  } finally {
    await browser.close();
  }
});
