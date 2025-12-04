<script setup>
import { ref, computed } from 'vue';
import HomeView from './views/HomeView.vue';
import ScraperView from './views/ScraperView.vue';
import SettingsView from './views/SettingsView.vue';
import FavoritesView from './views/FavoritesView.vue';
import WhatsappView from './views/WhatsappView.vue';
import NotesView from './views/NotesView.vue';
import Icon from './components/Icon.vue';
import logoUrl from './assets/logo.webp';

const currentView = ref('home');
const version = ref(`v${__APP_VERSION__}`);
const isCollapsed = ref(
  localStorage.getItem('sasito_sidebar_collapsed') === 'true'
);

const views = {
  home: HomeView,
  scraper: ScraperView,
  settings: SettingsView,
  favorites: FavoritesView,
  whatsapp: WhatsappView,
  notes: NotesView,
};

const currentComponent = computed(() => views[currentView.value]);

function navigate(view) {
  currentView.value = view;
}

function toggleSidebar() {
  isCollapsed.value = !isCollapsed.value;
  localStorage.setItem('sasito_sidebar_collapsed', isCollapsed.value);
}

window.addEventListener('navigate-to', (e) => {
  if (e.detail && e.detail.view) {
    navigate(e.detail.view);
  }
});

const updateAvailable = ref(false);
const updateDownloaded = ref(false);
const updateError = ref(null);

if (window.electronAPI) {
  window.electronAPI.onUpdateAvailable(() => {
    updateAvailable.value = true;
    updateError.value = null;
  });
  window.electronAPI.onUpdateDownloaded(() => {
    updateAvailable.value = false;
    updateDownloaded.value = true;
  });
  window.electronAPI.onUpdateError((message) => {
    updateAvailable.value = false;
    updateError.value = `Error: ${message}`;
  });
}

function restartApp() {
  window.electronAPI.restartApp();
}

// Initialize Theme
const savedSettings = localStorage.getItem('sasito_settings');
if (savedSettings) {
  try {
    const settings = JSON.parse(savedSettings);
    if (settings.theme) {
      document.documentElement.setAttribute('data-theme', settings.theme);
    }
  } catch (e) {
    console.error('Error loading theme:', e);
  }
}
</script>

<template>
  <div class="app-container" :class="{ 'sidebar-collapsed': isCollapsed }">
    <div v-if="updateAvailable" class="update-bar">
      <Icon name="loader" size="16" class="spin" />
      <span>Descargando nueva versión...</span>
    </div>
    <div
      v-if="updateDownloaded"
      class="update-bar clickable"
      @click="restartApp"
    >
      <Icon name="check" size="16" />
      <span>¡Actualización lista! Click para reiniciar</span>
    </div>
    <div v-if="updateError" class="update-bar error">
      <Icon name="x" size="16" />
      <span>{{ updateError }}</span>
    </div>

    <aside class="sidebar" :class="{ collapsed: isCollapsed }">
      <div class="sidebar-header">
        <div class="brand" v-show="!isCollapsed">
          <img :src="logoUrl" alt="Logo" class="logo" />
          <h2>SasitoTool</h2>
        </div>
        <button
          class="btn-toggle"
          @click="toggleSidebar"
          :title="isCollapsed ? 'Expandir' : 'Contraer'"
        >
          <Icon :name="isCollapsed ? 'hamburger' : 'arrowLeft'" size="20" />
        </button>
      </div>
      <ul class="menu-list">
        <li
          class="menu-item"
          :class="{ active: currentView === 'home' }"
          @click="navigate('home')"
          :title="isCollapsed ? 'Inicio' : ''"
        >
          <Icon name="home" size="20" />
          <span v-show="!isCollapsed">Inicio</span>
        </li>
        <li
          class="menu-item"
          :class="{ active: currentView === 'scraper' }"
          @click="navigate('scraper')"
          :title="isCollapsed ? 'Scraper' : ''"
        >
          <Icon name="scraper" size="20" />
          <span v-show="!isCollapsed">Scraper</span>
        </li>

        <li
          class="menu-item"
          :class="{ active: currentView === 'whatsapp' }"
          @click="navigate('whatsapp')"
          :title="isCollapsed ? 'WhatsApp' : ''"
        >
          <Icon name="whatsapp" size="20" />
          <span v-show="!isCollapsed">WhatsApp</span>
        </li>

        <li
          class="menu-item"
          :class="{ active: currentView === 'notes' }"
          @click="navigate('notes')"
          :title="isCollapsed ? 'Notas' : ''"
        >
          <Icon name="file-text" size="20" />
          <span v-show="!isCollapsed">Notas</span>
        </li>

        <li
          class="menu-item"
          :class="{ active: currentView === 'settings' }"
          @click="navigate('settings')"
          :title="isCollapsed ? 'Configuración' : ''"
        >
          <Icon name="settings" size="20" />
          <span v-show="!isCollapsed">Configuración</span>
        </li>
      </ul>
      <div class="version" v-show="!isCollapsed">{{ version }}</div>
    </aside>

    <main class="content-area">
      <Transition name="fade" mode="out-in">
        <component :is="currentComponent" />
      </Transition>
    </main>
  </div>
