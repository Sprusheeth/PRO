let currentUser = null;
let newExamQuestions = []; 
let editingExamId = null;
let currentGradingResultId = null;

document.addEventListener("DOMContentLoaded", () => {
    currentUser = JSON.parse(localStorage.getItem('sesd_currentUser'));
    if (!currentUser || currentUser.role !== 'professor') {
        if (!window.location.pathname.includes('login.html')) window.location.href = '../login.html';
        return;
    }
    if (document.getElementById('profName')) document.getElementById('profName').innerText = currentUser.fullName;
    
    const path = window.location.pathname;
    if (path.includes('dashboard.html')) loadDashboardData();
    else if (path.includes('exams.html')) initExamManager();
    else if (path.includes('students.html')) loadStudents();
    else if (path.includes('grade.html')) loadGrades();
});

// ==================== DASHBOARD ====================
function loadDashboardData() {
    const allResults = JSON.parse(localStorage.getItem('sesd_results')) || [];
    const allExams = JSON.parse(localStorage.getItem('sesd_exams')) || [];
    const myExamIds = new Set(allExams.filter(e => e.creatorEmail === currentUser.email).map(e => e.id));
    const myStudentResults = allResults.filter(r => myExamIds.has(r.examId));
    renderFlaggedList(myStudentResults, allExams);
    renderRecentList(myStudentResults, allExams);
    if(typeof renderCharts === 'function') renderCharts(myStudentResults, allExams);
}
function renderFlaggedList(results, allExams) {
    const flagged = results.filter(r => r.status === 'flagged');
    const container = document.getElementById('flaggedList');
    if (!container) return;
    container.innerHTML = flagged.length === 0 ? '<div class="empty-state" style="background:#f0fdf4; border-color:#bbf7d0; color:#166534;">✅ No active violations.</div>' : '';
    flagged.forEach(r => {
        const exam = allExams.find(e => e.id === r.examId) || { title: 'Unknown' };
        container.innerHTML += `<div class="exam-card flag-card"><div class="exam-info"><h4 style="color:#991b1b">${r.studentName}</h4><p>${exam.title} • Violation Detected</p></div><button onclick="allowRetry('${r.resultId}')" class="btn btn-primary btn-small">Allow Retry</button></div>`;
    });
}
function renderRecentList(results, allExams) {
    const container = document.getElementById('recentSubmissionsList');
    if (!container) return;
    const recent = results.filter(r => r.status === 'completed').sort((a,b) => new Date(b.dateTaken) - new Date(a.dateTaken)).slice(0, 5);
    container.innerHTML = recent.length === 0 ? '<p class="empty-state">No recent submissions.</p>' : '';
    recent.forEach(r => {
        const exam = allExams.find(e => e.id === r.examId) || { title: 'Unknown' };
        container.innerHTML += `<div class="exam-card"><div class="exam-info"><h4>${r.studentName}</h4><p>${exam.title}</p></div><div class="exam-status status-completed">${r.score}/${r.totalMarks}</div></div>`;
    });
}
function allowRetry(resultId) {
    if(confirm("Allow retry? This deletes the current attempt.")) {
        let allResults = JSON.parse(localStorage.getItem('sesd_results')) || [];
        allResults = allResults.filter(r => r.resultId !== resultId);
        localStorage.setItem('sesd_results', JSON.stringify(allResults));
        location.reload();
    }
}

// ==================== EXAM MANAGER ====================
function initExamManager() {
    newExamQuestions = [];
    editingExamId = null;
    updateQCount();
    loadProfExams();
}
function toggleQuestionFields() {
    document.getElementById('mcqFields').style.display = (document.getElementById('qType').value === 'mcq') ? 'block' : 'none';
}
function addQuestionToExam() {
    const type = document.getElementById('qType').value;
    const text = document.getElementById('qText').value;
    const marks = parseInt(document.getElementById('qMarks').value) || 1;
    if (!text) { alert("Please enter prompt/question."); return; }
    let question = { type, text, marks, id: 'q' + Date.now() };
    if (type === 'mcq') {
        question.options = [document.getElementById('opt0').value, document.getElementById('opt1').value, document.getElementById('opt2').value, document.getElementById('opt3').value];
        question.correctOption = parseInt(document.querySelector('input[name="correctOpt"]:checked').value);
    }
    newExamQuestions.push(question);
    renderAddedQuestions();
    document.getElementById('qText').value = '';
}
function renderAddedQuestions() {
    const container = document.getElementById('addedQuestionsList');
    if(!container) return;
    container.innerHTML = '';
    newExamQuestions.forEach((q, idx) => {
        container.innerHTML += `<div class="added-question"><strong>#${idx+1} [${q.type.toUpperCase()}] (${q.marks}pts):</strong> ${q.text.substring(0,50)}... <span class="delete-q-btn" onclick="removeQuestion(${idx})">🗑️</span></div>`;
    });
    updateQCount();
}
function removeQuestion(idx) { newExamQuestions.splice(idx, 1); renderAddedQuestions(); }
function updateQCount() { if(document.getElementById('qCount')) document.getElementById('qCount').innerText = newExamQuestions.length; }

