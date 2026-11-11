'use strict';

(() => {
  const banner = document.getElementById('seasonal-home');
  if (!banner) return;

  const campaigns = {
    hanukkah: {
      label: 'לקראת חנוכה · קופת החסד',
      title: 'מוסיפים אור למשפחות בראש העין',
      description: 'מצטרפים לקופת החסד ומסייעים למשפחות במזון ובצורכי החג.',
      action: 'לסיוע למשפחות',
      href: '/partners/#support-chesed',
      image: '/assets/activity/chesed-supplies.webp',
    },
    pesach: {
      label: 'לקראת פסח · קופת החסד',
      title: 'עוזרים למשפחות להתכונן לחג',
      description: 'שותפים עם קופת החסד בסיוע למשפחות בראש העין לקראת פסח.',
      action: 'לתיאום תרומה לסלי חג',
      href: '/partners/#support-chesed',
      image: '/assets/activity/chesed-supplies.webp',
    },
    elul: {
      label: 'חודש אלול · תורה וחיזוק',
      title: 'מתחילים שנה עם קביעות בתורה',
      description: 'שבעה סרטונים קצרים של הרב יורם אברג׳יל והרב יצחק חיים מעודה, אחד לכל יום.',
      action: 'למסלול אמונה וביטחון',
      href: '/faith-week/',
      image: '/assets/activity/kollel-focus.webp',
    },
    school: {
      label: 'חזרה ללימודים · פסגות אפק',
      title: 'מקום לנוער ללמוד ולהתחבר',
      description: 'מרכז בני הנוער בפסגות אפק מזמין אתכם להכיר את המפגשים והלימוד המשותף.',
      action: 'להכיר את מרכז הנוער',
      href: '/#schedule-youth',
      image: '/assets/activity/youth-study.webp',
    },
  };

  function dateParts(date, locale, monthFormat) {
    const parts = new Intl.DateTimeFormat(locale, {
      timeZone: 'Asia/Jerusalem', month: monthFormat, day: 'numeric',
    }).formatToParts(date);
    return {
      month: parts.find(part => part.type === 'month')?.value,
      day: Number(parts.find(part => part.type === 'day')?.value),
    };
  }

  function campaignFor(date) {
    const hebrew = dateParts(date, 'en-u-ca-hebrew', 'long');
    if (hebrew.month === 'Kislev' || (hebrew.month === 'Tevet' && hebrew.day <= 3)) return 'hanukkah';
    if (hebrew.month === 'Nisan' && hebrew.day <= 22) return 'pesach';
    const civil = dateParts(date, 'en-GB', 'numeric');
    const month = Number(civil.month);
    if ((month === 8 && civil.day >= 25) || (month === 9 && civil.day <= 12)) return 'school';
    if (hebrew.month === 'Elul') return 'elul';
    return null;
  }

  let key;
  try {
    key = campaignFor(new Date());
  } catch {
    return;
  }
  if (!key) return;
  const campaign = campaigns[key];
  const action = document.getElementById('seasonal-action');
  banner.dataset.season = key;
  document.getElementById('seasonal-label').textContent = campaign.label;
  document.getElementById('seasonal-title').textContent = campaign.title;
  document.getElementById('seasonal-description').textContent = campaign.description;
  action.firstChild.textContent = campaign.action + ' ';
  action.href = campaign.href;
  document.getElementById('seasonal-image').src = campaign.image;
})();
