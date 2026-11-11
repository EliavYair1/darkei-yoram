'use strict';
const SITE='https://darkei-yoram-style-trial.khakimarshmallow.chatgpt.site/';
const $=(s,root=document)=>root.querySelector(s), $$=(s,root=document)=>[...root.querySelectorAll(s)];
const paths={arrow:'M19 12H5m6-6-6 6 6 6',down:'M12 4v16m-6-6 6 6 6-6',up:'M12 20V4m-6 6 6-6 6 6',search:'M21 21l-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',play:'m9 5 11 7-11 7V5Z',pause:'M9 5v14M15 5v14',calendar:'M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Zm2-3v6m10-6v6M3 11h18m-9 3v5m-2.5-2.5h5',book:'M12 5C8 2 5 3 2 3v16c4 0 7 0 10 3m0-17c4-3 7-2 10-2v16c-4 0-7 0-10 3m0-17v17',heart:'M20.8 4.6a5.6 5.6 0 0 0-7.9 0L12 5.5l-.9-.9a5.6 5.6 0 0 0-7.9 7.9L12 21l8.8-8.5a5.6 5.6 0 0 0 0-7.9Z',share:'M17 8a3 3 0 1 0-1-3 3 3 0 0 0 1 3ZM7 14a3 3 0 1 0-1-3 3 3 0 0 0 1 3Zm10 8a3 3 0 1 0-1-3 3 3 0 0 0 1 3ZM8.5 10l7-4m-7 7 7 5',bookmark:'M6 3h12v19l-6-4-6 4V3Z',menu:'M4 6h16M4 12h16M4 18h16',close:'m6 6 12 12M6 18 18 6',plus:'M12 5v14M5 12h14',refresh:'M20 7v5h-5M4 17v-5h5M5 7a8 8 0 0 1 14 0m0 10a8 8 0 0 1-14 0',copy:'M9 8h11v13H9V8ZM15 8V3H4v13h5',home:'m3 11 9-8 9 8M5 10v11h5v-7h4v7h5V10',check:'m5 12 4 4L19 6'};
function icon(name){return `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="${paths[name]||paths.book}"/></svg>`;}
function icons(root=document){$$('[data-icon]',root).forEach(e=>e.outerHTML=icon(e.dataset.icon));}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function readLocal(key,fallback){try{const value=JSON.parse(localStorage.getItem(key));return Array.isArray(value)?value:fallback;}catch{return fallback;}}
function writeLocal(key,data){try{localStorage.setItem(key,JSON.stringify(data));return true;}catch{notify('הדפדפן אינו מאפשר שמירה. הסימונים זמינים כל עוד הדף פתוח.');return false;}}
let toastTimer;function notify(message){$('#toast').textContent=message;$('#toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),3500);}
function whatsapp(text){window.open('https://wa.me/?text='+encodeURIComponent(text),'_blank','noopener,noreferrer');}
function openDialog(d){d.showModal();document.body.classList.add('modal-open');}
function closeDialog(d){d.close();}
$$('dialog').forEach(d=>{d.addEventListener('close',()=>{if(!document.querySelector('dialog[open]'))document.body.classList.remove('modal-open');});$('.dialog-close',d)?.addEventListener('click',()=>closeDialog(d));d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeDialog(d);}});});
icons();
const today=new Date();const localDate=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jerusalem',year:'numeric',month:'2-digit',day:'2-digit'}).format(today);
try{$('#hebrew-date').textContent=new Intl.DateTimeFormat('he-IL-u-ca-hebrew',{timeZone:'Asia/Jerusalem',day:'numeric',month:'long',year:'numeric'}).format(today);}catch{}
$('#year').textContent=new Intl.DateTimeFormat('en',{timeZone:'Asia/Jerusalem',year:'numeric'}).format(today);
const thoughts=[
{title:'מילה טובה יכולה לפתוח לב.',text:'עוד לפני שמנסים לשנות משהו אצל האחר, אפשר לתת לו להרגיש שרואים את הטוב שבו.'},
{title:'קביעות קטנה. חיבור גדול.',text:'כמה דקות של לימוד, בכל יום, יכולות להפוך לנקודה יציבה בתוך סדר יום עמוס.'},
{title:'אהבת ישראל מתחילה קרוב.',text:'שיחת טלפון, הקשבה או עזרה קטנה לשכן — גם צעד פשוט יכול לשמח לב של אדם.'},
{title:'להקשיב זו גם נתינה.',text:'לפעמים המתנה הגדולה ביותר היא לעצור לרגע, להניח את הטלפון ולתת לאדם שמולנו את מלוא תשומת הלב.'},
{title:'בכל יום אפשר להוסיף אור.',text:'בחרו מעשה טוב אחד להיום. לא צריך לחכות לרגע גדול כדי לעשות טוב למישהו.'},
{title:'יש על מה להודות.',text:'מצאו דבר אחד טוב שקרה השבוע. אמרו עליו תודה, ושתפו בו את בני הבית.'},
{title:'לומדים יחד. מתחברים יותר.',text:'זמן משותף מול ספר הוא גם זמן של הקשבה, של שאלות ושל קשר שנבנה לאט ובאהבה.'},
{title:'תנו למישהו להרגיש שזוכרים אותו.',text:'חשבו על אדם שלא שמעתם ממנו זמן מה. הודעה קצרה ששואלת מה שלומו יכולה להיות כל מה שצריך כדי לפתוח שיחה.'},
{title:'יש מקום גם לצעד קטן.',text:'בחרו משהו אחד שאפשר לעשות היום בחמש דקות. פתחו ספר, התקשרו לשכן או אמרו תודה למישהו שעזר לכם.'},
{title:'מילה מדויקת נשארת בלב.',text:'במקום לומר רק ״כל הכבוד״, ספרו לאדם מה ראיתם בו. למשל, ״שמתי לב שהקדשת לו זמן גם כשהיית עסוק״.'},
{title:'פותחים מקום ליד השולחן.',text:'אם מישהו הגיע לשיעור בפעם הראשונה, שאלו לשמו והציעו לו לשבת לידכם. כך נראה מקום שמקבל אנשים.'},
{title:'לפני שעונים, שואלים.',text:'כשמישהו מספר על קושי, אפשר לשאול ״מה יעזור לך עכשיו?״. לפעמים הוא מחפש אוזן קשבת, ולפעמים הוא צריך יד לעזרה.'},
{title:'תורה שנשארת אחרי השיעור.',text:'בחרו משפט אחד מהשיעור ושוחחו עליו עם בן משפחה או חבר. נסו לחשוב איפה הוא פוגש את החיים שלכם השבוע.'},
{title:'להודות על דבר אחד.',text:'בסוף היום, זכרו דבר אחד טוב שאולי עבר בשקט. אפשר לומר עליו תודה לה׳ ולספר עליו למישהו קרוב.'}
];
const dayNumber = Math.floor(Date.parse(localDate + 'T12:00:00Z') / 86400000);
const thought=thoughts[dayNumber%thoughts.length];$('#daily-title').textContent=thought.title;$('#daily-text').textContent=thought.text;
$$('[data-share]').forEach(b=>b.addEventListener('click',()=>whatsapp(b.dataset.share==='daily'?thought.title+'\n'+thought.text+'\n\nמחשבה לדרך · דרכי יורם\n'+SITE+'#daily-message':SITE+'\n\nאמונה וביטחון. שלווה לנפש. אהבה לכל יהודי. שיעורים וחיזוק בדרכו של הרב יורם אברג׳יל זיע״א, לכל יהודי בארץ ובעולם.')));
// Activity banners: original photographs, crossfades, keyboard controls and touch.
const hero=$('.hero'),pause=$('.slide-pause'),slides=$$('[data-slide]'),slideButtons=$$('[data-go-slide]'),motionPreference=matchMedia('(prefers-reduced-motion: reduce)');
let slide=0,paused=motionPreference.matches,heroVisible=true,bannerTimer;
slides.forEach((e,i)=>{e.hidden=false;e.inert=i!==0;e.setAttribute('aria-hidden',String(i!==0));});
function showSlide(n,announce=false){
 slide=(n+slides.length)%slides.length;
 slides.forEach((e,i)=>{const active=i===slide;e.classList.toggle('active',active);e.inert=!active;e.setAttribute('aria-hidden',String(!active));});
 slideButtons.forEach((b,i)=>{b.classList.toggle('active',i===slide);b.setAttribute('aria-pressed',String(i===slide));});
 $('.carousel-count').textContent=String(slide+1).padStart(2,'0')+' / '+String(slides.length).padStart(2,'0');
 if(announce)$('#carousel-status').textContent=slides[slide].getAttribute('aria-label');
}
function pauseLabel(){pause.innerHTML=icon(paused?'play':'pause');pause.setAttribute('aria-label',paused?'הפעלת חילופי הבאנרים':'עצירת חילופי הבאנרים');hero.classList.toggle('carousel-paused',paused);}
function startBannerTimer(){clearInterval(bannerTimer);bannerTimer=setInterval(()=>{
 const hoverPause=hero.matches(':hover')&&document.activeElement!==pause;
 const readingFocus=slides[slide].contains(document.activeElement);
 if(!paused&&!document.hidden&&heroVisible&&!hoverPause&&!readingFocus)showSlide(slide+1);
 },7000);}
