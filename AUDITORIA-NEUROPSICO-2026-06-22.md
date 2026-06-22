# Auditoria de Compliance — Cluster "Neuropsico" (jessicacostapsi.com)

> **Data:** 2026-06-22 · **Base:** [COMPLIANCE-PRODUTOS-DIGITAIS.md](COMPLIANCE-PRODUTOS-DIGITAIS.md)
> **Método:** auditoria multi-agente (4 lentes independentes + verificação adversarial anti-falso-positivo + varredura do cluster).
> **Gatilho:** confirmação de que a Jessica **NÃO tem título de especialista em Neuropsicologia registrado** no CFP/CRP (está **em curso**).
> **Aviso:** orientação técnico-regulatória, não parecer jurídico. Validar com CRP-RJ (05) / advogado antes de retomar campanhas pagas.

---

## 1. Veredito executivo

A página `avaliacao-neuropsicologica-infantil.html` **reprova**, mas ela é só o **pivô**. O problema é **sistêmico no site inteiro**:

- **`neuropsicolog`** aparece em **54 arquivos** (628 ocorrências)
- **CTA "Falar com Especialista"** em **52 arquivos** (97 ocorrências — herdado do mega-footer replicado site-wide)
- **schema.org médico** (`MedicalWebPage`/`MedicalProcedure`/`DiagnosticProcedure`/`MedicalCondition`) em **19 arquivos**
- **bateria SATEPSI nominal** (WISC/WAIS/WPPSI/NEPSY/CONNERS/Vineland/M-CHAT/CARS) em **18 arquivos**
- **"fecha o diagnóstico"** em **3 arquivos**

**Causa-raiz dupla:**
1. **Sem título → não pode anunciar a especialidade.** "Avaliação neuropsicológica", "neuropsicóloga", "neuropsicologista", "especialista" usados como rótulo publicitário violam a **Res. CFP 23/2022** + Código de Ética (publicidade só dentro da competência registrada).
2. **Psicologia ≠ medicina.** O schema declara o serviço como `MedicalProcedure`/`DiagnosticProcedure` "sobre o cérebro" e o texto diz que o laudo "fecha o diagnóstico" de TDAH — enquadramento médico/diagnóstico que extrapola a psicologia.

**A boa notícia:** `triagem-sinais.html` já é um **modelo conforme** (framework §6) — o time sabe construir a versão lícita. Ele é o **template** para reescrever o cluster.

---

## 2. A página pedida — `avaliacao-neuropsicologica-infantil.html`: lista exata de ajustes

Severidade calibrada na verificação adversarial. 🔴 = ilícito/proibido (remover/reescrever) · 🟡 = risco (ajustar) · 🟢 = já conforme (não mexer).

### 🔴 VERMELHO — corrigir antes de manter no ar

| # | Local | Problema | Ajuste (pronto p/ colar) |
|---|---|---|---|
| V1 | **`<title>` (L28), `<h1>` (L199), badge (L198), meta desc (L7), og/twitter title+desc (L18,19,25,26), canonical/og:url (L9,17)** | Rótulo de especialidade não registrada em toda a "casca" indexável | Trocar "Avaliação/Testagem Neuropsicológica" por **"Avaliação Psicológica do Desenvolvimento Infantil"**. Title: `Avaliação Psicológica Infantil \| Jessica Costa Psi`. Badge: `Avaliação Psicológica Infantil · CRP 05/79764`. |
| V2 | **CTA "Falar com Especialista"** (L581 + footer mega) | Afirmação direta de credencial que ela não tem | Trocar por **"Falar com a Jessica"** ou **"Agendar uma conversa"**. (Aparece 2× nesta página; 97× no site.) |
| V3 | **Schema `#procedure`** (L54-64): `MedicalProcedure` + `procedureType: DiagnosticProcedure` + `bodyLocation: Brain` | Declara o serviço como **procedimento médico diagnóstico do cérebro** | **Remover o nó `#procedure` inteiro.** O nó `Service` (L66-86) já representa o serviço. |
| V4 | **Schema moldura médica**: `MedicalWebPage` (L42), `MedicalAudience` (L49), `MedicalCondition` (L50) | Enquadra tudo como objeto médico | `MedicalWebPage`→`WebPage`; remover `audience: MedicalAudience`; `about: MedicalCondition`→`{ "@type":"Thing", "name":"Desenvolvimento cognitivo, atenção, aprendizagem e comportamento infantil" }` |
| V5 | **Schema `serviceType`/`name`** (L57,68,77): "Avaliação Neuropsicológica" | Rótulo de especialidade no dado estruturado (alimenta SERP/AIO) | `serviceType`: `"Avaliação psicológica e do desenvolvimento"`; `name`: `"Avaliação psicológica infantil, do adolescente e do adulto"` |
| V6 | **Schema description** (L58) + **hero** (L201): lista WISC-V, WPPSI, WAIS, NEPSY-II, CONNERS-3, Vineland-3 | Bateria SATEPSI nominal exposta como cardápio (§3.3 = 🔴) | Remover os nomes. Hero: *"Aplico uma bateria de instrumentos psicológicos reconhecidos e validados para uso profissional no Brasil, selecionados caso a caso conforme a idade e a hipótese clínica…"* |
| V7 | **FAQ "fecha o diagnóstico"** — schema (L146) **e** corpo visível (L525): "o laudo neuropsicológico é suficiente, especialmente para TDAH" | Afirma suficiência diagnóstica de ato psicológico = invade ato médico | Reescrever **nos dois locais**: *"A avaliação descreve o funcionamento cognitivo e comportamental e levanta hipóteses que contribuem para o diagnóstico. O fechamento do diagnóstico clínico de TDAH/TEA e a indicação de medicação são da competência médica (neuropediatra, neurologista, psiquiatra), com quem trabalho de forma integrada. Encaminho quando indicado."* |
| V8 | **Lead form** (L552-571): coleta "Idade da pessoa a avaliar" + motivo clínico, só com disclaimer passivo | Dado **sensível de menor** sem consentimento (LGPD art. 11 + art. 14 §1º; framework §3.7 = 🔴) | Inserir **checkbox obrigatório** antes do `<button>` (L568): `<label class="lcta-consent"><input type="checkbox" name="consent" required> Sou responsável legal pela pessoa a ser avaliada e autorizo, de forma específica, o uso das informações (incluindo idade e motivo) para orientação e contato, conforme a <a href="privacidade.html">Política de Privacidade</a> (LGPD).</label>` Validar `form.consent.checked` em `js/lead-form.js` antes do POST. |

