# Getting OAuth Client ID from Firebase Console

Since you have Firebase set up, here's how to get the OAuth Client ID for SSO.

## Method 1: Get Existing OAuth Credentials (If Google Sign-in is Enabled)

### Step 1: Go to Firebase Console Project Settings

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `mom-staging-417408`
3. Click the **⚙️ Settings icon** (gear icon) in the top left
4. Select **Project settings**

### Step 2: Find OAuth Credentials

1. Scroll down to the **Your apps** section
2. If you have a web app configured, click on it
3. Look for **OAuth redirect domains** or **Authorized domains**
4. You might see OAuth client IDs listed here

**OR**

### Step 3: Go to Google Cloud Console (Recommended)

Firebase uses Google Cloud Platform under the hood. The OAuth credentials are stored in Google Cloud Console:

1. In Firebase Console, go to **Project settings**
2. Scroll to the bottom
3. Click **"Open in Google Cloud Console"** or go directly to: https://console.cloud.google.com/
4. Make sure you select project: `mom-staging-417408`

### Step 4: Find or Create OAuth Client ID

1. In Google Cloud Console, go to **APIs & Services** → **Credentials**
2. You'll see a list of OAuth 2.0 Client IDs
3. Look for one that says **"Web client"** or **"Web application"**
   - Firebase might have created one automatically
   - It might be named something like "Firebase Web App" or your app name

4. **If you find one:**
   - Click on it to view details
   - Copy the **Client ID** (looks like: `123456789-abc...apps.googleusercontent.com`)
   - Check if `http://localhost:3000` is in the **Authorized redirect URIs**
   - If not, edit it and add `http://localhost:3000`

5. **If you don't find one or need a new one:**
   - Click **+ CREATE CREDENTIALS** → **OAuth client ID**
   - Application type: **Web application**
   - Name: `Potpie SSO Client`
   - Authorized JavaScript origins: `http://localhost:3000`
   - Authorized redirect URIs: `http://localhost:3000`
   - Click **CREATE**
   - Copy the Client ID

---

## Method 2: Enable Google Sign-in in Firebase (Alternative)

If you want to use Firebase's built-in Google authentication instead:

1. In Firebase Console, go to **Authentication** → **Sign-in method**
2. Click on **Google** provider
3. Enable it
4. Add your support email
5. Click **Save**

However, **this won't give you the OAuth Client ID directly** - you'll still need to go to Google Cloud Console to get it.

---

## Method 3: Direct Link to Your Project's Credentials

Since your project ID is `mom-staging-417408`, you can go directly to:

**Google Cloud Console Credentials:**
https://console.cloud.google.com/apis/credentials?project=mom-staging-417408

This will show you all OAuth credentials for your Firebase project.

---

## What You Need

You need the **OAuth 2.0 Client ID** (not the Client Secret).

It looks like:
```
123456789-abcdefghijklmnopqrstuvwxyz123456.apps.googleusercontent.com
```

---

## Add to .env File

Once you have the Client ID:

1. Open `potpie-ui/.env`
2. Add or update:
   ```bash
   NEXT_PUBLIC_GOOGLE_SSO_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
   ```

3. Restart your dev server:
   ```bash
   pnpm run dev
   ```

---

## Quick Checklist

- [ ] Go to Google Cloud Console
- [ ] Select project: `mom-staging-417408`
- [ ] Go to APIs & Services → Credentials
- [ ] Find or create OAuth 2.0 Client ID
- [ ] Make sure `http://localhost:3000` is in redirect URIs
- [ ] Copy the Client ID
- [ ] Add to `.env` file
- [ ] Restart dev server

---

## Troubleshooting

**"I don't see any OAuth credentials"**
- Firebase might not have created them yet
- Create a new one following Method 1, Step 4

**"redirect_uri_mismatch error"**
- Make sure `http://localhost:3000` is added to Authorized redirect URIs
- Check for typos (no trailing slash)

**"Can't access Google Cloud Console"**
- Make sure you're logged in with the same account that has Firebase access
- You might need to be added as a project member with appropriate permissions

---

## Direct Links for Your Project

- **Firebase Console**: https://console.firebase.google.com/project/mom-staging-417408
- **Google Cloud Console**: https://console.cloud.google.com/?project=mom-staging-417408
- **OAuth Credentials**: https://console.cloud.google.com/apis/credentials?project=mom-staging-417408

