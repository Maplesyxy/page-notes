const { COLORS, FONTS, SIZES, DEFAULT_SETTINGS, fontFaceCSS } = globalThis.PN;
const $ = (s) => document.querySelector(s);
let tab = null;
let settings = { ...DEFAULT_SETTINGS };

// Load the bundled fonts so the font picker can preview them.
const fontStyle = document.createElement('style');
fontStyle.textContent = fontFaceCSS((p) => p);
document.head.appendChild(fontStyle);

// ------------------------------------------------------------ messaging
async function send(msg) {
  if (!tab) return null;
  try {
    return await chrome.tabs.sendMessage(tab.id, msg);
  } catch {
    // Page was open before the extension was installed: inject and retry.
    try {
      await chrome.scripting.insertCSS({ target: { tabId: tab.id }, files: ['content.css'] });
      await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['shared.js', 'content.js'] });
      return await chrome.tabs.sendMessage(tab.id, msg);
    } catch {
      return null;
    }
  }
}

// ------------------------------------------------------------ helpers
function el(tag, props = {}, children = []) {
  const e = document.createElement(tag);
  Object.assign(e, props);
  children.forEach((c) => e.append(c));
  return e;
}
function timeAgo(t) {
  const s = (Date.now() - t) / 1000;
  if (s < 60) return 'just now';
  if (s < 3600) return Math.floor(s / 60) + 'm ago';
  if (s < 86400) return Math.floor(s / 3600) + 'h ago';
  if (s < 86400 * 30) return Math.floor(s / 86400) + 'd ago';
  return new Date(t).toLocaleDateString();
}
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
const padText = (p) => {
  if (p?.pad?.text) return p.pad.text;
  if (!p?.pad?.html) return '';
  const d = new DOMParser().parseFromString(p.pad.html, 'text/html');
  return (d.body.textContent || '').trim();
};

async function saveSettings() {
  await chrome.storage.local.set({ settings });
}

// ------------------------------------------------------------ tabs
document.querySelectorAll('.tab').forEach((b) =>
  b.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach((x) => x.classList.toggle('active', x === b));
    ['page', 'all', 'style'].forEach((t) => $('#tab-' + t).classList.toggle('hidden', b.dataset.tab !== t));
    if (b.dataset.tab === 'all') renderAllPages();
  })
);

// ------------------------------------------------------------ style tab
function renderSettings() {
  const fontSel = $('#font');
  fontSel.innerHTML = '';
  Object.entries(FONTS).forEach(([k, f]) => {
    const o = el('option', { value: k, textContent: f.label });
    o.style.fontFamily = f.stack;
    fontSel.append(o);
  });
  fontSel.value = settings.font;
  fontSel.style.fontFamily = (FONTS[settings.font] || FONTS.inter).stack;

  const sizeSel = $('#size');
  sizeSel.innerHTML = '';
  SIZES.forEach((s) => sizeSel.append(el('option', { value: s, textContent: s + ' px' })));
  sizeSel.value = settings.fontSize;

  const wrap = $('#colors');
  wrap.innerHTML = '';
  Object.entries(COLORS).forEach(([name, hex]) => {
    const d = el('button', { className: 'dot' + (settings.color === name ? ' active' : ''), title: name });
    d.style.background = hex;
    d.addEventListener('click', async () => {
      settings.color = name;
      await saveSettings();
      renderSettings();
    });
    wrap.append(d);
  });
  $('#auto').checked = !!settings.autoMode;
  $('#dock').checked = settings.showDock !== false;
}

$('#font').addEventListener('change', async (e) => {
  settings.font = e.target.value;
  await saveSettings();
  renderSettings();
});
$('#size').addEventListener('change', async (e) => {
  settings.fontSize = +e.target.value;
  await saveSettings();
});
$('#auto').addEventListener('change', async (e) => {
  settings.autoMode = e.target.checked;
  await saveSettings();
});
$('#dock').addEventListener('change', async (e) => {
  settings.showDock = e.target.checked;
  await saveSettings();
});

// ------------------------------------------------------------ this page
function renderPage(state) {
  const list = $('#page-list');
  list.innerHTML = '';
  const hasPad = !!state.pad?.text;
  const total = state.highlights.length + state.notes.length + (hasPad ? 1 : 0);
  $('#page-count').textContent = total || '';
  if (!total) {
    list.append(el('div', { className: 'empty', textContent: 'Nothing here yet. Select some text, add a sticky note, or open the notepad.' }));
    $('#clear-page').classList.add('hidden');
    return;
  }
  $('#clear-page').classList.remove('hidden');

  const addItem = (id, color, main, sub, extra) => {
    const chip = el('span', { className: 'chip' });
    chip.style.background = color;
    const body = el('div', { className: 'body' }, [el('div', { className: 'main', textContent: main })]);
    if (sub) body.append(el('div', { className: 'sub', textContent: sub }));
    if (extra) body.append(extra);
    const x = el('button', { className: 'x', title: 'Delete', textContent: '×' });
    x.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (id === '__pad' && !confirm('Erase everything in this page’s notepad?')) return;
      const st = await send({ type: 'deleteItem', id });
      if (st) renderPage(st);
    });
    const li = el('li', {}, [chip, body, x]);
    li.addEventListener('click', async () => {
      await send({ type: 'scrollTo', id });
      if (id === '__pad') window.close();
    });
    list.append(li);
  };

  if (hasPad) addItem('__pad', '#1d1d20', state.pad.text, 'Notepad');
  state.notes.forEach((n) => addItem(n.id, COLORS[n.color] || COLORS.yellow, (n.text || '').trim() || '(empty note)', 'Sticky note'));
  state.highlights.forEach((h) =>
    addItem(
      h.id,
      COLORS[h.color] || COLORS.yellow,
      `“${h.exact.trim()}”`,
      h.note ? '✎ ' + h.note : '',
      h.placed ? null : el('div', { className: 'missing', textContent: 'Couldn’t find this text on the page right now' })
    )
  );
}

