// Site registry. Adding a site = one entry here + one folder under sites/.
//
// `load` must be a literal import() so Vercel's bundler can trace the site's
// files and their dependencies into the single dynamic function.

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

// Own-property lookup only, so "__proto__" / "constructor" can't match.
export function getSite(key) {
  return typeof key === "string" && Object.hasOwn(SITES, key)
    ? SITES[key]
    : null;
}
