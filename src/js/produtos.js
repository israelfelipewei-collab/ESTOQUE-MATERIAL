/* ============================================================
   APMI · Controle de Estoque — src/js/produtos.js
   Cadastro, edição, exclusão e entrada rápida de produtos.
   ============================================================ */
import { state, ui, CATEGORIAS, UNIDADES, icon } from './config.js';
import { escapeHtml, fmtDateOnly, emptyState, genProductCodigo } from './utils.js';
import { situacao, situacaoPill, openModal, closeModal, withSaving, openConfirmModal } from './ui-helpers.js';
import { currentUser } from './auth.js';
import { sbUpdate, sbInsert, sbDelete, insertMovement, dbToProduct, productToDb } from './storage.js';
import { toast } from './utils.js';

export function filteredProducts(){
  return state.products.filter(p => {
    if(ui.productSearch){
      const q = ui.productSearch.toLowerCase();
      if(!p.nome.toLowerCase().includes(q) && !p.codigo.toLowerCase().includes(q)) return false;
    }
    if(ui.productCategoria && p.categoria !== ui.productCategoria) return false;
    if(ui.productSituacao && situacao(p) !== ui.productSituacao) return false;
    return true;
  }).sort((a,b)=>a.nome.localeCompare(b.nome,'pt-BR'));
}

export function renderProdutos(){
  document.getElementById('topbar-actions').innerHTML = state.session.papel!=='Usuário para Consulta'
    ? `<button class="btn btn-coral btn-sm" id="btn-new-product">${icon('box','width:15px;height:15px;')}Novo produto</button>` : '';

  const list = filteredProducts();

  document.getElementById('view-content').innerHTML = `
    <div class="toolbar">
      <div class="filters">
        <div class="search-box">${icon('grid','width:15px;height:15px;')}
          <input type="text" id="f-search" placeholder="Buscar por nome ou código..." value="${escapeHtml(ui.productSearch)}">
        </div>
        <select class="sel-sm" id="f-categoria">
          <option value="">Todas as categorias</option>
          ${CATEGORIAS.map(c=>`<option value="${c}" ${ui.productCategoria===c?'selected':''}>${c}</option>`).join('')}
        </select>
        <select class="sel-sm" id="f-situacao">
          <option value="">Qualquer situação</option>
          <option value="ok" ${ui.productSituacao==='ok'?'selected':''}>Regular</option>
          <option value="low" ${ui.productSituacao==='low'?'selected':''}>Estoque baixo</option>
          <option value="zero" ${ui.productSituacao==='zero'?'selected':''}>Sem estoque</option>
        </select>
      </div>
      <div class="help-text" style="margin:0;">${list.length} produto${list.length===1?'':'s'} encontrado${list.length===1?'':'s'}</div>
    </div>

    <div class="table-wrap">
      <div class="tbl-scroll">
      <table>
        <thead><tr>
          <th>Produto</th><th>Categoria</th><th>Qtd. disponível</th><th>Estoque mínimo</th><th>Situação</th><th>Cadastrado em</th><th></th>
        </tr></thead>
        <tbody>
        ${list.length ? list.map(p => `
          <tr>
            <td><div style="font-weight:600;">${escapeHtml(p.nome)}</div><div class="p-cat">${p.codigo} ${p.observacoes?(' · '+escapeHtml(p.observacoes)):''}</div></td>
            <td>${escapeHtml(p.categoria)}</td>
            <td class="mono">${p.quantidade} ${escapeHtml(p.unidade)}</td>
            <td class="mono">${p.estoqueMinimo} ${escapeHtml(p.unidade)}</td>
            <td>${situacaoPill(p)}</td>
            <td>${fmtDateOnly(p.dataCadastro)}</td>
            <td>
              <div class="row-actions">
                ${state.session.papel!=='Usuário para Consulta' ? `
                <button class="icon-btn" title="Adicionar unidades" data-add-units="${p.id}">${icon('in','width:14px;height:14px;')}</button>
                <button class="icon-btn" title="Editar" data-edit="${p.id}">${icon('doc','width:14px;height:14px;')}</button>
                <button class="icon-btn danger" title="Excluir" data-del="${p.id}">${icon('shield','width:14px;height:14px;')}</button>
                ` : `<span class="help-text">Somente consulta</span>`}
              </div>
            </td>
          </tr>
        `).join('') : `<tr><td colspan="7">${emptyState('box','Nenhum produto encontrado','Ajuste os filtros ou cadastre um novo produto.')}</td></tr>`}
        </tbody>
      </table>
      </div>
    </div>
  `;

  document.getElementById('f-search').addEventListener('input', e => { ui.productSearch = e.target.value; renderProdutos(); });
  document.getElementById('f-categoria').addEventListener('change', e => { ui.productCategoria = e.target.value; renderProdutos(); });
  document.getElementById('f-situacao').addEventListener('change', e => { ui.productSituacao = e.target.value; renderProdutos(); });
  const nb = document.getElementById('btn-new-product'); if(nb) nb.addEventListener('click', () => openProductModal());
  document.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => openProductModal(b.dataset.edit)));
  document.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () => confirmDeleteProduct(b.dataset.del)));
  document.querySelectorAll('[data-add-units]').forEach(b => b.addEventListener('click', () => openAddUnitsModal(b.dataset.addUnits)));
}

