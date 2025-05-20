import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { useAuthRequest, makeRedirectUri } from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import Ionicons from "react-native-vector-icons/Ionicons";
import { spotifyConfig } from "../../spotifyConfig";
import { theme } from "../../theme/theme";

// Ensure the redirect works properly with WebBrowser
WebBrowser.maybeCompleteAuthSession();

// Token storage keys - using only alphanumeric characters for SecureStore
const ACCESS_TOKEN_KEY = "spotify_access_token";
const REFRESH_TOKEN_KEY = "spotify_refresh_token";
const TOKEN_EXPIRY_KEY = "spotify_token_expiry";

export default function SpotifyAuth() {
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState(null);
  const navigation = useNavigation();

  // Generate a redirect URI using expo-auth-session's helper
  const redirectUri = makeRedirectUri({
    useProxy: true,
  });

  console.log("Generated redirect URI:", redirectUri);

  // Set up the auth request using useAuthRequest hook
  const [request, response, promptAsync] = useAuthRequest(
    {
      clientId: spotifyConfig.clientId,
      scopes: spotifyConfig.scopes,
      // This is important: code is required for the token exchange
      responseType: "code",
      // Enable PKCE (Proof Key for Code Exchange) for extra security
      usePKCE: true,
      redirectUri,
    },
    spotifyConfig.discovery
  );

  // Check if already authenticated on component mount
  useEffect(() => {
    checkSpotifyConnection();
  }, []);

  // Handle the response from the authentication request
  useEffect(() => {
    if (response?.type === "success" && response.params.code) {
      const { code } = response.params;
      console.log("Received auth code, length:", code.length);

      // Exchange the code for an access token
      exchangeCodeForToken(code);
    } else if (response?.type === "error") {
      console.error("Authentication error:", response.error);
      Alert.alert(
        "Authentication Error",
        "There was a problem connecting to Spotify."
      );
      setLoading(false);
    }
  }, [response]);

  /**
   * Check if the user is already connected to Spotify
   */
  const checkSpotifyConnection = async () => {
    try {
      setLoading(true);

      // Get the access token from secure storage
      const accessToken = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);

      if (accessToken) {
        console.log("Found access token, checking if it works...");

        try {
          // Test the token by fetching user profile
          const response = await fetch("https://api.spotify.com/v1/me", {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          });

          if (response.ok) {
            console.log("Spotify connection confirmed");
            // Successfully verified the token works
            navigation.replace("MainTabs");
            return;
          } else {
            console.log("Access token expired or invalid");
            // Token is invalid, clear it
            await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
          }
        } catch (error) {
          console.error("Error verifying access token:", error);
          // Clear the invalid token
          await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
        }
      }

      console.log("No active Spotify connection, showing connect screen");
      setLoading(false);
    } catch (error) {
      console.error("Error checking Spotify connection:", error);
      setLoading(false);
    }
  };

  /**
   * Exchange authorization code for access token
   */
  const exchangeCodeForToken = async (code) => {
    try {
      if (!request?.codeVerifier) {
        throw new Error(
          "No code verifier available. This is required for PKCE flow."
        );
      }

      setLoading(true);
      console.log("Exchanging authorization code for token...");

      // Create the body for the token request
      const tokenRequestBody = new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        client_id: spotifyConfig.clientId,
        // This is the critical parameter that was missing!
        code_verifier: request.codeVerifier,
      });

      console.log("Using code_verifier from PKCE flow");
      console.log(
        "Token request params:",
        tokenRequestBody.toString().substring(0, 100) + "..."
      );
      console.log("Using redirect URI:", redirectUri);

      // Make the token exchange request
      const response = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: tokenRequestBody.toString(),
      });

      const responseText = await response.text();
      console.log("Token response status:", response.status);

      if (!response.ok) {
        console.error("Token exchange error:", responseText);
        throw new Error(`Token exchange failed: ${responseText}`);
      }

      // Parse the JSON response
      const tokenData = JSON.parse(responseText);
      console.log("Token exchange successful!");

      // Store tokens in secure storage
      await storeTokenData(tokenData);

      // Navigate to the main app
      navigation.replace("MainTabs");
    } catch (error) {
      console.error("Error in token exchange:", error);
      setLoading(false);
      Alert.alert(
        "Authentication Error",
        "Failed to complete Spotify authentication. Please try again."
      );
    }
  };

  /**
   * Store token data securely
   */
  const storeTokenData = async (tokenData) => {
    try {
      const { access_token, refresh_token, expires_in } = tokenData;

      // Calculate expiry time
      const expiryTime = new Date().getTime() + expires_in * 1000;

      // Store tokens securely
      await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, access_token);

      if (refresh_token) {
        await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refresh_token);
      }

      await SecureStore.setItemAsync(TOKEN_EXPIRY_KEY, expiryTime.toString());
      console.log("Tokens stored successfully");
      return true;
    } catch (error) {
      console.error("Error storing tokens:", error);
      return false;
    }
  };

  /**
   * Handle the connect to Spotify button press
   */
  const handleConnectSpotify = async () => {
    try {
      console.log("Starting Spotify authentication...");

      // Start the authentication process
      await promptAsync();
    } catch (error) {
      console.error("Error starting Spotify auth:", error);
      Alert.alert("Error", "Failed to connect to Spotify. Please try again.");
    }
  };

  const handleSkip = () => {
    // Allow users to skip Spotify connection for now
    navigation.replace("MainTabs");
  };

  // Loading screen
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.button.primary} />
        <Text style={styles.loadingText}>Connecting to Spotify...</Text>
      </View>
    );
  }

  // Main screen with Spotify connection button
  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.headerText}>Connect to Spotify</Text>
        <Text style={styles.subHeaderText}>
          Enhance your experience by connecting your Spotify account
        </Text>
      </View>

      <View style={styles.spotifyLogoContainer}>
        <Image
          source={require("../../assets/spotify-logo.png")}
          style={styles.spotifyLogo}
          resizeMode="contain"
        />
      </View>

      <View style={styles.featuresContainer}>
        <Text style={styles.featuresHeader}>You'll be able to:</Text>
        <View style={styles.featureItem}>
          <Ionicons
            name="musical-notes"
            size={24}
            color={theme.button.primary}
          />
          <Text style={styles.featureText}>Share your favorite songs</Text>
        </View>
        <View style={styles.featureItem}>
          <Ionicons name="people" size={24} color={theme.button.primary} />
          <Text style={styles.featureText}>
            See what friends are listening to
          </Text>
        </View>
        <View style={styles.featureItem}>
          <Ionicons name="disc" size={24} color={theme.button.primary} />
          <Text style={styles.featureText}>Discover new music</Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.connectButton}
        onPress={handleConnectSpotify}
      >
        <Text style={styles.connectButtonText}>Connect with Spotify</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
        <Text style={styles.skipButtonText}>Skip for now</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background.primary,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: theme.background.primary,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: theme.text.primary,
  },
  headerContainer: {
    alignItems: "center",
    marginBottom: 30,
  },
  headerText: {
    fontSize: 26,
    fontWeight: "bold",
    color: theme.text.primary,
    marginBottom: 10,
  },
  subHeaderText: {
    fontSize: 16,
    color: theme.text.secondary,
    textAlign: "center",
  },
  spotifyLogoContainer: {
    marginBottom: 30,
    alignItems: "center",
  },
  spotifyLogo: {
    width: 200,
    height: 60,
  },
  featuresContainer: {
    width: "100%",
    marginBottom: 30,
  },
  featuresHeader: {
    fontSize: 18,
    fontWeight: "bold",
    color: theme.text.primary,
    marginBottom: 15,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  featureText: {
    fontSize: 16,
    color: theme.text.primary,
    marginLeft: 10,
  },
  connectButton: {
    backgroundColor: theme.button.primary,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 25,
    width: "100%",
    alignItems: "center",
    marginBottom: 15,
  },
  connectButtonText: {
    color: theme.text.primary,
    fontSize: 16,
    fontWeight: "bold",
  },
  skipButton: {
    paddingVertical: 10,
  },
  skipButtonText: {
    color: theme.text.secondary,
    fontSize: 16,
  },
});
