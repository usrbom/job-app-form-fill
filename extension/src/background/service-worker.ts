console.log("[FormFill AI] Background service worker loaded");

chrome.runtime.onMessage.addListener(
  (message: { type: string }, _sender, sendResponse) => {
    console.log("[FormFill AI] Message received:", message.type);
    sendResponse({ ok: true });
    return true;
  }
);