### 🟡 AMARELO — ajustar (risco/qualidade)

| # | Local | Ajuste |
|---|---|---|
| A1 | **Seção "A bateria de testes"** (L320-366): 8 cards nomeando WPPSI/WISC-V/WAIS/NEPSY-II/CONNERS-3/Vineland-3/CBCL/M-CHAT/CARS-2 com "padrão-ouro" | Substituir os nomes por **descrição por domínio cognitivo** (inteligência, atenção, memória, funções executivas, comportamento adaptativo). Mantém valor educativo, tira o cardápio. |
| A2 | **"formação em … Neuropsicologia"** (L473) | Manter como **formação em curso**, nunca "especialista". Ex.: *"…com formação em TCC, ABA e pós-graduação em Neuropsicologia (em andamento)."* |
| A3 | **Perícia / INSS / justiça** (L282, L433) | Suavizar — perícia psicológica tem regras próprias; não vender como produto médico-legal pronto. |
| A4 | **Atendimento presencial em Goiânia (GO)** sendo ela **CRP 05 (RJ)** (L474, L583, areaServed L74) | Verificar necessidade de **inscrição secundária** no CRP-GO para atendimento presencial recorrente fora do estado (online não exige — Res. 9/2024). |
| A5 | **Slug/URL** `avaliacao-neuropsicologica-infantil` | Renomear para `avaliacao-psicologica-infantil` (ou similar) + **redirect 301** do slug antigo (ver §4). |

### 🟢 VERDE — já conforme, NÃO mexer

- Seção **"Avaliação não é o mesmo que diagnóstico"** (L455-465) — excelente, mantém.
- **Modelo híbrido**: testagem **presencial**, anamnese/devolutiva online — **correto** (Res. CFP 9/2024 + SATEPSI: instrumentos infantis não têm validação remota).
- **"não substitui a investigação médica… o médico descarta condições clínicas e prescreve medicação"** (L462) — alinhado.
- Disclaimer LGPD presente (mínimo; reforçar com o checkbox V8).

> **Nota de calibração (verificação adversarial):** 2 achados foram **rejeitados** por exagero — a FAQ "teste de QI é a mesma coisa?" (L141/L505) é **educativa/desmistificadora**, não produto autoaplicável → permanece **verde**. Citar a existência de "teste de QI" é lícito pós-STF 2021. Não inflar.

---

## 3. Raio de impacto — o cluster inteiro

### 🔴 VERMELHO — 12 páginas (reescrita/despublicação, não só ajuste)

| Página | Issues críticos | Observação |
|---|---|---|
| **`neuropsicologista.html`** | a,b,c | ⚠️ **MAIS GRAVE.** H1 "Neuropsicologista…" + afirma **FALSAMENTE** "especialização formal em neuropsicologia pelo Einstein/Cognitivus". Candidata a **despublicação**. |
| `avaliacao-neuropsicologica.html` | a,b,c,d,e | **Pillar/hub** (link "Avaliação" no header de todas as páginas). 58 ocorrências. |
| `avaliacao-neuropsicologica-infantil.html` | a,b,c,d,e | Pivô auditado (§2). |
| `avaliacao-neuropsicologica-tea.html` | a,b,c,d | Risco extra: TEA tem componente médico/CID. |
| `avaliacao-neuropsicologica-tdah.html` | a,b,c,d | Mesmo molde. |
| `avaliacao-neuropsicologica-adultos.html` | a,b,c,d | Mesmo molde (LGPD de menor não se aplica). |
| `avaliacao-neuropsicologica-dificuldades-aprendizagem.html` | a,b,c,d | Mesmo molde. |
| `laudo-neuropsicologico.html` | a,b | Vende "laudo neuropsicológico" como produto. |
| `psicologa-tea-rj.html` | a,b,c | Slug seguro (sem redirect), mas corpo/schema usam o termo. |
| `psicologa-tdah-rj.html` | a,b,c | Idem. |
| `index.html` (home) | a,b | Vitrine + nav global. Maior alcance. |
| `artigos/teste-neuropsicologico.html` | a,b | Slug+title = rótulo 🔴 "teste neuropsicológico". |

