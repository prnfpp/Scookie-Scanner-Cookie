/**
 * Motore di navigazione riusabile da altri strumenti (es. il crawler SEO): avvio del browser, user agent dichiarato,
 * anti-bot, banner di consenso, scoperta e campionamento delle pagine, utilità e stile dei rapporti.
 * È l'unica interfaccia pubblica del pacchetto ("scookie/engine"): ciò che è esportato qui non cambia nome o firma
 * senza una voce "Motore" nel CHANGELOG.
 */
export { launchOptions, resolveUserAgent, type LaunchConfig, type UserAgentConfig } from './browser/launch.js';
export { scrollPage } from './browser/scroll.js';
export { detectBotChallenge, type BotBlock } from './browser/antibot.js';
export { detectExit, parseTrace, type ExitInfo } from './browser/exit.js';
export { bannerVisible, detectCmps, observeBanner, performChoice } from './cmp/interact.js';
export type { CmpAdapter, Choice, ChoiceResult } from './cmp/types.js';
export { pageType, sample, sectionsOf, type SampledPage } from './discovery/discover.js';
export { exploreByClicks } from './discovery/explore.js';
export { robotsDisallows } from './discovery/robots.js';
export { parseSitemap } from './discovery/sitemap.js';
export { normalize as normalizeUrl } from './discovery/urls.js';
export { hostMatches, hostOf, registrableDomain } from './util/domains.js';
export { closeSafely, sha256, sha256File, sleep, slug, timestampForPath, withTimeout } from './util/misc.js';
export { detectSeparator, parseCsv, toCsv } from './util/csv.js';
export { keepAwake } from './util/awake.js';
export { CSS, esc, fmt } from './report/style.js';
export { TOOL_VERSION } from './version.js';