function finalizeExam() {
    const title = document.getElementById('examTitle').value;
    if (!title || newExamQuestions.length === 0) { alert("Please missing title or questions."); return; }

    // NEW FIELDS
    const type = document.getElementById('examType').value;
    const hasCertificate = document.getElementById('hasCertificate').checked;

    let allExams = JSON.parse(localStorage.getItem('sesd_exams')) || [];
    const newExam = {
        id: editingExamId || ('exam_' + Date.now()),
        creatorEmail: currentUser.email,
        title,
        subject: document.getElementById('examSubject').value,
        duration: document.getElementById('examDuration').value,
        questions: newExamQuestions,
        startDate: document.getElementById('examStart').value || null,
        endDate: document.getElementById('examEnd').value || null,
        isPrivate: document.getElementById('selectedAccessType').value === 'private',
        // SAVE NEW FIELDS
        type: type, 
        hasCertificate: hasCertificate
    };

    if (!newExam.isPrivate) {
        let batches = Array.from(document.getElementById('examBatches').selectedOptions).map(o => o.value);
        newExam.assignedBatches = batches.length ? batches : ['ALL'];
        newExam.accessCode = null;
    } else {
        newExam.assignedBatches = [];
        newExam.accessCode = editingExamId ? (allExams.find(e=>e.id===editingExamId)?.accessCode || genCode()) : genCode();
    }

    if (editingExamId) {
        const idx = allExams.findIndex(e => e.id === editingExamId);
        if(idx!==-1) allExams[idx] = newExam;
    } else {
        allExams.push(newExam);
    }
    localStorage.setItem('sesd_exams', JSON.stringify(allExams));
    alert("Assessment Saved!");
    location.reload();
}
function genCode() { return Math.random().toString(36).substring(2, 8).toUpperCase(); }

function loadProfExams() {
    const allExams = JSON.parse(localStorage.getItem('sesd_exams')) || [];
    const container = document.getElementById('profExamList');
    if(!container) return;
    container.innerHTML = '';
    allExams.filter(e => e.creatorEmail === currentUser.email).forEach(exam => {
        let typeEmoji = exam.type === 'assignment' ? '🟢' : (exam.type === 'quiz' ? '🟡' : '🔴');
        container.innerHTML += `
            <div class="exam-card">
                <div class="exam-info">
                    <h4>${typeEmoji} ${exam.title} ${exam.hasCertificate ? '🏆' : ''}</h4>
                    <p>${exam.subject} • ${exam.questions.length} items • ${exam.isPrivate ? 'Code: '+exam.accessCode : 'Batches: '+exam.assignedBatches.join(',')}</p>
                </div>
                <button class="btn btn-secondary btn-small" onclick="deleteExam('${exam.id}')">Delete</button>
            </div>`;
    });
}
function deleteExam(id) {
    if(confirm("Delete this assessment?")) {
        let all = JSON.parse(localStorage.getItem('sesd_exams')) || [];
        localStorage.setItem('sesd_exams', JSON.stringify(all.filter(e => e.id !== id)));
        loadProfExams();
    }
}

// ==================== STUDENTS & GRADES (Keep your existing functions for these) ====================
function loadStudents() {
    filterStudents();
}

function filterStudents() {
    const filterEl = document.getElementById('batchFilter');
    if (!filterEl) return;
    
    const filter = filterEl.value;
    const allUsers = JSON.parse(localStorage.getItem('sesd_users')) || [];
    let students = allUsers.filter(u => u.role === 'student');

    if (currentUser.managedBatches && !currentUser.managedBatches.includes('ALL')) {
         students = students.filter(s => currentUser.managedBatches.includes(s.batch));
    }

    if (filter !== 'ALL') {
        students = students.filter(s => s.batch === filter);
    }

    renderStudents(students);
}

