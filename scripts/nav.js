/**
 * Student Portal — shared navigation bar.
 *
 * Drop a mount point on the page and load this after utils.js:
 *
 *   <div id="app-nav"></div>
 *   <script src="scripts/utils.js"></script>
 *   <script src="scripts/nav.js"></script>
 *
 * It renders the primary <nav> into #app-nav, marks the link for the page you
 * are on, and wires the mobile toggle. Exposed as `PortalNav` so a page can
 * re-render into a different container if it needs to.
 */
(function (global) {
  'use strict';

  var MOUNT_ID = 'app-nav';

  var PAGES = [
    { href: 'index.html', label: 'Home' },
    { href: 'login.html', label: 'Login' },
    { href: 'profile.html', label: 'Profile' },
    { href: 'dashboard.html', label: 'Dashboard' },
    { href: 'settings.html', label: 'Settings' }
  ];

  var utils = global.Portal || {};

  // Small local fallbacks so the nav still renders if utils.js is missing.
  function el(tag, attrs, children) {
    if (utils.el) return utils.el(tag, attrs, children);

    var node = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (key) {
      var value = attrs[key];
      if (value === null || value === undefined || value === false) return;
      if (key === 'class') node.className = value;
      else if (key === 'text') node.textContent = value;
      else node.setAttribute(key, value === true ? '' : value);
    });
    (children || []).forEach(function (child) {
      node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
    });
    return node;
  }

  function ready(fn) {
    if (utils.ready) return utils.ready(fn);
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn, { once: true });
    } else {
      fn();
    }
  }

  /**
   * The file name of the page currently being viewed.
   * A directory URL ("/", "/portal/") is treated as index.html, and a query
   * string or hash is ignored because location.pathname excludes both.
   * @returns {string} e.g. "dashboard.html"
   */
  function currentPage() {
    var last = global.location.pathname.split('/').pop();
    return last ? decodeURIComponent(last).toLowerCase() : 'index.html';
  }

  /**
   * Does this nav entry point at the page we are on?
   * @param {{href: string}} page
   * @param {string} here - result of currentPage()
   * @returns {boolean}
   */
  function isCurrent(page, here) {
    return page.href.toLowerCase() === here;
  }

  /**
   * Build the nav element (not attached to the document).
   * @param {string} [here=currentPage()] - page name to highlight
   * @returns {HTMLElement} <nav class="nav">
   */
  function build(here) {
    var page = here || currentPage();

    var items = PAGES.map(function (entry) {
      var active = isCurrent(entry, page);
      var link = el('a', {
        class: 'nav-link' + (active ? ' is-active' : ''),
        href: entry.href,
        text: entry.label,
        'aria-current': active ? 'page' : null
      });
      return el('li', null, [link]);
    });

    return el('nav', { id: 'primary-nav', class: 'nav', 'aria-label': 'Primary' }, [
      el('ul', { class: 'nav-list' }, items)
    ]);
  }

  /**
   * Build the hamburger button that shows/hides the nav on narrow screens.
   * @param {HTMLElement} nav
   * @returns {HTMLButtonElement}
   */
  function buildToggle(nav) {
    var bars = [
      el('span', { class: 'nav-toggle-bar', 'aria-hidden': 'true' }),
      el('span', { class: 'nav-toggle-bar', 'aria-hidden': 'true' }),
      el('span', { class: 'nav-toggle-bar', 'aria-hidden': 'true' })
    ];

    var button = el('button', {
      type: 'button',
      class: 'nav-toggle',
      'aria-expanded': 'false',
      'aria-controls': nav.id,
      'aria-label': 'Toggle navigation'
    }, bars);

    button.addEventListener('click', function () {
      var open = nav.classList.toggle('is-open');
      button.setAttribute('aria-expanded', String(open));
    });

    return button;
  }

  /**
   * Render the navigation into a container, replacing whatever is there.
   * @param {string|Element} [target='#app-nav'] - selector or element
   * @returns {HTMLElement|null} the mount element, or null when not found
   */
  function render(target) {
    var mount = typeof target === 'string'
      ? document.querySelector(target)
      : (target || document.getElementById(MOUNT_ID));

    if (!mount) return null;

    var nav = build();
    var toggle = buildToggle(nav);

    mount.textContent = '';
    mount.appendChild(toggle);
    mount.appendChild(nav);

    return mount;
  }

  // Auto-render once the DOM is parsed, but only if the page opted in.
  ready(function () {
    if (document.getElementById(MOUNT_ID)) render();
  });

  global.PortalNav = {
    pages: PAGES,
    mountId: MOUNT_ID,
    currentPage: currentPage,
    build: build,
    render: render
  };
})(window);
