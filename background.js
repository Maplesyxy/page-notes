// Background service worker: right-click menu + keyboard shortcuts.

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: 'pn-highlight',
      title: 'Highlight selection',
      contexts: ['selection']
    });
    chrome.contextMenus.create({
      id: 'pn-pad',
      title: 'Open notepad for this page',
      contexts: ['page', 'selection', 'link', 'image']
    });
    chrome.contextMenus.create({
      id: 'pn-note',
      title: 'Add sticky note here',
      contexts: ['page', 'selection', 'link', 'image']
    });
  });
});

// Send a message to the page; if the page was open before the extension
// was installed, inject the content script first and try again.
async function sendToTab(tabId, msg) {
  try {
    return await chrome.tabs.sendMessage(tabId, msg);
  } catch (e) {
    try {
      await chrome.scripting.insertCSS({ target: { tabId }, files: ['content.css'] });
      await chrome.scripting.executeScript({ target: { tabId }, files: ['shared.js', 'content.js'] });
      return await chrome.tabs.sendMessage(tabId, msg);
    } catch (err) {
      // Pages like chrome:// or the Chrome Web Store can't be scripted.
      return null;
    }
  }
}

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (!tab || tab.id === undefined) return;
  if (info.menuItemId === 'pn-highlight') sendToTab(tab.id, { type: 'highlight' });
  if (info.menuItemId === 'pn-note') sendToTab(tab.id, { type: 'newNoteAtContext' });
  if (info.menuItemId === 'pn-pad') sendToTab(tab.id, { type: 'openPad' });
});

chrome.commands.onCommand.addListener(async (command, tab) => {
  if (!tab) [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || tab.id === undefined) return;
  if (command === 'highlight-selection') sendToTab(tab.id, { type: 'highlight' });
  if (command === 'new-note') sendToTab(tab.id, { type: 'newNote' });
  if (command === 'toggle-notepad') sendToTab(tab.id, { type: 'togglePad' });
});
