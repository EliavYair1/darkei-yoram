'use strict';

(() => {
  const content = window.DYContent;
  const days = [
    { id: 'guest-4zfJlEDLCOo', thought: 'חשבו על דבר אחד שמעסיק אתכם היום. מה הצעד הקטן שבידכם לעשות, ומה תוכלו להפקיד בידיו של ה׳?' },
    { id: 'guest-8Yij2pZffBY', thought: 'מצאו רגע שקט באמצע היום. איזה דבר אחד יעזור לכם לגשת להמשך היום ביישוב הדעת?' },
    { id: 'guest-ii_XuxP6I7g', thought: 'היזכרו בטובה שקיבלתם ולא ציפיתם לה. קחו רגע להודות לה׳ עליה.' },
    { id: 'guest-EstUWepGio8', thought: 'כשמשהו מרגיש קשה, בחרו צעד קטן אחד שאתם יכולים לעשות היום. מה יעזור לכם לעשות אותו?' },
    { id: 'guest-p6nhBUOVONE', thought: 'שימו לב לדבר טוב אחד בתוך היום. נסו לשתף בו מישהו קרוב.' },
    { id: 'guest-xzfjxBzDY_g', thought: 'חשבו על דבר טוב שרציתם לעשות ונעצר. בחרו דרך קטנה להתחיל אותו שוב.' },
    { id: 'guest-TItJRlmxYIQ', thought: 'פנו לה׳ במילים שלכם. אפשר להתחיל בתודה אחת ובבקשה אחת שאתם נושאים איתכם.' },
  ].map(day => ({ ...day, lesson: content?.items.find(item => item.id === day.id) }));

  if (days.some(day => !day.lesson?.video)) return;

  const storageKey = 'darkei.faith-week.v1';
  const knownIds = new Set(days.map(day => day.id));
  const get = id => document.getElementById(id);
  const body = get('faith-week-body');
  const title = get('faith-lesson-title');
  const screen = get('faith-screen');
  const dayList = get('faith-day-list');
  const complete = get('faith-complete');
  const next = get('faith-next');
  const silentButton = get('faith-silent');
  const status = get('faith-status');
  let savedOnDevice = true;
  let completed = new Set(content.read(storageKey).filter(id => knownIds.has(id)));
  let activeIndex = 0;

  function dayFromLocation() {
    const value = new URLSearchParams(location.search).get('day');
    if (/^[1-7]$/.test(value || '')) return Number(value) - 1;
    const firstUnfinished = days.findIndex(day => !completed.has(day.id));
    return firstUnfinished === -1 ? 0 : firstUnfinished;
  }

  function renderProgress() {
    const isComplete = completed.has(days[activeIndex].id);
    complete.setAttribute('aria-pressed', String(isComplete));
    complete.textContent = isComplete ? 'היום הושלם ✓' : 'סימון היום כהושלם';
    get('faith-progress').value = completed.size;
    get('faith-progress-label').textContent = `הושלמו ${completed.size} מתוך ${days.length} ימים`;
    for (const link of dayList.querySelectorAll('[data-faith-day]')) {
      const index = Number(link.dataset.faithDay) - 1;
      const done = completed.has(days[index].id);
      link.querySelector('.faith-day-state').textContent = done ? 'הושלם' : '';
      if (index === activeIndex) link.setAttribute('aria-current', 'step');
      else link.removeAttribute('aria-current');
    }
  }

  function showVideo(withoutSound) {
    const { lesson } = days[activeIndex];
    const frame = document.createElement('iframe');
    const params = new URLSearchParams({ autoplay: '1', playsinline: '1', rel: '0', hl: 'he' });
    if (lesson.hebrewCaptions) {
      params.set('cc_load_policy', '1');
      params.set('cc_lang_pref', 'he');
    }
    if (withoutSound) params.set('mute', '1');
    frame.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(lesson.video)}?${params}`;
    frame.title = lesson.title;
    frame.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
    frame.allowFullscreen = true;
    frame.referrerPolicy = 'strict-origin-when-cross-origin';
    screen.classList.toggle('faith-screen-vertical', lesson.format === 'vertical' || lesson.id.startsWith('clip-'));
    screen.replaceChildren(frame);
    frame.focus();
  }

  function showDay(index, focusHeading = false) {
    activeIndex = index;
    const { lesson, thought } = days[index];
    get('faith-day-number').textContent = `יום ${index + 1} מתוך ${days.length}`;
    title.textContent = lesson.title;
    get('faith-lesson-speaker').textContent = lesson.author;
    get('faith-lesson-duration').textContent = lesson.duration;
    get('faith-lesson-reflection').textContent = thought;
    get('faith-video-source').href = lesson.url;
    silentButton.hidden = !lesson.hebrewCaptions;
    get('faith-caption-note').textContent = lesson.hebrewCaptions
      ? (lesson.captionsAutomatic ? 'כתוביות אוטומטיות בעברית זמינות בנגן.' : 'כתוביות בעברית זמינות בנגן.')
      : '';
    const dayUrl = new URL(`?day=${index + 1}`, location.href);
    get('faith-share').href = 'https://wa.me/?text=' + encodeURIComponent(`${lesson.title} · ${lesson.author}\n${dayUrl.href}`);
    next.hidden = index === days.length - 1;
    next.dataset.faithDay = String(index + 2);
    next.href = `?day=${index + 2}`;

    const play = document.createElement('button');
    play.type = 'button';
    play.className = 'faith-play';
    play.setAttribute('aria-label', 'הפעלת הסרטון: ' + lesson.title);
    const poster = document.createElement('img');
    poster.src = content.coverImage(lesson);
    poster.alt = '';
    poster.referrerPolicy = 'no-referrer';
    const caption = document.createElement('span');
    caption.textContent = 'לצפייה בחיזוק';
    play.append(poster, caption);
    play.addEventListener('click', () => showVideo(false));
    screen.classList.remove('faith-screen-vertical');
    screen.replaceChildren(play);
    status.textContent = '';
    renderProgress();
    if (focusHeading) title.focus();
  }

  for (const [index, day] of days.entries()) {
    const row = document.createElement('li');
    const link = document.createElement('a');
    link.href = `?day=${index + 1}`;
    link.dataset.faithDay = String(index + 1);
    const number = document.createElement('span');
    number.className = 'faith-day-label';
    number.textContent = `יום ${index + 1}`;
    const name = document.createElement('span');
    name.className = 'faith-day-title';
    name.textContent = day.lesson.title;
    const state = document.createElement('span');
    state.className = 'faith-day-state';
    link.append(number, name, state);
    row.append(link);
    dayList.append(row);
  }

  body.addEventListener('click', event => {
    const link = event.target.closest('a[data-faith-day]');
    if (!link || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    const index = Number(link.dataset.faithDay) - 1;
    if (!days[index]) return;
    event.preventDefault();
    if (index !== activeIndex) history.pushState(null, '', link.href);
    showDay(index, true);
  });
  window.addEventListener('popstate', () => showDay(dayFromLocation(), true));
  window.addEventListener('storage', event => {
    if (event.key !== storageKey && event.key !== null) return;
    completed = new Set(content.read(storageKey).filter(id => knownIds.has(id)));
    renderProgress();
  });
  complete.addEventListener('click', () => {
    const id = days[activeIndex].id;
    if (savedOnDevice) completed = new Set(content.read(storageKey).filter(value => knownIds.has(value)));
    const wasComplete = completed.delete(id);
    if (!wasComplete) completed.add(id);
    try {
      localStorage.setItem(storageKey, JSON.stringify([...completed]));
      savedOnDevice = true;
    } catch {
      savedOnDevice = false;
    }
    renderProgress();
    if (!savedOnDevice) status.textContent = 'הסימון זמין כל עוד הדף פתוח.';
    else if (completed.size === days.length) status.textContent = 'כל שבעת הימים הושלמו.';
    else status.textContent = wasComplete ? 'סימון ההשלמה הוסר.' : 'היום סומן כהושלם במכשיר הזה.';
  });
  silentButton.addEventListener('click', () => showVideo(true));
  showDay(dayFromLocation());
  body.hidden = false;
  get('faith-fallback').hidden = true;
})();
