/**
 * AI Calendar Prototype - Core JavaScript Logic
 */

document.addEventListener('DOMContentLoaded', () => {
  // ==========================================
  // 1. State Management & Variables
  // ==========================================
  
  let selectedDate = new Date(); // 現在選択されている日
  let currentMonth = new Date(); // カレンダーが表示している月
  
  // LocalStorageから予定データを読み込み、なければ空オブジェクト
  let schedules = JSON.parse(localStorage.getItem('ai-calendar-schedules')) || {};
  
  // API設定の読み込み
  let apiKey = localStorage.getItem('ai-calendar-api-key') || '';
  let demoMode = localStorage.getItem('ai-calendar-demo-mode') !== 'false'; // デフォルトはtrue
  
  // ==========================================
  // 2. DOM Elements
  // ==========================================
  
  // Header & Settings
  const btnApiSettings = document.getElementById('btn-api-settings');
  const modalApiSettings = document.getElementById('modal-api-settings');
  const inputApiKey = document.getElementById('input-api-key');
  const checkboxDemoMode = document.getElementById('checkbox-demo-mode');
  const btnSaveApi = document.getElementById('btn-save-api');
  const btnExport = document.getElementById('btn-export');
  const btnImport = document.getElementById('btn-import');
  const importFileInput = document.getElementById('import-file-input');
  
  // Calendar
  const calendarMonthYear = document.getElementById('calendar-month-year');
  const btnPrevMonth = document.getElementById('btn-prev-month');
  const btnToday = document.getElementById('btn-today');
  const btnNextMonth = document.getElementById('btn-next-month');
  const calendarDays = document.getElementById('calendar-days');
  
  // Schedule Panel
  const selectedDateTitle = document.getElementById('selected-date-title');
  const btnAddSchedule = document.getElementById('btn-add-schedule');
  const scheduleList = document.getElementById('schedule-list');
  const modalAddSchedule = document.getElementById('modal-add-schedule');
  const formManualSchedule = document.getElementById('form-manual-schedule');
  
  // Image Analyzer
  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('file-input');
  const previewContainer = document.getElementById('preview-container');
  const imagePreview = document.getElementById('image-preview');
  const btnClearImage = document.getElementById('btn-clear-image');
  const btnAnalyzeImage = document.getElementById('btn-analyze-image');
  const modalAnalysisResult = document.getElementById('modal-analysis-result');
  const formConfirmAnalysis = document.getElementById('form-confirm-analysis');
  
  // Global Components
  const globalLoader = document.getElementById('global-loader');
  const loaderMessage = document.getElementById('loader-message');
  const toast = document.getElementById('toast');
  const toastIcon = document.getElementById('toast-icon');
  const toastMessage = document.getElementById('toast-message');
  
  // ==========================================
  // 3. Initialization
  // ==========================================
  
  // UIの初期設定
  inputApiKey.value = apiKey;
  checkboxDemoMode.checked = demoMode;
  
  // カレンダーと予定リストをレンダリング
  renderCalendar();
  renderScheduleList();
  
  // Lucide Iconsを有効化
  lucide.createIcons();

  // ==========================================
  // 4. Calendar Logic & Rendering
  // ==========================================
  
  function getFormattedDate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function getJapaneseWeekday(date) {
    const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
    return weekdays[date.getDay()];
  }

  function formatMonthDay(dateStr) {
    const [, m, d] = dateStr.split('-');
    return `${parseInt(m, 10)}/${parseInt(d, 10)}`;
  }

  function renderCalendar() {
    calendarDays.innerHTML = '';
    
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    // 表示する月のヘッダーを更新
    calendarMonthYear.textContent = `${year}年${month + 1}月`;
    
    // 表示月の最初の日の曜日と、最後の日付を取得
    const firstDayIndex = new Date(year, month, 1).getDay();
    const lastDate = new Date(year, month + 1, 0).getDate();
    
    // 前月の最後の日付を取得（空白埋め用）
    const prevLastDate = new Date(year, month, 0).getDate();
    
    // 翌月の最初の日から埋める日数
    const totalCells = 42; // 6行 x 7日
    
    let daysHTML = '';
    
    // 1. 前月の日付セルを生成
    for (let i = firstDayIndex; i > 0; i--) {
      const prevDate = new Date(year, month - 1, prevLastDate - i + 1);
      daysHTML += createDayCellHTML(prevDate, true);
    }
    
    // 2. 当月の日付セルを生成
    for (let i = 1; i <= lastDate; i++) {
      const currDate = new Date(year, month, i);
      daysHTML += createDayCellHTML(currDate, false);
    }
    
    // 3. 翌月の日付セルを生成
    const currentCells = firstDayIndex + lastDate;
    const nextMonthDaysNeeded = totalCells - currentCells;
    for (let i = 1; i <= nextMonthDaysNeeded; i++) {
      const nextDate = new Date(year, month + 1, i);
      daysHTML += createDayCellHTML(nextDate, true);
    }
    
    calendarDays.innerHTML = daysHTML;
    
    // 各セルにクリックイベントを付与
    document.querySelectorAll('.day-cell').forEach(cell => {
      cell.addEventListener('click', (e) => {
        const dateStr = cell.getAttribute('data-date');
        selectedDate = new Date(dateStr);
        
        // selectedクラスの切り替え
        document.querySelectorAll('.day-cell').forEach(c => c.classList.remove('selected'));
        cell.classList.add('selected');
        
        // 予定リストの更新
        renderScheduleList();
      });
    });
  }
  
  function createDayCellHTML(date, isOtherMonth) {
    const dateStr = getFormattedDate(date);
    const dayNum = date.getDate();
    
    // クラス決定
    let classes = ['day-cell'];
    if (isOtherMonth) classes.push('other-month');
    
    const todayStr = getFormattedDate(new Date());
    if (dateStr === todayStr) classes.push('today');
    
    if (dateStr === getFormattedDate(selectedDate)) classes.push('selected');
    
    // 該当日の予定を取得
    const dayEvents = schedules[dateStr] || [];
    let eventsHTML = '';
    
    // 時間順にソートしてバッジを表示（最大3件まで）
    const sortedEvents = [...dayEvents].sort((a, b) => {
      if (!a.startTime) return 1;
      if (!b.startTime) return -1;
      return a.startTime.localeCompare(b.startTime);
    });
    
    sortedEvents.slice(0, 2).forEach(evt => {
      const timeStr = evt.startTime ? `${evt.startTime} ` : '';
      const timeClass = evt.startTime ? 'has-time' : '';
      const safeTitle = escapeHTML(evt.title);
      eventsHTML += `<div class="event-badge ${timeClass}" title="${safeTitle}">${timeStr}${safeTitle}</div>`;
    });
    
    if (dayEvents.length > 2) {
      eventsHTML += `<div class="event-badge more">+${dayEvents.length - 2}件</div>`;
    }
    
    return `
      <div class="${classes.join(' ')}" data-date="${dateStr}">
        <span class="day-number">${dayNum}</span>
        <div class="cell-events">
          ${eventsHTML}
        </div>
      </div>
    `;
  }
  
  // カレンダーナビゲーション
  btnPrevMonth.addEventListener('click', () => {
    currentMonth.setMonth(currentMonth.getMonth() - 1);
    renderCalendar();
  });
  
  btnNextMonth.addEventListener('click', () => {
    currentMonth.setMonth(currentMonth.getMonth() + 1);
    renderCalendar();
  });
  
  btnToday.addEventListener('click', () => {
    selectedDate = new Date();
    currentMonth = new Date();
    renderCalendar();
    renderScheduleList();
  });
  
  // ==========================================
  // 5. Schedule Details Panel & Manual Add
  // ==========================================
  
  function renderScheduleList() {
    const dateStr = getFormattedDate(selectedDate);
    const formattedTitle = `${selectedDate.getMonth() + 1}月${selectedDate.getDate()}日(${getJapaneseWeekday(selectedDate)})の予定`;
    selectedDateTitle.textContent = formattedTitle;
    
    scheduleList.innerHTML = '';
    
    const dayEvents = schedules[dateStr] || [];
    
    if (dayEvents.length === 0) {
      scheduleList.innerHTML = `
        <div class="empty-state">
          <i data-lucide="calendar-range"></i>
          <p>この日の予定はありません</p>
        </div>
      `;
      lucide.createIcons();
      return;
    }
    
    // 時間順ソート
    const sortedEvents = [...dayEvents].sort((a, b) => {
      if (!a.startTime) return 1;
      if (!b.startTime) return -1;
      return a.startTime.localeCompare(b.startTime);
    });
    
    sortedEvents.forEach(evt => {
      const item = document.createElement('div');
      item.className = 'schedule-item';
      
      let timeStart, timeEnd;
      if (evt.groupId) {
        const startMD = formatMonthDay(evt.groupStartDate);
        const endMD = formatMonthDay(evt.groupEndDate);
        timeStart = evt.startTime ? `${startMD} ${evt.startTime}` : startMD;
        timeEnd = `〜 ${evt.endTime ? `${endMD} ${evt.endTime}` : endMD}`;
      } else {
        timeStart = evt.startTime || '--:--';
        timeEnd = evt.endTime ? `〜 ${evt.endTime}` : '';
      }
      
      item.innerHTML = `
        <div class="schedule-time-indicator">
          <span class="schedule-time-start">${timeStart}</span>
          <span class="schedule-time-end">${timeEnd}</span>
        </div>
        <div class="schedule-info">
          <h4 class="schedule-title">${escapeHTML(evt.title)}</h4>
          <p class="schedule-desc">${escapeHTML(evt.description || '').replace(/\n/g, '<br>')}</p>
        </div>
        <div class="schedule-actions">
          <button class="btn-icon btn-danger-icon btn-delete-schedule" data-id="${evt.id}" title="予定を削除">
            <i data-lucide="trash-2"></i>
          </button>
        </div>
      `;
      
      // 削除ボタンイベント
      item.querySelector('.btn-delete-schedule').addEventListener('click', () => {
        deleteSchedule(dateStr, evt.id);
      });
      
      scheduleList.appendChild(item);
    });
    
    lucide.createIcons();
  }
  
  function deleteSchedule(dateStr, id) {
    const evt = (schedules[dateStr] || []).find(e => e.id === id);
    const groupId = evt && evt.groupId;

    const confirmMsg = groupId
      ? 'この予定は複数日にわたる予定です。すべての日程を削除しますか？'
      : 'この予定を削除しますか？';

    if (confirm(confirmMsg)) {
      if (groupId) {
        // 複数日の予定はグループIDが一致する全日程を削除
        Object.keys(schedules).forEach(dStr => {
          schedules[dStr] = schedules[dStr].filter(e => e.groupId !== groupId);
          if (schedules[dStr].length === 0) {
            delete schedules[dStr];
          }
        });
      } else {
        schedules[dateStr] = schedules[dateStr].filter(e => e.id !== id);
        if (schedules[dateStr].length === 0) {
          delete schedules[dateStr];
        }
      }
      saveSchedules();
      renderCalendar();
      renderScheduleList();
      showToast(groupId ? 'すべての日程の予定を削除しました' : '予定を削除しました', 'success');
    }
  }
  
  function saveSchedules() {
    localStorage.setItem('ai-calendar-schedules', JSON.stringify(schedules));
  }

  // ==========================================
  // 5.5 Export / Import (バックアップ・他端末への移行)
  // ==========================================

  function isValidSchedulesShape(obj) {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return false;
    return Object.values(obj).every(v => Array.isArray(v));
  }

  btnExport.addEventListener('click', () => {
    const exportData = {
      app: 'ai-calendar-prototype',
      version: 1,
      exportedAt: new Date().toISOString(),
      schedules
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `calendar-backup-${getFormattedDate(new Date())}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast('予定をエクスポートしました', 'success');
  });

  btnImport.addEventListener('click', () => {
    importFileInput.click();
  });

  importFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target.result);
        const importedSchedules = (parsed && typeof parsed.schedules === 'object' && parsed.schedules !== null)
          ? parsed.schedules
          : parsed;

        if (!isValidSchedulesShape(importedSchedules)) {
          throw new Error('ファイルの形式が正しくありません');
        }

        const eventCount = Object.values(importedSchedules).reduce((sum, arr) => sum + arr.length, 0);

        if (eventCount === 0) {
          showToast('ファイルに予定が含まれていません', 'error');
          return;
        }

        if (!confirm(`${eventCount}件の予定を現在のカレンダーに追加します（既存の予定は削除されません）。よろしいですか？`)) {
          return;
        }

        Object.keys(importedSchedules).forEach(dateStr => {
          if (!schedules[dateStr]) {
            schedules[dateStr] = [];
          }
          schedules[dateStr].push(...importedSchedules[dateStr]);
        });

        saveSchedules();
        renderCalendar();
        renderScheduleList();
        showToast(`${eventCount}件の予定をインポートしました！`, 'success');
      } catch (err) {
        console.error(err);
        showToast(`インポートに失敗しました: ${err.message}`, 'error');
      } finally {
        importFileInput.value = '';
      }
    };
    reader.readAsText(file);
  });

  // 複数日トグル要素
  const checkboxMultiDay = document.getElementById('checkbox-multi-day');
  const singleDayInput = document.getElementById('single-day-input');
  const multiDayInput = document.getElementById('multi-day-input');
  const scheduleDateStart = document.getElementById('schedule-date-start');
  const scheduleDateEnd = document.getElementById('schedule-date-end');
  const scheduleDate = document.getElementById('schedule-date');
  
  // 複数日トグルの切り替え制御
  checkboxMultiDay.addEventListener('change', () => {
    const isMultiDay = checkboxMultiDay.checked;
    if (isMultiDay) {
      singleDayInput.style.display = 'none';
      multiDayInput.style.display = '';
      scheduleDate.removeAttribute('required');
      scheduleDateStart.setAttribute('required', '');
      scheduleDateEnd.setAttribute('required', '');
      // 単日の値を開始日にコピー
      if (scheduleDate.value) {
        scheduleDateStart.value = scheduleDate.value;
      }
    } else {
      singleDayInput.style.display = '';
      multiDayInput.style.display = 'none';
      scheduleDate.setAttribute('required', '');
      scheduleDateStart.removeAttribute('required');
      scheduleDateEnd.removeAttribute('required');
      // 開始日の値を単日にコピー
      if (scheduleDateStart.value) {
        scheduleDate.value = scheduleDateStart.value;
      }
    }
  });

  // 手動追加モーダルの表示制御
  btnAddSchedule.addEventListener('click', () => {
    // 選択された日付をフォームの初期値にする
    const dateStr = getFormattedDate(selectedDate);
    scheduleDate.value = dateStr;
    scheduleDateStart.value = dateStr;
    scheduleDateEnd.value = '';
    // フォームクリア
    document.getElementById('schedule-title').value = '';
    document.getElementById('schedule-start-time').value = '';
    document.getElementById('schedule-end-time').value = '';
    document.getElementById('schedule-description').value = '';
    // 複数日トグルをリセット
    checkboxMultiDay.checked = false;
    singleDayInput.style.display = '';
    multiDayInput.style.display = 'none';
    scheduleDate.setAttribute('required', '');
    scheduleDateStart.removeAttribute('required');
    scheduleDateEnd.removeAttribute('required');
    
    openModal(modalAddSchedule);
  });
  
  // 手動追加の保存
  formManualSchedule.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const title = document.getElementById('schedule-title').value.trim();
    const startTime = document.getElementById('schedule-start-time').value;
    const endTime = document.getElementById('schedule-end-time').value;
    const description = document.getElementById('schedule-description').value.trim();
    const isMultiDay = checkboxMultiDay.checked;
    
    if (!title) return;
    
    if (isMultiDay) {
      // 複数日モード
      const startDateStr = scheduleDateStart.value;
      const endDateStr = scheduleDateEnd.value;
      
      if (!startDateStr || !endDateStr) {
        showToast('開始日と終了日を入力してください', 'error');
        return;
      }
      
      const start = new Date(startDateStr);
      const end = new Date(endDateStr);
      
      if (end < start) {
        showToast('終了日は開始日以降の日付を指定してください', 'error');
        return;
      }
      
      // 日数計算（上限チェック）
      const diffDays = Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1;
      if (diffDays > 60) {
        showToast('60日を超える予定は登録できません', 'error');
        return;
      }
      
      // 開始日から終了日まで各日に予定を登録
      const groupId = 'g-' + Date.now().toString();
      const current = new Date(start);
      while (current <= end) {
        const dStr = getFormattedDate(current);
        const newEvent = {
          id: Date.now().toString() + '-' + dStr,
          groupId,
          groupStartDate: startDateStr,
          groupEndDate: endDateStr,
          title,
          startTime: startTime || null,
          endTime: endTime || null,
          description: description || null
        };
        
        if (!schedules[dStr]) {
          schedules[dStr] = [];
        }
        schedules[dStr].push(newEvent);
        current.setDate(current.getDate() + 1);
      }
      
      saveSchedules();
      closeModal(modalAddSchedule);
      
      // カレンダーを開始日の月に切り替える
      selectedDate = new Date(startDateStr);
      currentMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
      
      renderCalendar();
      renderScheduleList();
      showToast(`${diffDays}日間の予定を追加しました！`, 'success');
      
    } else {
      // 単日モード（従来通り）
      const dateStr = scheduleDate.value;
      if (!dateStr) return;
      
      const newEvent = {
        id: Date.now().toString(),
        title,
        startTime: startTime || null,
        endTime: endTime || null,
        description: description || null
      };
      
      if (!schedules[dateStr]) {
        schedules[dateStr] = [];
      }
      
      schedules[dateStr].push(newEvent);
      saveSchedules();
      
      closeModal(modalAddSchedule);
      
      // カレンダーを登録した日付の月に切り替える
      selectedDate = new Date(dateStr);
      currentMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
      
      renderCalendar();
      renderScheduleList();
      showToast('予定を追加しました！', 'success');
    }
  });
  
  // ==========================================
  // 6. Image Drag & Drop / Upload
  // ==========================================
  
  // ドラッグ＆ドロップイベント
  ['dragenter', 'dragover'].forEach(eventName => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      dropzone.classList.add('dragover');
    }, false);
  });
  
  ['dragleave', 'drop'].forEach(eventName => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
    }, false);
  });
  
  dropzone.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    const files = dt.files;
    handleFiles(files);
  });
  
  fileInput.addEventListener('change', (e) => {
    handleFiles(e.target.files);
  });
  
  function handleFiles(files) {
    if (files.length === 0) return;
    const file = files[0];
    
    if (!file.type.startsWith('image/')) {
      showToast('画像ファイルを選択してください。', 'error');
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
      imagePreview.src = e.target.result;
      previewContainer.style.display = 'block';
    };
    reader.readAsDataURL(file);
  }
  
  // 画像プレビューの解除
  btnClearImage.addEventListener('click', (e) => {
    e.stopPropagation(); // 親のdropzoneクリックを発火させない
    clearImagePreview();
  });
  
  function clearImagePreview() {
    fileInput.value = '';
    imagePreview.src = '';
    previewContainer.style.display = 'none';
  }
  
  // ==========================================
  // 7. AI Analysis Logic (Gemini API / Mock)
  // ==========================================
  
  btnAnalyzeImage.addEventListener('click', async (e) => {
    e.stopPropagation();
    
    const imageSrc = imagePreview.src;
    if (!imageSrc) return;
    
    // API設定の再確認
    apiKey = localStorage.getItem('ai-calendar-api-key') || '';
    demoMode = localStorage.getItem('ai-calendar-demo-mode') !== 'false';
    
    showLoader('AIが画像を解析中...');
    
    try {
      if (demoMode || !apiKey) {
        // デモモード（モック解析）
        await new Promise(resolve => setTimeout(resolve, 2500)); // 2.5秒待機
        
        // 現在の日付から1週間後をデフォルトのモック日付にする
        const mockDate = new Date();
        mockDate.setDate(mockDate.getDate() + 7);
        const mockDateStr = getFormattedDate(mockDate);
        const mockDate2 = new Date(mockDate);
        mockDate2.setDate(mockDate2.getDate() + 1);
        const mockDateStr2 = getFormattedDate(mockDate2);

        const mockCampEndDate = new Date(mockDate2);
        mockCampEndDate.setDate(mockCampEndDate.getDate() + 2);
        const mockCampEndDateStr = getFormattedDate(mockCampEndDate);

        // 複数予定の検出デモ（1枚のスクショに複数の予定が写っているケース、うち1件は複数日の合宿）
        const mockResult = [
          {
            title: 'web3・AI概論の最終成果物発表会',
            date: mockDateStr,
            endDate: null,
            startTime: '13:00',
            endTime: '14:30',
            description: '場所：3号館4階講義室\n持ち物：PC、プレゼン資料\n※スクリーンショットから自動抽出されたデモ予定です。'
          },
          {
            title: '研究室合宿',
            date: mockDateStr2,
            endDate: mockCampEndDateStr,
            startTime: '10:00',
            endTime: null,
            description: '場所：〇〇セミナーハウス\n※複数日の予定検出のデモ用データです。'
          }
        ];

        showAnalysisConfirmation(mockResult);
        showToast('デモモードで解析結果を出力しました', 'success');
      } else {
        // 本物のGemini APIリクエスト
        const base64Data = imageSrc.split(',')[1];
        const mimeType = imageSrc.split(';')[0].split(':')[1];
        
        const todayStr = getFormattedDate(new Date());
        
        const prompt = `この画像はメールまたはLINEのスケジュール連絡のスクリーンショットです。
この画像に含まれる予定をすべて抽出してください。1件の場合も、複数件の場合も、必ずJSON配列で出力してください。
各予定について「予定のタイトル」「開始日（YYYY-MM-DDフォーマット）」「終了日（複数日にわたる予定の場合。YYYY-MM-DDフォーマット、単日の予定ならnull）」「開始時間（HH:MM）」「終了時間（HH:MM、なければnull）」「詳細（場所やその他の情報）」を抽出し、指定されたJSONフォーマットのみで出力してください。

合宿・旅行・研修など「7/20〜7/22」「7月20日から22日まで」のように連続する複数日にわたる予定は、開始日をdate、最終日をendDateに設定してください。単日の予定の場合はendDateを必ずnullにしてください。

基準日（今日の日付）は ${todayStr} です。もし画像内の「木曜日」「来週の火曜」「7/12」といった表現から年が特定できない場合、この基準日を元に最も整合性のある日付を推測して割り当ててください。

JSONスキーマ（配列。予定が1件のみでも要素1件の配列にすること）:
[
  {
    "title": "予定タイトル",
    "date": "YYYY-MM-DD",
    "endDate": "YYYY-MM-DD" | null,
    "startTime": "HH:MM" | null,
    "endTime": "HH:MM" | null,
    "description": "場所や持ち物、追加情報など"
  }
]`;

                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: prompt },
                  {
                    inlineData: {
                      mimeType: mimeType,
                      data: base64Data
                    }
                  }
                ]
              }
            ],
            generationConfig: {
              responseMimeType: "application/json"
            }
          })
        });
        
        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error?.message || `APIエラー (ステータス: ${response.status})`);
        }
        
        const responseData = await response.json();
        const responseText = responseData.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (!responseText) {
          throw new Error('解析結果の取得に失敗しました。画像のテキストが読み取りづらい可能性があります。');
        }
        
        const parsedResult = JSON.parse(responseText);
        showAnalysisConfirmation(parsedResult);
        showToast('AI解析が完了しました！', 'success');
      }
    } catch (error) {
      console.error(error);
      showToast(`解析エラー: ${error.message}`, 'error');
    } finally {
      hideLoader();
    }
  });
  
  const analysisItemsContainer = document.getElementById('analysis-items-container');

  function showAnalysisConfirmation(data) {
    // 単一オブジェクト・配列どちらで来ても配列として扱う
    const items = Array.isArray(data) ? data : [data];

    analysisItemsContainer.innerHTML = '';

    items.forEach((item, idx) => {
      const card = document.createElement('div');
      card.className = 'analysis-item';
      card.innerHTML = `
        <div class="analysis-item-header">
          <span class="analysis-item-badge">予定 ${idx + 1}</span>
          ${items.length > 1 ? '<button type="button" class="btn-icon btn-danger-icon btn-remove-analysis-item" title="この予定を除外"><i data-lucide="x"></i></button>' : ''}
        </div>
        <div class="form-group">
          <label>タイトル <span class="required">*</span></label>
          <input type="text" class="analysis-title" required>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>開始日 <span class="required">*</span></label>
            <input type="date" class="analysis-date" required>
          </div>
          <div class="form-group">
            <label>終了日（複数日の場合）</label>
            <input type="date" class="analysis-end-date">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>開始時間</label>
            <input type="time" class="analysis-start-time">
          </div>
          <div class="form-group">
            <label>終了時間</label>
            <input type="time" class="analysis-end-time">
          </div>
        </div>
        <div class="form-group">
          <label>詳細・メモ</label>
          <textarea class="analysis-description" rows="3"></textarea>
        </div>
      `;

      card.querySelector('.analysis-title').value = item.title || '';
      card.querySelector('.analysis-date').value = item.date || getFormattedDate(new Date());
      card.querySelector('.analysis-end-date').value = (item.endDate && item.endDate !== item.date) ? item.endDate : '';
      card.querySelector('.analysis-start-time').value = item.startTime || '';
      card.querySelector('.analysis-end-time').value = item.endTime || '';
      card.querySelector('.analysis-description').value = item.description || '';

      const removeBtn = card.querySelector('.btn-remove-analysis-item');
      if (removeBtn) {
        removeBtn.addEventListener('click', () => card.remove());
      }

      analysisItemsContainer.appendChild(card);
    });

    lucide.createIcons();
    openModal(modalAnalysisResult);
  }

  // AI解析結果の確認・登録
  formConfirmAnalysis.addEventListener('submit', (e) => {
    e.preventDefault();

    const cards = analysisItemsContainer.querySelectorAll('.analysis-item');

    if (cards.length === 0) {
      showToast('追加する予定がありません', 'error');
      return;
    }

    let addedCount = 0;
    let lastDateStr = null;

    cards.forEach((card, idx) => {
      const title = card.querySelector('.analysis-title').value.trim();
      const dateStr = card.querySelector('.analysis-date').value;
      const endDateStr = card.querySelector('.analysis-end-date').value;
      const startTime = card.querySelector('.analysis-start-time').value;
      const endTime = card.querySelector('.analysis-end-time').value;
      const description = card.querySelector('.analysis-description').value.trim();

      if (!title || !dateStr) return;

      const isMultiDay = !!endDateStr && endDateStr !== dateStr;

      if (isMultiDay) {
        const start = new Date(dateStr);
        const end = new Date(endDateStr);

        if (end < start) {
          showToast(`「${title}」の終了日は開始日以降の日付にしてください`, 'error');
          return;
        }

        const diffDays = Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1;
        if (diffDays > 60) {
          showToast(`「${title}」は60日を超えるため追加できません`, 'error');
          return;
        }

        // 複数日の予定は手動追加と同様にgroupIdで日程をまとめる
        const groupId = 'g-' + Date.now().toString() + '-' + idx;
        const current = new Date(start);
        while (current <= end) {
          const dStr = getFormattedDate(current);
          const newEvent = {
            id: Date.now().toString() + '-' + idx + '-' + dStr,
            groupId,
            groupStartDate: dateStr,
            groupEndDate: endDateStr,
            title,
            startTime: startTime || null,
            endTime: endTime || null,
            description: description || null
          };

          if (!schedules[dStr]) {
            schedules[dStr] = [];
          }
          schedules[dStr].push(newEvent);
          current.setDate(current.getDate() + 1);
        }

        lastDateStr = dateStr;
        addedCount++;
      } else {
        const newEvent = {
          id: Date.now().toString() + '-' + idx,
          title,
          startTime: startTime || null,
          endTime: endTime || null,
          description: description || null
        };

        if (!schedules[dateStr]) {
          schedules[dateStr] = [];
        }

        schedules[dateStr].push(newEvent);
        lastDateStr = dateStr;
        addedCount++;
      }
    });

    if (addedCount === 0) {
      showToast('タイトルと日付を入力してください', 'error');
      return;
    }

    saveSchedules();

    closeModal(modalAnalysisResult);
    clearImagePreview();

    // カレンダーを最後に追加した予定の月に切り替える
    if (lastDateStr) {
      selectedDate = new Date(lastDateStr);
      currentMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
    }

    renderCalendar();
    renderScheduleList();
    showToast(`AIが読み取った予定を${addedCount}件追加しました！`, 'success');
  });
  
  // ==========================================
  // 8. API Settings Panel Control
  // ==========================================
  
  btnApiSettings.addEventListener('click', () => {
    inputApiKey.value = localStorage.getItem('ai-calendar-api-key') || '';
    checkboxDemoMode.checked = localStorage.getItem('ai-calendar-demo-mode') !== 'false';
    openModal(modalApiSettings);
  });
  
  btnSaveApi.addEventListener('click', () => {
    const keyVal = inputApiKey.value.trim();
    const isDemo = checkboxDemoMode.checked;
    
    localStorage.setItem('ai-calendar-api-key', keyVal);
    localStorage.setItem('ai-calendar-demo-mode', isDemo ? 'true' : 'false');
    
    apiKey = keyVal;
    demoMode = isDemo;
    
    closeModal(modalApiSettings);
    
    if (!isDemo && !keyVal) {
      showToast('APIキーが空のため、デモモードで動作します', 'error');
      localStorage.setItem('ai-calendar-demo-mode', 'true');
      checkboxDemoMode.checked = true;
      demoMode = true;
    } else {
      showToast('設定を保存しました', 'success');
    }
  });
  
  // ==========================================
  // 9. UI Helpers (Modal, Toast, Loader)
  // ==========================================
  
  function openModal(modalEl) {
    modalEl.classList.add('active');
  }
  
  function closeModal(modalEl) {
    modalEl.classList.remove('active');
  }
  
  // すべてのモーダルの閉じるボタン & 背景クリックイベント
  document.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', () => {
      const modal = btn.closest('.modal');
      closeModal(modal);
    });
  });
  
  window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
      closeModal(e.target);
    }
  });
  
  function showLoader(message) {
    loaderMessage.textContent = message;
    globalLoader.style.display = 'flex';
  }
  
  function hideLoader() {
    globalLoader.style.display = 'none';
  }
  
  function showToast(message, type = 'success') {
    toastMessage.textContent = message;
    
    if (type === 'error') {
      toast.classList.add('error');
      toastIcon.setAttribute('data-lucide', 'alert-circle');
    } else {
      toast.classList.remove('error');
      toastIcon.setAttribute('data-lucide', 'check-circle');
    }
    
    lucide.createIcons();
    
    toast.style.display = 'flex';
    // リフローを起こしてトランジションを有効化
    toast.offsetHeight; 
    toast.classList.add('active');
    
    setTimeout(() => {
      toast.classList.remove('active');
      setTimeout(() => {
        toast.style.display = 'none';
      }, 350);
    }, 3000);
  }
  
  function escapeHTML(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
});