function manualSlide(n){showSlide(n,true);paused=true;pauseLabel();startBannerTimer();}
slideButtons.forEach(b=>b.addEventListener('click',()=>manualSlide(Number(b.dataset.goSlide))));
$('#previous-banner').addEventListener('click',()=>manualSlide(slide-1));$('#next-banner').addEventListener('click',()=>manualSlide(slide+1));
pause.addEventListener('click',()=>{paused=!paused;pauseLabel();startBannerTimer();});pauseLabel();startBannerTimer();
new IntersectionObserver(entries=>{heroVisible=entries[0].isIntersecting;},{threshold:.15}).observe(hero);
motionPreference.addEventListener('change',e=>{if(e.matches){paused=true;pauseLabel();}});
let swipeStart=null;hero.addEventListener('touchstart',e=>{const t=e.changedTouches[0];swipeStart={x:t.clientX,y:t.clientY};},{passive:true});hero.addEventListener('touchend',e=>{if(!swipeStart)return;const t=e.changedTouches[0],dx=t.clientX-swipeStart.x,dy=t.clientY-swipeStart.y;if(Math.abs(dx)>60&&Math.abs(dx)>Math.abs(dy)*1.7)manualSlide(slide+(dx<0?1:-1));swipeStart=null;},{passive:true});
hero.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();manualSlide(slide+(e.key==='ArrowLeft'?1:-1));}});
$('.menu-toggle').addEventListener('click',()=>{const open=$('#main-nav').classList.toggle('open');$('.menu-toggle').setAttribute('aria-expanded',open);$('.menu-toggle').setAttribute('aria-label',open?'סגירת תפריט':'פתיחת תפריט');$('.menu-toggle').innerHTML=icon(open?'close':'menu');});
$$('#main-nav a').forEach(a=>a.addEventListener('click',()=>{$('#main-nav').classList.remove('open');$('.menu-toggle').setAttribute('aria-expanded','false');$('.menu-toggle').setAttribute('aria-label','פתיחת תפריט');$('.menu-toggle').innerHTML=icon('menu');}));
const { items: contents, href: contentHref, normalize } = window.DYContent;
const yoramShorts = contents.filter(item => item.rabbi === 'yoram' && item.length === 'short');
if (yoramShorts.length) {
  const lesson = yoramShorts[dayNumber % yoramShorts.length];
  $('#yoram-today-title').textContent = lesson.title;
  $('#yoram-today-summary').textContent = lesson.description || 'קטע קצר מתורת הרב יורם אברג׳יל זיע״א.';
  $('#yoram-today-link').href = contentHref(lesson);
}

