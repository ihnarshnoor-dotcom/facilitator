import { SERVICES } from "../services.js";

export const method = "GET";

export async function handler() {
  return {
    headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
    body: { currency: "INR", categories: SERVICES },
  };
}
