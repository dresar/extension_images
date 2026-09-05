/**
 * InstaForge Universal Image Downloader - Background Service Worker
 */

chrome.runtime.onInstalled.addListener(() => {
  console.log("InstaForge Image Downloader Extension Installed.");
});

// Listen for messages from popup or content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "DOWNLOAD_FILE") {
    chrome.downloads.download(
      {
        url: message.url,
        filename: message.filename || "image.jpg",
        saveAs: false,
      },
      (downloadId) => {
        if (chrome.runtime.lastError) {
          sendResponse({ success: false, error: chrome.runtime.lastError.message });
        } else {
          sendResponse({ success: true, downloadId });
        }
      },
    );
    return true; // Keep message channel open for async response
  }
});