const shabbatQuestions = [
  'איזה מעשה קטן שימח אותך השבוע?',
  'מי עזר לך השבוע, ועל מה היית רוצה להודות לו?',
  'מה תרצה ללמוד או לעשות יחד בשבוע הבא?',
  'מתי מישהו הקשיב לך באמת השבוע?',
];
const weekNumber = Math.floor((dayNumber + 4) / 7);
$('#home-shabbat-question').textContent = shabbatQuestions[weekNumber % shabbatQuestions.length];

function showContent(id) {
  const item = contents.find(content => content.id === id);
  if (item) location.assign(contentHref(item));
}

// Recurring meeting times supplied by the institution; exports are one occurrence only.
const pesagotAddress = 'גרטי וקרל קורי 9, ראש העין';
const venues = {
  mishkan: { name: 'מרכז רוחני משכן משה', address: 'מהריקא 10, ראש העין', floor: 'קומה ג׳' },
  synagogue: { name: 'בית הכנסת אהבת אחים', address: pesagotAddress },
  youth: { name: 'מרכז הנוער פסגות אפק', address: pesagotAddress },
};

const events=[
  {id:'morning',dayLabel:'כל בוקר',time:'09:00',end:'10:00',title:'שיעור הבוקר',description:'הלכה, חסידות, אמונה וביטחון',venue:venues.mishkan},
  {id:'sunday',day:0,dayLabel:'ראשון',time:'21:00',title:'השיעור המרכזי',description:'עם הרב יצחק חיים מעודה שליט״א',venue:venues.synagogue},
  {id:'youth',day:2,dayLabel:'שלישי',time:'20:00',title:'מרכז בני הנוער',description:'מפגש של לימוד, חיזוק וחברות',venue:venues.youth},
  {id:'tuesday-blessings',day:2,dayLabel:'שלישי',time:'21:00',title:'שיעור הלכות ברכות',description:'לימוד הלכה למעשה',venue:venues.synagogue},
  {id:'wednesday',day:3,dayLabel:'רביעי',time:'21:00',title:'שיעור אהבת ישראל',description:'עם הרב יצחק חיים מעודה שליט״א',venue:venues.synagogue},
  {id:'fathers',day:6,dayLabel:'מוצ״ש',time:'18:30',end:'19:30',title:'אבות ובנים',description:'זמן של תורה יחד בפסגות אפק',venue:venues.synagogue},
];

