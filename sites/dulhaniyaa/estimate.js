// Server-owned pricing math. Anything the AI says about money gets overwritten by this.
import { ITEMS_BY_ID, SERVICES } from "./services.js";

export const DISCLAIMER = "Personalised plan and estimate. Final quote confirmed by our planner.";

export function quantityFor(item, { guestCount, eventCount }) {
  switch (item.pricing_type) {
    case "per_guest":
      return guestCount;
    case "per_event":
      return Math.max(1, eventCount);
    case "per_day":
    case "flat":
      return 1;
    default:
      return 0;
  }
}

// Keep only known ids, dropping duplicates, in rate-card order.
export function validIds(ids) {
  const wanted = new Set(ids.filter((id) => Object.hasOwn(ITEMS_BY_ID, id)));
  return SERVICES.flatMap((cat) => cat.items.filter((i) => wanted.has(i.id)).map((i) => i.id));
}

export function computeEstimate(ids, { guestCount, eventCount }) {
  const selected = new Set(ids);
  const categories = [];
  const on_request = [];
  let total_min = 0;
  let total_max = 0;

  for (const cat of SERVICES) {
    const items = [];
    let subtotal_min = 0;
    let subtotal_max = 0;

    for (const item of cat.items) {
      if (!selected.has(item.id)) continue;
      if (item.pricing_type === "on_request") {
        items.push({ id: item.id, name: item.name, level: item.level, est_min: null, est_max: null });
        on_request.push({ id: item.id, name: item.name, category: cat.name });
        continue;
      }
      const qty = quantityFor(item, { guestCount, eventCount });
      const est_min = Math.round(item.min * qty);
      const est_max = Math.round(item.max * qty);
      items.push({ id: item.id, name: item.name, level: item.level, est_min, est_max });
      subtotal_min += est_min;
      subtotal_max += est_max;
    }

    if (items.length) categories.push({ name: cat.name, items, subtotal_min, subtotal_max });
    total_min += subtotal_min;
    total_max += subtotal_max;
  }

  return { categories, on_request, total_min, total_max };
}

// "25 lakh", "1.5 cr", "₹40,00,000", "800k" or a number -> rupees, or null if unreadable.
export function parseBudget(budget) {
  if (typeof budget === "number") return budget > 0 ? budget : null;
  if (typeof budget !== "string") return null;
  const s = budget.toLowerCase().replace(/,/g, "");
  const m = /(\d+(?:\.\d+)?)\s*(crores?|cr|lakhs?|lacs?|lac|l|k|thousand)?\b/.exec(s);
  if (!m) return null;
  const mult = { cr: 1e7, crore: 1e7, crores: 1e7, lakh: 1e5, lakhs: 1e5, lac: 1e5, lacs: 1e5, l: 1e5, k: 1e3, thousand: 1e3 };
  const value = Number(m[1]) * (m[2] ? mult[m[2]] : 1);
  return value > 0 ? Math.round(value) : null;
}

// within: even the top of the range fits. over: even the bottom doesn't. tight: in between.
export function budgetStatus(budgetRupees, { total_min, total_max }) {
  if (!budgetRupees) return "unknown";
  if (total_max <= budgetRupees) return "within";
  if (total_min > budgetRupees) return "over";
  return "tight";
}

const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
export const formatINR = (n) => inr.format(n);
