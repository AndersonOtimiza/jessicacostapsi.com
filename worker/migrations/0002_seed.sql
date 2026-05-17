-- =====================================================================
-- 0002_seed.sql — Seed inicial com 1 curso de exemplo.
-- Aplicar com:
--   wrangler d1 execute jessicacostapsi-cursos --file=migrations/0002_seed.sql
-- =====================================================================

-- Curso: "Crianças com TEA: guia para pais"
INSERT OR IGNORE INTO courses (
  id, slug, titulo, subtitulo, descricao_curta, descricao_html,
  cover_url, preco_centavos, duracao_min, publicado
) VALUES (
  'crs_tea_guia_pais_v1',
  'criancas-com-tea-guia-para-pais',
  'Crianças com TEA: guia para pais',
  'Um percurso prático em 2 módulos para entender, acolher e apoiar o desenvolvimento do seu filho.',
  'Curso prático com a psicóloga Jessica Costa (CRP 05/56789) sobre como acolher, apoiar e desenvolver crianças com Transtorno do Espectro Autista no dia a dia.',
  '<p>Este curso foi pensado para pais, cuidadores e educadores que convivem com crianças com TEA e querem ferramentas práticas baseadas em evidências (TCC + ABA).</p><p>Em ~2 horas de conteúdo, você vai aprender a identificar sinais, montar rotinas previsíveis, lidar com crises e construir uma comunicação afetiva eficaz.</p><h3>O que você vai aprender</h3><ul><li>Entender o que é (e o que <em>não</em> é) TEA</li><li>Adaptar a rotina da casa para reduzir sobrecarga sensorial</li><li>Estratégias de comunicação afetiva</li><li>O papel da escola e da equipe terapêutica</li></ul>',
  NULL,
  19700,
  120,
  1
);

-- Módulo 1
INSERT OR IGNORE INTO modules (id, course_id, titulo, ordem) VALUES
  ('mod_tea_01', 'crs_tea_guia_pais_v1', 'Compreendendo o TEA',     1),
  ('mod_tea_02', 'crs_tea_guia_pais_v1', 'A rotina como aliada',     2);

-- Aulas (stream_video_uid = 'placeholder' enquanto não existir vídeo real)
INSERT OR IGNORE INTO lessons (id, module_id, titulo, descricao, ordem, duracao_seg, stream_video_uid, preview) VALUES
  ('les_tea_0101', 'mod_tea_01', 'Boas-vindas e o que esperar do curso', 'Apresentação e orientações de uso.', 1,  480, 'placeholder', 1),
  ('les_tea_0102', 'mod_tea_01', 'O que é TEA — e o que NÃO é',          'Mitos, sinais e variabilidade.',     2, 1320, 'placeholder', 0),
  ('les_tea_0201', 'mod_tea_02', 'Rotinas previsíveis no dia a dia',     'Como reduzir gatilhos.',             1, 1500, 'placeholder', 0),
  ('les_tea_0202', 'mod_tea_02', 'Quando e como buscar ajuda profissional', 'Caminhos de avaliação e equipe multi.', 2, 1200, 'placeholder', 0);

-- Cupom de exemplo (50% off, ilimitado, válido sempre)
INSERT OR IGNORE INTO coupons (id, codigo, tipo, valor, course_id, ativo) VALUES
  ('cup_lancamento', 'LANCAMENTO', 'percentual', 50, NULL, 1);
