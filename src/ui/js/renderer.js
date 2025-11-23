import { initScraperView } from './views/scraperView.js';
import { initSettingsView } from './views/settingsView.js';
import { initFavoritesView } from './views/favoritesView.js';

document.addEventListener('DOMContentLoaded', () => {
  const menuItems = document.querySelectorAll('.menu-item');
  const appContent = document.getElementById('app-content');

  // Load default view
  loadView('home');

  menuItems.forEach((item) => {
    if (item.classList.contains('disabled')) return;

    item.addEventListener('click', () => {
      menuItems.forEach((i) => i.classList.remove('active'));
      item.classList.add('active');

      const target = item.getAttribute('data-target'); // e.g., "section-home"
      const viewName = target.replace('section-', '');
      loadView(viewName);
    });
  });

  // Listen for navigation requests from views
  document.addEventListener('navigate-to', (e) => {
    const viewName = e.detail.view;
    // Update menu active state
    menuItems.forEach((i) => {
      if (i.getAttribute('data-target') === `section-${viewName}`) {
        i.classList.add('active');
      } else {
        i.classList.remove('active');
      }
    });
    loadView(viewName);
  });

  async function loadView(viewName) {
    try {
      const response = await fetch(`views/${viewName}.html`);
      if (!response.ok) throw new Error(`View ${viewName} not found`);

      const html = await response.text();
      appContent.innerHTML = html;

      // Initialize view-specific logic
      if (viewName === 'scraper') {
        initScraperView();
      } else if (viewName === 'settings') {
        initSettingsView();
      } else if (viewName === 'favorites') {
        initFavoritesView();
      }
    } catch (err) {
      console.error('Error loading view:', err);
      appContent.innerHTML = '<p>Error loading content.</p>';
    }
  }
});
