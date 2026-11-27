<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue';
import Icon from '../components/Icon.vue';

// Poné acá los banners reales (ps3.png / ps4.png / ps5.png / pc.png) y se usan
// solos — si falta alguno, se cae al banner dibujado a mano como respaldo.
const platformBannerFiles = import.meta.glob('../assets/covers/*.{png,jpg,jpeg,webp}', {
  eager: true,
  import: 'default',
});

function getBannerUrl(platform) {
  const key = platform.trim().toLowerCase();
  for (const path in platformBannerFiles) {
    const filename = path.split('/').pop().split('.')[0].toLowerCase();
    if (filename === key) return platformBannerFiles[path];
  }
  return null;
}

const STEPS = [
  { id: 'form', label: 'Datos' },
  { id: 'candidates', label: 'Elegí el juego' },
  { id: 'review', label: 'Ficha técnica' },
  { id: 'preview', label: 'Vista previa' },
];

const INSTALL_BLOCK =
  'NECESITÁS PARA LA INSTALACIÓN:\n' +
  '- UNA CONSOLA ORIGINAL (SIN MODIFICACIONES, QUE NO ESTÉ CHIPEADA)\n' +
  '- CONEXIÓN A INTERNET Y EL ESPACIO EN DISCO MENCIONADO';

const CONTACT_BLOCK =
  'CUANDO REALICES LA COMPRA, DEBÉS DEJARNOS TU CORREO ELECTRÓNICO PARA ENVIARTE EL ' +
  'INSTRUCTIVO PARA LA DESCARGA E INSTALACIÓN DEL JUEGO. TAMBIÉN PROPORCIONAR UN NÚMERO ' +
  'DE WHATSAPP PARA PODER CONTACTARTE';

const step = ref('form');
const error = ref('');

// Paso 1
const gameName = ref('');
const platform = ref('PS4');
const price = ref('');
const stock = ref(1);
const isSearching = ref(false);

// Paso 2
const candidates = ref([]);

// Paso 3 — ficha técnica
const isLoadingDetails = ref(false);
const availableImages = ref([]);
const selectedImages = ref(new Set());
const lightboxImage = ref(null);
const espacioDisco = ref('');
const idioma = ref('INGLÉS (consultar por español)');
const desarrollador = ref('');
const edicion = ref('Standard');
const genero = ref('');
const anio = ref('');
const multijugadorOffline = ref('NO');
const online = ref('SÍ (REQUIERE PS PLUS)');

// Paso 4 / resultado
const isPublishing = ref(false);
const logs = ref([]);
const result = ref(null);
const logContentRef = ref(null);
let cleanupLog = null;

const currentStepIndex = computed(() => STEPS.findIndex((s) => s.id === step.value));

const specBlock = computed(() =>
  [
    `JUEGO DIGITAL: ${gameName.value}`,
    `ESPACIO EN DISCO REQUERIDO: ${espacioDisco.value || 'A confirmar'}`,
    `IDIOMA: ${idioma.value || 'A confirmar'}`,
    `DESARROLLADOR: ${desarrollador.value || 'A confirmar'}`,
    `EDICIÓN: ${edicion.value || 'A confirmar'}`,
    'FORMATO: Digital',
    `PLATAFORMA: ${platform.value}`,
    `GÉNERO: ${genero.value || 'A confirmar'}`,
    `AÑO DE LANZAMIENTO: ${anio.value || 'A confirmar'}`,
    `MULTIJUGADOR OFFLINE: ${multijugadorOffline.value}`,
    `ONLINE: ${online.value}`,
  ].join('\n')
);

const fullDescription = computed(
  () => `${specBlock.value}\n\n${INSTALL_BLOCK}\n\n${CONTACT_BLOCK}`
);

const coverImage = ref(null);
const isGeneratingCover = ref(false);
const coverError = ref('');

function wrapLines(ctx, text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function drawPlayIcon(ctx, x, y, size) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + size, y + size / 2);
  ctx.lineTo(x, y + size);
  ctx.closePath();
  ctx.fill();
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('No se pudo cargar una de las imágenes'));
    img.src = src;
  });
}

