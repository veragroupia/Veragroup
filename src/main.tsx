import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import './estilos/base.css';
import { App } from './App';
import { relogio } from './estado';

// relógio da cena: ?t= congela a entrada; movimento reduzido deixa tudo parado e aceso
{
  const p = new URLSearchParams(location.search);
  const t = p.get('t');
  if (t !== null && !Number.isNaN(Number(t))) relogio.congelado = Number(t);
  relogio.semMovimento = matchMedia('(prefers-reduced-motion: reduce)').matches || p.get('mov') === '0';
}

const raiz = document.getElementById('raiz')!;
const app = (
  <StrictMode>
    <App />
  </StrictMode>
);
// o HTML já vem pré-renderizado no build (SEO e primeira tela sem esperar o JS)
if (raiz.hasChildNodes()) hydrateRoot(raiz, app);
else createRoot(raiz).render(app);
