<script setup>
import { ref, onMounted, watch } from 'vue';
import Icon from '../components/Icon.vue';

const dollarType = ref('blue');
const dollarValue = ref('Cargando...');
const defaultFormat = ref('xlsx');
const headless = ref(true);
const timeoutLevel = ref(2);
const timeoutDesc = ref('Normal: Esperas estándar (Recomendado).');
const theme = ref('light');

onMounted(() => {
  loadSettings();
  if (dollarValue.value === 'Cargando...') {
    fetchDollarRate();
  }
});

watch(timeoutLevel, updateTimeoutDesc);
watch(theme, (newTheme) => {
  document.documentElement.setAttribute('data-theme', newTheme);
});

function updateTimeoutDesc() {
  const val = parseInt(timeoutLevel.value, 10);
  let text = '';
  switch (val) {
    case 1:
      text = 'Rápido: Menos espera, riesgo de fallar si internet es lento.';
      break;
    case 2:
      text = 'Normal: Esperas estándar (Recomendado).';
      break;
    case 3:
      text = 'Lento: Mayor espera, ideal para conexiones inestables.';
      break;
  }
  timeoutDesc.value = text;
}

async function fetchDollarRate() {
  dollarValue.value = 'Cargando...';
  try {
    const response = await fetch(
      `https://dolarapi.com/v1/dolares/${dollarType.value}`
    );
    if (!response.ok) throw new Error('Error API');
    const data = await response.json();
    dollarValue.value = data.venta;
  } catch (err) {
    console.error(err);
    dollarValue.value = 'Error';
  }
}

function saveSettings() {
  const settings = {
    dollarType: dollarType.value,
    dollarValue: dollarValue.value,
    defaultFormat: defaultFormat.value,
    headless: headless.value,
    timeoutLevel: timeoutLevel.value,
    theme: theme.value,
  };
  console.log('Saving settings:', settings);
  localStorage.setItem('sasito_settings', JSON.stringify(settings));
  alert('Configuración guardada correctamente.');
}

function loadSettings() {
  const saved = localStorage.getItem('sasito_settings');
  if (saved) {
    try {
      const settings = JSON.parse(saved);
      if (settings.dollarType) dollarType.value = settings.dollarType;
      if (settings.dollarValue) dollarValue.value = settings.dollarValue;
      if (settings.defaultFormat) defaultFormat.value = settings.defaultFormat;

      if (settings.headless !== undefined) {
        headless.value = settings.headless;
      }

      if (settings.timeoutLevel) {
        timeoutLevel.value = settings.timeoutLevel;
        updateTimeoutDesc();
      }

      if (settings.theme) {
        theme.value = settings.theme;
        document.documentElement.setAttribute('data-theme', settings.theme);
      }
    } catch (e) {
      console.error('Error loading settings:', e);
    }
  }
}
</script>

