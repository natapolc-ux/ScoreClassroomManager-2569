function loadSubmitTopics(){

  const select = document.getElementById("submitTopic");

  select.innerHTML =
    `<option value="">กำลังโหลดหัวข้องาน...</option>`;

  fetch(API_URL + "?action=topics")
    .then(res => res.json())
    .then(response => {

      if(response.status !== "success" || !Array.isArray(response.data)){
        select.innerHTML =
          `<option value="">โหลดหัวข้องานไม่สำเร็จ</option>`;
        return;
      }

      const myLevel =
        String(currentStudentLevel || "").trim();

      const topics =
        response.data.filter(t =>
          String(t.level || "").trim() === myLevel
        );

      if(topics.length === 0){
        select.innerHTML =
          `<option value="">ยังไม่มีงานของระดับชั้นคุณ</option>`;
        return;
      }

      let html =
        `<option value="">-- เลือกงาน --</option>`;

      topics.forEach(t => {
        html += `
          <option
  value="${escapeAttribute(t.url)}"
  data-work-type="${escapeAttribute(t.workType || "งานเดี่ยว")}"
  data-worksheet-url="${escapeAttribute(t.worksheetUrl || "")}"
  data-worksheet-visible="${t.worksheetVisible === false ? "false" : "true"}"
>
            ${escapeHtml(t.level)} - ${escapeHtml(t.topic)}
            ${t.workType === "งานกลุ่ม" ? " [งานกลุ่ม]" : ""}
            ${t.workType === "เลือกส่ง" ? " [เลือกส่ง]" : ""}
          </option>
        `;
      });

      select.innerHTML = html;
      handleSubmitTopicChange();
    })

    .catch(error => {
      console.error(error);
      select.innerHTML =
        `<option value="">โหลดหัวข้องานไม่สำเร็จ</option>`;
    });
}
function handleSubmitTopicChange(){

  const topicSelect =
    document.getElementById("submitTopic");

  const submitModeBox =
    document.getElementById("submitModeBox");

  const submitMode =
    document.getElementById("submitMode");

  if(!topicSelect || !submitModeBox || !submitMode){
    return;
  }

  const selectedOption =
    topicSelect.options[topicSelect.selectedIndex];

  const workType =
    selectedOption
      ? selectedOption.getAttribute("data-work-type") || "งานเดี่ยว"
      : "งานเดี่ยว";

  if(workType === "เลือกส่ง"){

    submitModeBox.style.display = "block";
    submitMode.disabled = false;

  } else {

    submitModeBox.style.display = "none";
    submitMode.disabled = true;

    if(workType === "งานกลุ่ม"){
      submitMode.value = "งานกลุ่ม";
    } else {
      submitMode.value = "งานเดี่ยว";
    }
  }
  updateWorksheetBox(selectedOption);
  renderGroupAssessmentBox(submitMode.value || workType);
}
function updateWorksheetBox(selectedOption){

  const worksheetBox =
    document.getElementById("worksheetBox");

  if(!worksheetBox){
    return;
  }

  worksheetBox.style.display = "none";
  worksheetBox.innerHTML = "";
}


