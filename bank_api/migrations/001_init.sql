CREATE TABLE IF NOT EXISTS customers (
  id            BIGSERIAL PRIMARY KEY,
  national_id   VARCHAR(11)  NOT NULL UNIQUE,   -- TCKN/VKN
  serial_no     VARCHAR(20),
  first_name    VARCHAR(100) NOT NULL,
  last_name     VARCHAR(100) NOT NULL,
  phone         VARCHAR(20),
  email         VARCHAR(255),
  birth_date    DATE,
  gender        CHAR(1) CHECK (gender IN ('E','K')),
  nationality   VARCHAR(10) CHECK (nationality IN ('TR','YABANCI')),
  mother_name   VARCHAR(100),
  father_name   VARCHAR(100),
  address       TEXT,
  branch_no     VARCHAR(10),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS accounts (
  id            BIGSERIAL PRIMARY KEY,
  customer_id   BIGINT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  currency_code CHAR(3) NOT NULL,
  account_type  VARCHAR(20) NOT NULL CHECK (account_type IN ('VADESIZ','VADELI')),
  balance       NUMERIC(18,2) NOT NULL DEFAULT 0,
  interest_rate NUMERIC(5,2)  NOT NULL DEFAULT 0,
  account_no    VARCHAR(40) NOT NULL UNIQUE,
  sub_no        INTEGER,
  status        VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_accounts_customer ON accounts(customer_id);
CREATE INDEX IF NOT EXISTS idx_accounts_currency ON accounts(currency_code);
