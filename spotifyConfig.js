/**
 * Spotify API configuration
 * This file contains all the settings needed for Spotify authentication
 */
export const spotifyConfig = {
  // Your Spotify application credentials
  clientId: "21d17026bbe0430697c7be4554663b36",
  
  // Authentication endpoints
  discovery: {
    authorizationEndpoint: "https://accounts.spotify.com/authorize",
    tokenEndpoint: "https://accounts.spotify.com/api/token",
  },
  
  // Proxy settings for expo-auth-session
  // This allows proper redirect handling during development
  useProxy: true,
  
  // Spotify API base URL
  apiBaseUrl: "https://api.spotify.com/v1",

  scopes: [
    "user-read-private",
    "user-read-email",
    "user-top-read",
    "user-read-recently-played",
    "user-library-read",
    "playlist-read-private",
    "playlist-read-collaborative",
    "user-read-currently-playing",
    "user-read-playback-state",
  ],
};

// IMPORTANT SETUP INSTRUCTIONS FOR SPOTIFY DEVELOPER DASHBOARD:
// 1. Go to https://developer.spotify.com/dashboard
// 2. Log in with your Spotify account and select your app
// 3. Click "Edit Settings"
// 4. Add ALL of these Redirect URIs:
//    - exp://localhost:19000
//    - exp://127.0.0.1:19000
//    - exp://192.168.1.X:19000 (replace X with your local IP address)
//    - jammin://
//    - https://auth.expo.io/@pittmanriley/jammin
// 5. Save changes
//
// SETUP INSTRUCTIONS FOR YOUR FRIENDS:
// 1. They need a Spotify account
// 2. You need to add their Spotify email addresses as users in your Spotify Dashboard
//    (Go to your app in the dashboard -> Users and Access -> Add New User)
// 3. They need to clone your repository and run it with Expo Go
// 4. No need to change any code - the authentication will work automatically
