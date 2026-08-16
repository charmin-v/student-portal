/**
 * Student Portal — theme toggle and notification preferences.
 *
 * Load after utils.js, ideally near the end of <body> so document.body
 * already exists when this file first runs:
 *
 *   <script src="scripts/utils.js"></script>
 *   <script src="scripts/settings.js"></script>
 *
 * Theme: applies the saved theme (light / dark / system) to
 * `document.body` as soon as this file executes — not waiting for
 * DOMContentLoaded — so pages don't flash the wrong theme while the rest
 * of the DOM loads. If the page has a `name="theme"` radio group
 * (light/dark/system, as on settings.html), it's synced to the saved
 * value and wired so picking a new option applies and persists it
 * immediately.
 *
 * Notifications: if the page has a `name="notifications"` checkbox group
 * (email/sms/push, as on settings.html), each checkbox is set from the
 * saved preferences on load, and any change re-saves the whole group.
 *
 * Password form: if the page has a `#password-form` (current/new/confirm
 * password fields, as on settings.html), submission is intercepted,
 * validates the new password's length and that it matches the confirm
 * field, shows inline per-field errors plus a whole-form message, and
 * never actually posts anywhere — there's no backend to change a password
 * against.
 *
 * Exposed as `PortalSettings`.
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

  /* --- Notification preferences ---------------------------------------
   * Syncs and wires a `name="notifications"` checkbox group if the page
   * has one (see settings.html's Notifications section: #notify-email /
   * #notify-sms / #notify-push). Safe to skip on pages that don't have
   * it. */

  var NOTIFICATIONS_STORAGE_KEY = 'notifications';

  // Matches the checked/unchecked state already baked into settings.html's
  // markup, so a page with no saved preferences yet still shows the same
  // checkboxes it would if this script weren't running at all.
  var DEFAULT_NOTIFICATION_PREFS = {
    email: true,
    sms: false,
    push: true
  };

  /**
   * Saved notification preferences, overlaid onto the defaults so a
   * partially-saved or older record still yields a value for every
   * channel.
   * @returns {Object<string, boolean>}
   */
  function loadNotificationPrefs() {
    var stored = null;

    if (utils.store) {
      stored = utils.store.get(NOTIFICATIONS_STORAGE_KEY, null);
    } else {
      try {
        stored = JSON.parse(global.localStorage.getItem('sp:' + NOTIFICATIONS_STORAGE_KEY));
      } catch (err) {
        stored = null;
      }
    }

    var prefs = {};
    Object.keys(DEFAULT_NOTIFICATION_PREFS).forEach(function (key) {
      prefs[key] = DEFAULT_NOTIFICATION_PREFS[key];
    });

    if (stored && typeof stored === 'object') {
      Object.keys(prefs).forEach(function (key) {
        if (Object.prototype.hasOwnProperty.call(stored, key)) {
          prefs[key] = Boolean(stored[key]);
        }
      });
    }

    return prefs;
  }

  /**
   * Persist notification preferences.
   * @param {Object<string, boolean>} prefs
   * @returns {boolean} false when storage was unavailable
   */
  function saveNotificationPrefs(prefs) {
    if (utils.store) return utils.store.set(NOTIFICATIONS_STORAGE_KEY, prefs) !== false;

    try {
      global.localStorage.setItem('sp:' + NOTIFICATIONS_STORAGE_KEY, JSON.stringify(prefs));
      return true;
    } catch (err) {
      console.warn('[Portal] settings.js: could not persist notification preferences — storage is unavailable.');
      return false;
    }
  }

  /**
   * Set each checkbox's checked state from saved prefs, and wire every
   * checkbox so any change re-reads the whole group and saves it as one
   * record (rather than one storage write per checkbox).
   * @returns {boolean} true when a notifications checkbox group was found
   */
  function initNotificationToggles() {
    var checkboxes = document.querySelectorAll('input[name="notifications"]');
    if (!checkboxes.length) return false;

    var prefs = loadNotificationPrefs();

    checkboxes.forEach(function (checkbox) {
      if (Object.prototype.hasOwnProperty.call(prefs, checkbox.value)) {
        checkbox.checked = prefs[checkbox.value];
      }
    });

    function persistCurrentState() {
      var current = {};
      checkboxes.forEach(function (checkbox) {
        current[checkbox.value] = checkbox.checked;
      });
      saveNotificationPrefs(current);
    }

    checkboxes.forEach(function (checkbox) {
      checkbox.addEventListener('change', persistCurrentState);
    });

    return true;
  }

  /* --- Change password form ---------------------------------------------
   * Validates and "submits" the #password-form on settings.html (current /
   * new / confirm password fields, with [data-error-for] slots matching
   * the same convention auth.js uses for login). There's no backend to
   * post to, so a valid submission just shows a success message and
   * resets the form — consistent with the rest of this mock portal. */

  var MIN_NEW_PASSWORD_LENGTH = 8;

  var PASSWORD_MESSAGES = {
    currentRequired: 'Enter your current password.',
    newRequired: 'Enter a new password.',
    newLength: 'New password must be at least ' + MIN_NEW_PASSWORD_LENGTH + ' characters.',
    confirmRequired: 'Confirm your new password.',
    confirmMismatch: 'Passwords do not match.'
  };

  /**
   * @param {string} value
   * @returns {string} error message, or '' when acceptable
   */
  function checkCurrentPassword(value) {
    return String(value == null ? '' : value).trim() ? '' : PASSWORD_MESSAGES.currentRequired;
  }

  /**
   * @param {string} value
   * @returns {string} error message, or '' when acceptable
   */
  function checkNewPassword(value) {
    var password = String(value == null ? '' : value);
    if (!password) return PASSWORD_MESSAGES.newRequired;
    if (password.length < MIN_NEW_PASSWORD_LENGTH) return PASSWORD_MESSAGES.newLength;
    return '';
  }

  /**
   * @param {string} newValue
   * @param {string} confirmValue
   * @returns {string} error message, or '' when acceptable
   */
  function checkConfirmPassword(newValue, confirmValue) {
    var confirmed = String(confirmValue == null ? '' : confirmValue);
    if (!confirmed) return PASSWORD_MESSAGES.confirmRequired;
    if (confirmed !== newValue) return PASSWORD_MESSAGES.confirmMismatch;
    return '';
  }

  /**
   * Show or clear the inline error for one field, same [data-error-for]
   * convention as auth.js's showError.
   * @param {HTMLFormElement} form
   * @param {string} name - the control's `name` attribute
   * @param {string} message - '' clears the error
   */
  function showPasswordFieldError(form, name, message) {
    var slot = form.querySelector('[data-error-for="' + name + '"]');
    var control = form.elements[name];

    if (slot) {
      slot.textContent = message;
      slot.hidden = !message;
    }
    if (control) {
      control.setAttribute('aria-invalid', message ? 'true' : 'false');
      control.classList.toggle('is-invalid', Boolean(message));
    }
  }

  /**
   * Find or create the whole-form success/error message element, inserted
   * right before the submit button row so it reads above the action.
   * @param {HTMLFormElement} form
   * @returns {HTMLElement}
   */
  function ensurePasswordFormMessage(form) {
    var el = form.querySelector('#password-form-message');
    if (el) return el;

    el = document.createElement('p');
    el.id = 'password-form-message';
    el.className = 'form-message';
    el.setAttribute('role', 'status');
    el.hidden = true;

    var foot = form.querySelector('.settings-card-foot');
    if (foot) {
      form.insertBefore(el, foot);
    } else {
      form.appendChild(el);
    }

    return el;
  }

  /**
   * @param {HTMLElement} el
   * @param {string} text - empty string hides the message
   * @param {boolean} isError
   */
  function showPasswordFormMessage(el, text, isError) {
    el.textContent = text;
    el.hidden = !text;
    el.classList.toggle('form-message-error', Boolean(isError));
    el.classList.toggle('form-message-success', Boolean(text) && !isError);
  }

  /**
   * Wire the change-password form: submission is always prevented (there's
   * no backend), validation runs on every attempt, and a valid submission
   * shows a success message and clears the fields.
   * @returns {boolean} true when the password form was found and wired
   */
  function initPasswordForm() {
    var form = document.getElementById('password-form');
    if (!form) return false;

    var messageEl = ensurePasswordFormMessage(form);

    form.addEventListener('submit', function (event) {
      event.preventDefault();

      var currentPassword = form.elements.currentPassword ? form.elements.currentPassword.value : '';
      var newPassword = form.elements.newPassword ? form.elements.newPassword.value : '';
      var confirmPassword = form.elements.confirmPassword ? form.elements.confirmPassword.value : '';

      var errors = {
        currentPassword: checkCurrentPassword(currentPassword),
        newPassword: checkNewPassword(newPassword),
        confirmPassword: checkConfirmPassword(newPassword, confirmPassword)
      };

      var firstInvalidField = null;
      Object.keys(errors).forEach(function (name) {
        showPasswordFieldError(form, name, errors[name]);
        if (errors[name] && !firstInvalidField) firstInvalidField = name;
      });

      if (firstInvalidField) {
        showPasswordFormMessage(messageEl, 'Fix the highlighted fields and try again.', true);
        if (form.elements[firstInvalidField] && form.elements[firstInvalidField].focus) {
          form.elements[firstInvalidField].focus();
        }
        return;
      }

      showPasswordFormMessage(messageEl, 'Password updated. Use your new password next time you sign in.', false);
      form.reset();

      // Reset left every field's aria-invalid/is-invalid state untouched,
      // so clear them explicitly now that the form is back to blank.
      Object.keys(errors).forEach(function (name) {
        showPasswordFieldError(form, name, '');
      });
    });

    return true;
  }

  function init() {
    var theme = loadTheme();
    var isDark = applyTheme(theme);
    var toggleWired = initToggle();
    watchSystemPreference();
    var notificationsWired = initNotificationToggles();
    var passwordFormWired = initPasswordForm();

    console.log(
      '[Portal] theme ready — choice: ' + theme +
      ', active: ' + (isDark ? 'dark' : 'light') +
      ', toggle: ' + (toggleWired ? 'wired' : 'skipped') +
      ', notifications: ' + (notificationsWired ? 'wired' : 'skipped') +
      ', password form: ' + (passwordFormWired ? 'wired' : 'skipped')
    );

    return {
      theme: theme,
      isDark: isDark,
      toggleWired: toggleWired,
      notificationsWired: notificationsWired,
      passwordFormWired: passwordFormWired
    };
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
    notificationsStorageKey: NOTIFICATIONS_STORAGE_KEY,
    defaultNotificationPrefs: DEFAULT_NOTIFICATION_PREFS,
    loadNotificationPrefs: loadNotificationPrefs,
    saveNotificationPrefs: saveNotificationPrefs,
    initNotificationToggles: initNotificationToggles,
    minNewPasswordLength: MIN_NEW_PASSWORD_LENGTH,
    checkNewPassword: checkNewPassword,
    checkConfirmPassword: checkConfirmPassword,
    initPasswordForm: initPasswordForm,
    init: init
  };
})(window);