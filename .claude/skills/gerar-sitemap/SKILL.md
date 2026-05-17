---
description: Regenera sitemap.xml a partir dos HTMLs presentes na raiz e em artigos/. Use quando o usuário adicionar/remover artigos, criar páginas novas, ou disser "atualizar sitemap", "regerar sitemap", "novo artigo".
---

# gerar-sitemap

Site estático puro — não há geração automática. Quando um HTML novo é adicionado (especialmente em `artigos/`), precisamos atualizar manualmente o `sitemap.xml`.

## Quando usar
- Após criar um novo artigo em `artigos/`.
- Após criar uma nova página raiz (ex: `servicos.html`).
- Após remover páginas obsoletas.
- Quando o usuário pedir "atualizar sitemap".

## Procedimento

### 1. Coletar HTMLs
Usar `Glob` para listar:
- `*.html` na raiz — exceto `404.html` (não vai para sitemap).
- `artigos/*.html`.

### 2. Definir prioridade e changefreq por categoria
| Tipo | priority | changefreq |
|---|---|---|
| `index.html` (home) | 1.0 | weekly |
| `blog.html` | 0.9 | weekly |
| `biografia.html` | 0.8 | monthly |
| `artigos/*.html` | 0.7 | yearly |
| outras páginas raiz novas | 0.7 | monthly (default) |

### 3. Gerar `sitemap.xml`
- URLs com prefixo `https://jessicacostapsi.com/`.
- Preservar estrutura existente — não incluir `<lastmod>` em massa a menos que o usuário peça (datas falsas pioram SEO; se incluir, usar a data real do `git log -1 --format=%cs <arquivo>`).
- UTF-8, schema `http://www.sitemaps.org/schemas/sitemap/0.9`.

### 4. Validar
- Cada `<loc>` deve corresponder a um arquivo existente (validar com `Glob`/`Read`).
- Nenhum HTML existente deve ficar de fora (a menos que seja `404.html`).
- Se o usuário tiver tags `noindex` em algum HTML (raro neste site), excluir do sitemap.

### 5. Mostrar diff
Antes de salvar, mostrar diff com o sitemap atual. Após confirmar, salvar e sugerir:
> "Quer rodar `/audit-seo` para validar o resultado, ou `/deploy-cloudflare` para publicar?"

## Princípios
- Sitemap manual mas **derivável** dos HTMLs — esta skill é a fonte da verdade.
- Não adicionar URLs externos, redirects, nem páginas em construção.
- Não adicionar `lastmod` chutado — só com base em `git log` real.