</template>

<style scoped>
.app-container {
  display: grid;
  grid-template-columns: 260px 1fr;
  height: 100%;
  transition: grid-template-columns 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  background: var(--bg-content);
}

.app-container.sidebar-collapsed {
  grid-template-columns: 80px 1fr;
}

.sidebar {
  background: var(--bg-sidebar);
  color: white;
  display: flex;
  flex-direction: column;
  padding: 1.5rem 1rem;
  overflow: hidden;
  white-space: nowrap;
  border-right: 1px solid var(--border);
  box-shadow: 4px 0 24px rgba(0, 0, 0, 0.05);
  z-index: 10;
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 3rem;
  height: 40px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo {
  width: 32px;
  height: 32px;
  object-fit: contain;
  filter: drop-shadow(0 0 8px rgba(255, 255, 255, 0.2));
}

.sidebar-header h2 {
  font-size: 1.25rem;
  color: #fff;
  margin: 0;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.sidebar.collapsed .sidebar-header {
  justify-content: center;
}

.btn-toggle {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: var(--text-light);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 6px;
  border-radius: 8px;
  transition: all 0.2s;
}
.btn-toggle:hover {
  background: rgba(255, 255, 255, 0.1);
  color: white;
  border-color: rgba(255, 255, 255, 0.2);
}

.menu-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.menu-item {
  padding: 0.85rem 1rem;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
  color: #94a3b8;
  font-size: 0.95rem;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 14px;
  height: 48px;
}
.sidebar.collapsed .menu-item {
  justify-content: center;
  padding: 0.85rem 0;
}

.menu-item:hover {
  background: rgba(255, 255, 255, 0.05);
  color: #fff;
  transform: translateX(4px);
}
.sidebar.collapsed .menu-item:hover {
  transform: none;
}

.menu-item.active {
  background: var(--accent);
  color: #fff;
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
}
.menu-item.active:hover {
  transform: none;
}

.version {
  margin-top: auto;
  font-size: 0.75rem;
  color: #475569;
  text-align: center;
  opacity: 1;
  transition: opacity 0.2s;
  padding-top: 1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
}

.content-area {
  background: var(--bg-content);
  padding: 2.5rem;
  overflow-y: auto;
}

/* TRANSITIONS */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

.update-bar {
  position: fixed;
  bottom: 24px;
  right: 24px;
  background: #3b82f6;
  color: white;
  padding: 12px 24px;
  border-radius: 12px;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  gap: 12px;
  z-index: 9999;
  font-size: 0.95rem;
  font-weight: 600;
  animation: slideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.update-bar.clickable {
  background: #10b981;
  cursor: pointer;
}
.update-bar.clickable:hover {
  background: #059669;
  transform: translateY(-2px);
}

.update-bar.error {
  background: #ef4444;
}

@keyframes slideIn {
  from {
    transform: translateY(100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}
</style>
