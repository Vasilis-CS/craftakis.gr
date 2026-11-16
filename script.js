/* -----------------------------------------------------------
   CRAFTAKIS — script
   - Θέμα (σκούρο / φωτεινό)
   - Γλώσσα (GR / EN): τα ελληνικά είναι το κείμενο της σελίδας,
     τα αγγλικά βρίσκονται στο attribute data-en κάθε στοιχείου
   - Μενού κινητού
   - Φωτογραφίες από το content/images.json:
     γκαλερί, πριν & μετά, φωτογραφίες έργων
   - Προβολή φωτογραφίας (lightbox)
   - Καρδιές (αποθηκεύονται στον browser του επισκέπτη)
----------------------------------------------------------- */

const THEME_KEY = 'craftakisTheme2';
const LANG_KEY = 'craftakisLang';
const VOTE_KEY = 'craftakisVotes';

const store = {
    get(key) {
        try { return localStorage.getItem(key); } catch (e) { return null; }
    },
    set(key, value) {
        try { localStorage.setItem(key, value); } catch (e) { /* private mode */ }
    },
};

const escapeHtml = value => String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/* ---------- ΓΛΩΣΣΑ ---------- */
const UI = {
    gr: {
        before: 'Πριν',
        after: 'Μετά',
        slider: 'Σύρε για σύγκριση πριν και μετά',
        like: 'Μου αρέσει',
        close: 'Κλείσιμο',
        prev: 'Προηγούμενη φωτογραφία',
        next: 'Επόμενη φωτογραφία',
        open: 'Άνοιγμα φωτογραφίας',
        themeToggle: 'Αλλαγή θέματος',
        langToggle: 'Switch to English',
        langLabel: 'EN',
        menu: 'Μενού',
    },
    en: {
        before: 'Before',
        after: 'After',
        slider: 'Drag to compare before and after',
        like: 'Like',
        close: 'Close',
        prev: 'Previous photo',
        next: 'Next photo',
        open: 'Open photo',
        themeToggle: 'Toggle theme',
        langToggle: 'Αλλαγή σε Ελληνικά',
        langLabel: 'GR',
        menu: 'Menu',
    },
};

let lang = store.get(LANG_KEY) === 'en' ? 'en' : 'gr';
const greekTitle = document.title;

/* Διαλέγει το πεδίο της τρέχουσας γλώσσας από ένα αντικείμενο του images.json */
function pick(item, field) {
    if (!item) return '';
    if (lang === 'en' && item[`${field}_en`]) return item[`${field}_en`];
    return item[field] || '';
}

function applyLanguage(root = document) {
    root.querySelectorAll('[data-en]').forEach(el => {
        if (el.dataset.gr === undefined) el.dataset.gr = el.innerHTML;
        el.innerHTML = lang === 'en' ? el.dataset.en : el.dataset.gr;
    });

    root.querySelectorAll('[data-ui]').forEach(el => {
        el.textContent = UI[lang][el.dataset.ui] || '';
    });

    root.querySelectorAll('[data-ui-label]').forEach(el => {
        el.setAttribute('aria-label', UI[lang][el.dataset.uiLabel] || '');
    });

    if (root === document) {
        const html = document.documentElement;
        html.lang = lang === 'en' ? 'en' : 'el';
        document.title = lang === 'en' && html.dataset.titleEn ? html.dataset.titleEn : greekTitle;
    }
}

function initLanguage() {
    applyLanguage();

    const toggle = document.getElementById('langToggle');
    if (!toggle) return;

    toggle.addEventListener('click', () => {
        lang = lang === 'en' ? 'gr' : 'en';
        store.set(LANG_KEY, lang);
        applyLanguage();
        renderContent();
    });
}

/* ---------- ΘΕΜΑ ---------- */
function initTheme() {
    const toggle = document.getElementById('themeToggle');
    if (!toggle) return;

    toggle.addEventListener('click', () => {
        const next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
        document.documentElement.dataset.theme = next;
        store.set(THEME_KEY, next);
    });
}

/* ---------- ΜΕΝΟΥ ΚΙΝΗΤΟΥ ---------- */
function initMenu() {
    const button = document.getElementById('menuToggle');
    const nav = document.getElementById('siteNav');
    if (!button || !nav) return;

    const setOpen = open => {
        nav.classList.toggle('open', open);
        button.setAttribute('aria-expanded', open ? 'true' : 'false');
    };

    button.addEventListener('click', () => setOpen(!nav.classList.contains('open')));

    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && nav.classList.contains('open')) {
            setOpen(false);
            button.focus();
        }
    });
}

