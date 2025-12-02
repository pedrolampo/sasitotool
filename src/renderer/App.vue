<script setup>
import { ref, computed } from 'vue';
import HomeView from './views/HomeView.vue';
import ScraperView from './views/ScraperView.vue';
import SettingsView from './views/SettingsView.vue';
import FavoritesView from './views/FavoritesView.vue';
import WhatsappView from './views/WhatsappView.vue';
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
  grid-template-columns: 240px 1fr;
  height: 100%;
  transition: grid-template-columns 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.app-container.sidebar-collapsed {
  grid-template-columns: 70px 1fr;
}

.sidebar {
  background: var(--bg-sidebar);
  color: white;
  display: flex;
  flex-direction: column;
  padding: 1rem;
  overflow: hidden;
  white-space: nowrap;
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 2rem;
  height: 32px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
}

.logo {
  width: 28px;
  height: 28px;
  object-fit: contain;
}

.sidebar-header h2 {
  font-size: 1.1rem;
  color: #fff;
  margin: 0;
  font-weight: 600;
}

.sidebar.collapsed .sidebar-header {
  justify-content: center;
}

.btn-toggle {
  background: transparent;
  border: none;
  color: var(--text-light);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
  border-radius: 6px;
  transition: all 0.2s;
}
.btn-toggle:hover {
  background: rgba(255, 255, 255, 0.1);
  color: white;
}

.menu-list {
  list-style: none;
}
.menu-item {
  padding: 0.75rem 1rem;
  margin-bottom: 0.5rem;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  color: #d1d5db;
  font-size: 0.95rem;
  display: flex;
  align-items: center;
  gap: 12px;
  height: 44px;
}
.sidebar.collapsed .menu-item {
  justify-content: center;
  padding: 0.75rem 0;
}

.menu-item:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}
.menu-item.active {
  background: var(--accent);
  color: #fff;
}

.version {
  margin-top: auto;
  font-size: 0.75rem;
  color: #6b7280;
  text-align: center;
  opacity: 1;
  transition: opacity 0.2s;
}

.content-area {
  background: var(--bg-content);
  padding: 2rem;
  overflow-y: auto;
}

/* TRANSITIONS */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.update-bar {
  position: fixed;
  bottom: 20px;
  right: 20px;
  background: #3b82f6;
  color: white;
  padding: 10px 20px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  display: flex;
  align-items: center;
  gap: 10px;
  z-index: 9999;
  font-size: 0.9rem;
  font-weight: 500;
  animation: slideIn 0.3s ease-out;
}

.update-bar.clickable {
  background: #10b981;
  cursor: pointer;
}
.update-bar.clickable:hover {
  background: #059669;
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
