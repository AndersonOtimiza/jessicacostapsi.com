# Jessica Costa Psi — Worker de Cursos

Worker Cloudflare que assume a zona `jessicacostapsi.com` e adiciona, em
cima do site institucional estático, todo o sistema de cursos: cadastro
de aluno, login, vitrine, player Cloudflare Stream, progresso,
certificado e webhook de pagamento vindo da Otimiza.

O Worker NÃO processa pagamento — quem faz isso é o `otimizapro.com`
(conta MP da Otimiza). O Worker da Jessica só:

1. Redireciona o aluno logado para a Otimiza com `order_id`, `user_id`, etc.
2. Recebe webhook HMAC quando o pagamento for aprovado.
3. Cria a matrícula e libera o player.

## Stack

- **Cloudflare Workers** (módulos ES, JavaScript puro — sem TypeScript, sem build extra).
- **D1** (SQLite) para usuários, cursos, matrículas, progresso, cupons, pedidos, log de webhook, certificados.
- **KV** para tokens efêmeros (reset de senha, TTL 60min).
- **Cloudflare Stream** para hospedar vídeos das aulas, com URL assinada (JWT RS256) por aula com `exp = now + 4h`.
- **Pages assets binding** (`env.ASSETS`) para servir o site institucional atual (HTMLs, CSS, JS, imagens) sem reescrever nada.
- **HTMLRewriter** para injetar `Cursos` + bloco de auth na navegação dos HTMLs estáticos sem editar 24 arquivos.

## Estrutura

```
worker/
├── wrangler.toml           # Configuração CF (route, bindings, vars)
├── package.json            # Scripts npm (dev, deploy, d1:init, d1:seed)
├── migrations/
│   ├── 0001_init.sql       # Schema completo (10 tabelas)
│   └── 0002_seed.sql       # 1 curso de exemplo (2 módulos, 4 aulas), 1 cupom
└── src/
    ├── index.js            # Router principal (entry)
    ├── utils.js            # Helpers (escape, hmac, cookies, ids, log)
    ├── db.js               # Wrappers sobre D1
    ├── auth.js             # PBKDF2-SHA256 600k, sessões, rate limit, reset
    ├── auth_pages.js       # Render+handlers das telas (/cadastro, /login...)
    ├── email.js            # STUB (Fase 2 vira Resend)
    ├── layout.js           # renderLayout SSR (header/footer iguais ao site)
    ├── rewriter.js         # HTMLRewriter para nav dos HTMLs estáticos
    ├── courses.js          # /cursos, /cursos/:slug, /cursos/:slug/comprar
    ├── coupon.js           # Validação de cupom
    ├── stream.js           # Assinatura JWT Cloudflare Stream
    ├── student.js          # /aluno, /aluno/curso/:slug, /api/lessons/.../progress
    ├── certificate.js      # Emissão + render /certificado/:hash
    └── webhook.js          # POST /api/webhook/otimiza-payment
```

## Rotas

| Método | Caminho                                  | Acesso  | Descrição                                       |
|--------|------------------------------------------|---------|-------------------------------------------------|
| GET    | `/cursos`                                | público | Vitrine SEO                                     |
| GET    | `/cursos/:slug`                          | público | Detalhe + botão Comprar                         |
| POST   | `/cursos/:slug/comprar` (form `cupom`)   | logado  | Cria order pending, renderiza auto-submit POST p/ Otimiza (PII vai no body, não na URL) |
| GET/POST | `/cadastro`                            | público | Signup                                          |
| GET/POST | `/login`                               | público | Login                                           |
| POST   | `/logout`                                | logado  | Destroi sessão (POST obrigatório, anti-CSRF)    |
| GET/POST | `/senha/esqueci`                       | público | Inicia reset (gera token KV, dispara stub email)|
| GET/POST | `/senha/resetar?token=...`             | público | Define nova senha                               |
| GET    | `/aluno`                                 | logado  | Dashboard com cursos + % progresso              |
| GET    | `/aluno/curso/:slug?aula=...`            | logado  | Player Stream + lista de aulas                  |
| POST   | `/api/lessons/:id/progress`              | logado  | Atualiza progresso; emite certificado se concluiu |
| GET    | `/certificado/:hash`                     | público | Certificado HTML A4 paisagem (print-friendly)   |
| POST   | `/api/webhook/otimiza-payment`           | HMAC    | Recebe webhook de pagamento da Otimiza          |
| GET    | `/api/health`                            | público | `{ ok: true, ts }` para monitoring              |
| *      | qualquer outra rota                       | -       | Passthrough Pages (site estático) + rewriter    |

