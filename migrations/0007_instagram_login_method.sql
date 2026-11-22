ALTER TABLE instagram_account ADD COLUMN login_method TEXT NOT NULL DEFAULT 'instagram'
  CHECK (login_method IN ('instagram', 'unified'));

ALTER TABLE instagram_posts ADD COLUMN login_method TEXT NOT NULL DEFAULT 'instagram'
  CHECK (login_method IN ('instagram', 'unified'));