function drawFallbackBar(ctx, W, barHeight, badge) {
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, barHeight);

  const isPlayStation = /playstation|^ps\d/i.test(badge);
  ctx.fillStyle = '#000000';
  let textX = 28;
  if (isPlayStation) {
    const iconSize = barHeight * 0.34;
    const iconY = barHeight / 2 - iconSize / 2;
    drawPlayIcon(ctx, textX, iconY, iconSize);
    textX += iconSize + 16;
  }
  ctx.font = `bold ${Math.round(barHeight * 0.5)}px Arial, sans-serif`;
  ctx.textBaseline = 'middle';
  ctx.fillText(badge.toUpperCase(), textX, barHeight / 2 + 2);
}

async function composeCoverBanner(sourceDataUrl, title, badge) {
  const W = 800;
  const H = 1000;

  const sourceImg = await loadImage(sourceDataUrl);
  const bannerUrl = getBannerUrl(badge);
  const bannerImg = bannerUrl ? await loadImage(bannerUrl) : null;

  const barHeight = bannerImg
    ? Math.min(Math.max(Math.round((bannerImg.height / bannerImg.width) * W), H * 0.08), H * 0.25)
    : Math.round(H * 0.13);

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  // Imagen del juego ocupando el resto de la carátula, debajo del banner.
  const imgAreaH = H - barHeight;
  const scale = Math.max(W / sourceImg.width, imgAreaH / sourceImg.height);
  const sw = W / scale;
  const sh = imgAreaH / scale;
  const sx = (sourceImg.width - sw) / 2;
  const sy = (sourceImg.height - sh) / 2;
  ctx.drawImage(sourceImg, sx, sy, sw, sh, 0, barHeight, W, imgAreaH);

  const gradient = ctx.createLinearGradient(0, H * 0.6, 0, H);
  gradient.addColorStop(0, 'rgba(0,0,0,0)');
  gradient.addColorStop(1, 'rgba(0,0,0,0.85)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, H * 0.6, W, H * 0.4);

  ctx.fillStyle = '#fff';
  ctx.font = 'bold 46px Arial, sans-serif';
  const lineHeight = 52;
  const lines = wrapLines(ctx, title.toUpperCase(), W - 64);
  const startY = H - 48 - (lines.length - 1) * lineHeight;
  lines.forEach((line, i) => ctx.fillText(line, 32, startY + i * lineHeight));

  // Banner superior: el archivo real si existe, si no el dibujado a mano.
  if (bannerImg) {
    ctx.drawImage(bannerImg, 0, 0, W, barHeight);
  } else {
    drawFallbackBar(ctx, W, barHeight, badge);
  }

  return canvas.toDataURL('image/jpeg', 0.92);
}

async function generateCover() {
  if (availableImages.value.length === 0) return;

  isGeneratingCover.value = true;
  coverError.value = '';
  coverImage.value = null;

  try {
    const res = await window.electronAPI.catalogFetchImage(availableImages.value[0]);
    if (!res.success) throw new Error(res.error);
    coverImage.value = await composeCoverBanner(res.dataUrl, gameName.value, platform.value);
  } catch (e) {
    coverError.value = e.message || String(e);
  } finally {
    isGeneratingCover.value = false;
  }
}

function handleKeydown(e) {
  if (e.key === 'Escape' && lightboxImage.value) {
    lightboxImage.value = null;
  }
}

onMounted(() => {
  if (window.electronAPI) {
    cleanupLog = window.electronAPI.onCatalogLog((message) => {
      logs.value.push(message);
      if (logContentRef.value) {
        setTimeout(() => {
          logContentRef.value.scrollTop = logContentRef.value.scrollHeight;
        }, 10);
      }
    });
  }
  window.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  if (cleanupLog) cleanupLog();
  window.removeEventListener('keydown', handleKeydown);
});

async function searchGame() {
  error.value = '';
  if (!gameName.value.trim()) {
    error.value = 'Ingresá el nombre del juego.';
    return;
  }
  if (!price.value || Number(price.value) <= 0) {
    error.value = 'Ingresá un precio válido.';
    return;
  }

  isSearching.value = true;
  candidates.value = [];

  try {
    const res = await window.electronAPI.catalogSearchGame(gameName.value.trim());
    if (!res.success) throw new Error(res.error);
    if (res.candidates.length === 0) {
      error.value = 'No se encontraron resultados para ese nombre.';
      return;
    }
    candidates.value = res.candidates;
    step.value = 'candidates';
  } catch (e) {
    error.value = e.message || String(e);
  } finally {
    isSearching.value = false;
  }
}

async function selectCandidate(candidate) {
  step.value = 'review';
  isLoadingDetails.value = true;
  error.value = '';

  try {
    const res = await window.electronAPI.catalogGetGameDetails(candidate.id);
    if (!res.success) throw new Error(res.error);

    const game = res.game;
    availableImages.value = game.images;
    selectedImages.value = new Set(game.images.slice(1, 4));
    desarrollador.value = (game.developers || []).join(', ');
    genero.value = (game.genres || []).join(' / ').toUpperCase();
    anio.value = game.released ? game.released.slice(0, 4) : '';
  } catch (e) {
    error.value = e.message || String(e);
  } finally {
    isLoadingDetails.value = false;
  }

  generateCover();
}

function backToCandidates() {
  step.value = 'candidates';
}

function toggleImage(url) {
  const next = new Set(selectedImages.value);
  if (next.has(url)) next.delete(url);
  else next.add(url);
  selectedImages.value = next;
}

function goToPreview() {
  if (!coverImage.value && selectedImages.value.size === 0) {
    error.value = 'Necesitás al menos la portada o una imagen adicional seleccionada.';
    return;
  }
  error.value = '';
  step.value = 'preview';
}

async function publish() {
  isPublishing.value = true;
  logs.value = [];
  result.value = null;
  error.value = '';

  try {
    const res = await window.electronAPI.catalogCreateProduct({
      name: `${gameName.value.trim()} (${platform.value})`,
      price: price.value,
      stock: stock.value,
      description: fullDescription.value,
      coverImage: coverImage.value,
      images: Array.from(selectedImages.value),
    });

    if (!res.success) throw new Error(res.error);
    result.value = res;
  } catch (e) {
    error.value = e.message || String(e);
  } finally {
    isPublishing.value = false;
  }
}

function reset() {
  step.value = 'form';
  gameName.value = '';
  price.value = '';
  stock.value = 1;
  candidates.value = [];
  availableImages.value = [];
  selectedImages.value = new Set();
  coverImage.value = null;
  coverError.value = '';
  espacioDisco.value = '';
  idioma.value = 'INGLÉS (consultar por español)';
  desarrollador.value = '';
  edicion.value = 'Standard';
  genero.value = '';
  anio.value = '';
  multijugadorOffline.value = 'NO';
  online.value = 'SÍ (REQUIERE PS PLUS)';
  logs.value = [];
  result.value = null;
  error.value = '';
}
</script>

<template>
  <div class="tool-card">
    <div class="card-header">
      <h2>Nueva Publicación</h2>
      <p class="subtitle">Cargá un juego digital y armá la ficha para Tiendanube</p>
    </div>

    <div class="stepper">
      <div
        v-for="(s, i) in STEPS"
        :key="s.id"
        class="step-dot"
        :class="{ active: i === currentStepIndex, done: i < currentStepIndex }"
      >
        <span class="dot">
          <Icon v-if="i < currentStepIndex" name="check" size="14" />
          <span v-else>{{ i + 1 }}</span>
        </span>
        <span class="step-label">{{ s.label }}</span>
      </div>
    </div>

    <div v-if="error" class="error-banner">
      <Icon name="x" size="16" /> {{ error }}
    </div>

    <!-- Paso 1: Datos -->
    <div v-if="step === 'form'" class="tab-content">
      <div class="form-grid">
        <div class="col-left">
          <div class="field">
            <label>Nombre del juego</label>
            <input
              v-model="gameName"
              type="text"
              placeholder="Ej: Fallout 76"
              @keyup.enter="searchGame"
            />
          </div>
          <div class="field">
            <label>Plataforma</label>
            <select v-model="platform">
              <option value="PS3">PS3</option>
              <option value="PS4">PS4</option>
              <option value="PS5">PS5</option>
              <option value="PC">PC</option>
            </select>
          </div>
        </div>
        <div class="col-right">
          <div class="field">
            <label>Precio</label>
            <input v-model="price" type="number" min="0" placeholder="Ej: 25000" />
          </div>
          <div class="field">
            <label>Stock</label>
            <input v-model.number="stock" type="number" min="0" placeholder="1" />
          </div>
        </div>
      </div>

      <button class="btn-primary flex-center" :disabled="isSearching" @click="searchGame">
        <span v-if="!isSearching" class="flex-center">
          <Icon name="search" size="18" /> Buscar info
        </span>
        <span v-else class="flex-center">
          <Icon name="loader" size="18" class="spin" /> Buscando...
        </span>
      </button>
    </div>

    <!-- Paso 2: Candidatos -->
    <div v-else-if="step === 'candidates'" class="tab-content">
      <p class="subtitle" style="margin-bottom: 1rem">¿Cuál de estos es?</p>
      <div class="candidates-grid">
        <div
          v-for="c in candidates"
          :key="c.id"
          class="candidate-card"
          @click="selectCandidate(c)"
        >
          <img v-if="c.image" :src="c.image" :alt="c.name" class="candidate-cover" />
          <div v-else class="candidate-cover candidate-cover-placeholder">
            <Icon name="image" size="32" color="#cbd5e1" />
          </div>
          <span class="candidate-badge">{{ platform }}</span>
          <div class="candidate-overlay">
            <strong class="candidate-title">{{ c.name }}</strong>
            <span class="candidate-meta">{{ c.released ? c.released.slice(0, 4) : 'Año desconocido' }}</span>
          </div>
        </div>
      </div>
      <button class="btn-secondary" style="margin-top: 1.5rem" @click="step = 'form'">
        Ninguno, buscar de nuevo
      </button>
    </div>

    <!-- Paso 3: Ficha técnica -->
    <div v-else-if="step === 'review'" class="tab-content">
      <div v-if="isLoadingDetails" class="loading-block flex-center">
        <Icon name="loader" size="24" class="spin" /> Buscando imágenes y datos del juego...
      </div>
      <div v-else>
        <div class="review-grid">
          <div class="review-col">
            <label>Portada</label>
            <div class="cover-box">
              <div v-if="isGeneratingCover" class="loading-block flex-center">
                <Icon name="loader" size="20" class="spin" /> Generando portada...
              </div>
              <div v-else-if="coverError" class="error-banner" style="margin: 0">
                <Icon name="x" size="16" /> {{ coverError }}
              </div>
              <div v-else-if="coverImage" class="cover-preview-wrap">
                <img :src="coverImage" alt="Portada generada" class="cover-preview" />
                <button
                  type="button"
                  class="image-expand"
                  title="Ver en pantalla completa"
                  @click.stop="lightboxImage = coverImage"
                >
                  <Icon name="maximize" size="14" color="#fff" />
                </button>
              </div>
              <button
                v-if="!isGeneratingCover && availableImages.length > 0"
                class="btn-secondary"
                style="margin-top: 0.75rem"
                @click="generateCover"
              >
                Regenerar portada
              </button>
            </div>

            <label style="margin-top: 1.5rem">Imágenes adicionales ({{ selectedImages.size }} seleccionadas)</label>
            <div class="image-grid">
              <div
                v-for="img in availableImages"
                :key="img"
                class="image-thumb"
                :class="{ selected: selectedImages.has(img) }"
                @click="toggleImage(img)"
              >
                <img :src="img" alt="" />
                <div class="image-check">
                  <Icon v-if="selectedImages.has(img)" name="check" size="14" color="#fff" />
                </div>
                <button
                  type="button"
                  class="image-expand"
                  title="Ver en pantalla completa"
                  @click.stop="lightboxImage = img"
                >
                  <Icon name="maximize" size="14" color="#fff" />
                </button>
              </div>
            </div>
          </div>

          <div class="review-col">
            <div class="spec-grid">
              <div class="field">
                <label>Espacio en disco</label>
                <input v-model="espacioDisco" type="text" placeholder="Ej: 85GB aprox." />
              </div>
              <div class="field">
                <label>Idioma</label>
                <input v-model="idioma" type="text" />
              </div>
              <div class="field">
                <label>Desarrollador</label>
                <input v-model="desarrollador" type="text" />
              </div>
              <div class="field">
                <label>Edición</label>
                <input v-model="edicion" type="text" />
              </div>
              <div class="field">
                <label>Género</label>
                <input v-model="genero" type="text" />
              </div>
              <div class="field">
                <label>Año de lanzamiento</label>
                <input v-model="anio" type="text" />
              </div>
              <div class="field">
                <label>Multijugador offline</label>
                <select v-model="multijugadorOffline">
                  <option value="NO">NO</option>
                  <option value="SÍ">SÍ</option>
                </select>
              </div>
              <div class="field">
                <label>Online</label>
                <input v-model="online" type="text" placeholder="Ej: SÍ (REQUIERE PS PLUS)" />
              </div>
            </div>
          </div>
        </div>

        <div class="actions-row">
          <button class="btn-secondary" @click="backToCandidates">Volver</button>
          <button class="btn-primary" style="width: auto" @click="goToPreview">
            Vista previa →
          </button>
        </div>
      </div>
    </div>

    <!-- Paso 4: Vista previa / Publicar -->
    <div v-else-if="step === 'preview'" class="tab-content">
      <div v-if="!result" class="preview-card">
        <div class="preview-images">
          <img v-if="coverImage" :src="coverImage" alt="Portada" class="preview-cover" />
          <img v-for="img in Array.from(selectedImages)" :key="img" :src="img" alt="" />
        </div>
        <div class="preview-price">${{ price }} · Stock: {{ stock }}</div>
        <pre class="preview-description">{{ fullDescription }}</pre>

        <div class="actions-row">
          <button class="btn-secondary" :disabled="isPublishing" @click="step = 'review'">
            Volver a editar
          </button>
          <button
            class="btn-primary flex-center"
            style="width: auto"
            :disabled="isPublishing"
            @click="publish"
          >
            <span v-if="!isPublishing" class="flex-center">
              <Icon name="shopping-bag" size="18" /> Crear en Tiendanube
            </span>
            <span v-else class="flex-center">
              <Icon name="loader" size="18" class="spin" /> Publicando...
            </span>
          </button>
        </div>

        <div v-if="logs.length > 0" class="log-container">
          <div class="log-header">Logs</div>
          <div ref="logContentRef" class="log-content">
            <div v-for="(log, i) in logs" :key="i" class="log-line">
              <span class="log-prefix">>></span> {{ log }}
            </div>
          </div>
        </div>
      </div>

      <div v-else class="result-block flex-center">
        <Icon name="check" size="40" color="#059669" />
        <h3>¡Publicación creada!</h3>
        <p class="subtitle">
          "{{ result.name }}" se creó en Tiendanube (ID {{ result.id }}). Revisala desde el panel
          de Tiendanube antes de darla por publicada.
        </p>
        <button class="btn-primary" style="width: auto" @click="reset">
          Crear otra publicación
        </button>
      </div>
    </div>

    <div v-if="lightboxImage" class="lightbox-overlay" @click="lightboxImage = null">
      <button class="lightbox-close" title="Cerrar" @click="lightboxImage = null">
        <Icon name="x" size="22" color="#fff" />
      </button>
      <img :src="lightboxImage" alt="" class="lightbox-image" @click.stop />
    </div>
  </div>
</template>

<style scoped>
.stepper {
  display: flex;
  gap: 1.5rem;
  margin-bottom: 2rem;
}
.step-dot {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-light);
  font-size: 0.85rem;
  font-weight: 600;
}
.dot {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--bg-content);
  border: 2px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
}
.step-dot.active .dot {
  border-color: var(--accent);
  color: var(--accent);
}
.step-dot.active .step-label {
  color: var(--text-primary);
}
.step-dot.done .dot {
  background: var(--accent);
  border-color: var(--accent);
  color: white;
}
.step-dot.done .step-label {
  color: var(--text-secondary);
}