## Setup inicial (Anderson roda)

### 1. Instalar dependências

```bash
cd worker
npm install
```

### 2. Criar D1

```bash
npx wrangler d1 create jessicacostapsi-cursos
# copiar o database_id retornado e colar em wrangler.toml [[d1_databases]] -> database_id
```

### 3. Criar KV (reset de senha)

```bash
npx wrangler kv namespace create JESSICA_KV
# copiar o id retornado e colar em wrangler.toml [[kv_namespaces]] -> id
```

### 4. Aplicar migrations

Local (dev):
```bash
npm run d1:init
npm run d1:seed
```

Remoto (produção):
```bash
npm run d1:init:remote
npm run d1:seed:remote
```

### 5. Configurar secrets

```bash
# 32 bytes aleatórios (Linux/macOS): openssl rand -hex 32
# Windows PowerShell: [Convert]::ToHexString((1..32 | %{[byte](Get-Random -Max 256)}))
npx wrangler secret put SESSION_COOKIE_SECRET

# Combinado com a Otimiza (mesmo valor dos dois lados!)
npx wrangler secret put OTIMIZA_X_JESSICA_SECRET

# Cloudflare Stream
npx wrangler secret put CF_STREAM_ACCOUNT_ID
npx wrangler secret put CF_STREAM_SIGNING_KEY_ID
npx wrangler secret put CF_STREAM_SIGNING_KEY_JWK   # JSON da chave privada
# OBRIGATÓRIO (videodelivery.net é deprecated e não aceita todos os tokens):
npx wrangler secret put CF_STREAM_SUBDOMAIN          # ex: customer-abc123.cloudflarestream.com
```

> Para gerar uma chave de signing no Stream:
> Dash CF → Stream → Settings → Signing Keys → **Create a key** → copiar
> o `id` e a `jwk` (chave privada). O JWK vai inteiro como string JSON
> no secret (com aspas escapadas se for via terminal).

### 6. Conferir a route

`wrangler.toml` já tem:
```
pattern = "jessicacostapsi.com/*"
pattern = "www.jessicacostapsi.com/*"
```

Após o primeiro `wrangler deploy`, o Worker assume essas rotas. **O
projeto Cloudflare Pages atual (`jessicacostapsi`) deve continuar
existindo** porque o Worker o usa como fonte de `[assets]`. Mas o
custom domain do Pages pode ser desconectado quando este Worker for
ativado (verificar primeiro num branch alternativo se quiser zero
downtime).

### 7. Deploy

```bash
npm run deploy
# ou: npx wrangler deploy
```

Após o deploy, smoke check:

```bash
curl -sI https://jessicacostapsi.com/cursos | head -3
curl -sI https://jessicacostapsi.com/                   # deve continuar 200, vindo do ASSETS
curl -s  https://jessicacostapsi.com/api/health         # {"ok":true,"ts":"..."}
```

### 8. Logs

```bash
npm run tail
# wrangler tail jessicacostapsi-worker --format pretty
```

Tudo logado é JSON estruturado (`scope`, `level`, `msg`, ...). Procure
por `scope:"webhook"` ou `scope:"checkout"` para auditar.

## Editar conteúdo na Fase 1 (SQL na mão)

Sem admin web ainda. Use D1 direto:

```bash
npx wrangler d1 execute jessicacostapsi-cursos --remote --command "UPDATE courses SET preco_centavos = 29700 WHERE slug = 'criancas-com-tea-guia-para-pais'"

npx wrangler d1 execute jessicacostapsi-cursos --remote --command "INSERT INTO lessons (id, module_id, titulo, ordem, duracao_seg, stream_video_uid) VALUES ('les_tea_0103', 'mod_tea_01', 'Sinais comuns na primeira infância', 3, 900, 'uid_real_do_stream')"

npx wrangler d1 execute jessicacostapsi-cursos --remote --command "INSERT INTO coupons (id, codigo, tipo, valor, ativo) VALUES ('cup_black', 'BLACK30', 'percentual', 30, 1)"

# Reembolso manual:
npx wrangler d1 execute jessicacostapsi-cursos --remote --command "UPDATE orders SET status = 'refunded' WHERE id = 'ord_xxx'; UPDATE enrollments SET ativa = 0 WHERE order_id = 'ord_xxx'"
```

## Contrato com a Otimiza (cópia para o lado Otimiza)

