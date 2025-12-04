# Firebase Setup Guide

This guide will help you set up Firebase for the staff calling system.

## Step 1: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" or select an existing project
3. Follow the setup wizard to create your project
4. Once created, you'll be redirected to your project dashboard

## Step 2: Enable Realtime Database

1. In the Firebase Console, click on "Realtime Database" in the left sidebar
2. Click "Create Database"
3. Choose a location (preferably close to your users)
4. Start in **test mode** for development (you can secure it later)
5. Click "Enable"

## Step 3: Get Your Firebase Configuration

1. In the Firebase Console, click the gear icon (⚙️) next to "Project Overview"
2. Select "Project settings"
3. Scroll down to "Your apps" section
4. Click the web icon (`</>`) to add a web app
5. Register your app with a nickname (e.g., "Restaurant App")
6. Copy the `firebaseConfig` object

## Step 4: Configure Environment Variables

Create a `.env.local` file in the `frontend` directory with the following content:

```bash
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://your_project_id-default-rtdb.firebaseio.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Backend URL (already configured)
NEXT_PUBLIC_BACKEND_URL=http://localhost:5000/api
```

Replace the placeholder values with your actual Firebase configuration values.

## Step 5: Restart the Development Server

After adding the environment variables, restart your Next.js development server:

```bash
# Stop the current server (Ctrl+C)
# Then restart it
npm run dev
```

## Step 6: Test the System

1. Open `http://localhost:3000/order?table=1`
2. Click the "Call Staff" button
3. Open `http://localhost:3000/` in another tab
4. You should see the staff call appear in the Staff Calls Panel
5. Click "Respond" to clear the call

## Security Rules (Production)

For production, update your Realtime Database rules:

```json
{
  "rules": {
    "staffCalls": {
      ".read": true,
      ".write": true,
      "$callId": {
        ".validate": "newData.hasChildren(['tableNumber', 'timestamp', 'status'])"
      }
    }
  }
}
```

## Troubleshooting

- **Firebase not connecting**: Check that all environment variables are set correctly
- **Permission denied**: Make sure your Realtime Database is in test mode or has appropriate rules
- **Data not updating**: Check the browser console for errors and verify the database URL is correct

