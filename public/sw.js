/*
 * Service worker do modo apresentação (/apresentacao).
 * Registrado só com escopo /apresentacao: o resto do site não passa por aqui.
 *
 * Estratégia: tudo o que a apresentação usa (página, CSS, JS, fontes, imagens)
 * fica guardado no aparelho. Com internet, o que está guardado aparece na hora
 * e é atualizado em segundo plano. Sem internet (sinal ruim dentro da loja),
 * a apresentação abre do mesmo jeito.
 *
 * Para forçar todo mundo a baixar de novo, troque a versão abaixo.
 */
const CACHE = 'vg-apresentacao-v1';
const PAGINA = '/apresentacao';

self.addEventListener('install', (evento) => {
  evento.waitUntil(caches.open(CACHE).then((c) => c.add(PAGINA)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((chaves) => Promise.all(chaves.filter((k) => k.startsWith('vg-apresentacao') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// A página manda a lista do que usou na primeira visita (antes de o SW existir).
self.addEventListener('message', (evento) => {
  const dados = evento.data || {};
  if (dados.tipo !== 'guardar' || !Array.isArray(dados.urls)) return;
  evento.waitUntil(
    caches.open(CACHE).then(async (cache) => {
      const faltavam = [];
      for (const url of dados.urls) {
        if (!(await cache.match(url))) faltavam.push(url);
      }
      await Promise.all(faltavam.map((url) => cache.add(url).catch(() => {})));
      const resposta = { tipo: 'guardado', novo: faltavam.length > 1 };
      if (evento.source) evento.source.postMessage(resposta);
    }),
  );
});

/*
 * Versão nova da página (depois de um deploy): antes de trocar a página guardada,
 * guarda também os arquivos que ela usa. Assim a próxima abertura sem internet
 * nunca pega uma página nova apontando para um script que não foi baixado.
 */
async function guardarPaginaNova(cache, resposta) {
  const html = await resposta.clone().text();
  const arquivos = [...new Set(html.match(/\/(?:_astro|vendor)\/[^"'\s,)]+/g) || [])];
  const faltando = [];
  for (const url of arquivos) {
    if (!(await cache.match(url))) faltando.push(url);
  }
  await Promise.all(faltando.map((url) => cache.add(url).catch(() => {})));
  await cache.put(PAGINA, resposta);
}

self.addEventListener('fetch', (evento) => {
  const pedido = evento.request;
  if (pedido.method !== 'GET') return;
  const url = new URL(pedido.url);
  if (url.origin !== self.location.origin) return;

  // A página em si: sempre a mesma chave, com ou sem ?empresa= no endereço.
  const navegacao = pedido.mode === 'navigate';
  const chave = navegacao ? PAGINA : pedido;

  evento.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const guardado = await cache.match(chave);
      const rede = fetch(pedido)
        .then(async (resposta) => {
          if (resposta.ok && resposta.type === 'basic') {
            if (navegacao) await guardarPaginaNova(cache, resposta.clone());
            else await cache.put(chave, resposta.clone());
          }
          return resposta;
        })
        .catch(() => guardado);
      if (guardado) {
        evento.waitUntil(rede.catch(() => {}));
        return guardado;
      }
      return rede;
    }),
  );
});
