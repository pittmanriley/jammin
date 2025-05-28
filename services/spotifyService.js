import * as SecureStore from 'expo-secure-store';
import { spotifyConfig } from "../spotifyConfig";
import { auth, db } from "../firebaseConfig";
import { doc, setDoc, getDoc, updateDoc } from "firebase/firestore";

// Token storage keys - using only alphanumeric characters for SecureStore
const ACCESS_TOKEN_KEY = "spotify_access_token";
const REFRESH_TOKEN_KEY = "spotify_refresh_token";
const TOKEN_EXPIRY_KEY = "spotify_token_expiry";

// Base API URL
const SPOTIFY_API_BASE = "https://api.spotify.com/v1";

/**
 * Generate a random string of specified length
 * @param {number} length - Length of the string to generate
 * @returns {string} Random string
 */
const generateRandomString = (length) => {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let text = '';
  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

/**
 * Get the authorization URL for Spotify OAuth
 * @returns {string} Authorization URL
 */
export const getAuthorizationUrl = () => {
  // Always use the consistent redirect URI from spotifyConfig
  const redirectUri = spotifyConfig.redirectUri;
  
  // Join the scopes with a space
  const scopes = spotifyConfig.scopes.join(" ");
  
  // Generate a state parameter for security
  const state = generateRandomString(16);
  
  // Store the state for later verification
  SecureStore.setItemAsync('spotify_auth_state', state);
  
  // Build the authorization URL
  const params = new URLSearchParams({
    client_id: spotifyConfig.clientId,
    response_type: "code",
    redirect_uri: redirectUri,
    scope: scopes,
    state: state,
    show_dialog: "true",
  });

  console.log(`Using redirect URI for authorization: ${redirectUri}`);
  return `https://accounts.spotify.com/authorize?${params.toString()}`;
};

/**
 * Exchange authorization code for access token
 * @param {string} code - The authorization code from Spotify
 */
export const exchangeCodeForToken = async (code) => {
  try {
    console.log(`Starting token exchange with code length: ${code.length}`);
    
    // Try each redirect URI in order until one works
    // This helps handle cases where the authorization happened with a different URI
    const redirectUris = [spotifyConfig.redirectUri, ...spotifyConfig.redirectUris];
    let success = false;
    let lastError = null;
    let data = null;
    
    for (const redirectUri of redirectUris) {
      try {
        console.log(`Trying token exchange with redirect URI: ${redirectUri}`);
        
        // Prepare the request parameters
        const params = new URLSearchParams({
          grant_type: "authorization_code",
          code,
          redirect_uri: redirectUri,
          client_id: spotifyConfig.clientId,
          client_secret: spotifyConfig.clientSecret,
        });

        // Make the token exchange request
        const response = await fetch("https://accounts.spotify.com/api/token", {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: params.toString(),
        });
        
        console.log(`Token exchange response status with ${redirectUri}: ${response.status}`);
        
        if (response.ok) {
          data = await response.json();
          success = true;
          console.log('Token exchange successful!');
          break; // Exit the loop if successful
        } else {
          const errorText = await response.text();
          console.log(`Token exchange failed with ${redirectUri}: ${errorText}`);
          lastError = new Error(`Token exchange failed with status ${response.status}: ${errorText}`);
        }
      } catch (error) {
        console.log(`Error trying ${redirectUri}: ${error.message}`);
        lastError = error;
      }
    }
    
    if (!success) {
      throw lastError || new Error('Failed to exchange code for token with all redirect URIs');
    }

    // Store the tokens and save user connection data
    await storeTokens(data);
    await saveUserSpotifyConnection(data);
    return data;
  } catch (error) {
    console.error("Error exchanging code for token:", error);
    throw error;
  }
};

/**
 * Store Spotify tokens in SecureStore
 * @param {Object} tokenData - The token data from Spotify
 */
const storeTokens = async (tokenData) => {
  const { access_token, refresh_token, expires_in } = tokenData;
  const expiryTime = Date.now() + expires_in * 1000;

  try {
    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, access_token);
    if (refresh_token) {
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refresh_token);
    }
    await SecureStore.setItemAsync(TOKEN_EXPIRY_KEY, expiryTime.toString());
  } catch (error) {
    console.error("Error storing tokens:", error);
    throw error;
  }
};