function eventTime(event) {
  return event.end ? `${event.time}–${event.end}` : event.time;
}

function venueText(venue) {
  return [venue.name, venue.address, venue.floor].filter(Boolean).join(' · ');
}

function eventDirections(event) {
  if (!event.venue) {
    return `<a class="schedule-button" href="#join" aria-label="בירור מיקום ${esc(event.title)} עם המזכירות">בירור עם המזכירות ${icon('arrow')}</a>`;
  }
  const { venue } = event;
  const maps = 'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(venue.address);
  return `<a class="schedule-button schedule-navigation" href="${esc(maps)}" target="_blank" rel="noopener noreferrer" aria-label="ניווט במפות גוגל אל ${esc(venue.name)}">ניווט במפות ${icon('arrow')}</a>`;
}

$('#events-list').innerHTML = events.map(event => `
  <li class="schedule-row" id="schedule-${event.id}">
    <div class="schedule-time">
      <span>${event.dayLabel}</span>
      <strong dir="ltr">${eventTime(event)}</strong>
    </div>
    <div class="schedule-subject">
      <h4>${esc(event.title)}</h4>
      <p>${esc(event.description)}</p>
    </div>
    <div class="schedule-place">
      <strong>${event.venue ? esc(event.venue.name) : 'מיקום לבירור'}</strong>
      <span>${event.venue ? esc([event.venue.address, event.venue.floor].filter(Boolean).join(' · ')) : 'פרטים אצל מזכירות המוסדות'}</span>
    </div>
    <div class="schedule-actions">
      ${eventDirections(event)}
      <button type="button" class="schedule-button" data-event="${event.id}" aria-label="שמירת ${esc(event.title)} ביומן">${icon('calendar')} שמירה ביומן</button>
    </div>
  </li>`).join('');
