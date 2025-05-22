import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Image,
  FlatList,
  StyleSheet,
  Dimensions,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useNavigation } from "@react-navigation/native";
import { auth, db, storage } from "../../firebaseConfig";
import { signOut } from "firebase/auth";
// Firebase Storage imports are below
import {
  doc,
  getDoc,
  updateDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { disconnectSpotify } from "../../services/spotifyService";
import { useSpotifyStats } from "../../contexts/SpotifyStatsContext";
import * as ImagePicker from "expo-image-picker";
import {
  ref,
  uploadBytes,
  uploadBytesResumable,
  getDownloadURL,
} from "firebase/storage";
import { theme } from "../../theme/theme";

const windowWidth = Dimensions.get("window").width;
const imageSize = 120; // Adjust size for albums/songs

export default function Profile({ navigation: propNavigation }) {
  const navigation = propNavigation || useNavigation();

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savedItems, setSavedItems] = useState([]);
  const [editMode, setEditMode] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [profilePicUrl, setProfilePicUrl] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [userReviews, setUserReviews] = useState([]);
  const [username, setUsername] = useState("");
  const [menuVisible, setMenuVisible] = useState(false);

  // Get Spotify stats from our context
  const { shortTerm, refreshStats } = useSpotifyStats();
  const [friends, setFriends] = useState([]);
  const [friendsModalVisible, setFriendsModalVisible] = useState(false);

  // Filter saved items by type
  const savedAlbums = savedItems.filter((item) => item.type === "album");
  const savedTracks = savedItems.filter((item) => item.type === "track");

  useEffect(() => {
    loadUserProfile();
    loadUserReviews();
  }, []);

  // Add a listener for when the screen comes into focus
  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      // When the screen is focused, refresh the data
      loadUserProfile();
      loadUserReviews();
    });

    // Return the cleanup function
    return unsubscribe;
  }, [navigation]);

  const loadUserReviews = async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      const reviewsRef = collection(db, "reviews");
      const q = query(reviewsRef, where("userId", "==", currentUser.uid));
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

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      // Refresh Spotify stats along with user profile and reviews
      await Promise.all([loadUserProfile(), loadUserReviews(), refreshStats()]);
    } catch (error) {
      console.error("Error refreshing data:", error);
    } finally {
      setRefreshing(false);
    }
  };

  const loadUserProfile = async () => {
    try {
      setLoading(true);
      const currentUser = auth.currentUser;

      if (!currentUser) {
        setLoading(false);
        return;
      }

      setUser(currentUser);

      // Get user profile from Firestore
      const userRef = doc(db, "users", currentUser.uid);
      const userDoc = await getDoc(userRef);

      if (userDoc.exists()) {
        const userData = userDoc.data();
        setDisplayName(
          userData.displayName || currentUser.displayName || "User"
        );
        setBio(userData.bio || "No bio yet");
        setProfilePicUrl(
          userData.profilePicUrl ||
            currentUser.photoURL ||
            require("../../assets/profile.jpg")
        );
        setUsername(userData.username || "");

        // Get saved items
        if (userData.savedItems && Array.isArray(userData.savedItems)) {
          setSavedItems(userData.savedItems);
        }

        // Get friends
        if (userData.friends && Array.isArray(userData.friends)) {
          // Fetch friend user data with their profile pictures
          if (userData.friends.length > 0) {
            const friendDocs = await Promise.all(
              userData.friends.map((fid) => getDoc(doc(db, "users", fid)))
            );
            const friendList = friendDocs
              .filter((d) => d.exists())
              .map((d) => {
                const friendData = d.data();
                return {
                  id: d.id,
                  displayName: friendData.displayName || "User",
                  username: friendData.username || "",
                  profilePicUrl: friendData.profilePicUrl || null,
                  ...friendData,
                };
              });
            // Friends loaded successfully
            setFriends(friendList);
          } else {
            setFriends([]);
          }
        } else {
          setFriends([]);
        }
      } else {
        // Create user document if it doesn't exist
        await setDoc(userRef, {
          email: currentUser.email,
          displayName: currentUser.displayName || "User",
          createdAt: new Date().toISOString(),
          savedItems: [],
        });

        setDisplayName(currentUser.displayName || "User");
        setBio("No bio yet");
        setProfilePicUrl(currentUser.photoURL);
      }
    } catch (error) {
      console.error("Error loading user profile:", error);
      Alert.alert("Error", "Failed to load profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const checkUsernameUnique = async (newUsername, currentUserId) => {
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("username", "==", newUsername));
    const querySnapshot = await getDocs(q);
    // If there are no users with this username, it's unique
    if (querySnapshot.empty) return true;
    // If the only user with this username is the current user, it's also unique
    if (querySnapshot.size === 1 && querySnapshot.docs[0].id === currentUserId)
      return true;
    // Otherwise, it's not unique
    return false;
  };

  const saveProfile = async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      // Check if username is unique
      const isUsernameUnique = await checkUsernameUnique(
        username,
        currentUser.uid
      );
      if (!isUsernameUnique) {
        Alert.alert(
          "Error",
          "This username is already taken. Please choose another one."
        );
        return;
      }

      const userRef = doc(db, "users", currentUser.uid);

      await updateDoc(userRef, {
        displayName,
        bio,
        profilePicUrl,
        username,
        updatedAt: new Date().toISOString(),
      });

      // Update all reviews by this user with new displayName and username
      const reviewsRef = collection(db, "reviews");
      const q = query(reviewsRef, where("userId", "==", currentUser.uid));
      const querySnapshot = await getDocs(q);
      const batchUpdates = [];
      querySnapshot.forEach((reviewDoc) => {
        batchUpdates.push(
          updateDoc(doc(db, "reviews", reviewDoc.id), {
            userName: displayName,
            username: username,
          })
        );
      });
      await Promise.all(batchUpdates);

      setEditMode(false);
      Alert.alert("Success", "Profile updated successfully");
    } catch (error) {
      console.error("Error saving profile:", error);
      Alert.alert("Error", "Failed to save profile. Please try again.");
    }
  };

  const cancelEdit = () => {
    // Reset to original values from the database
    loadUserProfile();
    setEditMode(false);
  };

  const confirmSignOut = () => {
    setMenuVisible(false);
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: handleSignOut,
      },
    ]);
  };

  const handleSignOut = async () => {
    try {
      setLoading(true);
      console.log("Starting sign out process...");

      // Store a flag to indicate we're signing out completely (not just Spotify)
      try {
        const AsyncStorage =
          require("@react-native-async-storage/async-storage").default;
        await AsyncStorage.setItem("complete_signout", "true");
        console.log("Set complete_signout flag in AsyncStorage");
      } catch (storageError) {
        console.error("Error setting signout flag:", storageError);
      }

      // Disconnect from Spotify first
      try {
        await disconnectSpotify();
        console.log("Successfully disconnected from Spotify");
      } catch (spotifyError) {
        console.error("Error disconnecting from Spotify:", spotifyError);
        // Continue with sign out even if Spotify disconnect fails
      }

      // Sign out from Firebase
      await signOut(auth);
      console.log("Successfully signed out from Firebase");

      // Navigate to Login screen instead of SpotifyAuth
      navigation.reset({
        index: 0,
        routes: [{ name: "Login" }],
      });
    } catch (error) {
      console.error("Error signing out:", error);
      Alert.alert("Error", "Failed to sign out. Please try again.");
      setLoading(false);
    }
  };

  const pickImage = async () => {
    try {
      // Use a conservative configuration to avoid memory issues
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images, // Return to using MediaTypeOptions for compatibility
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: true, // Use base64 encoding to store the image directly in Firestore
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const currentUser = auth.currentUser;
        if (!currentUser) return;

        setUploadingImage(true);

        try {
          // Get the local URI for immediate feedback on this device
          const localUri = result.assets[0].uri;

          // First update UI with the local URI for immediate feedback
          setProfilePicUrl(localUri);

          // Convert to data URL and store in Firestore (works for small images)
          const base64 = result.assets[0].base64;

          if (base64) {
            const dataUrl = `data:image/jpeg;base64,${base64}`;
            // Store the data URL in Firestore
            await saveProfilePicToFirestore(dataUrl);
          } else {
            // Fallback to local URI if base64 is not available
            await saveProfilePicToFirestore(localUri);
          }
        } catch (error) {
          Alert.alert(
            "Error",
            "Failed to update profile picture. Please try again."
          );
          setUploadingImage(false);
        }
      }
    } catch (error) {
      Alert.alert(
        "Error",
        `Image picker error: ${error.message || "Unknown error"}`,
        [{ text: "OK" }]
      );
    }
  };

  // Helper function to save profile picture URL to Firestore
  const saveProfilePicToFirestore = async (url) => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      const userRef = doc(db, "users", currentUser.uid);
      await updateDoc(userRef, {
        profilePicUrl: url,
        updatedAt: new Date().toISOString(),
      });

      // Update local state
      setProfilePicUrl(url);
    } catch (error) {
      // Silently handle errors
    } finally {
      setUploadingImage(false);
    }
  };

  // We've merged the uploadImage functionality directly into the pickImage function

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

  const renderHorizontalList = (data) => {
    if (!data || data.length === 0) {
      return <Text style={styles.emptyListText}>No items saved yet</Text>;
    }

    return (
      <FlatList
        data={data}
        horizontal
        keyExtractor={(item) => item.id || item.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.imageWrapper}
            onPress={() => {
              if (item.id) {
                if (item.type === "album") {
                  navigation.navigate("AlbumScreen", {
                    id: item.id,
                    title: item.title,
                    artist: item.artist,
                    imageUri: item.imageUri,
                    spotifyUri: item.spotifyUri,
                  });
                } else {
                  navigation.navigate("Info", {
                    id: item.id,
                    title: item.title,
                    artist: item.artist,
                    imageUri: item.imageUri,
                    type: item.type,
                    spotifyUri: item.spotifyUri,
                  });
                }
              }
            }}
          >
            <Image source={getImageSource(item)} style={styles.image} />
            {item.title && (
              <Text style={styles.imageLabel} numberOfLines={1}>
                {item.title}
              </Text>
            )}
          </TouchableOpacity>
        )}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16 }}
      />
    );
  };

  const handleRemoveFriend = async (friendId) => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;
      const userRef = doc(db, "users", currentUser.uid);
      await updateDoc(userRef, {
        friends: friends.filter((f) => f.id !== friendId).map((f) => f.id),
      });
      setFriends(friends.filter((f) => f.id !== friendId));
      Alert.alert("Removed", "Friend removed successfully.");
    } catch (error) {
      console.error("Error removing friend:", error);
      Alert.alert("Error", "Failed to remove friend. Please try again.");
    }
  };

  // Reviews functionality will be implemented in a future update

  return (
    <>
      {/* Menu Modal */}
      <Modal
        visible={menuVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setMenuVisible(false)}
        >
          <View style={styles.menuContainer}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setMenuVisible(false);
                setEditMode(true);
              }}
            >
              <Ionicons
                name="create-outline"
                size={22}
                color={theme.text.primary}
                style={styles.menuIcon}
              />
              <Text style={styles.menuText}>Edit Profile</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={confirmSignOut}>
              <Ionicons
                name="log-out-outline"
                size={22}
                color="#ff6b6b"
                style={styles.menuIcon}
              />
              <Text style={[styles.menuText, styles.signOutText]}>
                Sign Out
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Friends Modal */}
      <Modal
        visible={friendsModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setFriendsModalVisible(false)}
      >
        <View style={styles.friendsModalOverlay}>
          <View style={styles.friendsModalContent}>
            <Text style={styles.friendsModalTitle}>Friends</Text>
            <FlatList
              data={friends}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View style={styles.friendItem}>
                  <TouchableOpacity
                    style={styles.friendContentContainer}
                    onPress={() => {
                      setFriendsModalVisible(false);
                      navigation.navigate("UserProfile", { userId: item.id });
                    }}
                  >
                    <Image
                      source={
                        item.profilePicUrl
                          ? { uri: item.profilePicUrl }
                          : require("../../assets/profile.jpg")
                      }
                      defaultSource={require("../../assets/profile.jpg")}
                      style={styles.friendProfilePic}
                      onError={() => {}}
                    />
                    <View style={{ marginLeft: 12, flex: 1 }}>
                      <Text style={styles.friendDisplayName}>
                        {item.displayName || item.username}
                      </Text>
                      <Text style={styles.friendUsername}>
                        @{item.username}
                      </Text>
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.removeFriendButton}
                    onPress={() => handleRemoveFriend(item.id)}
                  >
                    <Ionicons
                      name="trash-outline"
                      size={20}
                      color={theme.text.secondary}
                    />
                  </TouchableOpacity>
                </View>
              )}
              ListEmptyComponent={
                <Text style={styles.emptyText}>No friends yet.</Text>
              }
            />
            <TouchableOpacity
              style={styles.closeModalButton}
              onPress={() => setFriendsModalVisible(false)}
            >
              <Text style={styles.closeModalButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Top Bar - OUTSIDE ScrollView */}
      <View style={styles.topBarFixed}>
        <TouchableOpacity
          style={styles.statsButton}
          onPress={() => navigation.navigate("Stats")}
        >
          <Ionicons
            name="stats-chart-outline"
            size={24}
            color={theme.text.primary}
          />
        </TouchableOpacity>
        {editMode ? (
          <View style={styles.editButtonsContainer}>
            <TouchableOpacity style={styles.cancelButton} onPress={cancelEdit}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveButton} onPress={saveProfile}>
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => setMenuVisible(true)}
          >
            <Ionicons
              name="ellipsis-vertical"
              size={24}
              color={theme.text.primary}
            />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.button.primary]}
            tintColor={theme.button.primary}
          />
        }
      >
        {/* Profile Header - All Centered */}
        <View style={styles.profileHeaderCentered}>
          {editMode ? (
            <TextInput
              style={styles.editNameInput}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Display name"
              placeholderTextColor={theme.text.secondary}
              maxLength={30}
            />
          ) : (
            <Text style={styles.displayNameSpotify}>{displayName}</Text>
          )}
          {/* Profile Picture */}
          <TouchableOpacity
            style={styles.profilePicWrapper}
            onPress={editMode ? pickImage : null}
            disabled={!editMode}
          >
            {uploadingImage ? (
              <View style={[styles.profilePic, styles.uploadingContainer]}>
                <ActivityIndicator size="small" color="#1DB954" />
              </View>
            ) : (
              <>
                <Image
                  source={
                    profilePicUrl
                      ? { uri: profilePicUrl }
                      : require("../../assets/profile.jpg")
                  }
                  style={styles.profilePic}
                />
                {editMode && (
                  <View style={styles.editProfilePicOverlay}>
                    <Ionicons name="camera" size={24} color="white" />
                  </View>
                )}
              </>
            )}
          </TouchableOpacity>
          {editMode ? (
            <View style={styles.usernameInputContainerCentered}>
              <Text style={styles.usernamePrefix}>@</Text>
              <TextInput
                style={styles.usernameInputCentered}
                value={username}
                onChangeText={setUsername}
                placeholder="username"
                placeholderTextColor={theme.text.secondary}
                maxLength={30}
                autoCapitalize="none"
              />
            </View>
          ) : (
            <Text style={styles.usernameSpotify}>@{username}</Text>
          )}
          <View style={styles.followRowSpotifyCentered}>
            <TouchableOpacity
              onPress={() => setFriendsModalVisible(true)}
              style={{ flexDirection: "row", alignItems: "center" }}
            >
              <Text style={styles.followStatSpotify}>
                <Text style={styles.followNumberSpotify}>{friends.length}</Text>{" "}
                following
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.peopleIconButton}
              onPress={() => navigation.navigate("FriendSearch")}
            >
              <Ionicons name="people" size={22} color={theme.button.primary} />
            </TouchableOpacity>
          </View>
        </View>
        {/* User Bio */}
        {editMode ? (
          <TextInput
            style={styles.editBioInput}
            value={bio}
            onChangeText={setBio}
            placeholder="Write something about yourself"
            placeholderTextColor={theme.text.secondary}
            multiline
          />
        ) : (
          <Text style={styles.userBio}>{bio}</Text>
        )}

        {/* Favorite Albums Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Favorite Albums</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() =>
                navigation.navigate("Search", { fromScreen: "Profile" })
              }
            >
              <Ionicons
                name="add-circle"
                size={24}
                color={theme.button.primary}
              />
            </TouchableOpacity>
          </View>
          {savedAlbums.length > 0 ? (
            renderHorizontalList(savedAlbums)
          ) : (
            <Text style={styles.emptyListText}>No favorite albums yet</Text>
          )}
        </View>

        {/* Favorite Songs Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Favorite Songs</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() =>
                navigation.navigate("Search", { fromScreen: "Profile" })
              }
            >
              <Ionicons
                name="add-circle"
                size={24}
                color={theme.button.primary}
              />
            </TouchableOpacity>
          </View>
          {savedTracks.length > 0 ? (
            renderHorizontalList(savedTracks)
          ) : (
            <Text style={styles.emptyListText}>No favorite songs yet</Text>
          )}
        </View>

        {/* Recently Played Section (from Spotify) */}
        {shortTerm &&
          shortTerm.recentlyPlayed &&
          shortTerm.recentlyPlayed.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Recently Played</Text>
                <TouchableOpacity
                  style={styles.statsButton}
                  onPress={() => navigation.navigate("Stats")}
                >
                  <Text style={styles.viewMoreText}>View Stats</Text>
                </TouchableOpacity>
              </View>
              <FlatList
                data={shortTerm.recentlyPlayed}
                horizontal
                keyExtractor={(item, index) => `recent-${item.id || index}`}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.imageWrapper}
                    onPress={() => {
                      navigation.navigate("Info", {
                        id: item.track.id,
                        title: item.track.name,
                        artist: item.track.artists
                          ?.map((a) => a.name)
                          .join(", "),
                        imageUri: item.track.album?.images?.[0]?.url,
                        type: "track",
                        spotifyUri: item.track.uri,
                      });
                    }}
                  >
                    <Image
                      source={
                        item.track.album?.images?.[0]?.url
                          ? { uri: item.track.album.images[0].url }
                          : require("../../assets/profile.jpg")
                      }
                      style={styles.image}
                    />
                    <Text style={styles.imageLabel} numberOfLines={1}>
                      {item.track.name}
                    </Text>
                    <Text style={styles.artistLabel} numberOfLines={1}>
                      {item.track.artists?.map((a) => a.name).join(", ")}
                    </Text>
                  </TouchableOpacity>
                )}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 16 }}
              />
            </View>
          )}

        {/* Top Tracks Section (from Spotify) */}
        {shortTerm && shortTerm.topTracks && shortTerm.topTracks.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Top Tracks</Text>
              <TouchableOpacity
                style={styles.statsButton}
                onPress={() => navigation.navigate("Stats")}
              >
                <Text style={styles.viewMoreText}>View Stats</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={shortTerm.topTracks}
              horizontal
              keyExtractor={(item, index) => `top-track-${item.id || index}`}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.imageWrapper}
                  onPress={() => {
                    navigation.navigate("Info", {
                      id: item.id,
                      title: item.name,
                      artist: item.artists?.map((a) => a.name).join(", "),
                      imageUri: item.album?.images?.[0]?.url,
                      type: "track",
                      spotifyUri: item.uri,
                    });
                  }}
                >
                  <Image
                    source={
                      item.album?.images?.[0]?.url
                        ? { uri: item.album.images[0].url }
                        : require("../../assets/profile.jpg")
                    }
                    style={styles.image}
                  />
                  <Text style={styles.imageLabel} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={styles.artistLabel} numberOfLines={1}>
                    {item.artists?.map((a) => a.name).join(", ")}
                  </Text>
                </TouchableOpacity>
              )}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16 }}
            />
          </View>
        )}

        {/* My List Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>My List</Text>
            {savedItems.length > 0 && (
              <TouchableOpacity
                style={styles.viewMoreButton}
                onPress={() =>
                  navigation.navigate("AllSavedItems", {
                    items: savedItems.map((item) => ({ ...item })),
                  })
                }
              >
                <Text style={styles.viewMoreText}>View All</Text>
              </TouchableOpacity>
            )}
          </View>

          {savedItems.length > 0 ? (
            renderHorizontalList(savedItems.slice(0, 10).reverse())
          ) : (
            <Text style={styles.emptyListText}>No saved items yet</Text>
          )}
        </View>

        {/* My Reviews Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>My Reviews</Text>
            {userReviews.length > 0 && (
              <TouchableOpacity
                style={styles.viewMoreButton}
                onPress={() =>
                  navigation.navigate("AllReviews", { reviews: userReviews })
                }
              >
                <Text style={styles.viewMoreText}>View All</Text>
              </TouchableOpacity>
            )}
          </View>

          {userReviews.length > 0 ? (
            userReviews.slice(0, 3).map((review) => (
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
                      : require("../../assets/profile.jpg")
                  }
                  style={styles.reviewImage}
                />
                <View style={styles.reviewContent}>
                  <Text style={styles.reviewTitle}>{review.itemTitle}</Text>
                  <Text style={styles.reviewArtist}>{review.itemArtist}</Text>
                  <View style={styles.reviewRating}>
                    {[1, 2, 3, 4, 5].map((star) => {
                      const fullStar = star <= Math.floor(review.rating);
                      const halfStar =
                        !fullStar &&
                        star === Math.floor(review.rating) + 1 &&
                        review.rating % 1 !== 0;

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
                      {review.rating.toFixed(1)}
                    </Text>
                  </View>
                  {review.review && (
                    <Text style={styles.reviewText} numberOfLines={2}>
                      {review.review}
                    </Text>
                  )}
                </View>
                <View style={styles.reviewTypeContainer}>
                  <Text style={styles.reviewType}>
                    {review.itemType === "album" ? "Album" : "Song"}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <Text style={styles.emptyText}>No reviews yet</Text>
          )}
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  artistLabel: {
    color: theme.text.secondary,
    fontSize: 12,
    marginTop: 2,
    textAlign: "center",
    width: imageSize,
  },
  statsButton: {
    flexDirection: "row",
    alignItems: "center",
  },
  container: {
    flex: 1,
    backgroundColor: theme.background.primary,
  },
  loadingContainer: {
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 50,
  },
  loadingText: {
    color: theme.text.primary,
    marginTop: 10,
    fontSize: 16,
  },
  topBarFixed: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 50,
    backgroundColor: theme.background.primary,
    zIndex: 10,
  },
  topBarDisplayName: {
    flex: 1,
    textAlign: "center",
    fontSize: 22,
    fontWeight: "bold",
    color: theme.text.primary,
    marginHorizontal: 10,
  },
  editButtonsContainer: {
    flexDirection: "row",
  },
  cancelButton: {
    marginRight: 10,
    padding: 8,
    borderRadius: 5,
    backgroundColor: theme.background.secondary,
  },
  cancelButtonText: {
    color: theme.text.primary,
    fontSize: 14,
  },
  saveButton: {
    padding: 8,
    borderRadius: 5,
    backgroundColor: theme.button.primary,
  },
  saveButtonText: {
    color: theme.text.primary,
    fontSize: 14,
    fontWeight: "bold",
  },
  editButton: {
    padding: 8,
  },
  usernameContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  usernameText: {
    fontSize: 28,
    fontWeight: "bold",
    color: theme.text.primary,
  },
  profilePicWrapper: {
    alignItems: "center",
    marginBottom: 10,
    position: "relative",
    width: 100,
    height: 100,
    borderRadius: 50,
    overflow: "hidden",
    justifyContent: "center",
  },
  profilePic: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  editProfilePicOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
  },
  uploadingContainer: {
    backgroundColor: theme.background.secondary,
    justifyContent: "center",
    alignItems: "center",
  },
  username: {
    fontSize: 22,
    color: theme.text.primary,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 5,
  },
  editNameInput: {
    color: theme.text.primary,
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 5,
    borderWidth: 1,
    borderColor: theme.button.primary,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    width: 180,
    alignSelf: "center",
    backgroundColor: "transparent",
  },
  usernameInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 15,
    paddingHorizontal: 20,
  },
  usernamePrefix: {
    color: theme.button.primary,
    fontSize: 18,
    fontWeight: "bold",
  },
  usernameInput: {
    color: theme.text.primary,
    fontSize: 18,
    borderBottomWidth: 1,
    borderBottomColor: theme.background.secondary,
    paddingBottom: 5,
    marginLeft: 5,
    width: 200,
  },
  editBioInput: {
    fontSize: 14,
    color: theme.text.primary,
    textAlign: "center",
    marginBottom: 20,
    paddingHorizontal: 30,
    borderWidth: 1,
    borderColor: theme.button.primary,
    borderRadius: 10,
    padding: 10,
    width: "80%",
    alignSelf: "center",
    minHeight: 80,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
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
  sectionTitle: {
    fontSize: 20,
    color: theme.text.primary,
    fontWeight: "bold",
    marginLeft: 16,
  },
  addButton: {
    padding: 5,
  },
  reviewCard: {
    width: 160,
    height: 200,
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
    marginTop: 4,
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
    color: theme.text.secondary,
    fontSize: 14,
    textAlign: "center",
    marginTop: 5,
    width: imageSize,
  },
  userBio: {
    fontSize: 14,
    color: theme.text.secondary,
    textAlign: "center",
    marginBottom: 20,
    paddingHorizontal: 30,
  },
  section: {
    marginBottom: 30,
  },
  iconRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  emptyListText: {
    color: theme.text.secondary,
    fontSize: 14,
    fontStyle: "italic",
    textAlign: "center",
    marginLeft: 16,
    marginVertical: 20,
  },
  myReviewsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  emptyText: {
    color: theme.text.secondary,
    fontStyle: "italic",
    textAlign: "center",
    marginVertical: 20,
  },
  reviewItem: {
    flexDirection: "row",
    backgroundColor: theme.background.secondary,
    borderRadius: 8,
    marginBottom: 12,
    padding: 12,
    alignItems: "center",
  },
  reviewImage: {
    width: 60,
    height: 60,
    borderRadius: 6,
    marginRight: 12,
  },
  reviewContent: {
    flex: 1,
  },
  reviewTitle: {
    color: theme.text.primary,
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 2,
  },
  reviewArtist: {
    color: theme.text.secondary,
    fontSize: 14,
    marginBottom: 4,
  },
  reviewRating: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  ratingText: {
    color: "#FFD700",
    fontSize: 14,
    fontWeight: "bold",
    marginLeft: 4,
  },
  reviewText: {
    color: theme.text.secondary,
    fontSize: 13,
    fontStyle: "italic",
  },
  reviewTypeContainer: {
    backgroundColor: theme.background.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  reviewType: {
    color: theme.button.primary,
    fontSize: 12,
    fontWeight: "bold",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "flex-start",
    alignItems: "flex-end",
    paddingRight: 20,
    paddingTop: 100,
  },
  menuContainer: {
    backgroundColor: theme.background.secondary,
    borderRadius: 12,
    width: 180,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  signOutText: {
    color: "#ff6b6b",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  menuText: {
    fontSize: 16,
    marginLeft: 12,
    color: theme.text.primary,
  },
  menuIcon: {
    width: 24,
  },
  menuButton: {
    padding: 8,
  },
  profilePicPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: theme.text.primary,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent",
  },
  profileHeaderCentered: {
    alignItems: "center",
    marginTop: 8,
    marginBottom: 16,
  },
  profileImageContainerSpotify: {
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: "hidden",
    marginBottom: 16,
    backgroundColor: theme.background.secondary,
  },
  profileImageSpotify: {
    width: 120,
    height: 120,
    borderRadius: 60,
    resizeMode: "cover",
  },
  displayNameSpotify: {
    fontSize: 28,
    fontWeight: "bold",
    color: theme.text.primary,
    marginBottom: 4,
  },
  usernameSpotify: {
    fontSize: 16,
    color: theme.text.secondary,
    marginBottom: 8,
  },
  followRowSpotifyCentered: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    marginBottom: 8,
  },
  followStatSpotify: {
    fontSize: 16,
    color: theme.text.secondary,
  },
  followNumberSpotify: {
    fontWeight: "bold",
    color: theme.text.primary,
  },
  dotSpotify: {
    fontSize: 18,
    color: theme.text.secondary,
    marginHorizontal: 6,
  },
  friendsModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  friendsModalContent: {
    backgroundColor: theme.background.primary,
    borderRadius: 16,
    padding: 24,
    width: "80%",
    maxHeight: "70%",
  },
  friendsModalTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: theme.text.primary,
    marginBottom: 16,
    textAlign: "center",
  },
  friendItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  friendProfilePic: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.background.secondary,
  },
  friendDisplayName: {
    fontSize: 16,
    color: theme.text.primary,
    fontWeight: "bold",
  },
  friendUsername: {
    fontSize: 14,
    color: theme.text.secondary,
  },
  closeModalButton: {
    marginTop: 16,
    alignSelf: "center",
    backgroundColor: theme.button.primary,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 24,
  },
  closeModalButtonText: {
    color: theme.text.primary,
    fontSize: 16,
    fontWeight: "bold",
  },
  usernameInputContainerCentered: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  usernamePrefix: {
    color: theme.button.primary,
    fontSize: 18,
    fontWeight: "bold",
    marginRight: 2,
  },
  usernameInputCentered: {
    color: theme.text.primary,
    fontSize: 16,
    borderWidth: 1,
    borderColor: theme.button.primary,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    width: 140,
    textAlign: "center",
    backgroundColor: "transparent",
  },
  removeFriendButton: {
    marginLeft: 8,
    padding: 6,
    borderRadius: 16,
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
  },
  friendContentContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  peopleIconButton: {
    marginLeft: 10,
    padding: 6,
    borderRadius: 16,
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
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
  uploadingContainer: {
    backgroundColor: theme.background.secondary,
    justifyContent: "center",
    alignItems: "center",
  },
  editProfilePicOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
});
