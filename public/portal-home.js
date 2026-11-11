'use strict';
(function(){
const C=window.DYContent,$=s=>document.querySelector(s);
let history=C.read('darkei.history.v1').filter(h=>h&&typeof h.id==='string'&&C.items.some(c=>c.id===h.id));
function renderRecent(){const items=history.slice(0,3);$('#recent-reading').hidden=!items.length;$('#recent-list').innerHTML=items.map(h=>{const c=C.items.find(c=>c.id===h.id),pct=Math.min(100,Math.max(0,Math.round((h.progress||0)*100)));return `<a class="recent-card" href="/content/${c.id}/?resume=1"><img src="${C.esc(C.coverImage(c))}" alt="${C.esc(C.coverAlt(c))}" loading="lazy" referrerpolicy="no-referrer"><div><small>${pct>10&&pct<95?'המשך מהמקום שעצרתם':'נפתח לאחרונה'} · ${c.label}</small><strong>${C.esc(c.title)}</strong><span class="recent-line"><i style="width:${pct}%"></i></span></div></a>`;}).join('');}
$('#clear-recent').addEventListener('click',()=>{history=[];try{localStorage.removeItem('darkei.history.v1');}catch{}renderRecent();});renderRecent();
const title=$('#story-title'),body=$('#story-body'),status=$('#draft-status');
try{const draft=JSON.parse(localStorage.getItem('darkei.story-draft.v1'));if(draft&&typeof draft==='object'){title.value=typeof draft.title==='string'?draft.title.slice(0,100):'';body.value=typeof draft.body==='string'?draft.body.slice(0,12000):'';if(title.value||body.value)status.textContent='הטיוטה האחרונה שלכם מחכה כאן.';}}catch{}
function saveDraft(){try{localStorage.setItem('darkei.story-draft.v1',JSON.stringify({title:title.value,body:body.value}));status.textContent='הטיוטה נשמרה במכשיר.';}catch{status.textContent='הטיוטה זמינה עד סגירת הדף. כדאי להעתיק אותה.';}}
[title,body].forEach(e=>e.addEventListener('input',saveDraft));
function storyText(){return 'סיפור לעיון מערכת דרכי יורם\n\n'+(title.value.trim()||'ללא כותרת')+'\n\n'+body.value.trim();}
function valid(){if(body.value.trim().length<20){status.textContent='כתבו לפחות כמה משפטים לפני ההעתקה או השיתוף.';body.focus();return false;}return true;}
$('#copy-story').addEventListener('click',async()=>{if(!valid())return;try{await navigator.clipboard.writeText(storyText());status.textContent='הסיפור הועתק. אפשר להדביק ולשלוח למזכירות.';}catch{body.focus();body.select();status.textContent='הסיפור סומן. בחרו בהעתקה כדי לשלוח אותו.';}});
$('#share-story-message').addEventListener('click',()=>{if(valid())window.open('https://wa.me/?text='+encodeURIComponent(storyText()),'_blank','noopener,noreferrer');});
$('#clear-story-draft').addEventListener('click',()=>{title.value='';body.value='';try{localStorage.removeItem('darkei.story-draft.v1');}catch{}status.textContent='הטיוטה נמחקה מהמכשיר.';});
})();