function renderWorksheetContent(url){

  const driveFileId =
    extractDriveFileId(url);

  if(driveFileId){

    const previewUrl =
      "https://drive.google.com/file/d/" +
      driveFileId +
      "/preview";

    const downloadUrl =
      "https://drive.google.com/uc?export=download&id=" +
      driveFileId;

    return `
      <iframe
        class="drive-preview"
        src="${escapeAttribute(previewUrl)}"
        allow="autoplay"
      ></iframe>

      <a
        class="file-link"
        href="${escapeAttribute(url)}"
        target="_blank"
        rel="noopener noreferrer"
      >
        เปิดใบงาน
      </a>

      <a
        class="file-link"
        href="${escapeAttribute(downloadUrl)}"
        target="_blank"
        rel="noopener noreferrer"
      >
        ดาวน์โหลดใบงาน
      </a>
    `;
  }

  return `
    <a
      class="file-link"
      href="${escapeAttribute(url)}"
      target="_blank"
      rel="noopener noreferrer"
    >
      เปิดใบงาน / ดาวน์โหลด
    </a>
  `;
}
  function openImageCompressor(){
  window.open("https://squoosh.app/", "_blank");
}
function submitStudentWork(){

  const topicSelect = document.getElementById("submitTopic");
  const url = topicSelect.value;
  const selectedOption = topicSelect.options[topicSelect.selectedIndex];

  const workTypeOverride =
    currentSubmitWorkItem
      ? (currentSubmitWorkItem.workType || currentSubmitWorkItem.submitMode || "")
      : "";

  const workType =
    workTypeOverride ||
    (selectedOption ? selectedOption.getAttribute("data-work-type") : "") ||
    "งานเดี่ยว";

  let submitMode = "งานเดี่ยว";

if(workType === "เลือกส่ง"){
  submitMode = document.getElementById("submitMode").value;
}

else if(workType === "งานกลุ่ม"){
  submitMode = "งานกลุ่ม";
}

else{
  submitMode = "งานเดี่ยว";
}

const isRevision =
  currentSubmitWorkItem &&
  currentSubmitWorkItem.status === "submitted" &&
  currentSubmitWorkItem.canRevise;

const revisionModeBox = document.getElementById("revisionMode");
const revisionMode =
  isRevision && revisionModeBox
    ? revisionModeBox.value
    : "";

if(isRevision && submitMode === "งานกลุ่ม" && revisionMode === "individual"){
  submitMode = "งานเดี่ยวแก้ไข";
}

  const work =
    document.getElementById("submitWorkText").value.trim();

  const fileInput =
    document.getElementById("submitFile");

  const file =
    fileInput && fileInput.files.length > 0
      ? fileInput.files[0]
      : null;

  const statusBox =
    document.getElementById("submitWorkStatus");

  const maxFileSizeMB = 5;
  const maxFileSizeBytes = maxFileSizeMB * 1024 * 1024;

  if(file && file.size > maxFileSizeBytes){
    statusBox.innerHTML =
      `<div class="status-box">
        ❌ ไฟล์ใหญ่เกินไป กรุณาเลือกไฟล์ไม่เกิน ${maxFileSizeMB} MB
        <br>
        <button type="button" onclick="openImageCompressor()">
          เปิดเว็บบีบอัดรูป
        </button>
      </div>`;
    return;
  }

  if(!url){
    statusBox.innerHTML =
      `<div class="status-box">❌ กรุณาเลือกงานก่อน</div>`;
    return;
  }

  if(!work && !file){
    statusBox.innerHTML =
      `<div class="status-box">❌ กรุณาพิมพ์คำตอบหรือแนบไฟล์ก่อน</div>`;
    return;
  }

  const groupAssessmentData =
    collectGroupAssessmentBeforeSubmit(submitMode);

  if(groupAssessmentData === null){
    statusBox.innerHTML =
      `<div class="status-box">ยกเลิกการส่งงาน เพื่อกลับไปเลือกการทำงานกลุ่ม</div>`;
    return;
  }

  statusBox.innerHTML =
    `<div class="status-box">กำลังส่งงาน...</div>`;

  const sendPayload = (filePayload) => {

    fetch(API_URL + "?action=submitWork", {
      method: "POST",
      body: JSON.stringify({
        url: url,
        studentId: currentStudentId,
        name: currentStudentName,
        className: currentStudentClass,
        no: currentStudentNo,
        submitMode: submitMode,
        work: work,
        groupMemberIds: groupAssessmentData.groupMemberIds || [],
        groupMemberAssessments: groupAssessmentData.assessments,
        teacherNote: groupAssessmentData.teacherNote,
        isRevision: isRevision,
        revisionMode: revisionMode,
        revisionNote: document.getElementById("revisionNote") ? document.getElementById("revisionNote").value.trim() : "",
        originalRowIndex: currentSubmitWorkItem ? (currentSubmitWorkItem.rowIndex || "") : "",
        originalSubmitMode: currentSubmitWorkItem ? (currentSubmitWorkItem.submitMode || currentSubmitWorkItem.workType || "") : "",
        ...filePayload
      })
    })

    .then(res => res.json())

    .then(response => {

      if(response.status !== "success"){
        statusBox.innerHTML =
          `<div class="status-box">
            ❌ ${escapeHtml(response.message || "ส่งงานไม่สำเร็จ")}
          </div>`;
        return;
      }

      document.getElementById("submitWorkText").value = "";

      if(fileInput){
        fileInput.value = "";
      }

      statusBox.innerHTML =
        `<div class="status-box">
          ✅ ${escapeHtml(response.message || "ส่งงานเรียบร้อยแล้ว")}
        </div>`;

      alert("✅ " + (response.message || "ส่งงานเรียบร้อยแล้ว"));
      closeStudentSubmitModal();
      loadMyWork();
    })

    .catch(error => {
      console.error(error);
      statusBox.innerHTML =
        `<div class="status-box">❌ เชื่อมต่อ API ไม่สำเร็จ</div>`;
    });
  };

  if(file){

    const reader = new FileReader();

    reader.onload = function(){
      sendPayload({
        fileName: file.name,
        mimeType: file.type,
        fileData: reader.result
      });
    };

    reader.onerror = function(){
      statusBox.innerHTML =
        `<div class="status-box">❌ อ่านไฟล์ไม่สำเร็จ กรุณาเลือกไฟล์ใหม่</div>`;
    };

    reader.readAsDataURL(file);
  }

  else{
    sendPayload({});
  }
}
