/**
 * Student Portal — login form validation.
 *
 * Load after utils.js on any page carrying the login form:
 *
 *   <script src="scripts/utils.js"></script>
 *   <script src="scripts/auth.js"></script>
 *
 * Checks the email format and the password length, writes messages into the
 * `[data-error-for="<field name>"]` slots beside each control, and blocks
 * submission while anything is invalid. Exposed as `PortalAuth`.
 *
 * There is no authentication server. A valid form produces a *mock* session in
 * localStorage and moves to the dashboard — any password of the right shape is
 * accepted, so treat the stored session as a UI convenience, not a credential.
 */
(function (global) {
  'use strict';

  var FORM_SELECTOR = '#login-form';
  var MIN_PASSWORD_LENGTH = 8;
  var SESSION_KEY = 'session';
  var REDIRECT_TO = 'dashboard.html';
  var SESSION_HOURS = 12;
  var REMEMBER_DAYS = 30;

  // Deliberately permissive: one @, no spaces, and a dotted domain with a
  // 2+ character TLD. Anything stricter rejects addresses that really exist.
  var EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  var MESSAGES = {
    emailRequired: 'Enter your institute email address.',
    emailFormat: 'That does not look like a valid email address.',
    passwordRequired: 'Enter your password.',
    passwordLength: 'Password must be at least ' + MIN_PASSWORD_LENGTH + ' characters.'
  };

  var utils = global.Portal || {};

  function $(selector, scope) {
    return utils.$ ? utils.$(selector, scope) : (scope || document).querySelector(selector);
  }

  function ready(fn) {
    if (utils.ready) return utils.ready(fn);
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn, { once: true });
    } else {
      fn();
    }
  }

  /* --- Mock session ------------------------------------------------------ */

  /**
   * Persist a value under the portal's storage namespace.
   * Prefers the wrapper in utils.js (JSON encoding, "sp:" prefix, survives
   * private mode); falls back to raw localStorage with the same key shape.
   * @param {string} name
   * @param {*} value
   * @returns {boolean} false when the value could not be persisted
   */
  function save(name, value) {
    if (utils.store) return utils.store.set(name, value);

    try {
      global.localStorage.setItem('sp:' + name, JSON.stringify(value));
      return true;
    } catch (err) {
      return false;
    }
  }

  /**
   * Turn an email local part into something presentable:
   * "parth.vekariya" -> "Parth Vekariya".
   * @param {string} email
   * @returns {string}
   */
  function displayName(email) {
    return String(email).split('@')[0]
      .split(/[._-]+/)
      .filter(Boolean)
      .map(function (part) { return part.charAt(0).toUpperCase() + part.slice(1); })
      .join(' ');
  }

  /**
   * A stand-in for the token a real login endpoint would hand back. Random
   * enough to look like one in the UI; it authenticates nothing.
   * @returns {string}
   */
  function mockToken() {
    var bytes = new Uint8Array(16);
    if (global.crypto && global.crypto.getRandomValues) {
      global.crypto.getRandomValues(bytes);
    } else {
      for (var i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
    }
    return Array.prototype.map.call(bytes, function (b) {
      return b.toString(16).padStart(2, '0');
    }).join('');
  }

  /**
   * Build the mock session object. "Remember me" only stretches the expiry —
   * nothing here is enforced server-side because there is no server.
   * @param {{email: string, remember: boolean}} detail
   * @returns {Object}
   */
  function createSession(detail) {
    var now = new Date();
    var lifetimeMs = detail.remember
      ? REMEMBER_DAYS * 24 * 60 * 60 * 1000
      : SESSION_HOURS * 60 * 60 * 1000;

    return {
      token: mockToken(),
      email: detail.email,
      name: displayName(detail.email),
      remember: detail.remember,
      mock: true,
      issuedAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + lifetimeMs).toISOString()
    };
  }

  /**
   * Create, store and return the mock session for a validated login.
   * @param {{email: string, remember: boolean}} detail
   * @returns {Object} the session (returned even if the write failed)
   */
  function signIn(detail) {
    var session = createSession(detail);
    if (!save(SESSION_KEY, session)) {
      console.warn('[Portal] could not persist the session — storage is unavailable.');
    }
    return session;
  }

  /**
   * The stored session, if any. Expired sessions are treated as absent.
   * @returns {Object|null}
   */
  function currentSession() {
    var session = null;

    if (utils.store) {
      session = utils.store.get(SESSION_KEY, null);
    } else {
      try {
        session = JSON.parse(global.localStorage.getItem('sp:' + SESSION_KEY));
      } catch (err) {
        session = null;
      }
    }

    if (!session || !session.expiresAt) return null;
    return new Date(session.expiresAt).getTime() > Date.now() ? session : null;
  }

  /** Drop the stored session. */
  function signOut() {
    if (utils.store) return utils.store.remove(SESSION_KEY);
    try {
      global.localStorage.removeItem('sp:' + SESSION_KEY);
    } catch (err) {
      /* nothing to clean up */
    }
  }

  /* --- Rules ------------------------------------------------------------- */

  /**
   * @param {string} value
   * @returns {string} error message, or '' when the email is acceptable
   */
  function checkEmail(value) {
    var email = String(value == null ? '' : value).trim();
    if (!email) return MESSAGES.emailRequired;
    if (!EMAIL_PATTERN.test(email)) return MESSAGES.emailFormat;
    return '';
  }

  /**
   * Length is counted on the raw value — spaces are legitimate password
   * characters, so this one is not trimmed.
   * @param {string} value
   * @returns {string} error message, or '' when the password is acceptable
   */
  function checkPassword(value) {
    var password = String(value == null ? '' : value);
    if (!password) return MESSAGES.passwordRequired;
    if (password.length < MIN_PASSWORD_LENGTH) return MESSAGES.passwordLength;
    return '';
  }

  var CHECKS = {
    email: checkEmail,
    password: checkPassword
  };

  /* --- Rendering --------------------------------------------------------- */

  /**
   * Show or clear the message for one field.
   * @param {HTMLFormElement} form
   * @param {string} name - the control's `name` attribute
   * @param {string} message - '' clears the error
   */
  function showError(form, name, message) {
    var slot = $('[data-error-for="' + name + '"]', form);
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
   * Run every check and paint the results.
   * @param {HTMLFormElement} form
   * @returns {{valid: boolean, errors: Object<string,string>}}
   */
  function validateForm(form) {
    var errors = {};

    Object.keys(CHECKS).forEach(function (name) {
      var control = form.elements[name];
      var message = CHECKS[name](control ? control.value : '');
      if (message) errors[name] = message;
      showError(form, name, message);
    });

    var firstBad = Object.keys(errors)[0];
    if (firstBad && form.elements[firstBad] && form.elements[firstBad].focus) {
      form.elements[firstBad].focus();
    }

    return { valid: Object.keys(errors).length === 0, errors: errors };
  }

  /* --- Wiring ------------------------------------------------------------ */

  /**
   * Attach validation to a login form.
   *
   * Submission is always prevented — there is no backend to post to — so a
   * valid form instead fires a cancelable `portal:login` event carrying the
   * entered values. If no listener calls preventDefault() on that event, the
   * default sign-in runs: store the mock session and go to the dashboard.
   *
   * @param {HTMLFormElement|string} [target=FORM_SELECTOR]
   * @returns {HTMLFormElement|null} the form that was wired, or null
   */
  function init(target) {
    var form = typeof target === 'string' || target === undefined
      ? $(target || FORM_SELECTOR)
      : target;

    if (!form || form.dataset.authWired === 'true') return form || null;
    form.dataset.authWired = 'true';

    // Browsers would otherwise block submit on their own `required`/`minlength`
    // attributes before this handler ever runs.
    form.setAttribute('novalidate', '');

    var attempted = false;

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      attempted = true;

      if (!validateForm(form).valid) return;

      var detail = {
        email: form.elements.email.value.trim(),
        password: form.elements.password.value,
        remember: Boolean(form.elements.remember && form.elements.remember.checked)
      };

      var proceed = form.dispatchEvent(new CustomEvent('portal:login', {
        detail: detail,
        bubbles: true,
        cancelable: true
      }));
      if (!proceed) return;

      signIn(detail);
      global.location.href = REDIRECT_TO;
    });

    // Once the user has tried to submit, re-check as they type so the message
    // clears the moment the field becomes valid. Before that, only on blur —
    // shouting at a half-typed address is worse than saying nothing.
    Object.keys(CHECKS).forEach(function (name) {
      var control = form.elements[name];
      if (!control) return;

      control.addEventListener('blur', function () {
        if (control.value) showError(form, name, CHECKS[name](control.value));
      });

      control.addEventListener('input', function () {
        if (attempted) showError(form, name, CHECKS[name](control.value));
      });
    });

    return form;
  }

  ready(function () { init(); });

  global.PortalAuth = {
    formSelector: FORM_SELECTOR,
    minPasswordLength: MIN_PASSWORD_LENGTH,
    emailPattern: EMAIL_PATTERN,
    sessionKey: SESSION_KEY,
    redirectTo: REDIRECT_TO,
    messages: MESSAGES,
    checkEmail: checkEmail,
    checkPassword: checkPassword,
    validate: validateForm,
    showError: showError,
    createSession: createSession,
    signIn: signIn,
    currentSession: currentSession,
    signOut: signOut,
    init: init
  };
})(window);
