/* ==========================================================================
   AI Calendar - Logic & Simulation Script
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    // 1. DOM Elements
    const monthYearText = document.getElementById('currentMonthYear');
    const prevMonthBtn = document.getElementById('prevMonthBtn');
    const nextMonthBtn = document.getElementById('nextMonthBtn');
    const calendarDays = document.getElementById('calendarDays');
    
    const selectedDayName = document.getElementById('selectedDayName');
    const selectedDayNum = document.getElementById('selectedDayNum');
    const selectedFullDateText = document.getElementById('selectedFullDate');
    const eventsList = document.getElementById('eventsList');
    
    const addEventForm = document.getElementById('addEventForm');
    const eventTitle = document.getElementById('eventTitle');
    const eventDate = document.getElementById('eventDate');
    const eventTime = document.getElementById('eventTime');
    const eventLocation = document.getElementById('eventLocation');
    const eventNotes = document.getElementById('eventNotes');
    
    const dropZone = document.getElementById('dropZone');
    const screenshotInput = document.getElementById('screenshotInput');
    const demoBtn1 = document.getElementById('demoBtn1');
    const demoBtn2 = document.getElementById('demoBtn2');
    const aiLoader = document.getElementById('aiLoader');

    // 2. State Variables
    let today = new Date();
    let currentMonth = today.getMonth();
    let currentYear = today.getFullYear();
    let selectedDateStr = formatDateKey(today); // Default: today 'YYYY-MM-DD'

    // 3. Mock/Initial Data
    const defaultEvents = {};
    
    // Dynamic date calculations for mock data
    const todayStr = formatDateKey(today);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const tomorrowStr = formatDateKey(tomorrow);
    
    const nextWed = new Date(today);
    nextWed.setDate(today.getDate() + (7 - today.getDay() + 3) % 7); // Next Wednesday
    if (nextWed <= today) nextWed.setDate(nextWed.getDate() + 7);
    const nextWedStr = formatDateKey(nextWed);

    // Populate initial default events
    defaultEvents[todayStr] = [
        {
            title: '総合科学特論（web3AI）授業',
            time: '13:00',
            location: '3号館302教室',
            notes: '第3回講義：バグリストとVPCの発表'
        }
    ];
    defaultEvents[tomorrowStr] = [
        {
            title: '課題の復習とレポまとめ',
            time: '18:00',
            location: '自宅',
            notes: 'バグリストの追加修正とGitHub Pagesの設定確認'
        }
    ];
    defaultEvents[nextWedStr] = [
        {
            title: 'web3・AI概論 第3回宿題提出期限',
            time: '23:59',
            location: 'ポータルサイト',
            notes: 'GitHub公開リポジトリのURLを貼って提出すること。遅れないよう注意！'
        }
    ];

    // Load from localStorage or set default
    let events = JSON.parse(localStorage.getItem('calendar_events')) || defaultEvents;

    // 4. Initialization
    initApp();

    function initApp() {
        renderCalendar();
        updateSelectedDateDisplay(today);
        renderEventsList();
        setupEventListeners();
        
        // Pre-fill today's date in the add form
        eventDate.value = selectedDateStr;
    }

    // 5. Utility Functions
    function formatDateKey(dateObj) {
        const year = dateObj.getFullYear();
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const day = String(dateObj.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    function getJapaneseDayName(dayNum) {
        const days = ['日', '月', '火', '水', '木', '金', '土'];
        return days[dayNum];
    }
    
    function getEnglishDayName(dayNum) {
        const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
        return days[dayNum];
    }

    // Save events to localStorage
    function saveEvents() {
        localStorage.setItem('calendar_events', JSON.stringify(events));
    }

    // 6. Calendar Rendering
    function renderCalendar() {
        calendarDays.innerHTML = '';
        
        // Month title
        monthYearText.textContent = `${currentYear}年 ${currentMonth + 1}月`;

        // First day of the current month
        const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
        const startDayIndex = firstDayOfMonth.getDay(); // 0 is Sunday
        
        // Total days in the current month
        const totalDaysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
        
        // Days in the previous month (for padding)
        const prevMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
        const prevMonthVal = currentMonth === 0 ? 11 : currentMonth - 1;
        const totalDaysInPrevMonth = new Date(prevMonthYear, prevMonthVal + 1, 0).getDate();

        // 1. Render previous month's trailing days
        for (let i = startDayIndex - 1; i >= 0; i--) {
            const dayNum = totalDaysInPrevMonth - i;
            const cell = createDayCell(dayNum, true);
            calendarDays.appendChild(cell);
        }

        // 2. Render current month's days
        for (let day = 1; day <= totalDaysInMonth; day++) {
            const cellDate = new Date(currentYear, currentMonth, day);
            const dateStr = formatDateKey(cellDate);
            const isToday = cellDate.toDateString() === today.toDateString();
            const isSelected = dateStr === selectedDateStr;
            
            const cell = createDayCell(day, false, isToday, isSelected, dateStr);
            calendarDays.appendChild(cell);
        }

        // 3. Render next month's padding days (to fill 42 cells grid if needed)
        const totalCellsRendered = startDayIndex + totalDaysInMonth;
        const remainingCells = 42 - totalCellsRendered;
        for (let day = 1; day <= remainingCells; day++) {
            const cell = createDayCell(day, true);
            calendarDays.appendChild(cell);
        }
    }

    function createDayCell(dayNum, isPrevNext, isToday = false, isSelected = false, dateStr = '') {
        const cell = document.createElement('div');
        cell.className = 'day-cell';
        cell.textContent = dayNum;

        if (isPrevNext) {
            cell.classList.add('prev-next-month');
        } else {
            cell.dataset.date = dateStr;
            
            if (isToday) cell.classList.add('today');
            if (isSelected) cell.classList.add('selected');

            // Render indicator dots if events exist on this date
            if (events[dateStr] && events[dateStr].length > 0) {
                const dotsContainer = document.createElement('div');
                dotsContainer.className = 'event-dots-container';
                
                // Show maximum of 3 dots
                const dotsCount = Math.min(events[dateStr].length, 3);
                for (let i = 0; i < dotsCount; i++) {
                    const dot = document.createElement('div');
                    dot.className = 'event-dot';
                    dotsContainer.appendChild(dot);
                }
                cell.appendChild(dotsContainer);
            }

            // Cell click handler
            cell.addEventListener('click', () => {
                // Remove previous selected class
                const prevSelected = calendarDays.querySelector('.day-cell.selected');
                if (prevSelected) prevSelected.classList.remove('selected');
                
                cell.classList.add('selected');
                selectedDateStr = dateStr;
                
                // Set form date value to selected date
                eventDate.value = dateStr;
                
                // Update detail views
                const clickedDate = new Date(dateStr);
                updateSelectedDateDisplay(clickedDate);
                renderEventsList();
            });
        }

        return cell;
    }

    // Update selected date header in the schedule area
    function updateSelectedDateDisplay(dateObj) {
        selectedDayName.textContent = getEnglishDayName(dateObj.getDay());
        selectedDayNum.textContent = String(dateObj.getDate()).padStart(2, '0');
        
        const jpDay = getJapaneseDayName(dateObj.getDay());
        selectedFullDateText.textContent = `${dateObj.getFullYear()}年${dateObj.getMonth() + 1}月${dateObj.getDate()}日 (${jpDay})`;
    }

    // 7. Render Events List
    function renderEventsList() {
        eventsList.innerHTML = '';
        const dayEvents = events[selectedDateStr] || [];

        if (dayEvents.length === 0) {
            eventsList.innerHTML = `
                <div class="no-events">
                    <svg class="no-events-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="12" y1="8" x2="12" y2="12"/>
                        <line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                    <p>この日の予定はありません。</p>
                </div>
            `;
            return;
        }

        // Sort events by time
        const sortedEvents = [...dayEvents].sort((a, b) => a.time.localeCompare(b.time));

        sortedEvents.forEach((ev, idx) => {
            const card = document.createElement('div');
            card.className = 'event-card';
            
            let locationHtml = ev.location ? `
                <div class="event-card-location">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z"/><circle cx="12" cy="10" r="3"/></svg>
                    <span>${ev.location}</span>
                </div>
            ` : '';
            
            let notesHtml = ev.notes ? `
                <div class="event-card-notes">${ev.notes}</div>
            ` : '';

            card.innerHTML = `
                <div class="event-card-left">
                    <div class="event-card-time-row">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                        <span>${ev.time}</span>
                    </div>
                    <div class="event-card-title">${escapeHTML(ev.title)}</div>
                    ${locationHtml}
                    ${notesHtml}
                </div>
                <button class="event-delete-btn" aria-label="削除" data-index="${idx}">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                </button>
            `;

            // Delete event handler
            card.querySelector('.event-delete-btn').addEventListener('click', (e) => {
                const targetIdx = parseInt(e.currentTarget.dataset.index);
                deleteEvent(selectedDateStr, targetIdx);
            });

            eventsList.appendChild(card);
        });
    }

    function escapeHTML(str) {
        return str.replace(/[&<>'"]/g, 
            tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
        );
    }

    // Delete Event
    function deleteEvent(dateStr, index) {
        if (!events[dateStr]) return;
        
        events[dateStr].splice(index, 1);
        if (events[dateStr].length === 0) {
            delete events[dateStr];
        }
        
        saveEvents();
        renderCalendar();
        renderEventsList();
    }

    // 8. Event Listeners Setup
    function setupEventListeners() {
        // Month switching
        prevMonthBtn.addEventListener('click', () => {
            currentMonth--;
            if (currentMonth < 0) {
                currentMonth = 11;
                currentYear--;
            }
            renderCalendar();
        });

        nextMonthBtn.addEventListener('click', () => {
            currentMonth++;
            if (currentMonth > 11) {
                currentMonth = 0;
                currentYear++;
            }
            renderCalendar();
        });

        // Form Submit
        addEventForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const titleVal = eventTitle.value.trim();
            const dateVal = eventDate.value;
            const timeVal = eventTime.value;
            const locVal = eventLocation.value.trim();
            const notesVal = eventNotes.value.trim();

            if (!titleVal || !dateVal || !timeVal) return;

            const newEvent = {
                title: titleVal,
                time: timeVal,
                location: locVal || '',
                notes: notesVal || ''
            };

            if (!events[dateVal]) {
                events[dateVal] = [];
            }
            events[dateVal].push(newEvent);

            saveEvents();
            
            // Re-render
            renderCalendar();
            
            // If the added event is on the currently active date view, update the view
            if (dateVal === selectedDateStr) {
                renderEventsList();
            } else {
                // Switch focus to the date of the added event
                selectedDateStr = dateVal;
                const addedDate = new Date(dateVal);
                currentYear = addedDate.getFullYear();
                currentMonth = addedDate.getMonth();
                renderCalendar();
                updateSelectedDateDisplay(addedDate);
                renderEventsList();
            }

            // Reset form
            addEventForm.reset();
            eventDate.value = selectedDateStr; // Keep current active date in field
            
            // Alert user of success (subtle UI effect)
            showTemporaryNotification('予定を登録しました！');
        });

        // AI Extractor Simulator Actions
        demoBtn1.addEventListener('click', () => {
            // Demo LINE script: "来週水曜日13時に約束..."
            const text = "LINEトーク: 「来週水曜日の13:00から、学食でみんなでweb3の課題やる約束したから！忘れないでねー！」";
            simulateAIExtraction(text, 'line');
        });

        demoBtn2.addEventListener('click', () => {
            // Demo Photo script: 提出〆切メモ
            const text = "撮影画像: 「AI概論の課題3提出は明日7/10の23:59まで。ポータルにGitHubレポリンク提出のこと」";
            simulateAIExtraction(text, 'memo');
        });

        // Drag & Drop simulation
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('dragover');
        });

        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('dragover');
        });

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('dragover');
            simulateAIExtraction("ユーザーアップロード画像 (Screenshot)", 'file');
        });

        screenshotInput.addEventListener('change', () => {
            if (screenshotInput.files.length > 0) {
                simulateAIExtraction("ユーザーアップロード画像: " + screenshotInput.files[0].name, 'file');
            }
        });
    }

    // 9. AI Extractor Simulation Logic
    function simulateAIExtraction(inputText, type) {
        aiLoader.style.display = 'flex';
        
        // 2 seconds scanning animation
        setTimeout(() => {
            aiLoader.style.display = 'none';
            
            let title = '';
            let dateVal = '';
            let timeVal = '';
            let location = '';
            let notes = '';

            if (type === 'line') {
                title = 'みんなでweb3の課題作成 (LINE自動抽出)';
                dateVal = nextWedStr; // Next Wednesday
                timeVal = '13:00';
                location = '大学の学食';
                notes = 'LINEグループのやり取りから自動抽出しました。';
            } else if (type === 'memo') {
                title = '★ web3・AI概論 第3回宿題提出〆切';
                dateVal = tomorrowStr; // Tomorrow
                timeVal = '23:59';
                location = '講義ポータル';
                notes = '手書きのメモ画像から自動抽出しました。提出物：GitHub公開リポジトリURL。';
            } else {
                // Random default mock extraction for file uploads
                title = 'スクショから自動抽出された予定';
                dateVal = todayStr;
                timeVal = '15:30';
                location = '会議室A / オンライン';
                notes = 'アップロードされたスクリーンショットから日程データを抽出しました。';
            }

            // Fill form with animation
            animateFieldFill(eventTitle, title);
            animateFieldFill(eventDate, dateVal);
            animateFieldFill(eventTime, timeVal);
            animateFieldFill(eventLocation, location);
            animateFieldFill(eventNotes, notes);

            showTemporaryNotification('AI解析完了：予定フォームに自動入力しました！');
        }, 2200);
    }

    function animateFieldFill(inputEl, value) {
        inputEl.value = '';
        inputEl.classList.add('highlight-flash');
        
        // Remove flash class after animation
        setTimeout(() => {
            inputEl.classList.remove('highlight-flash');
        }, 1000);
        
        // Typing effect
        let index = 0;
        const interval = setInterval(() => {
            if (index < value.length) {
                inputEl.value += value.charAt(index);
                index++;
            } else {
                clearInterval(interval);
                // Trigger change event to ensure date binding updates correctly
                inputEl.dispatchEvent(new Event('input'));
            }
        }, Math.min(25, 400 / value.length)); // Speed adjusts based on text length
    }

    // Temporary toast message
    function showTemporaryNotification(msg) {
        const toast = document.createElement('div');
        toast.className = 'toast-notification';
        toast.textContent = msg;
        document.body.appendChild(toast);
        
        // Add active class after tiny delay for transition
        setTimeout(() => toast.classList.add('active'), 50);
        
        // Remove after 3s
        setTimeout(() => {
            toast.classList.remove('active');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
});

// Add extra utility styles dynamically for notification & flash effects
const extraStyle = document.createElement('style');
extraStyle.textContent = `
    .toast-notification {
        position: fixed;
        bottom: 30px;
        left: 50%;
        transform: translate(-50%, 50px);
        background: linear-gradient(135deg, #8b5cf6 0%, #06b6d4 100%);
        color: white;
        padding: 12px 24px;
        border-radius: 12px;
        font-weight: 600;
        font-size: 0.9rem;
        z-index: 2000;
        opacity: 0;
        box-shadow: 0 10px 25px rgba(139, 92, 246, 0.35);
        transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.3s ease;
        pointer-events: none;
    }
    .toast-notification.active {
        transform: translate(-50%, 0);
        opacity: 1;
    }
    
    /* Input flash highlight effect */
    .highlight-flash {
        animation: borderPulse 1s ease-out;
    }
    @keyframes borderPulse {
        0% { border-color: #06b6d4; box-shadow: 0 0 15px rgba(6, 182, 212, 0.6); background: rgba(6, 182, 212, 0.1); }
        100% { border-color: rgba(255, 255, 255, 0.08); box-shadow: none; background: rgba(0, 0, 0, 0.25); }
    }
`;
document.head.appendChild(extraStyle);
