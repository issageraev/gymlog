/* ============ GymLog — дневник тренировок ============ */
'use strict';

/* ---------- Telegram ---------- */
const tg = window.Telegram && window.Telegram.WebApp ? window.Telegram.WebApp : null;
if (tg) {
  try {
    tg.ready();
    tg.expand();
    tg.setHeaderColor('#0C0F14');
    tg.setBackgroundColor('#0C0F14');
  } catch (e) { /* старые клиенты */ }
  try { tg.disableVerticalSwipes(); } catch (e) { /* до Bot API 7.7 */ }
}

/* Подтверждение: нативный confirm() в Telegram на iOS может не показываться —
   используем tg.showConfirm, где доступен */
function ask(msg, onOk, onCancel) {
  if (tg && tg.showConfirm) {
    try {
      tg.showConfirm(msg, ok => { if (ok) onOk(); else if (onCancel) onCancel(); });
      return;
    } catch (e) { /* версия < 6.2 */ }
  }
  if (confirm(msg)) onOk();
  else if (onCancel) onCancel();
}
function haptic(kind) {
  try {
    if (tg && tg.HapticFeedback) {
      if (kind === 'success') tg.HapticFeedback.notificationOccurred('success');
      else tg.HapticFeedback.impactOccurred('light');
    } else if (navigator.vibrate) {
      navigator.vibrate(kind === 'success' ? [40, 60, 40] : 25);
    }
  } catch (e) {}
}

/* ---------- Утилиты ---------- */
const $ = s => document.querySelector(s);
const pad = n => String(n).padStart(2, '0');
const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseISO = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const dow = d => (d.getDay() + 6) % 7 + 1; // 1=Пн … 7=Вс
const todayISO = () => iso(new Date());
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

const DAYS_SHORT = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const DAYS_FULL = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];
const MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
const MONTHS_GEN = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];

function fmtHuman(dateStr) {
  const d = parseISO(dateStr);
  return `${DAYS_FULL[dow(d) - 1]}, ${d.getDate()} ${MONTHS_GEN[d.getMonth()]}`;
}
function fmtShort(dateStr) {
  const d = parseISO(dateStr);
  return `${d.getDate()} ${MONTHS_GEN[d.getMonth()]}`;
}
function mondayOf(d) {
  const m = new Date(d);
  m.setDate(m.getDate() - (dow(m) - 1));
  return m;
}
function fmtTon(kg) {
  if (kg >= 1000) return (kg / 1000).toFixed(1).replace('.', ',') + ' т';
  return Math.round(kg) + ' кг';
}
function plural(n, one, few, many) {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}

/* ---------- Библиотека упражнений ---------- */
const EX_LIBRARY = [
  'Жим лёжа', 'Жим гантелей на наклонной', 'Разводка гантелей', 'Отжимания на брусьях',
  'Французский жим', 'Разгибания на блоке', 'Подтягивания', 'Тяга штанги в наклоне',
  'Тяга верхнего блока', 'Тяга горизонтального блока', 'Становая тяга', 'Подъём штанги на бицепс',
  'Молотки с гантелями', 'Приседания со штангой', 'Жим ногами', 'Румынская тяга',
  'Выпады с гантелями', 'Жим стоя', 'Жим гантелей сидя', 'Махи гантелями в стороны',
  'Подъёмы на носки', 'Скручивания', 'Планка', 'Гиперэкстензия'
];

/* ---------- Данные по умолчанию ---------- */
function defaultProgram() {
  return {
    days: {
      '1': {
        name: 'Грудь · Трицепс',
        exercises: [
          { id: 'bench', name: 'Жим лёжа', sets: 4, reps: 8 },
          { id: 'incline-db', name: 'Жим гантелей на наклонной', sets: 3, reps: 10 },
          { id: 'dips', name: 'Отжимания на брусьях', sets: 3, reps: 12 },
          { id: 'french', name: 'Французский жим', sets: 3, reps: 12 }
        ]
      },
      '3': {
        name: 'Спина · Бицепс',
        exercises: [
          { id: 'pullups', name: 'Подтягивания', sets: 4, reps: 8 },
          { id: 'row', name: 'Тяга штанги в наклоне', sets: 4, reps: 10 },
          { id: 'lat', name: 'Тяга верхнего блока', sets: 3, reps: 12 },
          { id: 'curl', name: 'Подъём штанги на бицепс', sets: 3, reps: 10 }
        ]
      },
      '5': {
        name: 'Ноги · Плечи',
        exercises: [
          { id: 'squat', name: 'Приседания со штангой', sets: 4, reps: 8 },
          { id: 'legpress', name: 'Жим ногами', sets: 3, reps: 12 },
          { id: 'rdl', name: 'Румынская тяга', sets: 3, reps: 10 },
          { id: 'ohp', name: 'Жим стоя', sets: 4, reps: 8 },
          { id: 'lateral', name: 'Махи гантелями в стороны', sets: 3, reps: 15 }
        ]
      }
    }
  };
}

/* ---------- Состояние ---------- */
let state = {
  program: defaultProgram(),
  logs: {},          // { 'YYYY-MM-DD': { dayKey, name, exercises:[...снимок], entries:{exId:[{w,r,done}]}, completed } }
  body: {},          // { 'YYYY-MM-DD': вес тела, кг }
  water: {},         // { 'YYYY-MM-DD': выпито, мл }
  settings: { restSec: 90, waterGoal: 2000 }
};
const ui = {
  view: 'calendar',
  calYear: new Date().getFullYear(),
  calMonth: new Date().getMonth(),
  weekDate: todayISO(),
  statsEx: null
};

const STORE_KEY = 'gymlog.v1';

function save() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) {}
  cloudSave();
}
function load() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      state = { ...state, ...data, settings: { ...state.settings, ...(data.settings || {}) } };
      return true;
    }
  } catch (e) {}
  return false;
}

/* Зеркало в Telegram CloudStorage (кусками по 3800 символов) */
let cloudTimer = null;
function cloudOk() {
  try {
    return !!(tg && tg.CloudStorage && tg.isVersionAtLeast && tg.isVersionAtLeast('6.9'));
  } catch (e) { return false; }
}
function cloudSave() {
  if (!cloudOk()) return;
  clearTimeout(cloudTimer);
  cloudTimer = setTimeout(() => {
    try {
      const json = JSON.stringify(state);
      const chunks = [];
      for (let i = 0; i < json.length; i += 3800) chunks.push(json.slice(i, i + 3800));
      if (chunks.length > 20) return; // лимит CloudStorage
      tg.CloudStorage.setItem('gymlog_n', String(chunks.length), () => {
        chunks.forEach((c, i) => tg.CloudStorage.setItem('gymlog_' + i, c, () => {}));
      });
    } catch (e) {}
  }, 1500);
}
function cloudLoad(cb) {
  if (!cloudOk()) return cb(false);
  tg.CloudStorage.getItem('gymlog_n', (err, n) => {
    const count = parseInt(n, 10);
    if (err || !count) return cb(false);
    const keys = Array.from({ length: count }, (_, i) => 'gymlog_' + i);
    tg.CloudStorage.getItems(keys, (err2, items) => {
      if (err2 || !items) return cb(false);
      try {
        const json = keys.map(k => items[k] || '').join('');
        const data = JSON.parse(json);
        state = { ...state, ...data, settings: { ...state.settings, ...(data.settings || {}) } };
        cb(true);
      } catch (e) { cb(false); }
    });
  });
}

