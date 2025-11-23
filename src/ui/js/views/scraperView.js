export function initScraperView() {
  const urlInput = document.getElementById('urlInput');
  const pagesInput = document.getElementById('pagesInput');
  const fileTypeSelect = document.getElementById('fileTypeSelect');
  const fileNameInput = document.getElementById('fileNameInput');
  const exchangeRateInput = document.getElementById('exchangeRateInput');
  const runBtn = document.getElementById('runBtn');
  const statusBadge = document.getElementById('statusBadge');
  const logContainer = document.getElementById('logContainer');
  const logContent = document.getElementById('logContent');
  const saveFavBtn = document.getElementById('saveFavBtn');

  if (!runBtn) return;

  // Load defaults from settings
  const savedSettings = localStorage.getItem('sasito_settings');
  let config = { headless: true, timeoutLevel: '2' }; // defaults

  if (savedSettings) {
    const settings = JSON.parse(savedSettings);
    if (settings.dollarValue) {
      exchangeRateInput.value = settings.dollarValue;
    }
    if (settings.defaultFormat) {
      fileTypeSelect.value = settings.defaultFormat;
    }

    if (settings.headless !== undefined) {
      config.headless = settings.headless;
    }
    if (settings.timeoutLevel) {
      config.timeoutLevel = settings.timeoutLevel;
    }
  }

  // Check for pending run from Favorites
  const pendingRun = localStorage.getItem('sasito_pending_run');
  if (pendingRun) {
    try {
      const fav = JSON.parse(pendingRun);
      urlInput.value = fav.url || '';
      fileNameInput.value = fav.fileName || '';
      // Clear after loading
      localStorage.removeItem('sasito_pending_run');
    } catch (e) {
      console.error('Error parsing pending run', e);
    }
  }

  // Save Favorite Logic
  const favModal = document.getElementById('favModal');
  const favNameInput = document.getElementById('favNameInput');
  const cancelFavBtn = document.getElementById('cancelFavBtn');
  const confirmFavBtn = document.getElementById('confirmFavBtn');

  if (saveFavBtn) {
    saveFavBtn.addEventListener('click', () => {
      const url = urlInput.value.trim();
      if (!url) {
        alert('Ingresá una URL primero.');
        return;
      }
      // Pre-fill name with filename or empty
      favNameInput.value = fileNameInput.value.trim() || '';
      // Show modal
      favModal.classList.add('active');
      favNameInput.focus();
    });
  }

  if (cancelFavBtn) {
    cancelFavBtn.addEventListener('click', () => {
      favModal.classList.remove('active');
    });
  }

  if (confirmFavBtn) {
    confirmFavBtn.addEventListener('click', () => {
      const name = favNameInput.value.trim();
      if (!name) {
        alert('Por favor ingresá un nombre.');
        return;
      }

      const url = urlInput.value.trim();
      const fileName = fileNameInput.value.trim();

      const favorites = JSON.parse(
        localStorage.getItem('sasito_favorites') || '[]'
      );
      favorites.push({ name, url, fileName });
      localStorage.setItem('sasito_favorites', JSON.stringify(favorites));

      favModal.classList.remove('active');
      alert('¡Favorito guardado!');
    });
  }

  function setStatus(mode, text) {
    statusBadge.className = 'status-badge ' + mode;
    statusBadge.innerHTML = `<span class="status-dot"></span> ${text}`;
  }

  window.scraperApi.onLogUpdate((message) => {
    const line = document.createElement('div');
    line.className = 'log-line';
    const time = new Date().toLocaleTimeString('es-AR');
    line.textContent = `[${time}] ${message}`;
    logContent.appendChild(line);
    logContent.scrollTop = logContent.scrollHeight;
  });

  runBtn.addEventListener('click', async () => {
    const url = urlInput.value.trim();
    const pages = parseInt(pagesInput.value, 10) || 1;
    const fileType = fileTypeSelect.value;
    const fileNameBase = fileNameInput.value.trim();
    const rateStr = exchangeRateInput.value.trim();
    const exchangeRate = rateStr ? parseFloat(rateStr) : null;

    if (!url) {
      setStatus('status-error', 'Falta URL');
      return;
    }

    setStatus('status-working', 'Procesando...');
    runBtn.disabled = true;

    logContent.innerHTML = '';
    logContainer.classList.remove('hidden');

    try {
      const result = await window.scraperApi.runScraper(
        url,
        pages,
        fileType,
        fileNameBase,
        exchangeRate,
        config // Pass config object
      );

      if (result.ok) {
        setStatus('status-ready', `Completado (${result.count})`);

        const line = document.createElement('div');
        line.className = 'log-line';
        line.style.color = '#fff';
        line.textContent = `>>> Archivo guardado en: ${result.filePath}`;
        logContent.appendChild(line);
        logContent.scrollTop = logContent.scrollHeight;
      } else {
        const msg = result.error || 'Error desconocido';
        setStatus('status-error', 'Error');
        alert(`Ocurrió un error:\n\n${msg}`);
      }
    } catch (err) {
      console.error('Error renderer:', err);
      setStatus('status-error', 'Fallo crítico');
      alert(`Error:\n${err.message}`);
    } finally {
      runBtn.disabled = false;
    }
  });
}
