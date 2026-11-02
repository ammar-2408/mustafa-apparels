-- Trigram matching for typo-tolerant search (docs/database.md §4).
CREATE EXTENSION IF NOT EXISTS pg_trgm;
--> statement-breakpoint
-- array_to_string is not immutable, so a generated column can't call it directly.
CREATE OR REPLACE FUNCTION immutable_array_to_string(text[], text)
RETURNS text LANGUAGE sql IMMUTABLE PARALLEL SAFE
AS $$ SELECT array_to_string($1, $2) $$;
