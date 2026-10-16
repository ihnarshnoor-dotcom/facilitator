// Request schemas shared by Dulhaniyaa actions.
import { z } from "zod";
import { line, requiredLine } from "../../lib/validate.js";

const budget = z.union([z.number().nonnegative().max(1e11), line(60)]).optional();

export const basicsSchema = z.object({
  events: z.array(requiredLine(40)).min(1).max(8),
  date: line(40).optional(),
  city: requiredLine(60),
  guestCount: z.coerce.number().int().min(1).max(5000),
  budget,
});

// Leads may arrive before the planner form is complete, so every field is optional.
export const leadBasicsSchema = basicsSchema.partial();

export const selectedIdsSchema = z.array(z.string().max(64)).max(60);