/* ---------- Работа с журналом ---------- */
function getLog(dateStr) { return state.logs[dateStr] || null; }

function createLog(dateStr, dayKey) {
  const tpl = state.program.days[dayKey];
  if (!tpl) return null;
  const exercises = tpl.exercises.map(e => ({ ...e }));
  const entries = {};
  exercises.forEach(ex => {
    const last = lastSession(ex.id, dateStr);
    entries[ex.id] = Array.from({ length: ex.sets }, (_, i) => ({
      w: last && last.sets[i] ? last.sets[i].w : '',
      r: last && last.sets[i] ? last.sets[i].r : ex.reps,
      done: false
    }));
  });
  state.logs[dateStr] = { dayKey, name: tpl.name, exercises, entries, completed: false };
  save();
  return state.logs[dateStr];
}

/* Последняя сессия с этим упражнением до указанной даты */
function lastSession(exId, beforeDate) {
  const dates = Object.keys(state.logs).filter(d => d < beforeDate).sort().reverse();
  for (const d of dates) {
    const log = state.logs[d];
    const sets = (log.entries[exId] || []).filter(s => s.done && s.w !== '' && +s.r > 0);
    if (sets.length) return { date: d, sets };
  }
  return null;
}

/* Исторический максимум веса (до даты, исключая текущий подход) */
function maxWeight(exId, beforeDate) {
  let max = 0, date = null;
  for (const d of Object.keys(state.logs)) {
    if (d >= beforeDate) continue;
    (state.logs[d].entries[exId] || []).forEach(s => {
      if (s.done && +s.w > max) { max = +s.w; date = d; }
    });
  }
  return { max, date };
}

function logTonnage(log) {
  let ton = 0, sets = 0;
  Object.values(log.entries).forEach(arr => arr.forEach(s => {
    if (s.done) { sets++; ton += (+s.w || 0) * (+s.r || 0); }
  }));
  return { ton, sets };
}

/* ---------- Рендеринг ---------- */
const view = $('#view');

/* scrollTop=true только при смене экрана; точечные обновления
   (галочки подходов, +250 мл и т.п.) сохраняют позицию прокрутки */
function render(scrollTop = false) {
  if (!state.settings.onboarded) { renderOnboard(); window.scrollTo(0, 0); return; }
  document.body.classList.remove('onboarding');
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.view === ui.view));
  if (ui.view === 'calendar') renderCalendar();
  else if (ui.view === 'week') renderWeek();
  else if (ui.view === 'stats') renderStats();
  else if (ui.view === 'plan') renderPlan();
  if (scrollTop) window.scrollTo(0, 0);
}

/* ===== Онбординг ===== */
function obDots(step) {
  return `<div class="ob-dots">${[0, 1, 2].map(i => `<i class="${i === step ? 'on' : ''}"></i>`).join('')}</div>`;
}

function renderOnboard() {
  document.body.classList.add('onboarding');
  if (!ui.obInit) {
    ui.obInit = true;
    ui.obStep = 0;
    ui.obDays = new Set(Object.keys(state.program.days).length ? Object.keys(state.program.days) : ['1', '3', '5']);
    ui.obTpl = 'split';
  }
  const step = ui.obStep;

  if (step === 0) {
    view.innerHTML = `
      <div class="ob">
        <svg class="ob-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6.5 6.5v11M17.5 6.5v11M3.5 9.5v5M20.5 9.5v5M6.5 12h11"/></svg>
        <h1>GymLog</h1>
        <p class="ob-lead">Дневник тренировок прямо в Telegram</p>
        <ul class="ob-list">
          <li><svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M16 2v4M8 2v4M3 9h18"/></svg><span>Недельный план и календарь тренировок</span></li>
          <li><svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 13 4 4L19 7"/></svg><span>Веса и повторы — с подсказками прошлого раза</span></li>
          <li><svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="m7 14 4-4 3 3 5-6"/></svg><span>Графики прогресса и личные рекорды</span></li>
          <li><svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2.7 5.6 9a9 9 0 1 0 12.8 0z"/></svg><span>Вода — кольцо на главном и запись через бота</span></li>
        </ul>
        ${obDots(0)}
        <div class="ob-footer">
          <button class="btn btn-primary btn-block" data-action="ob-next">Настроить под себя</button>
          <button class="btn btn-ghost btn-block" data-action="ob-skip">Пропустить — всё по умолчанию</button>
        </div>
      </div>`;
    return;
  }

  if (step === 1) {
    const fresh = Object.keys(state.logs).length === 0;
    view.innerHTML = `
      <div class="ob">
        <h1 style="font-size:26px">Дни тренировок</h1>
        <p class="ob-lead">Отметь, в какие дни ходишь в зал</p>
        <div class="ob-days">
          ${DAYS_SHORT.map((d, i) => {
            const k = String(i + 1);
            return `<button class="ob-day ${ui.obDays.has(k) ? 'on' : ''}" data-action="ob-day" data-day="${k}" aria-pressed="${ui.obDays.has(k)}">${d}</button>`;
          }).join('')}
        </div>
        <div class="ob-tpl">
          <button class="ob-tpl-card ${ui.obTpl === 'split' ? 'on' : ''}" data-action="ob-tpl" data-tpl="split">
            <b>Готовый сплит</b>
            <span>Грудь+трицепс · Спина+бицепс · Ноги+плечи. Всё можно менять.</span>
          </button>
          <button class="ob-tpl-card ${ui.obTpl === 'empty' ? 'on' : ''}" data-action="ob-tpl" data-tpl="empty">
            <b>Пустой план</b>
            <span>Соберу программу сам, с нуля.</span>
          </button>
        </div>
        ${fresh ? '' : '<p class="ex-meta">У тебя уже есть история — существующие дни плана останутся как есть, изменятся только добавленные и убранные.</p>'}
        ${obDots(1)}
        <div class="ob-footer">
          <button class="btn btn-primary btn-block" data-action="ob-next" ${ui.obDays.size ? '' : 'disabled'}>Дальше</button>
          <button class="btn btn-ghost btn-block" data-action="ob-back">Назад</button>
        </div>
      </div>`;
    return;
  }

  view.innerHTML = `
    <div class="ob">
      <h1 style="font-size:26px">Почти готово</h1>
      <p class="ob-lead">Дневная норма воды, мл</p>
      <input id="ob-water" class="num-input" style="width:140px;min-height:52px;font-size:20px;margin:0 auto 20px" type="number" inputmode="numeric" min="500" max="6000" step="100" value="${state.settings.waterGoal || 2000}">
      <ul class="ob-list">
        <li><svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 13 4 4L19 7"/></svg><span>Галочка у подхода записывает его и запускает таймер отдыха</span></li>
        <li><svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2"/><path d="M9 2h6"/></svg><span>Тренировку можно начать в любой день — даже вне плана</span></li>
        <li><svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-8.4 8.4 8.5 8.5 0 0 1-3.8-.9L3 21l2-5.8a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 8.5-8.4 8.38 8.38 0 0 1 8.4 8.5z"/></svg><span>Боту можно писать «+500» или «выпил стакан воды» — вода запишется сама</span></li>
      </ul>
      ${obDots(2)}
      <div class="ob-footer">
        <button class="btn btn-primary btn-block" data-action="ob-finish">Поехали!</button>
        <button class="btn btn-ghost btn-block" data-action="ob-back">Назад</button>
      </div>
    </div>`;
}

