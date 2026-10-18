// @ts-nocheck
const searchBtn = document.getElementById("searchBtn");
const inputField = document.getElementById("inputField");
const labelInput = document.getElementById("labelInput");
const resultArea = document.getElementById("hasil");
const gridArea = document.getElementById("gridHasil");
const gridList = document.getElementById("gridList");
const linkList = document.getElementById("linkList");
const errorMsg = document.getElementById("error");
const loading = document.getElementById("loading");
const videoBox = document.getElementById("videoContainer");
const backBtn = document.getElementById("backBtn");
const tabs = document.querySelectorAll(".tab");

// Elemen untuk AM Prem
const defaultInput = document.getElementById("defaultInput");
const ampremInput = document.getElementById("ampremInput");
const emailField = document.getElementById("emailField");
const linkField = document.getElementById("linkField");
const sendLinkBtn = document.getElementById("sendLinkBtn");

const API_BASE = "https://api.synoxcloud.xyz";
const API_KEY = "FREE";

let mode = "link";

// ============================================
// FETCH API BAWAAN
// ============================================
async function fetchAPI(endpoint, params = {}) {
  const url = new URL(API_BASE + endpoint);
  Object.keys(params).forEach(k => url.searchParams.append(k, params[k]));
  url.searchParams.append("apikey", API_KEY);

  const res = await fetch(url);
  if (!res.ok) throw new Error("HTTP " + res.status);
  const json = await res.json();
  
  if (!json.status) {
    throw new Error(json.message || "API Error");
  }
  return json.result;
}

// ============================================
// TAB SWITCHING
// ============================================
tabs.forEach(t => {
  t.addEventListener("click", () => {
    tabs.forEach(x => x.classList.remove("active"));
    t.classList.add("active");
    mode = t.dataset.mode;
    resetAll();

    if (mode === "amprem") {
      defaultInput.classList.add("hidden");
      ampremInput.classList.remove("hidden");
      searchBtn.innerText = "Klaim Premium";
    } else {
      ampremInput.classList.add("hidden");
      defaultInput.classList.remove("hidden");
      searchBtn.innerText = "Cari";

      if (mode === "link") {
        labelInput.innerText = "Masukan url tiktok";
        inputField.placeholder = "https://vt.tiktok.com/...";
      } else if (mode === "song") {
        labelInput.innerText = "Ketik judul lagu / keyword";
        inputField.placeholder = "contoh: ku bukan superstar";
      }
    }
  });
});

backBtn.addEventListener("click", () => {
  resetAll();
});

// ============================================
// LOGIKA TOMBOL "KIRIM MAGIC LINK" (AM PREM)
// ============================================
sendLinkBtn.addEventListener("click", async () => {
  const email = emailField.value.trim();
  if (!email) { alert("Isi email Alight Motion dulu!"); return; }

  const originalText = sendLinkBtn.innerText;
  sendLinkBtn.disabled = true;
  sendLinkBtn.innerText = "Mengirim...";
  
  try {
    const url = `https://api.iroha-api.web.id/v1/amprem?step=send&email=${encodeURIComponent(email)}`;
    const res = await fetch(url);
    const data = await res.json();
    
    alert("Magic link berhasil dikirim ke email! Cek inbox/spam email kamu, lalu copy link verifikasinya ke kolom bawah.");
    linkField.focus();

  } catch (e) {
    alert("Gagal kirim magic link: " + e.message);
  } finally {
    sendLinkBtn.disabled = false;
    sendLinkBtn.innerText = originalText;
  }
});

// ============================================
// TOMBOL CARI / KLAIM PREMIUM
// ============================================
searchBtn.addEventListener("click", async () => {
  // Logika AM Prem
  if (mode === "amprem") {
    const email = emailField.value.trim();
    const link = linkField.value.trim();

    if (!email) { alert("Isi email Alight Motion dulu cuy!"); return; }
    if (!link) { alert("Masukan Magic Link verifikasi yang udah dikirim ke email kamu dulu!"); return; }

    resetAll();
    loading.classList.remove("hidden");
    searchBtn.disabled = true;
    searchBtn.innerText = "Memproses...";

    try {
      const url = `https://api.iroha-api.web.id/v1/amprem?step=unlock&email=${encodeURIComponent(email)}&link=${encodeURIComponent(link)}`;
      const res = await fetch(url);
      const data = await res.json();

      resultArea.classList.remove("hidden");
      videoBox.innerHTML = ""; 
      
      linkList.innerHTML = `
        <li class="drive" style="border-left-color: #00bfff; background: rgba(224, 242, 254, 0.6);">
          <span class="link-label">Status Klaim Premium</span>
          <pre style="white-space: pre-wrap; font-size: 11px; margin: 0; color: #0056b3;">${JSON.stringify(data, null, 2)}</pre>
        </li>
      `;

    } catch (e) {
      resultArea.classList.remove("hidden");
      errorMsg.classList.remove("hidden");
      errorMsg.innerText = "ERROR API: " + e.message;
    } finally {
      loading.classList.add("hidden");
      searchBtn.disabled = false;
      searchBtn.innerText = "Klaim Premium";
    }
    return;
  }

  // Logika Link Video / Judul Lagu
  const val = inputField.value.trim();
  if (!val) { alert("Isi dulu cuy!"); return; }

  resetAll();
  loading.classList.remove("hidden");
  searchBtn.disabled = true;
  searchBtn.innerText = "Mencari...";

  try {
    if (mode === "link") {
      if (!val.includes("tiktok.com") && !val.startsWith("http")) { 
        alert("Bukan link TikTok yang valid!"); 
        return; 
      }
      await prosesLinkVideo(val);
    } else {
      await cariLagu(val);
    }
  } catch (e) {
    console.error(e);
    resultArea.classList.remove("hidden");
    errorMsg.classList.remove("hidden");
    errorMsg.innerText = "ERROR: " + e.message;
  } finally {
    loading.classList.add("hidden");
    searchBtn.disabled = false;
    searchBtn.innerText = "Cari";
  }
});

