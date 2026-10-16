import { HttpError } from "./http.js";
import { z } from "zod";

const CONTROL_CHARS = /[\u0000-\u001F\u007F]/g;

// Single-line string: control chars and newlines removed, whitespace collapsed,
// truncated to `max`. Safe to drop into email subjects and prompts.
export const cleanLine = (s, max) =>
  s.replace(CONTROL_CHARS, " ").replace(/\s+/g, " ").trim().slice(0, max);

export const line = (max) => z.string().transform((s) => cleanLine(s, max));

export const requiredLine = (max) =>
  line(max).refine((s) => s.length > 0, { message: "Required" });

// Parse with zod or throw a 400 listing which fields are wrong (no internals).
export function parse(schema, data) {
  const result = schema.safeParse(data);
  if (!result.success) {
    const issues = result.error.issues.slice(0, 10).map((i) => ({
      path: i.path.join("."),
      message: i.message,
    }));
    throw new HttpError(400, "Invalid request", { issues });
  }
  return result.data;
}
