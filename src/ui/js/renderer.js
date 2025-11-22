document.addEventListener('DOMContentLoaded', () => {
  const menuItems = document.querySelectorAll('.menu-item');
  const views = document.querySelectorAll('.view');

  menuItems.forEach((item) => {
    if (item.classList.contains('disabled')) return;

    item.addEventListener('click', () => {
      menuItems.forEach((i) => i.classList.remove('active'));
      item.classList.add('active');

      const targetId = item.getAttribute('data-target');

      views.forEach((view) => {
        if (view.id === targetId) {
          view.classList.remove('hidden');
          view.classList.add('active');
        } else {
          view.classList.remove('active');
          view.classList.add('hidden');
        }
      });
    });
  });
});
