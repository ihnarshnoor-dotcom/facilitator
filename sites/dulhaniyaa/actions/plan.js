import { z } from "zod";
import { groqJSON } from "../../../lib/groq.js";
import { HttpError } from "../../../lib/http.js";
import { errorInfo, log } from "../../../lib/log.js";
import { cleanLine, parse } from "../../../lib/validate.js";
import { DISCLAIMER, budgetStatus, computeEstimate, parseBudget, validIds } from "../estimate.js";
import { buildPlanPrompt, planOutputSchema } from "../prompt.js";
import { basicsSchema, selectedIdsSchema } from "../schema.js";
import { ITEMS_BY_ID } from "../services.js";

export const method = "POST";

const bodySchema = z.object({
  basics: basicsSchema,
  selectedIds: selectedIdsSchema.min(1),
});

const clip = (s, max) => cleanLine(String(s ?? ""), max);
const clipList = (arr, n, max) => arr.slice(0, n).map((s) => clip(s, max)).filter(Boolean);

export async function handler({ body }) {
  const { basics, selectedIds } = parse(bodySchema, body);

  const ids = validIds(selectedIds);
  if (!ids.length) throw new HttpError(400, "No valid services selected");

  const estimate = computeEstimate(ids, { guestCount: basics.guestCount, eventCount: basics.events.length });
  const status = budgetStatus(parseBudget(basics.budget), estimate);

  let ai;
  try {
    ai = await groqJSON({
      ...buildPlanPrompt({ basics, ids, estimate, budgetStatus: status }),
      schema: planOutputSchema,
      temperature: 0.4,
      max_tokens: 4000,
    });
  } catch (err) {
    log("error", "plan", "ai_failed", errorInfo(err));
    throw new HttpError(502, "Could not generate a plan right now. Please try again.");
  }

  // AI writes text only. Ids are filtered to the selection; all money comes from estimate.
  const selected = new Set(ids);
  const events = ai.events.slice(0, 8).map((e) => ({
    name: clip(e.name, 60),
    notes: clip(e.notes, 300),
    services: [...new Set(e.service_ids)]
      .filter((id) => selected.has(id))
      .map((id) => ({ id, name: ITEMS_BY_ID[id].name })),
  }));

  return {
    body: {
      summary: clip(ai.summary, 1200),
      events,
      categories: estimate.categories,
      on_request: estimate.on_request,
      total_min: estimate.total_min,
      total_max: estimate.total_max,
      currency: "INR",
      budget_check: {
        status,
        message: clip(ai.budget_check.message, 400),
        trim_suggestions: status === "tight" || status === "over" ? clipList(ai.budget_check.trim_suggestions, 8, 240) : [],
      },
      timeline: ai.timeline.slice(0, 15).map((t) => ({ when: clip(t.when, 60), task: clip(t.task, 240) })),
      suggestions: clipList(ai.suggestions, 8, 300),
      permissions_checklist: clipList(ai.permissions_checklist, 10, 200),
      disclaimer: DISCLAIMER,
    },
  };
}
