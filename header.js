/* ===========================================================================
 * customJS - header.js — City of Tenants shared header.
 * ---------------------------------------------------------------------------
 * Resizes the desktop logo and dividers, and mounts a shared language switch.
 *
 * Experience Builder settings:
 *   Header: 0–20%
 *   Body:   20–90%
 *   Footer: 90–100%
 *   Side margins: 60px
 *
 * Reference header dimensions at 1920 × 1080: 1800 × 216px.
 * All reference coordinates below are relative to the header's inner box.
 * ======================================================================== */

(function () {
    "use strict";

    // ============================================================
    // CONFIGURATION
    // ============================================================

    const VERSION = "2026-11-26-header-menu-v13";
    const CONTROLLER_KEY = "__cotDesktopHeaderController";
    const LANG_KEY = "cot.lang";
    const LANG_EVENT = "cot:langchange";

    const EB_IDS = {
        HEADER: "widget_90",
        LAYOUT: "layout_66",

        LOGO: {
            WIDGET: "widget_92",
            ITEM: "3",
        },

        LEFT_DIVIDER: {
            WIDGET: "widget_94",
            ITEM: "2",
        },

        RIGHT_DIVIDER: {
            WIDGET: "widget_93",
            ITEM: "1",
        },
    };

    const REFERENCE = {
        WIDTH: 1800,
        HEIGHT: 216,

        LOGO: {
            LEFT: 335,
            TOP: 20,
            WIDTH: 320,
            HEIGHT_RATIO: 52 / 100,
        },

        LEFT_DIVIDER: {
            LEFT: 0,
            TOP: 117,
            WIDTH: 320,
        },

        RIGHT_DIVIDER: {
            LEFT: 675,
            TOP: 117,
        },
    };

    const DOM_IDS = {
        STYLE: "cot-desktop-header-style",
        LANG_STYLE: "cot-header-lang-compact-style",
        LANG_SWITCH: "cot-header-lang-switch",
    };

    const ATTRIBUTES = {
        ACTIVE: "data-cot-desktop-header",
        BOX: "data-cot-desktop-header-slot",
    };

    const TIMING = {
        RETRY_INTERVAL_MS: 100,
        MAX_RETRIES: 100,
    };

    const LANG_MENU_GAP_PX = 64;

    const CSS_VARS = {
        LOGO_LEFT: "--cot-hd-logo-left",
        LOGO_TOP: "--cot-hd-logo-top",
        LOGO_WIDTH: "--cot-hd-logo-width",
        LOGO_HEIGHT: "--cot-hd-logo-height",

        LEFT_LEFT: "--cot-hd-left-left",
        LEFT_TOP: "--cot-hd-left-top",
        LEFT_WIDTH: "--cot-hd-left-width",

        RIGHT_LEFT: "--cot-hd-right-left",
        RIGHT_TOP: "--cot-hd-right-top",
    };

    const SELECTORS = {
        HEADER: `[data-widgetid="${EB_IDS.HEADER}"]`,
        SURVEY_CANVAS:
            '[data-widgetid="widget_305"] ' +
            '.layout.fixed-layout[data-layoutid="layout_143"]:not([data-layoutitemid])',
        MENU_LINK: '[role="menuitem"]',
        // Experience Builder gives each page and device layout its own header.
        PAGE_HEADER: '[aria-label="Header"]',
        PHONE_HEADERS: ["widget_424", "widget_430", "widget_444", "widget_421"]
            .map(id => `[data-widgetid="${id}"]`).join(", "),

        CANVAS:
            `.layout.fixed-layout` +
            `[data-layoutid="${EB_IDS.LAYOUT}"]` +
            `:not([data-layoutitemid])`,

        ITEM: ".layout-item[data-layoutitemid]",

        LINE: '[data-testid="divider-line"]',
    };

    // Reuse the existing installation when this script is evaluated again.
    const previous = window[CONTROLLER_KEY];

    if (previous?.version === VERSION) {
        previous.refresh();
        return;
    }

    previous?.destroy?.();

    // ============================================================
    // RUNTIME STATE
    // ============================================================

    let session = null;
    let frame = null;

    let retryTimer = null;
    let retryCount = 0;

    let domObserver = null;
    let styleNode = null;
    let langStyleNode = null;
    let ownsLangStyle = false;
    let langSwitch = null;
    let ownsLangSwitch = false;
    let langHost = null;
    let originalHostPosition = null;
    let disposed = false;

    // ============================================================
    // SHARED LANGUAGE SWITCH
    // ============================================================

    function getLang() {
        if (window.cotLang === "ar" || window.cotLang === "en") return window.cotLang;
        let stored = null;
        try { stored = localStorage.getItem(LANG_KEY); } catch (e) { /* storage unavailable */ }
        window.cotLang = stored === "ar" ? "ar" : "en";
        return window.cotLang;
    }

    function syncLanguageSwitch() {
        if (!langSwitch) return;
        const current = getLang();
        langSwitch.querySelectorAll("button[data-cot-lang]").forEach(button => {
            const active = button.dataset.cotLang === current;
            button.classList.toggle("is-active", active);
            button.setAttribute("aria-pressed", String(active));
        });
        langSwitch.dataset.cotLang = current;
    }

    function setLang(lang) {
        if (lang !== "ar" && lang !== "en" || getLang() === lang) return;
        window.cotLang = lang;
        try { localStorage.setItem(LANG_KEY, lang); } catch (e) { /* storage unavailable */ }
        syncLanguageSwitch();
        window.dispatchEvent(new CustomEvent(LANG_EVENT, { detail: { lang } }));
    }

    function onLangChange(event) {
        const lang = event.detail?.lang;
        if (lang !== "ar" && lang !== "en") return;
        window.cotLang = lang;
        syncLanguageSwitch();
        // Relabels the menu, then re-places the switch after its new widths.
        queueRefresh();
    }

    // ============================================================
    // MENU LABELS
    // ============================================================
    // EB's Menu widget (desktop and tablet headers) knows only the English
    // page names. Each link is matched to its page by its href, else by its
    // English label, and relabelled in place. The English EB rendered is
    // kept on the link to restore it; a link EB has re-rendered since is
    // read afresh as English. Keep the Arabic in sync with the phone
    // menu's STRINGS in common.js.
    const MENU_PAGES = ["Landing", "Survey", "Map", "Statistics", "About"];
    const MENU_LABELS = {
        en: { Landing: "Home", Survey: "Survey", Map: "Map", Statistics: "Statistics", About: "About" },
        ar: { Landing: "الرئيسية", Survey: "الاستمارة", Map: "الخريطة", Statistics: "الإحصاءات", About: "عن المشروع" },
    };
    const MENU_ATTRS = {
        ENGLISH: "data-cot-hd-menu-en",
        SHOWN:   "data-cot-hd-menu-shown",
        LANG:    "data-cot-hd-menu-lang",
    };

    function menuTextNodes(link) {
        const nodes = [];
        const walker = document.createTreeWalker(link, NodeFilter.SHOW_TEXT);
        for (let node = walker.nextNode(); node; node = walker.nextNode()) {
            if (node.nodeValue.trim()) nodes.push(node);
        }
        return nodes;
    }

    function menuPage(link, english) {
        const anchor = link.closest("a[href]") || link.querySelector("a[href]");
        const match = /\/page\/([^/?#]+)/i.exec(anchor?.getAttribute("href") || "");
        let name = "";
        if (match) {
            try { name = decodeURIComponent(match[1]); } catch (e) { name = match[1]; }
        }
        const label = english.trim().toLowerCase();
        return MENU_PAGES.find(page => page.toLowerCase() === name.toLowerCase()) ||
            MENU_PAGES.find(page => page.toLowerCase() === label ||
                MENU_LABELS.en[page].toLowerCase() === label) ||
            null;
    }

    function setMenuText(nodes, text) {
        // One run of text: the label goes in the first node, the rest empty.
        nodes[0].nodeValue = text;
        nodes.slice(1).forEach(node => { node.nodeValue = ""; });
    }

    function applyMenuLabels() {
        const lang = getLang();
        document.querySelectorAll(SELECTORS.MENU_LINK).forEach(link => {
            // The phone menu (MOBILE MENU block) labels its own links.
            if (link.closest("[data-cot-page], #cot-menu-panel")) return;
            const nodes = menuTextNodes(link);
            if (!nodes.length) return;
            const shown = nodes.map(node => node.nodeValue).join("");
            if (link.getAttribute(MENU_ATTRS.SHOWN) !== shown) {
                link.setAttribute(MENU_ATTRS.ENGLISH, shown);
            }
            const english = link.getAttribute(MENU_ATTRS.ENGLISH);
            const page = menuPage(link, english);
            if (!page) return;

            const arabic = lang === "ar" ? MENU_LABELS.ar[page] : null;
            const text = arabic || english;
            if (shown !== text) setMenuText(nodes, text);
            link.setAttribute(MENU_ATTRS.SHOWN, text);
            if (arabic) link.setAttribute(MENU_ATTRS.LANG, "ar");
            else link.removeAttribute(MENU_ATTRS.LANG);
        });
    }

    function restoreMenuLabels() {
        document.querySelectorAll(`[${MENU_ATTRS.SHOWN}]`).forEach(link => {
            const nodes = menuTextNodes(link);
            const english = link.getAttribute(MENU_ATTRS.ENGLISH);
            if (nodes.length && english !== null) setMenuText(nodes, english);
            Object.values(MENU_ATTRS).forEach(attr => link.removeAttribute(attr));
        });
    }

    function onStorage(event) {
        if (event.key !== LANG_KEY || !["ar", "en"].includes(event.newValue)) return;
        if (getLang() === event.newValue) return;
        window.cotLang = event.newValue;
        syncLanguageSwitch();
        window.dispatchEvent(new CustomEvent(LANG_EVENT, {
            detail: { lang: event.newValue },
        }));
    }

    function injectLanguageStyles() {
        if (langStyleNode?.isConnected) return;
        langStyleNode = document.getElementById(DOM_IDS.LANG_STYLE);
        if (langStyleNode) return;

        langStyleNode = document.createElement("style");
        langStyleNode.id = DOM_IDS.LANG_STYLE;
        ownsLangStyle = true;
        langStyleNode.textContent = `
            #${DOM_IDS.LANG_SWITCH}.cot-lang-compact {
                position: absolute; z-index: 110;
                top: 33%; right: 3.2%;
                display: inline-flex; align-items: center;
                height: auto; padding: 0;
                border: 0; border-radius: 0;
                box-sizing: border-box;
                background: none; color: #191818;
                direction: ltr; white-space: nowrap;
                font: 600 12px/1 'Inter', Arial, sans-serif;
                pointer-events: auto;
            }
            #${DOM_IDS.LANG_SWITCH}.cot-lang-compact .cot-lang-pill {
                display: inline-flex; align-items: center; gap: 4px;
                height: 32px; padding: 0 9px;
                border: 1px solid #191818; border-radius: 999px;
                box-sizing: border-box;
                background: rgba(255,255,255,.78);
            }
            #${DOM_IDS.LANG_SWITCH}.cot-lang-compact .cot-lang-pill:hover {
                background: #f6f1e4;
            }
            #${DOM_IDS.LANG_SWITCH}.cot-lang-compact .cot-lang-pill button {
                appearance: none; border: 0; background: none;
                margin: 0; padding: 5px 3px;
                color: #6c6b50; font: inherit; cursor: pointer;
            }
            /* Inter has no Arabic. The footer, on every page, declares
               the DIN Next Arabic face; Arial covers it until then. */
            #${DOM_IDS.LANG_SWITCH}.cot-lang-compact .cot-lang-pill button[data-cot-lang="ar"] {
                font-family: 'DINNextLTW23 Regular', Arial, sans-serif;
                font-weight: 400;
            }
            /* EB menu links while they show Arabic (applyMenuLabels). */
            [data-cot-hd-menu-lang="ar"],
            [data-cot-hd-menu-lang="ar"] * {
                font-family: 'DINNextLTW23 Regular', Arial, sans-serif !important;
            }
            #${DOM_IDS.LANG_SWITCH}.cot-lang-compact .cot-lang-pill button:hover,
            #${DOM_IDS.LANG_SWITCH}.cot-lang-compact .cot-lang-pill button.is-active {
                color: #3b7b4e;
            }
            #${DOM_IDS.LANG_SWITCH}.cot-lang-compact .cot-lang-pill button:focus-visible {
                outline: 2px solid #3b7b4e; outline-offset: 2px;
            }
            #${DOM_IDS.LANG_SWITCH}.cot-lang-compact .cot-lang-sep {
                color: #6c6b50; font-weight: 400;
            }
            @media (max-width: 599px) {
                #${DOM_IDS.LANG_SWITCH}.cot-lang-compact {
                    top: 50%; left: 12px; right: auto;
                    transform: translateY(-50%);
                }
                #${DOM_IDS.LANG_SWITCH}.cot-lang-compact .cot-lang-pill {
                    height: 30px; padding: 0 7px;
                }
            }
        `;
        document.head.appendChild(langStyleNode);
    }

    // The switch's visible labels. Arabic is the letter ʿayn, not "AR".
    const LANG_LABELS = { en: "EN", ar: "ع" };

    function buildLanguageCapsule() {
        langSwitch.classList.remove("cot-lang-capsule");
        langSwitch.classList.add("cot-lang-compact");
        // A switch left by an older copy is rebuilt if its labels differ.
        if (langSwitch.querySelectorAll(".cot-lang-pill button[data-cot-lang]").length === 2 &&
            !langSwitch.querySelector(".cot-lang-exterior") &&
            langSwitch.querySelector('button[data-cot-lang="ar"]')?.textContent === LANG_LABELS.ar) return;
        langSwitch.removeAttribute("role");
        langSwitch.removeAttribute("aria-label");
        langSwitch.innerHTML = `
            <span class="cot-lang-pill" role="group" aria-label="Choose language">
                <button type="button" data-cot-lang="en" lang="en" aria-label="Switch to English">${LANG_LABELS.en}</button>
                <span class="cot-lang-sep" aria-hidden="true">|</span>
                <button type="button" data-cot-lang="ar" lang="ar" aria-label="التبديل إلى العربية">${LANG_LABELS.ar}</button>
            </span>`;
        langSwitch.querySelectorAll("button[data-cot-lang]").forEach(button => {
            button.addEventListener("click", () => setLang(button.dataset.cotLang));
        });
    }

    function visible(node) {
        return node.getClientRects().length > 0 &&
            getComputedStyle(node).visibility !== "hidden";
    }

    function resolveLanguageHost() {
        // Use the same positioned canvas as the right divider on desktop.
        // Page wrappers are a fallback because their accessible label is not
        // guaranteed in every Experience Builder layout.
        const phone = [...document.querySelectorAll(SELECTORS.PHONE_HEADERS)].find(visible);
        if (window.innerWidth < 600 && phone) return phone;

        const desktop = [...document.querySelectorAll(SELECTORS.HEADER)].find(visible);
        if (desktop) {
            const canvas = desktop.querySelector(SELECTORS.CANVAS);
            return canvas && visible(canvas) ? canvas : desktop;
        }

        const surveyCanvas = [...document.querySelectorAll(SELECTORS.SURVEY_CANVAS)]
            .find(visible);
        if (surveyCanvas) return surveyCanvas;

        // Other pages can give the shared header a different widget id.
        const divider = [...document.querySelectorAll(SELECTORS.LINE)]
            .filter(visible)
            .find(line => line.getBoundingClientRect().top < window.innerHeight * .4);
        const dividerCanvas = divider?.closest(
            ".layout.fixed-layout[data-layoutid]:not([data-layoutitemid])"
        );
        if (dividerCanvas && visible(dividerCanvas)) return dividerCanvas;

        if (phone) return phone;

        return [...document.querySelectorAll(SELECTORS.PAGE_HEADER)].find(visible) || null;
    }

    function restoreLanguageHost() {
        if (langHost && originalHostPosition !== null &&
            langHost.style.position === "relative") {
            langHost.style.position = originalHostPosition;
        }
        langHost = null;
        originalHostPosition = null;
    }

    function refreshLanguageSwitch() {
        const host = resolveLanguageHost();
        if (!host) {
            if (ownsLangSwitch) langSwitch?.remove();
            restoreLanguageHost();
            return;
        }

        injectLanguageStyles();
        if (!langSwitch) {
            langSwitch = document.getElementById(DOM_IDS.LANG_SWITCH);
        }
        if (langSwitch) buildLanguageCapsule();
        if (langSwitch && !ownsLangSwitch && langSwitch.parentElement !== host &&
            visible(langSwitch)) {
            // Another header script owns the switch on the active layout.
            restoreLanguageHost();
            syncLanguageSwitch();
            return;
        }
        if (!langSwitch) {
            langSwitch = document.createElement("div");
            ownsLangSwitch = true;
            langSwitch.id = DOM_IDS.LANG_SWITCH;
        }
        buildLanguageCapsule();

        if (langHost !== host) {
            restoreLanguageHost();
            langHost = host;
            if (getComputedStyle(host).position === "static") {
                originalHostPosition = host.style.position;
                host.style.position = "relative";
            }
        }
        if (langSwitch.parentElement !== host) host.appendChild(langSwitch);
        syncLanguageSwitch();
    }

    function positionLanguageSwitch() {
        if (!langSwitch?.isConnected || !langHost) return;

        // Phone headers reserve their right edge for the page menu.
        if (window.innerWidth < 600) {
            langSwitch.style.removeProperty("left");
            langSwitch.style.removeProperty("right");
            langSwitch.style.removeProperty("top");
            return;
        }

        const canvas = langHost.matches(
            ".layout.fixed-layout[data-layoutid]:not([data-layoutitemid])"
        ) ? langHost : langHost.querySelector(
            ".layout.fixed-layout[data-layoutid]:not([data-layoutitemid])"
        );
        const menuItem = canvas && canvas.querySelector(
            `[data-layoutid="${canvas.dataset.layoutid}"][data-layoutitemid="4"]`
        );
        const links = [...(menuItem || langHost).querySelectorAll(SELECTORS.MENU_LINK)]
            .filter(link => visible(link));
        const lastLink = links[links.length - 1];
        if (!lastLink) {
            langSwitch.style.removeProperty("left");
            langSwitch.style.removeProperty("right");
            langSwitch.style.removeProperty("top");
            return;
        }

        const hostRect = langHost.getBoundingClientRect();
        if (!hostRect.width || !hostRect.height) return;

        // Keep the switch on the menu's text row after its last link.
        const linkRect = lastLink.getBoundingClientRect();
        const scaleX = (langHost.clientWidth || hostRect.width) / hostRect.width;
        const scaleY = (langHost.clientHeight || hostRect.height) / hostRect.height;
        const top = Math.max(4,
            (linkRect.top + linkRect.height / 2 - hostRect.top) * scaleY -
            langSwitch.offsetHeight / 2
        );
        const desiredLeft = (linkRect.right - hostRect.left) * scaleX + LANG_MENU_GAP_PX;
        const maxLeft = (langHost.clientWidth || hostRect.width * scaleX) -
            langSwitch.offsetWidth - 8;
        const left = Math.max(0, Math.min(desiredLeft, maxLeft));
        langSwitch.style.right = "auto";
        langSwitch.style.left = `${Number(left.toFixed(2))}px`;
        langSwitch.style.top = `${Number(top.toFixed(2))}px`;
    }

    // ============================================================
    // STYLES
    // ============================================================

    function itemSelector(id) {
        return (
            `[data-layoutid="${EB_IDS.LAYOUT}"]` +
            `[data-layoutitemid="${id}"]`
        );
    }

    function injectStyles() {
        if (styleNode?.isConnected) return;

        styleNode = document.getElementById(DOM_IDS.STYLE);

        if (styleNode) return;

        const root =
            `${SELECTORS.HEADER}[${ATTRIBUTES.ACTIVE}]`;

        const canvas =
            `${root} ${SELECTORS.CANVAS}`;

        const logo =
            `${canvas} ${itemSelector(EB_IDS.LOGO.ITEM)}`;

        const left =
            `${canvas} ${itemSelector(EB_IDS.LEFT_DIVIDER.ITEM)}`;

        const right =
            `${canvas} ${itemSelector(EB_IDS.RIGHT_DIVIDER.ITEM)}`;

        styleNode = document.createElement("style");
        styleNode.id = DOM_IDS.STYLE;

        styleNode.textContent = `
            /*
             * Give the fixed_custom canvas the height allocated to
             * the header by Experience Builder.
             */
            [${ATTRIBUTES.BOX}] > .animate-wrapper,
            ${root},
            ${root} > .widget-content,
            ${root} > .widget-content > .widget-fixed-layout,
            ${canvas},
            ${canvas} > [data-layoutid="${EB_IDS.LAYOUT}"]:not([data-layoutitemid]) {
                width: 100% !important;
                height: 100% !important;
                min-height: 0 !important;
                box-sizing: border-box;
            }

            ${canvas} {
                position: relative !important;
            }

            /*
             * Experience Builder positions layout-item wrappers.
             * Apply geometry to those wrappers.
             */
            ${logo},
            ${left},
            ${right} {
                position: absolute !important;

                bottom: auto !important;
                margin: 0 !important;

                min-width: 0 !important;
                min-height: 0 !important;

                max-width: none !important;
                max-height: none !important;

                box-sizing: border-box;
                transform: none !important;
            }

            /* Logo */
            ${logo} {
                left: var(${CSS_VARS.LOGO_LEFT}) !important;
                top: var(${CSS_VARS.LOGO_TOP}) !important;
                right: auto !important;

                width: var(${CSS_VARS.LOGO_WIDTH}) !important;
                height: var(${CSS_VARS.LOGO_HEIGHT}) !important;
            }

            ${logo} > .animate-wrapper,
            ${logo} [data-widgetid="${EB_IDS.LOGO.WIDGET}"],
            ${logo} [data-widgetid="${EB_IDS.LOGO.WIDGET}"] > .widget-content,
            ${logo} .widget-image,
            ${logo} .widget-image > div {
                width: 100% !important;
                height: 100% !important;
            }

            ${logo} img {
                display: block;

                width: 100% !important;
                height: 100% !important;

                object-fit: contain !important;
            }

            /* Left divider */
            ${left} {
                left: var(${CSS_VARS.LEFT_LEFT}) !important;
                top: var(${CSS_VARS.LEFT_TOP}) !important;
                right: auto !important;

                width: var(${CSS_VARS.LEFT_WIDTH}) !important;
                height: auto !important;
            }

            /* Right divider stretches to the header's right edge. */
            ${right} {
                left: var(${CSS_VARS.RIGHT_LEFT}) !important;
                top: var(${CSS_VARS.RIGHT_TOP}) !important;
                right: 0 !important;

                width: auto !important;
                height: auto !important;
            }
        `;

        document.head.appendChild(styleNode);
    }

    // ============================================================
    // HOST RESOLUTION
    // ============================================================

    function resolvePart(canvas, ids) {
        const item = canvas.querySelector(
            itemSelector(ids.ITEM)
        );

        const widget = item?.querySelector(
            `[data-widgetid="${ids.WIDGET}"]`
        );

        return widget ? { item, widget } : null;
    }

    function resolveHeader() {
        const headers = document.querySelectorAll(
            SELECTORS.HEADER
        );

        for (const header of headers) {
            if (!header.getClientRects().length) continue;

            const canvas = header.querySelector(
                SELECTORS.CANVAS
            );

            if (!canvas) continue;

            const logo = resolvePart(
                canvas,
                EB_IDS.LOGO
            );

            const left = resolvePart(
                canvas,
                EB_IDS.LEFT_DIVIDER
            );

            const right = resolvePart(
                canvas,
                EB_IDS.RIGHT_DIVIDER
            );

            if (!logo || !left || !right) continue;

            const box =
                header.closest(SELECTORS.ITEM) || header;

            /*
             * Logical CSS dimensions remain correct when the builder
             * displays its canvas at 50% zoom.
             */
            const width =
                box.clientWidth || header.clientWidth;

            const height =
                box.clientHeight || header.clientHeight;

            if (width <= 0 || height <= 0) continue;

            return {
                header,
                canvas,
                box,
                logo,
                left,
                right,
                width,
                height,
            };
        }

        return null;
    }

    function sameElements(a, b) {
        return (
            a &&
            b &&
            a.header === b.header &&
            a.canvas === b.canvas &&
            a.box === b.box &&
            a.logo.item === b.logo.item &&
            a.left.item === b.left.item &&
            a.right.item === b.right.item
        );
    }

    // ============================================================
    // SESSION MANAGEMENT
    // ============================================================

    function restoreSession() {
        if (!session) return;

        session.observer?.disconnect();

        for (const [name, original] of session.originalVars) {
            if (original.value) {
                session.header.style.setProperty(
                    name,
                    original.value,
                    original.priority
                );
            } else {
                session.header.style.removeProperty(name);
            }
        }

        if (session.originalAttribute === null) {
            session.header.removeAttribute(
                ATTRIBUTES.ACTIVE
            );
        } else {
            session.header.setAttribute(
                ATTRIBUTES.ACTIVE,
                session.originalAttribute
            );
        }

        if (session.originalBoxAttribute === null) {
            session.box.removeAttribute(
                ATTRIBUTES.BOX
            );
        } else {
            session.box.setAttribute(
                ATTRIBUTES.BOX,
                session.originalBoxAttribute
            );
        }

        session = null;
    }

    function attach(target) {
        restoreSession();
        injectStyles();

        session = {
            ...target,

            originalAttribute: target.header.getAttribute(
                ATTRIBUTES.ACTIVE
            ),

            originalBoxAttribute: target.box.getAttribute(
                ATTRIBUTES.BOX
            ),

            originalVars: Object.values(CSS_VARS).map(
                name => [
                    name,
                    {
                        value:
                            target.header.style.getPropertyValue(
                                name
                            ),

                        priority:
                            target.header.style.getPropertyPriority(
                                name
                            ),
                    },
                ]
            ),

            observer: null,
        };

        // Populate variables before activating the geometry stylesheet.
        updateGeometry();

        target.box.setAttribute(
            ATTRIBUTES.BOX,
            "ready"
        );

        target.header.setAttribute(
            ATTRIBUTES.ACTIVE,
            "ready"
        );

        if (typeof ResizeObserver === "function") {
            session.observer = new ResizeObserver(
                queueRefresh
            );

            new Set([
                target.header,
                target.box,
            ]).forEach(node => {
                session.observer.observe(node);
            });
        }
    }

    // ============================================================
    // GEOMETRY
    // ============================================================

    /*
     * Native Divider widgets contain padding around their painted line.
     * Account for that inset while preserving the authored stroke.
     */
    function lineCenterOffset(part, header) {
        const line = part.widget.querySelector(
            SELECTORS.LINE
        );

        if (!line) return 0;

        const headerRect =
            header.getBoundingClientRect();

        /*
         * offsetHeight rounds fractional heights.
         * Computed height retains them and avoids divider drift.
         */
        const logicalHeight =
            parseFloat(
                getComputedStyle(header).height
            ) || header.offsetHeight;

        const zoom = logicalHeight
            ? headerRect.height / logicalHeight
            : 1;

        if (!(zoom > 0)) return 0;

        const lineRect =
            line.getBoundingClientRect();

        const itemRect =
            part.item.getBoundingClientRect();

        return (
            lineRect.top +
            lineRect.height / 2 -
            itemRect.top
        ) / zoom;
    }

    function setPixels(name, value) {
        const css = `${Number(value.toFixed(4))}px`;

        if (
            session.header.style.getPropertyValue(name) !== css
        ) {
            session.header.style.setProperty(
                name,
                css
            );
        }
    }

    function updateGeometry() {
        if (!session) return;

        const { header, box } = session;

        const width =
            box.clientWidth || header.clientWidth;

        const height =
            box.clientHeight || header.clientHeight;

        if (width <= 0 || height <= 0) return;

        /*
         * Use one scale to preserve the composition.
         * Height limits scaling on short or ultrawide screens.
         */
        const scale = Math.min(
            width / REFERENCE.WIDTH,
            height / REFERENCE.HEIGHT
        );

        const leftOffset = lineCenterOffset(
            session.left,
            header
        );

        const rightOffset = lineCenterOffset(
            session.right,
            header
        );

        const leftLineCenter = (
            REFERENCE.LEFT_DIVIDER.TOP + leftOffset
        ) * scale;

        const rightLineCenter = (
            REFERENCE.RIGHT_DIVIDER.TOP + leftOffset
        ) * scale;

        setPixels(
            CSS_VARS.LOGO_LEFT,
            REFERENCE.LOGO.LEFT * scale
        );

        setPixels(
            CSS_VARS.LOGO_TOP,
            REFERENCE.LOGO.TOP * scale
        );

        setPixels(
            CSS_VARS.LOGO_WIDTH,
            REFERENCE.LOGO.WIDTH * scale
        );

        setPixels(
            CSS_VARS.LOGO_HEIGHT,
            REFERENCE.LOGO.WIDTH *
            REFERENCE.LOGO.HEIGHT_RATIO *
            scale
        );

        setPixels(
            CSS_VARS.LEFT_LEFT,
            REFERENCE.LEFT_DIVIDER.LEFT * scale
        );

        setPixels(
            CSS_VARS.LEFT_WIDTH,
            REFERENCE.LEFT_DIVIDER.WIDTH * scale
        );

        setPixels(
            CSS_VARS.LEFT_TOP,
            leftLineCenter - leftOffset
        );

        setPixels(
            CSS_VARS.RIGHT_LEFT,
            REFERENCE.RIGHT_DIVIDER.LEFT * scale
        );

        setPixels(
            CSS_VARS.RIGHT_TOP,
            rightLineCenter - rightOffset
        );
    }

    // ============================================================
    // REFRESH / RETRY
    // ============================================================

    function cancelRetry() {
        if (retryTimer !== null) {
            clearTimeout(retryTimer);
        }

        retryTimer = null;
        retryCount = 0;
    }

    function scheduleRetry() {
        if (
            retryTimer !== null ||
            retryCount >= TIMING.MAX_RETRIES
        ) {
            return;
        }

        retryCount += 1;

        retryTimer = setTimeout(() => {
            retryTimer = null;
            queueRefresh();
        }, TIMING.RETRY_INTERVAL_MS);
    }

    function refresh() {
        if (disposed) return;

        refreshLanguageSwitch();
        // Before the switch is positioned: it sits after the last link.
        applyMenuLabels();

        const target = resolveHeader();

        if (!target) {
            restoreSession();
            positionLanguageSwitch();
            scheduleRetry();
            return;
        }

        cancelRetry();

        if (!sameElements(session, target)) {
            attach(target);
        } else {
            injectStyles();
            updateGeometry();
        }
        positionLanguageSwitch();
    }

    function queueRefresh() {
        if (disposed || frame !== null) return;

        frame = requestAnimationFrame(() => {
            frame = null;
            refresh();
        });
    }

    // ============================================================
    // EXPERIENCE BUILDER DOM CHANGES
    // ============================================================

    function sessionConnected() {
        return (
            session &&
            session.header.isConnected &&
            session.canvas.isConnected &&
            session.header.contains(session.canvas) &&
            [
                session.logo,
                session.left,
                session.right,
            ].every(part => (
                part.item.isConnected &&
                session.canvas.contains(part.item) &&
                part.item.contains(part.widget)
            ))
        );
    }

    function containsHeader(node) {
        return (
            node.nodeType === 1 &&
            (
                node.matches(SELECTORS.HEADER) ||
                node.querySelector(SELECTORS.HEADER)
            )
        );
    }

    function onDomChange(records) {
        if (disposed) return;

        if (
            (langHost && (!langHost.isConnected || !visible(langHost))) ||
            (langSwitch && !langSwitch.isConnected) ||
            records.some(record =>
                [...record.addedNodes].some(node =>
                    node.nodeType === 1 &&
                    (node.matches(SELECTORS.HEADER) ||
                        node.matches(SELECTORS.PHONE_HEADERS) ||
                        node.matches(SELECTORS.PAGE_HEADER) ||
                        node.matches(SELECTORS.LINE) ||
                        node.matches(SELECTORS.MENU_LINK) ||
                        node.querySelector(SELECTORS.HEADER) ||
                        node.querySelector(SELECTORS.PHONE_HEADERS) ||
                        node.querySelector(SELECTORS.PAGE_HEADER) ||
                        node.querySelector(SELECTORS.LINE) ||
                        node.querySelector(SELECTORS.MENU_LINK))
                )
            )
        ) {
            queueRefresh();
        }

        if (
            session &&
            (
                !sessionConnected() ||
                !styleNode?.isConnected
            )
        ) {
            queueRefresh();
            return;
        }

        /*
         * Divider markup can arrive after its outer widget.
         * Re-measure when EB finishes rendering header children.
         */
        if (
            session &&
            records.some(record =>
                session.canvas.contains(record.target)
            )
        ) {
            queueRefresh();
            return;
        }

        /*
         * Recover when the header arrives after initialization,
         * including after the bounded retries have finished.
         */
        if (
            !session &&
            records.some(record =>
                [...record.addedNodes].some(
                    containsHeader
                )
            )
        ) {
            retryCount = 0;
            queueRefresh();
        }
    }

    // ============================================================
    // CLEANUP
    // ============================================================

    function destroy() {
        if (disposed) return;

        disposed = true;
        cancelRetry();

        if (frame !== null) {
            cancelAnimationFrame(frame);
        }

        frame = null;

        domObserver?.disconnect();

        window.removeEventListener(
            "resize",
            queueRefresh
        );

        window.removeEventListener(
            "popstate",
            queueRefresh
        );

        window.removeEventListener(
            "hashchange",
            queueRefresh
        );

        window.removeEventListener(
            "pageshow",
            queueRefresh
        );

        window.removeEventListener(LANG_EVENT, onLangChange);
        window.removeEventListener("storage", onStorage);

        if (ownsLangSwitch) langSwitch?.remove();
        restoreLanguageHost();
        restoreMenuLabels();

        restoreSession();

        styleNode?.remove();
        if (ownsLangStyle) langStyleNode?.remove();

        if (
            window[CONTROLLER_KEY]?.destroy === destroy
        ) {
            delete window[CONTROLLER_KEY];
        }
    }

    // ============================================================
    // INSTALL
    // ============================================================

    window[CONTROLLER_KEY] = {
        version: VERSION,
        refresh: queueRefresh,
        destroy,
    };

    window.addEventListener(
        "resize",
        queueRefresh,
        { passive: true }
    );

    window.addEventListener(
        "popstate",
        queueRefresh
    );

    window.addEventListener(
        "hashchange",
        queueRefresh
    );

    window.addEventListener(
        "pageshow",
        queueRefresh
    );

    window.addEventListener(LANG_EVENT, onLangChange);
    window.addEventListener("storage", onStorage);

    if (typeof MutationObserver === "function") {
        domObserver = new MutationObserver(
            onDomChange
        );

        domObserver.observe(
            document.documentElement,
            {
                childList: true,
                subtree: true,
            }
        );
    }

    queueRefresh();
})();
