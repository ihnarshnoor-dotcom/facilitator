// Site registry. Adding a site = one entry here + one folder under sites/.
//
// `load` must be a literal import() so Vercel's bundler can trace the site's
// files and their dependencies into the single dynamic function.
import { errorInfo, log } from "./log.js";

export const SITES = {
  dulhaniyaa: {
    name: "Dulhaniyaa",
    domain: "dulhaniyaa.in",
    origins: [
      "http://localhost:5173",
      "http://localhost:3000",
      // "https://dulhaniyaa.vercel.app",
      "https://www.dulhaniyaa.in",
      "https://dulhaniyaa.in",
    ],
    mailKeyEnv: "WEB3FORMS_KEY_DULHANIYAA",
    actions: ["services", "plan", "lead", "chat"],
    limits: { plan: "5/min", lead: "3/min", chat: "15/min" },
    load: () => import("../sites/dulhaniyaa/index.js"),
  },
  // superfarm: {
  //   name: "SuperFarmFresh",
  //   domain: "superfarmfresh.com",
  //   origins: ["https://superfarmfresh.com", "https://www.superfarmfresh.com", "http://localhost:5174"],
  //   mailKeyEnv: "WEB3FORMS_KEY_SUPERFARM",
  //   actions: ["..."],
  //   limits: {},
  //   load: () => import("../sites/superfarm/index.js"),
  // },
};

// Wrap each site's load() to log how long the import took and why it failed.
// The literal import() stays inside the original function, so bundler tracing is unaffected.
for (const [key, site] of Object.entries(SITES)) {
  const load = site.load;
  site.load = async () => {
    const started = Date.now();
    try {
      const mod = await load();
      log("info", "sites", "site_loaded", {
        slug: key,
        ms: Date.now() - started,
        exported_actions: Object.keys(mod.default ?? {}),
      });
      return mod;
    } catch (err) {
      log("error", "sites", "site_load_failed", { slug: key, ms: Date.now() - started, ...errorInfo(err) });
      throw err;
    }
  };
}

// Once per cold start: what's registered and whether each site's mail key is present.
log("info", "sites", "registry_loaded", {
  sites: Object.entries(SITES).map(([key, site]) => ({
    slug: key,
    domain: site.domain,
    actions: site.actions,
    origins: site.origins,
    mail_key_env: site.mailKeyEnv,
    mail_key_present: Boolean(process.env[site.mailKeyEnv]),
  })),
});

// Own-property lookup only, so "__proto__" / "constructor" can't match.
export function getSite(key) {
  const site = typeof key === "string" && Object.hasOwn(SITES, key) ? SITES[key] : null;
  if (site) {
    log("info", "sites", "site_resolved", { slug: key, name: site.name });
  } else {
    log("warn", "sites", "site_unknown", { slug: key, known: Object.keys(SITES) });
  }
  return site;
}
