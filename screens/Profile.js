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
import { auth, db, storage } from "../firebaseConfig";
import { doc, getDoc, updateDoc, setDoc, collection, query, where, getDocs } from "firebase/firestore";
import * as ImagePicker from "expo-image-picker";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

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

  // Filter saved items by type
  const savedAlbums = savedItems.filter((item) => item.type === "album");
  const savedTracks = savedItems.filter((item) => item.type === "track");

  useEffect(() => {
    loadUserProfile();
    loadUserReviews();
  }, []);
  
  // Add a listener for when the screen comes into focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
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
      
      const reviewsRef = collection(db, 'reviews');
      const q = query(reviewsRef, where('userId', '==', currentUser.uid));
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
      console.error('Error loading user reviews:', error);
    }
  };
  
  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      loadUserProfile(),
      loadUserReviews()
    ]);
    setRefreshing(false);
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
        setProfilePicUrl(userData.profilePicUrl || currentUser.photoURL);
        setUsername(userData.username || "");

        // Get saved items
        if (userData.savedItems && Array.isArray(userData.savedItems)) {
          setSavedItems(userData.savedItems);
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

  const saveProfile = async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      const userRef = doc(db, "users", currentUser.uid);

      await updateDoc(userRef, {
        displayName,
        bio,
        profilePicUrl,
        username,
        updatedAt: new Date().toISOString(),
      });

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

  const pickImage = async () => {
    try {
      const permissionResult =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissionResult.granted) {
        Alert.alert(
          "Permission Required",
          "You need to grant permission to access your photos"
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        uploadImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Error", "Failed to pick image. Please try again.");
    }
  };

  const uploadImage = async (uri) => {
    try {
      setUploadingImage(true);
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      // Instead of using Firebase Storage which is causing issues,
      // we'll just save the local URI for now
      setProfilePicUrl(uri);

      // Update the user's profile in Firestore
      const userRef = doc(db, "users", currentUser.uid);
      await updateDoc(userRef, {
        profilePicUrl: uri,
        updatedAt: new Date().toISOString(),
      });

      console.log("Profile picture updated with local URI");
    } catch (error) {
      console.error("Error updating profile picture:", error);
      Alert.alert(
        "Error",
        "Failed to update profile picture. Please try again."
      );
    } finally {
      setUploadingImage(false);
    }
  };

  // Helper function to safely get image source
  const getImageSource = (item) => {
    if (item.imageUri) {
      return { uri: item.imageUri };
    } else if (item.image && typeof item.image === "object") {
      return item.image;
    } else {
      // Return a default image from assets
      return require("../assets/babydoll.jpeg");
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
                navigation.navigate("Info", {
                  id: item.id,
                  title: item.title,
                  artist: item.artist,
                  imageUri: item.imageUri,
                  type: item.type,
                  spotifyUri: item.spotifyUri,
                });
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
  }

  // Reviews functionality will be implemented in a future update

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={["#1DB954"]}
          tintColor={"#1DB954"}
        />
      }>
      <View style={styles.topBar}>
        {/* Stats Icon */}
        <TouchableOpacity style={styles.statsButton} onPress={() => navigation.navigate("Stats")}>
          <Ionicons name="stats-chart-outline" size={24} color="white" />
        </TouchableOpacity>
        
        {/* Edit/Save Button */}
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
          <TouchableOpacity style={styles.editButton} onPress={() => setEditMode(true)}>
            <Ionicons name="create-outline" size={24} color="white" />
          </TouchableOpacity>
        )}
      </View>
      
      <View style={styles.usernameContainer}>
        <Text style={styles.usernameText}>
          {username ? `@${username}` : "Profile"}
        </Text>
      </View>

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
                  : require("../assets/riley.png")
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

      {/* User Name */}
      {editMode ? (
        <TextInput
          style={styles.editNameInput}
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="Your name"
          placeholderTextColor="#9ca3af"
        />
      ) : (
        <Text style={styles.username}>{displayName}</Text>
      )}
      
      {/* Username */}
      {editMode ? (
        <View style={styles.usernameInputContainer}>
          <Text style={styles.usernamePrefix}>@</Text>
          <TextInput
            style={styles.usernameInput}
            value={username}
            onChangeText={setUsername}
            placeholder="username"
            placeholderTextColor="#9ca3af"
          />
        </View>
      ) : null}

      {/* User Bio */}
      {editMode ? (
        <TextInput
          style={styles.editBioInput}
          value={bio}
          onChangeText={setBio}
          placeholder="Write something about yourself"
          placeholderTextColor="#9ca3af"
          multiline
        />
      ) : (
        <Text style={styles.userBio}>{bio}</Text>
      )}

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Favorite Albums</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() =>
              navigation.navigate("Search", { fromScreen: "Profile" })
            }
          >
            <Ionicons name="add-circle" size={24} color="#1DB954" />
          </TouchableOpacity>
        </View>
        {renderHorizontalList(savedAlbums)}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Favorite Songs</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() =>
              navigation.navigate("Search", { fromScreen: "Profile" })
            }
          >
            <Ionicons name="add-circle" size={24} color="#1DB954" />
          </TouchableOpacity>
        </View>
        {renderHorizontalList(savedTracks)}
      </View>

      {/* My Reviews Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>My Reviews</Text>
          {userReviews.length > 3 && (
            <TouchableOpacity
              style={styles.viewMoreButton}
              onPress={() => navigation.navigate('AllReviews', { reviews: userReviews })}
            >
              <Text style={styles.viewMoreText}>View More</Text>
            </TouchableOpacity>
          )}
        </View>
        
        {userReviews.length > 0 ? (
          userReviews.slice(0, 3).map((review) => (
            <TouchableOpacity
              key={review.id}
              style={styles.reviewItem}
              onPress={() => {
                if (review.itemType === 'album') {
                  navigation.navigate('AlbumScreen', {
                    id: review.itemId,
                    title: review.itemTitle,
                    artist: review.itemArtist,
                    imageUri: review.itemImageUri,
                    spotifyUri: review.itemSpotifyUri
                  });
                } else {
                  navigation.navigate('Info', {
                    id: review.itemId,
                    title: review.itemTitle,
                    artist: review.itemArtist,
                    imageUri: review.itemImageUri,
                    type: review.itemType,
                    spotifyUri: review.itemSpotifyUri
                  });
                }
              }}
            >
              <Image 
                source={review.itemImageUri ? { uri: review.itemImageUri } : require("../assets/babydoll.jpeg")} 
                style={styles.reviewImage} 
              />
              <View style={styles.reviewContent}>
                <Text style={styles.reviewTitle}>{review.itemTitle}</Text>
                <Text style={styles.reviewArtist}>{review.itemArtist}</Text>
                <View style={styles.reviewRating}>
                  {[1, 2, 3, 4, 5].map((star) => {
                    const fullStar = star <= Math.floor(review.rating);
                    const halfStar = !fullStar && star === Math.floor(review.rating) + 1 && review.rating % 1 !== 0;
                    
                    return (
                      <Ionicons
                        key={star}
                        name={fullStar ? 'star' : halfStar ? 'star-half' : 'star-outline'}
                        size={16}
                        color="#FFD700"
                        style={{ marginRight: 2 }}
                      />
                    );
                  })}
                  <Text style={styles.ratingText}>{review.rating.toFixed(1)}</Text>
                </View>
                {review.review && (
                  <Text style={styles.reviewText} numberOfLines={2}>
                    {review.review}
                  </Text>
                )}
              </View>
              <View style={styles.reviewTypeContainer}>
                <Text style={styles.reviewType}>{review.itemType === 'album' ? 'Album' : 'Song'}</Text>
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <Text style={styles.emptyText}>No reviews yet</Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#121212",
    paddingTop: 50,
  },
  loadingContainer: {
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 50,
  },
  loadingText: {
    color: "#ffffff",
    marginTop: 10,
    fontSize: 16,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 10,
    marginBottom: 10,
  },
  statsButton: {
    padding: 8,
  },
  editButtonsContainer: {
    flexDirection: "row",
  },
  cancelButton: {
    marginRight: 10,
    padding: 8,
    borderRadius: 5,
    backgroundColor: "#333",
  },
  cancelButtonText: {
    color: "white",
    fontSize: 14,
  },
  saveButton: {
    padding: 8,
    borderRadius: 5,
    backgroundColor: "#1DB954",
  },
  saveButtonText: {
    color: "white",
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
    color: "white",
  },
  profilePicWrapper: {
    alignItems: "center",
    marginBottom: 10,
    position: "relative",
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
    backgroundColor: "#2A2A2A",
    justifyContent: "center",
    alignItems: "center",
  },
  username: {
    fontSize: 22,
    color: "white",
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 5,
  },
  editNameInput: {
    color: "white",
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
    paddingBottom: 5,
  },
  usernameInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 15,
    paddingHorizontal: 20,
  },
  usernamePrefix: {
    color: "#1DB954",
    fontSize: 18,
    fontWeight: "bold",
  },
  usernameInput: {
    color: "white",
    fontSize: 18,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
    paddingBottom: 5,
    marginLeft: 5,
    width: 200,
  },
  editBioInput: {
    fontSize: 14,
    color: "white",
    textAlign: "center",
    marginBottom: 20,
    paddingHorizontal: 30,
    borderWidth: 1,
    borderColor: "#1DB954",
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
    backgroundColor: "rgba(29, 185, 84, 0.1)",
  },
  viewMoreText: {
    color: "#1DB954",
    fontSize: 12,
    fontWeight: "600",
  },
  sectionTitle: {
    fontSize: 20,
    color: "white",
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
    backgroundColor: "#1E1E1E",
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
    color: "white",
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 4,
  },
  reviewItemArtist: {
    color: "#b3b3b3",
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
    color: "#B0B0B0",
    fontSize: 14,
    textAlign: "center",
    marginTop: 5,
    width: imageSize,
  },
  userBio: {
    fontSize: 14,
    color: "#9ca3af", // soft gray
    textAlign: "center",
    marginBottom: 20,
    paddingHorizontal: 30, // so the text doesn't hit the screen edges
  },
  section: {
    marginBottom: 30, // Control vertical spacing between sections
  },
  iconRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  emptyListText: {
    color: "#9ca3af",
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
    color: "#9ca3af",
    fontStyle: "italic",
    textAlign: "center",
    marginVertical: 20,
  },
  reviewItem: {
    flexDirection: "row",
    backgroundColor: "#1e1e1e",
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
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 2,
  },
  reviewArtist: {
    color: "#b3b3b3",
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
    color: "#9ca3af",
    fontSize: 13,
    fontStyle: "italic",
  },
  reviewTypeContainer: {
    backgroundColor: "#333",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  reviewType: {
    color: "#1DB954",
    fontSize: 12,
    fontWeight: "bold",
  },
});
