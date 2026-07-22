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

  if(selectedLevel && Array.isArray(scoreOptionsData)){

    const foundLevel =
      scoreOptionsData.find(item =>
        normalizeOptionKey(item.level) === normalizeOptionKey(selectedLevel)
      );

    if(foundLevel && Array.isArray(foundLevel.classes)){
      classes = foundLevel.classes;
    }
  }

  let html =
    `<option value="">ทุกห้อง</option>`;

  classes.forEach(className => {
    html += `
      <option value="${escapeAttribute(className)}">
        ${escapeHtml(className)}
      </option>
    `;
  });

  classSelect.innerHTML = html;

  if(oldClassValue){
    const hasOldClass =
      Array.from(classSelect.options)
        .some(option => option.value === oldClassValue);

    if(hasOldClass){
      classSelect.value = oldClassValue;
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

  const autoButton =
    document.getElementById("autoRefreshToggleBtn");

  if(autoButton){
    autoButton.textContent = "⏸ อัปเดตอัตโนมัติ: ปิด";
  }

  const refreshButton =
    document.getElementById("refreshWorkButton");

  if(refreshButton){
    refreshButton.style.display = "none";
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

  }, 30000);
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
      button.textContent = "▶ อัปเดตอัตโนมัติ: เปิด";
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
            assignedClasses: topic.assignedClasses !== undefined ? topic.assignedClasses : (row.assignedClasses || "")
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

  const classes = [
    ...new Set(
      data
        .map(item => String(item.class || "").trim())
        .filter(Boolean)
    )
  ];

  let html = `<option value="">ทุกห้อง</option>`;

  classes.forEach(className => {
    html += `
      <option value="${escapeAttribute(className)}">
        ${escapeHtml(className)}
      </option>
    `;
  });

  classSelect.innerHTML = html;

  classSelect.onchange = renderWorkCards;
  document.getElementById("noFilter").oninput = renderWorkCards;
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

  const saved =
    localStorage.getItem(HIDE_VIEWED_STORAGE_KEY);

  hideViewedWorksEnabled =
    saved === "true";

  const checkbox =
    document.getElementById("hideViewedWorksToggle");

  if(checkbox){
    checkbox.checked = hideViewedWorksEnabled;
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

    alert("✅ ส่งงานคืนแล้ว");
    refreshWorkList();
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

    selectedTeacherWorkKeys.clear();
    refreshWorkList();
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
    selectedTeacherWorkKeys.clear();
    refreshWorkList();
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
    selectedTeacherWorkKeys.clear();
    refreshWorkList();
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
    selectedTeacherWorkKeys.clear();
    refreshWorkList();
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

function renderGroupIndividualScoreEditor(item){

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
  const baseId = makeSafeDomId(itemSheetUrl + "_" + rowIndex);
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

    alert("✅ บันทึกคะแนนรายบุคคลแล้ว");
    refreshWorkList();
  })
  .catch(error => {
    console.error(error);
    alert("❌ เชื่อมต่อ API ไม่สำเร็จ");
  });
}

function renderGroupIndividualCheckPage(){

  const statusBox = document.getElementById("groupIndividualCheckStatus");
  const contentBox = document.getElementById("groupIndividualCheckContent");

  if(!statusBox || !contentBox){
    return;
  }

  const data = Array.isArray(currentWorkData) ? currentWorkData : [];

  if(data.length === 0){
    statusBox.innerHTML = `<div class="status-box">ยังไม่มีข้อมูล ให้ไปหน้า “หน้าตรวจงาน” แล้วโหลดงานก่อน</div>`;
    contentBox.innerHTML = "";
    return;
  }

  const groups = data.filter(item => isGroupWorkItem(item));
  const individuals = data.filter(item => !isGroupWorkItem(item));

  statusBox.innerHTML = `
    <div class="status-box">
      ข้อมูลจากงานที่โหลดล่าสุด: งานกลุ่ม ${groups.length} รายการ / งานเดี่ยว ${individuals.length} รายการ
    </div>
  `;

  contentBox.innerHTML = `
    <div class="check-mode-grid">
      <div>
        <div class="check-mode-section-title">งานรายกลุ่ม</div>
        ${groups.length ? groups.map(item => `
          <div class="card">
            <h3>${escapeHtml(item.topic || "งานกลุ่ม")} | ${escapeHtml(item.class || "")}</h3>
            <div class="meta">
              <div>กลุ่ม: ${escapeHtml(item.groupName || "ไม่ระบุชื่อกลุ่ม")}</div>
              <div>ผู้ส่ง: ${escapeHtml(item.name || "-")}</div>
              <div>คะแนนปัจจุบัน: ${escapeHtml(item.score || "ยังไม่ได้ตรวจ")}</div>
            </div>
            ${renderGroupIndividualScoreEditor(item)}
          </div>
        `).join("") : `<div class="status-box">ไม่พบงานกลุ่ม</div>`}
      </div>

      <div>
        <div class="check-mode-section-title">งานรายบุคคล</div>
        ${individuals.length ? individuals.map(item => `
          <div class="card">
            <h3>${escapeHtml(item.topic || "งานเดี่ยว")} | ${escapeHtml(item.class || "")}</h3>
            <div class="meta">
              <div>เลขที่: ${escapeHtml(item.no || "-")}</div>
              <div>ชื่อ: ${escapeHtml(item.name || "-")}</div>
              <div>คะแนนปัจจุบัน: ${escapeHtml(item.score || "ยังไม่ได้ตรวจ")}</div>
            </div>
            <div class="score-area">
              <input
                type="number"
                id="score_${escapeAttribute(item.rowIndex || item.id)}"
                value="${String(item.score || "") === "ตรวจแล้ว" ? "" : escapeAttribute(item.score || "") }"
                placeholder="คะแนน"
              >
              <button onclick="saveScore('${escapeJsString(item.sheetUrl || currentSheetUrl || "")}','${escapeJsString(item.id || "")}','${escapeJsString(item.rowIndex || "") }')">
                บันทึกคะแนน
              </button>
            </div>
          </div>
        `).join("") : `<div class="status-box">ไม่พบงานรายบุคคล</div>`}
      </div>
    </div>
  `;
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
          ${renderTeacherOnlyGroupInfo(s)}
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
              ${renderWorkContent(workValue)}
            </div>

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

            ${renderGroupIndividualScoreEditor(s)}
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

  workBox.innerHTML = selectionToolbar + html;
  updateTeacherWorkSelectionStatus();
}
// ======================================
// แสดงงานในช่อง Work
// ถ้าเป็น Drive URL = พรีวิวไฟล์
// ถ้าเป็น image URL โดยตรง = แสดงรูป
// ถ้าเป็น URL ทั่วไป = แสดงลิงก์
// ถ้าไม่ใช่ URL = แสดงข้อความ
// ======================================
function renderWorkContent(work){

  const value = String(work || "").trim();

  if(!value){
    return `<p class="empty-text">ยังไม่มีข้อมูลงานที่ส่ง</p>`;
  }

  const driveFileId = extractDriveFileId(value);

  if(driveFileId){

    const previewUrl =
      "https://drive.google.com/file/d/"
      + driveFileId
      + "/preview";

    return `
      <iframe
        class="drive-preview"
        src="${escapeAttribute(previewUrl)}"
        allow="autoplay"
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

      alert(successMessage || "✅ บันทึกแล้ว");

      refreshWorkList();
    }

    else{
      alert("❌ " + (data.message || "บันทึกไม่สำเร็จ"));
    }
  })

  .catch(error => {
    console.error(error);
    alert("❌ เชื่อมต่อ API ไม่สำเร็จ");
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
    loadWork();
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
