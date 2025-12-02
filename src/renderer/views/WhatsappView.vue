<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import QRCode from 'qrcode';
import Icon from '../components/Icon.vue';

const status = ref('disconnected');
const qrCodeUrl = ref('');
const contacts = ref([]);
const error = ref(null);
const log = ref([]);

function addLog(msg) {
  log.value.push(`${new Date().toLocaleTimeString()} - ${msg}`);
  if (log.value.length > 50) log.value.shift();
}

async function connect() {
  status.value = 'initializing';
  error.value = null;
  addLog('Iniciando WhatsApp...');

  try {
    const res = await window.electronAPI.whatsappInit();
    if (!res.success) {
      throw new Error(res.error);
    }
  } catch (err) {
    error.value = err.message;
    status.value = 'disconnected';
    addLog(`Error: ${err.message}`);
  }
}

async function scanContacts() {
  if (status.value !== 'ready' && status.value !== 'scanned') return;

  status.value = 'scanning';
  addLog('Escaneando chats...');

  try {
    const res = await window.electronAPI.whatsappScan();
    if (res.success) {
      contacts.value = res.contacts;
      status.value = 'scanned';
      addLog(
        `Escaneo completado. ${res.contacts.length} contactos encontrados.`
      );
    } else {
      throw new Error(res.error);
    }
  } catch (err) {
    error.value = err.message;
    status.value = 'ready';
    addLog(`Error al escanear: ${err.message}`);
  }
}

async function saveVcf() {
  if (contacts.value.length === 0) return;

  try {
    const res = await window.electronAPI.whatsappSaveVcf(
      JSON.parse(JSON.stringify(contacts.value))
    );
    if (res.success) {
      addLog(`Archivo guardado en: ${res.path}`);
      alert(`Contactos guardados exitosamente en:\n${res.path}`);
    } else {
      if (res.error !== 'Guardado cancelado') {
        throw new Error(res.error);
      }
    }
  } catch (err) {
    error.value = err.message;
    addLog(`Error al guardar: ${err.message}`);
  }
}

async function logout() {
  if (!confirm('¿Estás seguro de que quieres cerrar la sesión de WhatsApp?'))
    return;

  try {
    const res = await window.electronAPI.whatsappLogout();
    if (res.success) {
      status.value = 'disconnected';
      contacts.value = [];
      addLog('Sesión cerrada correctamente.');
    } else {
      throw new Error(res.error);
    }
  } catch (err) {
    error.value = err.message;
    addLog(`Error al cerrar sesión: ${err.message}`);
  }
}

let cleanupQr, cleanupReady, cleanupAuth, cleanupAuthFail, cleanupDisc;

onMounted(() => {
  cleanupQr = window.electronAPI.onWhatsappQr(async (qr) => {
    status.value = 'qr';
    try {
      qrCodeUrl.value = await QRCode.toDataURL(qr, {
        errorCorrectionLevel: 'M',
      });
      addLog('Código QR recibido. Escanéalo con tu celular.');
    } catch (err) {
      console.error('Error generating QR:', err);
      addLog('Error generando el código QR.');
    }
  });

  cleanupReady = window.electronAPI.onWhatsappReady(() => {
    status.value = 'ready';
    qrCodeUrl.value = '';
    addLog('WhatsApp conectado y listo.');
  });

  cleanupAuth = window.electronAPI.onWhatsappAuthenticated(() => {
    addLog('Autenticado correctamente.');
  });

  cleanupAuthFail = window.electronAPI.onWhatsappAuthFailure((msg) => {
    error.value = `Fallo de autenticación: ${msg}`;
    status.value = 'disconnected';
    addLog(`Fallo de autenticación: ${msg}`);
  });

  cleanupDisc = window.electronAPI.onWhatsappDisconnected((reason) => {
    status.value = 'disconnected';
    qrCodeUrl.value = '';
    addLog(`Desconectado: ${reason}`);
  });
});

onUnmounted(() => {
  if (cleanupQr) cleanupQr();
  if (cleanupReady) cleanupReady();
  if (cleanupAuth) cleanupAuth();
  if (cleanupAuthFail) cleanupAuthFail();
  if (cleanupDisc) cleanupDisc();
});
</script>