function applyOnboard() {
  const fresh = Object.keys(state.logs).length === 0;
  const tplArr = Object.values(defaultProgram().days);
  const days = [...ui.obDays].sort();
  for (const k of Object.keys(state.program.days)) {
    if (!ui.obDays.has(k)) delete state.program.days[k];
  }
  days.forEach((k, i) => {
    const make = () => ui.obTpl === 'empty'
      ? { name: 'Тренировка', exercises: [] }
      : JSON.parse(JSON.stringify(tplArr[i % tplArr.length]));
    if (!state.program.days[k] || fresh) state.program.days[k] = make();
  });
}

/* ===== Календарь ===== */
function dayStatus(dateStr) {
  const log = getLog(dateStr);
  if (log) {
    if (log.completed) return 'done';
    const { sets } = logTonnage(log);
    return sets > 0 ? 'partial' : 'planned';
  }
  const wd = String(dow(parseISO(dateStr)));
  if (state.program.days[wd]) return 'planned';
  return 'empty';
}

function renderCalendar() {
  const y = ui.calYear, m = ui.calMonth;
  const first = new Date(y, m, 1);
  const start = mondayOf(first);
  const today = todayISO();

  let cells = '';
  const cur = new Date(start);
  for (let i = 0; i < 42; i++) {
    const dStr = iso(cur);
    const other = cur.getMonth() !== m;
    const st = dayStatus(dStr);
    cells += `<button class="cal-cell ${other ? 'other' : ''} ${dStr === today ? 'today' : ''}"
      data-action="open-day" data-date="${dStr}" aria-label="${fmtHuman(dStr)}">
      ${cur.getDate()}
      <i class="cal-dot ${st}"></i>
    </button>`;
    cur.setDate(cur.getDate() + 1);
    if (i >= 34 && cur.getMonth() !== m && dow(cur) === 1) break;
  }

  // Статистика месяца
  const mPrefix = `${y}-${pad(m + 1)}`;
  const monthLogs = Object.entries(state.logs).filter(([d, l]) => d.startsWith(mPrefix) && l.completed);
  let monthTon = 0, monthSets = 0;
  monthLogs.forEach(([, l]) => { const t = logTonnage(l); monthTon += t.ton; monthSets += t.sets; });

  view.innerHTML = `
    <header class="cal-head">
      <h1>${MONTHS[m]} ${y}</h1>
      <div class="cal-nav">
        <button data-action="cal-prev" aria-label="Предыдущий месяц">
          <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </button>
        <button data-action="cal-next" aria-label="Следующий месяц">
          <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
        </button>
      </div>
    </header>
    <div class="cal-grid">
      ${DAYS_SHORT.map(d => `<div class="cal-dow">${d}</div>`).join('')}
      ${cells}
    </div>
    <div class="legend">
      <span><i style="background:var(--primary)"></i> План</span>
      <span><i style="background:var(--gold)"></i> В процессе</span>
      <span><i style="background:var(--accent)"></i> Выполнено</span>
    </div>
    <div class="stat-row">
      <div class="stat-tile green"><b>${monthLogs.length}</b><span>${plural(monthLogs.length, 'тренировка', 'тренировки', 'тренировок')}</span></div>
      <div class="stat-tile"><b>${monthSets}</b><span>${plural(monthSets, 'подход', 'подхода', 'подходов')}</span></div>
      <div class="stat-tile"><b>${fmtTon(monthTon)}</b><span>тоннаж</span></div>
    </div>
    ${renderWaterCard()}`;
}

/* ===== Вода ===== */
/* Синхронизация с ботом: общая база на gymlog-bot.vercel.app (только внутри Telegram) */
const WATER_API = 'https://gymlog-bot.vercel.app/api/water';
let waterSyncAt = 0;

function tgAuth() { return tg && tg.initData ? 'tma ' + tg.initData : null; }

async function waterSync(force) {
  const auth = tgAuth();
  if (!auth) return;
  if (!force && Date.now() - waterSyncAt < 15000) return;
  waterSyncAt = Date.now();
  try {
    const r = await fetch(WATER_API, { headers: { Authorization: auth } });
    if (!r.ok) return;
    const d = await r.json();
    if (!state.water) state.water = {};
    let changed = false;
    for (const [date, v] of Object.entries(d.water || {})) {
      const merged = Math.max(state.water[date] || 0, +v || 0);
      if (merged !== (state.water[date] || 0)) { state.water[date] = merged; changed = true; }
    }
    const t = todayISO();
    if ((state.water[t] || 0) > (+(d.water || {})[t] || 0)) waterPush();
    if (changed) { save(); render(); }
  } catch (e) {}
}

function waterPush() {
  const auth = tgAuth();
  if (!auth) return;
  const t = todayISO();
  fetch(WATER_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: auth },
    body: JSON.stringify({ date: t, total: (state.water || {})[t] || 0, goal: state.settings.waterGoal || 2000 })
  }).catch(() => {});
}

function fmtMl(ml) {
  return ml >= 1000 ? (ml / 1000).toFixed(ml % 1000 ? 2 : 0).replace(/\.?0+$/, '').replace('.', ',') + ' л' : ml + ' мл';
}
function waterToday() { return (state.water || {})[todayISO()] || 0; }

function waterRing(pct) {
  const r = 34, c = 2 * Math.PI * r;
  const off = c * (1 - Math.min(1, pct));
  return `<svg viewBox="0 0 84 84" class="water-ring" role="img" aria-label="Выпито ${Math.round(pct * 100)}% дневной нормы воды">
    <circle cx="42" cy="42" r="${r}" fill="none" stroke="var(--surface-2)" stroke-width="8"/>
    <circle cx="42" cy="42" r="${r}" fill="none" stroke="var(--water)" stroke-width="8" stroke-linecap="round"
      stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${off.toFixed(1)}" transform="rotate(-90 42 42)"/>
    <text x="42" y="48" text-anchor="middle" class="water-pct">${Math.round(pct * 100)}%</text>
  </svg>`;
}

function renderWaterCard() {
  const ml = waterToday();
  const goal = state.settings.waterGoal || 2000;
  return `
    <div class="card water-card">
      ${waterRing(ml / goal)}
      <div class="water-info">
        <h3>Вода сегодня</h3>
        <p class="water-amt"><b>${fmtMl(ml)}</b> из ${fmtMl(goal)}${ml >= goal ? ' · <span style="color:var(--water)">норма выполнена</span>' : ''}</p>
        <div class="water-btns">
          <button class="btn btn-outline btn-sm" data-action="water-add" data-ml="250">+250 мл</button>
          <button class="btn btn-outline btn-sm" data-action="water-add" data-ml="500">+500 мл</button>
          <button class="btn btn-ghost btn-sm" data-action="water-add" data-ml="-250" ${ml ? '' : 'disabled'} aria-label="Убрать 250 мл">−250</button>
        </div>
      </div>
    </div>`;
}

