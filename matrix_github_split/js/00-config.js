// ใช้ API URL เดิมของคุณ
const API_URL =
  "https://script.google.com/macros/s/AKfycbz2zbVkttAPciPTjNIGDOVi0doD_cmhPqYgeZY5dIOAK_9WCxa3_2i9TwL9BlAmFjm1mg/exec";

let currentWorkData = [];
let currentSheetUrl = "";
let autoRefreshWorkTimer = null;
let autoRefreshWorkEnabled = false;
let currentStudentId = "";
let currentStudentName = "";
let currentStudentLevel = "";
let currentStudentClass = "";
let currentStudentNo = "";
let currentStudentPhotoUrl = "";
let currentStudentOrder = "";
let scoreOptionsData = [];
let teacherTopicsData = [];
let lastScoreTableData = null;
let hideScoreValues = true;
let lockScoredScores = true;
let hideIndividualAdjustments = false;
let changedScoreMap = {};
let selectedAssignmentIndexes = new Set();
let hideViewedWorksEnabled = false;
let currentMyWorkData = [];
let selectedMyWorkIndex = null;
let currentSubmitWorkItem = null;
let lastSelectedWorkUrls = [];
let selectedTeacherWorkKeys = new Set();

const VIEWED_WORKS_STORAGE_KEY = "matrixViewedWorks";
const HIDE_VIEWED_STORAGE_KEY = "matrixHideViewedWorks";
const COLLAPSED_WORKS_STORAGE_KEY = "matrixCollapsedWorks";
const FULL_SCORE_STORAGE_KEY_PREFIX = "matrixFullScore::";
const LOCK_SCORED_STORAGE_KEY = "matrixLockScoredScores";
const HIDE_SCORES_STORAGE_KEY = "matrixHideScores";
const HIDE_INDIVIDUAL_ADJUSTMENTS_STORAGE_KEY = "matrixHideIndividualAdjustments";

// ======================================
// LOGIN
// ======================================
