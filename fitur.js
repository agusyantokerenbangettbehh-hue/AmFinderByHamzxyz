(function () {
  "use strict";

  var $ = function (s) { return document.querySelector(s); };
  var KEY_FAV = "amf_fav";
  var KEY_HIS = "amf_his";

  var input = $("#inputField");
  var searchBtn = $("#searchBtn");
  var linkList = $("#linkList");

  // ---------- Penyimpanan ----------
  function load(k) {
    try { return JSON.parse(localStorage.getItem(k)) || []; } catch (e) { return []; }
  }
  function save(k, v) {
    try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {}
  }

  // ---------- Toast ----------
  var toastEl = $("#toast");
  var toastTimer;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove("show"); }, 1800);
  }

  // ---------- Util ----------
  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function (resolve, reject) {
      var ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      var ok = false;
      try { ok = document.execCommand("copy"); } catch (e) {}
      ta.remove();
      ok ? resolve() : reject();
    });
  }

  function salin(text) {
    copyText(text).then(
      function () { toast("Link tersalin"); },
      function () { toast("Gagal menyalin"); }
    );
  }

  function mkBtn(text, cls, fn) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "fx-btn " + cls;
    b.textContent = text;
    b.addEventListener("click", fn);
    return b;
  }

  function hasUrl(list, url) {
    return list.some(function (f) { return f.url === url; });
  }

  // ---------- Modal ----------
  function openModal(sel) {
    $(sel).classList.remove("hidden");
    document.body.classList.add("modal-open");
  }
  function closeModals() {
    Array.prototype.forEach.call(document.querySelectorAll(".modal"), function (m) {
      m.classList.add("hidden");
    });
    document.body.classList.remove("modal-open");
  }
  document.addEventListener("click", function (e) {
    var t = e.target;
    if (t.hasAttribute && t.hasAttribute("data-close")) closeModals();
    else if (t.classList && t.classList.contains("modal")) closeModals();
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeModals();
  });

  $("#helpBtn").addEventListener("click", function () { openModal("#helpModal"); });
  $("#favBtn").addEventListener("click", function () {
    renderFavList();
    openModal("#favModal");
  });

  // ---------- Tempel ----------
  $("#pasteBtn").addEventListener("click", function () {
    if (!navigator.clipboard || !navigator.clipboard.readText) {
      toast("Browser tidak mendukung tempel otomatis");
      input.focus();
      return;
    }
    navigator.clipboard.readText().then(function (t) {
      if (t && t.trim()) {
        input.value = t.trim();
        input.focus();
        toast("Ditempel");
      } else {
        toast("Clipboard kosong");
      }
    }).catch(function () {
      toast("Izin tempel ditolak");
      input.focus();
    });
  });

  // ---------- Favorit ----------
  function refreshFavUI() {
    var list = load(KEY_FAV);
    $("#favCount").textContent = list.length;
    Array.prototype.forEach.call(document.querySelectorAll(".fx-fav"), function (b) {
      var on = hasUrl(list, b.dataset.url);
      b.classList.toggle("on", on);
      b.textContent = on ? "TERSIMPAN" : "SIMPAN";
    });
    if (!$("#favModal").classList.contains("hidden")) renderFavList();
  }

  function renderFavList() {
    var box = $("#favList");
    var list = load(KEY_FAV);
    box.innerHTML = "";
    $("#favClear").classList.toggle("hidden", list.length === 0);

    if (!list.length) {
      var p = document.createElement("p");
      p.className = "fav-empty";
      p.textContent = "Belum ada favorit. Tekan SIMPAN di hasil pencarian.";
      box.appendChild(p);
      return;
    }

    list.forEach(function (f) {
      var item = document.createElement("div");
      item.className = "fav-item";

      var lab = document.createElement("span");
      lab.className = "link-label";
      lab.textContent = f.label || "LINK";

      var title = document.createElement("div");
      title.className = "fav-title";
      title.textContent = f.title || f.url;

      var url = document.createElement("div");
      url.className = "fav-url";
      url.textContent = f.url;

      var bar = document.createElement("div");
      bar.className = "fx-bar";
      bar.appendChild(mkBtn("BUKA", "fx-open", function () {
        window.open(f.url, "_blank", "noopener");
      }));
      bar.appendChild(mkBtn("SALIN", "fx-copy", function () { salin(f.url); }));
      bar.appendChild(mkBtn("HAPUS", "fx-del", function () {
        save(KEY_FAV, load(KEY_FAV).filter(function (x) { return x.url !== f.url; }));
        refreshFavUI();
      }));

      item.appendChild(lab);
      item.appendChild(title);
      item.appendChild(url);
      item.appendChild(bar);
      box.appendChild(item);
    });
  }

  $("#favClear").addEventListener("click", function () {
    save(KEY_FAV, []);
    refreshFavUI();
    toast("Favorit dikosongkan");
  });

  // ---------- Tombol aksi di tiap hasil ----------
  function decorate(li) {
    if (li.dataset.fx) return;
    var a = li.querySelector("a:not(.btn-download)");
    if (!a) return; // hasil Am Prem tidak punya link, jadi dilewati
    li.dataset.fx = "1";

    var href = a.getAttribute("href");
    var labelEl = li.querySelector(".link-label");
    var label = labelEl ? labelEl.textContent : "LINK";
    var divs = Array.prototype.filter.call(li.children, function (e) {
      return e.tagName === "DIV";
    });
    var title = "";
    if (divs.length && divs[0].textContent.indexOf("Sumber:") !== 0) {
      title = divs[0].textContent;
    }

    var bar = document.createElement("div");
    bar.className = "fx-bar";

    bar.appendChild(mkBtn("SALIN", "fx-copy", function () { salin(href); }));

    var fav = mkBtn("SIMPAN", "fx-fav", function () {
      var list = load(KEY_FAV);
      if (hasUrl(list, href)) {
        list = list.filter(function (f) { return f.url !== href; });
        toast("Dihapus dari favorit");
      } else {
        list.unshift({ url: href, title: title, label: label, ts: Date.now() });
        toast("Disimpan ke favorit");
      }
      save(KEY_FAV, list);
      refreshFavUI();
    });
    fav.dataset.url = href;
    bar.appendChild(fav);

    bar.appendChild(mkBtn("WA", "fx-wa", function () {
      var text = (title ? title + "\n" : "") + href;
      window.open("https://wa.me/?text=" + encodeURIComponent(text), "_blank", "noopener");
    }));

    li.appendChild(bar);
    refreshFavUI();
  }

  new MutationObserver(function () {
    Array.prototype.forEach.call(linkList.children, decorate);
  }).observe(linkList, { childList: true });

  // ---------- Riwayat ----------
  var hisBox = $("#historyBox");
  var hisList = $("#historyList");

  function pendek(v) {
    v = v.replace(/^https?:\/\//, "");
    return v.length > 24 ? v.slice(0, 24) + "..." : v;
  }

  function renderHistory() {
    var list = load(KEY_HIS);
    hisList.innerHTML = "";
    hisBox.classList.toggle("hidden", list.length === 0);

    list.forEach(function (h) {
      var c = document.createElement("button");
      c.type = "button";
      c.className = "chip";
      c.title = h.value;
      c.textContent = (h.mode === "song" ? "LAGU: " : "LINK: ") + pendek(h.value);
      c.addEventListener("click", function () {
        var tab = document.querySelector('.tab[data-mode="' + h.mode + '"]');
        if (tab) tab.click();
        input.value = h.value;
        searchBtn.click();
      });
      hisList.appendChild(c);
    });
  }

  // Hanya mencatat, tidak mengubah alur pencarian
  searchBtn.addEventListener("click", function () {
    var tab = document.querySelector(".tab.active");
    var mode = tab ? tab.dataset.mode : "link";
    if (mode === "amprem") return;

    var v = input.value.trim();
    if (!v) return;
    if (mode === "link" && v.indexOf("tiktok.com") === -1 && v.indexOf("http") !== 0) return;

    var list = load(KEY_HIS).filter(function (h) {
      return !(h.mode === mode && h.value === v);
    });
    list.unshift({ mode: mode, value: v });
    save(KEY_HIS, list.slice(0, 5));
    renderHistory();
  }, true);

  $("#historyClear").addEventListener("click", function () {
    save(KEY_HIS, []);
    renderHistory();
  });

  // ---------- Mulai ----------
  renderHistory();
  refreshFavUI();
})();