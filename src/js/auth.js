/* ============================================================
   APMI · Controle de Estoque — src/js/auth.js
   Login, logout e verificação de permissões por perfil de acesso.
   ============================================================ */
import { state } from './config.js';

export function currentUser(){ return state.session; }

export function can(action){
  const role = state.session && state.session.papel;
  if(!role) return false;
  if(role === 'Administrador') return true;
  if(role === 'Usuário para Consulta') return false; // somente leitura
  // Responsável pelo Estoque: tudo, exceto gestão de usuários
  if(action === 'manage-users') return false;
  return true;
}

export function doLogin(usuario, senha){
  const u = state.users.find(u => u.usuario.toLowerCase() === usuario.trim().toLowerCase() && u.senha === senha);
  if(!u) return false;
  state.session = { id:u.id, nome:u.nome, usuario:u.usuario, papel:u.papel };
  return true;
}

export function doLogout(){
  state.session = null;
  document.getElementById('app-screen').style.display = 'none';
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('login-user').value = '';
  document.getElementById('login-pass').value = '';
}
