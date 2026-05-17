# Jessica Costa PSI — Site institucional

## Resumo
Site estático da psicóloga infantojuvenil **Jessica Costa** (CRP 05/56789, Recreio dos Bandeirantes — RJ). HTML/CSS/JS vanilla, **sem build step**, deploy em **Cloudflare Pages** (projeto `jessicacostapsi`) servindo o domínio **jessicacostapsi.com**. Repo: [AndersonOtimiza/jessicacostapsi.com](https://github.com/AndersonOtimiza/jessicacostapsi.com). Status: em produção; CTAs principais via WhatsApp (`5521978082882`).

## Estrutura
- [index.html](index.html) — landing principal, 10 seções (hero, especialidades, biografia, depoimentos, blog preview, contato, etc.)
- [biografia.html](biografia.html) — formação, abordagem, filosofia
- [blog.html](blog.html) — index dos artigos
- [colunistas.html](colunistas.html) — colunistas convidados
- [404.html](404.html) — página de erro
- [artigos/](artigos/) — 13 artigos (TEA, TDAH, ansiedade, birra, parentalidade etc.)
- [css/style.css](css/style.css) — único stylesheet (~1.300 linhas, animações de abelhas 🐝)
- [js/main.js](js/main.js) — sticky header, menu mobile, observer de animação, fallback mailto, mensagem dinâmica WhatsApp por página
- [robots.txt](robots.txt) / [sitemap.xml](sitemap.xml) — base SEO

## Comandos

### Deploy (Cloudflare Pages)
O account ID e os flags de deploy ficam em `.claude/settings.local.json` (já permitidos). Comando padrão:
```bash
CLOUDFLARE_ACCOUNT_ID=28248f850aef40d0c91531280962a88a npx wrangler pages deploy . --project-name=jessicacostapsi --branch=main
```
Listar deploys: `... npx wrangler pages deployment list --project-name=jessicacostapsi`.
Antes de deploy, rodar a skill `deploy-cloudflare` (faz pré-checks).

### Git
```bash
git status
git add <arquivos-específicos>          # NUNCA git add -A nesta raiz (ver gotchas)
git commit -m "..."
git push origin master
```

### Smoke check
```bash
curl -sI https://jessicacostapsi.com/ | head -5
curl -sI https://jessicacostapsi.com/sitemap.xml | head -3
```

## Convenções e gotchas
- **Sem build, sem dependências.** Editar HTML/CSS/JS direto. Tudo é servido como arquivo estático.
- **Nunca fazer `git add -A`** — `.claude/settings.local.json` contém **token Cloudflare e zone ID literais**. O `.gitignore` deste projeto já protege, mas adicione arquivos por nome quando puder.
- **Caminhos relativos diferem por nível**: páginas raiz usam `css/style.css`; artigos em `artigos/*.html` usam `../css/style.css`. Ao criar artigo novo, preservar o padrão `../`.
- **Header navigation** é **duplicado** em cada HTML (não há include). Ao mudar a navegação, atualizar todos os HTMLs (raiz + 13 artigos).
- **CTA principal é WhatsApp**, não formulário. Links `wa.me/5521978082882` recebem `?text=` dinâmico via [js/main.js](js/main.js) (mensagem muda conforme a página/artigo).
- **Formulário de contato** usa Formspree com fallback `mailto:psiporjessica@gmail.com` — o `action="..."` ainda contém `YOUR_FORM_ID` (placeholder); enquanto isso o fallback mailto está ativo. Configurar Formspree real antes de divulgar o form.
- **Sitemap.xml é manual** — ao adicionar/remover artigo, atualizar via skill `gerar-sitemap` (ou editar à mão).
- **Diretório `img/` está vazio.** O site usa só emojis 🐝 ✨ 🧩 — não há imagens binárias. Se adicionar fotos, otimizar (WebP, ≤200KB).
- **Dados sensíveis no rodapé**: telefone, email, CRP — todos públicos por opção da cliente. Endereço completo só "Vertice Mall - Recreio".

## Recursos externos
| Recurso | Onde | Para quê |
|---|---|---|
| Cloudflare Pages | account `28248f850aef40d0c91531280962a88a`, projeto `jessicacostapsi` | hosting + CDN |
| Cloudflare DNS | zone `528d39b71b15a717ff05a77cd7c217ad` (jessicacostapsi.com) | DNS / domínio |
| GitHub | [AndersonOtimiza/jessicacostapsi.com](https://github.com/AndersonOtimiza/jessicacostapsi.com) | repo `master` |
| Google Fonts | Poppins 300/400/500/600/700/800 | tipografia |
| WhatsApp Business | `5521978082882` | CTA principal |
| Formspree | (não configurado ainda) | form de contato — placeholder `YOUR_FORM_ID` |

MCPs úteis disponíveis: **Google Search Console** (`mcp__gsc__*`) para indexação/queries, **Cloudflare Developer Platform** para gerência de zona/Workers.

## Automações ativas (este projeto)

Localizadas em `.claude/` da raiz do projeto. Removíveis individualmente.

### Subagente admin (no workspace pai, restrito a este projeto)
- **`jessicacostapsi-admin`** — vive em [../../.claude/agents/jessicacostapsi-admin.md](../../.claude/agents/jessicacostapsi-admin.md). É o especialista que o `ecosystem-admin` invoca para qualquer tarefa neste diretório. Escopo restrito a `Projetos para Clientes/Jessica Costa Psi/` — **isolado das convenções Otimiza**.

### Skills (`.claude/skills/`)
- **deploy-cloudflare** — deploy seguro com pré-checks (sitemap, links quebrados, status git). Uso: `/deploy-cloudflare`. Desinstalar: `rm -rf .claude/skills/deploy-cloudflare`.
- **gerar-sitemap** — regenera `sitemap.xml` a partir dos HTMLs presentes. Uso: `/gerar-sitemap`. Desinstalar: `rm -rf .claude/skills/gerar-sitemap`.
- **audit-seo** — auditoria de meta tags, sitemap, robots, headers e links internos. Uso: `/audit-seo`. Desinstalar: `rm -rf .claude/skills/audit-seo`.

### Subagentes (`.claude/agents/`)
- **seo-auditor** — auditoria SEO completa (meta tags, OG, sitemap, schema.org, performance hints).
- **code-reviewer** — revisa diff antes de commit (HTML válido, links quebrados, consistência de navegação entre páginas).

### Hooks
**Nenhum instalado.** Sugestões plausíveis (não instaladas — pedem confirmação):
- `PreToolUse:Bash` para bloquear `git push --force` em master.
- `PostToolUse:Edit|Write` em `*.html` para validar lang/charset/viewport/description (HTML mínimo).

### Schedules sugeridos (não criados)
Ver "Próximos passos" no fim do diagnóstico inicial. Criar via `/schedule` quando quiser.

## Memória persistente
Memória global do projeto (entre sessões) em `~/.claude/projects/v--Projetos-Jessica-Costa-Psi/memory/` — gerenciada pelo sistema `auto memory`, não duplicar aqui.

## TODO editorial / produção (auditoria SEO 2026-05-04)

Itens pendentes que dependem de decisão da Jessica Costa ou ação no painel Cloudflare. Correções mecânicas (canonical, sitemap, Article schema, copyright 2026, `_redirects` cleanup) já aplicadas em 22 arquivos — revisar com `git diff` antes de deploy.

### Editorial (decisão da cliente via Anderson)
- [ ] **Encurtar 11 titles >60 chars** (sugestões prontas — remover sufixo ` - Jessica Costa PSI`):
  - `tdah-em-adultos.html` (93 chars; mais grave) → "TDAH em Adultos: Como Identificar os Traços"
  - `diagnostico-de-tea.html` (80) → "Diagnóstico de TEA: Primeiros Passos para a Família"
  - `telas-e-desenvolvimento-infantil.html` (81) → "Telas e Desenvolvimento Infantil: O Equilíbrio"
  - `ansiedade-infantil.html` (76) → "Ansiedade Infantil: Sinais que os Pais Devem Conhecer"
  - `habilidades-sociais.html` (75) → "Habilidades Sociais: Como Seu Filho Faz Amigos"
  - `tdah-na-escola.html` (73) → "TDAH na Escola: Ajude Seu Filho a se Concentrar"
  - `rotina-e-previsibilidade.html` (72) → "Rotina e Previsibilidade: Aliadas do Desenvolvimento"
  - `seletividade-alimentar.html` (71) → "Seletividade Alimentar em Crianças Neurodivergentes"
  - `o-papel-do-brincar.html` (66) · `parentalidade-positiva.html` (66) · `como-falar-sobre-emocoes.html` (66) → remover sufixo
- [ ] **Aplicar `noindex, follow` em `colunistas.html`** até ter colunistas reais (hoje é thin content: 3 cards "Em breve").
- [ ] **Internal linking** nos 13 artigos (12 cross-links sugeridos — clusters TEA, TDAH, regulação emocional, parentalidade). Texto natural no corpo, não lista no fim.
- [ ] **Encurtar description do `tdah-em-adultos.html`** de 155 → ~140 chars (folga, opcional).

### Produção (Anderson — painel Cloudflare + design)
- [x] ~~**Desligar Bot Fight Mode** na zona `jessicacostapsi.com` (zone `528d39b71b15a717ff05a77cd7c217ad`) — bloqueia Googlebot/Bingbot hoje (403 + challenge).~~ ✅ Verificado 2026-05-16 via API: `fight_mode:false` + toda a stack de Bot Management off (ai_bots/content_bots/crawler protection disabled, cf_robots_variant off).
- [ ] **Confirmar deploy ativo**: `wrangler pages deployment list --project-name=jessicacostapsi` — robots/sitemap/og retornam 404 em prod apesar de existirem no repo.
- [ ] **Gerar `img/og-image.png` raster 1200×630** (Facebook/LinkedIn rejeitam SVG).
- [ ] **Ativar Cloudflare Web Analytics**: criar beacon token + descomentar snippet em 5 páginas (index, biografia, blog, colunistas, privacidade).
- [ ] **Rotacionar token Cloudflare** ainda em `.claude/settings.local.json` (ver README.md).

### Validação pós-deploy
- [x] ~~`curl -I https://jessicacostapsi.com/robots.txt` → 200~~ ✅ 2026-05-16
- [x] ~~`curl -I https://jessicacostapsi.com/sitemap.xml` → 200~~ ✅ 2026-05-16
- [x] ~~`curl -sI -A "Googlebot/2.1" https://jessicacostapsi.com/` → 200~~ ✅ 2026-05-16 (Bot Fight Mode off)
- [ ] GSC: rodar `inspect_url_enhanced` em `/`, `/biografia`, `/psicologa-infantojuvenil-recreio`, 1 artigo. Resubmeter sitemap.

## Plano de posicionamento — "Psicóloga #1 Barra/Recreio" (2026-05-16)

Objetivo: rankear top-3 para queries "psicóloga infantojuvenil Recreio", "psicóloga TEA Barra", "psicóloga TDAH RJ zona oeste" em 90-180 dias.

### Concorrentes diretos identificados
| Domain | Diferencial | Risco pra Jessica |
|---|---|---|
| `psicologaluanareis.com` (Luana Reis) | **TCC + ABA infantojuvenil** — proposta IDÊNTICA | Diferenciação direta |
| `ericajares.com.br` + `espacopersona.com.br` (Erica Jares) | Coordena clínica multi no Recreio Shopping | Autoridade local maior |
| `rafaelguedes.com.br` | Conteúdo SEO denso, Recreio | Volume de páginas |
| `jessicafeitosa.com` | TCC infantojuvenil Recreio | **Confusão de marca** (homônima) |
| `clinicadespertare.com.br` | Multidisciplinar, unidades Barra+Recreio | Cobertura ampla |
| `team-terapias.com.br` (Casa Shopping Barra) | TEA, multidisciplinar | TEA específico |

### Aplicado na sessão 2026-05-16 (técnico/on-page)
- ✅ Schema enrichment: `Psychologist` type, FAQPage com 7 perguntas, `hasOfferCatalog` com 4 Services, `openingHoursSpecification`, `areaServed` granular (6 bairros + 2 cidades), Instagram em `sameAs`
- ✅ Landing geo-targeted criada: `/psicologa-infantojuvenil-recreio` (1.000 palavras, FAQ visível, mapa embed, schema LocalBusiness + Service + Breadcrumb)
- ✅ Cross-link no index.html (bloco "Atendimento presencial" → landing)
- ✅ Sitemap atualizado (20 URLs com nova landing prioridade 0.9)

### Off-page (DEPENDE Jessica/Anderson — alto impacto, fora do site)
- [ ] **Google Business Profile** — CRÍTICO para Local Pack. Sem GBP a Jessica não aparece no "Map Pack" do Google (3 resultados de mapa que aparecem antes do orgânico). Cadastrar:
  - Nome: "Jessica Costa Psi - Psicóloga Infantojuvenil"
  - Categoria: Psicóloga (primária) + Psicóloga Infantil (secundária)
  - Endereço Vertice Mall + horário
  - 5+ fotos (consultório, retrato, fachada)
  - Solicitar **verificação por cartão postal** ou telefone
- [ ] **Reviews ativos** — pedir 10 primeiros reviews para pais de pacientes ativos (template de mensagem WhatsApp + link direto pro GBP). Reviews são o sinal #1 de local ranking.
- [ ] **Cadastro em diretórios profissionais**:
  - [ ] ABDA — cadastro de psicólogos RJ (tdah.org.br)
  - [ ] AMA-RJ (autismo)
  - [ ] Doctoralia.com.br (perfil verificado)
  - [ ] CRP-RJ (busca de psicólogos)
  - [ ] iClinic, Conexa, ZenKlub, Vittude (marketplaces psi)
- [ ] **Backlinks locais**:
  - [ ] Pediatras Recreio/Barra (link cruzado com 3-5 consultórios parceiros)
  - [ ] Escolas de Recreio (Escola Atelier, Escola Espaço, Sá Pereira, El Sol) — oferecer palestra → link no site da escola
  - [ ] Vertice Mall website (verificar se lista lojistas)
  - [ ] Blog da Tayane Costa (Otimiza) ou outros sites do ecossistema Anderson com link contextual
- [ ] **Conteúdo de cluster** (próxima sprint):
  - [ ] Landing `/psicologa-tea-rj` (cluster TEA, linka 4 artigos)
  - [ ] Landing `/psicologa-tdah-rj` (cluster TDAH, linka 2 artigos)
  - [ ] Internal linking nos 14 artigos (12 cross-links sugeridos — pendente desde TODO 2026-05-04)

### Métricas de acompanhamento (rodar via GSC MCP semanal)
- Impressões + cliques + posição média para queries `psicologa infantojuvenil recreio`, `psicologa TEA RJ`, `psicologa TDAH RJ`, `psicologa barra da tijuca infantil`
- Páginas indexadas (deve crescer de ~19 → 25 nas próximas semanas)
- Local Pack ranking (manual, via aba anônima): "psicóloga infantil recreio dos bandeirantes"

### Baseline 2026-05-16 (90 dias antes desta sessão)
- 49 impressões / 2 cliques / posição média 5.9 / CTR 4%
- Toda atividade na home, sem queries acima de threshold de privacidade
- Sub-indexado, sem demanda capturada

## Lead capture → CRM Otimiza (integração 2026-05-16)

Formulários no site enviam diretamente para o **CRM da Otimiza Pro** (mesmo CRM usado pelo otimizapro.com). Padrão visual e script adaptados do `lead-cta.js` original (`otimizapro.com`).

### Arquitetura
```
[form HTML] → js/lead-form.js → POST novo-crm.otimizapro.com/api/leads → D1 otimizapro-crm
                              → redirect WhatsApp com mensagem prepopulada
```

### Pontos de captura ativos
| Página | Form `data-lead-source` | `data-lead-type` |
|---|---|---|
| `index.html` (hero) | `jessica-home` | `primeira-consulta` |
| `avaliacao-neuropsicologica-infantil.html` | `jessica-avaliacao-landing` | `avaliacao-neuropsicologica` |
| `psicologa-infantojuvenil-recreio.html` | `jessica-recreio-landing` | `primeira-consulta` |
| `biografia.html` (final) | `jessica-biografia` | `primeira-consulta` |

### Sticky WhatsApp + mid-CTAs
- **Sticky WhatsApp button** injetado por JS em todas as 27 páginas (canto inferior direito, z-index 999)
- **Mid-CTAs** contextuais nos 18 artigos (depois do 3º/4º H2, com mensagem WhatsApp específica por tema)

### Payload enviado ao CRM
```json
{
  "name": "Maria Silva",
  "phone": "21912345678",
  "email": "21912345678@jessica.lead",  // fallback se sem email
  "company": "Paciente Particular",      // fixo p/ B2C
  "employees": "avaliacao-neuropsicologica",  // reaproveita campo CRM como segmento
  "formSource": "jessica-avaliacao-landing",
  "formPage": "https://jessicacostapsi.com/avaliacao-neuropsicologica-infantil",
  "visitorId": "v_xxx",
  "source": "google",        // UTM source
  "medium": "cpc",
  "campaign": "psicologa-tdah-recreio",
  "gclid": "...",
  "meta": {
    "siteOrigem": "jessicacostapsi.com",
    "tipoSolicitacao": "avaliacao-neuropsicologica",
    "criancaIdade": "7 anos"
  }
}
```

### Filtros no CRM Otimiza
Para Jessica/equipe filtrarem leads dela, basta filtrar por:
- `formSource LIKE 'jessica-%'` — todos os leads do site da Jessica
- `formSource = 'jessica-avaliacao-landing'` — interessados em testagem (alto ticket)

### Pendências de integração (Anderson)
- [ ] **Verificar CORS** do worker `novo-crm.otimizapro.com` para aceitar origem `jessicacostapsi.com` (se bloquear, criar Pages Function intermediária)
- [ ] **Criar segmento/automação no CRM** para `formSource LIKE 'jessica-%'` (ex.: notificar Jessica + Anderson via email/Teams; drip específico)
- [ ] **Validar** que o lead chega de fato com payload completo após primeiro envio real
- [ ] **Pop-up de consentimento LGPD** (opcional — hoje o disclaimer está inline no form)

### Política de privacidade atualizada
[privacidade.html](privacidade.html) foi atualizada (seção 5) incluindo Otimiza Pro como operadora de dados conforme art. 5º, VII da LGPD. Jessica = controladora, Otimiza = operadora técnica.
