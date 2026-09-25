/* ============================================================
   APMI · Controle de Estoque — src/js/utils.js
   Funções utilitárias de formatação e apoio geral.
   ============================================================ */
import { state } from './config.js';
import { icon } from './config.js';

export function nowISO(){ return new Date().toISOString(); }

export function fmtDate(iso){
  if(!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
}
export function fmtDateOnly(iso){
  if(!iso) return '—';
  return new Date(iso).toLocaleDateString('pt-BR');
}
export function escapeHtml(str){
  return String(str ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

/* Gera um código legível (P0001, P0002...) só para exibição — a chave real é o uuid do banco. */
export function genProductCodigo(){
  const n = state.products.length + 1;
  return 'P' + String(n).padStart(4,'0');
}

export function emptyState(iconName, title, sub){
  return `<div class="empty-state">${icon(iconName)}<div class="t">${title}</div><div class="s">${sub}</div></div>`;
}

export function movTag(tipo){
  const labels = { entrada:'Entrada', saida:'Saída', cadastro:'Cadastro', edicao:'Edição', exclusao:'Exclusão', ajuste:'Ajuste' };
  return `<span class="mov-tag mov-${tipo}">${labels[tipo]||tipo}</span>`;
}
export function movTagLabel(tipo){
  return { entrada:'Entrada', saida:'Saída', cadastro:'Cadastro', edicao:'Edição', exclusao:'Exclusão', ajuste:'Ajuste' }[tipo] || tipo;
}
export function dateStamp(){ return new Date().toISOString().slice(0,10); }

/* ---------------- Toast (notificações) ---------------- */
export function toast(msg, type){
  const c = document.getElementById('toast-container');
  const el = document.createElement('div');
  el.className = 'toast' + (type ? ' ' + type : '');
  el.textContent = msg;
  c.appendChild(el);
  setTimeout(() => { el.style.transition='opacity .3s'; el.style.opacity='0'; setTimeout(()=>el.remove(),300); }, 3200);
}
