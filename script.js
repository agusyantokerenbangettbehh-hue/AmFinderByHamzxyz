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

const POLA_LINK = ["5mb", "xml", "drive.google", "mediafire", "alight", "preset", "mega.nz", "dropbox"];

let mode = "link";
let videoTerakhir = null;

tabs.forEach(t => {
  t.addEventListener("click", () => {
    tabs.forEach(x => x.classList.remove("active"));
    t.classList.add("active");
    mode = t.dataset.mode;
    resetAll();
    if (mode === "link") {
      labelInput.innerText = "Masukan url tiktok";
      inputField.placeholder = "https://vt.tiktok.com/...";
    } else {
      labelInput.innerText = "Ketik judul lagu";
      inputField.placeholder = "contoh: shape of you";
    }
  });
});

backBtn.addEventListener("click", () => {
  resetAll();
  if (videoTerakhir) tampilGrid(videoTerakhir);
});

searchBtn.addEventListener("click", async () => {
  const val = inputField.value.trim();
  if (!val) { alert("Isi dulu cuy!"); return; }

  resetAll();
  loading.classList.remove("hidden");
  searchBtn.disabled = true;
  searchBtn.innerText = "Mencari...";

  try {
    if (mode === "link") {
      if (!val.includes("tiktok.com")) { alert("Bukan link TikTok!"); return; }
      const delay = new Promise(r => setTimeout(r, 1000));
      const [hasil] = await Promise.all([ambilData(val), delay]);
      tampilVideo(hasil.video);
      cariLink(hasil.teks);
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
// Proxy via serverless function (Vercel)
// ============================================
async function proxied(targetUrl) {
  const res = await fetch(`/api/proxy?url=${encodeURIComponent(targetUrl)}`);
  if (!res.ok) throw new Error("Proxy HTTP " + res.status);
  return await res.json();
}

async function cariLagu(keyword) {
  try {
    const target = `https://www.tikwm.com/api/feed/search?keywords=${encodeURIComponent(keyword)}&count=10`;
    const data = await proxied(target);

    if (data.code !== 0) {
      throw new Error("tikwm: " + (data.msg || "code " + data.code));
    }

    if (!data.data || !data.data.videos || data.data.videos.length === 0) {
      throw new Error("Video kosong");
    }

    videoTerakhir = data.data.videos;
    tampilGrid(data.data.videos);

  } catch (e) {
    console.error("cariLagu error:", e);
    resultArea.classList.remove("hidden");
    errorMsg.classList.remove("hidden");
    errorMsg.innerText = "SEARCH ERROR: " + e.message;
  }
}

function tampilGrid(videos) {
  gridArea.classList.remove("hidden");
  gridList.innerHTML = "";

  videos.forEach(v => {
    const card = document.createElement("div");
    card.className = "card";

    const img = document.createElement("img");
    img.src = v.cover || v.origin_cover || "";
    img.loading = "lazy";
    card.appendChild(img);

    const overlay = document.createElement("div");
    overlay.className = "card-info";
    const user = v.author ? v.author.unique_id : "unknown";
    overlay.innerHTML = `<span>@${user}</span><span>❤️ ${v.digg_count || 0}</span>`;
    card.appendChild(overlay);

    card.addEventListener("click", () => pilihVideo(v));
    gridList.appendChild(card);
  });
}

async function pilihVideo(v) {
  gridArea.classList.add("hidden");
  resultArea.classList.remove("hidden");
  errorMsg.classList.add("hidden");
  linkList.innerHTML = "";
  videoBox.innerHTML = "";
  loading.classList.remove("hidden");

  try {
    const videoId = v.video_id || v.aweme_id || v.id || v.item_id;
    const user = v.author ? v.author.unique_id : null;

    tampilVideo(v);

    if (user && videoId) {
      tampilTombolTikTok(user, videoId);
    }

    const teks = [];
    if (v.title) teks.push(v.title);
    if (v.content_desc && Array.isArray(v.content_desc)) {
      teks.push(v.content_desc.join(" "));
    }

    const komentar = await cobaAmbilKomentar(user, videoId);
    teks.push(komentar);

    loading.classList.add("hidden");
    cariLink(teks.join(" "));

    if (komentar === "" && linkList.children.length === 0) {
      errorMsg.classList.remove("hidden");
      errorMsg.innerText = "Preset ga bisa di-scan otomatis. Klik 'Buka di TikTok' buat cek manual.";
    }

  } catch (e) {
    console.error("pilihVideo error:", e);
    loading.classList.add("hidden");
    errorMsg.classList.remove("hidden");
    errorMsg.innerText = "Error: " + e.message;
  }
}

function tampilTombolTikTok(user, videoId) {
  if (!user || !videoId) return;

  const btn = document.createElement("a");
  btn.href = `https://www.tiktok.com/@${user}/video/${videoId}`;
  btn.target = "_blank";
  btn.rel = "noopener noreferrer";
  btn.innerText = "🎵 Buka di TikTok";
  btn.style.display = "block";
  btn.style.textAlign = "center";
  btn.style.background = "#ff0050";
  btn.style.color = "white";
  btn.style.padding = "10px";
  btn.style.borderRadius = "6px";
  btn.style.fontSize = "13px";
  btn.style.fontWeight = "bold";
  btn.style.textDecoration = "none";
  btn.style.marginTop = "10px";
  btn.style.border = "2px solid black";

  videoBox.appendChild(btn);
}

async function cobaAmbilKomentar(user, videoId) {
  if (!videoId) return "";

  const formats = [];
  if (user) {
    formats.push(`https://www.tiktok.com/@${user}/video/${videoId}`);
    formats.push(`https://m.tiktok.com/@${user}/video/${videoId}`);
  }
  formats.push(`https://www.tiktok.com/video/${videoId}`);
  formats.push(`https://m.tiktok.com/v/${videoId}.html`);
  formats.push(`https://vt.tiktok.com/${videoId}`);

  for (const urlTikTok of formats) {
    try {
      const teksKom = await ambilKomentarByUrl(urlTikTok);
      if (teksKom && teksKom.length > 0) {
        return teksKom;
      }
    } catch (e) {
      console.warn("Gagal:", urlTikTok, e.message);
    }
  }

  return "";
}

async function ambilKomentarByUrl(urlTikTok) {
  const teks = [];

  const target = `https://www.tikwm.com/api/comment/list?url=${encodeURIComponent(urlTikTok)}&count=50`;
  const dataKomen = await proxied(target);

  if (!dataKomen || dataKomen.code !== 0 || !dataKomen.data || !dataKomen.data.comments) {
    return "";
  }

  for (const k of dataKomen.data.comments) {
    if (k.text) teks.push(k.text);
    if (k.reply_id) {
      try {
        const rTarget = `https://www.tikwm.com/api/comment/reply?comment_id=${k.reply_id}&count=20`;
        const rd = await proxied(rTarget);
        if (rd && rd.code === 0 && rd.data && rd.data.comments) {
          rd.data.comments.forEach(b => { if (b.text) teks.push(b.text); });
        }
      } catch (e) {
        console.warn("reply gagal", e);
      }
    }
  }

  return teks.join(" ");
}

async function ambilData(url) {
  const teks = [];

  const target = `https://www.tikwm.com/api/?url=${encodeURIComponent(url)}&hd=1`;
  const dataVideo = await proxied(target);

  if (!dataVideo || dataVideo.code !== 0 || !dataVideo.data) {
    throw new Error("data kosong");
  }

  const videoInfo = dataVideo.data;
  if (videoInfo.title) teks.push(videoInfo.title);

  try {
    const kTarget = `https://www.tikwm.com/api/comment/list?url=${encodeURIComponent(url)}&count=50`;
    const dataKomen = await proxied(kTarget);

    if (dataKomen && dataKomen.code === 0 && dataKomen.data && dataKomen.data.comments) {
      for (const k of dataKomen.data.comments) {
        if (k.text) teks.push(k.text);
        if (k.reply_id) {
          try {
            const rTarget = `https://www.tikwm.com/api/comment/reply?comment_id=${k.reply_id}&count=20`;
            const rd = await proxied(rTarget);
            if (rd && rd.code === 0 && rd.data && rd.data.comments) {
              rd.data.comments.forEach(b => { if (b.text) teks.push(b.text); });
            }
          } catch (e) { console.warn("reply gagal", e); }
        }
      }
    }
  } catch (e) { console.warn("komentar gagal", e); }

  return { teks: teks.join(" "), video: videoInfo };
}

function tampilVideo(v) {
  const src = v.play || v.wmplay;
  const thumb = v.cover || v.origin_cover || "";

  if (!src) { fallbackThumb(v); return; }

  const wrap = document.createElement("div");
  wrap.style.position = "relative";
  wrap.style.borderRadius = "8px";
  wrap.style.overflow = "hidden";
  wrap.style.border = "2px solid black";
  wrap.style.background = "black";

  if (thumb) {
    const img = document.createElement("img");
    img.src = thumb;
    img.style.width = "100%";
    img.style.display = "block";
    wrap.appendChild(img);
  }

  const btn = document.createElement("div");
  btn.innerText = "▶";
  btn.style.position = "absolute";
  btn.style.top = "50%";
  btn.style.left = "50%";
  btn.style.transform = "translate(-50%,-50%)";
  btn.style.width = "55px";
  btn.style.height = "55px";
  btn.style.borderRadius = "50%";
  btn.style.background = "rgba(0,0,0,0.65)";
  btn.style.color = "white";
  btn.style.display = "flex";
  btn.style.alignItems = "center";
  btn.style.justifyContent = "center";
  btn.style.fontSize = "22px";
  btn.style.paddingLeft = "4px";
  btn.style.cursor = "pointer";
  wrap.appendChild(btn);

  btn.addEventListener("click", () => {
    wrap.innerHTML = "";
    const video = document.createElement("video");
    video.src = src;
    video.controls = true;
    video.playsInline = true;
    video.preload = "none";
    video.autoplay = true;
    video.style.width = "100%";
    video.style.display = "block";
    video.style.background = "black";
    wrap.appendChild(video);
  });

  videoBox.appendChild(wrap);

  const info = document.createElement("p");
  const user = v.author ? v.author.unique_id : "unknown";
  info.innerText = `@${user} • ${v.digg_count || 0} like • ${v.comment_count || 0} komentar`;
  info.style.fontSize = "12px";
  info.style.color = "#555";
  info.style.marginTop = "8px";
  videoBox.appendChild(info);
}

function fallbackThumb(v) {
  if (!v.cover && !v.origin_cover) {
    videoBox.innerHTML = "<p style='font-size:12px;color:#888;text-align:center;'>Video tidak tersedia</p>";
    return;
  }
  const img = document.createElement("img");
  img.src = v.cover || v.origin_cover;
  img.style.width = "100%";
  img.style.borderRadius = "8px";
  img.style.border = "2px solid black";
  videoBox.appendChild(img);
}

function cariLink(teks) {
  const ketemu = teks.match(/(https?:\/\/[^\s]+)/g) || [];
  const valid = ketemu.filter(l => {
    const low = l.toLowerCase();
    return POLA_LINK.some(p => low.includes(p));
  });
  const unik = [...new Set(valid)];

  if (unik.length === 0) {
    resultArea.classList.remove("hidden");
    errorMsg.classList.remove("hidden");
    errorMsg.innerText = "Preset tidak ditemukan di video ini cuy. Coba video lain. 😢";
    return;
  }

  resultArea.classList.remove("hidden");
  unik.forEach(l => tambahItem(l));
}

function tambahItem(link) {
  const low = link.toLowerCase();
  const li = document.createElement("li");

  let label = "LINK";
  let href = link;
  let kelas = "";

  if (low.includes("drive.google") || low.includes("docs.google")) {
    label = "GOOGLE DRIVE";
    href = ubahDrive(link);
    kelas = "drive";
  } else if (low.includes("mediafire")) {
    label = "MEDIAFIRE";
  } else if (low.includes("mega.nz")) {
    label = "MEGA";
  } else if (low.includes("dropbox")) {
    label = "DROPBOX";
  } else if (low.includes("xml")) {
    label = "FILE XML";
    kelas = "xml";
  } else if (low.includes("5mb")) {
    label = "5MB.APP";
  }

  if (kelas) li.classList.add(kelas);

  const spanLabel = document.createElement("span");
  spanLabel.className = "link-label";
  spanLabel.innerText = label;
  li.appendChild(spanLabel);

  const a = document.createElement("a");
  a.href = href;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  a.innerText = link;
  li.appendChild(a);

  if (low.includes("drive.google")) {
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
}

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