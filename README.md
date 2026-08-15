# Student Portal

A lightweight web-based student portal for managing logins, profiles,
course dashboards, and account settings. Built with plain HTML, CSS,
and vanilla JavaScript — no frameworks, no build step.# student-portal

## Features

- Secure login with client-side validation
- Editable student profile
- Course dashboard with grades and announcements
- Account settings with theme and notification controls

## Tech Stack

- HTML5 for structure
- CSS3 for styling and responsive layout
- Vanilla JavaScript for interactivity

## Project Structure

```
student-portal/
├── index.html
├── styles/
│   └── main.css
└── scripts/
    └── utils.js
```

## Setup Instructions

1. Clone the repository:

   ```
   git clone https://github.com/charmin-v/student-portal.git
   ```

2. Change into the project folder:

   ```
   cd student-portal
   ```

3. Open `index.html` in your browser.

## Usage

`index.html` is the landing page and the entry point to everything else. The
header carries the primary navigation — Login, Profile, Dashboard and Settings —
and the same links are repeated in the footer, so you can move between pages from
anywhere in the portal. The current page is highlighted in the nav bar, and on
narrow screens the links collapse behind the menu button in the header.

A typical path through the portal: start at the landing page, sign in from
**Login**, land on the **Dashboard** for courses, grades and announcements, use
**Profile** to keep your details current, and **Settings** to change your theme
and notification preferences. Every page links back to the landing page through
the "Student Portal" brand mark in the top-left corner.

## License

Released under the MIT License.