function svgWaterChart(days, goal) {
  const W = 480, H = 170, P = { t: 20, r: 8, b: 24, l: 8 };
  const max = Math.max(goal * 1.15, ...days.map(d => d.value), 1);
  const bw = (W - P.l - P.r) / days.length;
  const gy = H - P.b - (H - P.t - P.b) * goal / max;
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Вода за последние ${days.length} дней">
    <line x1="${P.l}" y1="${gy.toFixed(1)}" x2="${W - P.r}" y2="${gy.toFixed(1)}" stroke="#8B95A5" stroke-width="1" stroke-dasharray="4 4" opacity=".6"/>
    <text class="axis-label" x="${P.l}" y="${(gy - 5).toFixed(1)}">норма ${fmtMl(goal)}</text>
    ${days.map((d, i) => {
      const h = Math.max(2, (H - P.t - P.b) * d.value / max);
      const bx = P.l + i * bw + bw * 0.2;
      return `<rect x="${bx.toFixed(1)}" y="${(H - P.b - h).toFixed(1)}" width="${(bw * 0.6).toFixed(1)}" height="${h.toFixed(1)}" rx="4"
        fill="${d.value >= goal ? '#38BDF8' : '#3A4453'}"/>
      ${i % 2 === (days.length - 1) % 2 ? `<text class="axis-label" x="${(bx + bw * 0.3).toFixed(1)}" y="${H - 7}" text-anchor="middle">${d.label}</text>` : ''}`;
    }).join('')}
  </svg>`;
}

function renderWaterStats() {
  const goal = state.settings.waterGoal || 2000;
  const days = [];
  const cur = new Date();
  cur.setDate(cur.getDate() - 13);
  for (let i = 0; i < 14; i++) {
    const dStr = iso(cur);
    days.push({ label: `${pad(cur.getDate())}.${pad(cur.getMonth() + 1)}`, value: (state.water || {})[dStr] || 0 });
    cur.setDate(cur.getDate() + 1);
  }
  const week = days.slice(-7);
  const avg = Math.round(week.reduce((s, d) => s + d.value, 0) / 7);
  const met = days.filter(d => d.value >= goal).length;
  return `
    <div class="card">
      <h3>Вода</h3>
      <div class="stat-row" style="margin:10px 0 0">
        <div class="stat-tile blue"><b>${fmtMl(waterToday())}</b><span>сегодня</span></div>
        <div class="stat-tile blue"><b>${fmtMl(avg)}</b><span>в среднем за 7 дней</span></div>
        <div class="stat-tile blue"><b>${met}/14</b><span>${plural(met, 'норма', 'нормы', 'норм')} за 2 недели</span></div>
      </div>
      <div class="chart-wrap">${svgWaterChart(days, goal)}</div>
    </div>`;
}

/* ===== Неделя + тренировка ===== */
function renderWeek() {
  const sel = ui.weekDate;
  const monday = mondayOf(parseISO(sel));
  const today = todayISO();

  let strip = '';
  const cur = new Date(monday);
  for (let i = 0; i < 7; i++) {
    const dStr = iso(cur);
    const st = dayStatus(dStr);
    strip += `<button class="week-day ${dStr === sel ? 'sel' : ''}" data-action="week-day" data-date="${dStr}" aria-label="${fmtHuman(dStr)}">
      <small>${DAYS_SHORT[i]}</small>
      <b>${cur.getDate()}</b>
      <i class="cal-dot ${st}"></i>
    </button>`;
    cur.setDate(cur.getDate() + 1);
  }

  view.innerHTML = `
    <h1 class="screen-title">Тренировка</h1>
    <p class="screen-sub">${sel === today ? 'Сегодня — ' : ''}${fmtHuman(sel)}</p>
    <div class="week-strip">${strip}</div>
    <div id="workout-area">${renderWorkoutArea(sel)}</div>`;
}

function renderWorkoutArea(dateStr) {
  const log = getLog(dateStr);
  const wd = String(dow(parseISO(dateStr)));
  const planDay = state.program.days[wd];

  if (!log) {
    if (planDay) {
      const hasEx = planDay.exercises.length > 0;
      return `
        <div class="card">
          <div class="workout-head">
            <h2>${esc(planDay.name)}</h2>
            <span class="date">${hasEx ? `По плану: ${planDay.exercises.length} ${plural(planDay.exercises.length, 'упражнение', 'упражнения', 'упражнений')}` : 'План этого дня пока пуст'}</span>
          </div>
          ${planDay.exercises.map(ex => `
            <div class="ex-meta" style="margin:6px 0">
              <b style="color:var(--text)">${esc(ex.name)}</b> — ${ex.sets}×${ex.reps}
              ${hintLast(ex.id, dateStr)}
            </div>`).join('')}
          ${hasEx
            ? `<button class="btn btn-primary btn-block" data-action="start-workout" data-date="${dateStr}" data-daykey="${wd}" style="margin-top:10px">Начать тренировку</button>`
            : `<p class="ex-meta">Добавь упражнения — и здесь появится кнопка старта.</p>
               <button class="btn btn-primary btn-block" data-action="edit-plan" data-day="${wd}" style="margin-top:6px">Заполнить план</button>`}
          ${hasEx ? `<button class="btn btn-outline btn-block" data-action="edit-plan" data-day="${wd}" style="margin-top:8px">
            <svg class="icon" style="width:18px;height:18px" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z"/></svg>
            Изменить план этой тренировки
          </button>` : ''}
        </div>`;
    }
    // День отдыха
    const options = Object.entries(state.program.days)
      .map(([k, d]) => `<button class="btn btn-outline btn-block" data-action="start-workout" data-date="${dateStr}" data-daykey="${k}">${esc(d.name)}</button>`)
      .join('');
    return `
      <div class="card">
        <div class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12h2M20 12h2M6.5 6.5v11M17.5 6.5v11M6.5 12h11"/></svg>
          <p><b>День отдыха</b></p>
          <p style="font-size:14px">Восстановление — тоже часть прогресса.</p>
        </div>
        ${options ? `<p class="ex-meta" style="text-align:center">Или внеплановая тренировка:</p><div class="rest-choice">${options}</div>` : ''}
        <button class="btn btn-ghost btn-block" data-action="edit-plan" data-day="${wd}" style="margin-top:10px">Настроить план недели</button>
      </div>`;
  }

  // Активная / завершённая тренировка
  const { ton, sets } = logTonnage(log);
  const exCards = log.exercises.map(ex => {
    const entries = log.entries[ex.id] || [];
    const prev = lastSession(ex.id, dateStr);
    const rec = maxWeight(ex.id, dateStr);
    const rows = entries.map((s, i) => `
      <div class="set-row">
        <span class="n">${i + 1}</span>
        <input class="set-input" type="number" inputmode="decimal" step="0.5" min="0" placeholder="кг"
          value="${s.w === '' ? '' : s.w}" data-field="w" data-ex="${ex.id}" data-idx="${i}" aria-label="Вес, подход ${i + 1}">
        <input class="set-input" type="number" inputmode="numeric" min="0" placeholder="повт"
          value="${s.r === '' ? '' : s.r}" data-field="r" data-ex="${ex.id}" data-idx="${i}" aria-label="Повторения, подход ${i + 1}">
        <button class="set-done ${s.done ? 'on' : ''}" data-action="toggle-set" data-ex="${ex.id}" data-idx="${i}" aria-label="Подход ${i + 1} ${s.done ? 'выполнен' : 'не выполнен'}" aria-pressed="${s.done}">
          <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m5 13 4 4L19 7"/></svg>
        </button>
      </div>`).join('');
    return `
      <div class="card ex-card">
        <div class="ex-name">${esc(ex.name)}</div>
        <div class="ex-meta">
          План: ${ex.sets}×${ex.reps}${prev ? ` · Прошлый раз: ${prev.sets.map(s => `${s.w}×${s.r}`).join(', ')}` : ''}
          ${rec.max ? ` · <span class="pr">Рекорд: ${rec.max} кг</span>` : ''}
        </div>
        <div class="set-labels"><span>#</span><span>Вес, кг</span><span>Повт.</span><span></span></div>
        ${rows}
        <div class="ex-actions">
          <button class="btn btn-ghost btn-sm" data-action="add-set" data-ex="${ex.id}">
            <svg class="icon" style="width:16px;height:16px" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
            Подход
          </button>
          <button class="btn btn-ghost btn-sm" data-action="del-set" data-ex="${ex.id}" ${entries.length <= 1 ? 'disabled' : ''}>Убрать</button>
        </div>
      </div>`;
  }).join('');

  return `
    <div class="workout-head">
      <h2>${esc(log.name)} ${log.completed ? '<span class="badge badge-done">Выполнено</span>' : ''}</h2>
      <span class="date">${sets} ${plural(sets, 'подход', 'подхода', 'подходов')} · ${fmtTon(ton)}</span>
    </div>
    ${exCards}
    ${log.completed
      ? `<button class="btn btn-outline btn-block" data-action="reopen-workout" data-date="${dateStr}">Возобновить тренировку</button>`
      : `<button class="btn btn-primary btn-block" data-action="finish-workout" data-date="${dateStr}">Завершить тренировку</button>`}
    <button class="btn btn-ghost btn-danger btn-block" data-action="delete-workout" data-date="${dateStr}" style="margin-top:8px">Удалить тренировку</button>`;
}

function hintLast(exId, dateStr) {
  const prev = lastSession(exId, dateStr);
  if (!prev) return '';
  return `<br><span style="font-size:12px">Прошлый раз (${fmtShort(prev.date)}): ${prev.sets.map(s => `${s.w}×${s.r}`).join(', ')}</span>`;
}

/* ===== Прогресс ===== */
function allExercises() {
  const map = new Map();
  Object.values(state.program.days).forEach(d => d.exercises.forEach(e => map.set(e.id, e.name)));
  Object.values(state.logs).forEach(l => l.exercises.forEach(e => { if (!map.has(e.id)) map.set(e.id, e.name); }));
  return map;
}

function exerciseHistory(exId) {
  const out = [];
  Object.keys(state.logs).sort().forEach(d => {
    const sets = (state.logs[d].entries[exId] || []).filter(s => s.done && +s.w > 0);
    if (sets.length) {
      const top = Math.max(...sets.map(s => +s.w));
      const topSet = sets.find(s => +s.w === top);
      out.push({ date: d, top, reps: +topSet.r || 0 });
    }
  });
  return out;
}

function weeklyVolume(weeks = 8) {
  const out = [];
  const start = mondayOf(new Date());
  for (let i = weeks - 1; i >= 0; i--) {
    const ws = new Date(start); ws.setDate(ws.getDate() - i * 7);
    const we = new Date(ws); we.setDate(we.getDate() + 6);
    const a = iso(ws), b = iso(we);
    let ton = 0;
    Object.entries(state.logs).forEach(([d, l]) => {
      if (d >= a && d <= b) ton += logTonnage(l).ton;
    });
    out.push({ label: `${pad(ws.getDate())}.${pad(ws.getMonth() + 1)}`, value: ton });
  }
  return out;
}

function svgLineChart(points) {
  const W = 480, H = 200, P = { t: 18, r: 14, b: 26, l: 38 };
  if (points.length < 2) return `<div class="empty-state" style="padding:20px"><p>Нужно минимум две тренировки с этим упражнением — график появится сам.</p></div>`;
  const vals = points.map(p => p.top);
  let min = Math.min(...vals), max = Math.max(...vals);
  if (min === max) { min -= 5; max += 5; }
  const span = max - min;
  min -= span * 0.15; max += span * 0.15;
  const x = i => P.l + (W - P.l - P.r) * (points.length === 1 ? 0.5 : i / (points.length - 1));
  const y = v => P.t + (H - P.t - P.b) * (1 - (v - min) / (max - min));
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.top).toFixed(1)}`).join(' ');
  const area = `${path} L${x(points.length - 1).toFixed(1)},${H - P.b} L${x(0).toFixed(1)},${H - P.b} Z`;
  const gridVals = [min + (max - min) * 0.25, min + (max - min) * 0.6, max - (max - min) * 0.05];
  const labelStep = Math.ceil(points.length / 6);
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="График рабочего веса">
    <defs><linearGradient id="lg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#F97316" stop-opacity=".28"/><stop offset="1" stop-color="#F97316" stop-opacity="0"/>
    </linearGradient></defs>
    ${gridVals.map(v => `<line class="grid-line" x1="${P.l}" y1="${y(v).toFixed(1)}" x2="${W - P.r}" y2="${y(v).toFixed(1)}"/>
      <text class="axis-label" x="4" y="${(y(v) + 3).toFixed(1)}">${Math.round(v)}</text>`).join('')}
    <path d="${area}" fill="url(#lg)"/>
    <path d="${path}" fill="none" stroke="#F97316" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
    ${points.map((p, i) => `<circle cx="${x(i).toFixed(1)}" cy="${y(p.top).toFixed(1)}" r="3.5" fill="#0C0F14" stroke="#F97316" stroke-width="2"/>
      ${i % labelStep === 0 || i === points.length - 1 ? `<text class="axis-label" x="${x(i).toFixed(1)}" y="${H - 8}" text-anchor="middle">${fmtShort(p.date).split(' ')[0]}.${pad(parseISO(p.date).getMonth() + 1)}</text>` : ''}`).join('')}
    <text class="chart-val" x="${x(points.length - 1).toFixed(1)}" y="${(y(points[points.length - 1].top) - 9).toFixed(1)}" text-anchor="end">${points[points.length - 1].top} кг</text>
  </svg>`;
}

function svgBarChart(items) {
  const W = 480, H = 180, P = { t: 22, r: 8, b: 24, l: 8 };
  const max = Math.max(...items.map(i => i.value), 1);
  const bw = (W - P.l - P.r) / items.length;
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Тоннаж по неделям">
    ${items.map((it, i) => {
      const h = Math.max(3, (H - P.t - P.b) * it.value / max);
      const bx = P.l + i * bw + bw * 0.18;
      const by = H - P.b - h;
      const last = i === items.length - 1;
      return `<rect x="${bx.toFixed(1)}" y="${by.toFixed(1)}" width="${(bw * 0.64).toFixed(1)}" height="${h.toFixed(1)}" rx="5"
        fill="${last ? '#F97316' : '#3A4453'}"/>
      ${it.value ? `<text class="chart-val" x="${(bx + bw * 0.32).toFixed(1)}" y="${(by - 5).toFixed(1)}" text-anchor="middle">${it.value >= 1000 ? (it.value / 1000).toFixed(1) + 'т' : Math.round(it.value)}</text>` : ''}
      <text class="axis-label" x="${(bx + bw * 0.32).toFixed(1)}" y="${H - 7}" text-anchor="middle">${it.label}</text>`;
    }).join('')}
  </svg>`;
}

