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


// ======================================
// เปลี่ยนรายการห้องตามระดับชั้นที่เลือก
// ======================================
function updateScoreClassOptions(){

  const selectedLevel =
    document.getElementById("scoreLevel").value;

  const classSelect =
    document.getElementById("scoreClass");

  let html =
    `<option value="">ทุกห้อง</option>`;

  const selectedData =
    scoreOptionsData.find(item =>
      String(item.level) === String(selectedLevel)
    );

  if(
    selectedData &&
    Array.isArray(selectedData.classes)
  ){
    selectedData.classes.forEach(className => {
      html += `
        <option value="${escapeAttribute(className)}">
          ${escapeHtml(className)}
        </option>
      `;
    });
  }

  classSelect.innerHTML = html;
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