.error-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(239, 68, 68, 0.1);
  color: #dc2626;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  margin-bottom: 1.5rem;
  font-size: 0.9rem;
}

.btn-secondary {
  background: var(--bg-card);
  border: 1px solid var(--border);
  color: var(--text-primary);
  padding: 0.75rem 1.5rem;
  border-radius: 10px;
  cursor: pointer;
  font-weight: 600;
}
.btn-secondary:hover {
  background: var(--bg-content);
}
.btn-secondary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.flex-center {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}
.spin {
  animation: spin 1s linear infinite;
}
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.loading-block {
  padding: 3rem 0;
  color: var(--text-secondary);
}

.candidates-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 1rem;
}
.candidate-card {
  position: relative;
  aspect-ratio: 3 / 4;
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid var(--border);
  background: var(--bg-content);
}
.candidate-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
  border-color: var(--accent);
}
.candidate-cover {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.candidate-cover-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
}
.candidate-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  background: var(--accent);
  color: white;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  padding: 3px 8px;
  border-radius: 99px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25);
}
.candidate-overlay {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 1.25rem 0.75rem 0.6rem;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.85), rgba(0, 0, 0, 0));
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.candidate-title {
  color: white;
  font-size: 0.85rem;
  line-height: 1.25;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.candidate-meta {
  font-size: 0.72rem;
  color: rgba(255, 255, 255, 0.75);
}

.review-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
}
.review-col label {
  margin-bottom: 0.5rem;
}

