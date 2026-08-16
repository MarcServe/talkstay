import { supabase } from "@/integrations/supabase/client";

/** Invoke talkstay-admin and surface the function's JSON `error` when status is non-2xx. */
export async function adminApi<T = unknown>(action: string, body: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await supabase.functions.invoke("talkstay-admin", {
    body: { action, ...body },
  });

  // Some supabase-js versions still parse the JSON body into `data` on 4xx/5xx.
  if (data && typeof data === "object" && (data as { error?: string }).error) {
    throw new Error(String((data as { error: string }).error));
  }

  if (error) {
    let detail = error.message || "Admin request failed";
    try {
      const ctx = (error as { context?: Response }).context;
      if (ctx) {
        const clone = typeof ctx.clone === "function" ? ctx.clone() : ctx;
        const text = await clone.text();
        if (text) {
          try {
            const parsed = JSON.parse(text) as { error?: string };
            if (parsed?.error) detail = parsed.error;
            else detail = text.slice(0, 400);
          } catch {
            detail = text.slice(0, 400);
          }
        }
      }
    } catch {
      /* keep generic message */
    }
    throw new Error(detail);
  }

  return data as T;
}
