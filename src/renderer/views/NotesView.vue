<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import {
  subscribeToNotes,
  updateNote,
  deleteNote,
} from '../../services/firebaseService';
import Icon from '../components/Icon.vue';

const notes = ref([]);
const loading = ref(true);
const selectedNotes = ref(new Set());
const editingNoteId = ref(null);
const editContent = ref('');
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

function toggleSelectAll() {
  if (selectedNotes.value.size === notes.value.length) {
    selectedNotes.value.clear();
  } else {
    selectedNotes.value = new Set(notes.value.map((n) => n.id));
  }
}

function toggleSelection(id) {
  if (selectedNotes.value.has(id)) {
    selectedNotes.value.delete(id);
  } else {
    selectedNotes.value.add(id);
  }
}

function startEditing(note) {
  editingNoteId.value = note.id;
  editContent.value = note.content;
}

async function saveEdit() {
  if (!editingNoteId.value) return;
  try {
    await updateNote(editingNoteId.value, editContent.value);
    editingNoteId.value = null;
    editContent.value = '';
  } catch (e) {
    console.error('Error updating note:', e);
    alert('Error al actualizar la nota');
  }
}

function cancelEdit() {
  editingNoteId.value = null;
  editContent.value = '';
}

async function deleteNoteHandler(id) {
  if (!confirm('¿Estás seguro de que quieres eliminar esta nota?')) return;
  try {
    await deleteNote(id);
    selectedNotes.value.delete(id);
  } catch (e) {
    console.error('Error deleting note:', e);
    alert('Error al eliminar la nota');
  }
}

async function exportNotes() {
  const notesToExport = notes.value.filter((n) =>
    selectedNotes.value.has(n.id)
  );

  if (notesToExport.length === 0) {
    alert('Por favor selecciona al menos una nota para exportar.');
    return;
  }

  try {
    // Clone notes to avoid proxy issues
    const notesData = JSON.parse(JSON.stringify(notesToExport));
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

    <div class="toolbar" v-if="notes.length > 0">
      <div class="select-all-container" @click="toggleSelectAll">
        <div
          class="custom-checkbox"
          :class="{ checked: selectedNotes.size === notes.length }"
        >
          <Icon
            name="check"
            size="12"
            color="white"
            v-if="selectedNotes.size === notes.length"
          />
        </div>
        <span class="select-label">Seleccionar todas</span>
      </div>
      <div class="selection-info" v-if="selectedNotes.size > 0">
        {{ selectedNotes.size }} seleccionada{{
          selectedNotes.size !== 1 ? 's' : ''
        }}
      </div>
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
      <div
        v-for="note in notes"
        :key="note.id"
        class="note-card"
        :class="{ selected: selectedNotes.has(note.id) }"
      >
        <div class="note-header">
          <div class="note-header-left">
            <div
              class="custom-checkbox note-checkbox"
              :class="{ checked: selectedNotes.has(note.id) }"
              @click="toggleSelection(note.id)"
            >
              <Icon
                name="check"
                size="12"
                color="white"
                v-if="selectedNotes.has(note.id)"
              />
            </div>
            <span class="note-type" :class="note.type">
              {{ note.type === 'audio_transcript' ? 'Audio' : 'Texto' }}
            </span>
          </div>
          <div class="note-actions">
            <span class="note-date">{{ formatDate(note.createdAt) }}</span>
            <button class="icon-btn" @click="startEditing(note)" title="Editar">
              <Icon name="edit" size="14" />
            </button>
            <button
              class="icon-btn delete"
              @click="deleteNoteHandler(note.id)"
              title="Eliminar"
            >
              <Icon name="trash" size="14" />
            </button>
          </div>
        </div>

        <div v-if="editingNoteId === note.id" class="edit-mode">
          <textarea v-model="editContent" rows="3"></textarea>
          <div class="edit-actions">
            <button class="btn-small cancel" @click="cancelEdit">
              Cancelar
            </button>
            <button class="btn-small save" @click="saveEdit">Guardar</button>
          </div>
        </div>
        <div v-else class="note-content">
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
  border-radius: 5px;
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  background-color: var(--bg-secondary);
  border-bottom: 1px solid var(--border);
  margin-bottom: 1rem;
}

.select-all-container {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  user-select: none;
}

.custom-checkbox {
  width: 18px;
  height: 18px;
  border: 2px solid var(--text-secondary);
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  background: white;
}

.custom-checkbox.checked {
  background: #3b82f6; /* Hardcoded primary color to ensure visibility */
  border-color: #3b82f6;
}

.select-label {
  font-size: 0.9rem;
  color: var(--text-secondary);
  font-weight: 500;
}

.selection-info {
  font-size: 0.85rem;
  color: var(--primary);
  font-weight: 600;
}

.note-header-left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.note-checkbox {
  cursor: pointer;
}

.note-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.icon-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.icon-btn:hover {
  background: rgba(0, 0, 0, 0.05);
  color: var(--text-primary);
}

.icon-btn.delete:hover {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

.edit-mode {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.edit-mode textarea {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid var(--border);
  border-radius: 4px;
  resize: vertical;
  font-family: inherit;
}

.edit-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

.btn-small {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.8rem;
  cursor: pointer;
  border: 1px solid transparent;
}

.btn-small.save {
  border-color: var(--primary);
  background: var(--primary);
  color: var(--text-primary);
}

.btn-small.cancel {
  background: transparent;
  border-color: var(--border);
  color: var(--text-secondary);
}

.note-card.selected {
  border-color: var(--primary);
  background-color: rgba(59, 130, 246, 0.02);
}
</style>
