import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Alert,
  Linking,
} from "react-native";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WebView } from "react-native-webview";
import { useNavigation } from "@react-navigation/native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { colors } from "../theme/colors";
import {
  getAuthorizationUrl,
  exchangeCodeForToken,
  isSpotifyConnected,
} from "../services/spotifyService";

// Token storage keys - using only alphanumeric characters for SecureStore
const ACCESS_TOKEN_KEY = "spotify_access_token";
const REFRESH_TOKEN_KEY = "spotify_refresh_token";
const TOKEN_EXPIRY_KEY = "spotify_token_expiry";

export default function SpotifyAuth() {
  const [loading, setLoading] = useState(true);
  const [showWebView, setShowWebView] = useState(false);
  const [authUrl, setAuthUrl] = useState("");
  const navigation = useNavigation();

  useEffect(() => {
    checkSpotifyConnection();
    
    // Set up polling to check for authentication success every 2 seconds
    const authCheckInterval = setInterval(() => {
      if (!loading) {
        checkSpotifyConnection();
      }
    }, 2000);
    
    // Clean up interval on unmount
    return () => clearInterval(authCheckInterval);
  }, [loading]);

  const checkSpotifyConnection = async () => {
    try {
      // Check if we have a successful authentication flag from the deep link handling
      const authSuccessful = await AsyncStorage.getItem('spotify_auth_successful');
      
      // Check if user is connected to Spotify
      const connected = await isSpotifyConnected();
      
      console.log('Auth successful flag:', authSuccessful);
      console.log('Is connected to Spotify:', connected);
      
      if (connected || authSuccessful === 'true') {
        // Clear the flag
        if (authSuccessful === 'true') {
          await AsyncStorage.removeItem('spotify_auth_successful');
          console.log('Cleared spotify_auth_successful flag');
        }
        
        // User is connected to Spotify, navigate to main tabs
        console.log('Navigating to MainTabs');
        navigation.replace("MainTabs");
      } else {
        setLoading(false);
      }
    } catch (error) {
      console.error("Error checking Spotify connection:", error);
      setLoading(false);
    }
  };

  // Try using external browser approach as a fallback
  const handleConnectWithExternalBrowser = async () => {
    try {
      setLoading(true);
      const url = getAuthorizationUrl();
      console.log('Opening Spotify auth URL in external browser:', url);
      
      // Open the URL in the device browser
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
        
        // Show a message to the user
        Alert.alert(
          "Spotify Authentication",
          "Please complete the authentication in your browser. The app will automatically continue once you're done."
        );
        
        // Set up a polling mechanism to check if the user has been connected
        const checkConnectionInterval = setInterval(async () => {
          try {
            const connected = await isSpotifyConnected();
            console.log('Checking if connected to Spotify:', connected);
            
            if (connected) {
              clearInterval(checkConnectionInterval);
              // Navigate to main tabs
              navigation.replace("MainTabs");
            }
          } catch (error) {
            console.error('Error checking Spotify connection:', error);
          }
        }, 3000); // Check every 3 seconds
        
        // Clear the interval after 2 minutes to avoid infinite checking
        setTimeout(() => {
          clearInterval(checkConnectionInterval);
          setLoading(false);
        }, 120000); // 2 minutes timeout
        
      } else {
        throw new Error('Cannot open URL: ' + url);
      }
    } catch (error) {
      console.error("Error in external browser auth:", error);
      Alert.alert(
        "Connection Error",
        "There was a problem connecting to Spotify. Please try again."
      );
      setLoading(false);
    }
  };

  const handleConnectSpotify = () => {
    try {
      const url = getAuthorizationUrl();
      setAuthUrl(url);
      setShowWebView(true);
    } catch (error) {
      console.error("Error getting authorization URL:", error);
      Alert.alert("Error", "Failed to connect to Spotify. Please try again.");
    }
  };

  const handleAuthorizationCode = async (code) => {
    try {
      setLoading(true);
      
      // Exchange the code for an access token
      await exchangeCodeForToken(code);

      // Navigate to main tabs
      navigation.replace("MainTabs");
    } catch (error) {
      console.error("Error exchanging code for token:", error);
      Alert.alert(
        "Error",
        "Failed to authenticate with Spotify. Please try again."
      );
      setLoading(false);
    }
  };

  const handleNavigationStateChange = async (navState) => {
    console.log('Navigation state changed:', navState.url);
    
    // Check if the URL contains the redirect URI with a code parameter
    if (
      navState.url.includes("jammin://auth/callback") ||
      (navState.url.includes("spotify") && navState.url.includes("code="))
    ) {
      setShowWebView(false);
      setLoading(true);

      try {
        // Extract the authorization code from the URL
        let code;
        if (navState.url.includes("code=")) {
          code = navState.url.split("code=")[1].split("&")[0];
        }
        
        if (!code) {
          throw new Error('Authorization code not found in URL');
        }

        console.log('Authorization code obtained, exchanging for token...');
        
        await handleAuthorizationCode(code);
      } catch (error) {
        console.error("Error processing authorization code:", error);
        setLoading(false);
        Alert.alert("Error", "Failed to process Spotify authorization.");
      }
    } else if (navState.url.includes("error=")) {
      // Handle authentication errors
      setShowWebView(false);
      setLoading(false);
      
      const errorMsg = navState.url.includes("error_description=") 
        ? decodeURIComponent(navState.url.split("error_description=")[1].split("&")[0])
        : "Authentication was canceled or failed";
        
      Alert.alert("Authentication Error", errorMsg);
    }
  };

  const handleSkip = () => {
    // Allow users to skip Spotify connection for now
    navigation.replace("MainTabs");
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.button.primary} />
        <Text style={styles.loadingText}>Connecting to Spotify...</Text>
      </View>
    );
  }
  
  // JavaScript to inject into the WebView to help with button clicks
  const injectedJavaScript = `
    (function() {
      // Helper function to find buttons by text content or class
      function findButton(text) {
        // Try to find by text content
        const buttons = Array.from(document.querySelectorAll('button'));
        for (let button of buttons) {
          if (button.textContent.trim().toLowerCase().includes(text.toLowerCase())) {
            return button;
          }
        }
        
        // Try to find by class or id containing the text
        const elements = Array.from(document.querySelectorAll('*'));
        for (let element of elements) {
          if (element.className && element.className.toLowerCase().includes(text.toLowerCase()) ||
              element.id && element.id.toLowerCase().includes(text.toLowerCase())) {
            return element;
          }
        }
        
        return null;
      }

      // Function to create a floating button overlay
      function createOverlayButton(text, top, callback) {
        const button = document.createElement('button');
        button.textContent = text;
        button.style.position = 'fixed';
        button.style.top = top + 'px';
        button.style.right = '10px';
        button.style.zIndex = '9999';
        button.style.padding = '10px';
        button.style.backgroundColor = '#1DB954';
        button.style.color = 'white';
        button.style.border = 'none';
        button.style.borderRadius = '5px';
        button.style.fontWeight = 'bold';
        button.addEventListener('click', callback);
        document.body.appendChild(button);
        return button;
      }

      // Function to simulate a click on the Agree button
      function simulateAgreeClick() {
        const agreeButton = findButton('agree');
        if (agreeButton) {
          console.log('Found Agree button, clicking it');
          agreeButton.click();
        } else {
          console.log('Agree button not found');
        }
      }

      // Create overlay buttons after a delay to ensure the page is loaded
      setTimeout(() => {
        // Add a custom Agree button overlay
        createOverlayButton('Force Agree', 100, simulateAgreeClick);
        
        // Also try to automatically click the button
        simulateAgreeClick();
        
        // Monitor for form submission
        const forms = document.querySelectorAll('form');
        forms.forEach(form => {
          form.addEventListener('submit', function(e) {
            console.log('Form submitted');
          });
        });
        
        // Monitor all click events on the page
        document.addEventListener('click', function(e) {
          console.log('Element clicked:', e.target.tagName, e.target.className || 'no-class');
        }, true);
      }, 1500);
    })();
  `;

  if (showWebView) {
    return (
      <View style={{ flex: 1 }}>
        <WebView
          source={{ uri: authUrl }}
          onNavigationStateChange={handleNavigationStateChange}
          startInLoadingState={true}
          renderLoading={() => (
            <View style={styles.webViewLoading}>
              <ActivityIndicator size="large" color={colors.button.primary} />
            </View>
          )}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          thirdPartyCookiesEnabled={true}
          sharedCookiesEnabled={true}
          userAgent="Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1"
          injectedJavaScript={injectedJavaScript}
          onMessage={(event) => {
            console.log('Message from WebView:', event.nativeEvent.data);
          }}
          onError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            console.error('WebView error: ', nativeEvent);
            Alert.alert('WebView Error', 'There was a problem loading the authentication page. Please try again.');
          }}
          onHttpError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            console.error('WebView HTTP error:', nativeEvent.statusCode);
          }}
          incognito={true} // Use incognito mode to avoid cookie issues
          cacheEnabled={false} // Disable cache to avoid authentication issues
        />
        <TouchableOpacity 
          style={styles.closeButton}
          onPress={() => {
            setShowWebView(false);
            setLoading(false);
          }}
        >
          <Ionicons name="close-circle" size={36} color="white" />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.externalBrowserButton}
          onPress={() => {
            setShowWebView(false);
            handleConnectWithExternalBrowser();
          }}
        >
          <Text style={styles.externalBrowserButtonText}>Try External Browser</Text>
        </TouchableOpacity>
      </View>
    );
  }



  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.header}>Connect Spotify</Text>
        <Text style={styles.subheader}>
          Enhance your Jammin' experience by connecting your Spotify account
        </Text>
      </View>

      <View style={styles.spotifyLogoContainer}>
        <Image
          source={require("../assets/spotify-logo.png")}
          style={styles.spotifyLogo}
          resizeMode="contain"
        />
      </View>

      <View style={styles.featuresContainer}>
        <Text style={styles.featuresHeader}>You'll be able to:</Text>
        <View style={styles.featureItem}>
          <Text style={styles.featureText}>• See your listening stats</Text>
        </View>
        <View style={styles.featureItem}>
          <Text style={styles.featureText}>• Share your favorite songs</Text>
        </View>
        <View style={styles.featureItem}>
          <Text style={styles.featureText}>
            • Discover new music from friends
          </Text>
        </View>
        <View style={styles.featureItem}>
          <Text style={styles.featureText}>
            • Create posts about songs you love
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.connectButton}
        onPress={handleConnectSpotify}
      >
        <Text style={styles.connectButtonText}>Connect Spotify</Text>
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
    backgroundColor: colors.background.primary,
    paddingTop: 50,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.background.primary,
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    color: colors.text.primary,
  },
  webViewLoading: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.background.primary,
  },
  headerContainer: {
    alignItems: "center",
    marginBottom: 40,
    paddingHorizontal: 20,
  },
  header: {
    fontSize: 32,
    fontWeight: "bold",
    color: colors.text.primary,
    marginBottom: 10,
  },
  subheader: {
    fontSize: 16,
    color: colors.text.secondary,
    textAlign: "center",
  },
  spotifyLogoContainer: {
    alignItems: "center",
    marginBottom: 40,
  },
  spotifyLogo: {
    width: 200,
    height: 60,
  },
  featuresContainer: {
    paddingHorizontal: 40,
    marginBottom: 40,
  },
  featuresHeader: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.text.primary,
    marginBottom: 15,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  featureText: {
    fontSize: 16,
    color: colors.text.secondary,
  },
  connectButton: {
    backgroundColor: "#1DB954", // Spotify green
    padding: 15,
    borderRadius: 30,
    alignItems: "center",
    marginHorizontal: 40,
    marginBottom: 15,
  },
  connectButtonText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 18,
  },
  skipButton: {
    padding: 15,
    alignItems: "center",
  },
  skipButtonText: {
    color: colors.text.secondary,
    fontSize: 16,
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 999,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 18,
  },
  externalBrowserButton: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
    backgroundColor: '#1DB954',
    padding: 12,
    borderRadius: 25,
    alignItems: 'center',
    zIndex: 999,
  },
  externalBrowserButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