function israelParts(date){const out={};new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Jerusalem',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(date).forEach(p=>{if(p.type!=='literal')out[p.type]=Number(p.value);});return out;}
function zonedDate(y,m,d,h,min){const desired=Date.UTC(y,m-1,d,h,min);let stamp=desired;for(let i=0;i<3;i++){const p=israelParts(new Date(stamp));stamp+=desired-Date.UTC(p.year,p.month-1,p.day,p.hour,p.minute,p.second);}return new Date(stamp);}
function nextOccurrence(event, now = new Date()) {
  const { year, month, day } = israelParts(now);
  const [hour, minute] = event.time.split(':').map(Number);
  const daily = event.day === undefined;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (!daily) {
    date.setUTCDate(date.getUTCDate() + (event.day - date.getUTCDay() + 7) % 7);
  }

  let start = zonedDate(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate(), hour, minute);
  if (start <= now) {
    date.setUTCDate(date.getUTCDate() + (daily ? 1 : 7));
    start = zonedDate(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate(), hour, minute);
  }
  return { start, date };
}
function icsStamp(date){return date.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z/,'Z');}
function icsEscape(s){return s.replace(/\\/g,'\\\\').replace(/\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\\;');}
function foldICS(line){const enc=new TextEncoder();let rows=[],part='',size=0;for(const c of line){const bytes=enc.encode(c).length;if(size+bytes>73){rows.push(part);part=' ';size=1;}part+=c;size+=bytes;}rows.push(part);return rows.join('\r\n');}
function exportEvent(id,occurrence){const e=events.find(e=>e.id===id);const {start,date}=occurrence??nextOccurrence(e);let lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Darkei Yoram//Community//HE','CALSCALE:GREGORIAN','METHOD:PUBLISH','BEGIN:VEVENT','UID:'+e.id+'-'+icsStamp(start)+'@darkei-yoram','DTSTAMP:'+icsStamp(new Date()),'DTSTART:'+icsStamp(start)];if(e.end){const [h,m]=e.end.split(':').map(Number);lines.push('DTEND:'+icsStamp(zonedDate(date.getUTCFullYear(),date.getUTCMonth()+1,date.getUTCDate(),h,m)));}lines.push('SUMMARY:'+icsEscape(e.title+' | דרכי יורם'),'LOCATION:'+icsEscape(e.venue ? venueText(e.venue) : 'ראש העין · לבירור עם מזכירות המוסדות'),'DESCRIPTION:'+icsEscape('ייתכנו שינויים בזמני הפעילות. לפני ההגעה יש לוודא מועד ומיקום עם המזכירות.\n'+SITE+'#calendar'),'URL:'+SITE+'#calendar','END:VEVENT','END:VCALENDAR');const blob=new Blob([lines.map(foldICS).join('\r\n')+'\r\n'],{type:'text/calendar;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='darkei-yoram-'+id+'.ics';a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);notify('קובץ היומן מוכן. פתחו אותו כדי להוסיף את המפגש.');}
$('#events-list').addEventListener('click',e=>{const b=e.target.closest('[data-event]');if(b)exportEvent(b.dataset.event);});

const upcomingList = $('#home-upcoming-list');
const eventDate = new Intl.DateTimeFormat('he-IL', {
  timeZone: 'Asia/Jerusalem',
  day: 'numeric',
  month: 'long',
});
const eventWeekday = new Intl.DateTimeFormat('he-IL', {
  timeZone: 'Asia/Jerusalem',
  weekday: 'long',
});

function renderUpcoming(now = new Date()) {
  const upcoming = events.map(event => ({ event, ...nextOccurrence(event, now) }))
    .sort((first, second) => first.start - second.start)
    .slice(0, 2);
  const next = upcoming[0];
  $('#home-next-title').textContent = next.event.title;
  $('#home-next-time').innerHTML = `<time datetime="${next.start.toISOString()}">${eventWeekday.format(next.start)} · ${eventDate.format(next.start)} · <bdi dir="ltr">${eventTime(next.event)}</bdi></time>`;
  $('#home-next-venue').textContent = next.event.venue?.name || 'פרטי מקום בלוח השיעורים';
  $('#home-next-link').href = '#schedule-' + next.event.id;
  upcomingList.innerHTML = upcoming.map(({ event, start }) => `
    <li class="schedule-next">
      <div>
        <time datetime="${start.toISOString()}">${eventWeekday.format(start)} · ${eventDate.format(start)} · <bdi dir="ltr">${eventTime(event)}</bdi></time>
        <a href="#schedule-${event.id}">${esc(event.title)} ${icon('arrow')}</a>
      </div>
      <button type="button" class="schedule-button" data-upcoming-event="${event.id}" aria-label="שמירת ${esc(event.title)} ביומן" title="שמירה ביומן">${icon('calendar')}</button>
    </li>`).join('');
  return upcoming;
}

let upcomingEvents = renderUpcoming();
upcomingList.addEventListener('click', event => {
  const button = event.target.closest('[data-upcoming-event]');
  if (!button) return;
  const occurrence = upcomingEvents.find(({ event: item }) => item.id === button.dataset.upcomingEvent);
  exportEvent(occurrence.event.id, occurrence);
});

document.addEventListener('visibilitychange', () => {
  if (!document.hidden) upcomingEvents = renderUpcoming();
});
const activities={kollel:{title:'כוחה של תורה — באחדות לומדיה.',text:'שני כוללים בראש העין, במסגרת יום שלם ובמסגרת חצי יום. בית לעמל התורה, ללימוד משותף ולהתמדה, יום אחר יום. השותפות בהחזקת התורה מאפשרת להיות חלק מהעשייה בבית המדרש.',facts:['יום שלם וחצי יום','ראש העין','לימוד והתמדה'],image:'activity/kollel',interest:'החזקת התורה'},youth:{title:'מאמינים בכוחות של כל נער.',text:'מרכז בני הנוער בפסגות אפק הוא מקום למפגש, ללימוד ולחיזוק, מתוך הקשבה וקִרבה. הפעילות הקבועה מתקיימת בימי שלישי בשעה 20:00; לפני הגעה יש לוודא את פרטי המפגש.',facts:['ימי שלישי · 20:00','פסגות אפק','לימוד וחברות'],image:'activity/youth',interest:'ילדים ונוער'},synagogue:{title:'בית הכנסת אהבת אחים.',text:'בית של תפילה, שיעורי תורה ומפגש קהילתי בפסגות אפק. בהנהגת הרב יצחק חיים מעודה שליט״א. למי שמגיע לראשונה, מומלץ לפנות למזכירות לקבלת כתובת ופרטי הפעילות העדכניים.',facts:['פסגות אפק','תפילה וקהילה','שיעורי תורה'],image:'activity/prayer',interest:'הצטרפות לפעילות'},fathers:{title:'זמן של תורה. קשר לכל החיים.',text:'אבות ובנים בפסגות אפק, מיסודו של ר׳ סעדיה מעודה ז״ל. לימוד משותף, עידוד להתמדה והגרלות. לפי סדר הפעילות שנמסר, נפגשים במוצאי שבת 18:30–19:30; לפני הגעה יש לוודא שלא חל שינוי.',facts:['מוצאי שבת · 18:30–19:30','פסגות אפק','לומדים ומתמידים'],image:'activity/fathers',interest:'ילדים ונוער'}};
activities.chesed={title:'פותחים את הלב למשפחות העיר.',text:'קופת החסד ראש העין מסייעת במזון, בתלושים ובצורכי תינוקות, בשגרה, בשבתות ובחגים ובמקרים דחופים. אפשר להיות שותפים בעשייה או להציע זמן להתנדבות.',facts:['מזון ותלושים','צורכי תינוקות','שבתות וחגים'],image:'activity/chesed',interest:'מזון למשפחות'};
activities.lessons={title:'תורה שמאירה את היום.',text:'שיעורי הלכה, אמונה וחיזוק עם הרב יצחק חיים מעודה שליט״א. אפשר לצפות בשיעורים בספריית התוכן, לשמור להמשך ולהכיר את המפגשים בלוח הקהילה.',facts:['הלכה ואמונה','שיעורים לצפייה','לימוד בקהילה'],image:'torah',interest:'הצטרפות לפעילות'};
function showActivity(id){const a=activities[id];if(!a)return;$('#activity-body').innerHTML=`<img class="activity-modal-img" src="assets/${a.image}.webp" alt="צילום מקורי של הפעילות"><span class="dialog-meta">העשייה שלנו · מוסדות דרכי יורם</span><h2 id="activity-title">${a.title}</h2><p>${a.text}</p><div class="activity-facts">${a.facts.map(f=>`<span>${f}</span>`).join('')}</div><div class="dialog-actions"><a href="#join" class="button wine" id="activity-join">רוצה להיות חלק ${icon('arrow')}</a><a href="#calendar" class="button outline" id="activity-calendar">ללוח הקהילה ${icon('calendar')}</a></div>`;$('#activity-join').addEventListener('click',()=>{setInterest(a.interest);closeDialog($('#activity-dialog'));});$('#activity-calendar').addEventListener('click',()=>closeDialog($('#activity-dialog')));openDialog($('#activity-dialog'));}
$$('[data-activity]').forEach(trigger => trigger.addEventListener('click', event => {
  if (trigger.matches('a')) event.preventDefault();
  showActivity(trigger.dataset.activity);
}));
const tasks=['לומדים יחד עשר דקות בספר שבוחרים','כל אחד משתף בדבר אחד שעליו הוא מודה','אומרים מילה טובה לבן משפחה','בוחרים יחד מעשה חסד קטן','הילד שואל שאלה ומחפשים תשובה יחד','משתפים במשהו חדש שלמדנו השבוע','מסכמים רגע טוב וקובעים זמן ללימוד הבא'];
let completed=new Set(readLocal('darkei.challenge.v2',[]).filter(n=>Number.isInteger(n)&&n>=0&&n<tasks.length));
function renderChallenge(){const count=completed.size;$('#challenge-list').innerHTML=tasks.map((t,i)=>`<label class="challenge-item"><input type="checkbox" data-task="${i}" ${completed.has(i)?'checked':''}><span>${t}</span><small>${i+1}</small></label>`).join('');$('#challenge-count').textContent=count+'/7';$('.challenge-progress').style.setProperty('--progress',Math.round(count/7*100)+'%');$('.challenge-progress').setAttribute('aria-label',`הושלמו ${count} מתוך 7 פעילויות`);$('#challenge-status').textContent=count===7?'שבעה רגעים של יחד. איזה שבוע טוב!':count===0?'כל רגע משותף הוא התחלה טובה.':`כבר ${count} רגעים של יחד. ממשיכים להוסיף טוב.`;}
$('#challenge-list').addEventListener('change',e=>{const n=Number(e.target.dataset.task);if(e.target.checked)completed.add(n);else completed.delete(n);writeLocal('darkei.challenge.v2',[...completed]);renderChallenge();});$('#challenge-reset').addEventListener('click',()=>{completed.clear();writeLocal('darkei.challenge.v2',[]);renderChallenge();notify('האתגר אופס. שבוע חדש של יחד מתחיל.');});renderChallenge();
const contactTopic = $('#interest');
const contactName = $('#visitor-name');
const contactMessage = $('#join-message');
const contactStatus = $('#join-status');
const sendContact = $('#send-contact');
let suggestedMessage = '';
let pendingContact = null;

function updateMessage() {
  const name = contactName.value.trim();
  const topic = contactTopic.value;
  const greeting = name ? `שלום, שמי ${name}.` : 'שלום,';
  const subject = topic === 'פנייה כללית' ? '' : ` בנושא ${topic}`;
  const nextMessage = `${greeting} אני פונה למזכירות מוסדות ישימך כאפרים – דרכי יורם${subject}.`;
  if (!contactMessage.value.trim() || contactMessage.value === suggestedMessage) {
    contactMessage.value = nextMessage;
  }
  suggestedMessage = nextMessage;
  contactStatus.textContent = '';
  contactStatus.classList.remove('contact-received');
}

function setInterest(value) {
  if ([...contactTopic.options].some(option => option.value === value)) {
    contactTopic.value = value;
    updateMessage();
  }
}

function getContactMessage() {
  const message = contactMessage.value.trim();
  if (!message) {
    contactStatus.textContent = 'כתבו הודעה כדי להמשיך.';
    contactMessage.focus();
  }
  return message;
}

function showContactReceipt() {
  contactStatus.textContent = '✓ הפנייה התקבלה. צוות המזכירות יחזור אליכם בהקדם.';
  contactStatus.classList.add('contact-received');
}

$('#join-form').addEventListener('submit', async event => {
  event.preventDefault();
  if (sendContact.disabled) return;
  const payload = {
    name: contactName.value.trim(),
    phone: $('#visitor-phone').value.trim(),
    email: $('#visitor-email').value.trim(),
    city: $('#visitor-city')?.value.trim() || '',
    whatsappConsent: $('#visitor-whatsapp').checked,
    topic: contactTopic.value,
    message: getContactMessage(),
    website: $('#join-website').value,
  };
  if (!payload.message) return;

  const fingerprint = JSON.stringify(payload);
  if (pendingContact?.fingerprint !== fingerprint) {
    pendingContact = { fingerprint, id: crypto.randomUUID() };
  }
  if (pendingContact.accepted) {
    showContactReceipt();
    return;
  }
  sendContact.disabled = true;
  contactStatus.classList.remove('contact-received');
  contactStatus.textContent = 'שולחים את הפנייה…';
  try {
    const result = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, id: pendingContact.id }),
    });
    if (result.ok) {
      pendingContact.accepted = true;
      showContactReceipt();
    } else if (result.status === 422) {
      contactStatus.textContent = 'בדקו שהשם, הטלפון, המייל ותוכן ההודעה מולאו כראוי.';
    } else if (result.status === 429) {
      const minutes = Math.ceil(Number(result.headers.get('Retry-After')) / 60);
      contactStatus.textContent = minutes > 0
        ? `נשלחו כמה פניות בזמן קצר. אפשר לנסות שוב בעוד ${minutes} דקות או לפנות בטלפון.`
        : 'נשלחו כמה פניות בזמן קצר. אפשר לנסות מאוחר יותר או לפנות בטלפון.';
    } else {
      throw new Error('Contact could not be saved');
    }
  } catch {
    contactStatus.textContent = 'לא הצלחנו לאשר את קבלת הפנייה. אפשר לנסות שוב או לפנות בטלפון.';
  } finally {
    sendContact.disabled = false;
  }
});

