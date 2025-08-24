function extractText() {
  const main = document.querySelector("main, article") || document.body;
  const walker = document.createTreeWalker(main, NodeFilter.SHOW_TEXT, null);
  const chunks = [];
  while (walker.nextNode()) {
    const t = walker.currentNode.nodeValue.replace(/\s+/g, " ").trim();
    if (t.length > 0) chunks.push(t);
  }
  return chunks.join(" ").replace(/\s{2,}/g, " ");
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === "EXTRACT") {
    sendResponse({ url: location.href, title: document.title, text: extractText() });
  }
});
