export function initSettingsView() {
  console.log('Initializing Settings View');
  const dollarTypeSelect = document.getElementById('dollarTypeSelect');
  const dollarValueInput = document.getElementById('dollarValueInput');
  const refreshDollarBtn = document.getElementById('refreshDollarBtn');
  const defaultFormatSelect = document.getElementById('defaultFormatSelect');
  const headlessToggle = document.getElementById('headlessToggle');
  const timeoutSlider = document.getElementById('timeoutSlider');
  const timeoutDesc = document.getElementById('timeoutDesc');
  const saveSettingsBtn = document.getElementById('saveSettingsBtn');

  if (!saveSettingsBtn) {
    console.error('Save button not found!');
    return;
  }

  // Load saved settings
  loadSettings();

  // Event Listeners
  refreshDollarBtn.addEventListener('click', fetchDollarRate);

  dollarTypeSelect.addEventListener('change', () => {
    fetchDollarRate();
  });

  timeoutSlider.addEventListener('input', updateTimeoutDesc);

  saveSettingsBtn.addEventListener('click', () => {
    console.log('Save button clicked');
    saveSettings();
    alert('Configuración guardada correctamente.');
  });

  // Initial fetch if value is empty
  if (!dollarValueInput.value) {
    fetchDollarRate();
  }

  function updateTimeoutDesc() {
    const val = parseInt(timeoutSlider.value, 10);
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
    timeoutDesc.textContent = text;
  }

  async function fetchDollarRate() {
    const type = dollarTypeSelect.value; // oficial, blue, cripto
    dollarValueInput.value = 'Cargando...';

    try {
      const response = await fetch(`https://dolarapi.com/v1/dolares/${type}`);
      if (!response.ok) throw new Error('Error API');

      const data = await response.json();
      dollarValueInput.value = `$${data.venta}`;
    } catch (err) {
      console.error(err);
      dollarValueInput.value = 'Error';
    }
  }

  function saveSettings() {
    try {
      const settings = {
        dollarType: dollarTypeSelect.value,
        dollarValue: dollarValueInput.value,
        defaultFormat: defaultFormatSelect.value,
        // UI: "Show Browser" (Headless Off) -> Checked means headless = false
        headless: !headlessToggle.checked,
        timeoutLevel: timeoutSlider.value,
      };
      console.log('Saving settings to localStorage:', settings);
      localStorage.setItem('sasito_settings', JSON.stringify(settings));

      // Verify save
      const verify = localStorage.getItem('sasito_settings');
      console.log('Verified localStorage content:', verify);
    } catch (e) {
      console.error('Error saving settings:', e);
      alert('Error al guardar configuración: ' + e.message);
    }
  }

  function loadSettings() {
    const saved = localStorage.getItem('sasito_settings');
    console.log('Loading settings from localStorage:', saved);

    if (saved) {
      try {
        const settings = JSON.parse(saved);

        if (settings.dollarType) dollarTypeSelect.value = settings.dollarType;
        if (settings.dollarValue) dollarValueInput.value = settings.dollarValue;
        if (settings.defaultFormat)
          defaultFormatSelect.value = settings.defaultFormat;

        // Headless logic:
        // settings.headless = true (default) -> Toggle Unchecked
        // settings.headless = false (show browser) -> Toggle Checked
        const isHeadless = settings.headless !== false; // Default to true if undefined
        headlessToggle.checked = !isHeadless;

        if (settings.timeoutLevel) {
          timeoutSlider.value = settings.timeoutLevel;
          updateTimeoutDesc();
        }
      } catch (e) {
        console.error('Error parsing settings:', e);
      }
    }
  }
}
