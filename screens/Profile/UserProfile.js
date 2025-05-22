import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useNavigation } from "@react-navigation/native";
import { auth, db } from "../../firebaseConfig";
import {
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { theme } from "../../theme/theme";

export default function UserProfile({ route }) {
  const { userId } = route.params;
  const navigation = useNavigation();

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [profilePicUrl, setProfilePicUrl] = useState(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followingCount, setFollowingCount] = useState(0);
  const [userReviews, setUserReviews] = useState([]);
  const [currentUserFriends, setCurrentUserFriends] = useState([]);
  const [savedItems, setSavedItems] = useState([]);

  useEffect(() => {
    loadUserProfile();
    loadUserReviews();
    loadCurrentUserFriends();
  }, [userId]);

  // Helper function to safely get image source
  const getImageSource = (item) => {
    if (item.imageUri) {
      return { uri: item.imageUri };
    } else if (item.image && typeof item.image === "object") {
      return item.image;
    } else {
      // Return a default image from assets
      return require("../../assets/profile.jpg");
    }
  };

  const loadUserProfile = async () => {
    try {
      setLoading(true);

      // Get the profile user's data
      const userRef = doc(db, "users", userId);
      const userDoc = await getDoc(userRef);

      if (userDoc.exists()) {
        const userData = userDoc.data();
        setUser({ id: userId, ...userData });
        setDisplayName(userData.displayName || "User");
        setUsername(userData.username || "");
        setBio(userData.bio || "No bio yet");
        // Handle profile picture URL - could be local URI, data URL or Firebase Storage URL
        const photoUrl = userData.profilePicUrl || null;

        // Check if the URL is valid and set it
        if (
          photoUrl &&
          (photoUrl.startsWith("file:/") ||
            photoUrl.startsWith("data:image") ||
            photoUrl.startsWith("https://"))
        ) {
          setProfilePicUrl(photoUrl);
        } else {
          setProfilePicUrl(null); // Use default image
        }

        // Get their following count
        if (userData.friends && Array.isArray(userData.friends)) {
          setFollowingCount(userData.friends.length);
        }

        // Get their saved items
        if (userData.savedItems && Array.isArray(userData.savedItems)) {
          setSavedItems(userData.savedItems);
        }
      } else {
        Alert.alert("Error", "User not found");
        navigation.goBack();
      }
    } catch (error) {
      console.error("Error loading user profile:", error);
      Alert.alert("Error", "Failed to load profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const loadUserReviews = async () => {
    try {
      const reviewsRef = collection(db, "reviews");
      const q = query(reviewsRef, where("userId", "==", userId));
      const querySnapshot = await getDocs(q);

      const reviews = [];
      querySnapshot.forEach((doc) => {
        reviews.push({ id: doc.id, ...doc.data() });
      });

      // Sort reviews by creation date (newest first)
      reviews.sort((a, b) => {
        return b.createdAt?.seconds - a.createdAt?.seconds;
      });

      setUserReviews(reviews);
    } catch (error) {
      console.error("Error loading user reviews:", error);
    }
  };

  const loadCurrentUserFriends = async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      const currentUserRef = doc(db, "users", currentUser.uid);
      const currentUserDoc = await getDoc(currentUserRef);

      if (currentUserDoc.exists()) {
        const userData = currentUserDoc.data();
        if (userData.friends && Array.isArray(userData.friends)) {
          setCurrentUserFriends(userData.friends);
          setIsFollowing(userData.friends.includes(userId));
        }
      }
    } catch (error) {
      console.error("Error loading current user friends:", error);
    }
  };

  const handleFollowToggle = async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        Alert.alert("Error", "You must be logged in to follow users");
        return;
      }

      const userRef = doc(db, "users", currentUser.uid);

      if (isFollowing) {
        // Unfollow
        await updateDoc(userRef, {
          friends: arrayRemove(userId),
        });
        setIsFollowing(false);
        setCurrentUserFriends(currentUserFriends.filter((id) => id !== userId));
        Alert.alert("Success", `Unfollowed ${displayName}`);
      } else {
        // Follow
        await updateDoc(userRef, {
          friends: arrayUnion(userId),
        });
        setIsFollowing(true);
        setCurrentUserFriends([...currentUserFriends, userId]);
        Alert.alert("Success", `Now following ${displayName}`);
      }
    } catch (error) {
      console.error("Error updating follow status:", error);
      Alert.alert("Error", "Failed to update follow status. Please try again.");
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.button.primary} />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={theme.text.primary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.followButton,
            isFollowing ? styles.followingButton : styles.notFollowingButton,
          ]}
          onPress={handleFollowToggle}
        >
          <Text
            style={[
              styles.followButtonText,
              isFollowing
                ? styles.followingButtonText
                : styles.notFollowingButtonText,
            ]}
          >
            {isFollowing ? "Unfollow" : "Follow"}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.profilePicWrapper}>
            <Image
              source={
                profilePicUrl
                  ? { uri: profilePicUrl }
                  : require("../../assets/profile.jpg")
              }
              defaultSource={require("../../assets/profile.jpg")}
              style={styles.profilePic}
              onError={() => setProfilePicUrl(null)}
            />
          </View>
          <Text style={styles.displayName}>{displayName}</Text>
          <Text style={styles.username}>@{username}</Text>

          <View style={styles.followStats}>
            <Text style={styles.followStat}>
              <Text style={styles.followNumber}>{followingCount}</Text>{" "}
              following
            </Text>
          </View>
        </View>

        {/* User Bio */}
        <View style={styles.bioContainer}>
          <Text style={styles.bioTitle}>Bio</Text>
          <Text style={styles.bioText}>{bio}</Text>
        </View>

        {/* Favorite Albums */}
        <View style={[styles.section, { overflow: "visible" }]}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Favorite Albums</Text>
          </View>
          {savedItems.filter((item) => item.type === "album").length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ overflow: "hidden" }}
            >
              <View style={styles.savedItemsRow}>
                {savedItems
                  .filter((item) => item.type === "album")
                  .slice(0, 6)
                  .map((item, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.savedItem}
                      onPress={() => {
                        navigation.navigate("AlbumScreen", {
                          id: item.id,
                          title: item.title,
                          artist: item.artist,
                          imageUri: item.imageUri,
                          spotifyUri: item.spotifyUri,
                        });
                      }}
                    >
                      <Image
                        source={getImageSource(item)}
                        style={styles.savedItemImage}
                      />
                      <Text style={styles.savedItemTitle} numberOfLines={1}>
                        {item.title}
                      </Text>
                      <Text style={styles.savedItemArtist} numberOfLines={1}>
                        {item.artist}
                      </Text>
                    </TouchableOpacity>
                  ))}
              </View>
            </ScrollView>
          ) : (
            <Text style={styles.emptyText}>No favorite albums yet</Text>
          )}
        </View>

        {/* Favorite Songs */}
        <View style={[styles.section, { overflow: "visible" }]}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Favorite Songs</Text>
          </View>
          {savedItems.filter((item) => item.type === "track").length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ overflow: "hidden" }}
            >
              <View style={styles.savedItemsRow}>
                {savedItems
                  .filter((item) => item.type === "track")
                  .slice(0, 6)
                  .map((item, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.savedItem}
                      onPress={() => {
                        navigation.navigate("Info", {
                          id: item.id,
                          title: item.title,
                          artist: item.artist,
                          imageUri: item.imageUri,
                          type: item.type,
                          spotifyUri: item.spotifyUri,
                        });
                      }}
                    >
                      <Image
                        source={getImageSource(item)}
                        style={styles.savedItemImage}
                      />
                      <Text style={styles.savedItemTitle} numberOfLines={1}>
                        {item.title}
                      </Text>
                      <Text style={styles.savedItemArtist} numberOfLines={1}>
                        {item.artist}
                      </Text>
                    </TouchableOpacity>
                  ))}
              </View>
            </ScrollView>
          ) : (
            <Text style={styles.emptyText}>No favorite songs yet</Text>
          )}
        </View>

        {/* Reviews Section */}
        {userReviews.length > 0 && (
          <View style={styles.reviewsContainer}>
            <Text style={styles.sectionTitle}>Recent Reviews</Text>
            {userReviews.slice(0, 3).map((review) => (
              <TouchableOpacity
                key={review.id}
                style={styles.reviewItem}
                onPress={() => {
                  if (review.itemType === "album") {
                    navigation.navigate("AlbumScreen", {
                      id: review.itemId,
                      title: review.itemTitle,
                      artist: review.itemArtist,
                      imageUri: review.itemImageUri,
                      spotifyUri: review.itemSpotifyUri,
                    });
                  } else {
                    navigation.navigate("Info", {
                      id: review.itemId,
                      title: review.itemTitle,
                      artist: review.itemArtist,
                      imageUri: review.itemImageUri,
                      type: review.itemType,
                      spotifyUri: review.itemSpotifyUri,
                    });
                  }
                }}
              >
                <Image
                  source={
                    review.itemImageUri
                      ? { uri: review.itemImageUri }
                      : require("../../assets/babydoll.jpeg")
                  }
                  style={styles.reviewImage}
                />
                <View style={styles.reviewContent}>
                  <Text style={styles.reviewTitle} numberOfLines={1}>
                    {review.itemTitle}
                  </Text>
                  <Text style={styles.reviewArtist} numberOfLines={1}>
                    {review.itemArtist}
                  </Text>
                  <View style={styles.ratingContainer}>
                    {Array(5)
                      .fill(0)
                      .map((_, i) => {
                        if (i < Math.floor(review.rating)) {
                          return (
                            <Ionicons
                              key={i}
                              name="star"
                              size={14}
                              color="#FFD700"
                            />
                          );
                        } else if (
                          i === Math.floor(review.rating) &&
                          review.rating % 1 !== 0
                        ) {
                          return (
                            <Ionicons
                              key={i}
                              name="star-half"
                              size={14}
                              color="#FFD700"
                            />
                          );
                        } else {
                          return (
                            <Ionicons
                              key={i}
                              name="star-outline"
                              size={14}
                              color="#FFD700"
                            />
                          );
                        }
                      })}
                    <Text style={styles.ratingText}>
                      {review.rating.toFixed(1)}
                    </Text>
                  </View>
                  {review.reviewText && (
                    <Text style={styles.reviewText} numberOfLines={2}>
                      {review.reviewText}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            ))}
            {userReviews.length > 3 && (
              <TouchableOpacity
                style={styles.viewMoreButton}
                onPress={() =>
                  navigation.navigate("UserReviews", {
                    userId,
                    reviews: userReviews,
                  })
                }
              >
                <Text style={styles.viewMoreText}>View all reviews</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: theme.background.primary,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: theme.text.primary,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: theme.background.primary,
    justifyContent: "space-between",
  },
  backButton: {
    padding: 8,
    width: 40,
  },
  titleContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  topBarTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: theme.text.primary,
    textAlign: "center",
  },
  followButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    width: 100,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  followingButton: {
    backgroundColor: theme.button.primary,
    borderColor: theme.button.primary,
  },
  notFollowingButton: {
    backgroundColor: "transparent",
    borderColor: theme.button.primary,
  },
  followButtonText: {
    fontWeight: "bold",
  },
  followingButtonText: {
    color: "#fff",
  },
  notFollowingButtonText: {
    color: theme.button.primary,
  },
  profileHeader: {
    alignItems: "center",
    marginTop: 16,
    marginBottom: 24,
  },
  profilePicWrapper: {
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: "hidden",
    marginBottom: 16,
  },
  profilePic: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  displayName: {
    fontSize: 24,
    fontWeight: "bold",
    color: theme.text.primary,
    marginBottom: 4,
  },
  username: {
    fontSize: 16,
    color: theme.text.secondary,
    marginBottom: 12,
  },
  followStats: {
    flexDirection: "row",
    alignItems: "center",
  },
  followStat: {
    fontSize: 16,
    color: theme.text.primary,
    marginHorizontal: 8,
  },
  followNumber: {
    fontWeight: "bold",
  },
  bioContainer: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  bioTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: theme.text.primary,
    marginBottom: 8,
  },
  bioText: {
    fontSize: 16,
    color: theme.text.primary,
    lineHeight: 22,
  },
  reviewsContainer: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: theme.text.primary,
    marginBottom: 16,
  },
  reviewItem: {
    flexDirection: "row",
    backgroundColor: theme.background.secondary,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  reviewImage: {
    width: 60,
    height: 60,
    borderRadius: 4,
  },
  reviewContent: {
    flex: 1,
    marginLeft: 12,
  },
  reviewTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: theme.text.primary,
    marginBottom: 2,
  },
  reviewArtist: {
    fontSize: 14,
    color: theme.text.secondary,
    marginBottom: 4,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  ratingText: {
    fontSize: 14,
    color: "#FFD700",
    marginLeft: 4,
    fontWeight: "bold",
  },
  reviewText: {
    fontSize: 14,
    color: theme.text.primary,
    lineHeight: 18,
  },
  viewMoreButton: {
    alignItems: "center",
    paddingVertical: 12,
  },
  viewMoreText: {
    fontSize: 16,
    color: theme.button.primary,
    fontWeight: "bold",
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  savedItemsRow: {
    flexDirection: "row",
    paddingRight: 16,
  },
  savedItem: {
    width: 120,
    marginRight: 12,
  },
  savedItemImage: {
    width: 120,
    height: 120,
    borderRadius: 4,
    marginBottom: 8,
  },
  savedItemTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: theme.text.primary,
    marginBottom: 2,
  },
  savedItemArtist: {
    fontSize: 12,
    color: theme.text.secondary,
  },
  emptyText: {
    color: theme.text.secondary,
    fontSize: 14,
    marginLeft: 8,
    marginTop: 4,
    marginBottom: 16,
  },
});