.cover-box {
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 1rem;
  background: var(--bg-content);
}
.cover-preview-wrap {
  position: relative;
  display: inline-block;
  max-width: 220px;
}
.cover-preview-wrap:hover .image-expand {
  opacity: 1;
}
.cover-preview {
  width: 100%;
  max-width: 220px;
  border-radius: 8px;
  display: block;
}

.image-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
}
.image-thumb {
  position: relative;
  aspect-ratio: 4 / 3;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  border: 2px solid transparent;
  opacity: 0.5;
  transition: all 0.2s;
}
.image-thumb.selected {
  opacity: 1;
  border-color: var(--accent);
}
.image-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.image-check {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--accent);
  display: flex;
  align-items: center;
  justify-content: center;
}

.image-expand {
  position: absolute;
  bottom: 6px;
  right: 6px;
  width: 24px;
  height: 24px;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.55);
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.2s, background 0.2s;
}
.image-thumb:hover .image-expand {
  opacity: 1;
}
.image-expand:hover {
  background: rgba(0, 0, 0, 0.8);
}

.lightbox-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  cursor: zoom-out;
}
.lightbox-image {
  max-width: 90vw;
  max-height: 90vh;
  border-radius: 8px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
  cursor: default;
}
.lightbox-close {
  position: absolute;
  top: 24px;
  right: 24px;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.2s;
}
.lightbox-close:hover {
  background: rgba(255, 255, 255, 0.2);
}

