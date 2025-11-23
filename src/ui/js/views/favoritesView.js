export function initFavoritesView() {
  const grid = document.getElementById('favoritesGrid');

  renderFavorites();

  function renderFavorites() {
    const favorites = JSON.parse(
      localStorage.getItem('sasito_favorites') || '[]'
    );

    if (favorites.length === 0) {
      grid.innerHTML = `
        <div class="empty-state">
          <p>No tenés favoritos guardados aún.</p>
          <small>Guardá una búsqueda desde la sección Scraper.</small>
        </div>
      `;
      return;
    }

    grid.innerHTML = '';

    favorites.forEach((fav, index) => {
      const card = document.createElement('div');
      card.className = 'fav-card';

      card.innerHTML = `
        <div class="fav-header">
          <h3>${fav.name}</h3>
          <button class="btn-icon-small delete-btn" data-index="${index}" title="Eliminar">🗑️</button>
        </div>
        <div class="fav-body">
          <p class="fav-url" title="${fav.url}">${fav.url}</p>
          <span class="fav-file">${fav.fileName}</span>
        </div>
        <div class="fav-actions">
          <button class="btn-primary run-fav-btn" data-index="${index}">Lanzar Scraper</button>
        </div>
      `;

      grid.appendChild(card);
    });

    // Attach listeners
    document.querySelectorAll('.delete-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.currentTarget.dataset.index, 10);
        deleteFavorite(idx);
      });
    });

    document.querySelectorAll('.run-fav-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.currentTarget.dataset.index, 10);
        runFavorite(idx);
      });
    });
  }

  function deleteFavorite(index) {
    if (!confirm('¿Borrar este favorito?')) return;

    const favorites = JSON.parse(
      localStorage.getItem('sasito_favorites') || '[]'
    );
    favorites.splice(index, 1);
    localStorage.setItem('sasito_favorites', JSON.stringify(favorites));
    renderFavorites();
  }

  function runFavorite(index) {
    const favorites = JSON.parse(
      localStorage.getItem('sasito_favorites') || '[]'
    );
    const fav = favorites[index];

    if (fav) {
      // Save pending run to localStorage to be picked up by scraperView
      localStorage.setItem('sasito_pending_run', JSON.stringify(fav));

      // Trigger navigation to scraper view
      // We need a way to tell renderer to switch views.
      // Since we don't have a global event bus, we can dispatch a custom event on document
      const event = new CustomEvent('navigate-to', {
        detail: { view: 'scraper' },
      });
      document.dispatchEvent(event);
    }
  }
}
