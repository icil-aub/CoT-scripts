/* ===========================================================================
 * common.js — City of Tenants shared code.
 * ---------------------------------------------------------------------------
 * Hosted beside header.js and footer.js and loaded once per session by the
 * page scripts (see their MOBILE MENU stub), which reach it through
 * window.COT:
 *
 *   COT.COLORS            the canonical palette
 *   COT.getLang()         "en" or "ar", as the header's switch set it
 *   COT.PAGES             EB page names, in menu order
 *   COT.pageUrl(name)     URL of an EB page, keeping the query string
 *   COT.navigate(name)    go to an EB page through EB's router
 *   COT.currentPageName() the EB page in the URL
 *   COT.ensureMobileMenu() the phone header's menu and page title
 *
 * A page that calls before this file has arrived is queued in
 * window.__cotCommonQueue; the queue is run once COT exists.
 * ======================================================================== */
(function () {
    "use strict";

    const VERSION = "2026-11-26-common-v1";
    // Loaded once per session; a second evaluation has nothing to add.
    if (window.COT) return;

    // ============================================================
    // PALETTE
    // ============================================================
    // Canonical City of Tenants palette. The page scripts still carry their
    // own byte-identical copy; this one is the reference.
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

    // ============================================================
    // MOBILE MENU
    // ============================================================
    // A hamburger in the phone header that drops the page list down under it.
    // It used to be copied into Survey, Map, Stat and About; those pages now
    // call COT.ensureMobileMenu(). Its element ids are the old copies' own,
    // so an outdated page script still running in an open tab coexists.
    // The panel lives on <body>, not in the header, so the header widget's box
    // cannot clip it; it is pinned to the header's bottom edge on open.
    // The header's page title is also centred here, as every page has one,
    // and shown in the current language (see labelTitle).
    const ensureMobileMenu = (function () {
        // Each page has its own phone header widget; only the current page's
        // is rendered, so the first match is the one on screen.
        const HEADERS = {
            SURVEY: "widget_424",
            MAP:    "widget_430",
            STAT:   "widget_444",
            ABOUT:  "widget_421",
        };
        const HEADER = Object.values(HEADERS).map(id => `[data-widgetid="${id}"]`).join(", ");
        // Each page's phone Main Body widget; the menu spans the one on screen.
        const BODIES = {
            SURVEY: "widget_302",
            MAP:    "widget_433",
            STAT:   "widget_447",
            ABOUT:  "widget_415",
        };
        const BODY = Object.values(BODIES).map(id => `[data-widgetid="${id}"]`).join(", ");
        const IDS = {
            BUTTON: "cot-menu-button",
            PANEL:  "cot-menu-panel",
            STYLE:  "cot-menu-style",
        };
        const PHONE_QUERY = "(max-width:599px)";
        const RETRY_INTERVAL_MS = 100;
        const MAX_RETRIES = 100;   // ×100ms ≈ 10s for EB to mount the header
        const PANEL_GAP_PX   = 5;     // between the header's bottom edge and the menu
        const HEAL_INTERVAL_MS = 150;
        const SANS   = "'Inter', 'Helvetica Neue', Arial, sans-serif";
        const ARABIC = "'DINNextLTW23 Regular', sans-serif";

        const MENU_PAGES = ["Landing", "Survey", "Map", "Statistics", "About"];
        const STRINGS = {
            en: {
                open: "Open menu", close: "Close menu", nav: "Site pages",
                Landing: "Home", Survey: "Survey", Map: "Map",
                Statistics: "Statistics", About: "About",
            },
            ar: {
                open: "فتح القائمة", close: "إغلاق القائمة", nav: "صفحات الموقع",
                Landing: "الرئيسية", Survey: "الاستمارة", Map: "الخريطة",
                Statistics: "الإحصاءات", About: "عن المشروع",
            },
        };

        let retryTimer = null;

        function lang() {
            if (window.cotLang === "ar" || window.cotLang === "en") return window.cotLang;
            try { return localStorage.getItem("cot.lang") === "ar" ? "ar" : "en"; }
            catch (e) { return "en"; }   // private mode
        }

        function pathParts() {
            return window.location.pathname.split("/").filter(Boolean);
        }

        // Same construction as the pages' own navigation: the query string is
        // carried over so draft/preview parameters survive.
        function pageUrl(pageName) {
            const parts = pathParts();
            const i = parts.findIndex(p => /^page$/i.test(p));
            if (i !== -1) parts[i + 1] = pageName;
            else parts.push("page", pageName);
            return "/" + parts.join("/") + window.location.search;
        }

        function navigate(pageName) {
            history.pushState({}, "", pageUrl(pageName));
            const routeEvent = typeof PopStateEvent === "function"
                ? new PopStateEvent("popstate", { state: {} })
                : new Event("popstate");
            window.dispatchEvent(routeEvent);
        }

        // The header is shared across pages, so the current page comes from the
        // URL when the menu opens. No /page/ segment means EB's default page.
        function currentPageName() {
            const parts = pathParts();
            const i = parts.findIndex(p => /^page$/i.test(p));
            const name = i !== -1 ? decodeURIComponent(parts[i + 1] || "") : "Landing";
            return MENU_PAGES.find(page => page.toLowerCase() === name.toLowerCase()) || null;
        }

        function injectStyles() {
            if (document.getElementById(IDS.STYLE)) return;
            const B = `#${IDS.BUTTON}`;
            const P = `#${IDS.PANEL}`;
            const style = document.createElement("style");
            style.id = IDS.STYLE;
            style.textContent = `
                ${B}, ${P} { display:none; }
                @media ${PHONE_QUERY} {
                    ${B} {
                        position:absolute; z-index:101; top:50%; right:16px;
                        transform:translateY(-50%);
                        display:flex; flex-direction:column; align-items:center; justify-content:center;
                        gap:5px; width:44px; height:44px; padding:0; margin:0;
                        border:0; border-radius:4px; background:none; cursor:pointer;
                        touch-action:manipulation; -webkit-tap-highlight-color:transparent;
                    }
                    ${B} span {
                        display:block; width:24px; height:2px; border-radius:1px;
                        background:${COLORS.ink}; transition:transform .2s, opacity .2s;
                    }
                    /* The three bars fold into an X while the menu is open. */
                    ${B}[aria-expanded="true"] span:nth-child(1) { transform:translateY(7px) rotate(45deg); }
                    ${B}[aria-expanded="true"] span:nth-child(2) { opacity:0; }
                    ${B}[aria-expanded="true"] span:nth-child(3) { transform:translateY(-7px) rotate(-45deg); }
                    ${B}:focus-visible { outline:2px solid ${COLORS.brand}; outline-offset:2px; }

                    /* A sheet as wide as the page's Main Body, just below the
                       header (see position); the whole page until measured. */
                    ${P}:not([hidden]) {
                        display:block; position:fixed; z-index:10000;
                        top:var(--cot-menu-top, 61px); left:var(--cot-menu-left, 0px);
                        width:var(--cot-menu-width, 100%); box-sizing:border-box;
                        max-height:calc(100vh - var(--cot-menu-top, 61px)); overflow-y:auto;
                        background:${COLORS.panel};
                        border:1px solid ${COLORS.line}; border-radius:12px;
                        box-shadow:0 10px 28px rgba(25,24,24,.16);
                        font-family:${SANS};
                    }
                    ${P} ul { list-style:none; margin:0; padding:4px 0; }
                    ${P} li + li { border-top:1px solid ${COLORS.lineSoft}; }
                    ${P} a {
                        display:flex; align-items:center; min-height:48px; padding:0 16px;
                        color:${COLORS.ink}; text-decoration:none;
                        font-size:16px; font-weight:500; line-height:1.3;
                        -webkit-tap-highlight-color:transparent;
                    }
                    ${P} a:active { background:${COLORS.chipBg}; }
                    ${P} a[aria-current="page"] { color:${COLORS.brand}; }
                    ${P} a:focus-visible { outline:2px solid ${COLORS.brand}; outline-offset:-2px; }
                    ${P}[dir="rtl"] a { font-family:${ARABIC}; font-weight:400; }
                    /* The header's page title while it shows Arabic (labelTitle). */
                    [data-cot-menu-title-lang="ar"], [data-cot-menu-title-lang="ar"] * {
                        font-family:${ARABIC} !important; font-weight:400 !important;
                    }
                }
                @media (prefers-reduced-motion:reduce) {
                    ${B} span { transition:none; }
                }
            `;
            document.head.appendChild(style);
        }

        function isOpen() {
            const panel = document.getElementById(IDS.PANEL);
            return !!panel && !panel.hidden;
        }

        // The header's page title in the current language. EB's text widget
        // holds the English; it is kept on the widget itself, not in this
        // copy's memory, since any of the copies may be the one relabelling
        // it. A title EB has re-rendered since is read afresh as English.
        function labelTitle() {
            const header = currentHeader();
            const widget = header && titleWidget(header);
            if (!widget) return;
            const nodes = [];
            const walker = document.createTreeWalker(widget, NodeFilter.SHOW_TEXT);
            for (let node = walker.nextNode(); node; node = walker.nextNode()) {
                if (node.nodeValue.trim()) nodes.push(node);
            }
            if (!nodes.length) return;
            const shown = nodes.map(node => node.nodeValue).join("");
            if (widget.dataset.cotMenuTitleShown !== shown) widget.dataset.cotMenuTitleEn = shown;
            const arabic = lang() === "ar" ? STRINGS.ar[currentPageName()] : null;
            const text = arabic || widget.dataset.cotMenuTitleEn;
            if (shown !== text) {
                // One run of text: the label goes in the first, the rest empty.
                nodes[0].nodeValue = text;
                nodes.slice(1).forEach(node => { node.nodeValue = ""; });
            }
            widget.dataset.cotMenuTitleShown = text;
            if (arabic) widget.dataset.cotMenuTitleLang = "ar";
            else delete widget.dataset.cotMenuTitleLang;
        }

        function applyLang() {
            labelTitle();
            const current = lang();
            const strings = STRINGS[current];
            const button = document.getElementById(IDS.BUTTON);
            if (button) button.setAttribute("aria-label", isOpen() ? strings.close : strings.open);
            const panel = document.getElementById(IDS.PANEL);
            if (!panel) return;
            panel.lang = current;
            panel.dir = current === "ar" ? "rtl" : "ltr";
            panel.setAttribute("aria-label", strings.nav);
            panel.querySelectorAll("a[data-cot-page]").forEach(link => {
                link.textContent = strings[link.dataset.cotPage];
            });
        }

        function position() {
            const panel = document.getElementById(IDS.PANEL);
            // EB keeps visited pages mounted but hidden, so the first header in
            // the DOM may be another page's, zero-sized: the one holding the
            // button (or else the one on screen) is measured.
            const header = document.getElementById(IDS.BUTTON)?.closest(HEADER) || currentHeader();
            if (!panel || !header) return;
            const top = Math.max(0, Math.round(header.getBoundingClientRect().bottom)) + PANEL_GAP_PX;
            panel.style.setProperty("--cot-menu-top", `${top}px`);
            // Left edge and width of the Main Body EB is showing; visited
            // pages' bodies stay in the DOM, hidden.
            const body = [...document.querySelectorAll(BODY)].find(b => b.getClientRects().length);
            if (body) {
                const rect = body.getBoundingClientRect();
                panel.style.setProperty("--cot-menu-left", `${Math.round(rect.left)}px`);
                panel.style.setProperty("--cot-menu-width", `${Math.round(rect.width)}px`);
            } else {
                panel.style.removeProperty("--cot-menu-left");
                panel.style.removeProperty("--cot-menu-width");
            }
        }

        // The page title: the first EB widget in the header showing text.
        function titleWidget(header) {
            return [...header.querySelectorAll("[data-widgetid]")].find(w =>
                !w.querySelector("[data-widgetid]") && w.textContent.trim());
        }

        // Where the title's text is drawn. Its box can be wider than the
        // words, so the text runs are measured rather than the box.
        function textBounds(el) {
            const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
            const range = document.createRange();
            let left = Infinity, right = -Infinity;
            for (let node = walker.nextNode(); node; node = walker.nextNode()) {
                if (!node.textContent.trim()) continue;
                range.selectNodeContents(node);
                for (const rect of range.getClientRects()) {
                    if (!rect.width) continue;
                    left = Math.min(left, rect.left);
                    right = Math.max(right, rect.right);
                }
            }
            return left < right ? { left, right } : null;
        }

        // EB places the title wherever its layout says; it is slid sideways
        // so its text sits on the header's centre line. The outermost wrapper
        // holding only the title is moved, so none of EB's wrappers clips it.
        function centerTitle() {
            const header = currentHeader();
            if (!header?.getClientRects().length) return;
            const widget = titleWidget(header);
            if (!widget) return;
            let box = widget;
            while (box.parentElement && box.parentElement !== header &&
                   box.parentElement.children.length === 1) box = box.parentElement;

            // `translate`, not `transform`, so any transform of EB's is kept.
            box.style.removeProperty("translate");
            const text = textBounds(widget);
            if (!text) return;
            const headerRect = header.getBoundingClientRect();
            const shift = Math.round((headerRect.left + headerRect.width / 2) - (text.left + text.right) / 2);
            if (shift) box.style.translate = `${shift}px 0`;
        }

        function setOpen(open) {
            const button = document.getElementById(IDS.BUTTON);
            const panel = document.getElementById(IDS.PANEL);
            if (!button || !panel) return;
            if (open) {
                position();
                const current = currentPageName();
                panel.querySelectorAll("a[data-cot-page]").forEach(link => {
                    link.href = pageUrl(link.dataset.cotPage);
                    if (link.dataset.cotPage === current) link.setAttribute("aria-current", "page");
                    else link.removeAttribute("aria-current");
                });
            }
            panel.hidden = !open;
            button.setAttribute("aria-expanded", String(open));
            applyLang();
        }

        // The header on screen. Pages share the menu but not the header, and
        // while EB swaps pages the old one can briefly still be in the DOM.
        function currentHeader() {
            const headers = [...document.querySelectorAll(HEADER)];
            return headers.find(h => h.getClientRects().length) || headers[0] || null;
        }

        // Present means in the header on screen: a button left in the old
        // page's header goes with that header, so it doesn't count.
        function hasButton(header) {
            const button = document.getElementById(IDS.BUTTON);
            return !!button?.isConnected && !!header?.contains(button);
        }

        function ensure(attempt = 0) {
            const header = currentHeader();
            if (hasButton(header)) { labelTitle(); centerTitle(); return; }

            // The header can mount after the page body; wait for it.
            if (!header) {
                if (attempt < MAX_RETRIES && retryTimer === null) {
                    retryTimer = setTimeout(() => {
                        retryTimer = null;
                        ensure(attempt + 1);
                    }, RETRY_INTERVAL_MS);
                }
                return;
            }
            injectStyles();
            if (getComputedStyle(header).position === "static") header.style.position = "relative";

            // One left in a header that is on its way out.
            document.getElementById(IDS.BUTTON)?.remove();
            const button = document.createElement("button");
            button.id = IDS.BUTTON;
            button.type = "button";
            button.setAttribute("aria-controls", IDS.PANEL);
            button.setAttribute("aria-expanded", "false");
            button.innerHTML = `<span aria-hidden="true"></span><span aria-hidden="true"></span><span aria-hidden="true"></span>`;
            button.addEventListener("click", (e) => {
                e.preventDefault();
                e.stopPropagation();
                setOpen(!isOpen());
            });

            // A panel left behind by a header EB has since re-rendered.
            document.getElementById(IDS.PANEL)?.remove();
            const panel = document.createElement("nav");
            panel.id = IDS.PANEL;
            panel.hidden = true;
            const list = document.createElement("ul");
            MENU_PAGES.forEach(page => {
                const item = document.createElement("li");
                const link = document.createElement("a");
                link.dataset.cotPage = page;
                link.href = pageUrl(page);
                link.addEventListener("click", (e) => {
                    e.preventDefault();
                    setOpen(false);
                    if (page !== currentPageName()) navigate(page);
                });
                item.appendChild(link);
                list.appendChild(item);
            });
            panel.appendChild(list);

            document.body.appendChild(panel);
            header.appendChild(button);
            applyLang();
            centerTitle();
        }

        // Page-wide listeners, once for all four copies: close on a tap
        // outside the menu, on Escape and on any route change.
        if (!window.__cotMenuListeners) {
            window.__cotMenuListeners = true;
            document.addEventListener("click", (e) => {
                if (!isOpen()) return;
                if (e.target.closest?.(`#${IDS.PANEL}, #${IDS.BUTTON}`)) return;
                setOpen(false);
            });
            document.addEventListener("keydown", (e) => {
                if (e.key !== "Escape" || !isOpen()) return;
                setOpen(false);
                document.getElementById(IDS.BUTTON)?.focus();
            });
            window.addEventListener("popstate", () => setOpen(false));
            // Phones resize as the browser bar slides in and out; keep the panel on the header.
            window.addEventListener("resize", () => {
                centerTitle();
                if (isOpen()) position();
            });
            window.addEventListener("cot:langchange", () => { applyLang(); centerTitle(); });
            // The title's width changes once its web font is in.
            document.fonts?.ready.then(centerTitle);

            // Self-healing: EB replaces the header on every page change, and
            // the page scripts' own calls can land before the new one is in.
            // So whenever the DOM changes, the header on screen is checked for
            // its button and its title re-centred, at most once per HEAL_INTERVAL_MS.
            let healTimer = null;
            new MutationObserver(() => {
                if (healTimer !== null) return;
                healTimer = setTimeout(() => {
                    healTimer = null;
                    if (currentHeader()) ensure();
                }, HEAL_INTERVAL_MS);
            }).observe(document.body, { childList: true, subtree: true });
        }

        ensure.lang = lang;
        ensure.pages = MENU_PAGES;
        ensure.pageUrl = pageUrl;
        ensure.navigate = navigate;
        ensure.currentPageName = currentPageName;
        return ensure;
    })();

    // ============================================================
    // PUBLIC
    // ============================================================

    // The menu's own helpers, shared as they are.
    window.COT = Object.freeze({
        version: VERSION,
        COLORS: Object.freeze({ ...COLORS }),
        getLang: () => ensureMobileMenu.lang(),
        PAGES: Object.freeze([...ensureMobileMenu.pages]),
        pageUrl: name => ensureMobileMenu.pageUrl(name),
        navigate: name => ensureMobileMenu.navigate(name),
        currentPageName: () => ensureMobileMenu.currentPageName(),
        ensureMobileMenu: () => ensureMobileMenu(),
    });

    const pending = Array.isArray(window.__cotCommonQueue) ? window.__cotCommonQueue : [];
    window.__cotCommonQueue = [];
    pending.forEach(run => {
        try { run(window.COT); } catch (e) { console.error("[COT] queued call failed", e); }
    });
})();
