/**
 * InstaForge Image Downloader - Popup Script
 */

let allImages = [];
let selectedUrls = new Set();

document.addEventListener("DOMContentLoaded", () => {
  // Tab Switching
  const tabScan = document.getElementById("tab-scan");
  const tabUrls = document.getElementById("tab-urls");
  const paneScan = document.getElementById("pane-scan");
  const paneUrls = document.getElementById("pane-urls");

  tabScan.addEventListener("click", () => {
    tabScan.classList.add("active");
    tabUrls.classList.remove("active");
    paneScan.classList.add("active");
    paneUrls.classList.remove("active");
  });

  tabUrls.addEventListener("click", () => {
    tabUrls.classList.add("active");
    tabScan.classList.remove("active");
    paneUrls.classList.add("active");
    paneScan.classList.remove("active");
  });

  // Buttons & Controls
  document.getElementById("btn-scan-page").addEventListener("click", scanCurrentPage);
  document.getElementById("btn-parse-urls").addEventListener("click", parseCustomUrls);
  document.getElementById("btn-load-sample").addEventListener("click", loadSampleUrls);
  document.getElementById("btn-select-all").addEventListener("click", selectAllImages);
  document.getElementById("btn-deselect-all").addEventListener("click", deselectAllImages);
  document.getElementById("btn-download-zip").addEventListener("click", downloadZip);

  // Filters
  document.getElementById("filter-format").addEventListener("change", applyFilters);
  document.getElementById("filter-size").addEventListener("change", applyFilters);
  document.getElementById("filter-search").addEventListener("input", applyFilters);

  // Auto scan active tab on popup open
  scanCurrentPage();
});

/**
 * Scan active tab for images via Content Script injection
 */
async function scanCurrentPage() {
  const statusEl = document.getElementById("scan-status");
  statusEl.textContent = "Memindai halaman aktif...";

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.id) {
      statusEl.textContent = "Tidak dapat mengakses tab aktif.";
      return;
    }

    // Try messaging existing content script first, or inject it
    chrome.tabs.sendMessage(tab.id, { action: "SCAN_IMAGES" }, async (response) => {
      if (chrome.runtime.lastError || !response) {
        // Inject content.js dynamically
        try {
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ["content.js"],
          });

          // Message again after injection
          chrome.tabs.sendMessage(tab.id, { action: "SCAN_IMAGES" }, (retryResponse) => {
            if (retryResponse && retryResponse.images) {
              handleScanResults(retryResponse.images);
            } else {
              statusEl.textContent = "Tidak ada gambar ditemukan di halaman ini.";
            }
          });
        } catch (err) {
          statusEl.textContent = "Gagal memindai: Halaman dilindungi atau file lokal.";
        }
      } else if (response.images) {
        handleScanResults(response.images);
      }
    });
  } catch (err) {
    statusEl.textContent = "Error memindai: " + err.message;
  }
}

function handleScanResults(images) {
  const statusEl = document.getElementById("scan-status");
  allImages = images.map((img, idx) => ({
    id: idx + 1,
    url: img.url,
    alt: img.alt || "",
    width: img.width || 0,
    height: img.height || 0,
    format: getFileExtension(img.url),
    filename: getFileNameFromUrl(img.url, idx + 1),
  }));

  selectedUrls = new Set(allImages.map((img) => img.url));
  statusEl.textContent = `Ditemukan ${allImages.length} gambar di halaman.`;
  applyFilters();
}

/**
 * Expand range pattern like https://autofeeds.id/landing/ads-1x1/ig-[01-10].jpg
 */
function expandUrlPattern(text) {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const results = [];

  for (const line of lines) {
    const match = line.match(/\[(\d+)-(\d+)\]/);
    if (match) {
      const startStr = match[1];
      const endStr = match[2];
      const start = parseInt(startStr, 10);
      const end = parseInt(endStr, 10);
      const padLength = startStr.length;

      for (let i = start; i <= end; i++) {
        const padded = String(i).padStart(padLength, "0");
        const expandedUrl = line.replace(match[0], padded);
        results.push(expandedUrl);
      }
    } else {
      results.push(line);
    }
  }

  return results;
}

/**
 * Parse custom URL list or range pattern from textarea
 */
