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
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import {
  getUserListeningStats,
  isSpotifyConnected,
} from "../services/spotifyService";

const windowWidth = Dimensions.get("window").width;

export default function Stats({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [spotifyConnected, setSpotifyConnected] = useState(false);
  const [listeningStats, setListeningStats] = useState({
    minutesListened: 0,
    artistsListened: 0,
    songsPlayed: 0,
    topGenres: [],
    averageDailyMinutes: 0,
    longestListeningStreak: 0,
    topTrack: null,
    topArtist: null,
  });

  useEffect(() => {
    checkSpotifyAndLoadStats();
  }, []);

  const checkSpotifyAndLoadStats = async () => {
    try {
      const connected = await isSpotifyConnected();
      setSpotifyConnected(connected);

      if (connected) {
        const stats = await getUserListeningStats();
        setListeningStats(stats);
      } else {
        // Use mock data if not connected to Spotify
        setListeningStats({
          minutesListened: 12467,
          artistsListened: 143,
          songsPlayed: 1892,
          topGenres: ["Pop", "Hip-Hop", "Indie", "R&B", "Rock"],
          averageDailyMinutes: 78,
          longestListeningStreak: 42,
        });
      }
    } catch (err) {
      console.error(`Error loading stats: ${err.message}`);
      setError("Failed to load your listening stats. Please try again.");
      // Fallback to mock data on error
      setListeningStats({
        minutesListened: 12467,
        artistsListened: 143,
        songsPlayed: 1892,
        topGenres: ["Pop", "Hip-Hop", "Indie", "R&B", "Rock"],
        averageDailyMinutes: 78,
        longestListeningStreak: 42,
      });
    } finally {
      setLoading(false);
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

  if (loading) {
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
          <Text style={{height: 28}}>
            <Ionicons name="arrow-back" size={28} color="white" />
          </Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Listening Stats</Text>
        <View style={{ width: 28 }} /> {/* Empty view for spacing */}
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

      <ScrollView style={styles.content}>
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {listeningStats.topTrack && (
          <View style={styles.topItemCard}>
            <Text style={styles.topItemTitle}>Your Top Track</Text>
            <View style={styles.topItemContent}>
              {listeningStats.topTrack.album?.images?.[0]?.url && (
                <Image
                  source={{ uri: listeningStats.topTrack.album.images[0].url }}
                  style={styles.topItemImage}
                />
              )}
              <View style={styles.topItemDetails}>
                <Text style={styles.topItemName}>
                  {listeningStats.topTrack.name}
                </Text>
                <Text style={styles.topItemArtist}>
                  {listeningStats.topTrack.artists
                    ?.map((a) => a.name)
                    .join(", ")}
                </Text>
              </View>
            </View>
          </View>
        )}

        {listeningStats.topArtist && (
          <View style={styles.topItemCard}>
            <Text style={styles.topItemTitle}>Your Top Artist</Text>
            <View style={styles.topItemContent}>
              {listeningStats.topArtist.images?.[0]?.url && (
                <Image
                  source={{ uri: listeningStats.topArtist.images[0].url }}
                  style={styles.topItemImage}
                />
              )}
              <View style={styles.topItemDetails}>
                <Text style={styles.topItemName}>
                  {listeningStats.topArtist.name}
                </Text>
                <Text style={styles.topItemArtist}>
                  {listeningStats.topArtist.genres?.slice(0, 2).join(", ")}
                </Text>
              </View>
            </View>
          </View>
        )}
        {/* Total Listening Time */}
        <View style={styles.statCard}>
          <View style={styles.statIconContainer}>
            <Text style={{height: 32}}>
              <Ionicons name="time-outline" size={32} color="#1DB954" />
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

        {/* Artists Discovered */}
        <View style={styles.statCard}>
          <View style={styles.statIconContainer}>
            <Text style={{height: 32}}>
              <Ionicons name="people-outline" size={32} color="#1DB954" />
            </Text>
          </View>
          <View style={styles.statContent}>
            <Text style={styles.statTitle}>Artists Discovered</Text>
            <Text style={styles.statValue}>
              {listeningStats.artistsListened}
            </Text>
            <Text style={styles.statSubtext}>
              You've explored a diverse range of artists
            </Text>
          </View>
        </View>

        {/* Songs Played */}
        <View style={styles.statCard}>
          <View style={styles.statIconContainer}>
            <Text style={{height: 32}}>
              <Ionicons name="musical-notes-outline" size={32} color="#1DB954" />
            </Text>
          </View>
          <View style={styles.statContent}>
            <Text style={styles.statTitle}>Songs Played</Text>
            <Text style={styles.statValue}>{listeningStats.songsPlayed}</Text>
            <Text style={styles.statSubtext}>That's a lot of great music!</Text>
          </View>
        </View>

        {/* Top Genres */}
        <View style={styles.statCard}>
          <View style={styles.statIconContainer}>
            <Text style={{height: 32}}>
              <Ionicons name="albums-outline" size={32} color="#1DB954" />
            </Text>
          </View>
          <View style={styles.statContent}>
            <Text style={styles.statTitle}>Top Genres</Text>
            <View style={styles.genreContainer}>
              {listeningStats.topGenres.map((genre, index) => (
                <View key={index} style={styles.genreTag}>
                  <Text style={styles.genreText}>{genre}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Daily Average */}
        <View style={styles.statCard}>
          <View style={styles.statIconContainer}>
            <Text style={{height: 32}}>
              <Ionicons name="calendar-outline" size={32} color="#1DB954" />
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
            <Text style={{height: 32}}>
              <Ionicons name="flame-outline" size={32} color="#1DB954" />
            </Text>
          </View>
          <View style={styles.statContent}>
            <Text style={styles.statTitle}>Longest Listening Streak</Text>
            <Text style={styles.statValue}>
              {`${listeningStats.longestListeningStreak} days`}
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
  centerContent: {
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "white",
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
    backgroundColor: "#1E1E1E",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1DB954",
    alignItems: "center",
  },
  connectCardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "white",
    marginBottom: 8,
  },
  connectCardText: {
    fontSize: 14,
    color: "#9ca3af",
    textAlign: "center",
    marginBottom: 16,
  },
  connectButton: {
    backgroundColor: "#1DB954",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  connectButtonText: {
    color: "white",
    fontWeight: "bold",
  },
  topItemCard: {
    backgroundColor: "#1E1E1E",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  topItemTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "white",
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
    color: "#1DB954",
    marginBottom: 4,
  },
  topItemArtist: {
    fontSize: 14,
    color: "#9ca3af",
  },
  container: {
    flex: 1,
    backgroundColor: "#121212",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "white",
  },
  backButton: {
    padding: 5,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  statCard: {
    flexDirection: "row",
    backgroundColor: "#1E1E1E",
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
    backgroundColor: "rgba(29, 185, 84, 0.1)",
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
    color: "white",
    marginBottom: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1DB954",
    marginBottom: 4,
  },
  statSubtext: {
    fontSize: 14,
    color: "#9ca3af",
  },
  genreContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 8,
  },
  genreTag: {
    backgroundColor: "rgba(29, 185, 84, 0.2)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  genreText: {
    color: "#1DB954",
    fontWeight: "500",
  },
});
