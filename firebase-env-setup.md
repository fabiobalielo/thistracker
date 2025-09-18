# Firebase Environment Variables Setup

## Required Environment Variables

You need to set these environment variables in Firebase Functions:

### 1. Google OAuth Configuration
- `GOOGLE_CLIENT_ID` - Your Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` - Your Google OAuth client secret

### 2. NextAuth Configuration
- `NEXTAUTH_URL` - Your Firebase hosting URL (will be set after deployment)
- `NEXTAUTH_SECRET` - A random secret for NextAuth

### 3. Google Sheets Configuration
- `GOOGLE_SHEETS_SPREADSHEET_ID` - Your Google Sheets spreadsheet ID

## Setting Environment Variables in Firebase

Run these commands to set the environment variables:

```bash
# Set Google OAuth credentials
firebase functions:config:set google.client_id="your_google_client_id_here"
firebase functions:config:set google.client_secret="your_google_client_secret_here"

# Set NextAuth configuration
firebase functions:config:set nextauth.url="https://thistracker.web.app"
firebase functions:config:set nextauth.secret="your_nextauth_secret_here"

# Set Google Sheets configuration
firebase functions:config:set sheets.spreadsheet_id="your_spreadsheet_id_here"
```

## After Deployment

Once deployed, your app will be available at:
- https://thistracker.web.app
- https://thistracker.firebaseapp.com

Update the `NEXTAUTH_URL` to match your deployed URL.

