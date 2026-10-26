/* HSM Chile - comportamiento del sitio. El contenido ya viene en el HTML: este archivo solo agrega menús, carrusel, búsqueda, pestañas y formulario. */
(function () {
  "use strict";
  var O = window.HSM || {}, RAIZ = O.raiz || "/";
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var norm = function (s) { return (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim(); };
  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };

  /* ---------- cookies: el visitante elige qué activa; las etiquetas de Google se cargan solo si acepta (Ley 21.719) ---------- */
  var COOKIE = "hsm_cookies";
  function leerEleccion() {                       // {m: medición (Analytics), p: publicidad (Ads)} o null si aún no decidió (o si debe volver a preguntarse)
    try {
      var v = sessionStorage.getItem(COOKIE);      // rechazo hecho en esta visita
      if (v) { var r = JSON.parse(v); return { m: !!r.m, p: !!r.p }; }
      v = localStorage.getItem(COOKIE); if (!v) { return null; }
      if (v === "si") { return { m: true, p: true }; } if (v === "no") { return { m: false, p: false }; }
      var o = JSON.parse(v), rechazo = !o.m && !o.p;
      if (rechazo && O.ck_rep === "visita") { return null; }                                   // volver a preguntar en cada visita
      if (rechazo && O.ck_rep === "90" && o.t && (Date.now() - o.t) > 90 * 86400000) { return null; }   // o a los 90 días
      return { m: !!o.m, p: !!o.p };
    } catch (e) { return null; }
  }
  function guardarEleccion(m, p) {
    var d = JSON.stringify({ m: m, p: p, t: Date.now() });
    try {
      localStorage.removeItem(COOKIE); sessionStorage.removeItem(COOKIE);
      if (!m && !p && O.ck_rep === "visita") { sessionStorage.setItem(COOKIE, d); } else { localStorage.setItem(COOKIE, d); }
    } catch (e) {}
  }
  var cargadas = { m: false, p: false }, gtmCargado = false;
  function idDe(tipo) { return tipo === "m" ? O.ga4 : O.ads; }
  function cargarEtiquetas(el) {
    window.dataLayer = window.dataLayer || [];
    if (!window.gtag) { window.gtag = function () { window.dataLayer.push(arguments); }; }
    ["m", "p"].forEach(function (t) {
      var id = idDe(t); if (!el[t] || !id || cargadas[t]) { return; }
      if (!gtmCargado) { var s = document.createElement("script"); s.async = true; s.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(id); document.head.appendChild(s); window.gtag("js", new Date()); gtmCargado = true; }
      window.gtag("config", id); cargadas[t] = true;
    });
    if (window.HSM_GRACIAS_PENDIENTE && cargadas.p) { window.HSM_GRACIAS_PENDIENTE(); }
  }
  function borrarCookiesGoogle() {
    var hosts = [location.hostname, "." + location.hostname, "." + location.hostname.split(".").slice(-2).join(".")];
    document.cookie.split(";").forEach(function (c) {
      var n = c.split("=")[0].trim();
      if (/^(_ga|_gid|_gat|_gcl|FPLC|_dc_gtm)/.test(n)) { hosts.forEach(function (h) { document.cookie = n + "=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=" + h; }); document.cookie = n + "=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/"; }
    });
  }
  var aviso = document.getElementById("aviso-cookies"), panel = document.getElementById("panel-cookies");
  function ocultarTodo() { if (aviso) { aviso.hidden = true; } if (panel) { panel.hidden = true; } }
  function decidir(m, p) {
    guardarEleccion(m, p); ocultarTodo();
    if ((cargadas.m && !m) || (cargadas.p && !p)) { borrarCookiesGoogle(); location.reload(); return; }   // se quita lo que ya estaba activo
    cargarEtiquetas({ m: m, p: p });
  }
  function abrirPanel() {
    if (!panel) { return; }
    var e = leerEleccion() || { m: O.ck_pre !== false, p: O.ck_pre !== false };   // sin decisión previa: activados o no según el ajuste
    var cm = panel.querySelector("[data-cookie=m]"), cp = panel.querySelector("[data-cookie=p]");
    if (cm) { cm.checked = e.m; } if (cp) { cp.checked = e.p; }
    if (aviso) { aviso.hidden = true; } panel.hidden = false; var b = panel.querySelector(".pc-todas"); if (b) { b.focus(); }
  }
  function cerrarPanel() { panel.hidden = true; if (!leerEleccion() && aviso) { aviso.hidden = false; } }
  if (aviso && panel) {
    var e0 = leerEleccion();
    if (e0) { cargarEtiquetas(e0); } else { aviso.hidden = false; }
    aviso.querySelector(".ac-si").addEventListener("click", function () { decidir(true, true); });
    aviso.querySelector(".ac-admin").addEventListener("click", abrirPanel);
    panel.querySelector(".pc-todas").addEventListener("click", function () { decidir(true, true); });
    panel.querySelector(".pc-ninguna").addEventListener("click", function () { decidir(false, false); });
    panel.querySelector(".pc-seleccion").addEventListener("click", function () {
      var cm = panel.querySelector("[data-cookie=m]"), cp = panel.querySelector("[data-cookie=p]"); decidir(!!(cm && cm.checked), !!(cp && cp.checked));
    });
    panel.addEventListener("click", function (e) { if (e.target === panel) { cerrarPanel(); } });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !panel.hidden) { cerrarPanel(); } });
  }
  document.addEventListener("click", function (e) { var b = e.target.closest && e.target.closest(".cambiar-cookies"); if (b) { abrirPanel(); } });

  /* ---------- medición (Google Analytics 4 y Google Ads) ---------- */
  window.dataLayer = window.dataLayer || [];
  function ev(nombre, datos, conv) {
    datos = datos || {};
    var o = { event: nombre }; for (var k in datos) { o[k] = datos[k]; }
    window.dataLayer.push(o);
    if (typeof window.gtag === "function") {
      window.gtag("event", nombre, datos);
      if (conv && O.ads && cargadas.p) { window.gtag("event", "conversion", { send_to: O.ads + "/" + conv }); }
    }
  }
  try {
    var q = new URLSearchParams(location.search), g = {};
    ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "gclid", "gbraid", "wbraid"].forEach(function (k) { if (q.get(k)) { g[k] = q.get(k); } });
    if (Object.keys(g).length) { sessionStorage.setItem("hsm_utm", JSON.stringify(g)); }
  } catch (e) {}
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("a"); if (!a) { return; }
    var h = a.getAttribute("href") || "";
    if (h.indexOf("tel:") === 0) { ev("click_llamar", { numero: h.slice(4) }, O.conv_llamada); }
    else if (h.indexOf("wa.me") > -1 || h.indexOf("api.whatsapp.com") > -1) { ev("click_whatsapp", {}, O.conv_wsp); }
    else if (h.indexOf("mailto:") === 0) { ev("click_correo", {}); }
    else if (/\.pdf(\?|#|$)/i.test(h)) { ev("ver_ficha_tecnica", { archivo: h.split("/").pop().split("#")[0] }); }
  });
  function conversionFormulario() {
    try { if (sessionStorage.getItem("hsm_lead_ok")) { return; } sessionStorage.setItem("hsm_lead_ok", "1"); } catch (e) {}
    ev("generate_lead", { form: "contacto" }, O.conv_form);
  }
  if (window.HSM_GRACIAS) { if (typeof window.gtag === "function" && cargadas.p) { conversionFormulario(); } else { window.HSM_GRACIAS_PENDIENTE = conversionFormulario; } }

  /* ---------- cabecera: menú móvil ---------- */
  var tog = $(".mobile-menu-toggle"), nav = $(".nav-header");
  if (tog && nav) {
    tog.addEventListener("click", function () { var a = nav.classList.toggle("open"); tog.setAttribute("aria-expanded", a ? "true" : "false"); });
    $$("a", nav).forEach(function (a) { a.addEventListener("click", function () { nav.classList.remove("open"); tog.setAttribute("aria-expanded", "false"); }); });
  }

  /* ---------- menú de categorías de la portada (acordeón en celulares; en escritorio se abre con el cursor) ---------- */
  var sm = $(".second-menu");
  if (sm) {
    var ABAJO = $(".accordion-icon", sm) ? $(".accordion-icon", sm).innerHTML : "";
    var ARRIBA = ABAJO.replace(/d="[^"]*"/, 'd="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z"');
    function alternar(li, ev) {
      if (window.innerWidth > 900) { return; }
      var caja = li.querySelector(":scope > .second-menu__submenu, :scope > .second-menu__submenu-list"); if (!caja) { return; }
      if (ev) { ev.preventDefault(); }
      var abierto = caja.classList.toggle("open"); var u = caja.querySelector(":scope > .second-menu__submenu-list"); if (u && caja.classList.contains("second-menu__submenu")) { u.classList.toggle("open", abierto); }
      var ic = li.querySelector(":scope > .menu-item-wrapper > .accordion-icon"); if (ic) { ic.innerHTML = abierto ? ARRIBA : ABAJO; }
    }
    $$(".second-menu__item, .second-menu__submenu-item", sm).forEach(function (li) {
      var tiene = li.querySelector(":scope > .second-menu__submenu, :scope > .second-menu__submenu-list"); if (!tiene) { return; }
      var a = li.querySelector(":scope > .menu-item-wrapper > a"), ic = li.querySelector(":scope > .menu-item-wrapper > .accordion-icon");
      if (a) { a.addEventListener("click", function (e) { alternar(li, e); }); }
      if (ic) { ic.addEventListener("click", function (e) { e.stopPropagation(); if (window.innerWidth > 900) { return; } alternar(li, e); }); ic.addEventListener("keydown", function (e) { if (e.key === "Enter") { alternar(li, e); } }); }
    });
  }

  /* ---------- búsqueda (sugerencias al escribir; al enviar se abre la página de resultados) ---------- */
  var indice = null;
  function cargarIndice(cb) {
    if (indice) { return cb(indice); }
    fetch(RAIZ + "buscar-indice.json").then(function (r) { return r.json(); }).then(function (d) { indice = d; cb(d); }).catch(function () { indice = []; cb([]); });
  }
  function buscar(txt, d, max) {
    var t = norm(txt).split(" ").filter(Boolean); if (!t.length) { return []; }
    var r = d.filter(function (p) { return t.every(function (w) { return p.k.indexOf(w) > -1; }); });
    r.sort(function (a, b) { var x = norm(a.s) === norm(txt) ? 0 : 1, y = norm(b.s) === norm(txt) ? 0 : 1; return x - y; });
    return max ? r.slice(0, max) : r;
  }
  $$(".search-form").forEach(function (f) {
    var inp = $(".search-input", f), cont = f.parentNode, lista = null, t = null, sel = -1;
    function cerrar() { if (lista) { lista.remove(); lista = null; sel = -1; } }
    inp.addEventListener("input", function () {
      clearTimeout(t);
      t = setTimeout(function () {
        if (inp.value.trim().length < 2) { cerrar(); return; }
        cargarIndice(function (d) {
          var r = buscar(inp.value, d, 6); cerrar(); if (!r.length) { return; }
          lista = document.createElement("ul"); lista.className = "search-suggestions";
          lista.innerHTML = r.map(function (p, i) { return '<li class="search-suggestion-item" data-u="' + esc(p.u) + '"><img src="' + esc(p.t) + '" alt="" class="suggestion-image" width="40" height="40"><div class="suggestion-info"><span class="suggestion-name">' + esc(p.n) + "</span>" + (p.s ? '<span class="suggestion-sku">SKU: ' + esc(p.s) + "</span>" : "") + "</div></li>"; }).join("");
          cont.appendChild(lista);
          $$("li", lista).forEach(function (li) { li.addEventListener("mousedown", function () { location.href = li.getAttribute("data-u"); }); });
        });
      }, 150);
    });
    inp.addEventListener("keydown", function (e) {
      if (!lista) { return; } var li = $$("li", lista);
      if (e.key === "ArrowDown") { e.preventDefault(); sel = (sel + 1) % li.length; } else if (e.key === "ArrowUp") { e.preventDefault(); sel = (sel - 1 + li.length) % li.length; } else if (e.key === "Escape") { cerrar(); return; } else { return; }
      li.forEach(function (x, i) { x.classList.toggle("selected", i === sel); });
    });
    inp.addEventListener("blur", function () { setTimeout(cerrar, 200); });
    f.addEventListener("submit", function (e) {
      if (lista && sel >= 0) { e.preventDefault(); location.href = $$("li", lista)[sel].getAttribute("data-u"); return; }
      var v = inp.value.trim(); if (!v) { e.preventDefault(); }
    });
  });
  var rb = $("#buscar-resultados");
  if (rb) {
    var qq = new URLSearchParams(location.search).get("q") || "";
    $("#buscar-titulo").textContent = qq ? "Resultados para “" + qq + "”" : "Resultados de búsqueda";
    cargarIndice(function (d) {
      var r = buscar(qq, d);
      rb.innerHTML = r.map(function (p) { return '<div class="product-card"><a class="product-link" href="' + esc(p.u) + '"><img alt="' + esc(p.n) + '" loading="lazy" src="' + esc(p.t) + '" width="400" height="400"><h3>' + esc(p.n) + "</h3></a></div>"; }).join("");
      $("#buscar-vacio").hidden = r.length > 0;
    });
  }

  /* ---------- carrusel de la portada ---------- */
  var hero = $(".hero-container[data-slides]");
  if (hero) {
    var slides = JSON.parse(hero.getAttribute("data-slides")), img = $(".hero-image", hero), enlace = img.parentNode, dots = $$(".dot", hero), i = 0, timer = null;
    function ir(n) {
      i = (n + slides.length) % slides.length; var s = slides[i];
      img.srcset = s.d1 + " 1280w, " + s.d2 + " 2560w"; img.src = s.d1; img.alt = s.alt || ""; img.removeAttribute("fetchpriority"); enlace.setAttribute("href", s.href);
      dots.forEach(function (d, k) { d.classList.toggle("active", k === i); }); auto();
    }
    function auto() { clearInterval(timer); timer = setInterval(function () { ir(i + 1); }, 5000); }
    $(".nav-button.left", hero).addEventListener("click", function () { ir(i - 1); }); $(".nav-button.right", hero).addEventListener("click", function () { ir(i + 1); });
    dots.forEach(function (d, k) { d.addEventListener("click", function () { ir(k); }); d.addEventListener("keydown", function (e) { if (e.key === "Enter") { ir(k); } }); });
    // los demás banners se cargan después de que la página termina de pintarse
    window.addEventListener("load", function () { slides.slice(1).forEach(function (s) { (new Image()).src = s.d1; }); auto(); });
  }

  /* ---------- ficha de producto ---------- */
  var gal = $(".producto-gallery");
  if (gal) {
    var main = $(".main-image", gal), th = $$(".thumbnail", gal), k = 0;
    function mostrar(n) { if (!th.length) { return; } k = (n + th.length) % th.length; main.src = th[k].getAttribute("data-grande"); main.alt = th[k].getAttribute("data-alt") || th[k].alt; th.forEach(function (t, j) { t.classList.toggle("active", j === k); }); }
    th.forEach(function (t, j) { t.addEventListener("click", function () { mostrar(j); }); t.addEventListener("keydown", function (e) { if (e.key === "Enter") { mostrar(j); } }); });
    var pv = $(".nav-button.prev", gal), nx = $(".nav-button.next", gal);
    if (pv) { pv.addEventListener("click", function () { mostrar(k - 1); }); nx.addEventListener("click", function () { mostrar(k + 1); }); }
  }
  $$(".tabs-header button").forEach(function (b) {
    b.addEventListener("click", function () {
      var cont = b.closest(".producto-detalle-tabs"), t = b.getAttribute("data-tab");
      $$(".tabs-header button", cont).forEach(function (x) { var on = x === b; x.classList.toggle("active", on); x.setAttribute("aria-selected", on ? "true" : "false"); });
      $$("[data-panel]", cont).forEach(function (p) { p.hidden = p.getAttribute("data-panel") !== t; });
      $$("iframe[data-src]", cont).forEach(function (f) { if (!f.src || f.src === "about:blank") { f.src = f.getAttribute("data-src"); } });   // la ficha PDF se carga solo al abrir la pestaña
    });
  });

  /* ---------- formulario de contacto ---------- */
  $$("form.formulario").forEach(function (f) {
    f.addEventListener("submit", function (e) {
      e.preventDefault();
      var u = ""; try { u = sessionStorage.getItem("hsm_utm") || ""; } catch (x) {}
      f.elements.utm.value = u; var btn = $("button[type=submit]", f); btn.disabled = true; btn.textContent = "ENVIANDO…";
      fetch(f.action, { method: "POST", body: new FormData(f), headers: { "X-Requested-With": "fetch" } })
        .then(function (r) { return r.json(); })
        .then(function (r) { if (r && r.ok) { location.href = RAIZ + "gracias/"; } else { throw new Error("x"); } })
        .catch(function () {
          // sin servidor de formularios (por ejemplo, en pruebas estáticas): se abre el correo del visitante con el mensaje listo
          var d = new FormData(f), cuerpo = "Nombre: " + d.get("nombre") + "\nCorreo: " + d.get("email") + "\nTeléfono: " + d.get("telefono") + "\nEmpresa: " + d.get("empresa") + "\n\n" + d.get("mensaje");
          location.href = "mailto:" + (O.correo || "contacto@hsm.cl") + "?subject=" + encodeURIComponent("Contacto desde el sitio HSM Chile") + "&body=" + encodeURIComponent(cuerpo);
          btn.disabled = false; btn.textContent = "ENVIAR";
        });
    });
  });
})();
