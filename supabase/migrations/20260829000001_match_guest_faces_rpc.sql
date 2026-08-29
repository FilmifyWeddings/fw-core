-- ==============================================================================
-- Match Guest Faces pgvector RPC Function
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS vector;

CREATE OR REPLACE FUNCTION match_guest_faces(
  query_embedding vector(512),
  match_gallery_id UUID,
  match_threshold FLOAT DEFAULT 0.40,
  match_limit INT DEFAULT 250
)
RETURNS TABLE (
  photo_id UUID,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT ON (pf.photo_id)
    pf.photo_id,
    (1 - (pf.embedding <=> query_embedding))::FLOAT AS similarity
  FROM photo_faces pf
  WHERE pf.gallery_id = match_gallery_id
    AND (1 - (pf.embedding <=> query_embedding)) >= match_threshold
  ORDER BY pf.photo_id, similarity DESC
  LIMIT match_limit;
END;
$$;
