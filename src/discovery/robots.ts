/**
 * Regole Allow/Disallow di robots.txt per tutti i crawler (User-agent: *), con * e $ come in Google.
 * Ritorna una funzione che dice se un path è escluso. Vince la regola più lunga; a parità, Allow.
 */
export function robotsDisallows(robots: string): (path: string) => boolean {
  const rules: { allow: boolean; re: RegExp; len: number }[] = [];
  let groupAgents: string[] = [];
  let inRules = false;
  for (const raw of robots.split(/\r?\n/)) {
    const line = raw.replace(/#.*/, '').trim();
    const m = /^([a-z-]+)\s*:\s*(.*)$/i.exec(line);
    if (!m) continue;
    const key = m[1].toLowerCase();
    const value = m[2].trim();
    if (key === 'user-agent') {
      if (inRules) groupAgents = [];
      inRules = false;
      groupAgents.push(value.toLowerCase());
    } else if (key === 'allow' || key === 'disallow') {
      inRules = true;
      if (!groupAgents.includes('*') || !value) continue;
      // Il "$" finale non viene sottoposto a escape: resta l'ancora di fine path, come nelle specifiche.
      const body = value.replace(/[.+?^{}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
      rules.push({ allow: key === 'allow', re: new RegExp(`^${body}`), len: value.length });
    }
  }
  return (path: string) => {
    const hits = rules.filter((r) => r.re.test(path)).sort((a, b) => b.len - a.len || Number(b.allow) - Number(a.allow));
    return hits.length > 0 && !hits[0].allow;
  };
}