function renderStudents(students) {
    const container = document.getElementById('studentList');
    if(!container) return;
    container.innerHTML = '';

    if (students.length === 0) {
        container.innerHTML = '<p class="empty-state">No students found for this selection.</p>';
        return;
    }

    students.forEach(s => {
        container.innerHTML += `
            <div class="exam-grid-card" style="text-align:center;">
                <div style="font-size:3rem; margin-bottom:1rem;">👨‍🎓</div>
                <h3>${s.fullName}</h3>
                <p style="color:#64748b; margin-bottom:0.5rem;">${s.email}</p>
                <span class="exam-subject-badge">${s.batch === 'PRIVATE_CANDIDATE' ? 'Private Candidate' : s.batch}</span>
            </div>
        `;
    });
}

function loadGrades() {
    const allExams = JSON.parse(localStorage.getItem('sesd_exams')) || [];
    const myExams = allExams.filter(e => e.creatorEmail === currentUser.email);
    const filterSelect = document.getElementById('examFilter');
    
    if(filterSelect) {
        // Reset options
        filterSelect.innerHTML = '<option value="ALL">All Exams</option>';
        myExams.forEach(e => {
            filterSelect.innerHTML += `<option value="${e.id}">${e.title}</option>`;
        });
    }
    filterGrades();
}

function filterGrades() {
    const filterEl = document.getElementById('examFilter');
    if (!filterEl) return;
    const examIdFilter = filterEl.value;

    const allResults = JSON.parse(localStorage.getItem('sesd_results')) || [];
    const allExams = JSON.parse(localStorage.getItem('sesd_exams')) || [];

    const myExamIds = new Set(allExams.filter(e => e.creatorEmail === currentUser.email).map(e => e.id));
    let filteredResults = allResults.filter(r => myExamIds.has(r.examId));

    if (examIdFilter !== 'ALL') {
        filteredResults = filteredResults.filter(r => r.examId === examIdFilter);
    }

    renderGrades(filteredResults, allExams);
}

function renderGrades(results, allExams) {
    const tbody = document.getElementById('gradeTableBody');
    if(!tbody) return;
    tbody.innerHTML = '';

    if (results.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="padding:2rem; text-align:center; color:#94a3b8;">No grades found.</td></tr>';
        return;
    }

    results.forEach(r => {
        const exam = allExams.find(e => e.id === r.examId) || { title: 'Unknown' };
        let statusHtml = '<span style="color:#059669; font-weight:500;">Completed</span>';
        
        if (r.status === 'flagged') {
            statusHtml = '<span style="color:#dc2626; font-weight:700;">FLAGGED</span>';
        } else if (r.needsGrading) {
            statusHtml = '<span style="background:#fef3c7; color:#d97706; padding:2px 8px; border-radius:10px; font-size:0.85rem; font-weight:600;">Needs Grading</span>';
        }

        tbody.innerHTML += `
            <tr style="border-top: 1px solid #e2e8f0;">
                <td style="padding: 1rem;">
                    <div style="font-weight:500;">${r.studentName}</div>
                    <div style="font-size:0.85rem; color:#64748b;">${r.studentEmail}</div>
                </td>
                <td style="padding: 1rem;">${exam.title}</td>
                <td style="padding: 1rem;">${statusHtml}</td>
                <td style="padding: 1rem; font-weight:600;">${r.score} / ${r.totalMarks}</td>
                <td style="padding: 1rem;">
                    <button onclick="openGradingModal('${r.resultId}')" class="btn btn-secondary btn-small">Grade/View</button>
                </td>
            </tr>`;
    });
}

