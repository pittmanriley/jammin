import React, { useEffect, useState } from "react";
import { Platform, AppState } from "react-native";
import RootNavigator from "./navigation/RootNavigator";
import * as spotifyService from "./services/spotifyService";
import * as Linking from "expo-linking";
import * as SecureStore from "expo-secure-store";
import { SpotifyStatsProvider } from "./contexts/SpotifyStatsContext";

export default function App() {
  const [listeningStats, setListeningStats] = useState(null);

  // Refresh Spotify listening stats on app startup and when app returns to foreground
  useEffect(() => {
    // Function to refresh stats
    const refreshStats = async () => {
      try {
        // Check if the user is connected to Spotify
        const isConnected = await spotifyService.isSpotifyConnected();
        if (isConnected) {
          console.log("Refreshing Spotify listening stats...");
          const stats = await spotifyService.refreshListeningStats();
          setListeningStats(stats);
          console.log("Spotify stats refreshed successfully");
        }
      } catch (error) {
        console.error("Error refreshing Spotify stats:", error);
      }
    };

    // Refresh stats on startup
    refreshStats();

    // Set up AppState listener to refresh when app comes back to foreground
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "active") {
        console.log("App has come to the foreground, refreshing stats...");
        refreshStats();
      }
    });

    // Clean up subscription on unmount
    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    // Set up deep link handling
    const handleDeepLink = async (event) => {
      const url = event.url;
      console.log("Deep link received:", url);

      // Check if this is a Spotify auth callback or any URL with a code parameter
      if (url && url.includes("code=")) {
        try {
          // Extract the authorization code from the URL
          const code = url.split("code=")[1]?.split("&")[0];

          if (code) {
            console.log("Authorization code received:", code);
            // Handle the authorization code
            try {
              console.log("Exchanging code for token...");
              const tokenData = await spotifyService.exchangeCodeForToken(code);
              console.log(
                "Token exchange successful:",
                tokenData ? "Token received" : "No token data"
              );

              // Check if the user is now connected
              const isConnected = await spotifyService.isSpotifyConnected();
              console.log(
                "Is user connected to Spotify after token exchange:",
                isConnected
              );

              // If connected, navigate to MainTabs
              if (isConnected) {
                // We need to use navigation to navigate to MainTabs
                // But since we're in App.js, we don't have direct access to navigation
                // So we'll use a global event to notify SpotifyAuth screen to navigate
                console.log(
                  "User is connected to Spotify, should navigate to MainTabs"
                );

                // Set a flag in AsyncStorage that SpotifyAuth can check
                try {
                  const AsyncStorage =
                    require("@react-native-async-storage/async-storage").default;
                  await AsyncStorage.setItem("spotify_auth_successful", "true");
                  console.log(
                    "Set spotify_auth_successful flag in AsyncStorage"
                  );
                } catch (storageError) {
                  console.error(
                    "Error setting auth success flag:",
                    storageError
                  );
                }
              }
            } catch (tokenError) {
              console.error("Error exchanging code for token:", tokenError);
            }
          } else {
            console.error("No authorization code found in URL:", url);
          }
        } catch (error) {
          console.error("Error handling Spotify auth callback:", error);
        }
      }
    };

    // Add event listener for deep links
    const subscription = Linking.addEventListener("url", handleDeepLink);

    // Check for initial URL (app opened via deep link)
    Linking.getInitialURL().then((url) => {
      if (url) {
        console.log("App opened with URL:", url);
        handleDeepLink({ url });
      }
    });

    // Clean up subscription on unmount
    return () => {
      subscription.remove();
    };
  }, []);

  // Wrap the app with the SpotifyStatsProvider to make stats available throughout the app
  return (
    <SpotifyStatsProvider>
      <RootNavigator />
    </SpotifyStatsProvider>
  );
}
