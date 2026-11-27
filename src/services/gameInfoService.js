const RAWG_BASE = 'https://api.rawg.io/api';

function getApiKey() {
  const key = process.env.RAWG_API_KEY;
  if (!key) {
    throw new Error(
      'Falta RAWG_API_KEY en el .env. Conseguí una key gratis en rawg.io/apidocs.'
    );
  }
  return key;
}

export async function searchGames(name) {
  const key = getApiKey();
  const url = `${RAWG_BASE}/games?key=${key}&search=${encodeURIComponent(
    name
  )}&page_size=6`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Error buscando en RAWG (HTTP ${response.status})`);
  }

  const data = await response.json();

  return (data.results || []).map((game) => ({
    id: game.id,
    name: game.name,
    released: game.released,
    image: game.background_image,
    platforms: (game.platforms || []).map((p) => p.platform.name),
  }));
}

export async function getGameFull(id) {
  const key = getApiKey();

  const [detailsRes, screenshotsRes] = await Promise.all([
    fetch(`${RAWG_BASE}/games/${id}?key=${key}`),
    fetch(`${RAWG_BASE}/games/${id}/screenshots?key=${key}`),
  ]);

  if (!detailsRes.ok) {
    throw new Error(`Error obteniendo detalles del juego (HTTP ${detailsRes.status})`);
  }

  const details = await detailsRes.json();
  const screenshots = screenshotsRes.ok ? await screenshotsRes.json() : { results: [] };

  const images = [];
  if (details.background_image) images.push(details.background_image);
  for (const shot of screenshots.results || []) {
    if (shot.image && !images.includes(shot.image)) images.push(shot.image);
  }

  return {
    id: details.id,
    name: details.name,
    released: details.released,
    genres: (details.genres || []).map((g) => g.name),
    platforms: (details.platforms || []).map((p) => p.platform.name),
    developers: (details.developers || []).map((d) => d.name),
    images: images.slice(0, 8),
  };
}

export async function fetchImageAsDataUrl(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`No se pudo descargar la imagen (HTTP ${response.status})`);
  }

  const contentType = response.headers.get('content-type') || 'image/jpeg';
  const buffer = Buffer.from(await response.arrayBuffer());
  return `data:${contentType};base64,${buffer.toString('base64')}`;
}
