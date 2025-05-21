import React, { createContext, useState, useContext, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import * as spotifyService from '../services/spotifyService';

// Create the context
const SpotifyStatsContext = createContext(null);

// Context provider component
export const SpotifyStatsProvider = ({ children }) => {
  const [stats, setStats] = useState({
    shortTerm: null,
    mediumTerm: null,
    longTerm: null,
    lastUpdated: null,
    isLoading: false,
    error: null
  });

  // Function to get stats from secure storage
  const getStatsFromStorage = async () => {
    try {
      const storedStats = await SecureStore.getItemAsync('spotify_listening_stats');
      if (storedStats) {
        const parsedStats = JSON.parse(storedStats);
        
        // Return the saved numeric data without full objects
        // The app will fetch complete data when needed
        return parsedStats;
      }
      return null;
    } catch (error) {
      console.error('Error getting stats from storage:', error);
      return null;
    }
  };

  // Load initial stats from storage
  useEffect(() => {
    const loadInitialStats = async () => {
      const storedStats = await getStatsFromStorage();
      if (storedStats) {
        setStats(prevStats => ({
          ...prevStats,
          ...storedStats,
          isLoading: false
        }));
      }
    };

    loadInitialStats();
  }, []);

  // Function to manually refresh stats
  const refreshStats = async (forceRefresh = false) => {
    try {
      setStats(prevStats => ({ ...prevStats, isLoading: true, error: null }));
      
      // First check if we have recent stats (less than 1 hour old) and no force refresh
      if (!forceRefresh) {
        const storedStats = await getStatsFromStorage();
        
        if (storedStats && storedStats.lastUpdated) {
          const lastUpdated = new Date(storedStats.lastUpdated);
          const now = new Date();
          const timeDiff = now - lastUpdated; // diff in milliseconds
          
          // If less than 1 hour old, use the stored stats
          if (timeDiff < 60 * 60 * 1000) {
            console.log('Using cached Spotify stats (less than 1 hour old)');
            setStats(prevStats => ({
              ...prevStats,
              ...storedStats,
              isLoading: false
            }));
            return storedStats;
          }
        }
      }
      
      // Check if user is connected to Spotify
      const isConnected = await spotifyService.isSpotifyConnected();
      if (!isConnected) {
        console.log('User is not connected to Spotify, skipping stats refresh');
        setStats(prevStats => ({
          ...prevStats,
          isLoading: false,
          error: 'Not connected to Spotify'
        }));
        return null;
      }
      
      // If we reach here, we need to refresh the stats
      console.log('Fetching fresh Spotify stats...');
      try {
        const refreshedStats = await spotifyService.refreshListeningStats();
        
        // Make sure we received valid stats
        if (refreshedStats && 
            (refreshedStats.shortTerm || refreshedStats.mediumTerm || refreshedStats.longTerm)) {
          // Store in local storage for quick access, but reduce data size to avoid warnings
          // Only store a subset of the data to keep size under 2048 bytes
          const compactShortTerm = refreshedStats.shortTerm ? compactStatsForStorage(refreshedStats.shortTerm) : null;
          const compactMediumTerm = refreshedStats.mediumTerm ? compactStatsForStorage(refreshedStats.mediumTerm) : null;
          const compactLongTerm = refreshedStats.longTerm ? compactStatsForStorage(refreshedStats.longTerm) : null;
          
          await SecureStore.setItemAsync(
            "spotify_listening_stats", 
            JSON.stringify({
              shortTerm: compactShortTerm,
              mediumTerm: compactMediumTerm,
              longTerm: compactLongTerm,
              lastUpdated: new Date().toISOString()
            })
          );
          
          // Update the state with the full stats
          setStats(prevStats => ({
            ...prevStats,
            shortTerm: refreshedStats.shortTerm,
            mediumTerm: refreshedStats.mediumTerm,
            longTerm: refreshedStats.longTerm,
            lastUpdated: new Date().toISOString(),
            isLoading: false,
            error: null
          }));
          
          return refreshedStats;
        } else {
          console.warn('Received empty stats from Spotify');
          // If we got an empty response, keep the old stats if we have them
          setStats(prevStats => ({
            ...prevStats,
            isLoading: false,
            error: 'Unable to retrieve updated stats'
          }));
          return null;
        }
      } catch (statsError) {
        console.error('Error fetching Spotify stats:', statsError);
        setStats(prevStats => ({
          ...prevStats,
          isLoading: false,
          error: statsError.message || 'Failed to fetch stats'
        }));
        // Don't throw, just return null
        return null;
      }
    } catch (error) {
      console.error('Error in refreshStats:', error);
      setStats(prevStats => ({
        ...prevStats,
        error: error.message || 'An unknown error occurred',
        isLoading: false
      }));
      // Don't throw, just return null
      return null;
    }
  };

  // Context value
  const value = {
    ...stats,
    refreshStats
  };

  return (
    <SpotifyStatsContext.Provider value={value}>
      {children}
    </SpotifyStatsContext.Provider>
  );
};

// Custom hook to use the context
export const useSpotifyStats = () => {
  const context = useContext(SpotifyStatsContext);
  if (context === null) {
    throw new Error('useSpotifyStats must be used within a SpotifyStatsProvider');
  }
  return context;
};

/**
 * Create an extremely compact version of stats for storage to avoid size limits
 * @param {Object} stats - Full stats object
 * @returns {Object} Minimal stats with only essential numeric data
 */
const compactStatsForStorage = (stats) => {
  if (!stats) return null;
  
  // ONLY store numeric values and simple strings to minimize size drastically
  return {
    timeRange: stats.timeRange,
    // Basic numeric stats only
    minutesListened: stats.minutesListened,
    averageDailyMinutes: stats.averageDailyMinutes,
    artistsListened: stats.artistsListened,
    songsPlayed: stats.songsPlayed,
    listeningStreak: stats.listeningStreak,
    // Just a timestamp
    lastUpdated: new Date().toISOString()
  };
};

export default SpotifyStatsContext;