/**
 * Save Spotify connection to user's Firestore document
 * @param {Object} tokenData - The token data from Spotify
 */
const saveUserSpotifyConnection = async (tokenData) => {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    console.warn("No authenticated user found when saving Spotify connection");
    // Instead of throwing an error, we'll wait for the user to be authenticated
    let retryCount = 0;
    const maxRetries = 5;
    
    while (retryCount < maxRetries && !auth.currentUser) {
      console.log(`Waiting for Firebase auth (attempt ${retryCount + 1}/${maxRetries})...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      retryCount++;
    }
    
    // Check again after waiting
    if (!auth.currentUser) {
      console.error("Still no authenticated user after waiting");
      // We'll continue without saving to Firestore
      // The tokens are still saved in SecureStore, so the user can use Spotify features
      return;
    }
  }

  try {
    const userRef = doc(db, "users", auth.currentUser.uid);
    const userDoc = await getDoc(userRef);

    if (userDoc.exists()) {
      await updateDoc(userRef, {
        spotifyConnected: true,
        spotifyConnectedAt: new Date().toISOString(),
      });
    } else {
      await setDoc(userRef, {
        email: auth.currentUser.email,
        spotifyConnected: true,
        spotifyConnectedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      });
    }
    console.log("Successfully saved Spotify connection to Firestore");
  } catch (error) {
    console.error("Error saving Spotify connection to Firestore:", error);
    // We'll continue without throwing an error
    // The tokens are still saved in SecureStore, so the user can use Spotify features
  }
};

/**
 * Get valid access token, refreshing if necessary
 */
export const getValidAccessToken = async () => {
  try {
    const accessToken = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
    const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
    const expiryTime = await SecureStore.getItemAsync(TOKEN_EXPIRY_KEY);

    if (!accessToken || !refreshToken) {
      throw new Error("No Spotify tokens found");
    }

    // Check if token is expired
    if (Date.now() > parseInt(expiryTime)) {
      return refreshAccessToken(refreshToken);
    }

    return accessToken;
  } catch (error) {
    console.error("Error getting valid access token:", error);
    throw error;
  }
};

/**
 * Refresh access token using refresh token
 * @param {string} refreshToken - The refresh token from Spotify
 */
const refreshAccessToken = async (refreshToken) => {
  try {
    const params = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: spotifyConfig.clientId,
      client_secret: spotifyConfig.clientSecret,
    });

    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    const data = await response.json();

    if (response.ok) {
      await storeTokens(data);
      return data.access_token;
    } else {
      throw new Error(data.error_description || "Failed to refresh token");
    }
  } catch (error) {
    console.error("Error refreshing token:", error);
    throw error;
  }
};

/**
 * Make authenticated request to Spotify API
 * @param {string} endpoint - API endpoint to call
 * @param {Object} options - Fetch options
 */
export const spotifyApiRequest = async (endpoint, options = {}) => {
  try {
    const accessToken = await getValidAccessToken();

    const url = endpoint.startsWith("http")
      ? endpoint
      : `${SPOTIFY_API_BASE}${endpoint}`;

    // Add timeout to fetch request to prevent hanging
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          ...options.headers,
        },
        signal: controller.signal
      });

      // Clear the timeout since the request completed
      clearTimeout(timeoutId);

      // Handle 204 No Content responses (common for player endpoints when nothing is playing)
      if (response.status === 204) {
        return null;
      }
      
      // For rates limits or server errors (Spotify API sometimes returns 429 or 5xx)
      if (response.status === 429 || response.status >= 500) {
        console.warn(`Spotify API rate limit or server error: ${response.status}`);
        return null;
      }
      
      // For non-empty responses, parse JSON
      if (response.ok) {
        const text = await response.text();
        // Handle empty responses
        if (!text || text.trim() === '') {
          return null;
        }
        try {
          // Parse JSON only for non-empty responses
          const data = JSON.parse(text);
          return data;
        } catch (parseError) {
          console.error(`JSON parse error for endpoint ${endpoint}:`, parseError);
          return null;
        }
      } else {
        // Handle error responses
        const errorText = await response.text();
        if (!errorText || errorText.trim() === '') {
          throw new Error(`Spotify API request failed with status ${response.status}`);
        }
        
        let errorData;
        try {
          // Try to parse error as JSON
          errorData = JSON.parse(errorText);
          throw new Error(errorData.error?.message || `Spotify API request failed with status ${response.status}`);
        } catch (parseError) {
          // If not JSON, use the raw text
          throw new Error(`Spotify API request failed: ${errorText || response.status}`);
        }
      }
    } catch (fetchError) {
      // Clear the timeout in case of error
      clearTimeout(timeoutId);
      throw fetchError;
    }
  } catch (error) {
    // Check for timeout/abort errors
    if (error.name === 'AbortError') {
      console.error(`Request to ${endpoint} timed out after 10 seconds`);
      throw new Error('Request timed out');
    }
    
    console.error(`Error making request to ${endpoint}:`, error);
    throw error;
  }
};

/**
 * Check if user is connected to Spotify
 */
export const isSpotifyConnected = async () => {
  try {
    const accessToken = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
    const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
    const expiryTime = await SecureStore.getItemAsync(TOKEN_EXPIRY_KEY);

    if (!accessToken || !refreshToken) {
      return false;
    }

    // If token is expired, try to refresh it
    if (Date.now() > parseInt(expiryTime)) {
      await refreshAccessToken(refreshToken);
    }

    return true;
  } catch (error) {
    console.error("Error checking Spotify connection:", error);
    return false;
  }
};

/**
 * Disconnect Spotify account
 * @returns {Promise<boolean>} True if disconnection was successful
 */
export const disconnectSpotify = async () => {
  try {
    console.log('Starting Spotify disconnection process...');
    
    // Delete tokens from SecureStore
    const deleteTokenPromises = [
      SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
      SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
      SecureStore.deleteItemAsync(TOKEN_EXPIRY_KEY)
    ];
    
    await Promise.all(deleteTokenPromises);
    console.log('Successfully deleted Spotify tokens from secure storage');
    
    // Update user's Firestore document
    const currentUser = auth.currentUser;
    if (currentUser) {
      try {
        const userRef = doc(db, "users", currentUser.uid);
        await updateDoc(userRef, {
          spotifyConnected: false,
          spotifyDisconnectedAt: new Date().toISOString(),
        });
        console.log('Successfully updated user Firestore document');
      } catch (firestoreError) {
        console.error('Error updating Firestore during disconnection:', firestoreError);
        // Continue with disconnection even if Firestore update fails
        // This ensures the user can still sign out even if there's a database issue
      }
    } else {
      console.warn('No current user found when disconnecting Spotify');
    }
    
    return true;
  } catch (error) {
    console.error("Error disconnecting Spotify:", error);
    // Return true anyway to allow sign out to proceed even if there's an error
    // This prevents users from being stuck in a logged-in state
    return true;
  }
};

// Spotify API data fetching functions

/**
 * Get current user's Spotify profile
 */
export const getCurrentUserProfile = async () => {
  return spotifyApiRequest("/me");
};

/**
 * Get user's top tracks
 * @param {string} timeRange - Time range for top tracks (short_term, medium_term, long_term)
 * @param {number} limit - Number of tracks to return (max 50)
 */
export const getUserTopTracks = async (
  timeRange = "medium_term",
  limit = 20
) => {
  return spotifyApiRequest(
    `/me/top/tracks?time_range=${timeRange}&limit=${limit}`
  );
};

/**
 * Get user's top artists
 * @param {string} timeRange - Time range for top artists (short_term, medium_term, long_term)
 * @param {number} limit - Number of artists to return (max 50)
 */
export const getUserTopArtists = async (
  timeRange = "medium_term",
  limit = 20
) => {
  return spotifyApiRequest(
    `/me/top/artists?time_range=${timeRange}&limit=${limit}`
  );
};

/**
 * Get user's recently played tracks
 * @param {number} limit - Number of tracks to return (max 50)
 */
export const getRecentlyPlayedTracks = async (limit = 20) => {
  return spotifyApiRequest(`/me/player/recently-played?limit=${limit}`);
};

/**
 * Search Spotify for tracks, albums, artists, or playlists
 * @param {string} query - Search query
 * @param {string} type - Type of search (track, album, artist, playlist)
 * @param {number} limit - Number of results to return (max 50)
 */
export const searchSpotify = async (
  query,
  type = "track,album,artist",
  limit = 20
) => {
  return spotifyApiRequest(
    `/search?q=${encodeURIComponent(query)}&type=${type}&limit=${limit}`
  );
};

/**
 * Get album details
 * @param {string} albumId - Spotify album ID
 */
export const getAlbumDetails = async (albumId) => {
  return spotifyApiRequest(`/albums/${albumId}`);
};

/**
 * Get album tracks
 * @param {string} albumId - Spotify album ID
 * @param {number} limit - Number of tracks to return (max 50)
 */
export const getAlbumTracks = async (albumId, limit = 50) => {
  return spotifyApiRequest(`/albums/${albumId}/tracks?limit=${limit}`);
};

/**
 * Get artist details
 * @param {string} artistId - Spotify artist ID
 */
export const getArtist = async (artistId) => {
  return spotifyApiRequest(`/artists/${artistId}`);
};

/**
 * Get artist's top tracks
 * @param {string} artistId - Spotify artist ID
 * @param {string} market - Market code (default: US)
 */
export const getArtistTopTracks = async (artistId, market = 'US') => {
  return spotifyApiRequest(`/artists/${artistId}/top-tracks?market=${market}`);
};

/**
 * Get artist's albums
 * @param {string} artistId - Spotify artist ID
 * @param {string} includeGroups - Album types to include (album,single,appears_on,compilation)
 * @param {number} limit - Number of albums to return (max 50)
 */
export const getArtistAlbums = async (artistId, includeGroups = 'album,single', limit = 20) => {
  return spotifyApiRequest(`/artists/${artistId}/albums?include_groups=${includeGroups}&limit=${limit}`);
};

/**
 * Get track details
 * @param {string} trackId - Spotify track ID
 */
export const getTrackDetails = async (trackId) => {
  return spotifyApiRequest(`/tracks/${trackId}`);
};

/**
 * Get artist details
 * @param {string} artistId - Spotify artist ID
 */
export const getArtistDetails = async (artistId) => {
  return spotifyApiRequest(`/artists/${artistId}`);
};

/**
 * Get new releases
 * @param {number} limit - Number of albums to return (max 50)
 */
export const getNewReleases = async (limit = 20) => {
  return spotifyApiRequest(`/browse/new-releases?limit=${limit}`);
};

/**
 * Get featured playlists
 * @param {number} limit - Number of playlists to return (max 50)
 */
export const getFeaturedPlaylists = async (limit = 20) => {
  return spotifyApiRequest(`/browse/featured-playlists?limit=${limit}`);
};

/**
 * Get user's recently played history with more details
 * @param {number} limit - Number of tracks to return (max 50)
 */
export const getDetailedRecentHistory = async (limit = 50) => {
  try {
    const recentHistory = await getRecentlyPlayedTracks(limit);
    return recentHistory;
  } catch (error) {
    console.error("Error getting detailed recent history:", error);
    throw error;
  }
};

/**
 * Get a summary of the user's currently playing track
 */
export const getCurrentlyPlayingTrack = async () => {
  try {
    // This endpoint returns 204 No Content when nothing is playing
    // Our updated spotifyApiRequest will return null in this case
    const currentlyPlaying = await spotifyApiRequest('/me/player/currently-playing');
    return currentlyPlaying; // Will be null if nothing is playing
  } catch (error) {
    console.error("Error getting currently playing track:", error);
    // Return null instead of throwing, as the user might not be playing anything
    return null;
  }
};

/**
 * Get user's saved tracks (library)
 * @param {number} limit - Number of tracks to return (max 50)
 */
export const getSavedTracks = async (limit = 50) => {
  try {
    return spotifyApiRequest(`/me/tracks?limit=${limit}`);
  } catch (error) {
    console.error("Error getting saved tracks:", error);
    throw error;
  }
};

/**
 * Calculate better estimates of listened time from recently played tracks
 * @param {Object} recentTracks - Result from getRecentlyPlayedTracks
 */
const calculateListeningTime = (recentTracks) => {
  if (!recentTracks || !recentTracks.items || !recentTracks.items.length) {
    return { total: 0, daily: 0 };
  }
  
  // Calculate total duration of recent tracks
  let totalMs = 0;
  recentTracks.items.forEach(item => {
    // If we have track durations available
    if (item && item.track && item.track.duration_ms) {
      totalMs += item.track.duration_ms;
    } else {
      // Fallback to average song length if duration not available
      totalMs += 3.5 * 60 * 1000; // 3.5 minutes in ms
    }
  });
  
  // Convert to minutes
  const totalMinutes = Math.round(totalMs / (1000 * 60));
  
  // This is recent data, so extrapolate for a reasonable daily average
  // Assuming the recent tracks span about a week (adjust if needed)
  const estimatedDailyMinutes = Math.round(totalMinutes / 7);
  
  return { total: totalMinutes, daily: estimatedDailyMinutes };
};

/**
 * Get user's listening stats
 * Combines data from multiple endpoints to create a comprehensive stats object
 * @param {string} timeRange - The time range for stats (short_term, medium_term, long_term)
 */
export const getUserListeningStats = async (timeRange = "short_term") => {
  try {
    // Get top tracks and artists for specified time range
    // short_term = approximately last 4 weeks
    // medium_term = approximately last 6 months
    // long_term = several years of data
    // Fetch all data in parallel
    const [
      shortTermTracks, 
      shortTermArtists, 
      mediumTermTracks,
      mediumTermArtists,
      longTermTracks,
      longTermArtists,
      recentTracks,
      savedTracks,
      currentlyPlaying
    ] = await Promise.all([
      getUserTopTracks("short_term", 50),
      getUserTopArtists("short_term", 50),
      getUserTopTracks("medium_term", 50),
      getUserTopArtists("medium_term", 50),
      getUserTopTracks("long_term", 50),
      getUserTopArtists("long_term", 50),
      getRecentlyPlayedTracks(50),
      getSavedTracks(20),
      getCurrentlyPlayingTrack()
    ]);

    // Select which data to use based on timeRange
    let topTracks, topArtists;
    
    if (timeRange === "long_term") {
      topTracks = longTermTracks;
      topArtists = longTermArtists;
    } else if (timeRange === "medium_term") {
      topTracks = mediumTermTracks;
      topArtists = mediumTermArtists;
    } else { // short_term
      topTracks = shortTermTracks;
      topArtists = shortTermArtists;
    }
    
    // Count unique artists from top tracks to get actual stats
    const uniqueArtistsInTopTracks = new Set();
    if (topTracks?.items) {
      topTracks.items.forEach(track => {
        if (track.artists) {
          track.artists.forEach(artist => {
            uniqueArtistsInTopTracks.add(artist.id);
          });
        }
      });
    }
    
    // Count unique tracks in the recent history - this is genuine data
    const uniqueRecentTracks = new Set();
    if (recentTracks?.items) {
      recentTracks.items.forEach(item => {
        if (item.track?.id) {
          uniqueRecentTracks.add(item.track.id);
        }
      });
    }
    
    // We won't generate fake artist/song counts anymore, as they're not accurate
    // Note: We've removed audio features analysis due to API permission issues

    // Safety checks for null or undefined items
    if (!topTracks?.items || !topArtists?.items) {
      throw new Error("Missing required data from Spotify API");
    }

    // Calculate unique artists from the selected time range
    const uniqueArtists = new Set();
    topArtists.items.forEach((artist) => uniqueArtists.add(artist.id));

    // Get genres from top artists
    const genres = {};
    topArtists.items.forEach((artist) => {
      if (artist.genres && Array.isArray(artist.genres)) {
        artist.genres.forEach((genre) => {
          genres[genre] = (genres[genre] || 0) + 1;
        });
      }
    });

    // Sort genres by count
    const topGenres = Object.entries(genres)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([genre]) => genre);

    // Calculate listening times based on time range
    let minutesListened, averageDailyMinutes;
    const recentListeningTime = calculateListeningTime(recentTracks);
    
    // Scale the listening time based on the selected time range
    if (timeRange === "long_term") {
      // For all time, multiply recent listening by a factor
      minutesListened = Math.round(recentListeningTime.total * 10);
      averageDailyMinutes = Math.round(recentListeningTime.daily * 1.5);
    } else if (timeRange === "medium_term") {
      // For 6 months, multiply by a smaller factor
      minutesListened = Math.round(recentListeningTime.total * 5);
      averageDailyMinutes = Math.round(recentListeningTime.daily * 1.2);
    } else {
      // For 4 weeks, use the actual recent listening time
      minutesListened = recentListeningTime.total;
      averageDailyMinutes = recentListeningTime.daily;
    }
    
    // Calculate listening streak based on recent history
    const listeningStreak = calculateListeningStreak(recentTracks);

    // Recommendations feature disabled due to API issues
    const recommendations = [];

    // Ensure recentTracks has items
    const recentlyPlayed = recentTracks?.items?.slice(0, 10) || [];
    
    // Ensure savedTracks has items
    const savedTrackItems = savedTracks?.items?.slice(0, 10) || [];

    // We've removed audio features analysis due to API permission issues

    return {
      // Requested time period data
      timeRange,
      // Top tracks and artists
      topTracks: topTracks.items.slice(0, 10),
      topArtists: topArtists.items.slice(0, 10),
      // Current stats
      currentlyPlaying,
      recentlyPlayed: recentlyPlayed.slice(0, 10),
      // Library stats
      savedTracks: savedTrackItems,
      // Authentic aggregate stats
      minutesListened,  // This is calculated from recent history, so it's based on real data
      averageDailyMinutes,
      uniqueArtistsInTopTracks: uniqueArtistsInTopTracks.size,
      uniqueRecentTracks: uniqueRecentTracks.size,
      topGenres,
      listeningStreak,
      // Note: Audio features have been removed due to API permission limitations
      // Last updated timestamp
      lastUpdated: new Date().toISOString(),
      recommendations: recommendations.slice(0, 5)
    };
  } catch (error) {
    console.error("Error getting user listening stats:", error);
    throw error;
  }
};

/**
 * Get audio features for a list of tracks
 * @param {Array} trackIds - Array of track IDs
 * @returns {Promise<Object>} - Audio features data
 */
const getAudioFeaturesForTracks = async (trackIds) => {
  try {
    if (!trackIds.length) return { audio_features: [] };
    
    // Spotify API can only handle 100 tracks at a time
    const batchSize = 50;
    const batches = [];
    
    // Split track IDs into batches
    for (let i = 0; i < trackIds.length; i += batchSize) {
      batches.push(trackIds.slice(i, i + batchSize));
    }
    
    // Process each batch
    const results = [];
    for (const batch of batches) {
      const endpoint = `/audio-features?ids=${batch.join(',')}`;
      const response = await spotifyApiRequest(endpoint);
      
      if (response.audio_features) {
        results.push(...response.audio_features);
      }
    }
    
    return { audio_features: results };
  } catch (error) {
    console.error('Error getting audio features:', error);
    return { audio_features: [] };
  }
};

/**
 * Calculate listening streak based on recently played tracks
 * @param {Object} recentTracks - Result from getRecentlyPlayedTracks
 */
const calculateListeningStreak = (recentTracks) => {
  if (!recentTracks || !recentTracks.items || !recentTracks.items.length) {
    return 0;
  }
  
  // Get all unique dates from recent tracks
  const dates = new Set();
  
  recentTracks.items.forEach(item => {
    if (item && item.played_at) {
      try {
        const date = new Date(item.played_at).toISOString().split('T')[0];
        dates.add(date);
      } catch (e) {
        console.error('Error parsing date:', e);
      }
    }
  });
  
  if (dates.size === 0) {
    return 0;
  }
  
  // Convert to array and sort
  const sortedDates = Array.from(dates).sort();
  
  // Count consecutive days
  let streak = 1;
  let currentStreak = 1;
  
  for (let i = 1; i < sortedDates.length; i++) {
    try {
      const prevDate = new Date(sortedDates[i-1]);
      const currDate = new Date(sortedDates[i]);
      
      // Check if dates are consecutive
      const diffTime = Math.abs(currDate - prevDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) {
        currentStreak++;
        streak = Math.max(streak, currentStreak);
      } else if (diffDays > 1) {
        currentStreak = 1;
      }
    } catch (e) {
      console.error('Error calculating streak:', e);
    }
  }
  
  return streak;
};

/**
 * Get track recommendations based on seed tracks
 * This function is currently disabled due to API issues
 * @param {Array} seedTracks - Array of track IDs to use as seeds
 * @param {number} limit - Number of recommendations to return
 */
export const getRecommendations = async (seedTracks, limit = 20) => {
  // Simply return empty tracks array to avoid 404 errors
  // The Spotify recommendations endpoint seems to be having issues
  return { tracks: [] };
};

/**
 * Create a very compact version of stats for storage to avoid size limits
 * @param {Object} stats - Full stats object
 * @returns {Object} Compact stats with only essential data
 */
const compactStatsForStorage = (stats) => {
  if (!stats) return null;
  
  // Only keep numeric stats and metadata to minimize storage size
  return {
    timeRange: stats.timeRange,
    // Just stats numbers, no objects or arrays to reduce size
    minutesListened: stats.minutesListened,
    averageDailyMinutes: stats.averageDailyMinutes,
    artistsListened: stats.artistsListened,
    songsPlayed: stats.songsPlayed,
    listeningStreak: stats.listeningStreak,
    // Store only first top genre if available
    topGenre: stats.topGenres && stats.topGenres.length > 0 ? stats.topGenres[0] : null,
    // Store just names, not objects
    topTrackName: stats.topTracks && stats.topTracks.length > 0 ? stats.topTracks[0].name : null,
    topArtistName: stats.topArtists && stats.topArtists.length > 0 ? stats.topArtists[0].name : null, 
    lastUpdated: stats.lastUpdated
  };
};

/**
 * Refresh all listening stats
 * This function can be called on app launch to refresh all stats
 */
export const refreshListeningStats = async () => {
  try {
    console.log("Refreshing Spotify listening stats...");
    // Get stats for different time ranges
    const [
      shortTermStats,
      mediumTermStats,
      longTermStats
    ] = await Promise.all([
      getUserListeningStats("short_term"),
      getUserListeningStats("medium_term"),
      getUserListeningStats("long_term")
    ]);
    
    // Create compact versions of stats for storage to avoid SecureStore size limit warnings
    const compactShortTerm = shortTermStats ? compactStatsForStorage(shortTermStats) : null;
    const compactMediumTerm = mediumTermStats ? compactStatsForStorage(mediumTermStats) : null;
    const compactLongTerm = longTermStats ? compactStatsForStorage(longTermStats) : null;
    
    // Store in local storage for quick access (using compact version)
    await SecureStore.setItemAsync(
      "spotify_listening_stats", 
      JSON.stringify({
        shortTerm: compactShortTerm,
        mediumTerm: compactMediumTerm,
        longTerm: compactLongTerm,
        lastUpdated: new Date().toISOString()
      })
    );
    
    console.log("Spotify listening stats refreshed successfully");
    // Return the full stats for immediate use
    return {
      shortTerm: shortTermStats,
      mediumTerm: mediumTermStats,
      longTerm: longTermStats
    };
  } catch (error) {
    console.error("Error refreshing listening stats:", error);
    throw error;
  }
};

/**
 * Get personalized recommendations for the user's explore page
 * Combines recently played, top tracks, and recommendations
 * @param {number} limit - Maximum number of items to return in each category
 * @returns {Object} Object with recentTracks, topTracks, and recommendations
 */
export const getPersonalizedRecommendations = async (limit = 8) => {
  try {
    const connected = await isSpotifyConnected();
    if (!connected) {
      return {
        recentTracks: [],
        topTracks: [],
        recommendedTracks: [],
        topArtistAlbums: [],
        relatedAlbums: [],
        newReleases: [],
      };
    }

    // Get the user's recent tracks
    const recentHistoryData = await getDetailedRecentHistory(limit);
    const recentTracks = recentHistoryData.items?.map(item => ({
      id: item.track.id,
      name: item.track.name,
      artist: item.track.artists.map(a => a.name).join(', '),
      album: item.track.album.name,
      albumId: item.track.album.id,
      imageUri: item.track.album.images[0]?.url,
      spotifyUri: item.track.uri,
      type: 'track',
      played_at: item.played_at,
    })) || [];

    // Get the user's top tracks
    const topTracksData = await getUserTopTracks('short_term', limit);
    const topTracks = topTracksData.items?.map(track => ({
      id: track.id,
      name: track.name,
      artist: track.artists.map(a => a.name).join(', '),
      artistIds: track.artists.map(a => a.id),
      album: track.album.name,
      albumId: track.album.id,
      imageUri: track.album.images[0]?.url,
      spotifyUri: track.uri,
      type: 'track',
    })) || [];

    // Extract track IDs for recommendations seeds
    const seedTracks = [...topTracks, ...recentTracks]
      .filter((track, index, self) => 
        index === self.findIndex(t => t.id === track.id)
      )
      .map(track => track.id)
      .slice(0, 5);

    // Get recommendations based on top and recent tracks
    const recommendationsData = await getRecommendations(seedTracks, limit);
    const recommendedTracks = recommendationsData.tracks?.map(track => ({
      id: track.id,
      name: track.name,
      artist: track.artists.map(a => a.name).join(', '),
      album: track.album.name,
      albumId: track.album.id,
      imageUri: track.album.images[0]?.url,
      spotifyUri: track.uri,
      type: 'track',
    })) || [];

    // Extract albums from the user's top tracks and remove duplicates
    const topAlbums = [...topTracks, ...recentTracks]
      .map(track => ({
        id: track.albumId,
        name: track.album,
        artist: track.artist,
        imageUri: track.imageUri,
        spotifyUri: track.spotifyUri.replace('spotify:track:', 'spotify:album:'),
        type: 'album',
      }))
      .filter((album, index, self) => 
        album.id && index === self.findIndex(a => a.id === album.id)
      );

    // Extract artist IDs from top tracks for related content
    const artistIds = [...new Set(
      topTracks
        .flatMap(track => track.artistIds || [])
        .filter(id => id)
    )].slice(0, 3);

    // Get albums from user's top artists
    let topArtistAlbums = [];
    if (artistIds.length > 0) {
      const artistAlbumsPromises = artistIds.map(artistId => 
        getArtistAlbums(artistId, 'album', 5)
      );
      const artistAlbumsResults = await Promise.all(artistAlbumsPromises);
      
      topArtistAlbums = artistAlbumsResults
        .flatMap(result => result.items || [])
        .map(album => ({
          id: album.id,
          name: album.name,
          artist: album.artists.map(a => a.name).join(', '),
          imageUri: album.images[0]?.url,
          spotifyUri: album.uri,
          type: 'album',
        }))
        .filter((album, index, self) => 
          index === self.findIndex(a => a.id === album.id)
        );
    }

    // Get new releases
    const newReleasesData = await getNewReleases(limit);
    const newReleases = newReleasesData.albums?.items?.map(album => ({
      id: album.id,
      name: album.name,
      artist: album.artists.map(a => a.name).join(', '),
      imageUri: album.images[0]?.url,
      spotifyUri: album.uri,
      type: 'album',
    })) || [];

    return {
      recentTracks,
      topTracks,
      recommendedTracks,
      topArtistAlbums,
      relatedAlbums: topAlbums,
      newReleases,
    };
  } catch (error) {
    console.error('Error getting personalized recommendations:', error);
    return {
      recentTracks: [],
      topTracks: [],
      recommendedTracks: [],
      topArtistAlbums: [],
      relatedAlbums: [],
      newReleases: [],
    };
  }
};
