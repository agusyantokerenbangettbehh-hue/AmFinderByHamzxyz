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

const POLA_LINK = [
  "drive.google", "docs.google",
  "alight.link", "alightcreative.com", "alightmotion", "alight",
  "5mb", "xml", "mediafire", "mega.nz", "dropbox",
  "gofile", "pixeldrain", "tinyurl", "bit.ly", "shorturl",
  "linktr.ee", "sfl.gl", "ouo.io", "shrinkme", "shrinke",
  "sfile.mobi", "zippy", "whatsapp.com/channel", "wa.me"
];

let mode = "link";
let videoTerakhir = null;

function extractVideoId(url) {
  if (!url) return null;
  const m = url.match(/(\d{15,})/);
  return m ? m[1] : null;
}

// Fetch via Vercel serverless proxy
async function fetchTikwm(targetUrl, timeout = 30000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const url = `/api/proxy?url=${encodeURIComponent(targetUrl)}`;
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error("HTTP " + res.status);
    return JSON.parse(await res.text());
  } finally {
    clearTimeout(timer);
  }
}

// TAB SWITCHING
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

// TOMBOL CARI
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
      const hasil = await ambilData(val);
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

// SEARCH BY JUDUL LAGU
async function cariLagu(keyword) {
  try {
    const target = `https://www.tikwm.com/api/feed/search?keywords=${encodeURIComponent(keyword)}&count=10`;
    const data = await fetchTikwm(target);

    if (!data || data.code !== 0) {
      throw new Error(data?.msg || "API pencarian gagal.");
    }

    const videos = data.data?.videos;
    if (!Array.isArray(videos) || videos.length === 0) {
      throw new Error("Video tidak ditemukan. Coba kata kunci lain.");
    }

    videoTerakhir = videos;
    tampilGrid(videos);
  } catch (e) {
    console.error("cariLagu error:", e);
    resultArea.classList.remove("hidden");
    errorMsg.classList.remove("hidden");
    errorMsg.innerText = "Search error: " + e.message;
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

// PILIH VIDEO DARI GRID
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
    if (user && videoId) tampilTombolTikTok(user, videoId);

    const teks = [];
    if (v.title) teks.push(v.title);
    if (Array.isArray(v.content_desc)) teks.push(v.content_desc.join(" "));

    if (videoId) {
      const komen = await ambilKomentarByVideoId(videoId, user);
      if (komen) teks.push(komen);
    }

    loading.classList.add("hidden");
    cariLink(teks.join(" "));
  } catch (e) {
    console.error("pilihVideo error:", e);
    loading.classList.add("hidden");
    errorMsg.classList.remove("hidden");
    errorMsg.innerText = "Error: " + e.message;
  }
}

function tampilTombolTikTok(user, videoId) {
  const btn = document.createElement("a");
  btn.href = `https://www.tiktok.com/@${user}/video/${videoId}`;
  btn.target = "_blank";
  btn.rel = "noopener noreferrer";
  btn.innerText = "🎵 Buka di TikTok";
  Object.assign(btn.style, {
    display: "block", textAlign: "center", background: "#ff0050",
    color: "white", padding: "10px", borderRadius: "6px",
    fontSize: "13px", fontWeight: "bold", textDecoration: "none",
    marginTop: "10px", border: "2px solid black"
  });
  videoBox.appendChild(btn);
}