/* ---------- ΠΡΙΝ / ΜΕΤΑ ---------- */
function compareMarkup(pair, eager) {
    const title = escapeHtml(pick(pair, 'title'));
    const loading = eager ? 'eager' : 'lazy';
    const ratio = pair.ratio ? ` style="--ratio:${escapeHtml(pair.ratio)}"` : '';

    if (pair.layout === 'side') {
        return `
            <div class="ba-side">
                <figure>
                    <img src="${escapeHtml(pair.before)}" alt="${title} — ${UI[lang].before}" loading="${loading}" decoding="async">
                    <span class="compare-tag before">${UI[lang].before}</span>
                </figure>
                <figure>
                    <img src="${escapeHtml(pair.after)}" alt="${title} — ${UI[lang].after}" loading="${loading}" decoding="async">
                    <span class="compare-tag after">${UI[lang].after}</span>
                </figure>
            </div>`;
    }

    return `
        <div class="compare"${ratio}>
            <img src="${escapeHtml(pair.after)}" alt="${title} — ${UI[lang].after}" loading="${loading}" decoding="async">
            <img class="compare-before" src="${escapeHtml(pair.before)}" alt="${title} — ${UI[lang].before}" loading="${loading}" decoding="async">
            <span class="compare-tag before">${UI[lang].before}</span>
            <span class="compare-tag after">${UI[lang].after}</span>
            <span class="compare-handle" aria-hidden="true"></span>
            <input type="range" min="0" max="100" value="50" aria-label="${UI[lang].slider}">
        </div>`;
}

function initCompare(root = document) {
    root.querySelectorAll('.compare input[type="range"]').forEach(input => {
        if (input.dataset.bound) return;
        input.dataset.bound = 'true';

        const box = input.closest('.compare');
        const update = () => {
            box.classList.remove('nudge');
            box.style.setProperty('--pos', `${input.value}%`);
        };
        input.addEventListener('input', update);
    });
}

function renderBeforeAfter(pairs) {
    document.querySelectorAll('[data-before-after]').forEach(container => {
        const skip = (container.dataset.skip || '').split(',').filter(Boolean);
        const limit = Number(container.dataset.limit) || Infinity;

        const list = pairs
            .filter(pair => pair.before && pair.after && !skip.includes(pair.id))
            .slice(0, limit);

        container.innerHTML = list.map(pair => `
            <article class="ba-item">
                ${compareMarkup(pair)}
                <h3>${escapeHtml(pick(pair, 'title'))}</h3>
                <p>${escapeHtml(pick(pair, 'text'))}</p>
            </article>`).join('');

        initCompare(container);
    });
}

/* ---------- ΓΚΑΛΕΡΙ ---------- */
let lightboxItems = [];
let lightboxIndex = 0;

const heartIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.5s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.7c0 5.6-7.5 10.2-7.5 10.2z"/></svg>';

function renderGallery(items) {
    const grid = document.getElementById('galleryGrid');
    if (!grid) return;

    lightboxItems = items;

    grid.innerHTML = items.map((item, index) => {
        const title = escapeHtml(pick(item, 'title'));
        const subtitle = escapeHtml(pick(item, 'subtitle'));
        const size = item.w && item.h ? ` width="${Number(item.w)}" height="${Number(item.h)}"` : '';

        return `
            <figure class="gallery-item" data-id="${escapeHtml(item.id)}">
                <button class="gallery-open" type="button" data-index="${index}" aria-label="${UI[lang].open}: ${title}">
                    <img src="${escapeHtml(item.thumb || item.src)}" alt="${title}"${size} loading="lazy" decoding="async">
                </button>
                <figcaption class="gallery-caption">${title}${subtitle ? `<small>${subtitle}</small>` : ''}</figcaption>
                <button class="heart-btn" type="button" aria-pressed="false" aria-label="${UI[lang].like}: ${title}">
                    ${heartIcon}<span class="count"></span>
                </button>
            </figure>`;
    }).join('');

    grid.querySelectorAll('.gallery-open').forEach(button => {
        button.addEventListener('click', () => openLightbox(lightboxItems, Number(button.dataset.index)));
    });

    initVotes(grid);
}

