-- (A) müşteri bazında ek no benzersiz + min kontrolü
ALTER TABLE public.accounts
  ADD CONSTRAINT IF NOT EXISTS accounts_unique_customer_sub UNIQUE (customer_id, sub_no);
ALTER TABLE public.accounts
  ADD CONSTRAINT IF NOT EXISTS accounts_sub_no_min CHECK (sub_no IS NULL OR sub_no >= 1);

-- (B) sıradaki sub_no
CREATE OR REPLACE FUNCTION public.accounts_next_sub_no(p_customer_id BIGINT)
RETURNS INTEGER AS $$
  SELECT COALESCE(MAX(sub_no), 0) + 1
  FROM public.accounts
  WHERE customer_id = p_customer_id;
$$ LANGUAGE sql STABLE;

-- (C) sub_no trigger (ÖNCE çalışmalı)
CREATE OR REPLACE FUNCTION public.trg_accounts_set_sub_no()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.sub_no IS NULL THEN
    NEW.sub_no := public.accounts_next_sub_no(NEW.customer_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS before_ins_accounts_sub_no ON public.accounts;
DROP TRIGGER IF EXISTS before_ins_accounts_1_sub_no ON public.accounts;

CREATE TRIGGER before_ins_accounts_1_sub_no
BEFORE INSERT ON public.accounts
FOR EACH ROW
EXECUTE FUNCTION public.trg_accounts_set_sub_no();

-- (D) account_no üretici
CREATE OR REPLACE FUNCTION public.gen_account_no(p_customer_id BIGINT, p_sub_no INT)
RETURNS TEXT AS $$
  SELECT 'C' || p_customer_id::text || '-S' || LPAD(p_sub_no::text, 2, '0');
$$ LANGUAGE sql IMMUTABLE;

CREATE OR REPLACE FUNCTION public.trg_accounts_set_account_no()
RETURNS TRIGGER AS $$
DECLARE
  v_branch TEXT;
BEGIN
  IF NEW.account_no IS NULL OR NEW.account_no = '' THEN
    SELECT branch_no INTO v_branch FROM public.customers WHERE id = NEW.customer_id;
    IF v_branch IS NOT NULL AND v_branch <> '' THEN
      NEW.account_no := 'BR' || v_branch || '-' || public.gen_account_no(NEW.customer_id, NEW.sub_no);
    ELSE
      NEW.account_no := public.gen_account_no(NEW.customer_id, NEW.sub_no);
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS before_ins_accounts_account_no ON public.accounts;
DROP TRIGGER IF EXISTS before_ins_accounts_2_account_no ON public.accounts;

CREATE TRIGGER before_ins_accounts_2_account_no
BEFORE INSERT ON public.accounts
FOR EACH ROW
EXECUTE FUNCTION public.trg_accounts_set_account_no();
