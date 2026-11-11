'use strict';
(() => {
  const C = window.DYContent, $ = selector => document.querySelector(selector);
  const query = new URLSearchParams(location.search);
  const type = $('#directory-type'), search = $('#directory-search'), sort = $('#directory-sort');
  const grid = $('#directory-grid'), lessonFilters = $('#lesson-filters');
  const rabbi = $('#lesson-rabbi'), topic = $('#lesson-topic'), length = $('#lesson-length');
  const durationButtons = [...document.querySelectorAll('[data-duration]')];
  const collectionButtons = [...document.querySelectorAll('[data-collection]')];
  const directorySummary = $('#directory-summary')?.textContent;
  const videos = C.items.filter(item => item.type === 'video');
  const shortCount = videos.filter(item => item.length === 'short').length;
  const fixedTopic = document.body.dataset.directoryTopic || 'all';
  const saved = new Set(C.read('darkei.saved.v2'));
  let maxSeconds = ['60', '180'].includes(query.get('duration')) ? Number(query.get('duration')) : 0;
  let collection = (C.collections || []).find(item => item.id === query.get('collection')) || null;
  let limit = 12, currentVideos = [], toastTimer;

  function setOption(select, value) {
    if (select && [...select.options].some(option => option.value === value)) select.value = value;
  }
  setOption(type, document.body.dataset.directoryType || 'all');
  setOption(type, query.get('type'));
  setOption(rabbi, query.get('rabbi'));
  setOption(topic, query.get('topic'));
  setOption(length, query.get('length'));
  if (collection || maxSeconds) type.value = 'video';
  if (collection && length) length.value = 'short';
  const initialType = type.value, initialLength = length?.value, initialRabbi = rabbi?.value;
  search.value = query.get('q') || '';

  function toast(text) {
    const message = $('#toast');
    message.textContent = text;
    message.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => message.classList.remove('show'), 3000);
  }
  function render() {
    const isVideo = type.value === 'video';
    const isShort = isVideo && (length?.value === 'short' || maxSeconds);
    document.body.classList.toggle('video-directory', isVideo);
    if (lessonFilters) {
      lessonFilters.hidden = !isVideo;
      if ($('#lesson-collections')) $('#lesson-collections').hidden = !isVideo;
      if ($('.lesson-rabbi-directory')) $('.lesson-rabbi-directory').hidden = !isVideo;
      const heading = isShort ? 'רגע קטן. חיזוק גדול.' : 'ספריית השיעורים';
      $('#directory-heading').textContent = isVideo ? (collection?.title || (rabbi.value ? rabbi.selectedOptions[0].textContent : heading)) : 'ספריית התוכן';
      $('#directory-summary').textContent = isVideo ? (collection?.description || 'תורה שמחזקת את הלב. בחרו רב ורגע של זמן, ופשוט התחילו לצפות.') : directorySummary;
      $('#directory-summary-count').textContent = isShort ? shortCount + ' סרטונים קצרים בספרייה' : isVideo ? videos.length + ' שיעורים בספרייה' : C.items.length + ' תכנים במדור';
      $('#directory-all-tab').removeAttribute('aria-current');
      $('#directory-video-tab').removeAttribute('aria-current');
      if (isVideo) $('#directory-video-tab').setAttribute('aria-current', 'page');
      else if (type.value === 'all') $('#directory-all-tab').setAttribute('aria-current', 'page');
      const shortOption = sort.querySelector('[value="short"]');
      if (shortOption) shortOption.textContent = isVideo ? 'הקצרים תחילה' : 'קריאה קצרה תחילה';
    }
    durationButtons.forEach(button => button.setAttribute('aria-pressed', String(Number(button.dataset.duration) === maxSeconds)));
    collectionButtons.forEach(button => button.setAttribute('aria-pressed', String(collection?.id === button.dataset.collection)));
    if ($('#collection-clear')) $('#collection-clear').hidden = !collection;
    if ($('#lesson-active-filters')) {
      const active = [topic?.value && topic.selectedOptions[0].textContent, length?.value === 'full' && 'שיעורים מלאים', length?.value === 'short' && 'קצרים', sort.value !== 'editorial' && sort.selectedOptions[0].textContent].filter(Boolean);
      $('#lesson-active-filters').textContent = active.length ? active.join(' · ') : 'נושא, אורך ומיון';
    }
    const terms = C.normalize(search.value).split(' ').filter(Boolean);
    const list = C.items.filter(item => {
      if (fixedTopic !== 'all' && !item.topics.includes(fixedTopic)) return false;
      if (type.value === 'saved' ? !saved.has(item.id) : type.value !== 'all' && type.value !== item.type) return false;
      if (isVideo && lessonFilters) {
        if (rabbi.value && item.rabbi !== rabbi.value) return false;
        if (topic.value && !item.topics.includes(topic.value)) return false;
        if (length.value && item.length !== length.value) return false;
        if (maxSeconds && (!item.durationSeconds || item.durationSeconds > maxSeconds)) return false;
        if (collection && !collection.items.includes(item.id)) return false;
      }
      return terms.every(term => C.normalize([item.title, item.tag, item.author, item.description].filter(Boolean).join(' ')).includes(term));
    });
    if (collection && isVideo) list.sort((a, b) => collection.items.indexOf(a.id) - collection.items.indexOf(b.id));
    if (sort.value === 'short') {
      const seconds = item => item.type === 'video' ? item.durationSeconds || Infinity : (item.minutes || Infinity) * 60;
      list.sort((a, b) => seconds(a) - seconds(b));
    }
    if (sort.value === 'az') list.sort((a, b) => a.title.localeCompare(b.title, 'he'));
    currentVideos = list.filter(item => item.type === 'video' && item.video);
    grid.innerHTML = list.slice(0, limit).map(item => C.card(item, saved)).join('');
    const noun = isShort ? 'חיזוקים קצרים' : isVideo ? 'שיעורים' : 'תכנים';
    const total = list.length === 1 ? (isShort ? 'חיזוק אחד' : isVideo ? 'שיעור אחד' : 'תוכן אחד') : list.length + ' ' + noun;
    $('#directory-count').textContent = total + (list.length > limit ? ' · מוצגים ' + limit + ' הראשונים' : '');
    $('#directory-more').hidden = list.length <= limit;
    $('#directory-more').textContent = isVideo ? 'לסרטונים נוספים +' : 'עוד תכנים בשבילכם +';
    $('#directory-empty').hidden = list.length > 0;
  }
  function resetList() { limit = 12; render(); }
  function clearLessonFilters() {
    [rabbi, topic, length].forEach(control => { if (control) control.value = ''; });
    maxSeconds = 0;
    collection = null;
  }
  [type, sort, rabbi, topic, length].filter(Boolean).forEach(control => control.addEventListener('change', () => {
    if (control === length && length.value === 'full') maxSeconds = 0;
    resetList();
  }));
  search.addEventListener('input', resetList);
  durationButtons.forEach(button => button.addEventListener('click', () => {
    maxSeconds = Number(button.dataset.duration);
    if (maxSeconds && length) length.value = 'short';
    resetList();
  }));
  collectionButtons.forEach(button => button.addEventListener('click', () => {
    const chosen = (C.collections || []).find(item => item.id === button.dataset.collection);
    const wasSelected = chosen === collection;
    clearLessonFilters();
    collection = wasSelected ? null : chosen;
    if (collection && length) length.value = 'short';
    type.value = 'video';
    search.value = '';
    sort.value = 'editorial';
    resetList();
  }));
  $('#collection-clear')?.addEventListener('click', () => { collection = null; resetList(); });
  $('#directory-reset').addEventListener('click', () => {
    search.value = '';
    type.value = initialType;
    sort.value = 'editorial';
    clearLessonFilters();
    setOption(length, initialLength);
    setOption(rabbi, initialRabbi);
    resetList();
  });
  $('#directory-more').addEventListener('click', () => { limit += 12; render(); });
  $('#directory-saved').addEventListener('click', () => {
    search.value = '';
    type.value = 'saved';
    resetList();
    $('.directory-main').scrollIntoView({block:'start'});
  });

  const player = $('#lesson-player');
  if (player) {
    const frameHost = $('#lesson-player-frame'), title = $('#lesson-player-title');
    const author = $('#lesson-player-author'), source = $('#lesson-player-source'), play = $('#lesson-player-play');
    const muted = $('#lesson-player-muted'), captionNote = $('#lesson-caption-note'), next = $('#lesson-player-next');
    let selected, silent = false;
    function playVideo(withoutSound = false) {
      silent = withoutSound;
      const frame = document.createElement('iframe');
      frame.title = selected.title;
      frameHost.classList.toggle('lesson-player-vertical', selected.format === 'vertical' || selected.id.startsWith('clip-'));
      const params = new URLSearchParams({rel:'0', autoplay:'1', playsinline:'1', hl:'he'});
      if (selected.hebrewCaptions) { params.set('cc_load_policy', '1'); params.set('cc_lang_pref', 'he'); }
      if (withoutSound) params.set('mute', '1');
      frame.src = 'https://www.youtube-nocookie.com/embed/' + selected.video + '?' + params;
      frame.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
      frame.allowFullscreen = true;
      frame.referrerPolicy = 'strict-origin-when-cross-origin';
      frameHost.replaceChildren(frame);
      play.hidden = true;
      if (muted) muted.textContent = withoutSound ? 'להפעלה עם קול' : 'צפייה שקטה עם כתוביות';
    }
    function openLesson(item, autoplay = false, withoutSound = false) {
      selected = item;
      frameHost.replaceChildren();
      title.textContent = item.title;
      author.textContent = item.author + (item.duration ? ' · ' + item.duration : '');
      source.href = item.url;
      play.hidden = false;
      if (muted) { muted.hidden = !item.hebrewCaptions; muted.textContent = 'צפייה שקטה עם כתוביות'; }
      if (captionNote) {
        captionNote.hidden = !item.hebrewCaptions;
        captionNote.textContent = item.captionsAutomatic ? 'כתוביות אוטומטיות בעברית של YouTube; ייתכנו טעויות. אפשר לשנות אותן בכפתור CC בנגן.' : 'כתוביות בעברית זמינות בכפתור CC בנגן.';
      }
      if (next) next.hidden = !collection || currentVideos.indexOf(item) >= currentVideos.length - 1;
      if (!player.open) player.showModal();
      if (autoplay) playVideo(withoutSound);
    }
    play.addEventListener('click', () => playVideo(false));
    muted?.addEventListener('click', () => playVideo(!silent));
    next?.addEventListener('click', () => {
      const item = currentVideos[currentVideos.indexOf(selected) + 1];
      if (item) openLesson(item, true, silent && item.hebrewCaptions);
    });
    player.addEventListener('close', () => { frameHost.replaceChildren(); silent = false; });
    grid.addEventListener('click', event => {
      const link = event.target.closest('a');
      if (!link || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      const id = link.closest('[data-content-id]')?.dataset.contentId;
      const lesson = C.items.find(item => item.id === id && item.type === 'video' && item.video);
      if (!lesson) return;
      event.preventDefault();
      silent = false;
      openLesson(lesson, true);
    });
    const requested = C.items.find(item => item.id === query.get('watch') && item.type === 'video' && item.video);
    if (requested) openLesson(requested);
  }
  grid.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button) return;
    const id = button.dataset.save || button.dataset.contentShare;
    if (button.dataset.save) {
      if (saved.has(id)) saved.delete(id); else saved.add(id);
      try {
        localStorage.setItem('darkei.saved.v2', JSON.stringify([...saved]));
        toast(saved.has(id) ? 'נשמר לכם ב״שמרתי לי״.' : 'התוכן הוסר מהשמורים.');
      } catch { toast('הסימון זמין כל עוד הדף פתוח.'); }
      render();
      grid.querySelector('[data-save="' + id + '"]')?.focus({preventScroll:true});
    } else if (button.dataset.contentShare) {
      const item = C.items.find(content => content.id === id);
      const url = new URL(C.href(item), location.origin);
      window.open('https://wa.me/?text=' + encodeURIComponent(item.title + '\n' + url.href), '_blank', 'noopener,noreferrer');
    }
  });
  render();
})();
