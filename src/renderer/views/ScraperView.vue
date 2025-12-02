<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import FavoritesView from './FavoritesView.vue';
import Icon from '../components/Icon.vue';

const activeTab = ref('new');

const url = ref('');
const fileName = ref('');
const pages = ref(1);
const format = ref('xlsx');
const dollarRate = ref('1135');
const isRunning = ref(false);
const logs = ref([]);
const showModal = ref(false);
const favName = ref('');

const logContentRef = ref(null);

let cleanupLog = null;
let cleanupComplete = null;

onMounted(() => {
  const savedSettings = localStorage.getItem('sasito_settings');
  if (savedSettings) {
    try {
      const settings = JSON.parse(savedSettings);
      if (settings.dollarValue) dollarRate.value = settings.dollarValue;
      if (settings.defaultFormat) format.value = settings.defaultFormat;
    } catch (e) {
      console.error('Error loading settings', e);
    }
  }

  const pendingRun = localStorage.getItem('sasito_pending_run');
  if (pendingRun) {
    try {
      const fav = JSON.parse(pendingRun);
      loadFavoriteIntoForm(fav);
      localStorage.removeItem('sasito_pending_run');
    } catch (e) {
      console.error('Error parsing pending run', e);
    }
  }

  if (window.electronAPI) {
    cleanupLog = window.electronAPI.onLog((data) => {
      logs.value.push(data);
      if (logContentRef.value) {
        setTimeout(() => {
          logContentRef.value.scrollTop = logContentRef.value.scrollHeight;
        }, 10);
      }
    });

    cleanupComplete = window.electronAPI.onScrapeComplete((result) => {
      isRunning.value = false;
      if (result.success) {
        alert(`¡Listo! Archivo guardado en: ${result.path}`);
      } else {
        alert(`Error: ${result.error}`);
      }
    });
  }
});

onUnmounted(() => {
  if (cleanupLog) cleanupLog();
  if (cleanupComplete) cleanupComplete();
});

function loadFavoriteIntoForm(fav) {
  url.value = fav.url || '';
  fileName.value = fav.fileName || '';
  activeTab.value = 'new';
}

function runScraper() {
  if (!url.value) {
    alert('Por favor ingresá una URL válida.');
    return;
  }
  if (!fileName.value) {
    alert('Por favor ingresá un nombre de archivo.');
    return;
  }

  isRunning.value = true;
  logs.value = [];

  const savedSettings = localStorage.getItem('sasito_settings');
  let config = {};
  if (savedSettings) {
    config = JSON.parse(savedSettings);
  }

  if (window.electronAPI) {
    window.electronAPI.runScraper({
      url: url.value,
      fileName: fileName.value,
      pages: pages.value,
      format: format.value,
      dollarRate: parseFloat(dollarRate.value) || 0,
      headless: config.headless !== false,
      timeoutLevel: parseInt(config.timeoutLevel || '2', 10),
    });
  } else {
    console.warn('Electron API not available');
    isRunning.value = false;
  }
}

function openSaveModal() {
  if (!url.value) {
    alert('Ingresá una URL primero.');
    return;
  }
  favName.value = fileName.value || '';
  showModal.value = true;
}

function saveFavorite() {
  if (!favName.value) {
    alert('Por favor ingresá un nombre.');
    return;
  }

  const favorites = JSON.parse(
    localStorage.getItem('sasito_favorites') || '[]'
  );
  favorites.push({
    name: favName.value,
    url: url.value,
    fileName: fileName.value,
  });
  localStorage.setItem('sasito_favorites', JSON.stringify(favorites));

  showModal.value = false;
  alert('¡Favorito guardado!');
}
</script>

