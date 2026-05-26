// ============================================
// EXAM STUDY PLAN GENERATOR - APP.JS
// ============================================

// Data Management
class StudyPlanManager {
    constructor() {
        this.storageKey = 'examStudyPlans';
        this.exams = this.loadFromStorage();
    }

    loadFromStorage() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            return stored ? JSON.parse(stored) : [];
        } catch (e) {
            console.error('Error loading from storage:', e);
            return [];
        }
    }

    saveToStorage() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.exams));
        } catch (e) {
            console.error('Error saving to storage:', e);
        }
    }

    addExam(examData) {
        const exam = {
            id: Date.now().toString(),
            ...examData,
            createdAt: new Date().toISOString(),
            progress: {},
            topics: this.parseTopics(examData.materials),
        };

        // Initialize progress for all topics
        exam.topics.forEach(topic => {
            exam.progress[topic] = false;
        });

        this.exams.push(exam);
        this.saveToStorage();
        return exam;
    }

    parseTopics(materialsText) {
        return materialsText
            .split('\n')
            .map(topic => topic.trim())
            .filter(topic => topic.length > 0);
    }

    getExam(id) {
        return this.exams.find(exam => exam.id === id);
    }

    updateExamProgress(examId, topic, completed) {
        const exam = this.getExam(examId);
        if (exam) {
            exam.progress[topic] = completed;
            this.saveToStorage();
        }
    }

    deleteExam(id) {
        this.exams = this.exams.filter(exam => exam.id !== id);
        this.saveToStorage();
    }

    updateExam(id, examData) {
        const exam = this.getExam(id);
        if (exam) {
            exam.examName = examData.examName;
            exam.examDate = examData.examDate;
            exam.studyStartDate = examData.studyStartDate || '';
            
            // Update topics and reset progress if topics changed
            const newTopics = this.parseTopics(examData.materials);
            const oldTopics = exam.topics;
            
            // Check if topics changed
            if (JSON.stringify(newTopics) !== JSON.stringify(oldTopics)) {
                exam.topics = newTopics;
                // Reset progress for topics
                exam.progress = {};
                newTopics.forEach(topic => {
                    exam.progress[topic] = false;
                });
            }
            
            exam.updatedAt = new Date().toISOString();
            this.saveToStorage();
        }
        return exam;
    }

    getProgressPercentage(examId) {
        const exam = this.getExam(examId);
        if (!exam) return 0;

        const completed = Object.values(exam.progress).filter(p => p).length;
        const total = exam.topics.length;
        return total === 0 ? 0 : Math.round((completed / total) * 100);
    }

    getProgressStats(examId) {
        const exam = this.getExam(examId);
        if (!exam) return { completed: 0, total: 0, percentage: 0, remaining: 0 };

        const completed = Object.values(exam.progress).filter(p => p).length;
        const total = exam.topics.length;
        const remaining = total - completed;

        return {
            completed,
            total,
            percentage: total === 0 ? 0 : Math.round((completed / total) * 100),
            remaining,
        };
    }

    getTopicsByDay(examId, schedule) {
        const exam = this.getExam(examId);
        if (!exam) return {};

        const dayStats = {};
        Object.entries(schedule).forEach(([date, topics]) => {
            const completedToday = topics.filter(topic => exam.progress[topic]).length;
            dayStats[date] = {
                total: topics.length,
                completed: completedToday,
                percentage: topics.length === 0 ? 0 : Math.round((completedToday / topics.length) * 100),
            };
        });

        return dayStats;
    }

    getLastUpdated(examId) {
        const exam = this.getExam(examId);
        if (!exam) return null;
        return exam.lastUpdated || exam.createdAt;
    }

    setLastUpdated(examId) {
        const exam = this.getExam(examId);
        if (exam) {
            exam.lastUpdated = new Date().toISOString();
            this.saveToStorage();
        }
    }
}

// Form Validation
class FormValidator {
    constructor(formElement) {
        this.form = formElement;
        this.errors = {};
    }

