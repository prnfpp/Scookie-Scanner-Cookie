const LOC_RE = /<loc>\s*(?:<!\[CDATA\[)?\s*([^<\]\s]+)\s*(?:\]\]>)?\s*<\/loc>/gi;

/** Estrae le <loc> da una sitemap; distingue sitemap indice e sitemap di pagine. */
export function parseSitemap(xml: string): { isIndex: boolean; locs: string[] } {
  const locs = [...xml.matchAll(LOC_RE)].map((m) => m[1].replace(/&amp;/g, '&'));
  return { isIndex: /<sitemapindex[\s>]/i.test(xml), locs };
}
