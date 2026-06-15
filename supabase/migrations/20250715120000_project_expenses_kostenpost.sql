-- Kostenposten: kost_type, categorie en bouwdepot_status op project_expenses
ALTER TABLE project_expenses
  ADD COLUMN IF NOT EXISTS kost_type text NOT NULL DEFAULT 'werkelijk'
    CHECK (kost_type IN ('werkelijk', 'geschat'));

ALTER TABLE project_expenses
  ADD COLUMN IF NOT EXISTS categorie text NOT NULL DEFAULT 'overig'
    CHECK (categorie IN (
      'deuren', 'vloeren', 'elektra', 'sanitair',
      'schilderwerk', 'dakwerk', 'keuken', 'overig'
    ));

ALTER TABLE project_expenses
  ADD COLUMN IF NOT EXISTS bouwdepot_status text NOT NULL DEFAULT 'open'
    CHECK (bouwdepot_status IN ('open', 'ingediend', 'uitbetaald'));
