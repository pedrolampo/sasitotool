document.addEventListener('DOMContentLoaded', () => {
  const urlInput = document.getElementById('urlInput');
  const pagesInput = document.getElementById('pagesInput');
  const fileTypeSelect = document.getElementById('fileTypeSelect');
  const fileNameInput = document.getElementById('fileNameInput');
  const exchangeRateInput = document.getElementById('exchangeRateInput');
  const runBtn = document.getElementById('runBtn');
  const statusBadge = document.getElementById('statusBadge');
  const logContainer = document.getElementById('logContainer');
  const logContent = document.getElementById('logContent');

  if (!runBtn) return;

  function setStatus(mode, text) {
    statusBadge.className = 'status-badge ' + mode;
    statusBadge.innerHTML = `<span class="status-dot"></span> ${text}`;
  }

  // Escuchar logs
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

    // Reset consola
    logContent.innerHTML = '';
    logContainer.classList.remove('hidden');

    try {
      const result = await window.scraperApi.runScraper(
        url,
        pages,
        fileType,
        fileNameBase,
        exchangeRate
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
});