/* Вес тела */
function bodyEntries() {
  return Object.entries(state.body || {})
    .map(([date, w]) => ({ date, w: +w }))
    .filter(e => e.w > 0)
    .sort((a, b) => (a.date < b.date ? -1 : 1));
}
/* Изменение веса: последняя запись против ближайшей записи ≥ days дней назад */
function bodyDelta(days) {
  const es = bodyEntries();
  if (es.length < 2) return null;
  const last = es[es.length - 1];
  const target = new Date(parseISO(last.date));
  target.setDate(target.getDate() - days);
  const t = iso(target);
  const older = es.filter(e => e.date <= t);
  const base = older.length ? older[older.length - 1] : es[0];
  if (base.date === last.date) return null;
  return last.w - base.w;
}
function fmtDelta(d) {
  if (d === null) return '<span style="color:var(--muted)">—</span>';
  const s = (d > 0 ? '+' : d < 0 ? '−' : '') + Math.abs(d).toFixed(1).replace('.', ',');
  return `${s} кг`;
}

function renderBodyCard() {
  const es = bodyEntries();
  const last = es[es.length - 1] || null;
  const daysAgo = last ? Math.round((parseISO(todayISO()) - parseISO(last.date)) / 86400000) : null;
  const needWeigh = last === null || daysAgo >= 7;
  const points = es.slice(-16).map(e => ({ date: e.date, top: e.w }));

  return `
    <div class="card">
      <h3 style="margin-bottom:6px">Вес тела</h3>
      ${needWeigh
        ? `<p class="ex-meta" style="color:var(--primary)">${last ? `Прошло ${daysAgo} ${plural(daysAgo, 'день', 'дня', 'дней')} с последней записи — время взвеситься` : 'Записывай вес раз в неделю — динамика появится здесь'}</p>`
        : `<p class="ex-meta">Последняя запись: ${fmtShort(last.date)}</p>`}
      <div class="bw-row">
        <input id="bw-input" class="set-input" type="number" inputmode="decimal" step="0.1" min="20" max="400"
          placeholder="${last ? last.w : 'кг'}" aria-label="Вес тела, кг">
        <button class="btn btn-primary" data-action="log-weight">Записать</button>
      </div>
      <div class="stat-row" style="margin:12px 0 0">
        <div class="stat-tile"><b>${last ? String(last.w).replace('.', ',') : '—'}</b><span>сейчас, кг</span></div>
        <div class="stat-tile green"><b>${fmtDelta(bodyDelta(7))}</b><span>за неделю</span></div>
        <div class="stat-tile green"><b>${fmtDelta(bodyDelta(30))}</b><span>за месяц</span></div>
      </div>
      ${points.length >= 2 ? `<div class="chart-wrap">${svgLineChart(points)}</div>` : ''}
      ${es.length ? `<div style="margin-top:8px">${es.slice(-4).reverse().map(e => `
        <div class="pr-item">
          <div class="info"><b>${String(e.w).replace('.', ',')} кг</b><span>${fmtShort(e.date)}</span></div>
          <button class="btn btn-ghost btn-sm" data-action="del-weight" data-date="${e.date}" aria-label="Удалить запись веса за ${fmtShort(e.date)}">
            <svg class="icon" style="width:16px;height:16px" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/></svg>
          </button>
        </div>`).join('')}</div>` : ''}
    </div>`;
}

