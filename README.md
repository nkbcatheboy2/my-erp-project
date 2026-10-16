# LDA Lottery & E-Auction Citizen Portal

React/Vite citizen portal backed by Firebase Authentication and Cloud Firestore. LDA admins can publish lottery/e-auction plans and verified outcomes; ERP employees can review and update citizen applications.

## Run locally

```sh
npm install
npm run server
```

In a second terminal, run the frontend:

```sh
npm run dev
```

Until Firebase settings are added, the citizen site uses labelled sample data and does not save applications. **Staff / ERP login** opens the Property Management dashboard; its MIS cards and dashboard metrics are prototype data.

## Property Management dashboard

The ERP dashboard includes a searchable, collapsible operations sidebar, module switcher, notifications and profile menus, summary metrics, and live-filtered MIS report cards. Selecting a report opens its details and identifies the prototype data limitation. The module menu opens the existing lottery staff console; UM, SALE, and Planning are clearly marked as unavailable module placeholders.

```text
src/propertyDashboard/
  PropertyDashboard.jsx
  propertyDashboard.css
  data.js
  components/
    Icon.jsx
    MISGrid.jsx
    Navbar.jsx
    ReportCard.jsx
    SearchFilter.jsx
    Sidebar.jsx
```

Report and navigation records are maintained in `data.js`. Dashboard metrics and report details are mock data; connect them to authorised API endpoints before production use. The dashboard follows the existing Vite app's scoped CSS conventions and requires no additional runtime packages.

## Connect MongoDB Atlas

The Express API connects to the Atlas cluster using a database user with `readWrite` access limited to `lda_erp`. Put the URI in `server/.env.local` (copy `server/.env.example` and replace its placeholders with the non-SRV/legacy connection string from Atlas, including all replica-set hosts); never put the MongoDB URI in a `VITE_` variable or commit credentials. The root `.gitignore` excludes `*.local`.

Run `npm run server` and check `http://localhost:5000/api/health` for `{ "status": "ok", "database": "connected" }`. MongoDB creates the `lda_erp` database when the first collection/document is written.

The existing citizen portal and staff console still use Firebase Authentication and Firestore. This Atlas connection adds a separate backend and does not migrate existing Firebase data or change current application workflows.

## Connect a Firebase project

1. Open the existing Firebase project **lda--erp**, then go to **Project settings → General → Your apps** and select the Web app with app ID `1:950059598897:web:d35fcf121931de1c88c110`.
2. Create a Cloud Firestore database in production mode if one has not already been created.
3. In **Authentication → Sign-in method**, enable **Email/Password** for staff login and **Anonymous** for citizen submissions.
4. `.env.local` is already prefilled with the supplied project ID and app ID. Copy the **apiKey** from the Web app's Firebase config into `VITE_FIREBASE_API_KEY` in `.env.local`. The auth domain defaults to `lda--erp.firebaseapp.com`. Restart Vite after changing environment variables.
5. Publish `firestore.rules` and `firestore.indexes.json` to the same Firebase project.
6. Create staff accounts in **Authentication → Users**. For each staff UID, create a document at `staffRoles/{UID}` in Firestore:

   ```json
   { "role": "admin", "active": true }
   ```

   Use `"employee"` for ERP employees. Provision at least one admin through Firebase Console before using the admin console. Only an admin can create lottery/e-auction plans or publish results; admin and employee roles can view all applications and update their review status.

The Firebase web config (including its API key) is client-side project identification, not a service-account credential. Never put a service-account JSON/private key in Vite environment variables or browser code. `.env.local` is ignored by Git.

## Firestore collections

- `plans`: lottery and e-auction plans. Public portal reads documents only when `isPublished` is true and `status` is `open` or `upcoming`.
- `applications`: citizen details, plan reference, bid amount (for e-auctions), review status and server timestamp. Anonymous users can submit only to an open, published plan; a citizen can read only their own record. Staff roles can review all records.
- `results`: verified lottery draw/e-auction execution summaries. Public reads only published outcomes.
- `staffRoles`: `{ role: "admin" | "employee", active: true }` documents keyed by Firebase Authentication UID.
- `properties`: unique six-digit property IDs are the document IDs. Admins can enter IDs manually or leave them blank for a Firestore-transaction-generated ID; staff can view the registry.

## Staff modules

- **Lottery module**: review every saved citizen application, update its status, create lottery/e-auction plans, and publish verified draw results.
- **HRMS module**: manage the HRMS staff directory and property master. Create a property one at a time, optionally specifying its 6-digit ID, or import `.xlsx`, `.xls`, or `.csv` files. A blank ID in the workbook is generated uniquely. Download the in-app Excel template for the supported columns: `Property Name`, `Property ID` (optional), `Scheme`, `Location`, `Type`, `Area`, `Owner Name`, `Status`, and `Notes`. Each row is validated and import errors include row numbers.

Staff console selection persists for the browser tab, and Firebase Auth uses local persistence, so refreshing while signed in returns to the staff console. Citizen submissions are written to `applications` only after Firestore accepts them; a generated submission reference is shown after a successful save. The application form payload must match the `firestore.rules` allowlist.

The rules deny all other access. Review local privacy/retention requirements before collecting identity numbers in production. Enable Firebase App Check and consider rate limiting/abuse monitoring before opening public submissions.

## Auction scope

Admins can publish auction dates, reserve price, earnest-money deposit and bidding window. Citizens can register and enter an intended bid amount; staff can review registrations and publish the verified outcome. This frontend does **not** process payments, hold earnest money, or run a real-time bidding engine. Those require a trusted server/payment integration and must not be implemented as client-only logic.

## Deploy

Install/use Firebase CLI, select the project with `firebase use --add`, then run:

```sh
npm run build
firebase deploy --only firestore:rules,firestore:indexes,hosting
```

## Commands

- `npm run dev` — start the development server
- `npm run build` — create a production build
- `npm run lint` — run Oxlint
- `npm run preview` — preview the production build
