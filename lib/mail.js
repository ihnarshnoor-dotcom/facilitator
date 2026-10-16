// All outbound mail lives here, so swapping Web3Forms for Nodemailer/SMTP touches one file.
import { HttpError } from "./http.js";
import { errorInfo, log, logPayloads } from "./log.js";
import { getSite } from "./sites.js";

const WEB3FORMS_URL = "https://api.web3forms.com/submit";

export async function sendMail({ siteKey, subject, name, phone, email, message }) {
  const site = getSite(siteKey);
  const accessKey = site && process.env[site.mailKeyEnv];
  if (!accessKey) {
    log("error", "web3forms", "config", { error: `${site?.mailKeyEnv ?? "mail key env"} is not set` });
    throw new HttpError(502, "Could not send");
  }

  const payload = {
    subject,
    from_name: site.name,
    name,
    phone,
    email: email || `noreply@${site.domain}`,
    message,
  };
  log("info", "web3forms", "request", {
    key_env: site.mailKeyEnv,
    ...(logPayloads() ? payload : { subject, message_chars: message.length }),
  });

  const started = Date.now();
  let res, data;
  try {
    res = await fetch(WEB3FORMS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ access_key: accessKey, ...payload }),
      signal: AbortSignal.timeout(10_000),
    });
    data = await res.json().catch(() => null);
  } catch (err) {
    log("error", "web3forms", "error", { ms: Date.now() - started, ...errorInfo(err) });
    throw new HttpError(502, "Could not send");
  }

  const ok = res.ok && data?.success === true;
  log(ok ? "info" : "error", "web3forms", "response", {
    ms: Date.now() - started,
    http_status: res.status,
    success: data?.success ?? false,
    message: data ? data.message : "non-JSON response",
  });
  if (!ok) throw new HttpError(502, "Could not send");
  return { ok: true };
}
