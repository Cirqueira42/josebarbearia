-- Bloquear listagem do bucket (clientes só acessam URLs específicas)
DROP POLICY IF EXISTS "Gallery images are publicly accessible" ON storage.objects;

CREATE POLICY "Gallery images are publicly readable by path"
ON storage.objects FOR SELECT
USING (bucket_id = 'gallery');