/* ---------- ΦΩΤΟΓΡΑΦΙΕΣ ΕΡΓΩΝ ---------- */
function renderProjects(projects) {
    Object.entries(projects).forEach(([key, project]) => {
        const slot = document.getElementById(`projectPhoto_${key}`);
        if (!slot) return;

        // η κύρια φωτογραφία + όσα επιπλέον έργα έχουν προστεθεί στην κατηγορία
        const extra = (project.items || []).filter(item => item && item.src);
        const set = [project.src ? project : null, ...extra].filter(Boolean);

        slot.classList.toggle('has-more', extra.length > 0);
        if (!set.length) {
            slot.innerHTML = '';
            return;
        }

        const label = item => escapeHtml(pick(item, 'title'));
        const mainButton = project.src ? `
                <button type="button" data-i="0" aria-label="${UI[lang].open}: ${label(project)}">
                    <img src="${escapeHtml(project.src)}" alt="${label(project)}" loading="lazy" decoding="async">
                </button>` : '';
        // χωρίς επιπλέον έργα μένει η απλή μορφή· με επιπλέον, η κύρια φωτογραφία μπαίνει σε δικό της πλαίσιο
        const main = extra.length && project.src ? `<div class="project-main">${mainButton}</div>` : mainButton;
        const offset = project.src ? 1 : 0;
        const more = extra.length ? `
            <div class="project-more">${extra.map((item, i) => `
                <button type="button" data-i="${i + offset}" aria-label="${UI[lang].open}: ${label(item)}">
                    <img src="${escapeHtml(item.thumb || item.src)}" alt="${label(item)}" loading="lazy" decoding="async">
                </button>`).join('')}
            </div>` : '';
        slot.innerHTML = main + more;

        slot.querySelectorAll('button[data-i]').forEach(btn => {
            btn.addEventListener('click', () => openLightbox(set, Number(btn.dataset.i)));
        });
    });
}

/* ---------- LIGHTBOX ---------- */
function ensureLightbox() {
    let dialog = document.getElementById('lightbox');
    if (dialog) return dialog;

    dialog = document.createElement('dialog');
    dialog.id = 'lightbox';
    dialog.className = 'lightbox';
    dialog.innerHTML = `
        <div class="lightbox-inner">
            <img class="lightbox-img" src="" alt="">
            <p class="lightbox-caption"></p>
        </div>
        <button class="lightbox-btn lightbox-close" type="button" data-ui-label="close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>
        </button>
        <button class="lightbox-btn lightbox-prev" type="button" data-ui-label="prev">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>
        </button>
        <button class="lightbox-btn lightbox-next" type="button" data-ui-label="next">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>
        </button>`;
    document.body.appendChild(dialog);

    dialog.querySelector('.lightbox-close').addEventListener('click', () => dialog.close());
    dialog.querySelector('.lightbox-prev').addEventListener('click', () => stepLightbox(-1));
    dialog.querySelector('.lightbox-next').addEventListener('click', () => stepLightbox(1));

    dialog.addEventListener('click', e => {
        if (e.target === dialog || e.target.classList.contains('lightbox-inner')) dialog.close();
    });

    dialog.addEventListener('keydown', e => {
        if (e.key === 'ArrowLeft') stepLightbox(-1);
        if (e.key === 'ArrowRight') stepLightbox(1);
    });

    return dialog;
}

let lightboxSet = [];

function showLightboxItem() {
    const dialog = ensureLightbox();
    const item = lightboxSet[lightboxIndex];
    if (!item) return;

    const img = dialog.querySelector('.lightbox-img');
    const title = pick(item, 'title');
    const subtitle = pick(item, 'subtitle');

    img.src = item.src;
    img.alt = title;
    dialog.querySelector('.lightbox-caption').innerHTML =
        `${escapeHtml(title)}${subtitle ? `<small>${escapeHtml(subtitle)}</small>` : ''}`;

    const single = lightboxSet.length < 2;
    dialog.querySelector('.lightbox-prev').hidden = single;
    dialog.querySelector('.lightbox-next').hidden = single;
}

function stepLightbox(direction) {
    if (lightboxSet.length < 2) return;
    lightboxIndex = (lightboxIndex + direction + lightboxSet.length) % lightboxSet.length;
    showLightboxItem();
}

