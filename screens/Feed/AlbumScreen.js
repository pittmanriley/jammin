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
  doc,
  getDoc,
  deleteDoc,
} from "firebase/firestore";
import { theme } from "../../theme/theme";

export default function AlbumScreen({ route, navigation }) {
  const { id, title, artist, imageUri, spotifyUri, clickedReview } =
    route.params;

  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userReview, setUserReview] = useState(null);
  const [albumGenres, setAlbumGenres] = useState([]);
  const [releaseDate, setReleaseDate] = useState(null);
  const [allReviews, setAllReviews] = useState([]);
  const [loadingReviews, setLoadingReviews] = useState(true);

  useEffect(() => {
    fetchAlbumDetails();
    fetchAlbumTracks();
    fetchUserReview();
    fetchAllReviews();
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
        const reviewDoc = querySnapshot.docs[0];
        const reviewData = reviewDoc.data();
        setUserReview({
          id: reviewDoc.id, // Make sure we're setting the document ID
          ...reviewData,
        });
      }
    } catch (error) {
      console.error("Error fetching user review:", error);
    }
  };

  const fetchAllReviews = async () => {
    try {
      setLoadingReviews(true);
      const reviewsRef = collection(db, "reviews");
      const q = query(
        reviewsRef,
        where("itemId", "==", id),
        where("itemType", "==", "album")
      );

      const querySnapshot = await getDocs(q);
      const reviews = [];

      // Get all user data for the reviews
      const userIds = new Set();
      querySnapshot.forEach((doc) => {
        const reviewData = doc.data();
        reviews.push({
          id: doc.id,
          ...reviewData,
        });
        userIds.add(reviewData.userId);
      });

      // Fetch usernames for all reviewers
      const userData = {};
      for (const uid of userIds) {
        const userRef = doc(db, "users", uid);
        const userDoc = await getDoc(userRef);
        if (userDoc.exists()) {
          userData[uid] = {
            username: userDoc.data().username || "",
            displayName: userDoc.data().displayName || "",
          };
        }
      }

      // Add username info to each review
      const reviewsWithUsernames = reviews.map((review) => ({
        ...review,
        username: userData[review.userId]?.username || "",
        displayName: userData[review.userId]?.displayName || "",
      }));

      // Sort by most recent first
      reviewsWithUsernames.sort((a, b) => {
        const dateA = a.createdAt?.seconds || 0;
        const dateB = b.createdAt?.seconds || 0;
        return dateB - dateA;
      });

      setAllReviews(reviewsWithUsernames);
    } catch (error) {
      console.error("Error fetching all reviews:", error);
    } finally {
      setLoadingReviews(false);
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
      <Ionicons name="chevron-forward" size={20} color={theme.text.secondary} />
    </TouchableOpacity>
  );

  const handleDeleteReview = async () => {
    try {
      if (!userReview || !userReview.id) {
        console.error("No review ID found");
        return;
      }

      Alert.alert(
        "Delete Review",
        "Are you sure you want to delete this review?",
        [
          {
            text: "Cancel",
            style: "cancel",
          },
          {
            text: "Delete",
            style: "destructive",
            onPress: async () => {
              try {
                console.log("Deleting review with ID:", userReview.id);
                const reviewRef = doc(db, "reviews", userReview.id);
                await deleteDoc(reviewRef);
                console.log("Review deleted successfully");
                setUserReview(null);
                // Refresh all reviews after deletion
                await fetchAllReviews();
              } catch (error) {
                console.error("Error in delete operation:", error);
                Alert.alert(
                  "Error",
                  "Failed to delete review. Please try again."
                );
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error("Error in delete confirmation:", error);
      Alert.alert("Error", "Failed to delete review. Please try again.");
    }
  };

  return (
    <View style={styles.container}>
      {/* Header with back button */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={theme.text.primary} />
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
            <View style={styles.userReviewHeader}>
              <Text style={styles.userReviewTitle}>My Review</Text>
              <TouchableOpacity
                onPress={handleDeleteReview}
                style={styles.deleteButton}
              >
                <Ionicons
                  name="trash-outline"
                  size={20}
                  color={theme.text.secondary}
                />
              </TouchableOpacity>
            </View>
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

        {/* Review Button */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.reviewButton}
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
                existingReview: userReview,
              })
            }
          >
            <Ionicons
              name="create-outline"
              size={22}
              color={theme.text.primary}
            />
            <Text style={styles.buttonText}>
              {userReview ? "Edit Review" : "Leave Review"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* All Reviews Section - Only shown when there are reviews */}
        {loadingReviews ? (
          <View style={styles.reviewsContainer}>
            <Text style={styles.reviewsTitle}>All Reviews</Text>
            <ActivityIndicator
              size="large"
              color={theme.button.primary}
              style={styles.loader}
            />
          </View>
        ) : allReviews.length > 0 && (
          <View style={styles.reviewsContainer}>
            <Text style={styles.reviewsTitle}>All Reviews</Text>
            <FlatList
              data={allReviews}
              keyExtractor={(review) => review.id || Math.random().toString()}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingVertical: 8 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.reviewBlockHorizontal}
                  onPress={() =>
                    navigation.navigate("ReviewDetail", { review: item })
                  }
                >
                  <Text style={styles.reviewUser}>
                    @{item.username || "User"}
                  </Text>
                  <View style={styles.starsContainer}>
                    {[1, 2, 3, 4, 5].map((star) => {
                      const fullStar = star <= Math.floor(item.rating);
                      const halfStar =
                        !fullStar &&
                        star === Math.floor(item.rating) + 1 &&
                        item.rating % 1 !== 0;
                      return (
                        <Ionicons
                          key={star}
                          name={
                            fullStar
                              ? "star"
                              : halfStar
                              ? "star-half"
                              : "star-outline"
                          }
                          size={16}
                          color="#FFD700"
                          style={{ marginRight: 2 }}
                        />
                      );
                    })}
                    <Text style={styles.ratingText}>
                      {item.rating ? item.rating.toFixed(1) : ""}
                    </Text>
                  </View>
                  {item.review && item.review.trim() !== '' && (
                    <Text
                      style={styles.reviewText}
                      numberOfLines={2}
                      ellipsizeMode="tail"
                    >
                      "{item.review}"
                    </Text>
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        )}

        {/* Tracks List */}
        <View style={styles.tracksContainer}>
          <Text style={styles.tracksTitle}>Tracks</Text>

          {loading ? (
            <ActivityIndicator
              size="large"
              color={theme.button.primary}
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
    backgroundColor: theme.background.primary,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: theme.background.primary,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: theme.text.primary,
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
    borderBottomColor: theme.background.secondary,
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
    backgroundColor: theme.background.secondary,
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginRight: 6,
    marginBottom: 6,
  },
  genreText: {
    color: theme.button.primary,
    fontSize: 12,
    fontWeight: "bold",
  },
  albumTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: theme.text.primary,
    marginBottom: 8,
  },
  albumArtist: {
    fontSize: 16,
    color: theme.text.secondary,
    marginBottom: 8,
  },
  releaseDate: {
    color: theme.text.secondary,
    fontSize: 14,
    marginBottom: 12,
  },
  userReviewContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.background.secondary,
  },
  userReviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: theme.background.primary,
    padding: 10,
  },
  deleteButton: {
    padding: 5,
  },
  userReviewTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: theme.text.primary,
    marginBottom: 12,
  },
  userReviewContent: {
    backgroundColor: theme.background.secondary,
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
    color: theme.text.primary,
    fontSize: 14,
    lineHeight: 20,
  },
  userReviewDate: {
    color: theme.text.secondary,
    fontSize: 12,
    marginTop: 12,
    textAlign: "right",
  },
  reviewsContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.background.secondary,
  },
  reviewsTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: theme.text.primary,
    marginBottom: 16,
  },
  reviewBlockHorizontal: {
    width: 220,
    marginRight: 16,
    padding: 12,
    backgroundColor: theme.background.secondary,
    borderRadius: 8,
  },
  reviewUser: {
    color: theme.text.primary,
    fontWeight: "bold",
    fontSize: 16,
    marginBottom: 4,
  },
  reviewText: {
    color: theme.text.secondary,
    fontSize: 14,
    fontStyle: "italic",
    marginBottom: 4,
  },
  noReviewsContainer: {
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  tracksContainer: {
    padding: 16,
  },
  tracksTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: theme.text.primary,
    marginBottom: 16,
  },
  trackItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.background.secondary,
  },
  trackNumber: {
    width: 30,
    color: theme.text.secondary,
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
    color: theme.text.primary,
    fontSize: 16,
    flex: 1,
  },
  trackDuration: {
    color: theme.text.secondary,
    fontSize: 14,
    marginLeft: 16,
    marginRight: 16,
  },
  loader: {
    marginTop: 20,
  },
  emptyText: {
    color: theme.text.secondary,
    textAlign: "center",
    marginTop: 20,
  },
  buttonContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.background.secondary,
  },
  reviewButton: {
    backgroundColor: theme.background.secondary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 20,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
  },
  buttonText: {
    color: theme.text.primary,
    marginLeft: 8,
    fontSize: 14,
    fontWeight: "500",
  },
});
