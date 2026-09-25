/* ============================================================
   APMI · Controle de Estoque — src/js/relatorios.js
   Geração de relatórios em PDF (jsPDF) e Excel (SheetJS).
   ============================================================ */
import { state, icon } from './config.js';
import { fmtDateOnly, fmtDate, movTagLabel, dateStamp, toast } from './utils.js';
import { situacao } from './ui-helpers.js';
import { logoState } from './storage.js';
import { totalUnidades, zeroStockProducts, lowStockProducts, movementsInRange } from './dashboard.js';

export function renderRelatorios(){
  document.getElementById('topbar-actions').innerHTML = '';
  document.getElementById('view-content').innerHTML = `
    <div class="section-note">${icon('doc','width:16px;height:16px;')}Todos os relatórios são gerados com a identidade visual da APMI e podem ser exportados em PDF ou Excel (.xlsx).</div>
    <div class="report-grid">
      ${reportCard('Relatório semanal', 'Resumo dos últimos 7 dias: estoque inicial, entradas, saídas, estoque final e produtos que precisam de reposição. É o principal relatório de acompanhamento.', 'r-semanal')}
      ${reportCard('Relatório mensal', 'Resumo consolidado do mês atual, com o mesmo detalhamento do relatório semanal.', 'r-mensal')}
      ${reportCard('Relatório de entradas', 'Lista completa de todas as entradas registradas no estoque.', 'r-entradas')}
      ${reportCard('Relatório de saídas', 'Lista completa de todas as saídas registradas no estoque.', 'r-saidas')}
      ${reportCard('Produtos cadastrados', 'Lista de todos os produtos cadastrados, com categoria, unidade e estoque atual.', 'r-produtos')}
      ${reportCard('Estoque baixo', 'Produtos com quantidade igual ou abaixo do estoque mínimo, incluindo os sem estoque.', 'r-baixo')}
      ${reportCard('Movimentações', 'Histórico completo de entradas, saídas, cadastros, edições e exclusões.', 'r-mov')}
      ${reportCard('Auditoria', 'Registro de auditoria completo, com responsáveis e variação de quantidades.', 'r-auditoria')}
    </div>
  `;
  document.getElementById('r-semanal-pdf').addEventListener('click', () => gerarRelatorioPeriodo('semanal','pdf'));
  document.getElementById('r-semanal-xlsx').addEventListener('click', () => gerarRelatorioPeriodo('semanal','xlsx'));
  document.getElementById('r-mensal-pdf').addEventListener('click', () => gerarRelatorioPeriodo('mensal','pdf'));
  document.getElementById('r-mensal-xlsx').addEventListener('click', () => gerarRelatorioPeriodo('mensal','xlsx'));
  document.getElementById('r-entradas-pdf').addEventListener('click', () => gerarRelatorioMovimentos('entrada','pdf'));
  document.getElementById('r-entradas-xlsx').addEventListener('click', () => gerarRelatorioMovimentos('entrada','xlsx'));
  document.getElementById('r-saidas-pdf').addEventListener('click', () => gerarRelatorioMovimentos('saida','pdf'));
  document.getElementById('r-saidas-xlsx').addEventListener('click', () => gerarRelatorioMovimentos('saida','xlsx'));
  document.getElementById('r-produtos-pdf').addEventListener('click', () => gerarRelatorioProdutos('pdf'));
  document.getElementById('r-produtos-xlsx').addEventListener('click', () => gerarRelatorioProdutos('xlsx'));
  document.getElementById('r-baixo-pdf').addEventListener('click', () => gerarRelatorioBaixoEstoque('pdf'));
  document.getElementById('r-baixo-xlsx').addEventListener('click', () => gerarRelatorioBaixoEstoque('xlsx'));
  document.getElementById('r-mov-pdf').addEventListener('click', () => gerarRelatorioMovimentacoes('pdf'));
  document.getElementById('r-mov-xlsx').addEventListener('click', () => gerarRelatorioMovimentacoes('xlsx'));
  document.getElementById('r-auditoria-pdf').addEventListener('click', () => gerarRelatorioAuditoria('pdf'));
  document.getElementById('r-auditoria-xlsx').addEventListener('click', () => gerarRelatorioAuditoria('xlsx'));
}

