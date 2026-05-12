# Laya Breakfast Card Check-in v1.2 Room Check-in Stability

Static web app for GitHub Pages + Firebase.


## v1.2 room check-in stability updates
- Fixed focus returning to Manual Room after a manual room check-in. The next scan now always returns to Card Code by default.
- Changed auto-ready behavior so the latest result remains visible while inputs are cleared for the next guest.
- Increased scanner auto-submit debounce to reduce partial card-code submissions from slower scanners.
- Made log refresh non-blocking after scan success so the next scan is not delayed by Firestore log queries.
- Room-not-found attempts now write to logs when a room number exists, making failed attempts traceable.
- Improved room number normalization and fixed OTARO* package detection as RO.

## v1.1 updates
- Daily upload now merges duplicate room rows automatically instead of silently keeping only the first row.
- Import now also updates `settings/app_config.current_business_date` so all tabs stay on the same business date.
- Restaurant scan now respects the Actual Pax value correctly in both validate and confirm flow.
- FO card search now auto-loads the assigned room preview when the card is active.
- Logs refresh automatically when date/result filter changes.
- Package aliases improved: `OTARO -> RO`, plus extra BB / Executive Breakfast aliases.

## Features
- Upload daily guest list from Excel/CSV
- Front Office assign / reassign / clear reusable card codes
- 1 room can have up to 2 active cards
- Restaurant scan flow with manual or auto confirm
- Duplicate breakfast prevention by `room_no + business_date`
- Logs for both valid and invalid scans

## Files
- `index.html`
- `style.css`
- `app.js`
- `firebase-config.js`
- `firestore.rules`
- `firestore.rules.role_based.example`

## Before use
1. Create a Firebase project
2. Enable **Firestore Database**
3. Enable **Authentication > Anonymous**
4. Copy your Firebase config into `firebase-config.js`
5. Deploy to GitHub Pages

## Rules
- Start with `firestore.rules`
- When you are ready for stronger security, review `firestore.rules.role_based.example`

## Firestore indexes you will likely need
### card_bindings
- `room_no` Asc
- `active` Asc

### breakfast_logs
- `business_date` Asc
- `scan_time` Desc

Optional:
- `business_date` Asc
- `result` Asc
- `scan_time` Desc

## Upload file columns supported
The importer tries to map these headers:
- room / room_no / room number
- guest_name / guest / name
- pax / adults / guest_count / heads
- package / mealplan / meal_plan / ratecode

## Notes
- Package eligibility defaults:
  - RO = false
  - RB / BB / HB / FB / AI / EXECUTIVE = true
- `room_checkin_daily/{business_date_room_no}` is the main duplicate lock
- `breakfast_logs` keeps all scan results


## Entry pages
- `index.html` = FO Assign only
- `fo-assign.html` = FO Assign only (same as index)
- `admin.html` = full system