function renderStats() {
  const exMap = allExercises();
  if (!ui.statsEx || !exMap.has(ui.statsEx)) ui.statsEx = exMap.keys().next().value || null;

  const completed = Object.entries(state.logs).filter(([, l]) => l.completed);
  let totalTon = 0;
  completed.forEach(([, l]) => totalTon += logTonnage(l).ton);

  // Стрик — недели подряд с тренировками
  let streak = 0;
  const wk = mondayOf(new Date());
  for (;;) {
    const a = iso(wk); const we = new Date(wk); we.setDate(we.getDate() + 6); const b = iso(we);
    const has = completed.some(([d]) => d >= a && d <= b);
    if (has) { streak++; wk.setDate(wk.getDate() - 7); }
    else if (streak === 0 && iso(mondayOf(new Date())) === a) { wk.setDate(wk.getDate() - 7); } // текущая неделя может быть ещё пустой
    else break;
    if (streak > 500) break;
  }

  // Рекорды
  const prs = [];
  exMap.forEach((name, id) => {
    const { max, date } = maxWeight(id, '9999-12-31');
    if (max > 0) prs.push({ name, max, date });
  });
  prs.sort((a, b) => b.max - a.max);

  const history = ui.statsEx ? exerciseHistory(ui.statsEx).slice(-15) : [];

  view.innerHTML = `
    <h1 class="screen-title">Прогресс</h1>
    <p class="screen-sub">Аналитика по всем тренировкам</p>

    <div class="stat-row" style="margin:0 0 12px">
      <div class="stat-tile green"><b>${completed.length}</b><span>${plural(completed.length, 'тренировка', 'тренировки', 'тренировок')}</span></div>
      <div class="stat-tile"><b>${streak}</b><span>${plural(streak, 'неделя', 'недели', 'недель')} подряд</span></div>
      <div class="stat-tile"><b>${fmtTon(totalTon)}</b><span>общий тоннаж</span></div>
    </div>

    ${renderBodyCard()}

    ${renderWaterStats()}

    <div class="card">
      <h3 style="margin-bottom:10px">Рабочий вес</h3>
      <select class="select" data-action="stats-ex" aria-label="Выбор упражнения">
        ${[...exMap.entries()].map(([id, name]) => `<option value="${id}" ${id === ui.statsEx ? 'selected' : ''}>${esc(name)}</option>`).join('')}
      </select>
      <div class="chart-wrap">${svgLineChart(history)}</div>
    </div>

    <div class="card">
      <h3>Тоннаж по неделям</h3>
      <div class="chart-wrap">${svgBarChart(weeklyVolume())}</div>
    </div>

    <div class="card">
      <h3 style="margin-bottom:4px">Личные рекорды</h3>
      ${prs.length ? prs.slice(0, 8).map(p => `
        <div class="pr-item">
          <svg class="icon trophy" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM7 6H4a3 3 0 0 0 3 5M17 6h3a3 3 0 0 1-3 5"/>
          </svg>
          <div class="info"><b>${esc(p.name)}</b><span>${fmtShort(p.date)}</span></div>
          <span class="val">${p.max} кг</span>
        </div>`).join('')
      : `<div class="empty-state" style="padding:16px"><p>Рекорды появятся после первых записанных подходов.</p></div>`}
    </div>`;
}