function reportCard(title, desc, id){
  return `<div class="report-card">
    <h4>${title}</h4><p>${desc}</p>
    <div class="btn-row">
      <button class="btn btn-ghost btn-sm" id="${id}-pdf">${icon('doc','width:14px;height:14px;')}PDF</button>
      <button class="btn btn-ghost btn-sm" id="${id}-xlsx">${icon('doc','width:14px;height:14px;')}Excel</button>
    </div>
  </div>`;
}

/* --- PDF helper: cabeçalho com logo --- */
function pdfHeader(doc, title, subtitle){
  if(logoState.dataUrl){ doc.addImage(logoState.dataUrl, 'PNG', 40, 30, 34, 34); }
  doc.setTextColor(18,58,99);
  doc.setFont('helvetica','bold'); doc.setFontSize(14);
  doc.text('APMI · Associação de Proteção à Maternidade e à Infância', 84, 46);
  doc.setFont('helvetica','normal'); doc.setFontSize(9.5); doc.setTextColor(90,105,120);
  doc.text('Controle de estoque de material de escritório', 84, 59);
  doc.setDrawColor(225,232,240); doc.line(40,76,doc.internal.pageSize.getWidth()-40,76);
  doc.setTextColor(18,58,99); doc.setFont('helvetica','bold'); doc.setFontSize(13);
  doc.text(title, 40, 96);
  if(subtitle){ doc.setFont('helvetica','normal'); doc.setFontSize(9.5); doc.setTextColor(90,105,120); doc.text(subtitle, 40, 111); }
  return subtitle ? 130 : 116;
}
function pdfFooter(doc){
  const pageCount = doc.internal.getNumberOfPages();
  for(let i=1;i<=pageCount;i++){
    doc.setPage(i);
    const h = doc.internal.pageSize.getHeight(), w = doc.internal.pageSize.getWidth();
    doc.setDrawColor(225,232,240); doc.line(40,h-40,w-40,h-40);
    doc.setFontSize(8); doc.setTextColor(140,152,166); doc.setFont('helvetica','normal');
    doc.text(`Gerado em ${new Date().toLocaleString('pt-BR')} · APMI Controle de Estoque`, 40, h-26);
    doc.text(`Página ${i} de ${pageCount}`, w-40, h-26, { align:'right' });
  }
}
function newPDF(){ const { jsPDF } = window.jspdf; return new jsPDF({ unit:'pt', format:'a4' }); }
function savePDF(doc, filename){ pdfFooter(doc); doc.save(filename); toast('Relatório PDF gerado.', 'success'); }

function saveXLSX(rows, sheetName, filename){
  const ws = window.XLSX.utils.json_to_sheet(rows);
  const wb = window.XLSX.utils.book_new();
  window.XLSX.utils.book_append_sheet(wb, ws, sheetName);
  window.XLSX.writeFile(wb, filename);
  toast('Relatório Excel gerado.', 'success');
}

