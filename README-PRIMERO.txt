NYVRA SCAN — PRIMERA VERSIÓN
============================

IMPORTANTE
Esta carpeta contiene una primera versión funcional de la interfaz estática.
Antes de que el catálogo, el login y el panel puedan conectarse, debes completar
config.js con la URL y la clave PUBLICABLE/anon de tu proyecto Supabase.

1) CONFIGURAR SUPABASE
- Entra a Supabase > proyecto Nyvra Scan > Project Settings > API.
- Copia Project URL.
- Copia la clave publishable (o anon si tu panel todavía muestra ese nombre).
- Abre config.js con el Bloc de notas.
- Reemplaza los dos textos PEGA_AQUI...
- Guarda el archivo.

NO uses la clave service_role ni una secret key en config.js. Nunca compartas
contraseñas, service_role keys ni tokens privados.

2) SUBIR A CLOUDFLARE
- En Cloudflare > Workers & Pages > Create > Pages > Upload your static files.
- Sube el CONTENIDO de esta carpeta (o arrastra la carpeta).
- Asigna un nombre de proyecto, por ejemplo nyvra-scan.
- Completa el deploy. Cloudflare te dará una dirección *.pages.dev.

3) CONFIGURAR REDIRECCIONES EN SUPABASE
Cuando tengas la dirección pages.dev:
- Authentication > URL Configuration.
- Site URL: pega la dirección HTTPS exacta de tu web.
- Redirect URLs: agrega también la misma dirección y, si corresponde,
  https://TU-PROYECTO.pages.dev/**.
- Guarda los cambios.
No uses localhost ni https://localhost.

4) ADMINISTRADORES
La web solo muestra el panel a usuarios que existan en Auth y estén incluidos
en public.nyvra_admins. Cada persona debe tener su propia cuenta.
Luego, desde Supabase SQL Editor, se agrega el UUID de cada usuario:
  insert into public.nyvra_admins (user_id, email)
  values ('UUID_DEL_USUARIO', 'correo@ejemplo.com')
  on conflict (user_id) do update set email = excluded.email;

Obtén el UUID desde Authentication > Users. No compartas cuentas ni contraseñas.

5) NOTAS
- El lector presenta las imágenes en vertical.
- Las imágenes se guardan en el bucket privado nyvra-chapters.
- Las páginas se suben en el orden en que las selecciones.
- La portada usa una URL de imagen externa en esta primera versión.
- Para que las invitaciones funcionen, las redirecciones deben apuntar a la
  dirección real de Pages, no a localhost.
- Esta primera versión es una base inicial; antes de abrirla al público conviene
  probar login, permisos, subida y lectura de capítulos con cuentas de prueba.

Si algo falla, conserva el mensaje exacto del error y compártelo para corregirlo.
