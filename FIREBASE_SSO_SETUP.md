# Setting Up SSO Using Your Existing Firebase Project

Since you already have Firebase configured, you can use the **same Google Cloud project** to set up SSO. This is the easiest approach!

## Your Firebase Project
- **Project ID**: `mom-staging-417408`
- **Project Name**: mom-staging-417408

---

## Step-by-Step Guide

### Step 1: Go to Google Cloud Console

1. Open [Google Cloud Console](https://console.cloud.google.com/)
2. Make sure you're logged in with the same account that has access to your Firebase project
3. **Select your project**: `mom-staging-417408`
   - If you don't see it, click the project dropdown at the top
   - Search for "mom-staging-417408"

### Step 2: Configure OAuth Consent Screen (First Time Only)

1. In the left sidebar, go to **APIs & Services** → **OAuth consent screen**
2. If you haven't configured it before:
   - Choose **External** (for most cases) or **Internal** (if using Google Workspace)
   - Click **CREATE**
3. Fill in the required fields:
   - **App name**: `Potpie` (or your app name)
   - **User support email**: Your email
   - **Developer contact information**: Your email
4. Click **SAVE AND CONTINUE**
5. **Scopes** (Step 2):
   - Click **ADD OR REMOVE SCOPES**
   - Select: `email`, `profile`, `openid`
   - Click **UPDATE** → **SAVE AND CONTINUE**
6. **Test users** (Step 3 - for External apps):
   - Add test users if needed (for development)
   - Click **SAVE AND CONTINUE**
7. **Summary**: Review and click **BACK TO DASHBOARD**

### Step 3: Create OAuth 2.0 Client ID

1. Go to **APIs & Services** → **Credentials**
2. Click **+ CREATE CREDENTIALS** at the top
3. Select **OAuth client ID**

### Step 4: Configure OAuth Client

1. **Application type**: Select **Web application**
2. **Name**: Enter a name like `Potpie Web SSO Client`
3. **Authorized JavaScript origins**: Click **+ ADD URI** and add:
   ```
   http://localhost:3000
   ```
   (Add your production domain later: `https://your-domain.com`)
4. **Authorized redirect URIs**: Click **+ ADD URI** and add:
   ```
   http://localhost:3000
   ```
   (Add your production domain later: `https://your-domain.com`)
5. Click **CREATE**

### Step 5: Copy Your Client ID

After creating, you'll see a popup with:
- **Your Client ID** (looks like: `123456789-abcdefghijklmnop.apps.googleusercontent.com`)
- **Your Client Secret** (you don't need this for frontend)

**Copy the Client ID** - you'll need it in the next step.

### Step 6: Add to Your .env File

Open `potpie-ui/.env` and add:

```bash
NEXT_PUBLIC_GOOGLE_SSO_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
```

Replace `your-client-id-here.apps.googleusercontent.com` with the actual Client ID you copied.

### Step 7: Restart Your Development Server

```bash
cd potpie-ui
pnpm run dev
```

---

## Quick Reference

**Your Firebase Project**: `mom-staging-417408`

**Where to go in Google Cloud Console**:
1. Select project: `mom-staging-417408`
2. APIs & Services → OAuth consent screen (configure once)
3. APIs & Services → Credentials → Create OAuth client ID

**What you need**:
- OAuth Client ID (for `.env` file)
- Client Secret (NOT needed for frontend)

---

## Troubleshooting

### "Project not found"
- Make sure you're logged in with the correct Google account
- Check that you have access to the Firebase project
- Try accessing Firebase Console first to verify access

### "redirect_uri_mismatch" error
- Make sure `http://localhost:3000` is added to both:
  - Authorized JavaScript origins
  - Authorized redirect URIs
- Check for typos (no trailing slashes, exact match)

### "Access blocked: This app's request is invalid"
- OAuth consent screen might not be configured
- Go back to Step 2 and complete the consent screen setup
- For external apps, make sure test users are added

---

## Production Setup

When deploying to production:

1. **Add production domains** to OAuth client:
   - Authorized JavaScript origins: `https://your-domain.com`
   - Authorized redirect URIs: `https://your-domain.com`

2. **Publish your OAuth app** (if using External type):
   - Go to OAuth consent screen
   - Click "PUBLISH APP"
   - This makes it available to all users (not just test users)

3. **Update environment variables** in your hosting platform:
   - Vercel, Netlify, etc. have environment variable settings
   - Add `NEXT_PUBLIC_GOOGLE_SSO_CLIENT_ID` with your Client ID

---

## Benefits of Using Same Project

✅ **No new project needed** - Everything in one place  
✅ **Same billing** - Uses existing Google Cloud project  
✅ **Easier management** - All credentials in one project  
✅ **Consistent permissions** - Same team access  

---

## Next Steps

After setting up:
1. Test SSO login on your sign-in/sign-up pages
2. Verify it works with your email
3. Add production domains when ready to deploy

Need help? Check the main `SSO_SETUP_GUIDE.md` for more details.

