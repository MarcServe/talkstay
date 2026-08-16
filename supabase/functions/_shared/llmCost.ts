/**
 * Estimate + record OpenAI usage attributed to a hotel / room (QR).
 * OpenAI's org dashboard cannot break cost down by room — we do it here.
 *
 * Rates are approximate list prices (USD per token). Update when models change.
 */

export type OpenAiUsage = {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
};

/** USD per 1 token (input / output). Embedding models use input only. */
const MODEL_RATES: Record<string, { inPerTok: number; outPerTok: number }> = {
  "gpt-4o-mini": { inPerTok: 0.15 / 1_000_000, outPerTok: 0.60 / 1_000_000 },
  "gpt-4o": { inPerTok: 2.50 / 1_000_000, outPerTok: 10 / 1_000_000 },
  "text-embedding-3-small": { inPerTok: 0.02 / 1_000_000, outPerTok: 0 },
  "text-embedding-3-large": { inPerTok: 0.13 / 1_000_000, outPerTok: 0 },
  "whisper-1": { inPerTok: 0, outPerTok: 0 }, // billed by audio minute — leave 0 unless duration known
};

export function estimateCostUsd(
  model: string,
  promptTokens: number,
  completionTokens: number,
): number {
  const key = String(model || "").trim().toLowerCase();
  const rates = MODEL_RATES[key] ?? MODEL_RATES["gpt-4o-mini"];
  const usd = promptTokens * rates.inPerTok + completionTokens * rates.outPerTok;
  return Math.round(usd * 1_000_000) / 1_000_000; // 6 dp
}

export type LlmCallRow = {
  hotel_id: string;
  room_id?: string | null;
  session_id?: string | null;
  purpose: string;
  model: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  cost_usd: number;
  latency_ms?: number | null;
};

export async function recordLlmCall(admin: any, row: LlmCallRow): Promise<void> {
  try {
    const { error } = await admin.from("ts_llm_calls").insert({
      hotel_id: row.hotel_id,
      room_id: row.room_id ?? null,
      session_id: row.session_id ?? null,
      purpose: row.purpose.slice(0, 64),
      model: row.model.slice(0, 64),
      prompt_tokens: Math.max(0, Math.round(row.prompt_tokens) || 0),
      completion_tokens: Math.max(0, Math.round(row.completion_tokens) || 0),
      total_tokens: Math.max(0, Math.round(row.total_tokens) || 0),
      cost_usd: row.cost_usd,
      latency_ms: row.latency_ms ?? null,
    });
    if (error && !/does not exist|relation|schema cache/i.test(error.message || "")) {
      console.warn("ts_llm_calls insert:", error.message);
    }
  } catch {
    /* never block guest path */
  }
}

export type LlmTracker = {
  hotelId: string;
  roomId: string | null;
  sessionId: string | null;
  trackUsage: (opts: {
    purpose: string;
    model: string;
    usage?: OpenAiUsage | null;
    latencyMs?: number;
  }) => Promise<void>;
};

export function makeLlmTracker(
  admin: any,
  hotelId: string,
  roomId: string | null | undefined,
  sessionId: string | null | undefined,
): LlmTracker {
  return {
    hotelId,
    roomId: roomId ?? null,
    sessionId: sessionId ?? null,
    async trackUsage({ purpose, model, usage, latencyMs }) {
      const prompt = Number(usage?.prompt_tokens) || 0;
      const completion = Number(usage?.completion_tokens) || 0;
      const total = Number(usage?.total_tokens) || prompt + completion;
      if (prompt <= 0 && completion <= 0 && total <= 0) return;
      const cost_usd = estimateCostUsd(model, prompt, completion);
      await recordLlmCall(admin, {
        hotel_id: hotelId,
        room_id: roomId ?? null,
        session_id: sessionId ?? null,
        purpose,
        model,
        prompt_tokens: prompt,
        completion_tokens: completion,
        total_tokens: total,
        cost_usd,
        latency_ms: latencyMs ?? null,
      });
    },
  };
}
