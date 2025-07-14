const video = document.getElementById("video");
const startBtn = document.getElementById("start");
const downloadBtn = document.getElementById("download");
const countdownEl = document.getElementById("countdown");
const flash = document.getElementById("flash");
const previewDiv = document.getElementById("preview");
const filterSelect = document.getElementById("filter");
const qrDiv = document.getElementById("qrcode");

const photoWidth = 640;
const photoHeight = 360;
const totalPhotos = 4;
let photoCanvases = [];

navigator.mediaDevices.getUserMedia({ video: true }).then((stream) => {
  video.srcObject = stream;
});

filterSelect.addEventListener("change", () => {
  video.style.filter = filterSelect.value;
});

function triggerFlash() {
  flash.classList.add("show");
  setTimeout(() => flash.classList.remove("show"), 100);
}

function showCountdown(seconds) {
  return new Promise((resolve) => {
    countdownEl.textContent = seconds;
    const interval = setInterval(() => {
      seconds--;
      if (seconds > 0) {
        countdownEl.textContent = seconds;
      } else {
        clearInterval(interval);
        countdownEl.textContent = "";
        resolve();
      }
    }, 1000);
  });
}

function capturePhoto() {
  const canvas = document.createElement("canvas");
  canvas.width = photoWidth;
  canvas.height = photoHeight;
  const ctx = canvas.getContext("2d");

  const filterValue = filterSelect.value || "none"; // ← ini perbaikannya
  ctx.filter = filterValue;

  // Deteksi apakah video sedang mirror
  const isMirrored = video.style.transform === "scaleX(-1)";
  if (isMirrored) {
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1); // Membalik horizontal jika mirror
  }

  ctx.drawImage(video, 0, 0, photoWidth, photoHeight);

  triggerFlash();
  photoCanvases.push(canvas);
}

async function takePhotos() {
  photoCanvases = [];
  previewDiv.innerHTML = "";
  const qrCanvasContainer = document.getElementById("qrcode-canvas-container");
  if (qrCanvasContainer) {
    qrCanvasContainer.innerHTML =
      '<p class="qr-placeholder">QR akan muncul setelah foto selesai</p>';
  }
  for (let i = 0; i < totalPhotos; i++) {
    await showCountdown(3);
    capturePhoto();
  }
  showPreview();
  downloadBtn.disabled = false;
}

function showPreview() {
  const spacing = 40;
  const bottomSpace = 100;

  const finalCanvas = document.createElement("canvas");
  finalCanvas.width = photoWidth + 40;
  finalCanvas.height = (photoHeight + spacing) * totalPhotos + bottomSpace;
  const ctx = finalCanvas.getContext("2d");

  // Background putih
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);

  // Gambar setiap foto ke dalam canvas final
  photoCanvases.forEach((canvas, i) => {
    ctx.drawImage(canvas, 20, i * (photoHeight + spacing));
  });

  // Tambahkan teks di bawah foto
  ctx.fillStyle = "#000";
  ctx.font = "24px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(
    "Take Your Time PhotoBooth",
    finalCanvas.width / 2,
    finalCanvas.height - 50
  );
  ctx.font = "16px sans-serif";
  ctx.fillText(
    "© 2025 SMK TI BAZMA",
    finalCanvas.width / 2,
    finalCanvas.height - 20
  );

  // Buat data URL dari canvas final
  const dataURL = finalCanvas.toDataURL("image/png");

  // Tampilkan sebagai preview gambar dengan padding visual
  const img = new Image();
  img.src = dataURL;

  // ✅ Tambahkan styling padding dan dekorasi
  img.style.padding = "20px";
  img.style.background = "#fff";
  img.style.borderRadius = "10px";
  img.style.boxShadow = "0 4px 10px rgba(0,0,0,0.1)";
  img.style.maxWidth = "100%";
  img.style.height = "auto";
  img.style.display = "block";
  img.style.margin = "20px auto";

  previewDiv.innerHTML = "";
  previewDiv.appendChild(img);

  // Simpan untuk download
  downloadBtn.dataset.image = dataURL;

  // Upload ke Cloudinary dan tampilkan QR
  uploadImageToCloudinary(dataURL);
}


async function uploadImageToCloudinary(dataURL) {
  try {
    const blob = await (await fetch(dataURL)).blob();
    const form = new FormData();
    form.append("file", blob);
    form.append("upload_preset", "photobooth");

    const response = await fetch(
      "https://api.cloudinary.com/v1_1/dxp3bnxa0/image/upload",
      {
        method: "POST",
        body: form,
      }
    );

    const result = await response.json();
    console.log("Cloudinary upload result:", result);

    if (result.secure_url) {
      showQRCode(result.secure_url);
    } else {
      alert("Gagal upload ke Cloudinary");
      console.error(result);
    }
  } catch (e) {
    console.error("Upload error:", e);
    // alert("Upload error: " + e.message);
  }
}

function showQRCode(link) {
  const qrContainer = document.getElementById("qrcode-canvas-container");

  // Hapus canvas lama, biarkan petunjuk tetap
  const oldCanvas = qrContainer.querySelector("canvas");
  if (oldCanvas) oldCanvas.remove();

  // Hapus placeholder kalau ada
  const placeholder = qrContainer.querySelector(".qr-placeholder");
  if (placeholder) placeholder.remove();

  // Tambah QR code baru
  const canvas = document.createElement("canvas");
  new QRious({
    element: canvas,
    value: link,
    size: 200,
  });

  qrContainer.appendChild(canvas);

  const p = document.createElement("p");
  p.textContent = "Scan untuk download hasil";
  p.style.fontSize = "14px";
  p.style.marginTop = "10px";
  qrContainer.appendChild(p);
}

startBtn.addEventListener("click", () => {
  if (photoCanvases.length > 0) {
    if (!confirm("Mulai ulang sesi? Semua hasil sebelumnya akan hilang."))
      return;
  }
  downloadBtn.disabled = true;
  takePhotos();
});

downloadBtn.addEventListener("click", () => {
  const a = document.createElement("a");
  a.href = downloadBtn.dataset.image;
  a.download = "photo-strip.png";
  a.click();
});

const mirrorSelect = document.getElementById("mirror"); // ID dari <select> yang kamu buat

mirrorSelect.addEventListener("change", () => {
  if (mirrorSelect.value === "no") {
    video.style.transform = "scaleX(1)"; // Normal (tidak mirror)
  } else {
    video.style.transform = "scaleX(-1)"; // Mirror
  }
});