function parseCustomUrls() {
  const rawText = document.getElementById("url-input").value;
  if (!rawText.trim()) {
    alert("Silakan masukkan minimal 1 URL gambar atau pola range.");
    return;
  }

  const urls = expandUrlPattern(rawText);
  allImages = urls.map((url, idx) => ({
    id: idx + 1,
    url,
    alt: `Custom Image ${idx + 1}`,
    width: 0,
    height: 0,
    format: getFileExtension(url),
    filename: getFileNameFromUrl(url, idx + 1),
  }));

  selectedUrls = new Set(allImages.map((img) => img.url));
  applyFilters();
}

function loadSampleUrls() {
  const sample = `https://autofeeds.id/landing/ads-1x1/ig-01.jpg
https://autofeeds.id/landing/ads-1x1/ig-02.jpg
https://autofeeds.id/landing/ads-1x1/ig-03.jpg
https://autofeeds.id/landing/ads-1x1/ig-04.jpg
https://autofeeds.id/landing/ads-1x1/ig-05.jpg`;
  document.getElementById("url-input").value = sample;
}

/**
 * Apply Format, Size and Search Filters
 */
function applyFilters() {
  const formatFilter = document.getElementById("filter-format").value.toLowerCase();
  const minSize = parseInt(document.getElementById("filter-size").value, 10) || 0;
  const searchQuery = document.getElementById("filter-search").value.toLowerCase().trim();

  const filtered = allImages.filter((img) => {
    // Format check
    if (formatFilter !== "all") {
      if (formatFilter === "jpg" && !["jpg", "jpeg"].includes(img.format)) return false;
      if (formatFilter !== "jpg" && img.format !== formatFilter) return false;
    }

    // Size check
    if (minSize > 0) {
      if (img.width > 0 && img.height > 0) {
        if (img.width < minSize && img.height < minSize) return false;
      }
    }

    // Search check
    if (searchQuery) {
      const matchUrl = img.url.toLowerCase().includes(searchQuery);
      const matchAlt = img.alt.toLowerCase().includes(searchQuery);
      const matchName = img.filename.toLowerCase().includes(searchQuery);
      if (!matchUrl && !matchAlt && !matchName) return false;
    }

    return true;
  });

  renderGallery(filtered);
}

/**
 * Render Image Gallery Grid
 */
function renderGallery(images) {
  const grid = document.getElementById("image-grid");
  const emptyState = document.getElementById("empty-state");
  const totalCountEl = document.getElementById("total-count");
  const selectedCountEl = document.getElementById("selected-count");

  totalCountEl.textContent = images.length;
  grid.innerHTML = "";

  if (images.length === 0) {
    emptyState.classList.remove("hidden");
    selectedCountEl.textContent = "0";
    return;
  }

  emptyState.classList.add("hidden");
  let activeSelectedCount = 0;

  images.forEach((img) => {
    const isSelected = selectedUrls.has(img.url);
    if (isSelected) activeSelectedCount++;

    const card = document.createElement("div");
    card.className = `image-card ${isSelected ? "selected" : ""}`;

    // Dimensions display
    const dimText = img.width && img.height ? `${img.width}×${img.height}` : "Auto HD";

    card.innerHTML = `
      <div class="thumb-wrap">
        <input type="checkbox" class="card-checkbox" ${isSelected ? "checked" : ""} data-url="${img.url}">
        <img src="${img.url}" class="thumb-img" loading="lazy" alt="${img.alt}" onerror="this.src='icons/icon-48.png'">
        <span class="format-badge">${img.format.toUpperCase()}</span>
      </div>
      <div class="card-meta">
        <div class="meta-size">
          <span>${dimText}</span>
          <span>#${img.id}</span>
        </div>
        <div class="meta-url" title="${img.url}">${img.filename}</div>
        <div class="card-actions">
          <button class="btn-icon btn-view" title="Buka Gambar Asli">🔍 Lihat</button>
          <button class="btn-icon btn-dl-single" title="Download Gambar Ini">⬇️ Save</button>
        </div>
      </div>
    `;

    // Checkbox toggle
    const checkbox = card.querySelector(".card-checkbox");
    checkbox.addEventListener("change", (e) => {
      if (e.target.checked) {
        selectedUrls.add(img.url);
        card.classList.add("selected");
      } else {
        selectedUrls.delete(img.url);
        card.classList.remove("selected");
      }
      updateSelectedCount();
    });

    // View image in new tab
    card.querySelector(".btn-view").addEventListener("click", () => {
      chrome.tabs.create({ url: img.url });
    });

    // Download single image
    card.querySelector(".btn-dl-single").addEventListener("click", () => {
      downloadSingleImage(img.url, img.filename);
    });

    grid.appendChild(card);
  });

  selectedCountEl.textContent = activeSelectedCount;
}

