/**
 * Student Portal — shared utilities.
 *
 * Exposed as a single global `Portal` object so feature pages can just drop in
 * <script src="scripts/utils.js"></script> before their own script tag.
 */
(function (global) {
  'use strict';

  /* --- DOM ------------------------------------------------------------- */

  /**
   * Query a single element.
   * @param {string} selector
   * @param {ParentNode} [scope=document]
   * @returns {Element|null}
   */
  function $(selector, scope) {
    return (scope || document).querySelector(selector);
  }

  /**
   * Query all matching elements as a real Array (so .map/.filter work).
   * @param {string} selector
   * @param {ParentNode} [scope=document]
   * @returns {Element[]}
   */
  function $$(selector, scope) {
    return Array.prototype.slice.call((scope || document).querySelectorAll(selector));
  }

  /**
   * Create an element with attributes and children in one call.
   * @param {string} tag
   * @param {Object} [attrs] - `class`, `text`, `html`, `dataset`, `on` (event map)
   *                           and any other key is set as an attribute.
   * @param {(Node|string)[]} [children]
   * @returns {HTMLElement}
   */
  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    var options = attrs || {};

    Object.keys(options).forEach(function (key) {
      var value = options[key];
      if (value === null || value === undefined || value === false) return;

      if (key === 'class' || key === 'className') {
        node.className = value;
      } else if (key === 'text') {
        node.textContent = value;
      } else if (key === 'html') {
        node.innerHTML = value;
      } else if (key === 'dataset') {
        Object.keys(value).forEach(function (dataKey) {
          node.dataset[dataKey] = value[dataKey];
        });
      } else if (key === 'on') {
        Object.keys(value).forEach(function (evt) {
          node.addEventListener(evt, value[evt]);
        });
      } else {
        node.setAttribute(key, value === true ? '' : value);
      }
    });

    (children || []).forEach(function (child) {
      node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
    });

    return node;
  }

  /**
   * Run a callback once the DOM is parsed (safe to call at any time).
   * @param {Function} fn
   */
  function ready(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn, { once: true });
    } else {
      fn();
    }
  }

  /* --- Dates ------------------------------------------------------------ */

  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  var DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  function pad(n) {
    return String(n).padStart(2, '0');
  }

  function toDate(value) {
    var date = value instanceof Date ? value : new Date(value);
    return isNaN(date.getTime()) ? null : date;
  }

  /**
   * Format a date with a small token pattern.
   * Tokens: YYYY YY MMMM MMM MM M DDDD DDD DD D hh mm ss h12 ampm
   *
   *   formatDate(new Date(), 'DD MMM YYYY')      -> "15 Aug 2026"
   *   formatDate('2026-08-15', 'DDDD, D MMMM')   -> "Saturday, 15 August"
   *   formatDate(ts, 'DD-MM-YYYY hh:mm')         -> "15-08-2026 09:30"
   *
   * @param {Date|string|number} value
   * @param {string} [pattern='DD MMM YYYY']
   * @returns {string} formatted date, or '' when the input is not a valid date
   */
  function formatDate(value, pattern) {
    var date = toDate(value);
    if (!date) return '';

    var hours24 = date.getHours();
    var hours12 = hours24 % 12 || 12;

    var tokens = {
      YYYY: String(date.getFullYear()),
      YY: String(date.getFullYear()).slice(-2),
      MMMM: MONTHS[date.getMonth()],
      MMM: MONTHS[date.getMonth()].slice(0, 3),
      MM: pad(date.getMonth() + 1),
      M: String(date.getMonth() + 1),
      DDDD: DAYS[date.getDay()],
      DDD: DAYS[date.getDay()].slice(0, 3),
      DD: pad(date.getDate()),
      D: String(date.getDate()),
      hh: pad(hours24),
      h12: String(hours12),
      mm: pad(date.getMinutes()),
      ss: pad(date.getSeconds()),
      ampm: hours24 < 12 ? 'AM' : 'PM'
    };

    // Longest tokens first so "MMMM" is not eaten by "MM".
    return (pattern || 'DD MMM YYYY').replace(
      /YYYY|MMMM|DDDD|ampm|MMM|DDD|YY|MM|DD|hh|h12|mm|ss|M|D/g,
      function (match) { return tokens[match]; }
    );
  }

  /**
   * Human-readable distance from now, e.g. "in 3 days", "2 hours ago".
   * @param {Date|string|number} value
   * @param {Date|string|number} [from=now]
   * @returns {string}
   */
  function timeAgo(value, from) {
    var date = toDate(value);
    var base = toDate(from) || new Date();
    if (!date) return '';

    var diff = date.getTime() - base.getTime();
    var future = diff > 0;
    var seconds = Math.abs(diff) / 1000;

    var units = [
      ['year', 31536000],
      ['month', 2592000],
      ['week', 604800],
      ['day', 86400],
      ['hour', 3600],
      ['minute', 60]
    ];

    for (var i = 0; i < units.length; i++) {
      var name = units[i][0];
      var size = units[i][1];
      if (seconds >= size) {
        var count = Math.floor(seconds / size);
        var label = count + ' ' + name + (count === 1 ? '' : 's');
        return future ? 'in ' + label : label + ' ago';
      }
    }
    return future ? 'in a moment' : 'just now';
  }

  /* --- Validation -------------------------------------------------------- */

  var PATTERNS = {
    email: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/,
    // Institute roll numbers, e.g. 2026101042 or 2026-CS-042
    rollNumber: /^[0-9]{4}[-]?[A-Za-z]{0,3}[-]?[0-9]{3,6}$/,
    phone: /^[+]?[0-9][0-9\s-]{7,14}$/
  };

  var RULES = {
    required: function (value) {
      return String(value).trim().length > 0 || 'This field is required.';
    },
    email: function (value) {
      return PATTERNS.email.test(String(value).trim()) || 'Enter a valid email address.';
    },
    rollNumber: function (value) {
      return PATTERNS.rollNumber.test(String(value).trim()) || 'Enter a valid roll number.';
    },
    phone: function (value) {
      return PATTERNS.phone.test(String(value).trim()) || 'Enter a valid phone number.';
    },
    numeric: function (value) {
      return /^-?[0-9]+(\.[0-9]+)?$/.test(String(value).trim()) || 'Enter a number.';
    },
    minLength: function (value, n) {
      return String(value).length >= n || 'Must be at least ' + n + ' characters.';
    },
    maxLength: function (value, n) {
      return String(value).length <= n || 'Must be at most ' + n + ' characters.';
    },
    min: function (value, n) {
      return Number(value) >= n || 'Must be ' + n + ' or more.';
    },
    max: function (value, n) {
      return Number(value) <= n || 'Must be ' + n + ' or less.';
    },
    matches: function (value, otherValue, label) {
      return value === otherValue || (label || 'Values') + ' do not match.';
    }
  };

  /**
   * Validate a plain object of values against a rule schema.
   *
   *   Portal.validate(
   *     { roll: '2026101042', email: 'a@b.com', pwd: 'short' },
   *     {
   *       roll:  ['required', 'rollNumber'],
   *       email: ['required', 'email'],
   *       pwd:   ['required', ['minLength', 8]]
   *     }
   *   );
   *   // -> { valid: false, errors: { pwd: 'Must be at least 8 characters.' } }
   *
   * A rule is either a rule name, a [name, ...args] tuple, or a custom
   * function returning `true` or an error message string.
   *
   * @param {Object} values
   * @param {Object} schema
   * @returns {{valid: boolean, errors: Object<string,string>}}
   */
  function validate(values, schema) {
    var errors = {};

    Object.keys(schema).forEach(function (field) {
      var rules = schema[field];
      var value = values[field] === undefined || values[field] === null ? '' : values[field];

      for (var i = 0; i < rules.length; i++) {
        var rule = rules[i];
        var result;

        if (typeof rule === 'function') {
          result = rule(value, values);
        } else {
          var name = Array.isArray(rule) ? rule[0] : rule;
          var args = Array.isArray(rule) ? rule.slice(1) : [];
          var fn = RULES[name];
          if (!fn) throw new Error('Unknown validation rule: ' + name);
          result = fn.apply(null, [value].concat(args));
        }

        // First failure wins — don't stack messages on one field.
        if (result !== true) {
          errors[field] = typeof result === 'string' ? result : 'Invalid value.';
          break;
        }
      }
    });

    return { valid: Object.keys(errors).length === 0, errors: errors };
  }

  /**
   * Read a <form> into a plain object (checkboxes become booleans,
   * multi-selects and repeated names become arrays).
   * @param {HTMLFormElement} form
   * @returns {Object}
   */
  function serializeForm(form) {
    var out = {};

    $$('input, select, textarea', form).forEach(function (field) {
      if (!field.name || field.disabled) return;

      var value;
      if (field.type === 'checkbox') {
        value = field.checked;
      } else if (field.type === 'radio') {
        if (!field.checked) return;
        value = field.value;
      } else if (field.multiple && field.tagName === 'SELECT') {
        value = $$('option', field).filter(function (o) { return o.selected; })
          .map(function (o) { return o.value; });
      } else {
        value = field.value;
      }

      if (Object.prototype.hasOwnProperty.call(out, field.name) && field.type !== 'radio') {
        out[field.name] = [].concat(out[field.name], value);
      } else {
        out[field.name] = value;
      }
    });

    return out;
  }

  /**
   * Validate a form and render messages into
   * `[data-error-for="<field name>"]` elements next to each control.
   * @param {HTMLFormElement} form
   * @param {Object} schema - same shape as `validate`
   * @returns {{valid: boolean, errors: Object, values: Object}}
   */
  function validateForm(form, schema) {
    var values = serializeForm(form);
    var result = validate(values, schema);

    Object.keys(schema).forEach(function (field) {
      var message = result.errors[field] || '';
      var slot = $('[data-error-for="' + field + '"]', form);
      var control = form.elements[field];

      if (slot) {
        slot.textContent = message;
        slot.hidden = !message;
      }
      if (control && control.setAttribute) {
        control.setAttribute('aria-invalid', message ? 'true' : 'false');
        control.classList.toggle('is-invalid', Boolean(message));
      }
    });

    var firstBad = Object.keys(result.errors)[0];
    if (firstBad && form.elements[firstBad] && form.elements[firstBad].focus) {
      form.elements[firstBad].focus();
    }

    return { valid: result.valid, errors: result.errors, values: values };
  }

  /* --- Storage ----------------------------------------------------------- */

  /**
   * localStorage wrapper: JSON-encoded, namespaced, and safe when storage is
   * unavailable (private mode, quota exceeded, disabled cookies).
   */
  var store = (function () {
    var PREFIX = 'sp:';
    var available = (function () {
      try {
        var probe = PREFIX + '__probe__';
        localStorage.setItem(probe, '1');
        localStorage.removeItem(probe);
        return true;
      } catch (err) {
        return false;
      }
    })();

    var memory = {}; // fallback so the API keeps working within the page session

    function key(name) {
      return PREFIX + name;
    }

    return {
      /** Is real localStorage usable in this browser/session? */
      isAvailable: available,

      /**
       * @param {string} name
       * @param {*} [fallback=null] returned when missing or corrupt
       * @returns {*}
       */
      get: function (name, fallback) {
        var raw = available ? localStorage.getItem(key(name)) : memory[key(name)];
        if (raw === null || raw === undefined) {
          return fallback === undefined ? null : fallback;
        }
        try {
          return JSON.parse(raw);
        } catch (err) {
          return fallback === undefined ? null : fallback;
        }
      },

      /**
       * @param {string} name
       * @param {*} value - anything JSON-serialisable
       * @returns {boolean} false if the write failed (e.g. quota exceeded)
       */
      set: function (name, value) {
        var raw = JSON.stringify(value);
        try {
          if (available) {
            localStorage.setItem(key(name), raw);
          } else {
            memory[key(name)] = raw;
          }
          return true;
        } catch (err) {
          memory[key(name)] = raw;
          return false;
        }
      },

      remove: function (name) {
        if (available) localStorage.removeItem(key(name));
        delete memory[key(name)];
      },

      has: function (name) {
        return available
          ? localStorage.getItem(key(name)) !== null
          : Object.prototype.hasOwnProperty.call(memory, key(name));
      },

      /** All portal keys, without the internal prefix. */
      keys: function () {
        var source = available ? Object.keys(localStorage) : Object.keys(memory);
        return source
          .filter(function (k) { return k.indexOf(PREFIX) === 0; })
          .map(function (k) { return k.slice(PREFIX.length); });
      },

      /** Remove every portal key, leaving other sites' data alone. */
      clear: function () {
        this.keys().forEach(this.remove, this);
      }
    };
  })();

  /* --- Misc -------------------------------------------------------------- */

  /**
   * Delay a call until `wait` ms have passed without another call.
   * @param {Function} fn
   * @param {number} [wait=250]
   * @returns {Function} debounced function with a `.cancel()` method
   */
  function debounce(fn, wait) {
    var timer = null;
    function debounced() {
      var args = arguments;
      var context = this;
      clearTimeout(timer);
      timer = setTimeout(function () { fn.apply(context, args); }, wait || 250);
    }
    debounced.cancel = function () { clearTimeout(timer); };
    return debounced;
  }

  /**
   * Escape a string for safe insertion into HTML.
   * @param {string} value
   * @returns {string}
   */
  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }

  global.Portal = {
    $: $,
    $$: $$,
    el: el,
    ready: ready,
    formatDate: formatDate,
    timeAgo: timeAgo,
    validate: validate,
    validateForm: validateForm,
    serializeForm: serializeForm,
    rules: RULES,
    patterns: PATTERNS,
    store: store,
    debounce: debounce,
    escapeHtml: escapeHtml
  };
})(window);