// AMBIL KOMENTAR BY VIDEO_ID (dari grid)
async function ambilKomentarByVideoId(videoId, user) {
  const teks = [];

  const urls = [];
  if (user) {
    urls.push(`https://www.tiktok.com/@${user}/video/${videoId}`);
    urls.push(`https://m.tiktok.com/@${user}/video/${videoId}`);
  }
  urls.push(`https://www.tiktok.com/video/${videoId}`);
  urls.push(`https://m.tiktok.com/v/${videoId}.html`);

  let data = null;

  for (const u of urls) {
    try {
      data = await fetchTikwm(
        `https://www.tikwm.com/api/comment/list?url=${encodeURIComponent(u)}&count=50`
      );
      if (data?.code === 0 && Array.isArray(data.data?.comments)) break;
      data = null;
    } catch (e) {
      console.warn("comment/list error:", e.message);
    }
  }

  if (!data || data?.code !== 0 || !Array.isArray(data.data?.comments)) {
    return "";
  }

  const komentar = data.data.comments;
  komentar.forEach(k => { if (k.text) teks.push(k.text); });

  const punyaReply = komentar.filter(k => k.reply_total > 0).slice(0, 20);

  for (const k of punyaReply) {
    try {
      await new Promise(r => setTimeout(r, 800));

      const rd = await fetchTikwm(
        `https://www.tikwm.com/api/comment/reply?video_id=${videoId}&comment_id=${k.id}&count=50`
      );

      if (rd?.code === 0 && Array.isArray(rd.data?.comments)) {
        rd.data.comments.forEach(b => { if (b.text) teks.push(b.text); });

        const nested = rd.data.comments.filter(b => b.reply_total > 0).slice(0, 10);
        for (const n of nested) {
          try {
            await new Promise(r => setTimeout(r, 800));
            const rd2 = await fetchTikwm(
              `https://www.tikwm.com/api/comment/reply?video_id=${videoId}&comment_id=${n.id}&count=30`
            );
            if (rd2?.code === 0 && Array.isArray(rd2.data?.comments)) {
              rd2.data.comments.forEach(b => { if (b.text) teks.push(b.text); });
            }
          } catch (e) { console.warn("nested gagal:", e.message); }
        }
      }
    } catch (e) { console.warn("reply error:", e.message); }
  }

  return teks.join(" ");
}

// AMBIL DATA VIDEO (Link Video)
async function ambilData(url) {
  const videoUrl = `https://www.tikwm.com/api/?url=${encodeURIComponent(url)}&hd=1`;
  const komentarUrl = `https://www.tikwm.com/api/comment/list?url=${encodeURIComponent(url)}&count=50`;

  const [dataVideo, dataKomen] = await Promise.all([
    fetchTikwm(videoUrl).catch(() => null),
    fetchTikwm(komentarUrl).catch(() => null)
  ]);

  if (!dataVideo || dataVideo.code !== 0 || !dataVideo.data) {
    throw new Error("Data video kosong / link tidak valid");
  }

  const videoInfo = dataVideo.data;
  const teks = [];
  if (videoInfo.title) teks.push(videoInfo.title);

  const realVideoId = videoInfo.id || videoInfo.video_id || extractVideoId(url);

  if (dataKomen && dataKomen.code === 0 && Array.isArray(dataKomen.data?.comments)) {
    const komentar = dataKomen.data.comments;
    komentar.forEach(k => { if (k.text) teks.push(k.text); });

    const punyaReply = komentar.filter(k => k.reply_total > 0).slice(0, 20);

    for (const k of punyaReply) {
      try {
        await new Promise(r => setTimeout(r, 800));

        const rd = await fetchTikwm(
          `https://www.tikwm.com/api/comment/reply?video_id=${realVideoId}&comment_id=${k.id}&count=50`
        );

        if (rd?.code === 0 && Array.isArray(rd.data?.comments)) {
          rd.data.comments.forEach(b => { if (b.text) teks.push(b.text); });

          const nested = rd.data.comments.filter(b => b.reply_total > 0).slice(0, 10);
          for (const n of nested) {
            try {
              await new Promise(r => setTimeout(r, 800));
              const rd2 = await fetchTikwm(
                `https://www.tikwm.com/api/comment/reply?video_id=${realVideoId}&comment_id=${n.id}&count=30`
              );
              if (rd2?.code === 0 && Array.isArray(rd2.data?.comments)) {
                rd2.data.comments.forEach(b => { if (b.text) teks.push(b.text); });
              }
            } catch (e) { console.warn("nested gagal:", e.message); }
          }
        }
      } catch (e) { console.warn("reply error:", e.message); }
    }
  }

  return { teks: teks.join(" "), video: videoInfo };
}