/* --- Relatório semanal / mensal --- */
function gerarRelatorioPeriodo(tipo, formato){
  const end = new Date();
  const start = new Date();
  if(tipo==='semanal') start.setDate(start.getDate()-6); else start.setDate(1);
  start.setHours(0,0,0,0);
  const titulo = tipo==='semanal' ? 'Relatório Semanal de Estoque' : 'Relatório Mensal de Estoque';
  const periodo = `Período: ${fmtDateOnly(start.toISOString())} a ${fmtDateOnly(end.toISOString())}`;

  const entradasP = movementsInRange(start,end,['entrada']);
  const saidasP = movementsInRange(start,end,['saida']);
  const entradasQtd = entradasP.reduce((s,m)=>s+Number(m.quantidade||0),0);
  const saidasQtd = saidasP.reduce((s,m)=>s+Number(m.quantidade||0),0);
  const estoqueFinal = totalUnidades();
  const estoqueInicial = estoqueFinal - entradasQtd + saidasQtd;
  const reposicao = [...zeroStockProducts(), ...lowStockProducts()];

  if(formato==='pdf'){
    const doc = newPDF();
    let y = pdfHeader(doc, titulo, periodo);
    doc.autoTable({
      startY:y, theme:'plain',
      head:[['Estoque inicial','Entradas','Saídas','Estoque final']],
      body:[[estoqueInicial, '+'+entradasQtd, '-'+saidasQtd, estoqueFinal]],
      headStyles:{ fillColor:[228,238,247], textColor:[18,58,99], fontStyle:'bold' },
      styles:{ font:'helvetica', fontSize:10, cellPadding:8, halign:'center' },
      margin:{ left:40, right:40 }
    });
    y = doc.lastAutoTable.finalY + 26;
    doc.setFont('helvetica','bold'); doc.setFontSize(11.5); doc.setTextColor(18,58,99);
    doc.text('Produtos que necessitam de reposição', 40, y);
    doc.autoTable({
      startY:y+10,
      head:[['Produto','Categoria','Qtd. atual','Mínimo','Situação']],
      body: reposicao.length ? reposicao.map(p=>[p.nome,p.categoria,`${p.quantidade} ${p.unidade}`,`${p.estoqueMinimo} ${p.unidade}`, situacao(p)==='zero'?'Sem estoque':'Estoque baixo']) : [['Nenhum produto necessita reposição no momento.','','','','']],
      headStyles:{ fillColor:[20,73,125], textColor:255, fontStyle:'bold' },
      styles:{ font:'helvetica', fontSize:9.5, cellPadding:6 },
      margin:{ left:40, right:40 }
    });
    y = doc.lastAutoTable.finalY + 26;
    doc.setFont('helvetica','bold'); doc.setFontSize(11.5); doc.setTextColor(18,58,99);
    doc.text('Movimentações do período', 40, y);
    const movsPeriodo = [...entradasP,...saidasP].sort((a,b)=>new Date(a.data)-new Date(b.data));
    doc.autoTable({
      startY:y+10,
      head:[['Data','Tipo','Produto','Quantidade','Responsável']],
      body: movsPeriodo.length ? movsPeriodo.map(m=>[fmtDateOnly(m.data), m.tipo==='entrada'?'Entrada':'Saída', m.produtoNome, (m.tipo==='entrada'?'+':'-')+m.quantidade, m.responsavel]) : [['Nenhuma movimentação no período.','','','','']],
      headStyles:{ fillColor:[20,73,125], textColor:255, fontStyle:'bold' },
      styles:{ font:'helvetica', fontSize:9.5, cellPadding:6 },
      margin:{ left:40, right:40 }
    });
    savePDF(doc, `apmi_relatorio_${tipo}_${dateStamp()}.pdf`);
  } else {
    const resumo = [{ 'Estoque inicial':estoqueInicial, 'Entradas':entradasQtd, 'Saídas':saidasQtd, 'Estoque final':estoqueFinal, 'Período':periodo }];
    const reposicaoRows = reposicao.map(p=>({ Produto:p.nome, Categoria:p.categoria, 'Qtd. atual':p.quantidade, 'Estoque mínimo':p.estoqueMinimo, Situação: situacao(p)==='zero'?'Sem estoque':'Estoque baixo' }));
    const wb = window.XLSX.utils.book_new();
    window.XLSX.utils.book_append_sheet(wb, window.XLSX.utils.json_to_sheet(resumo), 'Resumo');
    window.XLSX.utils.book_append_sheet(wb, window.XLSX.utils.json_to_sheet(reposicaoRows.length?reposicaoRows:[{Info:'Nenhum produto necessita reposição'}]), 'Reposição');
    const movsPeriodo = [...entradasP,...saidasP].sort((a,b)=>new Date(a.data)-new Date(b.data)).map(m=>({ Data:fmtDateOnly(m.data), Tipo:m.tipo==='entrada'?'Entrada':'Saída', Produto:m.produtoNome, Quantidade:m.quantidade, Responsável:m.responsavel }));
    window.XLSX.utils.book_append_sheet(wb, window.XLSX.utils.json_to_sheet(movsPeriodo.length?movsPeriodo:[{Info:'Nenhuma movimentação no período'}]), 'Movimentações');
    window.XLSX.writeFile(wb, `apmi_relatorio_${tipo}_${dateStamp()}.xlsx`);
    toast('Relatório Excel gerado.', 'success');
  }
}