function updateSelectedCount() {
  const visibleCards = document.querySelectorAll(".image-card");
  let count = 0;
  visibleCards.forEach((c) => {
    const cb = c.querySelector(".card-checkbox");
    if (cb && cb.checked) count++;
  });
  document.getElementById("selected-count").textContent = count;
}

function selectAllImages() {
  allImages.forEach((img) => selectedUrls.add(img.url));
  document.querySelectorAll(".card-checkbox").forEach((cb) => (cb.checked = true));
  document.querySelectorAll(".image-card").forEach((c) => c.classList.add("selected"));
  updateSelectedCount();
}

function deselectAllImages() {
  selectedUrls.clear();
  document.querySelectorAll(".card-checkbox").forEach((cb) => (cb.checked = false));
  document.querySelectorAll(".image-card").forEach((c) => c.classList.remove("selected"));
  updateSelectedCount();
}

function downloadSingleImage(url, filename) {
  chrome.downloads.download({
    url,
    filename: `instaforge_downloads/${filename}`,
    saveAs: false,
  });
}

/**
 * Fetch and bundle all selected images into a single .ZIP file
 */
async function downloadZip() {
  const selectedList = allImages.filter((img) => selectedUrls.has(img.url));
  if (selectedList.length === 0) {
    alert("Silakan pilih minimal 1 gambar untuk di-download ke ZIP.");
    return;
  }

  const zipBtn = document.getElementById("btn-download-zip");
  const progressContainer = document.getElementById("progress-container");
  const progressLabel = document.getElementById("progress-label");
  const progressPercent = document.getElementById("progress-percent");
  const progressBarFill = document.getElementById("progress-bar-fill");

  let zipFileName = document.getElementById("zip-filename").value.trim() || "instaforge_images.zip";
  if (!zipFileName.endsWith(".zip")) zipFileName += ".zip";

  zipBtn.disabled = true;
  progressContainer.classList.remove("hidden");

  const zip = new JSZip();
  let completed = 0;
  const total = selectedList.length;

  for (let i = 0; i < total; i++) {
    const item = selectedList[i];
    progressLabel.textContent = `Mengunduh gambar ${i + 1} dari ${total}: ${item.filename}`;
    const pct = Math.round(((i) / total) * 100);
    progressPercent.textContent = `${pct}%`;
    progressBarFill.style.width = `${pct}%`;

    try {
      const response = await fetch(item.url, { mode: "cors" });
      if (response.ok) {
        const blob = await response.blob();
        zip.file(item.filename, blob);
      } else {
        // Fallback for CORS: add dummy or error text
        console.warn("Could not fetch CORS for:", item.url);
      }
    } catch (err) {
      console.warn("Fetch failed for:", item.url, err);
    }

    completed++;
  }

  progressLabel.textContent = "Mengompresi file ke ZIP...";
  progressPercent.textContent = "95%";
  progressBarFill.style.width = "95%";

  try {
    const zipContent = await zip.generateAsync({
      type: "blob",
      compression: "DEFLATE",
      compressionOptions: { level: 6 },
    });

    const zipUrl = URL.createObjectURL(zipContent);
    const a = document.createElement("a");
    a.href = zipUrl;
    a.download = zipFileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    progressLabel.textContent = `✅ Berhasil mendownload ${completed} gambar ke ${zipFileName}!`;
    progressPercent.textContent = "100%";
    progressBarFill.style.width = "100%";

    setTimeout(() => {
      progressContainer.classList.add("hidden");
      zipBtn.disabled = false;
    }, 3000);
  } catch (err) {
    alert("Gagal membuat file ZIP: " + err.message);
    zipBtn.disabled = false;
    progressContainer.classList.add("hidden");
  }
}

function getFileExtension(url) {
  try {
    const cleanUrl = url.split("?")[0].split("#")[0];
    const ext = cleanUrl.split(".").pop().toLowerCase();
    if (["jpg", "jpeg", "png", "webp", "svg", "gif", "avif"].includes(ext)) {
      return ext === "jpeg" ? "jpg" : ext;
    }
  } catch {}
  return "jpg";
}

function getFileNameFromUrl(url, index) {
  try {
    const cleanUrl = url.split("?")[0].split("#")[0];
    const name = cleanUrl.split("/").pop();
    if (name && name.includes(".")) {
      return name;
    }
  } catch {}
  return `image_${String(index).padStart(3, "0")}.jpg`;
}
