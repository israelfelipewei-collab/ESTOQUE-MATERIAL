/* ============================================================
   APMI · Controle de Estoque — src/js/entradas-saidas.js
   Registro de entradas e saídas de estoque.
   ============================================================ */
import { state, SETORES, icon } from './config.js';
import { escapeHtml, fmtDate, emptyState, toast } from './utils.js';
import { openModal, closeModal, withSaving } from './ui-helpers.js';
import { currentUser } from './auth.js';
import { sbUpdate, insertMovement } from './storage.js';

/* ---------------- Entradas ---------------- */
export function renderEntradas(){
  const readOnly = state.session.papel==='Usuário para Consulta';
  document.getElementById('topbar-actions').innerHTML = readOnly ? '' :
    `<button class="btn btn-coral btn-sm" id="btn-new-entrada">${icon('in','width:15px;height:15px;')}Registrar entrada</button>`;

  const entradas = state.movements.filter(m=>m.tipo==='entrada').sort((a,b)=>new Date(b.data)-new Date(a.data));

  document.getElementById('view-content').innerHTML = `
    <div class="section-note">${icon('in','width:16px;height:16px;')}Toda entrada soma automaticamente a quantidade recebida ao estoque atual do produto e fica registrada no histórico para auditoria.</div>
    <div class="table-wrap"><div class="tbl-scroll">
      <table><thead><tr><th>Produto</th><th>Qtd. recebida</th><th>Fornecedor</th><th>Documento</th><th>Responsável</th><th>Data</th></tr></thead>
      <tbody>
      ${entradas.length ? entradas.map(m => `
        <tr>
          <td style="font-weight:600;">${escapeHtml(m.produtoNome)}</td>
          <td class="mono">+${m.quantidade}</td>
          <td>${escapeHtml(m.fornecedor)||'—'}</td>
          <td>${escapeHtml(m.documento)||'—'}</td>
          <td>${escapeHtml(m.responsavel)}</td>
          <td>${fmtDate(m.data)}</td>
        </tr>
      `).join('') : `<tr><td colspan="6">${emptyState('in','Nenhuma entrada registrada','Registre o recebimento de produtos para atualizar o estoque.')}</td></tr>`}
      </tbody></table>
    </div></div>
  `;
  const nb = document.getElementById('btn-new-entrada');
  if(nb) nb.addEventListener('click', openEntradaModal);
}

function productOptions(selectedId){
  return state.products.slice().sort((a,b)=>a.nome.localeCompare(b.nome,'pt-BR')).map(p =>
    `<option value="${p.id}" ${selectedId===p.id?'selected':''}>${escapeHtml(p.nome)} (${p.quantidade} ${p.unidade} em estoque)</option>`
  ).join('');
}

