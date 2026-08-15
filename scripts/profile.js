/**
 * Student Portal — profile page.
 *
 * Load after utils.js on profile.html:
 *
 *   <script src="scripts/utils.js"></script>
 *   <script src="scripts/profile.js"></script>
 *
 * On DOMContentLoaded this fills the profile card from a mock student
 * record (no backend yet — see auth.js for the same convention) and, if a
 * bio/notes field is present, keeps a live "characters remaining" counter
 * next to it. Every lookup is by element ID and every write is guarded, so
 * the script is safe to include on a page that only has some of the fields.
 * Exposed as `PortalProfile`.
 */
(function (global) {
  'use strict';

  var BIO_MAX_LENGTH = 280;

  // Mock record — stands in for a GET /api/profile response.
  var STUDENT = {
    name: 'Parth Vekariya',
    email: 'parth.vekariya@students.iiit.ac.in',
    studentId: '2026CSB1042',
    course: 'B.Tech in Computer Science & Engineering',
    gpa: 8.72
  };

  var utils = global.Portal || {};

  function ready(fn) {
    if (utils.ready) return utils.ready(fn);
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn, { once: true });
    } else {
      fn();
    }
  }

  /**
   * Write text into an element, tolerating elements that render text
   * differently (inputs/textareas use `.value`, everything else uses
   * `.textContent`). Missing elements are skipped, not errors.
   * @param {string} id
   * @param {string} text
   * @returns {boolean} true when something was written
   */
  function setFieldText(id, text) {
    var el = document.getElementById(id);
    if (!el) return false;

    if ('value' in el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT')) {
      el.value = text;
    } else {
      el.textContent = text;
    }
    return true;
  }

  /**
   * Format the GPA consistently (fixed to 2 decimals) regardless of how
   * many digits the source value happens to have.
   * @param {number} gpa
   * @returns {string}
   */
  function formatGpa(gpa) {
    return Number(gpa).toFixed(2);
  }

  /**
   * Fill every profile field present on the page from STUDENT.
   * Field IDs, one element each: profile-name, profile-email,
   * profile-student-id, profile-course, profile-gpa.
   * @returns {{filled: string[], missing: string[]}} which IDs were found
   */
  function populateProfile() {
    var fields = {
      'profile-name': STUDENT.name,
      'profile-email': STUDENT.email,
      'profile-student-id': STUDENT.studentId,
      'profile-course': STUDENT.course,
      'profile-gpa': formatGpa(STUDENT.gpa)
    };

    var filled = [];
    var missing = [];

    Object.keys(fields).forEach(function (id) {
      if (setFieldText(id, fields[id])) {
        filled.push(id);
      } else {
        missing.push(id);
      }
    });

    // An email field that's a link (like the mailto anchor on profile.html)
    // needs its href kept in sync too, not just its visible text.
    var emailLink = document.getElementById('profile-email');
    if (emailLink && emailLink.tagName === 'A') {
      emailLink.setAttribute('href', 'mailto:' + STUDENT.email);
    }

    if (missing.length) {
      console.warn('[Portal] profile.js: no element for ' + missing.join(', '));
    }

    return { filled: filled, missing: missing };
  }

  /**
   * Wire a live character counter for a bio/notes field.
   * Looks for #profile-bio (the textarea) and #profile-bio-count (where the
   * "N characters remaining" text goes); does nothing if either is absent.
   * The field is also hard-capped at BIO_MAX_LENGTH so pasted text can't
   * exceed it.
   * @returns {boolean} true when the counter was wired
   */
  function initBioCounter() {
    var field = document.getElementById('profile-bio');
    var counter = document.getElementById('profile-bio-count');
    if (!field || !counter) return false;

    var max = parseInt(field.getAttribute('maxlength'), 10);
    if (!max || isNaN(max)) {
      max = BIO_MAX_LENGTH;
      field.setAttribute('maxlength', String(max));
    }

    function render() {
      // Trim defensively — maxlength doesn't stop every input path (e.g.
      // some IME composition flows) from exceeding the cap.
      if (field.value.length > max) {
        field.value = field.value.slice(0, max);
      }

      var remaining = max - field.value.length;
      counter.textContent = remaining + ' character' + (remaining === 1 ? '' : 's') + ' remaining';
      counter.classList.toggle('is-limit-close', remaining <= 20);
      counter.classList.toggle('is-limit-reached', remaining <= 0);
    }

    field.addEventListener('input', render);
    render();
    return true;
  }

  function init() {
    var profileResult = populateProfile();
    var bioWired = initBioCounter();

    console.log(
      '[Portal] profile ready — fields filled: ' + profileResult.filled.length +
      ', bio counter: ' + (bioWired ? 'wired' : 'skipped')
    );

    return { profile: profileResult, bioCounter: bioWired };
  }

  ready(init);

  global.PortalProfile = {
    student: STUDENT,
    bioMaxLength: BIO_MAX_LENGTH,
    formatGpa: formatGpa,
    populateProfile: populateProfile,
    initBioCounter: initBioCounter,
    init: init
  };
})(window);