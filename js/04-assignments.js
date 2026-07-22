function populateAssignmentLevelFilter(topics){

  const select =
    document.getElementById("assignmentLevelFilter");

  if(!select){
    return;
  }

  const oldValue =
    String(select.value || "").trim();

  const levels = [
    ...new Set(
      (Array.isArray(topics) ? topics : [])
        .map(item => String(item.level || "").trim())
        .filter(Boolean)
    )
  ].sort((a, b) =>
    String(a).localeCompare(String(b), "th", { numeric: true })
  );

  let html =
    ``;

  levels.forEach(level => {
    html += `
      <option value="${escapeAttribute(level)}">
        ${escapeHtml(level)}
      </option>
    `;
  });

  select.innerHTML = html || `<option value="">ยังไม่มีระดับชั้น</option>`;

  if(oldValue && levels.includes(oldValue)){
    select.value = oldValue;
  } else if(levels.length > 0) {
    select.value = levels[0];
  }

  populateNewAssignmentLevelSelect(levels, select.value);
}

function populateNewAssignmentLevelSelect(levels, selectedLevel){

  const select = document.getElementById("newAssignmentLevel");
  if(!select){ return; }

  const oldValue = String(select.value || "").trim();

  select.innerHTML = (Array.isArray(levels) ? levels : []).map(level => `
    <option value="${escapeAttribute(level)}">
      ${escapeHtml(level)}
    </option>
  `).join("") || `<option value="">ยังไม่มีระดับชั้น</option>`;

  if(oldValue && levels.includes(oldValue)){
    select.value = oldValue;
  } else if(selectedLevel) {
    select.value = selectedLevel;
  } else if(levels.length > 0) {
    select.value = levels[0];
  }

  renderNewAssignmentClassDeadlineOptions();
}

function handleAssignmentLevelFilterChange(){
  const filter = document.getElementById("assignmentLevelFilter");
  const addLevel = document.getElementById("newAssignmentLevel");
  if(filter && addLevel && filter.value){
    addLevel.value = filter.value;
    renderNewAssignmentClassDeadlineOptions();
  }
  renderAssignmentSettingsList();
}


function getClassesForAssignmentLevel(level){

  const found =
    (Array.isArray(scoreOptionsData) ? scoreOptionsData : [])
      .find(item =>
        normalizeOptionKey(item.level) === normalizeOptionKey(level)
      );

  return found && Array.isArray(found.classes)
    ? found.classes
    : [];
}


function renderAssignmentClassOptionsForCard(topic, index){

  const classes =
    getClassesForAssignmentLevel(topic.level);

  const assigned =
    parseClassList(topic.assignedClasses || "");

  if(classes.length === 0){
    return `
      <div class="empty-text">
        ยังไม่พบข้อมูลห้องของระดับชั้นนี้
      </div>
    `;
  }

  return `
    <div
      id="assignmentClasses_${index}"
      class="assignment-class-checkbox-list"
    >
      ${classes.map(className => `
        <label>
          <input
            type="checkbox"
            value="${escapeAttribute(className)}"
            data-assignment-class-index="${escapeAttribute(index)}"
            ${assigned.includes(className) ? "checked" : ""}
          >
          ${escapeHtml(className)}
        </label>
      `).join("")}
    </div>
    <div class="empty-text">
      ไม่ติ๊กห้อง = สั่งงานทุกห้องในระดับชั้นนี้
    </div>
  `;
}


function renderAssignmentDeadlineInputsForCard(topic, index){

  const classes = getClassesForAssignmentLevel(topic.level);
  const deadlines = topic.deadlines || {};

  if(classes.length === 0){
    return `<div class="empty-text">ยังไม่พบข้อมูลห้องของระดับชั้นนี้</div>`;
  }

  return `
    <div class="assignment-deadline-grid">
      ${classes.map(className => `
        <label>
          ${escapeHtml(className)}
          <input
            type="datetime-local"
            data-assignment-deadline-index="${escapeAttribute(index)}"
            data-class-name="${escapeAttribute(className)}"
            value="${escapeAttribute(formatDateTimeLocalInput(getDeadlineValue(deadlines, className)))}"
          >
        </label>
      `).join("")}
    </div>
  `;
}