export function openProductModal(id){
  const editing = !!id;
  const p = editing ? state.products.find(x=>x.id===id) : null;
  const box = document.getElementById('modal-box');
  box.innerHTML = `
    <div class="modal-head">
      <div><h3>${editing?'Editar produto':'Novo produto'}</h3><p>${editing?'Atualize as informações do produto.':'Preencha os dados do produto de escritório.'}</p></div>
      <button class="modal-close" id="m-close">${icon('shield','width:18px;height:18px;')}</button>
    </div>
    <div class="modal-body">
      <div class="field"><label>Nome do produto</label><input type="text" id="pf-nome" value="${editing?escapeHtml(p.nome):''}" placeholder="ex: Papel A4 (resma 500 folhas)"></div>
      <div class="form-row">
        <div class="field"><label>Categoria</label>
          <select id="pf-categoria">${CATEGORIAS.map(c=>`<option value="${c}" ${editing&&p.categoria===c?'selected':''}>${c}</option>`).join('')}</select>
        </div>
        <div class="field"><label>Unidade de medida</label>
          <select id="pf-unidade">${UNIDADES.map(u=>`<option value="${u}" ${editing&&p.unidade===u?'selected':''}>${u}</option>`).join('')}</select>
        </div>
      </div>
      <div class="form-row">
        <div class="field"><label>Quantidade ${editing?'atual':'inicial'}</label><input type="number" min="0" id="pf-qtd" value="${editing?p.quantidade:0}"></div>
        <div class="field"><label>Estoque mínimo</label><input type="number" min="0" id="pf-min" value="${editing?p.estoqueMinimo:5}"></div>
      </div>
      <div class="field"><label>Observações</label><textarea id="pf-obs" placeholder="Informações adicionais (opcional)">${editing?escapeHtml(p.observacoes||''):''}</textarea></div>
      ${editing?`<div class="help-text">Código: ${p.codigo} · Cadastrado em ${fmtDateOnly(p.dataCadastro)}</div>`:''}
    </div>
    <div class="modal-foot">
      <button class="btn btn-ghost" id="m-cancel">Cancelar</button>
      <button class="btn btn-primary" id="m-save">${editing?'Salvar alterações':'Cadastrar produto'}</button>
    </div>
  `;
  openModal();
  document.getElementById('m-close').addEventListener('click', closeModal);
  document.getElementById('m-cancel').addEventListener('click', closeModal);
  document.getElementById('m-save').addEventListener('click', (e) => saveProduct(id, e.currentTarget));
}

async function saveProduct(id, btn){
  const nome = document.getElementById('pf-nome').value.trim();
  const categoria = document.getElementById('pf-categoria').value;
  const unidade = document.getElementById('pf-unidade').value;
  const quantidade = Number(document.getElementById('pf-qtd').value);
  const estoqueMinimo = Number(document.getElementById('pf-min').value);
  const observacoes = document.getElementById('pf-obs').value.trim();

  if(!nome){ toast('Informe o nome do produto.', 'error'); return; }
  if(quantidade < 0 || estoqueMinimo < 0 || isNaN(quantidade) || isNaN(estoqueMinimo)){ toast('Quantidades não podem ser negativas.', 'error'); return; }

  const user = currentUser().nome;
  await withSaving(btn, async () => {
    if(id){
      const p = state.products.find(x=>x.id===id);
      const qtdAnterior = p.quantidade;
      const changed = qtdAnterior !== quantidade;
      const updated = { ...p, nome, categoria, unidade, quantidade, estoqueMinimo, observacoes };
      await sbUpdate('produtos_escritorio', id, productToDb(updated));
      Object.assign(p, { nome, categoria, unidade, quantidade, estoqueMinimo, observacoes });
      await insertMovement({
        tipo:'edicao', produtoId:p.id, produtoNome:p.nome, quantidade: changed?quantidade:null,
        responsavel:user, qtdAnterior, qtdPosterior:quantidade,
        descricao: changed ? `Dados do produto atualizados; quantidade ajustada de ${qtdAnterior} para ${quantidade}.` : 'Dados cadastrais do produto atualizados.'
      });
      toast('Produto atualizado com sucesso.', 'success');
    } else {
      const codigo = genProductCodigo();
      const [row] = await sbInsert('produtos_escritorio', { codigo, nome, categoria, unidade, quantidade, estoque_minimo:estoqueMinimo, observacoes });
      const novo = dbToProduct(row);
      state.products.push(novo);
      await insertMovement({
        tipo:'cadastro', produtoId:novo.id, produtoNome:nome, quantidade,
        responsavel:user, qtdAnterior:0, qtdPosterior:quantidade,
        descricao:'Novo produto cadastrado no sistema.'
      });
      toast('Produto cadastrado com sucesso.', 'success');
    }
    closeModal();
    renderProdutos();
  });
}

