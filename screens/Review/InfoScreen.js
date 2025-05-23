import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  Alert,
  Linking,
  FlatList,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { auth, db } from "../../firebaseConfig";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  arrayUnion,
  getDoc,
  setDoc,
  or,
  deleteDoc,
} from "firebase/firestore";
import { getTrackDetails, getArtist } from "../../services/spotifyService";
import { useRoute } from "@react-navigation/native";
import { theme } from "../../theme/theme";

export default function InfoScreen({ route, navigation }) {
  const { id, title, artist, imageUri, type, spotifyUri, albumId, albumTitle } =
    route.params;

  const [userReview, setUserReview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [genres, setGenres] = useState([]);
  const [isSaved, setIsSaved] = useState(false);
  const [savingItem, setSavingItem] = useState(false);
  const [allReviews, setAllReviews] = useState([]);
  const [friendReviews, setFriendReviews] = useState([]);

  useEffect(() => {
    fetchUserReview();
    fetchTrackDetails();
    checkIfItemIsSaved();
    fetchAllReviews();
    fetchFriendReviews();
  }, []);

  const checkIfItemIsSaved = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const userRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userRef);

      if (userDoc.exists()) {
        const userData = userDoc.data();
        if (userData.savedItems && Array.isArray(userData.savedItems)) {
          const isItemSaved = userData.savedItems.some(
            (item) => item.id === id
          );
          setIsSaved(isItemSaved);
        }
      }
    } catch (error) {
      console.error("Error checking if item is saved:", error);
    }
  };

  const handleSaveItem = async () => {
    try {
      setSavingItem(true);
      const user = auth.currentUser;
      if (!user) {
        Alert.alert("Error", "You need to be logged in to save items");
        return;
      }

      const userRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userRef);

      const itemData = {
        id,
        title,
        artist,
        imageUri,
        type,
        spotifyUri,
        savedAt: new Date().toISOString(),
      };

      if (userDoc.exists()) {
        const userData = userDoc.data();
        let updatedSavedItems = [];

        if (userData.savedItems && Array.isArray(userData.savedItems)) {
          // Check if item is already saved
          const existingIndex = userData.savedItems.findIndex(
            (item) => item.id === id
          );

          if (existingIndex >= 0) {
            // Item exists, remove it
            updatedSavedItems = [...userData.savedItems];
            updatedSavedItems.splice(existingIndex, 1);
            setIsSaved(false);
          } else {
            // Item doesn't exist, add it
            updatedSavedItems = [...userData.savedItems, itemData];
            setIsSaved(true);
          }
        } else {
          // No saved items array yet, create it
          updatedSavedItems = [itemData];
          setIsSaved(true);
        }

        // Update the document
        await updateDoc(userRef, {
          savedItems: updatedSavedItems,
        });
      } else {
        // Create user document if it doesn't exist
        await setDoc(userRef, {
          email: user.email,
          displayName: user.displayName || "User",
          savedItems: [itemData],
          createdAt: new Date().toISOString(),
        });
        setIsSaved(true);
      }
    } catch (error) {
      console.error("Error saving item:", error);
      Alert.alert("Error", "Failed to save item. Please try again.");
    } finally {
      setSavingItem(false);
    }
  };

  const openInSpotify = () => {
    if (spotifyUri) {
      Linking.canOpenURL(spotifyUri)
        .then((supported) => {
          if (supported) {
            // Try to open in Spotify app
            Linking.openURL(spotifyUri);
          } else {
            // If Spotify app is not installed, open in web browser
            let webUrl;

            if (spotifyUri.includes("spotify:track:")) {
              // Format for tracks: spotify:track:5ch484wWUkTPp6saoxACAN -> https://open.spotify.com/track/5ch484wWUkTPp6saoxACAN
              const trackId = spotifyUri.split("spotify:track:")[1];
              webUrl = `https://open.spotify.com/track/${trackId}`;
            } else if (spotifyUri.includes("spotify:album:")) {
              // Format for albums: spotify:album:4StaOoKvc1slai3SMaOhCZ -> https://open.spotify.com/album/4StaOoKvc1slai3SMaOhCZ
              const albumId = spotifyUri.split("spotify:album:")[1];
              webUrl = `https://open.spotify.com/album/${albumId}`;
            } else if (spotifyUri.includes("spotify:artist:")) {
              // Format for artists: spotify:artist:123456 -> https://open.spotify.com/artist/123456
              const artistId = spotifyUri.split("spotify:artist:")[1];
              webUrl = `https://open.spotify.com/artist/${artistId}`;
            } else {
              // Fallback for other types
              webUrl = spotifyUri
                .replace("spotify:", "https://open.spotify.com/")
                .replace(/:/g, "/");
            }

            console.log("Opening Spotify web URL:", webUrl);
            Linking.openURL(webUrl);
          }
        })
        .catch((err) => {
          // Fallback to web URL if there's an error
          const trackId =
            spotifyUri.split("spotify:track:")[1] ||
            spotifyUri.split("spotify:album:")[1];
          const webUrl = `https://open.spotify.com/${type}/${trackId}`;
          Linking.openURL(webUrl);
        });
    } else {
      Alert.alert("Error", "Spotify link not available for this item");
    }
  };

  const fetchTrackDetails = async () => {
    try {
      if (type === "track") {
        const trackDetails = await getTrackDetails(id);

        // Get artist details to fetch genres
        if (
          trackDetails &&
          trackDetails.artists &&
          trackDetails.artists.length > 0
        ) {
          const artistId = trackDetails.artists[0].id;
          const artistDetails = await getArtist(artistId);

          if (artistDetails && artistDetails.genres) {
            setGenres(artistDetails.genres);
          }
        }
      }
    } catch (error) {
      console.error("Error fetching track details:", error);
    }
  };

  const fetchUserReview = async () => {
    try {
      setLoading(true);
      const user = auth.currentUser;
      if (!user) return;

      const reviewsRef = collection(db, "reviews");
      const q = query(
        reviewsRef,
        where("userId", "==", user.uid),
        where("itemId", "==", id),
        where("itemType", "==", type)
      );

      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const reviewDoc = querySnapshot.docs[0];
        const reviewData = reviewDoc.data();
        setUserReview({ id: reviewDoc.id, ...reviewData });
      }
    } catch (error) {
      console.error("Error fetching user review:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllReviews = async () => {
    try {
      const reviewsRef = collection(db, "reviews");
      const q = query(
        reviewsRef,
        where("itemTitle", "==", title),
        where("itemArtist", "==", artist)
      );
      const querySnapshot = await getDocs(q);
      const reviewsList = [];
      querySnapshot.forEach((doc) => {
        reviewsList.push({ id: doc.id, ...doc.data() });
      });
      setAllReviews(reviewsList);
    } catch (error) {
      console.error("Error fetching all reviews:", error);
    }
  };

  const fetchFriendReviews = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;
      const userRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userRef);
      if (!userDoc.exists()) return;
      const userData = userDoc.data();
      const friendIds = userData.friends || [];
      if (friendIds.length === 0) {
        setFriendReviews([]);
        return;
      }
      // Firestore doesn't support 'in' with more than 10 elements, so batch if needed
      let allReviews = [];
      const batchSize = 10;
      for (let i = 0; i < friendIds.length; i += batchSize) {
        const batch = friendIds.slice(i, i + batchSize);
        const reviewsRef = collection(db, "reviews");
        const q = query(
          reviewsRef,
          where("userId", "in", batch),
          where("itemId", "==", id),
          where("itemType", "==", type)
        );
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach((doc) => {
          allReviews.push({ id: doc.id, ...doc.data() });
        });
      }
      setFriendReviews(allReviews);
    } catch (error) {
      console.error("Error fetching friend reviews:", error);
    }
  };

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
                await fetchFriendReviews();
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

  // Calculate average rating for all reviews and friend reviews
  const allRatings = [
    ...allReviews.map((r) => r.rating),
    ...friendReviews.map((r) => r.rating),
  ].filter((r) => typeof r === "number" && !isNaN(r));

  const hasReviews = allRatings.length > 0;
  const avgRating = hasReviews
    ? Math.round(
        (allRatings.reduce((a, b) => a + b, 0) / allRatings.length) * 10
      ) / 10
    : null;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={theme.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Song Info</Text>
        <TouchableOpacity onPress={openInSpotify}>
          <Ionicons
            name="play-circle-outline"
            size={28}
            color={theme.button.primary}
          />
        </TouchableOpacity>
      </View>

      {/* Scrollable content below */}
      <ScrollView
        style={styles.scrollContent}
        contentContainerStyle={{ paddingBottom: 50 }}
      >
        {/* Song/Album Info */}
        <View style={styles.itemInfo}>
          <View style={styles.itemText}>
            <Text style={styles.itemTitle}>{title}</Text>
            <Text style={styles.artist}>{artist}</Text>
            {albumTitle && (
              <Text style={styles.albumTitle}>From: {albumTitle}</Text>
            )}

            {/* Display genres if available */}
            {genres.length > 0 && (
              <View style={styles.genresContainer}>
                {genres.slice(0, 3).map((genre, index) => (
                  <View key={index} style={styles.genreTag}>
                    <Text style={styles.genreText}>{genre}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
          <Image
            source={
              imageUri
                ? { uri: imageUri }
                : require("../../assets/babydoll.jpeg")
            }
            style={styles.coverArt}
          />
        </View>

        {/* User's Review (if exists) */}
        {loading ? (
          <ActivityIndicator
            size="small"
            color={theme.button.primary}
            style={styles.loader}
          />
        ) : (
          userReview && (
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
          )
        )}

        {/* All Reviews Section */}
        <Text style={styles.sectionTitle}>All Reviews:</Text>
        <View style={styles.divider} />
        {allReviews.length > 0 ? (
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
                  @{item.username || "Friend"}
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
                <Text
                  style={styles.reviewText}
                  numberOfLines={2}
                  ellipsizeMode="tail"
                >
                  "{item.review}"
                </Text>
              </TouchableOpacity>
            )}
          />
        ) : (
          <View style={styles.noReviewsContainer}>
            <Text style={styles.emptyText}>No reviews yet</Text>
          </View>
        )}

        {/* Friend Reviews Section (use same style as All Reviews) */}
        <Text style={styles.sectionTitleWithMargin}>Follower Reviews:</Text>
        <View style={styles.divider} />
        <FlatList
          data={friendReviews}
          keyExtractor={(item) => item.id}
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
                @{item.username || "Friend"}
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
              <Text
                style={styles.reviewText}
                numberOfLines={2}
                ellipsizeMode="tail"
              >
                {item.review ? `"${item.review}"` : ""}
              </Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No friend reviews yet</Text>
          }
        />

        {/* Overall Rating */}
        <Text style={styles.sectionTitleWithMargin}>Overall Rating:</Text>
        <View style={styles.overallRatingContainer}>
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((star) => {
              let icon = "star-outline";
              if (hasReviews) {
                if (star <= Math.floor(avgRating)) {
                  icon = "star";
                } else if (
                  star === Math.floor(avgRating) + 1 &&
                  avgRating % 1 >= 0.5
                ) {
                  icon = "star-half";
                }
              }
              return (
                <Ionicons
                  key={star}
                  name={icon}
                  size={24}
                  color={
                    hasReviews && star <= Math.ceil(avgRating)
                      ? "#FFD700"
                      : theme.text.secondary
                  }
                  style={{ marginRight: 5 }}
                />
              );
            })}
          </View>
          <Text style={styles.overallText}>
            {hasReviews ? `${avgRating}/5.0` : "-/5.0"}
          </Text>
        </View>

        {/* Buttons */}
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.button}
            onPress={() =>
              navigation.navigate("LeaveReview", {
                song: {
                  id: id,
                  name: title,
                  artist: artist,
                  imageUri: imageUri,
                  spotifyUri: spotifyUri,
                  type: type,
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

          <TouchableOpacity
            style={styles.button}
            onPress={handleSaveItem}
            disabled={savingItem}
          >
            <Ionicons
              name={isSaved ? "heart" : "heart-outline"}
              size={22}
              color={isSaved ? theme.button.primary : theme.text.primary}
            />
            <Text
              style={[styles.buttonText, isSaved && styles.savedButtonText]}
            >
              {savingItem ? "Saving..." : isSaved ? "Saved" : "Save"}
            </Text>
          </TouchableOpacity>
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
    paddingHorizontal: 20,
    paddingBottom: 10,
    backgroundColor: theme.background.primary,
  },
  headerTitle: {
    color: theme.text.primary,
    fontSize: 18,
    fontWeight: "bold",
  },
  scrollContent: {
    flex: 1,
    padding: 20,
  },
  itemInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  itemText: {
    flex: 1,
    paddingRight: 15,
  },
  itemTitle: {
    color: theme.text.primary,
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 5,
  },
  artist: {
    color: theme.text.secondary,
    fontSize: 16,
    marginBottom: 5,
  },
  albumTitle: {
    color: theme.text.secondary,
    fontSize: 14,
    marginBottom: 8,
  },
  genresContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 5,
  },
  genreTag: {
    backgroundColor: theme.background.secondary,
    borderRadius: 12,
    paddingVertical: 3,
    paddingHorizontal: 8,
    marginRight: 6,
    marginBottom: 6,
  },
  genreText: {
    color: theme.button.primary,
    fontSize: 12,
    fontWeight: "bold",
  },
  coverArt: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  userReviewContainer: {
    marginBottom: 20,
    backgroundColor: theme.background.secondary,
    borderRadius: 8,
    overflow: "hidden",
  },
  userReviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: theme.background.primary,
    padding: 10,
  },
  userReviewTitle: {
    color: theme.text.primary,
    fontSize: 16,
    fontWeight: "bold",
  },
  userReviewContent: {
    padding: 15,
  },
  starsContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
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
    marginTop: 10,
    textAlign: "right",
  },
  loader: {
    marginVertical: 20,
  },
  sectionTitle: {
    color: theme.text.primary,
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  divider: {
    height: 1,
    backgroundColor: theme.background.secondary,
    marginBottom: 5,
  },
  overallRatingContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  starsRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  overallText: {
    color: "#FFD700",
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 10,
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
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 20,
    paddingHorizontal: 10,
  },
  button: {
    backgroundColor: theme.background.secondary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 20,
    flex: 1,
    marginHorizontal: 8,
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
  savedButtonText: {
    color: theme.button.primary,
  },
  emptyText: {
    color: theme.text.secondary,
    fontSize: 14,
    textAlign: "center",
  },
  noReviewsContainer: {
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  sectionTitleWithMargin: {
    fontSize: 18,
    fontWeight: "bold",
    color: theme.text.primary,
    marginTop: 32,
    marginBottom: 10,
  },
  deleteButton: {
    padding: 5,
  },
});