function openEntradaModal(){
  if(state.products.length === 0){ toast('Cadastre ao menos um produto antes de registrar entradas.', 'error'); return; }
  const box = document.getElementById('modal-box');
  box.innerHTML = `
    <div class="modal-head">
      <div><h3>Registrar entrada</h3><p>O estoque do produto será somado automaticamente.</p></div>
      <button class="modal-close" id="m-close">${icon('shield','width:18px;height:18px;')}</button>
    </div>
    <div class="modal-body">
      <div class="field"><label>Produto</label><select id="ef-produto">${productOptions()}</select></div>
      <div class="form-row">
        <div class="field"><label>Quantidade recebida</label><input type="number" min="1" id="ef-qtd" value="1"></div>
        <div class="field"><label>Data</label><input type="date" id="ef-data" value="${new Date().toISOString().slice(0,10)}"></div>
      </div>
      <div class="form-row">
        <div class="field"><label>Fornecedor (opcional)</label><input type="text" id="ef-fornecedor" placeholder="Nome do fornecedor"></div>
        <div class="field"><label>Nº documento / nota fiscal (opcional)</label><input type="text" id="ef-doc" placeholder="ex: NF 12345"></div>
      </div>
      <div class="field"><label>Observações</label><textarea id="ef-obs" placeholder="Informações adicionais (opcional)"></textarea></div>
      <div class="help-text" id="ef-preview"></div>
    </div>
    <div class="modal-foot">
      <button class="btn btn-ghost" id="m-cancel">Cancelar</button>
      <button class="btn btn-primary" id="m-save">Registrar entrada</button>
    </div>
  `;
  openModal();
  const sel = document.getElementById('ef-produto');
  const qtdInput = document.getElementById('ef-qtd');
  function updatePreview(){
    const p = state.products.find(x=>x.id===sel.value);
    const v = Math.max(0, Number(qtdInput.value)||0);
    if(p) document.getElementById('ef-preview').textContent = `Novo estoque de ${p.nome}: ${p.quantidade+v} ${p.unidade}`;
  }
  sel.addEventListener('change', updatePreview);
  qtdInput.addEventListener('input', updatePreview);
  updatePreview();
  document.getElementById('m-close').addEventListener('click', closeModal);
  document.getElementById('m-cancel').addEventListener('click', closeModal);
  document.getElementById('m-save').addEventListener('click', (e) => {
    const btn = e.currentTarget;
    const p = state.products.find(x=>x.id===sel.value);
    const qtd = Number(qtdInput.value);
    if(!p){ toast('Selecione um produto.', 'error'); return; }
    if(!qtd || qtd<=0){ toast('Informe uma quantidade válida.', 'error'); return; }
    withSaving(btn, async () => {
      const anterior = p.quantidade;
      const novaQtd = p.quantidade + qtd;
      await sbUpdate('produtos_escritorio', p.id, { quantidade: novaQtd });
      p.quantidade = novaQtd;
      const dataVal = document.getElementById('ef-data').value;
      await insertMovement({
        tipo:'entrada', produtoId:p.id, produtoNome:p.nome, quantidade:qtd,
        data: dataVal ? new Date(dataVal+'T'+new Date().toTimeString().slice(0,8)).toISOString() : undefined,
        responsavel:currentUser().nome,
        fornecedor:document.getElementById('ef-fornecedor').value.trim(),
        documento:document.getElementById('ef-doc').value.trim(),
        observacoes:document.getElementById('ef-obs').value.trim(),
        qtdAnterior:anterior, qtdPosterior:p.quantidade,
        descricao:`Entrada de ${qtd} ${p.unidade}. Estoque atualizado de ${anterior} para ${p.quantidade}.`
      });
      toast('Entrada registrada com sucesso.', 'success');
      closeModal();
      window.dispatchEvent(new CustomEvent('apmi:refresh'));
    });
  });
}

/* ---------------- Saídas ---------------- */
export function renderSaidas(){
  const readOnly = state.session.papel==='Usuário para Consulta';
  document.getElementById('topbar-actions').innerHTML = readOnly ? '' :
    `<button class="btn btn-coral btn-sm" id="btn-new-saida">${icon('out','width:15px;height:15px;')}Registrar saída</button>`;

  const saidas = state.movements.filter(m=>m.tipo==='saida').sort((a,b)=>new Date(b.data)-new Date(a.data));

  document.getElementById('view-content').innerHTML = `
    <div class="section-note">${icon('out','width:16px;height:16px;')}O sistema impede o registro de uma saída maior que a quantidade disponível em estoque.</div>
    <div class="table-wrap"><div class="tbl-scroll">
      <table><thead><tr><th>Produto</th><th>Qtd. retirada</th><th>Setor/destino</th><th>Motivo</th><th>Responsável</th><th>Data</th></tr></thead>
      <tbody>
      ${saidas.length ? saidas.map(m => `
        <tr>
          <td style="font-weight:600;">${escapeHtml(m.produtoNome)}</td>
          <td class="mono">-${m.quantidade}</td>
          <td>${escapeHtml(m.setor)||'—'}</td>
          <td>${escapeHtml(m.motivo)||'—'}</td>
          <td>${escapeHtml(m.responsavel)}</td>
          <td>${fmtDate(m.data)}</td>
        </tr>
      `).join('') : `<tr><td colspan="6">${emptyState('out','Nenhuma saída registrada','Registre a retirada de produtos do estoque.')}</td></tr>`}
      </tbody></table>
    </div></div>
  `;
  const nb = document.getElementById('btn-new-saida');
  if(nb) nb.addEventListener('click', openSaidaModal);
}

