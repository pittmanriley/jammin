// Spotify API configuration
export const spotifyConfig = {
  clientId: "21d17026bbe0430697c7be4554663b36", // Replace with your Spotify Client ID
  clientSecret: "f4e7492097e94320a8727f0720ca5ad7", // Replace with your Spotify Client Secret
  redirectUri: "exp://192.168.4.91:8082", // This will be used in the OAuth flow
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
  // Add any additional configuration as needed
};

// Instructions for setting up Spotify Developer account:
// 1. Go to https://developer.spotify.com/dashboard
// 2. Log in with your Spotify account
// 3. Create a new app
// 4. Set the redirect URI to 'jammin://auth/callback' in the app settings
// 5. Copy the Client ID and Client Secret to this file
