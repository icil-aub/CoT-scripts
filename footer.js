/* ===========================================================================
 * customJS - footer.js — Footer text.
 * ---------------------------------------------------------------------------
 * Lays the "Know your rental rights" link, the lab's address and copyright,
 * and its contact details over the footer layout, beside its logos. The logos
 * and the rule above them stay EB widgets; this script owns the type only.
 * The text and its spacing scale with the desktop footer's actual dimensions.
 *
 * Design: "COT-1080x1920" (22 Sept) — measured from the .ai file itself:
 *
 *   link       DIN Bold 16.83px, uppercase, muted olive, underlined
 *              (1.46px stroke, 2.27px under the baseline, same colour)
 *   address,   Inter SemiBold 13.5px, line-height 1.2, ink —
 *   contact    two columns, the second starting 29.688em after the first
 *
 * The link's box bottom sits on the vertical centre of the address block,
 * so it reads as riding the upper half of the five-line block beside it.
 * ======================================================================== */
(function () {

    // Every page has its own copy of the footer, each with a customJS widget
    // holding this same file, and EB runs a copy each time its page opens.
    // The first copy installs a controller. A later copy of the same VERSION
    // means its footer has just been rendered, so it asks the controller to
    // mount there now; a copy of another VERSION replaces the controller, so
    // one outdated copy (say, on the Landing page) can't keep the text out of
    // every other page. Bump VERSION whenever this file changes.
    const VERSION = "2026-11-26-footer-fonts-v10";
    const CONTROLLER_KEY = "__cotFooterController";

    const previous = window[CONTROLLER_KEY];
    if (previous?.version === VERSION) {
        previous.refresh();
        return;
    }
    previous?.destroy?.();
    // Copies from before the controller check only this flag; setting it
    // keeps them from installing a second footer beside this one.
    window.__cotFooterInstalled = true;

    // ============================================================
    // CONFIGURATION
    // ============================================================

    // Canonical City of Tenants palette — keep byte-identical across every
    // customJS widget (they are isolated, so this is duplicated on purpose).
    const COLORS = {
        brand:     "#3b7b4e",
        brandDark: "#2c5e3b",
        ink:       "#191818",
        line:      "#d5d0c2",
        lineSoft:  "#e4dfd1",
        panel:     "#f6f1e4",
        pageBg:    "#e7e1d3",
        muted:     "#6c6b50",
        mutedSoft: "#a5a189",
        error:     "#a8341f",
        accent:    "#b5622f",
        accentDark:"#8f4b23",
        chipBg:    "#efe9da",
    };

    // Fonts are served from CoT-scripts on GitHub Pages (its fonts/ folder),
    // beside header.js, footer.js and common.js. The ICIL fonts repo on
    // jsDelivr, their earlier home, is the fallback; the Arabic face falls
    // back to its raw GitHub URL instead (see DIN_AR_GITHUB).
    const FONT_HOST = "https://icil-aub.github.io/CoT-scripts/fonts/";
    function repoFont(file) {
        return [
            `${FONT_HOST}${file}`,
            `https://cdn.jsdelivr.net/gh/icil-aub/fonts@main/${file}`,
        ];
    }
    const [INTER_MAIN, INTER_BACKUP]     = repoFont("Inter-VariableFont_opsz,wght.ttf");
    const [DIN_MAIN, DIN_BACKUP]         = repoFont("DIN-Bold.otf");
    const DIN_AR_GITHUB = "https://raw.githubusercontent.com/icil-aub/fonts/main/din-next-lt-w23-regular.ttf";
    const DIN_AR_MAIN = `${FONT_HOST}din-next-lt-w23-regular.ttf`;

    const ENGLISH = "'Inter', sans-serif";
    const DISPLAY = "'DIN', 'Inter', sans-serif";
    const ARABIC  = "'DINNextLTW23 Regular', sans-serif";

    // Same Inter/Arabic declarations as the other pages, so whichever script
    // loads first, the browser sees one face per family.
    const FONT_FACES = `
        @font-face {
            font-family: "Inter";
            src: url("${INTER_MAIN}") format("truetype"),
                 url("${INTER_BACKUP}") format("truetype");
            font-weight: 100 900; font-style: normal; font-display: swap;
        }
        @font-face {
            font-family: "DIN";
            src: url("${DIN_MAIN}") format("opentype"),
                 url("${DIN_BACKUP}") format("opentype");
            font-weight: 700; font-style: normal; font-display: swap;
        }
        @font-face {
            font-family: "DINNextLTW23 Regular";
            src: url("${DIN_AR_MAIN}") format("truetype"), url("${DIN_AR_GITHUB}") format("truetype");
            font-weight: 400; font-style: normal; font-display: swap;
        }
    `;

    // Each page keeps its own footer panel rather than EB's shared footer, so
    // the page background can run behind it. List every copy here: the
    // data-layoutid on the panel's ".layout" box, per device wherever a page
    // has its own tablet or phone layout. EB renders only the current page
    // and device, so the text mounts into whichever copy is on screen.
    const FOOTER_LAYOUTS = {
        LANDING:    { LARGE: "layout_144", MEDIUM: "", SMALL: "" },
        SURVEY:     { LARGE: "layout_135", MEDIUM: "", SMALL: "" },
        MAP:        { LARGE: "layout_95",  MEDIUM: "", SMALL: "" },
        STATISTICS: { LARGE: "layout_99",  MEDIUM: "", SMALL: "" },
        ABOUT:      { LARGE: "layout_123", MEDIUM: "", SMALL: "" },
    };
    const FOOTER_IDS = Object.values(FOOTER_LAYOUTS)
        .flatMap(devices => Object.values(devices))
        .filter(Boolean);

    // EB page names, as in the URL's /page/<name> segment (see Landing.js).
    // With no /page/ segment EB shows the default page, the Landing page.
    const PAGE_NAMES = {
        LANDING:    "Landing",
        SURVEY:     "Survey",
        MAP:        "Map",
        STATISTICS: "Statistics",
        ABOUT:      "About",
    };

    const SELECTORS = {
        // Every layout item inside a layout carries the same data-layoutid
        // (plus its own data-layoutitemid), so the .layout box without an
        // item id is the footer panel itself.
        FOOTER: FOOTER_IDS.map(id => `.layout[data-layoutid="${id}"]:not([data-layoutitemid])`).join(", "),
    };

    // The footer layout holds the logos and the rule too, so the text keeps
    // to the span it has on the 1920px artboard: from the link's left edge
    // (x 736.7) to the end of the contact column (x 1836.4, about 24px short
    // of the rule's end). Fractions of the footer's width, so the span keeps
    // clear of the logos at any desktop width.
    const LAYOUT = {
        TEXT_LEFT:  "38.37%",   // 736.7 / 1920
        TEXT_RIGHT: "4.35%",    // (1920 − 1836.4) / 1920
    };

    // Match the header's 1920 × 1080 desktop reference: 60px side margins
    // leave an 1800px inner box, and the footer occupies 10% of the height.
    const REFERENCE = {
        WIDTH:       1800,
        HEIGHT:      108,
        FONT:        13.5,
        LINK_FONT:   16.8,
        ROW_GAP:     14,
        COLUMN_GAP:  24,
    };

    const DOM_IDS = {
        MOUNT: "cot-footer-mount",
        STYLE: "cot-footer-style",
    };

    const TIMING = {
        RETRY_INTERVAL_MS: 100,
        MAX_RETRIES:       100,   // ×100ms ≈ 10s before giving up
        ROUTE_SETTLE_MS:   50,
        RESIZE_SETTLE_MS:  150,
        DOM_SETTLE_MS:     50,
    };

    const LANG_KEY   = "cot.lang";
    const LANG_EVENT = "cot:langchange";
    // ESM avoids registering with Experience Builder's AMD loader.
    const I18NEXT_MODULE_URL = "https://unpkg.com/i18next@26.7.2/dist/esm/i18next.js";

    // Every word of the footer, its contact details and its link targets live
    // in this public ArcGIS Online item (i18n/footer/footer.geojson, with
    // top-level "en" and "ar" objects). None is kept in this script. Arabic
    // falls back to English per key, so shared values (phone, email, site,
    // links) are written once, under "en". "{year}" becomes the current year.
    const FOOTER_I18N_ITEM_ID = "c3e0f5384ff14046b39ce7ba2339140b";
    const FOOTER_I18N_URL =
        `https://www.arcgis.com/sharing/rest/content/items/${FOOTER_I18N_ITEM_ID}/data`;

    // Hides the text until its copy arrives, so it never shows empty lines.
    const PENDING_CLASS = "cot-ft-pending";

    // Only these link schemes are taken from the item.
    const SAFE_HREF = /^(https?:|mailto:|tel:)/i;

    // ============================================================
    // RUNTIME STATE
    // ============================================================

    let retryTimer = null;
    let retryCount = 0;
    let resizeTimer = null;
    let domTimer = null;
    let mountedHost = null;
    let hostObserver = null;
    let domObserver = null;
    let disposed = false;
    let footerCopy = null;        // { en: {...}, ar: {...} } from the ArcGIS Online item
    let footerCopyLoad = null;
    let footerI18n = null;

    // ============================================================
    // LANGUAGE
    // ============================================================
    // Reads the shared state the other pages write; never sets it.

    function getLang() {
        if (window.cotLang === "ar" || window.cotLang === "en") return window.cotLang;
        let stored = null;
        try { stored = localStorage.getItem(LANG_KEY); } catch (e) { /* private mode */ }
        window.cotLang = (stored === "ar" || stored === "en") ? stored : "en";
        return window.cotLang;
    }

    // i18next does the lookups once loaded (Arabic falls back to English per
    // key). Until then, or if unpkg is unreachable, the copy is read directly.
    function t(key) {
        const lang = getLang();
        const s = footerI18n
            ? footerI18n.t(key, { lng: lang, defaultValue: "" }) || ""
            : footerCopy?.[lang]?.[key] || footerCopy?.en?.[key] || "";
        return s.replace("{year}", String(new Date().getFullYear()));
    }

    // Non-empty strings only; a blank value counts as missing.
    function readBundle(remote, lang) {
        const bundle = remote?.[lang];
        if (!bundle || typeof bundle !== "object" || Array.isArray(bundle)) return null;
        const strings = {};
        for (const [key, value] of Object.entries(bundle)) {
            if (typeof value === "string" && value.trim()) strings[key] = value;
        }
        return strings;
    }

    async function fetchFooterCopy() {
        if (!FOOTER_I18N_ITEM_ID) throw new Error("FOOTER_I18N_ITEM_ID is not set");
        const response = await fetch(FOOTER_I18N_URL, { credentials: "omit" });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const remote = await response.json();
        const en = readBundle(remote, "en");
        if (!en || !Object.keys(en).length) throw new Error('the item has no "en" copy');
        return { en, ar: readBundle(remote, "ar") || {} };
    }

    async function createFooterI18n(copy) {
        const { createInstance } = await import(I18NEXT_MODULE_URL);
        const instance = createInstance();
        await instance.init({
            lng: getLang(),
            fallbackLng: "en",
            supportedLngs: ["en", "ar"],
            ns: ["footer"],
            defaultNS: "footer",
            keySeparator: false,
            nsSeparator: false,
            resources: {
                en: { footer: copy.en },
                ar: { footer: copy.ar },
            },
        });
        return instance;
    }

    // Fetched once per controller and reused on every page's footer. A
    // failure is retried on the next mount.
    function loadFooterCopy() {
        if (footerCopyLoad) return footerCopyLoad;
        footerCopyLoad = fetchFooterCopy()
            .then(async copy => {
                if (disposed) return;
                footerCopy = copy;
                applyLang();
                try {
                    footerI18n = await createFooterI18n(copy);
                    console.info("[Footer] i18next ready");
                } catch (error) {
                    console.warn("[Footer] i18next unavailable; reading the copy directly:", error);
                }
            })
            .catch(error => {
                footerCopyLoad = null;
                console.error("[Footer] footer copy unavailable from ArcGIS Online:", error);
            });
        return footerCopyLoad;
    }

    // The copy may hold <br> for a design line break; every other tag is
    // dropped and its text kept.
    function setFooterText(node, value) {
        const template = document.createElement("template");
        template.innerHTML = value;
        const fragment = document.createDocumentFragment();
        (function copy(source) {
            source.childNodes.forEach(child => {
                if (child.nodeType === 3) fragment.appendChild(document.createTextNode(child.textContent));
                else if (child.nodeType === 1 && child.tagName === "BR") fragment.appendChild(document.createElement("br"));
                else if (child.nodeType === 1 && !["SCRIPT", "STYLE", "TEMPLATE"].includes(child.tagName)) copy(child);
            });
        })(template.content);
        node.replaceChildren(fragment);
    }

    function setFooterHref(node, value) {
        if (value && SAFE_HREF.test(value.trim())) {
            node.href = value.trim();
            if (/^https?:/i.test(node.href)) { node.target = "_blank"; node.rel = "noopener"; }
        } else {
            // An <a> without href is plain text: not focusable, not clickable.
            node.removeAttribute("href");
            node.removeAttribute("target");
            node.removeAttribute("rel");
        }
    }

    function applyLang() {
        const mount = document.getElementById(DOM_IDS.MOUNT);
        if (!mount) return;
        const lang = getLang();

        // The footer's own attributes (not the pages' data-cot-i18n) keep a
        // page's translation pass from overwriting these lines.
        mount.querySelectorAll("[data-cot-ft-i18n]").forEach(node => {
            setFooterText(node, t(node.dataset.cotFtI18n));
        });
        mount.querySelectorAll("[data-cot-ft-href]").forEach(node => {
            setFooterHref(node, t(node.dataset.cotFtHref));
        });
        mount.classList.toggle(PENDING_CLASS, !footerCopy);
        mount.setAttribute("dir", lang === "ar" ? "rtl" : "ltr");
        mount.setAttribute("lang", lang);
        updateGeometry();
    }

    function onLangChange(e) {
        const lang = e.detail && e.detail.lang;
        if (lang && lang !== window.cotLang) window.cotLang = lang;
        applyLang();
    }

    // ============================================================
    // MOUNT
    // ============================================================
    // Not tied to a page: each page has its own footer copy. Navigation and
    // device-layout changes swap which copy is live, so every route change
    // and resize re-checks that the text is inside the one on screen — and
    // so does a footer appearing in the DOM, however late EB renders it
    // (after the retries have run out, or after the outgoing page's footer
    // was already picked up mid-transition).

    function onRouteChange() {
        setTimeout(restart, TIMING.ROUTE_SETTLE_MS);
    }

    function onResize() {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(restart, TIMING.RESIZE_SETTLE_MS);
    }

    function isOrHasFooter(node) {
        return node.nodeType === 1 && (node.matches(SELECTORS.FOOTER) || !!node.querySelector(SELECTORS.FOOTER));
    }

    // Also re-checks when the text leaves the footer it was mounted in: the
    // footer unmounted, EB redrew its contents, or an outdated copy of this
    // file still running from another page moved the text elsewhere.
    function onDomChange(records) {
        const mount = document.getElementById(DOM_IDS.MOUNT);
        const lost = mountedHost !== null && (!mountedHost.isConnected || !mount || !mountedHost.contains(mount));
        if (lost || records.some(record => [...record.addedNodes].some(isOrHasFooter))) {
            if (domTimer !== null) return;
            domTimer = setTimeout(() => { domTimer = null; restart(); }, TIMING.DOM_SETTLE_MS);
        }
    }

    // Each page or layout change gets the full retry budget. Otherwise
    // giving up on a page with the footer turned off would stop the
    // footer from mounting on the next page that has one.
    function restart() {
        if (disposed) return;
        cancelRetry();
        tryInit();
    }

    function scheduleRetry() {
        if (retryTimer !== null) return;
        if (++retryCount > TIMING.MAX_RETRIES) {
            console.warn(`[Footer] footer host not found after ${TIMING.MAX_RETRIES} attempts ` +
                `(${SELECTORS.FOOTER}).`);
            return;
        }
        retryTimer = setTimeout(() => { retryTimer = null; tryInit(); }, TIMING.RETRY_INTERVAL_MS);
    }

    function cancelRetry() {
        if (retryTimer !== null) clearTimeout(retryTimer);
        retryTimer = null;
        retryCount = 0;
    }

    function currentPageKey() {
        const parts = window.location.pathname.split("/").filter(Boolean);
        const i = parts.findIndex(part => /^page$/i.test(part));
        let name = PAGE_NAMES.LANDING;
        if (i !== -1) {
            try { name = decodeURIComponent(parts[i + 1] || ""); } catch (e) { name = parts[i + 1] || ""; }
        }
        return Object.keys(PAGE_NAMES).find(key => PAGE_NAMES[key].toLowerCase() === name.toLowerCase()) || null;
    }

    // While a page transition runs, the outgoing page's footer can still be
    // on screen beside the incoming one: prefer the copy that belongs to the
    // page in the URL, else whichever copy is laid out on screen.
    function findHost() {
        const visible = [...document.querySelectorAll(SELECTORS.FOOTER)]
            .filter(node => node.getClientRects().length > 0);
        const pageIds = Object.values(FOOTER_LAYOUTS[currentPageKey()] || {}).filter(Boolean);
        return visible.find(node => pageIds.includes(node.dataset.layoutid)) || visible[0] || null;
    }

    function tryInit() {
        if (disposed || !FOOTER_IDS.length) return;
        const host = findHost();
        if (!host) {
            hostObserver?.disconnect();
            mountedHost = null;
            scheduleRetry();
            return;
        }
        cancelRetry();

        const existing = document.getElementById(DOM_IDS.MOUNT);
        if (existing && host.contains(existing)) {
            observeHost(host);
            updateGeometry();
            return;
        }
        existing?.remove();   // left behind in a footer EB has since swapped out

        injectStyles();
        buildFooter(host);
        observeHost(host);
        applyLang();
        loadFooterCopy();
    }

    function observeHost(host) {
        if (mountedHost === host) return;
        hostObserver?.disconnect();
        mountedHost = host;

        if (typeof ResizeObserver === "function") {
            hostObserver = new ResizeObserver(() => {
                // A copy that leaves the page or the screen collapses to
                // 0 × 0: move the text to the copy that replaced it.
                if (!host.isConnected || host.getClientRects().length === 0) restart();
                else updateGeometry();
            });
            hostObserver.observe(host);
        }
    }

    function updateGeometry() {
        const host = mountedHost;
        const mount = document.getElementById(DOM_IDS.MOUNT);
        if (!host || !mount || !host.contains(mount)) return;

        // Use logical CSS dimensions so Experience Builder's canvas zoom does
        // not alter the proportions, just as in the desktop header script.
        const width = host.clientWidth;
        const height = host.clientHeight;
        if (width <= 0 || height <= 0) return;

        const scale = Math.min(
            width / REFERENCE.WIDTH,
            height / REFERENCE.HEIGHT
        );
        const sizes = {
            "--cot-ft-fs": REFERENCE.FONT * scale,
            "--cot-ft-fs-link": REFERENCE.LINK_FONT * scale,
            "--cot-ft-row-gap": REFERENCE.ROW_GAP * scale,
            "--cot-ft-column-gap": REFERENCE.COLUMN_GAP * scale,
        };

        for (const [name, value] of Object.entries(sizes)) {
            const pixels = `${Number(value.toFixed(4))}px`;
            if (mount.style.getPropertyValue(name) !== pixels) {
                mount.style.setProperty(name, pixels);
            }
        }
    }

    // ============================================================
    // STYLES
    // ============================================================
    // Font sizes and flex gaps are set from the live footer box in
    // updateGeometry(). The em-based details scale with the font.

    function injectStyles() {
        if (document.getElementById(DOM_IDS.STYLE)) return;

        const style = document.createElement("style");
        style.id = DOM_IDS.STYLE;
        style.textContent = FONT_FACES + `
        #${DOM_IDS.MOUNT} {
            --cot-ft-fs:      13.5px;
            --cot-ft-fs-link: 16.8px;
            --cot-ft-row-gap: 14px;
            --cot-ft-column-gap: 24px;

            position: absolute; z-index: 60;
            top: 0; bottom: 0;
            left: ${LAYOUT.TEXT_LEFT}; right: ${LAYOUT.TEXT_RIGHT};
            display: flex; flex-wrap: wrap; align-items: center; align-content: center;
            justify-content: space-between;
            gap: var(--cot-ft-row-gap) var(--cot-ft-column-gap);
            pointer-events: none;   /* only the links take the pointer */
            color: ${COLORS.ink};
            font-family: ${ENGLISH};
        }
        #${DOM_IDS.MOUNT} * { box-sizing: border-box; }
        #${DOM_IDS.MOUNT}.${PENDING_CLASS} { visibility: hidden; }

        /* ── the link ───────────────────────────────────────────────────── */
        .cot-ft-rights {
            /* Box bottom on the address block's centre line, as drawn. */
            transform: translateY(-50%);
            font-family: ${DISPLAY};
            font-size: var(--cot-ft-fs-link);
            font-weight: 700;
            line-height: 1.2;
            letter-spacing: 0;
            text-transform: uppercase;
            white-space: nowrap;
        }
        .cot-ft-rights,
        .cot-ft-rights:link, .cot-ft-rights:visited,
        .cot-ft-rights:hover, .cot-ft-rights:focus, .cot-ft-rights:active {
            color: ${COLORS.muted} !important;
            text-decoration: underline !important;
            text-decoration-color: currentColor !important;
            text-decoration-thickness: 0.087em !important;   /* 1.46px at 16.83px */
            text-underline-offset: 0.135em !important;       /* 2.27px at 16.83px */
        }
        a.cot-ft-rights[href] { pointer-events: auto; cursor: pointer; transition: color 0.2s; }
        a.cot-ft-rights[href]:hover { color: ${COLORS.ink} !important; }

        /* ── address and contact ────────────────────────────────────────── */
        .cot-ft-info {
            display: grid;
            /* 29.688em from the first column's start to the second's: the
               address runs 27.36em, the rest is gutter. */
            grid-template-columns: auto auto; column-gap: 2.33em;
            font-size: var(--cot-ft-fs);
            font-weight: 600;
            line-height: 1.2;
        }
        .cot-ft-col  { display: flex; flex-direction: column; }
        .cot-ft-line { display: block; white-space: nowrap; }
        .cot-ft-gap  { margin-top: 1.2em; }   /* one empty line, as in the file */

        .cot-ft-info a,
        .cot-ft-info a:link, .cot-ft-info a:visited,
        .cot-ft-info a:hover, .cot-ft-info a:focus, .cot-ft-info a:active {
            color: inherit !important;
            text-decoration: none !important;
        }
        .cot-ft-info a[href] { pointer-events: auto; }
        .cot-ft-info a[href]:hover { text-decoration: underline !important; text-underline-offset: 2px; }
        #${DOM_IDS.MOUNT} a:focus-visible { outline: 1px solid ${COLORS.brand}; outline-offset: 2px; }

        /* ── Arabic ─────────────────────────────────────────────────────── */
        /* Bold throughout. The Arabic face has only a regular file, so the
           browser synthesises the bold, as for the Landing stat label. */
        #${DOM_IDS.MOUNT}[dir="rtl"],
        #${DOM_IDS.MOUNT}[dir="rtl"] * {
            font-family: ${ARABIC} !important;
            font-weight: 700 !important;
            letter-spacing: 0 !important;
        }
        #${DOM_IDS.MOUNT}[dir="rtl"] .cot-ft-rights { text-transform: none; }
        #${DOM_IDS.MOUNT}[dir="rtl"] .cot-ft-info   { line-height: 1.45; }
        /* The text keeps the English positions: the layout stays left to
           right, so the link and each line's left edge don't move (the two
           columns trade places, below). Only the words inside a line run
           right to left, so Arabic punctuation still lands where it should. */
        #${DOM_IDS.MOUNT}[dir="rtl"] { direction: ltr; }
        #${DOM_IDS.MOUNT}[dir="rtl"] .cot-ft-rights,
        #${DOM_IDS.MOUNT}[dir="rtl"] .cot-ft-line:not(.cot-ft-ltr) {
            direction: rtl; text-align: left;
        }
        /* Numbers, the address and the URL read left to right in both. */
        .cot-ft-ltr { direction: ltr; unicode-bidi: isolate; text-align: left; }
        /* The one exception: in Arabic the address and contact columns trade
           places, contact on the left and address on the right. Only while
           they sit side by side; stacked below 768px, they keep their order. */
        @media (min-width: 768px) {
            #${DOM_IDS.MOUNT}[dir="rtl"] .cot-ft-info > .cot-ft-col:first-child { order: 1; }
        }

        /* ── below 768px: one column ─────────────────────────────────────── */
        @media (max-width: 767px) {
            #${DOM_IDS.MOUNT} { flex-direction: column; flex-wrap: nowrap;
                align-items: flex-start; justify-content: center; }
            .cot-ft-rights { transform: none; }
            .cot-ft-info { grid-template-columns: auto; row-gap: 1.2em; }
            .cot-ft-line { white-space: normal; }
        }

        @media (prefers-reduced-motion: reduce) {
            a.cot-ft-rights[href] { transition: none; }
        }
        `;
        document.head.appendChild(style);
    }

    // ============================================================
    // FOOTER
    // ============================================================

    function i18nLine(key, className) {
        const node = document.createElement("span");
        node.className = "cot-ft-line" + (className ? " " + className : "");
        node.dataset.cotFtI18n = key;
        return node;
    }

    // Text from "<key>", link target from "<key>.href"; see setFooterHref().
    function linkLine(key) {
        const a = document.createElement("a");
        a.className = "cot-ft-line cot-ft-ltr";
        a.dataset.cotFtI18n = key;
        a.dataset.cotFtHref = key + ".href";
        return a;
    }

    // A link once "rights.href" is set in the item; plain text until then.
    function buildRights() {
        const node = document.createElement("a");
        node.className = "cot-ft-rights";
        node.dataset.cotFtI18n = "rights";
        node.dataset.cotFtHref = "rights.href";
        return node;
    }

    function buildInfo() {
        const info = document.createElement("div");
        info.className = "cot-ft-info";

        const address = document.createElement("div");
        address.className = "cot-ft-col";
        address.append(
            i18nLine("address"),
            i18nLine("copyright", "cot-ft-gap"),
        );

        const contact = document.createElement("div");
        contact.className = "cot-ft-col";
        contact.append(
            i18nLine("pobox"),
            i18nLine("city"),
            linkLine("phone"),
            linkLine("email"),
            linkLine("site"),
        );

        info.append(address, contact);
        return info;
    }

    function buildFooter(host) {
        if (getComputedStyle(host).position === "static") host.style.position = "relative";

        const footer = document.createElement("div");
        footer.id = DOM_IDS.MOUNT;
        footer.setAttribute("role", "contentinfo");
        footer.append(buildRights(), buildInfo());

        host.appendChild(footer);
        return footer;
    }

    // ============================================================
    // CLEANUP
    // ============================================================
    // Run when a copy of another VERSION takes over. The history wrappers
    // can't be unwound (other scripts may have wrapped them since), so they
    // stay in place and do nothing once disposed.

    function destroy() {
        if (disposed) return;
        disposed = true;
        cancelRetry();
        clearTimeout(resizeTimer);
        clearTimeout(domTimer);
        domTimer = null;
        hostObserver?.disconnect();
        domObserver?.disconnect();
        mountedHost = null;
        window.removeEventListener(LANG_EVENT, onLangChange);
        window.removeEventListener("popstate", onRouteChange);
        window.removeEventListener("resize", onResize);
        document.getElementById(DOM_IDS.MOUNT)?.remove();
        document.getElementById(DOM_IDS.STYLE)?.remove();
        if (window[CONTROLLER_KEY]?.destroy === destroy) delete window[CONTROLLER_KEY];
    }

    // ============================================================
    // INSTALL
    // ============================================================

    window[CONTROLLER_KEY] = { version: VERSION, refresh: restart, destroy };

    ["pushState", "replaceState"].forEach(method => {
        const original = history[method].bind(history);
        history[method] = function (...args) {
            const result = original(...args);
            if (!disposed) onRouteChange();
            return result;
        };
    });
    window.addEventListener("popstate", onRouteChange);
    window.addEventListener("resize", onResize);
    window.addEventListener(LANG_EVENT, onLangChange);

    if (typeof MutationObserver === "function") {
        domObserver = new MutationObserver(onDomChange);
        domObserver.observe(document.documentElement, { childList: true, subtree: true });
    }

    if (FOOTER_IDS.length) tryInit();
    else console.warn("[Footer] no footer layout configured — set FOOTER_LAYOUTS.");

})();
