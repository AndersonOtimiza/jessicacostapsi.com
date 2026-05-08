---
description: Auditoria SEO técnica do site (meta tags, OpenGraph, sitemap, robots, headings, links internos quebrados). Use quando o usuário pedir "auditoria SEO", "verificar SEO", "checar meta tags", "site está bem indexado?".
---

# audit-seo

Auditoria automatizada de SEO técnico para o site Jessica Costa PSI. Não substitui ferramentas pagas (Ahrefs/Semrush) — foca no que dá pra checar lendo os arquivos + validando endpoints.

## Quando usar
- Antes de divulgação grande (lançamento, mídia paga).
- Mensalmente, como rotina.
- Após mudanças extensas em estrutura/navegação.
- Para investigar queda de tráfego / impressões no Google Search Console.

## Procedimento

### 1. Inventário (Glob)
- Todos `*.html` da raiz e `artigos/`.
- `robots.txt`, `sitemap.xml`.

### 2. Por HTML, validar:
- `<html lang="pt-BR">` presente.
- `<meta charset="UTF-8">` presente.
- `<meta name="viewport" content="width=device-width, initial-scale=1.0">` presente.
- `<meta name="description" content="...">` presente, **30–160 chars**.
- `<title>` presente, **≤60 chars**, único entre páginas.
- Pelo menos um `<h1>`, no máximo um por página.
- Se for artigo: tem link de volta para `../blog.html` e `../index.html`.
- **Falta atualmente** (reportar como achado, não bloquear): OpenGraph (`og:title`, `og:description`, `og:image`, `og:url`, `og:type=article` para artigos), Twitter Cards, schema.org JSON-LD (`Person` para Jessica em `index.html`/`biografia.html`, `Article` para cada artigo).

### 3. Sitemap & robots
- Cada `<loc>` em `sitemap.xml` corresponde a HTML existente.
- Todo HTML (exceto `404.html`) está no sitemap.
- `robots.txt` referencia o sitemap absoluto.
- HTTPS em todas as URLs do sitemap.

### 4. Links internos
Para cada `href` interno em todos os HTMLs:
- Resolver caminho relativo (raiz vs `artigos/` usa `../`).
- Verificar que o arquivo destino existe (Glob/Read).
- Reportar **quebrados** com origem→destino.

### 5. Live check (se possível)
Se o site estiver no ar:
```bash
curl -sI https://jessicacostapsi.com/ | grep -iE 'http/|content-type|cache-control|x-robots-tag'
curl -sI https://jessicacostapsi.com/sitemap.xml | head -3
curl -sI https://jessicacostapsi.com/robots.txt | head -3
```
Se MCP `gsc` estiver autenticado e o domínio for propriedade conhecida, oferecer rodar `mcp__gsc__inspect_url_enhanced` para 3–5 URLs principais.

### 6. Reportar
Formato fixo (não usar emojis):
```
=== Audit SEO ===
Páginas: N
Achados críticos: <lista|nenhum>
Avisos: <lista>
Oportunidades: <lista>
```
Crítico = quebra indexação ou navegação. Aviso = degrada qualidade. Oportunidade = melhoria opcional (OG tags, schema.org, lastmod no sitemap).

## Princípios
- **Não modificar arquivos** sem pedir — só relatar.
- Não inventar achados — todo item reportado precisa ter file:line.
- Priorizar achados que afetam **indexação/navegação** sobre cosméticos.