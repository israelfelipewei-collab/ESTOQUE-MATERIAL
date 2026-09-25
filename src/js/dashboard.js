/* ============================================================
   APMI · Controle de Estoque — src/js/dashboard.js
   Painel inicial: indicadores, gráfico semanal e alertas.
   ============================================================ */
import { state, ui, CATEGORIAS, icon } from './config.js';
import { emptyState, movTag, escapeHtml, fmtDate } from './utils.js';
import { situacao, situacaoPill } from './ui-helpers.js';

export function totalUnidades(){ return state.products.reduce((s,p)=>s+Number(p.quantidade||0),0); }
export function lowStockProducts(){ return state.products.filter(p => situacao(p)==='low'); }
export function zeroStockProducts(){ return state.products.filter(p => situacao(p)==='zero'); }
export function last7DaysWindow(){
  const end = new Date(); const start = new Date(); start.setDate(start.getDate()-6); start.setHours(0,0,0,0);
  return { start, end };
}
export function movementsInRange(start, end, types){
  return state.movements.filter(m => {
    const d = new Date(m.data);
    if(d < start || d > end) return false;
    if(types && !types.includes(m.tipo)) return false;
    return true;
  });
}

function chartDestroy(id){
  if(window.__charts && window.__charts[id]){ window.__charts[id].destroy(); }
}
window.__charts = window.__charts || {};

export function renderDashboard(){
  document.getElementById('topbar-actions').innerHTML = '';
  const total = state.products.length;
  const totalUn = totalUnidades();
  const low = lowStockProducts();
  const zero = zeroStockProducts();
  const { start, end } = last7DaysWindow();
  const entradasSemana = movementsInRange(start,end,['entrada']);
  const saidasSemana = movementsInRange(start,end,['saida']);
  const entradasQtd = entradasSemana.reduce((s,m)=>s+Number(m.quantidade||0),0);
  const saidasQtd = saidasSemana.reduce((s,m)=>s+Number(m.quantidade||0),0);

  const recentMovs = [...state.movements].sort((a,b)=>new Date(b.data)-new Date(a.data)).slice(0,6);

  document.getElementById('view-content').innerHTML = `
    <div class="hero-stat">
      <div>
        <div class="big">${totalUn.toLocaleString('pt-BR')}</div>
        <div class="lbl">unidades em estoque, em ${total} produto${total===1?'':'s'} cadastrado${total===1?'':'s'}</div>
      </div>
      <div class="mini-stats">
        <div><div class="n">${entradasQtd}</div><div class="l">entradas (7 dias)</div></div>
        <div><div class="n">${saidasQtd}</div><div class="l">saídas (7 dias)</div></div>
        <div><div class="n">${low.length}</div><div class="l">estoque baixo</div></div>
        <div><div class="n">${zero.length}</div><div class="l">sem estoque</div></div>
      </div>
    </div>

    <div class="stat-grid">
      <div class="stat-card"><div class="k">Produtos cadastrados</div><div class="v">${total}</div><div class="foot">${CATEGORIAS.length} categorias disponíveis</div></div>
      <div class="stat-card"><div class="k">Itens em estoque</div><div class="v">${totalUn}</div><div class="foot">soma de todas as unidades</div></div>
      <div class="stat-card"><div class="k">Estoque baixo</div><div class="v ${low.length?'warn':''}">${low.length}</div><div class="foot">abaixo do mínimo definido</div></div>
      <div class="stat-card"><div class="k">Sem estoque</div><div class="v ${zero.length?'danger':''}">${zero.length}</div><div class="foot">necessitam reposição imediata</div></div>
    </div>

    <div class="grid-2">
      <div class="card">
        <div class="card-head"><h3>Movimentações da semana</h3></div>
        <div class="card-body"><canvas id="weekChart" height="190"></canvas></div>
      </div>
      <div class="card">
        <div class="card-head"><h3>Produtos que precisam de atenção</h3><button class="link-btn" data-nav2="produtos">Ver estoque</button></div>
        <div class="card-body" id="dash-alerts"></div>
      </div>
    </div>

    <div class="card" style="margin-top:18px;">
      <div class="card-head"><h3>Movimentações recentes</h3><button class="link-btn" data-nav2="historico">Ver histórico completo</button></div>
      <div class="card-body">
        ${recentMovs.length ? `
        <div class="tbl-scroll"><table><thead><tr><th>Tipo</th><th>Produto</th><th>Quantidade</th><th>Responsável</th><th>Data</th></tr></thead><tbody>
        ${recentMovs.map(m => `<tr>
          <td>${movTag(m.tipo)}</td>
          <td>${escapeHtml(m.produtoNome)}</td>
          <td class="mono">${m.quantidade ?? '—'}</td>
          <td>${escapeHtml(m.responsavel||'—')}</td>
          <td>${fmtDate(m.data)}</td>
        </tr>`).join('')}
        </tbody></table></div>` : emptyState('clock','Nenhuma movimentação ainda','As entradas e saídas registradas aparecerão aqui.')}
      </div>
    </div>
  `;

  document.querySelectorAll('[data-nav2]').forEach(b => b.addEventListener('click', ()=>{ window.dispatchEvent(new CustomEvent('apmi:goto', { detail:{ view:b.dataset.nav2 } })); }));

  const alerts = [...zero, ...low];
  document.getElementById('dash-alerts').innerHTML = alerts.length ? alerts.slice(0,7).map(p => `
    <div class="alert-row">
      <div><div class="p-name">${escapeHtml(p.nome)}</div><div class="p-cat">${escapeHtml(p.categoria)} · ${p.quantidade} ${p.unidade} em estoque</div></div>
      ${situacaoPill(p)}
    </div>
  `).join('') : emptyState('shield','Tudo em ordem','Nenhum produto está com estoque baixo ou zerado.');

  // Gráfico de barras (Chart.js)
  chartDestroy('week');
  const days = [];
  for(let i=6;i>=0;i--){ const d = new Date(); d.setDate(d.getDate()-i); days.push(d); }
  const dayLabels = days.map(d => d.toLocaleDateString('pt-BR',{weekday:'short'}).replace('.',''));
  const entradaByDay = days.map(d => sumByDay(d,'entrada'));
  const saidaByDay = days.map(d => sumByDay(d,'saida'));
  const ctx = document.getElementById('weekChart');
  if(ctx && window.Chart){
    window.__charts.week = new window.Chart(ctx, {
      type:'bar',
      data:{ labels:dayLabels, datasets:[
        { label:'Entradas', data:entradaByDay, backgroundColor:'#3c9f6b', borderRadius:5, maxBarThickness:26 },
        { label:'Saídas', data:saidaByDay, backgroundColor:'#e8834a', borderRadius:5, maxBarThickness:26 },
      ]},
      options:{
        responsive:true, maintainAspectRatio:false,
        plugins:{ legend:{ position:'bottom', labels:{ boxWidth:10, font:{size:11.5, family:'Inter'} } } },
        scales:{ y:{ beginAtZero:true, ticks:{ precision:0, font:{family:'Inter'} }, grid:{ color:'#eef2f6' } }, x:{ grid:{ display:false }, ticks:{ font:{family:'Inter'} } } }
      }
    });
  }
}

function sumByDay(date, tipo){
  const y=date.getFullYear(), m=date.getMonth(), d=date.getDate();
  return state.movements.filter(mv => mv.tipo===tipo).filter(mv => {
    const md = new Date(mv.data);
    return md.getFullYear()===y && md.getMonth()===m && md.getDate()===d;
  }).reduce((s,mv)=>s+Number(mv.quantidade||0),0);
}
