import Groq from "groq-sdk";
import { errorInfo, log, logPayloads } from "./log.js";

export const GROQ_MODEL = "openai/gpt-oss-20b";

let client = null;
function getClient() {
  if (!process.env.GROQ_API_KEY) throw new Error("GROQ_API_KEY is not set");
  client ??= new Groq({ apiKey: process.env.GROQ_API_KEY, timeout: 45_000, maxRetries: 1 });
  return client;
}

// Groq rejects JSON-mode replies that don't parse with a 400 "json_validate_failed".
function isJsonValidateError(err) {
  return err?.status === 400 && /json_validate_failed/.test(JSON.stringify(err?.error ?? err?.message ?? ""));
}

/**
 * Chat completion in JSON mode, parsed and validated with a zod schema.
 * Retries once if the reply isn't valid JSON or doesn't match the schema.
 */
export async function groqJSON({ system, user, schema, temperature = 0.4, max_tokens = 4000 }) {
  let lastProblem = "";
  for (let attempt = 1; attempt <= 2; attempt++) {
    const messages = [
      { role: "system", content: system },
      { role: "user", content: user },
    ];
    if (lastProblem) {
      messages.push({
        role: "user",
        content: `Your previous reply was rejected (${lastProblem}). Reply again with ONLY one JSON object in exactly the required shape.`,
      });
    }

    log("info", "groq", "request", {
      attempt,
      model: GROQ_MODEL,
      temperature,
      max_tokens,
      ...(logPayloads() ? { prompt: user } : { prompt_chars: user.length }),
      ...(lastProblem && { retry_reason: lastProblem }),
    });

    const started = Date.now();
    let raw;
    try {
      const completion = await getClient().chat.completions.create({
        model: GROQ_MODEL,
        messages,
        response_format: { type: "json_object" },
        temperature,
        max_tokens,
      });
      raw = completion.choices?.[0]?.message?.content ?? "";
      log("info", "groq", "response", {
        attempt,
        ms: Date.now() - started,
        groq_id: completion.id,
        model: completion.model,
        finish_reason: completion.choices?.[0]?.finish_reason,
        usage: completion.usage && {
          prompt_tokens: completion.usage.prompt_tokens,
          completion_tokens: completion.usage.completion_tokens,
          total_tokens: completion.usage.total_tokens,
        },
        ...(logPayloads() ? { content: raw } : { content_chars: raw.length }),
      });
    } catch (err) {
      const jsonFail = isJsonValidateError(err);
      log(jsonFail ? "warn" : "error", "groq", "error", { attempt, ms: Date.now() - started, ...errorInfo(err) });
      if (jsonFail) {
        lastProblem = "invalid JSON";
        continue;
      }
      throw err;
    }

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      lastProblem = "invalid JSON";
      log("warn", "groq", "rejected", { attempt, reason: lastProblem });
      continue;
    }
    if (!schema) return parsed;

    const result = schema.safeParse(parsed);
    if (result.success) return result.data;
    lastProblem = `schema mismatch at ${result.error.issues
      .slice(0, 3)
      .map((i) => i.path.join(".") || "(root)")
      .join(", ")}`;
    log("warn", "groq", "rejected", { attempt, reason: lastProblem });
  }
  throw new Error(`Groq output unusable after retry: ${lastProblem}`);
}

/**
 * Plain-text chat completion. `messages` is the conversation so far
 * ({ role: "user" | "assistant", content }); the system prompt is prepended here.
 */
export async function groqChat({ system, messages, temperature = 0.6, max_tokens = 800 }) {
  const lastUser = messages[messages.length - 1]?.content ?? "";
  log("info", "groq", "request", {
    model: GROQ_MODEL,
    temperature,
    max_tokens,
    turns: messages.length,
    ...(logPayloads() ? { prompt: lastUser } : { prompt_chars: lastUser.length }),
  });

  const started = Date.now();
  try {
    const completion = await getClient().chat.completions.create({
      model: GROQ_MODEL,
      messages: [{ role: "system", content: system }, ...messages],
      temperature,
      max_tokens,
    });
    const raw = completion.choices?.[0]?.message?.content ?? "";
    log("info", "groq", "response", {
      ms: Date.now() - started,
      groq_id: completion.id,
      model: completion.model,
      finish_reason: completion.choices?.[0]?.finish_reason,
      usage: completion.usage && {
        prompt_tokens: completion.usage.prompt_tokens,
        completion_tokens: completion.usage.completion_tokens,
        total_tokens: completion.usage.total_tokens,
      },
      ...(logPayloads() ? { content: raw } : { content_chars: raw.length }),
    });
    if (!raw.trim()) throw new Error("Groq returned an empty reply");
    return raw.trim();
  } catch (err) {
    log("error", "groq", "error", { ms: Date.now() - started, ...errorInfo(err) });
    throw err;
  }
}
