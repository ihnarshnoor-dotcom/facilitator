// Per-site CORS. A browser on one site's origin can never call another site's actions.
//
// Requests with no Origin header (curl, server-to-server) are not browser
// cross-origin requests, so CORS doesn't apply; the rate limiter covers them.

export function applyCors(req, res, site, method) {
  res.setHeader("Vary", "Origin");
  const origin = req.headers.origin;
  if (!origin) return true;
  if (!site.origins.includes(origin)) return false;

  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Methods", `${method}, OPTIONS`);
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Max-Age", "86400");
  return true;
}
