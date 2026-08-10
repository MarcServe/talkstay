-- Structured guest-facing knowledge (menus, guides): sections, links, images.
-- Content text remains the searchable/embeddable body; media is for rich display.

ALTER TABLE public.ts_knowledge
  ADD COLUMN IF NOT EXISTS media jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Return type is changing (adding media) — Postgres requires DROP first.
DROP FUNCTION IF EXISTS public.ts_search_knowledge(vector, uuid, uuid, integer);

CREATE FUNCTION public.ts_search_knowledge(
  query_embedding vector, p_hotel_id uuid, p_room_id uuid, match_count integer DEFAULT 8
) RETURNS TABLE(
  id uuid, title text, content text, scope text, department_key text,
  media jsonb, similarity double precision
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT k.id, k.title, k.content, k.scope, k.department_key,
         COALESCE(k.media, '{}'::jsonb) AS media,
         1 - (k.embedding <=> query_embedding) AS similarity
  FROM public.ts_knowledge k
  WHERE k.hotel_id = p_hotel_id
    AND k.embedding IS NOT NULL
    AND (k.room_id IS NULL OR k.room_id = p_room_id)
  ORDER BY k.embedding <=> query_embedding
  LIMIT greatest(1, least(coalesce(match_count, 8), 20));
$$;
