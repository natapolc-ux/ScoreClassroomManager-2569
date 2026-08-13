// ============================================================
// teacher.js
// รวมโค้ดฝั่งครู + login/layout เพื่อให้แก้ง่ายขึ้น
// Source files: 02-auth.js, 03-layout.js, 04-assignments.js, 05-teacher-work.js, 07-score-table.js
// ============================================================

// ===== BEGIN 02-auth.js =====
const LOGIN_SESSION_STORAGE_KEY = "matrixLoginSessionV1";
const LOGIN_SESSION_MAX_AGE = 1000 * 60 * 60 * 12;

function saveLoginSession(data){
  try{
    const session = {
      savedAt: Date.now(),
      status: "success",
      role: data.role || "",
      name: data.name || "",
      id: data.id || "",
      level: data.level || "",
      className: data.className || "",
      no: data.no || "",
      photoUrl: data.photoUrl || "",
      studentOrder: data.studentOrder || ""
    };
    localStorage.setItem(LOGIN_SESSION_STORAGE_KEY, JSON.stringify(session));
  }catch(error){
    console.warn("ไม่สามารถบันทึกสถานะเข้าสู่ระบบได้", error);
  }
}

function clearLoginSession(){
  try{
    localStorage.removeItem(LOGIN_SESSION_STORAGE_KEY);
  }catch(error){
    console.warn(error);
  }
}

function getSavedLoginSession(){
  try{
    const raw = localStorage.getItem(LOGIN_SESSION_STORAGE_KEY);
    if(!raw){
      return null;
    }

    const session = JSON.parse(raw);
    if(!session || session.status !== "success" || !session.id || !session.role){
      clearLoginSession();
      return null;
    }

    const savedAt = Number(session.savedAt || 0);
    if(!savedAt || Date.now() - savedAt > LOGIN_SESSION_MAX_AGE){
      clearLoginSession();
      return null;
    }

    return session;
  }catch(error){
    clearLoginSession();
    return null;
  }
}

function applyLoggedInUser(data){
  const loginBox = document.getElementById("loginBox");
  const teacherPanel = document.getElementById("teacherPanel");
  const studentPanel = document.getElementById("studentPanel");
  const msg = document.getElementById("msg");

  if(loginBox){
    loginBox.style.display = "none";
  }
  if(teacherPanel){
    teacherPanel.style.display = "none";
  }
  if(studentPanel){
    studentPanel.style.display = "none";
  }
  if(msg){
    msg.innerHTML = "";
  }

  if(String(data.role || "").trim() === "teacher"){
    if(teacherPanel){
      teacherPanel.style.display = "block";
    }

    loadTopics();
    loadScoreOptions();
    loadHideViewedWorksSetting();
    loadScoreTableSettings();
    return;
  }

  currentStudentId = data.id || "";
  currentStudentName = data.name || "";
  currentStudentLevel = data.level || "";
  currentStudentClass = data.className || "";
  currentStudentNo = data.no || "";
  currentStudentPhotoUrl = data.photoUrl || "";
  currentStudentOrder = data.studentOrder || calculateStudentOrder(currentStudentClass, currentStudentNo);

  if(studentPanel){
    studentPanel.style.display = "block";
  }

  const studentData = document.getElementById("studentData");
  if(studentData){
    studentData.innerHTML =
    `<div class="status-box student-profile-card">
      ${renderStudentPhoto(currentStudentPhotoUrl, data.name, false)}
      <div>
        <div>ยินดีต้อนรับ ${escapeHtml(data.name || "")}</div>
      </div>
    </div>`;
  }

  if(typeof loadMyWork === "function"){
    loadMyWork();
  }
  if(typeof loadSubmitTopics === "function"){
    loadSubmitTopics();
  }
}

function restoreLoginSession(){
  const session = getSavedLoginSession();
  if(!session){
    return;
  }

  applyLoggedInUser(session);
}

function scheduleRestoreLoginSession(){
  const runRestore = () => {
    if(typeof restoreLoginSession === "function"){
      restoreLoginSession();
    }
  };

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", runRestore, { once: true });
  } else {
    setTimeout(runRestore, 0);
  }
}

scheduleRestoreLoginSession();

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
      saveLoginSession(data);
      applyLoggedInUser(data);
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



function logout(){
  clearLoginSession();
  try{
    if(typeof stopLoadedWork === "function"){
      stopLoadedWork();
    }
  }catch(error){
    console.warn(error);
  }

  try{
    if(typeof stopLoadedScoreTable === "function"){
      stopLoadedScoreTable();
    }
  }catch(error){
    console.warn(error);
  }

  currentWorkData = [];
  currentSheetUrl = "";
  currentMyWorkData = [];
  selectedTeacherWorkKeys = new Set();
  selectedAssignmentIndexes = new Set();
  changedScoreMap = {};
  lastScoreTableData = null;
  currentSubmitWorkItem = null;
  selectedMyWorkIndex = null;
  currentStudentWorkFilter = "all";

  ["teacherPanel", "studentPanel"].forEach(id => {
    const el = document.getElementById(id);
    if(el){
      el.style.display = "none";
    }
  });

  const loginBox = document.getElementById("loginBox");
  if(loginBox){
    loginBox.style.display = "block";
  }

  const idInput = document.getElementById("id");
  const passInput = document.getElementById("pass");
  const msg = document.getElementById("msg");

  if(idInput){ idInput.value = ""; }
  if(passInput){ passInput.value = ""; }
  if(msg){ msg.innerHTML = "ออกจากระบบแล้ว"; }

  window.scrollTo({ top:0, left:0, behavior:"smooth" });
}


// ===== END 02-auth.js =====

// ===== BEGIN 03-layout.js =====
function toggleTeacherSidebar(){
  const shell = document.querySelector(".teacher-shell");
  if(shell){
    shell.classList.toggle("sidebar-collapsed");
  }
}

function toggleStudentSidebar(){
  const shell = document.getElementById("studentWorkLayout");
  if(shell){
    shell.classList.toggle("sidebar-collapsed");
  }
}

function toggleAssignmentSection(id, button){
  const section = document.getElementById(id);
  if(!section){ return; }
  const hidden = window.getComputedStyle(section).display === "none";
  section.style.display = hidden ? "block" : "none";
  if(button){
    const text = String(button.textContent || "");
    button.textContent = text;
  }
}

function toggleAddAssignmentBox(button){
  const content = document.getElementById("addAssignmentContent");
  const box = document.getElementById("addAssignmentBox");
  if(!content){ return; }
  const hidden = window.getComputedStyle(content).display === "none";
  content.style.display = hidden ? "block" : "none";
  if(box){
    box.classList.toggle("assignment-add-collapsed", !hidden);
  }
  if(button){
    button.textContent = hidden ? "ย่อฟอร์มเพิ่มงาน" : "เปิดฟอร์มเพิ่มงาน";
  }
}

function formatDateTimeLocalInput(value){
  if(!value){ return ""; }
  const date = new Date(value);
  if(isNaN(date.getTime())){
    return String(value).slice(0,16);
  }
  const pad = n => String(n).padStart(2,"0");
  return date.getFullYear() + "-" + pad(date.getMonth()+1) + "-" + pad(date.getDate()) + "T" + pad(date.getHours()) + ":" + pad(date.getMinutes());
}

function getDeadlineValue(deadlines, className){
  const target = normalizeOptionKey(className);
  if(!deadlines){ return ""; }
  if(Array.isArray(deadlines)){
    const found = deadlines.find(item => normalizeOptionKey(item.className || item.class) === target);
    return found ? (found.dueDate || found.deadline || "") : "";
  }
  const key = Object.keys(deadlines).find(name => normalizeOptionKey(name) === target);
  return key ? deadlines[key] : "";
}

const THAI_FULL_MONTHS = [
  "มกราคม",
  "กุมภาพันธ์",
  "มีนาคม",
  "เมษายน",
  "พฤษภาคม",
  "มิถุนายน",
  "กรกฎาคม",
  "สิงหาคม",
  "กันยายน",
  "ตุลาคม",
  "พฤศจิกายน",
  "ธันวาคม"
];

function deadlineToThaiParts(value){
  if(!value){
    return { day:"", month:"", yearBE:"", hour:"", minute:"" };
  }

  const date = new Date(value);
  if(!isNaN(date.getTime())){
    const pad = n => String(n).padStart(2, "0");
    return {
      day: String(date.getDate()),
      month: String(date.getMonth() + 1),
      yearBE: String(date.getFullYear() + 543),
      hour: pad(date.getHours()),
      minute: pad(date.getMinutes())
    };
  }

  const match = String(value).match(/(\d{4})-(\d{1,2})-(\d{1,2})[T\s]?(\d{1,2})?:?(\d{1,2})?/);
  if(match){
    const pad = n => String(n || "0").padStart(2, "0");
    const yearCE = Number(match[1]);
    return {
      day: String(Number(match[3])),
      month: String(Number(match[2])),
      yearBE: String(yearCE + 543),
      hour: pad(match[4] || "0"),
      minute: pad(match[5] || "0")
    };
  }

  return { day:"", month:"", yearBE:"", hour:"", minute:"" };
}

function deadlineSelectOptions(start, end, selected, blankText){
  let html = `<option value="">${escapeHtml(blankText || "-")}</option>`;
  for(let i = start; i <= end; i++){
    const value = String(i);
    const label = start === 0 ? String(i).padStart(2, "0") : String(i);
    html += `<option value="${escapeAttribute(value)}" ${String(selected) === value || String(selected) === label ? "selected" : ""}>${escapeHtml(label)}</option>`;
  }
  return html;
}

function renderThaiDeadlineInput(hiddenId, dataAttributes, value){
  const parts = deadlineToThaiParts(value);
  const dataAttrs = Object.keys(dataAttributes || {})
    .map(key => `${key}="${escapeAttribute(dataAttributes[key])}"`)
    .join(" ");

  return `
    <div class="thai-deadline-picker">
      <input
        type="hidden"
        id="${escapeAttribute(hiddenId)}"
        value="${escapeAttribute(formatDateTimeLocalInput(value))}"
        ${dataAttrs}
      >
      <select data-deadline-target="${escapeAttribute(hiddenId)}" data-thai-deadline-part="day" onchange="updateThaiDeadlineHidden('${hiddenId}')">
        ${deadlineSelectOptions(1, 31, parts.day, "วัน")}
      </select>
      <select data-deadline-target="${escapeAttribute(hiddenId)}" data-thai-deadline-part="month" onchange="updateThaiDeadlineHidden('${hiddenId}')">
        <option value="">เดือน</option>
        ${THAI_FULL_MONTHS.map((monthName, idx) => `
          <option value="${idx + 1}" ${String(parts.month) === String(idx + 1) ? "selected" : ""}>${escapeHtml(monthName)}</option>
        `).join("")}
      </select>
      <input
        type="number"
        min="2500"
        max="2700"
        placeholder="ปี พ.ศ."
        value="${escapeAttribute(parts.yearBE)}"
        data-deadline-target="${escapeAttribute(hiddenId)}"
        data-thai-deadline-part="yearBE"
        oninput="updateThaiDeadlineHidden('${hiddenId}')"
      >
      <select data-deadline-target="${escapeAttribute(hiddenId)}" data-thai-deadline-part="hour" onchange="updateThaiDeadlineHidden('${hiddenId}')">
        ${deadlineSelectOptions(0, 23, parts.hour, "ชั่วโมง")}
      </select>
      <select data-deadline-target="${escapeAttribute(hiddenId)}" data-thai-deadline-part="minute" onchange="updateThaiDeadlineHidden('${hiddenId}')">
        ${deadlineSelectOptions(0, 59, parts.minute, "นาที")}
      </select>
    </div>
  `;
}

function updateThaiDeadlineHidden(hiddenId){
  const hidden = document.getElementById(hiddenId);
  if(!hidden){ return; }

  const controls = document.querySelectorAll(`[data-deadline-target="${hiddenId}"]`);
  const parts = {};
  controls.forEach(control => {
    parts[control.getAttribute("data-thai-deadline-part")] = String(control.value || "").trim();
  });

  const day = Number(parts.day || 0);
  const month = Number(parts.month || 0);
  const yearBE = Number(parts.yearBE || 0);
  const hour = Number(parts.hour || 0);
  const minute = Number(parts.minute || 0);

  if(!day && !month && !yearBE && parts.hour === "" && parts.minute === ""){
    hidden.value = "";
    return;
  }

  if(!day || !month || !yearBE || parts.hour === "" || parts.minute === ""){
    hidden.value = "";
    return;
  }

  const yearCE = yearBE >= 2400 ? yearBE - 543 : yearBE;
  const pad = n => String(n).padStart(2, "0");
  hidden.value = `${yearCE}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}`;
}

function updateNewAssignmentMaxGroupMembersVisibility(){
  const type = String(document.getElementById("newAssignmentWorkType")?.value || "งานเดี่ยว").trim();
  const field = document.getElementById("newAssignmentMaxGroupMembersField");
  const input = document.getElementById("newAssignmentMaxGroupMembers");

  if(!field){ return; }

  const shouldShow = type !== "งานเดี่ยว";
  field.style.display = shouldShow ? "block" : "none";

  if(!shouldShow && input){
    input.value = "";
  }
}


function switchTeacherPage(page){

  const teacherPageTitles = {
    assignment: "ใบงาน",
    check: "หน้าตรวจงาน",
    score: "ตารางคะแนน",
    groupIndividual: "เปิดตามรายชื่อ",
    settings: "อื่นๆ"
  };

  const teacherPageTitle = document.getElementById("teacherPageTitle");
  if(teacherPageTitle){
    teacherPageTitle.textContent = teacherPageTitles[page] || "Teacher Dashboard";
  }

  const pages = {
    assignment: "teacherPageAssignment",
    check: "teacherPageCheck",
    score: "teacherPageScore",
    groupIndividual: "teacherPageGroupIndividual",
    settings: "teacherPageSettings"
  };

  const navs = {
    assignment: "teacherNavAssignment",
    check: "teacherNavCheck",
    score: "teacherNavScore",
    groupIndividual: "teacherNavGroupIndividual",
    settings: "teacherNavSettings"
  };

  Object.keys(pages).forEach(key => {
    const section = document.getElementById(pages[key]);
    const button = document.getElementById(navs[key]);

    if(section){
      section.classList.toggle("active", key === page);
    }

    if(button){
      button.classList.toggle("active", key === page);
    }
  });

  if(page === "assignment"){
    renderAssignmentSettingsList();
  }

  if(page === "groupIndividual"){
    prepareNameSearchPage();
  }
}


function getStudentWorkFilteredData(){
  const data = Array.isArray(currentMyWorkData) ? currentMyWorkData : [];
  const filter = String(currentStudentWorkFilter || "all");

  if(filter === "missing"){
    return data.filter(item => item.status !== "submitted");
  }

  if(filter === "submitted"){
    return data.filter(item => item.status === "submitted");
  }

  if(filter === "returned"){
    return data.filter(item =>
      String(item.returnStatus || "").trim() ||
      String(item.returnNote || "").trim()
    );
  }

  if(filter === "revised"){
    return data.filter(item =>
      String(item.revisionStatus || "").trim() ||
      String(item.revisionTimestamp || "").trim() ||
      String(item.revisionNote || "").trim()
    );
  }

  return data;
}

function showStudentWorkFilter(filter){
  currentStudentWorkFilter = String(filter || "all");
  selectedMyWorkIndex = null;
  renderMyWorkCards(currentMyWorkData);
}

function setActiveStudentMenu(){
  const map = {
    all: "studentNavAll",
    missing: "studentNavMissing",
    submitted: "studentNavSubmitted",
    returned: "studentNavReturned",
    revised: "studentNavRevised"
  };

  Object.keys(map).forEach(key => {
    const button = document.getElementById(map[key]);
    if(button){
      button.classList.toggle("active", key === String(currentStudentWorkFilter || "all"));
    }
  });
}

function updateStudentMenuCounts(data){
  const allData = Array.isArray(data) ? data : [];
  const counts = {
    studentCountAll: allData.length,
    studentCountMissing: allData.filter(item => item.status !== "submitted").length,
    studentCountSubmitted: allData.filter(item => item.status === "submitted").length,
    studentCountReturned: allData.filter(item => String(item.returnStatus || "").trim() || String(item.returnNote || "").trim()).length,
    studentCountRevised: allData.filter(item => String(item.revisionStatus || "").trim() || String(item.revisionTimestamp || "").trim() || String(item.revisionNote || "").trim()).length
  };

  Object.keys(counts).forEach(id => {
    const box = document.getElementById(id);
    if(box){
      box.textContent = counts[id];
    }
  });

  setActiveStudentMenu();
}


function refreshStudentWorkFromSidebar(){
  selectedMyWorkIndex = null;
  loadMyWork();
}

// ===== END 03-layout.js =====

// ===== BEGIN 04-assignments.js =====
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
  populateAssignmentTopicFilter(select.value);
}

