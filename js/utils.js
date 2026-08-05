function extractDriveFileId(url){

  const value = String(url || "").trim();

  const matchById =
    value.match(/[?&]id=([a-zA-Z0-9_-]+)/);

  if(matchById && matchById[1]){
    return matchById[1];
  }

  const matchByD =
    value.match(/\/d\/([a-zA-Z0-9_-]+)/);

  if(matchByD && matchByD[1]){
    return matchByD[1];
  }

  return "";
}


// ======================================
// ตรวจ URL
// ======================================
function isUrl(value){
  return /^https?:\/\/\S+$/i.test(String(value || "").trim());
}


// ======================================
// ตรวจ direct image url
// ======================================
function isDirectImageUrl(value){
  return /^https?:\/\/\S+\.(png|jpg|jpeg|gif|webp|bmp|svg)(\?\S*)?$/i
    .test(String(value || "").trim());
}


// ======================================
// ป้องกัน HTML แตก
// ======================================
function escapeHtml(value){

  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeAttribute(value){
  return escapeHtml(value);
}

function escapeJsString(value){

  return String(value ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/"/g, '\"')
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r");
}
// ======================================
// จัดรูปแบบวันและเวลาส่งงาน
// ======================================


function loadLazyDrivePreview(button, previewUrl){
  if(!button){
    return;
  }

  const box = button.closest(".lazy-preview-box");
  const target = box ? box.querySelector(".lazy-preview-target") : null;

  if(!target){
    window.open(previewUrl, "_blank", "noopener,noreferrer");
    return;
  }

  if(target.dataset.loaded === "true"){
    const shouldHide = target.style.display !== "none";
    target.style.display = shouldHide ? "none" : "block";
    button.textContent = shouldHide ? "แสดงตัวอย่างไฟล์" : "ซ่อนตัวอย่างไฟล์";
    return;
  }

  target.innerHTML = `
    <iframe
      class="drive-preview"
      src="${escapeAttribute(previewUrl)}"
      allow="autoplay"
      loading="lazy"
    ></iframe>
  `;
  target.dataset.loaded = "true";
  button.textContent = "ซ่อนตัวอย่างไฟล์";
}