function gerarRelatorioMovimentos(tipo, formato){
  const list = state.movements.filter(m=>m.tipo===tipo).sort((a,b)=>new Date(b.data)-new Date(a.data));
  const titulo = tipo==='entrada' ? 'Relatório de Entradas' : 'Relatório de Saídas';
  if(formato==='pdf'){
    const doc = newPDF();
    let y = pdfHeader(doc, titulo, `${list.length} registro(s)`);
    doc.autoTable({
      startY:y,
      head: tipo==='entrada' ? [['Data','Produto','Qtd.','Fornecedor','Documento','Responsável']] : [['Data','Produto','Qtd.','Setor','Motivo','Responsável']],
      body: list.map(m => tipo==='entrada'
        ? [fmtDate(m.data), m.produtoNome, m.quantidade, m.fornecedor||'—', m.documento||'—', m.responsavel]
        : [fmtDate(m.data), m.produtoNome, m.quantidade, m.setor||'—', m.motivo||'—', m.responsavel]),
      headStyles:{ fillColor:[20,73,125], textColor:255, fontStyle:'bold' },
      styles:{ font:'helvetica', fontSize:9, cellPadding:6 },
      margin:{ left:40, right:40 }
    });
    savePDF(doc, `apmi_${tipo}s_${dateStamp()}.pdf`);
  } else {
    const rows = list.map(m => tipo==='entrada'
      ? { Data:fmtDate(m.data), Produto:m.produtoNome, Quantidade:m.quantidade, Fornecedor:m.fornecedor||'', Documento:m.documento||'', Responsável:m.responsavel, Observações:m.observacoes||'' }
      : { Data:fmtDate(m.data), Produto:m.produtoNome, Quantidade:m.quantidade, Setor:m.setor||'', Motivo:m.motivo||'', Responsável:m.responsavel, Observações:m.observacoes||'' });
    saveXLSX(rows, titulo, `apmi_${tipo}s_${dateStamp()}.xlsx`);
  }
}

function gerarRelatorioProdutos(formato){
  const list = [...state.products].sort((a,b)=>a.nome.localeCompare(b.nome,'pt-BR'));
  if(formato==='pdf'){
    const doc = newPDF();
    let y = pdfHeader(doc, 'Produtos Cadastrados', `${list.length} produto(s)`);
    doc.autoTable({
      startY:y,
      head:[['Produto','Categoria','Unidade','Qtd. atual','Mínimo','Situação','Cadastro']],
      body: list.map(p=>[p.nome,p.categoria,p.unidade,p.quantidade,p.estoqueMinimo, situacao(p)==='zero'?'Sem estoque':situacao(p)==='low'?'Estoque baixo':'Regular', fmtDateOnly(p.dataCadastro)]),
      headStyles:{ fillColor:[20,73,125], textColor:255, fontStyle:'bold' },
      styles:{ font:'helvetica', fontSize:9, cellPadding:6 },
      margin:{ left:40, right:40 }
    });
    savePDF(doc, `apmi_produtos_${dateStamp()}.pdf`);
  } else {
    const rows = list.map(p=>({ Produto:p.nome, Código:p.codigo, Categoria:p.categoria, Unidade:p.unidade, 'Qtd. atual':p.quantidade, 'Estoque mínimo':p.estoqueMinimo, Situação: situacao(p)==='zero'?'Sem estoque':situacao(p)==='low'?'Estoque baixo':'Regular', Cadastro:fmtDateOnly(p.dataCadastro), Observações:p.observacoes||'' }));
    saveXLSX(rows, 'Produtos', `apmi_produtos_${dateStamp()}.xlsx`);
  }
}

