import React, { useEffect } from "react";
import { Platform } from "react-native";
import RootNavigator from "./navigation/RootNavigator";
import * as spotifyService from "./services/spotifyService";
import * as Linking from 'expo-linking';

export default function App() {
  useEffect(() => {
    // Set up deep link handling
    const handleDeepLink = async (event) => {
      const url = event.url;
      console.log('Deep link received:', url);
      
      // Check if this is a Spotify auth callback or any URL with a code parameter
      if (url && url.includes('code=')) {
        try {
          // Extract the authorization code from the URL
          const code = url.split('code=')[1]?.split('&')[0];
          
          if (code) {
            console.log('Authorization code received:', code);
            // Handle the authorization code
            try {
              console.log('Exchanging code for token...');
              const tokenData = await spotifyService.exchangeCodeForToken(code);
              console.log('Token exchange successful:', tokenData ? 'Token received' : 'No token data');
              
              // Check if the user is now connected
              const isConnected = await spotifyService.isSpotifyConnected();
              console.log('Is user connected to Spotify after token exchange:', isConnected);
              
              // If connected, navigate to MainTabs
              if (isConnected) {
                // We need to use navigation to navigate to MainTabs
                // But since we're in App.js, we don't have direct access to navigation
                // So we'll use a global event to notify SpotifyAuth screen to navigate
                console.log('User is connected to Spotify, should navigate to MainTabs');
                
                // Set a flag in AsyncStorage that SpotifyAuth can check
                try {
                  const AsyncStorage = require('@react-native-async-storage/async-storage').default;
                  await AsyncStorage.setItem('spotify_auth_successful', 'true');
                  console.log('Set spotify_auth_successful flag in AsyncStorage');
                } catch (storageError) {
                  console.error('Error setting auth success flag:', storageError);
                }
              }
            } catch (tokenError) {
              console.error('Error exchanging code for token:', tokenError);
            }
          } else {
            console.error('No authorization code found in URL:', url);
          }
        } catch (error) {
          console.error('Error handling Spotify auth callback:', error);
        }
      }
    };

    // Add event listener for deep links
    const subscription = Linking.addEventListener('url', handleDeepLink);

    // Check for initial URL (app opened via deep link)
    Linking.getInitialURL().then(url => {
      if (url) {
        console.log('App opened with URL:', url);
        handleDeepLink({ url });
      }
    });

    // Clean up subscription on unmount
    return () => {
      subscription.remove();
    };
  }, []);

  return <RootNavigator />;
}
