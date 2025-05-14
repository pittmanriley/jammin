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
 * Get the authorization URL for Spotify OAuth
 */
export const getAuthorizationUrl = () => {
  const scopes = spotifyConfig.scopes.join(" ");
  const params = new URLSearchParams({
    client_id: spotifyConfig.clientId,
    response_type: "code",
    redirect_uri: spotifyConfig.redirectUri,
    scope: scopes,
    show_dialog: "true",
  });

  return `https://accounts.spotify.com/authorize?${params.toString()}`;
};

/**
 * Exchange authorization code for access token
 * @param {string} code - The authorization code from Spotify
 */
export const exchangeCodeForToken = async (code) => {
  try {
    const params = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: spotifyConfig.redirectUri,
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
      await saveUserSpotifyConnection(data);
      return data;
    } else {
      throw new Error(
        data.error_description || "Failed to exchange code for token"
      );
    }
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

    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    const data = await response.json();

    if (response.ok) {
      return data;
    } else {
      throw new Error(data.error?.message || "Spotify API request failed");
    }
  } catch (error) {
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
 * Get user's listening stats
 * Combines data from multiple endpoints to create a comprehensive stats object
 */
export const getUserListeningStats = async () => {
  try {
    // Get top tracks and artists
    const [topTracks, topArtists, recentTracks] = await Promise.all([
      getUserTopTracks("long_term", 50),
      getUserTopArtists("long_term", 50),
      getRecentlyPlayedTracks(50),
    ]);

    // Calculate stats
    const uniqueArtists = new Set();
    topArtists.items.forEach((artist) => uniqueArtists.add(artist.id));

    // Get genres from top artists
    const genres = {};
    topArtists.items.forEach((artist) => {
      artist.genres.forEach((genre) => {
        genres[genre] = (genres[genre] || 0) + 1;
      });
    });

    // Sort genres by count
    const topGenres = Object.entries(genres)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([genre]) => genre);

    // Estimate minutes listened (this is an approximation since Spotify API doesn't provide exact listening time)
    // We'll use 3.5 minutes as an average song length
    const estimatedMinutesListened = Math.round(
      topTracks.items.length * 3.5 * 10
    );

    // Calculate average daily minutes (assuming 3 months of data)
    const averageDailyMinutes = Math.round(estimatedMinutesListened / 90);

    return {
      minutesListened: estimatedMinutesListened,
      artistsListened: uniqueArtists.size,
      songsPlayed: topTracks.items.length * 10, // Approximation
      topGenres,
      averageDailyMinutes,
      longestListeningStreak: Math.round(Math.random() * 30) + 10, // Random streak between 10-40 days (placeholder)
      topTrack: topTracks.items[0],
      topArtist: topArtists.items[0],
    };
  } catch (error) {
    console.error("Error getting user listening stats:", error);
    throw error;
  }
};