*Legenda: (a) rótulo de especialidade sem título · (b) CTA "Falar com Especialista" · (c) schema médico · (d) bateria SATEPSI nominal · (e) "fecha o diagnóstico".*

### 🟡 AMARELO — ~16 páginas (fix mecânico)

Artigos de apoio e landings geo que usam o termo em **contexto educativo** + herdam o CTA do footer. Fix: trocar termo → "avaliação psicológica infantil/do desenvolvimento", CTA → "Falar com a Jessica", ajustar schema médico, revisar trechos de diagnóstico. Inclui:
- **`biografia.html`** — ponto-chave: enquadrar a credencial como **"formação em curso"**, nunca "neuropsicóloga/especialista".
- **`artigos/pos-graduacao-neuropsicologia-einstein.html`** — ✅ **já honesto** ("o que estou aprendendo"); pode virar o ativo de credibilidade que **substitui** o tom de `neuropsicologista.html`.
- `glossario.html` — definir o conceito é legítimo; só ajustar CTA e tirar auto-rótulo.
- demais: `psicologa-infantojuvenil-{recreio,goiania,barra-tijuca}`, `perguntas-frequentes`, `metodologia`, `manifesto`, `galeria`, `privacidade`, `blog`, `404`, artigos `quanto-custa-…`, `como-funciona-…`, `psicologo-vs-neuropediatra`, `diagnostico-de-tea`, `tdah-em-meninas`, `tdah-em-adultos`.

### 🟢 VERDE — 1 página (template)

- **`triagem-sinais.html`** — modelo conforme do framework §6. Schema deliberadamente **sem** `Quiz/Test`; disclaimer "não é teste psicológico nem diagnóstico". **Usar como base** para reescrever o cluster.

---

## 4. Impacto SEO / redirects (ao renomear)

- **~12 slugs** mudam (`avaliacao-neuropsicologica*` × 6, `laudo-neuropsicologico`, `neuropsicologista`, `teste-neuropsicologico` + variações). Cada um exige **redirect 301** (via `_redirects` do Cloudflare Pages) para não quebrar indexação/links e preservar autoridade.
- **Slugs seguros** (não mudam): `psicologa-tea-rj`, `psicologa-tdah-rj`, `psicologa-infantojuvenil-*`.
- **Nav "Avaliação" (header)** e **mega-footer** ("Falar com Especialista", "Especialidades") são **duplicados em cada HTML** (sem include) → qualquer fix de nomenclatura/CTA precisa ser replicado em **~24 páginas raiz + artigos**.
- Atualizar `sitemap.xml` (skill `gerar-sitemap`) após renomear.

---

## 5. Plano de remediação recomendado (faseado)

1. **Fase 0 — Contenção imediata (hoje):** trocar o CTA **"Falar com Especialista"** site-wide (97×) e **despublicar/`noindex` `neuropsicologista.html`** (afirmação falsa de título = maior risco). Quick wins, alto impacto.
2. **Fase 1 — Saneamento do schema:** remover nós médicos (`MedicalProcedure`/`DiagnosticProcedure`/`MedicalWebPage`/`MedicalCondition`/`MedicalAudience`) nas 19 páginas → `WebPage`/`Service`/`Psychologist`.
3. **Fase 2 — Nomenclatura:** "neuropsicológica/neuropsicóloga" → "avaliação psicológica infantil/do desenvolvimento" no corpo, meta e schema das 12 vermelhas; renomear slugs + 301; corrigir `biografia.html` (credencial = "em curso").
4. **Fase 3 — Diagnóstico + bateria:** reescrever "fecha o diagnóstico" (3 arquivos) e genericizar a bateria SATEPSI (18 arquivos).
5. **Fase 4 — LGPD:** checkbox de consentimento do responsável nos forms com dado de menor + atualizar `privacidade.html`.
6. **Fase 5 — Quando o título sair:** reverter a nomenclatura para "neuropsicológica" é simples e legítimo após o registro no CRP.

> Cada fase deve passar pelo **checklist §4 do framework** e por **aprovação literal da Jessica** antes do deploy (regra do projeto).

---

*Achados confirmados por verificação adversarial. Severidades seguem o framework da cliente (mais estrito que o mínimo legal por razões éticas). Próximo passo sugerido: executar a Fase 0 + 1 (mecânicas, baixo risco) mediante aprovação.*
