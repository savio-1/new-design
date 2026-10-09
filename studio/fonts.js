/* Studio — font catalogue.
   Every family here is served by Google Fonts; the axis spec after the name was
   verified against the css2 API. [family, category, axes, weights, hasItalic] */
(function () {
  const RAW = [
  ['Instrument Serif','Serif','ital@0;1',[400],1],
  ['Playfair Display','Serif','ital,wght@0,400..900;1,400..900',[400,500,600,700,800,900],1],
  ['DM Serif Display','Serif','ital@0;1',[400],1],
  ['Fraunces','Serif','ital,opsz,wght@0,9..144,100..900;1,9..144,100..900',[100,200,300,400,500,600,700,800,900],1],
  ['Gloock','Serif','',[400],0],
  ['Young Serif','Serif','',[400],0],
  ['Abril Fatface','Serif','',[400],0],
  ['Bodoni Moda','Serif','ital,opsz,wght@0,6..96,400..900;1,6..96,400..900',[400,500,600,700,800,900],1],
  ['Cormorant Garamond','Serif','ital,wght@0,300..700;1,300..700',[300,400,500,600,700],1],
  ['Libre Caslon Display','Serif','',[400],0],
  ['Yeseva One','Serif','',[400],0],
  ['Prata','Serif','',[400],0],
  ['Italiana','Serif','',[400],0],
  ['Rozha One','Serif','',[400],0],
  ['Newsreader','Serif','ital,opsz,wght@0,6..72,200..800;1,6..72,200..800',[200,300,400,500,600,700,800],1],
  ['EB Garamond','Serif','ital,wght@0,400..800;1,400..800',[400,500,600,700,800],1],
  ['Alfa Slab One','Serif','',[400],0],
  ['Ultra','Serif','',[400],0],
  ['Bebas Neue','Sans','',[400],0],
  ['Anton','Sans','',[400],0],
  ['Oswald','Sans','wght@200..700',[200,300,400,500,600,700],0],
  ['Archivo Black','Sans','',[400],0],
  ['Big Shoulders Display','Sans','wght@100..900',[100,200,300,400,500,600,700,800,900],0],
  ['Bricolage Grotesque','Sans','opsz,wght@12..96,200..800',[200,300,400,500,600,700,800],0],
  ['Syne','Sans','wght@400..800',[400,500,600,700,800],0],
  ['Space Grotesk','Sans','wght@300..700',[300,400,500,600,700],0],
  ['Unbounded','Sans','wght@200..900',[200,300,400,500,600,700,800,900],0],
  ['Familjen Grotesk','Sans','ital,wght@0,400..700;1,400..700',[400,500,600,700],1],
  ['Instrument Sans','Sans','ital,wght@0,400..700;1,400..700',[400,500,600,700],1],
  ['Inter','Sans','ital,opsz,wght@0,14..32,100..900;1,14..32,100..900',[100,200,300,400,500,600,700,800,900],1],
  ['DM Sans','Sans','ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000',[100,200,300,400,500,600,700,800,900],1],
  ['Poppins','Sans','ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,400;1,700',[300,400,500,600,700,800,900],1],
  ['Montserrat','Sans','ital,wght@0,100..900;1,100..900',[100,200,300,400,500,600,700,800,900],1],
  ['League Spartan','Sans','wght@100..900',[100,200,300,400,500,600,700,800,900],0],
  ['Outfit','Sans','wght@100..900',[100,200,300,400,500,600,700,800,900],0],
  ['Archivo','Sans','ital,wdth,wght@0,62..125,100..900;1,62..125,100..900',[100,200,300,400,500,600,700,800,900],1],
  ['Rubik','Sans','ital,wght@0,300..900;1,300..900',[300,400,500,600,700,800,900],1],
  ['Fredoka','Sans','wdth,wght@75..125,300..700',[300,400,500,600,700],0],
  ['Baloo 2','Sans','wght@400..800',[400,500,600,700,800],0],
  ['Nunito','Sans','ital,wght@0,200..1000;1,200..1000',[200,300,400,500,600,700,800,900],1],
  ['Gabarito','Sans','wght@400..900',[400,500,600,700,800,900],0],
  ['Rubik Mono One','Display','',[400],0],
  ['Dela Gothic One','Display','',[400],0],
  ['Bowlby One','Display','',[400],0],
  ['Shrikhand','Display','',[400],0],
  ['Righteous','Display','',[400],0],
  ['Monoton','Display','',[400],0],
  ['Bungee','Display','',[400],0],
  ['Bungee Shade','Display','',[400],0],
  ['Titan One','Display','',[400],0],
  ['Chango','Display','',[400],0],
  ['Lilita One','Display','',[400],0],
  ['Luckiest Guy','Display','',[400],0],
  ['Bagel Fat One','Display','',[400],0],
  ['Gasoek One','Display','',[400],0],
  ['Darumadrop One','Display','',[400],0],
  ['Rubik Bubbles','Display','',[400],0],
  ['Rubik Glitch','Display','',[400],0],
  ['Rubik Wet Paint','Display','',[400],0],
  ['Rubik Doodle Shadow','Display','',[400],0],
  ['Rubik Puddles','Display','',[400],0],
  ['Sniglet','Display','wght@400;800',[400,800],0],
  ['Coiny','Display','',[400],0],
  ['Modak','Display','',[400],0],
  ['Sigmar','Display','',[400],0],
  ['Chicle','Display','',[400],0],
  ['Rampart One','Display','',[400],0],
  ['Rye','Display','',[400],0],
  ['Sonsie One','Display','',[400],0],
  ['Poiret One','Display','',[400],0],
  ['Josefin Sans','Sans','ital,wght@0,100..700;1,100..700',[100,200,300,400,500,600,700],1],
  ['Syncopate','Display','wght@400;700',[400,700],0],
  ['Michroma','Display','',[400],0],
  ['Orbitron','Display','wght@400..900',[400,500,600,700,800,900],0],
  ['Krona One','Display','',[400],0],
  ['Climate Crisis','Display','',[400],0],
  ['Mochiy Pop One','Display','',[400],0],
  ['Train One','Display','',[400],0],
  ['Caveat','Handwritten','wght@400..700',[400,500,600,700],0],
  ['Pacifico','Script','',[400],0],
  ['Yellowtail','Script','',[400],0],
  ['Lobster','Script','',[400],0],
  ['Dancing Script','Script','wght@400..700',[400,500,600,700],0],
  ['Satisfy','Script','',[400],0],
  ['Kaushan Script','Script','',[400],0],
  ['Permanent Marker','Handwritten','',[400],0],
  ['Gochi Hand','Handwritten','',[400],0],
  ['Shadows Into Light','Handwritten','',[400],0],
  ['Reenie Beanie','Handwritten','',[400],0],
  ['Nothing You Could Do','Handwritten','',[400],0],
  ['Homemade Apple','Script','',[400],0],
  ['La Belle Aurore','Script','',[400],0],
  ['Rock Salt','Handwritten','',[400],0],
  ['Sedgwick Ave','Handwritten','',[400],0],
  ['Covered By Your Grace','Handwritten','',[400],0],
  ['Gloria Hallelujah','Handwritten','',[400],0],
  ['Indie Flower','Handwritten','',[400],0],
  ['Patrick Hand','Handwritten','',[400],0],
  ['Kalam','Handwritten','wght@300;400;700',[300,400,700],0],
  ['Gaegu','Handwritten','wght@300;400;700',[300,400,700],0],
  ['Grandstander','Handwritten','ital,wght@0,100..900;1,100..900',[100,200,300,400,500,600,700,800,900],1],
  ['Cherry Bomb One','Handwritten','',[400],0],
  ['Sacramento','Script','',[400],0],
  ['Great Vibes','Script','',[400],0],
  ['Allura','Script','',[400],0],
  ['Parisienne','Script','',[400],0],
  ['Mrs Saint Delafield','Script','',[400],0],
  ['Damion','Script','',[400],0],
  ['Leckerli One','Script','',[400],0],
  ['Cookie','Script','',[400],0],
  ['Sriracha','Handwritten','',[400],0],
  ['Space Mono','Mono','ital,wght@0,400;0,700;1,400;1,700',[400,700],1],
  ['IBM Plex Mono','Mono','ital,wght@0,300;0,400;0,500;0,600;0,700;1,400',[300,400,500,600,700],1],
  ['VT323','Mono','',[400],0],
  ['Press Start 2P','Mono','',[400],0],
  ['Courier Prime','Mono','ital,wght@0,400;0,700;1,400;1,700',[400,700],1],
  ['Major Mono Display','Mono','',[400],0],
  ['Silkscreen','Mono','wght@400;700',[400,700],0],
  ['DotGothic16','Mono','',[400],0],
  ['Special Elite','Mono','',[400],0],
  ['Xanh Mono','Mono','ital@0;1',[400],1],  ];

  const FONTS = RAW.map(([family, cat, axes, weights, italic]) => ({ family, cat, axes, weights, italic: !!italic }));
  const BY_NAME = Object.fromEntries(FONTS.map(f => [f.family, f]));

  // Split into a few stylesheet requests so no single URL gets unwieldy.
  function cssUrls() {
    const chunks = [];
    for (let i = 0; i < FONTS.length; i += 30) chunks.push(FONTS.slice(i, i + 30));
    return chunks.map(chunk =>
      'https://fonts.googleapis.com/css2?' +
      chunk.map(f => 'family=' + f.family.replace(/ /g, '+') + (f.axes ? ':' + f.axes : '')).join('&') +
      '&display=swap');
  }

  // Resolves once every stylesheet has arrived (or failed), so font loads
  // requested before that don't resolve against an empty @font-face list.
  let injected = null;
  function injectStylesheets() {
    if (injected) return injected;
    injected = Promise.all(cssUrls().map(href => new Promise(res => {
      const l = document.createElement('link');
      l.rel = 'stylesheet';
      l.href = href;
      l.onload = l.onerror = () => res();
      document.head.appendChild(l);
    })));
    return injected;
  }

  // Canvas text only renders a web font once the face is actually loaded, so
  // everything that draws text asks for it here first and redraws on resolve.
  const loaded = new Set();
  const pending = new Map();
  function fontKey(family, weight, italic) { return `${italic ? 'italic' : 'normal'} ${weight} ${family}`; }
  function nearestWeight(family, weight) {
    const f = BY_NAME[family];
    if (!f) return weight;
    return f.weights.reduce((a, b) => Math.abs(b - weight) < Math.abs(a - weight) ? b : a, f.weights[0]);
  }
  function isLoaded(family, weight = 400, italic = false) {
    return loaded.has(fontKey(family, weight, italic));
  }
  function ensure(family, weight = 400, italic = false) {
    const key = fontKey(family, weight, italic);
    if (loaded.has(key)) return Promise.resolve(true);
    if (pending.has(key)) return pending.get(key);
    const spec = `${italic ? 'italic ' : ''}${weight} 32px "${family}"`;
    const p = injectStylesheets().then(() => document.fonts.load(spec, 'AaBbg0')).then(r => {
      loaded.add(key);
      pending.delete(key);
      return r.length > 0;
    }).catch(() => { loaded.add(key); pending.delete(key); return false; });
    pending.set(key, p);
    return p;
  }

  injectStylesheets();

  window.StudioFonts = { FONTS, BY_NAME, CATEGORIES: ['Serif', 'Sans', 'Display', 'Script', 'Handwritten', 'Mono'], injectStylesheets, ensure, isLoaded, nearestWeight };
})();