contactTopic.addEventListener('change', updateMessage);
contactName.addEventListener('input', updateMessage);
contactMessage.addEventListener('input', () => {
  contactStatus.textContent = '';
  contactStatus.classList.remove('contact-received');
});
$$('[data-interest]').forEach(link => {
  link.addEventListener('click', () => setInterest(link.dataset.interest));
});
$$('[data-giving]').forEach(button => {
  button.addEventListener('click', () => {
    $$('[data-giving]').forEach(option => {
      option.classList.toggle('active', option === button);
      option.setAttribute('aria-pressed', option === button);
    });
    $('#giving-join').dataset.interest = button.dataset.giving;
  });
});
$('#copy-message').addEventListener('click', async () => {
  const message = getContactMessage();
  if (!message) return;
  try {
    await navigator.clipboard.writeText(message);
    contactStatus.textContent = 'ההודעה הועתקה. אפשר להדביק אותה בשיחה עם המזכירות.';
  } catch {
    contactMessage.focus();
    contactMessage.select();
    contactStatus.textContent = 'ההודעה סומנה להעתקה.';
  }
});
$('#share-message').addEventListener('click', () => {
  const message = getContactMessage();
  if (message) whatsapp(message);
});
updateMessage();
const requestedInterest = new URLSearchParams(location.search).get('interest');
if (location.hash === '#join' && requestedInterest) setInterest(requestedInterest);
$('#privacy-open').addEventListener('click',()=>openDialog($('#privacy-dialog')));
const destinations = [
  { title: 'שותפים איתנו', subtitle: 'תיאום תרומה · החזקת הכוללים, קופת החסד ופעילות הנוער', href: '/partners/', icon: 'heart' },
  { title: '7 ימים של אמונה וביטחון', subtitle: 'מסלול חיזוק עם הרב יורם והרב מעודה', keywords: 'חיזוקים קצרים סדרת שיעורים', href: '/faith-week/', icon: 'play' },
  { title: 'לומדים מכל מקום', subtitle: 'לימוד מקוון, שיעורים וסיפורים בארץ ובעולם', target: '#learn-anywhere', icon: 'book' },
  { title: 'לוח שיעורים ומפגשים', subtitle: 'לוח הקהילה · שעות, כתובות וניווט', target: '#calendar', icon: 'calendar' },
  { title: 'ספריית השיעורים', subtitle: 'כל הרבנים · שיעורים קצרים ומלאים', href: '/content/?type=video', icon: 'play' },
  { title: 'קופת החסד ראש העין', subtitle: 'סיוע, שותפות והתנדבות', target: '#chesed', icon: 'heart' },
  { title: 'הכוללים', subtitle: 'יום שלם וחצי יום בראש העין', activity: 'kollel', icon: 'book' },
  { title: 'יצירת קשר', subtitle: 'טלפון לפרטים, שיעורים והצטרפות', target: '#join', icon: 'share' },
  ...events.map(event => ({
    title: event.title,
    subtitle: [event.dayLabel, eventTime(event), event.description, event.venue?.name, event.venue?.address].filter(Boolean).join(' · '),
    target: '#schedule-' + event.id,
    icon: 'calendar',
  })),
  ...contents.map(item => ({
    title: item.title,
    subtitle: [item.author, item.tag].filter(Boolean).join(' · '),
    keywords: item.description,
    href: contentHref(item),
    icon: item.type === 'video' ? 'play' : 'book',
  })),
];
let currentResults = [];

