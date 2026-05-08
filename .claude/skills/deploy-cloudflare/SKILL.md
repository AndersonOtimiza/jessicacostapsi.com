---
description: Deploy do site Jessica Costa PSI no Cloudflare Pages com pré-checks de segurança (git limpo, sitemap atualizado, sem secrets vazados, links principais funcionando). Use quando o usuário disser "deploy", "publicar", "subir o site" ou "atualizar produção".
---

# deploy-cloudflare

Faz deploy seguro do site no Cloudflare Pages (projeto `jessicacostapsi`, account `28248f850aef40d0c91531280962a88a`). Site estático puro — sem build, só publicação dos HTMLs/CSS/JS.

## Quando usar
- Após mudanças em HTML/CSS/JS prontas para produção.
- Quando o usuário pedir "publica", "deploy", "subir o site".
- **Não usar** para alterações de rascunho — só após o usuário aprovar.

## Procedimento

### 1. Pré-checks (abortar se falhar)
- `git status` — confirmar que não há uncommitted suspeito (especialmente `.claude/settings.local.json` modificado, que pode conter secrets).
- Verificar que `.gitignore` cobre `.claude/settings.local.json` e `.wrangler/`.
- Confirmar que **nenhum HTML novo** foi adicionado sem entrada correspondente em `sitemap.xml`. Listar HTMLs com `Glob` e diff contra `sitemap.xml`. Se houver divergência, sugerir rodar a skill `gerar-sitemap` antes.
- Grep por strings suspeitas em arquivos a deployar:
  - `YOUR_FORM_ID` — placeholder Formspree (avisar, não bloquear).
  - `TODO|FIXME|XXX` em HTMLs — avisar.
  - Tokens vazados (`hqLKeXUmYoIr2SFLw0J`, `28248f850aef40d0`) em arquivos públicos (raiz/artigos/css/js) — **bloquear** e instruir o usuário.

### 2. Confirmação explícita
Antes de chamar `wrangler`, mostrar ao usuário:
- Branch + último commit
- Lista de arquivos que vão ao deploy (`git ls-files`)
- URL alvo: `https://jessicacostapsi.com/`

E **pedir aprovação** ("Posso prosseguir com o deploy? [s/N]"). Não rodar sem confirmação.

### 3. Deploy
```bash
CLOUDFLARE_ACCOUNT_ID=28248f850aef40d0c91531280962a88a npx wrangler pages deploy . \
  --project-name=jessicacostapsi \
  --branch=main \
  --commit-dirty=true
```
Capturar a URL do deploy preview (`https://<hash>.jessicacostapsi.pages.dev`) — necessária para smoke check.

### 4. Smoke check pós-deploy
Aguardar ~10s e validar:
```bash
curl -sI https://jessicacostapsi.com/ | head -3                # 200 OK
curl -sI https://jessicacostapsi.com/blog.html | head -3       # 200 OK
curl -sI https://jessicacostapsi.com/sitemap.xml | head -3     # 200 OK
curl -sI https://jessicacostapsi.com/inexistente.html | head -3  # deve cair em 404.html
```
Se algum falhar (status ≠ 200/404), **avisar o usuário** com link para o deploy preview para debug.

### 5. Reportar
Formato curto:
```
Deploy: ✓ jessicacostapsi.com
Preview: https://<hash>.jessicacostapsi.pages.dev
Pages: <N> arquivos enviados
Smoke: ✓ home / blog / sitemap / 404
```

## Princípios
- **Confirmação obrigatória** antes do deploy — Cloudflare Pages não tem rollback fácil.
- **Nunca** rodar `wrangler pages project delete` ou `--force` algo sob `wrangler`.
- Se o smoke check falhar, **não tentar redeploy automático** — reportar e deixar o usuário decidir.