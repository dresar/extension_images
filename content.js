/**
 * InstaForge Content Script - Image Scraper & Extractor
 */

(function () {
  function getAbsoluteUrl(url) {
    if (!url) return null;
    try {
      return new URL(url.trim(), window.location.href).href;
    } catch {
      return null;
    }
  }

  function extractAllImages() {
    const urls = new Set();
    const images = [];

    function addImage(rawUrl, alt = "", width = 0, height = 0) {
      const absUrl = getAbsoluteUrl(rawUrl);
      if (!absUrl) return;
      if (absUrl.startsWith("data:image/svg") || absUrl.startsWith("data:image/png") || absUrl.startsWith("http")) {
        if (!urls.has(absUrl)) {
          urls.add(absUrl);
          images.push({
            url: absUrl,
            alt: alt || "",
            width: width || 0,
            height: height || 0,
            title: document.title || "Image",
          });
        }
      }
    }

    // 1. Standard <img> tags
    document.querySelectorAll("img").forEach((img) => {
      const src =
        img.currentSrc ||
        img.src ||
        img.getAttribute("data-src") ||
        img.getAttribute("data-lazy-src") ||
        img.getAttribute("data-original") ||
        img.getAttribute("data-highres");
      
      const width = img.naturalWidth || img.width || 0;
      const height = img.naturalHeight || img.height || 0;
      if (src) addImage(src, img.alt, width, height);

      // Check srcset
      const srcset = img.getAttribute("srcset");
      if (srcset) {
        srcset.split(",").forEach((part) => {
          const item = part.trim().split(/\s+/)[0];
          if (item) addImage(item, img.alt, width, height);
        });
      }
    });

    // 2. <picture> <source> tags
    document.querySelectorAll("picture source").forEach((source) => {
      const srcset = source.getAttribute("srcset");
      if (srcset) {
        srcset.split(",").forEach((part) => {
          const item = part.trim().split(/\s+/)[0];
          if (item) addImage(item);
        });
      }
    });

    // 3. <a> anchor links pointing directly to images
    document.querySelectorAll("a[href]").forEach((a) => {
      const href = a.getAttribute("href");
      if (href && /\.(jpg|jpeg|png|webp|svg|gif|avif)($|\?)/i.test(href)) {
        addImage(href, a.textContent || "Link Image");
      }
    });

    // 4. CSS background-image
    document.querySelectorAll("*").forEach((el) => {
      try {
        const bg = window.getComputedStyle(el).backgroundImage;
        if (bg && bg !== "none") {
          const matches = bg.match(/url\(['"]?(.*?)['"]?\)/g);
          if (matches) {
            matches.forEach((m) => {
              const cleaned = m.replace(/^url\(['"]?/, "").replace(/['"]?\)$/, "");
              if (cleaned) addImage(cleaned);
            });
          }
        }
      } catch {}
    });

    return images;
  }

  // Listen for messages from popup
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "SCAN_IMAGES") {
      const results = extractAllImages();
      sendResponse({ success: true, count: results.length, images: results });
    }
    return true;
  });
})();
