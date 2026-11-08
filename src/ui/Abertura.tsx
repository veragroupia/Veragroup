import { useEffect } from 'react';
import { empresa } from '../data/empresa';
import { relogio, useEstado } from '../estado';

/**
 * Abertura da marca: "v e r a ." sobem uma a uma, com o brilho dourado respirando atrás.
 * É só CSS (some sozinha mesmo sem JavaScript); o JS só avisa a cena quando pode acender as luzes.
 */
export function Abertura() {
  const setIntroFeita = useEstado((s) => s.setIntroFeita);
  useEffect(() => {
    const pular = relogio.semMovimento || relogio.congelado !== null;
    if (pular) document.querySelector('.abertura')?.classList.add('abertura--pular');
    const id = setTimeout(setIntroFeita, pular ? 0 : 2600);
    return () => clearTimeout(id);
  }, [setIntroFeita]);
  return (
    <div className="abertura" aria-hidden="true">
      <div className="abertura-miolo">
        <div className="abertura-brilho" />
        <p className="abertura-logo marca">
          <span>v</span>
          <span>e</span>
          <span>r</span>
          <span>a</span>
          <span className="marca-ponto">.</span>
        </p>
        <p className="abertura-assinatura">{empresa.assinatura}</p>
      </div>
    </div>
  );
}