function openSaidaModal(){
  if(state.products.length === 0){ toast('Cadastre ao menos um produto antes de registrar saídas.', 'error'); return; }
  const box = document.getElementById('modal-box');
  box.innerHTML = `
    <div class="modal-head">
      <div><h3>Registrar saída</h3><p>A quantidade será descontada automaticamente do estoque.</p></div>
      <button class="modal-close" id="m-close">${icon('shield','width:18px;height:18px;')}</button>
    </div>
    <div class="modal-body">
      <div class="field"><label>Produto</label><select id="sf-produto">${productOptions()}</select></div>
      <div class="form-row">
        <div class="field"><label>Quantidade retirada</label><input type="number" min="1" id="sf-qtd" value="1"></div>
        <div class="field"><label>Data</label><input type="date" id="sf-data" value="${new Date().toISOString().slice(0,10)}"></div>
      </div>
      <div class="form-row">
        <div class="field"><label>Setor / local de destino</label><select id="sf-setor">${SETORES.map(s=>`<option value="${s}">${s}</option>`).join('')}</select></div>
        <div class="field"><label>Motivo da saída</label><input type="text" id="sf-motivo" placeholder="ex: uso rotineiro, reposição de sala"></div>
      </div>
      <div class="field"><label>Observações</label><textarea id="sf-obs" placeholder="Informações adicionais (opcional)"></textarea></div>
      <div class="help-text" id="sf-preview"></div>
    </div>
    <div class="modal-foot">
      <button class="btn btn-ghost" id="m-cancel">Cancelar</button>
      <button class="btn btn-primary" id="m-save">Registrar saída</button>
    </div>
  `;
  openModal();
  const sel = document.getElementById('sf-produto');
  const qtdInput = document.getElementById('sf-qtd');
  function updatePreview(){
    const p = state.products.find(x=>x.id===sel.value);
    const v = Math.max(0, Number(qtdInput.value)||0);
    if(p){
      const resultante = p.quantidade - v;
      const el = document.getElementById('sf-preview');
      el.textContent = `Estoque atual: ${p.quantidade} ${p.unidade}. Após a saída: ${resultante} ${p.unidade}.`;
      el.style.color = resultante < 0 ? 'var(--red)' : '';
    }
  }
  sel.addEventListener('change', updatePreview);
  qtdInput.addEventListener('input', updatePreview);
  updatePreview();
  document.getElementById('m-close').addEventListener('click', closeModal);
  document.getElementById('m-cancel').addEventListener('click', closeModal);
  document.getElementById('m-save').addEventListener('click', (e) => {
    const btn = e.currentTarget;
    const p = state.products.find(x=>x.id===sel.value);
    const qtd = Number(qtdInput.value);
    if(!p){ toast('Selecione um produto.', 'error'); return; }
    if(!qtd || qtd<=0){ toast('Informe uma quantidade válida.', 'error'); return; }
    if(qtd > p.quantidade){ toast(`Quantidade indisponível: há apenas ${p.quantidade} ${p.unidade} de ${p.nome} em estoque.`, 'error'); return; }
    withSaving(btn, async () => {
      const anterior = p.quantidade;
      const novaQtd = p.quantidade - qtd;
      await sbUpdate('produtos_escritorio', p.id, { quantidade: novaQtd });
      p.quantidade = novaQtd;
      const dataVal = document.getElementById('sf-data').value;
      await insertMovement({
        tipo:'saida', produtoId:p.id, produtoNome:p.nome, quantidade:qtd,
        data: dataVal ? new Date(dataVal+'T'+new Date().toTimeString().slice(0,8)).toISOString() : undefined,
        responsavel:currentUser().nome,
        setor:document.getElementById('sf-setor').value,
        motivo:document.getElementById('sf-motivo').value.trim(),
        observacoes:document.getElementById('sf-obs').value.trim(),
        qtdAnterior:anterior, qtdPosterior:p.quantidade,
        descricao:`Saída de ${qtd} ${p.unidade}. Estoque atualizado de ${anterior} para ${p.quantidade}.`
      });
      toast('Saída registrada com sucesso.', 'success');
      closeModal();
      window.dispatchEvent(new CustomEvent('apmi:refresh'));
    });
  });
}