function renderNewAssignmentClassDeadlineOptions(){

  const levelSelect = document.getElementById("newAssignmentLevel");
  const level = levelSelect ? String(levelSelect.value || "").trim() : "";
  const classes = getClassesForAssignmentLevel(level);

  const classBox = document.getElementById("newAssignmentClassesSection");
  const deadlineBox = document.getElementById("newAssignmentDeadlinesSection");

  if(classBox){
    classBox.innerHTML = classes.length > 0
      ? `
        <h4>สั่งงานเฉพาะห้อง</h4>
        <div class="assignment-class-checkbox-list">
          ${classes.map(className => `
            <label>
              <input type="checkbox" value="${escapeAttribute(className)}" data-new-assignment-class>
              ${escapeHtml(className)}
            </label>
          `).join("")}
        </div>
        <div class="empty-text">ไม่ติ๊กห้อง = สั่งงานทุกห้องในระดับชั้นนี้</div>
      `
      : `<div class="empty-text">เลือกระดับชั้นก่อน</div>`;
  }

  if(deadlineBox){
    deadlineBox.innerHTML = classes.length > 0
      ? `
        <h4>Deadline รายห้อง</h4>
        <div class="assignment-deadline-grid">
          ${classes.map(className => `
            <label>
              ${escapeHtml(className)}
              <input type="datetime-local" data-new-assignment-deadline data-class-name="${escapeAttribute(className)}">
            </label>
          `).join("")}
        </div>
      `
      : `<div class="empty-text">เลือกระดับชั้นก่อน</div>`;
  }
}

function getAssignmentDeadlinesFromCard(index){

  const deadlines = {};
  document.querySelectorAll(`[data-assignment-deadline-index="${String(index)}"]`).forEach(input => {
    const className = String(input.getAttribute("data-class-name") || "").trim();
    const dueDate = String(input.value || "").trim();
    if(className && dueDate){
      deadlines[className] = dueDate;
    }
  });
  return deadlines;
}

function getNewAssignmentClasses(){
  return Array.from(document.querySelectorAll("[data-new-assignment-class]:checked"))
    .map(input => String(input.value || "").trim())
    .filter(Boolean);
}

function getNewAssignmentDeadlines(){
  const deadlines = {};
  document.querySelectorAll("[data-new-assignment-deadline]").forEach(input => {
    const className = String(input.getAttribute("data-class-name") || "").trim();
    const dueDate = String(input.value || "").trim();
    if(className && dueDate){
      deadlines[className] = dueDate;
    }
  });
  return deadlines;
}

function createAssignmentFromForm(){

  const payload = {
    level: document.getElementById("newAssignmentLevel")?.value || "",
    topic: document.getElementById("newAssignmentTopic")?.value || "",
    workType: document.getElementById("newAssignmentWorkType")?.value || "งานเดี่ยว",
    fullScore: document.getElementById("newAssignmentFullScore")?.value || "",
    url: document.getElementById("newAssignmentUrl")?.value || "",
    folderId: document.getElementById("newAssignmentFolderId")?.value || "",
    worksheetUrl: document.getElementById("newAssignmentWorksheetUrl")?.value || "",
    worksheetVisible: true,
    assignedClasses: getNewAssignmentClasses(),
    deadlines: getNewAssignmentDeadlines()
  };

  if(!String(payload.level).trim() || !String(payload.topic).trim() || !String(payload.url).trim()){
    alert("กรุณากรอกระดับชั้น ชื่องาน และลิงก์ชีทงาน");
    return;
  }

  fetch(API_URL + "?action=createAssignment", {
    method: "POST",
    body: JSON.stringify(payload)
  })
  .then(res => res.json())
  .then(response => {
    if(response.status !== "success"){
      alert("❌ " + (response.message || "เพิ่มงานไม่สำเร็จ"));
      return;
    }

    alert("✅ เพิ่มงานใหม่แล้ว");
    ["newAssignmentTopic", "newAssignmentFullScore", "newAssignmentUrl", "newAssignmentFolderId", "newAssignmentWorksheetUrl"].forEach(id => {
      const el = document.getElementById(id);
      if(el){ el.value = ""; }
    });
    document.querySelectorAll("[data-new-assignment-class], [data-new-assignment-deadline]").forEach(input => {
      if(input.type === "checkbox"){ input.checked = false; }
      else { input.value = ""; }
    });
    loadTopics();
  })
  .catch(error => {
    console.error(error);
    alert("❌ เชื่อมต่อ API ไม่สำเร็จ");
  });
}

