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

  const sidebar =
    document.getElementById("studentWorkSidebar");

  if(sidebar){
    sidebar.innerHTML = allData.length > 0
      ? `
        <div class="status-box student-toc">
          <button
            type="button"
            class="sidebar-collapse-button"
            onclick="toggleStudentSidebar()"
            title="ย่อ/ขยายสารบัญงาน"
          >
            ☰
          </button>
          <h3>สารบัญงาน</h3>
          <div class="student-toc-list">
            <button
              type="button"
              class="${selectedMyWorkIndex === null ? "active" : ""}"
              onclick="showAllMyWork()"
            >
              หน้าหลักรวมทุกงาน
            </button>

            ${allData.map((item, index) => `
              <button
                type="button"
                class="${selectedMyWorkIndex === index ? "active" : ""}"
                onclick="showSingleMyWork(${index})"
              >
                ${item.status !== "submitted" && item.isOverdue ? "เลยกำหนด " : ""}
                ${escapeHtml(item.topic || "")}
              </button>
            `).join("")}
          </div>
        </div>
      `
      : "";
  }

  const displayData =
    selectedMyWorkIndex === null
    ? allData.map((item, index) => ({ item, index }))
    : allData
        .map((item, index) => ({ item, index }))
        .filter(entry => entry.index === selectedMyWorkIndex);

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

function buildGroupMemberRowHtml(rowData, index, locked){

  const selectedId =
    String(rowData && rowData.id ? rowData.id : "").trim();

  const selectedStatus =
    String(rowData && rowData.status ? rowData.status : "").trim();

  return `
    <div class="group-assessment-row group-member-select-row" data-row-index="${escapeAttribute(index)}">
      <label>${locked ? "ผู้ส่งงาน" : "สมาชิกกลุ่ม"}</label>

      <select
        class="group-member-select"
        onchange="refreshGroupMemberDuplicateRules()"
        ${locked ? "disabled" : ""}
      >
        ${buildGroupMemberSelectOptions(selectedId, locked)}
      </select>

      ${locked ? `<input type="hidden" class="group-member-fixed-id" value="${escapeAttribute(selectedId)}">` : ``}

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
        locked
          ? ``
          : `<button type="button" onclick="removeGroupMemberRow(${index})">ลบสมาชิกนี้</button>`
      }
    </div>
  `;
}

function renderGroupMemberRows(rows){

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

  rowsBox.innerHTML =
    normalizedRows.map((row, index) =>
      buildGroupMemberRowHtml(row, index, index === 0)
    ).join("");

  refreshGroupMemberDuplicateRules();
}

function addGroupMemberRow(){

  const rows =
    getCurrentGroupMemberRows();

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

  const candidates =
    getGroupCandidateMembersFromSubmitItem();

  box.style.display = "block";
  box.innerHTML = `
    <h4>เลือกสมาชิกกลุ่มและประเมินการทำงานกลุ่ม</h4>
    <div class="empty-text">
      เลือกได้เฉพาะนักเรียนห้องเดียวกัน และระบบจะไม่ให้เลือกชื่อซ้ำ
    </div>

    <div id="groupMemberRows"></div>

    <button type="button" onclick="addGroupMemberRow()">
      เพิ่มสมาชิกกลุ่ม
    </button>

    <label>หมายเหตุถึงครู</label>
    <textarea
      id="groupTeacherNote"
      class="teacher-note-textarea"
      placeholder="พิมพ์หมายเหตุถึงครู เช่น ใครช่วยงานส่วนไหน หรือปัญหาในการทำงานกลุ่ม"
    ></textarea>
  `;

  const startingRows =
    candidates.some(member => String(member.id || "").trim() === String(currentStudentId || "").trim())
      ? [{ id: currentStudentId, status: "" }]
      : [{ id: currentStudentId, status: "" }];

  renderGroupMemberRows(startingRows);
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
