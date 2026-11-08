import { Bloom, EffectComposer, SMAA, ToneMapping, Vignette } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import { useEstado } from '../estado';

/**
 * Pós-processamento leve: brilho em MEIA resolução e só no que passa de 0,9 (luzes acesas),
 * ACES, vinheta e SMAA (este só na qualidade alta).
 */
export function Pos() {
  const qualidade = useEstado((s) => s.qualidade);
  if (qualidade === 'baixa')
    return (
      <EffectComposer multisampling={0} enableNormalPass={false}>
        <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
        <Vignette offset={0.32} darkness={0.42} eskil={false} />
      </EffectComposer>
    );
  if (qualidade === 'media')
    return (
      <EffectComposer multisampling={0} enableNormalPass={false}>
        <Bloom mipmapBlur luminanceThreshold={0.9} luminanceSmoothing={0.3} intensity={1.1} radius={0.7} levels={6} resolutionScale={0.5} />
        <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
        <Vignette offset={0.32} darkness={0.42} eskil={false} />
      </EffectComposer>
    );
  return (
    <EffectComposer multisampling={0} enableNormalPass={false}>
      <Bloom mipmapBlur luminanceThreshold={0.9} luminanceSmoothing={0.3} intensity={1.15} radius={0.72} levels={7} resolutionScale={0.5} />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      <Vignette offset={0.32} darkness={0.42} eskil={false} />
      <SMAA />
    </EffectComposer>
  );
}
