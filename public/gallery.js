'use strict';

(() => {
  const grid = document.querySelector('#activity-photo-grid');
  const dialog = document.querySelector('#photo-dialog');
  const image = document.querySelector('#viewer-image');
  const albumTitle = document.querySelector('#photo-dialog-title');
  const photoTitle = document.querySelector('#photo-dialog-photo-title');
  const caption = document.querySelector('#photo-dialog-caption');
  const count = document.querySelector('#photo-viewer-count');
  const navigation = document.querySelector('#album-navigation');
  const play = document.querySelector('#album-play');
  const { esc } = window.DYContent;

  const categories = {
    torah: 'בית המדרש',
    youth: 'בני הנוער',
    chesed: 'חסד',
    fathers: 'אבות ובנים',
    community: 'קהילה ותפילה',
  };

  const albums = new Map(Object.entries(categories)
    .map(([id, title]) => [id, { title, photos: window.DYPhotos.filter(photo => photo.category === id) }])
    .filter(([, album]) => album.photos.length > 0));

  let album;
  let index = 0;
  let timer = null;
  let swipeStart = null;

  grid.innerHTML = [...albums].map(([id, { title, photos }]) => {
    const cover = photos[0];
    const total = photos.length === 1 ? 'תמונה אחת' : `${photos.length} תמונות`;
    return `<button type="button" class="gallery-photo album-card" data-album="${id}" aria-haspopup="dialog" aria-controls="photo-dialog">
      <span class="gallery-photo-image">
        <img src="${cover.thumb}" alt="" loading="lazy" style="object-position:${cover.position}">
        <span class="album-badge">${total}</span>
      </span>
      <span class="gallery-photo-caption">
        <strong>${esc(title)}</strong>
        <span class="album-open">לפתיחת האלבום <span aria-hidden="true">←</span></span>
      </span>
    </button>`;
  }).join('');

  function showPhoto(nextIndex) {
    const total = album.photos.length;
    index = (nextIndex + total) % total;
    const photo = album.photos[index];
    image.src = photo.file;
    image.alt = photo.caption;
    photoTitle.textContent = photo.title;
    caption.textContent = photo.caption;
    count.textContent = `תמונה ${index + 1} מתוך ${total}`;
  }

  function stopSlideshow() {
    clearInterval(timer);
    timer = null;
    play.textContent = 'הפעלת מצגת';
  }

  function move(step) {
    stopSlideshow();
    showPhoto(index + step);
  }

  grid.addEventListener('click', event => {
    const button = event.target.closest('[data-album]');
    if (!button) return;
    album = albums.get(button.dataset.album);
    albumTitle.textContent = album.title;
    navigation.hidden = album.photos.length < 2;
    showPhoto(0);
    openDialog(dialog);
  });

  document.querySelector('#previous-photo').addEventListener('click', () => move(-1));
  document.querySelector('#next-photo').addEventListener('click', () => move(1));
  play.addEventListener('click', () => {
    if (timer !== null) {
      stopSlideshow();
      return;
    }
    play.textContent = 'עצירת מצגת';
    timer = setInterval(() => {
      if (!document.hidden) showPhoto(index + 1);
    }, 3500);
  });

  dialog.addEventListener('close', () => {
    stopSlideshow();
    swipeStart = null;
  });

  dialog.addEventListener('keydown', event => {
    if (album.photos.length < 2 || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    move(event.key === 'ArrowLeft' ? 1 : -1);
  });

  image.addEventListener('touchstart', event => {
    const touch = event.changedTouches[0];
    swipeStart = event.touches.length === 1 ? { x: touch.clientX, y: touch.clientY } : null;
  }, { passive: true });

  image.addEventListener('touchend', event => {
    const start = swipeStart;
    swipeStart = null;
    if (!start || album.photos.length < 2) return;
    const touch = event.changedTouches[0];
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.6) move(dx < 0 ? 1 : -1);
  }, { passive: true });

  image.addEventListener('touchcancel', () => { swipeStart = null; });
})();
