/* ============================================================
   APMI · Controle de Estoque — src/js/ui-shell.js
   Sidebar, barra superior e roteamento entre as telas.
   Este é o único módulo que conhece todas as telas — os módulos
   de cada tela nunca importam uns aos outros, apenas avisam que
   precisam de uma atualização via eventos ('apmi:goto' / 'apmi:refresh').
   ============================================================ */
import { NAV_ITEMS, ui, icon } from './config.js';
import { can, currentUser } from './auth.js';
import { renderDashboard } from './dashboard.js';
import { renderProdutos } from './produtos.js';
import { renderEntradas, renderSaidas } from './entradas-saidas.js';
import { renderHistorico, renderAuditoria } from './historico-auditoria.js';
import { renderUsuarios } from './usuarios.js';
import { renderRelatorios } from './relatorios.js';

export function renderSidebarNav(){
  const nav = document.getElementById('sidebar-nav');
  nav.innerHTML = NAV_ITEMS.filter(it => !it.adminOnly || can('manage-users')).map(it => `
    <button class="nav-item ${ui.view===it.id?'active':''}" data-nav="${it.id}">
      ${icon(it.icon)}<span>${it.label}</span>
    </button>
  `).join('');
  nav.querySelectorAll('[data-nav]').forEach(btn => {
    btn.addEventListener('click', () => { ui.view = btn.dataset.nav; ui.sidebarOpen=false; document.getElementById('sidebar').classList.remove('open'); renderAll(); });
  });
}

export function renderUserChip(){
  const u = currentUser();
  if(!u) return;
  document.getElementById('user-avatar').textContent = u.nome.trim().charAt(0).toUpperCase();
  document.getElementById('user-name-lbl').textContent = u.nome;
  document.getElementById('user-role-lbl').textContent = u.papel;
}

export function renderTopbar(){
  const item = NAV_ITEMS.find(i => i.id === ui.view);
  document.getElementById('page-title').textContent = item ? item.label : '';
  document.getElementById('page-desc').textContent = item ? item.desc : '';
}

export function renderAll(){
  renderSidebarNav();
  renderUserChip();
  renderTopbar();
  const map = {
    dashboard: renderDashboard,
    produtos: renderProdutos,
    entradas: renderEntradas,
    saidas: renderSaidas,
    historico: renderHistorico,
    relatorios: renderRelatorios,
    auditoria: renderAuditoria,
    usuarios: renderUsuarios,
  };
  const fn = map[ui.view] || renderDashboard;
  fn();
}

/* Telas individuais avisam por evento quando precisam de atualização,
   em vez de importar renderAll diretamente (evita import circular). */
window.addEventListener('apmi:goto', (e) => { ui.view = e.detail.view; renderAll(); });
window.addEventListener('apmi:refresh', () => { renderAll(); });