Este bloco é o que o lado Otimiza precisa implementar.

### 1. Redirect que a Otimiza recebe (POST form, NÃO GET)

```
POST https://otimizapro.com/checkout/jessica/<course_slug>
Content-Type: application/x-www-form-urlencoded

order_id=<gerado_pela_jessica>
&user_id=<id_do_aluno_jessica>
&email=<email_do_aluno>
&nome=<nome_do_aluno>
&course_id=<id_interno_curso_jessica>
&course_slug=<slug>
&valor_centavos=<inteiro_pos_desconto>
&coupon=<CODIGO>                 # opcional
&coupon_id=<id_interno_jessica>  # opcional
&desconto_centavos=<inteiro>     # opcional
&return_url=https://jessicacostapsi.com/cursos/<slug>
```

**Por que POST e não GET 302**: PII (email, nome) na querystring vaza em
logs de servidor, header `Referer` e histórico do navegador. POST body
não aparece nesses canais. O Worker da Jessica envia um pequeno HTML com
form `auto-submit` em `<script>` (com `<button>` de fallback caso JS
esteja desligado).

A Otimiza precisa:
- Aceitar `POST application/x-www-form-urlencoded` na rota `/checkout/jessica/:slug`.
- Renderizar checkout próprio (cartão / Pix / boleto via MP).
- Tratar `valor_centavos` como **valor final** (cupom já aplicado pelo lado Jessica).
- Após confirmação da MP, disparar o webhook abaixo (seção 2).
- Não exigir cadastro adicional do aluno (ele já está logado no domínio da Jessica).
- Redirecionar de volta para `return_url` ao finalizar (success ou cancel).

### 2. Webhook que a Otimiza envia (com timestamp anti-replay)

```
POST https://jessicacostapsi.com/api/webhook/otimiza-payment
Content-Type: application/json
x-otimiza-signature: <hex(HMAC_SHA256(OTIMIZA_X_JESSICA_SECRET, body_bruto))>

{
  "order_id":            "ord_xxx",        // mesmo recebido no redirect
  "user_id":             "usr_xxx",        // idem
  "user_email":          "aluno@email",
  "course_slug":         "criancas-com-tea-guia-para-pais",
  "status":              "approved",       // ou "pending"|"rejected"|"refunded"
  "paid_at":             "2026-05-16T15:30:00Z",
  "valor_centavos":      9850,
  "otimiza_payment_id":  "mp_payment_id_string",
  "timestamp":           "2026-05-16T15:30:02Z"   // OBRIGATÓRIO — janela 5min
}
```

**Campo `timestamp` é obrigatório.** É o instante em que a Otimiza está
enviando o webhook (não confundir com `paid_at`). A Jessica rejeita com
400 se estiver fora de uma janela de ±5min do `now()` no servidor — sem
isso, um atacante com cópia de webhook válido poderia replay meses
depois (HMAC sem timestamp = válido eternamente).

**Resposta esperada (200 OK):**
```json
{ "ok": true, "enrollment_id": "enr_xxx", "duplicated": false }
```

**Status não-aprovado** ainda retorna `200 OK` com `enrollment_id: null` — a Otimiza não precisa retry.

**Erros:**
- `401 { "error": "assinatura inválida" }` → confira o secret.
- `404 { "error": "order não encontrada" }` → reidentifique o `order_id`.
- `400 { "error": "payload inválido" }` → JSON malformado ou faltando `order_id`/`status`.
- `400 { "error": "timestamp ausente" }` → adicione o campo `timestamp` no payload.
- `400 { "error": "timestamp fora da janela de 5min" }` → sincronize o clock da Otimiza ou reduza o delay entre envio e POST.

**Idempotência:** o webhook pode ser reenviado N vezes — a Jessica
detecta pelo `order_id` (ou pela tupla `user_id+course_id`) e devolve
`duplicated: true` sem criar matrícula nova. Cupom só é incrementado uma
vez (UPDATE condicional, race-safe entre webhooks paralelos).

**Validação de `course_slug`:** o slug do payload é IGNORADO para fins
de matrícula — a Jessica matricula no `course_id` registrado quando a
order foi criada (no clique de Comprar). Se o slug do payload divergir,
isso é logado como warning mas não bloqueia. Esse comportamento impede
matricular o aluno em curso diferente do que ele pagou caso a Otimiza
envie slug errado.

### 3. Como assinar (exemplo Node.js no lado Otimiza)

