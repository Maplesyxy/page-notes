// Shared constants for the content script and the popup.
globalThis.PN = (() => {
  const COLORS = {
    yellow: '#ffd84d',
    green: '#86e07a',
    blue: '#7cc7ff',
    pink: '#ff9ccf',
    orange: '#ffb067'
  };
  const NOTE_BG = {
    yellow: '#fff6c7',
    green: '#e2f7d9',
    blue: '#ddf0ff',
    pink: '#ffe3f1',
    orange: '#ffe9d3'
  };

  // Bundled fonts ship inside the extension (fonts/). The others use fonts
  // already on the computer, with sensible fallbacks.
  const FONTS = {
    inter: {
      label: 'Inter',
      kind: 'Clean sans',
      stack: '"PN Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      faces: [
        ['PN Inter', 'inter-400.woff', 400, 'normal'],
        ['PN Inter', 'inter-600.woff', 600, 'normal'],
        ['PN Inter', 'inter-700.woff', 700, 'normal'],
        ['PN Inter', 'inter-400i.woff', 400, 'italic']
      ]
    },
    poppins: {
      label: 'Poppins',
      kind: 'Rounded sans',
      stack: '"PN Poppins", "Avenir Next", system-ui, sans-serif',
      faces: [
        ['PN Poppins', 'poppins-400.woff', 400, 'normal'],
        ['PN Poppins', 'poppins-700.woff', 700, 'normal'],
        ['PN Poppins', 'poppins-400i.woff', 400, 'italic']
      ]
    },
    lora: {
      label: 'Lora',
      kind: 'Book serif',
      stack: '"PN Lora", Georgia, serif',
      faces: [
        ['PN Lora', 'lora-var.woff', '400 700', 'normal'],
        ['PN Lora', 'lora-var-i.woff', '400 700', 'italic']
      ]
    },
    pagella: {
      label: 'Pagella',
      kind: 'Classic serif',
      stack: '"PN Pagella", "Palatino Linotype", Palatino, serif',
      scale: 1.06,
      faces: [
        ['PN Pagella', 'pagella-400.woff', 400, 'normal'],
        ['PN Pagella', 'pagella-700.woff', 700, 'normal'],
        ['PN Pagella', 'pagella-400i.woff', 400, 'italic']
      ]
    },
    hand: {
      label: 'Handwritten',
      kind: 'Your system’s handwriting font',
      stack: '"Bradley Hand", "Segoe Print", "Ink Free", "Chalkboard SE", "Comic Sans MS", "Comic Neue", cursive',
      scale: 1.05
    },
    typewriter: {
      label: 'Typewriter',
      kind: 'Old-school typed look',
      stack: '"American Typewriter", "Courier Prime", "Courier New", Courier, monospace'
    },
    mono: {
      label: 'Monospace',
      kind: 'For code & lists',
      stack: 'ui-monospace, "SF Mono", Menlo, Consolas, "DejaVu Sans Mono", monospace',
      scale: 0.94
    },
    system: {
      label: 'System',
      kind: 'Your computer’s default',
      stack: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
    }
  };

  const SIZES = [13, 14, 15, 16, 18, 20];

  const DEFAULT_SETTINGS = {
    autoMode: false,
    color: 'yellow',
    font: 'inter',
    fontSize: 15,
    showDock: true,
    dockOpen: true,
    dockY: 50,
    panelWidth: 440,
    hlsOpen: true
  };

  function fontFaceCSS(urlFor) {
    const rules = [];
    for (const f of Object.values(FONTS)) {
      for (const [family, file, weight, style] of f.faces || []) {
        rules.push(
          `@font-face{font-family:"${family}";src:url("${urlFor('fonts/' + file)}") format("woff");` +
            `font-weight:${weight};font-style:${style};font-display:swap;}`
        );
      }
    }
    return rules.join('\n');
  }

  return { COLORS, NOTE_BG, FONTS, SIZES, DEFAULT_SETTINGS, fontFaceCSS };
})();
