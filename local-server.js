// Run the API locally without the Vercel CLI: `npm run local`.
// Serves the same handlers as Vercel, with the same request shape (req.query, req.body).
import { createServer } from "node:http";
import { existsSync } from "node:fs";
import health from "./api/health.js";
import router from "./api/[site]/[action].js";

// .env.local wins over .env (loadEnvFile never overwrites a variable that's already set).
for (const file of [".env.local", ".env"]) if (existsSync(file)) process.loadEnvFile(file);

const PORT = Number(process.env.PORT) || 8787;
const MAX_BODY = 1_000_000;

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (c) => {
      size += c.length;
      if (size > MAX_BODY) reject(new Error("Body too large"));
      else chunks.push(c);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString()));
    req.on("error", reject);
  });
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const query = Object.fromEntries(url.searchParams);

  const raw = await readBody(req).catch(() => null);
  if (raw === null) {
    res.statusCode = 413;
    return res.end(JSON.stringify({ error: "Body too large" }));
  }
  // Like Vercel: JSON bodies are parsed lazily and throw on malformed JSON.
  Object.defineProperty(req, "body", {
    get() {
      if (!raw) return undefined;
      return (req.headers["content-type"] || "").includes("application/json") ? JSON.parse(raw) : raw;
    },
  });

  if (url.pathname === "/api/health") return health(req, res);

  const m = /^\/api\/([^/]+)\/([^/]+)\/?$/.exec(url.pathname);
  if (m) {
    req.query = { ...query, site: decodeURIComponent(m[1]), action: decodeURIComponent(m[2]) };
    return router(req, res);
  }

  res.statusCode = 404;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify({ error: "Not found" }));
});

// If the port is taken (e.g. a Next.js app on 3000), try the next ones.
let port = PORT;
server.on("error", (err) => {
  if (err.code === "EADDRINUSE" && port < PORT + 20) {
    console.log(`Port ${port} is in use, trying ${port + 1}...`);
    server.listen(++port);
  } else {
    throw err;
  }
});
server.listen(port);

server.on("listening", () => {
  console.log(`facilitator running at http://localhost:${port}`);
  console.log(`  GROQ_API_KEY: ${process.env.GROQ_API_KEY ? "set" : "MISSING"}`);
  console.log(`  WEB3FORMS_KEY_DULHANIYAA: ${process.env.WEB3FORMS_KEY_DULHANIYAA ? "set" : "MISSING"}`);
});
