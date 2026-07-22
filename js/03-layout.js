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


function switchTeacherPage(page){

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
    renderGroupIndividualCheckPage();
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
