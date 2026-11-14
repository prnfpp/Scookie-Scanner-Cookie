/** Indirizzo assoluto http(s) senza frammento (salvo le applicazioni con instradamento nel frammento); null se non valido. */
export function normalize(url: string, base: string): string | null {
  try {
    const u = new URL(url, base);
    if (!/^https?:$/.test(u.protocol)) return null;
    // Le applicazioni con instradamento nel frammento (/#/preventivo) hanno pagine distinte nel frammento:
    // lo si tiene solo per gli indirizzi che finiscono con "/" (o index.html), dove vive questo tipo di applicazione.
    if (!(/^#!?\//.test(u.hash) && /(\/|\/index\.\w+)$/.test(u.pathname))) u.hash = '';
    return u.toString();
  } catch {
    return null;
  }
}
