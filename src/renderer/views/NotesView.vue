<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { subscribeToNotes } from '../../services/firebaseService';
import Icon from '../components/Icon.vue';

const notes = ref([]);
const loading = ref(true);
let unsubscribe = null;

onMounted(() => {
  unsubscribe = subscribeToNotes((data) => {
    notes.value = data;
    loading.value = false;
  });
});

onUnmounted(() => {
  if (unsubscribe) {
    unsubscribe();
  }
});

function formatDate(date) {
  if (!date) return '';
  return new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
}

async function exportNotes() {
  if (notes.value.length === 0) return;

  try {
    // Clone notes to avoid proxy issues
    const notesData = JSON.parse(JSON.stringify(notes.value));
    const res = await window.electronAPI.exportNotes(notesData);

    if (res.success) {
      alert(`Notas exportadas correctamente en:\n${res.path}`);
    } else {
      if (res.error !== 'Guardado cancelado') {
        alert(`Error: ${res.error}`);
      }
    }
  } catch (err) {
    console.error('Error exporting notes:', err);
    alert('Error al exportar las notas.');
  }
}
</script>

<template>
  <div class="tool-card">
    <div class="card-header">
      <h2>Notas y Mensajes</h2>
      <button
        class="btn-primary export-btn"
        @click="exportNotes"
        :disabled="loading || notes.length === 0"
      >
        <Icon name="file" size="16" />
        Exportar a Excel
      </button>
    </div>

    <div v-if="loading" class="loading-state">
      <Icon name="loader" size="32" class="spin" />
      <p>Cargando notas...</p>
    </div>

    <div v-else-if="notes.length === 0" class="empty-state">
      <Icon name="file-text" size="48" color="#4b5563" />
      <p>No hay notas guardadas aún.</p>
    </div>

    <div v-else class="notes-grid">
      <div v-for="note in notes" :key="note.id" class="note-card">
        <div class="note-header">
          <span class="note-type" :class="note.type">
            {{ note.type === 'audio_transcript' ? 'Audio' : 'Texto' }}
          </span>
          <span class="note-date">{{ formatDate(note.createdAt) }}</span>
        </div>
        <div class="note-content">
          {{ note.content }}
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.loading-state,
.empty-state {
  padding: 4rem 0;
}

.loading-state,
.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  gap: 1rem;
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

.notes-grid {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  overflow-y: auto;
  padding-bottom: 2rem;
}

.note-card {
  background: var(--bg-card);
  border-radius: 8px;
  padding: 1rem;
  border: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  transition: background-color 0.2s;
}

.note-card:hover {
  background-color: #f9fafb;
}

.note-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.85rem;
}

.note-type {
  padding: 4px 8px;
  border-radius: 4px;
  font-weight: 500;
  text-transform: uppercase;
  font-size: 0.7rem;
}

.note-type.text {
  background: rgba(59, 130, 246, 0.1);
  color: #60a5fa;
}

.note-type.audio_transcript {
  background: rgba(16, 185, 129, 0.1);
  color: #34d399;
}

.note-date {
  color: var(--text-secondary);
}

.note-content {
  color: var(--text-primary);
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
}

.export-btn {
  width: auto;
  padding: 0.5rem 1rem;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  gap: 8px;
}
</style>
