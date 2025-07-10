# Firebase Setup for Multiplayer Chat

To enable real-time multiplayer chat across different devices and locations, follow these steps:

## 1. Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project"
3. Name your project (e.g., "level-up-workout")
4. Enable Google Analytics (optional)
5. Click "Create project"

## 2. Set up Realtime Database

1. In your Firebase project, go to "Realtime Database"
2. Click "Create Database"
3. Choose "Start in test mode" (for now)
4. Select a location (choose closest to your users)

## 3. Get Your Firebase Configuration

1. Go to Project Settings (gear icon)
2. Scroll down to "Your apps"
3. Click "Web" icon to add a web app
4. Register your app with a name
5. Copy the Firebase config object

## 4. Update Your App

Replace the Firebase config in `script-github.js` (around line 17) with your actual config:

```javascript
const firebaseConfig = {
    apiKey: "your-actual-api-key",
    authDomain: "your-project.firebaseapp.com",
    databaseURL: "https://your-project-default-rtdb.firebaseio.com/",
    projectId: "your-project-id",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "your-sender-id",
    appId: "your-app-id"
};
```

## 5. Security Rules (Important!)

In Firebase Console > Realtime Database > Rules, use these rules for testing:

```json
{
  "rules": {
    "chats": {
      "$roomId": {
        ".read": true,
        ".write": true
      }
    }
  }
}
```

⚠️ **Note**: These rules allow anyone to read/write. For production, implement proper authentication and security rules.

## 6. Deploy and Test

1. Push your changes to GitHub
2. Your GitHub Pages site will automatically update
3. Share the link with friends in different locations
4. Test the live chat!

## Demo Configuration

For testing purposes, I've included a demo Firebase configuration that should work immediately. However, for production use, please create your own Firebase project for better security and control.

## Troubleshooting

- If chat doesn't work, check the browser console for errors
- Make sure Firebase SDK loads properly
- Verify your database rules allow read/write access
- Test with different browsers/devices to confirm cross-device functionality

## Features Enabled

✅ **Real-time messaging** across all devices and locations  
✅ **Room-based chat** (users only see messages from their room)  
✅ **Message history** (last 50 messages preserved)  
✅ **System notifications** for user joins/leaves  
✅ **Automatic fallback** to localStorage if Firebase fails  
