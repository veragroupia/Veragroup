/**
 * Busca de negócios no Google (Maps JavaScript API, biblioteca Places).
 *
 * Só funciona com VITE_GOOGLE_MAPS_API_KEY configurada no build (ver README). Sem chave, o site
 * entra em modo SIMULAÇÃO e diz isso na tela. Nada é enviado ao Google sem o visitante clicar em buscar.
 */

const CHAVE = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined)?.trim() ?? '';

export const googleConfigurado = CHAVE.length > 0;

export interface Lugar {
  id: string;
  nome: string;
  endereco?: string;
  categoria?: string;
  tipo?: string;
  nota?: number;
  avaliacoes?: number;
  site?: string;
  telefone?: string;
  temHorario: boolean;
  mapa?: string;
}

type GoogleGlobal = {
  maps: { importLibrary: (nome: string) => Promise<Record<string, unknown>> };
};

let carregando: Promise<GoogleGlobal> | null = null;

function carregarMaps(): Promise<GoogleGlobal> {
  if (carregando) return carregando;
  carregando = new Promise((ok, erro) => {
    const w = window as unknown as Record<string, unknown>;
    const cb = '__veraMapsPronto';
    w[cb] = () => ok(w.google as GoogleGlobal);
    const s = document.createElement('script');
    s.src =
      'https://maps.googleapis.com/maps/api/js?key=' +
      encodeURIComponent(CHAVE) +
      `&v=weekly&loading=async&libraries=places&language=pt-BR&region=BR&callback=${cb}`;
    s.async = true;
    s.onerror = () => {
      carregando = null;
      erro(new Error('Não deu para falar com o Google agora.'));
    };
    document.head.appendChild(s);
  });
  return carregando;
}

interface PlaceJs {
  id: string;
  displayName?: string;
  formattedAddress?: string;
  primaryType?: string;
  primaryTypeDisplayName?: string;
  rating?: number;
  userRatingCount?: number;
  websiteURI?: string;
  nationalPhoneNumber?: string;
  regularOpeningHours?: unknown;
  googleMapsURI?: string;
}

/** Busca pelo nome, com preferência pela região das 4 cidades. */
export async function buscarNoGoogle(texto: string): Promise<Lugar[]> {
  if (!googleConfigurado) throw new Error('Google não configurado.');
  const google = await carregarMaps();
  const lib = (await google.maps.importLibrary('places')) as {
    Place: { searchByText: (req: unknown) => Promise<{ places: PlaceJs[] }> };
  };
  const { places } = await lib.Place.searchByText({
    textQuery: texto,
    fields: [
      'id',
      'displayName',
      'formattedAddress',
      'primaryType',
      'primaryTypeDisplayName',
      'rating',
      'userRatingCount',
      'websiteURI',
      'nationalPhoneNumber',
      'regularOpeningHours',
      'googleMapsURI',
    ],
    locationBias: { center: { lat: -23.29, lng: -47.33 }, radius: 40000 },
    language: 'pt-BR',
    region: 'br',
    maxResultCount: 5,
  });
  return places.map((p) => ({
    id: p.id,
    nome: p.displayName ?? texto,
    endereco: p.formattedAddress,
    categoria: p.primaryTypeDisplayName,
    tipo: p.primaryType,
    nota: p.rating ?? undefined,
    avaliacoes: p.userRatingCount ?? undefined,
    site: p.websiteURI ?? undefined,
    telefone: p.nationalPhoneNumber ?? undefined,
    temHorario: Boolean(p.regularOpeningHours),
    mapa: p.googleMapsURI ?? undefined,
  }));
}