function openLightbox(items, index) {
    const dialog = ensureLightbox();
    lightboxSet = items;
    lightboxIndex = index;
    applyLanguage(dialog);
    showLightboxItem();
    if (!dialog.open) dialog.showModal();
}

/* ---------- ΚΑΡΔΙΕΣ ---------- */
function loadVotes() {
    try {
        const parsed = JSON.parse(store.get(VOTE_KEY) || '{}');
        return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (e) {
        return {};
    }
}

function initVotes(root) {
    const votes = loadVotes();

    root.querySelectorAll('.heart-btn').forEach(button => {
        const id = button.closest('[data-id]').dataset.id;
        const count = button.querySelector('.count');

        const paint = () => {
            const liked = !!(votes[id] && votes[id].liked);
            button.setAttribute('aria-pressed', liked ? 'true' : 'false');
            count.textContent = '';
        };

        paint();

        button.addEventListener('click', () => {
            const liked = !(votes[id] && votes[id].liked);
            votes[id] = { liked, count: liked ? 1 : 0 };
            store.set(VOTE_KEY, JSON.stringify(votes));
            paint();
        });
    });
}

/* ---------- ΦΟΡΤΩΣΗ ΠΕΡΙΕΧΟΜΕΝΟΥ ---------- */
let siteImages = null;

function renderContent() {
    if (!siteImages) return;
    renderGallery(siteImages.gallery || []);
    renderBeforeAfter(siteImages.beforeAfter || []);
    renderProjects(siteImages.projects || {});
}

async function loadSiteImages() {
    const needsContent = document.getElementById('galleryGrid')
        || document.querySelector('[data-before-after]')
        || document.querySelector('.project-photo');
    if (!needsContent) return;

    try {
        const response = await fetch('/content/images.json');
        if (!response.ok) return;
        siteImages = await response.json();
        renderContent();
    } catch (error) {
        /* Χωρίς το αρχείο η σελίδα απλώς δεν δείχνει τις δυναμικές φωτογραφίες */
    }
}

/* ---------- ΕΚΚΙΝΗΣΗ ---------- */
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initLanguage();
    initMenu();
    initCompare();
    loadSiteImages();
});

/* Ήπια κίνηση: οι ενότητες και οι φωτογραφίες εμφανίζονται απαλά καθώς κυλάς.
   Δεν τρέχει αν ο επισκέπτης έχει ζητήσει λιγότερη κίνηση και δεν κρύβει ποτέ περιεχόμενο χωρίς JavaScript. */
(function softMotion() {
    if (!('IntersectionObserver' in window)) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    document.documentElement.classList.add('motion');

    const io = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add('in');
            io.unobserve(entry.target);
        });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.06 });

    const SEL = '.section-head, .section .prose, .project, .compare, .post-card, .post-block .wrap, #galleryGrid > *';
    const fadeImage = img => {
        if (img.dataset.fade || img.complete) return;
        img.dataset.fade = '1';
        img.classList.add('img-fade');
        const done = () => img.classList.add('img-in');
        img.addEventListener('load', done, { once: true });
        img.addEventListener('error', done, { once: true });
    };
    const scan = () => {
        document.querySelectorAll(SEL).forEach(el => {
            if (el.dataset.rv) return;
            el.dataset.rv = '1';
            el.classList.add('rv');
            io.observe(el);
        });
        document.querySelectorAll('img').forEach(fadeImage);
    };
    scan();
    new MutationObserver(scan).observe(document.body, { childList: true, subtree: true });
})();

/* Συγκατάθεση cookies και ενσωματωμένα βίντεο.
   Τα βίντεο (Instagram, TikTok, YouTube) και το Google Analytics φορτώνουν ΜΟΝΟ μετά την αποδοχή.
   Το ίδιο το site αποθηκεύει μόνο τη γλώσσα, το θέμα και αυτή την επιλογή. */
