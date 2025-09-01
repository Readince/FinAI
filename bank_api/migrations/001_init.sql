-- (A) sub_no müşteri bazında benzersiz olsun
ALTER TABLE accounts
  ADD CONSTRAINT IF NOT EXISTS accounts_unique_customer_sub UNIQUE (customer_id, sub_no);

-- (B) sub_no >= 1 güvence (opsiyonel ama faydalı)
ALTER TABLE accounts
  ADD CONSTRAINT IF NOT EXISTS accounts_sub_no_min CHECK (sub_no IS NULL OR sub_no >= 1);

-- (C) müşteri bazında sıradaki sub_no'yu veren fonksiyon
CREATE OR REPLACE FUNCTION accounts_next_sub_no(p_customer_id BIGINT)
RETURNS INTEGER AS $$
  SELECT COALESCE(MAX(sub_no), 0) + 1
  FROM accounts
  WHERE customer_id = p_customer_id;
$$ LANGUAGE sql STABLE;

-- (D) INSERT öncesi sub_no yoksa otomatik ver
CREATE OR REPLACE FUNCTION trg_accounts_set_sub_no()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.sub_no IS NULL THEN
    NEW.sub_no := accounts_next_sub_no(NEW.customer_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS before_ins_accounts_sub_no ON accounts;
CREATE TRIGGER before_ins_accounts_sub_no
BEFORE INSERT ON accounts
FOR EACH ROW
EXECUTE FUNCTION trg_accounts_set_sub_no();

-- (E) account_no otomatik üret (formatı istersen değiştir)
CREATE OR REPLACE FUNCTION gen_account_no(p_customer_id BIGINT, p_sub_no INT)
RETURNS TEXT AS $$
  SELECT 'C' || p_customer_id::text || '-S' || LPAD(p_sub_no::text, 2, '0');
$$ LANGUAGE sql IMMUTABLE;

CREATE OR REPLACE FUNCTION trg_accounts_set_account_no()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.account_no IS NULL OR NEW.account_no = '' THEN
    NEW.account_no := gen_account_no(NEW.customer_id, NEW.sub_no);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS before_ins_accounts_account_no ON accounts;
CREATE TRIGGER before_ins_accounts_account_no
BEFORE INSERT ON accounts
FOR EACH ROW
EXECUTE FUNCTION trg_accounts_set_account_no();

-- (F) Görsel amaçlı: 01,02… için generated column
ALTER TABLE accounts
  ADD COLUMN IF NOT EXISTS sub_no_str TEXT
  GENERATED ALWAYS AS (LPAD(sub_no::text, 2, '0')) STORED;

-- (G) Faiz kurallarını DB seviyesinde de garanti altına al
ALTER TABLE accounts
  ADD CONSTRAINT IF NOT EXISTS chk_interest_vadesiz_vadeli
  CHECK (
    (account_type = 'VADESIZ' AND interest_rate = 0)
    OR
    (account_type = 'VADELI'  AND interest_rate BETWEEN 0 AND 50)
  );

-- (H) customers.updated_at otomatik güncellensin
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_customers_set_updated_at ON customers;
CREATE TRIGGER trg_customers_set_updated_at
BEFORE UPDATE ON customers
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
