# Jessica Costa PSI — Site Institucional

Site profissional da psicóloga infantojuvenil **Jessica Costa** (CRP 05/56789), com foco em
acompanhamento de crianças e adolescentes típicos e neuroatípicos, baseado em **TCC** (Terapia
Cognitivo-Comportamental) e **ABA** (Análise do Comportamento Aplicada).

🌐 **Produção:** https://jessicacostapsi.com

---

## Stack

- **HTML + CSS + JavaScript vanilla** — sem framework, sem bundler, sem build step.
- **Hospedagem:** [Cloudflare Pages](https://pages.cloudflare.com/) (projeto `jessicacostapsi`).
- **Fontes:** Google Fonts (Poppins).
- **Mapa:** Google Maps embed.

## Estrutura

```
.
├── index.html              # Página principal (10 seções)
├── biografia.html          # Biografia, formação, filosofia, locais de atendimento
├── blog.html               # Listagem de artigos
├── 404.html                # Página de erro customizada
├── artigos/                # 13 artigos sobre desenvolvimento infantil
├── css/style.css           # Estilo único (responsivo, animações)
├── js/main.js              # Menu mobile, sticky header, formulário
├── img/                    # Assets visuais (favicon, og-image etc.)
├── favicon.svg             # Favicon SVG
├── robots.txt              # Diretivas de crawling
└── sitemap.xml             # Sitemap para indexação
```

## Padrões de código

- **EditorConfig** (`.editorconfig`) — UTF-8, LF, 2 espaços, newline final.
- **Prettier** (`.prettierrc`) — `printWidth=100` (HTML 120), aspas simples em JS, semi=true.
- Para formatar tudo: `npx prettier --write .`

## Desenvolvimento local

```bash
# Servidor estático simples (qualquer um serve):
npx serve .
# ou
python -m http.server 8080
```

Abrir http://localhost:8080.

## Deploy (Cloudflare Pages)

Há **três caminhos** de deploy. Em todos, segredos vêm do **1Password CLI** ou **GitHub Secrets** —
nunca de arquivo versionado.

### 1) Automático via GitHub Actions (recomendado)

Workflow: [.github/workflows/deploy.yml](.github/workflows/deploy.yml). Dispara em todo push para
`master` (ou via `workflow_dispatch`).

Configurar uma única vez em `Settings → Secrets and variables → Actions`:

| Secret | Valor |
|---|---|
| `CLOUDFLARE_API_TOKEN` | Token com escopo `Pages: Edit` |
| `CLOUDFLARE_ACCOUNT_ID` | `28248f850aef40d0c91531280962a88a` |

### 2) Manual via 1Password CLI (local)

```bash
op signin                       # autenticar 1Password
./scripts/deploy.sh             # le tokens via `op read` e dispara o wrangler
```

O script espera um item no cofre `Private` chamado `Cloudflare - jessicacostapsi` com os campos
`api_token` e `account_id`. Customize via `OP_VAULT` / `OP_ITEM` no ambiente.

### 3) Direto (legado — não usar com tokens em texto plano)

```bash
CLOUDFLARE_ACCOUNT_ID=<account_id> npx wrangler pages deploy . \
  --project-name=jessicacostapsi --branch=master
```

> ⚠️ **Token rotacionado:** o token registrado historicamente em `.claude/settings.local.json` está
> ignorado pelo `.gitignore`, mas precisa ser **revogado e rotacionado** no painel Cloudflare. A
> nova chave deve viver apenas no 1Password e nos GitHub Secrets.

## Cabeçalhos de segurança (`_headers`)

Configurados via [`_headers`](_headers) (formato Cloudflare Pages):

- `Content-Security-Policy` — restritivo, permite apenas Google Fonts/Maps, Formspree e Cloudflare Insights.
- `Strict-Transport-Security` (HSTS) com `preload`.
- `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`.
- `Referrer-Policy: strict-origin-when-cross-origin`.
- `Permissions-Policy` — desabilita câmera, microfone, geolocalização, etc.
- Cache-Control granular por tipo de asset.

Ao adicionar um novo provedor (ex.: pixel de tracking, vídeo embed), atualizar a CSP no `_headers`.

## Redirects (`_redirects`)

Atalhos amigáveis: `/sobre → /biografia.html`, `/whatsapp → wa.me/...`, etc. Catch-all 404 explícito.

## Formulário de contato

- HTML: `<form action="https://formspree.io/f/YOUR_FORM_ID" method="POST">` em [index.html](index.html).
- JS: [js/main.js](js/main.js) intercepta `submit`. Se `action` ainda for o placeholder
  `YOUR_FORM_ID`, faz **fallback automático para `mailto:psiporjessica@gmail.com`**, montando o
  corpo com nome/email/telefone/mensagem.
- **Para ativar Formspree:** criar form em <https://formspree.io>, copiar o ID e substituir
  `YOUR_FORM_ID` no `action`. Nada mais precisa mudar.

## Analytics (Cloudflare Web Analytics)

Snippet **comentado** em todas as páginas principais (`index.html`, `biografia.html`, `blog.html`).
Para ativar:

1. Painel: <https://one.dash.cloudflare.com/?to=/:account/web-analytics> → criar site.
2. Copiar o `beacon token` gerado.
3. Em cada HTML, descomentar o `<script defer src="...beacon.min.js" data-cf-beacon=...>` e
   substituir `REPLACE_WITH_BEACON_TOKEN`.
4. Sem cookies, LGPD-friendly. A CSP em `_headers` já libera o domínio.

## SEO

- Meta tags Open Graph + Twitter Card em todas as páginas.
- `sitemap.xml` na raiz, declarado em `robots.txt`.
- JSON-LD `Person` + `MedicalBusiness` + `WebSite` em `index.html`; `Person` enriquecido em `biografia.html`.
- `404.html` marcado `noindex, follow`.
- PWA: [`site.webmanifest`](site.webmanifest), `apple-touch-icon` e `theme-color` configurados.

## LGPD / Privacidade

- Página: [privacidade.html](privacidade.html) — política completa, base legal, retenção, direitos
  do titular, contato do encarregado (DPO).
- Link no rodapé de todas as páginas principais.
- Sem cookies próprios. Apenas analytics anônimo (quando ativado).

## Contato profissional (referência)

- 📱 WhatsApp: [+55 21 97808-2882](https://wa.me/5521978082882)
- ✉️ E-mail: psiporjessica@gmail.com
- 📍 Vertice Mall — Av. Miguel Antônio Fernandes, 1333 — Recreio dos Bandeirantes, Rio de Janeiro/RJ
- 🎵 TikTok: [@jessicacostapsi](https://www.tiktok.com/@jessicacostapsi)
- 💼 LinkedIn: [jessicacostapsi](https://www.linkedin.com/in/jessicacostapsi)