/* ===== План ===== */
function renderPlan() {
  const days = DAYS_FULL.map((full, i) => {
    const key = String(i + 1);
    const day = state.program.days[key];
    if (!day) {
      return `<div class="card plan-day" id="plan-day-${key}">
        <div class="plan-day-head">
          <h3 class="off">${full} — отдых</h3>
          <label class="switch" aria-label="Тренировка в ${full.toLowerCase()}">
            <input type="checkbox" data-action="plan-toggle" data-day="${key}"><i></i>
          </label>
        </div>
      </div>`;
    }
    const exRows = day.exercises.map((ex, j) => `
      <div class="plan-ex">
        <input type="text" value="${esc(ex.name)}" data-pfield="name" data-day="${key}" data-idx="${j}" list="ex-library" aria-label="Название упражнения">
        <input type="number" value="${ex.sets}" min="1" max="10" inputmode="numeric" data-pfield="sets" data-day="${key}" data-idx="${j}" aria-label="Подходы">
        <input type="number" value="${ex.reps}" min="1" max="100" inputmode="numeric" data-pfield="reps" data-day="${key}" data-idx="${j}" aria-label="Повторения">
        <button class="del" data-action="plan-del-ex" data-day="${key}" data-idx="${j}" aria-label="Удалить упражнение">
          <svg class="icon" style="width:18px;height:18px" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/></svg>
        </button>
      </div>`).join('');
    return `<div class="card plan-day" id="plan-day-${key}">
      <div class="plan-day-head">
        <h3>${full}</h3>
        <label class="switch" aria-label="Тренировка в ${full.toLowerCase()}">
          <input type="checkbox" checked data-action="plan-toggle" data-day="${key}"><i></i>
        </label>
      </div>
      <input class="plan-name" type="text" value="${esc(day.name)}" data-pfield="dayname" data-day="${key}" aria-label="Название тренировки" placeholder="Название тренировки">
      <div class="plan-ex-labels"><span>Упражнение</span><span>Подх.</span><span>Повт.</span><span></span></div>
      ${exRows}
      <button class="btn btn-ghost btn-sm" data-action="plan-add-ex" data-day="${key}" style="margin-top:6px">
        <svg class="icon" style="width:16px;height:16px" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
        Добавить упражнение
      </button>
    </div>`;
  }).join('');

  view.innerHTML = `
    <h1 class="screen-title">План</h1>
    <p class="screen-sub">Недельная программа — редактируй под себя</p>
    <datalist id="ex-library">${EX_LIBRARY.map(n => `<option value="${esc(n)}">`).join('')}</datalist>
    ${days}
    <div class="card">
      <h3 style="margin-bottom:6px">Настройки</h3>
      <div class="settings-row">
        <label for="rest-sec">Отдых между подходами<span class="hint">Таймер запускается после отметки подхода</span></label>
        <input id="rest-sec" class="num-input" type="number" min="10" max="600" step="5" value="${state.settings.restSec}" data-pfield="restsec" inputmode="numeric">
      </div>
      <div class="settings-row">
        <label for="water-goal">Норма воды в день<span class="hint">В миллилитрах, шаг 100</span></label>
        <input id="water-goal" class="num-input" type="number" min="500" max="6000" step="100" value="${state.settings.waterGoal || 2000}" data-pfield="watergoal" inputmode="numeric">
      </div>
      <div class="settings-row">
        <label>Данные<span class="hint">Резервная копия в JSON</span></label>
        <div style="display:flex;gap:6px">
          <button class="btn btn-outline btn-sm" data-action="export">Экспорт</button>
          <button class="btn btn-outline btn-sm" data-action="import">Импорт</button>
        </div>
      </div>
      <div class="settings-row">
        <label>Вводный тур<span class="hint">Пройти настройку заново</span></label>
        <button class="btn btn-outline btn-sm" data-action="ob-restart">Открыть</button>
      </div>
      <div class="settings-row">
        <label>Сброс<span class="hint">Удалить все данные без возврата</span></label>
        <button class="btn btn-outline btn-sm btn-danger" data-action="reset">Сбросить</button>
      </div>
    </div>`;
}

/* ---------- Таймер отдыха ---------- */
const restbar = $('#restbar');
let restUntil = 0, restInt = null;

function startRest() {
  restUntil = Date.now() + state.settings.restSec * 1000;
  restbar.classList.remove('hidden');
  clearInterval(restInt);
  restInt = setInterval(tickRest, 250);
  tickRest();
}
function tickRest() {
  const left = Math.ceil((restUntil - Date.now()) / 1000);
  if (left <= 0) {
    stopRest();
    haptic('success');
    toast('Отдых окончен — следующий подход!', 'green');
    return;
  }
  $('#rest-time').textContent = `${Math.floor(left / 60)}:${pad(left % 60)}`;
}
function stopRest() {
  clearInterval(restInt);
  restInt = null;
  restbar.classList.add('hidden');
}

