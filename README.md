# Laya Breakfast Card Check-in v1

Static web app for GitHub Pages + Firebase.

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
