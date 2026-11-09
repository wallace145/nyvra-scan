(() => {
  const cfg = window.NYVRA_CONFIG || {};
  const configured = cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY &&
    cfg.SUPABASE_URL.startsWith("https://") && !cfg.SUPABASE_URL.includes("PEGA_AQUI") &&
    !cfg.SUPABASE_ANON_KEY.includes("PEGA_AQUI");
  const $ = (id) => document.getElementById(id);
  let sb = null, currentUser = null, isAdmin = false, seriesCache = [], authMode = "login";
  const toast = (msg) => { const el=$("toast"); el.textContent=msg; el.classList.add("show"); setTimeout(()=>el.classList.remove("show"),3200); };
  const esc = (s="") => String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const slug = s => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
  $("year").textContent = new Date().getFullYear();

  async function init() {
    if (!configured || !window.supabase) {
      $("catalogGrid").innerHTML = '<div class="empty-state">La web ya está preparada. Falta conectar las credenciales de Supabase en <b>config.js</b> para cargar el catálogo y habilitar las cuentas.</div>';
      return;
    }
    sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
    const {data:{session}} = await sb.auth.getSession();
    currentUser = session?.user || null;
    await refreshUser();
    await loadSeries();
    sb.auth.onAuthStateChange(async (_event, session) => {
      currentUser = session?.user || null;
      await refreshUser();
      await loadSeries();
    });
  }
  async function refreshUser() {
    isAdmin = false;
    if (currentUser) {
      const {data,error} = await sb.from("nyvra_admins").select("user_id").eq("user_id",currentUser.id).maybeSingle();
      isAdmin = !!data && !error;
    }
    $("userLabel").textContent = currentUser ? (currentUser.email || "Cuenta") : "";
    $("authButton").textContent = currentUser ? "Cerrar sesión" : "Iniciar sesión";
    $("adminNav").hidden = !isAdmin;
    $("adminPanel").hidden = !isAdmin;
    if (isAdmin) await loadAdminSeries();
  }
  async function loadSeries() {
    if (!sb) return;
    const {data,error} = await sb.from("series").select("*").eq("is_published",true).order("created_at",{ascending:false});
    if (error) { $("catalogGrid").innerHTML='<div class="empty-state">No se pudo cargar el catálogo. Revisa las políticas RLS de Supabase.</div>'; return; }
    seriesCache = data || [];
    renderSeries();
  }
  function renderSeries() {
    const q = $("searchInput").value.toLowerCase().trim(), type = $("typeFilter").value;
    const rows = seriesCache.filter(s=>(!type||s.content_type===type) && (!q||`${s.title} ${s.description||""} ${(s.genres||[]).join(" ")}`.toLowerCase().includes(q)));
    $("catalogGrid").innerHTML = rows.length ? rows.map(s=>`<article class="series-card" data-id="${s.id}"><div class="cover">${s.cover_url?`<img src="${esc(s.cover_url)}" alt="">`:'<span class="cover-placeholder">N</span>'}</div><div class="series-info"><span class="series-type">${esc(s.content_type||"Obra")}</span><h3>${esc(s.title)}</h3><p>${esc((s.description||"Una nueva historia te espera.").slice(0,105))}</p><div class="tag-row">${(s.genres||[]).slice(0,3).map(g=>`<span class="tag">${esc(g)}</span>`).join("")}</div></div></article>`).join("") : '<div class="empty-state">Todavía no hay obras publicadas. Vuelve pronto.</div>';
    document.querySelectorAll(".series-card").forEach(el=>el.addEventListener("click",()=>openSeries(el.dataset.id)));
  }
  async function openSeries(id) {
    const s=seriesCache.find(x=>String(x.id)===String(id)); if(!s)return;
    const {data:chapters,error}=await sb.from("chapters").select("*").eq("series_id",id).eq("status","published").order("chapter_number",{ascending:false});
    if(error){toast("No se pudieron cargar los capítulos.");return;}
    $("readerTitle").textContent=s.title;
    $("readerPages").innerHTML = `<div class="series-info"><span class="series-type">${esc(s.content_type||"")}</span><h2>${esc(s.title)}</h2><p>${esc(s.description||"")}</p></div>` + (chapters||[]).map(c=>`<button class="btn btn-ghost chapter-open" data-id="${c.id}" style="margin:8px">${esc(c.title||"Capítulo "+c.chapter_number)}</button>`).join("") || '<div class="reader-error">Aún no hay capítulos publicados.</div>';
    $("reader").hidden=false;
    document.querySelectorAll(".chapter-open").forEach(b=>b.addEventListener("click",()=>openChapter(b.dataset.id)));
  }
  async function openChapter(id) {
    const {data:pages,error}=await sb.from("chapter_pages").select("page_number,image_path").eq("chapter_id",id).order("page_number");
    if(error){toast("No se pudieron cargar las páginas.");return;}
    const paths=(pages||[]).map(p=>p.image_path);
    const urls=[];
    for(const path of paths){const {data,error:e}=await sb.storage.from("nyvra-chapters").createSignedUrl(path,3600);if(!e&&data?.signedUrl)urls.push(data.signedUrl);}
    $("readerPages").innerHTML=urls.length?urls.map(u=>`<img src="${u}" loading="lazy" alt="Página del capítulo">`).join(""):'<div class="reader-error">No se pudieron mostrar las páginas de este capítulo.</div>';
    $("readerPages").scrollIntoView({behavior:"smooth"});
  }
  async function loadAdminSeries() {
    if(!isAdmin)return;
    const {data,error}=await sb.from("series").select("id,title,is_published").order("created_at",{ascending:false});
    if(error){$("adminSeriesList").textContent="No se pudieron cargar las obras.";return;}
    $("adminSeriesList").innerHTML=(data||[]).map(s=>`<div class="admin-series-item"><strong>${esc(s.title)}</strong><span>${s.is_published?"Publicada":"Borrador"}</span></div>`).join("") || "Todavía no agregaste obras.";
    $("seriesSelect").innerHTML='<option value="">Selecciona una obra</option>'+(data||[]).map(s=>`<option value="${s.id}">${esc(s.title)}</option>`).join("");
  }
  $("searchInput").addEventListener("input",renderSeries); $("typeFilter").addEventListener("change",renderSeries);
  $("authButton").addEventListener("click",async()=>{if(currentUser){await sb.auth.signOut();toast("Sesión cerrada.");}else{$("authModal").hidden=false;}});
  $("closeAuth").addEventListener("click",()=>$("authModal").hidden=true);
  document.querySelectorAll(".tab").forEach(b=>b.addEventListener("click",()=>{authMode=b.dataset.mode;document.querySelectorAll(".tab").forEach(x=>x.classList.toggle("active",x===b));$("authSubmit").textContent=authMode==="login"?"Entrar":"Crear cuenta";}));
  $("authForm").addEventListener("submit",async e=>{
    e.preventDefault(); if(!sb){toast("Primero configura Supabase.");return;}
    const fd=new FormData(e.currentTarget), email=fd.get("email"), password=fd.get("password");
    const result=authMode==="login"?await sb.auth.signInWithPassword({email,password}):await sb.auth.signUp({email,password,options:{emailRedirectTo:location.origin}});
    if(result.error){$("authMessage").textContent=result.error.message;return;}
    $("authMessage").textContent=authMode==="signup"?"Cuenta creada. Si Supabase solicita confirmación, revisa tu correo.":"Sesión iniciada.";
    if(authMode==="login"){$("authModal").hidden=true;toast("Bienvenido a Nyvra Scan.");}
  });
  $("seriesForm").addEventListener("submit",async e=>{
    e.preventDefault();if(!isAdmin)return toast("No tienes permisos de administrador.");
    const f=new FormData(e.currentTarget), title=f.get("title");
    const row={title,slug:slug(title)+"-"+Date.now().toString().slice(-5),content_type:f.get("content_type"),genres:f.get("genres").split(",").map(x=>x.trim()).filter(Boolean),description:f.get("description"),cover_url:f.get("cover_url")||null,is_published:f.get("is_published")==="on",created_by:currentUser.id};
    const {error}=await sb.from("series").insert(row);
    if(error){toast("Error al guardar: "+error.message);return;}
    e.currentTarget.reset();toast("Obra guardada.");await loadSeries();await loadAdminSeries();
  });
  $("chapterForm").addEventListener("submit",async e=>{
    e.preventDefault();if(!isAdmin)return toast("No tienes permisos de administrador.");
    const f=new FormData(e.currentTarget), files=[...f.getAll("pages")].filter(x=>x instanceof File&&x.size);
    if(!files.length)return toast("Selecciona las imágenes del capítulo.");
    const {data:chapter,error}=await sb.from("chapters").insert({series_id:f.get("series_id"),chapter_number:Number(f.get("chapter_number")),title:f.get("title")||null,status:f.get("publish")==="on"?"published":"draft",published_at:f.get("publish")==="on"?new Date().toISOString():null,created_by:currentUser.id}).select().single();
    if(error){toast("No se pudo crear el capítulo: "+error.message);return;}
    for(let i=0;i<files.length;i++){
      const ext=(files[i].name.split(".").pop()||"jpg").replace(/[^a-z0-9]/gi,"");
      const path=`${chapter.id}/${String(i+1).padStart(4,"0")}.${ext}`;
      const up=await sb.storage.from("nyvra-chapters").upload(path,files[i],{upsert:false,contentType:files[i].type||"image/jpeg"});
      if(up.error){toast("Error al subir la imagen "+(i+1)+": "+up.error.message);return;}
      const ins=await sb.from("chapter_pages").insert({chapter_id:chapter.id,page_number:i+1,image_path:path});
      if(ins.error){toast("Imagen subida, pero no se guardó su registro: "+ins.error.message);return;}
    }
    e.currentTarget.reset();toast("Capítulo cargado correctamente.");await loadAdminSeries();
  });
  $("closeReader").addEventListener("click",()=>$("reader").hidden=true);
  $("homeLink").addEventListener("click",()=>window.scrollTo({top:0,behavior:"smooth"}));
  init();
})();