// ============================================================
// student.js
// รวมโค้ดฝั่งนักเรียน: dashboard, refresh, filtering, submit modal, group submit
// Source files: 06-student-dashboard.js, 08-student-submit.js
// ============================================================

// ===== BEGIN 06-student-dashboard.js =====
function formatTimestamp(value){

  if(!value){
    return "-";
  }

  const date = new Date(value);

  if(isNaN(date.getTime())){
    return String(value);
  }

  return new Intl.DateTimeFormat("th-TH", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}
// ======================================
// โหลดงานและคะแนนของนักเรียนที่ล็อกอิน
// ======================================
function loadMyWork(){

  const statusBox =
    document.getElementById("myWorkStatus");

  const workBox =
    document.getElementById("myWork");

  statusBox.innerHTML =
    `<div class="status-box">กำลังโหลดข้อมูลงานของคุณ...</div>`;

  workBox.innerHTML = "";

  fetch(
    API_URL
    + "?action=myWork"
    + "&studentId="
    + encodeURIComponent(currentStudentId)
  )

  .then(res => res.json())

  .then(response => {

    if(
      response.status !== "success" ||
      !Array.isArray(response.data)
    ){

      statusBox.innerHTML =
        `<div class="status-box">
          ❌ โหลดข้อมูลไม่สำเร็จ:
          ${escapeHtml(response.message || "รูปแบบข้อมูลไม่ถูกต้อง")}
        </div>`;

      return;
    }

    const data = response.data;

    currentMyWorkData = data;
    selectedMyWorkIndex = null;

    if(data.length === 0){

      statusBox.innerHTML =
        `<div class="status-box">
          ยังไม่พบข้อมูลงานที่ส่งของคุณ
        </div>`;

      return;
    }

    statusBox.innerHTML = "";

    renderMyWorkCards(data);
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
// แสดงรายการงานของนักเรียน
// ทั้ง "ส่งแล้ว" และ "ยังไม่ได้ส่ง"
// ======================================
function renderMyWorkCards(data){

  const workBox =
    document.getElementById("myWork");

  const allData =
    Array.isArray(data)
    ? data
    : [];

  currentMyWorkData = allData;

  let html = "";

  const missingItems =
    allData
      .map((item, index) => ({ item, index }))
      .filter(entry => entry.item.status !== "submitted");

  if(missingItems.length > 0){
    html += `
      <div class="status-box student-announcement">
        <h3>ป้ายประกาศงานที่ยังไม่ได้ส่ง</h3>
        <ul>
          ${missingItems.map(entry => `
            <li>
              <button
                type="button"
                onclick="showSingleMyWork(${entry.index})"
                title="กดเพื่อดูงานนี้"
              >
                ${entry.item.isOverdue ? `<span class="overdue-label">เลยกำหนด</span>` : ``}
                ${escapeHtml(entry.item.topic || "")}
                ${entry.item.dueDate ? ` | กำหนดส่ง: ${escapeHtml(formatTimestamp(entry.item.dueDate))}` : ``}
              </button>
            </li>
          `).join("")}
        </ul>
      </div>
    `;
  }

  updateStudentMenuCounts(allData);

  const filteredData =
    allData
      .map((item, index) => ({ item, index }))
      .filter(entry => {
        const filter = String(currentStudentWorkFilter || "all");

        if(filter === "missing"){
          return entry.item.status !== "submitted";
        }

        if(filter === "submitted"){
          return entry.item.status === "submitted";
        }

        if(filter === "returned"){
          return String(entry.item.returnStatus || "").trim() ||
            String(entry.item.returnNote || "").trim();
        }

        if(filter === "revised"){
          return String(entry.item.revisionStatus || "").trim() ||
            String(entry.item.revisionTimestamp || "").trim() ||
            String(entry.item.revisionNote || "").trim();
        }

        return true;
      });

  const displayData =
    selectedMyWorkIndex === null
    ? filteredData
    : allData
        .map((item, index) => ({ item, index }))
        .filter(entry => entry.index === selectedMyWorkIndex);

  if(displayData.length === 0){
    const labels = {
      all: "งานทั้งหมด",
      missing: "งานที่ยังไม่ได้ส่ง",
      submitted: "งานที่ส่งแล้ว",
      returned: "งานที่ถูกส่งคืน",
      revised: "งานที่แก้ไขแล้ว"
    };

    html += `
      <div class="status-box">
        ยังไม่มีรายการในหมวด ${escapeHtml(labels[currentStudentWorkFilter] || "งานทั้งหมด")}
      </div>
    `;
  }

  displayData.forEach(entry => {

    const item =
      entry.item;

    const index =
      entry.index;

    const isSubmitted =
      item.status === "submitted";

    const scoreText =
      String(item.score ?? "").trim();

    const isCheckedOnly =
      scoreText === "ตรวจแล้ว";

    const canDelete =
      isSubmitted &&
      !scoreText &&
      item.sheetUrl &&
      item.rowIndex;

    const studentScoreStatus =
      isSubmitted
        ? (
            scoreText
              ? (isCheckedOnly ? "ตรวจแล้ว" : "ให้คะแนนแล้ว")
              : "ยังไม่ได้ตรวจ"
          )
        : "";

    const scoreStatusHtml =
      isSubmitted
      ? `
        <div class="work-status ${scoreText ? "submitted-status" : "missing-status"}">
          ${escapeHtml(studentScoreStatus)}
        </div>
      `
      : ``;

    const worksheetHtml =
      renderMyWorkWorksheet(item, isSubmitted, index);

    html += `

      <div class="card" id="myWorkCard_${index}">

        ${
          canDelete
          ? `
            <button
              type="button"
              class="student-delete-button"
              title="ลบงาน"
              onclick="deleteMySubmission(
                '${escapeJsString(item.sheetUrl || "")}',
                '${escapeJsString(item.rowIndex || "")}',
                '${escapeJsString(item.submitMode || "งานเดี่ยว")}'
              )"
            >
              🗑
            </button>
          `
          : ``
        }

        <h3>
          ${!isSubmitted && item.isOverdue ? `<span class="overdue-label">เลยกำหนด</span>` : ``}
          ${escapeHtml(item.topic || "")}
        </h3>

        <div class="work-status ${isSubmitted ? "submitted-status" : "missing-status"}">
          ${isSubmitted ? "✅ ส่งแล้ว" : "❌ ยังไม่ได้ส่ง"}
        </div>

        ${scoreStatusHtml}

        ${worksheetHtml}

        ${
          isSubmitted
          ? `
            <div class="meta">
              <div>ห้อง: ${escapeHtml(item.class || "")}</div>
              ${
                item.submitMode === "งานกลุ่ม"
                ? `<div>กลุ่ม: ${escapeHtml(item.groupName || "-")}</div>
                   <div>ผู้ส่งงานกลุ่ม: ${escapeHtml(item.submitterName || item.name || "-")}</div>`
                : `<div>เลขที่: ${escapeHtml(item.no || "")}</div>`
              }
              <div>เวลาส่งงาน: ${escapeHtml(formatTimestamp(item.timestamp))}</div>
              ${item.isLate ? `<div class="score-late">ส่งช้า</div>` : ``}
            </div>

            <div class="work-box">
              <h4>งานที่ส่ง</h4>
              ${renderWorkContent(item.work)}
            </div>
          `
          : `
            <div class="meta">
              <div>ห้อง: ${escapeHtml(item.class || "")}</div>
              <div>เลขที่: ${escapeHtml(item.no || "")}</div>
              ${item.dueDate ? `<div>กำหนดส่ง: ${escapeHtml(formatTimestamp(item.dueDate))}</div>` : ``}
            </div>

            <div class="work-box">
              <p class="empty-text">
                ยังไม่พบการส่งงานของคุณในหัวข้อนี้
              </p>
            </div>
          `
        }

      </div>
    `;
  });

  workBox.innerHTML = html;

  if(
    selectedMyWorkIndex !== null &&
    document.getElementById("myWorkCard_" + selectedMyWorkIndex)
  ){
    document
      .getElementById("myWorkCard_" + selectedMyWorkIndex)
      .scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
  }
}

function showSingleMyWork(index){

  selectedMyWorkIndex =
    Number(index);

  renderMyWorkCards(currentMyWorkData);
}

function showAllMyWork(){

  selectedMyWorkIndex = null;

  renderMyWorkCards(currentMyWorkData);

  const workBox =
    document.getElementById("myWork");

  if(workBox){
    workBox.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }
}

function renderMyWorkWorksheet(item, isSubmitted, index){

  const worksheetUrl =
    String(item.worksheetUrl || "").trim();

  const worksheetVisible =
    item.worksheetVisible === false ||
    String(item.worksheetVisible || "").trim() === "false"
      ? false
      : true;

  const worksheetId =
    "myWorksheet_" + index;

  const canShowWorksheet =
    worksheetUrl && worksheetVisible;

  const startVisible =
    canShowWorksheet && !isSubmitted;

  let buttons = `
    <div class="student-work-actions">
  `;

  if(canShowWorksheet){
    buttons += `
      <button
        type="button"
        class="my-worksheet-toggle"
        onclick="toggleMyWorksheet('${escapeJsString(worksheetId)}', this)"
      >
        ${startVisible ? "ซ่อนใบงาน" : "แสดงใบงาน"}
      </button>
    `;
  }

  if(!isSubmitted){
    buttons += `
      <button
        type="button"
        onclick="openStudentSubmitModalByIndex(${index})"
      >
        ส่งงาน
      </button>
    `;
  } else if(item.canRevise){
    buttons += `
      <button
        type="button"
        onclick="openStudentSubmitModalByIndex(${index})"
      >
        ส่งงานแก้ไข
      </button>
    `;
  }

  buttons += `</div>`;

  if(!canShowWorksheet){
    return buttons;
  }

  return `
    ${buttons}
    <div
      id="${escapeAttribute(worksheetId)}"
      class="work-box student-worksheet-box"
      style="display:${startVisible ? "block" : "none"};"
    >
      <h4>ใบงาน / เอกสารประกอบ</h4>
      ${renderWorksheetContent(worksheetUrl)}
    </div>
  `;
}

function toggleMyWorksheet(id, button){

  const box =
    document.getElementById(id);

  if(!box){
    return;
  }

  const willShow =
    box.style.display === "none" || box.style.display === "";

  box.style.display = willShow ? "block" : "none";

  if(button){
    button.textContent = willShow ? "ซ่อนใบงาน" : "แสดงใบงาน";
  }
}

function openStudentSubmitModalByIndex(index){

  const item =
    Array.isArray(currentMyWorkData)
    ? currentMyWorkData[Number(index)]
    : null;

  if(!item){
    alert("ไม่พบข้อมูลงาน");
    return;
  }

  openStudentSubmitModal(
    item.sheetUrl || "",
    item.topic || "",
    item.workType || item.submitMode || "งานเดี่ยว",
    item.worksheetUrl || "",
    item.worksheetVisible === false ? "false" : "true",
    item
  );
}

function getMaxGroupMembersForCurrentSubmit(){

  const raw =
    currentSubmitWorkItem && (
      currentSubmitWorkItem.maxGroupMembers ||
      currentSubmitWorkItem.groupMaxMembers ||
      currentSubmitWorkItem.maxMembers
    );

  const value = Number(String(raw || "").trim());

  if(Number.isFinite(value) && value > 0){
    return Math.floor(value);
  }

  return Number(DEFAULT_MAX_GROUP_MEMBERS || 0);
}

function getGroupMemberLimitText(){
  const limit = getMaxGroupMembersForCurrentSubmit();
  return limit > 0 ? `จำกัดสมาชิกไม่เกิน ${limit} คน รวมผู้ส่งงาน` : "ไม่จำกัดจำนวนสมาชิก";
}


function isFixedGroupAssignmentForCurrentSubmit(){

  const workType =
    currentSubmitWorkItem
      ? String(currentSubmitWorkItem.workType || currentSubmitWorkItem.submitMode || "").trim()
      : "";

  return workType === "งานกลุ่ม";
}

function getFixedGroupMembersForCurrentSubmit(){

  const members =
    currentSubmitWorkItem &&
    Array.isArray(currentSubmitWorkItem.groupMembers)
      ? currentSubmitWorkItem.groupMembers
      : [];

  const normalized = [];

  members.forEach(member => {

    if(!member || !member.id){
      return;
    }

    const exists =
      normalized.some(item =>
        String(item.id || "").trim() === String(member.id || "").trim()
      );

    if(!exists){
      normalized.push({
        id: String(member.id || "").trim(),
        name: String(member.name || "").trim(),
        no: String(member.no || "").trim(),
        className: String(member.className || member.class || currentStudentClass || "").trim(),
        photoUrl: String(member.photoUrl || "").trim(),
        studentOrder: String(member.studentOrder || "").trim(),
        status: String(member.status || "").trim()
      });
    }
  });

  if(normalized.length === 0){
    normalized.push({
      id: currentStudentId,
      name: currentStudentName,
      no: currentStudentNo,
      className: currentStudentClass,
      status: ""
    });
  }

  return normalized.sort((a, b) =>
    String(a.studentOrder || calculateStudentOrder(a.className, a.no) || a.no || a.name || a.id)
      .localeCompare(
        String(b.studentOrder || calculateStudentOrder(b.className, b.no) || b.no || b.name || b.id),
        "th",
        { numeric: true }
      )
  );
}

function getGroupCandidateMembersFromSubmitItem(){

  const candidates =
    currentSubmitWorkItem &&
    Array.isArray(currentSubmitWorkItem.groupCandidateMembers)
      ? currentSubmitWorkItem.groupCandidateMembers
      : [];

  const normalized = [];

  candidates.forEach(member => {
    if(!member || !member.id){
      return;
    }

    const exists =
      normalized.some(item =>
        String(item.id || "").trim() === String(member.id || "").trim()
      );

    if(!exists){
      normalized.push({
        id: String(member.id || "").trim(),
        name: String(member.name || "").trim(),
        no: String(member.no || "").trim(),
        className: String(member.className || member.class || currentStudentClass || "").trim(),
        photoUrl: String(member.photoUrl || "").trim(),
        studentOrder: String(member.studentOrder || "").trim()
      });
    }
  });

  const hasCurrentStudent =
    normalized.some(member =>
      String(member.id || "").trim() === String(currentStudentId || "").trim()
    );

  if(!hasCurrentStudent){
    normalized.unshift({
      id: currentStudentId,
      name: currentStudentName,
      no: currentStudentNo,
      className: currentStudentClass
    });
  }

  return normalized.sort((a, b) =>
    String(a.studentOrder || calculateStudentOrder(a.className, a.no) || a.no || a.name || a.id)
      .localeCompare(
        String(b.studentOrder || calculateStudentOrder(b.className, b.no) || b.no || b.name || b.id),
        "th",
        { numeric: true }
      )
  );
}

function getGroupMembersFromSubmitItem(){

  const fixedMembers =
    currentSubmitWorkItem &&
    Array.isArray(currentSubmitWorkItem.groupMembers) &&
    currentSubmitWorkItem.groupMembers.length > 0
      ? currentSubmitWorkItem.groupMembers
      : [];

  if(fixedMembers.length > 0){
    return fixedMembers;
  }

  return getGroupCandidateMembersFromSubmitItem()
    .filter(member =>
      String(member.id || "").trim() === String(currentStudentId || "").trim()
    );
}

function getCandidateMemberById(memberId){

  const id =
    String(memberId || "").trim();

  return getGroupCandidateMembersFromSubmitItem()
    .find(member => String(member.id || "").trim() === id) || null;
}

function getCurrentGroupMemberRows(){

  const rows =
    Array.from(document.querySelectorAll(".group-member-select-row"));

  return rows.map((row, index) => {

    const select =
      row.querySelector(".group-member-select");

    const selectedId =
      select ? String(select.value || "").trim() : "";

    const selectedStatus =
      row.querySelector(`input[name="groupMemberStatus_${index}"]:checked`);

    return {
      id: selectedId,
      status: selectedStatus ? selectedStatus.value : ""
    };
  });
}

function buildGroupMemberSelectOptions(selectedId, locked){

  const candidates =
    getGroupCandidateMembersFromSubmitItem();

  let html =
    locked ? "" : `<option value="">-- เลือกสมาชิก --</option>`;

  candidates.forEach(member => {

    const label =
      `${member.no ? "เลขที่ " + member.no + " " : ""}${member.name || member.id}`;

    html += `
      <option
        value="${escapeAttribute(member.id || "")}"
        ${String(member.id || "").trim() === String(selectedId || "").trim() ? "selected" : ""}
      >
        ${escapeHtml(label)}
      </option>
    `;
  });

  return html;
}

function buildGroupMemberRowHtml(rowData, index, locked, fixedMode){

  const selectedId =
    String(rowData && rowData.id ? rowData.id : "").trim();

  const selectedStatus =
    String(rowData && rowData.status ? rowData.status : "").trim();

  const member =
    fixedMode
      ? (rowData || getCandidateMemberById(selectedId) || {})
      : getCandidateMemberById(selectedId);

  const fixedLabel =
    `${member && member.no ? "เลขที่ " + member.no + " " : ""}${member && member.name ? member.name : selectedId}`;

  return `
    <div class="group-assessment-row group-member-select-row" data-row-index="${escapeAttribute(index)}">
      <label>${fixedMode ? "สมาชิกกลุ่มที่กำหนดไว้" : (locked ? "ผู้ส่งงาน" : "สมาชิกกลุ่ม")}</label>

      ${
        fixedMode
          ? `
            <div class="group-fixed-member-name">
              ${escapeHtml(fixedLabel || "-")}
              <span class="group-fixed-member-badge">ดึงจากกลุ่มที่ครูกำหนด</span>
            </div>
            <input type="hidden" class="group-member-fixed-id" value="${escapeAttribute(selectedId)}">
          `
          : `
            <select
              class="group-member-select"
              onchange="refreshGroupMemberDuplicateRules()"
              ${locked ? "disabled" : ""}
            >
              ${buildGroupMemberSelectOptions(selectedId, locked)}
            </select>

            ${locked ? `<input type="hidden" class="group-member-fixed-id" value="${escapeAttribute(selectedId)}">` : ``}
          `
      }

      <div class="group-assessment-options">
        <label>
          <input type="radio" name="groupMemberStatus_${index}" value="ช่วยงานเต็มที่" ${selectedStatus === "ช่วยงานเต็มที่" ? "checked" : ""}>
          ช่วยงานเต็มที่
        </label>
        <label>
          <input type="radio" name="groupMemberStatus_${index}" value="ช่วยบางส่วน" ${selectedStatus === "ช่วยบางส่วน" ? "checked" : ""}>
          ช่วยบางส่วน
        </label>
        <label>
          <input type="radio" name="groupMemberStatus_${index}" value="ไม่ช่วยงาน" ${selectedStatus === "ไม่ช่วยงาน" ? "checked" : ""}>
          ไม่ช่วยงาน
        </label>
      </div>

      ${
        locked || fixedMode
          ? ``
          : `<button type="button" onclick="removeGroupMemberRow(${index})">ลบสมาชิกนี้</button>`
      }
    </div>
  `;
}

function renderGroupMemberRows(rows, fixedMode){

  const rowsBox =
    document.getElementById("groupMemberRows");

  if(!rowsBox){
    return;
  }

  const initialRows =
    Array.isArray(rows) && rows.length > 0
      ? rows
      : [{ id: currentStudentId, status: "" }];

  const hasCurrentStudent =
    initialRows.some(row =>
      String(row.id || "").trim() === String(currentStudentId || "").trim()
    );

  const normalizedRows =
    hasCurrentStudent
      ? initialRows
      : [{ id: currentStudentId, status: "" }, ...initialRows];

  const maxMembers = getMaxGroupMembersForCurrentSubmit();
  const limitedRows =
    maxMembers > 0 && normalizedRows.length > maxMembers
      ? normalizedRows.slice(0, maxMembers)
      : normalizedRows;

  rowsBox.innerHTML =
    limitedRows.map((row, index) =>
      buildGroupMemberRowHtml(row, index, index === 0, fixedMode === true)
    ).join("");

  if(fixedMode === true){
    return;
  }

  refreshGroupMemberDuplicateRules();
}

function addGroupMemberRow(){

  const rows =
    getCurrentGroupMemberRows();

  const maxMembers = getMaxGroupMembersForCurrentSubmit();

  if(maxMembers > 0 && rows.length >= maxMembers){
    alert("เพิ่มสมาชิกไม่ได้ เนื่องจากกำหนดสมาชิกกลุ่มสูงสุดไว้ไม่เกิน " + maxMembers + " คน รวมผู้ส่งงาน");
    return;
  }

  rows.push({
    id: "",
    status: ""
  });

  renderGroupMemberRows(rows);
}

function removeGroupMemberRow(index){

  const rows =
    getCurrentGroupMemberRows();

  const filtered =
    rows.filter((row, rowIndex) => rowIndex !== Number(index));

  renderGroupMemberRows(filtered);
}

function refreshGroupMemberDuplicateRules(){

  const selects =
    Array.from(document.querySelectorAll(".group-member-select"));

  const selectedIds =
    selects
      .map(select => String(select.value || "").trim())
      .filter(Boolean);

  selects.forEach(select => {

    const ownValue =
      String(select.value || "").trim();

    Array.from(select.options).forEach(option => {

      const optionValue =
        String(option.value || "").trim();

      if(!optionValue || optionValue === ownValue){
        option.disabled = false;
        return;
      }

      option.disabled = selectedIds.includes(optionValue);
    });
  });
}

function renderGroupAssessmentBox(workType){

  const box =
    document.getElementById("groupAssessmentBox");

  if(!box){
    return;
  }

  const normalizedWorkType =
    String(workType || "").trim();

  if(normalizedWorkType !== "งานกลุ่ม"){
    box.style.display = "none";
    box.innerHTML = "";
    return;
  }

  const fixedMode =
    isFixedGroupAssignmentForCurrentSubmit();

  const fixedMembers =
    fixedMode
      ? getFixedGroupMembersForCurrentSubmit()
      : [];

  const candidates =
    getGroupCandidateMembersFromSubmitItem();

  box.style.display = "block";
  box.innerHTML = `
    <h4>${fixedMode ? "สมาชิกกลุ่มที่ครูกำหนดไว้" : "เลือกสมาชิกกลุ่มและประเมินการทำงานกลุ่ม"}</h4>
    <div class="empty-text">
      ${
        fixedMode
          ? "ระบบดึงรายชื่อจากชีท Groups นักเรียนไม่ต้องเลือกชื่อเพื่อน"
          : "สำหรับงานเลือกส่งแบบกลุ่ม นักเรียนเลือกสมาชิกห้องเดียวกันได้ และระบบจะไม่ให้เลือกชื่อซ้ำ"
      }
    </div>
    <div class="group-member-limit-note">
      ${escapeHtml(getGroupMemberLimitText())}
    </div>

    <div id="groupMemberRows"></div>

    ${
      fixedMode
        ? ``
        : `<button type="button" onclick="addGroupMemberRow()">เพิ่มสมาชิกกลุ่ม</button>`
    }

    <label>หมายเหตุถึงครู</label>
    <textarea
      id="groupTeacherNote"
      class="teacher-note-textarea"
      placeholder="พิมพ์หมายเหตุถึงครู เช่น ใครช่วยงานส่วนไหน หรือปัญหาในการทำงานกลุ่ม"
    ></textarea>
  `;

  if(fixedMode){
    renderGroupMemberRows(fixedMembers, true);
    return;
  }

  const startingRows =
    candidates.some(member => String(member.id || "").trim() === String(currentStudentId || "").trim())
      ? [{ id: currentStudentId, status: "" }]
      : [{ id: currentStudentId, status: "" }];

  renderGroupMemberRows(startingRows, false);
}

function collectGroupAssessmentBeforeSubmit(submitMode){

  if(String(submitMode || "").trim() !== "งานกลุ่ม"){
    return {
      groupMemberIds: [],
      assessments: [],
      teacherNote: ""
    };
  }

  const rows =
    Array.from(document.querySelectorAll(".group-member-select-row"));

  const ids = [];
  let hasUnselectedStatus = false;

  for(let index = 0; index < rows.length; index++){

    const row =
      rows[index];

    const select =
      row.querySelector(".group-member-select");

    const fixed =
      row.querySelector(".group-member-fixed-id");

    const selectedId =
      String(
        (fixed && fixed.value) ||
        (select && select.value) ||
        ""
      ).trim();

    if(!selectedId){
      alert("กรุณาเลือกสมาชิกกลุ่มให้ครบทุกแถว หรือกดลบแถวที่ไม่ใช้");
      return null;
    }

    ids.push(selectedId);
  }

  const uniqueIds =
    [...new Set(ids)];

  if(uniqueIds.length !== ids.length){
    alert("มีชื่อสมาชิกซ้ำกัน กรุณาเลือกสมาชิกกลุ่มใหม่");
    return null;
  }

  const maxMembers = getMaxGroupMembersForCurrentSubmit();
  if(maxMembers > 0 && uniqueIds.length > maxMembers){
    alert("จำนวนสมาชิกกลุ่มเกินที่กำหนดไว้ ไม่เกิน " + maxMembers + " คน รวมผู้ส่งงาน");
    return null;
  }

  const assessments = [];

  for(let index = 0; index < uniqueIds.length; index++){

    const id =
      uniqueIds[index];

    const member =
      getCandidateMemberById(id);

    if(!member){
      alert("เลือกสมาชิกได้เฉพาะนักเรียนห้องเดียวกันเท่านั้น");
      return null;
    }

    const selected =
      document.querySelector(`input[name="groupMemberStatus_${index}"]:checked`);

    if(!selected){
      hasUnselectedStatus = true;
    }

    assessments.push({
      id: String(member.id || "").trim(),
      name: String(member.name || "").trim(),
      no: String(member.no || "").trim(),
      className: String(member.className || member.class || currentStudentClass || "").trim(),
      status: selected ? selected.value : "ช่วยงานเต็มที่"
    });
  }

  if(hasUnselectedStatus){
    const confirmed =
      confirm(
        "ยังไม่ได้เลือกการทำงานกลุ่มของสมาชิกบางคน\\n\\n" +
        "หากกดยืนยัน ระบบจะตั้งค่าเป็น “ช่วยงานเต็มที่” ให้อัตโนมัติ"
      );

    if(!confirmed){
      return null;
    }
  }

  const noteBox =
    document.getElementById("groupTeacherNote");

  return {
    groupMemberIds: uniqueIds,
    assessments: assessments,
    teacherNote: noteBox ? noteBox.value.trim() : ""
  };
}

function openStudentSubmitModal(sheetUrl, topicTitle, workType, worksheetUrl, worksheetVisible, submitItem){

  const modal =
    document.getElementById("studentSubmitModal");

  const title =
    document.getElementById("studentSubmitModalTitle");

  const topicSelect =
    document.getElementById("submitTopic");

  const textBox =
    document.getElementById("submitWorkText");

  const fileInput =
    document.getElementById("submitFile");

  const statusBox =
    document.getElementById("submitWorkStatus");

  if(!modal || !topicSelect){
    return;
  }

  currentSubmitWorkItem = submitItem || null;

  let option =
    Array.from(topicSelect.options)
      .find(item => item.value === sheetUrl);

  if(!option){
    option = new Option(topicTitle || "ส่งงาน", sheetUrl);
    option.setAttribute("data-work-type", workType || "งานเดี่ยว");
    option.setAttribute("data-worksheet-url", worksheetUrl || "");
    option.setAttribute("data-worksheet-visible", worksheetVisible === "false" ? "false" : "true");
    topicSelect.appendChild(option);
  }

  topicSelect.value = sheetUrl;

  const isRevision =
    submitItem && submitItem.status === "submitted" && submitItem.canRevise;

  if(title){
    title.textContent = (isRevision ? "ส่งงานแก้ไข: " : "ส่งงาน: ") + (topicTitle || "");
  }

  if(textBox){
    textBox.value = "";
  }

  if(fileInput){
    fileInput.value = "";
  }

  if(statusBox){
    statusBox.innerHTML = "";
  }

  handleSubmitTopicChange();

  const revisionBox = document.getElementById("revisionBox");
  const revisionModeBox = document.getElementById("revisionModeBox");
  const revisionReasonText = document.getElementById("revisionReasonText");
  const revisionNote = document.getElementById("revisionNote");
  const revisionMode = document.getElementById("revisionMode");

  if(revisionBox){
    revisionBox.style.display = isRevision ? "block" : "none";
  }

  if(revisionReasonText){
    revisionReasonText.innerHTML = isRevision
      ? `${submitItem.returnStatus ? "ครูส่งงานคืนให้แก้ไข" : "คะแนนต่ำกว่าครึ่งหนึ่ง จึงสามารถส่งแก้ไขได้"}`
      : "";
  }

  if(revisionNote){
    revisionNote.value = "";
  }

  if(revisionMode){
    revisionMode.value = "group";
  }

  if(revisionModeBox){
    revisionModeBox.style.display =
      isRevision && String(workType || "").trim() === "งานกลุ่ม"
        ? "block"
        : "none";
  }

  if(isRevision){
    renderGroupAssessmentBox("งานเดี่ยว");
  } else {
    renderGroupAssessmentBox(workType || "งานเดี่ยว");
  }

  handleRevisionModeChange();
  modal.style.display = "flex";
}

function handleRevisionModeChange(){

  const revisionMode = document.getElementById("revisionMode");
  const mode = revisionMode ? revisionMode.value : "group";

  if(
    currentSubmitWorkItem &&
    currentSubmitWorkItem.status === "submitted" &&
    currentSubmitWorkItem.canRevise &&
    String(currentSubmitWorkItem.workType || currentSubmitWorkItem.submitMode || "").trim() === "งานกลุ่ม"
  ){
    renderGroupAssessmentBox(mode === "group" ? "งานกลุ่ม" : "งานเดี่ยว");
  }
}

function closeStudentSubmitModal(){

  const modal =
    document.getElementById("studentSubmitModal");

  const topicSelect =
    document.getElementById("submitTopic");

  const textBox =
    document.getElementById("submitWorkText");

  const fileInput =
    document.getElementById("submitFile");

  const statusBox =
    document.getElementById("submitWorkStatus");

  if(modal){
    modal.style.display = "none";
  }

  currentSubmitWorkItem = null;

  const groupAssessmentBox = document.getElementById("groupAssessmentBox");
  if(groupAssessmentBox){
    groupAssessmentBox.style.display = "none";
    groupAssessmentBox.innerHTML = "";
  }

  const revisionBox = document.getElementById("revisionBox");
  if(revisionBox){
    revisionBox.style.display = "none";
  }

  const revisionNote = document.getElementById("revisionNote");
  if(revisionNote){
    revisionNote.value = "";
  }

  if(topicSelect){
    topicSelect.value = "";
    handleSubmitTopicChange();
  }

  if(textBox){
    textBox.value = "";
  }

  if(fileInput){
    fileInput.value = "";
  }

  if(statusBox){
    statusBox.innerHTML = "";
  }
}

function showCustomConfirm(message, onConfirm){

  let modal =
    document.getElementById("customConfirmModal");

  if(!modal){
    modal = document.createElement("div");
    modal.id = "customConfirmModal";
    modal.className = "custom-confirm-modal";
    modal.innerHTML = `
      <div class="custom-confirm-dialog">
        <div id="customConfirmMessage" class="status-box"></div>
        <div class="custom-confirm-actions">
          <button type="button" id="customConfirmYes">ยืนยัน</button>
          <button type="button" id="customConfirmNo">ยกเลิก</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  const messageBox =
    document.getElementById("customConfirmMessage");

  const yesButton =
    document.getElementById("customConfirmYes");

  const noButton =
    document.getElementById("customConfirmNo");

  if(messageBox){
    messageBox.textContent = message;
  }

  modal.style.display = "flex";

  yesButton.onclick = function(){
    modal.style.display = "none";
    if(typeof onConfirm === "function"){
      onConfirm();
    }
  };

  noButton.onclick = function(){
    modal.style.display = "none";
  };
}

function deleteMySubmission(url, rowIndex, workType){

  if(!url || !rowIndex){
    alert("ไม่พบข้อมูลงานที่ต้องการลบ");
    return;
  }

  showCustomConfirm("ยืนยันที่จะลบหรือไม่", function(){

    fetch(API_URL + "?action=studentDeleteSubmission", {
      method: "POST",
      body: JSON.stringify({
        url: url,
        rowIndex: rowIndex,
        studentId: currentStudentId,
        workType: workType || "งานเดี่ยว"
      })
    })

    .then(res => res.json())

    .then(response => {

      if(response.status !== "success"){
        alert("❌ " + (response.message || "ลบงานไม่สำเร็จ"));
        return;
      }

      alert("✅ " + response.message);
      loadMyWork();
    })

    .catch(error => {
      console.error(error);
      alert("❌ เชื่อมต่อ API ไม่สำเร็จ");
    });
  });
}

// ======================================
// โหลดตัวเลือกระดับชั้น / ห้อง
// สำหรับตารางคะแนนรายงาน
// ======================================

// ===== END 06-student-dashboard.js =====

// ===== BEGIN 08-student-submit.js =====
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

  const files =
    fileInput && fileInput.files && fileInput.files.length > 0
      ? Array.from(fileInput.files)
      : [];

  const statusBox =
    document.getElementById("submitWorkStatus");

  const maxFileSizeMB = 5;
  const maxFileSizeBytes = maxFileSizeMB * 1024 * 1024;

  const oversizedFile =
    files.find(file => file.size > maxFileSizeBytes);

  if(oversizedFile){
    statusBox.innerHTML =
      `<div class="status-box">
        ❌ ไฟล์ ${escapeHtml(oversizedFile.name || "")} ใหญ่เกินไป กรุณาเลือกไฟล์ละไม่เกิน ${maxFileSizeMB} MB
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

  if(!work && files.length === 0){
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

  if(files.length > 0){

    Promise
      .all(files.map(file => new Promise((resolve, reject) => {

        const reader = new FileReader();

        reader.onload = function(){
          resolve({
            fileName: file.name,
            mimeType: file.type,
            fileData: reader.result
          });
        };

        reader.onerror = function(){
          reject(new Error("อ่านไฟล์ไม่สำเร็จ: " + (file.name || "")));
        };

        reader.readAsDataURL(file);
      })))
      .then(filePayloads => {
        sendPayload({
          files: filePayloads,
          fileName: filePayloads[0] ? filePayloads[0].fileName : "",
          mimeType: filePayloads[0] ? filePayloads[0].mimeType : "",
          fileData: filePayloads[0] ? filePayloads[0].fileData : ""
        });
      })
      .catch(error => {
        statusBox.innerHTML =
          `<div class="status-box">❌ ${escapeHtml(error.message || "อ่านไฟล์ไม่สำเร็จ กรุณาเลือกไฟล์ใหม่")}</div>`;
      });
  }

  else{
    sendPayload({});
  }
}

// ===== END 08-student-submit.js =====
