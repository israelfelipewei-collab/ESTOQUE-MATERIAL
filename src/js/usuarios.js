/* ============================================================
   APMI · Controle de Estoque — src/js/usuarios.js
   Gestão de usuários e perfis de acesso (somente Administrador).
   ============================================================ */
import { state, ui, ROLES, icon } from './config.js';
import { escapeHtml, toast } from './utils.js';
import { openModal, closeModal, openConfirmModal } from './ui-helpers.js';
import { can, currentUser } from './auth.js';
import { sbInsert, sbUpdate, sbDelete } from './storage.js';

export function renderUsuarios(){
  if(!can('manage-users')){ ui.view='dashboard'; window.dispatchEvent(new CustomEvent('apmi:refresh')); return; }
  document.getElementById('topbar-actions').innerHTML = `<button class="btn btn-coral btn-sm" id="btn-new-user">${icon('user','width:15px;height:15px;')}Novo usuário</button>`;

  const badgeClass = { 'Administrador':'badge-admin', 'Responsável pelo Estoque':'badge-resp', 'Usuário para Consulta':'badge-view' };

  document.getElementById('view-content').innerHTML = `
    <div class="section-note">${icon('user','width:16px;height:16px;')}Administradores têm acesso completo, incluindo auditoria e gestão de usuários. Responsáveis pelo estoque podem operar o sistema, mas não gerenciar usuários. Usuários de consulta apenas visualizam.</div>
    <div class="table-wrap"><div class="tbl-scroll">
      <table><thead><tr><th>Nome</th><th>Usuário</th><th>Perfil de acesso</th><th></th></tr></thead>
      <tbody>
      ${state.users.map(u => `
        <tr>
          <td style="font-weight:600;">${escapeHtml(u.nome)}</td>
          <td class="mono">${escapeHtml(u.usuario)}</td>
          <td><span class="badge-role ${badgeClass[u.papel]}">${u.papel}</span></td>
          <td>
            <div class="row-actions">
              <button class="icon-btn" title="Editar" data-edit-user="${u.id}">${icon('doc','width:14px;height:14px;')}</button>
              ${u.id !== currentUser().id ? `<button class="icon-btn danger" title="Excluir" data-del-user="${u.id}">${icon('shield','width:14px;height:14px;')}</button>` : ''}
            </div>
          </td>
        </tr>
      `).join('')}
      </tbody></table>
    </div></div>
  `;
  document.getElementById('btn-new-user').addEventListener('click', () => openUserModal());
  document.querySelectorAll('[data-edit-user]').forEach(b => b.addEventListener('click', () => openUserModal(b.dataset.editUser)));
  document.querySelectorAll('[data-del-user]').forEach(b => b.addEventListener('click', () => {
    const u = state.users.find(x=>x.id===b.dataset.delUser);
    openConfirmModal({
      title:'Excluir usuário', message:`Tem certeza que deseja excluir o usuário "${u.nome}"?`, confirmLabel:'Excluir usuário',
      onConfirm: async () => {
        await sbDelete('usuarios_escritorio', u.id);
        state.users = state.users.filter(x=>x.id!==u.id);
        toast('Usuário excluído.', 'success');
        closeModal();
        renderUsuarios();
      }
    });
  }));
}

function openUserModal(id){
  const editing = !!id;
  const u = editing ? state.users.find(x=>x.id===id) : null;
  const box = document.getElementById('modal-box');
  box.innerHTML = `
    <div class="modal-head">
      <div><h3>${editing?'Editar usuário':'Novo usuário'}</h3><p>Defina o nível de permissão de acesso ao sistema.</p></div>
      <button class="modal-close" id="m-close">${icon('shield','width:18px;height:18px;')}</button>
    </div>
    <div class="modal-body">
      <div class="field"><label>Nome completo</label><input type="text" id="uf-nome" value="${editing?escapeHtml(u.nome):''}"></div>
      <div class="form-row">
        <div class="field"><label>Usuário (login)</label><input type="text" id="uf-usuario" value="${editing?escapeHtml(u.usuario):''}"></div>
        <div class="field"><label>Senha</label><input type="text" id="uf-senha" value="${editing?escapeHtml(u.senha):''}" placeholder="Senha de acesso"></div>
      </div>
      <div class="field"><label>Perfil de acesso</label>
        <select id="uf-papel">${ROLES.map(r=>`<option value="${r}" ${editing&&u.papel===r?'selected':''}>${r}</option>`).join('')}</select>
      </div>
    </div>
    <div class="modal-foot">
      <button class="btn btn-ghost" id="m-cancel">Cancelar</button>
      <button class="btn btn-primary" id="m-save">${editing?'Salvar alterações':'Criar usuário'}</button>
    </div>
  `;
  openModal();
  document.getElementById('m-close').addEventListener('click', closeModal);
  document.getElementById('m-cancel').addEventListener('click', closeModal);
  document.getElementById('m-save').addEventListener('click', async () => {
    const nome = document.getElementById('uf-nome').value.trim();
    const usuario = document.getElementById('uf-usuario').value.trim();
    const senha = document.getElementById('uf-senha').value;
    const papel = document.getElementById('uf-papel').value;
    if(!nome || !usuario || !senha){ toast('Preencha todos os campos.', 'error'); return; }
    const dup = state.users.find(x => x.usuario.toLowerCase()===usuario.toLowerCase() && x.id !== id);
    if(dup){ toast('Já existe um usuário com esse login.', 'error'); return; }
    try{
      if(editing){
        await sbUpdate('usuarios_escritorio', id, { nome, usuario, senha, papel });
        Object.assign(u, { nome, usuario, senha, papel });
        toast('Usuário atualizado.', 'success');
      } else {
        const [row] = await sbInsert('usuarios_escritorio', { nome, usuario, senha, papel });
        state.users.push({ id:row.id, nome, usuario, senha, papel });
        toast('Usuário criado.', 'success');
      }
      closeModal();
      renderUsuarios();
    }catch(err){
      console.error(err);
      toast('Não foi possível salvar: verifique sua conexão com o Supabase.', 'error');
    }
  });
}