function populateAssignmentTopicFilter(level){

  const select = document.getElementById("assignmentTopicFilter");
  if(!select){ return; }

  const oldValue = String(select.value || "").trim();
  const selectedLevel = String(level || "").trim();

  const topics = (Array.isArray(teacherTopicsData) ? teacherTopicsData : [])
    .filter(item => selectedLevel && String(item.level || "").trim() === selectedLevel);

  let html = `<option value="">ทุกใบงานของระดับชั้นนี้</option>`;

  topics.forEach(item => {
    html += `
      <option value="${escapeAttribute(item.url || "")}">
        ${escapeHtml(item.topic || "-")}
      </option>
    `;
  });

  select.innerHTML = html;

  if(oldValue && topics.some(item => String(item.url || "").trim() === oldValue)){
    select.value = oldValue;
  } else {
    select.value = "";
  }
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
  populateAssignmentTopicFilter(filter ? filter.value : "");
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
    <div class="assignment-deadline-grid thai-deadline-grid">
      ${classes.map((className, classIndex) => {
        const hiddenId = `assignmentDeadline_${index}_${classIndex}`;
        return `
          <label>
            <span>${escapeHtml(className)}</span>
            ${renderThaiDeadlineInput(
              hiddenId,
              {
                "data-assignment-deadline-index": index,
                "data-class-name": className
              },
              getDeadlineValue(deadlines, className)
            )}
          </label>
        `;
      }).join("")}
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
        <div class="assignment-deadline-grid thai-deadline-grid">
          ${classes.map((className, classIndex) => {
            const hiddenId = `newAssignmentDeadline_${classIndex}`;
            return `
              <label>
                <span>${escapeHtml(className)}</span>
                ${renderThaiDeadlineInput(
                  hiddenId,
                  {
                    "data-new-assignment-deadline": "true",
                    "data-class-name": className
                  },
                  ""
                )}
              </label>
            `;
          }).join("")}
        </div>
      `
      : `<div class="empty-text">เลือกระดับชั้นก่อน</div>`;
  }

  updateNewAssignmentMaxGroupMembersVisibility();
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

  const selectedWorkType =
    document.getElementById("newAssignmentWorkType")?.value || "งานเดี่ยว";

  const payload = {
    level: document.getElementById("newAssignmentLevel")?.value || "",
    topic: document.getElementById("newAssignmentTopic")?.value || "",
    workType: selectedWorkType,
    fullScore: document.getElementById("newAssignmentFullScore")?.value || "",
    maxGroupMembers: selectedWorkType === "งานเดี่ยว" ? "" : (document.getElementById("newAssignmentMaxGroupMembers")?.value || ""),
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
    ["newAssignmentTopic", "newAssignmentFullScore", "newAssignmentMaxGroupMembers", "newAssignmentUrl", "newAssignmentFolderId", "newAssignmentWorksheetUrl"].forEach(id => {
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

  const topicFilter =
    document.getElementById("assignmentTopicFilter");

  const selectedTopicUrl =
    topicFilter ? String(topicFilter.value || "").trim() : "";

  const filteredTopics =
    topics
      .map((topic, index) => ({ topic, index }))
      .filter(item =>
        selectedLevel &&
        String(item.topic.level || "").trim() === selectedLevel &&
        (!selectedTopicUrl || String(item.topic.url || "").trim() === selectedTopicUrl)
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
      `<div class="status-box">ไม่พบใบงานตามตัวเลือกที่เลือก</div>`;
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

            <div class="assignment-card-controls assignment-inline-settings-actions">
              <button
                type="button"
                class="assignment-primary-action"
                onclick="saveAssignmentSettingsFromCard(${index})"
              >
                บันทึกการตั้งค่า
              </button>
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
              <div class="assignment-setting-inline-grid">
                <label>คะแนนเต็มของงาน
                  <input
                    id="assignmentFullScore_${index}"
                    type="number"
                    value="${escapeAttribute(topic.fullScore || "")}"
                    placeholder="เช่น 10"
                  >
                </label>
                ${String(topic.workType || "").trim() === "งานเดี่ยว" ? `` : `
                  <label>จำนวนสมาชิกกลุ่มสูงสุด
                    <input
                      id="assignmentMaxGroupMembers_${index}"
                      type="number"
                      min="1"
                      value="${escapeAttribute(topic.maxGroupMembers || "")}"
                      placeholder="${escapeAttribute("ไม่ใส่ = ใช้ค่าเริ่มต้น " + DEFAULT_MAX_GROUP_MEMBERS + " คน")}"
                    >
                    <span class="empty-text">นับรวมผู้ส่งงานด้วย</span>
                  </label>
                `}
              </div>
            </div>

            <div id="assignmentClassesSection_${index}" class="assignment-hidden-section">
              <label>สั่งงานเฉพาะห้อง</label>
              ${renderAssignmentClassOptionsForCard(topic, index)}
            </div>

            <div id="assignmentDeadlinesSection_${index}" class="assignment-hidden-section">
              <label>Deadline การส่งงานรายห้อง</label>
              ${renderAssignmentDeadlineInputsForCard(topic, index)}
            </div>

            ${
              worksheetUrl
              ? `
                <div
                  id="${escapeAttribute(worksheetId)}"
                  class="work-box assignment-worksheet-box"
                >
                  <h4>ใบงาน</h4>
                  ${renderWorksheetContent(worksheetUrl)}
                </div>
              `
              : `<div class="empty-text">ยังไม่ได้ใส่ลิงก์ใบงาน</div>`
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

  const maxGroupMembersInput =
    document.getElementById("assignmentMaxGroupMembers_" + index);

  const maxGroupMembers =
    maxGroupMembersInput ? String(maxGroupMembersInput.value || "").trim() : "";

  const assignedClasses =
    getSelectedAssignmentClassesFromCard(index);

  const deadlines =
    getAssignmentDeadlinesFromCard(index);

  fetch(API_URL + "?action=updateAssignmentSettings", {
    method: "POST",
    body: JSON.stringify({
      url: topic.url,
      fullScore: fullScore,
      maxGroupMembers: maxGroupMembers,
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
    topic.maxGroupMembers = maxGroupMembers;
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
    button.textContent = isHidden ? "ซ่อนใบงาน" : "เปิดใบงาน";
  }
}


// ======================================
// โหลดหัวข้องาน
// ======================================

// ===== END 04-assignments.js =====

// ===== BEGIN 05-teacher-work.js =====
function loadTopics(){

  const topicSelect = document.getElementById("topic");
  const levelSelect = document.getElementById("workLevelFilter");

  if(levelSelect){
    levelSelect.innerHTML =
      `<option value="">กำลังโหลดระดับชั้น...</option>`;
  }

  topicSelect.innerHTML =
    `<option value="">กำลังโหลดหัวข้องาน...</option>`;

  fetch(API_URL + "?action=topics")

  .then(res => res.json())

  .then(response => {

    let topics = [];

    // รองรับ API เวอร์ชันใหม่
    if(
      response &&
      response.status === "success" &&
      Array.isArray(response.data)
    ){
      topics = response.data;
    }

    // รองรับ API เก่าที่ยังส่ง array ตรง ๆ
    else if(Array.isArray(response)){
      topics = response;
    }

    else{
      if(levelSelect){
        levelSelect.innerHTML =
          `<option value="">ทุกระดับชั้น</option>`;
      }

      topicSelect.innerHTML =
        `<option value="">โหลดหัวข้องานไม่สำเร็จ</option>`;

      console.log("Topics API Response:", response);
      return;
    }

    teacherTopicsData = topics;

    if(topics.length === 0){
      if(levelSelect){
        levelSelect.innerHTML =
          `<option value="">ทุกระดับชั้น</option>`;
      }

      topicSelect.innerHTML =
        `<option value="">ยังไม่มีหัวข้องาน</option>`;
      return;
    }

    populateWorkLevelFilter(topics);
    populateAssignmentLevelFilter(topics);
    renderWorkTopicOptions();
    renderAssignmentSettingsList();
    updateWorkClassFilterByTopic();
  })

  .catch(error => {
    console.error(error);

    if(levelSelect){
      levelSelect.innerHTML =
        `<option value="">ทุกระดับชั้น</option>`;
    }

    topicSelect.innerHTML =
      `<option value="">โหลดหัวข้องานไม่สำเร็จ</option>`;
  });
}


function populateWorkLevelFilter(topics){

  const levelSelect =
    document.getElementById("workLevelFilter");

  if(!levelSelect){
    return;
  }

  const oldValue =
    String(levelSelect.value || "").trim();

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
    `<option value="">ทุกระดับชั้น</option>`;

  levels.forEach(level => {
    html += `
      <option value="${escapeAttribute(level)}">
        ${escapeHtml(level)}
      </option>
    `;
  });

  levelSelect.innerHTML = html;

  if(oldValue && levels.includes(oldValue)){
    levelSelect.value = oldValue;
  }
}


function getSelectedWorkLevel(){

  const levelSelect =
    document.getElementById("workLevelFilter");

  return levelSelect
    ? String(levelSelect.value || "").trim()
    : "";
}


function getTopicMetaByUrl(url){

  const target =
    String(url || "").trim();

  return (Array.isArray(teacherTopicsData) ? teacherTopicsData : [])
    .find(item => String(item.url || "").trim() === target) || null;
}

function parseClassList(value){

  if(Array.isArray(value)){
    return value.map(item => String(item || "").trim()).filter(Boolean);
  }

  return String(value || "")
    .split(/[,\n|\/]+/)
    .map(item => item.trim())
    .filter(Boolean);
}

function getSelectedTopicOptions(){

  const topicSelect =
    document.getElementById("topic");

  if(!topicSelect){
    return [];
  }

  return Array.from(topicSelect.selectedOptions || [])
    .filter(option => String(option.value || "").trim() !== "");
}

function getSelectedAssignmentTopics(){

  return getSelectedTopicOptions()
    .filter(option => option.value !== "__ALL_WORK__")
    .map(option => getTopicMetaByUrl(option.value) || {
      url: option.value,
      level: option.getAttribute("data-level") || getSelectedWorkLevel(),
      topic: option.textContent || "",
      workType: option.getAttribute("data-work-type") || "งานเดี่ยว"
    })
    .filter(topic => topic && topic.url);
}

function applyAssignmentMetaToRow(row, topic){

  topic = topic || getTopicMetaByUrl(row && row.sheetUrl);

  return {
    ...row,
    level: topic && topic.level ? topic.level : (row.level || ""),
    topic: topic && topic.topic ? topic.topic : (row.topic || ""),
    sheetUrl: topic && topic.url ? topic.url : (row.sheetUrl || ""),
    workType: topic && topic.workType ? topic.workType : (row.workType || "งานเดี่ยว"),
    worksheetUrl: topic && topic.worksheetUrl !== undefined ? topic.worksheetUrl : (row.worksheetUrl || ""),
    worksheetVisible: topic && topic.worksheetVisible !== undefined ? topic.worksheetVisible : row.worksheetVisible,
    fullScore: topic && topic.fullScore !== undefined ? topic.fullScore : (row.fullScore || ""),
    assignedClasses: topic && topic.assignedClasses !== undefined ? topic.assignedClasses : (row.assignedClasses || ""),
    maxGroupMembers: topic && topic.maxGroupMembers !== undefined ? topic.maxGroupMembers : (row.maxGroupMembers || ""),
    deadlines: topic && topic.deadlines !== undefined ? topic.deadlines : (row.deadlines || {})
  };
}

function getSelectedTopicUrl(){

  const options =
    getSelectedTopicOptions();

  const normalOptions =
    options.filter(option => option.value !== "__ALL_WORK__");

  return normalOptions.length === 1
    ? normalOptions[0].value
    : "";
}

function renderAssignedClassOptions(){

  const select =
    document.getElementById("assignedClassSelect");

  if(!select){
    return;
  }

  const selectedUrl =
    getSelectedTopicUrl();

  const selectedTopic =
    selectedUrl ? getTopicMetaByUrl(selectedUrl) : null;

  const selectedLevel =
    selectedTopic && selectedTopic.level
      ? selectedTopic.level
      : getSelectedWorkLevel();

  let classes = [];

  if(selectedLevel && Array.isArray(scoreOptionsData)){
    const levelData = scoreOptionsData.find(item =>
      normalizeOptionKey(item.level) === normalizeOptionKey(selectedLevel)
    );

    if(levelData && Array.isArray(levelData.classes)){
      classes = levelData.classes;
    }
  }

  const assigned =
    parseClassList(selectedTopic ? selectedTopic.assignedClasses : "");

  if(!selectedTopic){
    select.innerHTML = `<option value="">เลือกงานเดี่ยว 1 งานก่อน</option>`;
    return;
  }

  select.innerHTML = classes.map(className => `
    <option
      value="${escapeAttribute(className)}"
      ${assigned.includes(className) ? "selected" : ""}
    >
      ${escapeHtml(className)}
    </option>
  `).join("");
}

function getSelectedAssignedClasses(){

  const select =
    document.getElementById("assignedClassSelect");

  if(!select){
    return [];
  }

  return Array.from(select.selectedOptions || [])
    .map(option => String(option.value || "").trim())
    .filter(Boolean);
}

function saveAssignmentClassSettings(){

  const selectedUrl =
    getSelectedTopicUrl();

  if(!selectedUrl){
    alert("กรุณาเลือกงานเพียง 1 งานก่อนบันทึกห้องที่สั่งงาน");
    return;
  }

  const topic =
    getTopicMetaByUrl(selectedUrl);

  const classes =
    getSelectedAssignedClasses();

  fetch(API_URL + "?action=updateAssignmentSettings", {
    method: "POST",
    body: JSON.stringify({
      url: selectedUrl,
      fullScore: topic ? (topic.fullScore || "") : "",
      assignedClasses: classes
    })
  })
  .then(res => res.json())
  .then(response => {
    if(response.status !== "success"){
      alert("❌ " + (response.message || "บันทึกห้องที่สั่งงานไม่สำเร็จ"));
      return;
    }

    if(topic){
      topic.assignedClasses = classes.join(",");
    }

    alert("✅ บันทึกห้องที่สั่งงานแล้ว");
  })
  .catch(error => {
    console.error(error);
    alert("❌ เชื่อมต่อ API ไม่สำเร็จ");
  });
}


function renderWorkTopicOptions(keepTopicValue){

  const topicSelect =
    document.getElementById("topic");

  if(!topicSelect){
    return;
  }

  const selectedLevel =
    getSelectedWorkLevel();

  const currentTopic =
    keepTopicValue !== undefined
      ? String(keepTopicValue || "")
      : String(topicSelect.value || "");

  const topics =
    (Array.isArray(teacherTopicsData) ? teacherTopicsData : [])
      .filter(item =>
        !selectedLevel ||
        String(item.level || "").trim() === selectedLevel
      );

  const allWorkLabel =
    selectedLevel
      ? "📚 โหลดทุกงานของ " + selectedLevel
      : "📚 โหลดทุกงานทุกชั้น";

  let html =
    `<option value="">-- เลือกหัวข้องาน --</option>
     <option
       value="__ALL_WORK__"
       data-level="${escapeAttribute(selectedLevel)}"
       data-work-type="all"
     >
       ${escapeHtml(allWorkLabel)}
     </option>`;

  topics.forEach(t => {

html += `
  <option
    value="${escapeAttribute(t.url)}"
    data-level="${escapeAttribute(t.level || "")}"
    data-work-type="${escapeAttribute(t.workType || "งานเดี่ยว")}"
  >
    ${escapeHtml(t.topic || "")}
    ${t.workType === "งานกลุ่ม" ? " [งานกลุ่ม]" : ""}
    ${t.workType === "เลือกส่ง" ? " [เลือกส่ง]" : ""}
  </option>
`;
  });

  topicSelect.innerHTML = html;

  if(currentTopic){
    const hasCurrentTopic =
      Array.from(topicSelect.options)
        .some(option => option.value === currentTopic);

    if(hasCurrentTopic){
      topicSelect.value = currentTopic;
    }
  }

  renderAssignedClassOptions();
}


function handleWorkLevelFilterChange(){

  renderWorkTopicOptions("");

  const classSelect =
    document.getElementById("classFilter");

  if(classSelect){
    classSelect.value = "";
  }

  updateWorkClassFilterByTopic();
}

function normalizeOptionKey(value){
  return String(value || "")
    .trim()
    .replace(/\s+/g, "")
    .replace(/\./g, "")
    .toLowerCase();
}
function updateWorkClassFilterByTopic(keepClassValue){

  const topicSelect =
    document.getElementById("topic");

  const classSelect =
    document.getElementById("classFilter");

  const noFilter =
    document.getElementById("noFilter");

  if(!topicSelect || !classSelect){
    return;
  }

  const selectedOption =
    topicSelect.options[topicSelect.selectedIndex];

  const selectedLevelFromTopic =
    selectedOption
      ? String(selectedOption.getAttribute("data-level") || "").trim()
      : "";

  const selectedLevel =
    selectedLevelFromTopic || getSelectedWorkLevel();

  const oldClassValue =
    keepClassValue !== undefined
      ? String(keepClassValue || "").trim()
      : String(classSelect.value || "").trim();

  let classes = [];

  if(Array.isArray(scoreOptionsData)){

    if(selectedLevel){
      const foundLevel =
        scoreOptionsData.find(item =>
          normalizeOptionKey(item.level) === normalizeOptionKey(selectedLevel)
        );

      if(foundLevel && Array.isArray(foundLevel.classes)){
        classes = foundLevel.classes;
      }
    }

    else{
      classes = scoreOptionsData
        .flatMap(item => Array.isArray(item.classes) ? item.classes : []);
    }
  }

  if(classes.length === 0 && Array.isArray(currentWorkData) && currentWorkData.length > 0){
    classes = currentWorkData
      .filter(item => !selectedLevel || normalizeOptionKey(item.level) === normalizeOptionKey(selectedLevel))
      .map(item => String(item.class || "").trim())
      .filter(Boolean);
  }

  classes = [
    ...new Set(
      classes
        .map(item => String(item || "").trim())
        .filter(Boolean)
    )
  ].sort((a, b) => String(a).localeCompare(String(b), "th", { numeric: true }));

  let html = `<option value="">ทุกห้อง</option>`;

  classes.forEach(className => {
    html += `
      <option value="${escapeAttribute(className)}">
        ${escapeHtml(className)}
      </option>
    `;
  });

  classSelect.innerHTML = html;

  if(oldClassValue){
    const option = Array.from(classSelect.options)
      .find(item => normalizeOptionKey(item.value) === normalizeOptionKey(oldClassValue));
    if(option){
      classSelect.value = option.value;
    }
  }

  classSelect.onchange = renderWorkCards;

  if(noFilter){
    noFilter.oninput = renderWorkCards;
  }

  renderAssignedClassOptions();
}

function toggleWorkSettingsPopup(){

  const popup =
    document.getElementById("workSettingsPopup");

  if(!popup){
    return;
  }

  popup.classList.toggle("show");
}


document.addEventListener("click", function(event){

  const wrap =
    document.querySelector(".settings-wrap");

  const popup =
    document.getElementById("workSettingsPopup");

  if(wrap && popup && !wrap.contains(event.target)){
    popup.classList.remove("show");
  }

  const scoreWrap =
    document.querySelector(".score-settings-wrap");

  const scorePopup =
    document.getElementById("scoreSettingsPopup");

  if(scoreWrap && scorePopup && !scoreWrap.contains(event.target)){
    scorePopup.classList.remove("show");
  }
});
function refreshWorkList(){
  loadWork();
}

function stopLoadedWork(){

  stopAutoRefreshWork();
  autoRefreshWorkEnabled = false;
  currentWorkData = [];
  currentSheetUrl = "";
  nameSearchLoadedAllWork = false;

  const autoButton =
    document.getElementById("autoRefreshToggleBtn");

  if(autoButton){
    autoButton.textContent = "⏸ อัปเดตอัตโนมัติ: ปิด";
  }

  const refreshButton =
    document.getElementById("refreshWorkButton");

  if(refreshButton){
    refreshButton.style.display = "block";
  }

  const workStatus =
    document.getElementById("workStatus");

  const workBox =
    document.getElementById("work");

  if(workStatus){
    workStatus.innerHTML = "";
  }

  if(workBox){
    workBox.innerHTML = "";
  }

  const selectionMount =
    document.getElementById("teacherWorkBulkToolsMount");

  if(selectionMount){
    selectionMount.innerHTML = "";
  }
}
function startAutoRefreshWork(){

  stopAutoRefreshWork();

  autoRefreshWorkTimer = setInterval(() => {

    if(!autoRefreshWorkEnabled){
      return;
    }

    const topicSelect =
      document.getElementById("topic");

    if(!topicSelect || !topicSelect.value){
      return;
    }

    refreshWorkList();

  }, 90000);
}


function stopAutoRefreshWork(){

  if(autoRefreshWorkTimer){
    clearInterval(autoRefreshWorkTimer);
    autoRefreshWorkTimer = null;
  }
}


function toggleAutoRefreshWork(){

  const button =
    document.getElementById("autoRefreshToggleBtn");

  autoRefreshWorkEnabled =
    !autoRefreshWorkEnabled;

  if(autoRefreshWorkEnabled){

    if(button){
      button.textContent = "▶ อัปเดตอัตโนมัติ: เปิด (90 วินาที)";
    }

    startAutoRefreshWork();

  } else {

    stopAutoRefreshWork();

    if(button){
      button.textContent = "⏸ อัปเดตอัตโนมัติ: ปิด";
    }
  }
}
// ======================================
// โหลดงานนักเรียน
// ======================================
function loadWork(){

  const selectedOptions =
    getSelectedTopicOptions();

  const selectedClassBeforeLoad =
    document.getElementById("classFilter").value;

  const workBox =
    document.getElementById("work");

  const workStatus =
    document.getElementById("workStatus");

  if(selectedOptions.length === 0){
    workStatus.innerHTML =
      `<div class="status-box">❌ กรุณาเลือกหัวข้องานก่อน</div>`;
    workBox.innerHTML = "";
    return;
  }

  if(selectedOptions[0].value === "__ALL_WORK__"){
    loadAllWork();
    return;
  }

  const topic =
    getTopicMetaByUrl(selectedOptions[0].value) || getSelectedAssignmentTopics()[0];

  if(!topic || !topic.url){
    workStatus.innerHTML =
      `<div class="status-box">❌ กรุณาเลือกหัวข้องานก่อน</div>`;
    workBox.innerHTML = "";
    return;
  }

  const url =
    String(topic.url || "").trim();

  currentSheetUrl = url;
  nameSearchLoadedAllWork = false;
  selectedTeacherWorkKeys.clear();

  const refreshButton =
    document.getElementById("refreshWorkButton");

  if(refreshButton){
    refreshButton.style.display = "block";
  }

  workStatus.innerHTML =
    `<div class="status-box">กำลังโหลดงาน...</div>`;

  workBox.innerHTML = "";

  fetch(
    API_URL
    + "?action=studentWork"
    + "&url="
    + encodeURIComponent(url)
    + "&hideChecked="
    + encodeURIComponent(hideViewedWorksEnabled ? "true" : "false")
  )

  .then(res => res.json())

  .then(response => {

    let data = [];

    if(
      response &&
      response.status === "success" &&
      Array.isArray(response.data)
    ){
      data = response.data;
    }

    else if(Array.isArray(response)){
      data = response;
    }

    else{
      workStatus.innerHTML =
        `<div class="status-box">
          ❌ โหลดงานไม่สำเร็จ:
          ${escapeHtml(response.message || "รูปแบบข้อมูลจาก API ไม่ถูกต้อง")}
        </div>`;

      console.log("StudentWork API Response:", response);
      return;
    }

    currentWorkData = data.map(item =>
      applyAssignmentMetaToRow({
        ...item,
        sheetUrl: item.sheetUrl || url
      }, topic)
    );

    applyDefaultCollapsedForCheckedWorks(currentWorkData);

    if(currentWorkData.length === 0){

      workStatus.innerHTML =
        `<div class="status-box">ยังไม่มีข้อมูลงานนักเรียนในชีทนี้</div>`;

      return;
    }

    updateWorkClassFilterByTopic(selectedClassBeforeLoad);

    workStatus.innerHTML =
      `<div class="status-box">
        พบงานทั้งหมด ${currentWorkData.length} รายการ
      </div>`;

    applyWorkSortAndRender();
  })

  .catch(error => {

    console.error(error);

    workStatus.innerHTML =
      `<div class="status-box">
        ❌ เกิดข้อผิดพลาดในการเชื่อมต่อ API
      </div>`;
  });
}


function loadSelectedWorkTopics(topics){

  const workBox =
    document.getElementById("work");

  const workStatus =
    document.getElementById("workStatus");

  const refreshButton =
    document.getElementById("refreshWorkButton");

  currentSheetUrl = "";
  currentWorkData = [];
  nameSearchLoadedAllWork = false;
  selectedTeacherWorkKeys.clear();

  if(refreshButton){
    refreshButton.style.display = "block";
  }

  workBox.innerHTML = "";
  workStatus.innerHTML =
    `<div class="status-box">กำลังโหลดงานที่เลือก ${topics.length} งาน...</div>`;

  const requests =
    topics.map(topic => {
      return fetch(
        API_URL
        + "?action=studentWork"
        + "&url=" + encodeURIComponent(topic.url)
        + "&hideChecked=" + encodeURIComponent(hideViewedWorksEnabled ? "true" : "false")
      )
      .then(res => res.json())
      .then(result => {
        const rows =
          result && result.status === "success" && Array.isArray(result.data)
            ? result.data
            : [];

        return rows.map(row =>
          applyAssignmentMetaToRow({
            ...row,
            sheetUrl: topic.url || row.sheetUrl || ""
          }, topic)
        );
      })
      .catch(error => {
        console.error(error);
        return [];
      });
    });

  Promise.all(requests)
    .then(groups => {

      currentWorkData =
        groups.flat();

      applyDefaultCollapsedForCheckedWorks(currentWorkData);

      if(currentWorkData.length === 0){
        workStatus.innerHTML =
          `<div class="status-box">ไม่พบงานที่ต้องตรวจในงานที่เลือก</div>`;
        workBox.innerHTML = "";
        return;
      }

      populateClassFilter(currentWorkData);

      workStatus.innerHTML =
        `<div class="status-box">
          พบงานทั้งหมด ${currentWorkData.length} รายการ จากงานที่เลือก ${topics.length} งาน
        </div>`;

      applyWorkSortAndRender();
    })
    .catch(error => {
      console.error(error);
      workStatus.innerHTML =
        `<div class="status-box">❌ โหลดงานที่เลือกไม่สำเร็จ</div>`;
    });
}



function loadAllWork(){

  const workBox = document.getElementById("work");
  const workStatus = document.getElementById("workStatus");
  const refreshButton = document.getElementById("refreshWorkButton");

  currentSheetUrl = "";
  currentWorkData = [];
  nameSearchLoadedAllWork = false;
  selectedTeacherWorkKeys.clear();

  const topicSelect = document.getElementById("topic");
  if(topicSelect){
    topicSelect.value = "__ALL_WORK__";
  }

  if(refreshButton){
    refreshButton.style.display = "block";
  }

  workBox.innerHTML = "";
  workStatus.innerHTML =
    `<div class="status-box">กำลังโหลดทุกงานของทุกชั้น...</div>`;

  fetch(API_URL + "?action=topics")
    .then(res => res.json())
    .then(response => {

      const topics =
        response && response.status === "success" && Array.isArray(response.data)
          ? response.data
          : (Array.isArray(response) ? response : []);

      const selectedLevel =
        getSelectedWorkLevel();

      const filteredTopics =
        selectedLevel
          ? topics.filter(topic =>
              String(topic.level || "").trim() === selectedLevel
            )
          : topics;

      if(filteredTopics.length === 0){
        workStatus.innerHTML =
          `<div class="status-box">ยังไม่มีหัวข้องานให้โหลดในระดับชั้นนี้</div>`;
        return;
      }

      const requests = filteredTopics.map(topic => {
        return fetch(
          API_URL
          + "?action=studentWork"
          + "&url=" + encodeURIComponent(topic.url)
          + "&hideChecked=" + encodeURIComponent(hideViewedWorksEnabled ? "true" : "false")
        )
        .then(res => res.json())
        .then(result => {
          const rows =
            result && result.status === "success" && Array.isArray(result.data)
              ? result.data
              : [];

          return rows.map(row => ({
            ...row,
            level: topic.level || row.level || "",
            topic: topic.topic || row.topic || "",
            sheetUrl: topic.url || row.sheetUrl || "",
            workType: topic.workType || row.workType || "งานเดี่ยว",
            worksheetUrl: topic.worksheetUrl !== undefined ? topic.worksheetUrl : (row.worksheetUrl || ""),
            worksheetVisible: topic.worksheetVisible !== undefined ? topic.worksheetVisible : row.worksheetVisible,
            fullScore: topic.fullScore !== undefined ? topic.fullScore : (row.fullScore || ""),
            assignedClasses: topic.assignedClasses !== undefined ? topic.assignedClasses : (row.assignedClasses || ""),
            maxGroupMembers: topic.maxGroupMembers !== undefined ? topic.maxGroupMembers : (row.maxGroupMembers || "")
          }));
        })
        .catch(error => {
          console.error(error);
          return [];
        });
      });

      return Promise.all(requests);
    })
    .then(groups => {

      if(!groups){
        return;
      }

      currentWorkData = groups.flat();
      applyDefaultCollapsedForCheckedWorks(currentWorkData);

      if(currentWorkData.length === 0){
        workStatus.innerHTML =
          `<div class="status-box">ไม่พบงานที่ต้องตรวจ</div>`;
        workBox.innerHTML = "";
        return;
      }

      populateClassFilter(currentWorkData);

      const selectedLevel =
        getSelectedWorkLevel();

      workStatus.innerHTML =
        `<div class="status-box">
          พบงานทั้งหมด ${currentWorkData.length} รายการ
          ${selectedLevel ? "ของ " + escapeHtml(selectedLevel) : "จากทุกชั้น"}
        </div>`;

      applyWorkSortAndRender();
    })
    .catch(error => {
      console.error(error);
      workStatus.innerHTML =
        `<div class="status-box">❌ โหลดทุกงานไม่สำเร็จ</div>`;
    });
}

// ======================================
// สร้างตัวเลือกห้องเรียน
// ======================================
function populateClassFilter(data){

  const classSelect = document.getElementById("classFilter");

  if(!classSelect){
    return;
  }

  const oldValue = String(classSelect.value || "").trim();

  const classes = [
    ...new Set(
      (Array.isArray(data) ? data : [])
        .map(item => String(item.class || "").trim())
        .filter(Boolean)
    )
  ].sort((a, b) => String(a).localeCompare(String(b), "th", { numeric: true }));

  let html = `<option value="">ทุกห้อง</option>`;

  classes.forEach(className => {
    html += `
      <option value="${escapeAttribute(className)}">
        ${escapeHtml(className)}
      </option>
    `;
  });

  classSelect.innerHTML = html;

  if(oldValue){
    const option = Array.from(classSelect.options)
      .find(item => normalizeOptionKey(item.value) === normalizeOptionKey(oldValue));
    if(option){
      classSelect.value = option.value;
    }
  }

  classSelect.onchange = renderWorkCards;

  const noFilter = document.getElementById("noFilter");
  if(noFilter){
    noFilter.oninput = renderWorkCards;
  }
}


// ======================================
// แสดงการ์ดงาน พร้อมกรองห้อง/เลขที่
// ======================================
function applyWorkSortAndRender(){
  renderWorkCards();
}


function getSortedWorkData(data){

  const sortSelect =
    document.getElementById("workSortMode");

  const sortMode =
    sortSelect ? sortSelect.value : "latest";

  const sorted =
    [...data];

  sorted.sort((a, b) => {

    if(sortMode === "sheetOrder"){
      return getTopicOrderValue(a) - getTopicOrderValue(b)
        || getSheetOrderValue(a) - getSheetOrderValue(b)
        || getTimeValue(a.timestamp) - getTimeValue(b.timestamp);
    }

    if(sortMode === "latest"){
      return getTimeValue(b.timestamp) - getTimeValue(a.timestamp);
    }

    if(sortMode === "oldest"){
      return getTimeValue(a.timestamp) - getTimeValue(b.timestamp);
    }

    if(sortMode === "noAsc" || sortMode === "noDesc"){
      const aIsGroup = isGroupWorkItem(a);
      const bIsGroup = isGroupWorkItem(b);

      if(aIsGroup !== bIsGroup){
        return aIsGroup ? 1 : -1;
      }

      return sortMode === "noAsc"
        ? getNoValue(a.no) - getNoValue(b.no)
        : getNoValue(b.no) - getNoValue(a.no);
    }

    if(sortMode === "studentSeqAsc"){
      return getWorkStudentOrder(a)
        .localeCompare(
          getWorkStudentOrder(b),
          "th",
          { numeric: true }
        );
    }

    if(sortMode === "groupAsc"){
      return getGroupDisplayName(a)
        .localeCompare(
          getGroupDisplayName(b),
          "th",
          { numeric: true }
        );
    }

    return 0;
  });

  return sorted;
}


function getSheetOrderValue(item){

  const rowIndex = parseInt(item && item.rowIndex, 10);

  return isNaN(rowIndex) ? 999999 : rowIndex;
}


function getTopicOrderValue(item){

  const itemUrl = normalizeOptionKey(
    (item && item.sheetUrl) || currentSheetUrl || ""
  );

  if(!itemUrl || !Array.isArray(teacherTopicsData)){
    return 999999;
  }

  const index = teacherTopicsData.findIndex(topic =>
    normalizeOptionKey(topic && topic.url) === itemUrl
  );

  return index >= 0 ? index : 999999;
}


function toggleGroupPanel(panelId, button, openText, closeText){

  const panel = document.getElementById(panelId);

  if(!panel){
    return;
  }

  const willShow =
    panel.style.display === "none" || panel.style.display === "";

  panel.style.display = willShow ? "block" : "none";

  if(button){
    button.textContent = willShow
      ? (closeText || "ซ่อน")
      : (openText || "แสดง");
  }
}


function getTimeValue(value){

  const time =
    new Date(value).getTime();

  return isNaN(time) ? 0 : time;
}


function getNoValue(value){

  const number =
    parseInt(value, 10);

  return isNaN(number) ? 999999 : number;
}


function isGroupWorkItem(item){

  return item.isGroup === true ||
    String(item.submitMode || "").trim() === "งานกลุ่ม" ||
    String(item.groupName || "").trim() !== "";
}


function getStudentDisplayName(item){

  return String(
    item.name ||
    item.studentName ||
    ""
  ).trim();
}


function getGroupDisplayName(item){

  if(isGroupWorkItem(item)){
    return String(item.groupName || "").trim();
  }

  return "\uffff";
}


function sortCurrentWorkSheet(){

  const topicSelect =
    document.getElementById("topic");

  const sortSelect =
    document.getElementById("workSortMode");

  const selectedUrl = getSelectedTopicUrl();

  if(!topicSelect || !selectedUrl){
    alert("กรุณาเลือกหัวข้องานเดี่ยว 1 งานก่อน");
    return;
  }

  const selectedOption =
    Array.from(topicSelect.selectedOptions || []).find(option => option.value === selectedUrl);

  const workType =
    workTypeOverride ||
    (selectedOption ? selectedOption.getAttribute("data-work-type") : "") ||
    "งานเดี่ยว";

  const sortMode =
    sortSelect ? sortSelect.value : "latest";

  const confirmed =
    confirm(
      "ต้องการเรียงลำดับข้อมูลในชีตจริงหรือไม่?\n\n" +
      "หลังเรียงแล้ว ลำดับแถวใน Google Sheet จะเปลี่ยนตาม"
    );

  if(!confirmed){
    return;
  }

  fetch(API_URL + "?action=sortWorkSheet", {
    method: "POST",
    body: JSON.stringify({
      url: selectedUrl,
      sortMode: sortMode,
      workType: workType
    })
  })

  .then(res => res.json())

  .then(response => {

    if(response.status !== "success"){
      alert("❌ " + (response.message || "เรียงข้อมูลในชีตไม่สำเร็จ"));
      return;
    }

    alert("✅ " + response.message);
    refreshWorkList();
  })

  .catch(error => {
    console.error(error);
    alert("❌ เชื่อมต่อ API ไม่สำเร็จ");
  });
}
function loadHideViewedWorksSetting(){

  // ค่าเริ่มต้นของหน้าตรวจงานให้ซ่อนงานที่ตรวจแล้วเสมอ
  // ถ้าครูอยากดูทั้งหมด สามารถเอาเครื่องหมายถูกออกได้ในรอบการใช้งานนั้น
  hideViewedWorksEnabled = true;

  try {
    localStorage.setItem(HIDE_VIEWED_STORAGE_KEY, "true");
  } catch(error) {
    console.warn("ไม่สามารถบันทึกค่าซ่อนงานที่ตรวจแล้วได้", error);
  }

  const checkbox =
    document.getElementById("hideViewedWorksToggle");

  if(checkbox){
    checkbox.checked = true;
  }
}


function toggleHideViewedWorks(){

  const checkbox =
    document.getElementById("hideViewedWorksToggle");

  hideViewedWorksEnabled =
    checkbox ? checkbox.checked : false;

  localStorage.setItem(
    HIDE_VIEWED_STORAGE_KEY,
    hideViewedWorksEnabled ? "true" : "false"
  );

  const topicSelect =
    document.getElementById("topic");

  if(topicSelect && topicSelect.value){
    loadWork();
  } else {
    renderWorkCards();
  }
}


function getViewedWorksMap(){

  try {
    return JSON.parse(
      localStorage.getItem(VIEWED_WORKS_STORAGE_KEY) || "{}"
    );
  } catch(error) {
    return {};
  }
}


function saveViewedWorksMap(map){

  localStorage.setItem(
    VIEWED_WORKS_STORAGE_KEY,
    JSON.stringify(map || {})
  );
}


function getWorkViewedKey(rowIndex, sheetUrl){

  return String(sheetUrl || currentSheetUrl || "") + "::" + String(rowIndex || "");
}


function markWorkAsViewed(rowIndex, sheetUrl){

  if(!rowIndex){
    return;
  }

  const map =
    getViewedWorksMap();

  map[getWorkViewedKey(rowIndex, sheetUrl)] = true;

  saveViewedWorksMap(map);
}


function getCollapsedWorksMap(){

  try {
    return JSON.parse(
      localStorage.getItem(COLLAPSED_WORKS_STORAGE_KEY) || "{}"
    );
  } catch(error) {
    return {};
  }
}


function saveCollapsedWorksMap(map){

  localStorage.setItem(
    COLLAPSED_WORKS_STORAGE_KEY,
    JSON.stringify(map || {})
  );
}


function getCollapsedWorkKey(rowIndex, sheetUrl){

  return String(sheetUrl || currentSheetUrl || "") + "::" + String(rowIndex || "");
}


function applyDefaultCollapsedForCheckedWorks(data){

  const map =
    getCollapsedWorksMap();

  let changed = false;

  (Array.isArray(data) ? data : []).forEach(item => {

    if(
      item &&
      item.rowIndex &&
      hasScoreValue(item.score)
    ){
      const key =
        getCollapsedWorkKey(item.rowIndex, item.sheetUrl);

      if(map[key] !== true){
        map[key] = true;
        changed = true;
      }
    }
  });

  if(changed){
    saveCollapsedWorksMap(map);
  }
}


function isWorkCollapsed(item){

  const map =
    getCollapsedWorksMap();

  const key =
    getCollapsedWorkKey(item.rowIndex, item.sheetUrl);

  if(Object.prototype.hasOwnProperty.call(map, key)){
    return map[key] === true;
  }

  return hasScoreValue(item.score);
}


function setWorkCollapsed(rowIndex, collapsed, sheetUrl){

  if(!rowIndex){
    return;
  }

  const map =
    getCollapsedWorksMap();

  map[getCollapsedWorkKey(rowIndex, sheetUrl)] =
    collapsed === true;

  saveCollapsedWorksMap(map);

  renderWorkCards();
}


function markWorkAsViewedAndHide(rowIndex){

  markWorkAsViewed(rowIndex);
  setWorkCollapsed(rowIndex, true);
}


function hasScoreValue(score){

  return score !== "" &&
    score !== null &&
    score !== undefined &&
    String(score).trim() !== "";
}


function isWorkViewedOrChecked(item){

  if(hasScoreValue(item.score)){
    return true;
  }

  const map =
    getViewedWorksMap();

  return map[getWorkViewedKey(item.rowIndex)] === true;
}
function renderTeacherOnlyGroupInfo(item){

  const isGroup =
    isGroupWorkItem(item);

  if(!isGroup){
    return "";
  }

  const assessments =
    Array.isArray(item.groupMemberAssessments)
    ? item.groupMemberAssessments
    : [];

  const teacherNote =
    String(item.teacherNote || "").trim();

  if(assessments.length === 0 && !teacherNote){
    return "";
  }

  return `
    <div class="teacher-only-box">
      <strong>ข้อมูลการทำงานกลุ่ม / หมายเหตุถึงครู</strong>

      ${
        assessments.length > 0
        ? `
          <ul>
            ${assessments.map(member => `
              <li>
                ${escapeHtml(member.no ? "เลขที่ " + member.no + " " : "")}
                ${escapeHtml(member.name || member.id || "-")}
                : ${escapeHtml(member.status || "ช่วยงานเต็มที่")}
              </li>
            `).join("")}
          </ul>
        `
        : ``
      }

      ${
        teacherNote
        ? `<div style="margin-top:8px;">หมายเหตุ: ${escapeHtml(teacherNote)}</div>`
        : ``
      }
    </div>
  `;
}


function getTeacherWorksheetUrl(item){

  return String(
    item.worksheetUrl ||
    (
      getTopicMetaByUrl(item.sheetUrl || currentSheetUrl) || {}
    ).worksheetUrl ||
    ""
  ).trim();
}

function toggleTeacherWorksheet(id, button){

  const box = document.getElementById(id);
  if(!box){
    return;
  }

  const willShow =
    box.style.display === "none" || box.style.display === "";

  box.style.display = willShow ? "block" : "none";

  if(button){
    button.textContent = willShow ? "ซ่อนใบงาน" : "ใบงาน/คำสั่ง";
  }
}

function returnSubmissionForRevision(url, rowIndex, workType){

  if(!url || !rowIndex){
    alert("ไม่พบข้อมูลงานที่จะส่งคืน");
    return;
  }

  const note =
    prompt("หมายเหตุส่งงานคืนให้นักเรียนแก้ไข", "");

  if(note === null){
    return;
  }

  fetch(API_URL + "?action=returnSubmission", {
    method: "POST",
    body: JSON.stringify({
      url: url,
      rowIndex: rowIndex,
      workType: workType || "งานเดี่ยว",
      returnNote: note
    })
  })
  .then(res => res.json())
  .then(response => {
    if(response.status !== "success"){
      alert("❌ " + (response.message || "ส่งงานคืนไม่สำเร็จ"));
      return;
    }

    updateCurrentWorkItemLocally(url, rowIndex, "", item => {
      item.returnStatus = "ส่งคืนให้แก้ไข";
      item.returnNote = note;
    });

    alert("✅ ส่งงานคืนแล้ว");
    renderWorkWithoutReload();
  })
  .catch(error => {
    console.error(error);
    alert("❌ เชื่อมต่อ API ไม่สำเร็จ");
  });
}

function getTeacherWorkSelectionKey(item){

  return [
    String(item.sheetUrl || currentSheetUrl || "").trim(),
    String(item.rowIndex || "").trim(),
    String(item.id || "").trim()
  ].join("|");
}


function isSameWorkItem(item, url, rowIndex, studentId){

  const targetUrl = String(url || currentSheetUrl || "").trim();
  const itemUrl = String(item.sheetUrl || currentSheetUrl || "").trim();
  const targetRow = String(rowIndex || "").trim();
  const itemRow = String(item.rowIndex || "").trim();
  const targetStudentId = String(studentId || "").trim();
  const itemStudentId = String(item.id || "").trim();

  if(targetUrl && itemUrl && targetUrl !== itemUrl){
    return false;
  }

  if(targetRow && itemRow && targetRow === itemRow){
    return true;
  }

  if(targetStudentId && itemStudentId && targetStudentId === itemStudentId){
    return true;
  }

  return false;
}

function findCurrentWorkItem(url, rowIndex, studentId){
  return (Array.isArray(currentWorkData) ? currentWorkData : [])
    .find(item => isSameWorkItem(item, url, rowIndex, studentId));
}

function updateCurrentWorkItemLocally(url, rowIndex, studentId, updater){

  const item = findCurrentWorkItem(url, rowIndex, studentId);

  if(!item){
    return null;
  }

  updater(item);
  return item;
}

function updateCurrentWorkItemsLocally(items, updater){

  const changedKeys = [];

  (items || []).forEach(source => {
    const item = updateCurrentWorkItemLocally(
      source.sheetUrl || source.url || currentSheetUrl,
      source.rowIndex,
      source.id || source.studentId,
      target => updater(target, source)
    );

    if(item){
      changedKeys.push(getTeacherWorkSelectionKey(item));
    }
  });

  return changedKeys;
}

function removeCurrentWorkItemsLocally(items){

  const removeKeys = new Set(
    (items || []).map(item => [
      String(item.sheetUrl || item.url || currentSheetUrl || "").trim(),
      String(item.rowIndex || "").trim(),
      String(item.id || item.studentId || "").trim()
    ].join("|"))
  );

  currentWorkData = (Array.isArray(currentWorkData) ? currentWorkData : [])
    .filter(item => {
      const key = [
        String(item.sheetUrl || currentSheetUrl || "").trim(),
        String(item.rowIndex || "").trim(),
        String(item.id || "").trim()
      ].join("|");

      return !removeKeys.has(key);
    });
}

function renderWorkWithoutReload(){

  const scrollX = window.scrollX;
  const scrollY = window.scrollY;

  const activeGroupPage =
    document.getElementById("teacherPageGroupIndividual") &&
    document.getElementById("teacherPageGroupIndividual").classList.contains("active");

  if(activeGroupPage){
    renderNameSearchResults();
  } else {
    renderWorkCards();
  }

  requestAnimationFrame(() => {
    window.scrollTo(scrollX, scrollY);
  });
}

function setWorkCardSavingState(url, rowIndex, studentId, isSaving){

  const item = findCurrentWorkItem(url, rowIndex, studentId);
  if(!item){ return; }

  const key = getTeacherWorkSelectionKey(item);
  const card = Array.from(document.querySelectorAll("[data-work-selection-key]"))
    .find(element => element.getAttribute("data-work-selection-key") === key);

  if(card){
    card.classList.toggle("work-saving-state", !!isSaving);
  }
}

function toggleTeacherWorkSelected(checkbox){

  const key =
    String(checkbox.value || "").trim();

  if(!key){
    return;
  }

  if(checkbox.checked){
    selectedTeacherWorkKeys.add(key);
  } else {
    selectedTeacherWorkKeys.delete(key);
  }

  const card =
    checkbox.closest(".card");

  if(card){
    card.classList.toggle("teacher-work-selected", checkbox.checked);
  }

  updateTeacherWorkSelectionStatus();
}

function updateTeacherWorkSelectionStatus(){

  const box =
    document.getElementById("teacherWorkSelectionStatus");

  if(!box){
    return;
  }

  box.textContent =
    "เลือกใบงานนักเรียน " + selectedTeacherWorkKeys.size + " รายการ";
}

function selectAllVisibleTeacherWorks(){

  const checks =
    document.querySelectorAll(".teacher-work-select");

  checks.forEach(check => {
    check.checked = true;
    selectedTeacherWorkKeys.add(String(check.value || ""));

    const card = check.closest(".card");
    if(card){
      card.classList.add("teacher-work-selected");
    }
  });

  updateTeacherWorkSelectionStatus();
}

function clearSelectedTeacherWorks(){

  selectedTeacherWorkKeys.clear();

  document.querySelectorAll(".teacher-work-select").forEach(check => {
    check.checked = false;
    const card = check.closest(".card");
    if(card){
      card.classList.remove("teacher-work-selected");
    }
  });

  updateTeacherWorkSelectionStatus();
}

function getSelectedTeacherWorkItems(){

  return (Array.isArray(currentWorkData) ? currentWorkData : [])
    .filter(item => selectedTeacherWorkKeys.has(getTeacherWorkSelectionKey(item)));
}

function returnSelectedSubmissionsForRevision(){

  const selectedItems =
    getSelectedTeacherWorkItems()
      .filter(item => item.sheetUrl && item.rowIndex);

  if(selectedItems.length === 0){
    alert("กรุณาติ๊กเลือกใบงานนักเรียนก่อน");
    return;
  }

  const note =
    prompt("หมายเหตุส่งงานคืนให้นักเรียนแก้ไข", "");

  if(note === null){
    return;
  }

  const confirmed =
    confirm("ยืนยันส่งงานคืน " + selectedItems.length + " รายการหรือไม่");

  if(!confirmed){
    return;
  }

  Promise.all(
    selectedItems.map(item =>
      fetch(API_URL + "?action=returnSubmission", {
        method: "POST",
        body: JSON.stringify({
          url: item.sheetUrl,
          rowIndex: item.rowIndex,
          workType: item.workType || (isGroupWorkItem(item) ? "งานกลุ่ม" : "งานเดี่ยว"),
          returnNote: note
        })
      })
      .then(res => res.json())
      .then(response => ({ item, response }))
      .catch(error => ({ item, response: { status: "error", message: error.message } }))
    )
  ).then(results => {

    const failed =
      results.filter(result => !result.response || result.response.status !== "success");

    if(failed.length > 0){
      alert("ส่งคืนบางรายการไม่สำเร็จ " + failed.length + " รายการ");
    } else {
      alert("✅ ส่งงานคืนที่เลือกแล้ว");
    }

    if(failed.length < results.length){
      updateCurrentWorkItemsLocally(
        results.filter(result => result.response && result.response.status === "success").map(result => ({
          ...result.item,
          returnNote: note
        })),
        (item, source) => {
          item.returnStatus = "ส่งคืนให้แก้ไข";
          item.returnNote = source.returnNote || "";
        }
      );
    }

    selectedTeacherWorkKeys.clear();
    renderWorkWithoutReload();
  });
}

function updateSelectedTeacherWorksScore(score, successText){

  const selectedItems =
    getSelectedTeacherWorkItems()
      .filter(item => item.sheetUrl && item.rowIndex && item.id);

  if(selectedItems.length === 0){
    alert("กรุณาติ๊กเลือกใบงานนักเรียนก่อน");
    return;
  }

  if(score === ""){
    alert("กรุณากรอกคะแนน");
    return;
  }

  const confirmed =
    confirm("ยืนยันใส่คะแนนให้ใบงานที่เลือก " + selectedItems.length + " รายการหรือไม่");

  if(!confirmed){ return; }

  Promise.all(
    selectedItems.map(item =>
      fetch(
        API_URL
        + "?action=updateScore"
        + "&url=" + encodeURIComponent(item.sheetUrl)
        + "&studentId=" + encodeURIComponent(item.id)
        + "&rowIndex=" + encodeURIComponent(item.rowIndex)
        + "&score=" + encodeURIComponent(score)
      )
      .then(res => res.json())
      .then(response => ({ item, response }))
      .catch(error => ({ item, response: { status:"error", message:error.message } }))
    )
  ).then(results => {
    const failed = results.filter(result => !result.response || result.response.status !== "success");
    if(failed.length > 0){
      alert("บันทึกคะแนนบางรายการไม่สำเร็จ " + failed.length + " รายการ");
    } else {
      alert(successText || "✅ บันทึกคะแนนที่เลือกแล้ว");
    }
    if(failed.length < results.length){
      updateCurrentWorkItemsLocally(
        results.filter(result => result.response && result.response.status === "success").map(result => result.item),
        item => {
          item.score = score;
          markWorkAsViewed(item.rowIndex, item.sheetUrl || currentSheetUrl);
          setWorkCollapsed(item.rowIndex, true, item.sheetUrl || currentSheetUrl);
        }
      );
    }

    selectedTeacherWorkKeys.clear();
    renderWorkWithoutReload();
  });
}

function applyScoreToSelectedTeacherWorks(){
  const input = document.getElementById("bulkTeacherWorkScore");
  const score = input ? String(input.value || "").trim() : "";
  updateSelectedTeacherWorksScore(score, "✅ ใส่คะแนนให้ใบงานที่เลือกแล้ว");
}

function markSelectedTeacherWorksChecked(){
  updateSelectedTeacherWorksScore("ตรวจแล้ว", "✅ บันทึกสถานะตรวจแล้วให้ใบงานที่เลือกแล้ว");
}

function applyFullScoreToSelectedTeacherWorks(){

  const selectedItems = getSelectedTeacherWorkItems();
  if(selectedItems.length === 0){
    alert("กรุณาติ๊กเลือกใบงานนักเรียนก่อน");
    return;
  }

  const scoreGroups = {};
  selectedItems.forEach(item => {
    const topic = getTopicMetaByUrl(item.sheetUrl);
    const fullScore = String(item.fullScore || (topic ? topic.fullScore : "") || "").trim();
    if(fullScore){
      scoreGroups[fullScore] = scoreGroups[fullScore] || [];
      scoreGroups[fullScore].push(item);
    }
  });

  const scores = Object.keys(scoreGroups);
  if(scores.length === 0){
    alert("ยังไม่ได้ตั้งคะแนนเต็มของงานที่เลือก");
    return;
  }

  const confirmed = confirm("ยืนยันใส่คะแนนเต็มให้ใบงานที่เลือกหรือไม่");
  if(!confirmed){ return; }

  Promise.all(scores.flatMap(score =>
    scoreGroups[score].map(item =>
      fetch(
        API_URL
        + "?action=updateScore"
        + "&url=" + encodeURIComponent(item.sheetUrl)
        + "&studentId=" + encodeURIComponent(item.id)
        + "&rowIndex=" + encodeURIComponent(item.rowIndex)
        + "&score=" + encodeURIComponent(score)
      )
      .then(res => res.json())
      .then(response => ({ item, response }))
      .catch(error => ({ item, response: { status:"error", message:error.message } }))
    )
  )).then(results => {
    const failed = results.filter(result => !result.response || result.response.status !== "success");
    if(failed.length > 0){
      alert("บันทึกคะแนนเต็มบางรายการไม่สำเร็จ " + failed.length + " รายการ");
    } else {
      alert("✅ ใส่คะแนนเต็มให้ใบงานที่เลือกแล้ว");
    }
    if(failed.length < results.length){
      const successful = results
        .filter(result => result.response && result.response.status === "success")
        .map(result => {
          const score = String(result.item.fullScore || (getTopicMetaByUrl(result.item.sheetUrl) || {}).fullScore || "").trim();
          return { ...result.item, appliedScore: score };
        });

      updateCurrentWorkItemsLocally(successful, (item, source) => {
        item.score = source.appliedScore || item.score || "";
        markWorkAsViewed(item.rowIndex, item.sheetUrl || currentSheetUrl);
        setWorkCollapsed(item.rowIndex, true, item.sheetUrl || currentSheetUrl);
      });
    }

    selectedTeacherWorkKeys.clear();
    renderWorkWithoutReload();
  });
}

function makeSafeDomId(value){

  return String(value || "")
    .replace(/[^a-zA-Z0-9_-]/g, "_");
}

function toggleAllTeacherWorksheets(){

  const boxes =
    Array.from(document.querySelectorAll(".teacher-worksheet-box"));

  if(boxes.length === 0){
    alert("ยังไม่มีใบงานในรายการที่โหลดอยู่");
    return;
  }

  const shouldOpen =
    boxes.some(box => window.getComputedStyle(box).display === "none");

  boxes.forEach(box => {
    box.style.display = shouldOpen ? "block" : "none";
  });

  document.querySelectorAll(".teacher-worksheet-toggle").forEach(button => {
    button.textContent = shouldOpen ? "ซ่อนใบงาน" : "ใบงาน/คำสั่ง";
  });

  const mainButton =
    document.getElementById("toggleAllTeacherWorksheetsBtn");

  if(mainButton){
    mainButton.textContent = shouldOpen
      ? "📄 ปิดใบงานนักเรียนทั้งหมด"
      : "📄 เปิดใบงานนักเรียนทั้งหมด";
  }
}



function deleteSelectedTeacherWorks(){

  const selectedItems =
    getSelectedTeacherWorkItems()
      .filter(item => item.sheetUrl && item.rowIndex);

  if(selectedItems.length === 0){
    alert("กรุณาติ๊กเลือกใบงานนักเรียนก่อน");
    return;
  }

  const confirmed =
    confirm(
      "ยืนยันลบงานนักเรียนที่เลือก " + selectedItems.length + " รายการหรือไม่?\n\n" +
      "ระบบจะลบแถวงานออกจากชีต และถ้ามีไฟล์แนบจะย้ายไฟล์ไปถังขยะ"
    );

  if(!confirmed){
    return;
  }

  fetch(API_URL + "?action=batchDeleteSubmissions", {
    method:"POST",
    body:JSON.stringify({
      items:selectedItems.map(item => ({
        url:item.sheetUrl,
        rowIndex:item.rowIndex,
        studentId:item.id || "",
        workType:item.workType || (isGroupWorkItem(item) ? "งานกลุ่ม" : "งานเดี่ยว")
      }))
    })
  })
  .then(res => res.json())
  .then(response => {
    if(response.status !== "success"){
      alert("❌ " + (response.message || "ลบงานที่เลือกไม่สำเร็จ"));
      return;
    }

    alert("✅ " + (response.message || "ลบงานที่เลือกแล้ว"));
    removeCurrentWorkItemsLocally(selectedItems);
    selectedTeacherWorkKeys.clear();
    renderWorkWithoutReload();
  })
  .catch(error => {
    console.error(error);
    alert("❌ เชื่อมต่อ API ไม่สำเร็จ");
  });
}

function getGroupMembersForTeacherScoring(item){

  const fromAssessments =
    Array.isArray(item.groupMemberAssessments)
      ? item.groupMemberAssessments
      : [];

  if(fromAssessments.length > 0){
    return fromAssessments.map(member => ({
      id:String(member.id || "").trim(),
      name:String(member.name || "").trim(),
      no:String(member.no || "").trim(),
      className:String(member.className || item.class || "").trim(),
      status:String(member.status || "ช่วยงานเต็มที่").trim()
    })).filter(member => member.id);
  }

  const fromMembers =
    Array.isArray(item.groupMembers)
      ? item.groupMembers
      : [];

  return fromMembers.map(member => ({
    id:String(member.id || "").trim(),
    name:String(member.name || "").trim(),
    no:String(member.no || "").trim(),
    className:String(member.className || item.class || "").trim(),
    status:String(member.status || "").trim()
  })).filter(member => member.id);
}

function renderGroupIndividualScoreEditor(item, domPrefix){

  if(!isGroupWorkItem(item)){
    return "";
  }

  const members = getGroupMembersForTeacherScoring(item);

  if(members.length === 0){
    return `
      <div class="group-inline-score-box">
        <strong>คะแนนรายบุคคลในงานกลุ่ม</strong>
        <div class="empty-text">ยังไม่มีข้อมูลสมาชิกกลุ่มสำหรับให้คะแนนรายบุคคล</div>
      </div>
    `;
  }

  const itemSheetUrl = String(item.sheetUrl || currentSheetUrl || "").trim();
  const rowIndex = String(item.rowIndex || "").trim();
  const baseId = makeSafeDomId((domPrefix || "work") + "_" + itemSheetUrl + "_" + rowIndex);
  const groupScoreId = "groupInlineScore_" + baseId;
  const currentScore = String(item.score || "").trim() === "ตรวจแล้ว" ? "" : String(item.score || "").trim();

  return `
    <div class="group-inline-score-box">
      <strong>ให้คะแนนรายบุคคลในงานกลุ่ม</strong>
      <div class="group-inline-score-actions">
        <label>คะแนนกลุ่ม
          <input
            id="${escapeAttribute(groupScoreId)}"
            type="number"
            value="${escapeAttribute(currentScore)}"
            placeholder="คะแนนกลุ่ม"
          >
        </label>
        <button
          type="button"
          onclick="saveAllGroupIndividualScoresFromWork('${escapeJsString(itemSheetUrl)}','${escapeJsString(rowIndex)}','${escapeJsString(groupScoreId)}')"
        >
          บันทึกคะแนนรายบุคคลทั้งกลุ่ม
        </button>
      </div>

      <div class="group-inline-score-grid">
        ${members.map(member => {
          const adjustId = "groupInlineAdjust_" + baseId + "_" + makeSafeDomId(member.id);
          return `
            <div class="group-inline-member-card" data-group-member-id="${escapeAttribute(member.id)}">
              <div>
                ${escapeHtml(member.no ? "เลขที่ " + member.no + " " : "")}
                ${escapeHtml(member.name || member.id)}
              </div>
              ${member.status ? `<div>ความมีส่วนร่วม: ${escapeHtml(member.status)}</div>` : ``}
              <input
                id="${escapeAttribute(adjustId)}"
                type="number"
                placeholder="+/- รายคน"
              >
              <button
                type="button"
                onclick="saveGroupIndividualScoreFromWork('${escapeJsString(itemSheetUrl)}','${escapeJsString(rowIndex)}','${escapeJsString(member.id)}','${escapeJsString(groupScoreId)}','${escapeJsString(adjustId)}')"
              >
                บันทึกคนนี้
              </button>
            </div>
          `;
        }).join("")}
      </div>
    </div>
  `;
}

function saveGroupIndividualScoreFromWork(url, rowIndex, studentId, groupScoreInputId, adjustInputId){

  const groupScoreInput = document.getElementById(groupScoreInputId);
  const adjustInput = document.getElementById(adjustInputId);

  const groupScore = groupScoreInput ? String(groupScoreInput.value || "").trim() : "";
  const adjustment = adjustInput ? String(adjustInput.value || "").trim() : "";

  if(!groupScore){
    alert("กรุณากรอกคะแนนกลุ่มก่อน");
    return;
  }

  saveGroupIndividualUpdates([{
    url:url,
    rowIndex:rowIndex,
    studentId:studentId,
    score:groupScore,
    individualAdjustment:adjustment
  }]);
}

function saveAllGroupIndividualScoresFromWork(url, rowIndex, groupScoreInputId){

  const groupScoreInput = document.getElementById(groupScoreInputId);
  const groupScore = groupScoreInput ? String(groupScoreInput.value || "").trim() : "";

  if(!groupScore){
    alert("กรุณากรอกคะแนนกลุ่มก่อน");
    return;
  }

  const box = groupScoreInput.closest(".group-inline-score-box");
  const members = box ? Array.from(box.querySelectorAll(".group-inline-member-card")) : [];

  const updates = members.map(card => {
    const studentId = String(card.getAttribute("data-group-member-id") || "").trim();
    const adjustInput = card.querySelector("input[id^='groupInlineAdjust_']");
    return {
      url:url,
      rowIndex:rowIndex,
      studentId:studentId,
      score:groupScore,
      individualAdjustment:adjustInput ? String(adjustInput.value || "").trim() : ""
    };
  }).filter(item => item.studentId);

  if(updates.length === 0){
    alert("ไม่พบสมาชิกกลุ่มสำหรับบันทึกคะแนน");
    return;
  }

  saveGroupIndividualUpdates(updates);
}

function saveGroupIndividualUpdates(updates){

  fetch(API_URL + "?action=batchUpdateScores", {
    method:"POST",
    body:JSON.stringify({ updates:updates })
  })
  .then(res => res.json())
  .then(response => {
    if(response.status !== "success"){
      alert("❌ " + (response.message || "บันทึกคะแนนรายบุคคลไม่สำเร็จ"));
      return;
    }

    updateCurrentWorkItemsLocally(updates, (item, source) => {
      item.score = source.score;
      item.individualAdjustment = source.individualAdjustment || item.individualAdjustment || "";
      item.individualAdjustments = item.individualAdjustments || {};
      if(source.studentId){
        item.individualAdjustments[source.studentId] = source.individualAdjustment || "";
      }
    });

    alert("✅ บันทึกคะแนนรายบุคคลแล้ว");
    renderWorkWithoutReload();
  })
  .catch(error => {
    console.error(error);
    alert("❌ เชื่อมต่อ API ไม่สำเร็จ");
  });
}


function prepareNameSearchPage(){
  const statusBox = document.getElementById("groupIndividualCheckStatus");
  const contentBox = document.getElementById("groupIndividualCheckContent");
  const classSelect = document.getElementById("nameSearchClass");

  populateNameSearchClassOptionsFromTopics();

  if(statusBox){
    statusBox.innerHTML = `<div class="status-box">เลือกห้อง แล้วพิมพ์คำค้น จากนั้นกด “ค้นหางาน” ระบบจะค่อยโหลดงานเมื่อต้องค้นหา</div>`;
  }
  if(contentBox){
    contentBox.innerHTML = "";
  }
  if(classSelect && !classSelect.innerHTML.trim()){
    classSelect.innerHTML = `<option value="">เลือกห้อง</option>`;
  }
}

function populateNameSearchClassOptionsFromTopics(){
  const classSelect = document.getElementById("nameSearchClass");
  if(!classSelect){
    return;
  }

  const oldValue = String(classSelect.value || "").trim();
  const classes = getAllClassOptionsFromScoreOptions();

  classSelect.innerHTML = `<option value="">เลือกห้อง</option>` +
    classes.map(className => `
      <option value="${escapeAttribute(className)}">${escapeHtml(className)}</option>
    `).join("");

  if(oldValue && classes.includes(oldValue)){
    classSelect.value = oldValue;
  }
}

function getAllClassOptionsFromScoreOptions(){
  const classes = [];
  (Array.isArray(scoreOptionsData) ? scoreOptionsData : []).forEach(item => {
    (item.classes || []).forEach(className => {
      const text = String(className || "").trim();
      if(text && !classes.includes(text)){
        classes.push(text);
      }
    });
  });
  return classes.sort((a,b) => String(a).localeCompare(String(b), "th", { numeric:true }));
}

function searchNameWorkOnDemand(){
  const classSelect = document.getElementById("nameSearchClass");
  const searchInput = document.getElementById("nameSearchQuery");
  const contentBox = document.getElementById("groupIndividualCheckContent");

  const selectedClass = classSelect ? String(classSelect.value || "").trim() : "";
  const keyword = searchInput ? String(searchInput.value || "").trim() : "";

  if(!selectedClass){
    if(contentBox){ contentBox.innerHTML = `<div class="status-box">กรุณาเลือกห้องก่อนค้นหา</div>`; }
    return;
  }
  if(!keyword){
    if(contentBox){ contentBox.innerHTML = `<div class="status-box">กรุณาพิมพ์ชื่อ / นามสกุล / เลขที่ / เลขประจำตัวนักเรียน หรือชื่อกลุ่ม</div>`; }
    return;
  }

  loadAllWorkForNameSearch(true);
}

function loadAllWorkForNameSearch(forceRefresh){

  const statusBox = document.getElementById("groupIndividualCheckStatus");
  const contentBox = document.getElementById("groupIndividualCheckContent");
  const classSelect = document.getElementById("nameSearchClass");

  if(nameSearchAllWorkLoading){
    return;
  }

  if(!forceRefresh && nameSearchLoadedAllWork && Array.isArray(currentWorkData) && currentWorkData.length > 0){
    renderGroupIndividualCheckPage();
    return;
  }

  nameSearchAllWorkLoading = true;

  if(statusBox){
    statusBox.innerHTML = `<div class="status-box name-search-loading">กำลังโหลดงานทุกหัวข้อสำหรับหน้าเปิดตามรายชื่อ...</div>`;
  }

  if(contentBox){
    contentBox.innerHTML = "";
  }

  if(classSelect){
    classSelect.innerHTML = `<option value="">กำลังโหลดห้อง...</option>`;
  }

  const getTopicsPromise =
    Array.isArray(teacherTopicsData) && teacherTopicsData.length > 0
      ? Promise.resolve(teacherTopicsData)
      : fetch(API_URL + "?action=topics")
          .then(res => res.json())
          .then(response => {
            const topics =
              response && response.status === "success" && Array.isArray(response.data)
                ? response.data
                : (Array.isArray(response) ? response : []);
            teacherTopicsData = topics;
            return topics;
          });

  getTopicsPromise
    .then(topics => {
      const usableTopics = (Array.isArray(topics) ? topics : [])
        .filter(topic => String(topic.url || "").trim());

      if(usableTopics.length === 0){
        currentWorkData = [];
        nameSearchLoadedAllWork = true;
        if(statusBox){
          statusBox.innerHTML = `<div class="status-box">ยังไม่มีหัวข้องานให้โหลด</div>`;
        }
        if(classSelect){
          classSelect.innerHTML = `<option value="">เลือกห้อง</option>`;
        }
        return [];
      }

      const requests = usableTopics.map(topic => {
        return fetch(
          API_URL
          + "?action=studentWork"
          + "&url=" + encodeURIComponent(topic.url)
          + "&hideChecked=false"
        )
        .then(res => res.json())
        .then(result => {
          const rows =
            result && result.status === "success" && Array.isArray(result.data)
              ? result.data
              : [];

          const selectedClass = classSelect ? String(classSelect.value || "").trim() : "";
          return rows
            .filter(row => !selectedClass || normalizeOptionKey(row.class || "") === normalizeOptionKey(selectedClass))
            .map(row =>
              applyAssignmentMetaToRow({
                ...row,
                sheetUrl: topic.url || row.sheetUrl || ""
              }, topic)
            );
        })
        .catch(error => {
          console.error(error);
          return [];
        });
      });

      return Promise.all(requests);
    })
    .then(groups => {
      if(!groups){
        return;
      }

      currentSheetUrl = "";
      currentWorkData = groups.flat();
      nameSearchLoadedAllWork = true;

      if(statusBox){
        statusBox.innerHTML = `<div class="status-box">โหลดงานทุกหัวข้อแล้ว พบ ${currentWorkData.length} รายการ</div>`;
      }

      renderGroupIndividualCheckPage();
    })
    .catch(error => {
      console.error(error);
      if(statusBox){
        statusBox.innerHTML = `<div class="status-box">❌ โหลดงานทุกหัวข้อไม่สำเร็จ</div>`;
      }
      if(classSelect){
        classSelect.innerHTML = `<option value="">เลือกห้อง</option>`;
      }
    })
    .finally(() => {
      nameSearchAllWorkLoading = false;
    });
}

function renderGroupIndividualCheckPage(){

  const statusBox = document.getElementById("groupIndividualCheckStatus");
  const contentBox = document.getElementById("groupIndividualCheckContent");
  const classSelect = document.getElementById("nameSearchClass");

  if(!statusBox || !contentBox || !classSelect){
    return;
  }

  const data = Array.isArray(currentWorkData) ? currentWorkData : [];

  if(data.length === 0){
    statusBox.innerHTML = `<div class="status-box">ยังไม่พบข้อมูลงาน กด “โหลดทุกงานใหม่” เพื่อดึงงานทุกหัวข้อ</div>`;
    contentBox.innerHTML = "";
    classSelect.innerHTML = `<option value="">เลือกห้อง</option>`;
    return;
  }

  const oldClass = String(classSelect.value || "").trim();
  const classes = [...new Set(
    data
      .map(item => String(item.class || "").trim())
      .filter(Boolean)
  )].sort((a, b) => String(a).localeCompare(String(b), "th", { numeric:true }));

  classSelect.innerHTML =
    `<option value="">เลือกห้อง</option>` +
    classes.map(className => `
      <option value="${escapeAttribute(className)}">
        ${escapeHtml(className)}
      </option>
    `).join("");

  if(oldClass && classes.includes(oldClass)){
    classSelect.value = oldClass;
  }

  statusBox.innerHTML = `
    <div class="status-box">
      ใช้ข้อมูลจากงานที่โหลดสำหรับห้องที่เลือก ${data.length} รายการ
    </div>
  `;

  renderNameSearchResults();
}

function getSearchTextForWorkItem(item){

  const memberText =
    Array.isArray(item.groupMemberAssessments)
      ? item.groupMemberAssessments.map(member => [
          member.id,
          member.name,
          member.no,
          member.className,
          member.status
        ].join(" ")).join(" ")
      : "";

  const groupMembersText =
    Array.isArray(item.groupMembers)
      ? item.groupMembers.map(member => [
          member.id,
          member.name,
          member.no,
          member.className
        ].join(" ")).join(" ")
      : "";

  return normalizeOptionKey([
    item.name,
    item.submitterName,
    item.no,
    item.id,
    item.studentId,
    item.groupName,
    item.class,
    item.topic,
    memberText,
    groupMembersText
  ].join(" "));
}

function renderNameSearchResults(){

  const statusBox = document.getElementById("groupIndividualCheckStatus");
  const contentBox = document.getElementById("groupIndividualCheckContent");
  const classSelect = document.getElementById("nameSearchClass");
  const searchInput = document.getElementById("nameSearchQuery");

  if(!statusBox || !contentBox || !classSelect || !searchInput){
    return;
  }

  const data = Array.isArray(currentWorkData) ? currentWorkData : [];
  const selectedClass = String(classSelect.value || "").trim();
  const keyword = normalizeOptionKey(searchInput.value || "");

  if(data.length === 0){
    contentBox.innerHTML = "";
    return;
  }

  if(!selectedClass){
    contentBox.innerHTML = `<div class="status-box">กรุณาเลือกห้องก่อนค้นหา</div>`;
    return;
  }

  if(!keyword){
    contentBox.innerHTML = `<div class="status-box">กรุณาพิมพ์ชื่อ / นามสกุล / เลขที่ / เลขประจำตัวนักเรียน หรือชื่อกลุ่ม</div>`;
    return;
  }

  const result = data.filter(item =>
    normalizeOptionKey(item.class || "") === normalizeOptionKey(selectedClass) &&
    getSearchTextForWorkItem(item).includes(keyword)
  );

  statusBox.innerHTML = `
    <div class="status-box">
      ห้อง ${escapeHtml(selectedClass)} พบผลการค้นหา ${result.length} รายการ
    </div>
  `;

  if(result.length === 0){
    contentBox.innerHTML = `<div class="status-box">ไม่พบงานตามคำค้นนี้</div>`;
    return;
  }

  contentBox.innerHTML = result.map((item, index) =>
    renderNameSearchWorkCard(item, index)
  ).join("");
}

function renderNameSearchWorkCard(item, index){

  const isGroup = isGroupWorkItem(item);
  const itemSheetUrl = String(item.sheetUrl || currentSheetUrl || "").trim();
  const itemWorkType = String(item.workType || (isGroup ? "งานกลุ่ม" : "งานเดี่ยว")).trim();
  const scoreText = String(item.score ?? "").trim();
  const inputId = "nameSearchScore_" + makeSafeDomId(itemSheetUrl + "_" + (item.rowIndex || index));
  const title = isGroup
    ? (item.groupName || "ไม่ระบุชื่อกลุ่ม")
    : (item.name || "ไม่ระบุชื่อ");

  const workValue = item.work !== undefined
    ? item.work
    : (item.image !== undefined ? item.image : "");

  return `
    <div class="card name-search-card">
      <div class="teacher-work-heading">
        ${renderStudentPhoto(item.photoUrl || item.studentPhotoUrl || "", title, true)}
        <h3>
          ${escapeHtml(item.topic || "งาน")}
          | ${escapeHtml(item.class || "")}
          | ${isGroup ? "งานกลุ่ม" : escapeHtml("เลขที่ " + (item.no || "-"))}
        </h3>
      </div>

      <div class="meta">
        ${isGroup ? `<div>ชื่อกลุ่ม: ${escapeHtml(item.groupName || "-")}</div>` : ``}
        <div>${isGroup ? "ผู้ส่ง" : "ชื่อ"}: ${escapeHtml(item.name || item.submitterName || "-")}</div>
        <div>รหัสผู้ส่ง: ${escapeHtml(item.id || "-")}</div>
        <div>คะแนนปัจจุบัน: ${escapeHtml(scoreText || "ยังไม่ได้ตรวจ")}</div>
        ${item.returnStatus ? `<div class="returned-badge">${escapeHtml(item.returnStatus)}${item.returnNote ? ": " + escapeHtml(item.returnNote) : ""}</div>` : ``}
        ${item.revisionStatus ? `<div class="revised-badge">${escapeHtml(item.revisionStatus)}${item.revisionNote ? ": " + escapeHtml(item.revisionNote) : ""}</div>` : ``}
      </div>

      <div class="work-box">
        <h4>งานที่ส่ง</h4>
        ${renderWorkContent(workValue, { autoPreview: !hasScoreValue(scoreText) })}
      </div>

      ${
        isGroup
        ? `
          <div class="group-panel-actions">
            <button
              type="button"
              onclick="toggleGroupPanel('nameSearchGroupScore_${escapeJsString(inputId)}', this, 'แสดงการให้คะแนนรายบุคคล', 'ซ่อนการให้คะแนนรายบุคคล')"
            >
              แสดงการให้คะแนนรายบุคคล
            </button>
            <button
              type="button"
              onclick="returnSubmissionForRevision('${escapeJsString(itemSheetUrl)}','${escapeJsString(item.rowIndex || "")}','${escapeJsString(itemWorkType)}')"
            >
              ส่งงานคืน
            </button>
          </div>

          <div id="nameSearchGroupScore_${escapeAttribute(inputId)}" class="group-hidden-panel" style="display:none;">
            ${renderGroupIndividualScoreEditor(item, "nameSearch")}
          </div>
        `
        : `
          <div class="score-area name-search-score-area">
            <input
              type="number"
              id="${escapeAttribute(inputId)}"
              value="${scoreText === "ตรวจแล้ว" ? "" : escapeAttribute(scoreText)}"
              placeholder="คะแนน"
            >
            <button
              type="button"
              onclick="saveNameSearchScore('${escapeJsString(itemSheetUrl)}','${escapeJsString(item.id || "")}','${escapeJsString(item.rowIndex || "")}','${escapeJsString(inputId)}')"
            >
              บันทึกคะแนน
            </button>
            <button
              type="button"
              onclick="markCheckedNoScore('${escapeJsString(itemSheetUrl)}','${escapeJsString(item.id || "")}','${escapeJsString(item.rowIndex || "")}')"
            >
              ตรวจแล้ว
            </button>
            <button
              type="button"
              onclick="returnSubmissionForRevision('${escapeJsString(itemSheetUrl)}','${escapeJsString(item.rowIndex || "")}','${escapeJsString(itemWorkType)}')"
            >
              ส่งงานคืน
            </button>
          </div>
        `
      }
    </div>
  `;
}

function saveNameSearchScore(url, studentId, rowIndex, inputId){

  const scoreInput = document.getElementById(inputId);

  if(!scoreInput){
    alert("ไม่พบช่องกรอกคะแนน");
    return;
  }

  const score = String(scoreInput.value || "").trim();

  if(score === ""){
    alert("กรุณากรอกคะแนน");
    return;
  }

  saveScoreValue(
    url,
    studentId,
    rowIndex,
    score,
    "✅ บันทึกคะแนนแล้ว"
  );
}

function renderWorkCards(){

  const workBox = document.getElementById("work");

  const selectedClass =
    document.getElementById("classFilter").value;

  const selectedNo =
    document.getElementById("noFilter").value.trim();

  const sortedWorkData =
    getSortedWorkData(currentWorkData);

  let html = "";
  let visibleCount = 0;

  sortedWorkData.forEach(s => {

    const isCollapsed =
      isWorkCollapsed(s);

    const studentClass =
      String(s.class || "").trim();

    const studentNo =
      String(s.no || "").trim();

    const isGroup =
      isGroupWorkItem(s);

    const displayTitle =
      isGroup
        ? String(s.groupName || "ไม่ระบุชื่อกลุ่ม").trim()
        : String(s.name || "-").trim();

    const displayDetail =
      isGroup
        ? "ผู้ส่ง: " + String(s.name || "-").trim()
        : "เลขที่: " + String(studentNo || "-").trim();

    const studentOrder =
      getWorkStudentOrder(s);

    const photoHtml =
      renderStudentPhoto(s.photoUrl || s.studentPhotoUrl || "", displayTitle, true);

    const scoreText =
      String(s.score ?? "").trim();

    const checkedLabel =
      scoreText === "ตรวจแล้ว"
        ? "ตรวจแล้ว แต่ยังไม่ให้คะแนน"
        : (scoreText ? "คะแนน: " + scoreText : "ยังไม่ได้ตรวจ");

    if(selectedClass && studentClass !== selectedClass){
      return;
    }

    if(selectedNo && !isGroup && studentNo !== selectedNo){
      return;
    }

    if(selectedNo && isGroup){
      return;
    }

    visibleCount++;

    const workValue =
      s.work !== undefined
      ? s.work
      : (s.image !== undefined ? s.image : "");

    const itemSheetUrl =
      String(s.sheetUrl || currentSheetUrl || "").trim();

    const itemWorkType =
      String(s.workType || (isGroup ? "งานกลุ่ม" : "งานเดี่ยว")).trim();

    const workSelectionKey =
      getTeacherWorkSelectionKey({
        ...s,
        sheetUrl: itemSheetUrl
      });

    const isWorkSelected =
      selectedTeacherWorkKeys.has(workSelectionKey);

    const worksheetDomId =
      makeSafeDomId("teacherWorksheet_" + itemSheetUrl + "_" + (s.rowIndex || "") + "_" + visibleCount);

    const groupInfoDomId =
      makeSafeDomId("teacherGroupInfo_" + itemSheetUrl + "_" + (s.rowIndex || "") + "_" + visibleCount);

    const groupScoreDomId =
      makeSafeDomId("teacherGroupScore_" + itemSheetUrl + "_" + (s.rowIndex || "") + "_" + visibleCount);

    const groupInfoHtml =
      isGroup ? renderTeacherOnlyGroupInfo(s) : "";

    html += `
      <div class="card ${isWorkSelected ? "teacher-work-selected" : ""}" data-work-selection-key="${escapeAttribute(workSelectionKey)}">

        <label class="teacher-work-select-box">
          <input
            type="checkbox"
            class="teacher-work-select"
            value="${escapeAttribute(workSelectionKey)}"
            ${isWorkSelected ? "checked" : ""}
            onchange="toggleTeacherWorkSelected(this)"
          >
          เลือก
        </label>

        <div class="work-card-actions">

          <button
            type="button"
            onclick="setWorkCollapsed(
              '${escapeJsString(s.rowIndex || "")}',
              ${isCollapsed ? "false" : "true"},
              '${escapeJsString(itemSheetUrl)}'
            )"
          >
            ${isCollapsed ? "👁 แสดงงาน" : "🙈 ซ่อนงาน"}
          </button>

          <button
            type="button"
            onclick="returnSubmissionForRevision(
              '${escapeJsString(itemSheetUrl)}',
              '${escapeJsString(s.rowIndex || "")}',
              '${escapeJsString(itemWorkType)}'
            )"
          >
            ส่งงานคืน
          </button>

          ${getTeacherWorksheetUrl(s) ? `
            <button
              type="button"
              class="teacher-worksheet-toggle"
              onclick="toggleTeacherWorksheet('${escapeJsString(worksheetDomId)}', this)"
            >
              ใบงาน/คำสั่ง
            </button>
          ` : ``}

          <button
            type="button"
            onclick="deleteSubmission(
              '${escapeJsString(itemSheetUrl)}',
              '${escapeJsString(s.rowIndex || "")}',
              '${escapeJsString(itemWorkType)}'
            )"
          >
            ลบงาน
          </button>

        </div>

        <div class="teacher-work-heading">
          ${photoHtml}
          <h3>
            ${s.topic ? escapeHtml((s.level ? s.level + " - " : "") + s.topic) + " | " : ""}
            ${escapeHtml(studentClass)}
            ${isGroup ? "งานกลุ่ม" : escapeHtml("เลขที่ " + studentNo)}
            
          </h3>
        </div>

        <div class="meta">
          <div>${isGroup ? "ชื่อกลุ่ม" : "ชื่อ"}: ${escapeHtml(displayTitle)}</div>
          <div>${escapeHtml(displayDetail)}</div>
          <div>รหัสผู้ส่ง: ${escapeHtml(s.id || "")}</div>
          <div>สถานะตรวจ: ${escapeHtml(checkedLabel)}</div>
          ${s.returnStatus ? `<div class="returned-badge">${escapeHtml(s.returnStatus)}${s.returnNote ? ": " + escapeHtml(s.returnNote) : ""}</div>` : ``}
          ${s.revisionStatus ? `<div class="revised-badge">${escapeHtml(s.revisionStatus)}${s.revisionNote ? ": " + escapeHtml(s.revisionNote) : ""}</div>` : ``}

          <div class="submit-time ${s.isLate ? "late-time" : "normal-time"}">
            เวลาส่งงาน: ${escapeHtml(formatTimestamp(s.timestamp))}
            ${s.isLate ? `<span class="late-label">ส่งช้า</span>` : ``}
          </div>

          ${
            s.dueDate
            ? `
              <div class="due-date">
                กำหนดส่งของห้องนี้:
                ${escapeHtml(formatTimestamp(s.dueDate))}
              </div>
            `
            : ``
          }
        </div>

        ${getTeacherWorksheetUrl(s) ? `
          <div
            id="${escapeAttribute(worksheetDomId)}"
            class="work-box teacher-worksheet-box"
            style="display:none;"
          >
            <h4>ใบงาน / คำสั่ง</h4>
            ${renderWorksheetContent(getTeacherWorksheetUrl(s))}
          </div>
        ` : ``}

        ${
          isCollapsed
          ? `
            <div class="work-box">
              <p class="empty-text">
                ย่อแผ่นงานแล้ว กด “แสดงงาน” เพื่อดูงานที่ส่งและให้คะแนน
              </p>
            </div>
          `
          : `
            <div class="work-box">
              <h4>งานที่ส่ง</h4>
              ${renderWorkContent(workValue, { autoPreview: !hasScoreValue(scoreText) })}
            </div>

            ${
              isGroup
              ? `
                <div class="group-panel-actions">
                  ${groupInfoHtml ? `
                    <button
                      type="button"
                      onclick="toggleGroupPanel('${escapeJsString(groupInfoDomId)}', this, 'แสดงข้อมูลการทำงานกลุ่ม', 'ซ่อนข้อมูลการทำงานกลุ่ม')"
                    >
                      แสดงข้อมูลการทำงานกลุ่ม
                    </button>
                  ` : ``}
                  <button
                    type="button"
                    onclick="toggleGroupPanel('${escapeJsString(groupScoreDomId)}', this, 'แสดงการให้คะแนนรายบุคคล', 'ซ่อนการให้คะแนนรายบุคคล')"
                  >
                    แสดงการให้คะแนนรายบุคคล
                  </button>
                </div>

                ${groupInfoHtml ? `
                  <div id="${escapeAttribute(groupInfoDomId)}" class="group-hidden-panel" style="display:none;">
                    ${groupInfoHtml}
                  </div>
                ` : ``}

                <div id="${escapeAttribute(groupScoreDomId)}" class="group-hidden-panel" style="display:none;">
                  ${renderGroupIndividualScoreEditor(s, "work")}
                </div>
              `
              : `
                <div class="score-area">

                  <input
                    type="number"
                    id="score_${escapeAttribute(s.rowIndex || s.id)}"
                    value="${scoreText === "ตรวจแล้ว" ? "" : escapeAttribute(s.score || "")}"
                    placeholder="คะแนน"
                  >

                  <button
                    onclick="saveScore(
                      '${escapeJsString(itemSheetUrl)}',
                      '${escapeJsString(s.id || "")}',
                      '${escapeJsString(s.rowIndex || "")}'
                    )"
                  >
                    บันทึกคะแนน
                  </button>

                  <button
                    type="button"
                    onclick="markCheckedNoScore(
                      '${escapeJsString(itemSheetUrl)}',
                      '${escapeJsString(s.id || "")}',
                      '${escapeJsString(s.rowIndex || "")}'
                    )"
                  >
                    ตรวจแล้ว แต่ยังไม่ให้คะแนน
                  </button>

                  <button
                    type="button"
                    onclick="giveFullScore(
                      '${escapeJsString(itemSheetUrl)}',
                      '${escapeJsString(s.id || "")}',
                      '${escapeJsString(s.rowIndex || "")}'
                    )"
                  >
                    คะแนนเต็ม
                  </button>

                </div>
              `
            }
          `
        }

      </div>
    `;
  });

  if(visibleCount === 0){
    html =
      `<div class="status-box">ไม่พบข้อมูลตามตัวกรอง</div>`;
  }

  const selectionToolbar = visibleCount > 0
    ? `
      <div class="status-box teacher-work-bulk-tools">
        <button type="button" onclick="selectAllVisibleTeacherWorks()">
          เลือกใบงานที่แสดงทั้งหมด
        </button>
        <button type="button" onclick="clearSelectedTeacherWorks()">
          ยกเลิกการเลือก
        </button>
        <button type="button" onclick="returnSelectedSubmissionsForRevision()">
          ส่งคืนงานที่เลือก
        </button>
        <button
          type="button"
          class="teacher-work-bulk-delete-button"
          onclick="deleteSelectedTeacherWorks()"
        >
          ลบงานที่เลือก
        </button>
        <div class="teacher-work-score-tools">
          <input id="bulkTeacherWorkScore" type="number" placeholder="คะแนนที่ต้องการใส่" />
          <button type="button" onclick="applyScoreToSelectedTeacherWorks()">
            ใส่คะแนนที่เลือก
          </button>
          <button type="button" onclick="applyFullScoreToSelectedTeacherWorks()">
            คะแนนเต็มที่เลือก
          </button>
          <button type="button" onclick="markSelectedTeacherWorksChecked()">
            ตรวจแล้วที่เลือก
          </button>
        </div>
        <span id="teacherWorkSelectionStatus" class="teacher-work-selection-status"></span>
      </div>
    `
    : "";

  const selectionMount =
    document.getElementById("teacherWorkBulkToolsMount");

  if(selectionMount){
    selectionMount.innerHTML = selectionToolbar;
    workBox.innerHTML = html;
  }
  else{
    workBox.innerHTML = selectionToolbar + html;
  }

  updateTeacherWorkSelectionStatus();
}
// ======================================
// แสดงงานในช่อง Work
// ถ้าเป็น Drive URL = พรีวิวไฟล์
// ถ้าเป็น image URL โดยตรง = แสดงรูป
// ถ้าเป็น URL ทั่วไป = แสดงลิงก์
// ถ้าไม่ใช่ URL = แสดงข้อความ
// ======================================
function renderWorkContent(work, options = {}){

  const value = String(work || "").trim();

  if(!value){
    return `<p class="empty-text">ยังไม่มีข้อมูลงานที่ส่ง</p>`;
  }

  const lines =
    value
      .split(/\n+/)
      .map(line => line.trim())
      .filter(Boolean);

  const isMultiLine = lines.length > 1;

  if(isMultiLine){
    return `
      <div class="multi-file-list">
        ${lines.map((line, index) => `
          <div class="multi-file-item">
            <div class="empty-text">รายการที่ ${index + 1}</div>
            ${renderWorkContent(line, options)}
          </div>
        `).join("")}
      </div>
    `;
  }

  const driveFileId = extractDriveFileId(value);

  if(driveFileId){

    const previewUrl =
      "https://drive.google.com/file/d/"
      + driveFileId
      + "/preview";

    if(options && options.autoPreview){
      return `
        <iframe
          class="file-preview"
          src="${escapeAttribute(previewUrl)}"
          loading="lazy"
        ></iframe>

        <a
          class="file-link"
          href="${escapeAttribute(value)}"
          target="_blank"
          rel="noopener noreferrer"
        >
          เปิดไฟล์ในแท็บใหม่
        </a>
      `;
    }

    return `
      <div class="lazy-preview-box">
        <button
          type="button"
          class="lazy-preview-button"
          onclick="loadLazyDrivePreview(this, '${escapeJsString(previewUrl)}')"
        >
          โหลดตัวอย่างไฟล์
        </button>
        <div class="lazy-preview-target"></div>
      </div>

      <a
        class="file-link"
        href="${escapeAttribute(value)}"
        target="_blank"
        rel="noopener noreferrer"
      >
        เปิดไฟล์ในแท็บใหม่
      </a>
    `;
  }

  if(isDirectImageUrl(value)){

    return `
      <img
        class="direct-image"
        src="${escapeAttribute(value)}"
        alt="Student work"
        onerror="this.outerHTML='<p>❌ ไม่สามารถแสดงรูปได้</p>';"
      >
    `;
  }

  if(isUrl(value)){

    return `
      <a
        class="file-link"
        href="${escapeAttribute(value)}"
        target="_blank"
        rel="noopener noreferrer"
      >
        เปิดลิงก์งาน
      </a>
    `;
  }

  return `
    <div class="text-work">
      ${escapeHtml(value)}
    </div>
  `;
}


// ======================================
// บันทึกคะแนน
// ======================================
function saveScore(url, studentId, rowIndex){

  const inputId =
    "score_" + (rowIndex || studentId);

  const scoreInput =
    document.getElementById(inputId);

  if(!scoreInput){
    alert("ไม่พบช่องกรอกคะแนน");
    return;
  }

  const score = scoreInput.value;

  if(score === ""){
    alert("กรุณากรอกคะแนน หรือกดปุ่ม ตรวจแล้ว แต่ยังไม่ให้คะแนน");
    return;
  }

  saveScoreValue(
    url,
    studentId,
    rowIndex,
    score,
    "✅ บันทึกคะแนนแล้ว"
  );
}

function saveScoreValue(url, studentId, rowIndex, score, successMessage){

  setWorkCardSavingState(url, rowIndex, studentId, true);

  fetch(
    API_URL
    + "?action=updateScore"
    + "&url=" + encodeURIComponent(url)
    + "&studentId=" + encodeURIComponent(studentId)
    + "&rowIndex=" + encodeURIComponent(rowIndex)
    + "&score=" + encodeURIComponent(score)
  )

  .then(res => res.json())

  .then(data => {

    if(data.status === "success"){

      markWorkAsViewed(rowIndex, url);
      setWorkCollapsed(rowIndex, true, url);

      updateCurrentWorkItemLocally(url, rowIndex, studentId, item => {
        item.score = score;
      });

      alert(successMessage || "✅ บันทึกแล้ว");
      renderWorkWithoutReload();
    }

    else{
      alert("❌ " + (data.message || "บันทึกไม่สำเร็จ"));
    }
  })

  .catch(error => {
    console.error(error);
    alert("❌ เชื่อมต่อ API ไม่สำเร็จ");
  })
  .finally(() => {
    setWorkCardSavingState(url, rowIndex, studentId, false);
  });
}

function markCheckedNoScore(url, studentId, rowIndex){

  saveScoreValue(
    url,
    studentId,
    rowIndex,
    "ตรวจแล้ว",
    "✅ บันทึกสถานะตรวจแล้วเรียบร้อย"
  );
}

function giveFullScore(url, studentId, rowIndex){

  const storageKey =
    FULL_SCORE_STORAGE_KEY_PREFIX + String(url || "");

  const topicInfo =
    Array.isArray(teacherTopicsData)
      ? teacherTopicsData.find(item => String(item.url || "") === String(url || ""))
      : null;

  const oldFullScore =
    localStorage.getItem(storageKey) ||
    (topicInfo && topicInfo.fullScore ? String(topicInfo.fullScore) : "") ||
    "10";

  const fullScore =
    prompt("กรอกคะแนนเต็มของงานนี้", oldFullScore);

  if(fullScore === null){
    return;
  }

  const cleanedScore =
    String(fullScore || "").trim();

  if(cleanedScore === ""){
    alert("กรุณากรอกคะแนนเต็ม");
    return;
  }

  localStorage.setItem(storageKey, cleanedScore);

  if(topicInfo){
    topicInfo.fullScore = cleanedScore;
  }

  fetch(API_URL + "?action=updateAssignmentFullScore", {
    method: "POST",
    body: JSON.stringify({
      url: url,
      fullScore: cleanedScore
    })
  }).catch(error => console.error(error));

  saveScoreValue(
    url,
    studentId,
    rowIndex,
    cleanedScore,
    "✅ ให้คะแนนเต็มแล้ว"
  );
}
function deleteSubmission(url, rowIndex, workTypeOverride){
  if(!url || !rowIndex){
    alert("ไม่พบข้อมูลงานที่ต้องการลบ");
    return;
  }

  const confirmed =
    confirm(
      "ยืนยันลบงานนี้หรือไม่?\n\n" +
      "ระบบจะลบแถวงานออกจากชีต และถ้ามีไฟล์แนบ จะย้ายไฟล์ไปถังขยะของ Drive"
    );

  if(!confirmed){
    return;
  }

  const topicSelect =
    document.getElementById("topic");

  const selectedOption =
    topicSelect.options[topicSelect.selectedIndex];

  const workType =
    workTypeOverride ||
    (selectedOption ? selectedOption.getAttribute("data-work-type") : "") ||
    "งานเดี่ยว";

  fetch(API_URL + "?action=deleteSubmission", {
    method: "POST",
    body: JSON.stringify({
      url: url,
      rowIndex: rowIndex,
      workType: workType
    })
  })
  .then(res => res.json())
  .then(response => {
    if(response.status !== "success"){
      alert("❌ " + (response.message || "ลบงานไม่สำเร็จ"));
      return;
    }

    alert("✅ " + response.message);
    removeCurrentWorkItemsLocally([{
      url: url,
      rowIndex: rowIndex
    }]);
    selectedTeacherWorkKeys.delete([
      String(url || currentSheetUrl || "").trim(),
      String(rowIndex || "").trim(),
      ""
    ].join("|"));
    renderWorkWithoutReload();
  })
  .catch(error => {
    console.error(error);
    alert("❌ เชื่อมต่อ API ไม่สำเร็จ");
  });
}

// ======================================
// แยก FILE ID จากลิงก์ Google Drive
// รองรับ:
// - open?id=...
// - /file/d/.../view
// - uc?id=...
// ======================================

// ===== END 05-teacher-work.js =====

// ===== BEGIN 07-score-table.js =====
function loadScoreOptions(){

  const levelSelect =
    document.getElementById("scoreLevel");

  const classSelect =
    document.getElementById("scoreClass");

  levelSelect.innerHTML =
    `<option value="">กำลังโหลดระดับชั้น...</option>`;

  classSelect.innerHTML =
    `<option value="">ทุกห้อง</option>`;

  fetch(API_URL + "?action=scoreOptions")

  .then(res => res.json())

  .then(response => {

    if(
      response.status !== "success" ||
      !Array.isArray(response.data)
    ){
      levelSelect.innerHTML =
        `<option value="">โหลดระดับชั้นไม่สำเร็จ</option>`;
      return;
    }

    scoreOptionsData = response.data;
    updateWorkClassFilterByTopic();
    renderNewAssignmentClassDeadlineOptions();
    updateNewAssignmentMaxGroupMembersVisibility();
    renderAssignmentSettingsList();

    if(scoreOptionsData.length === 0){
      levelSelect.innerHTML =
        `<option value="">ยังไม่มีข้อมูลระดับชั้น</option>`;
      return;
    }

    let html =
      `<option value="">-- เลือกระดับชั้น --</option>`;

    scoreOptionsData.forEach(item => {
      html += `
        <option value="${escapeAttribute(item.level)}">
          ${escapeHtml(item.level)}
        </option>
      `;
    });

    levelSelect.innerHTML = html;

    levelSelect.onchange =
      updateScoreClassOptions;
  })

  .catch(error => {
    console.error(error);
    levelSelect.innerHTML =
      `<option value="">โหลดระดับชั้นไม่สำเร็จ</option>`;
  });
}



function loadScoreTableIfReady(){
  const level = document.getElementById("scoreLevel");
  const classSelect = document.getElementById("scoreClass");

  if(!level || !classSelect){
    return;
  }

  if(level.value && lastScoreTableData){
    loadScoreTable();
  }
}

// ======================================
// เปลี่ยนรายการห้องตามระดับชั้นที่เลือก
// ======================================
function updateScoreClassOptions(){

  const levelSelect =
    document.getElementById("scoreLevel");

  const selectedLevel =
    levelSelect ? String(levelSelect.value || "").trim() : "";

  const classSelect =
    document.getElementById("scoreClass");

  if(!classSelect){
    return;
  }

  const oldClassValue = String(classSelect.value || "").trim();

  let html =
    `<option value="">ทุกห้อง</option>`;

  const selectedData =
    (Array.isArray(scoreOptionsData) ? scoreOptionsData : [])
      .find(item =>
        normalizeOptionKey(item.level) === normalizeOptionKey(selectedLevel)
      );

  if(
    selectedData &&
    Array.isArray(selectedData.classes)
  ){
    selectedData.classes
      .map(className => String(className || "").trim())
      .filter(Boolean)
      .sort((a, b) => String(a).localeCompare(String(b), "th", { numeric: true }))
      .forEach(className => {
        html += `
          <option value="${escapeAttribute(className)}">
            ${escapeHtml(className)}
          </option>
        `;
      });
  }

  classSelect.innerHTML = html;

  if(oldClassValue){
    const option = Array.from(classSelect.options)
      .find(item => normalizeOptionKey(item.value) === normalizeOptionKey(oldClassValue));
    if(option){
      classSelect.value = option.value;
    }
  }
}

// ======================================
// โหลดตารางคะแนนรายงาน
// ======================================
function loadScoreTable(){

  const level =
    document.getElementById("scoreLevel").value;

  const className =
    document.getElementById("scoreClass").value;

  const statusBox =
    document.getElementById("scoreTableStatus");

  const tableWrap =
    document.getElementById("scoreTableWrap");

  setScoreTableToolsVisible(false);

  if(!level){
    statusBox.innerHTML =
      `<div class="status-box">❌ กรุณาเลือกระดับชั้นก่อน</div>`;
    tableWrap.innerHTML = "";
    return;
  }

  statusBox.innerHTML =
    `<div class="status-box">กำลังโหลดตารางคะแนน...</div>`;

  tableWrap.innerHTML = "";

  fetch(
    API_URL
    + "?action=scoreTable"
    + "&level=" + encodeURIComponent(level)
    + "&className=" + encodeURIComponent(className)
  )

  .then(res => res.json())

  .then(response => {

    if(
      response.status !== "success" ||
      !response.data
    ){
      statusBox.innerHTML =
        `<div class="status-box">
          ❌ โหลดตารางคะแนนไม่สำเร็จ:
          ${escapeHtml(response.message || "รูปแบบข้อมูลไม่ถูกต้อง")}
        </div>`;
      setScoreTableToolsVisible(false);
      return;
    }

    lastScoreTableData = response.data;
    changedScoreMap = {};
    selectedAssignmentIndexes.clear();

    renderScoreTable(lastScoreTableData);
    populateBulkAssignmentOptions(lastScoreTableData);
    setScoreTableToolsVisible(true);
    updateBulkScoreStatus("");

    statusBox.innerHTML = "";

    if(
      Array.isArray(response.data.warnings) &&
      response.data.warnings.length > 0
    ){
      statusBox.innerHTML = `
        <div class="status-box">
          ⚠️ บางชีตเปิดไม่ได้:
          ${escapeHtml(response.data.warnings.join(" | "))}
        </div>
      `;
    }
  })

  .catch(error => {
    console.error(error);
    statusBox.innerHTML =
      `<div class="status-box">
        ❌ เชื่อมต่อ API ไม่สำเร็จ
      </div>`;
    setScoreTableToolsVisible(false);
  });
}

function stopLoadedScoreTable(){

  lastScoreTableData = null;
  changedScoreMap = {};
  selectedAssignmentIndexes.clear();

  const statusBox =
    document.getElementById("scoreTableStatus");

  const tableWrap =
    document.getElementById("scoreTableWrap");

  const bulkStatus =
    document.getElementById("bulkScoreStatus");

  const exportStatus =
    document.getElementById("exportSummaryStatus");

  if(statusBox){
    statusBox.innerHTML = "";
  }

  if(tableWrap){
    tableWrap.innerHTML = "";
  }

  if(bulkStatus){
    bulkStatus.innerHTML = "";
  }

  if(exportStatus){
    exportStatus.innerHTML = "";
  }

  setScoreTableToolsVisible(false);
}


function setScoreTableToolsVisible(visible){

  const tools =
    document.getElementById("scoreToolsPanel");

  const exportRow =
    document.getElementById("scoreExportRow");

  if(tools){
    tools.style.display = visible ? "block" : "none";
  }

  if(exportRow){
    exportRow.style.display = visible ? "grid" : "none";
  }
}
// ======================================
// บันทึกตารางคะแนนรายงานลงชีต ScoreSummary
// ======================================
function exportScoreSummary(){

  const level =
    document.getElementById("scoreLevel").value;

  const className =
    document.getElementById("scoreClass").value;

  const statusBox =
    document.getElementById("exportSummaryStatus");

  if(!level){
    statusBox.innerHTML =
      `<div class="status-box">
        ❌ กรุณาเลือกระดับชั้นก่อน
      </div>`;
    return;
  }

  statusBox.innerHTML =
    `<div class="status-box">
      กำลังบันทึกตารางคะแนนลง Sheet...
    </div>`;

  fetch(
    API_URL
    + "?action=exportScoreSummary"
    + "&level=" + encodeURIComponent(level)
    + "&className=" + encodeURIComponent(className)
  )

  .then(res => res.json())

  .then(response => {

    if(response.status !== "success"){

      statusBox.innerHTML =
        `<div class="status-box">
          ❌ บันทึกไม่สำเร็จ:
          ${escapeHtml(response.message || "เกิดข้อผิดพลาด")}
        </div>`;

      return;
    }

   statusBox.innerHTML =
  `<div class="status-box">
    ✅ บันทึกตารางคะแนนแยกตามห้องแล้ว
    <br>
    ระดับชั้น: ${escapeHtml(response.data.level)}
    |
    ห้อง: ${escapeHtml(response.data.className)}
    <br>
    จำนวนชีตที่สร้าง/อัปเดต: ${escapeHtml(response.data.sheetCount)}
    <br>
    ชีต:
    ${escapeHtml(response.data.sheetNames.join(", "))}
  </div>`;
  })

  .catch(error => {

    console.error(error);

    statusBox.innerHTML =
      `<div class="status-box">
        ❌ เชื่อมต่อ API ไม่สำเร็จ
      </div>`;
  });
}
  
// ======================================
// แสดงตารางคะแนนรายงาน
// ======================================
function renderScoreTable(data){

  const tableWrap =
    document.getElementById("scoreTableWrap");

  const assignments =
    Array.isArray(data.assignments)
    ? data.assignments
    : [];

  const students =
    Array.isArray(data.students)
    ? data.students
    : [];

  if(assignments.length === 0){
    tableWrap.innerHTML =
      `<div class="status-box">
        ยังไม่มีหัวข้องานในระดับชั้นนี้
      </div>`;
    return;
  }

  if(students.length === 0){
    tableWrap.innerHTML =
      `<div class="status-box">
        ยังไม่มีรายชื่อนักเรียนตามเงื่อนไขที่เลือก
      </div>`;
    return;
  }

  let html = `

    <table class="score-table">

      <thead>
        <tr>
          <th>เลขที่</th>
          <th>ห้อง</th>
          <th>รหัส</th>
          <th>ชื่อ</th>
  `;

  assignments.forEach((item, index) => {

    const fullScore =
      getFullScoreForAssignment(item);

    const isSelected =
      selectedAssignmentIndexes.has(String(index));

    html += `
      <th class="assignment-header">
        <button
          type="button"
          class="assignment-title-button ${isSelected ? "selected-assignment" : ""}"
          data-assignment-header="${escapeAttribute(index)}"
          onclick="toggleScoreCellsByAssignment(${index})"
          title="คลิกเพื่อเลือก/ยกเลิกช่องคะแนนของงานนี้"
        >
          ${escapeHtml(item.topic || "")}
        </button>

        <div class="full-score-box">
          คะแนนเต็ม<br>
          <input
            type="number"
            class="full-score-input"
            value="${escapeAttribute(fullScore)}"
            placeholder="เต็ม"
            onclick="event.stopPropagation()"
            onchange="setFullScoreForAssignment(${index}, this.value)"
          >
        </div>
      </th>
    `;
  });

  html += `
        </tr>
      </thead>
      <tbody>
  `;

  students.forEach(student => {

    html += `
      <tr>
        <td>${escapeHtml(student.no || "")}</td>
        <td>${escapeHtml(student.class || "")}</td>
        <td>${escapeHtml(student.id || "")}</td>
        <td class="student-name">${escapeHtml(student.name || "")}</td>
    `;

    const scores =
      Array.isArray(student.scores)
      ? student.scores
      : [];

    assignments.forEach((assignment, index) => {

      const cell =
        scores[index] || {
          status: "missing",
          score: ""
        };

      html += `
        <td>
          ${renderEditableScoreCell(cell, index)}
        </td>
      `;
    });

    html += `
      </tr>
    `;
  });

  html += `
      </tbody>
    </table>
  `;

  tableWrap.innerHTML = html;
}

// ======================================
// แสดงช่องคะแนนแบบแก้ไขได้
// ======================================
function calculateGroupFinalScore(groupScore, adjustment){

  const base =
    Number(String(groupScore ?? "").trim());

  const adjust =
    Number(String(adjustment ?? "").trim() || 0);

  if(isNaN(base)){
    return "";
  }

  return base + (isNaN(adjust) ? 0 : adjust);
}

function handleIndividualAdjustmentChange(adjustInput){

  const inputId =
    adjustInput.getAttribute("data-score-input-id");

  const scoreInput =
    document.getElementById(inputId);

  if(!scoreInput){
    return;
  }

  const finalInputId =
    adjustInput.getAttribute("data-final-input-id");

  const finalInput =
    document.getElementById(finalInputId);

  if(finalInput){
    const finalScore =
      calculateGroupFinalScore(scoreInput.value, adjustInput.value);

    finalInput.value =
      finalScore === "" ? "" : String(finalScore);
  }

  markScoreChanged(scoreInput);
}

function handleFinalGroupScoreChange(finalInput){

  const inputId =
    finalInput.getAttribute("data-score-input-id");

  const scoreInput =
    document.getElementById(inputId);

  if(!scoreInput){
    return;
  }

  const adjustInputId =
    finalInput.getAttribute("data-adjust-input-id");

  const adjustInput =
    document.getElementById(adjustInputId);

  const groupScore =
    Number(String(scoreInput.value || "").trim());

  const finalScore =
    Number(String(finalInput.value || "").trim());

  if(adjustInput){
    if(
      finalInput.value === "" ||
      isNaN(groupScore) ||
      isNaN(finalScore)
    ){
      adjustInput.value = "";
    } else {
      adjustInput.value = String(finalScore - groupScore);
    }
  }

  markScoreChanged(scoreInput);
}

function getGroupFinalScoreValue(groupScore, individualAdjustment, fallbackFinalScore){

  if(
    fallbackFinalScore !== undefined &&
    fallbackFinalScore !== null &&
    String(fallbackFinalScore).trim() !== ""
  ){
    return String(fallbackFinalScore);
  }

  const calculated =
    calculateGroupFinalScore(groupScore, individualAdjustment);

  return calculated === "" ? "" : String(calculated);
}

function renderEditableScoreCell(cell, assignmentIndex){

  const status = cell.status || "missing";
  const score = cell.score ?? "";
  const rowIndex = cell.rowIndex || "";
  const studentId = cell.studentId || "";
  const sheetUrl = cell.sheetUrl || "";
  const isLate = cell.isLate === true;
  const isGroupCell =
    cell.isGroup === true ||
    String(cell.groupName || "").trim() !== "";
  const groupScore =
    cell.groupScore ?? score;
  const individualAdjustment =
    cell.individualAdjustment ?? "";
  const finalScore =
    cell.finalScore ?? "";

  const contributionText =
    cell.memberContributionStatus
      ? String(cell.memberContributionStatus)
      : "ยังไม่มีข้อมูลความมีส่วนร่วม";

  const assignment =
    lastScoreTableData &&
    Array.isArray(lastScoreTableData.assignments)
    ? lastScoreTableData.assignments[assignmentIndex]
    : null;

  const fullScore =
    getFullScoreForAssignment(assignment);

  const key =
    sheetUrl + "|" + rowIndex + "|" + studentId + "|" + assignmentIndex;

  if(
    status === "scored" ||
    status === "pending" ||
    status === "checked"
  ){

    let placeholderText = "";
    let extraInputClass = " status-background";

    if(status === "scored"){
      placeholderText = isLate
        ? "ให้คะแนนแล้ว(ส่งช้า)"
        : "ให้คะแนนแล้ว";
    }

    else if(status === "checked"){
      placeholderText = isLate
        ? "ตรวจแล้ว(ส่งช้า)"
        : "ตรวจแล้ว";
    }

    else if(status === "pending" && isLate){
      placeholderText = "ส่งช้า";
      extraInputClass += " score-late-input";
    }

    const shouldHideScore =
      hideScoreValues &&
      status === "scored";

    const displayScore =
      shouldHideScore || status === "checked"
      ? ""
      : (isGroupCell ? groupScore : score);

    const isLockedScored =
      lockScoredScores &&
      status === "scored";

    const checkboxHtml = isLockedScored
      ? ``
      : `
        <label class="score-check-wrap">
          <input
            type="checkbox"
            class="score-check"
            data-input-id="score_input_${escapeAttribute(key)}"
            data-assignment-index="${escapeAttribute(assignmentIndex)}"
            onchange="toggleScoreCellSelected(this)"
          >
        </label>
      `;

    const groupFinalScoreValue =
      isGroupCell
      ? getGroupFinalScoreValue(displayScore, individualAdjustment, finalScore)
      : "";

    const individualAdjustHtml =
      isGroupCell
      ? (
          hideIndividualAdjustments
          ? `
            <input
              id="adjust_input_${escapeAttribute(key)}"
              type="hidden"
              value="${escapeAttribute(individualAdjustment)}"
              data-score-input-id="score_input_${escapeAttribute(key)}"
              data-final-input-id="final_score_input_${escapeAttribute(key)}"
            >
          `
          : `
            <div class="individual-adjust-wrapper">
              <div class="group-contribution-status-badge">
                ${escapeHtml(contributionText)}
              </div>
              <input
                id="adjust_input_${escapeAttribute(key)}"
                class="individual-adjust-input"
                type="number"
                value="${escapeAttribute(individualAdjustment)}"
                placeholder="${escapeAttribute(contributionText)}"
                title="${escapeAttribute(contributionText)}"
                data-score-input-id="score_input_${escapeAttribute(key)}"
                data-final-input-id="final_score_input_${escapeAttribute(key)}"
                ${isLockedScored ? "readonly" : `onchange="handleIndividualAdjustmentChange(this)"`}
              >
            </div>
          `
        )
      : ``;

    return `
      <div class="select-score-box${isGroupCell ? " group-score-stack" : ""}">

        ${checkboxHtml}

        <input
          id="score_input_${escapeAttribute(key)}"
          class="score-input${extraInputClass}${isLockedScored ? " locked-score-input" : ""}"
          type="number"
          value="${escapeAttribute(displayScore)}"
          placeholder="${escapeAttribute(isGroupCell ? "กรอกคะแนนกลุ่ม" : placeholderText)}"
          title="${escapeAttribute(isGroupCell ? "กรอกคะแนนกลุ่ม" : placeholderText)}"
          data-key="${escapeAttribute(key)}"
          data-url="${escapeAttribute(sheetUrl)}"
          data-row-index="${escapeAttribute(rowIndex)}"
          data-student-id="${escapeAttribute(studentId)}"
          data-assignment-index="${escapeAttribute(assignmentIndex)}"
          data-full-score="${escapeAttribute(fullScore)}"
          data-is-late="${isLate ? "true" : "false"}"
          data-is-group="${isGroupCell ? "true" : "false"}"
          data-individual-adjustment="${escapeAttribute(individualAdjustment)}"
          data-group-score-original="${escapeAttribute(groupScore)}"
          ${isLockedScored ? "readonly" : `onchange="handleScoreInputChange(this)"`}
        >

        ${
          isGroupCell
          ? `
            <input
              id="group_score_display_${escapeAttribute(key)}"
              class="group-score-readonly"
              type="text"
              value="${escapeAttribute(displayScore || groupScore)}"
              placeholder="คะแนนกลุ่ม"
              title="คะแนนกลุ่ม"
              readonly
            >

            ${individualAdjustHtml}

            <input
              id="final_score_input_${escapeAttribute(key)}"
              class="final-score-input"
              type="number"
              value="${escapeAttribute(groupFinalScoreValue)}"
              placeholder="คะแนนรวมรายคน"
              title="คะแนนรวมรายคน"
              data-score-input-id="score_input_${escapeAttribute(key)}"
              data-adjust-input-id="adjust_input_${escapeAttribute(key)}"
              ${isLockedScored ? "readonly" : `onchange="handleFinalGroupScoreChange(this)"`}
            >

            <div class="group-contribution-note">
              ${cell.memberContributionStatus ? `นักเรียนแจ้ง: ${escapeHtml(cell.memberContributionStatus)}` : ``}
              ${cell.teacherNote ? `<br>หมายเหตุ: ${escapeHtml(cell.teacherNote)}` : ``}
            </div>
          `
          : ``
        }

      </div>
    `;
  }

  if(status === "error"){
    return `<span class="score-error score-cell-display">เปิดชีตไม่ได้</span>`;
  }

  return `<span class="score-missing score-cell-display">ยังไม่ส่ง</span>`;
}

function toggleScoreCellSelected(checkbox){

  const inputId =
    checkbox.getAttribute("data-input-id");

  const input =
    document.getElementById(inputId);

  if(!input){
    return;
  }

  if(checkbox.checked){
    input.classList.add("selected-score-cell");
  } else {
    input.classList.remove("selected-score-cell");
  }

  updateSelectedAssignmentsFromChecks();
  updateBulkScoreStatus("");
}

function selectAllScoreCells(){

  const checks =
    document.querySelectorAll(".score-check");

  checks.forEach(check => {

    check.checked = true;

    const inputId =
      check.getAttribute("data-input-id");

    const input =
      document.getElementById(inputId);

    if(input){
      input.classList.add("selected-score-cell");
    }
  });

  updateSelectedAssignmentsFromChecks();
  updateBulkScoreStatus("เลือกทั้งหมดแล้ว");
}

function clearSelectedScoreCells(showMessage = true){

  selectedAssignmentIndexes.clear();

  const headers =
    document.querySelectorAll(".assignment-title-button");

  headers.forEach(header => {
    header.classList.remove("selected-assignment");
  });

  const checks =
    document.querySelectorAll(".score-check");

  checks.forEach(check => {

    check.checked = false;

    const inputId =
      check.getAttribute("data-input-id");

    const input =
      document.getElementById(inputId);

    if(input){
      input.classList.remove("selected-score-cell");
    }
  });

  if(showMessage){
    updateBulkScoreStatus("ยกเลิกการเลือกทั้งหมดแล้ว");
  }
}

function getSelectedScoreCount(){
  return document.querySelectorAll(".score-check:checked").length;
}

function updateSelectedAssignmentsFromChecks(){

  selectedAssignmentIndexes.clear();

  const checks =
    document.querySelectorAll(".score-check:checked");

  checks.forEach(check => {
    const assignmentIndex =
      check.getAttribute("data-assignment-index");

    if(assignmentIndex !== null){
      selectedAssignmentIndexes.add(String(assignmentIndex));
    }
  });

  const headers =
    document.querySelectorAll(".assignment-title-button");

  headers.forEach(header => {
    const assignmentIndex =
      String(header.getAttribute("data-assignment-header") || "");

    header.classList.toggle(
      "selected-assignment",
      selectedAssignmentIndexes.has(assignmentIndex)
    );
  });
}

function updateBulkScoreStatus(message){

  const statusBox =
    document.getElementById("bulkScoreStatus");

  if(!statusBox){
    return;
  }

  const selectedWorkCount =
    selectedAssignmentIndexes.size;

  const selectedScoreCount =
    getSelectedScoreCount();

  const lead = message
    ? `${escapeHtml(message)}<br>`
    : "";

  statusBox.innerHTML =
    `<div class="status-box">
      ${lead}
      เลือกงาน ${selectedWorkCount} งาน | เลือกคน/ช่องคะแนน ${selectedScoreCount} ช่อง
    </div>`;
}

function applyScoreToSelectedCells(){

  const score =
    document.getElementById("bulkScore").value;

  const statusBox =
    document.getElementById("bulkScoreStatus");

  if(score === ""){
    statusBox.innerHTML =
      `<div class="status-box">❌ กรุณากรอกคะแนนก่อน</div>`;
    return;
  }

  const checks =
    document.querySelectorAll(".score-check:checked");

  if(checks.length === 0){
    statusBox.innerHTML =
      `<div class="status-box">❌ กรุณาเลือกช่องคะแนนก่อน</div>`;
    return;
  }

  let cappedCount = 0;

  checks.forEach(check => {

    const inputId =
      check.getAttribute("data-input-id");

    const input =
      document.getElementById(inputId);

    if(input){
      input.removeAttribute("data-score-override");
      input.value = score;
      cappedCount += clampInputScoreToFullScore(input) ? 1 : 0;
      handleScoreInputChange(input);
    }
  });

  updateBulkScoreStatus(
    `ใส่คะแนนให้ช่องที่เลือก ${checks.length} ช่องแล้ว` +
    (cappedCount ? `<br>มี ${cappedCount} ช่องที่คะแนนเกินคะแนนเต็ม จึงปรับเป็นคะแนนเต็มให้แล้ว` : ``)
  );
}


function handleScoreInputChange(input){

  input.removeAttribute("data-score-override");
  clampInputScoreToFullScore(input);

  if(input.getAttribute("data-is-group") === "true"){
    const key = input.getAttribute("data-key");
    const adjustInput =
      document.getElementById("adjust_input_" + key);
    const finalInput =
      document.getElementById("final_score_input_" + key);
    const groupScoreDisplay =
      document.getElementById("group_score_display_" + key);

    if(groupScoreDisplay){
      groupScoreDisplay.value = input.value || input.getAttribute("data-group-score-original") || "";
    }

    if(finalInput){
      const finalScore =
        calculateGroupFinalScore(input.value, adjustInput ? adjustInput.value : "");
      finalInput.value =
        finalScore === "" ? "" : String(finalScore);
    }
  }

  markScoreChanged(input);
}

function clampInputScoreToFullScore(input){

  if(!input){
    return false;
  }

  const fullScoreText =
    String(input.getAttribute("data-full-score") || "").trim();

  if(fullScoreText === ""){
    return false;
  }

  const fullScore =
    Number(fullScoreText);

  const currentScore =
    Number(input.value);

  if(
    isNaN(fullScore) ||
    isNaN(currentScore)
  ){
    return false;
  }

  if(currentScore > fullScore){
    input.value = String(fullScore);
    return true;
  }

  return false;
}

function getSelectedScoreInputs(){

  const checks =
    document.querySelectorAll(".score-check:checked");

  const inputs = [];

  checks.forEach(check => {

    const inputId =
      check.getAttribute("data-input-id");

    const input =
      document.getElementById(inputId);

    if(input){
      inputs.push(input);
    }
  });

  return inputs;
}

function applyFullScoreToSelectedCells(){

  const statusBox =
    document.getElementById("bulkScoreStatus");

  const inputs =
    getSelectedScoreInputs();

  if(inputs.length === 0){
    statusBox.innerHTML =
      `<div class="status-box">❌ กรุณาเลือกช่องคะแนนก่อน</div>`;
    return;
  }

  let successCount = 0;
  let skipCount = 0;

  inputs.forEach(input => {

    const fullScore =
      String(input.getAttribute("data-full-score") || "").trim();

    if(fullScore === ""){
      skipCount++;
      return;
    }

    input.removeAttribute("data-score-override");
    input.value = fullScore;
    handleScoreInputChange(input);
    successCount++;
  });

  updateBulkScoreStatus(
    `ใส่คะแนนเต็มแล้ว ${successCount} ช่อง` +
    (skipCount ? `<br>ข้าม ${skipCount} ช่อง เพราะยังไม่ได้กำหนดคะแนนเต็มของงานนั้น` : ``)
  );
}

function markSelectedCellsChecked(){

  const statusBox =
    document.getElementById("bulkScoreStatus");

  const inputs =
    getSelectedScoreInputs();

  if(inputs.length === 0){
    statusBox.innerHTML =
      `<div class="status-box">❌ กรุณาเลือกช่องคะแนนก่อน</div>`;
    return;
  }

  inputs.forEach(input => {

    const isLate =
      input.getAttribute("data-is-late") === "true";

    input.value = "";
    input.setAttribute("data-score-override", "ตรวจแล้ว");
    input.placeholder = isLate ? "ตรวจแล้ว(ส่งช้า)" : "ตรวจแล้ว";
    input.title = input.placeholder;
    input.classList.remove("score-late-input");
    markScoreChanged(input);
  });

  updateBulkScoreStatus(`ทำเครื่องหมายตรวจแล้ว ${inputs.length} ช่องแล้ว`);
}


function toggleScoreSettingsPopup(){

  const popup =
    document.getElementById("scoreSettingsPopup");

  if(!popup){
    return;
  }

  popup.classList.toggle("show");
}

function loadScoreTableSettings(){

  const hideSaved =
    localStorage.getItem(HIDE_SCORES_STORAGE_KEY);

  hideScoreValues =
    hideSaved === null ? true : hideSaved === "true";

  const hideCheckbox =
    document.getElementById("hideScoresToggle");

  if(hideCheckbox){
    hideCheckbox.checked = hideScoreValues;
  }

  const lockSaved =
    localStorage.getItem(LOCK_SCORED_STORAGE_KEY);

  lockScoredScores =
    lockSaved === null ? true : lockSaved === "true";

  const lockCheckbox =
    document.getElementById("lockScoredToggle");

  if(lockCheckbox){
    lockCheckbox.checked = lockScoredScores;
  }

  const hideIndividualSaved =
    localStorage.getItem(HIDE_INDIVIDUAL_ADJUSTMENTS_STORAGE_KEY);

  hideIndividualAdjustments =
    hideIndividualSaved === "true";

  const hideIndividualCheckbox =
    document.getElementById("hideIndividualAdjustmentsToggle");

  if(hideIndividualCheckbox){
    hideIndividualCheckbox.checked = hideIndividualAdjustments;
  }
}

function toggleHideIndividualAdjustments(){

  const checkbox =
    document.getElementById("hideIndividualAdjustmentsToggle");

  hideIndividualAdjustments =
    checkbox ? checkbox.checked : false;

  localStorage.setItem(
    HIDE_INDIVIDUAL_ADJUSTMENTS_STORAGE_KEY,
    hideIndividualAdjustments ? "true" : "false"
  );

  if(lastScoreTableData){
    renderScoreTable(lastScoreTableData);
    updateBulkScoreStatus("ช่อง +/- คะแนนรายบุคคล: " + (hideIndividualAdjustments ? "ซ่อน" : "แสดง"));
  }
}

function toggleLockScoredScores(){

  const checkbox =
    document.getElementById("lockScoredToggle");

  lockScoredScores =
    checkbox ? checkbox.checked : true;

  localStorage.setItem(
    LOCK_SCORED_STORAGE_KEY,
    lockScoredScores ? "true" : "false"
  );

  clearSelectedScoreCells(false);

  if(lastScoreTableData){
    renderScoreTable(lastScoreTableData);
    updateBulkScoreStatus("ล็อกช่องที่มีคะแนนแล้ว: " + (lockScoredScores ? "เปิด" : "ปิด"));
  }
}

// ======================================
// ซ่อน / แสดงคะแนนในตาราง
// ======================================
function toggleHideScores(){

  const checkbox =
    document.getElementById("hideScoresToggle");

  hideScoreValues =
    checkbox ? checkbox.checked : true;

  localStorage.setItem(
    HIDE_SCORES_STORAGE_KEY,
    hideScoreValues ? "true" : "false"
  );

  if(lastScoreTableData){
    renderScoreTable(lastScoreTableData);
    updateBulkScoreStatus("ซ่อนคะแนนในตาราง: " + (hideScoreValues ? "เปิด" : "ปิด"));
  }
}

function getAssignmentStorageKey(assignment){

  const keySource =
    assignment && assignment.url
    ? assignment.url
    : (assignment && assignment.topic ? assignment.topic : "");

  return FULL_SCORE_STORAGE_KEY_PREFIX + String(keySource || "");
}

function getFullScoreForAssignment(assignment){

  if(!assignment){
    return "";
  }

  const fromMain =
    String(assignment.fullScore || "").trim();

  if(fromMain !== ""){
    return fromMain;
  }

  return localStorage.getItem(
    getAssignmentStorageKey(assignment)
  ) || "";
}

function setFullScoreForAssignment(assignmentIndex, value){

  if(!lastScoreTableData || !Array.isArray(lastScoreTableData.assignments)){
    return;
  }

  const assignment =
    lastScoreTableData.assignments[assignmentIndex];

  if(!assignment){
    return;
  }

  const cleaned =
    String(value || "").trim();

  assignment.fullScore = cleaned;

  const storageKey =
    getAssignmentStorageKey(assignment);

  if(cleaned === ""){
    localStorage.removeItem(storageKey);
  } else {
    localStorage.setItem(storageKey, cleaned);
  }

  fetch(API_URL + "?action=updateAssignmentSettings", {
    method: "POST",
    body: JSON.stringify({
      url: assignment.url || "",
      fullScore: cleaned,
      assignedClasses: assignment.assignedClasses || ""
    })
  })
  .then(res => res.json())
  .then(response => {
    if(response.status !== "success"){
      updateBulkScoreStatus("⚠️ คะแนนเต็มแสดงในเครื่องนี้แล้ว แต่บันทึกลงชีท Main ไม่สำเร็จ: " + (response.message || ""));
    }
  })
  .catch(error => {
    console.error(error);
    updateBulkScoreStatus("⚠️ คะแนนเต็มแสดงในเครื่องนี้แล้ว แต่ยังบันทึกลงชีท Main ไม่สำเร็จ");
  });

  const inputs =
    document.querySelectorAll(
      `.score-input[data-assignment-index="${CSS.escape(String(assignmentIndex))}"]`
    );

  inputs.forEach(input => {
    input.setAttribute("data-full-score", cleaned);

    if(cleaned !== "" && input.value !== ""){
      if(clampInputScoreToFullScore(input)){
        markScoreChanged(input);
      }
    }
  });
}


  // ======================================
// จำคะแนนที่มีการแก้ไข
// ======================================
function markScoreChanged(input){

  const key =
    input.getAttribute("data-key");

  const overrideScore =
    input.getAttribute("data-score-override");

  if(!overrideScore){
    clampInputScoreToFullScore(input);
  }

  const adjustInput =
    document.getElementById("adjust_input_" + key);

  const isGroupInput =
    input.getAttribute("data-is-group") === "true";

  const scoreValue =
    overrideScore ||
    (
      isGroupInput &&
      input.value === "" &&
      input.getAttribute("data-group-score-original")
        ? input.getAttribute("data-group-score-original")
        : input.value
    );

  changedScoreMap[key] = {
    url: input.getAttribute("data-url"),
    rowIndex: input.getAttribute("data-row-index"),
    studentId: input.getAttribute("data-student-id"),
    score: scoreValue,
    isGroup: isGroupInput,
    individualAdjustment: adjustInput ? adjustInput.value : input.getAttribute("data-individual-adjustment")
  };

  input.classList.add("changed-score");
}

// ======================================
// เติมตัวเลือกงานสำหรับให้คะแนนหลายคนพร้อมกัน
// ======================================
function populateBulkAssignmentOptions(data){
  // เปลี่ยนเป็นเลือกงานโดยคลิกหัวตารางแทน dropdown แล้ว
}
// ======================================
// ใส่คะแนนเดียวกันให้ผู้ที่ส่งงานแล้วในงานที่เลือก
// ======================================
function applyBulkScoreToColumn(){

  const statusBox =
    document.getElementById("bulkScoreStatus");

  updateBulkScoreStatus("กรุณาเลือกช่องคะแนนก่อน");
}
// ======================================
// บันทึกคะแนนทั้งหมดที่แก้ลงชีตงานจริง
// ======================================
function saveAllScoreChanges(){

  const statusBox =
    document.getElementById("bulkScoreStatus");

  const updates =
    Object.values(changedScoreMap);

  if(updates.length === 0){
    statusBox.innerHTML =
      `<div class="status-box">
        ยังไม่มีคะแนนที่แก้ไข
      </div>`;
    return;
  }

  const selectedWorkCount =
    selectedAssignmentIndexes.size;

  const selectedScoreCount =
    getSelectedScoreCount();

  const confirmed =
    confirm(
      "ยืนยันบันทึกคะแนนลงชีตหรือไม่?\n\n" +
      "งานที่เลือก: " + selectedWorkCount + " งาน\n" +
      "คน/ช่องคะแนนที่เลือก: " + selectedScoreCount + " ช่อง\n" +
      "รายการที่มีการแก้ไขจริง: " + updates.length + " รายการ"
    );

  if(!confirmed){
    updateBulkScoreStatus("ยกเลิกการบันทึกคะแนนแล้ว");
    return;
  }

  statusBox.innerHTML =
    `<div class="status-box">
      กำลังบันทึกคะแนน ${updates.length} รายการ...
    </div>`;

  fetch(
    API_URL + "?action=batchUpdateScores",
    {
      method: "POST",
      body: JSON.stringify({
        updates: updates
      })
    }
  )

  .then(res => res.json())

  .then(response => {

    if(response.status !== "success"){

      statusBox.innerHTML =
        `<div class="status-box">
          ❌ บันทึกไม่สำเร็จ:
          ${escapeHtml(response.message || "เกิดข้อผิดพลาด")}
        </div>`;

      return;
    }

    statusBox.innerHTML =
      `<div class="status-box">
        ✅ บันทึกสำเร็จ
        ${escapeHtml(response.data.successCount)} รายการ
        ${
          response.data.failCount
          ? ` | ไม่สำเร็จ ${escapeHtml(response.data.failCount)} รายการ`
          : ``
        }
      </div>`;

    changedScoreMap = {};
    selectedAssignmentIndexes.clear();

    loadScoreTable();
  })

  .catch(error => {

    console.error(error);

    statusBox.innerHTML =
      `<div class="status-box">
        ❌ เชื่อมต่อ API ไม่สำเร็จ
      </div>`;
  });
}
// ======================================
// แสดงค่าในช่องคะแนน
// ======================================
function renderScoreCell(cell){

  if(cell.status === "scored"){
    return `
      <span class="score-value">
        ${escapeHtml(cell.score)}
      </span>
    `;
  }

  if(cell.status === "pending"){
    return `
      <span class="score-pending">
        รอตรวจ
      </span>
    `;
  }

  if(cell.status === "error"){
    return `
      <span class="score-error">
        เปิดชีตไม่ได้
      </span>
    `;
  }

  return `
    <span class="score-missing">
      ยังไม่ส่ง
    </span>
  `;
}
function selectScoreCellsByAssignment(assignmentIndex){
  toggleScoreCellsByAssignment(assignmentIndex);
}

function toggleScoreCellsByAssignment(assignmentIndex){

  const statusBox =
    document.getElementById("bulkScoreStatus");

  if(
    assignmentIndex === "" ||
    assignmentIndex === null ||
    assignmentIndex === undefined
  ){
    statusBox.innerHTML =
      `<div class="status-box">❌ กรุณาคลิกชื่องานบนหัวตารางก่อน</div>`;
    return;
  }

  assignmentIndex = String(assignmentIndex);

  const willSelect =
    !selectedAssignmentIndexes.has(assignmentIndex);

  const checks =
    document.querySelectorAll(
      `.score-check[data-assignment-index="${CSS.escape(assignmentIndex)}"]`
    );

  checks.forEach(check => {

    check.checked = willSelect;

    const inputId =
      check.getAttribute("data-input-id");

    const input =
      document.getElementById(inputId);

    if(input){
      input.classList.toggle("selected-score-cell", willSelect);
    }
  });

  updateSelectedAssignmentsFromChecks();
  updateBulkScoreStatus("");
}

function downloadScoreTableImage(){

  if(!lastScoreTableData){
    alert("กรุณาโหลดตารางคะแนนก่อน");
    return;
  }

  const assignments =
    Array.isArray(lastScoreTableData.assignments)
    ? lastScoreTableData.assignments
    : [];

  const students =
    Array.isArray(lastScoreTableData.students)
    ? lastScoreTableData.students
    : [];

  if(assignments.length === 0 || students.length === 0){
    alert("ไม่มีข้อมูลสำหรับสร้างรูปภาพ");
    return;
  }

  const headers = [
    "เลขที่",
    "ห้อง",
    "รหัส",
    "ชื่อ",
    ...assignments.map(a => a.topic || "")
  ];

  const rows = students.map(student => {

    const row = [
      student.no || "",
      student.class || "",
      student.id || "",
      student.name || ""
    ];

    assignments.forEach((assignment, index) => {

      const cell =
        Array.isArray(student.scores)
        ? student.scores[index]
        : null;

      row.push(getScoreTextForImage(cell));
    });

    return row;
  });

  drawTableImage(headers, rows);
}


function getScoreTextForImage(cell){

  if(!cell){
    return "ยังไม่ส่ง";
  }

  if(cell.status === "scored"){
    return cell.isLate
      ? "ให้คะแนนแล้ว(ส่งช้า)"
      : "ให้คะแนนแล้ว";
  }

  if(cell.status === "checked"){
    return cell.isLate
      ? "ตรวจแล้ว(ส่งช้า)"
      : "ตรวจแล้ว";
  }

  if(cell.status === "pending"){
    return cell.isLate
      ? "ส่งช้า"
      : "";
  }

  if(cell.status === "error"){
    return "เปิดชีตไม่ได้";
  }

  return "ยังไม่ส่ง";
}



function drawTableImage(headers, rows){

  const padding = 18;
  const rowHeight = 42;
  const fontSize = 18;
  const titleHeight = 60;

  const colWidths = headers.map((header, colIndex) => {

    let maxLength = String(header).length;

    rows.forEach(row => {
      maxLength = Math.max(
        maxLength,
        String(row[colIndex] || "").length
      );
    });

    return Math.min(
      Math.max(maxLength * 12 + 30, 90),
      260
    );
  });

  const tableWidth =
    colWidths.reduce((sum, w) => sum + w, 0);

  const canvas = document.createElement("canvas");

  canvas.width = tableWidth + padding * 2;
  canvas.height =
    titleHeight +
    rowHeight * (rows.length + 1) +
    padding * 2;

  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#000000";
  ctx.font = "bold 22px Arial";
  ctx.fillText(
    "ตารางคะแนนรายงาน",
    padding,
    38
  );

  ctx.font = `${fontSize}px Arial`;
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = 1;

  let y = titleHeight;

  drawImageRow(ctx, headers, colWidths, padding, y, rowHeight, true);

  y += rowHeight;

  rows.forEach(row => {
    drawImageRow(ctx, row, colWidths, padding, y, rowHeight, false);
    y += rowHeight;
  });

  const link = document.createElement("a");

  const level =
    document.getElementById("scoreLevel").value || "score";

  const className =
    document.getElementById("scoreClass").value || "all";

  link.download =
    "ScoreTable_" +
    level.replace(/[^\wก-๙]/g, "") +
    "_" +
    className.replace(/[^\wก-๙]/g, "") +
    ".png";

  link.href = canvas.toDataURL("image/png");
  link.click();
}


function drawImageRow(ctx, row, colWidths, x, y, rowHeight, isHeader){

  let currentX = x;

  row.forEach((cell, index) => {

    ctx.fillStyle = isHeader ? "#e6e6e6" : "#ffffff";
    ctx.fillRect(currentX, y, colWidths[index], rowHeight);

    ctx.strokeStyle = "#000000";
    ctx.strokeRect(currentX, y, colWidths[index], rowHeight);

    ctx.fillStyle = "#000000";
    ctx.font = isHeader ? "bold 18px Arial" : "18px Arial";

    const text = String(cell || "");

    ctx.fillText(
      text.length > 22 ? text.substring(0, 22) + "..." : text,
      currentX + 8,
      y + 27
    );

    currentX += colWidths[index];
  });
}

// ===== END 07-score-table.js =====