function renderGlobalSearch() {
  const terms = normalize($('#global-search').value).split(' ').filter(Boolean);
  currentResults = destinations.filter(destination => {
    const searchable = normalize([destination.title, destination.subtitle, destination.keywords].filter(Boolean).join(' '));
    return terms.every(term => searchable.includes(term));
  }).slice(0, 8);
  $('#global-results').innerHTML = currentResults.length
    ? currentResults.map((destination, index) => `<button type="button" class="global-result" data-result="${index}">${icon(destination.icon)}<span>${esc(destination.title)}<small>${esc(destination.subtitle)}</small></span>${icon('arrow')}</button>`).join('')
    : '<p class="global-no-results">לא נמצאו תוצאות. נסו שם של רב, שיעור או פעילות.</p>';
}

function openSearch() {
  renderGlobalSearch();
  openDialog($('#search-dialog'));
  $('#global-search').focus();
}

$$('[data-search]').forEach(button => button.addEventListener('click', openSearch));
$('#global-search').addEventListener('input', renderGlobalSearch);
$('#global-results').addEventListener('click', event => {
  const button = event.target.closest('[data-result]');
  if (!button) return;
  const destination = currentResults[Number(button.dataset.result)];
  closeDialog($('#search-dialog'));
  if (destination.href) location.assign(destination.href);
  else if (destination.activity) showActivity(destination.activity);
  else {
    location.hash = destination.target;
    $(destination.target).scrollIntoView();
  }
});
document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();if(!$('dialog[open]'))openSearch();}});
const sectionObserver=new IntersectionObserver(entries=>{entries.forEach(e=>{if(e.isIntersecting)$$('#main-nav a').forEach(a=>a.classList.toggle('current',a.getAttribute('href')==='#'+e.target.id));});},{rootMargin:'-15% 0px -55% 0px'});$$('section[id]').forEach(e=>sectionObserver.observe(e));
function routeContent() {
  if (location.hash.startsWith('#content-')) showContent(location.hash.slice(9));
}
addEventListener('hashchange', routeContent);
routeContent();

const activityCategories={kollel:"torah",lessons:"torah",chesed:"community",synagogue:"community",fathers:"children",youth:"children"};
$$("[data-activity-filter]").forEach(b=>b.addEventListener("click",()=>{const selected=b.dataset.activityFilter;$(".activity-grid").classList.toggle("filtered",selected!=="all");$$("[data-activity-filter]").forEach(n=>n.setAttribute("aria-pressed",n===b));let count=0;$$(".activity-grid [data-activity]").forEach(card=>{card.hidden=selected!=="all"&&activityCategories[card.dataset.activity]!==selected;if(!card.hidden)count++;});$("#activity-count").textContent=count+" תחומי עשייה";}));
