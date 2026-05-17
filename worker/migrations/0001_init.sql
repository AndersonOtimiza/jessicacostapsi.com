-- =====================================================================
-- 0001_init.sql — Schema inicial do sistema de cursos da Jessica Costa.
-- Aplicar com:
--   wrangler d1 execute jessicacostapsi-cursos --file=migrations/0001_init.sql
-- e em remoto (prod):
--   wrangler d1 execute jessicacostapsi-cursos --remote --file=migrations/0001_init.sql
-- =====================================================================

-- ----- Usuários (alunos) -----------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id                  TEXT PRIMARY KEY,                  -- ULID/UUID
  email               TEXT NOT NULL UNIQUE COLLATE NOCASE,
  nome                TEXT NOT NULL,
  senha_hash          TEXT NOT NULL,                     -- "pbkdf2$<iter>$<salt_hex>$<hash_hex>"
  telefone            TEXT,
  email_verificado_em DATETIME,                          -- preenchido na Fase 2 (Resend + magic link)
  criado_em           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ----- Sessões (cookie __Host-sess aponta para id) ---------------------
CREATE TABLE IF NOT EXISTS sessions (
  id          TEXT PRIMARY KEY,             -- token aleatório (32 bytes hex)
  user_id     TEXT NOT NULL,
  user_agent  TEXT,
  ip          TEXT,
  criado_em   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expira_em   DATETIME NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expira ON sessions(expira_em);

-- ----- Tentativas de login (rate limit 5 / 15min por email|ip) --------
CREATE TABLE IF NOT EXISTS login_attempts (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  email        TEXT NOT NULL COLLATE NOCASE,
  ip           TEXT,
  sucesso      INTEGER NOT NULL DEFAULT 0,
  ocorreu_em   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_login_attempts_email_time ON login_attempts(email, ocorreu_em);
CREATE INDEX IF NOT EXISTS idx_login_attempts_ip_time ON login_attempts(ip, ocorreu_em);

-- ----- Cursos ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS courses (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,                -- "criancas-com-tea-guia-pais"
  titulo          TEXT NOT NULL,
  subtitulo       TEXT,
  descricao_curta TEXT,                                -- meta-description / vitrine
  descricao_html  TEXT,                                -- corpo HTML da página de detalhe
  cover_url       TEXT,                                -- URL pública (Stream thumb ou imagem)
  preco_centavos  INTEGER NOT NULL DEFAULT 0,          -- p.ex. 19700 = R$ 197,00
  duracao_min     INTEGER,                             -- agregado (informativo)
  publicado       INTEGER NOT NULL DEFAULT 0,          -- 0/1 — vitrine só mostra publicado=1
  criado_em       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_courses_slug ON courses(slug);
CREATE INDEX IF NOT EXISTS idx_courses_publicado ON courses(publicado);

-- ----- Módulos ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS modules (
  id         TEXT PRIMARY KEY,
  course_id  TEXT NOT NULL,
  titulo     TEXT NOT NULL,
  ordem      INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_modules_course ON modules(course_id, ordem);

-- ----- Aulas -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS lessons (
  id               TEXT PRIMARY KEY,
  module_id        TEXT NOT NULL,
  titulo           TEXT NOT NULL,
  descricao        TEXT,
  ordem            INTEGER NOT NULL DEFAULT 0,
  duracao_seg      INTEGER NOT NULL DEFAULT 0,
  stream_video_uid TEXT NOT NULL DEFAULT 'placeholder', -- UID Cloudflare Stream
  preview          INTEGER NOT NULL DEFAULT 0,          -- 1 = aula liberada sem matricula
  FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_lessons_module ON lessons(module_id, ordem);

-- ----- Cupons ----------------------------------------------------------
-- Validação ocorre no Worker da Jessica antes de redirecionar pra Otimiza.
-- Marca de uso só acontece quando o webhook de pagamento aprovado chega.
CREATE TABLE IF NOT EXISTS coupons (
  id                TEXT PRIMARY KEY,
  codigo            TEXT NOT NULL UNIQUE COLLATE NOCASE, -- "TEA50"
  tipo              TEXT NOT NULL CHECK (tipo IN ('percentual','fixo')),
  valor             INTEGER NOT NULL,                   -- 50 (% se percentual; centavos se fixo)
  course_id         TEXT,                               -- NULL = vale p/ qualquer curso
  uso_maximo        INTEGER,                            -- NULL = ilimitado
  usos_atual        INTEGER NOT NULL DEFAULT 0,
  valido_de         DATETIME,
  valido_ate        DATETIME,
  ativo             INTEGER NOT NULL DEFAULT 1,
  criado_em         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_coupons_codigo ON coupons(codigo);

-- ----- Pedidos (ordens iniciadas; payment fica na Otimiza) -------------
CREATE TABLE IF NOT EXISTS orders (
  id                      TEXT PRIMARY KEY,             -- order_id interno Jessica
  user_id                 TEXT NOT NULL,
  course_id               TEXT NOT NULL,
  coupon_id               TEXT,
  valor_centavos          INTEGER NOT NULL,             -- valor pago (após cupom)
  desconto_centavos       INTEGER NOT NULL DEFAULT 0,
  status                  TEXT NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending','approved','rejected','refunded','cancelled')),
  otimiza_order_id        TEXT UNIQUE,                  -- id retornado pela Otimiza no webhook (idempotência)
  otimiza_payment_status  TEXT,                         -- "approved","pending","rejected","refunded"
  external_redirect_url   TEXT,                         -- URL completa usada no redirect (auditoria)
  criado_em               DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  pago_em                 DATETIME,
  atualizado_em           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id)   REFERENCES users(id)   ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  FOREIGN KEY (coupon_id) REFERENCES coupons(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_orders_user      ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_otimiza   ON orders(otimiza_order_id);
CREATE INDEX IF NOT EXISTS idx_orders_status    ON orders(status);

-- ----- Matrículas ------------------------------------------------------
CREATE TABLE IF NOT EXISTS enrollments (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL,
  course_id   TEXT NOT NULL,
  order_id    TEXT UNIQUE,                              -- idempotência do webhook
  ativa       INTEGER NOT NULL DEFAULT 1,
  criada_em   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expira_em   DATETIME,                                 -- NULL = vitalícia (default Fase 1)
  FOREIGN KEY (user_id)   REFERENCES users(id)   ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  FOREIGN KEY (order_id)  REFERENCES orders(id)  ON DELETE SET NULL,
  UNIQUE (user_id, course_id)
);
CREATE INDEX IF NOT EXISTS idx_enrollments_user ON enrollments(user_id);

-- ----- Progresso (1 linha por aula vista por usuário) ------------------
CREATE TABLE IF NOT EXISTS lesson_progress (
  id                  TEXT PRIMARY KEY,
  user_id             TEXT NOT NULL,
  lesson_id           TEXT NOT NULL,
  segundos_assistidos INTEGER NOT NULL DEFAULT 0,
  concluida_em        DATETIME,                         -- preenchido quando >=90% da duração
  atualizado_em       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id)   REFERENCES users(id)    ON DELETE CASCADE,
  FOREIGN KEY (lesson_id) REFERENCES lessons(id)  ON DELETE CASCADE,
  UNIQUE (user_id, lesson_id)
);
CREATE INDEX IF NOT EXISTS idx_progress_user ON lesson_progress(user_id);

-- ----- Certificados ----------------------------------------------------
CREATE TABLE IF NOT EXISTS certificates (
  id            TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL,
  course_id     TEXT NOT NULL,
  hash_publico  TEXT NOT NULL UNIQUE,                   -- 24+ chars, usado na URL /certificado/:hash
  emitido_em    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id)   REFERENCES users(id)   ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  UNIQUE (user_id, course_id)
);
CREATE INDEX IF NOT EXISTS idx_certificates_hash ON certificates(hash_publico);

-- ----- Webhook log (auditoria de eventos da Otimiza) -------------------
CREATE TABLE IF NOT EXISTS webhook_events (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  origem        TEXT NOT NULL,                          -- "otimiza-payment"
  payload       TEXT NOT NULL,                          -- body bruto
  assinatura_ok INTEGER NOT NULL,                       -- 0/1
  processado    INTEGER NOT NULL DEFAULT 0,
  resultado     TEXT,                                   -- JSON com order_id/enrollment_id/erro
  recebido_em   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_webhook_events_origem ON webhook_events(origem, recebido_em);
