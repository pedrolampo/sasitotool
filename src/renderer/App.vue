<script setup>
import { ref, computed } from 'vue';
import HomeView from './views/HomeView.vue';
import ScraperView from './views/ScraperView.vue';
import SettingsView from './views/SettingsView.vue';
import FavoritesView from './views/FavoritesView.vue';
import Icon from './components/Icon.vue';

const currentView = ref('home');
const version = ref('v1.1.3');
const isCollapsed = ref(
  localStorage.getItem('sasito_sidebar_collapsed') === 'true'
);

const views = {
  home: HomeView,
  scraper: ScraperView,
  settings: SettingsView,
  favorites: FavoritesView,
};

const currentComponent = computed(() => views[currentView.value]);

function navigate(view) {
  currentView.value = view;
}

function toggleSidebar() {
  isCollapsed.value = !isCollapsed.value;
  localStorage.setItem('sasito_sidebar_collapsed', isCollapsed.value);
}

// Listen for navigation events from children (e.g. Favorites -> Scraper)
window.addEventListener('navigate-to', (e) => {
  if (e.detail && e.detail.view) {
    navigate(e.detail.view);
  }
});
</script>

<template>
  <div class="app-container" :class="{ 'sidebar-collapsed': isCollapsed }">
    <aside class="sidebar" :class="{ collapsed: isCollapsed }">
      <div class="sidebar-header">
        <h2 v-show="!isCollapsed">SasitoTool</h2>
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
/* Scoped styles if needed, but we rely on global style.css mostly */
</style>
