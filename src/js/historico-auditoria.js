/* ============================================================
   APMI · Controle de Estoque — src/js/historico-auditoria.js
   Histórico de movimentações e trilha de auditoria.
   ============================================================ */
import { state, ui, icon } from './config.js';
import { escapeHtml, fmtDate, emptyState, movTag } from './utils.js';

export function filteredMovements(){
  return state.movements.filter(m => {
    if(ui.histSearch){
      const q = ui.histSearch.toLowerCase();
      if(!m.produtoNome.toLowerCase().includes(q)) return false;
    }
    if(ui.histTipo && m.tipo !== ui.histTipo) return false;
    if(ui.histResponsavel && m.responsavel !== ui.histResponsavel) return false;
    if(ui.histDataIni){ if(new Date(m.data) < new Date(ui.histDataIni+'T00:00:00')) return false; }
    if(ui.histDataFim){ if(new Date(m.data) > new Date(ui.histDataFim+'T23:59:59')) return false; }
    return true;
  }).sort((a,b)=>new Date(b.data)-new Date(a.data));
}

function responsaveisList(){
  return [...new Set(state.movements.map(m=>m.responsavel).filter(Boolean))].sort();
}

export function renderHistorico(){
  document.getElementById('topbar-actions').innerHTML = '';
  const list = filteredMovements();
  document.getElementById('view-content').innerHTML = `
    <div class="toolbar">
      <div class="filters">
        <div class="search-box">${icon('grid','width:15px;height:15px;')}<input type="text" id="h-search" placeholder="Buscar produto..." value="${escapeHtml(ui.histSearch)}"></div>
        <select class="sel-sm" id="h-tipo">
          <option value="">Todos os tipos</option>
          <option value="entrada" ${ui.histTipo==='entrada'?'selected':''}>Entradas</option>
          <option value="saida" ${ui.histTipo==='saida'?'selected':''}>Saídas</option>
          <option value="cadastro" ${ui.histTipo==='cadastro'?'selected':''}>Cadastros</option>
          <option value="edicao" ${ui.histTipo==='edicao'?'selected':''}>Alterações</option>
          <option value="exclusao" ${ui.histTipo==='exclusao'?'selected':''}>Exclusões</option>
          <option value="ajuste" ${ui.histTipo==='ajuste'?'selected':''}>Ajustes</option>
        </select>
        <select class="sel-sm" id="h-resp">
          <option value="">Todos os responsáveis</option>
          ${responsaveisList().map(r=>`<option value="${escapeHtml(r)}" ${ui.histResponsavel===r?'selected':''}>${escapeHtml(r)}</option>`).join('')}
        </select>
        <input type="date" class="sel-sm" id="h-ini" value="${ui.histDataIni}" title="De">
        <input type="date" class="sel-sm" id="h-fim" value="${ui.histDataFim}" title="Até">
      </div>
      <div class="help-text" style="margin:0;">${list.length} movimentação${list.length===1?'':'ões'}</div>
    </div>
    <div class="table-wrap"><div class="tbl-scroll">
      <table><thead><tr><th>Data/Hora</th><th>Tipo</th><th>Produto</th><th>Quantidade</th><th>Responsável</th><th>Detalhes</th></tr></thead>
      <tbody>
      ${list.length ? list.map(m => `
        <tr>
          <td class="mono">${fmtDate(m.data)}</td>
          <td>${movTag(m.tipo)}</td>
          <td>${escapeHtml(m.produtoNome)}</td>
          <td class="mono">${m.quantidade ?? '—'}</td>
          <td>${escapeHtml(m.responsavel)}</td>
          <td style="color:var(--ink-soft);font-size:12.5px;max-width:280px;">${escapeHtml(m.descricao||'—')}</td>
        </tr>
      `).join('') : `<tr><td colspan="6">${emptyState('clock','Nenhuma movimentação encontrada','Ajuste os filtros para ver outros resultados.')}</td></tr>`}
      </tbody></table>
    </div></div>
  `;
  document.getElementById('h-search').addEventListener('input', e=>{ui.histSearch=e.target.value; renderHistorico();});
  document.getElementById('h-tipo').addEventListener('change', e=>{ui.histTipo=e.target.value; renderHistorico();});
  document.getElementById('h-resp').addEventListener('change', e=>{ui.histResponsavel=e.target.value; renderHistorico();});
  document.getElementById('h-ini').addEventListener('change', e=>{ui.histDataIni=e.target.value; renderHistorico();});
  document.getElementById('h-fim').addEventListener('change', e=>{ui.histDataFim=e.target.value; renderHistorico();});
}

/* ---------------- Auditoria ---------------- */
export function renderAuditoria(){
  document.getElementById('topbar-actions').innerHTML = '';
  const list = state.movements.filter(m => {
    if(!ui.auditSearch) return true;
    const q = ui.auditSearch.toLowerCase();
    return m.produtoNome.toLowerCase().includes(q) || (m.responsavel||'').toLowerCase().includes(q);
  }).sort((a,b)=>new Date(b.data)-new Date(a.data));

  document.getElementById('view-content').innerHTML = `
    <div class="section-note">${icon('shield','width:16px;height:16px;')}Registro completo de ações no sistema: quem realizou, quando, o produto envolvido e a variação de quantidade — garantindo rastreabilidade total.</div>
    <div class="toolbar">
      <div class="search-box">${icon('grid','width:15px;height:15px;')}<input type="text" id="a-search" placeholder="Buscar por produto ou usuário..." value="${escapeHtml(ui.auditSearch)}"></div>
      <div class="help-text" style="margin:0;">${list.length} registro${list.length===1?'':'s'} de auditoria</div>
    </div>
    <div class="table-wrap"><div class="tbl-scroll">
      <table><thead><tr><th>Usuário</th><th>Data/Hora</th><th>Produto</th><th>Ação</th><th>Qtd. anterior</th><th>Qtd. alterada</th><th>Qtd. posterior</th><th>Descrição</th></tr></thead>
      <tbody>
      ${list.length ? list.map(m => `
        <tr>
          <td style="font-weight:600;">${escapeHtml(m.responsavel)}</td>
          <td class="mono">${fmtDate(m.data)}</td>
          <td>${escapeHtml(m.produtoNome)}</td>
          <td>${movTag(m.tipo)}</td>
          <td class="mono">${m.qtdAnterior ?? '—'}</td>
          <td class="mono">${m.quantidade ?? '—'}</td>
          <td class="mono">${m.qtdPosterior ?? '—'}</td>
          <td style="color:var(--ink-soft);font-size:12.5px;max-width:260px;">${escapeHtml(m.descricao||'—')}</td>
        </tr>
      `).join('') : `<tr><td colspan="8">${emptyState('shield','Nenhum registro de auditoria','As ações realizadas no sistema aparecerão aqui.')}</td></tr>`}
      </tbody></table>
    </div></div>
  `;
  document.getElementById('a-search').addEventListener('input', e=>{ui.auditSearch=e.target.value; renderAuditoria();});
}
