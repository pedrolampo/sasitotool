const urlInput = document.getElementById('urlInput');
const pagesInput = document.getElementById('pagesInput');
const fileTypeSelect = document.getElementById('fileTypeSelect');
const fileNameInput = document.getElementById('fileNameInput');
const exchangeRateInput = document.getElementById('exchangeRateInput'); // NUEVO
const runBtn = document.getElementById('runBtn');
const statusBadge = document.getElementById('statusBadge');

function setStatus(mode, text) {
  statusBadge.className = 'status-badge ' + mode;
  statusBadge.innerHTML = `<span class="status-dot"></span> ${text}`;
}

setStatus('status-ready', 'Ready');

runBtn.addEventListener('click', async () => {
  const url = urlInput.value.trim();
  const pages = parseInt(pagesInput.value, 10) || 1;
  const fileType = fileTypeSelect.value;
  const fileNameBase = fileNameInput.value.trim();

  // valor dólar: opcional
  const rateStr = exchangeRateInput.value.trim();
  const exchangeRate = rateStr ? parseFloat(rateStr) : null;

  if (!url) {
    setStatus('status-error', 'Falta URL');
    console.error('No se ingresó URL');
    return;
  }

  setStatus('status-working', 'Working…');
  runBtn.disabled = true;

  try {
    const result = await window.scraperApi.runScraper(
      url,
      pages,
      fileType,
      fileNameBase,
      exchangeRate // NUEVO
    );

    console.log('Resultado de runScraper:', result);

    if (result.ok) {
      setStatus('status-ready', `Done (${result.count})`);
    } else {
      const msg = result.error || 'Error desconocido';
      setStatus('status-error', 'Error');
      console.error('Error desde main:', msg);
      alert(`Ocurrió un error:\n\n${msg}`);
    }
  } catch (err) {
    console.error('Excepción en renderer:', err);
    setStatus('status-error', 'Error');
    alert(`Excepción en renderer:\n\n${err.message || err}`);
  } finally {
    runBtn.disabled = false;
  }
});