<template>
  <div class="tool-card">
    <div class="card-header">
      <h2>Scraper de Precios</h2>
      <p class="subtitle">Configurá tu búsqueda y exportá los datos</p>
    </div>

    <!-- Tabs -->
    <div class="tabs">
      <button
        class="tab-btn"
        :class="{ active: activeTab === 'new' }"
        @click="activeTab = 'new'"
      >
        <Icon name="new" size="16" /> Nuevo Scrapeo
      </button>
      <button
        class="tab-btn"
        :class="{ active: activeTab === 'favorites' }"
        @click="activeTab = 'favorites'"
      >
        <Icon name="favorites" size="16" /> Favoritos
      </button>
    </div>

    <!-- Tab Content: New Scrape -->
    <div v-if="activeTab === 'new'" class="tab-content">
      <div class="form-grid">
        <div class="col-left">
          <div class="field">
            <label>URL de la categoría</label>
            <div class="input-group">
              <input
                v-model="url"
                type="text"
                placeholder="https://store.playstation.com/..."
              />
              <button
                class="btn-icon"
                title="Guardar en Favoritos"
                @click="openSaveModal"
              >
                <Icon name="favorites" size="18" />
              </button>
            </div>
          </div>
          <div class="field">
            <label>Nombre del archivo (sin extensión)</label>
            <input
              v-model="fileName"
              type="text"
              placeholder="Ej: ofertas_ps5"
            />
          </div>
        </div>

        <div class="col-right">
          <div class="field">
            <label>Páginas a escanear</label>
            <input
              v-model.number="pages"
              type="number"
              min="1"
              max="50"
              value="1"
            />
          </div>
          <div class="field">
            <label>Formato de salida</label>
            <select v-model="format">
              <option value="xlsx">Excel (.xlsx)</option>
              <option value="csv">CSV (.csv)</option>
            </select>
          </div>
          <div class="field">
            <label>Cotización Dólar (Tarjeta/Blue)</label>
            <input v-model="dollarRate" type="number" placeholder="Ej: 1135" />
          </div>
        </div>
      </div>

      <div class="actions">
        <button
          class="btn-primary flex-center"
          :disabled="isRunning"
          @click="runScraper"
        >
          <span v-if="!isRunning" class="flex-center">Iniciar Scraper</span>
          <span v-else class="flex-center"
            ><Icon name="loader" size="18" class="spin" /> Trabajando...</span
          >
        </button>
      </div>

      <!-- Logs -->
      <div v-if="logs.length > 0" class="log-container">
        <div class="log-header">Logs</div>
        <div ref="logContentRef" class="log-content">
          <div v-for="(log, index) in logs" :key="index" class="log-line">
            <span class="log-prefix">>></span> {{ log }}
          </div>
        </div>
      </div>
    </div>

    <!-- Tab Content: Favorites -->
    <div v-else class="tab-content">
      <FavoritesView @run-favorite="loadFavoriteIntoForm" />
    </div>

    <!-- Modal -->
    <div class="modal-overlay" :class="{ active: showModal }">
      <div class="modal">
        <h3>Guardar Favorito</h3>
        <div class="field">
          <label>Nombre</label>
          <input
            v-model="favName"
            type="text"
            placeholder="Ej: Ofertas PS5"
            @keyup.enter="saveFavorite"
          />
        </div>
        <div class="modal-actions">
          <button class="btn-secondary" @click="showModal = false">
            Cancelar
          </button>
          <button class="flex-center" @click="saveFavorite">Guardar</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tabs {
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
  border-bottom: 1px solid var(--border);
}

.tab-btn {
  background: none;
  border: none;
  padding: 0.75rem 1rem;
  font-size: 0.95rem;
  color: var(--text-light);
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 8px;
}

.tab-btn:hover {
  color: var(--text-primary);
}

.tab-btn.active {
  color: var(--accent);
  border-bottom-color: var(--accent);
  font-weight: 600;
}

.btn-secondary {
  background: white;
  border: 1px solid var(--border);
  color: var(--text-primary);
  padding: 0.5rem 1rem;
  border-radius: 6px;
  cursor: pointer;
}
.btn-secondary:hover {
  background: #f3f4f6;
}

.flex-center {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.text-center {
  text-align: center;
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* INPUT GROUPS */
.input-group {
  display: flex;
  gap: 8px;
}
.input-group input {
  flex: 1;
}
.input-group .btn-icon {
  border-color: var(--border);
  background: white;
  width: 42px;
  height: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}
.input-group .btn-icon:hover {
  border-color: var(--accent);
  background: var(--accent);
  color: white;
}

/* CONSOLA */
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
  font-family: sans-serif;
}
.log-content {
  height: 150px;
  overflow-y: auto;
  padding: 10px;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 0.8rem;
  color: #10b981;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.log-content::-webkit-scrollbar {
  width: 8px;
}
.log-content::-webkit-scrollbar-track {
  background: #111;
}
.log-content::-webkit-scrollbar-thumb {
  background: #333;
  border-radius: 4px;
}
.log-line {
  word-break: break-all;
  line-height: 1.4;
}
.log-prefix {
  margin-right: 8px;
  color: #34d399; /* Slightly lighter green for the prompt */
  font-weight: bold;
  user-select: none;
}

/* MODAL */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s;
}
.modal-overlay.active {
  opacity: 1;
  pointer-events: auto;
}
.modal {
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  width: 100%;
  max-width: 400px;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  transform: translateY(10px);
  transition: transform 0.2s;
}
.modal-overlay.active .modal {
  transform: translateY(0);
}
.modal h3 {
  margin-bottom: 1rem;
  color: var(--text-primary);
}
.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 1.5rem;
}
</style>
