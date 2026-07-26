-- ============================================================================
-- TalkStay — layered, access-controlled knowledge base (general / department / room)
-- ADDITIVE: one new ts_ table + two helper functions. Fully TalkStay-owned so the
-- shared TalkWeb knowledge functions are never touched. Uses pgvector (already
-- enabled for knowledge_vectors).
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.ts_knowledge (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id       uuid NOT NULL REFERENCES public.ts_hotels(id) ON DELETE CASCADE,
  scope          text NOT NULL CHECK (scope IN ('general','department','room')),
  department_key text,
  room_id        uuid REFERENCES public.ts_rooms(id) ON DELETE CASCADE,
  title          text,
  content        text NOT NULL,
  embedding      vector(1536),
  created_by     uuid,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  -- scope integrity: department entries need a department_key; room entries need a room_id
  CONSTRAINT ts_knowledge_scope_chk CHECK (
    (scope = 'general')
    OR (scope = 'department' AND department_key IS NOT NULL)
    OR (scope = 'room' AND room_id IS NOT NULL)
  )
);
CREATE INDEX IF NOT EXISTS ts_knowledge_hotel_idx ON public.ts_knowledge (hotel_id, scope);
CREATE INDEX IF NOT EXISTS ts_knowledge_room_idx ON public.ts_knowledge (room_id);
CREATE INDEX IF NOT EXISTS ts_knowledge_embed_idx
  ON public.ts_knowledge USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);

CREATE TRIGGER ts_knowledge_set_updated_at BEFORE UPDATE ON public.ts_knowledge
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.ts_knowledge ENABLE ROW LEVEL SECURITY;

-- Read: any hotel member (management UI). Guest retrieval runs via service_role.
CREATE POLICY ts_knowledge_read ON public.ts_knowledge
  FOR SELECT USING (public.ts_can_access_hotel(hotel_id, auth.uid()));
-- Writes go exclusively through the talkstay-knowledge edge function (service_role),
-- which enforces ts_kb_can_write below. No direct client write policy on purpose.

-- ---------------------------------------------------------------------------
-- Write access control (enforced by the edge function before any upsert):
--   owner / admin / manager  -> any scope
--   department staff         -> only 'department' entries for THEIR department
--   room + general           -> managers/owner/admin only
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ts_kb_can_write(
  _hotel_id uuid, _scope text, _department_key text, _user_id uuid
) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT
    EXISTS (SELECT 1 FROM public.ts_hotels h WHERE h.id = _hotel_id AND h.user_id = _user_id)
    OR public.is_admin(_user_id)
    OR EXISTS (SELECT 1 FROM public.ts_staff s
               WHERE s.hotel_id = _hotel_id AND s.user_id = _user_id
                 AND s.status = 'active' AND s.role IN ('manager','owner'))
    OR (_scope = 'department' AND _department_key IS NOT NULL AND EXISTS (
          SELECT 1 FROM public.ts_staff s
          WHERE s.hotel_id = _hotel_id AND s.user_id = _user_id
            AND s.status = 'active' AND s.department_key = _department_key));
$$;

-- ---------------------------------------------------------------------------
-- Scoped semantic search for a guest in a room:
--   general + all department entries + THIS room's entries (never other rooms).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ts_search_knowledge(
  query_embedding vector, p_hotel_id uuid, p_room_id uuid, match_count integer DEFAULT 8
) RETURNS TABLE(id uuid, title text, content text, scope text, department_key text, similarity double precision)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT k.id, k.title, k.content, k.scope, k.department_key,
         1 - (k.embedding <=> query_embedding) AS similarity
  FROM public.ts_knowledge k
  WHERE k.hotel_id = p_hotel_id
    AND k.embedding IS NOT NULL
    AND (k.room_id IS NULL OR k.room_id = p_room_id)
  ORDER BY k.embedding <=> query_embedding
  LIMIT match_count;
$$;
