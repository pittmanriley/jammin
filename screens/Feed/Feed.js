import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  StyleSheet,
  Dimensions,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useNavigation } from "@react-navigation/native";
import {
  getPopularAlbums,
  getPopularTracks,
  getFeaturedContent,
  getFriendActivity,
} from "../../services/feedService";
import { auth, db } from "../../firebaseConfig";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
} from "firebase/firestore";
import { theme } from "../../theme/theme";

const windowWidth = Dimensions.get("window").width;
const imageSize = 120; // Adjust as needed

// Initial empty state for data
const emptyState = [];

export default function Feed({ navigation }) {
  const [popularAlbums, setPopularAlbums] = useState([]);
  const [popularTracks, setPopularTracks] = useState([]);
  const [featuredContent, setFeaturedContent] = useState([]);
  const [userReviews, setUserReviews] = useState([]);
  const [friendReviews, setFriendReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [albums, tracks, featured] = await Promise.all([
          getPopularAlbums(),
          getPopularTracks(),
          getFeaturedContent(),
        ]);
        setPopularAlbums(albums);
        setPopularTracks(tracks);
        setFeaturedContent(featured);
        fetchUserReviews();
        fetchFriendReviews();
      } catch (error) {
        console.error("Error fetching feed data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Add a listener for when the screen comes into focus
  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      // When the screen is focused, refresh the reviews
      fetchUserReviews();
    });

    // Return the cleanup function
    return unsubscribe;
  }, [navigation]);

  const fetchUserReviews = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const reviewsRef = collection(db, "reviews");
      const q = query(reviewsRef, where("userId", "==", user.uid));
      const querySnapshot = await getDocs(q);

      const reviews = [];
      querySnapshot.forEach((doc) => {
        reviews.push({
          id: doc.id,
          ...doc.data(),
        });
      });

      // Sort by most recent first
      reviews.sort((a, b) => {
        const dateA = a.createdAt?.seconds || 0;
        const dateB = b.createdAt?.seconds || 0;
        return dateB - dateA;
      });

      setUserReviews(reviews);
    } catch (error) {
      console.error("Error fetching user reviews:", error);
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
      // Fetch reviews for all friends
      let allReviews = [];
      for (const fid of friendIds) {
        const reviewsRef = collection(db, "reviews");
        const q = query(reviewsRef, where("userId", "==", fid));
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach((doc) => {
          allReviews.push({ id: doc.id, ...doc.data() });
        });
      }
      // Sort by most recent first
      allReviews.sort((a, b) => {
        const dateA = a.createdAt?.seconds || 0;
        const dateB = b.createdAt?.seconds || 0;
        return dateB - dateA;
      });
      setFriendReviews(allReviews);
    } catch (error) {
      console.error("Error fetching friend reviews:", error);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    const fetchData = async () => {
      try {
        setLoading(true);
        const [albums, tracks, featured] = await Promise.all([
          getPopularAlbums(),
          getPopularTracks(),
          getFeaturedContent(),
        ]);
        setPopularAlbums(albums);
        setPopularTracks(tracks);
        setFeaturedContent(featured);
        fetchUserReviews();
        fetchFriendReviews();
      } catch (error) {
        console.error("Error fetching feed data:", error);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    };

    fetchData();
  };

  const renderHorizontalList = (data) => {
    return (
      <FlatList
        data={data}
        horizontal
        keyExtractor={(_, index) => index.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => {
              // Navigate to AlbumScreen for albums, Info for tracks
              if (item.type === "album") {
                navigation.navigate("AlbumScreen", {
                  id: item.id,
                  title: item.title,
                  artist: item.artist,
                  imageUri:
                    item.imageUri || (item.image && { uri: item.image }),
                  spotifyUri: item.spotifyUri,
                });
              } else {
                navigation.navigate("Info", {
                  id: item.id,
                  title: item.title,
                  artist: item.artist,
                  imageUri:
                    item.imageUri || (item.image && { uri: item.image }),
                  type: item.type,
                  spotifyUri: item.spotifyUri,
                });
              }
            }}
          >
            <View style={styles.imageWrapper}>
              <Image
                source={item.imageUri ? { uri: item.imageUri } : item.image}
                style={styles.image}
              />
              <Text style={styles.imageLabel} numberOfLines={1}>
                {item.title}
              </Text>
            </View>
          </TouchableOpacity>
        )}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 30 }}
      />
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Ionicons
          name="people"
          size={28}
          color={theme.text.primary}
          style={styles.friendsIcon}
          onPress={() => navigation.navigate("FriendSearch")}
        />
        <Text style={styles.header}>Jammin'</Text>
      </View>

      {/* Scrollable content */}
      <ScrollView
        style={styles.scrollContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.button.primary}
            colors={[theme.button.primary]}
          />
        }
      >
        {loading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.button.primary} />
          </View>
        ) : (
          <>
            {/* Popular Albums Section */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Popular Albums</Text>
              <TouchableOpacity
                style={styles.viewMoreButton}
                onPress={() =>
                  navigation.navigate("AllAlbums", { albums: popularAlbums })
                }
              >
                <Text style={styles.viewMoreText}>View More</Text>
              </TouchableOpacity>
            </View>
            {renderHorizontalList(popularAlbums.slice(0, 10))}

            {/* Popular Songs Section */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Popular Songs</Text>
              <TouchableOpacity
                style={styles.viewMoreButton}
                onPress={() =>
                  navigation.navigate("AllSongs", { songs: popularTracks })
                }
              >
                <Text style={styles.viewMoreText}>View More</Text>
              </TouchableOpacity>
            </View>
            {renderHorizontalList(popularTracks.slice(0, 10))}

            {/* My Reviews Section */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>My Reviews</Text>
              {userReviews.length > 5 && (
                <TouchableOpacity
                  style={styles.viewMoreButton}
                  onPress={() =>
                    navigation.navigate("AllReviews", { reviews: userReviews })
                  }
                >
                  <Text style={styles.viewMoreText}>View More</Text>
                </TouchableOpacity>
              )}
            </View>
            {userReviews.length > 0 ? (
              <FlatList
                data={userReviews.slice(0, 5)}
                horizontal
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.reviewCard}
                    onPress={() => {
                      if (item.itemType === "album") {
                        navigation.navigate("AlbumScreen", {
                          id: item.itemId,
                          title: item.itemTitle,
                          artist: item.itemArtist,
                          imageUri: item.itemImageUri,
                          spotifyUri: item.itemSpotifyUri,
                        });
                      } else {
                        navigation.navigate("Info", {
                          id: item.itemId,
                          title: item.itemTitle,
                          artist: item.itemArtist,
                          imageUri: item.itemImageUri,
                          type: item.itemType,
                          spotifyUri: item.itemSpotifyUri,
                        });
                      }
                    }}
                  >
                    <Image
                      source={
                        item.itemImageUri
                          ? { uri: item.itemImageUri }
                          : require("../../assets/babydoll.jpeg")
                      }
                      style={styles.reviewImage}
                    />
                    <View style={styles.reviewContent}>
                      <Text style={styles.reviewItemTitle} numberOfLines={1}>
                        {item.itemTitle}
                      </Text>
                      <Text style={styles.reviewItemArtist} numberOfLines={1}>
                        {item.itemArtist}
                      </Text>
                      <View style={styles.reviewRating}>
                        {Array(5)
                          .fill(0)
                          .map((_, i) => {
                            // For half stars
                            if (i < Math.floor(item.rating)) {
                              return (
                                <Ionicons
                                  key={i}
                                  name="star"
                                  size={12}
                                  color="#FFD700"
                                />
                              );
                            } else if (
                              i === Math.floor(item.rating) &&
                              item.rating % 1 !== 0
                            ) {
                              return (
                                <Ionicons
                                  key={i}
                                  name="star-half"
                                  size={12}
                                  color="#FFD700"
                                />
                              );
                            } else {
                              return (
                                <Ionicons
                                  key={i}
                                  name="star-outline"
                                  size={12}
                                  color={theme.text.secondary}
                                />
                              );
                            }
                          })}
                        <Text style={styles.ratingText}>
                          {item.rating.toFixed(1)}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                )}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 16 }}
              />
            ) : (
              <Text style={styles.emptyListText}>No reviews yet</Text>
            )}

            {/* Friends' Activity Section */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Friends' Activity</Text>
              {friendReviews.length > 10 && (
                <TouchableOpacity
                  style={styles.viewMoreButton}
                  onPress={() =>
                    navigation.navigate("AllActivity", {
                      activity: friendReviews,
                    })
                  }
                >
                  <Text style={styles.viewMoreText}>View More</Text>
                </TouchableOpacity>
              )}
            </View>
            <FlatList
              data={friendReviews.slice(0, 10)}
              horizontal
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.reviewCard}
                  onPress={() => {
                    if (item.itemType === "album") {
                      navigation.navigate("AlbumScreen", {
                        id: item.itemId,
                        title: item.itemTitle,
                        artist: item.itemArtist,
                        imageUri: item.itemImageUri,
                        spotifyUri: item.itemSpotifyUri,
                      });
                    } else {
                      navigation.navigate("Info", {
                        id: item.itemId,
                        title: item.itemTitle,
                        artist: item.itemArtist,
                        imageUri: item.itemImageUri,
                        type: item.itemType,
                        spotifyUri: item.itemSpotifyUri,
                      });
                    }
                  }}
                >
                  <Image
                    source={
                      item.itemImageUri
                        ? { uri: item.itemImageUri }
                        : require("../../assets/babydoll.jpeg")
                    }
                    style={styles.reviewImage}
                  />
                  <View style={styles.reviewContent}>
                    <Text style={styles.reviewItemTitle} numberOfLines={1}>
                      {item.itemTitle}
                    </Text>
                    <Text style={styles.reviewItemArtist} numberOfLines={1}>
                      {item.itemArtist}
                    </Text>
                    <View style={styles.reviewRating}>
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
                            size={12}
                            color="#FFD700"
                          />
                        );
                      })}
                      <Text style={styles.ratingText}>
                        {item.rating.toFixed(1)}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              )}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16 }}
              ListEmptyComponent={
                <Text style={styles.emptyListText}>
                  No recent friend reviews yet
                </Text>
              }
            />
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background.primary,
    paddingTop: 50,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 50,
  },
  loadingText: {
    color: theme.text.primary,
    marginTop: 10,
    fontSize: 16,
  },
  headerContainer: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    marginBottom: 20,
  },
  header: {
    fontSize: 28,
    marginTop: 10,
    fontWeight: "bold",
    color: theme.text.primary,
    textAlign: "center",
  },
  friendsIcon: {
    position: "absolute",
    right: 20,
    top: 10,
  },
  scrollContainer: {
    flex: 1,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 24,
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: theme.text.primary,
  },
  viewMoreButton: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: `${theme.button.primary}1A`, // 10% opacity
  },
  viewMoreText: {
    color: theme.button.primary,
    fontSize: 12,
    fontWeight: "600",
  },
  imageWrapper: {
    width: imageSize,
    marginRight: 10,
    alignItems: "center",
  },
  image: {
    width: imageSize,
    height: imageSize,
    borderRadius: 10,
  },
  imageLabel: {
    color: theme.text.primary,
    fontSize: 12,
    marginTop: 4,
    textAlign: "center",
    width: imageSize - 10,
  },
  typeIndicator: {
    position: "absolute",
    top: 5,
    right: 5,
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  typeText: {
    color: theme.button.primary,
    fontSize: 10,
    fontWeight: "bold",
  },
  reviewCard: {
    width: 160,
    height: 190,
    marginRight: 12,
    backgroundColor: theme.background.secondary,
    borderRadius: 8,
    overflow: "hidden",
  },
  reviewImage: {
    width: "100%",
    height: 100,
    resizeMode: "cover",
  },
  reviewContent: {
    padding: 10,
  },
  reviewItemTitle: {
    color: theme.text.primary,
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 4,
  },
  reviewItemArtist: {
    color: theme.text.secondary,
    fontSize: 12,
    marginBottom: 6,
  },
  reviewRating: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  ratingText: {
    color: "#FFD700",
    fontSize: 12,
    marginLeft: 4,
    fontWeight: "bold",
  },
  emptyListText: {
    color: theme.text.secondary,
    fontSize: 16,
    textAlign: "center",
    marginTop: 10,
    marginBottom: 20,
    marginLeft: 16,
  },
});
