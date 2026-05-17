// =====================================================================
// coupon.js — validação de cupom e cálculo de desconto.
//
// Política Fase 1:
//   - Cupom é "candidato" no clique de Comprar; só vira "usado" quando
//     o webhook de pagamento aprovado chega (incrementCouponUsage).
//   - Validamos: ativo=1, dentro da janela [valido_de, valido_ate],
//     curso compatível (course_id NULL = qualquer), e uso_maximo se
//     definido.
// =====================================================================

import { getCouponByCodigo } from './db.js';

/**
 * @returns {Promise<{ ok: true, coupon, descontoCentavos, valorFinal } | { ok: false, error: string }>}
 */
export async function validateCoupon(env, codigo, course) {
  if (!codigo) return { ok: false, error: 'sem-cupom' };
  const coupon = await getCouponByCodigo(env, codigo);
  if (!coupon) return { ok: false, error: 'inexistente' };
  if (coupon.course_id && coupon.course_id !== course.id) {
    return { ok: false, error: 'curso-nao-aplica' };
  }

  const now = Date.now();
  if (coupon.valido_de && Date.parse(coupon.valido_de) > now) {
    return { ok: false, error: 'ainda-nao-valido' };
  }
  if (coupon.valido_ate && Date.parse(coupon.valido_ate) < now) {
    return { ok: false, error: 'expirado' };
  }
  if (coupon.uso_maximo !== null && coupon.uso_maximo !== undefined && coupon.usos_atual >= coupon.uso_maximo) {
    return { ok: false, error: 'esgotado' };
  }

  const preco = Number(course.preco_centavos) || 0;
  let descontoCentavos = 0;
  if (coupon.tipo === 'percentual') {
    descontoCentavos = Math.floor((preco * Number(coupon.valor)) / 100);
  } else if (coupon.tipo === 'fixo') {
    descontoCentavos = Math.min(preco, Number(coupon.valor));
  }
  const valorFinal = Math.max(0, preco - descontoCentavos);

  return { ok: true, coupon, descontoCentavos, valorFinal };
}
