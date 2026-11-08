import { BufferAttribute, type BufferGeometry, Matrix3, Matrix4, Vector3 } from 'three';

/**
 * Luz assada: a luz quente dos postes é calculada uma vez, por vértice, quando a geometria nasce,
 * e gravada no atributo `luz`. O shader só soma `albedo × luz` (ver materiais.ts).
 * Nenhuma luz de poste existe em tempo real: é isso que deixa a cena leve.
 */
export interface Poste {
  x: number;
  y: number;
  z: number;
}

const COR_SODIO: [number, number, number] = [1.0, 0.66, 0.36];
const p = new Vector3();
const n = new Vector3();
const d = new Vector3();
const m3 = new Matrix3();

export function assarPostes(geo: BufferGeometry | undefined, postes: Poste[], matriz?: Matrix4, intensidade = 1.25, raio = 8.5) {
  if (!geo) return;
  const pos = geo.getAttribute('position') as BufferAttribute;
  const nor = geo.getAttribute('normal') as BufferAttribute;
  let luz = geo.getAttribute('luz') as BufferAttribute | undefined;
  if (!luz) {
    luz = new BufferAttribute(new Float32Array(pos.count * 3), 3);
    geo.setAttribute('luz', luz);
  }
  if (matriz) m3.getNormalMatrix(matriz);
  for (let i = 0; i < pos.count; i++) {
    p.fromBufferAttribute(pos, i);
    n.fromBufferAttribute(nor, i);
    if (matriz) {
      p.applyMatrix4(matriz);
      n.applyMatrix3(m3).normalize();
    }
    let r = 0;
    for (const s of postes) {
      d.set(s.x - p.x, s.y - p.y, s.z - p.z);
      const dist = d.length();
      if (dist > raio * 2.6) continue;
      d.divideScalar(dist || 1);
      const lambert = Math.max(0, n.dot(d));
      const queda = 1 / (1 + (dist / raio) * (dist / raio) * 2.2);
      r += lambert * queda;
    }
    r *= intensidade;
    luz.setXYZ(i, luz.getX(i) + r * COR_SODIO[0], luz.getY(i) + r * COR_SODIO[1], luz.getZ(i) + r * COR_SODIO[2]);
  }
  luz.needsUpdate = true;
}
