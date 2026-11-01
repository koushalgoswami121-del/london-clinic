# The London Clinic — Firebase booking integration

This bundle keeps the existing single-page HTML design and adds:
- Firestore appointment request storage (`appointmentRequests`)
- Staff dashboard at `/admin.html`
- Firebase Authentication email/password sign-in for staff
- Admin-only dashboard reads and status updates using a Firebase custom claim
- Cloud Function email notification to the clinic via Resend
- Optional patient receipt email when the patient enters an email address

## Before deployment

The clinic identity, dentist details, prices, contact details, testimonials and photos in the supplied mockup must be verified/replaced by the clinic. The booking form currently asks for name, phone, optional email, reason and preferred date/time. A preferred time is not a live availability check or a confirmed booking.

## 1. Create Firebase project

1. Create a project at https://console.firebase.google.com/.
2. Add a Web App and copy its config into `firebase-config.js`.
3. Enable **Authentication > Email/Password**.
4. Create a Firestore database. Choose `europe-west2` (London) if available; keep the Cloud Function region consistent.
5. In Authentication, create a staff user for the clinic.
6. Update `.firebaserc` replacing `YOUR_FIREBASE_PROJECT_ID` with the project ID.

## 2. Set up staff dashboard access

Download a service account key from Firebase Project settings > Service accounts and save it locally as `service-account.json` in this folder. Do not upload it to hosting or commit it to Git.

Install Admin SDK locally and grant the admin custom claim:
```bash
npm install firebase-admin
node admin-set-claim.js staff@example.com
```
Then ask that staff member to sign out and back into `/admin.html`.

Delete `service-account.json` from the project folder before deploying. Add it to `.gitignore`.

## 3. Configure email notifications

Create/verify a sending domain in https://resend.com/ and choose a sender address on that verified domain.

From this folder:
```bash
firebase functions:secrets:set RESEND_API_KEY
```
Paste the Resend API key when prompted.

Set the two function environment values for deployment. For a simple Firebase Functions deployment, create `functions/.env.YOUR_FIREBASE_PROJECT_ID`:
```env
CLINIC_NOTIFICATION_EMAIL=clinic@example.co.uk
RESEND_FROM_EMAIL=The London Clinic <bookings@your-verified-domain.co.uk>
```
Use an inbox and sender domain controlled by the clinic. Never put the Resend API key in frontend files.

## 4. Deploy

Install the Firebase CLI and sign in:
```bash
npm install -g firebase-tools
firebase login
firebase use YOUR_FIREBASE_PROJECT_ID
```

Deploy Firestore rules, Hosting and Cloud Functions:
```bash
cd functions
npm install
cd ..
firebase deploy --only firestore:rules,functions,hosting
```

Firebase may prompt you to enable required Google Cloud APIs and billing for Cloud Functions. Cloud Functions deployment generally requires the Blaze plan. Check current Firebase pricing before enabling billing.

## 5. Test before handing over

- Open the hosted homepage and submit a test booking with a test email address.
- Confirm a document appears in Firestore > `appointmentRequests`.
- Confirm the clinic notification email arrives.
- Confirm the patient receipt arrives if an email was supplied.
- Open `/admin.html`, sign in with the staff account, and verify the request appears.
- Change its status to Contacted, Confirmed or Declined and verify it persists.
- Test invalid/missing fields and mobile layout.
- Confirm the clinic owns the Firebase project, domain, Resend account and staff credentials.

## Security and privacy notes

- Public visitors can create only constrained appointment request documents; they cannot read, update or delete bookings.
- Only authenticated users with the Firebase custom claim `admin: true` can access the dashboard data.
- Do not collect symptoms, medical history, images or other clinical details through this lightweight form. Use a clinic-approved patient system for clinical data.
- Add a clinic-approved privacy notice and retention policy before collecting real patient information. The clinic must review its UK GDPR/data-protection obligations and any processor agreements.
- Email is not a secure channel for detailed health information. Notifications intentionally contain only basic appointment logistics.
- The public form is not a confirmed reservation. Staff must check actual availability and confirm with the patient.
- Add App Check, abuse monitoring and a CAPTCHA/rate-limiting strategy before production if spam becomes an issue.
