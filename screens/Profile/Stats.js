import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  Image,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import {
  getUserListeningStats,
  isSpotifyConnected,
} from "../../services/spotifyService";
import { useSpotifyStats } from "../../contexts/SpotifyStatsContext";
import { theme } from "../../theme/theme";

const windowWidth = Dimensions.get("window").width;

export default function Stats({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [spotifyConnected, setSpotifyConnected] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState("short_term"); // short_term, medium_term, long_term

  // Get stats from our SpotifyStatsContext
  const {
    shortTerm,
    mediumTerm,
    longTerm,
    lastUpdated,
    refreshStats,
    isLoading: contextLoading,
  } = useSpotifyStats();

  // Select stats based on the chosen time range
  const getStatsForTimeRange = () => {
    let stats;
    switch (timeRange) {
      case "medium_term":
        stats = mediumTerm || {};
        break;
      case "long_term":
        stats = longTerm || {};
        break;
      case "short_term":
      default:
        stats = shortTerm || {};
        break;
    }

    // Ensure all required properties exist
    return {
      minutesListened: stats.minutesListened || 0,
      artistsListened: stats.artistsListened || 0,
      songsPlayed: stats.songsPlayed || 0,
      topGenres: stats.topGenres || [],
      averageDailyMinutes: stats.averageDailyMinutes || 0,
      listeningStreak: stats.listeningStreak || 0,
      topTracks: stats.topTracks || [],
      topArtists: stats.topArtists || [],
      currentlyPlaying: stats.currentlyPlaying || null,
      recentlyPlayed: stats.recentlyPlayed || [],
      ...(stats.topGenre ? { topGenres: [stats.topGenre] } : {}), // Convert single topGenre to array if it exists
    };
  };

  const [listeningStats, setListeningStats] = useState({
    minutesListened: 0,
    artistsListened: 0,
    songsPlayed: 0,
    topGenres: [],
    averageDailyMinutes: 0,
    listeningStreak: 0,
    topTracks: [],
    topArtists: [],
    currentlyPlaying: null,
    recentlyPlayed: [],
  });

  // Update local stats whenever time range changes or stats are refreshed
  useEffect(() => {
    const statsForRange = getStatsForTimeRange();
    if (statsForRange) {
      setListeningStats(statsForRange);
      setLoading(false);

      // If we changed time range but don't have top tracks/artists data, fetch it
      if (
        !statsForRange.topTracks?.length ||
        !statsForRange.topArtists?.length
      ) {
        const loadTimeRangeData = async () => {
          try {
            setLoading(true);
            await refreshStats(true);
          } catch (err) {
            console.error(`Error loading ${timeRange} data:`, err);
          } finally {
            setLoading(false);
          }
        };
        loadTimeRangeData();
      }
    }
  }, [timeRange, shortTerm, mediumTerm, longTerm]);

  // Check if connected to Spotify and load initial stats on mount
  useEffect(() => {
    const initializeStats = async () => {
      await checkSpotifyConnection();

      // If we have context data but no tracks/artists showing, force a refresh
      const statsForRange = getStatsForTimeRange();
      if (
        statsForRange &&
        (!statsForRange.topTracks?.length || !statsForRange.topArtists?.length)
      ) {
        console.log("Missing top tracks/artists data, refreshing...");
        try {
          setLoading(true);
          await refreshStats(true);
        } catch (err) {
          console.error("Error refreshing stats:", err);
          setError("Failed to load your stats. Please try again.");
        } finally {
          setLoading(false);
        }
      }
    };

    initializeStats();
  }, []);

  // Check if user is connected to Spotify
  const checkSpotifyConnection = async () => {
    try {
      const connected = await isSpotifyConnected();
      setSpotifyConnected(connected);

      if (!connected) {
        // Use mock data if not connected to Spotify
        setListeningStats({
          minutesListened: 0,
          artistsListened: 0,
          songsPlayed: 0,
          topGenres: [],
          averageDailyMinutes: 0,
          listeningStreak: 0,
          topTracks: [],
          topArtists: [],
        });
        setLoading(false);
      }
    } catch (err) {
      console.error(`Error checking Spotify connection: ${err.message}`);
      setError("Failed to check Spotify connection. Please try again.");
      setLoading(false);
    }
  };

  // Handle manual refresh
  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      setError(null);
      await refreshStats(true); // Force refresh
    } catch (err) {
      console.error(`Error refreshing stats: ${err.message}`);
      setError("Failed to refresh your listening stats. Please try again.");
    } finally {
      setRefreshing(false);
    }
  };

  const connectSpotify = () => {
    navigation.navigate("SpotifyAuth");
  };

  // Helper to format minutes into hours and minutes
  const formatMinutes = (totalMinutes) => {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours} hr ${minutes} min`;
  };

  if (loading || contextLoading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#1DB954" />
        <Text style={styles.loadingText}>Loading your stats...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text>
            <Ionicons name="arrow-back" size={28} color="white" />
          </Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Listening Stats</Text>
        <View style={{ width: 28 }} />
      </View>

      {!spotifyConnected && (
        <View style={styles.spotifyConnectCard}>
          <Text style={styles.connectCardTitle}>Connect to Spotify</Text>
          <Text style={styles.connectCardText}>
            Connect your Spotify account to see your real listening stats
          </Text>
          <TouchableOpacity
            style={styles.connectButton}
            onPress={connectSpotify}
          >
            <Text style={styles.connectButtonText}>Connect Spotify</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={["#1DB954"]}
            tintColor={"#1DB954"}
          />
        }
      >
        {/* Time Range Selector */}
        <View style={styles.timeRangeContainer}>
          <TouchableOpacity
            style={[
              styles.timeRangeButton,
              timeRange === "short_term" && styles.activeTimeRange,
            ]}
            onPress={() => setTimeRange("short_term")}
          >
            <Text
              style={[
                styles.timeRangeText,
                timeRange === "short_term" && styles.activeTimeRangeText,
              ]}
            >
              1 Month
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.timeRangeButton,
              timeRange === "medium_term" && styles.activeTimeRange,
            ]}
            onPress={() => setTimeRange("medium_term")}
          >
            <Text
              style={[
                styles.timeRangeText,
                timeRange === "medium_term" && styles.activeTimeRangeText,
              ]}
            >
              6 Months
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.timeRangeButton,
              timeRange === "long_term" && styles.activeTimeRange,
            ]}
            onPress={() => setTimeRange("long_term")}
          >
            <Text
              style={[
                styles.timeRangeText,
                timeRange === "long_term" && styles.activeTimeRangeText,
              ]}
            >
              Last Wrapped
            </Text>
          </TouchableOpacity>
        </View>

        {/* Last Updated */}
        {lastUpdated && (
          <View style={styles.lastUpdatedContainer}>
            <Text style={styles.lastUpdatedText}>
              Last updated: {new Date(lastUpdated).toLocaleString()}
            </Text>
          </View>
        )}
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Currently Playing */}
        {listeningStats.currentlyPlaying &&
          listeningStats.currentlyPlaying.item && (
            <View style={styles.topItemCard}>
              <Text style={styles.topItemTitle}>Currently Playing</Text>
              <View style={styles.topItemContent}>
                {listeningStats.currentlyPlaying.item.album?.images?.[0]
                  ?.url && (
                  <Image
                    source={{
                      uri: listeningStats.currentlyPlaying.item.album.images[0]
                        .url,
                    }}
                    style={styles.topItemImage}
                  />
                )}
                <View style={styles.topItemDetails}>
                  <Text style={styles.topItemName}>
                    {listeningStats.currentlyPlaying.item.name}
                  </Text>
                  <Text style={styles.topItemArtist}>
                    {listeningStats.currentlyPlaying.item.artists
                      ?.map((a) => a.name)
                      .join(", ")}
                  </Text>
                </View>
              </View>
            </View>
          )}

        {/* Top Track */}
        {listeningStats.topTracks && listeningStats.topTracks.length > 0 && (
          <View style={styles.topItemCard}>
            <View style={styles.topItemHeaderContainer}>
              <Text style={styles.topItemTitle}>Your Top Track</Text>
              <TouchableOpacity
                onPress={() =>
                  navigation.navigate("TopTracks", {
                    tracks: listeningStats.topTracks,
                    timeRange: timeRange,
                  })
                }
                style={styles.viewMoreButton}
              >
                <Text style={styles.viewMoreText}>View More</Text>
                <Ionicons name="chevron-forward" size={16} color="#9999E6" />
              </TouchableOpacity>
            </View>
            <View style={styles.topItemContent}>
              {listeningStats.topTracks[0].album?.images?.[0]?.url && (
                <Image
                  source={{
                    uri: listeningStats.topTracks[0].album.images[0].url,
                  }}
                  style={styles.topItemImage}
                />
              )}
              <View style={styles.topItemDetails}>
                <Text style={styles.topItemName}>
                  {listeningStats.topTracks[0].name}
                </Text>
                <Text style={styles.topItemArtist}>
                  {listeningStats.topTracks[0].artists
                    ?.map((a) => a.name)
                    .join(", ")}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Top Artist */}
        {listeningStats.topArtists && listeningStats.topArtists.length > 0 && (
          <View style={styles.topItemCard}>
            <View style={styles.topItemHeaderContainer}>
              <Text style={styles.topItemTitle}>Your Top Artist</Text>
              <TouchableOpacity
                onPress={() =>
                  navigation.navigate("TopArtists", {
                    artists: listeningStats.topArtists,
                    timeRange: timeRange,
                  })
                }
                style={styles.viewMoreButton}
              >
                <Text style={styles.viewMoreText}>View More</Text>
                <Ionicons name="chevron-forward" size={16} color="#9999E6" />
              </TouchableOpacity>
            </View>
            <View style={styles.topItemContent}>
              {listeningStats.topArtists[0].images?.[0]?.url && (
                <Image
                  source={{ uri: listeningStats.topArtists[0].images[0].url }}
                  style={styles.topItemImage}
                />
              )}
              <View style={styles.topItemDetails}>
                <Text style={styles.topItemName}>
                  {listeningStats.topArtists[0].name}
                </Text>
                <Text style={styles.topItemArtist}>
                  {listeningStats.topArtists[0].genres?.slice(0, 2).join(", ")}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Total Listening Time */}
        <View style={styles.statCard}>
          <View style={styles.statIconContainer}>
            <Text>
              <Ionicons name="time-outline" size={32} color="#9999E6" />
            </Text>
          </View>
          <View style={styles.statContent}>
            <Text style={styles.statTitle}>Total Listening Time</Text>
            <Text style={styles.statValue}>
              {formatMinutes(listeningStats.minutesListened)}
            </Text>
            <Text style={styles.statSubtext}>
              {`That's about ${Math.round(
                listeningStats.minutesListened / 60 / 24
              )} day(s) of music!`}
            </Text>
          </View>
        </View>

        {/* Note: Removed unique artists and tracks sections as they weren't working reliably */}

        {/* Top Genres */}
        <View style={styles.statCard}>
          <View style={styles.statIconContainer}>
            <Text>
              <Ionicons name="albums-outline" size={32} color="#9999E6" />
            </Text>
          </View>
          <View style={styles.statContent}>
            <Text style={styles.statTitle}>Top Genres</Text>
            <View style={styles.genreContainer}>
              {Array.isArray(listeningStats.topGenres) &&
              listeningStats.topGenres.length > 0 ? (
                listeningStats.topGenres.map((genre, index) => (
                  <View key={index} style={styles.genreTag}>
                    <Text style={styles.genreText}>{genre}</Text>
                  </View>
                ))
              ) : (
                <View style={styles.genreTag}>
                  <Text style={styles.genreText}>No genres available</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Daily Average */}
        <View style={styles.statCard}>
          <View style={styles.statIconContainer}>
            <Text>
              <Ionicons name="calendar-outline" size={32} color="#9999E6" />
            </Text>
          </View>
          <View style={styles.statContent}>
            <Text style={styles.statTitle}>Daily Average</Text>
            <Text style={styles.statValue}>
              {formatMinutes(listeningStats.averageDailyMinutes)}
            </Text>
            <Text style={styles.statSubtext}>
              Music is definitely part of your daily routine!
            </Text>
          </View>
        </View>

        {/* Longest Streak */}
        <View style={styles.statCard}>
          <View style={styles.statIconContainer}>
            <Text>
              <Ionicons name="flame-outline" size={32} color="#9999E6" />
            </Text>
          </View>
          <View style={styles.statContent}>
            <Text style={styles.statTitle}>Listening Streak</Text>
            <Text style={styles.statValue}>
              {`${listeningStats.listeningStreak || 0} days`}
            </Text>
            <Text style={styles.statSubtext}>
              You're committed to your music!
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  // View More styles
  topItemHeaderContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  viewMoreButton: {
    flexDirection: "row",
    alignItems: "center",
  },
  viewMoreText: {
    color: "#9999E6",
    fontSize: 14,
    marginRight: 4,
  },
  timeRangeContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
    borderRadius: 8,
    backgroundColor: theme.background.secondary,
    padding: 4,
  },
  timeRangeButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 6,
  },
  activeTimeRange: {
    backgroundColor: theme.button.primary,
  },
  timeRangeText: {
    color: theme.text.secondary,
    fontWeight: "500",
    fontSize: 12,
  },
  activeTimeRangeText: {
    color: "#FFF",
    fontWeight: "bold",
  },
  lastUpdatedContainer: {
    marginBottom: 16,
    alignItems: "center",
  },
  lastUpdatedText: {
    color: theme.text.secondary,
    fontSize: 12,
    fontStyle: "italic",
  },
  container: {
    flex: 1,
    backgroundColor: theme.background.primary,
  },
  centerContent: {
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: theme.text.primary,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: theme.background.secondary,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: theme.text.primary,
  },
  backButton: {
    padding: 5,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  errorContainer: {
    padding: 16,
    backgroundColor: "rgba(255, 0, 0, 0.1)",
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: "#ff6b6b",
    fontSize: 14,
  },
  spotifyConnectCard: {
    margin: 16,
    padding: 16,
    backgroundColor: theme.background.secondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.button.primary,
    alignItems: "center",
  },
  connectCardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: theme.text.primary,
    marginBottom: 8,
  },
  connectCardText: {
    fontSize: 14,
    color: theme.text.secondary,
    textAlign: "center",
    marginBottom: 16,
  },
  connectButton: {
    backgroundColor: theme.button.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  connectButtonText: {
    color: theme.text.primary,
    fontWeight: "bold",
  },
  topItemCard: {
    backgroundColor: theme.background.secondary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  topItemTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: theme.text.primary,
    marginBottom: 12,
  },
  topItemContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  topItemImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 16,
  },
  topItemDetails: {
    flex: 1,
  },
  topItemName: {
    fontSize: 18,
    fontWeight: "bold",
    color: theme.button.primary,
    marginBottom: 4,
  },
  topItemArtist: {
    fontSize: 14,
    color: theme.text.secondary,
  },
  statCard: {
    flexDirection: "row",
    backgroundColor: theme.background.secondary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(153, 153, 230, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  statContent: {
    flex: 1,
  },
  statTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: theme.text.primary,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: theme.button.primary,
    marginBottom: 4,
  },
  statSubtext: {
    fontSize: 14,
    color: theme.text.secondary,
  },
  genreContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 8,
  },
  genreTag: {
    backgroundColor: "rgba(153, 153, 230, 0.2)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  genreText: {
    color: theme.button.primary,
    fontWeight: "500",
  },
});
