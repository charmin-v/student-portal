/**
 * scripts/notifications.js
 * Fetches data/notifications.json and renders the notification feed on
 * notifications.html. Reuses the existing .notification-feed /
 * .notification-item markup and CSS custom properties defined in
 * notifications.html's inline <style> block, so no other files are touched.
 */

(function () {
  "use strict";

  var DATA_URL = "data/notifications.json";
  var MONTH_LABELS = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    var feedEl = document.querySelector(".notification-feed");
    if (!feedEl) {
      // Nothing to render into on this page.
      return;
    }

    injectTypeStyles();
    setFeedLoadingState(feedEl);

    fetch(DATA_URL)
      .then(function (response) {
        if (!response.ok) {
          throw new Error(
            "Failed to load " + DATA_URL + " (status " + response.status + ")"
          );
        }
        return response.json();
      })
      .then(function (notifications) {
        renderNotifications(feedEl, Array.isArray(notifications) ? notifications : []);
      })
      .catch(function (error) {
        renderError(feedEl, error);
      });
  }

  function setFeedLoadingState(feedEl) {
    feedEl.innerHTML = "";
    var loadingItem = document.createElement("li");
    loadingItem.className = "notification-feed-status";
    loadingItem.textContent = "Loading notifications…";
    feedEl.appendChild(loadingItem);
  }

  function renderError(feedEl, error) {
    console.error("notifications.js:", error);
    feedEl.innerHTML = "";
    var errorItem = document.createElement("li");
    errorItem.className = "notification-feed-status";
    errorItem.textContent =
      "Couldn't load notifications right now. Please try again later.";
    feedEl.appendChild(errorItem);
  }

  function renderNotifications(feedEl, notifications) {
    feedEl.innerHTML = "";

    if (notifications.length === 0) {
      var emptyItem = document.createElement("li");
      emptyItem.className = "notification-feed-status";
      emptyItem.textContent = "You're all caught up — no notifications yet.";
      feedEl.appendChild(emptyItem);
      updateUnreadCount(0);
      return;
    }

    // Newest first.
    var sorted = notifications.slice().sort(function (a, b) {
      return parseTimestamp(b.timestamp) - parseTimestamp(a.timestamp);
    });

    var unreadCount = 0;
    var fragment = document.createDocumentFragment();

    sorted.forEach(function (notification, index) {
      if (!notification.read) {
        unreadCount += 1;
      }
      fragment.appendChild(buildNotificationItem(notification, index));
    });

    feedEl.appendChild(fragment);
    updateUnreadCount(unreadCount);
  }

  function buildNotificationItem(notification, index) {
    var id = notification.id != null ? notification.id : "n" + index;
    var type = normalizeType(notification.type);
    var isRead = Boolean(notification.read);
    var titleId = "notif-title-" + id;

    var li = document.createElement("li");

    var article = document.createElement("article");
    article.className = "notification-item" + (isRead ? "" : " is-unread");
    article.setAttribute("aria-labelledby", titleId);
    article.dataset.notificationId = id;
    article.dataset.type = type;
    article.dataset.read = isRead ? "true" : "false";

    // Unread indicator dot (hidden via CSS when not .is-unread).
    var dot = document.createElement("span");
    dot.className = "notification-unread-dot";
    dot.setAttribute("aria-hidden", "true");
    article.appendChild(dot);

    // Date column.
    article.appendChild(buildDateColumn(notification.timestamp));

    // Body column: heading row (title + type badge) and message text.
    var body = document.createElement("div");

    var head = document.createElement("div");
    head.className = "notification-body-head";

    var titleEl = document.createElement("h2");
    titleEl.className = "notification-title";
    titleEl.id = titleId;
    titleEl.textContent = notification.title || "Untitled notification";
    head.appendChild(titleEl);

    var badge = document.createElement("span");
    badge.className = "notification-category is-" + type;
    badge.textContent = typeLabel(type);
    head.appendChild(badge);

    if (isRead) {
      var readBadge = document.createElement("span");
      readBadge.className = "notification-read-badge";
      readBadge.textContent = "Read";
      head.appendChild(readBadge);
    }

    body.appendChild(head);

    var messageEl = document.createElement("p");
    messageEl.className = "notification-text";
    messageEl.textContent = notification.message || "";
    body.appendChild(messageEl);

    var timeEl = document.createElement("span");
    timeEl.className = "notification-source";
    timeEl.textContent = formatFullTimestamp(notification.timestamp);
    body.appendChild(timeEl);

    article.appendChild(body);
    li.appendChild(article);
    return li;
  }

  function buildDateColumn(timestamp) {
    var wrap = document.createElement("div");
    wrap.className = "notification-date";

    var date = parseTimestampSafe(timestamp);

    var dayEl = document.createElement("span");
    dayEl.className = "notification-date-day";
    dayEl.textContent = date ? String(date.getDate()).padStart(2, "0") : "--";

    var monthEl = document.createElement("span");
    monthEl.textContent = date ? MONTH_LABELS[date.getMonth()] : "";

    wrap.appendChild(dayEl);
    wrap.appendChild(monthEl);
    return wrap;
  }

  function updateUnreadCount(count) {
    var countEl = document.querySelector(".notifications-count");
    if (!countEl) {
      return;
    }
    countEl.textContent = count + (count === 1 ? " unread" : " unread");
  }

  function normalizeType(type) {
    var normalized = (type || "").toLowerCase();
    if (normalized === "warning" || normalized === "success") {
      return normalized;
    }
    return "info";
  }

  function typeLabel(type) {
    if (type === "warning") return "Warning";
    if (type === "success") return "Success";
    return "Info";
  }

  function parseTimestamp(timestamp) {
    var ms = Date.parse(timestamp);
    return isNaN(ms) ? 0 : ms;
  }

  function parseTimestampSafe(timestamp) {
    var ms = Date.parse(timestamp);
    return isNaN(ms) ? null : new Date(ms);
  }

  function formatFullTimestamp(timestamp) {
    var date = parseTimestampSafe(timestamp);
    if (!date) {
      return "";
    }
    return date.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  // Inject styling for info/warning/success badges and read/unread states
  // that aren't already defined in notifications.html's inline <style>.
  // Only touches the DOM at runtime — no other project files are modified.
  function injectTypeStyles() {
    if (document.getElementById("notifications-js-styles")) {
      return;
    }
    var style = document.createElement("style");
    style.id = "notifications-js-styles";
    style.textContent =
      ".notification-category.is-info {" +
      "  background: color-mix(in srgb, var(--color-primary) 14%, var(--color-surface));" +
      "  color: var(--color-primary);" +
      "}" +
      ".notification-category.is-warning {" +
      "  background: color-mix(in srgb, var(--color-warning) 16%, var(--color-surface));" +
      "  color: var(--color-warning);" +
      "}" +
      ".notification-category.is-success {" +
      "  background: color-mix(in srgb, var(--color-success) 14%, var(--color-surface));" +
      "  color: var(--color-success);" +
      "}" +
      ".notification-item:not(.is-unread) {" +
      "  opacity: 0.65;" +
      "}" +
      ".notification-item:not(.is-unread) .notification-text," +
      ".notification-item:not(.is-unread) .notification-source {" +
      "  color: var(--color-text-muted);" +
      "}" +
      ".notification-read-badge {" +
      "  padding: 2px var(--space-3);" +
      "  border-radius: 999px;" +
      "  background: var(--color-surface-alt);" +
      "  color: var(--color-text-muted);" +
      "  font-size: 0.7rem;" +
      "  font-weight: 700;" +
      "  text-transform: uppercase;" +
      "  letter-spacing: 0.05em;" +
      "}" +
      ".notification-feed-status {" +
      "  padding: var(--space-5);" +
      "  color: var(--color-text-muted);" +
      "  text-align: center;" +
      "}";
    document.head.appendChild(style);
  }
})();