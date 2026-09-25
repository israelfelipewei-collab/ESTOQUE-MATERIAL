/* ============================================================
   APMI · Controle de Estoque — src/js/ui-helpers.js
   Helpers de interface reutilizados por vários módulos:
   situação de estoque e modais genéricos (não depende de
   nenhuma tela específica, evitando importação circular).
   ============================================================ */
import { icon } from './config.js';
import { toast } from './utils.js';

/* ---------------- Estoque: helpers de situação ---------------- */
export function situacao(p){
  if(p.quantidade <= 0) return 'zero';
  if(p.quantidade <= p.estoqueMinimo) return 'low';
  return 'ok';
}
export function situacaoPill(p){
  const s = situacao(p);
  if(s==='zero') return `<span class="pill pill-zero">${icon('shield','width:11px;height:11px;')}Sem estoque</span>`;
  if(s==='low') return `<span class="pill pill-low">${icon('shield','width:11px;height:11px;')}Estoque baixo</span>`;
  return `<span class="pill pill-ok">Regular</span>`;
}

/* ---------------- Modais ---------------- */
export function openModal(){ document.getElementById('modal-overlay').classList.add('show'); }
export function closeModal(){ document.getElementById('modal-overlay').classList.remove('show'); document.getElementById('modal-box').innerHTML=''; }

/* Desabilita o botão, mostra "Salvando...", executa fn, trata erros de rede/Supabase. */
export async function withSaving(btn, fn){
  const original = btn ? btn.textContent : null;
  if(btn){ btn.disabled = true; btn.textContent = 'Salvando...'; btn.style.opacity = '0.7'; }
  try{
    await fn();
  }catch(err){
    console.error(err);
    toast('Não foi possível salvar: verifique sua conexão com o Supabase.', 'error');
  }finally{
    if(btn && document.body.contains(btn)){ btn.disabled = false; btn.textContent = original; btn.style.opacity = '1'; }
  }
}

export function openConfirmModal({ title, message, confirmLabel, onConfirm }){
  const box = document.getElementById('modal-box');
  box.className = 'modal confirm-modal';
  box.innerHTML = `
    <div class="modal-body" style="padding-top:26px;">
      <div class="warn-icon">${icon('shield')}</div>
      <h3 style="font-family:var(--font-display);font-size:18px;margin:0 0 8px;color:var(--blue-950);">${title}</h3>
      <p style="font-size:13.5px;color:var(--ink-soft);line-height:1.55;margin:0;">${message}</p>
    </div>
    <div class="modal-foot" style="justify-content:center;">
      <button class="btn btn-ghost" id="cm-cancel">Cancelar</button>
      <button class="btn btn-danger" id="cm-confirm">${confirmLabel}</button>
    </div>
  `;
  openModal();
  document.getElementById('cm-cancel').addEventListener('click', () => { box.className='modal'; closeModal(); });
  document.getElementById('cm-confirm').addEventListener('click', (e) => { box.className='modal'; onConfirm(e.currentTarget); });
}
