import assert from 'node:assert/strict';
import { test } from 'node:test';
import { chromium } from 'playwright';
import { heuristicChoose, scan } from '../src/cmp/heuristic.js';

// Banner come quello di Amazon: i comandi sono <input type="submit"> trasparenti (opacità 0.01) sopra un'etichetta visibile.
const BANNER = `<form id="cos-banner" style="position:fixed;bottom:0;left:0;right:0;background:#fff" onsubmit="return false">
  <h4>Cookie e scelte pubblicitarie</h4><p>Usiamo i cookie. Fai clic su "Rifiuta" per rifiutare.</p>
  <a href="/cookieprefs">Cookie e preferenze pubblicitarie</a>
  <span class="a-button-inner" style="position:relative;display:inline-block;width:80px;height:30px">
    <input id="acc" type="submit" value="Accetta " style="position:absolute;inset:0;width:100%;height:100%;opacity:0.01" onclick="window.choice='accetta'">
    <span>Accetta</span></span>
  <span class="a-button-inner" style="position:relative;display:inline-block;width:80px;height:30px">
    <input id="rej" type="submit" value="Rifiuta" style="position:absolute;inset:0;width:100%;height:100%;opacity:0.01" onclick="window.choice='rifiuta'">
    <span>Rifiuta</span></span>
  <input type="submit" value="Nascosto" style="opacity:0.01;width:40px;height:20px;visibility:hidden">
</form>`;

test('pulsanti trasparenti sovrapposti all\'etichetta (Amazon): letti e cliccati', async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.setContent(BANNER);
    const texts = (await scan(page)).candidates.map((c) => c.text);
    assert.ok(texts.includes('Rifiuta'), texts.join(', '));
    assert.ok(texts.includes('Accetta'), texts.join(', '));
    assert.ok(!texts.includes('Nascosto'), 'un input con visibility:hidden resta escluso');
    const r = await heuristicChoose(page, 'rifiuta');
    assert.ok(r.ok, r.detail);
    assert.equal(await page.evaluate(() => (window as unknown as { choice?: string }).choice), 'rifiuta');
    await page.setContent(BANNER);
    const a = await heuristicChoose(page, 'accetta');
    assert.ok(a.ok, a.detail);
    assert.equal(await page.evaluate(() => (window as unknown as { choice?: string }).choice), 'accetta');
  } finally {
    await browser.close();
  }
});
