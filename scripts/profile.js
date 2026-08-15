/**
 * Student Portal — profile page.
 *
 * Load after utils.js on profile.html:
 *
 *   <script src="scripts/utils.js"></script>
 *   <script src="scripts/profile.js"></script>
 *
 * On DOMContentLoaded this fills the profile card from a mock student
 * record (no backend yet — see auth.js for the same convention), lets the
 * person flip the card into an edit mode to change those values, and keeps
 * a live "characters remaining" counter on a bio/notes field if one is
 * present. Every lookup is by element ID and every write is guarded, so
 * the script is safe to include on a page that only has some of the
 * fields. Exposed as `PortalProfile`.
 */
(function (global) {
  'use strict';

  var BIO_MAX_LENGTH = 280;
  var STORAGE_KEY = 'profile';

  // Mock record — stands in for a GET /api/profile response. Overwritten by
  // whatever was last saved to localStorage, if anything (see loadStudent).
  var STUDENT = {
    name: 'Parth Vekariya',
    email: 'parth.vekariya@students.iiit.ac.in',
    studentId: '2026CSB1042',
    course: 'B.Tech in Computer Science & Engineering',
    gpa: 8.72
  };

  // One entry per editable field: the display element's ID, the STUDENT key
  // it maps to, and the <input> type/label to use while editing.
  var EDIT_FIELDS = [
    { id: 'profile-name', key: 'name', type: 'text', label: 'Full name' },
    { id: 'profile-email', key: 'email', type: 'email', label: 'Institute email' },
    { id: 'profile-student-id', key: 'studentId', type: 'text', label: 'Student ID' },
    { id: 'profile-course', key: 'course', type: 'text', label: 'Course enrolled' },
    { id: 'profile-gpa', key: 'gpa', type: 'number', label: 'CGPA' }
  ];

  var utils = global.Portal || {};

  function ready(fn) {
    if (utils.ready) return utils.ready(fn);
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn, { once: true });
    } else {
      fn();
    }
  }

  /* --- Persistence --------------------------------------------------------
   * Same "sp:"-prefixed localStorage convention as auth.js, via the
   * Portal.store wrapper when it's available. */

  /**
   * Overlay any previously saved edits onto the mock STUDENT record.
   * Silently leaves STUDENT untouched if nothing was ever saved.
   */
  function loadStudent() {
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

    if (!stored || typeof stored !== 'object') return;

    Object.keys(STUDENT).forEach(function (key) {
      if (Object.prototype.hasOwnProperty.call(stored, key)) {
        STUDENT[key] = stored[key];
      }
    });
  }

  /**
   * Persist the current STUDENT record.
   * @returns {boolean} false when storage was unavailable
   */
  function saveStudent() {
    if (utils.store) return utils.store.set(STORAGE_KEY, STUDENT) !== false;

    try {
      global.localStorage.setItem('sp:' + STORAGE_KEY, JSON.stringify(STUDENT));
      return true;
    } catch (err) {
      console.warn('[Portal] profile.js: could not persist edits — storage is unavailable.');
      return false;
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

  /* --- Edit mode ------------------------------------------------------- */

  /**
   * The value an EDIT_FIELDS entry should show while editing — the raw
   * value for text/email, the fixed-decimal string for the GPA number
   * input (matches what's shown on screen in view mode).
   * @param {Object} field - one entry from EDIT_FIELDS
   * @returns {string}
   */
  function editValueFor(field) {
    return field.type === 'number' ? formatGpa(STUDENT[field.key]) : String(STUDENT[field.key]);
  }

  /**
   * Build the <input> used to edit one field, labelled for assistive tech
   * via aria-label since there's no markup for a visible <label> here.
   * @param {Object} field - one entry from EDIT_FIELDS
   * @returns {HTMLInputElement}
   */
  function buildFieldInput(field) {
    var input = document.createElement('input');
    input.type = field.type;
    input.id = field.id + '-input';
    input.className = 'field-input';
    input.setAttribute('aria-label', field.label);
    input.value = editValueFor(field);

    if (field.type === 'number') {
      input.step = '0.01';
      input.min = '0';
      input.max = '10';
    }

    return input;
  }

  /**
   * Swap every present display element for a pre-filled input, one per
   * EDIT_FIELDS entry. Fields whose display element is missing are skipped.
   * @returns {number} how many inputs were created
   */
  function showEditInputs() {
    var wired = 0;

    EDIT_FIELDS.forEach(function (field) {
      var display = document.getElementById(field.id);
      if (!display) return;

      var input = buildFieldInput(field);
      display.style.display = 'none';
      display.insertAdjacentElement('afterend', input);
      wired += 1;
    });

    var firstInput = document.getElementById(EDIT_FIELDS[0].id + '-input');
    if (firstInput) firstInput.focus();

    return wired;
  }

  /** Remove every edit input and reveal the display elements again. */
  function hideEditInputs() {
    EDIT_FIELDS.forEach(function (field) {
      var display = document.getElementById(field.id);
      var input = document.getElementById(field.id + '-input');

      if (input) input.remove();
      if (display) display.style.display = '';
    });
  }

  /**
   * Read every edit input back into STUDENT. Text fields are trimmed; the
   * GPA field is parsed as a float and clamped to the 0–10 scale, with
   * unparseable input simply left as whatever STUDENT already held.
   */
  function readEditInputs() {
    EDIT_FIELDS.forEach(function (field) {
      var input = document.getElementById(field.id + '-input');
      if (!input) return;

      if (field.type === 'number') {
        var num = parseFloat(input.value);
        if (!isNaN(num)) STUDENT[field.key] = Math.min(10, Math.max(0, num));
      } else {
        STUDENT[field.key] = input.value.trim();
      }
    });
  }

  /**
   * Wire an edit toggle for the profile card: an "Edit profile" button that
   * swaps the display fields for inputs, plus Save/Cancel buttons that
   * appear only while editing. The toolbar is built and inserted by this
   * function since profile.html doesn't ship one — it's placed right after
   * the "Profile details" heading when that heading is present.
   * @returns {boolean} true when the toggle was wired
   */
  function initEditMode() {
    var title = document.getElementById('profile-details-title');
    if (!title) return false;

    var toolbar = document.createElement('div');
    toolbar.className = 'profile-actions';
    toolbar.id = 'profile-edit-toolbar';

    var editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.id = 'profile-edit-toggle';
    editBtn.className = 'btn btn-ghost';
    editBtn.textContent = 'Edit profile';

    var saveBtn = document.createElement('button');
    saveBtn.type = 'button';
    saveBtn.id = 'profile-save-btn';
    saveBtn.className = 'btn btn-primary';
    saveBtn.textContent = 'Save changes';
    saveBtn.hidden = true;

    var cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.id = 'profile-cancel-btn';
    cancelBtn.className = 'btn btn-ghost';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.hidden = true;

    toolbar.appendChild(editBtn);
    toolbar.appendChild(saveBtn);
    toolbar.appendChild(cancelBtn);
    title.insertAdjacentElement('afterend', toolbar);

    function enterEdit() {
      showEditInputs();
      editBtn.hidden = true;
      saveBtn.hidden = false;
      cancelBtn.hidden = false;
    }

    function exitEdit() {
      hideEditInputs();
      editBtn.hidden = false;
      saveBtn.hidden = true;
      cancelBtn.hidden = true;
    }

    editBtn.addEventListener('click', enterEdit);
    cancelBtn.addEventListener('click', exitEdit);

    saveBtn.addEventListener('click', function () {
      readEditInputs();
      saveStudent();
      populateProfile();
      exitEdit();
    });

    return true;
  }

  function init() {
    loadStudent();

    var profileResult = populateProfile();
    var bioWired = initBioCounter();
    var editWired = initEditMode();

    console.log(
      '[Portal] profile ready — fields filled: ' + profileResult.filled.length +
      ', bio counter: ' + (bioWired ? 'wired' : 'skipped') +
      ', edit mode: ' + (editWired ? 'wired' : 'skipped')
    );

    return { profile: profileResult, bioCounter: bioWired, editMode: editWired };
  }

  ready(init);

  global.PortalProfile = {
    student: STUDENT,
    bioMaxLength: BIO_MAX_LENGTH,
    storageKey: STORAGE_KEY,
    editFields: EDIT_FIELDS,
    formatGpa: formatGpa,
    loadStudent: loadStudent,
    saveStudent: saveStudent,
    populateProfile: populateProfile,
    initBioCounter: initBioCounter,
    initEditMode: initEditMode,
    init: init
  };
})(window);