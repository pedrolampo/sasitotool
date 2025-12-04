<script setup>
import { ref, onMounted } from 'vue';
import Icon from '../components/Icon.vue';

const dollarBlue = ref(null);
const dollarOfficial = ref(null);
const loadingDollar = ref(true);

onMounted(() => {
  fetchDollarRates();
});

async function fetchDollarRates() {
  loadingDollar.value = true;
  try {
    const [blueRes, officialRes] = await Promise.all([
      fetch('https://dolarapi.com/v1/dolares/blue'),
      fetch('https://dolarapi.com/v1/dolares/oficial'),
    ]);

    if (blueRes.ok) {
      const data = await blueRes.json();
      dollarBlue.value = data;
    }
    if (officialRes.ok) {
      const data = await officialRes.json();
      dollarOfficial.value = data;
    }
  } catch (err) {
    console.error('Error fetching dollar rates:', err);
  } finally {
    loadingDollar.value = false;
  }
}

function navigateTo(view) {
  window.dispatchEvent(new CustomEvent('navigate-to', { detail: { view } }));
}

function formatCurrency(value) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(value);
}
</script>

<template>
  <div class="dashboard-container">
    <div class="header-section">
      <div>
        <h1>Hola, Sasitogames</h1>
        <p class="subtitle">Bienvenido a tu panel de control.</p>
      </div>
      <div class="date-badge">
        {{
          new Date().toLocaleDateString('es-AR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
          })
        }}
      </div>
    </div>

    <!-- Quick Stats Row -->
    <div class="stats-grid">
      <div class="stat-card blue">
        <div class="stat-icon">
          <Icon name="dollar" size="24" />
        </div>
        <div class="stat-info">
          <span class="stat-label">Dólar Blue</span>
          <div v-if="loadingDollar" class="skeleton-loader"></div>
          <span v-else class="stat-value">{{
            dollarBlue ? formatCurrency(dollarBlue.venta) : 'Error'
          }}</span>
          <span class="stat-sub" v-if="dollarBlue"
            >Compra: {{ formatCurrency(dollarBlue.compra) }}</span
          >
        </div>
      </div>

      <div class="stat-card green">
        <div class="stat-icon">
          <Icon name="dollar" size="24" />
        </div>
        <div class="stat-info">
          <span class="stat-label">Dólar Oficial</span>
          <div v-if="loadingDollar" class="skeleton-loader"></div>
          <span v-else class="stat-value">{{
            dollarOfficial ? formatCurrency(dollarOfficial.venta) : 'Error'
          }}</span>
          <span class="stat-sub" v-if="dollarOfficial"
            >Compra: {{ formatCurrency(dollarOfficial.compra) }}</span
          >
        </div>
      </div>
    </div>

    <!-- Quick Actions Grid -->
    <h3 class="section-title">Accesos Rápidos</h3>
    <div class="actions-grid">
      <div class="action-card" @click="navigateTo('scraper')">
        <div class="action-icon scraper">
          <Icon name="scraper" size="28" />
        </div>
        <div class="action-content">
          <h4>Scraper de Precios</h4>
          <p>Buscar ofertas y exportar datos.</p>
        </div>
        <Icon name="arrowRight" size="20" class="arrow-icon" />
      </div>

      <div class="action-card" @click="navigateTo('whatsapp')">
        <div class="action-icon whatsapp">
          <Icon name="whatsapp" size="28" />
        </div>
        <div class="action-content">
          <h4>WhatsApp Tool</h4>
          <p>Escanear y guardar contactos.</p>
        </div>
        <Icon name="arrowRight" size="20" class="arrow-icon" />
      </div>

      <div class="action-card" @click="navigateTo('notes')">
        <div class="action-icon notes">
          <Icon name="file-text" size="28" />
        </div>
        <div class="action-content">
          <h4>Mis Notas</h4>
          <p>Ver transcripciones y apuntes.</p>
        </div>
        <Icon name="arrowRight" size="20" class="arrow-icon" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.dashboard-container {
  max-width: 1000px;
  margin: 0 auto;
  padding-bottom: 2rem;
}

.header-section {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 2.5rem;
}

h1 {
  font-size: 2rem;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 0.5rem;
  letter-spacing: -0.03em;
}

.date-badge {
  background: var(--bg-card);
  padding: 0.5rem 1rem;
  border-radius: 99px;
  font-size: 0.9rem;
  color: var(--text-secondary);
  border: 1px solid var(--border);
  box-shadow: var(--shadow-sm);
  text-transform: capitalize;
}

/* STATS */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 1.5rem;
  margin-bottom: 3rem;
}

.stat-card {
  background: var(--bg-card);
  padding: 1.5rem;
  border-radius: var(--radius);
  border: 1px solid var(--border);
  display: flex;
  align-items: center;
  gap: 1.25rem;
  box-shadow: var(--shadow-sm);
  transition: transform 0.2s, box-shadow 0.2s;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.stat-icon {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1.5rem;
}

.stat-card.blue .stat-icon {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2);
}

.stat-card.green .stat-icon {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2);
}

.stat-info {
  display: flex;
  flex-direction: column;
}

.stat-label {
  font-size: 0.85rem;
  color: var(--text-secondary);
  font-weight: 500;
  margin-bottom: 4px;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.2;
}

.stat-sub {
  font-size: 0.75rem;
  color: var(--text-light);
  margin-top: 2px;
}

.skeleton-loader {
  height: 28px;
  width: 100px;
  background: var(--bg-content);
  border-radius: 4px;
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0% {
    opacity: 0.6;
  }
  50% {
    opacity: 1;
  }
  100% {
    opacity: 0.6;
  }
}

/* ACTIONS */
.section-title {
  font-size: 1.1rem;
  color: var(--text-secondary);
  margin-bottom: 1.5rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.actions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
}

.action-card {
  background: var(--bg-card);
  padding: 1.5rem;
  border-radius: var(--radius);
  border: 1px solid var(--border);
  display: flex;
  align-items: center;
  gap: 1.25rem;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  overflow: hidden;
}

.action-card:hover {
  border-color: var(--accent);
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.action-icon {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  transition: transform 0.2s;
}

.action-card:hover .action-icon {
  transform: scale(1.1);
}

.action-icon.scraper {
  background: rgba(249, 115, 22, 0.1);
  color: #f97316;
}
.action-icon.whatsapp {
  background: rgba(16, 185, 129, 0.1);
  color: #10b981;
}
.action-icon.notes {
  background: rgba(99, 102, 241, 0.1);
  color: #6366f1;
}

.action-content h4 {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.action-content p {
  font-size: 0.9rem;
  color: var(--text-secondary);
}

.arrow-icon {
  margin-left: auto;
  color: var(--text-light);
  opacity: 0;
  transform: translateX(-10px);
  transition: all 0.2s;
}

.action-card:hover .arrow-icon {
  opacity: 1;
  transform: translateX(0);
  color: var(--accent);
}
</style>
