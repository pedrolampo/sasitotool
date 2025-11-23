<script setup>
import { ref, onMounted } from 'vue';
import Icon from '../components/Icon.vue';

const emit = defineEmits(['run-favorite']);
const favorites = ref([]);

onMounted(() => {
  loadFavorites();
});

function loadFavorites() {
  const saved = localStorage.getItem('sasito_favorites');
  if (saved) {
    try {
      favorites.value = JSON.parse(saved);
    } catch (e) {
      console.error('Error loading favorites', e);
      favorites.value = [];
    }
  }
}

function deleteFavorite(index) {
  if (confirm('¿Seguro que querés borrar este favorito?')) {
    favorites.value.splice(index, 1);
    localStorage.setItem('sasito_favorites', JSON.stringify(favorites.value));
  }
}

function runFavorite(fav) {
  emit('run-favorite', fav);
}
</script>

<template>
  <div class="favorites-grid">
    <div v-if="favorites.length === 0" class="empty-state">
      <div class="empty-icon">
        <Icon name="favorites" size="48" color="#d1d5db" />
      </div>
      <h3>No tenés favoritos guardados</h3>
      <p>Guardá tus búsquedas frecuentes desde la pestaña "Nuevo Scrapeo".</p>
    </div>

    <div v-for="(fav, index) in favorites" :key="index" class="fav-card">
      <div class="fav-header">
        <div class="fav-title-group">
          <span class="fav-icon"><Icon name="favorites" size="18" /></span>
          <h3 :title="fav.name">{{ fav.name }}</h3>
        </div>
        <button
          class="btn-icon-small"
          title="Eliminar"
          @click="deleteFavorite(index)"
        >
          <Icon name="trash" size="16" />
        </button>
      </div>

      <div class="fav-body">
        <div class="fav-info">
          <span class="label">URL:</span>
          <span class="value url" :title="fav.url">{{ fav.url }}</span>
        </div>
        <div class="fav-info">
          <span class="label">Archivo:</span>
          <span class="value file"
            ><Icon name="file" size="12" /> {{ fav.fileName }}</span
          >
        </div>
      </div>

      <div class="fav-actions">
        <button class="btn-run" @click="runFavorite(fav)">
          <Icon name="play" size="16" /> Cargar y Scrapear
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.favorites-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.5rem;
  padding: 0.5rem;
}

.empty-state {
  grid-column: 1 / -1;
  text-align: center;
  padding: 4rem 2rem;
  color: var(--text-light);
  background: #f9fafb;
  border-radius: 12px;
  border: 2px dashed var(--border);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}
.empty-icon {
  opacity: 0.8;
}

.fav-card {
  background: white;
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  transition: all 0.2s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.02);
}
.fav-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 20px -8px rgba(0, 0, 0, 0.1);
  border-color: var(--accent);
}

.fav-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid #f3f4f6;
}
.fav-title-group {
  display: flex;
  align-items: center;
  gap: 8px;
  overflow: hidden;
}
.fav-icon {
  display: flex;
  align-items: center;
  color: var(--accent);
}
.fav-header h3 {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.btn-icon-small {
  background: transparent;
  border: none;
  cursor: pointer;
  color: #9ca3af;
  padding: 4px;
  border-radius: 4px;
  transition: all 0.2s;
  line-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.btn-icon-small:hover {
  color: #ef4444;
  background: #fee2e2;
}

.fav-body {
  flex: 1;
  margin-bottom: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.fav-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.label {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #9ca3af;
  font-weight: 600;
}
.value {
  font-size: 0.9rem;
  color: #4b5563;
}
.value.url {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--accent);
}
.value.file {
  font-family: monospace;
  background: #f3f4f6;
  padding: 2px 6px;
  border-radius: 4px;
  align-self: flex-start;
  display: flex;
  align-items: center;
  gap: 6px;
}

.fav-actions {
  margin-top: auto;
}

.btn-run {
  width: 100%;
  background: var(--bg-content);
  color: var(--text-primary);
  border: 1px solid var(--border);
  padding: 0.6rem;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.2s;
}
.btn-run:hover {
  background: var(--accent);
  color: white;
  border-color: var(--accent);
}
</style>
