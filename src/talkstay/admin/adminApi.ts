import { supabase } from "@/integrations/supabase/client";

export async function adminApi<T = unknown>(action: string, body: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await supabase.functions.invoke("talkstay-admin", {
    body: { action, ...body },
  });
  if (error) throw new Error(error.message || "Admin request failed");
  if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
  return data as T;
}
