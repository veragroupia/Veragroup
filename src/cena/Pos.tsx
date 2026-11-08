import { Bloom, EffectComposer, SMAA, ToneMapping, Vignette } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import { useEstado } from '../estado';

/**
 * Pós-processamento: o brilho só pega o que passa de 1,0 (vitrines, letreiros e lâmpadas acesas),
 * então é seletivo pela própria luz. Depois ACES, vinheta leve e SMAA.
 */
export function Pos() {
  const qualidade = useEstado((s) => s.qualidade);
  if (qualidade === 'baixa') {
    return (
      <EffectComposer multisampling={0} enableNormalPass={false}>
        <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
        <Vignette offset={0.32} darkness={0.45} eskil={false} />
        <SMAA />
      </EffectComposer>
    );
  }
  return (
    <EffectComposer multisampling={0} enableNormalPass={false}>
      <Bloom mipmapBlur luminanceThreshold={0.9} luminanceSmoothing={0.3} intensity={1.25} radius={0.75} levels={7} />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      <Vignette offset={0.32} darkness={0.45} eskil={false} />
      <SMAA />
    </EffectComposer>
  );
}