    validate() {
        this.errors = {};
        const examName = this.form.examName.value.trim();
        const examDate = this.form.examDate.value;
        const materials = this.form.materials.value.trim();
        const studyStartDate = this.form.studyStartDate.value;

        // Validate exam name
        if (!examName) {
            this.errors.examName = 'Exam name is required';
        } else if (examName.length < 3) {
            this.errors.examName = 'Exam name must be at least 3 characters';
        }

        // Validate exam date
        if (!examDate) {
            this.errors.examDate = 'Exam date is required';
        } else {
            const selectedDate = new Date(examDate);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (selectedDate < today) {
                this.errors.examDate = 'Exam date must be in the future';
            }
        }

        // Validate materials
        if (!materials) {
            this.errors.materials = 'At least one topic is required';
        } else if (materials.split('\n').filter(t => t.trim()).length === 0) {
            this.errors.materials = 'At least one valid topic is required';
        }

        // Validate study start date (if provided)
        if (studyStartDate) {
            const startDate = new Date(studyStartDate);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (startDate < today) {
                this.errors.studyStartDate = 'Study start date must not be in the past';
            } else if (examDate && startDate > new Date(examDate)) {
                this.errors.studyStartDate = 'Study start date must be before exam date';
            }
        }

        this.displayErrors();
        return Object.keys(this.errors).length === 0;
    }

    displayErrors() {
        // Clear previous errors
        this.form.querySelectorAll('.form-group').forEach(group => {
            group.classList.remove('error');
        });
        this.form.querySelectorAll('.error-message').forEach(msg => {
            msg.classList.remove('show');
            msg.textContent = '';
        });

        // Display new errors
        Object.entries(this.errors).forEach(([field, message]) => {
            const input = this.form[field];
            if (input) {
                const group = input.closest('.form-group');
                const errorEl = group.querySelector('.error-message');
                if (group && errorEl) {
                    group.classList.add('error');
                    errorEl.textContent = message;
                    errorEl.classList.add('show');
                }
            }
        });
    }
}

// Schedule Generator
class ScheduleGenerator {
    constructor(examData) {
        this.examData = examData;
        this.schedule = this.generateSchedule();
    }

    generateSchedule() {
        const topics = this.examData.topics;
        const startDate = this.getStartDate();
        const endDate = new Date(this.examData.examDate);
        const daysAvailable = this.calculateDaysAvailable(startDate, endDate);

        const schedule = {};
        const topicsPerDay = Math.ceil(topics.length / daysAvailable);

        let currentDay = new Date(startDate);
        let topicIndex = 0;

        while (currentDay <= endDate && topicIndex < topics.length) {
            const dateKey = this.formatDate(currentDay);
            schedule[dateKey] = [];

            for (let i = 0; i < topicsPerDay && topicIndex < topics.length; i++) {
                schedule[dateKey].push(topics[topicIndex]);
                topicIndex++;
            }

            currentDay.setDate(currentDay.getDate() + 1);
        }

        return schedule;
    }

    getStartDate() {
        const startDateInput = document.getElementById('studyStartDate').value;
        if (startDateInput) {
            return new Date(startDateInput);
        }
        return new Date();
    }

    calculateDaysAvailable(startDate, endDate) {
        const diffTime = Math.abs(endDate - startDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return Math.max(1, diffDays);
    }

    formatDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    formatDateDisplay(dateString) {
        const date = new Date(dateString + 'T00:00:00');
        return date.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
        });
    }
}

// UI Manager
class UIManager {
    constructor(manager) {
        this.manager = manager;
        this.examForm = document.getElementById('examForm');
        this.examsList = document.getElementById('examsList');
        this.planModal = document.getElementById('planModal');
        this.modalOverlay = document.getElementById('modalOverlay');
        this.modalBody = document.getElementById('modalBody');
        this.modalTitle = document.getElementById('modalTitle');

        this.initEventListeners();
        this.renderExamsList();
    }

