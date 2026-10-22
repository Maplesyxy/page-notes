// Page Notes & Highlights — content script
// Draws highlights, sticky notes, the notepad panel and the options bar on
// every page, saves them per URL, and restores them when you come back.

(() => {
  if (window.__pageNotesLoaded) return;
  window.__pageNotesLoaded = true;

  // Only one copy may run per page. When the extension is reloaded or updated,
  // the copy already in an open tab keeps running but is cut off from the
  // extension; a fresh copy can then be added next to it. So the newest copy
  // tells older ones to shut down, and each copy checks it is still the
  // current one (and still connected) before doing anything.
  const INSTANCE = Math.random().toString(36).slice(2);
  const life = new AbortController();
  const on = { signal: life.signal };
  let dead = false;
  document.dispatchEvent(new CustomEvent('page-notes:takeover'));
  document.documentElement.setAttribute('data-page-notes', INSTANCE);

  const { COLORS, NOTE_BG, FONTS, SIZES, DEFAULT_SETTINGS, fontFaceCSS } = globalThis.PN;
  const COLOR_KEYS = Object.keys(COLORS);

  // ------------------------------------------------------------------- icons
  const ICONS = {
    sticky: '<path d="M16 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8Z"/><path d="M15 3v4a2 2 0 0 0 2 2h4"/>',
    pad: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/>',
    marker: '<path d="m9 11-6 6v3h9l3-3"/><path d="m22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4"/>',
    type: '<polyline points="4 7 4 4 20 4 20 7"/><line x1="9" x2="15" y1="20" y2="20"/><line x1="12" x2="12" y1="4" y2="20"/>',
    x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    trash: '<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
    minus: '<path d="M5 12h14"/>',
    plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
    more: '<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>',
    bold: '<path d="M6 12h9a4 4 0 0 1 0 8H7a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h7a4 4 0 0 1 0 8"/>',
    italic: '<line x1="19" x2="10" y1="4" y2="4"/><line x1="14" x2="5" y1="20" y2="20"/><line x1="15" x2="9" y1="4" y2="20"/>',
    underline: '<path d="M6 4v6a6 6 0 0 0 12 0V4"/><line x1="4" x2="20" y1="20" y2="20"/>',
    strike: '<path d="M16 4H9a3 3 0 0 0-2.83 4"/><path d="M14 12a4 4 0 0 1 0 8H6"/><line x1="4" x2="20" y1="12" y2="12"/>',
    ul: '<line x1="8" x2="21" y1="6" y2="6"/><line x1="8" x2="21" y1="12" y2="12"/><line x1="8" x2="21" y1="18" y2="18"/><line x1="3" x2="3.01" y1="6" y2="6"/><line x1="3" x2="3.01" y1="12" y2="12"/><line x1="3" x2="3.01" y1="18" y2="18"/>',
    ol: '<line x1="10" x2="21" y1="6" y2="6"/><line x1="10" x2="21" y1="12" y2="12"/><line x1="10" x2="21" y1="18" y2="18"/><path d="M4 6h1v4"/><path d="M4 10h2"/><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/>',
    check: '<path d="m3 17 2 2 4-4"/><path d="m3 7 2 2 4-4"/><path d="M13 6h8"/><path d="M13 12h8"/><path d="M13 18h8"/>',
    quote: '<path d="M17 6H3"/><path d="M21 12H8"/><path d="M21 18H8"/><path d="M3 12v6"/>',
    link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
    clear: '<path d="M4 7V4h16v3"/><path d="M5 20h6"/><path d="M13 4 8 20"/><path d="m15 15 5 5"/><path d="m20 15-5 5"/>',
    grip: '<circle cx="9" cy="12" r="1"/><circle cx="9" cy="5" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="19" r="1"/>',
    pen: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
    copy: '<rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>',
    chevR: '<path d="m9 18 6-6-6-6"/>',
    chevD: '<path d="m6 9 6 6 6-6"/>',
    toPad: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M12 12v6"/><path d="m9 15 3 3 3-3"/>',
    insert: '<path d="M9 10 4 15l5 5"/><path d="M20 4v7a4 4 0 0 1-4 4H4"/>'
  };
  const icon = (n, s = 18) =>
    `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n]}</svg>`;

  const esc = (s) =>
    String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const fontStack = (k) => (FONTS[k] || FONTS.inter).stack;
  const fontScale = (k) => (FONTS[k] || FONTS.inter).scale || 1;
  const NOTE_SIZES = { S: 0.87, M: 1, L: 1.2 };

  // -------------------------------------------------------------------- state
  const emptyData = () => ({ highlights: [], notes: [], pad: { html: '' } });
  let data = emptyData();
  let settings = { ...DEFAULT_SETTINGS };
  let key = pageKey();
  let pageUrl = location.href;
  let saveTimer = null;
  let dirty = false;
  const myWrites = new Set();
  let lastContext = null;

  function pageKey() {
    const u = new URL(location.href);
    if (!/^#[!/]/.test(u.hash)) u.hash = '';
    return 'page:' + u.href;
  }
  const extensionAlive = () => {
    try { return !!chrome.runtime?.id; } catch { return false; }
  };
  const htmlToText = (html) => {
    const d = new DOMParser().parseFromString(`<body>${html || ''}</body>`, 'text/html');
    return (d.body.textContent || '').trim();
  };
  const padHasText = () => !!htmlToText(data.pad?.html);
  const hasContent = () => data.highlights.length || data.notes.length || padHasText();

  // ------------------------------------------------------------------ storage
  async function load() {
    if (!extensionAlive()) return;
    const res = await chrome.storage.local.get([key, 'settings']);
    settings = { ...DEFAULT_SETTINGS, ...(res.settings || {}) };
    const page = res[key];
    data = {
      highlights: Array.isArray(page?.highlights) ? page.highlights : [],
      notes: Array.isArray(page?.notes) ? page.notes : [],
      pad: { html: typeof page?.pad?.html === 'string' ? page.pad.html : '' }
    };
    pageUrl = location.href;
    applySettings();
    renderAll();
  }

  function scheduleSave() {
    dirty = true;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(save, 400);
    setPadStatus('Saving…');
  }

  function save() {
    clearTimeout(saveTimer);
    if (!dirty || !extensionAlive()) return;
    dirty = false;
    try {
      if (!hasContent()) {
        myWrites.add('removed');
        chrome.storage.local.remove(key);
      } else {
        const stamp = Date.now() + Math.random();
        myWrites.add(stamp);
        chrome.storage.local.set({
          [key]: {
            url: pageUrl,
            title: document.title || pageUrl,
            updated: stamp,
            highlights: data.highlights,
            notes: data.notes,
            pad: { html: data.pad.html, text: htmlToText(data.pad.html).slice(0, 5000) }
          }
        });
      }
      setPadStatus('Saved');
    } catch (e) {
      /* extension reloaded; this old script can no longer save */
    }
  }

  function saveSettings() {
    try { chrome.storage.local.set({ settings }); } catch {}
  }

  // Something visible changed: save it and refresh the bits of UI that summarize it.
  function changed() {
    scheduleSave();
    updateDock();
    refreshPadHighlights();
  }

  window.addEventListener('pagehide', save, on);
  window.addEventListener('beforeunload', save, on);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') save();
  }, on);

  chrome.storage.onChanged.addListener((changes, area) => {
    if (dead || area !== 'local') return;
    if (changes.settings) {
      settings = { ...DEFAULT_SETTINGS, ...(changes.settings.newValue || {}) };
      applySettings();
    }
    const c = changes[key];
    if (!c) return;
    const nv = c.newValue;
    if (nv && myWrites.has(nv.updated)) { myWrites.delete(nv.updated); return; }
    if (!nv && myWrites.has('removed')) { myWrites.delete('removed'); return; }
    data = {
      highlights: nv?.highlights || [],
      notes: nv?.notes || [],
      pad: { html: nv?.pad?.html || '' }
    };
    clearDom();
    renderAll();
  });

  // ---------------------------------------------------------------- sanitizer
  // Notes are stored as HTML; this keeps only harmless formatting.
  const KEEP_TAGS = new Set(['P', 'DIV', 'BR', 'B', 'STRONG', 'I', 'EM', 'U', 'S', 'STRIKE', 'DEL', 'SPAN', 'H1', 'H2', 'H3', 'UL', 'OL', 'LI', 'BLOCKQUOTE', 'A', 'CODE', 'PRE', 'SUB', 'SUP', 'HR']);
  const DROP_TAGS = new Set(['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'TEMPLATE', 'NOSCRIPT', 'SVG', 'MATH', 'IMG', 'PICTURE', 'VIDEO', 'AUDIO', 'CANVAS', 'INPUT', 'BUTTON', 'SELECT', 'TEXTAREA', 'FORM', 'LINK', 'META', 'HEAD', 'TITLE']);
  const STYLE_ALL = ['font-family', 'font-size', 'font-weight', 'font-style', 'text-decoration-line', 'background-color', 'color', 'text-align'];
  const STYLE_PASTE = ['font-weight', 'font-style', 'text-decoration-line'];

  function sanitize(html, { paste = false } = {}) {
    const doc = new DOMParser().parseFromString(`<body>${html || ''}</body>`, 'text/html');
    const allowed = paste ? STYLE_PASTE : STYLE_ALL;
    const probe = document.createElement('span');
    const walk = (node) => {
      for (const ch of [...node.childNodes]) {
        if (ch.nodeType === Node.TEXT_NODE) continue;
        if (ch.nodeType !== Node.ELEMENT_NODE) { ch.remove(); continue; }
        const tag = ch.tagName;
        if (DROP_TAGS.has(tag)) { ch.remove(); continue; }
        walk(ch);
        if (tag === 'FONT') {
          const s = doc.createElement('span');
          if (!paste && ch.getAttribute('face')) s.style.fontFamily = ch.getAttribute('face');
          while (ch.firstChild) s.appendChild(ch.firstChild);
          ch.replaceWith(s);
          continue;
        }
        if (!KEEP_TAGS.has(tag)) {
          const frag = doc.createDocumentFragment();
          while (ch.firstChild) frag.appendChild(ch.firstChild);
          if (/^(H[4-6]|SECTION|ARTICLE|HEADER|FOOTER|TABLE|TR|FIGURE|DD|DT)$/.test(tag)) {
            const p = doc.createElement('p');
            p.appendChild(frag);
            ch.replaceWith(p);
          } else ch.replaceWith(frag);
          continue;
        }
        const keep = {};
        if (tag === 'A') {
          const href = ch.getAttribute('href') || '';
          if (/^(https?:|mailto:)/i.test(href)) keep.href = href;
        }
        if (tag === 'UL' && ch.classList.contains('checklist')) keep.class = 'checklist';
        if (tag === 'LI' && ch.hasAttribute('data-checked'))
          keep['data-checked'] = ch.getAttribute('data-checked') === 'true' ? 'true' : 'false';
        let style = '';
        const raw = ch.getAttribute('style');
        if (raw) {
          probe.setAttribute('style', raw);
          style = allowed
            .map((p) => {
              const v = probe.style.getPropertyValue(p);
              return v && !/url\(|expression|var\(/i.test(v) ? `${p}:${v}` : '';
            })
            .filter(Boolean)
            .join(';');
        }
        for (const a of [...ch.attributes]) ch.removeAttribute(a.name);
        for (const [k, v] of Object.entries(keep)) ch.setAttribute(k, v);
        if (style) ch.setAttribute('style', style);
        if (tag === 'A') {
          ch.setAttribute('target', '_blank');
          ch.setAttribute('rel', 'noopener noreferrer');
        }
      }
    };
    walk(doc.body);
    return doc.body.innerHTML;
  }

  // ------------------------------------------------------ text anchoring utils
  // Highlights are stored as "exact text + a little text before/after it",
  // which survives page reloads far better than DOM paths do.
  function buildIndex() {
    const nodes = [];
    let text = '';
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode(n) {
        const p = n.parentElement;
        if (!p) return NodeFilter.FILTER_REJECT;
        if (p.closest('script,style,noscript,textarea,select,option,template,title'))
          return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    let n;
    while ((n = walker.nextNode())) {
      nodes.push({ node: n, start: text.length });
      text += n.data;
    }
    return { nodes, text };
  }

  function pointToOffset(idx, container, offset) {
    if (container.nodeType === Node.TEXT_NODE) {
      const e = idx.nodes.find((x) => x.node === container);
      if (e) return e.start + Math.min(offset, container.data.length);
    }
    const ref = container.nodeType === Node.TEXT_NODE ? container : container.childNodes[offset] || null;
    for (const e of idx.nodes) {
      if (ref === null) {
        if (!container.contains(e.node) && container.compareDocumentPosition(e.node) & Node.DOCUMENT_POSITION_FOLLOWING)
          return e.start;
      } else if (ref === e.node || ref.contains(e.node) || ref.compareDocumentPosition(e.node) & Node.DOCUMENT_POSITION_FOLLOWING) {
        return e.start;
      }
    }
    return idx.text.length;
  }

  function serializeRange(range) {
    const idx = buildIndex();
    const s = pointToOffset(idx, range.startContainer, range.startOffset);
    const e = pointToOffset(idx, range.endContainer, range.endOffset);
    if (e <= s) return null;
    const exact = idx.text.slice(s, e);
    if (!exact.trim()) return null;
    return {
      idx,
      anchor: { exact, prefix: idx.text.slice(Math.max(0, s - 40), s), suffix: idx.text.slice(e, e + 40), start: s }
    };
  }

  const commonSuffix = (a, b) => {
    let i = 0;
    while (i < a.length && i < b.length && a[a.length - 1 - i] === b[b.length - 1 - i]) i++;
    return i;
  };
  const commonPrefix = (a, b) => {
    let i = 0;
    while (i < a.length && i < b.length && a[i] === b[i]) i++;
    return i;
  };

  function locate(idx, h) {
    const t = idx.text;
    let best = null;
    let bestScore = -Infinity;
    let i = t.indexOf(h.exact);
    while (i !== -1) {
      const pre = t.slice(Math.max(0, i - h.prefix.length), i);
      const suf = t.slice(i + h.exact.length, i + h.exact.length + h.suffix.length);
      const score = commonSuffix(pre, h.prefix) + commonPrefix(suf, h.suffix) - Math.abs(i - h.start) / 100000;
      if (score > bestScore) { bestScore = score; best = i; }
      i = t.indexOf(h.exact, i + 1);
    }
    return best === null ? null : { start: best, end: best + h.exact.length };
  }

  function wrapRange(idx, start, end, h) {
    const marks = [];
    for (const e of idx.nodes) {
      const ns = e.start;
      const ne = e.start + e.node.data.length;
      if (ne <= start || ns >= end) continue;
      let node = e.node;
      const a = Math.max(start, ns) - ns;
      const b = Math.min(end, ne) - ns;
      if (!node.data.slice(a, b).trim()) continue;
      if (b < node.data.length) node.splitText(b);
      if (a > 0) node = node.splitText(a);
      const m = document.createElement('mark');
      m.className = 'pn-hl';
      m.dataset.pnId = h.id;
      node.parentNode.insertBefore(m, node);
      m.appendChild(node);
      marks.push(m);
    }
    return marks;
  }

  const marksFor = (id) => document.querySelectorAll(`mark.pn-hl[data-pn-id="${CSS.escape(id)}"]`);

  function decorate(h) {
    marksFor(h.id).forEach((m) => {
      m.dataset.color = h.color;
      m.classList.toggle('pn-has-note', !!h.note);
      if (h.note) m.title = h.note;
      else m.removeAttribute('title');
    });
  }

  function unwrapMark(m) {
    const p = m.parentNode;
    if (!p) return;
    while (m.firstChild) p.insertBefore(m.firstChild, m);
    p.removeChild(m);
    p.normalize();
  }

  function restoreHighlights() {
    let pending = 0;
    for (const h of data.highlights) {
      if (marksFor(h.id).length) continue;
      const idx = buildIndex();
      const loc = locate(idx, h);
      if (!loc) { pending++; continue; }
      wrapRange(idx, loc.start, loc.end, h);
      decorate(h);
    }
    return pending;
  }

  let retryObserver = null;
  let retryStop = null;
  function retryLater() {
    if (retryObserver) return;
    let t;
    retryObserver = new MutationObserver(() => {
      clearTimeout(t);
      t = setTimeout(() => {
        const left = restoreHighlights();
        refreshPadHighlights();
        if (!left) stopRetry();
      }, 600);
    });
    retryObserver.observe(document.body, { childList: true, subtree: true, characterData: true });
    retryStop = setTimeout(stopRetry, 20000);
  }
  function stopRetry() {
    if (retryObserver) retryObserver.disconnect();
    retryObserver = null;
    clearTimeout(retryStop);
  }

  // ------------------------------------------------------------------- fonts
  function injectFonts() {
    if (document.getElementById('pn-font-faces')) return;
    const s = document.createElement('style');
    s.id = 'pn-font-faces';
    s.textContent = fontFaceCSS((p) => chrome.runtime.getURL(p));
    (document.head || document.documentElement).appendChild(s);
  }
  injectFonts();

  // --------------------------------------------------------------- shadow UI
  const host = document.createElement('page-notes-root');
  host.style.cssText = 'all:initial;position:absolute;top:0;left:0;width:0;height:0;z-index:2147483647;';
  const shadow = host.attachShadow({ mode: 'open' });
  shadow.innerHTML = `<style>${UI_CSS()}</style><div class="layer"></div>`;
  const layer = shadow.querySelector('.layer');
  // Clear out anything an older copy left behind before drawing our own.
  document.querySelectorAll('page-notes-root').forEach((h) => h.remove());
  document.querySelectorAll('mark.pn-hl').forEach(unwrapMark);
  document.documentElement.appendChild(host);

  ['keydown', 'keyup', 'keypress'].forEach((t) => layer.addEventListener(t, (e) => e.stopPropagation()));

  const inOurUI = (e) => e.composedPath().includes(host);
  const isEditable = (node) => {
    const el = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
    return !!el?.closest('input,textarea,[contenteditable=""],[contenteditable="true"]');
  };
  const shadowSelection = () => (shadow.getSelection ? shadow.getSelection() : getSelection());

  function placeWithinViewport(el, left, top) {
    const maxLeft = window.scrollX + document.documentElement.clientWidth - el.offsetWidth - 8;
    el.style.left = Math.max(window.scrollX + 8, Math.min(left, maxLeft)) + 'px';
    el.style.top = top + 'px';
  }

  // One floating menu at a time (sticky menu, dock menus, highlight editor).
  let openMenu = null;
  let openMenuOwner = null;
  function closeMenu() {
    openMenu?.remove();
    openMenu = null;
    openMenuOwner = null;
  }
  function showMenu(el, owner) {
    closeMenu();
    openMenu = el;
    openMenuOwner = owner || null;
    layer.appendChild(el);
  }
  layer.addEventListener('mousedown', (e) => {
    if (!openMenu) return;
    const path = e.composedPath();
    if (path.includes(openMenu) || (openMenuOwner && path.includes(openMenuOwner))) return;
    closeMenu();
  });

  // --------------------------------------------------------- selection toolbar
  let toolbar = null;
  function hideToolbar() {
    toolbar?.remove();
    toolbar = null;
  }
  function showToolbar(range) {
    hideToolbar();
    const rects = range.getClientRects();
    const r = rects[rects.length - 1] || range.getBoundingClientRect();
    toolbar = document.createElement('div');
    toolbar.className = 'toolbar';
    toolbar.innerHTML =
      COLOR_KEYS.map(
        (c) => `<button class="dot${c === settings.color ? ' active' : ''}" data-c="${c}" title="Highlight ${c}" style="background:${COLORS[c]}"></button>`
      ).join('') +
      '<span class="sep"></span>' +
      `<button class="tbtn" data-act="note" title="Highlight and write a note about it">${icon('pen', 15)}Note</button>` +
      `<button class="tbtn" data-act="pad" title="Highlight and quote it in this page's notepad">${icon('toPad', 15)}Notepad</button>`;
    toolbar.addEventListener('mousedown', (e) => e.preventDefault());
    toolbar.addEventListener('click', (e) => {
      const dot = e.target.closest('.dot');
      const act = e.target.closest('[data-act]')?.dataset.act;
      if (dot) highlightSelection(dot.dataset.c);
      else if (act === 'note') highlightSelection(settings.color, { withNote: true });
      else if (act === 'pad') highlightSelection(settings.color, { toPad: true });
    });
    layer.appendChild(toolbar);
    placeWithinViewport(toolbar, r.right + window.scrollX - toolbar.offsetWidth / 2, r.bottom + window.scrollY + 10);
  }

  // ---------------------------------------------------------------- highlights
  function highlightSelection(color = settings.color, { withNote = false, toPad = false } = {}) {
    const sel = getSelection();
    if (!sel || !sel.rangeCount || sel.isCollapsed) return;
    const range = sel.getRangeAt(0);
    if (host.contains(range.commonAncestorContainer)) return;
    const res = serializeRange(range);
    if (!res) return;
    const h = { id: uid(), color, note: '', created: Date.now(), ...res.anchor };
    const marks = wrapRange(res.idx, h.start, h.start + h.exact.length, h);
    if (!marks.length) return;
    data.highlights.push(h);
    decorate(h);
    sel.removeAllRanges();
    hideToolbar();
    rememberColor(color);
    changed();
    if (withNote) openHighlightEditor(h, marks[0], true);
    if (toPad) insertQuoteInPad(h);
  }

  function rememberColor(color) {
    if (settings.color === color) return;
    settings.color = color;
    saveSettings();
    updateDock();
  }

  function deleteHighlight(id) {
    marksFor(id).forEach(unwrapMark);
    data.highlights = data.highlights.filter((h) => h.id !== id);
    changed();
  }

  function openHighlightEditor(h, anchorEl, focus = false) {
    hideToolbar();
    const r = anchorEl.getBoundingClientRect();
    const card = document.createElement('div');
    card.className = 'card hl-pop';
    card.innerHTML =
      '<div class="row">' +
      COLOR_KEYS.map(
        (c) => `<button class="dot${c === h.color ? ' active' : ''}" data-c="${c}" title="${c}" style="background:${COLORS[c]}"></button>`
      ).join('') +
      '<span class="grow"></span>' +
      `<button class="ibtn" data-act="pad" title="Quote in notepad">${icon('toPad', 16)}</button>` +
      `<button class="ibtn danger" data-act="del" title="Remove highlight">${icon('trash', 16)}</button></div>` +
      `<div class="quote">${esc(h.exact.trim())}</div>` +
      '<textarea class="field" placeholder="Add a note to this highlight…"></textarea>';
    const ta = card.querySelector('textarea');
    ta.value = h.note || '';
    ta.style.fontFamily = fontStack(settings.font);
    card.addEventListener('click', (e) => {
      const dot = e.target.closest('.dot');
      const act = e.target.closest('[data-act]')?.dataset.act;
      if (dot) {
        h.color = dot.dataset.c;
        card.querySelectorAll('.dot').forEach((d) => d.classList.toggle('active', d === dot));
        decorate(h);
        rememberColor(h.color);
        changed();
      } else if (act === 'del') {
        deleteHighlight(h.id);
        closeMenu();
      } else if (act === 'pad') {
        insertQuoteInPad(h);
        closeMenu();
      }
    });
    ta.addEventListener('input', () => {
      h.note = ta.value;
      decorate(h);
      changed();
    });
    ta.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeMenu();
    });
    showMenu(card);
    placeWithinViewport(card, r.left + window.scrollX, r.bottom + window.scrollY + 8);
    if (focus) ta.focus();
  }

  // ------------------------------------------------------------ rich text glue
  function exec(cmd, value = null) {
    const css = ['fontName', 'hiliteColor', 'foreColor'].includes(cmd);
    document.execCommand('styleWithCSS', false, css);
    document.execCommand(cmd, false, value);
  }

  function handlePaste(e, after) {
    e.preventDefault();
    const html = e.clipboardData.getData('text/html');
    const text = e.clipboardData.getData('text/plain');
    if (html) document.execCommand('insertHTML', false, sanitize(html, { paste: true }));
    else document.execCommand('insertText', false, text);
    after();
  }

  // Cmd/Ctrl+click opens links inside notes; plain click edits them.
  function handleLinkClick(e) {
    const a = e.target.closest('a[href]');
    if (a && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      window.open(a.href, '_blank', 'noopener');
    }
  }

  // Checklist boxes are drawn with CSS; clicking the box area toggles it.
  function handleChecklistClick(e) {
    const li = e.target.closest('ul.checklist > li');
    if (!li) return false;
    const r = li.getBoundingClientRect();
    if (e.clientX - r.left > 26) return false;
    e.preventDefault();
    li.dataset.checked = li.dataset.checked === 'true' ? 'false' : 'true';
    return true;
  }

  function toggleChecklist(root) {
    const sel = shadowSelection();
    const node = sel?.anchorNode;
    const el = node && (node.nodeType === 1 ? node : node.parentElement);
    const ul = el?.closest('ul');
    if (ul && root.contains(ul) && ul.classList.contains('checklist')) {
      exec('insertUnorderedList');
      return;
    }
    if (!(ul && root.contains(ul))) exec('insertUnorderedList');
    const sel2 = shadowSelection();
    const n2 = sel2?.anchorNode;
    const el2 = n2 && (n2.nodeType === 1 ? n2 : n2.parentElement);
    const list = el2?.closest('ul');
    if (list && root.contains(list)) {
      list.classList.add('checklist');
      list.querySelectorAll(':scope > li').forEach((li) => {
        if (!li.dataset.checked) li.dataset.checked = 'false';
      });
    }
  }

  // ------------------------------------------------------------- sticky notes
  const noteEls = new Map();

  function addNote(x, y, html = '') {
    const w = 250;
    const rightGap = panelOpen() ? settings.panelWidth + 70 : 80;
    const n = {
      id: uid(),
      html,
      text: htmlToText(html),
      color: 'yellow',
      font: null,
      size: 'M',
      x: Math.round(x ?? window.scrollX + document.documentElement.clientWidth - w - rightGap),
      y: Math.round(y ?? window.scrollY + 90),
      w,
      h: 180,
      collapsed: false,
      created: Date.now()
    };
    data.notes.push(n);
    const el = renderNote(n);
    focusEnd(el.querySelector('.nbody'));
    changed();
  }

  function deleteNote(id) {
    noteEls.get(id)?.remove();
    noteEls.delete(id);
    data.notes = data.notes.filter((n) => n.id !== id);
    changed();
  }

  function focusEnd(el) {
    el.focus();
    const sel = shadowSelection();
    if (!sel) return;
    const r = document.createRange();
    r.selectNodeContents(el);
    r.collapse(false);
    sel.removeAllRanges();
    sel.addRange(r);
  }

  function styleNote(n, el) {
    const body = el.querySelector('.nbody');
    const f = n.font || settings.font;
    body.style.fontFamily = fontStack(f);
    body.style.fontSize = (settings.fontSize * fontScale(f) * (NOTE_SIZES[n.size] || 1)).toFixed(1) + 'px';
    el.style.background = NOTE_BG[n.color] || NOTE_BG.yellow;
    el.style.setProperty('--tint', COLORS[n.color] || COLORS.yellow);
  }

  function renderNote(n) {
    if (n.html == null) n.html = esc(n.text || '').replace(/\n/g, '<br>'); // notes from v1
    const el = document.createElement('div');
    el.className = 'note';
    el.dataset.id = n.id;
    el.innerHTML =
      `<div class="nhead"><span class="grip">${icon('grip', 14)}</span><span class="title"></span>` +
      `<button class="ibtn" data-act="menu" title="Color, font & more">${icon('more', 16)}</button>` +
      `<button class="ibtn" data-act="collapse"></button>` +
      `<button class="ibtn danger" data-act="del" title="Delete note">${icon('trash', 15)}</button></div>` +
      '<div class="nbody rich" contenteditable="true" spellcheck="true" data-placeholder="Write something…"></div>';
    const body = el.querySelector('.nbody');
    const titleEl = el.querySelector('.title');
    const collapseBtn = el.querySelector('[data-act=collapse]');
    body.innerHTML = sanitize(n.html);

    let applying = false;
    const refreshEmpty = () => body.classList.toggle('is-empty', !body.textContent.trim() && !body.querySelector('li,hr'));
    function apply() {
      applying = true;
      el.style.left = n.x + 'px';
      el.style.top = n.y + 'px';
      el.style.width = (n.w || 250) + 'px';
      el.style.height = n.collapsed ? '' : (n.h || 180) + 'px';
      el.classList.toggle('collapsed', !!n.collapsed);
      titleEl.textContent = n.collapsed ? (n.text || '').trim().split('\n')[0] || 'Note' : '';
      collapseBtn.innerHTML = icon(n.collapsed ? 'plus' : 'minus', 15);
      collapseBtn.title = n.collapsed ? 'Expand' : 'Collapse';
      styleNote(n, el);
      refreshEmpty();
      requestAnimationFrame(() => (applying = false));
    }
    n._apply = apply;
    apply();

    const onInput = () => {
      n.html = body.innerHTML;
      n.text = body.innerText;
      n.updated = Date.now();
      refreshEmpty();
      changed();
    };
    body.addEventListener('input', onInput);
    body.addEventListener('paste', (e) => handlePaste(e, onInput));
    body.addEventListener('click', (e) => {
      handleLinkClick(e);
      if (handleChecklistClick(e)) onInput();
    });
    body.addEventListener('focus', () => document.execCommand('defaultParagraphSeparator', false, 'div'));

    el.querySelector('.nhead').addEventListener('click', (e) => {
      const act = e.target.closest('[data-act]')?.dataset.act;
      if (act === 'collapse') {
        n.collapsed = !n.collapsed;
        apply();
        changed();
      } else if (act === 'del') {
        if (n.text && n.text.trim() && !confirm('Delete this note?')) return;
        deleteNote(n.id);
      } else if (act === 'menu') {
        if (openMenuOwner === e.target.closest('[data-act]')) closeMenu();
        else openNoteMenu(n, el, e.target.closest('[data-act]'));
      }
    });

    // Drag by the header
    const head = el.querySelector('.nhead');
    head.addEventListener('pointerdown', (e) => {
      if (e.target.closest('button') || e.button !== 0) return;
      e.preventDefault();
      const sx = e.pageX, sy = e.pageY, ox = n.x, oy = n.y;
      head.setPointerCapture(e.pointerId);
      el.classList.add('dragging');
      const move = (ev) => {
        n.x = Math.max(0, Math.round(ox + ev.pageX - sx));
        n.y = Math.max(0, Math.round(oy + ev.pageY - sy));
        el.style.left = n.x + 'px';
        el.style.top = n.y + 'px';
      };
      const up = () => {
        el.classList.remove('dragging');
        head.removeEventListener('pointermove', move);
        head.removeEventListener('pointerup', up);
        head.removeEventListener('pointercancel', up);
        scheduleSave();
      };
      head.addEventListener('pointermove', move);
      head.addEventListener('pointerup', up);
      head.addEventListener('pointercancel', up);
    });

    new ResizeObserver(() => {
      if (applying || n.collapsed || !el.isConnected) return;
      const w = el.offsetWidth, h = el.offsetHeight;
      if (Math.abs(w - n.w) > 1 || Math.abs(h - n.h) > 1) {
        n.w = w;
        n.h = h;
        scheduleSave();
      }
    }).observe(el);

    layer.appendChild(el);
    noteEls.set(n.id, el);
    return el;
  }

  function openNoteMenu(n, noteEl, btn) {
    const card = document.createElement('div');
    card.className = 'card nmenu';
    const fontOpts = [['', 'Default (' + (FONTS[settings.font] || FONTS.inter).label + ')', settings.font]]
      .concat(Object.entries(FONTS).map(([k, f]) => [k, f.label, k]));
    card.innerHTML =
      '<div class="mlabel">Color</div><div class="row">' +
      COLOR_KEYS.map(
        (c) => `<button class="dot big${c === n.color ? ' active' : ''}" data-c="${c}" title="${c}" style="background:${NOTE_BG[c]};box-shadow:inset 0 0 0 2px ${COLORS[c]}"></button>`
      ).join('') +
      '</div><div class="mlabel">Font</div><div class="fontgrid">' +
      fontOpts
        .map(
          ([k, label, styleKey]) =>
            `<button class="fopt${(n.font || '') === k ? ' active' : ''}" data-f="${k}" style="font-family:${esc(fontStack(styleKey))}">${esc(label)}</button>`
        )
        .join('') +
      '</div><div class="mlabel">Text size</div><div class="seg">' +
      Object.keys(NOTE_SIZES)
        .map((s) => `<button class="${(n.size || 'M') === s ? 'active' : ''}" data-s="${s}">${{ S: 'Small', M: 'Medium', L: 'Large' }[s]}</button>`)
        .join('') +
      '</div><div class="mdiv"></div>' +
      `<button class="mitem" data-act="topad">${icon('toPad', 16)}Move to notepad</button>` +
      `<button class="mitem" data-act="copy">${icon('copy', 16)}Copy text</button>`;
    card.addEventListener('mousedown', (e) => {
      if (e.target.closest('button')) e.preventDefault();
    });
    card.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      if (b.dataset.c) {
        n.color = b.dataset.c;
        card.querySelectorAll('[data-c]').forEach((d) => d.classList.toggle('active', d === b));
      } else if (b.dataset.f !== undefined) {
        n.font = b.dataset.f || null;
        card.querySelectorAll('[data-f]').forEach((d) => d.classList.toggle('active', d === b));
      } else if (b.dataset.s) {
        n.size = b.dataset.s;
        card.querySelectorAll('[data-s]').forEach((d) => d.classList.toggle('active', d === b));
      } else if (b.dataset.act === 'topad') {
        closeMenu();
        appendToPad(sanitize(n.html) + '<p><br></p>');
        deleteNote(n.id);
        return;
      } else if (b.dataset.act === 'copy') {
        copyText(n.text || '');
        closeMenu();
        return;
      }
      styleNote(n, noteEl);
      changed();
    });
    showMenu(card, btn);
    const r = btn.getBoundingClientRect();
    card.style.position = 'fixed';
    card.style.left = Math.min(r.left, innerWidth - card.offsetWidth - 10) + 'px';
    card.style.top = Math.min(r.bottom + 6, innerHeight - card.offsetHeight - 10) + 'px';
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const t = document.createElement('textarea');
      t.value = text;
      t.style.cssText = 'position:fixed;opacity:0';
      document.body.appendChild(t);
      t.select();
      document.execCommand('copy');
      t.remove();
    }
    toast('Copied');
  }

  function toast(msg) {
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
    layer.appendChild(t);
    setTimeout(() => t.classList.add('out'), 1300);
    setTimeout(() => t.remove(), 1700);
  }

  // ------------------------------------------------------------- notepad panel
  let panel = null;
  let paper = null;
  let padRange = null;
  const panelOpen = () => !!panel && !panel.classList.contains('hidden');

  function setPadStatus(s) {
    const st = panel?.querySelector('.status');
    if (st) st.textContent = s;
  }

  function buildPanel() {
    panel = document.createElement('div');
    panel.className = 'panel hidden';
    const fontOptions = Object.entries(FONTS)
      .map(([k, f]) => `<option value="${k}">${esc(f.label)}</option>`)
      .join('');
    panel.innerHTML = `
      <div class="resizer" title="Drag to resize"></div>
      <div class="phead">
        <div class="ptitle"><div class="pt1">${icon('pad', 17)}<span>Notepad</span></div><div class="pt2"></div></div>
        <button class="ibtn" data-act="copy" title="Copy all as text">${icon('copy', 17)}</button>
        <button class="ibtn" data-act="download" title="Download as Markdown (.md)">${icon('download', 17)}</button>
        <button class="ibtn" data-act="close" title="Close notepad">${icon('x', 18)}</button>
      </div>
      <div class="fmt">
        <select class="sel fsel" title="Font"><option value="" disabled selected>Font</option>${fontOptions}</select>
        <select class="sel ssel" title="Text size"><option value="" disabled selected>Size</option>
          <option value="2">Small</option><option value="3">Normal</option><option value="4">Large</option><option value="5">Larger</option><option value="6">Huge</option></select>
        <span class="vsep"></span>
        <button class="ibtn" data-cmd="bold" title="Bold (Ctrl/⌘+B)">${icon('bold', 16)}</button>
        <button class="ibtn" data-cmd="italic" title="Italic (Ctrl/⌘+I)">${icon('italic', 16)}</button>
        <button class="ibtn" data-cmd="underline" title="Underline (Ctrl/⌘+U)">${icon('underline', 16)}</button>
        <button class="ibtn" data-cmd="strikeThrough" title="Strikethrough">${icon('strike', 16)}</button>
        <span class="vsep"></span>
        <button class="ibtn txt" data-block="h1" title="Big heading">H1</button>
        <button class="ibtn txt" data-block="h2" title="Small heading">H2</button>
        <button class="ibtn" data-block="blockquote" title="Quote">${icon('quote', 16)}</button>
        <span class="vsep"></span>
        <button class="ibtn" data-cmd="insertUnorderedList" title="Bulleted list">${icon('ul', 16)}</button>
        <button class="ibtn" data-cmd="insertOrderedList" title="Numbered list">${icon('ol', 16)}</button>
        <button class="ibtn" data-act="checklist" title="Checklist">${icon('check', 16)}</button>
        <span class="vsep"></span>
        <button class="ibtn" data-act="marker" title="Highlight text in your notes">${icon('marker', 16)}</button>
        <button class="ibtn" data-act="link" title="Add link (Ctrl/⌘+K)">${icon('link', 16)}</button>
        <button class="ibtn" data-act="clear" title="Clear formatting">${icon('clear', 16)}</button>
      </div>
      <div class="pscroll"><div class="paper rich" contenteditable="true" spellcheck="true" data-placeholder="Start typing your notes for this page…"></div></div>
      <div class="hls">
        <button class="hls-toggle"><span class="chev"></span><span>Highlights on this page</span><span class="count"></span></button>
        <div class="hls-list"></div>
      </div>
      <div class="pfoot"><span class="status">Saved</span><span class="grow"></span><span class="wc"></span></div>`;
    paper = panel.querySelector('.paper');
    layer.appendChild(panel);

    const onInput = () => {
      data.pad.html = paper.innerHTML;
      refreshPadMeta();
      changed();
    };
    paper.addEventListener('input', (e) => {
      // A new checklist item should start unchecked
      if (e.inputType === 'insertParagraph') {
        const n = shadowSelection()?.anchorNode;
        const li = n && (n.nodeType === 1 ? n : n.parentElement)?.closest('ul.checklist > li');
        if (li) li.dataset.checked = 'false';
      }
      onInput();
    });
    paper.addEventListener('paste', (e) => handlePaste(e, onInput));
    paper.addEventListener('click', (e) => {
      handleLinkClick(e);
      if (handleChecklistClick(e)) onInput();
    });
    paper.addEventListener('focus', () => document.execCommand('defaultParagraphSeparator', false, 'p'));
    paper.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        addLink(onInput);
      }
    });

    const fmt = panel.querySelector('.fmt');
    fmt.addEventListener('mousedown', (e) => {
      if (e.target.closest('button')) e.preventDefault(); // keep the text selection
    });
    fmt.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      restorePadRange();
      if (b.dataset.cmd) exec(b.dataset.cmd);
      else if (b.dataset.block) {
        const cur = currentBlock();
        exec('formatBlock', cur === b.dataset.block ? 'p' : b.dataset.block);
      } else if (b.dataset.act === 'checklist') toggleChecklist(paper);
      else if (b.dataset.act === 'marker') exec('hiliteColor', COLORS[settings.color]);
      else if (b.dataset.act === 'link') return addLink(onInput);
      else if (b.dataset.act === 'clear') {
        exec('removeFormat');
        exec('formatBlock', 'p');
      }
      onInput();
      updateFmtState();
    });
    panel.querySelector('.fsel').addEventListener('change', (e) => {
      restorePadRange();
      exec('fontName', fontStack(e.target.value));
      e.target.selectedIndex = 0;
      onInput();
    });
    panel.querySelector('.ssel').addEventListener('change', (e) => {
      restorePadRange();
      exec('fontSize', e.target.value);
      fixFontSizes(paper);
      e.target.selectedIndex = 0;
      onInput();
    });

    panel.querySelector('.phead').addEventListener('click', (e) => {
      const act = e.target.closest('[data-act]')?.dataset.act;
      if (act === 'close') closePad();
      else if (act === 'copy') copyText(paper.innerText.trim());
      else if (act === 'download') downloadMarkdown();
    });

    panel.querySelector('.hls-toggle').addEventListener('click', () => {
      settings.hlsOpen = !settings.hlsOpen;
      saveSettings();
      refreshPadHighlights();
    });
    panel.querySelector('.hls-list').addEventListener('click', (e) => {
      const item = e.target.closest('[data-id]');
      if (!item) return;
      const h = data.highlights.find((x) => x.id === item.dataset.id);
      if (!h) return;
      if (e.target.closest('[data-act=insert]')) insertQuoteInPad(h);
      else scrollToItem(h.id);
    });

    // Resize by dragging the left edge
    const resizer = panel.querySelector('.resizer');
    resizer.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      resizer.setPointerCapture(e.pointerId);
      const move = (ev) => {
        settings.panelWidth = Math.round(Math.max(320, Math.min(innerWidth - 120, innerWidth - ev.clientX)));
        applyPanelLayout();
      };
      const up = () => {
        resizer.removeEventListener('pointermove', move);
        resizer.removeEventListener('pointerup', up);
        saveSettings();
      };
      resizer.addEventListener('pointermove', move);
      resizer.addEventListener('pointerup', up);
    });
  }

  document.addEventListener('selectionchange', () => {
    if (!paper || !panelOpen()) return;
    const sel = shadowSelection();
    if (sel && sel.rangeCount && paper.contains(sel.anchorNode)) {
      padRange = sel.getRangeAt(0).cloneRange();
      updateFmtState();
    }
  }, on);

  function restorePadRange() {
    if (shadow.activeElement === paper) return;
    paper.focus();
    const sel = shadowSelection();
    if (padRange && sel) {
      sel.removeAllRanges();
      sel.addRange(padRange);
    }
  }

  function currentBlock() {
    const n = shadowSelection()?.anchorNode;
    const el = n && (n.nodeType === 1 ? n : n.parentElement);
    const b = el?.closest('h1,h2,h3,blockquote,p,div,li');
    return b && paper.contains(b) ? b.tagName.toLowerCase() : 'p';
  }

  function updateFmtState() {
    if (!panel) return;
    panel.querySelectorAll('[data-cmd]').forEach((b) => {
      let on = false;
      try { on = document.queryCommandState(b.dataset.cmd); } catch {}
      b.classList.toggle('on', on);
    });
    const blk = currentBlock();
    panel.querySelectorAll('[data-block]').forEach((b) => b.classList.toggle('on', b.dataset.block === blk));
  }

  function fixFontSizes(root) {
    const map = { 1: '.75em', 2: '.85em', 3: '1em', 4: '1.25em', 5: '1.5em', 6: '2em', 7: '2.5em' };
    root.querySelectorAll('font[size]').forEach((f) => {
      const s = document.createElement('span');
      s.style.fontSize = map[f.getAttribute('size')] || '1em';
      while (f.firstChild) s.appendChild(f.firstChild);
      f.replaceWith(s);
    });
  }

  function addLink(after) {
    restorePadRange();
    const saved = padRange?.cloneRange();
    let url = prompt('Link to (URL):', 'https://');
    if (!url || url === 'https://') return;
    if (!/^(https?:|mailto:)/i.test(url)) url = 'https://' + url;
    paper.focus();
    const sel = shadowSelection();
    if (saved && sel) {
      sel.removeAllRanges();
      sel.addRange(saved);
    }
    if (!sel || sel.isCollapsed) document.execCommand('insertHTML', false, `<a href="${esc(url)}">${esc(url)}</a>&nbsp;`);
    else exec('createLink', url);
    after();
  }

  function applyPanelLayout() {
    if (!panel) return;
    panel.style.width = settings.panelWidth + 'px';
    paper.style.fontFamily = fontStack(settings.font);
    paper.style.fontSize = (settings.fontSize * fontScale(settings.font) + 1).toFixed(1) + 'px';
    updateDock();
  }

  function refreshPadMeta() {
    if (!panel) return;
    const text = paper.innerText.trim();
    const words = text ? text.split(/\s+/).length : 0;
    panel.querySelector('.wc').textContent = `${words} word${words === 1 ? '' : 's'}`;
    paper.classList.toggle('is-empty', !text && !paper.querySelector('li,hr'));
    panel.querySelector('.pt2').textContent = document.title || location.hostname;
  }

  function refreshPadHighlights() {
    if (!panel) return;
    const list = panel.querySelector('.hls-list');
    panel.querySelector('.count').textContent = data.highlights.length || '';
    panel.querySelector('.chev').innerHTML = icon(settings.hlsOpen ? 'chevD' : 'chevR', 14);
    panel.querySelector('.hls').classList.toggle('closed', !settings.hlsOpen);
    if (!data.highlights.length) {
      list.innerHTML = '<div class="hl-empty">Select text on the page to highlight it.</div>';
      return;
    }
    list.innerHTML = data.highlights
      .map((h) => {
        const placed = marksFor(h.id).length > 0;
        return (
          `<div class="hl-item" data-id="${esc(h.id)}"><span class="bar" style="background:${COLORS[h.color] || COLORS.yellow}"></span>` +
          `<div class="hl-body"><div class="t" title="Jump to it">${esc(h.exact.trim())}</div>` +
          (h.note ? `<div class="n">${esc(h.note)}</div>` : '') +
          (placed ? '' : '<div class="miss">Not found on the page right now</div>') +
          `</div><button class="ibtn" data-act="insert" title="Quote in notepad">${icon('insert', 15)}</button></div>`
        );
      })
      .join('');
  }

  function openPad() {
    if (!panel) buildPanel();
    paper.innerHTML = sanitize(data.pad.html);
    panel.classList.remove('hidden');
    applyPanelLayout();
    refreshPadMeta();
    refreshPadHighlights();
    setPadStatus('Saved');
    updateDock();
  }

  function closePad() {
    if (!panel) return;
    save();
    panel.classList.add('hidden');
    updateDock();
  }

  function togglePad() {
    panelOpen() ? closePad() : openPad();
  }

  function appendToPad(html) {
    if (!panelOpen()) openPad();
    // Drop a trailing empty paragraph so inserts don't leave gaps
    const last = paper.lastElementChild;
    if (last && !last.textContent.trim() && !last.querySelector('li,hr') && paper.children.length > 1) last.remove();
    paper.insertAdjacentHTML('beforeend', html);
    data.pad.html = paper.innerHTML;
    refreshPadMeta();
    changed();
    focusEnd(paper);
    paper.parentElement.scrollTop = paper.parentElement.scrollHeight;
  }

  function insertQuoteInPad(h) {
    const note = h.note ? `<p>${esc(h.note)}</p>` : '';
    appendToPad(`<blockquote>${esc(h.exact.trim())}</blockquote>${note}<p><br></p>`);
  }

  // ---------------------------------------------------------- markdown export
  // "**bold**" with any surrounding spaces kept outside the markers
  const wrapMd = (c, m) => (/^\s/.test(c) ? ' ' : '') + m + c.trim() + m + (/\s$/.test(c) ? ' ' : '');

  function inlineMd(node) {
    let out = '';
    for (const n of node.childNodes) {
      if (n.nodeType === Node.TEXT_NODE) { out += n.data.replace(/\s+/g, ' '); continue; }
      if (n.nodeType !== Node.ELEMENT_NODE) continue;
      const t = n.tagName;
      if (t === 'UL' || t === 'OL') continue;
      const c = inlineMd(n);
      if (t === 'BR') out += '  \n';
      else if (!c.trim()) out += c;
      else if (t === 'B' || t === 'STRONG' || /bold|[6-9]00/.test(n.style?.fontWeight || '')) out += wrapMd(c, '**');
      else if (t === 'I' || t === 'EM') out += wrapMd(c, '*');
      else if (t === 'S' || t === 'STRIKE' || t === 'DEL') out += wrapMd(c, '~~');
      else if (t === 'A') out += `[${c.trim()}](${n.getAttribute('href')})`;
      else if (t === 'CODE') out += '`' + c + '`';
      else if (/^(P|DIV|H\d|BLOCKQUOTE|LI)$/.test(t)) out += '\n' + c + '\n';
      else out += c;
    }
    return out;
  }

  function listMd(list, depth, lines) {
    let i = 1;
    for (const li of list.children) {
      if (li.tagName !== 'LI') continue;
      const pre = list.classList.contains('checklist')
        ? li.dataset.checked === 'true' ? '- [x] ' : '- [ ] '
        : list.tagName === 'OL' ? `${i++}. ` : '- ';
      lines.push('  '.repeat(depth) + pre + inlineMd(li).replace(/\s*\n\s*/g, ' ').trim());
      li.querySelectorAll(':scope > ul, :scope > ol').forEach((sub) => listMd(sub, depth + 1, lines));
    }
  }

  function blocksMd(root, lines) {
    for (const n of root.childNodes) {
      if (n.nodeType === Node.TEXT_NODE) {
        if (n.data.trim()) lines.push(n.data.trim(), '');
        continue;
      }
      if (n.nodeType !== Node.ELEMENT_NODE) continue;
      const t = n.tagName;
      const text = () => inlineMd(n).trim();
      if (t === 'H1') lines.push('# ' + text(), '');
      else if (t === 'H2') lines.push('## ' + text(), '');
      else if (t === 'H3') lines.push('### ' + text(), '');
      else if (t === 'BLOCKQUOTE') lines.push(text().split('\n').map((l) => '> ' + l.trim()).join('\n'), '');
      else if (t === 'UL' || t === 'OL') { listMd(n, 0, lines); lines.push(''); }
      else if (t === 'HR') lines.push('---', '');
      else if ((t === 'P' || t === 'DIV') && n.querySelector('p,div,ul,ol,h1,h2,h3,blockquote')) blocksMd(n, lines);
      else if (text()) lines.push(text(), '');
    }
  }

  function downloadMarkdown() {
    const lines = [`# Notes: ${document.title || location.hostname}`, '', `<${location.href}>`, ''];
    const body = [];
    blocksMd(paper, body);
    if (body.join('').trim()) lines.push(...body);
    if (data.notes.length) {
      lines.push('## Sticky notes', '');
      data.notes.forEach((n) => lines.push('- ' + (n.text || '').trim().replace(/\n+/g, ' / ')));
      lines.push('');
    }
    if (data.highlights.length) {
      lines.push('## Highlights', '');
      data.highlights.forEach((h) => {
        lines.push('> ' + h.exact.trim().replace(/\n+/g, ' '));
        if (h.note) lines.push('', h.note);
        lines.push('');
      });
    }
    const md = lines.join('\n').replace(/\n{3,}/g, '\n\n');
    const slug = (document.title || 'page').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50) || 'page';
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([md], { type: 'text/markdown' }));
    a.download = `${slug}-notes.md`;
    document.documentElement.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  // ------------------------------------------------------------- options dock
  let dock = null;
  function buildDock() {
    dock = document.createElement('div');
    dock.className = 'dock';
    layer.appendChild(dock);
    dock.addEventListener('mousedown', (e) => {
      if (e.target.closest('button')) e.preventDefault(); // don't steal focus/selection
    });
    dock.addEventListener('click', (e) => {
      const b = e.target.closest('[data-act]');
      if (!b) return;
      if (justDragged) { justDragged = false; return; } // a drag isn't a click
      const act = b.dataset.act;
      if (act === 'expand') { settings.dockOpen = true; saveSettings(); renderDock(); }
      else if (act === 'collapse') { settings.dockOpen = false; saveSettings(); closeMenu(); renderDock(); }
      else if (act === 'sticky') addNote();
      else if (act === 'pad') togglePad();
      else if (act === 'auto') {
        settings.autoMode = !settings.autoMode;
        saveSettings();
        updateDock();
        toast(settings.autoMode ? 'Highlighter on — select text to highlight' : 'Highlighter off');
      } else if (act === 'color') toggleDockMenu(b, colorMenu);
      else if (act === 'font') toggleDockMenu(b, fontMenu);
    });

    // Move the bar up or down the edge. In the full bar you drag the grip;
    // in the compact tab you can drag the whole tab (a plain click still
    // expands it).
    let justDragged = false;
    dock.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      const handle = e.target.closest('.dgrip') || (dock.classList.contains('mini') && e.target.closest('.dock'));
      if (!handle) return;
      const isGrip = handle.classList.contains('dgrip');
      if (isGrip) e.preventDefault();
      const startY = e.clientY;
      const startCenter = dock.getBoundingClientRect().top + dock.offsetHeight / 2;
      let dragging = isGrip;
      justDragged = false;
      // Listen on the window (not with pointer capture) so a plain click
      // still lands on the button underneath.
      const move = (ev) => {
        const dy = ev.clientY - startY;
        if (!dragging) {
          if (Math.abs(dy) < 4) return; // small wobble = still a click
          dragging = true;
        }
        ev.preventDefault();
        dock.classList.add('dragging');
        settings.dockY = (clampDockCenter(startCenter + dy) / innerHeight) * 100;
        dock.style.top = (settings.dockY / 100) * innerHeight + 'px';
        closeMenu();
      };
      const up = () => {
        window.removeEventListener('pointermove', move, true);
        window.removeEventListener('pointerup', up, true);
        window.removeEventListener('pointercancel', up, true);
        dock.classList.remove('dragging');
        if (dragging) {
          justDragged = !isGrip;
          setTimeout(() => (justDragged = false), 0);
          saveSettings();
        }
      };
      window.addEventListener('pointermove', move, true);
      window.addEventListener('pointerup', up, true);
      window.addEventListener('pointercancel', up, true);
    });
    window.addEventListener('resize', updateDock, on);
    renderDock();
  }

  // Keep the whole bar on screen, wherever its center was saved.
  function clampDockCenter(px) {
    const half = (dock?.offsetHeight || 0) / 2;
    return Math.max(half + 8, Math.min(innerHeight - half - 8, px));
  }

  function renderDock() {
    if (!dock) return;
    if (!settings.dockOpen) {
      dock.classList.add('mini');
      dock.innerHTML =
        `<div class="dgrip mini-grip" title="Drag to move">${icon('grip', 12)}</div>` +
        `<button class="dbtn" data-act="expand" data-tip="Click to open · drag to move">${icon('pen', 17)}</button>`;
    } else {
      dock.classList.remove('mini');
      dock.innerHTML =
        `<div class="dgrip" title="Drag to move">${icon('grip', 14)}</div>` +
        `<button class="dbtn" data-act="sticky" data-tip="New sticky note">${icon('sticky')}</button>` +
        `<button class="dbtn" data-act="pad" data-tip="Notepad for this page">${icon('pad')}<span class="pip"></span></button>` +
        '<span class="dsep"></span>' +
        `<button class="dbtn" data-act="auto" data-tip="Highlighter mode">${icon('marker')}</button>` +
        `<button class="dbtn" data-act="color" data-tip="Highlight color"><span class="dcolor"></span></button>` +
        '<span class="dsep"></span>' +
        `<button class="dbtn" data-act="font" data-tip="Note font & size">${icon('type')}</button>` +
        `<button class="dbtn small" data-act="collapse" data-tip="Minimize">${icon('chevR', 16)}</button>`;
    }
    updateDock();
  }

  function updateDock() {
    if (!dock) return;
    dock.style.display = settings.showDock ? '' : 'none';
    dock.style.top = clampDockCenter((settings.dockY / 100) * innerHeight) + 'px';
    dock.style.right = panelOpen() ? settings.panelWidth + 'px' : '0px';
    dock.querySelector('[data-act=auto]')?.classList.toggle('on', !!settings.autoMode);
    dock.querySelector('[data-act=pad]')?.classList.toggle('on', panelOpen());
    const pip = dock.querySelector('.pip');
    if (pip) pip.style.display = padHasText() && !panelOpen() ? '' : 'none';
    const c = dock.querySelector('.dcolor');
    if (c) c.style.background = COLORS[settings.color] || COLORS.yellow;
  }

  function toggleDockMenu(btn, builder) {
    if (openMenuOwner === btn) return closeMenu();
    const card = builder();
    card.classList.add('dmenu');
    showMenu(card, btn);
    const r = btn.getBoundingClientRect();
    card.style.right = innerWidth - r.left + 12 + 'px';
    card.style.top = Math.max(10, Math.min(r.top - 10, innerHeight - card.offsetHeight - 10)) + 'px';
  }

  function colorMenu() {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML =
      '<div class="mlabel">Highlight color</div><div class="row">' +
      COLOR_KEYS.map(
        (c) => `<button class="dot big${c === settings.color ? ' active' : ''}" data-c="${c}" title="${c}" style="background:${COLORS[c]}"></button>`
      ).join('') +
      '</div><div class="mhint">Tip: turn on Highlighter mode to highlight as soon as you select text.</div>';
    card.addEventListener('click', (e) => {
      const d = e.target.closest('[data-c]');
      if (!d) return;
      rememberColor(d.dataset.c);
      card.querySelectorAll('[data-c]').forEach((x) => x.classList.toggle('active', x === d));
    });
    return card;
  }

  function fontMenu() {
    const card = document.createElement('div');
    card.className = 'card fontmenu';
    const draw = () => {
      card.innerHTML =
        '<div class="mlabel">Note font</div><div class="fontlist">' +
        Object.entries(FONTS)
          .map(
            ([k, f]) =>
              `<button class="frow${k === settings.font ? ' active' : ''}" data-f="${k}">` +
              `<span class="fname" style="font-family:${esc(f.stack)}">${esc(f.label)}</span>` +
              `<span class="fkind">${esc(f.kind)}</span></button>`
          )
          .join('') +
        '</div><div class="mlabel">Text size</div><div class="seg">' +
        SIZES.map((s) => `<button class="${s === settings.fontSize ? 'active' : ''}" data-size="${s}">${s}</button>`).join('') +
        '</div><div class="preview" style="font-family:' + esc(fontStack(settings.font)) +
        ';font-size:' + settings.fontSize * fontScale(settings.font) + 'px">The quick brown fox jumps over the lazy dog.</div>' +
        '<div class="mdiv"></div>' +
        '<button class="mitem" data-act="hide">Hide this bar (bring it back from the extension icon)</button>';
    };
    draw();
    card.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      if (b.dataset.f) settings.font = b.dataset.f;
      else if (b.dataset.size) settings.fontSize = +b.dataset.size;
      else if (b.dataset.act === 'hide') {
        settings.showDock = false;
        saveSettings();
        closeMenu();
        updateDock();
        return;
      }
      saveSettings();
      applySettings();
      draw();
    });
    return card;
  }

  // ------------------------------------------------------- settings + render
  function applySettings() {
    if (!dock) buildDock();
    else renderDock();
    noteEls.forEach((el, id) => {
      const n = data.notes.find((x) => x.id === id);
      if (n) styleNote(n, el);
    });
    if (panel) applyPanelLayout();
  }

  function renderAll() {
    data.notes.forEach((n) => { if (!noteEls.has(n.id)) renderNote(n); });
    if (restoreHighlights()) retryLater();
    if (panelOpen() && shadow.activeElement !== paper) {
      paper.innerHTML = sanitize(data.pad.html);
      refreshPadMeta();
    }
    refreshPadHighlights();
    updateDock();
  }

  function clearDom() {
    stopRetry();
    closeMenu();
    hideToolbar();
    document.querySelectorAll('mark.pn-hl').forEach(unwrapMark);
    noteEls.forEach((el) => el.remove());
    noteEls.clear();
  }

  function clearPage() {
    clearDom();
    data = emptyData();
    if (paper) paper.innerHTML = '';
    refreshPadMeta();
    refreshPadHighlights();
    updateDock();
    dirty = true;
    save();
  }

  function scrollToItem(id) {
    const marks = marksFor(id);
    if (marks.length) {
      marks[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
      marks.forEach((m) => {
        m.classList.remove('pn-flash');
        void m.offsetWidth;
        m.classList.add('pn-flash');
        setTimeout(() => m.classList.remove('pn-flash'), 1300);
      });
      return;
    }
    const el = noteEls.get(id);
    if (el) {
      const n = data.notes.find((x) => x.id === id);
      window.scrollTo({ top: Math.max(0, n.y - 120), left: Math.max(0, n.x - 120), behavior: 'smooth' });
      el.classList.remove('flash');
      void el.offsetWidth;
      el.classList.add('flash');
    }
  }

  function getState() {
    return {
      key,
      url: pageUrl,
      title: document.title,
      padOpen: panelOpen(),
      pad: { text: htmlToText(data.pad.html).slice(0, 300) },
      highlights: data.highlights.map((h) => ({
        id: h.id, exact: h.exact, color: h.color, note: h.note, placed: marksFor(h.id).length > 0
      })),
      notes: data.notes.map((n) => ({ id: n.id, text: n.text, color: n.color }))
    };
  }

  // -------------------------------------------------------------- page events
  document.addEventListener('mouseup', (e) => {
    if (inOurUI(e) || e.button !== 0) return;
    setTimeout(() => {
      const sel = getSelection();
      if (!sel || !sel.rangeCount || sel.isCollapsed || !sel.toString().trim()) return;
      const range = sel.getRangeAt(0);
      if (isEditable(range.commonAncestorContainer)) return;
      if (settings.autoMode) highlightSelection(settings.color);
      else showToolbar(range);
    }, 0);
  }, on);

  document.addEventListener('mousedown', (e) => {
    if (inOurUI(e)) return;
    hideToolbar();
    closeMenu();
  }, { capture: true, signal: life.signal });

  document.addEventListener('click', (e) => {
    if (inOurUI(e)) return;
    const m = e.target.closest?.('mark.pn-hl');
    if (!m || m.closest('a,button')) return;
    const sel = getSelection();
    if (sel && !sel.isCollapsed) return;
    const h = data.highlights.find((x) => x.id === m.dataset.pnId);
    if (h) openHighlightEditor(h, m);
  }, on);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { hideToolbar(); closeMenu(); }
  }, on);

  document.addEventListener('contextmenu', (e) => { lastContext = { x: e.pageX, y: e.pageY }; }, { capture: true, signal: life.signal });

  // Single-page apps change the URL without reloading; some sites also
  // remove unknown elements from the page.
  function shutdown() {
    if (dead) return;
    try { save(); } catch {}
    dead = true;
    life.abort();
    clearInterval(tick);
    clearTimeout(saveTimer);
    stopRetry();
    host.remove();
  }
  document.addEventListener('page-notes:takeover', shutdown, on);

  const tick = setInterval(() => {
    if (!extensionAlive() || document.documentElement.getAttribute('data-page-notes') !== INSTANCE) return shutdown();
    if (!host.isConnected) document.documentElement.appendChild(host);
    if (!document.getElementById('pn-font-faces')) injectFonts();
    const k = pageKey();
    if (k !== key) {
      save();
      clearDom();
      key = k;
      data = emptyData();
      ready = load();
    }
  }, 1000);

  // ----------------------------------------------------------------- messages
  chrome.runtime.onMessage.addListener((msg, _sender, reply) => {
    if (dead) return false;
    ready.then(() => {
      switch (msg.type) {
        case 'highlight': highlightSelection(msg.color || settings.color); break;
        case 'newNote': addNote(); break;
        case 'newNoteAtContext': addNote(lastContext?.x, lastContext?.y); break;
        case 'openPad': openPad(); break;
        case 'togglePad': togglePad(); break;
        case 'scrollTo':
          if (msg.id === '__pad') openPad();
          else scrollToItem(msg.id);
          break;
        case 'deleteItem':
          if (msg.id === '__pad') {
            data.pad.html = '';
            if (paper) { paper.innerHTML = ''; refreshPadMeta(); }
          } else if (data.highlights.some((h) => h.id === msg.id)) deleteHighlight(msg.id);
          else deleteNote(msg.id);
          changed();
          save();
          break;
        case 'clearPage': clearPage(); break;
      }
      reply(getState());
    });
    return true;
  });

  let ready = load();

  // ---------------------------------------------------------------- UI styles
  function UI_CSS() {
    return `
:host{all:initial}
*{box-sizing:border-box}
.layer{position:absolute;top:0;left:0;--ui:"PN Inter",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;--ink:#1c1c1e;--muted:#6e6e73;--line:rgba(0,0,0,.09);--accent:#ffd84d;--dark:#1d1d20;font:13px/1.45 var(--ui);color:var(--ink);-webkit-font-smoothing:antialiased;letter-spacing:-.003em}
button{font:inherit;color:inherit;margin:0}
svg{display:block;flex:none}
@keyframes pop{from{opacity:0;transform:translateY(4px) scale(.98)}to{opacity:1;transform:none}}
@keyframes slide{from{opacity:0;transform:translateX(18px)}to{opacity:1;transform:none}}

/* selection toolbar */
.toolbar{position:absolute;display:flex;gap:3px;align-items:center;background:var(--dark);color:#f2f2f4;padding:5px 6px;border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,.28),inset 0 0 0 1px rgba(255,255,255,.07);white-space:nowrap;animation:pop .12s ease-out}
.dot{width:18px;height:18px;border-radius:50%;border:none;cursor:pointer;padding:0;margin:0 2px;box-shadow:inset 0 0 0 1.5px rgba(0,0,0,.14);transition:transform .1s}
.dot:hover{transform:scale(1.15)}
.dot.big{width:24px;height:24px}
.dot.active{box-shadow:0 0 0 2px #fff,0 0 0 4px var(--ink)}
.toolbar .dot.active{box-shadow:0 0 0 2px var(--dark),0 0 0 3.5px #fff}
.sep{width:1px;height:20px;background:rgba(255,255,255,.16);margin:0 4px}
.tbtn{display:inline-flex;align-items:center;gap:5px;background:none;border:none;color:#f2f2f4;cursor:pointer;padding:5px 8px;border-radius:8px;font-size:12.5px;font-weight:600}
.tbtn:hover{background:rgba(255,255,255,.12)}

/* cards & menus */
.card{position:absolute;background:#fff;border-radius:14px;box-shadow:0 16px 44px rgba(0,0,0,.18),0 0 0 1px var(--line);padding:12px;animation:pop .12s ease-out;color:var(--ink)}
.dmenu{position:fixed;width:280px}
.row{display:flex;align-items:center;gap:6px}
.grow{flex:1}
.mlabel{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;color:var(--muted);margin:2px 2px 8px}
.mlabel:not(:first-child){margin-top:14px}
.mhint{font-size:12px;color:var(--muted);margin-top:12px;line-height:1.4}
.mdiv{height:1px;background:var(--line);margin:10px -12px 6px}
.mitem{display:flex;align-items:center;gap:9px;width:100%;text-align:left;border:none;background:none;padding:7px 8px;border-radius:8px;cursor:pointer;font-size:13px;color:var(--ink)}
.mitem:hover{background:rgba(0,0,0,.05)}
.ibtn{display:inline-flex;align-items:center;justify-content:center;background:none;border:none;cursor:pointer;color:var(--muted);width:28px;height:28px;border-radius:7px;padding:0;flex:none}
.ibtn:hover{background:rgba(0,0,0,.07);color:var(--ink)}
.ibtn.on{background:rgba(255,216,77,.45);color:var(--ink)}
.ibtn.danger:hover{color:#d93025;background:rgba(217,48,37,.09)}
.seg{display:flex;background:rgba(0,0,0,.05);border-radius:9px;padding:3px;gap:2px}
.seg button{flex:1;border:none;background:none;border-radius:7px;padding:5px 0;cursor:pointer;font-size:12.5px;color:var(--muted);font-weight:500}
.seg button:hover{color:var(--ink)}
.seg button.active{background:#fff;color:var(--ink);box-shadow:0 1px 3px rgba(0,0,0,.12)}
.fontlist{display:flex;flex-direction:column;gap:1px;max-height:none;overflow:auto;margin:0 -4px}
.frow{display:flex;align-items:baseline;justify-content:space-between;gap:10px;border:none;background:none;border-radius:8px;padding:5px 10px;cursor:pointer;text-align:left}
.frow:hover{background:rgba(0,0,0,.05)}
.frow.active{background:rgba(255,216,77,.35)}
.fname{font-size:15.5px;color:var(--ink)}
.fkind{font-size:11px;color:var(--muted);white-space:nowrap}
.preview{margin-top:12px;padding:10px 12px;border-radius:10px;background:#faf9f6;box-shadow:inset 0 0 0 1px var(--line);color:#2b2a27;line-height:1.5}
.nmenu{width:250px}
.fontgrid{display:grid;grid-template-columns:1fr 1fr;gap:4px}
.fopt{border:none;background:rgba(0,0,0,.04);border-radius:8px;padding:7px 8px;cursor:pointer;font-size:13.5px;text-align:left;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--ink)}
.fopt:first-child{grid-column:1/-1}
.fopt:hover{background:rgba(0,0,0,.08)}
.fopt.active{background:rgba(255,216,77,.5)}

/* highlight editor */
.hl-pop{width:290px}
.hl-pop .quote{font-size:12.5px;color:var(--muted);border-left:3px solid var(--accent);padding:1px 0 1px 9px;margin:10px 0;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.field{display:block;width:100%;min-height:80px;resize:vertical;border:1px solid var(--line);border-radius:9px;padding:9px 11px;font-size:14px;line-height:1.45;color:var(--ink);background:#faf9f6;outline:none}
.field:focus{border-color:rgba(0,0,0,.22);background:#fff}

/* shared rich text */
.rich{word-wrap:break-word;overflow-wrap:anywhere}
.rich p,.rich div{margin:0}
.rich p{margin:0 0 .55em}
.rich h1{font-size:1.55em;line-height:1.25;margin:.5em 0 .35em;font-weight:700;letter-spacing:-.01em}
.rich h2{font-size:1.22em;line-height:1.3;margin:.5em 0 .3em;font-weight:700}
.rich h3{font-size:1.05em;margin:.4em 0 .25em;font-weight:700}
.rich > :first-child{margin-top:0}
.rich ul,.rich ol{margin:.25em 0 .6em;padding-left:1.45em}
.rich li{margin:.15em 0}
.rich blockquote{margin:.4em 0 .7em;padding:.15em 0 .15em .9em;border-left:3px solid var(--accent);color:#57554f}
.rich a{color:#1a62c9;text-decoration:underline;text-underline-offset:2px}
.rich code{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:.9em;background:rgba(0,0,0,.06);padding:.1em .3em;border-radius:4px}
.rich hr{border:none;border-top:1px solid var(--line);margin:1em 0}
.rich ul.checklist{list-style:none;padding-left:.15em}
.rich ul.checklist > li{position:relative;padding-left:1.65em}
.rich ul.checklist > li::before{content:"";position:absolute;left:0;top:.22em;width:1.05em;height:1.05em;border:1.6px solid #9b998f;border-radius:.3em;background:#fff;cursor:pointer;box-sizing:border-box}
.rich ul.checklist > li[data-checked="true"]::before{background:var(--ink);border-color:var(--ink)}
.rich ul.checklist > li[data-checked="true"]::after{content:"";position:absolute;left:.36em;top:.37em;width:.3em;height:.55em;border:solid #fff;border-width:0 .13em .13em 0;transform:rotate(45deg);pointer-events:none}
.rich ul.checklist > li[data-checked="true"]{color:#8f8d86;text-decoration:line-through;text-decoration-color:rgba(0,0,0,.3)}
.is-empty::before{content:attr(data-placeholder);color:rgba(0,0,0,.36);pointer-events:none;position:absolute}

/* sticky notes */
.note{position:absolute;display:flex;flex-direction:column;min-width:180px;min-height:42px;border-radius:12px;box-shadow:0 1px 2px rgba(0,0,0,.07),0 8px 26px rgba(0,0,0,.13);resize:both;overflow:hidden;transition:box-shadow .15s;color:#29261f}
.note::before{content:"";position:absolute;inset:0 0 auto 0;height:4px;background:var(--tint);opacity:.9}
.note:focus-within{box-shadow:0 1px 2px rgba(0,0,0,.08),0 16px 40px rgba(0,0,0,.19)}
.note.dragging{box-shadow:0 2px 4px rgba(0,0,0,.08),0 22px 50px rgba(0,0,0,.24);opacity:.97}
.nhead{display:flex;align-items:center;gap:1px;height:32px;padding:4px 5px 0 6px;cursor:grab;user-select:none;flex:none}
.note.dragging .nhead{cursor:grabbing}
.nhead .grip{color:rgba(0,0,0,.28);display:flex}
.nhead .title{flex:1;min-width:0;font-size:12.5px;font-weight:600;color:rgba(0,0,0,.6);overflow:hidden;white-space:nowrap;text-overflow:ellipsis;padding-left:3px}
.nhead .ibtn{width:24px;height:24px;color:rgba(0,0,0,.45);opacity:0;transition:opacity .12s}
.nhead .ibtn:hover{background:rgba(0,0,0,.08);color:rgba(0,0,0,.8)}
.note:hover .nhead .ibtn,.note:focus-within .nhead .ibtn,.note.collapsed .nhead .ibtn{opacity:1}
.nbody{position:relative;flex:1;overflow:auto;padding:0 16px 16px;outline:none;line-height:1.5;cursor:text}
.nbody.is-empty::before{top:0;left:16px}
.note.collapsed{resize:none;height:auto!important}
.note.collapsed .nbody{display:none}
.note.flash{animation:flash 1.2s ease-out 1}
@keyframes flash{0%,40%{box-shadow:0 0 0 4px rgba(255,150,0,.85)}100%{box-shadow:0 8px 26px rgba(0,0,0,.13)}}

/* notepad panel */
.panel{position:fixed;top:0;right:0;bottom:0;display:flex;flex-direction:column;background:#f3f2ee;border-left:1px solid rgba(0,0,0,.08);box-shadow:-14px 0 44px rgba(0,0,0,.13);animation:slide .18s ease-out}
.panel.hidden{display:none}
.resizer{position:absolute;left:-4px;top:0;bottom:0;width:8px;cursor:ew-resize;z-index:2}
.resizer:hover{background:linear-gradient(90deg,transparent 3px,rgba(0,0,0,.14) 3px,rgba(0,0,0,.14) 5px,transparent 5px)}
.phead{display:flex;align-items:center;gap:2px;padding:14px 12px 10px 18px}
.ptitle{flex:1;min-width:0}
.pt1{display:flex;align-items:center;gap:7px;font-size:15px;font-weight:700;letter-spacing:-.01em}
.pt2{font-size:12px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:1px}
.phead .ibtn{width:32px;height:32px}
.fmt{display:flex;flex-wrap:wrap;align-items:center;gap:1px;margin:0 12px;padding:4px;background:#fff;border-radius:11px;box-shadow:0 0 0 1px var(--line),0 1px 2px rgba(0,0,0,.04)}
.fmt .ibtn{width:30px;height:30px;color:#3b3b3e}
.fmt .ibtn.txt{font-weight:700;font-size:12.5px;width:32px}
.vsep{width:1px;height:18px;background:var(--line);margin:0 3px}
.sel{height:30px;border:none;background:transparent;border-radius:7px;padding:0 4px;color:#3b3b3e;cursor:pointer;font-size:12.5px;font-weight:500;outline:none}
.sel:hover{background:rgba(0,0,0,.06)}
.fsel{width:92px}.ssel{width:70px}
.pscroll{flex:1;overflow:auto;padding:12px}
.paper{position:relative;min-height:100%;background:#fff;border-radius:10px;box-shadow:0 1px 3px rgba(0,0,0,.05),0 0 0 1px var(--line);padding:30px 32px 80px;outline:none;color:#1f1f1f;line-height:1.62;cursor:text}
.paper.is-empty::before{top:30px;left:32px}
.hls{margin:0 12px 6px;background:#fff;border-radius:11px;box-shadow:0 0 0 1px var(--line);overflow:hidden;flex:none}
.hls-toggle{width:100%;display:flex;align-items:center;gap:6px;padding:9px 12px;border:none;background:none;cursor:pointer;font-weight:600;font-size:12.5px;color:var(--ink)}
.hls-toggle:hover{background:rgba(0,0,0,.03)}
.hls-toggle .count{margin-left:auto;font-size:11px;background:rgba(0,0,0,.07);border-radius:10px;padding:0 7px;color:var(--muted)}
.hls-toggle .count:empty{display:none}
.chev{display:flex;color:var(--muted)}
.hls.closed .hls-list{display:none}
.hls-list{max-height:190px;overflow:auto;border-top:1px solid var(--line)}
.hl-item{display:flex;gap:9px;padding:8px 8px 8px 12px;align-items:flex-start;font-size:12.5px}
.hl-item + .hl-item{border-top:1px solid rgba(0,0,0,.05)}
.hl-item .bar{width:3px;align-self:stretch;border-radius:2px;flex:none}
.hl-body{flex:1;min-width:0}
.hl-item .t{color:#3b3b3e;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;cursor:pointer}
.hl-item .t:hover{color:var(--ink);text-decoration:underline;text-decoration-color:rgba(0,0,0,.25)}
.hl-item .n{color:var(--muted);font-size:12px;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.hl-item .miss{color:#b06000;font-size:11px;margin-top:2px}
.hl-empty{padding:12px;color:var(--muted);font-size:12.5px}
.pfoot{display:flex;padding:4px 18px 10px;font-size:11.5px;color:var(--muted)}

/* options dock */
.dock{position:fixed;right:0;touch-action:none;user-select:none;display:flex;flex-direction:column;align-items:center;gap:2px;padding:4px 5px 6px;background:var(--dark);border-radius:16px 0 0 16px;box-shadow:0 10px 32px rgba(0,0,0,.26),inset 0 0 0 1px rgba(255,255,255,.06);transform:translateY(-50%);color:#ececf0;animation:slide .2s ease-out}
.dock.mini{padding:4px 3px 4px 4px;border-radius:12px 0 0 12px}
.dgrip{width:36px;height:16px;display:flex;align-items:center;justify-content:center;cursor:grab;touch-action:none;color:rgba(255,255,255,.35);transform:rotate(90deg)}
.dgrip:hover{color:rgba(255,255,255,.7)}
.dbtn{position:relative;width:38px;height:38px;display:flex;align-items:center;justify-content:center;border:none;background:none;color:#e6e6ea;border-radius:11px;cursor:pointer;padding:0}
.dbtn.small{height:28px}
.dock.mini .dbtn{width:32px;height:34px;cursor:grab}
.dock.mini{gap:0;padding:2px 3px 4px 4px}
.mini-grip{width:32px;height:12px;cursor:grab}
.dock.dragging,.dock.dragging *{cursor:grabbing!important}
.dock.dragging .dbtn[data-tip]:hover::after{display:none}
.dock.dragging{box-shadow:0 16px 40px rgba(0,0,0,.34),inset 0 0 0 1px rgba(255,255,255,.1)}
.dbtn:hover{background:rgba(255,255,255,.11)}
.dbtn.on{background:var(--accent);color:#1c1c1e}
.dbtn[data-tip]:hover::after{content:attr(data-tip);position:absolute;right:calc(100% + 12px);top:50%;transform:translateY(-50%);background:var(--dark);color:#fff;font-size:12px;font-weight:500;padding:5px 9px;border-radius:7px;white-space:nowrap;pointer-events:none;box-shadow:0 4px 14px rgba(0,0,0,.2)}
.dsep{width:22px;height:1px;background:rgba(255,255,255,.14);margin:4px 0}
.dcolor{width:18px;height:18px;border-radius:50%;box-shadow:inset 0 0 0 1.5px rgba(0,0,0,.25),0 0 0 2px rgba(255,255,255,.15)}
.pip{position:absolute;top:7px;right:7px;width:7px;height:7px;border-radius:50%;background:var(--accent);box-shadow:0 0 0 2px var(--dark)}

.toast{position:fixed;left:50%;bottom:28px;transform:translateX(-50%);background:var(--dark);color:#fff;padding:9px 16px;border-radius:10px;font-size:13px;font-weight:500;box-shadow:0 10px 30px rgba(0,0,0,.25);animation:pop .15s ease-out;transition:opacity .3s}
.toast.out{opacity:0}
`;
  }
})();