function confirmDeleteProduct(id){
  const p = state.products.find(x=>x.id===id);
  if(!p) return;
  openConfirmModal({
    title:'Excluir produto',
    message:`Tem certeza que deseja excluir "${p.nome}"? Essa ação não pode ser desfeita, mas o histórico de movimentações será mantido para auditoria.`,
    confirmLabel:'Excluir produto',
    onConfirm: async (btn) => {
      await withSaving(btn, async () => {
        // Registra o movimento de exclusão ANTES de apagar o produto: se
        // inserirmos depois, a referência ao produto (já apagado) quebra
        // a chave estrangeira no Supabase e a operação falha.
        await insertMovement({
          tipo:'exclusao', produtoId:null, produtoNome:p.nome, quantidade:null,
          responsavel:currentUser().nome, qtdAnterior:p.quantidade, qtdPosterior:0,
          descricao:'Produto excluído do cadastro.'
        });
        await sbDelete('produtos_escritorio', id);
        state.products = state.products.filter(x=>x.id!==id);
        toast('Produto excluído.', 'success');
        closeModal();
        renderProdutos();
      });
    }
  });
}

function openAddUnitsModal(id){
  const p = state.products.find(x=>x.id===id);
  if(!p) return;
  const box = document.getElementById('modal-box');
  box.innerHTML = `
    <div class="modal-head">
      <div><h3>Adicionar unidades</h3><p>${escapeHtml(p.nome)} · estoque atual: <strong>${p.quantidade} ${p.unidade}</strong></p></div>
      <button class="modal-close" id="m-close">${icon('shield','width:18px;height:18px;')}</button>
    </div>
    <div class="modal-body">
      <div class="field"><label>Quantidade a adicionar (${p.unidade})</label><input type="number" min="1" id="au-qtd" value="1"></div>
      <div class="help-text" id="au-preview">Novo estoque: ${p.quantidade+1} ${p.unidade}</div>
      <div class="field" style="margin-top:14px;"><label>Fornecedor (opcional)</label><input type="text" id="au-fornecedor" placeholder="Nome do fornecedor"></div>
      <div class="field"><label>Nº do documento / nota fiscal (opcional)</label><input type="text" id="au-doc" placeholder="ex: NF 12345"></div>
    </div>
    <div class="modal-foot">
      <button class="btn btn-ghost" id="m-cancel">Cancelar</button>
      <button class="btn btn-primary" id="m-save">Confirmar entrada</button>
    </div>
  `;
  openModal();
  const qtdInput = document.getElementById('au-qtd');
  qtdInput.addEventListener('input', () => {
    const v = Math.max(0, Number(qtdInput.value)||0);
    document.getElementById('au-preview').textContent = `Novo estoque: ${p.quantidade+v} ${p.unidade}`;
  });
  document.getElementById('m-close').addEventListener('click', closeModal);
  document.getElementById('m-cancel').addEventListener('click', closeModal);
  document.getElementById('m-save').addEventListener('click', (e) => {
    const btn = e.currentTarget;
    const qtd = Number(qtdInput.value);
    if(!qtd || qtd<=0){ toast('Informe uma quantidade válida.', 'error'); return; }
    withSaving(btn, async () => {
      const anterior = p.quantidade;
      const novaQtd = p.quantidade + qtd;
      await sbUpdate('produtos_escritorio', p.id, { quantidade: novaQtd });
      p.quantidade = novaQtd;
      await insertMovement({
        tipo:'entrada', produtoId:p.id, produtoNome:p.nome, quantidade:qtd,
        responsavel:currentUser().nome, fornecedor:document.getElementById('au-fornecedor').value.trim(),
        documento:document.getElementById('au-doc').value.trim(),
        qtdAnterior:anterior, qtdPosterior:p.quantidade,
        descricao:`Entrada rápida de ${qtd} ${p.unidade}. Estoque atualizado de ${anterior} para ${p.quantidade}.`
      });
      toast(`Estoque de ${p.nome} atualizado para ${p.quantidade} ${p.unidade}.`, 'success');
      closeModal();
      window.dispatchEvent(new CustomEvent('apmi:refresh'));
    });
  });
}
