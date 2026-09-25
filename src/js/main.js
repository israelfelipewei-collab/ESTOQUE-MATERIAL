/* ============================================================
   APMI · Controle de Estoque — src/js/main.js
   Ponto de entrada carregado pelo index.html
   (<script type="module" src="/src/js/main.js">).
   ============================================================ */
import './config.js';
import { escapeHtml } from './utils.js';
import { doLogin, doLogout } from './auth.js';
import { loadDB, preloadLogo } from './storage.js';
import { closeModal } from './ui-helpers.js';
import { renderAll } from './ui-shell.js';

document.getElementById('modal-overlay').addEventListener('click', (e) => {
  if(e.target.id === 'modal-overlay') closeModal();
});

document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const usuario = document.getElementById('login-user').value;
  const senha = document.getElementById('login-pass').value;
  const errEl = document.getElementById('login-error');
  if(doLogin(usuario, senha)){
    errEl.style.display = 'none';
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('app-screen').style.display = 'block';
    renderAll();
  } else {
    errEl.textContent = 'Usuário ou senha inválidos.';
    errEl.style.display = 'block';
  }
});

document.getElementById('logout-btn').addEventListener('click', doLogout);

document.getElementById('hamburger-btn').addEventListener('click', () => {
  document.getElementById('sidebar').classList.toggle('open');
});

/* ---------------- Inicialização ---------------- */
(async function init(){
  const submitBtn = document.querySelector('#login-form button[type="submit"]');
  const errEl = document.getElementById('login-error');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Conectando ao Supabase...';
  try{
    await Promise.all([ loadDB(), preloadLogo() ]);
    submitBtn.disabled = false;
    submitBtn.textContent = 'Entrar';
  }catch(err){
    console.error(err);
    submitBtn.textContent = 'Entrar';
    submitBtn.disabled = false;
    errEl.innerHTML = 'Não foi possível conectar ao Supabase. Verifique se o script SQL foi executado no projeto e se VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY estão corretas no seu .env.local.<br><span style="font-size:11px;opacity:.8;">' + escapeHtml(err.message) + '</span>';
    errEl.style.display = 'block';
  }
})();
