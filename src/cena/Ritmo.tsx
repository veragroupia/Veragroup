import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useFrame, useThree } from '@react-three/fiber';
import { relogio, useEstado } from '../estado';
import { ENTRADA } from './luz';

/**
 * Ritmo da cena (frameloop="demand"): só desenha quando algo muda.
 * - Interação e voos de câmera: o CameraControls pede quadros sozinho, na taxa cheia.
 * - Vida da rua (carros, pedestres): um metrônomo pede quadros a 30 por segundo (60 no desktop forte).
 * - Aba escondida, ou movimento reduzido: nada anda; só quadros quando o estado muda.
 * Também avança o relógio da cena, pré-compila os shaders atrás do pôster e mede o fps de verdade.
 */
export function Ritmo() {
  const { gl, scene, camera, invalidate } = useThree();
  const introFeita = useEstado((s) => s.introFeita);
  const qualidade = useEstado((s) => s.qualidade);
  const setCenaPronta = useEstado((s) => s.setCenaPronta);
  const setEntradaFeita = useEstado((s) => s.setEntradaFeita);
  const setQualidade = useEstado((s) => s.setQualidade);
  const [pronta, setPronta] = useState(false);
  const amostras = useRef<number[]>([]);
  const ultimo = useRef(performance.now());
  const cheioAte = useRef(0);
  const decidido = useRef(new URLSearchParams(location.search).has('q'));
  const medidor = useRef<HTMLDivElement | null>(null);
  const mostrarMedidor = new URLSearchParams(location.search).get('fps') === '1';

  // 1) pré-compila os shaders enquanto o pôster ainda está na tela
  useEffect(() => {
    let vivo = true;
    const compilar = (gl as unknown as { compileAsync?: (s: unknown, c: unknown) => Promise<unknown> }).compileAsync;
    const fim = () => {
      if (!vivo) return;
      setPronta(true);
      invalidate();
      requestAnimationFrame(() => requestAnimationFrame(() => vivo && setCenaPronta()));
    };
    if (compilar) void compilar.call(gl, scene, camera).then(fim, fim);
    else fim();
    return () => {
      vivo = false;
    };
  }, [gl, scene, camera, invalidate, setCenaPronta]);

  // 2) metrônomo da vida ambiente
  useEffect(() => {
    if (!pronta) return;
    let id = 0;
    const fps = qualidade === 'alta' ? 60 : 30;
    const passo = () => {
      if (!document.hidden && !relogio.semMovimento) invalidate();
    };
    id = window.setInterval(passo, 1000 / fps);
    // depois que a abertura sai, uns segundos em taxa cheia: mede o aparelho de verdade
    cheioAte.current = performance.now() + 4500;
    const cheio = () => {
      if (performance.now() < cheioAte.current && !document.hidden) {
        invalidate();
        requestAnimationFrame(cheio);
      }
    };
    requestAnimationFrame(cheio);
    return () => window.clearInterval(id);
  }, [pronta, qualidade, introFeita, invalidate]);

  // 3) com movimento reduzido, ainda redesenha quando o estado muda (voos e painéis)
  useEffect(
    () =>
      useEstado.subscribe(() => {
        const ate = performance.now() + 1500;
        const loop = () => {
          if (performance.now() < ate) {
            invalidate();
            requestAnimationFrame(loop);
          }
        };
        loop();
      }),
    [invalidate],
  );

  useFrame((_, dt) => {
    // relógio: parado até o logo sair; congelado com ?t=; acabado com movimento reduzido
    if (relogio.congelado !== null) relogio.t = relogio.congelado;
    else if (relogio.semMovimento) relogio.t = 99;
    else if (introFeita) relogio.t += Math.min(dt, 0.1);
    if (relogio.t >= ENTRADA.fim + 1.2 && !useEstado.getState().entradaFeita) setEntradaFeita();

    // medição: só quadros seguidos contam (taxa cheia), não os do metrônomo
    const agora = performance.now();
    const intervalo = agora - ultimo.current;
    ultimo.current = agora;
    if (agora < cheioAte.current && intervalo < 200) {
      amostras.current.push(intervalo);
      if (amostras.current.length > 90) amostras.current.shift();
    }
    if (!decidido.current && amostras.current.length >= 60 && agora > cheioAte.current - 500) {
      const ord = [...amostras.current].sort((a, b) => a - b);
      const mediana = ord[Math.floor(ord.length / 2)];
      const fpsMedido = 1000 / mediana;
      decidido.current = true;
      if (fpsMedido < 24) setQualidade('baixa');
      else if (fpsMedido < 40 && useEstado.getState().qualidade === 'alta') setQualidade('media');
    }
    if (medidor.current && amostras.current.length > 10) {
      const ord = [...amostras.current].sort((a, b) => a - b);
      const mediana = ord[Math.floor(ord.length / 2)];
      medidor.current.textContent = `${(1000 / mediana).toFixed(0)} fps (taxa cheia) · qualidade ${useEstado.getState().qualidade}`;
    }
  });

  return mostrarMedidor ? createPortal(<div className="medidor" ref={medidor} />, document.body) : null;
}
