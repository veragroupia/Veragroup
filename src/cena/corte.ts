import { Intersection, Mesh, Plane, Raycaster, Vector3 } from 'three';

/**
 * Maquete em corte: o lado da rua que fica entre a câmera e a rua aparece cortado à altura de
 * ~1,4 m (planta baixa com móveis), para não tampar as fachadas do outro lado. Quando a câmera
 * gira para o outro lado, os papéis trocam. Olhando ao longo da rua, os dois lados ficam inteiros.
 */
export type Fileira = 'norte' | 'sul';

export const ALTURA_CORTE = 1.4;
const INTEIRO = 200;

export const planos: Record<Fileira, Plane> = {
  norte: new Plane(new Vector3(0, -1, 0), INTEIRO),
  sul: new Plane(new Vector3(0, -1, 0), INTEIRO),
};

/** 0 = prédio inteiro, 1 = cortado. */
export const corte: Record<Fileira, number> = { norte: 0, sul: 0 };

const suave = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/**
 * Azimute em graus no padrão do camera-controls (180 = câmera em -Z, 270 = em -X, 360 = em +Z).
 * `instantaneo` serve para prints e para quem prefere menos movimento.
 */
export function atualizarCorte(azimuteGraus: number, dt: number, instantaneo = false) {
  const a = ((azimuteGraus % 360) + 360) % 360;
  const alvoSul = a < 270 && a > 90 ? 1 - suave(246, 262, a) : 0;
  const alvoNorte = a >= 270 || a < 90 ? suave(278, 294, a < 90 ? a + 360 : a) : 0;
  const k = instantaneo ? 1 : 1 - Math.exp(-dt * 6);
  corte.sul += (alvoSul - corte.sul) * k;
  corte.norte += (alvoNorte - corte.norte) * k;
  for (const f of ['norte', 'sul'] as const) {
    const c = corte[f];
    // sobe rápido do corte até o topo, para não ficar "meio prédio" por muito tempo
    planos[f].constant = c > 0.999 ? ALTURA_CORTE : c < 0.001 ? INTEIRO : ALTURA_CORTE + Math.pow(1 - c, 2) * 30;
  }
}

/** Raycast que ignora o que está acima do corte (o raycast do three não conhece planos de recorte). */
export function raycastCortado(fileira: Fileira) {
  return function (this: Mesh, raycaster: Raycaster, hits: Intersection[]) {
    const antes = hits.length;
    Mesh.prototype.raycast.call(this, raycaster, hits);
    const limite = planos[fileira].constant;
    if (limite >= INTEIRO) return;
    for (let i = hits.length - 1; i >= antes; i--) if (hits[i].point.y > limite) hits.splice(i, 1);
  };
}

/** Corte de UMA loja (a fachada que abre): plano horizontal próprio, além do corte da fileira. */
export const ALTURA_ABERTA = 2.7;
const planosLoja = new Map<string, Plane>();
export function planoDaLoja(id: string) {
  let p = planosLoja.get(id);
  if (!p) {
    p = new Plane(new Vector3(0, -1, 0), INTEIRO);
    planosLoja.set(id, p);
  }
  return p;
}
/** Abre (1) ou fecha (0) o corte de uma loja. */
export function cortarLoja(id: string, aberta: number) {
  const p = planoDaLoja(id);
  p.constant = aberta > 0.999 ? ALTURA_ABERTA : aberta < 0.001 ? INTEIRO : ALTURA_ABERTA + Math.pow(1 - aberta, 2) * 40;
}

/** Raycast que respeita a fileira e, se houver, o corte da loja. */
export function raycastCortadoLoja(fileira: Fileira, id: string) {
  return function (this: Mesh, raycaster: Raycaster, hits: Intersection[]) {
    const antes = hits.length;
    Mesh.prototype.raycast.call(this, raycaster, hits);
    const limite = Math.min(planos[fileira].constant, planoDaLoja(id).constant);
    if (limite >= INTEIRO) return;
    for (let i = hits.length - 1; i >= antes; i--) if (hits[i].point.y > limite) hits.splice(i, 1);
  };
}
