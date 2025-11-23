<script setup>
import { ref, onMounted, watch } from 'vue';
import Icon from '../components/Icon.vue';

const dollarType = ref('blue');
const dollarValue = ref('Cargando...');
const defaultFormat = ref('xlsx');
const headless = ref(true); // Default true (headless mode)
const timeoutLevel = ref(2);
const timeoutDesc = ref('Normal: Esperas estándar (Recomendado).');

onMounted(() => {
  loadSettings();
  if (dollarValue.value === 'Cargando...') {
    fetchDollarRate();
  }
});

watch(timeoutLevel, updateTimeoutDesc);

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
    headless: headless.value, // True = Headless (No Browser)
    timeoutLevel: timeoutLevel.value,
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

      // Headless logic:
      // settings.headless = true (default) -> Toggle Unchecked (Show Browser = Off)
      // settings.headless = false -> Toggle Checked (Show Browser = On)
      // Wait, let's align with the UI toggle.
      // UI Toggle: "Modo Ver Navegador"
      // Checked = Show Browser = headless: false
      // Unchecked = Hide Browser = headless: true

      if (settings.headless !== undefined) {
        headless.value = settings.headless;
      }

      if (settings.timeoutLevel) {
        timeoutLevel.value = settings.timeoutLevel;
        updateTimeoutDesc();
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
      <!-- Dólar Section -->
      <div class="settings-section">
        <h3>Cotización del Dólar</h3>
        <div class="field-row" style="display: flex; gap: 1rem">
          <div class="field" style="flex: 1">
            <label>Tipo de Cambio</label>
            <select v-model="dollarType" @change="fetchDollarRate">
              <option value="oficial">Oficial</option>
              <option value="blue">Blue</option>
              <option value="cripto">Cripto</option>
            </select>
          </div>
          <div class="field" style="flex: 1">
            <label>Valor Actual</label>
            <input
              v-model="dollarValue"
              type="text"
              readonly
              placeholder="Cargando..."
            />
          </div>
          <div class="field" style="flex: 0 0 auto; align-self: flex-end">
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

      <!-- Defaults Section -->
      <div class="settings-section">
        <h3>Preferencias de Exportación</h3>
        <div class="field">
          <label>Formato por defecto</label>
          <select v-model="defaultFormat">
            <option value="xlsx">Excel (.xlsx)</option>
            <option value="csv">CSV (.csv)</option>
          </select>
        </div>
      </div>

      <!-- Scraper Config Section -->
      <div class="settings-section">
        <h3>Opciones del Scraper</h3>

        <div
          class="field-row"
          style="
            display: flex;
            align-items: center;
            justify-content: space-between;
            flex-direction: row;
          "
        >
          <div class="field" style="margin-bottom: 0">
            <label style="margin-bottom: 0"
              >Modo "Ver Navegador" (Headless Off)</label
            >
            <p class="help-text" style="margin-top: 4px">
              Activalo para ver cómo trabaja el bot (útil para debug).
            </p>
          </div>
          <label class="toggle-switch">
            <!-- 
              v-model with true-value/false-value 
              Checked (true) = Show Browser = headless: false
              Unchecked (false) = Hide Browser = headless: true
            -->
            <input
              type="checkbox"
              v-model="headless"
              :true-value="false"
              :false-value="true"
            />
            <span class="slider"></span>
          </label>
        </div>

        <div class="field" style="margin-top: 20px">
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
  padding-bottom: 1.5rem;
  margin-bottom: 1.5rem;
  border-bottom: 1px solid var(--border);
}
.settings-section:last-child {
  border-bottom: none;
  margin-bottom: 0;
  padding-bottom: 0;
}

.settings-section h3 {
  font-size: 1.2rem;
  color: var(--accent);
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 8px;
}

/* TOGGLE SWITCH */
.toggle-switch {
  position: relative;
  display: inline-block;
  width: 50px;
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
  background-color: #ccc;
  transition: 0.4s;
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
  transition: 0.4s;
  border-radius: 50%;
}

input:checked + .slider {
  background-color: var(--accent);
}

input:focus + .slider {
  box-shadow: 0 0 1px var(--accent);
}

input:checked + .slider:before {
  transform: translateX(24px);
}

.slider-labels {
  display: flex;
  justify-content: space-between;
  margin-bottom: 1rem;
}

.help-text {
  font-size: 0.85rem;
  color: var(--text-light);
  margin-top: 0.5rem;
}
</style>
