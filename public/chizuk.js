'use strict';

const playlist = document.querySelector('#chizuk-playlist');
const clips = [...playlist.querySelectorAll('[data-clip]')];
const title = document.querySelector('#chizuk-title');
const label = document.querySelector('#chizuk-label');
const player = document.querySelector('#chizuk-player');
const watch = document.querySelector('#chizuk-watch');
const poster = document.querySelector('#chizuk-poster');
const source = document.querySelector('#chizuk-source');

const todayInIsrael = new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'Asia/Jerusalem',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
}).format(new Date());
const dayNumber = Math.floor(Date.parse(todayInIsrael) / 86_400_000);
const dailyClip = clips[dayNumber % clips.length];

function showClip(clip, play = false) {
  title.textContent = clip.querySelector('strong').textContent;
  label.textContent = clip === dailyClip ? 'החיזוק של היום' : 'הסרטון שבחרתם';
  watch.href = source.href = clip.href;
  for (const item of clips) {
    item.setAttribute('aria-current', String(item === clip));
  }

  if (!play) {
    poster.src = clip.querySelector('img').src;
    return;
  }

  const frame = document.createElement('iframe');
  frame.className = 'video-frame';
  frame.title = title.textContent;
  frame.src = 'https://www.youtube-nocookie.com/embed/' + clip.dataset.clip + '?rel=0&autoplay=1';
  frame.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
  frame.allowFullscreen = true;
  frame.referrerPolicy = 'strict-origin-when-cross-origin';
  player.replaceChildren(frame);
}

function isNormalClick(event) {
  return event.button === 0 && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey;
}

const requestedClip = new URLSearchParams(location.search).get('clip');
const initialClip = clips.find(clip => clip.dataset.clip === requestedClip) || dailyClip;
showClip(initialClip);

watch.addEventListener('click', event => {
  if (!isNormalClick(event)) return;
  event.preventDefault();
  showClip(initialClip, true);
  title.focus();
});

playlist.addEventListener('click', event => {
  const clip = event.target.closest('[data-clip]');
  if (!clip || !isNormalClick(event)) return;
  event.preventDefault();
  showClip(clip, true);
  title.focus();
  title.scrollIntoView({block: 'start'});
});
