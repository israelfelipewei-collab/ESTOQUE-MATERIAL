/* ============================================================
   APMI · Controle de Estoque — src/js/config.js
   Constantes, estado global e configuração do Supabase.

   As credenciais vêm de variáveis de ambiente (.env / .env.local),
   lidas em tempo de build pelo Vite via import.meta.env. Nada de
   credencial fica escrito neste arquivo.
   ============================================================ */

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if(!SUPABASE_URL || !SUPABASE_ANON_KEY){
  const msg = 'Configuração ausente: defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no arquivo .env.local (copie .env.example). Veja o README.md.';
  document.body.innerHTML = `<div style="font-family:sans-serif;padding:40px;color:#c0443a;max-width:560px;"><strong>Configuração ausente.</strong><br><br>${msg}</div>`;
  throw new Error(msg);
}

export const SB_REST = SUPABASE_URL + '/rest/v1/';

/* Arquivo estático servido pela pasta public/ (Vite copia como está). */
export const LOGO_PATH = '/assets/img/logo.png';

/* ---------------- Listas de apoio para formulários ---------------- */
export const CATEGORIAS = ['Papelaria','Informática e Eletrônicos','Cartuchos e Toners','Mobiliário de Escritório','Material de Escritório Geral','Outros'];
export const UNIDADES = ['un','cx','pct','resma','par','kit','rolo'];
export const SETORES = ['Berçário','Cozinha','Lavanderia','Enfermaria','Administração','Recepção','Área Externa','Outro'];
export const ROLES = ['Administrador','Responsável pelo Estoque','Usuário para Consulta'];

/* ---------------- Estado global da aplicação ---------------- */
export let state = {
  products: [],
  movements: [],
  users: [],
  session: null,
};

export let ui = {
  view: 'dashboard',
  productSearch: '', productCategoria: '', productSituacao: '',
  histSearch: '', histTipo: '', histResponsavel: '', histDataIni: '', histDataFim: '',
  auditSearch: '',
  sidebarOpen: false,
};

/* ---------------- Navegação lateral ---------------- */
export const NAV_ITEMS = [
  { id:'dashboard', label:'Painel', icon:'grid', desc:'Visão geral do estoque de material de escritório' },
  { id:'produtos', label:'Produtos e Estoque', icon:'box', desc:'Cadastro e níveis atuais de estoque' },
  { id:'entradas', label:'Entradas', icon:'in', desc:'Registro de recebimento de material' },
  { id:'saidas', label:'Saídas', icon:'out', desc:'Registro de retirada de material' },
  { id:'historico', label:'Histórico', icon:'clock', desc:'Todas as movimentações do estoque' },
  { id:'relatorios', label:'Relatórios', icon:'doc', desc:'Geração de relatórios em PDF e Excel' },
  { id:'auditoria', label:'Auditoria', icon:'shield', desc:'Rastreabilidade de ações no sistema' },
  { id:'usuarios', label:'Usuários', icon:'user', desc:'Contas e permissões de acesso', adminOnly:true },
];

/* ---------------- Ícones (SVG inline) ---------------- */
export const ICONS = {
  grid:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  box:'<path d="M21 8l-9-5-9 5 9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/>',
  in:'<path d="M12 3v12"/><path d="M7 10l5 5 5-5"/><path d="M4 21h16"/>',
  out:'<path d="M12 21V9"/><path d="M7 14l5-5 5 5"/><path d="M4 3h16"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>',
  doc:'<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/><path d="M9 13h6M9 17h6"/>',
  shield:'<path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-4z"/><path d="M9 12l2 2 4-4"/>',
  user:'<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"/>',
};
export function icon(name, extra){ return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ${extra||''}>${ICONS[name]||''}</svg>`; }