function renderAssignmentSettingsList(){

  const box =
    document.getElementById("assignmentSettingsList");

  const status =
    document.getElementById("assignmentSettingsStatus");

  if(!box){
    return;
  }

  const topics =
    Array.isArray(teacherTopicsData)
      ? teacherTopicsData
      : [];

  const levelFilter =
    document.getElementById("assignmentLevelFilter");

  const selectedLevel =
    levelFilter ? String(levelFilter.value || "").trim() : "";

  const filteredTopics =
    topics
      .map((topic, index) => ({ topic, index }))
      .filter(item =>
        selectedLevel &&
        String(item.topic.level || "").trim() === selectedLevel
      );

  if(status){
    status.innerHTML = "";
  }

  if(topics.length === 0){
    box.innerHTML =
      `<div class="status-box">ยังไม่มีหัวข้องาน</div>`;
    return;
  }

  if(!selectedLevel){
    box.innerHTML =
      `<div class="status-box">กรุณาเลือกระดับชั้นเพื่อแสดงใบงาน</div>`;
    return;
  }

  if(filteredTopics.length === 0){
    box.innerHTML =
      `<div class="status-box">ไม่พบงานของระดับชั้นที่เลือก</div>`;
    return;
  }

  box.innerHTML = `
    <div class="assignment-settings-grid">
      ${filteredTopics.map(({ topic, index }) => {
        const worksheetUrl =
          String(topic.worksheetUrl || "").trim();

        const worksheetId =
          "assignmentWorksheet_" + index;

        return `
          <div class="card assignment-setting-card">
            <h4>
              ${escapeHtml(topic.level || "-")}
              -
              ${escapeHtml(topic.topic || "-")}
              ${topic.workType ? `<span class="student-order-badge">${escapeHtml(topic.workType)}</span>` : ``}
            </h4>

            <div class="assignment-card-controls">
              <button type="button" onclick="toggleAssignmentSection('assignmentFullScoreSection_${index}', this)">
                แสดง/ซ่อน คะแนนเต็มของงาน
              </button>
              <button type="button" onclick="toggleAssignmentSection('assignmentClassesSection_${index}', this)">
                แสดง/ซ่อน การสั่งงานเฉพาะห้อง
              </button>
              <button type="button" onclick="toggleAssignmentSection('assignmentDeadlinesSection_${index}', this)">
                แสดง/ซ่อน Deadline รายห้อง
              </button>
            </div>

            <div id="assignmentFullScoreSection_${index}" class="assignment-hidden-section">
              <label>คะแนนเต็มของงาน</label>
              <input
                id="assignmentFullScore_${index}"
                type="number"
                value="${escapeAttribute(topic.fullScore || "")}"
                placeholder="เช่น 10"
              >
            </div>

            <div id="assignmentClassesSection_${index}" class="assignment-hidden-section">
              <label>สั่งงานเฉพาะห้อง</label>
              ${renderAssignmentClassOptionsForCard(topic, index)}
            </div>

            <div id="assignmentDeadlinesSection_${index}" class="assignment-hidden-section">
              <label>Deadline การส่งงานรายห้อง</label>
              ${renderAssignmentDeadlineInputsForCard(topic, index)}
            </div>

            <div class="student-work-actions">
              <button
                type="button"
                onclick="saveAssignmentSettingsFromCard(${index})"
              >
                บันทึกการตั้งค่า
              </button>
            </div>

            ${
              worksheetUrl
              ? `
                <div
                  id="${escapeAttribute(worksheetId)}"
                  class="work-box assignment-worksheet-box"
                >
                  <h4>ใบคำสั่งงาน</h4>
                  ${renderWorksheetContent(worksheetUrl)}
                </div>
              `
              : `<div class="empty-text">ยังไม่ได้ใส่ลิงก์ใบคำสั่งงาน</div>`
            }
          </div>
        `;
      }).join("")}
    </div>
  `;
}


function getSelectedAssignmentClassesFromCard(index){

  return Array.from(
    document.querySelectorAll(
      `[data-assignment-class-index="${String(index)}"]:checked`
    )
  )
    .map(input => String(input.value || "").trim())
    .filter(Boolean);
}


function saveAssignmentSettingsFromCard(index){

  const topic =
    (Array.isArray(teacherTopicsData) ? teacherTopicsData : [])[index];

  if(!topic || !topic.url){
    alert("ไม่พบข้อมูลงานที่ต้องการบันทึก");
    return;
  }

  const fullScoreInput =
    document.getElementById("assignmentFullScore_" + index);

  const fullScore =
    fullScoreInput ? String(fullScoreInput.value || "").trim() : "";

  const assignedClasses =
    getSelectedAssignmentClassesFromCard(index);

  const deadlines =
    getAssignmentDeadlinesFromCard(index);

  fetch(API_URL + "?action=updateAssignmentSettings", {
    method: "POST",
    body: JSON.stringify({
      url: topic.url,
      fullScore: fullScore,
      assignedClasses: assignedClasses,
      deadlines: deadlines
    })
  })
  .then(res => res.json())
  .then(response => {

    if(response.status !== "success"){
      alert("❌ " + (response.message || "บันทึกการตั้งค่างานไม่สำเร็จ"));
      return;
    }

    topic.fullScore = fullScore;
    topic.assignedClasses = assignedClasses.join(",");
    topic.deadlines = deadlines;

    alert("✅ บันทึกการตั้งค่างานแล้ว");
    renderAssignmentSettingsList();
    renderWorkTopicOptions();
  })
  .catch(error => {
    console.error(error);
    alert("❌ เชื่อมต่อ API ไม่สำเร็จ");
  });
}


function toggleAssignmentWorksheet(id, button){

  const box =
    document.getElementById(id);

  if(!box){
    return;
  }

  const isHidden =
    window.getComputedStyle(box).display === "none";

  box.style.display = isHidden ? "block" : "none";

  if(button){
    button.textContent = isHidden ? "ซ่อนใบคำสั่งงาน" : "เปิดใบคำสั่งงาน";
  }
}


// ======================================
// โหลดหัวข้องาน
// ======================================