// TAMPILIN VIDEO
function tampilVideo(v) {
  const src = v.play || v.wmplay;
  const thumb = v.cover || v.origin_cover || "";
  if (!src) { fallbackThumb(v); return; }

  const wrap = document.createElement("div");
  Object.assign(wrap.style, {
    position: "relative", borderRadius: "8px", overflow: "hidden",
    border: "2px solid black", background: "black"
  });

  if (thumb) {
    const img = document.createElement("img");
    img.src = thumb;
    img.style.width = "100%";
    img.style.display = "block";
    wrap.appendChild(img);
  }

  const btn = document.createElement("div");
  btn.innerText = "▶";
  Object.assign(btn.style, {
    position: "absolute", top: "50%", left: "50%",
    transform: "translate(-50%,-50%)", width: "55px", height: "55px",
    borderRadius: "50%", background: "rgba(0,0,0,0.65)", color: "white",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: "22px", paddingLeft: "4px", cursor: "pointer"
  });
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

// CARI LINK PRESET
function cariLink(teks) {
  const ketemu = teks.match(
    /(?:https?:\/\/)?(?:www\.)?(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/[^\s,;!?)\]}>"']*)?/gi
  ) || [];

  const valid = ketemu
    .map(l => l.trim().replace(/[.,;:!?)\]}>"']+$/, ""))
    .filter(l => {
      const low = l.toLowerCase();
      return POLA_LINK.some(p => low.includes(p));
    })
    .map(l => (/^https?:\/\//i.test(l) ? l : "https://" + l));

  const unik = [];
  const seen = new Set();

  for (const link of valid) {
    const norm = link
      .replace(/[?#].*$/, "")
      .replace(/\/view\/?$/, "")
      .replace(/\/+$/, "")
      .toLowerCase();

    if (!seen.has(norm)) {
      seen.add(norm);
      unik.push(link);
    }
  }

  const prioritas = l => /drive\.google|docs\.google|5mb|alight/i.test(l) ? 0 : 1;
  unik.sort((a, b) => prioritas(a) - prioritas(b));

  resultArea.classList.remove("hidden");
  if (unik.length === 0) {
    errorMsg.classList.remove("hidden");
    errorMsg.innerText = "Preset tidak ditemukan di video ini cuy. Coba video lain. 😢";
    return;
  }
  unik.forEach(l => tambahItem(l));
}

// TAMBAH ITEM KE LIST
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
  } else if (low.includes("5mb")) {
    label = "5MB.APP";
  } else if (low.includes("mediafire")) {
    label = "MEDIAFIRE";
  } else if (low.includes("mega.nz")) {
    label = "MEGA";
  } else if (low.includes("dropbox")) {
    label = "DROPBOX";
  } else if (low.includes("gofile")) {
    label = "GOFILE";
  } else if (low.includes("pixeldrain")) {
    label = "PIXELDRAIN";
  } else if (low.includes("whatsapp.com/channel")) {
    label = "SALURAN WA";
  } else if (low.includes("wa.me")) {
    label = "WHATSAPP";
  } else if (low.includes("alightcreative.com")) {
    label = "ALIGHT CREATIVE";
  } else if (low.includes("alight.link")) {
    label = "ALIGHT.LINK";
  } else if (low.includes("tinyurl") || low.includes("bit.ly") ||
             low.includes("shorturl") || low.includes("sfl.gl") ||
             low.includes("ouo.io") || low.includes("shrinkme") ||
             low.includes("shrinke")) {
    label = "SHORT LINK";
  } else if (low.includes("linktr.ee")) {
    label = "LINKTREE";
  } else if (low.includes("sfile.mobi") || low.includes("zippy")) {
    label = "SFILE";
  } else if (low.endsWith(".xml") || low.includes("/xml/")) {
    label = "FILE XML";
    kelas = "xml";
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