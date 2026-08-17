import type { AlimentoTabela } from '../types'
import { normalizar } from './exercicios'

// ---------------------------------------------------------------------------
// Tabela de alimentos — valores por 100 g (ou 100 ml, para líquidos).
// Baseada nos valores usuais de composição de alimentos brasileiros (TACO) e,
// para itens industrializados, nas médias de rótulo. São referências: rótulos
// específicos variam.
// ---------------------------------------------------------------------------

function f(
  id: string,
  nome: string,
  categoria: string,
  kcal: number,
  proteina: number,
  carbo: number,
  gordura: number,
  fibra = 0,
  porcao?: [string, number],
  sodio?: number,
): AlimentoTabela {
  return {
    id,
    nome,
    categoria,
    kcal,
    proteina,
    carbo,
    gordura,
    fibra,
    sodio,
    porcaoCaseira: porcao ? { descricao: porcao[0], gramas: porcao[1] } : undefined,
  }
}

export const ALIMENTOS: AlimentoTabela[] = [
  // ------------------------------- Proteínas -------------------------------
  f('frango-peito', 'Peito de frango grelhado', 'Proteínas', 165, 31, 0, 3.6, 0, ['1 filé médio', 120]),
  f('frango-coxa', 'Coxa/sobrecoxa sem pele', 'Proteínas', 175, 26, 0, 7.5, 0, ['1 unidade', 90]),
  f('frango-desfiado', 'Frango desfiado', 'Proteínas', 165, 30, 0, 4, 0, ['1 xícara', 120]),
  f('patinho-moido', 'Patinho moído refogado', 'Proteínas', 190, 27, 0, 9, 0, ['1 concha', 100]),
  f('alcatra', 'Alcatra grelhada', 'Proteínas', 210, 28, 0, 10, 0, ['1 bife', 130]),
  f('contrafile', 'Contrafilé grelhado', 'Proteínas', 240, 27, 0, 14, 0, ['1 bife', 130]),
  f('picanha', 'Picanha assada', 'Proteínas', 290, 25, 0, 21, 0, ['1 fatia', 100]),
  f('costela-bovina', 'Costela bovina assada', 'Proteínas', 370, 20, 0, 32),
  f('lombo-suino', 'Lombo suíno assado', 'Proteínas', 195, 28, 0, 8.5, 0, ['1 fatia', 100]),
  f('bisteca-suina', 'Bisteca suína', 'Proteínas', 260, 25, 0, 17, 0, ['1 unidade', 120]),
  f('bacon', 'Bacon frito', 'Proteínas', 540, 37, 1.4, 42, 0, ['1 fatia', 15], 1700),
  f('linguica', 'Linguiça toscana', 'Proteínas', 300, 16, 1, 26, 0, ['1 gomo', 80], 1100),
  f('carne-seca', 'Carne seca dessalgada', 'Proteínas', 313, 33, 0, 20, 0, undefined, 1200),
  f('tilapia', 'Filé de tilápia grelhado', 'Proteínas', 128, 26, 0, 2.7, 0, ['1 filé', 120]),
  f('salmao', 'Salmão grelhado', 'Proteínas', 208, 20, 0, 13, 0, ['1 posta', 130]),
  f('atum-agua', 'Atum em água (lata)', 'Proteínas', 116, 26, 0, 1, 0, ['1 lata', 120], 350),
  f('sardinha', 'Sardinha em óleo', 'Proteínas', 208, 25, 0, 11, 0, ['1 lata', 84], 400),
  f('camarao', 'Camarão cozido', 'Proteínas', 99, 24, 0, 0.3, 0, ['1 porção', 100]),
  f('ovo', 'Ovo de galinha inteiro', 'Proteínas', 143, 13, 0.7, 9.5, 0, ['1 unidade', 50]),
  f('clara', 'Clara de ovo', 'Proteínas', 52, 11, 0.7, 0.2, 0, ['1 clara', 33]),
  f('peito-peru', 'Peito de peru (frios)', 'Proteínas', 110, 19, 3, 2, 0, ['1 fatia', 15], 900),
  f('presunto', 'Presunto cozido', 'Proteínas', 145, 18, 1.5, 8, 0, ['1 fatia', 15], 1000),
  f('whey-concentrado', 'Whey protein concentrado', 'Proteínas', 400, 80, 8, 6, 0, ['1 scoop', 30]),
  f('whey-isolado', 'Whey protein isolado', 'Proteínas', 370, 90, 1, 1, 0, ['1 scoop', 30]),
  f('albumina', 'Albumina em pó', 'Proteínas', 375, 81, 6, 1, 0, ['1 dose', 30]),
  f('proteina-soja', 'Proteína texturizada de soja', 'Proteínas', 336, 51, 33, 1.2, 17),

  // ------------------------------ Carboidratos -----------------------------
  f('arroz-branco', 'Arroz branco cozido', 'Carboidratos', 128, 2.5, 28, 0.2, 1.6, ['1 escumadeira', 100]),
  f('arroz-integral', 'Arroz integral cozido', 'Carboidratos', 124, 2.6, 26, 1, 2.7, ['1 escumadeira', 100]),
  f('feijao-carioca', 'Feijão carioca cozido', 'Carboidratos', 76, 4.8, 13.6, 0.5, 8.5, ['1 concha', 110]),
  f('feijao-preto', 'Feijão preto cozido', 'Carboidratos', 77, 4.5, 14, 0.5, 8.4, ['1 concha', 110]),
  f('lentilha', 'Lentilha cozida', 'Carboidratos', 116, 9, 20, 0.4, 7.9, ['1 concha', 100]),
  f('grao-de-bico', 'Grão-de-bico cozido', 'Carboidratos', 164, 8.9, 27, 2.6, 7.6, ['1 concha', 100]),
  f('macarrao', 'Macarrão cozido', 'Carboidratos', 158, 5.8, 30, 0.9, 1.8, ['1 pegador', 110]),
  f('macarrao-integral', 'Macarrão integral cozido', 'Carboidratos', 149, 6, 27, 1.3, 4.5, ['1 pegador', 110]),
  f('batata', 'Batata inglesa cozida', 'Carboidratos', 87, 1.8, 20, 0.1, 1.8, ['1 unidade média', 130]),
  f('batata-doce', 'Batata doce cozida', 'Carboidratos', 90, 1.6, 21, 0.1, 3, ['1 unidade média', 130]),
  f('mandioca', 'Mandioca cozida', 'Carboidratos', 125, 0.6, 30, 0.3, 1.6, ['1 pedaço', 100]),
  f('inhame', 'Inhame cozido', 'Carboidratos', 97, 2, 23, 0.1, 2.1),
  f('pao-frances', 'Pão francês', 'Carboidratos', 300, 8, 58, 3.1, 2.3, ['1 unidade', 50], 640),
  f('pao-integral', 'Pão de forma integral', 'Carboidratos', 253, 9.4, 43, 3.7, 6.9, ['1 fatia', 25], 480),
  f('pao-forma', 'Pão de forma branco', 'Carboidratos', 275, 8, 51, 3.5, 2.3, ['1 fatia', 25], 500),
  f('tapioca', 'Goma de tapioca', 'Carboidratos', 240, 0.3, 60, 0, 0.6, ['1 disco', 60]),
  f('cuscuz', 'Cuscuz de milho', 'Carboidratos', 113, 2.4, 25, 0.6, 1.5, ['1 fatia', 100]),
  f('aveia', 'Aveia em flocos', 'Carboidratos', 394, 14, 66, 8.5, 9.1, ['1 colher sopa', 15]),
  f('granola', 'Granola', 'Carboidratos', 420, 9, 65, 13, 7, ['1 colher sopa', 15]),
  f('quinoa', 'Quinoa cozida', 'Carboidratos', 120, 4.4, 21, 1.9, 2.8, ['1 concha', 100]),
  f('milho', 'Milho verde cozido', 'Carboidratos', 98, 3.2, 21, 1.2, 2.5, ['1 colher sopa', 20]),
  f('farofa', 'Farofa pronta', 'Carboidratos', 400, 3, 70, 12, 5, ['1 colher sopa', 15], 700),
  f('polenta', 'Polenta cozida', 'Carboidratos', 90, 2, 20, 0.4, 1),
  f('pao-de-queijo', 'Pão de queijo', 'Carboidratos', 330, 6, 40, 16, 1, ['1 unidade', 30]),
  f('torrada-integral', 'Torrada integral', 'Carboidratos', 380, 12, 68, 6, 7, ['1 fatia', 8]),
  f('biscoito-agua-sal', 'Biscoito água e sal', 'Carboidratos', 430, 9, 70, 12, 2.5, ['1 unidade', 6], 800),

  // -------------------------------- Frutas ---------------------------------
  f('banana', 'Banana prata', 'Frutas', 98, 1.3, 26, 0.1, 2, ['1 unidade', 70]),
  f('maca', 'Maçã', 'Frutas', 56, 0.3, 15, 0.2, 1.3, ['1 unidade', 130]),
  f('laranja', 'Laranja', 'Frutas', 45, 1, 11, 0.1, 1, ['1 unidade', 150]),
  f('mamao', 'Mamão papaia', 'Frutas', 40, 0.5, 10, 0.1, 1.8, ['1/2 unidade', 150]),
  f('manga', 'Manga', 'Frutas', 64, 0.4, 16, 0.2, 1.6, ['1 unidade', 200]),
  f('abacaxi', 'Abacaxi', 'Frutas', 48, 0.9, 12, 0.1, 1, ['1 fatia', 80]),
  f('melancia', 'Melancia', 'Frutas', 33, 0.9, 8, 0.1, 0.1, ['1 fatia', 200]),
  f('uva', 'Uva', 'Frutas', 53, 0.7, 14, 0.2, 0.9, ['1 cacho pequeno', 100]),
  f('morango', 'Morango', 'Frutas', 30, 0.9, 6.8, 0.3, 1.7, ['1 xícara', 150]),
  f('abacate', 'Abacate', 'Frutas', 96, 1.2, 6, 8.4, 6.3, ['1/2 unidade', 100]),
  f('acai', 'Polpa de açaí sem açúcar', 'Frutas', 58, 0.8, 6.2, 3.9, 2.6, ['1 porção', 100]),
  f('kiwi', 'Kiwi', 'Frutas', 51, 1.3, 11, 0.6, 2.7, ['1 unidade', 75]),
  f('melao', 'Melão', 'Frutas', 29, 0.7, 7.5, 0.1, 0.3, ['1 fatia', 150]),
  f('pera', 'Pera', 'Frutas', 53, 0.6, 14, 0.1, 3.1, ['1 unidade', 130]),

  // ------------------------------ Laticínios -------------------------------
  f('leite-integral', 'Leite integral', 'Laticínios', 61, 3.2, 4.7, 3.3, 0, ['1 copo', 200]),
  f('leite-desnatado', 'Leite desnatado', 'Laticínios', 35, 3.4, 5, 0.2, 0, ['1 copo', 200]),
  f('iogurte-natural', 'Iogurte natural integral', 'Laticínios', 61, 3.5, 4.7, 3.3, 0, ['1 pote', 170]),
  f('iogurte-grego-zero', 'Iogurte grego zero', 'Laticínios', 60, 10, 4, 0, 0, ['1 pote', 130]),
  f('queijo-minas', 'Queijo minas frescal', 'Laticínios', 264, 17, 3, 20, 0, ['1 fatia', 30], 350),
  f('mussarela', 'Queijo mussarela', 'Laticínios', 300, 22, 3, 22, 0, ['1 fatia', 20], 600),
  f('requeijao', 'Requeijão cremoso', 'Laticínios', 257, 10, 4, 22, 0, ['1 colher sopa', 20], 500),
  f('cottage', 'Queijo cottage', 'Laticínios', 98, 11, 3.4, 4.3, 0, ['1 colher sopa', 30], 400),
  f('ricota', 'Ricota', 'Laticínios', 140, 11, 4, 8, 0, ['1 fatia', 30]),
  f('cream-cheese', 'Cream cheese', 'Laticínios', 290, 6, 5, 27, 0, ['1 colher sopa', 20], 400),
  f('manteiga', 'Manteiga', 'Laticínios', 717, 0.9, 0.1, 81, 0, ['1 ponta de faca', 8], 580),

  // ---------------------- Gorduras e oleaginosas ---------------------------
  f('azeite', 'Azeite de oliva', 'Gorduras', 884, 0, 0, 100, 0, ['1 colher sopa', 13]),
  f('oleo-soja', 'Óleo de soja', 'Gorduras', 884, 0, 0, 100, 0, ['1 colher sopa', 13]),
  f('castanha-para', 'Castanha-do-pará', 'Gorduras', 656, 14, 12, 66, 7.5, ['1 unidade', 5]),
  f('castanha-caju', 'Castanha de caju', 'Gorduras', 570, 18, 30, 44, 3.3, ['1 punhado', 30]),
  f('amendoim', 'Amendoim torrado', 'Gorduras', 567, 26, 16, 49, 8.5, ['1 punhado', 30]),
  f('pasta-amendoim', 'Pasta de amendoim integral', 'Gorduras', 588, 25, 20, 50, 6, ['1 colher sopa', 20]),
  f('amendoas', 'Amêndoas', 'Gorduras', 579, 21, 22, 50, 12.5, ['1 punhado', 30]),
  f('nozes', 'Nozes', 'Gorduras', 654, 15, 14, 65, 6.7, ['1 punhado', 30]),
  f('chia', 'Semente de chia', 'Gorduras', 486, 17, 42, 31, 34, ['1 colher sopa', 12]),
  f('linhaca', 'Linhaça', 'Gorduras', 534, 18, 29, 42, 27, ['1 colher sopa', 12]),
  f('coco-ralado', 'Coco ralado', 'Gorduras', 354, 3.3, 15, 33, 9, ['1 colher sopa', 10]),

  // ------------------------------- Vegetais --------------------------------
  f('brocolis', 'Brócolis cozido', 'Vegetais', 25, 2.1, 4, 0.3, 3.4, ['1 xícara', 90]),
  f('couve', 'Couve refogada', 'Vegetais', 90, 3, 8, 5, 3.1, ['1 porção', 60]),
  f('alface', 'Alface', 'Vegetais', 15, 1.4, 2.9, 0.2, 2.3, ['1 prato', 60]),
  f('tomate', 'Tomate', 'Vegetais', 15, 1.1, 3.1, 0.2, 1.2, ['1 unidade', 100]),
  f('cenoura', 'Cenoura crua', 'Vegetais', 34, 1.3, 7.7, 0.2, 3.2, ['1 unidade', 80]),
  f('abobrinha', 'Abobrinha refogada', 'Vegetais', 19, 1.1, 4.3, 0.2, 1.3, ['1 porção', 80]),
  f('chuchu', 'Chuchu cozido', 'Vegetais', 17, 0.7, 4.1, 0.1, 1.3),
  f('beterraba', 'Beterraba cozida', 'Vegetais', 49, 1.9, 11.1, 0.1, 3.4, ['1 porção', 80]),
  f('espinafre', 'Espinafre refogado', 'Vegetais', 23, 2.9, 3.6, 0.4, 2.2, ['1 porção', 80]),
  f('pepino', 'Pepino', 'Vegetais', 15, 0.7, 3.6, 0.1, 0.5, ['1 unidade', 130]),
  f('cebola', 'Cebola', 'Vegetais', 40, 1.1, 9.3, 0.1, 1.7),
  f('pimentao', 'Pimentão', 'Vegetais', 21, 1, 4.9, 0.2, 1.7),
  f('repolho', 'Repolho cru', 'Vegetais', 25, 1.3, 5.8, 0.1, 2.5),
  f('vagem', 'Vagem cozida', 'Vegetais', 35, 1.8, 7, 0.2, 2.4),

  // ------------------------ Bebidas e adoçantes ----------------------------
  f('cafe', 'Café sem açúcar', 'Bebidas', 2, 0.2, 0.3, 0, 0, ['1 xícara', 100]),
  f('suco-laranja', 'Suco de laranja natural', 'Bebidas', 45, 0.7, 10.4, 0.2, 0.2, ['1 copo', 250]),
  f('refrigerante', 'Refrigerante de cola', 'Bebidas', 42, 0, 10.6, 0, 0, ['1 lata', 350]),
  f('cerveja', 'Cerveja', 'Bebidas', 43, 0.5, 3.6, 0, 0, ['1 lata', 350]),
  f('agua-coco', 'Água de coco', 'Bebidas', 22, 0.7, 5.3, 0.2, 0, ['1 copo', 250]),
  f('acucar', 'Açúcar refinado', 'Bebidas', 387, 0, 100, 0, 0, ['1 colher chá', 5]),
  f('mel', 'Mel', 'Bebidas', 304, 0.3, 82, 0, 0, ['1 colher sopa', 20]),

  // --------------------- Preparações e industrializados --------------------
  f('pizza-mussarela', 'Pizza de mussarela', 'Preparações', 266, 11, 33, 10, 2, ['1 fatia', 100], 600),
  f('hamburguer-lanche', 'Hambúrguer (sanduíche)', 'Preparações', 295, 15, 30, 13, 1.5, ['1 unidade', 180], 550),
  f('batata-frita', 'Batata frita', 'Preparações', 312, 3.4, 41, 15, 3.8, ['1 porção', 120], 400),
  f('coxinha', 'Coxinha de frango', 'Preparações', 300, 8, 30, 16, 1.5, ['1 unidade', 80], 500),
  f('pastel-carne', 'Pastel de carne', 'Preparações', 380, 10, 32, 24, 1.5, ['1 unidade', 90], 550),
  f('salgadinho-pacote', 'Salgadinho de pacote', 'Preparações', 536, 6, 55, 33, 2, ['1 pacote', 50], 900),
  f('lasanha', 'Lasanha à bolonhesa', 'Preparações', 160, 8, 15, 7, 1, ['1 porção', 250], 450),
  f('estrogonofe', 'Estrogonofe de frango', 'Preparações', 145, 12, 6, 8, 0.5, ['1 concha', 130]),
  f('feijoada', 'Feijoada', 'Preparações', 180, 12, 10, 10, 4, ['1 concha', 150], 700),
  f('miojo', 'Macarrão instantâneo preparado', 'Preparações', 145, 3.4, 19, 6, 1, ['1 pacote', 80], 1200),
  f('chocolate-ao-leite', 'Chocolate ao leite', 'Preparações', 535, 7.6, 59, 30, 3, ['1 barra pequena', 25]),
  f('chocolate-70', 'Chocolate 70% cacau', 'Preparações', 598, 7.8, 46, 43, 11, ['2 quadrados', 20]),
  f('sorvete', 'Sorvete de creme', 'Preparações', 207, 3.5, 24, 11, 0.7, ['1 bola', 60]),
  f('acai-tigela', 'Açaí na tigela com granola', 'Preparações', 210, 3, 32, 8, 4, ['1 tigela', 300]),
  f('barra-proteina', 'Barra de proteína', 'Preparações', 350, 30, 35, 9, 5, ['1 unidade', 45]),
]

export const CATEGORIAS_ALIMENTO = Array.from(new Set(ALIMENTOS.map((a) => a.categoria)))

export function buscarAlimentos(termo: string, categoria?: string | null): AlimentoTabela[] {
  const t = normalizar(termo)
  return ALIMENTOS.filter((a) => {
    if (categoria && a.categoria !== categoria) return false
    if (!t) return true
    return normalizar(a.nome).includes(t)
  })
}

/** Alimentos ordenados por densidade proteica — usados nas sugestões. */
export const RICOS_EM_PROTEINA = [...ALIMENTOS]
  .filter((a) => a.proteina >= 10 && a.kcal > 0)
  .sort((a, b) => b.proteina / b.kcal - a.proteina / a.kcal)

export const RICOS_EM_FIBRA = [...ALIMENTOS]
  .filter((a) => a.fibra >= 3)
  .sort((a, b) => b.fibra - a.fibra)

export const CARBOS_RAPIDOS = ALIMENTOS.filter(
  (a) => a.categoria === 'Carboidratos' && a.fibra < 3 && a.carbo > 15,
)
