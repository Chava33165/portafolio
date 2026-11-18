// Portafolio de Salvador Pantoja. Sin librerías: IntersectionObserver, requestAnimationFrame y CSS.
(() => {
  "use strict";

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const menosMovimiento = matchMedia("(prefers-reduced-motion: reduce)");
  const punteroFino = matchMedia("(hover: hover) and (pointer: fine)");
  const T = window.TEXTOS;

  // ------------------------------------------------------------------ idioma

  const guardado = (() => { try { return localStorage.getItem("idioma"); } catch { return null; } })();
  let idioma = guardado === "es" || guardado === "en" ? guardado
    : (navigator.language || "es").toLowerCase().startsWith("es") ? "es" : "en";
  if (/[?&]lang=en\b/.test(location.search)) idioma = "en";
  const verTodo = /[?&]ver=todo\b/.test(location.search); // todo revelado, para revisar capturas completas

  const CLAVES = {
    es: ["Plexus", "Foxconn", "NVIDIA", "GB200", "GB300", "CETI", "servidor", "Telegram", "iPhone", "dinero", "imaginar", "soluciones"],
    en: ["Plexus", "Foxconn", "NVIDIA", "GB200", "GB300", "CETI", "server", "Telegram", "iPhone", "money", "imagining", "solutions"],
  };

  function aplicarIdioma() {
    const t = T[idioma];
    document.documentElement.lang = idioma;
    document.title = t["meta.titulo"];
    $(".idioma").setAttribute("aria-label", idioma === "es" ? "Change language to English" : "Cambiar idioma a español");
    for (const el of $$("[data-t]")) {
      const v = t[el.dataset.t];
      if (typeof v !== "string") continue;
      if (el.hasAttribute("data-palabras")) partirPalabras(el, v);
      else el.textContent = v;
    }
    reiniciarRotador();
    pintarPalabras();
  }

  // ------------------------------------------------------------------ título épico: letra por letra

  for (const linea of $$("[data-letras]")) {
    const texto = linea.firstChild;
    const letras = [...texto.textContent];
    const frag = document.createDocumentFragment();
    const base = linea.classList.contains("acento") ? 8 : 0;
    letras.forEach((ch, i) => {
      const s = document.createElement("span");
      s.className = "letra";
      s.textContent = ch;
      s.setAttribute("aria-hidden", "true");
      s.style.setProperty("--n", base + i);
      s.style.setProperty("--giro", `${(Math.random() * 14 - 7).toFixed(1)}deg`);
      frag.append(s);
    });
    texto.replaceWith(frag);
  }

  // ------------------------------------------------------------------ "Y además …" que rota

  const rotaTexto = $(".rota-texto");
  let rotaIdx = 0, rotaTimer = 0;
  function reiniciarRotador() {
    clearInterval(rotaTimer);
    const frases = T[idioma]["hero.rota"];
    rotaIdx = 0;
    rotaTexto.textContent = frases[0];
    rotaTimer = setInterval(() => {
      if (document.hidden) return;
      rotaTexto.classList.add("sale");
      setTimeout(() => {
        rotaIdx = (rotaIdx + 1) % frases.length;
        rotaTexto.textContent = frases[rotaIdx];
        rotaTexto.classList.remove("sale");
        rotaTexto.classList.add("entra");
        rotaTexto.getBoundingClientRect(); // fuerza el estado de entrada antes de animar
        rotaTexto.classList.remove("entra");
      }, 260);
    }, 2800);
  }

  // ------------------------------------------------------------------ retícula de puntos que sigue al dedo/cursor

  const lienzo = $(".puntos");
  const ctx = lienzo.getContext("2d");
  const hero = $(".hero");
  let ancho = 0, alto = 0, dpr = 1, heroVisible = true;
  const mira = { x: -999, y: -999, vx: 0, vy: 0, tx: -999, ty: -999 };

  function medir() {
    dpr = Math.min(devicePixelRatio || 1, 2);
    ancho = hero.clientWidth; alto = hero.clientHeight;
    lienzo.width = ancho * dpr; lienzo.height = alto * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    dibujar();
  }

  function colores() {
    const cs = getComputedStyle(document.documentElement);
    return { punto: cs.getPropertyValue("--linea-fuerte").trim(), acento: cs.getPropertyValue("--acento").trim() };
  }
  let paleta = colores();
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => { paleta = colores(); dibujar(); });

  function dibujar() {
    ctx.clearRect(0, 0, ancho, alto);
    const paso = ancho < 600 ? 24 : 30, radio = 150;
    for (let y = paso / 2; y < alto; y += paso) {
      for (let x = paso / 2; x < ancho; x += paso) {
        const dx = x - mira.x, dy = y - mira.y;
        const d = Math.hypot(dx, dy);
        const f = Math.max(0, 1 - d / radio);
        const empuje = f * f * 10;
        const px = x + (d ? (dx / d) * empuje : 0), py = y + (d ? (dy / d) * empuje : 0);
        ctx.beginPath();
        ctx.fillStyle = f > 0.02 ? paleta.acento : paleta.punto;
        ctx.globalAlpha = f > 0.02 ? 0.35 + f * 0.65 : 0.9;
        ctx.arc(px, py, 1.1 + f * 1.9, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  // Resorte (stiffness/damping) para que la mira persiga al puntero con inercia, no pegada.
  let animando = false, ultimo = 0;
  function paso(t) {
    const dt = Math.min((t - ultimo) / 1000, 1 / 30); ultimo = t;
    for (const [p, v, o] of [["x", "vx", "tx"], ["y", "vy", "ty"]]) {
      const fuerza = (mira[o] - mira[p]) * 170 - mira[v] * 22;
      mira[v] += fuerza * dt;
      mira[p] += mira[v] * dt;
    }
    dibujar();
    const quieto = Math.abs(mira.tx - mira.x) < 0.3 && Math.abs(mira.ty - mira.y) < 0.3 && Math.abs(mira.vx) < 0.3;
    if (!quieto && heroVisible) requestAnimationFrame(paso); else animando = false;
  }
  function apuntar(x, y) {
    if (menosMovimiento.matches) return;
    const r = hero.getBoundingClientRect();
    mira.tx = x - r.left; mira.ty = y - r.top;
    if (mira.x < -900) { mira.x = mira.tx; mira.y = mira.ty; }
    if (!animando) { animando = true; ultimo = performance.now(); requestAnimationFrame(paso); }
  }
  hero.addEventListener("pointermove", (e) => apuntar(e.clientX, e.clientY), { passive: true });
  hero.addEventListener("pointerdown", (e) => apuntar(e.clientX, e.clientY), { passive: true });
  hero.addEventListener("pointerleave", () => { mira.tx = mira.ty = -999; mira.x = mira.y = -999; dibujar(); });
  new IntersectionObserver(([e]) => { heroVisible = e.isIntersecting; }).observe(hero);
  addEventListener("resize", medir, { passive: true });

  // ------------------------------------------------------------------ revelar al hacer scroll

  for (const lista of $$(".chips")) [...lista.children].forEach((li, i) => li.style.setProperty("--c", i));
  const alVer = new IntersectionObserver((entradas) => {
    for (const e of entradas) if (e.isIntersecting) { e.target.classList.add("visto"); alVer.unobserve(e.target); }
  }, { rootMargin: "0px 0px -12% 0px", threshold: 0.08 });
  $$(".revela").forEach((el) => alVer.observe(el));

  // ------------------------------------------------------------------ quién soy: palabra por palabra

  const sobre = $(".sobre-texto");
  let palabras = [];
  function partirPalabras(el, texto) {
    el.textContent = "";
    el.setAttribute("aria-label", texto);
    const claves = new Set(CLAVES[idioma]);
    palabras = texto.split(" ").map((w, i, arr) => {
      const s = document.createElement("span");
      s.className = "palabra";
      s.setAttribute("aria-hidden", "true");
      const [, nucleo, signo] = w.match(/^(.*?)([.,:;!?]*)$/);
      if (claves.has(nucleo)) {
        const em = document.createElement("em");
        em.className = "clave";
        em.textContent = nucleo;
        s.append(em, signo); // el color va en la palabra, no en el punto
      } else s.textContent = w;
      el.append(s, i < arr.length - 1 ? " " : "");
      return s;
    });
  }
  function pintarPalabras() {
    if (!palabras.length) return;
    const r = sobre.getBoundingClientRect(), vh = innerHeight;
    // Empieza cuando el párrafo asoma por abajo y termina cuando su final llega a ~40% de la pantalla.
    const avance = (vh * 0.88 - r.top) / (r.height + vh * 0.88 - vh * 0.4);
    const n = menosMovimiento.matches ? palabras.length : Math.round(Math.min(Math.max(avance, 0), 1) * palabras.length);
    palabras.forEach((p, i) => p.classList.toggle("lit", i < n));
  }

  // ------------------------------------------------------------------ línea de tiempo que se dibuja

  const tiempo = $(".linea-tiempo"), trazo = $(".linea-trazo"), hitos = $$(".hito");
  function pintarTiempo() {
    const r = tiempo.getBoundingClientRect(), medio = innerHeight * 0.62;
    const p = Math.min(Math.max((medio - r.top) / r.height, 0), 1);
    trazo.style.transform = `scaleY(${p})`;
    for (const h of hitos) h.classList.toggle("llego", h.getBoundingClientRect().top < medio);
  }

  // ------------------------------------------------------------------ barra, progreso y scroll

  const barra = $(".barra"), progreso = $(".progreso");
  let yAntes = scrollY, pendiente = false;
  function alScroll() {
    pendiente = false;
    const y = scrollY, max = document.documentElement.scrollHeight - innerHeight;
    progreso.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
    barra.classList.toggle("con-fondo", y > 40);
    barra.classList.toggle("escondida", y > innerHeight * 0.9 && y > yAntes + 4);
    if (y < yAntes - 4) barra.classList.remove("escondida");
    yAntes = y;
    if (verTodo) return;
    pintarPalabras();
    pintarTiempo();
  }
  addEventListener("scroll", () => { if (!pendiente) { pendiente = true; requestAnimationFrame(alScroll); } }, { passive: true });

  // ------------------------------------------------------------------ proyectos: mini-animaciones solo a la vista

  const telefonos = new Map();
  const contados = new WeakSet();
  const vivo = new IntersectionObserver((entradas) => {
    for (const e of entradas) {
      const card = e.target;
      card.classList.toggle("vivo", e.isIntersecting);
      const tel = $(".telefono", card);
      if (tel) {
        clearInterval(telefonos.get(tel));
        if (e.isIntersecting && !menosMovimiento.matches) {
          telefonos.set(tel, setInterval(() => {
            const imgs = $$("img", tel), i = imgs.findIndex((im) => im.classList.contains("activa"));
            imgs[i].classList.remove("activa");
            imgs[(i + 1) % imgs.length].classList.add("activa");
          }, 2600));
        }
      }
      const cont = $(".contador", card);
      if (cont && e.isIntersecting && !contados.has(cont)) { contados.add(cont); contar(cont); }
      if ($(".escena-cpu", card)) cpuActiva = e.isIntersecting;
    }
  }, { threshold: 0.25 });
  $$("[data-vivo]").forEach((el) => vivo.observe(el));

  function contar(el) {
    const hasta = Number(el.dataset.hasta), dur = menosMovimiento.matches ? 0 : 1400, t0 = performance.now();
    const fmt = (n) => "$" + Math.round(n).toLocaleString("es-MX");
    (function tic(t) {
      const p = dur ? Math.min((t - t0) / dur, 1) : 1;
      el.textContent = fmt(hasta * (1 - Math.pow(1 - p, 4)));
      if (p < 1) requestAnimationFrame(tic);
    })(t0);
  }

  // CPU "en vivo": una serie que avanza cada 900 ms.
  let cpuActiva = false;
  const serie = Array.from({ length: 24 }, (_, i) => 20 + 14 * Math.sin(i / 2.2) + Math.random() * 10);
  const linea = $(".cpu-linea"), area = $(".cpu-area"), valor = $(".cpu-valor");
  function pintarCpu() {
    const pts = serie.map((v, i) => [(i / (serie.length - 1)) * 200, 70 - (v / 100) * 70 * 1.6]);
    const d = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${Math.max(2, y).toFixed(1)}`).join(" ");
    linea.setAttribute("d", d);
    area.setAttribute("d", `${d} L200 70 L0 70 Z`);
    valor.textContent = `${Math.round(serie[serie.length - 1])}%`;
  }
  pintarCpu();
  setInterval(() => {
    if (!cpuActiva || document.hidden || menosMovimiento.matches) return;
    const ultimoV = serie[serie.length - 1];
    serie.push(Math.min(48, Math.max(8, ultimoV + (Math.random() - 0.5) * 16)));
    serie.shift();
    pintarCpu();
  }, 900);

  // ------------------------------------------------------------------ cartas que se voltean (en touch se toca)

  for (const c of $$(".carta")) {
    c.addEventListener("click", () => { if (!punteroFino.matches) c.classList.toggle("volteada"); });
  }

  // ------------------------------------------------------------------ contacto: WhatsApp y correo (armados aquí para que los bots no los recojan)

  const wa = ["52", "33", "3220", "2065"].join("");
  $('[data-red="whatsapp"]').href = `https://wa.me/${wa}?text=${encodeURIComponent("¡Hola, Salvador! Vi tu portafolio 👋")}`;
  $('[data-red="correo"]').addEventListener("click", (e) => {
    e.preventDefault();
    location.href = "mailto:" + ["salva33vera", "gmail.com"].join("@") + "?subject=" + encodeURIComponent("Hola desde tu portafolio");
  });

  // ------------------------------------------------------------------ comentarios

  const muro = $(".muro");
  async function cargarComentarios() {
    try {
      const r = await fetch("api/comentarios", { headers: { Accept: "application/json" } });
      if (!r.ok) return;
      const { comentarios } = await r.json();
      if (!comentarios.length) return;
      muro.textContent = "";
      comentarios.forEach((c, i) => {
        const fig = document.createElement("figure");
        fig.className = "comentario";
        fig.style.setProperty("--i", Math.min(i, 8));
        const q = document.createElement("blockquote");
        q.textContent = `“${c.texto}”`;
        const cap = document.createElement("figcaption");
        const b = document.createElement("b");
        b.textContent = c.nombre;
        cap.append("— ", b);
        fig.append(q, cap);
        muro.append(fig);
      });
    } catch { /* sin conexión: se queda el texto de "todavía no hay" */ }
  }

  // ------------------------------------------------------------------ formularios

  for (const forma of $$(".forma")) {
    const boton = $(".boton", forma), aviso = $(".forma-aviso", forma), tipo = forma.dataset.api;
    forma.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (boton.classList.contains("enviando") || boton.classList.contains("listo")) return;
      const datos = Object.fromEntries(new FormData(forma));
      if (tipo === "comentarios") datos.idioma = idioma;
      boton.classList.add("enviando");
      aviso.classList.remove("error");
      aviso.textContent = T[idioma]["form.enviando"];
      try {
        const r = await fetch(`api/${tipo}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(datos) });
        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(typeof j.detail === "string" ? j.detail : T[idioma]["form.error"]);
        boton.classList.remove("enviando");
        boton.classList.add("listo");
        aviso.textContent = T[idioma][tipo === "comentarios" ? "com.listo" : "con.listo"];
        forma.reset();
        setTimeout(() => { boton.classList.remove("listo"); aviso.textContent = ""; }, 4200);
      } catch (err) {
        boton.classList.remove("enviando");
        aviso.classList.add("error");
        aviso.textContent = err.message || T[idioma]["form.error"];
      }
    });
  }

  // ------------------------------------------------------------------ cambio de idioma

  $(".idioma").addEventListener("click", () => {
    idioma = idioma === "es" ? "en" : "es";
    try { localStorage.setItem("idioma", idioma); } catch { /* modo privado */ }
    document.body.classList.add("cambiando");
    setTimeout(() => { aplicarIdioma(); document.body.classList.remove("cambiando"); }, 180);
  });

  // ------------------------------------------------------------------ arranque

  aplicarIdioma();
  if (verTodo) {
    $$(".revela").forEach((el) => el.classList.add("visto"));
    palabras.forEach((w) => w.classList.add("lit"));
    hitos.forEach((h) => h.classList.add("llego"));
    trazo.style.transform = "scaleY(1)";
    $$("[data-vivo]").forEach((el) => el.classList.add("vivo"));
    $$(".contador").forEach((c) => { contados.add(c); c.textContent = "$" + Number(c.dataset.hasta).toLocaleString("es-MX"); });
  }
  medir();
  alScroll();
  cargarComentarios();
  document.addEventListener("visibilitychange", () => { if (!document.hidden) paleta = colores(); });
})();
