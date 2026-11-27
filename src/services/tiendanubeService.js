function getConfig() {
  const storeId = process.env.TIENDANUBE_STORE_ID;
  const token = process.env.TIENDANUBE_ACCESS_TOKEN;
  const userAgent = process.env.TIENDANUBE_USER_AGENT;

  if (!storeId || !token) {
    throw new Error(
      'Falta TIENDANUBE_STORE_ID o TIENDANUBE_ACCESS_TOKEN en el .env.'
    );
  }

  return { storeId, token, userAgent: userAgent || 'SasitoTool (sin-contacto)' };
}

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function textToHtml(description) {
  return description
    .split(/\n{2,}/)
    .map((block) => `<p>${escapeHtml(block).replace(/\n/g, '<br>')}</p>`)
    .join('');
}

export async function createProduct(
  { name, price, stock, description, images, coverImage },
  onLog = () => {}
) {
  const { storeId, token, userAgent } = getConfig();

  const imagePayload = [];
  if (coverImage) {
    const base64 = coverImage.split(',')[1] || coverImage;
    imagePayload.push({ attachment: base64, filename: 'portada.jpg' });
  }
  for (const src of images || []) {
    imagePayload.push({ src });
  }

  const body = {
    name: { es: name },
    description: { es: textToHtml(description) },
    variants: [
      {
        price: String(price),
        stock: stock,
      },
    ],
    images: imagePayload,
  };

  onLog(`Creando "${name}" en Tiendanube...`);

  const response = await fetch(
    `https://api.tiendanube.com/v1/${storeId}/products`,
    {
      method: 'POST',
      headers: {
        Authentication: `bearer ${token}`,
        'Content-Type': 'application/json',
        'User-Agent': userAgent,
      },
      body: JSON.stringify(body),
    }
  );

  const responseBody = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message =
      responseBody?.description || responseBody?.message || `HTTP ${response.status}`;
    onLog(`❌ Tiendanube rechazó la creación: ${message}`);
    throw new Error(`Error creando producto en Tiendanube: ${message}`);
  }

  onLog(`✅ Producto creado (ID ${responseBody.id}).`);

  return {
    id: responseBody.id,
    name,
  };
}
