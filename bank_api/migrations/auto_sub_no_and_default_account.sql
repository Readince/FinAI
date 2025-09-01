-- 1) (customer_id, sub_no) benzersiz
ALTER TABLE accounts
  ADD CONSTRAINT IF NOT EXISTS accounts_unique_customer_sub
  UNIQUE (customer_id, sub_no);

-- 2) sub_no >= 1 (opsiyonel ama iyi)
ALTER TABLE accounts
  ADD CONSTRAINT IF NOT EXISTS accounts_sub_no_min
  CHECK (sub_no IS NULL OR sub_no >= 1);

-- 3) sıradaki sub_no
CREATE OR REPLACE FUNCTION accounts_next_sub_no(p_customer_id BIGINT)
RETURNS INTEGER AS $$
  SELECT COALESCE(MAX(sub_no), 0) + 1
  FROM accounts
  WHERE customer_id = p_customer_id;
$$ LANGUAGE sql STABLE;

-- 4) sub_no'yu dolduran trigger (ÖNCE çalışmalı)
CREATE OR REPLACE FUNCTION trg_accounts_set_sub_no()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.sub_no IS NULL THEN
    NEW.sub_no := accounts_next_sub_no(NEW.customer_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Eskiyi sil, isimle sıralamayı garantile
DROP TRIGGER IF EXISTS before_ins_accounts_sub_no ON accounts;
DROP TRIGGER IF EXISTS before_ins_accounts_1_sub_no ON accounts;

CREATE TRIGGER before_ins_accounts_1_sub_no
BEFORE INSERT ON accounts
FOR EACH ROW
EXECUTE FUNCTION trg_accounts_set_sub_no();

-- 5) (opsiyonel) iki haneli gösterim — PG12+ için generated column
ALTER TABLE accounts
  ADD COLUMN IF NOT EXISTS sub_no_str TEXT
  GENERATED ALWAYS AS (LPAD(sub_no::text, '2', '0')) STORED;

-- 6) account_no üretici
CREATE OR REPLACE FUNCTION gen_account_no(p_customer_id BIGINT, p_sub_no INT)
RETURNS TEXT AS $$
  SELECT 'C' || p_customer_id::text || '-S' || LPAD(p_sub_no::text, 2, '0');
$$ LANGUAGE sql IMMUTABLE;

CREATE OR REPLACE FUNCTION trg_accounts_set_account_no()
RETURNS TRIGGER AS $$
DECLARE
  v_branch TEXT;
BEGIN
  IF NEW.account_no IS NULL OR NEW.account_no = '' THEN
    SELECT branch_no INTO v_branch FROM customers WHERE id = NEW.customer_id;
    IF v_branch IS NOT NULL AND v_branch <> '' THEN
      NEW.account_no := 'BR' || v_branch || '-' || gen_account_no(NEW.customer_id, NEW.sub_no);
    ELSE
      NEW.account_no := gen_account_no(NEW.customer_id, NEW.sub_no);
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Eskiyi sil, İKİNCİ sırada çalışsın diye isimle
DROP TRIGGER IF EXISTS before_ins_accounts_account_no ON accounts;
DROP TRIGGER IF EXISTS before_ins_accounts_2_account_no ON accounts;

CREATE TRIGGER before_ins_accounts_2_account_no
BEFORE INSERT ON accounts
FOR EACH ROW
EXECUTE FUNCTION trg_accounts_set_account_no();
