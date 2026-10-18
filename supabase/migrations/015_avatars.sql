-- Bucket privado (igual ao "nfes"/"comprovantes") pra guardar a foto de
-- perfil de cada usuário — o caminho do arquivo é o próprio nome de usuário.
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', false)
on conflict (id) do nothing;
