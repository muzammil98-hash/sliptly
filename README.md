# Splitly

Split bills with flatmates. Plain HTML, CSS and JavaScript on top of Supabase. No build step.

## Files
| File | What it does |
|---|---|
| `index.html` | Page shell. Loads the Supabase and QR libraries, then `config.js` and `app.js`. |
| `config.js` | Your Supabase URL and anon key. |
| `app.js` | The whole app: auth, data loading, screens, actions. |
| `style.css` | All styling. Colours are CSS variables at the top (dark mode included). |
| `manifest.webmanifest`, `icon-*.png`, `sw.js` | Make it installable on a phone (Add to Home Screen) and cached offline. |
| `supabase/schema.sql` | The database: tables, privacy rules, functions. Already run once. |

## How app.js is organised
- **State** (top): `me`, `flat`, `members`, `EX` (expenses), `ST` (settlements), `sheet`, `pop`, `qr`.
- **Data**: `loadAll()` and `loadFlat()` fetch from Supabase. `live()` refreshes on realtime changes.
- **Money maths**: `net(p)` = what person `p` owes you (negative = you owe them). `flatBal()` does it for everyone.
- **Screens**: `home()`, `activity()`, `groups()`, `person()`, plus sheets `sheetHTML()`, `popHTML()`, `qrHTML()`. Each returns an HTML string and `render()` draws them.
- **Actions**: one big `switch` inside the click handler. Buttons carry `data-a="actionName" data-v="value"`. To add a feature, add a button with `data-a="myAction"` and a `case 'myAction':` there.

## Update the live site without re-uploading each time (do this once)
1. Create a free GitHub account and a new repository called `splitly`.
2. Upload every file in this folder to it (GitHub: Add file -> Upload files).
3. In Netlify: Add new site -> Import an existing project -> GitHub -> pick `splitly`. Leave the build command empty and publish directory as `/`.
4. From now on, edit a file on GitHub (pencil icon) and commit. Netlify redeploys in about 30 seconds. Reload the app (twice if it still shows the old version).

## Test locally
Run `python3 -m http.server 8000` in this folder and open http://localhost:8000. Without a server, `sw.js` and installing won't work.

## Not built yet
- Push notifications: needs a Supabase Edge Function plus web-push keys.
- Phone OTP login: needs an SMS provider connected in Supabase.
- Play Store version: wrap the live site with PWABuilder (pwabuilder.com) once it is on a custom or Netlify HTTPS domain.
