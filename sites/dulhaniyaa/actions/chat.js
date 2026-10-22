import { z } from "zod";
import { groqChat } from "../../../lib/groq.js";
import { HttpError } from "../../../lib/http.js";
import { errorInfo, log } from "../../../lib/log.js";
import { parse } from "../../../lib/validate.js";
import { CHAT_SYSTEM } from "../prompt.js";

export const method = "POST";

const MAX_TURNS = 12;
const MAX_CHARS = 1000;

// Multi-line text: control chars (except newlines/tabs) removed, trimmed, truncated.
const text = z
  .string()
  .transform((s) => s.replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, " ").trim().slice(0, MAX_CHARS))
  .refine((s) => s.length > 0, { message: "Required" });

const bodySchema = z.object({
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: text }))
    .min(1)
    .max(50),
});

export async function handler({ body }) {
  const { messages } = parse(bodySchema, body);

  // Only the recent history goes to the model, and it must end on the user's turn.
  const history = messages.slice(-MAX_TURNS);
  if (history[history.length - 1].role !== "user") {
    throw new HttpError(400, "Last message must be from the user");
  }

  let reply;
  try {
    reply = await groqChat({ system: CHAT_SYSTEM, messages: history });
  } catch (err) {
    log("error", "chat", "ai_failed", errorInfo(err));
    throw new HttpError(502, "Could not reply right now. Please try again.");
  }

  return { body: { reply: reply.slice(0, 4000) } };
}