function gerarRelatorioBaixoEstoque(formato){
  const list = [...zeroStockProducts(), ...lowStockProducts()];
  if(formato==='pdf'){
    const doc = newPDF();
    let y = pdfHeader(doc, 'Produtos com Estoque Baixo', `${list.length} produto(s) precisam de atenção`);
    doc.autoTable({
      startY:y,
      head:[['Produto','Categoria','Qtd. atual','Mínimo','Situação']],
      body: list.length ? list.map(p=>[p.nome,p.categoria,`${p.quantidade} ${p.unidade}`,`${p.estoqueMinimo} ${p.unidade}`, situacao(p)==='zero'?'Sem estoque':'Estoque baixo']) : [['Nenhum produto com estoque baixo no momento.','','','','']],
      headStyles:{ fillColor:[201,103,47], textColor:255, fontStyle:'bold' },
      styles:{ font:'helvetica', fontSize:9.5, cellPadding:6 },
      margin:{ left:40, right:40 }
    });
    savePDF(doc, `apmi_estoque_baixo_${dateStamp()}.pdf`);
  } else {
    const rows = list.map(p=>({ Produto:p.nome, Categoria:p.categoria, 'Qtd. atual':p.quantidade, 'Estoque mínimo':p.estoqueMinimo, Situação: situacao(p)==='zero'?'Sem estoque':'Estoque baixo' }));
    saveXLSX(rows.length?rows:[{Info:'Nenhum produto com estoque baixo'}], 'Estoque baixo', `apmi_estoque_baixo_${dateStamp()}.xlsx`);
  }
}

function gerarRelatorioMovimentacoes(formato){
  const list = [...state.movements].sort((a,b)=>new Date(b.data)-new Date(a.data));
  if(formato==='pdf'){
    const doc = newPDF();
    let y = pdfHeader(doc, 'Relatório de Movimentações', `${list.length} registro(s)`);
    doc.autoTable({
      startY:y,
      head:[['Data','Tipo','Produto','Qtd.','Responsável','Descrição']],
      body: list.map(m=>[fmtDate(m.data), movTagLabel(m.tipo), m.produtoNome, m.quantidade??'—', m.responsavel, m.descricao||'']),
      headStyles:{ fillColor:[20,73,125], textColor:255, fontStyle:'bold' },
      styles:{ font:'helvetica', fontSize:8.5, cellPadding:5 },
      columnStyles:{ 5:{ cellWidth:170 } },
      margin:{ left:40, right:40 }
    });
    savePDF(doc, `apmi_movimentacoes_${dateStamp()}.pdf`);
  } else {
    const rows = list.map(m=>({ Data:fmtDate(m.data), Tipo:movTagLabel(m.tipo), Produto:m.produtoNome, Quantidade:m.quantidade??'', Responsável:m.responsavel, Descrição:m.descricao||'' }));
    saveXLSX(rows, 'Movimentações', `apmi_movimentacoes_${dateStamp()}.xlsx`);
  }
}

function gerarRelatorioAuditoria(formato){
  const list = [...state.movements].sort((a,b)=>new Date(b.data)-new Date(a.data));
  if(formato==='pdf'){
    const doc = newPDF();
    let y = pdfHeader(doc, 'Relatório de Auditoria', `${list.length} registro(s)`);
    doc.autoTable({
      startY:y,
      head:[['Usuário','Data/Hora','Produto','Ação','Qtd. ant.','Qtd. alt.','Qtd. post.']],
      body: list.map(m=>[m.responsavel, fmtDate(m.data), m.produtoNome, movTagLabel(m.tipo), m.qtdAnterior??'—', m.quantidade??'—', m.qtdPosterior??'—']),
      headStyles:{ fillColor:[20,73,125], textColor:255, fontStyle:'bold' },
      styles:{ font:'helvetica', fontSize:8.5, cellPadding:5 },
      margin:{ left:40, right:40 }
    });
    savePDF(doc, `apmi_auditoria_${dateStamp()}.pdf`);
  } else {
    const rows = list.map(m=>({ Usuário:m.responsavel, 'Data/Hora':fmtDate(m.data), Produto:m.produtoNome, Ação:movTagLabel(m.tipo), 'Qtd. anterior':m.qtdAnterior??'', 'Qtd. alterada':m.quantidade??'', 'Qtd. posterior':m.qtdPosterior??'', Descrição:m.descricao||'' }));
    saveXLSX(rows, 'Auditoria', `apmi_auditoria_${dateStamp()}.xlsx`);
  }
}
