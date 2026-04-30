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
