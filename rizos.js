// Rizos: espirales a lo largo de una curva (como un cordón de teléfono), para el avatar de Chava (pelo rizado) y
// los adornos. Devuelve el atributo "d" de un <path>.
window.Rizos = (() => {
  // base(t) con t en [0,1] → [x, y]; vueltas = cuántos rizos; radio = qué tan grandes.
  function coil(base, { vueltas = 12, radio = 8, pasos = 900, fase = 0, aplastar = 1 } = {}) {
    const pts = [];
    for (let i = 0; i <= pasos; i++) {
      const t = i / pasos;
      const [x, y] = base(t);
      const [x2, y2] = base(Math.min(1, t + 1 / pasos));
      // dirección de la curva y su normal: el rizo gira alrededor del punto base
      let dx = x2 - x, dy = y2 - y;
      const l = Math.hypot(dx, dy) || 1;
      dx /= l; dy /= l;
      const a = t * vueltas * Math.PI * 2 + fase;
      // se adelgaza en las puntas para que no termine de golpe
      const r = radio * Math.min(1, Math.sin(Math.PI * t) * 2.2);
      pts.push([x + dx * Math.cos(a) * r * aplastar - dy * Math.sin(a) * r,
                y + dy * Math.cos(a) * r * aplastar + dx * Math.sin(a) * r]);
    }
    return "M" + pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(" L");
  }

  const arco = (cx, cy, rx, ry, desde, hasta) => (t) => {
    const a = ((desde + (hasta - desde) * t) * Math.PI) / 180;
    return [cx + rx * Math.cos(a), cy + ry * Math.sin(a)];
  };
  const recta = (x1, y1, x2, y2, onda = 0) => (t) => [x1 + (x2 - x1) * t, y1 + (y2 - y1) * t + Math.sin(t * Math.PI) * onda];

  // Avatar minimalista: cara, ojos, sonrisa, hombros y una melena de rizos.
  function avatar(pasos = 700) {
    const NS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", "0 0 240 260");
    svg.setAttribute("class", "avatar");
    svg.setAttribute("aria-hidden", "true");
    const p = (d, clase, extra = {}) => {
      const el = document.createElementNS(NS, "path");
      el.setAttribute("d", d);
      el.setAttribute("class", clase);
      el.setAttribute("pathLength", "1");
      for (const [k, v] of Object.entries(extra)) el.setAttribute(k, v);
      return el;
    };
    const g = (clase) => { const el = document.createElementNS(NS, "g"); el.setAttribute("class", clase); return el; };

    const cuerpo = g("av-cuerpo");
    // hombros y cuello
    cuerpo.append(p("M44 258 C 52 214, 84 202, 120 202 C 156 202, 188 214, 196 258", "av-linea"));
    cuerpo.append(p("M106 182 L 106 202 M134 182 L 134 202", "av-linea"));
    // cara (la frente queda bajo el pelo)
    cuerpo.append(p("M78 104 C 74 116, 74 122, 74 130 C 74 164, 94 190, 120 190 C 146 190, 166 164, 166 130 C 166 122, 166 116, 162 104", "av-linea"));
    // orejas
    cuerpo.append(p("M74 126 C 64 124, 62 144, 76 146 M166 126 C 176 124, 178 144, 164 146", "av-linea"));
    // sonrisa
    cuerpo.append(p("M106 158 C 113 166, 127 166, 134 158", "av-linea av-sonrisa"));
    // nariz
    cuerpo.append(p("M121 130 C 118 140, 116 145, 123 147", "av-linea av-fina"));

    const ojos = g("av-ojos");
    for (const x of [102, 138]) {
      const c = document.createElementNS(NS, "ellipse");
      c.setAttribute("cx", x); c.setAttribute("cy", 126); c.setAttribute("rx", 3.2); c.setAttribute("ry", 3.6);
      c.setAttribute("class", "av-ojo");
      ojos.append(c);
    }

    // Melena: varias capas de rizos sobre la cabeza (de atrás hacia adelante).
    const pelo = g("av-pelo");
    // capa de atrás: el contorno grande, baja por los lados hasta las orejas
    pelo.append(p(coil(arco(120, 100, 78, 70, 158, 382), { vueltas: 22, radio: 14, fase: 0.4, pasos }), "av-rizo av-atras"));
    // capa de en medio: volumen
    pelo.append(p(coil(arco(120, 96, 60, 50, 172, 368), { vueltas: 17, radio: 12, fase: 1.9, pasos }), "av-rizo av-medio"));
    // fleco: rizos que caen sobre la frente
    pelo.append(p(coil(arco(120, 66, 44, 30, 28, 152), { vueltas: 6, radio: 9, fase: 3.1, pasos }), "av-rizo"));
    // un rizo rebelde en terracota que se sale arriba a la derecha: el detalle
    pelo.append(p(coil(recta(176, 52, 196, 30), { vueltas: 2.5, radio: 6, fase: 0.8, pasos: Math.round(pasos / 3) }), "av-rizo av-rizo-acento"));
    svg.append(cuerpo, ojos, pelo);
    return svg;
  }

  // Un rizo recto (subrayado y adornos).
  const linea = (ancho, alto, vueltas, radio, pasos = 400) =>
    coil(recta(radio + 2, alto / 2, ancho - radio - 2, alto / 2), { vueltas, radio, aplastar: 1.15, pasos });

  // Girasol (como el fondo de pantalla de Chava): dos coronas de pétalos y semillas en espiral de Fibonacci
  // (cada semilla gira 137.5°, el "ángulo de oro" de los girasoles de verdad). Centrado en (0,0).
  // Devuelve el marcado de un <g>; cada pétalo lleva --i para que florezcan en cascada.
  function girasol({ petalos = 22, centro = 26, largo = 46, ancho = 13, semillas = 120, detalle = true } = {}) {
    const petalo = (r0, l, w) =>
      `M0 ${-r0} C ${w} ${-(r0 + l * 0.25)}, ${w * 0.55} ${-(r0 + l * 0.85)}, 0 ${-(r0 + l)} ` +
      `C ${-w * 0.55} ${-(r0 + l * 0.85)}, ${-w} ${-(r0 + l * 0.25)}, 0 ${-r0} Z`;
    let s = "";
    const coronas = [
      { n: petalos, giro: 360 / petalos / 2, l: largo * 0.92, w: ancho * 1.05, clase: "petalo atras" },
      { n: petalos, giro: 0, l: largo, w: ancho, clase: "petalo" },
    ];
    let k = 0;
    for (const c of coronas) {
      for (let i = 0; i < c.n; i++) {
        const a = (360 / c.n) * i + c.giro;
        s += `<g transform="rotate(${a.toFixed(1)})"><path class="${c.clase}" style="--i:${k++}" d="${petalo(centro - 4, c.l, c.w)}"/>` +
          (detalle && c.clase === "petalo" ? `<path class="vena" d="M0 ${-(centro + 2)} L0 ${-(centro + c.l * 0.7)}"/>` : "") + `</g>`;
      }
    }
    s += `<circle class="centro" r="${centro}"/>`;
    if (detalle) {
      for (let i = 1; i <= semillas; i++) {
        const a = i * 137.508 * (Math.PI / 180), r = (centro - 3) * Math.sqrt(i / semillas);
        s += `<circle class="semilla" cx="${(r * Math.cos(a)).toFixed(1)}" cy="${(r * Math.sin(a)).toFixed(1)}" r="${(0.9 + 1.1 * (i / semillas)).toFixed(2)}"/>`;
      }
    }
    return s;
  }

  return { coil, arco, recta, avatar, linea, girasol };
})();