/* ---------- Toast ---------- */
let toastTimer = null;
function toast(msg, kind) {
  const t = $('#toast');
  t.textContent = msg;
  t.className = 'toast' + (kind ? ' ' + kind : '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.add('hidden'), 3200);
}

/* ---------- Экспорт / импорт ---------- */
function exportData() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `gymlog-${todayISO()}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}

/* ---------- События ---------- */
document.addEventListener('click', e => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const a = btn.dataset.action;

  if (a === 'ob-next') { ui.obStep++; render(); }
  else if (a === 'ob-back') { ui.obStep--; render(); }
  else if (a === 'ob-day') {
    const k = btn.dataset.day;
    if (ui.obDays.has(k)) ui.obDays.delete(k); else ui.obDays.add(k);
    render();
  }
  else if (a === 'ob-tpl') { ui.obTpl = btn.dataset.tpl; render(); }
  else if (a === 'ob-skip' || a === 'ob-finish') {
    if (a === 'ob-finish') {
      applyOnboard();
      const w = +($('#ob-water')?.value) || 2000;
      state.settings.waterGoal = Math.max(500, Math.min(6000, w));
      waterPush();
    }
    state.settings.onboarded = true;
    ui.obInit = false;
    save();
    haptic('success');
    ui.view = 'calendar';
    render(true);
    toast('Готово — хорошей тренировки!', 'green');
  }
  else if (a === 'ob-restart') {
    state.settings.onboarded = false; // не сохраняем: тур снова покажется только сейчас
    ui.obInit = false;
    render(true);
  }
  else if (a === 'nav') { ui.view = btn.dataset.view; render(true); }
  else if (a === 'cal-prev' || a === 'cal-next') {
    ui.calMonth += a === 'cal-next' ? 1 : -1;
    if (ui.calMonth < 0) { ui.calMonth = 11; ui.calYear--; }
    if (ui.calMonth > 11) { ui.calMonth = 0; ui.calYear++; }
    render();
  }
  else if (a === 'open-day') { ui.weekDate = btn.dataset.date; ui.view = 'week'; render(true); }
  else if (a === 'week-day') { ui.weekDate = btn.dataset.date; render(true); }
  else if (a === 'start-workout') {
    createLog(btn.dataset.date, btn.dataset.daykey);
    haptic();
    render();
  }
  else if (a === 'toggle-set') {
    const log = getLog(ui.weekDate);
    if (!log) return;
    const s = log.entries[btn.dataset.ex][+btn.dataset.idx];
    s.done = !s.done;
    if (s.done) {
      haptic();
      const prev = maxWeight(btn.dataset.ex, ui.weekDate);
      if (+s.w > 0 && +s.w > prev.max && prev.max > 0) {
        const name = (log.exercises.find(x => x.id === btn.dataset.ex) || {}).name || '';
        toast(`Новый рекорд: ${name} — ${s.w} кг!`, 'gold');
        haptic('success');
      }
      if (!log.completed) startRest();
    }
    save();
    render();
  }
  else if (a === 'add-set') {
    const log = getLog(ui.weekDate);
    if (!log) return;
    const arr = log.entries[btn.dataset.ex];
    const lastSet = arr[arr.length - 1];
    arr.push({ w: lastSet ? lastSet.w : '', r: lastSet ? lastSet.r : '', done: false });
    save(); render();
  }
  else if (a === 'del-set') {
    const log = getLog(ui.weekDate);
    if (!log) return;
    const arr = log.entries[btn.dataset.ex];
    if (arr.length > 1) { arr.pop(); save(); render(); }
  }
  else if (a === 'finish-workout') {
    const log = getLog(btn.dataset.date);
    if (!log) return;
    const { ton, sets } = logTonnage(log);
    if (!sets) { toast('Отметь хотя бы один подход галочкой'); return; }
    log.completed = true;
    stopRest();
    save();
    haptic('success');
    toast(`Тренировка завершена: ${sets} ${plural(sets, 'подход', 'подхода', 'подходов')}, ${fmtTon(ton)}`, 'green');
    render();
  }
  else if (a === 'reopen-workout') {
    const log = getLog(btn.dataset.date);
    if (log) { log.completed = false; save(); render(); }
  }
  else if (a === 'delete-workout') {
    ask('Удалить эту тренировку и все её данные?', () => {
      delete state.logs[btn.dataset.date];
      stopRest();
      save(); render();
    });
  }
  else if (a === 'edit-plan') {
    ui.view = 'plan';
    render(true);
    const card = document.getElementById('plan-day-' + (btn.dataset.day || '1'));
    if (card) {
      card.scrollIntoView({ block: 'start' });
      card.classList.add('focus');
      setTimeout(() => card.classList.remove('focus'), 2500);
    }
  }
  else if (a === 'plan-toggle') {
    const key = btn.dataset.day;
    if (state.program.days[key]) {
      const doOff = () => { delete state.program.days[key]; save(); render(); };
      if (state.program.days[key].exercises.length) {
        ask('Убрать тренировку в этот день? Упражнения из плана удалятся, история останется.', doOff, () => render());
      } else doOff();
    } else {
      state.program.days[key] = { name: 'Тренировка', exercises: [] };
      save(); render();
    }
  }
  else if (a === 'plan-add-ex') {
    const day = state.program.days[btn.dataset.day];
    day.exercises.push({ id: 'ex' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), name: '', sets: 3, reps: 10 });
    save(); render();
    const inputs = view.querySelectorAll(`[data-pfield="name"][data-day="${btn.dataset.day}"]`);
    if (inputs.length) inputs[inputs.length - 1].focus();
  }
  else if (a === 'plan-del-ex') {
    const day = state.program.days[btn.dataset.day];
    day.exercises.splice(+btn.dataset.idx, 1);
    save(); render();
  }
  else if (a === 'water-add') {
    if (!state.water) state.water = {};
    const goal = state.settings.waterGoal || 2000;
    const t = todayISO();
    const before = state.water[t] || 0;
    state.water[t] = Math.max(0, Math.min(10000, before + +btn.dataset.ml));
    save();
    waterPush();
    haptic();
    if (before < goal && state.water[t] >= goal) {
      toast('Дневная норма воды выполнена!', 'green');
      haptic('success');
    }
    render();
  }
  else if (a === 'log-weight') {
    const inp = $('#bw-input');
    const v = parseFloat(String(inp.value).replace(',', '.'));
    if (!v || v < 20 || v > 400) { toast('Введи вес в килограммах, например 82,5'); inp.focus(); return; }
    if (!state.body) state.body = {};
    state.body[todayISO()] = Math.round(v * 10) / 10;
    save();
    haptic('success');
    toast('Вес записан', 'green');
    render();
  }
  else if (a === 'del-weight') {
    delete state.body[btn.dataset.date];
    save(); render();
  }
  else if (a === 'export') exportData();
  else if (a === 'import') $('#import-file').click();
  else if (a === 'reset') {
    ask('Точно удалить ВСЕ данные: план, историю, рекорды?', () => {
      state = { program: defaultProgram(), logs: {}, body: {}, water: {}, settings: { restSec: 90, waterGoal: 2000 } };
      save(); render();
      toast('Данные сброшены');
    });
  }
  else if (a === 'rest-plus') { restUntil += 30000; tickRest(); }
  else if (a === 'rest-stop') stopRest();
});

document.addEventListener('input', e => {
  const el = e.target;
  // Ввод веса/повторов
  if (el.dataset.field) {
    const log = getLog(ui.weekDate);
    if (!log) return;
    const s = log.entries[el.dataset.ex][+el.dataset.idx];
    s[el.dataset.field] = el.value === '' ? '' : +el.value;
    save();
    return;
  }
  // Редактирование плана
  if (el.dataset.pfield) {
    const f = el.dataset.pfield;
    if (f === 'restsec') {
      const v = Math.max(10, Math.min(600, +el.value || 90));
      state.settings.restSec = v;
      save();
      return;
    }
    if (f === 'watergoal') {
      state.settings.waterGoal = Math.max(500, Math.min(6000, +el.value || 2000));
      save();
      waterPush();
      return;
    }
    const day = state.program.days[el.dataset.day];
    if (!day) return;
    if (f === 'dayname') day.name = el.value;
    else {
      const ex = day.exercises[+el.dataset.idx];
      if (!ex) return;
      if (f === 'name') ex.name = el.value;
      if (f === 'sets') ex.sets = Math.max(1, +el.value || 1);
      if (f === 'reps') ex.reps = Math.max(1, +el.value || 1);
    }
    save();
  }
});

document.addEventListener('change', e => {
  if (e.target.dataset.action === 'stats-ex') {
    ui.statsEx = e.target.value;
    render();
  }
});

$('#import-file').addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (!data.program || !data.logs) throw new Error('bad format');
      state = { ...state, ...data, settings: { ...state.settings, ...(data.settings || {}) } };
      save(); render();
      toast('Данные импортированы', 'green');
    } catch (err) {
      toast('Не удалось прочитать файл — это не бэкап GymLog');
    }
  };
  reader.readAsText(file);
  e.target.value = '';
});

/* ---------- Старт ---------- */
const hadLocal = load();
render();
if (!hadLocal && tg) {
  cloudLoad(ok => { if (ok) { try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) {} render(); waterSyncAt = 0; waterSync(true); } });
}
waterSync(true);
window.addEventListener('focus', () => waterSync());
document.addEventListener('visibilitychange', () => { if (!document.hidden) waterSync(); });
