import { z } from "zod";
import { sendMail } from "../../../lib/mail.js";
import { cleanLine, parse } from "../../../lib/validate.js";
import { computeEstimate, formatINR, validIds } from "../estimate.js";
import { leadBasicsSchema, selectedIdsSchema } from "../schema.js";
import { ITEMS_BY_ID } from "../services.js";

export const method = "POST";

const emptyToUndefined = (v) => (v === "" || v === null ? undefined : v);

const bodySchema = z.object({
  name: z.string().trim().min(1).max(80).transform((s) => cleanLine(s, 80)),
  phone: z
    .string()
    .trim()
    .min(8)
    .max(20)
    .regex(/^\+?[0-9][0-9\s\-().]*$/, "Invalid phone number"),
  email: z.preprocess(emptyToUndefined, z.string().trim().max(120).email().optional()),
  basics: leadBasicsSchema.optional().default({}),
  selectedIds: selectedIdsSchema.optional().default([]),
  totals: z
    .object({ total_min: z.number().nonnegative().optional(), total_max: z.number().nonnegative().optional() })
    .optional(),
});

function estimateLine(basics, ids, totals) {
  // Prefer our own math; fall back to the client's figures only when we can't compute.
  if (ids.length && basics.guestCount) {
    const est = computeEstimate(ids, { guestCount: basics.guestCount, eventCount: basics.events?.length || 1 });
    const extra = est.on_request.length ? ` + ${est.on_request.length} on request` : "";
    return `${formatINR(est.total_min)} – ${formatINR(est.total_max)}${extra}`;
  }
  if (totals?.total_min != null && totals?.total_max != null) {
    return `${formatINR(totals.total_min)} – ${formatINR(totals.total_max)} (as shown to client)`;
  }
  return "not calculated";
}

function servicesBlock(ids) {
  if (!ids.length) return "  (none selected)";
  const byCategory = new Map();
  for (const id of ids) {
    const it = ITEMS_BY_ID[id];
    if (!byCategory.has(it.category)) byCategory.set(it.category, []);
    byCategory.get(it.category).push(`    - ${it.name} [${it.level}${it.pricing_type === "on_request" ? ", on request" : ""}]`);
  }
  return [...byCategory].map(([cat, lines]) => `  ${cat}\n${lines.join("\n")}`).join("\n");
}

export async function handler({ body, site, siteKey }) {
  const lead = parse(bodySchema, body);
  const { basics } = lead;
  const ids = validIds(lead.selectedIds);
  const budget = typeof basics.budget === "number" ? formatINR(basics.budget) : basics.budget;

  const message = [
    `New wedding enquiry from ${site.domain}`,
    "",
    `Name:   ${lead.name}`,
    `Phone:  ${lead.phone}`,
    `Email:  ${lead.email || "not provided"}`,
    "",
    `Events: ${basics.events?.join(", ") || "not specified"}`,
    `Date:   ${basics.date || "not specified"}`,
    `City:   ${basics.city || "not specified"}`,
    `Guests: ${basics.guestCount ?? "not specified"}`,
    `Budget: ${budget || "not specified"}`,
    `Estimate: ${estimateLine(basics, ids, lead.totals)}`,
    "",
    `Selected services (${ids.length}):`,
    servicesBlock(ids),
  ].join("\n");

  await sendMail({
    siteKey,
    subject: `New enquiry: ${lead.name}${basics.city ? ` (${basics.city})` : ""}`,
    name: lead.name,
    phone: lead.phone,
    email: lead.email,
    message,
  });

  return { body: { ok: true, message: "Thank you! Our planner will contact you shortly." } };
}