```js
const crypto = require('node:crypto');
const payload = {
  order_id:           'ord_xxx',
  user_id:            'usr_xxx',
  user_email:         'aluno@email',
  course_slug:        'criancas-com-tea-guia-para-pais',
  status:             'approved',
  paid_at:            new Date().toISOString(),
  valor_centavos:     9850,
  otimiza_payment_id: 'mp_payment_id',
  timestamp:          new Date().toISOString(), // obrigatório (janela 5min)
};
const body = JSON.stringify(payload);
const signature = crypto
  .createHmac('sha256', process.env.OTIMIZA_X_JESSICA_SECRET)
  .update(body)
  .digest('hex');

await fetch('https://jessicacostapsi.com/api/webhook/otimiza-payment', {
  method: 'POST',
  headers: {
    'content-type': 'application/json',
    'x-otimiza-signature': signature,
  },
  body,
});
```

### 4. Como testar via curl (após configurar o secret nos dois lados)

```bash
TS=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
BODY=$(printf '{"order_id":"ord_test_001","user_id":"usr_xxx","user_email":"aluno@teste.com","course_slug":"criancas-com-tea-guia-para-pais","status":"approved","paid_at":"%s","valor_centavos":9850,"otimiza_payment_id":"mp_test_001","timestamp":"%s"}' "$TS" "$TS")
SIG=$(printf '%s' "$BODY" | openssl dgst -sha256 -hmac "$OTIMIZA_X_JESSICA_SECRET" -hex | awk '{print $2}')
curl -X POST https://jessicacostapsi.com/api/webhook/otimiza-payment \
  -H "content-type: application/json" \
  -H "x-otimiza-signature: $SIG" \
  -d "$BODY"
```

> Para esse curl funcionar a `order_id` precisa existir em
> `orders` (criada quando o aluno clicar em Comprar no site da Jessica).
> Para teste isolado, criar manualmente um order:
> ```
> wrangler d1 execute jessicacostapsi-cursos --remote --command "INSERT INTO orders (id, user_id, course_id, valor_centavos, status) VALUES ('ord_test_001', 'usr_xxx', 'crs_tea_guia_pais_v1', 9850, 'pending')"
> ```

## Pontos de atenção / TODO Fase 2

Itens conscientemente deixados de fora desta Fase 1.

- **CAPTCHA (Turnstile)** no /cadastro e /login. Hoje só rate limit por email+ip.
- **Resend** para envio real de email (reset de senha, recibo de matrícula). Hoje é stub que loga no `wrangler tail`. Aluno cadastra sem verificação.
- **Painel admin web** (criar/editar curso, módulos, aulas, cupons, listar matrículas, refund). Hoje é SQL na mão (`wrangler d1 execute`).
- **NF-e / recibo** — emissão e envio. Pode ficar com a Otimiza ou com a Jessica, decisão Anderson.
- **QR Code no certificado** — substituído pela URL textual em destaque (decisão pragmática Fase 1; QR puro JS exige lib testada).
- **Progresso automático via Stream events** — hoje o aluno marca "Concluída" no botão; player Stream pode emitir `timeupdate` para atualizar `segundos_assistidos` automaticamente.
- **Página /aluno/perfil** — alterar nome/email/senha do aluno.
- **Suspensão de matrícula / data de expiração** — schema já suporta (`expira_em`), faltam endpoints de UI.
- **A/B testing de preço** — schema atual é flat (1 preço por curso).
- **Multi-tenant** — sistema é single-tenant Jessica. Se algum dia for ser reaproveitado, exige refactor.
- **Email transacional do tipo "matrícula confirmada"** — disparar via stub hoje, ativar via Resend na Fase 2 (precisa aprovação literal do template pelo Anderson — política do ecossistema, mas aqui o cliente é a Jessica, então é Anderson + Jessica).

## Atalhos para Anderson

```bash
# Ver últimas matrículas
npx wrangler d1 execute jessicacostapsi-cursos --remote --command "SELECT e.id, u.email, c.titulo, e.criada_em FROM enrollments e JOIN users u ON u.id = e.user_id JOIN courses c ON c.id = e.course_id ORDER BY e.criada_em DESC LIMIT 20"

# Ver últimos webhooks (debug)
npx wrangler d1 execute jessicacostapsi-cursos --remote --command "SELECT id, origem, assinatura_ok, processado, resultado, recebido_em FROM webhook_events ORDER BY id DESC LIMIT 20"

# Resetar tudo (CUIDADO — não roda em prod sem confirmar com Jessica)
# Drop + recreate via migration 0001 + seed 0002.
```
