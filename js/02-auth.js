function login(){

  const id = document
    .getElementById("id")
    .value
    .trim();

  const pass = document
    .getElementById("pass")
    .value
    .trim();

  const msg = document.getElementById("msg");

  if(!id || !pass){
    msg.innerHTML = "❌ กรุณากรอก ID และ Password";
    return;
  }

  msg.innerHTML = "กำลังเข้าสู่ระบบ...";

  fetch(
    API_URL
    + "?action=login"
    + "&id=" + encodeURIComponent(id)
    + "&pass=" + encodeURIComponent(pass)
  )

  .then(res => res.json())

  .then(data => {

    if(data.status === "success"){

      document
        .getElementById("loginBox")
        .style.display = "none";

      if(String(data.role).trim() === "teacher"){

        document
          .getElementById("teacherPanel")
          .style.display = "block";

        loadTopics();
        loadScoreOptions();
        loadHideViewedWorksSetting();
        loadScoreTableSettings();
      }

      else{

currentStudentId = data.id;
currentStudentName = data.name;
currentStudentLevel = data.level || "";
currentStudentClass = data.className || "";
currentStudentNo = data.no || "";
currentStudentPhotoUrl = data.photoUrl || "";
currentStudentOrder = data.studentOrder || calculateStudentOrder(currentStudentClass, currentStudentNo);

  document
    .getElementById("studentPanel")
    .style.display = "block";

  document
    .getElementById("studentData")
    .innerHTML =
    `<div class="status-box student-profile-card">
      ${renderStudentPhoto(currentStudentPhotoUrl, data.name, false)}
      <div>
        <div>ยินดีต้อนรับ ${escapeHtml(data.name)}</div>
      </div>
    </div>`;

  loadMyWork();
  loadSubmitTopics();
}
    }

    else{
      msg.innerHTML =
        "❌ " + escapeHtml(data.message || "Login Failed");
    }
  })

  .catch(error => {
    console.error(error);
    msg.innerHTML = "❌ เชื่อมต่อ API ไม่สำเร็จ";
  });
}



function calculateStudentOrder(className, no){

  const classText = String(className || "").trim();
  const noText = String(no || "").trim();

  const numbers = classText.match(/\d+/g) || [];
  const grade = numbers.length > 0 ? numbers[0] : "";
  const room = numbers.length > 1 ? numbers[1] : "";

  if(!grade || !room || !noText){
    return "";
  }

  const roomPadded = String(parseInt(room, 10)).padStart(2, "0");
  const noPadded = String(parseInt(noText, 10)).padStart(2, "0");

  if(roomPadded === "NaN" || noPadded === "NaN"){
    return "";
  }

  return String(parseInt(grade, 10)) + roomPadded + noPadded;
}

function getWorkStudentOrder(item){

  return String(
    item.studentOrder ||
    item.studentSeq ||
    calculateStudentOrder(item.class, item.no) ||
    "99999"
  );
}

function renderStudentPhoto(photoUrl, name, small){

  const url = String(photoUrl || "").trim();

  if(!url){
    return "";
  }

  const driveId =
    extractDriveFileId(url);

  const src =
    driveId
      ? "https://drive.google.com/thumbnail?id=" + driveId + "&sz=w240"
      : url;

  return `
    <img
      class="${small ? "student-photo-small" : "student-photo"}"
      src="${escapeAttribute(src)}"
      alt="รูปนักเรียน ${escapeAttribute(name || "")}" 
      onerror="this.style.display='none';"
    >
  `;
}
