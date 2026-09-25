/* ============================================================
   APMI · Controle de Estoque — src/js/storage.js
   Camada de acesso a dados: chamadas REST ao Supabase (PostgREST)
   usando apenas fetch(), sem depender de nenhum SDK externo.
   ============================================================ */
import { SB_REST, SUPABASE_ANON_KEY, LOGO_PATH, state } from './config.js';
import { nowISO } from './utils.js';

async function sbRequest(table, method, { query='', body=null, prefer='return=representation' } = {}){
  const res = await fetch(SB_REST + table + query, {
    method,
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
      'Prefer': prefer,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if(!res.ok){
    let detail = '';
    try{ const j = await res.json(); detail = j.message || j.hint || JSON.stringify(j); }catch(e){}
    throw new Error(`Supabase (${table} ${method}) falhou: ${res.status} ${detail}`);
  }
  if(res.status === 204) return null;
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}
export const sbSelect = (table, query='?select=*') => sbRequest(table, 'GET', { query });
export const sbInsert = (table, row) => sbRequest(table, 'POST', { body: row });
export const sbUpdate = (table, id, row) => sbRequest(table, 'PATCH', { query: `?id=eq.${id}`, body: row });
export const sbDelete = (table, id) => sbRequest(table, 'DELETE', { query: `?id=eq.${id}`, prefer:'return=minimal' });

/* --- Conversão entre colunas do banco (snake_case) e o modelo do app (camelCase) --- */
export function dbToProduct(r){ return { id:r.id, codigo:r.codigo, nome:r.nome, categoria:r.categoria, unidade:r.unidade, quantidade:Number(r.quantidade), estoqueMinimo:Number(r.estoque_minimo), observacoes:r.observacoes||'', dataCadastro:r.data_cadastro }; }
export function productToDb(p){ return { codigo:p.codigo, nome:p.nome, categoria:p.categoria, unidade:p.unidade, quantidade:p.quantidade, estoque_minimo:p.estoqueMinimo, observacoes:p.observacoes||'' }; }
export function dbToMovement(r){ return { id:r.id, tipo:r.tipo, produtoId:r.produto_id, produtoNome:r.produto_nome, quantidade:r.quantidade===null?null:Number(r.quantidade), qtdAnterior:r.qtd_anterior===null?null:Number(r.qtd_anterior), qtdPosterior:r.qtd_posterior===null?null:Number(r.qtd_posterior), responsavel:r.responsavel, fornecedor:r.fornecedor||'', documento:r.documento||'', setor:r.setor||'', motivo:r.motivo||'', observacoes:r.observacoes||'', descricao:r.descricao||'', data:r.data }; }
export function movementToDb(m){ return { tipo:m.tipo, produto_id:m.produtoId||null, produto_nome:m.produtoNome, quantidade:m.quantidade, qtd_anterior:m.qtdAnterior, qtd_posterior:m.qtdPosterior, responsavel:m.responsavel, fornecedor:m.fornecedor||'', documento:m.documento||'', setor:m.setor||'', motivo:m.motivo||'', observacoes:m.observacoes||'', descricao:m.descricao||'' }; }
export function dbToUser(r){ return { id:r.id, nome:r.nome, usuario:r.usuario, senha:r.senha, papel:r.papel }; }
export function userToDb(u){ return { nome:u.nome, usuario:u.usuario, senha:u.senha, papel:u.papel }; }

/* ---------------- Carregamento inicial dos dados ---------------- */
export async function loadDB(){
  const [prod, mov, usr] = await Promise.all([
    sbSelect('produtos_escritorio', '?select=*&order=nome.asc'),
    sbSelect('movimentacoes_escritorio', '?select=*&order=data.desc'),
    sbSelect('usuarios_escritorio', '?select=*'),
  ]);
  state.products = (prod||[]).map(dbToProduct);
  state.movements = (mov||[]).map(dbToMovement);
  state.users = (usr||[]).map(dbToUser);
}

/* Insere uma movimentação no Supabase e no estado local; retorna o registro salvo. */
export async function insertMovement(fields){
  const m = Object.assign({ fornecedor:'', documento:'', setor:'', motivo:'', observacoes:'', data: nowISO() }, fields);
  const [row] = await sbInsert('movimentacoes_escritorio', movementToDb(m));
  const saved = dbToMovement(Object.assign({}, row, { data: row.data || m.data }));
  state.movements.unshift(saved);
  return saved;
}

/* ---------------- Logo como imagem real (public/assets/img/logo.png) ----------------
   A interface usa <img src="/assets/img/logo.png"> diretamente. Para os
   relatórios em PDF (jsPDF), a imagem precisa estar em base64 — por isso
   carregamos o arquivo uma vez, no início, e convertemos em memória.
   Exportamos um objeto (não uma variável solta) para que outros módulos
   sempre leiam o valor atualizado após preloadLogo() terminar. */
export const logoState = { dataUrl: null };
export async function preloadLogo(){
  try{
    const res = await fetch(LOGO_PATH);
    if(!res.ok) throw new Error('logo não encontrada em ' + LOGO_PATH);
    const blob = await res.blob();
    logoState.dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }catch(e){
    console.warn('Não foi possível carregar a logo para os relatórios PDF.', e);
  }
}
