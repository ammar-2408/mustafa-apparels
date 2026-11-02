-- audit_log is insert-only (docs/database.md §2). The one allowed update is the foreign key
-- clearing actor_id when that user's account is deleted, with nothing else changing.
CREATE OR REPLACE FUNCTION audit_log_insert_only() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'UPDATE'
     AND OLD.actor_id IS NOT NULL AND NEW.actor_id IS NULL
     AND (to_jsonb(NEW) - 'actor_id') = (to_jsonb(OLD) - 'actor_id') THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'audit_log is insert-only';
END;
$$;
--> statement-breakpoint
CREATE TRIGGER audit_log_insert_only
BEFORE UPDATE OR DELETE ON audit_log
FOR EACH ROW EXECUTE FUNCTION audit_log_insert_only();
