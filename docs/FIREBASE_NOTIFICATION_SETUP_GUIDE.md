# 🔔 MY VIDYON — Push Notification Setup Guide

> **Product**: MY VIDYON (ERP for Educational Institutions)
> **Company**: UNAI Tech
> **Package Name**: `com.myvidyon.app`
> **Firebase Project ID**: `myvidyon-app-15664`
> **Supabase Project Ref**: `ccyqzcaghwaggtmkmigi`
> **EAS Project ID**: `e43bedd5-6bcc-4eeb-9a4b-4588ac9d04aa`

---

## 📋 Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Firebase Console Setup](#2-firebase-console-setup)
3. [Google Cloud Console Setup](#3-google-cloud-console-setup)
4. [Google Play Console Setup](#4-google-play-console-setup)
5. [Supabase Configuration](#5-supabase-configuration)
6. [App-Side Configuration](#6-app-side-configuration)
7. [Testing & Verification](#7-testing--verification)
8. [Troubleshooting](#8-troubleshooting)

---

## 1. Architecture Overview

MY VIDYON's push notification system uses the following flow:

```
┌──────────────────────────────────────────────────────────────────────────┐
│                        MY VIDYON NOTIFICATION FLOW                      │
│                                                                         │
│  ┌─────────────┐    ┌──────────────────┐    ┌───────────────────────┐   │
│  │  DB Trigger  │───▶│ Supabase Edge Fn │───▶│  Firebase FCM v1 API │   │
│  │ (pg_net)     │    │ send-push-notif  │    │                       │   │
│  └──────┬───────┘    └────────┬─────────┘    └───────────┬───────────┘   │
│         │                     │                           │              │
│  Inserts into           Looks up tokens             Delivers to          │
│  notifications          from user_push_tokens       Android / iOS        │
│  table                  table on Supabase           devices              │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │ TRIGGERS:                                                           │ │
│  │  • Announcements → on_announcement_published()                      │ │
│  │  • Attendance (Absent / Illegal Entry) → on_attendance_marked()     │ │
│  │  • Fee Reminders → on_fee_status_change()                           │ │
│  │  • Timetable Changes → on_timetable_change()                        │ │
│  │  • Exam Results → on_exam_result_published()                        │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────┘
```

**Key components:**

| Component | Location | Purpose |
|---|---|---|
| DB Triggers | `supabase/notification_automation.sql` | Insert rows into `notifications` table |
| Push Webhook | `supabase/push_trigger.sql` | Call Edge Function on new notification |
| Edge Function | `supabase/functions/send-push-notification/index.ts` | Send FCM v1 API request |
| Client Registration | `src/utils/notifications.ts` | Get FCM token, save to `user_push_tokens` |
| Token Storage | `supabase/migrations/create_push_tokens_table.sql` | Store per-device FCM tokens |

---

## 2. Firebase Console Setup

### 2.1 Open Your Firebase Project

1. Go to **[Firebase Console](https://console.firebase.google.com/)**
2. Select the existing project: **`myvidyon-app-15664`**
   - Project Number: `891189484070`
   - Project ID: `myvidyon-app-15664`

> If you don't see it, make sure you're logged in with the UNAI Tech Google Account that originally created the project.

### 2.2 Enable Cloud Messaging (FCM)

1. Click the **⚙️ gear icon** (top-left) → **Project settings**
2. Go to the **Cloud Messaging** tab
3. Verify that **Firebase Cloud Messaging API (V1)** is **Enabled**
   - If it shows "Disabled", click **Manage API in Google Cloud Console** and **Enable** it
4. Note down the **Sender ID** (same as Project Number): `891189484070`

### 2.3 Download `google-services.json` (Android)

Your project already has this file, but if you need to re-download:

1. Go to **Project settings** → **General** tab
2. Scroll down to **Your apps** section
3. Select the Android app (`com.myvidyon.app`)
   - If no Android app exists, click **Add app** → **Android** and enter:
     - **Package name**: `com.myvidyon.app`
     - **App nickname**: `MY VIDYON`
     - **Debug signing SHA-1**: (see [Section 4.4](#44-get-sha-1-signing-keys))
4. Click **Download google-services.json**
5. **Replace** the file at the project root:
   ```
   My_Vidyon/google-services.json
   ```

### 2.4 Generate Firebase Service Account Key (CRITICAL)

This is the **most important step** — the Edge Function needs this key to authenticate with FCM.

1. Go to **Project settings** → **Service accounts** tab
2. Select **Firebase Admin SDK**
3. Click **Generate new private key**
4. A JSON file will download — it looks like this:

```json
{
  "type": "service_account",
  "project_id": "myvidyon-app",
  "private_key_id": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQ...very-long-key...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-xxxxx@myvidyon-app.iam.gserviceaccount.com",
  "client_id": "123456789012345678901",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-xxxxx%40myvidyon-app.iam.gserviceaccount.com",
  "universe_domain": "googleapis.com"
}
```

> ⚠️ **SECURITY**: Never commit this JSON file to git. It is only stored as a Supabase secret.

5. **Save this file safely** — you'll need the entire JSON content for [Section 5.2](#52-set-the-firebase-service-account-secret).

### 2.5 iOS Setup (Optional — for future)

If you plan to support iOS:

1. In **Project settings** → **General**, click **Add app** → **iOS**
2. Enter **Bundle ID**: `com.myvidyon.app`
3. Download `GoogleService-Info.plist`
4. Upload your **APNs authentication key** (`.p8` file) under:
   - **Project settings** → **Cloud Messaging** → **iOS app configuration**
   - Upload your APNs key, enter the Key ID and Team ID

---

## 3. Google Cloud Console Setup

### 3.1 Open the Cloud Console

1. Go to **[Google Cloud Console](https://console.cloud.google.com/)**
2. Select project: **`myvidyon-app-15664`**
   - The Firebase project automatically creates a Google Cloud project with the same ID

### 3.2 Enable Required APIs

Go to **APIs & Services** → **Library** and enable the following:

| API | URL | Purpose |
|---|---|---|
| **Firebase Cloud Messaging API** | [Enable FCM API](https://console.cloud.google.com/apis/library/fcm.googleapis.com?project=myvidyon-app-15664) | Required for sending push notifications |
| **Firebase Installations API** | [Enable Installations API](https://console.cloud.google.com/apis/library/firebaseinstallations.googleapis.com?project=myvidyon-app-15664) | Required for device registration |
| **Identity and Access Management (IAM) API** | [Enable IAM API](https://console.cloud.google.com/apis/library/iam.googleapis.com?project=myvidyon-app-15664) | Required for Service Account authentication |
| **Token Service API** | [Enable Token API](https://console.cloud.google.com/apis/library/securetoken.googleapis.com?project=myvidyon-app-15664) | Required for OAuth2 token exchange |

**Steps for each:**

1. Click the link (or search in Library)
2. Click the blue **Enable** button
3. Wait for activation to complete

### 3.3 Verify Service Account Permissions

1. Go to **IAM & Admin** → **IAM**
2. Find the service account: `firebase-adminsdk-xxxxx@myvidyon-app.iam.gserviceaccount.com`
3. Ensure it has the following roles:
   - **Firebase Admin SDK Administrator Service Agent**
   - **Firebase Cloud Messaging API Admin** (or `roles/firebasenotifications.admin`)
4. If missing, click the **✏️ Edit** pencil icon and add the role:
   - Click **Add another role**
   - Search for `Firebase Cloud Messaging API Admin`
   - Save

### 3.4 API Credentials

1. Go to **APIs & Services** → **Credentials**
2. Verify you have an **Android API Key** (auto-created by Firebase):
   - Name: `Android key (auto created by Firebase)`
   - Key: `AIzaSyAMhKOHDKLvwZ6aeYmZM2gwMfQ4vNyuADA` (matches `google-services.json`)
3. Optionally restrict the key:
   - Click the key → **Application restrictions** → **Android apps**
   - Add package name: `com.myvidyon.app`
   - Add your SHA-1 fingerprint (see [Section 4.4](#44-get-sha-1-signing-keys))

### 3.5 Quotas & Billing

1. Go to **Billing** and ensure billing is enabled
   - FCM is **free** (no charge for message delivery)
   - But a billing account is required for API access
2. Go to **APIs & Services** → **Quotas** to monitor usage:
   - FCM v1 API: Default limit is **600k messages/min**
   - Sufficient for MY VIDYON's institutional usage

---

## 4. Google Play Console Setup

### 4.1 Create Developer Account (If Not Done)

1. Go to **[Google Play Console](https://play.google.com/console/)**
2. If you don't have an account:
   - Sign in with UNAI Tech's Google account
   - Pay the **one-time $25 registration fee**
   - Fill out organization details:
     - **Developer name**: `UNAI Tech`
     - **Contact email**: Your business email
     - **Website**: Your company website

### 4.2 Create the App Listing

1. Click **Create app**
2. Fill in the details:

| Field | Value |
|---|---|
| **App name** | `MY VIDYON` |
| **Default language** | English (United States) |
| **App or game** | App |
| **Free or paid** | Free (or Paid based on your model) |

3. Accept the declarations and click **Create app**

### 4.3 App Signing & Upload Key

1. Go to **Release** → **Setup** → **App signing**
2. Google will manage your **app signing key** automatically
3. Upload your **upload key** (the keystore you use for EAS Build):
   - If using EAS Build, Expo handles this — your `eas.json` and EAS credentials system manage the keystore

### 4.4 Get SHA-1 Signing Keys

You need the SHA-1 fingerprints for Firebase. There are **two** you need:

#### A. Debug SHA-1 (for development)

Run in your terminal:

```bash
# Windows
keytool -list -v -keystore "%USERPROFILE%\.android\debug.keystore" -alias androiddebugkey -storepass android -keypass android

# macOS / Linux
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
```

#### B. Release SHA-1 (for production)

Go to **Google Play Console** → **Release** → **Setup** → **App signing**:
- Copy the **SHA-1 certificate fingerprint** under "App signing key certificate"
- Also copy the **Upload key certificate** SHA-1

#### C. Add SHA-1 to Firebase

1. Go to **[Firebase Console](https://console.firebase.google.com/)** → **Project settings** → **General**
2. Under your Android app (`com.myvidyon.app`), click **Add fingerprint**
3. Paste both SHA-1 values
4. **Re-download** `google-services.json` and replace the one in your project

### 4.5 Link Firebase to Play Console

1. In **Google Play Console**, go to **Setup** → **API access**
2. Link your **Google Cloud project** (`myvidyon-app`)
3. This allows:
   - Firebase Crashlytics integration
   - Firebase App Distribution
   - Pre-launch reports with Firebase Test Lab

### 4.6 Store Listing Content

Prepare the following assets for your Play Store listing:

| Asset | Specification | Content Suggestion |
|---|---|---|
| **App icon** | 512×512 PNG | MY VIDYON logo on brand-colored background |
| **Feature graphic** | 1024×500 PNG | Banner with "MY VIDYON - Institutional ERP by UNAI Tech" |
| **Screenshots** | Min 2, up to 8 per device | Dashboard, Attendance, Notifications, Timetable screens |
| **Short description** | Max 80 chars | `Complete ERP solution for educational institutions by UNAI Tech` |
| **Full description** | Max 4000 chars | See [Appendix A](#appendix-a-play-store-description) |
| **Privacy policy URL** | Required | Host at `https://unaitech.com/privacy-policy` |

### 4.7 Content Rating

1. Go to **Policy** → **App content** → **Content rating**
2. Start the questionnaire
3. For an ERP app, likely answers:
   - No violence, no sexual content, no gambling
   - You will likely get: **Rated for Everyone**

### 4.8 Build & Publish

```bash
# Build for Android using EAS
npx eas-cli build --platform android --profile production

# Submit to Play Console
npx eas-cli submit --platform android --latest
```

---

## 5. Supabase Configuration

### 5.1 Database Setup (Already Done)

The following SQL scripts have already been applied to your Supabase project:

- ✅ `create_push_tokens_table.sql` — `user_push_tokens` table
- ✅ `notification_automation.sql` — All 5 notification triggers
- ✅ `push_trigger.sql` — DB webhook to Edge Function

### 5.2 Set the Firebase Service Account Secret

This is the **most critical** step. The Edge Function reads this secret at runtime.

1. Open the Service Account JSON file you downloaded in [Section 2.4](#24-generate-firebase-service-account-key-critical)
2. **Minify** the JSON (remove all line-breaks & extra spaces). Use an online minifier or run:

```bash
# PowerShell (Windows)
(Get-Content .\myvidyon-app-firebase-adminsdk-xxxxx.json -Raw) -replace '\s+', ' ' | Set-Clipboard

# Or use Node.js
node -e "console.log(JSON.stringify(JSON.parse(require('fs').readFileSync('./myvidyon-app-firebase-adminsdk-xxxxx.json','utf8'))))"
```

3. Set it as a Supabase secret using the CLI:

```bash
npx supabase secrets set FIREBASE_SERVICE_ACCOUNT='<PASTE_YOUR_MINIFIED_JSON_HERE>'
```

4. Or via the **Supabase Dashboard**:
   - Go to **[Supabase Dashboard](https://supabase.com/dashboard/project/ccyqzcaghwaggtmkmigi)** → **Edge Functions** → **Manage Secrets**
   - Click **New secret**
   - Name: `FIREBASE_SERVICE_ACCOUNT`
   - Value: Paste the entire minified JSON

### 5.3 Deploy the Edge Function

```bash
# Navigate to project root
cd "c:\Users\kamal\OneDrive\Desktop\UNAI Tech\My Vidyon\rebuild\My_Vidyon"

# Deploy the send-push-notification function
npx supabase functions deploy send-push-notification --project-ref ccyqzcaghwaggtmkmigi
```

### 5.4 Verify the Push Trigger

Run this in the **Supabase SQL Editor** to confirm the trigger exists:

```sql
-- Check all notification-related triggers
SELECT trigger_name, event_manipulation, event_object_table, action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
AND trigger_name LIKE '%notification%'
ORDER BY trigger_name;
```

Expected output:

| trigger_name | table | event |
|---|---|---|
| `on_notification_created` | `notifications` | INSERT |
| `trigger_announcement_notification` | `announcements` | INSERT |
| `trigger_attendance_notification` | `student_attendance` | INSERT, UPDATE |
| `trigger_exam_result_notification` | `exam_results` | INSERT, UPDATE |
| `trigger_fee_notification` | `fee_payments` | INSERT, UPDATE |
| `trigger_timetable_notification` | `timetable` | INSERT, UPDATE |

---

## 6. App-Side Configuration

### 6.1 `app.json` (Already Configured)

Your `app.json` already has the correct setup:

```json
{
  "expo": {
    "android": {
      "package": "com.myvidyon.app",
      "googleServicesFile": "./google-services.json"
    },
    "plugins": [
      "expo-notifications"
    ]
  }
}
```

### 6.2 `google-services.json` (Already Present)

Located at project root. Contains:
- Project ID: `myvidyon-app-15664`
- API Key: `AIzaSyAMhKOHDKLvwZ6aeYmZM2gwMfQ4vNyuADA`
- App ID: `1:891189484070:android:238ca105809fe162fba4e7`

### 6.3 Client-Side Token Registration (Already Implemented)

`src/utils/notifications.ts` already handles:

1. ✅ Checking if running on a physical device
2. ✅ Skipping Expo Go on Android (SDK 53+ limitation)
3. ✅ Requesting notification permissions
4. ✅ Getting FCM device token via `getDevicePushTokenAsync()`
5. ✅ Upserting token to `user_push_tokens` table

### 6.4 Build a Development Build (Required for Testing)

> ⚠️ **Push notifications do NOT work in Expo Go.** You must use a **development build**.

```bash
# Create a development build for Android
npx eas-cli build --platform android --profile development

# Install on device or emulator
# The .apk link will be provided after the build
```

---

## 7. Testing & Verification

### 7.1 Test Push Notification End-to-End

1. **Install** the development build on a physical Android device
2. **Log in** to MY VIDYON
3. Check token was saved — Run in **Supabase SQL Editor**:

```sql
SELECT * FROM user_push_tokens ORDER BY created_at DESC LIMIT 5;
```

4. **Send a test notification** — Run in SQL Editor:

```sql
INSERT INTO notifications (user_id, title, message, type, action_url)
VALUES (
  '<YOUR_USER_UUID_FROM_STEP_3>',
  'Test from MY VIDYON',
  'If you see this, push notifications are working! 🎉',
  'announcement',
  '/(root)/student/notices'
);
```

5. You should receive a push notification on your device within a few seconds.

### 7.2 Test via Edge Function Directly

```bash
curl -X POST \
  "https://ccyqzcaghwaggtmkmigi.supabase.co/functions/v1/send-push-notification" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNjeXF6Y2FnaHdhZ2d0bWttaWdpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2ODUwMjgsImV4cCI6MjA4MzI2MTAyOH0.pJTXXaMH1FQC5ml7IWGI3DjOfIl0aAW4Xcgy5dhKSvE" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "<YOUR_USER_UUID>",
    "title": "Direct Test",
    "body": "Testing Edge Function directly",
    "data": {"action_url": "/(root)/student/notices"}
  }'
```

### 7.3 Check Edge Function Logs

1. Go to **Supabase Dashboard** → **Edge Functions** → `send-push-notification`
2. Click **Logs** to see execution results
3. Look for:
   - `Sending push to X device(s)` — confirms tokens were found
   - `FCM Result for token xxxx...` — shows FCM API response

---

## 8. Troubleshooting

### Common Issues

| Problem | Cause | Solution |
|---|---|---|
| `FIREBASE_SERVICE_ACCOUNT not configured` | Secret not set in Supabase | Follow [Section 5.2](#52-set-the-firebase-service-account-secret) |
| `Firebase token exchange failed` | Invalid Service Account JSON or wrong permissions | Regenerate key ([Section 2.4](#24-generate-firebase-service-account-key-critical)) and check IAM roles ([Section 3.3](#33-verify-service-account-permissions)) |
| `No device tokens found` | User hasn't opened the app on a real device | Must use development build on physical device ([Section 6.4](#64-build-a-development-build-required-for-testing)) |
| `UNREGISTERED` token error | User uninstalled app or token expired | Automatic — Edge Function deletes stale tokens |
| Push works but no notification shown | Android notification channel issue | The Edge Function sets `channel_id: 'default'` — ensure Expo creates it |
| `FCM API is not enabled` | API disabled in Cloud Console | Enable at [Cloud Console](https://console.cloud.google.com/apis/library/fcm.googleapis.com?project=myvidyon-app) |
| Notification inserted but no push | `pg_net` extension not enabled or `on_notification_created` trigger missing | Run `CREATE EXTENSION IF NOT EXISTS pg_net;` and re-apply `push_trigger.sql` |

### Useful Debug Queries

```sql
-- 1. Check if pg_net extension is active
SELECT * FROM pg_extension WHERE extname = 'pg_net';

-- 2. List all registered push tokens
SELECT upt.user_id, p.name, upt.fcm_token, upt.platform, upt.last_used_at
FROM user_push_tokens upt
JOIN profiles p ON p.id = upt.user_id
ORDER BY upt.last_used_at DESC;

-- 3. Check recent notifications
SELECT id, user_id, title, type, is_read, created_at
FROM notifications
ORDER BY created_at DESC
LIMIT 10;

-- 4. Check pg_net request logs (for debugging webhook calls)
SELECT id, method, url, status_code, created
FROM net._http_response
ORDER BY created DESC
LIMIT 10;
```

---

## Appendix A: Play Store Description

Use this as your **Full Description** in Google Play Console:

```
MY VIDYON — The Complete Institutional ERP by UNAI Tech

MY VIDYON is a comprehensive Enterprise Resource Planning (ERP) solution designed exclusively for educational institutions. Built by UNAI Tech, it streamlines every aspect of institutional management into a single, elegant mobile application.

🎓 FOR STUDENTS
• View attendance records and daily status
• Access timetables and class schedules
• Receive exam results and grade reports instantly
• Read institutional announcements and notices
• Submit assignments digitally
• Track fee payment status

👨‍👩‍👦 FOR PARENTS
• Monitor your child's attendance in real-time
• Receive instant alerts for absences and security events
• View exam results and academic progress
• Track fee payment deadlines and overdue reminders
• Stay informed with institutional announcements

👨‍🏫 FOR FACULTY
• Mark and manage student attendance
• Create and publish exam results
• View and manage timetables
• Communicate with students and parents
• Manage assignments and submissions

🏫 FOR INSTITUTION ADMINISTRATORS
• Complete student and staff management
• Class and section organization
• Announcement broadcasting system
• Academic year promotion and transitions
• Fee management and payment tracking
• Canteen attendance and security monitoring
• Real-time analytics and dashboards

🔔 SMART NOTIFICATIONS
• Instant push notifications for all events
• Attendance alerts for parents
• Fee payment reminders
• Exam result announcements
• Timetable change updates
• Security alerts for unauthorized access

🔒 SECURE & RELIABLE
• Role-based access control (Student, Parent, Faculty, Admin, Accountant, Canteen)
• End-to-end data encryption
• Cloud-hosted with 99.9% uptime
• GDPR-compliant data handling

Built with ❤️ by UNAI Tech
```

---

## Appendix B: Content for App Store Assets

### Short Description (80 chars max)
```
Complete ERP solution for educational institutions by UNAI Tech
```

### App Category
```
Education → Education
```

### Tags / Keywords
```
ERP, school management, attendance, timetable, exam results, institution, 
student management, parent portal, fee management, UNAI Tech, MY VIDYON
```

### Privacy Policy Content Outline

Host on your website (e.g., `https://unaitech.com/privacy-policy`). Must include:

1. **Data Collection**: What data the app collects (name, email, phone, attendance records, exam scores, fees)
2. **Purpose of Data**: Used for institutional management, communication, and analytics
3. **Data Storage**: Stored on Supabase cloud servers (AWS infrastructure)
4. **Push Notifications**: Device tokens are collected for sending notifications via Firebase Cloud Messaging
5. **Third-Party Services**: Firebase (Google), Supabase, Expo
6. **Data Sharing**: Data is shared only within the institution's ecosystem (admin ↔ faculty ↔ parent ↔ student)
7. **Data Retention**: Data retained for the duration of enrollment; deleted upon request
8. **Contact Information**: UNAI Tech support email and address
9. **Children's Privacy**: Compliant with COPPA; parental consent obtained via institution enrollment

---

## Appendix C: Complete Setup Checklist

Use this checklist to track your progress:

### Firebase Console
- [ ] Access Firebase project `myvidyon-app`
- [ ] Verify FCM v1 API is enabled
- [ ] Verify Android app `com.myvidyon.app` exists
- [ ] Add SHA-1 fingerprints (debug + release)
- [ ] Download latest `google-services.json`
- [ ] Generate Firebase Service Account Key (JSON)

### Google Cloud Console
- [ ] Enable Firebase Cloud Messaging API
- [ ] Enable Firebase Installations API
- [ ] Enable IAM API
- [ ] Enable Token Service API
- [ ] Verify Service Account IAM roles
- [ ] Optionally restrict Android API key

### Google Play Console
- [ ] Create / access developer account ($25 fee)
- [ ] Create app listing for `MY VIDYON`
- [ ] Upload app icon (512×512)
- [ ] Upload feature graphic (1024×500)
- [ ] Upload screenshots (min 2)
- [ ] Fill short & full description
- [ ] Set privacy policy URL
- [ ] Complete content rating questionnaire
- [ ] Set up App Signing
- [ ] Link Firebase project

### Supabase
- [ ] Set `FIREBASE_SERVICE_ACCOUNT` secret (minified JSON)
- [ ] Deploy `send-push-notification` Edge Function
- [ ] Verify all notification triggers are active
- [ ] Verify `pg_net` extension is enabled

### App
- [ ] Verify `google-services.json` in project root
- [ ] Verify `app.json` has correct config
- [ ] Build development APK via EAS
- [ ] Test push notification end-to-end

---

> **Document Version**: 1.0
> **Created**: March 27, 2026
> **Author**: Auto-generated for UNAI Tech — MY VIDYON
> **Support**: Contact UNAI Tech development team for assistance