function openGradingModal(resultId) {
    const allResults = JSON.parse(localStorage.getItem('sesd_results')) || [];
    const allExams = JSON.parse(localStorage.getItem('sesd_exams')) || [];
    const result = allResults.find(r => r.resultId === resultId);
    if(!result) return;
    const exam = allExams.find(e => e.id === result.examId);

    currentGradingResultId = resultId;
    document.getElementById('modalStudentName').innerText = `Grading: ${result.studentName}`;
    document.getElementById('modalExamTitle').innerText = exam.title;

    const container = document.getElementById('gradingQuestionsList');
    container.innerHTML = '';

    exam.questions.forEach((q, idx) => {
        const userAnswer = result.answers[idx] || 'No answer';
        let gradingInput = '';

        if (q.type === 'mcq') {
            const isCorrect = (userAnswer === q.correctOption);
            gradingInput = `<div style="color: ${isCorrect ? '#059669' : '#dc2626'}; font-weight:600;">
                ${isCorrect ? '✅ Correct (Auto-graded)' : '❌ Incorrect (Auto-graded)'} - ${isCorrect ? q.marks : 0}/${q.marks} pts
            </div>`;
        } else {
            // Manual input for subjective questions
            gradingInput = `
                <div style="margin-top:1rem; display:flex; align-items:center; gap:1rem;">
                    <label>Score (Max ${q.marks}):</label>
                    <input type="number" id="grade_q_${idx}" class="form-input" style="width:80px;" min="0" max="${q.marks}" value="0">
                </div>`;
        }

        container.innerHTML += `
            <div class="grading-q">
                <p><strong>Q${idx+1} (${q.marks}pts):</strong> ${q.text}</p>
                <div class="student-answer">${q.type === 'mcq' ? 'Selected Option Index: ' + userAnswer : userAnswer}</div>
                ${gradingInput}
            </div>`;
    });

    document.getElementById('gradingModal').style.display = 'flex';
}

function closeGradingModal() {
    document.getElementById('gradingModal').style.display = 'none';
}

function saveManualGrades() {
    let allResults = JSON.parse(localStorage.getItem('sesd_results')) || [];
    const resultIdx = allResults.findIndex(r => r.resultId === currentGradingResultId);
    if(resultIdx === -1) return;

    const result = allResults[resultIdx];
    const allExams = JSON.parse(localStorage.getItem('sesd_exams')) || [];
    const exam = allExams.find(e => e.id === result.examId);

    let newTotalScore = 0;
    // Re-calculate total score including new manual grades
    exam.questions.forEach((q, idx) => {
        if (q.type === 'mcq') {
             if (result.answers[idx] === q.correctOption) newTotalScore += q.marks;
        } else {
             const input = document.getElementById(`grade_q_${idx}`);
             if (input) {
                 newTotalScore += (parseInt(input.value) || 0);
             }
        }
    });

    allResults[resultIdx].score = newTotalScore;
    allResults[resultIdx].needsGrading = false; // Mark as graded
    localStorage.setItem('sesd_results', JSON.stringify(allResults));

    alert("Grades saved successfully!");
    closeGradingModal();
    loadGrades(); // Refresh the table
}

// --- CSV EXPORT FUNCTION ---
function exportGradesToCSV() {
    const filterEl = document.getElementById('examFilter');
    if (!filterEl) return;
    const examIdFilter = filterEl.value;

    const allResults = JSON.parse(localStorage.getItem('sesd_results')) || [];
    const allExams = JSON.parse(localStorage.getItem('sesd_exams')) || [];
    const myExamIds = new Set(allExams.filter(e => e.creatorEmail === currentUser.email).map(e => e.id));

    let filteredResults = allResults.filter(r => myExamIds.has(r.examId));

    if (examIdFilter !== 'ALL') {
        filteredResults = filteredResults.filter(r => r.examId === examIdFilter);
    }

    if (filteredResults.length === 0) {
        alert("No data available to export for the current selection.");
        return;
    }

    // Prepare CSV content
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Student Name,Student Email,Exam Title,Date Taken,Status,Score,Total Marks\n";

    filteredResults.forEach(r => {
        const exam = allExams.find(e => e.id === r.examId) || { title: 'Unknown' };
        let statusText = 'Completed';
        if (r.status === 'flagged') statusText = 'FLAGGED (Violation)';
        else if (r.needsGrading) statusText = 'Pending Grading';

        // Escape data with quotes to handle potential commas in names/titles
        const row = [
            `"${r.studentName}"`,
            `"${r.studentEmail}"`,
            `"${exam.title}"`,
            `"${new Date(r.dateTaken).toLocaleDateString()}"`,
            `"${statusText}"`,
            r.score,
            r.totalMarks
        ];
        csvContent += row.join(",") + "\n";
    });

    // Trigger download
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "sesd_grades_export.csv");
    document.body.appendChild(link); // Required for FF
    link.click();
    document.body.removeChild(link);
}