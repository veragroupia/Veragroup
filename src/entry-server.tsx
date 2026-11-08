import { renderToString } from 'react-dom/server';
import { App } from './App';

/** Usado só no build: gera o HTML inicial (SEO e primeira tela sem esperar o JavaScript). */
export function render() {
  return renderToString(<App />);
}
export { empresa } from './data/empresa';
