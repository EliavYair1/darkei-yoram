(function(){
const C=window.DYContent,esc=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const paths={arrow:'M19 12H5m6-6-6 6 6 6',bookmark:'M6 3h12v19l-6-4-6 4V3Z',share:'M17 8a3 3 0 1 0-1-3 3 3 0 0 0 1 3ZM7 14a3 3 0 1 0-1-3 3 3 0 0 0 1 3Zm10 8a3 3 0 1 0-1-3 3 3 0 0 0 1 3ZM8.5 10l7-4m-7 7 7 5',play:'m9 5 11 7-11 7V5Z',check:'m5 12 4 4L19 6'};
C.esc=esc;C.icon=name=>`<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="${paths[name]||paths.arrow}"/></svg>`;
C.read=(key,fallback=[])=>{try{const v=JSON.parse(localStorage.getItem(key));return Array.isArray(v)?v:fallback;}catch{return fallback;}};
C.href = item => {
  if (item.id.startsWith('clip-')) return '/chizuk/?clip=' + encodeURIComponent(item.video);
  if (item.id.startsWith('guest-')) return '/content/?type=video&watch=' + encodeURIComponent(item.id);
  return '/content/' + item.id + '/';
};
C.normalize = text => String(text || '').normalize('NFC')
  .replace(/[֑-ֽֿ-ׇׂׅׄ]/g, '')
  .replace(/['״׳"’]/g, '')
  .replace(/[‐‑–—־]/g, ' ')
  .replace(/\s+/g, ' ').trim().toLowerCase();
C.coverImage = item => item.poster || '/' + (item.image || 'assets/content-photos/family-study.webp');
C.coverAlt = item => item.posterAlt || item.imageAlt || 'תמונת המחשה';
C.card=(c,saved=new Set())=>{const isVisual=c.poster||c.image,read=C.read('darkei.read.v1').includes(c.id);return `<article class="content-card${c.type==='video'?' video-card':''}" data-content-id="${c.id}"><div class="content-cover"><a class="content-open" href="${esc(C.href(c))}" aria-label="${c.type==='video'?'צפייה':'קריאה'}: ${esc(c.title)}">${isVisual?`<img src="${esc(C.coverImage(c))}" alt="${esc(C.coverAlt(c))}" loading="lazy" referrerpolicy="no-referrer">${c.type==='video'?`<span class="content-play">${C.icon('play')}</span>`:''}`:`<span class="reading-cover ${c.tone||''}"><span>מחשבה לדרך</span><strong>${esc(c.cover||c.title).replace('\n','<br>')}</strong></span>`}<span class="content-type">${c.label}</span>${c.type==='video'&&c.durationSeconds?`<span class="video-duration" dir="ltr" aria-label="משך הסרטון ${Math.floor(c.durationSeconds/60)} דקות ו־${c.durationSeconds%60} שניות">${esc(c.duration)}</span>`:''}${c.type==='video'&&c.hebrewCaptions?'<span class="video-caption-badge" aria-label="כתוביות בעברית זמינות">CC · עברית</span>':''}</a><button class="save-button" data-save="${c.id}" aria-pressed="${saved.has(c.id)}" aria-label="${saved.has(c.id)?'ביטול שמירה':'שמירה'}: ${esc(c.title)}">${C.icon('bookmark')}</button></div><div class="content-meta">${esc(c.author || c.tag)} <span class="reading-time">${c.minutes?'כ־'+c.minutes+' דק׳ קריאה':c.duration||'לצפייה'}${read?' · קראתי':''}</span></div><a class="card-title" href="${esc(C.href(c))}"><h3>${esc(c.title)}</h3></a>${c.description?`<p>${esc(c.description)}</p>`:''}<div class="content-footer"><a class="plain" href="${esc(C.href(c))}">${c.type==='video'?'לצפייה בשיעור':c.type==='guide'?'לפעילות המלאה':'לקריאה המלאה'} ${C.icon('arrow')}</a><button class="plain" data-content-share="${c.id}" aria-label="שיתוף: ${esc(c.title)}">${C.icon('share')}</button></div></article>`;};
})();
