/**
 * Student Portal — core initializer.
 *
 * Load last, after utils.js and nav.js:
 *
 *   <body data-page="dashboard">
 *     ...
 *     <script src="scripts/utils.js"></script>
 *     <script src="scripts/nav.js"></script>
 *     <script src="scripts/app.js"></script>
 *
 * On DOMContentLoaded it renders the shared nav, sets the document title from
 * the body's `data-page` slug, and logs a one-line startup message. Exposed as
 * `PortalApp` so a page can re-run or inspect the boot steps.
 */
(function (global) {
  'use strict';

  var SITE_NAME = 'Student Portal';
  var TITLE_SEPARATOR = ' · ';

  /**
   * Titles for slugs that need more than the nav label, or that have no nav
   * entry at all. Anything not listed here falls back to PortalNav.pages.
   */
  var TITLE_OVERRIDES = {
    index: SITE_NAME,
    home: SITE_NAME,
    login: 'Log in',
    profile: 'My profile',
    dashboard: 'Dashboard',
    settings: 'Account settings'
  };

  function ready(fn) {
    if (global.Portal && global.Portal.ready) return global.Portal.ready(fn);
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn, { once: true });
    } else {
      fn();
    }
  }

  /**
   * The page slug declared by <body data-page="...">.
   * @returns {string} lowercased slug, or '' when the attribute is absent
   */
  function pageSlug() {
    var body = document.body;
    var slug = body ? body.getAttribute('data-page') : null;
    return slug ? slug.trim().toLowerCase() : '';
  }

  /**
   * Look up a human-readable name for a slug, preferring the explicit
   * overrides and falling back to the matching nav link's label.
   * @param {string} slug
   * @returns {string} '' when the slug is unknown
   */
  function labelFor(slug) {
    if (!slug) return '';
    if (Object.prototype.hasOwnProperty.call(TITLE_OVERRIDES, slug)) {
      return TITLE_OVERRIDES[slug];
    }

    var pages = (global.PortalNav && global.PortalNav.pages) || [];
    for (var i = 0; i < pages.length; i++) {
      if (pages[i].href.replace(/\.html$/i, '').toLowerCase() === slug) {
        return pages[i].label;
      }
    }

    // Unknown slug: "course-registration" -> "Course registration".
    var words = slug.replace(/[-_]+/g, ' ').trim();
    return words ? words.charAt(0).toUpperCase() + words.slice(1) : '';
  }

  /**
   * Set document.title from the body's data-page slug.
   * The landing page keeps the bare site name; every other page becomes
   * "<Page> · Student Portal". A page with no data-page is left alone.
   * @returns {string|null} the title that was set, or null if nothing changed
   */
  function applyTitle() {
    var slug = pageSlug();
    var label = labelFor(slug);
    if (!label) return null;

    var title = label === SITE_NAME ? SITE_NAME : label + TITLE_SEPARATOR + SITE_NAME;
    document.title = title;
    return title;
  }

  /**
   * Render the shared navigation bar.
   * nav.js already auto-renders when #app-nav is present; render() clears the
   * mount before rebuilding, so calling it again here is safe and also covers
   * pages whose mount point is added after nav.js runs.
   * @returns {boolean} true when the nav was rendered
   */
  function initNav() {
    var nav = global.PortalNav;
    if (!nav || typeof nav.render !== 'function') {
      console.warn('[Portal] nav.js is not loaded — skipping navigation.');
      return false;
    }
    return nav.render() !== null;
  }

  /**
   * Run every boot step. Safe to call more than once.
   * @returns {{page: string, title: (string|null), nav: boolean}}
   */
  function init() {
    var slug = pageSlug();
    var navRendered = initNav();
    var title = applyTitle();

    console.log(
      '[Portal] ' + SITE_NAME + ' ready — page: ' + (slug || 'unknown') +
      ', nav: ' + (navRendered ? 'rendered' : 'skipped')
    );

    return { page: slug, title: title, nav: navRendered };
  }

  ready(init);

  global.PortalApp = {
    siteName: SITE_NAME,
    titles: TITLE_OVERRIDES,
    pageSlug: pageSlug,
    labelFor: labelFor,
    applyTitle: applyTitle,
    initNav: initNav,
    init: init
  };
})(window);