(function consentAndEmbeds() {
    const KEY = 'craftakisConsent';
    const inEditor = window.self !== window.top;          // μέσα στον editor βλέπεις τα πάντα, χωρίς μήνυμα
    const embeds = () => document.querySelectorAll('.embed[data-embed]');
    const needed = () => Boolean(window.CRAFTAKIS_GA) || embeds().length > 0;
    const state = () => (inEditor ? 'all' : store.get(KEY));

    function loadAnalytics() {
        if (inEditor || !window.CRAFTAKIS_GA || window.__gaLoaded) return;
        window.__gaLoaded = true;
        const s = document.createElement('script');
        s.async = true;
        s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(window.CRAFTAKIS_GA);
        document.head.appendChild(s);
        window.dataLayer = window.dataLayer || [];
        window.gtag = function () { window.dataLayer.push(arguments); };
        window.gtag('js', new Date());
        window.gtag('config', window.CRAFTAKIS_GA);
    }

    function renderEmbeds() {
        embeds().forEach(box => {
            const on = state() === 'all';
            if (on && !box.querySelector('iframe')) {
                box.textContent = '';
                const f = document.createElement('iframe');
                f.src = box.dataset.embed;
                f.title = box.dataset.label || 'Video';
                f.loading = 'lazy';
                f.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
                f.allowFullscreen = true;
                f.referrerPolicy = 'strict-origin-when-cross-origin';
                box.appendChild(f);
            } else if (!on && !box.querySelector('.embed-wait')) {
                box.textContent = '';
                const w = document.createElement('div');
                w.className = 'embed-wait';
                w.innerHTML =
                    '<p data-en="This video is hosted by ' + (box.dataset.label || 'another service') + ', which uses its own cookies.">' +
                    'Αυτό το βίντεο φιλοξενείται στο ' + (box.dataset.label || 'άλλη υπηρεσία') + ', που χρησιμοποιεί δικά του cookies.</p>' +
                    '<button type="button" class="btn" data-accept data-en="Accept cookies and watch">Αποδοχή cookies και προβολή</button>' +
                    (box.dataset.link ? ' <a class="btn btn-ghost" target="_blank" rel="noopener" href="' + box.dataset.link + '" data-en="Open there">Άνοιγμα εκεί</a>' : '');
                box.appendChild(w);
                if (typeof applyLanguage === 'function') applyLanguage(w);
            }
        });
    }

    function choose(value) {
        store.set(KEY, value);
        document.querySelector('.cookie-banner')?.remove();
        loadAnalytics();
        embeds().forEach(b => { if (value !== 'all') b.textContent = ''; });
        renderEmbeds();
    }

    function banner() {
        if (document.querySelector('.cookie-banner')) return;
        const b = document.createElement('div');
        b.className = 'cookie-banner';
        b.setAttribute('role', 'dialog');
        b.setAttribute('aria-label', 'Cookies');
        b.innerHTML =
            '<p data-en="We use third-party cookies (Instagram, TikTok, YouTube, Google Analytics) to show videos and measure visits. You can accept them or continue with only the necessary ones.">' +
            'Χρησιμοποιούμε cookies τρίτων (Instagram, TikTok, YouTube, Google Analytics) για να δείχνουμε βίντεο και να μετράμε επισκέψεις. Μπορείς να τα αποδεχτείς ή να συνεχίσεις μόνο με τα απαραίτητα.</p>' +
            '<div class="cookie-actions"><button type="button" class="btn" data-choice="all" data-en="Accept">Αποδοχή</button>' +
            '<button type="button" class="btn btn-ghost" data-choice="necessary" data-en="Only necessary">Μόνο απαραίτητα</button></div>';
        document.body.appendChild(b);
        if (typeof applyLanguage === 'function') applyLanguage(b);
        b.addEventListener('click', e => {
            const c = e.target.closest('[data-choice]');
            if (c) choose(c.dataset.choice);
        });
    }

    function footerLink() {
        const inner = document.querySelector('.site-footer .footer-inner');
        if (!inner || inner.querySelector('.cookie-settings')) return;
        const p = document.createElement('p');
        p.className = 'footer-copy';
        p.innerHTML = '<button type="button" class="cookie-settings" data-en="Cookie settings">Ρυθμίσεις cookies</button>';
        inner.appendChild(p);
        p.firstChild.addEventListener('click', () => { localStorage.removeItem(KEY); banner(); });
        if (typeof applyLanguage === 'function') applyLanguage(p);
    }

    document.addEventListener('click', e => { if (e.target.closest('[data-accept]')) choose('all'); });
    if (inEditor || !needed()) { renderEmbeds(); return; }
    if (state() === null) banner();
    loadAnalytics_if();
    function loadAnalytics_if() { if (state() === 'all') loadAnalytics(); }
    renderEmbeds();
    footerLink();
})();
