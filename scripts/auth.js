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
 */
(function (global) {
  'use strict';

  var FORM_SELECTOR = '#login-form';
  var MIN_PASSWORD_LENGTH = 8;

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
   * default sign-in runs: stash the session and go to the profile page.
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

      if (utils.store) {
        utils.store.set('session', {
          email: detail.email,
          remember: detail.remember,
          signedInAt: new Date().toISOString()
        });
      }
      global.location.href = 'profile.html';
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
    messages: MESSAGES,
    checkEmail: checkEmail,
    checkPassword: checkPassword,
    validate: validateForm,
    showError: showError,
    init: init
  };
})(window);
