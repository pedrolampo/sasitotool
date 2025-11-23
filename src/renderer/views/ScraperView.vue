<script setup>
import { ref, onMounted } from 'vue';
import FavoritesView from './FavoritesView.vue';
import Icon from '../components/Icon.vue';

const activeTab = ref('new'); // 'new' | 'favorites'

const url = ref('');
const fileName = ref('');
const pages = ref(1);
const format = ref('xlsx');
const dollarRate = ref('1135'); // Default value
const isRunning = ref(false);
const logs = ref([]);
const showModal = ref(false);
const favName = ref('');

// Refs for DOM elements if needed, but v-model handles most
const logContentRef = ref(null);

onMounted(() => {
  // Load settings
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

  // Check for pending run
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

  // Listen for logs from main process
  if (window.electronAPI) {
    window.electronAPI.onLog((data) => {
      logs.value.push(data);
      // Auto-scroll
      if (logContentRef.value) {
        setTimeout(() => {
          logContentRef.value.scrollTop = logContentRef.value.scrollHeight;
        }, 10);
      }
    });

    window.electronAPI.onScrapeComplete((result) => {
      isRunning.value = false;
      if (result.success) {
        alert(`¡Listo! Archivo guardado en: ${result.path}`);
      } else {
        alert(`Error: ${result.error}`);
      }
    });
  }
});

function loadFavoriteIntoForm(fav) {
  url.value = fav.url || '';
  fileName.value = fav.fileName || '';
  activeTab.value = 'new'; // Switch to form tab
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
  logs.value = []; // Clear logs

  // Load current settings for run config
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
      headless: config.headless !== false, // Default true
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

  // Force update of favorites view if needed (via event or key)
  // For now, FavoritesView reads from localStorage on mount/update
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
        <button class="btn-primary" :disabled="isRunning" @click="runScraper">
          <span v-if="!isRunning" class="flex-center"
            ><Icon name="rocket" size="18" /> Iniciar Scraper</span
          >
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
            {{ log }}
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
          <button class="btn-primary" @click="saveFavorite">Guardar</button>
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
  gap: 8px;
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
</style>