function resetAll() {
  resultArea.classList.add("hidden");
  gridArea.classList.add("hidden");
  errorMsg.classList.add("hidden");
  linkList.innerHTML = "";
  videoBox.innerHTML = "";
  gridList.innerHTML = "";
}

// ============================================
// FITUR 1: LINK VIDEO (AM Preset Finder)
// ============================================
async function prosesLinkVideo(url) {
  const data = await fetchAPI("/search/ampreset", { url });
  
  gridArea.classList.add("hidden");
  resultArea.classList.remove("hidden");

  tampilVideo(data.video);
  tampilPreset(data.presetLinks);
}

// ============================================
// FITUR 2: JUDUL LAGU (TikTok Search)
// ============================================
async function cariLagu(keyword) {
  const query = `preset ${keyword}`;
  const data = await fetchAPI("/search/tiktok", { q: query, count: 10 });
  
  const videos = data.videos;
  if (!videos || videos.length === 0) {
    throw new Error("Video tidak ditemukan.");
  }

  gridArea.classList.remove("hidden");
  gridList.innerHTML = "";

  videos.forEach(v => {
    const card = document.createElement("div");
    card.className = "card";

    const img = document.createElement("img");
    img.src = v.cover || "";
    img.loading = "lazy";
    card.appendChild(img);

    const overlay = document.createElement("div");
    overlay.className = "card-info";
    const user = v.author?.username || "unknown";
    overlay.innerHTML = `<span>@${user}</span><span>▶</span>`;
    card.appendChild(overlay);

    card.addEventListener("click", async () => {
      resetAll();
      loading.classList.remove("hidden");
      try {
        await prosesLinkVideo(v.url);
      } catch (err) {
        alert("Gagal ambil preset: " + err.message);
      } finally {
        loading.classList.add("hidden");
      }
    });
    
    gridList.appendChild(card);
  });
}

// ============================================
// TAMPILKAN VIDEO PLAYER
// ============================================
function tampilVideo(v) {
  if (!v || !v.playUrl) return;

  const video = document.createElement("video");
  video.src = v.playUrl;
  video.controls = true;
  video.playsInline = true;
  video.preload = "metadata";
  video.poster = v.cover || "";
  video.style.width = "100%";
  video.style.borderRadius = "8px";
  video.style.border = "2px solid black";
  video.style.background = "black";
  
  videoBox.appendChild(video);

  const info = document.createElement("p");
  info.innerText = `@${v.author || 'unknown'} • ❤️ ${v.stats?.likes || 0} • 💬 ${v.stats?.comments || 0}`;
  info.style.fontSize = "12px";
  info.style.color = "#555";
  info.style.marginTop = "8px";
  info.style.textAlign = "center";
  videoBox.appendChild(info);
}

// ============================================
// TAMPILKAN LIST PRESET
// ============================================
function tampilPreset(links) {
  resultArea.classList.remove("hidden");
  
  if (!links || links.length === 0) {
    errorMsg.classList.remove("hidden");
    errorMsg.innerText = "Preset tidak ditemukan di video ini. 😢";
    return;
  }

  links.forEach(item => {
    const li = document.createElement("li");
    const lowType = item.type?.toLowerCase() || "";
    const lowUrl = item.url.toLowerCase();

    let label = "LINK";
    let href = item.url;
    let kelas = "";

    if (lowType.includes("xml") || lowUrl.includes("drive.google")) {
      label = "FILE XML (DRIVE)";
      href = ubahDrive(item.url);
      kelas = "drive";
    } else if (lowType.includes("5mb") || lowUrl.includes("alightcreative")) {
      label = "5MB.APP";
    }

    if (kelas) li.classList.add(kelas);

    const spanLabel = document.createElement("span");
    spanLabel.className = "link-label";
    spanLabel.innerText = `${label} ${item.size ? `(${item.size})` : ''}`;
    li.appendChild(spanLabel);

    if (item.title) {
      const titleEl = document.createElement("div");
      titleEl.innerText = item.title;
      titleEl.style.fontWeight = "bold";
      titleEl.style.marginBottom = "4px";
      li.appendChild(titleEl);
    }

    const a = document.createElement("a");
    a.href = href;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.innerText = item.url;
    li.appendChild(a);

    if (item.detail) {
      const detailEl = document.createElement("div");
      detailEl.innerText = `Sumber: ${item.detail}`;
      detailEl.style.fontSize = "10px";
      detailEl.style.color = "#666";
      detailEl.style.marginTop = "4px";
      li.appendChild(detailEl);
    }

    if (lowUrl.includes("drive.google")) {
      const btn = document.createElement("a");
      btn.href = href;
      btn.target = "_blank";
      btn.rel = "noopener noreferrer";
      btn.className = "btn-download";
      btn.innerText = "Download XML";
      li.appendChild(document.createElement("br"));
      li.appendChild(btn);
    }

    linkList.appendChild(li);
  });
}

// ============================================
// KONVERSI LINK GOOGLE DRIVE
// ============================================
function ubahDrive(url) {
  let id = null;
  const m1 = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (m1) id = m1[1];
  if (!id) {
    const m2 = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (m2) id = m2[1];
  }
  if (id) return `https://drive.google.com/uc?export=download&id=${id}`;
  return url;
}

inputField.addEventListener("keypress", e => {
  if (e.key === "Enter") searchBtn.click();
});