<template>
  <div class="tool-card">
    <div class="card-header">
      <h2>Configuración</h2>
      <p class="subtitle">Personalizá tu experiencia</p>
    </div>

    <div class="form-grid" style="display: block">
      <!-- Apariencia -->
      <div class="settings-section">
        <h3>
          <Icon name="settings" size="20" />
          Apariencia
        </h3>
        <div class="field-row flex-between">
          <div class="field no-margin">
            <label class="no-margin">Modo Oscuro</label>
            <p class="help-text">Cambia entre tema claro y oscuro.</p>
          </div>
          <div class="theme-toggle">
            <button
              class="theme-btn"
              :class="{ active: theme === 'light' }"
              @click="theme = 'light'"
            >
              <Icon name="sun" size="18" />
            </button>
            <button
              class="theme-btn"
              :class="{ active: theme === 'dark' }"
              @click="theme = 'dark'"
            >
              <Icon name="moon" size="18" />
            </button>
          </div>
        </div>
      </div>

      <!-- Dólar Section -->
      <div class="settings-section">
        <h3>
          <Icon name="dollar" size="20" />
          Cotización del Dólar
        </h3>
        <div class="field-row grid-2">
          <div class="field">
            <label>Tipo de Cambio</label>
            <select v-model="dollarType" @change="fetchDollarRate">
              <option value="oficial">Oficial</option>
              <option value="blue">Blue</option>
              <option value="cripto">Cripto</option>
            </select>
          </div>
          <div class="field with-action">
            <label>Valor Actual</label>
            <div class="input-group">
              <input
                v-model="dollarValue"
                type="text"
                readonly
                placeholder="Cargando..."
              />
              <button
                class="btn-icon"
                title="Actualizar"
                @click="fetchDollarRate"
              >
                <Icon name="actualizar" size="18" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="settings-section">
        <h3>
          <Icon name="file" size="20" />
          Preferencias de Exportación
        </h3>
        <div class="field">
          <label>Formato por defecto</label>
          <select v-model="defaultFormat">
            <option value="xlsx">Excel (.xlsx)</option>
            <option value="csv">CSV (.csv)</option>
          </select>
        </div>
      </div>

      <div class="settings-section">
        <h3>
          <Icon name="scraper" size="20" />
          Opciones del Scraper
        </h3>

        <div class="field-row flex-between">
          <div class="field no-margin">
            <label class="no-margin">Modo "Ver Navegador"</label>
            <p class="help-text">
              Desactiva el modo Headless para ver el bot trabajar.
            </p>
          </div>
          <label class="toggle-switch">
            <input
              type="checkbox"
              v-model="headless"
              :true-value="false"
              :false-value="true"
            />
            <span class="slider"></span>
          </label>
        </div>

        <div class="field mt-4">
          <label>Velocidad / Timeout</label>
          <div class="slider-container">
            <input
              v-model.number="timeoutLevel"
              type="range"
              min="1"
              max="3"
              step="1"
            />
            <div class="slider-labels">
              <span>Rápido</span>
              <span>Normal</span>
              <span>Lento</span>
            </div>
          </div>
          <p class="help-text">{{ timeoutDesc }}</p>
        </div>
      </div>
    </div>

    <div class="actions">
      <button class="btn-primary" @click="saveSettings">
        Guardar Configuración
      </button>
    </div>
  </div>
</template>

<style scoped>
.settings-section {
  padding-bottom: 2rem;
  margin-bottom: 2rem;
  border-bottom: 1px solid var(--border);
}
.settings-section:last-child {
  border-bottom: none;
  margin-bottom: 0;
  padding-bottom: 0;
}

.settings-section h3 {
  font-size: 1.1rem;
  color: var(--text-primary);
  margin-bottom: 1.25rem;
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 600;
}

.field-row.flex-between {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.field-row.grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
}

.field.no-margin {
  margin-bottom: 0;
}
.field.mt-4 {
  margin-top: 1.5rem;
}

.input-group {
  display: flex;
  gap: 8px;
}

.help-text {
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin-top: 0.25rem;
}

/* THEME TOGGLE */
.theme-toggle {
  background: var(--bg-content);
  padding: 4px;
  border-radius: 8px;
  display: flex;
  border: 1px solid var(--border);
}

.theme-btn {
  background: transparent;
  border: none;
  padding: 6px 10px;
  border-radius: 6px;
  cursor: pointer;
  color: var(--text-light);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.theme-btn.active {
  background: white;
  color: var(--accent);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}
[data-theme='dark'] .theme-btn.active {
  background: var(--bg-card);
}

/* TOGGLE SWITCH */
.toggle-switch {
  position: relative;
  display: inline-block;
  width: 48px;
  height: 26px;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--border);
  transition: 0.3s;
  border-radius: 34px;
}

.slider:before {
  position: absolute;
  content: '';
  height: 20px;
  width: 20px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: 0.3s;
  border-radius: 50%;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

input:checked + .slider {
  background-color: var(--accent);
}

input:checked + .slider:before {
  transform: translateX(22px);
}

/* RANGE SLIDER */
input[type='range'] {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 6px;
  background: var(--border);
  border-radius: 5px;
  outline: none;
  padding: 0;
  border: none;
}

input[type='range']::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--accent);
  cursor: pointer;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.2);
  transition: transform 0.1s;
}

input[type='range']::-webkit-slider-thumb:hover {
  transform: scale(1.1);
}

.slider-labels {
  display: flex;
  justify-content: space-between;
  margin-top: 0.5rem;
  font-size: 0.8rem;
  color: var(--text-light);
  font-weight: 500;
}
</style>
