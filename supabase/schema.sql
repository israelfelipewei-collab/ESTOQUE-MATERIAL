-- =========================================================
-- APMI · Estoque de Material de Escritório — Schema Supabase
-- Execute este script no SQL Editor do seu projeto Supabase.
--
-- Usa tabelas com sufixo "_escritorio" para conviver no mesmo
-- projeto Supabase do sistema de estoque de limpeza, sem conflito.
-- =========================================================

create extension if not exists pgcrypto;

-- ---------- PRODUTOS ----------
create table if not exists produtos_escritorio (
  id uuid primary key default gen_random_uuid(),
  codigo text not null,
  nome text not null,
  categoria text not null,
  unidade text not null,
  quantidade numeric not null default 0,
  estoque_minimo numeric not null default 0,
  observacoes text default '',
  data_cadastro timestamptz not null default now()
);

-- ---------- MOVIMENTAÇÕES (entradas, saídas, cadastro, edição, exclusão, ajuste) ----------
create table if not exists movimentacoes_escritorio (
  id uuid primary key default gen_random_uuid(),
  tipo text not null,
  produto_id uuid references produtos_escritorio(id) on delete set null,
  produto_nome text not null,
  quantidade numeric,
  qtd_anterior numeric,
  qtd_posterior numeric,
  responsavel text,
  fornecedor text default '',
  documento text default '',
  setor text default '',
  motivo text default '',
  observacoes text default '',
  descricao text default '',
  data timestamptz not null default now()
);

-- ---------- USUÁRIOS DO SISTEMA (login próprio da aplicação) ----------
create table if not exists usuarios_escritorio (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  usuario text not null unique,
  senha text not null,
  papel text not null
);

-- ---------- Row Level Security ----------
alter table produtos_escritorio enable row level security;
alter table movimentacoes_escritorio enable row level security;
alter table usuarios_escritorio enable row level security;

-- Políticas abertas para a chave anon (leitura e escrita).
-- ATENÇÃO: isso permite que qualquer pessoa com a chave anon leia/altere os dados.
-- Adequado apenas para uso interno com a chave não divulgada publicamente.
drop policy if exists "produtos_escritorio_all_anon" on produtos_escritorio;
create policy "produtos_escritorio_all_anon" on produtos_escritorio for all to anon using (true) with check (true);

drop policy if exists "movimentacoes_escritorio_all_anon" on movimentacoes_escritorio;
create policy "movimentacoes_escritorio_all_anon" on movimentacoes_escritorio for all to anon using (true) with check (true);

drop policy if exists "usuarios_escritorio_all_anon" on usuarios_escritorio;
create policy "usuarios_escritorio_all_anon" on usuarios_escritorio for all to anon using (true) with check (true);

-- ---------- Usuários iniciais de demonstração ----------
insert into usuarios_escritorio (nome, usuario, senha, papel) values
  ('Administrador', 'admin', 'apmi123', 'Administrador'),
  ('Responsável pelo Estoque', 'estoque', 'estoque123', 'Responsável pelo Estoque'),
  ('Consulta', 'consulta', 'consulta123', 'Usuário para Consulta')
on conflict (usuario) do nothing;

-- ---------- (Opcional) Produtos de exemplo — remova este bloco se não quiser dados de teste ----------
insert into produtos_escritorio (codigo, nome, categoria, unidade, quantidade, estoque_minimo, observacoes)
select * from (values
  ('P0001','Papel A4 (resma 500 folhas)','Papelaria','resma',40,15,''),
  ('P0002','Caneta Esferográfica Azul','Papelaria','cx',6,5,'Caixa com 50 unidades'),
  ('P0003','Toner Impressora HP 12A','Cartuchos e Toners','un',2,3,'Reposição urgente'),
  ('P0004','Grampeador Médio','Material de Escritório Geral','un',8,3,''),
  ('P0005','Bloco de Post-it','Papelaria','pct',12,6,''),
  ('P0006','Pasta Suspensa Kraft','Material de Escritório Geral','pct',20,8,''),
  ('P0007','Mouse USB','Informática e Eletrônicos','un',5,4,'')
) as v(codigo,nome,categoria,unidade,quantidade,estoque_minimo,observacoes)
where not exists (select 1 from produtos_escritorio);
