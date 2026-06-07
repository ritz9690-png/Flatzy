# 🏠 Flatzy — Nagpur's Trusted Rental & PG Platform

> **Find flats, PGs, and rental properties in Nagpur — fast, simple, and free.**

[![Firebase](https://img.shields.io/badge/Firebase-Hosting-orange?logo=firebase)](https://flatzyhomes.web.app)
[![Live](https://img.shields.io/badge/Live-flatzyhomes.web.app-blue)](https://flatzyhomes.web.app)
[![Made in Nagpur](https://img.shields.io/badge/Made%20in-Nagpur%20🇮🇳-green)]()

---

## 📌 About

**Flatzy** is a web-based rental listing platform focused exclusively on **Nagpur**. Tenants can browse verified flats and PGs, owners can list via WhatsApp, and admins manage everything from a built-in dashboard.

No app download needed — works entirely in the browser.

---

## ✨ Features

### 👤 For Tenants
- Browse flats & PGs by area, rent range, and type
- Wishlist properties for later
- Google Sign-In (no password needed)
- Referral system — earn rewards by inviting friends
- Notifications & activity feed
- Light / Dark theme

### 🏡 For Owners
- List property via WhatsApp (instant, no form needed)
- Full listing form: address, rent, furnishing, BHK, amenities
- **Interactive map location picker** — search by area name OR use current GPS, drag pin to set exact location, "Lock This Location" to save coordinates (OpenStreetMap / Leaflet)
- Edit and manage own listings
- Photo upload via Cloudinary
- Video upload per listing

### 🛡️ For Admins (`/admin` — route protected, `admin.html` is in `.gitignore`)
- Full admin panel with sidebar navigation
- **Listings** — all properties with stats: total listings, unique owners, avg rent, total photos, website visitors
- **Owner Listings** — filter properties by owner
- **User Logins** — track all logged-in users with live activity
- **Referrals & Referrers** — manage referral program, view counts
- **Areas → Manage Areas** — add/edit Nagpur areas list
- **Areas → Location Verify** — approve or reject GPS coordinates per listing
- **Areas → No Location** — flag listings missing GPS coords
- **Storage → Cloudinary** — media/photo management
- **Notifications → Push Notifications** — send user alerts
- **Visitors counter** — live website visitor count (608+)
- Block/unblock user accounts
- Firestore log auto-cleanup (logs older than 24h deleted)

---

## 🗂️ Project Structure

```
Flatzy/
│
├── index.html          # Landing page
├── home.html           # User dashboard (post-login)
├── rent.html           # Browse listings
├── view.html           # Single property detail
├── owner.html          # Owner's listing panel
├── edit.html           # Edit property form
├── login.html          # Google login + role selector
├── onboard.html        # Post-login referral onboarding
├── admin.html          # Admin dashboard
├── refer.html          # Refer & Earn page
├── wishlist.html       # Saved properties
├── notifications.html  # User notifications
├── settings.html       # Account settings
├── services.html       # Platform services info
├── about.html          # About Flatzy
├── faq.html            # FAQs
├── whats-new.html      # Changelog / updates
├── legal.html          # Terms & Privacy
│
├── style.css           # Global base styles
├── flatzy-light.css    # Light theme variables
├── flatzy-dark.css     # Dark theme variables
│
├── admin-logic.js      # Admin panel JS logic
├── user-tracker.js     # Activity tracker (login, page, heartbeat)
├── lightbox.js         # Photo lightbox viewer
├── config.js           # ⚠️ Secret keys (NOT in GitHub)
│
├── firebase.json       # Firebase Hosting config + URL rewrites
├── .firebaserc         # Firebase project binding
├── package.json        # Dependencies (firebase ^12)
└── favicon.jpeg        # App icon
```

---

## 🔧 Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | Vanilla HTML, CSS, JavaScript |
| Auth | Firebase Authentication (Google Sign-In) |
| Database | Firestore (NoSQL) |
| Hosting | Firebase Hosting |
| Media | Cloudinary (photo uploads) |
| Fonts | Google Fonts (Syne + DM Sans) |

---

## 🚀 Setup & Deployment

### Prerequisites
- Node.js installed
- Firebase CLI: `npm install -g firebase-tools`

### Steps

```bash
# 1. Clone the repo
git clone https://github.com/ritz9690-png/Flatzy.git
cd Flatzy

# 2. Install dependencies
npm install

# 3. Create config.js (see below)

# 4. Login to Firebase
firebase login

# 5. Deploy
firebase deploy
```

### `config.js` (create manually, never commit)

```js
const CLOUD_NAME       = 'your_cloudinary_cloud_name';
const CLOUD_API_KEY    = 'your_cloudinary_api_key';
const CLOUD_API_SECRET = 'your_cloudinary_api_secret';
```

> ⚠️ `config.js` is in `.gitignore` — **never push it to GitHub.**

---

## 🔗 URL Rewrites (Clean URLs)

| URL | Page |
|-----|------|
| `/browse` | `rent.html` |
| `/list-property` | `owner.html` |
| `/refer-earn` | `refer.html` |
| `/admin` | `admin.html` |
| `/about` | `about.html` |

---

## 🔥 Firestore Collections

| Collection | Purpose |
|------------|---------|
| `users` | User profiles, roles, lastSeen |
| `properties` | Rental listings |
| `referrers` | Referral codes (FLZ prefix) |
| `referrals` | Completed referrals |
| `activityLogs` | User activity (auto-cleaned after 24h) |
| `areas` | Approved Nagpur areas |
| `pending_areas` | User-suggested areas (admin review) |

---

## 🔒 .gitignore — What's Hidden

| File | Reason |
|------|--------|
| `config.js` | Cloudinary API keys (secret) |
| `admin.html` | Admin panel — not public |
| `node_modules/` | Dependencies |
| `.firebase/` | Firebase cache |
| `*.log` | Debug logs |
| `.env` | Environment variables |

> ⚠️ `admin.html` is intentionally excluded from the repo. Deploy karte waqt manually server pe daalo.

---

## 🎨 UI Features

### Sidebar Navigation (all users)
- Home, Browse Properties, Saved Properties, List Property
- Refer & Earn, About Us, FAQ, Our Services, What's New
- Privacy Policy, Terms & Conditions
- ⚙️ Settings
- 🔧 **Admin Panel** link — visible only to admin users (bottom of sidebar)
- Social links: WhatsApp, Instagram, LinkedIn
- 🌙 Dark / ☀️ Light Mode toggle

### Settings Page (`settings.html`)
Full **Account Overview** dashboard with:

| Section | Options |
|---------|---------|
| Account | Overview, Profile Details, Edit Profile, Saved Properties |
| Settings | Appearance (Light/Dark), Notifications |
| Legal | Terms & Conditions, Privacy Policy |
| | Logout |

Cards on overview: Saved Properties · My Listings · Profile Details · Edit Profile · Appearance · Refer & Earn · Notifications · Logout



Floating WhatsApp button on all pages with quick options:
- 🏠 Looking for Flat / PG
- 🏢 I want to List my Property  
- ❓ General Enquiry

## 🎨 UI Features

- **Sidebar navigation** — Home, Browse, Saved, List Property, Refer & Earn, About, FAQ, Services, What's New, Privacy Policy
- **Dark / Light mode toggle** in sidebar
- Social links: WhatsApp, Instagram, LinkedIn
- Marquee ticker bar with social links at top
- Animated hero section with "Find Your Perfect Home in Nagpur"



- Fully responsive (mobile-first)
- `flatzy.mp4` video ad popup (compress to <10MB for mobile)
- Works on all modern browsers

---

## 📞 Contact & Support

- 📧 Email: [flatzyhomes@gmail.com](mailto:flatzyhomes@gmail.com)
- 💬 WhatsApp (List Property): [+91 73858 66455](https://wa.me/917385866455)
- 🌐 Live Site: [flatzyhomes.web.app](https://flatzyhomes.web.app)

---

## 📄 License

© 2025 Flatzy. All rights reserved.  
Built with ❤️ in Nagpur.