    initEventListeners() {
        this.examForm.addEventListener('submit', (e) => this.handleFormSubmit(e));
        this.examForm.addEventListener('reset', () => {
            this.cancelEdit();
            this.renderExamsList();
        });
        
        const cancelEditBtn = document.getElementById('cancelEditBtn');
        if (cancelEditBtn) {
            cancelEditBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.cancelEdit();
                this.examForm.reset();
                this.renderExamsList();
            });
        }
    }

    cancelEdit() {
        delete this.examForm.dataset.editingId;
        const formSection = this.examForm.closest('.form-container');
        formSection.querySelector('h2').textContent = 'Add New Exam';
        const submitBtn = this.examForm.querySelector('.btn-primary');
        submitBtn.innerHTML = '<span>Generate Study Plan</span>';
        const cancelBtn = document.getElementById('cancelEditBtn');
        if (cancelBtn) {
            cancelBtn.style.display = 'none';
        }
    }

    handleFormSubmit(e) {
        e.preventDefault();

        const validator = new FormValidator(this.examForm);
        if (!validator.validate()) {
            return;
        }

        const examData = {
            examName: this.examForm.examName.value.trim(),
            examDate: this.examForm.examDate.value,
            materials: this.examForm.materials.value.trim(),
            studyStartDate: this.examForm.studyStartDate.value || '',
        };

        // Check if we're editing or creating
        const editingId = this.examForm.dataset.editingId;
        
        if (editingId) {
            // Update existing exam
            this.manager.updateExam(editingId, examData);
            this.showNotification('Study plan updated successfully!', 'success');
            delete this.examForm.dataset.editingId;
        } else {
            // Create new exam
            this.manager.addExam(examData);
            this.showNotification('Study plan created successfully!', 'success');
        }

        this.examForm.reset();
        
        // Reset form title and button
        const formSection = this.examForm.closest('.form-container');
        formSection.querySelector('h2').textContent = 'Add New Exam';
        const submitBtn = this.examForm.querySelector('.btn-primary');
        submitBtn.innerHTML = '<span>Generate Study Plan</span>';
        
        // Hide cancel button
        const cancelBtn = document.getElementById('cancelEditBtn');
        if (cancelBtn) {
            cancelBtn.style.display = 'none';
        }
        
        this.renderExamsList();
    }

    renderExamsList() {
        if (this.manager.exams.length === 0) {
            this.examsList.innerHTML = `
                <div class="empty-state">
                    <p>📝 No study plans yet. Create one to get started!</p>
                </div>
            `;
            return;
        }

        this.examsList.innerHTML = this.manager.exams
            .map(exam => this.createExamCard(exam))
            .join('');

        // Add event listeners to buttons
        this.examsList.querySelectorAll('.btn-view').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const examId = btn.dataset.examId;
                this.showStudyPlan(examId);
            });
        });

        this.examsList.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const examId = btn.dataset.examId;
                this.showEditForm(examId);
            });
        });

        this.examsList.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const examId = btn.dataset.examId;
                if (confirm('Are you sure you want to delete this study plan?')) {
                    this.manager.deleteExam(examId);
                    this.renderExamsList();
                    this.showNotification('Study plan deleted', 'info');
                }
            });
        });

        this.examsList.querySelectorAll('.btn-delete-small').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const examId = btn.dataset.examId;
                if (confirm('Are you sure you want to delete this study plan?')) {
                    this.manager.deleteExam(examId);
                    this.renderExamsList();
                    this.showNotification('Study plan deleted', 'info');
                }
            });
        });
    }

    createExamCard(exam) {
        const progress = this.manager.getProgressPercentage(exam.id);
        const examDate = new Date(exam.examDate).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });

        const topicsPreview = exam.topics.slice(0, 2).join(', ');
        const moreTopics = exam.topics.length > 2 ? `... and ${exam.topics.length - 2} more` : '';

        return `
            <div class="exam-card">
                <div class="exam-card-header">
                    <div class="exam-card-title">${this.escapeHtml(exam.examName)}</div>
                    <div class="exam-card-actions">
                        <button class="btn-edit" data-exam-id="${exam.id}" title="Edit plan">✏️</button>
                        <button class="btn-delete-small" data-exam-id="${exam.id}" title="Delete plan">🗑️</button>
                    </div>
                </div>
                <div class="exam-card-date">📅 ${examDate}</div>
                <div class="exam-card-topics">
                    <strong>Topics:</strong> ${topicsPreview}${moreTopics ? '<br/>' + moreTopics : ''}
                </div>
                <div class="exam-card-progress">
                    <div class="progress-label">
                        <span>Progress</span>
                        <span>${progress}%</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${progress}%"></div>
                    </div>
                </div>
                <div class="exam-card-footer">
                    <button class="btn-view" data-exam-id="${exam.id}">View Plan</button>
                    <button class="btn-delete" data-exam-id="${exam.id}">Delete</button>
                </div>
            </div>
        `;
    }

    showStudyPlan(examId) {
        const exam = this.manager.getExam(examId);
        if (!exam) return;

        const generator = new ScheduleGenerator(exam);
        const schedule = generator.schedule;
        const stats = this.manager.getProgressStats(examId);
        const dayStats = this.manager.getTopicsByDay(examId, schedule);

        this.modalTitle.textContent = `Study Plan: ${exam.examName}`;

        const examDate = new Date(exam.examDate).toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
        });

        // Calculate days until exam
        const today = new Date();
        const exam_date = new Date(exam.examDate);
        const daysUntilExam = Math.ceil((exam_date - today) / (1000 * 60 * 60 * 24));

        let html = `
            <div class="schedule-container">
                <div class="schedule-info">
                    <div class="schedule-stats">
                        <div class="stat-item">
                            <div class="stat-label">Exam Date</div>
                            <div class="stat-value">${examDate}</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-label">Days Until Exam</div>
                            <div class="stat-value" style="color: ${daysUntilExam <= 3 ? '#ef4444' : '#10b981'};">${daysUntilExam}</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-label">Study Period</div>
                            <div class="stat-value">${Object.keys(schedule).length} days</div>
                        </div>
                    </div>
                    <div class="progress-summary">
                        <div class="progress-label-large">
                            <span><strong>Overall Progress:</strong> ${stats.completed}/${stats.total} Topics</span>
                            <span class="progress-percentage">${stats.percentage}%</span>
                        </div>
                        <div class="progress-bar-large">
                            <div class="progress-fill-large" style="width: ${stats.percentage}%"></div>
                        </div>
                        <div class="progress-details">
                            <span>✅ ${stats.completed} completed</span>
                            <span class="separator">•</span>
                            <span>📋 ${stats.remaining} remaining</span>
                        </div>
                    </div>
                </div>
        `;

        // Add study days
        let completedDays = 0;
        Object.entries(schedule).forEach(([dateKey, topics]) => {
            const dateDisplay = generator.formatDateDisplay(dateKey);
            const dayProgress = dayStats[dateKey];
            const isToday = dateKey === generator.formatDate(new Date());
            const dayClass = isToday ? 'today' : '';
            const dayCompleted = dayProgress.completed === dayProgress.total && dayProgress.total > 0;
            if (dayCompleted) completedDays++;

            html += `
                <div class="study-day ${dayClass}" data-date="${dateKey}">
                    <div class="study-day-header">
                        <span>📅 ${dateDisplay}${isToday ? ' (Today)' : ''}</span>
                        <span class="day-progress">${dayProgress.completed}/${dayProgress.total}</span>
                    </div>
                    <div class="study-day-progress-mini">
                        <div class="progress-bar-mini">
                            <div class="progress-fill-mini" style="width: ${dayProgress.percentage}%"></div>
                        </div>
                    </div>
                    <div class="study-topics">
            `;

            topics.forEach(topic => {
                const isChecked = exam.progress[topic] ? 'checked' : '';
                const checkboxId = `${exam.id}-${topic}`;
                html += `
                    <div class="study-topic">
                        <input
                            type="checkbox" 
                            id="${checkboxId}" 
                            ${isChecked}
                            data-exam-id="${exam.id}"
                            data-topic="${this.escapeHtml(topic)}"
                        >
                        <label for="${checkboxId}">${this.escapeHtml(topic)}</label>
                    </div>
                `;
            });

            html += `
                    </div>
                </div>
            `;
        });

        html += '</div>';

        this.modalBody.innerHTML = html;

        // Add event listeners to checkboxes
        this.modalBody.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const examId = e.target.dataset.examId;
                const topic = e.target.dataset.topic;
                const isCompleted = e.target.checked;
                
                this.manager.updateExamProgress(examId, topic, isCompleted);
                this.manager.setLastUpdated(examId);
                
                // Update the exam card in background
                this.renderExamsList();
                
                // Show inline feedback
                const topicDiv = e.target.closest('.study-topic');
                if (topicDiv) {
                    topicDiv.style.animation = 'none';
                    setTimeout(() => {
                        topicDiv.style.animation = 'fadeFlash 0.3s ease';
                    }, 10);
                }
                
                // Update the progress bar in real-time
                this.updateScheduleProgress(examId, schedule);
            });
        });

        // Show modal
        this.planModal.style.display = 'block';
        this.modalOverlay.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }

    updateScheduleProgress(examId, schedule) {
        const exam = this.manager.getExam(examId);
        if (!exam) return;

        const stats = this.manager.getProgressStats(examId);
        const dayStats = this.manager.getTopicsByDay(examId, schedule);

        // Update overall progress
        const progressFill = this.modalBody.querySelector('.progress-fill-large');
        const progressPercent = this.modalBody.querySelector('.progress-percentage');
        const progressDetails = this.modalBody.querySelector('.progress-details');

        if (progressFill) {
            progressFill.style.width = stats.percentage + '%';
        }
        if (progressPercent) {
            progressPercent.textContent = stats.percentage + '%';
        }
        if (progressDetails) {
            progressDetails.innerHTML = `
                <span>✅ ${stats.completed} completed</span>
                <span class="separator">•</span>
                <span>📋 ${stats.remaining} remaining</span>
            `;
        }

        // Update daily progress bars
        Object.entries(dayStats).forEach(([dateKey, dayProgress]) => {
            const dayElement = this.modalBody.querySelector(`[data-date="${dateKey}"]`);
            if (dayElement) {
                const miniBar = dayElement.querySelector('.progress-fill-mini');
                const dayProgressSpan = dayElement.querySelector('.day-progress');
                
                if (miniBar) {
                    miniBar.style.width = dayProgress.percentage + '%';
                }
                if (dayProgressSpan) {
                    dayProgressSpan.textContent = dayProgress.completed + '/' + dayProgress.total;
                }
            }
        });


    showEditForm(examId) {
        const exam = this.manager.getExam(examId);
        if (!exam) return;

        // Populate form with existing exam data
        this.examForm.examName.value = exam.examName;
        this.examForm.examDate.value = exam.examDate;
        this.examForm.materials.value = exam.topics.join('\n');
        this.examForm.studyStartDate.value = exam.studyStartDate || '';

        // Change form title and button text
        const formSection = this.examForm.closest('.form-container');
        formSection.querySelector('h2').textContent = '✏️ Edit Exam';
        const submitBtn = this.examForm.querySelector('.btn-primary');
        submitBtn.innerHTML = '<span>Update Study Plan</span>';
        
        // Show cancel button
        const cancelBtn = document.getElementById('cancelEditBtn');
        if (cancelBtn) {
            cancelBtn.style.display = 'block';
        }

        // Store exam ID for update
        this.examForm.dataset.editingId = examId;

        // Scroll to form
        this.examForm.scrollIntoView({ behavior: 'smooth', block: 'start' });

        // Highlight the form with animation
        formSection.style.animation = 'none';
        setTimeout(() => {
            formSection.style.animation = 'pulse 0.5s ease';
        }, 10);

        // Show notification
        this.showNotification('📝 Editing your study plan. Update and save changes.', 'info');
    }

    closeModal() {
        this.planModal.style.display = 'none';
        this.modalOverlay.style.display = 'none';
        document.body.style.overflow = 'auto';
    }

    showNotification(message, type = 'info') {
        // Create a simple notification
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            background: ${type === 'success' ? '#10b981' : '#3b82f6'};
            color: white;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            z-index: 2000;
            animation: slideIn 0.3s ease;
        `;
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;',
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }
}

// Global modal close function
function closeModal() {
    if (window.uiManager) {
        window.uiManager.closeModal();
    }
}

// Animation styles
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }

    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }

    @keyframes fadeFlash {
        0% {
            background-color: white;
        }
        50% {
            background-color: #d1fae5;
        }
        100% {
            background-color: white;
        }
    }
`;
document.head.appendChild(style);

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const manager = new StudyPlanManager();
    window.uiManager = new UIManager(manager);
});
