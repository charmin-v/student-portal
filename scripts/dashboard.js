/**
 * Student Portal — dashboard page.
 *
 * Load after utils.js on dashboard.html:
 *
 *   <script src="scripts/utils.js"></script>
 *   <script src="scripts/dashboard.js"></script>
 *
 * On DOMContentLoaded this fetches data/courses.json, replaces whatever is
 * in the page's `.course-grid` with a card per course (name, instructor,
 * grade, credits, and a progress bar built from each course's `progress`
 * field), and computes a credit-weighted GPA from the graded courses to
 * display near the top of the page. Exposed as `PortalDashboard`.
 */
(function (global) {
  'use strict';

  var COURSES_URL = 'data/courses.json';

  // 10-point scale grade points. Grades not on this list (e.g. "In
  // Progress") are treated as ungraded and excluded from the GPA calc,
  // not as a zero.
  var GRADE_POINTS = {
    'A+': 10,
    'A': 10,
    'A-': 9,
    'B+': 8,
    'B': 7,
    'B-': 6,
    'C+': 5,
    'C': 4,
    'C-': 3,
    'D': 2,
    'F': 0
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
   * Grade points for a course's grade string, or null when the grade isn't
   * on the 10-point scale (ungraded / in-progress courses).
   * @param {string} grade
   * @returns {number|null}
   */
  function gradePoint(grade) {
    var key = String(grade == null ? '' : grade).trim().toUpperCase();
    return Object.prototype.hasOwnProperty.call(GRADE_POINTS, key) ? GRADE_POINTS[key] : null;
  }

  /**
   * Credit-weighted GPA across every course that has a real letter grade.
   * Courses still "In Progress" (or any other unrecognized grade) don't
   * count toward either side of the average.
   * @param {Array<Object>} courses
   * @returns {number|null} null when no course had a gradable grade
   */
  function computeGpa(courses) {
    var totalPoints = 0;
    var totalCredits = 0;

    (courses || []).forEach(function (course) {
      var points = gradePoint(course.grade);
      if (points === null) return;

      var credits = Number(course.credits) || 0;
      totalPoints += points * credits;
      totalCredits += credits;
    });

    return totalCredits > 0 ? totalPoints / totalCredits : null;
  }

  /**
   * A percentage clamped to the 0–100 range a progress bar can render.
   * @param {*} value
   * @returns {number}
   */
  function clampProgress(value) {
    var num = Number(value);
    if (isNaN(num)) return 0;
    return Math.min(100, Math.max(0, num));
  }

  /**
   * Build one course-card article, matching the markup already used for
   * the static cards on dashboard.html, plus a progress bar.
   * @param {Object} course
   * @returns {HTMLElement}
   */
  function buildCourseCard(course) {
    var progress = clampProgress(course.progress);
    var points = gradePoint(course.grade);

    var card = document.createElement('article');
    card.className = 'course-card';

    var head = document.createElement('div');
    head.className = 'course-card-head';

    var titleWrap = document.createElement('div');

    var code = document.createElement('span');
    code.className = 'course-code';
    code.textContent = course.courseId || '';

    var title = document.createElement('h3');
    title.className = 'course-title';
    title.textContent = course.courseName || 'Untitled course';

    titleWrap.appendChild(code);
    titleWrap.appendChild(title);

    var grade = document.createElement('span');
    grade.className = 'course-grade' + (points === null ? ' is-pending' : '');
    grade.textContent = course.grade || 'Ungraded';

    head.appendChild(titleWrap);
    head.appendChild(grade);

    var meta = document.createElement('dl');
    meta.className = 'course-meta';

    var instructorItem = document.createElement('div');
    instructorItem.className = 'course-meta-item';
    var instructorLabel = document.createElement('dt');
    instructorLabel.className = 'course-meta-label';
    instructorLabel.textContent = 'Instructor';
    var instructorValue = document.createElement('dd');
    instructorValue.className = 'course-meta-value';
    instructorValue.textContent = course.instructor || 'Unassigned';
    instructorItem.appendChild(instructorLabel);
    instructorItem.appendChild(instructorValue);

    var creditsItem = document.createElement('div');
    creditsItem.className = 'course-meta-item';
    var creditsLabel = document.createElement('dt');
    creditsLabel.className = 'course-meta-label';
    creditsLabel.textContent = 'Credits';
    var creditsValue = document.createElement('dd');
    creditsValue.className = 'course-meta-value';
    creditsValue.textContent = String(course.credits != null ? course.credits : '—');
    creditsItem.appendChild(creditsLabel);
    creditsItem.appendChild(creditsValue);

    meta.appendChild(instructorItem);
    meta.appendChild(creditsItem);

    var progressWrap = document.createElement('div');
    progressWrap.className = 'course-progress';

    var progressHead = document.createElement('div');
    progressHead.className = 'course-progress-head';
    var progressLabel = document.createElement('span');
    progressLabel.className = 'course-progress-label';
    progressLabel.textContent = 'Course progress';
    var progressValue = document.createElement('span');
    progressValue.className = 'course-progress-value';
    progressValue.textContent = progress + '%';
    progressHead.appendChild(progressLabel);
    progressHead.appendChild(progressValue);

    var track = document.createElement('div');
    track.className = 'course-progress-track';
    track.setAttribute('role', 'progressbar');
    track.setAttribute('aria-valuemin', '0');
    track.setAttribute('aria-valuemax', '100');
    track.setAttribute('aria-valuenow', String(progress));
    track.setAttribute('aria-label', (course.courseName || 'Course') + ' progress');

    var fill = document.createElement('div');
    fill.className = 'course-progress-fill';
    fill.style.width = progress + '%';
    track.appendChild(fill);

    progressWrap.appendChild(progressHead);
    progressWrap.appendChild(track);

    if (course.schedule) {
      var schedule = document.createElement('p');
      schedule.className = 'course-schedule';
      schedule.textContent = course.schedule;
      progressWrap.appendChild(schedule);
    }

    card.appendChild(head);
    card.appendChild(meta);
    card.appendChild(progressWrap);

    return card;
  }

  /**
   * Replace the contents of `.course-grid` with one card per course.
   * @param {Array<Object>} courses
   * @returns {boolean} true when the grid was found and rendered into
   */
  function renderCourses(courses) {
    var grid = document.querySelector('.course-grid');
    if (!grid) return false;

    grid.textContent = '';
    (courses || []).forEach(function (course) {
      grid.appendChild(buildCourseCard(course));
    });

    return true;
  }

  /**
   * Show the computed GPA near the top of the page. Reuses
   * `#dashboard-gpa` if the markup ever grows one; otherwise builds and
   * inserts it into `.dashboard-welcome`, right before the "View profile"
   * link if that's present.
   * @param {number|null} gpa
   * @returns {boolean} true when the GPA element was found or created
   */
  function renderGpa(gpa) {
    var header = document.querySelector('.dashboard-welcome');
    if (!header) return false;

    var el = document.getElementById('dashboard-gpa');
    if (!el) {
      el = document.createElement('div');
      el.id = 'dashboard-gpa';
      el.className = 'dashboard-gpa';

      var anchor = header.querySelector('a');
      if (anchor) {
        header.insertBefore(el, anchor);
      } else {
        header.appendChild(el);
      }
    }

    el.textContent = '';

    var label = document.createElement('span');
    label.className = 'dashboard-gpa-label';
    label.textContent = 'Current GPA';

    var value = document.createElement('span');
    value.className = 'dashboard-gpa-value';
    value.textContent = gpa === null ? '—' : gpa.toFixed(2);

    el.appendChild(label);
    el.appendChild(value);

    return true;
  }

  /**
   * Fetch data/courses.json, render the course grid, and compute + render
   * the GPA. Rendering is skipped (with a console warning) if the request
   * fails or the response isn't valid JSON — there's no course data to
   * show in that case, so the static markup already on the page is left
   * as-is rather than being cleared out.
   * @returns {Promise<{courses: Array<Object>, gpa: number|null}|null>}
   */
  function init() {
    return fetch(COURSES_URL)
      .then(function (response) {
        if (!response.ok) {
          throw new Error('HTTP ' + response.status + ' fetching ' + COURSES_URL);
        }
        return response.json();
      })
      .then(function (courses) {
        renderCourses(courses);
        var gpa = computeGpa(courses);
        renderGpa(gpa);

        console.log(
          '[Portal] dashboard ready — courses: ' + courses.length +
          ', gpa: ' + (gpa === null ? 'n/a' : gpa.toFixed(2))
        );

        return { courses: courses, gpa: gpa };
      })
      .catch(function (err) {
        console.warn('[Portal] dashboard.js: could not load course data — ' + err.message);
        return null;
      });
  }

  ready(init);

  global.PortalDashboard = {
    coursesUrl: COURSES_URL,
    gradePoints: GRADE_POINTS,
    computeGpa: computeGpa,
    renderCourses: renderCourses,
    renderGpa: renderGpa,
    init: init
  };
})(window);