$('#add-note').addEventListener('click', async () => {
  await send({ type: 'newNote' });
  window.close();
});
$('#open-pad').addEventListener('click', async () => {
  await send({ type: 'openPad' });
  window.close();
});
$('#hl-sel').addEventListener('click', async () => {
  await send({ type: 'highlight', color: settings.color });
  window.close();
});
$('#clear-page').addEventListener('click', async () => {
  if (!confirm('Delete all highlights, sticky notes and the notepad for this page?')) return;
  const st = await send({ type: 'clearPage' });
  if (st) renderPage(st);
});

// ------------------------------------------------------------ all pages
async function getAllPages() {
  const all = await chrome.storage.local.get(null);
  return Object.entries(all)
    .filter(([k]) => k.startsWith('page:'))
    .map(([k, v]) => ({ key: k, ...v }))
    .sort((a, b) => (b.updated || 0) - (a.updated || 0));
}

async function renderAllPages() {
  const q = $('#search').value.trim().toLowerCase();
  const pages = await getAllPages();
  const list = $('#all-list');
  list.innerHTML = '';
  const filtered = pages.filter((p) => {
    if (!q) return true;
    const hay = [p.title, p.url, padText(p), ...(p.notes || []).map((n) => n.text), ...(p.highlights || []).flatMap((h) => [h.exact, h.note])]
      .join(' ')
      .toLowerCase();
    return hay.includes(q);
  });
  if (!filtered.length) {
    list.append(el('div', { className: 'empty', textContent: q ? 'No matches.' : 'No saved pages yet.' }));
    return;
  }
  filtered.forEach((p) => {
    const nh = (p.highlights || []).length;
    const nn = (p.notes || []).length;
    const counts = [nh && plural(nh, 'highlight'), nn && plural(nn, 'note'), padText(p) && 'notepad'].filter(Boolean).join(', ');
    let host = '';
    try { host = new URL(p.url).hostname; } catch {}
    const chip = el('span', { className: 'chip' });
    chip.style.background = '#dcdad3';
    const body = el('div', { className: 'body' }, [
      el('div', { className: 'main', textContent: p.title || p.url }),
      el('div', { className: 'sub', textContent: `${host} · ${counts} · ${timeAgo(p.updated || 0)}` })
    ]);
    const x = el('button', { className: 'x', title: 'Delete everything saved for this page', textContent: '×' });
    x.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (!confirm(`Delete all notes and highlights for “${p.title || p.url}”?`)) return;
      await chrome.storage.local.remove(p.key);
      renderAllPages();
      refreshCurrentPage();
    });
    const li = el('li', { title: p.url }, [chip, body, x]);
    li.addEventListener('click', () => chrome.tabs.create({ url: p.url }));
    list.append(li);
  });
}
$('#search').addEventListener('input', renderAllPages);

// ------------------------------------------------------------ export / import
$('#export').addEventListener('click', async () => {
  const pages = await getAllPages();
  const out = {};
  pages.forEach(({ key, ...v }) => (out[key] = v));
  const blob = new Blob([JSON.stringify({ app: 'page-notes', version: 2, pages: out }, null, 2)], { type: 'application/json' });
  const a = el('a', { href: URL.createObjectURL(blob), download: `page-notes-backup-${new Date().toISOString().slice(0, 10)}.json` });
  document.body.append(a);
  a.click();
  a.remove();
});

$('#import').addEventListener('click', () => $('#import-file').click());
$('#import-file').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const json = JSON.parse(await file.text());
    const pages = json.pages || json;
    const existing = await chrome.storage.local.get(null);
    const toSet = {};
    let count = 0;
    const mergeById = (a = [], b = []) => {
      const m = new Map(a.map((x) => [x.id, x]));
      b.forEach((x) => m.set(x.id, x));
      return [...m.values()];
    };
    for (const [k, v] of Object.entries(pages)) {
      if (!k.startsWith('page:') || typeof v !== 'object' || !v) continue;
      const cur = existing[k];
      if (cur) {
        const curPad = cur.pad?.html || '';
        const newPad = v.pad?.html || '';
        toSet[k] = {
          ...cur,
          highlights: mergeById(cur.highlights, v.highlights),
          notes: mergeById(cur.notes, v.notes),
          pad: newPad && newPad !== curPad ? { html: curPad ? curPad + '<hr>' + newPad : newPad } : cur.pad,
          updated: Date.now()
        };
      } else {
        toSet[k] = { ...v, updated: v.updated || Date.now() };
      }
      count++;
    }
    await chrome.storage.local.set(toSet);
    alert(`Imported ${plural(count, 'page')}.`);
    renderAllPages();
    refreshCurrentPage();
  } catch (err) {
    alert('That file could not be imported: ' + err.message);
  }
  e.target.value = '';
});

// ------------------------------------------------------------ init
async function refreshCurrentPage() {
  const state = await send({ type: 'getState' });
  if (!state) {
    $('#unsupported').classList.remove('hidden');
    $('#page-ui').classList.add('hidden');
    return;
  }
  renderPage(state);
}

(async () => {
  [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const res = await chrome.storage.local.get('settings');
  settings = { ...DEFAULT_SETTINGS, ...(res.settings || {}) };
  renderSettings();
  await refreshCurrentPage();
})();
