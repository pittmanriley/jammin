import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  FlatList,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getAlbumDetails, getAlbumTracks } from "../../services/spotifyService";
import { auth, db } from "../../firebaseConfig";
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";

export default function AlbumScreen({ route, navigation }) {
  const { id, title, artist, imageUri, spotifyUri } = route.params;

  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userReview, setUserReview] = useState(null);
  const [albumGenres, setAlbumGenres] = useState([]);
  const [releaseDate, setReleaseDate] = useState(null);

  useEffect(() => {
    fetchAlbumDetails();
    fetchAlbumTracks();
    fetchUserReview();
  }, []);

  const fetchAlbumDetails = async () => {
    try {
      const albumDetails = await getAlbumDetails(id);
      // If the album has genres, we can display them
      if (
        albumDetails &&
        albumDetails.genres &&
        albumDetails.genres.length > 0
      ) {
        setAlbumGenres(albumDetails.genres);
      }
      if (albumDetails && albumDetails.release_date) {
        setReleaseDate(albumDetails.release_date);
      }
    } catch (error) {
      console.error("Error fetching album details:", error);
    }
  };

  const fetchAlbumTracks = async () => {
    try {
      setLoading(true);
      const albumTracks = await getAlbumTracks(id);

      if (albumTracks && albumTracks.items) {
        const formattedTracks = albumTracks.items.map((track, index) => ({
          id: track.id,
          name: track.name,
          trackNumber: track.track_number,
          durationMs: track.duration_ms,
          spotifyUri: track.uri,
          previewUrl: track.preview_url,
          // Use album image for all tracks
          imageUri: imageUri,
        }));

        setTracks(formattedTracks);
      }
    } catch (error) {
      console.error("Error fetching album tracks:", error);
      Alert.alert("Error", "Failed to load album tracks. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const fetchUserReview = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const reviewsRef = collection(db, "reviews");
      const q = query(
        reviewsRef,
        where("userId", "==", user.uid),
        where("itemId", "==", id),
        where("itemType", "==", "album")
      );

      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const reviewData = querySnapshot.docs[0].data();
        setUserReview(reviewData);
      }
    } catch (error) {
      console.error("Error fetching user review:", error);
    }
  };

  const formatDuration = (ms) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = ((ms % 60000) / 1000).toFixed(0);
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  };

  const renderStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    // Full stars
    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <Ionicons key={`full-${i}`} name="star" size={20} color="#FFD700" />
      );
    }

    // Half star
    if (hasHalfStar) {
      stars.push(
        <Ionicons key="half" name="star-half" size={20} color="#FFD700" />
      );
    }

    // Empty stars
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(
        <Ionicons
          key={`empty-${i}`}
          name="star-outline"
          size={20}
          color="#FFD700"
        />
      );
    }

    return stars;
  };

  const renderTrackItem = ({ item, index }) => (
    <TouchableOpacity
      style={styles.trackItem}
      onPress={() =>
        navigation.navigate("Info", {
          id: item.id,
          title: item.name,
          artist: artist,
          imageUri: item.imageUri,
          type: "track",
          spotifyUri: item.spotifyUri,
          albumId: id,
          albumTitle: title,
        })
      }
    >
      <Text style={styles.trackNumber}>{item.trackNumber}</Text>
      <View style={styles.trackInfo}>
        <Text style={styles.trackTitle}>{item.name}</Text>
        <Text style={styles.trackDuration}>
          {formatDuration(item.durationMs)}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#666" />
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
        <Text style={styles.headerTitle}>Album Details</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content}>
        {/* Album Info */}
        <View style={styles.albumInfo}>
          <Image
            source={
              imageUri
                ? { uri: imageUri }
                : require("../../assets/babydoll.jpeg")
            }
            style={styles.albumCover}
          />
          <View style={styles.albumDetails}>
            <Text style={styles.albumTitle}>{title}</Text>
            <Text style={styles.albumArtist}>{artist}</Text>
            {releaseDate && (
              <Text style={styles.releaseDate}>{releaseDate}</Text>
            )}

            {/* Display genres if available */}
            {albumGenres.length > 0 && (
              <View style={styles.genresContainer}>
                {albumGenres.map((genre, index) => (
                  <View key={index} style={styles.genreTag}>
                    <Text style={styles.genreText}>{genre}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>

        {/* User's Review (if exists) */}
        {userReview && (
          <View style={styles.userReviewContainer}>
            <TouchableOpacity
              style={styles.editReviewIcon}
              onPress={() =>
                navigation.navigate("LeaveReview", {
                  song: {
                    id: id,
                    name: title,
                    artist: artist,
                    imageUri: imageUri,
                    spotifyUri: spotifyUri,
                    type: "album",
                  },
                })
              }
            >
              <Ionicons name="create-outline" size={22} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.userReviewTitle}>My Review</Text>
            <View style={styles.userReviewContent}>
              <View style={styles.starsContainer}>
                {renderStars(userReview.rating)}
                <Text style={styles.ratingText}>
                  {userReview.rating.toFixed(1)}
                </Text>
              </View>
              <Text style={styles.userReviewText}>{userReview.review}</Text>
              <Text style={styles.userReviewDate}>
                {new Date(
                  userReview.createdAt.seconds * 1000
                ).toLocaleDateString()}
              </Text>
            </View>
          </View>
        )}

        {/* Tracks List */}
        <View style={styles.tracksContainer}>
          <Text style={styles.tracksTitle}>Tracks</Text>

          {loading ? (
            <ActivityIndicator
              size="large"
              color="#1DB954"
              style={styles.loader}
            />
          ) : (
            <FlatList
              data={tracks}
              renderItem={renderTrackItem}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              ListEmptyComponent={
                <Text style={styles.emptyText}>No tracks available</Text>
              }
            />
          )}
        </View>
      </ScrollView>
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
  content: {
    flex: 1,
  },
  albumInfo: {
    flexDirection: "row",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  albumCover: {
    width: 120,
    height: 120,
    borderRadius: 6,
  },
  albumDetails: {
    flex: 1,
    marginLeft: 16,
    justifyContent: "center",
  },
  genresContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 12,
  },
  genreTag: {
    backgroundColor: "#333",
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginRight: 6,
    marginBottom: 6,
  },
  genreText: {
    color: "#1DB954",
    fontSize: 12,
    fontWeight: "bold",
  },
  albumTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 8,
  },
  albumArtist: {
    fontSize: 16,
    color: "#b3b3b3",
    marginBottom: 8,
  },
  releaseDate: {
    color: "#b3b3b3",
    fontSize: 14,
    marginBottom: 12,
  },
  userReviewContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  editReviewIcon: {
    position: "absolute",
    top: 10,
    right: 10,
    zIndex: 2,
    padding: 6,
  },
  userReviewTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 12,
  },
  userReviewContent: {
    backgroundColor: "#1E1E1E",
    borderRadius: 8,
    padding: 16,
  },
  starsContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  ratingText: {
    color: "#FFD700",
    marginLeft: 8,
    fontWeight: "bold",
  },
  userReviewText: {
    color: "#fff",
    fontSize: 14,
    lineHeight: 20,
  },
  userReviewDate: {
    color: "#666",
    fontSize: 12,
    marginTop: 12,
    textAlign: "right",
  },
  tracksContainer: {
    padding: 16,
  },
  tracksTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 16,
  },
  trackItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  trackNumber: {
    width: 30,
    color: "#b3b3b3",
    fontSize: 14,
    textAlign: "center",
  },
  trackInfo: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginLeft: 12,
  },
  trackTitle: {
    color: "#fff",
    fontSize: 16,
    flex: 1,
  },
  trackDuration: {
    color: "#b3b3b3",
    fontSize: 14,
    marginLeft: 16,
    marginRight: 16,
  },
  loader: {
    marginTop: 20,
  },
  emptyText: {
    color: "#666",
    textAlign: "center",
    marginTop: 20,
  },
});
