/**
 * Student Portal — theme toggle.
 *
 * Load after utils.js, ideally near the end of <body> so document.body
 * already exists when this file first runs:
 *
 *   <script src="scripts/utils.js"></script>
 *   <script src="scripts/settings.js"></script>
 *
 * Applies the saved theme (light / dark / system) to `document.body` as
 * soon as this file executes — not waiting for DOMContentLoaded — so pages
 * don't flash the wrong theme while the rest of the DOM loads. If the page
 * has a `name="theme"` radio group (light/dark/system, as on
 * settings.html), it's synced to the saved value and wired so picking a
 * new option applies and persists it immediately. Exposed as
 * `PortalSettings`.
 */
(function (global) {
  'use strict';

  var STORAGE_KEY = 'theme';
  var THEME_CLASS = 'dark-theme';
  var VALID_THEMES = ['light', 'dark', 'system'];

  var utils = global.Portal || {};

  function ready(fn) {
    if (utils.ready) return utils.ready(fn);
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn, { once: true });
    } else {
      fn();
    }
  }

  /* --- Persistence -------------------------------------------------------
   * Same "sp:"-prefixed localStorage convention as auth.js/profile.js, via
   * the Portal.store wrapper when it's available. */

  /**
   * The saved theme choice, defaulting to "system" when nothing was ever
   * saved or the stored value isn't one of the three valid options.
   * @returns {'light'|'dark'|'system'}
   */
  function loadTheme() {
    var stored = null;

    if (utils.store) {
      stored = utils.store.get(STORAGE_KEY, null);
    } else {
      try {
        stored = JSON.parse(global.localStorage.getItem('sp:' + STORAGE_KEY));
      } catch (err) {
        stored = null;
      }
    }

    return VALID_THEMES.indexOf(stored) !== -1 ? stored : 'system';
  }

  /**
   * Persist a theme choice.
   * @param {'light'|'dark'|'system'} theme
   * @returns {boolean} false when storage was unavailable
   */
  function saveTheme(theme) {
    if (utils.store) return utils.store.set(STORAGE_KEY, theme) !== false;

    try {
      global.localStorage.setItem('sp:' + STORAGE_KEY, JSON.stringify(theme));
      return true;
    } catch (err) {
      console.warn('[Portal] settings.js: could not persist theme — storage is unavailable.');
      return false;
    }
  }

  /* --- Applying the theme ------------------------------------------------ */

  /**
   * Whether the OS/browser currently reports a dark color scheme
   * preference. False in environments without matchMedia support.
   * @returns {boolean}
   */
  function systemPrefersDark() {
    return Boolean(global.matchMedia && global.matchMedia('(prefers-color-scheme: dark)').matches);
  }

  /**
   * Resolve a theme choice ("light" / "dark" / "system") to whether dark
   * mode should actually be active right now.
   * @param {string} theme
   * @returns {boolean}
   */
  function resolvesToDark(theme) {
    if (theme === 'dark') return true;
    if (theme === 'light') return false;
    return systemPrefersDark();
  }

  /**
   * Add or remove the dark-theme class on document.body to match a theme
   * choice. No-ops quietly if body isn't in the document yet (e.g. this
   * script running from <head> before the body has parsed) — init() below
   * re-applies once DOMContentLoaded fires.
   * @param {string} theme
   * @returns {boolean|null} the resulting dark/light state, or null if body
   *   wasn't available to update
   */
  function applyTheme(theme) {
    if (!document.body) return null;

    var isDark = resolvesToDark(theme);
    document.body.classList.toggle(THEME_CLASS, isDark);
    return isDark;
  }

  // Apply as early as possible so there's no flash of the wrong theme.
  applyTheme(loadTheme());

  /* --- Toggle UI -----------------------------------------------------------
   * Syncs and wires a `name="theme"` radio group if the page has one (see
   * settings.html's Appearance section: #theme-light / #theme-dark /
   * #theme-system). Safe to skip on pages that don't have it. */

  /**
   * @returns {boolean} true when a theme radio group was found and wired
   */
  function initToggle() {
    var radios = document.querySelectorAll('input[name="theme"]');
    if (!radios.length) return false;

    var current = loadTheme();

    radios.forEach(function (radio) {
      radio.checked = radio.value === current;

      radio.addEventListener('change', function () {
        if (!radio.checked) return;
        saveTheme(radio.value);
        applyTheme(radio.value);
      });
    });

    return true;
  }

  /**
   * Keep the applied theme in sync with OS-level changes while the saved
   * choice is "system" (e.g. the person's device switches to dark mode at
   * sunset). Does nothing if the saved choice is "light" or "dark".
   */
  function watchSystemPreference() {
    if (!global.matchMedia) return;

    var mql = global.matchMedia('(prefers-color-scheme: dark)');
    var handleChange = function () {
      if (loadTheme() === 'system') applyTheme('system');
    };

    if (mql.addEventListener) {
      mql.addEventListener('change', handleChange);
    } else if (mql.addListener) {
      // Safari < 14 / older WebViews.
      mql.addListener(handleChange);
    }
  }

  function init() {
    var theme = loadTheme();
    var isDark = applyTheme(theme);
    var toggleWired = initToggle();
    watchSystemPreference();

    console.log(
      '[Portal] theme ready — choice: ' + theme +
      ', active: ' + (isDark ? 'dark' : 'light') +
      ', toggle: ' + (toggleWired ? 'wired' : 'skipped')
    );

    return { theme: theme, isDark: isDark, toggleWired: toggleWired };
  }

  ready(init);

  global.PortalSettings = {
    storageKey: STORAGE_KEY,
    themeClass: THEME_CLASS,
    validThemes: VALID_THEMES,
    loadTheme: loadTheme,
    saveTheme: saveTheme,
    applyTheme: applyTheme,
    initToggle: initToggle,
    init: init
  };
})(window);