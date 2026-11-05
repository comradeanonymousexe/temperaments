# Ma'rifah an-Nafs — modular edition

This is the original standalone application reorganized into separate, editable files. The content, questions, scoring, screens, and browser-local journal behavior are preserved. No libraries or network calls are required.

## Start

Open **index.html** in your browser. You can also serve this directory with `python -m http.server 8000` and open `http://localhost:8000/` (optional).

## Project layout

```text
index.html            Page shell, navigation, and script/style references
assets/favicon.svg    Site icon
css/main.css          Core and component styles, including responsive styles
css/inquiry.css       Inquiry-specific styles and responsive overrides
js/engine.js          Pure scoring / assessment functions
js/app.js             Pages, templates, routing, interactions, local storage

data/config.js        App title, version, source attribution
data/questions.js     48 temperament questions and their scoring keys
data/behaviors.js     44 conduct questions
data/domains.js       22 behavior domains and practice recommendations
data/risks.js         Potential risks associated with each temperament
data/profiles.js      Four temperament descriptions / profiles
data/schedule.js      Four stages of the 40-day path
```

## Edit safely

- **Text/questions/practices:** edit the relevant `data/*.js` file. Each file contains a plain JavaScript object/array (JSON-style syntax) assigned to `window.MIZAN_DATA.<name>`.
- **Visual design:** edit `css/main.css`; inquiry-specific overrides live in `css/inquiry.css`, loaded second.
- **App behavior/screens:** edit `js/app.js`.
- **Scoring rules:** edit `js/engine.js`.
- **Site header, navigation, favicon reference:** edit `index.html`.
- **Script loading order matters:** config and the six data files load first, then engine, then app. Do not add `async` to these tags.
- Keep existing question IDs, behavior IDs, domain codes, and temperament letters (`C`, `S`, `M`, `P`) stable if you want older browser-saved records to remain compatible.

## Privacy and backups

The site stores user entries in the browser's `localStorage` under `mizan-nafs-state-v1`. Saved answers do **not** live in the project data files. Use the site's backup/export and import features to move journal records. Browsers may isolate `file://` storage differently; serving the folder locally is the more consistent option.

## Notes

No build process, npm packages, framework, or external API is needed. The source referenced a `sw.js` file that was not included in the upload; that unused registration has been omitted to avoid a missing-file request. The original data and assessment algorithm have not been changed.
