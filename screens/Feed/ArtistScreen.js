import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  getArtist,
  getArtistTopTracks,
  getArtistAlbums,
} from "../../services/spotifyService";

export default function ArtistScreen({ route, navigation }) {
  const { id, name, imageUri, spotifyUri } = route.params;

  const [artist, setArtist] = useState(null);
  const [topTracks, setTopTracks] = useState([]);
  const [albums, setAlbums] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchArtistData();
  }, []);

  const fetchArtistData = async () => {
    try {
      setLoading(true);

      // Fetch artist details
      const artistData = await getArtist(id);
      setArtist(artistData);

      // Fetch top tracks
      const tracksData = await getArtistTopTracks(id);
      if (tracksData && tracksData.tracks) {
        setTopTracks(
          tracksData.tracks.map((track) => ({
            id: track.id,
            name: track.name,
            album: track.album.name,
            imageUri: track.album.images[0]?.url,
            spotifyUri: track.uri,
            durationMs: track.duration_ms,
          }))
        );
      }

      // Fetch albums
      const albumsData = await getArtistAlbums(id, "album,single", 10);
      if (albumsData && albumsData.items) {
        setAlbums(
          albumsData.items.map((album) => ({
            id: album.id,
            name: album.name,
            imageUri: album.images[0]?.url,
            releaseDate: album.release_date,
            totalTracks: album.total_tracks,
            spotifyUri: album.uri,
          }))
        );
      }
    } catch (error) {
      console.error("Error fetching artist data:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (ms) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = ((ms % 60000) / 1000).toFixed(0);
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  };

  const formatFollowers = (count) => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M followers`;
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K followers`;
    }
    return `${count} followers`;
  };

  const renderTrackItem = ({ item, index }) => (
    <TouchableOpacity
      style={styles.trackItem}
      onPress={() =>
        navigation.navigate("Info", {
          id: item.id,
          title: item.name,
          artist: name,
          imageUri: item.imageUri,
          type: "track",
          spotifyUri: item.spotifyUri,
        })
      }
    >
      <Text style={styles.trackNumber}>{index + 1}</Text>
      <Image
        source={
          item.imageUri
            ? { uri: item.imageUri }
            : require("../../assets/babydoll.jpeg")
        }
        style={styles.trackImage}
      />
      <View style={styles.trackInfo}>
        <Text style={styles.trackTitle}>{item.name}</Text>
        <Text style={styles.trackAlbum}>{item.album}</Text>
      </View>
      <Text style={styles.trackDuration}>
        {formatDuration(item.durationMs)}
      </Text>
    </TouchableOpacity>
  );

  const renderAlbumItem = ({ item }) => (
    <TouchableOpacity
      style={styles.albumItem}
      onPress={() =>
        navigation.navigate("Album", {
          id: item.id,
          title: item.name,
          artist: name,
          imageUri: item.imageUri,
          spotifyUri: item.spotifyUri,
        })
      }
    >
      <Image
        source={
          item.imageUri
            ? { uri: item.imageUri }
            : require("../../assets/babydoll.jpeg")
        }
        style={styles.albumCover}
      />
      <Text style={styles.albumTitle} numberOfLines={2}>
        {item.name}
      </Text>
      <Text style={styles.albumYear}>{item.releaseDate?.substring(0, 4)}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header with back button */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Artist</Text>
        <View style={styles.placeholder} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1DB954" />
        </View>
      ) : (
        <ScrollView style={styles.content}>
          {/* Artist Info */}
          <View style={styles.artistHeader}>
            <Image
              source={
                imageUri
                  ? { uri: imageUri }
                  : require("../../assets/babydoll.jpeg")
              }
              style={styles.artistImage}
            />
            <Text style={styles.artistName}>{name}</Text>
            {artist && artist.followers && (
              <Text style={styles.followerCount}>
                {formatFollowers(artist.followers.total)}
              </Text>
            )}
            {artist && artist.genres && artist.genres.length > 0 && (
              <View style={styles.genresContainer}>
                {artist.genres.slice(0, 3).map((genre, index) => (
                  <View key={index} style={styles.genreTag}>
                    <Text style={styles.genreText}>{genre}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Popular Tracks */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Popular</Text>
            {topTracks.length > 0 ? (
              <FlatList
                data={topTracks.slice(0, 5)}
                renderItem={renderTrackItem}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
              />
            ) : (
              <Text style={styles.emptyText}>No tracks available</Text>
            )}
          </View>

          {/* Albums */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Albums & Singles</Text>
            {albums.length > 0 ? (
              <FlatList
                data={albums}
                renderItem={renderAlbumItem}
                keyExtractor={(item) => item.id}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.albumsContainer}
              />
            ) : (
              <Text style={styles.emptyText}>No albums available</Text>
            )}
          </View>

          {/* Open in Spotify Button */}
          <TouchableOpacity
            style={styles.spotifyButton}
            onPress={() => {
              // Handle opening in Spotify
              console.log("Open in Spotify:", spotifyUri);
            }}
          >
            <Ionicons name="musical-notes" size={20} color="#fff" />
            <Text style={styles.spotifyButtonText}>Open in Spotify</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#121212",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: "#121212",
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
  },
  placeholder: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    flex: 1,
  },
  artistHeader: {
    alignItems: "center",
    padding: 20,
  },
  artistImage: {
    width: 150,
    height: 150,
    borderRadius: 75,
    marginBottom: 16,
  },
  artistName: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 8,
  },
  followerCount: {
    fontSize: 14,
    color: "#b3b3b3",
    marginBottom: 16,
  },
  genresContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
  },
  genreTag: {
    backgroundColor: "#333",
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 12,
    margin: 4,
  },
  genreText: {
    color: "#fff",
    fontSize: 12,
  },
  sectionContainer: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 16,
  },
  trackItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  trackNumber: {
    width: 30,
    color: "#b3b3b3",
    fontSize: 14,
    textAlign: "center",
  },
  trackImage: {
    width: 40,
    height: 40,
    borderRadius: 4,
    marginRight: 12,
  },
  trackInfo: {
    flex: 1,
  },
  trackTitle: {
    color: "#fff",
    fontSize: 16,
  },
  trackAlbum: {
    color: "#b3b3b3",
    fontSize: 12,
  },
  trackDuration: {
    color: "#b3b3b3",
    fontSize: 12,
    marginLeft: 8,
  },
  albumsContainer: {
    paddingBottom: 16,
  },
  albumItem: {
    width: 140,
    marginRight: 16,
  },
  albumCover: {
    width: 140,
    height: 140,
    borderRadius: 4,
    marginBottom: 8,
  },
  albumTitle: {
    color: "#fff",
    fontSize: 14,
    marginBottom: 4,
  },
  albumYear: {
    color: "#b3b3b3",
    fontSize: 12,
  },
  emptyText: {
    color: "#b3b3b3",
    fontSize: 14,
    fontStyle: "italic",
    textAlign: "center",
    marginVertical: 20,
  },
  spotifyButton: {
    flexDirection: "row",
    backgroundColor: "#1DB954",
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginVertical: 30,
  },
  spotifyButtonText: {
    color: "#fff",
    fontWeight: "bold",
    marginLeft: 8,
  },
});
