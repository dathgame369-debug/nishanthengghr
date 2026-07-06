-- Activity log table to track all user interactions across the portal
CREATE TABLE IF NOT EXISTS activity_log (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  timestamp   timestamptz DEFAULT now() NOT NULL,
  username    text,
  action      text NOT NULL,
  module      text NOT NULL,
  description text,
  meta        jsonb
);

CREATE INDEX IF NOT EXISTS activity_log_timestamp_idx ON activity_log (timestamp DESC);
CREATE INDEX IF NOT EXISTS activity_log_module_idx    ON activity_log (module);
CREATE INDEX IF NOT EXISTS activity_log_action_idx    ON activity_log (action);
