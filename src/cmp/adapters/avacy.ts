import { clickFirst, waitFor, type ClickedElement } from '../dom.js';
import { anyShown } from '../visibility.js';
import type { CmpAdapter, Choice, ConsentCheck } from '../types.js';
import { selectorAdapter } from './base.js';

/**
 * Avacy (basato su OIL.js, oggetto globale AVACY / AS_OIL). Primo livello in #as-oil-first-layer con "Accetta cookie"
 * (.as-js-optin), "Rifiuta tutto" (.as-js-reject-all), "Maggiori informazioni" (.as-js-advanced-settings) e una X
 * con etichetta "Continua senza accettare" (.as-js-close-banner). Il centro preferenze (#as-oil-cpc) non ha un
 * "Rifiuta tutto": si rifiuta con "Disattiva tutto" e poi "Salva". Dopo la scelta resta uno scudo fluttuante
 * (#avacy-floating-resurface) che apre un menu con "Preferenze sui cookie" (AVACY.showPreferenceCenter).
 */
const FIRST = '.as-oil #as-oil-first-layer';
const CPC = '.as-oil #as-oil-cpc';

const base = selectorAdapter({
  id: 'avacy',
  name: 'Avacy',
  detectExpr: `window.AVACY && typeof window.AVACY.getPurposeConsents === 'function'`,
  detectSelectors: ['.as-oil', '#avacy-floating-resurface'],
  bannerSelectors: [FIRST, CPC],
  reject: {
    firstLayer: [`${FIRST} .as-js-reject-all`],
    close: [`${FIRST} .as-js-close-banner`],
  },
  accept: { firstLayer: [`${FIRST} .as-js-optin`] },
  // Finalità TCF, terze parti dell'editore (c: 1 = consenso) e segnali Google Consent Mode concessi
  // status() e getPurposeConsents() restituiscono Promise
  stateExpr: `(async () => {
    const s = window.AVACY.status ? await window.AVACY.status() : null;
    return {
      purposes: window.AVACY.getPurposeConsents ? await window.AVACY.getPurposeConsents() : null,
      customVendors: s && Array.isArray(s.customVendorList) ? s.customVendorList : null,
      gcm: s && Array.isArray(s.gcm) ? s.gcm : null,
    };
  })()`,
  check: checkAvacy,
  reopenExpr: `window.AVACY.showPreferenceCenter('absolute')`,
});

export function checkAvacy(state: unknown, choice: Choice): ConsentCheck {
  const s = state as { purposes?: Record<string, boolean> | null; customVendors?: { id: string; c: number }[] | null; gcm?: string[] | null } | null;
  if (!s || (!s.purposes && !s.customVendors)) return { consistent: null, detail: 'stato di Avacy non leggibile' };
  const purposes = Object.entries(s.purposes ?? {}).filter(([, v]) => v === true).map(([k]) => k);
  const vendors = (s.customVendors ?? []).filter((v) => v.c === 1).map((v) => v.id);
  const gcm = s.gcm ?? [];
  const parts = [
    purposes.length ? `finalità TCF ${purposes.join(', ')}` : '',
    vendors.length ? `terze parti dell'editore ${vendors.join(', ')}` : '',
    gcm.length ? `Consent Mode ${gcm.join(', ')}` : '',
  ].filter(Boolean);
  if (choice === 'rifiuta') {
    return parts.length
      ? { consistent: false, detail: `dopo il rifiuto risultano attive: ${parts.join('; ')}` }
      : { consistent: true, detail: 'nessuna finalità, terza parte o segnale Consent Mode con consenso' };
  }
  return parts.length
    ? { consistent: true, detail: `consensi registrati: ${parts.join('; ')}` }
    : { consistent: false, detail: "dopo l'accettazione nessun consenso registrato" };
}

export const avacy: CmpAdapter = {
  ...base,
  async choose(page, choice, mode) {
    // Menu dello scudo aperto (revoca): "Preferenze sui cookie" apre il centro preferenze
    const opened: string[] = [];
    if (choice === 'rifiuta' && mode !== 'api' && !(await anyShown(page, [FIRST, CPC]))) {
      const link = await clickFirst(page, ['#avacy-floating-resurface [onclick*="showPreferenceCenter"]']);
      if (link) {
        opened.push(link.label);
        await waitFor(() => anyShown(page, [CPC]), 4000, 300);
      }
    }
    // Centro preferenze aperto (dal pulsante "Maggiori informazioni" o riaperto per revocare): "Disattiva tutto", poi "Salva"
    if (choice === 'rifiuta' && mode !== 'api' && !(await anyShown(page, [FIRST])) && (await anyShown(page, [CPC]))) {
      const off = await clickFirst(page, [`${CPC} .as-js-btn-deactivate-all`]);
      if (off) {
        const got: { save: ClickedElement | null } = { save: null };
        await waitFor(async () => !!(got.save = await clickFirst(page, [`${CPC} .as-js-optin`])), 3000, 300);
        const save = got.save;
        if (save) {
          return {
            ok: true,
            layer: 'secondo-livello',
            via: 'click',
            detail: `${opened.map((l) => `click su ${l}, poi `).join('')}click su ${off.label} (${off.selector}), poi click su ${save.label} (${save.selector})`,
            clicked: [...opened, off.label, save.label],
          };
        }
      }
      return { ok: false, layer: null, via: null, detail: 'centro preferenze aperto ma "Disattiva tutto" o "Salva" non trovati' };
    }
    return base.choose(page, choice, mode);
  },
};