.spec-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0 1rem;
}

.actions-row {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 2rem;
}

.preview-card {
  max-width: 600px;
}
.preview-images {
  display: flex;
  gap: 0.5rem;
  overflow-x: auto;
  margin-bottom: 1rem;
}
.preview-images img {
  height: 140px;
  border-radius: 8px;
  flex-shrink: 0;
}
.preview-images .preview-cover {
  border: 2px solid var(--accent);
}
.preview-price {
  color: var(--accent);
  font-weight: 700;
  margin-bottom: 1rem;
}
.preview-description {
  color: var(--text-secondary);
  line-height: 1.6;
  margin-bottom: 1rem;
  white-space: pre-wrap;
  font-family: inherit;
  background: var(--bg-content);
  padding: 1rem;
  border-radius: 8px;
  border: 1px solid var(--border);
}

.log-container {
  margin-top: 1.5rem;
  border: 1px solid #9ca3af;
  background: #000;
  border-radius: 6px;
  overflow: hidden;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
}
.log-header {
  background: #e5e7eb;
  color: #374151;
  padding: 4px 10px;
  font-size: 0.75rem;
  font-weight: bold;
  border-bottom: 1px solid #9ca3af;
}
.log-content {
  height: 120px;
  overflow-y: auto;
  padding: 10px;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 0.8rem;
  color: #10b981;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.log-line {
  word-break: break-all;
  line-height: 1.4;
}
.log-prefix {
  margin-right: 8px;
  color: #34d399;
  font-weight: bold;
}

.result-block {
  flex-direction: column;
  text-align: center;
  gap: 0.75rem;
  padding: 3rem 1rem;
}
</style>