<template>
  <div class="tool-card">
    <div class="card-header">
      <h2>WhatsApp Contact Saver</h2>
      <p class="subtitle">
        Escanea tus chats y guarda los números no agendados.
      </p>
    </div>

    <div class="main-content">
      <div class="panel controls">
        <div class="status-card" :class="status">
          <div class="status-indicator">
            <span class="dot"></span>
            <span class="text">Estado: {{ status.toUpperCase() }}</span>
          </div>

          <div v-if="status === 'disconnected'" class="action-area">
            <button @click="connect" class="btn-primary">
              <Icon name="whatsapp" size="20" />
              Conectar WhatsApp
            </button>
          </div>

          <div v-if="status === 'initializing'" class="action-area">
            <Icon name="loader" class="spin" size="24" />
            <p>Iniciando servicio...</p>
          </div>

          <div v-if="status === 'qr'" class="qr-area">
            <p>Escanea este código con WhatsApp:</p>
            <div class="qr-wrapper">
              <img :src="qrCodeUrl" alt="QR Code" v-if="qrCodeUrl" />
            </div>
          </div>

          <div
            v-if="
              status === 'ready' ||
              status === 'scanned' ||
              status === 'scanning'
            "
            class="action-area"
          >
            <p class="success-msg" style="margin-bottom: 1rem">¡Conectado!</p>
            <button
              @click="scanContacts"
              class="btn-primary"
              :disabled="status === 'scanning'"
            >
              <Icon name="scraper" size="20" v-if="status !== 'scanning'" />
              <Icon name="loader" class="spin" size="20" v-else />
              {{
                status === 'scanning' ? 'Escaneando...' : 'Escanear Contactos'
              }}
            </button>

            <button
              @click="logout"
              class="btn-secondary logout-btn"
              :disabled="status === 'scanning'"
            >
              <Icon name="x" size="18" />
              Cerrar Sesión
            </button>
          </div>
        </div>

        <div class="log-card">
          <h3>Registro de Actividad</h3>
          <div class="log-window">
            <div v-for="(line, i) in log" :key="i" class="log-line">
              {{ line }}
            </div>
          </div>
        </div>
      </div>

      <div class="panel results">
        <div class="results-header">
          <h3>Contactos Encontrados ({{ contacts.length }})</h3>
          <button
            v-if="contacts.length > 0"
            @click="saveVcf"
            class="btn-primary export"
          >
            <Icon name="file" size="18" />
            Guardar VCF
          </button>
        </div>

        <div class="contacts-list" v-if="contacts.length > 0">
          <div v-for="(contact, i) in contacts" :key="i" class="contact-item">
            <div class="avatar-placeholder">
              <Icon
                name="user"
                size="20"
                v-if="
                  contact.name.startsWith('+') || !/[a-zA-Z]/.test(contact.name)
                "
              />
              <span v-else>{{ contact.name.charAt(0).toUpperCase() }}</span>
            </div>
            <div class="contact-info">
              <div class="contact-name">{{ contact.name }}</div>
              <div class="contact-number">{{ contact.formattedNumber }}</div>
            </div>
          </div>
        </div>

        <div v-else class="empty-state">
          <p v-if="status === 'scanned'">No se encontraron contactos nuevos.</p>
          <p v-else>Los contactos aparecerán aquí después de escanear.</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.main-content {
  display: grid;
  grid-template-columns: 350px 1fr;
  gap: 1.5rem;
  flex: 1;
  min-height: 0;
}

.panel {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.panel.controls {
  padding-right: 1.5rem;
  border-right: 1px solid var(--border);
}

.status-card {
  background: rgba(255, 255, 255, 0.03);
  border-radius: 8px;
  padding: 1rem;
  text-align: center;
}

.status-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-bottom: 1rem;
  font-weight: 600;
  font-size: 0.9rem;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #6b7280;
}

.status-card.ready .dot,
.status-card.scanned .dot,
.status-card.scanning .dot {
  background: #10b981;
  box-shadow: 0 0 8px #10b981;
}

.status-card.qr .dot {
  background: #f59e0b;
}

.btn-primary {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 0.5rem;
}
.btn-primary.export {
  width: fit-content;
}

.qr-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.qr-wrapper {
  background: white;
  padding: 10px;
  border-radius: 8px;
}

.qr-wrapper img {
  width: 200px;
  height: 200px;
  display: block;
}

.log-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 200px;
}

.log-card h3 {
  margin-bottom: 0.75rem;
}

.log-window {
  flex: 1;
  background: #000;
  border: 1px solid #ccc;
  border-radius: 6px;
  padding: 0.5rem;
  font-family: monospace;
  font-size: 0.8rem;
  overflow-y: auto;
  color: #fff;
  max-height: 300px;
}

.results-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.contacts-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-right: 5px;
}

.contact-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 10px;
  transition: background 0.2s, transform 0.1s;
  border: 1px solid transparent;
}

.contact-item:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.1);
  transform: translateY(-1px);
}

.avatar-placeholder {
  width: 42px;
  height: 42px;
  background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 1.1rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.contact-name {
  font-weight: 600;
  font-size: 0.95rem;
  color: var(--text-primary);
}

.contact-number {
  font-size: 0.85rem;
  color: var(--text-light);
  margin-top: 2px;
}

.empty-state {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px 16px;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.9rem;
  transition: all 0.2s;
}

.btn-secondary {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
}
.btn-secondary:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.2);
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

.logout-btn {
  background: transparent;
  color: #ef4444;
  border: 1px solid rgba(239, 68, 68, 0.2);
  margin-top: 1rem;
  width: 100%;
  justify-content: center;
  border-radius: 0.5rem;
  padding: 10px;
}

.logout-btn:hover {
  background: rgba(239, 68, 68, 0.05);
  border-color: #ef4444;
  filter: none;
}
</style>
