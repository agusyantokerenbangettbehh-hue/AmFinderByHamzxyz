// @ts-nocheck
const searchBtn = document.getElementById("searchBtn");
const urlInput = document.getElementById("tiktokUrl");
const resultArea = document.getElementById("hasil");
const linkList = document.getElementById("linkList");
const errorMsg = document.getElementById("error");
const loading = document.getElementById("loading");
const videoBox = document.getElementById("videoContainer");

const POLA_LINK = [
  "5mb", "xml", "drive.google", "mediafire",
  "alight", "preset", "mega.nz", "dropbox"
];

searchBtn.addEventListener("click", async () => {
  const url = urlInput.value.trim();

  if (!url) {
    alert("Tempel link TikTok dulu cuy!");
    return;
  }
  if (!url.includes("tiktok.com")) {
    alert("Bukan link TikTok cuy!");
    return;
  }

  resultArea.classList.add("hidden");
  errorMsg.classList.add("hidden");
  linkList.innerHTML = "";
  videoBox.innerHTML = "";
  loading.classList.remove("hidden");
  searchBtn.disabled = true;
  searchBtn.innerText = "Mencari...";

  try {
    const delay = new Promise(r => setTimeout(r, 1200));
    const ambil = ambilData(url);
    const [hasil] = await Promise.all([ambil, delay]);

    tampilVideo(hasil.video);
    cariLink(hasil.teks);

  } catch (err) {
    console.error(err);
    resultArea.classList.remove("hidden");
    errorMsg.classList.remove("hidden");
    errorMsg.innerText = "Gagal ambil data. Coba lagi atau cek linknya.";
  } finally {
    loading.classList.add("hidden");
    searchBtn.disabled = false;
    searchBtn.innerText = "Cari";
  }
});

async function ambilData(url) {
  const teks = [];

  const resVideo = await fetch(`https://www.tikwm.com/api/?url=${encodeURIComponent(url)}&hd=1`);
  const dataVideo = await resVideo.json();

  if (dataVideo.code !== 0 || !dataVideo.data) {
    throw new Error("data video kosong");
  }

  if (dataVideo.data.title) teks.push(dataVideo.data.title);

  try {
    const resKomen = await fetch(`https://www.tikwm.com/api/comment/list?url=${encodeURIComponent(url)}&count=50`);
    const dataKomen = await resKomen.json();

    if (dataKomen.code === 0 && dataKomen.data && dataKomen.data.comments) {
      for (const k of dataKomen.data.comments) {
        if (k.text) teks.push(k.text);

        if (k.reply_id) {
          try {
            const resBalas = await fetch(`https://www.tikwm.com/api/comment/reply?comment_id=${k.reply_id}&count=20`);
            const dataBalas = await resBalas.json();
            if (dataBalas.code === 0 && dataBalas.data && dataBalas.data.comments) {
              for (const b of dataBalas.data.comments) {
                if (b.text) teks.push(b.text);
              }
            }
          } catch (e) {
            console.warn("balasan gagal", e);
          }
        }
      }
    }
  } catch (e) {
    console.warn("komentar gagal", e);
  }

  return { teks: teks.join(" "), video: dataVideo.data };
}

function tampilVideo(v) {
  const src = v.play || v.wmplay;
  const thumb = v.cover || "";

  if (!src) {
    fallbackThumb(v);
    return;
  }

  // Wrapper
  const wrap = document.createElement("div");
  wrap.style.position = "relative";
  wrap.style.borderRadius = "8px";
  wrap.style.overflow = "hidden";
  wrap.style.border = "2px solid black";
  wrap.style.background = "black";

  // Thumbnail dulu (ringan)
  if (thumb) {
    const img = document.createElement("img");
    img.src = thumb;
    img.style.width = "100%";
    img.style.display = "block";
    wrap.appendChild(img);
  }

  // Tombol play
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
    video.preload = "none"; // 🔥 kunci: jangan preload
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
  if (!v.cover) {
    videoBox.innerHTML = "<p style='font-size:12px;color:#888;text-align:center;'>Video tidak tersedia</p>";
    return;
  }
  const img = document.createElement("img");
  img.src = v.cover;
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
    errorMsg.innerText = "Preset tidak ditemukan cuy. 😢";
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

urlInput.addEventListener("keypress", e => {
  if (e.key === "Enter") searchBtn.click();
});