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
      eventsHTML += `<div class="event-badge ${timeClass}" title="${evt.title}">${timeStr}${evt.title}</div>`;
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
        
        const mockResult = {
          title: 'web3・AI概論の最終成果物発表会',
          date: mockDateStr,
          startTime: '13:00',
          endTime: '14:30',
          description: '場所：3号館4階講義室\n持ち物：PC、プレゼン資料\n※スクリーンショットから自動抽出されたデモ予定です。'
        };
        
        showAnalysisConfirmation(mockResult);
        showToast('デモモードで解析結果を出力しました', 'success');
      } else {
        // 本物のGemini APIリクエスト
        const base64Data = imageSrc.split(',')[1];
        const mimeType = imageSrc.split(';')[0].split(':')[1];
        
        const todayStr = getFormattedDate(new Date());
        
        const prompt = `この画像はメールまたはLINEのスケジュール連絡のスクリーンショットです。
この画像から「予定のタイトル」「日付（YYYY-MM-DDフォーマット）」「開始時間（HH:MM）」「終了時間（HH:MM、なければnull）」「詳細（場所やその他の情報）」を抽出して、必ず指定されたJSONフォーマットのみで出力してください。

基準日（今日の日付）は ${todayStr} です。もし画像内の「木曜日」「来週の火曜」「7/12」といった表現から年が特定できない場合、この基準日を元に最も整合性のある日付を推測して割り当ててください。

JSONスキーマ:
{
  "title": "予定タイトル",
  "date": "YYYY-MM-DD",
  "startTime": "HH:MM" | null,
  "endTime": "HH:MM" | null,
  "description": "場所や持ち物、追加情報など"
}`;

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
  
  function showAnalysisConfirmation(data) {
    document.getElementById('analysis-title').value = data.title || '';
    document.getElementById('analysis-date').value = data.date || getFormattedDate(new Date());
    document.getElementById('analysis-start-time').value = data.startTime || '';
    document.getElementById('analysis-end-time').value = data.endTime || '';
    document.getElementById('analysis-description').value = data.description || '';
    
    openModal(modalAnalysisResult);
  }
  
  // AI解析結果の確認・登録
  formConfirmAnalysis.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const title = document.getElementById('analysis-title').value.trim();
    const dateStr = document.getElementById('analysis-date').value;
    const startTime = document.getElementById('analysis-start-time').value;
    const endTime = document.getElementById('analysis-end-time').value;
    const description = document.getElementById('analysis-description').value.trim();
    
    if (!title || !dateStr) return;
    
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
    
    closeModal(modalAnalysisResult);
    clearImagePreview();
    
    // カレンダーを登録した日付の月に切り替える
    selectedDate = new Date(dateStr);
    currentMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
    
    renderCalendar();
    renderScheduleList();
    showToast('AIが読み取った予定を追加しました！', 'success');
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
