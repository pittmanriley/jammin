import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  FlatList,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import {
  searchSpotify,
  isSpotifyConnected,
} from "../../services/spotifyService";
import { auth, db } from "../../firebaseConfig";
import {
  collection,
  addDoc,
  serverTimestamp,
  doc,
  updateDoc,
} from "firebase/firestore";
import { theme } from "../../theme/theme";

export default function LeaveReview({ route, navigation }) {
  const { song, existingReview } = route.params || {};
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedSong, setSelectedSong] = useState(song || null);
  const [rating, setRating] = useState(existingReview?.rating || 0);
  const [reviewText, setReviewText] = useState(existingReview?.review || "");
  const [loading, setLoading] = useState(false);
  const [spotifyConnected, setSpotifyConnected] = useState(false);
  const [searchType, setSearchType] = useState("track,album,artist");
  const [activeFilter, setActiveFilter] = useState("all");
  const [directReviewMode, setDirectReviewMode] = useState(!!song);

  useEffect(() => {
    checkSpotifyConnection();
  }, []);

  const checkSpotifyConnection = async () => {
    const connected = await isSpotifyConnected();
    setSpotifyConnected(connected);
  };

  const handleFilterChange = (filter) => {
    // Toggle filter selection
    if (filter === activeFilter) {
      // If the current filter is clicked again, deselect it
      setActiveFilter(null);
      setSearchType("track,album"); // Search both when no filter is selected
    } else {
      // Select the new filter
      setActiveFilter(filter);

      // Update search type based on filter
      switch (filter) {
        case "songs":
          setSearchType("track");
          break;
        case "albums":
          setSearchType("album");
          break;
        default:
          setSearchType("track,album"); // Default to both
      }
    }

    // If there's a search query, perform search with new filter
    if (searchQuery.trim()) {
      handleSearch();
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    try {
      setLoading(true);
      const results = await searchSpotify(searchQuery, searchType, 20);

      let formattedResults = [];

      // For tracks/songs
      if (
        results.tracks &&
        results.tracks.items &&
        (activeFilter === "all" || activeFilter === "songs")
      ) {
        const trackResults = results.tracks.items.map((track) => ({
          id: track.id,
          name: track.name,
          artist: track.artists.map((a) => a.name).join(", "),
          album: track.album.name,
          imageUri: track.album.images[0]?.url,
          spotifyUri: track.uri,
          type: "track",
        }));
        formattedResults = [...formattedResults, ...trackResults];
      }

      // For albums
      if (
        results.albums &&
        results.albums.items &&
        (activeFilter === "all" || activeFilter === "albums")
      ) {
        const albumResults = results.albums.items.map((album) => ({
          id: album.id,
          name: album.name,
          artist: album.artists.map((a) => a.name).join(", "),
          album: null,
          imageUri: album.images[0]?.url,
          spotifyUri: album.uri,
          type: "album",
        }));
        formattedResults = [...formattedResults, ...albumResults];
      }

      // For artists
      if (
        results.artists &&
        results.artists.items &&
        (activeFilter === "all" || activeFilter === "artists")
      ) {
        const artistResults = results.artists.items.map((artist) => ({
          id: artist.id,
          name: artist.name,
          artist: null,
          album: null,
          imageUri: artist.images[0]?.url,
          spotifyUri: artist.uri,
          type: "artist",
        }));
        formattedResults = [...formattedResults, ...artistResults];
      }

      // Sort results to prioritize exact type matches
      formattedResults.sort((a, b) => {
        // If we're filtering for a specific type, prioritize that type
        if (activeFilter === "songs" && a.type === "track") return -1;
        if (activeFilter === "songs" && b.type === "track") return 1;
        if (activeFilter === "albums" && a.type === "album") return -1;
        if (activeFilter === "albums" && b.type === "album") return 1;
        if (activeFilter === "artists" && a.type === "artist") return -1;
        if (activeFilter === "artists" && b.type === "artist") return 1;
        return 0;
      });

      setSearchResults(formattedResults);
    } catch (error) {
      console.error("Error searching Spotify:", error);
      Alert.alert("Error", "Failed to search Spotify. Please try again.");
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSong = (song) => {
    setSelectedSong(song);
  };

  const handleSave = async () => {
    if (!selectedSong) {
      Alert.alert("Error", "Please select a song or album first");
      return;
    }

    if (rating === 0) {
      Alert.alert("Error", "Please rate the item");
      return;
    }

    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        Alert.alert("Error", "You must be logged in to leave a review");
        return;
      }

      // Save review to Firestore
      const reviewData = {
        userId: currentUser.uid,
        userName: currentUser.displayName || "Anonymous",
        userEmail: currentUser.email,
        itemId: selectedSong.id,
        itemTitle: selectedSong.name,
        itemArtist: selectedSong.artist,
        itemImageUri: selectedSong.imageUri,
        itemType: selectedSong.type,
        itemSpotifyUri: selectedSong.spotifyUri,
        rating,
        review: reviewText,
        createdAt: existingReview?.createdAt || serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      if (existingReview) {
        // Update existing review
        const reviewRef = doc(db, "reviews", existingReview.id);
        await updateDoc(reviewRef, reviewData);
      } else {
        // Create new review
        await addDoc(collection(db, "reviews"), reviewData);
      }

      Alert.alert(
        "Review Posted!",
        "Your review was successfully saved.",
        [
          {
            text: "OK",
            onPress: () => navigation.goBack(), // After clicking OK, go back
          },
        ],
        { cancelable: false }
      );
    } catch (error) {
      console.error("Error saving review:", error);
      Alert.alert("Error", "Failed to save your review. Please try again.");
    }
  };

  const handleConnectSpotify = () => {
    navigation.navigate("SpotifyAuth");
  };

  const renderSearchResults = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.button.primary} />
          <Text style={styles.loadingText}>Searching...</Text>
        </View>
      );
    }

    if (searchResults.length === 0 && searchQuery.trim() !== "") {
      return (
        <View style={styles.noResultsContainer}>
          <Text style={styles.noResultsText}>No songs found</Text>
        </View>
      );
    }

    return (
      <FlatList
        data={searchResults}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.resultItem,
              selectedSong?.id === item.id && styles.selectedResultItem,
            ]}
            onPress={() => {
              if (item.type === "album") {
                navigation.navigate("AlbumScreen", {
                  id: item.id,
                  title: item.name,
                  artist: item.artist,
                  imageUri: item.imageUri,
                  spotifyUri: item.spotifyUri,
                });
              } else if (item.type === "artist") {
                navigation.navigate("Artist", {
                  id: item.id,
                  name: item.name,
                  imageUri: item.imageUri,
                  spotifyUri: item.spotifyUri,
                });
              } else {
                handleSelectSong(item);
              }
            }}
          >
            {item.imageUri ? (
              <Image
                source={{ uri: item.imageUri }}
                style={styles.resultImage}
              />
            ) : (
              <View style={styles.placeholderImage}>
                <Ionicons
                  name={
                    item.type === "album"
                      ? "disc"
                      : item.type === "artist"
                      ? "person"
                      : "musical-note"
                  }
                  size={24}
                  color={theme.text.secondary}
                />
              </View>
            )}
            <View style={styles.resultTextContainer}>
              <Text style={styles.resultTitle}>{item.name}</Text>
              <Text style={styles.resultArtist}>{item.artist}</Text>
              {item.album && (
                <Text style={styles.resultAlbum}>{item.album}</Text>
              )}
              <View
                style={[
                  styles.typeTag,
                  item.type === "track"
                    ? styles.trackTypeTag
                    : item.type === "album"
                    ? styles.albumTypeTag
                    : styles.artistTypeTag,
                ]}
              >
                <Text style={styles.typeTagText}>
                  {item.type === "track"
                    ? "Song"
                    : item.type === "album"
                    ? "Album"
                    : "Artist"}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
      />
    );
  };

  const renderReviewForm = () => {
    if (!selectedSong) return null;

    return (
      <View style={styles.reviewFormContainer}>
        <View style={styles.selectedSongContainer}>
          <Text style={styles.selectedSongTitle}>{selectedSong.name}</Text>
          <Text style={styles.selectedSongArtist}>{selectedSong.artist}</Text>
        </View>

        <Text style={styles.subtitle}>
          Rate this {selectedSong.type === "album" ? "album" : "song"}
        </Text>
        <View style={styles.starsContainer}>
          {[1, 2, 3, 4, 5].map((star) => {
            const fullStar = star <= Math.floor(rating);
            const halfStar =
              !fullStar && star === Math.floor(rating) + 1 && rating % 1 !== 0;
            const emptyStar = !fullStar && !halfStar;

            return (
              <View key={star} style={styles.starContainer}>
                <TouchableOpacity
                  onPress={() => setRating(star)}
                  style={styles.starTouchable}
                >
                  <Ionicons
                    name={
                      fullStar
                        ? "star"
                        : halfStar
                        ? "star-half"
                        : "star-outline"
                    }
                    size={32}
                    color={
                      fullStar || halfStar ? "#FFD700" : theme.text.secondary
                    }
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setRating(star - 0.5)}
                  style={[styles.halfStarTouchable]}
                />
              </View>
            );
          })}
        </View>

        <Text style={styles.ratingText}>{rating.toFixed(1)}/5.0</Text>

        <Text style={styles.subtitle}>Add Review:</Text>
        <TextInput
          style={styles.textArea}
          placeholder="Write your review..."
          placeholderTextColor={theme.text.secondary}
          multiline
          numberOfLines={6}
          returnKeyType="done"
          onSubmitEditing={() => {
            Keyboard.dismiss();
          }}
          value={reviewText}
          onChangeText={setReviewText}
        />

        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>Save Review</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.cancelButton}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {directReviewMode ? "Leave a Review" : "Search & Review"}
          </Text>
          <View style={{ width: 50 }} />
        </View>

        {!spotifyConnected ? (
          <View style={styles.spotifyConnectContainer}>
            <Text style={styles.spotifyConnectTitle}>Connect to Spotify</Text>
            <Text style={styles.spotifyConnectText}>
              Connect your Spotify account to search for songs
            </Text>
            <TouchableOpacity
              style={styles.connectButton}
              onPress={handleConnectSpotify}
            >
              <Text style={styles.connectButtonText}>Connect Spotify</Text>
            </TouchableOpacity>
          </View>
        ) : directReviewMode ? (
          renderReviewForm()
        ) : (
          <>
            <View style={styles.searchContainer}>
              <TextInput
                style={styles.searchInput}
                placeholder="Search for music..."
                placeholderTextColor={theme.text.secondary}
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={handleSearch}
              />
              <TouchableOpacity
                style={styles.searchButton}
                onPress={handleSearch}
              >
                <Ionicons name="search" size={24} color={theme.text.primary} />
              </TouchableOpacity>
            </View>

            <View style={styles.filterContainer}>
              <TouchableOpacity
                style={[
                  styles.filterButton,
                  activeFilter === "all" && styles.activeFilterButton,
                ]}
                onPress={() => handleFilterChange("all")}
              >
                <Text
                  style={[
                    styles.filterText,
                    activeFilter === "all" && styles.activeFilterText,
                  ]}
                >
                  All
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.filterButton,
                  activeFilter === "songs" && styles.activeFilterButton,
                ]}
                onPress={() => handleFilterChange("songs")}
              >
                <Text
                  style={[
                    styles.filterText,
                    activeFilter === "songs" && styles.activeFilterText,
                  ]}
                >
                  Songs
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.filterButton,
                  activeFilter === "albums" && styles.activeFilterButton,
                ]}
                onPress={() => handleFilterChange("albums")}
              >
                <Text
                  style={[
                    styles.filterText,
                    activeFilter === "albums" && styles.activeFilterText,
                  ]}
                >
                  Albums
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.filterButton,
                  activeFilter === "artists" && styles.activeFilterButton,
                ]}
                onPress={() => handleFilterChange("artists")}
              >
                <Text
                  style={[
                    styles.filterText,
                    activeFilter === "artists" && styles.activeFilterText,
                  ]}
                >
                  Artists
                </Text>
              </TouchableOpacity>
            </View>

            {selectedSong && (
              <View style={styles.selectedSongContainer}>
                <Text style={styles.selectedSongTitle}>
                  {selectedSong.name}
                </Text>
                <Text style={styles.selectedSongArtist}>
                  {selectedSong.artist}
                </Text>
              </View>
            )}

            {renderSearchResults()}
            {renderReviewForm()}
          </>
        )}
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background.primary,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.background.secondary,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: theme.text.primary,
  },
  cancelButton: {
    color: theme.text.secondary,
    fontSize: 16,
    textDecorationLine: "underline",
  },
  searchContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: theme.background.secondary,
  },
  filterContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.background.secondary,
    backgroundColor: theme.background.secondary,
  },
  filterButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: theme.text.secondary,
  },
  activeFilterButton: {
    backgroundColor: theme.button.primary,
    borderColor: theme.button.primary,
  },
  filterText: {
    color: theme.text.primary,
    fontSize: 12,
  },
  activeFilterText: {
    fontWeight: "bold",
  },
  searchInput: {
    flex: 1,
    backgroundColor: theme.background.secondary,
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    color: theme.text.primary,
    marginRight: 10,
  },
  searchButton: {
    backgroundColor: theme.button.primary,
    borderRadius: 20,
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingContainer: {
    padding: 20,
    alignItems: "center",
  },
  loadingText: {
    color: theme.text.primary,
    marginTop: 10,
  },
  noResultsContainer: {
    padding: 20,
    alignItems: "center",
  },
  noResultsText: {
    color: theme.text.secondary,
    fontSize: 16,
  },
  resultItem: {
    flexDirection: "row",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: theme.background.secondary,
  },
  selectedResultItem: {
    backgroundColor: `${theme.button.primary}1A`, // 10% opacity
  },
  resultImage: {
    width: 60,
    height: 60,
    borderRadius: 5,
  },
  placeholderImage: {
    width: 60,
    height: 60,
    borderRadius: 5,
    backgroundColor: theme.background.secondary,
    justifyContent: "center",
    alignItems: "center",
  },
  resultTextContainer: {
    flex: 1,
    marginLeft: 15,
    justifyContent: "center",
  },
  resultTitle: {
    color: theme.text.primary,
    fontSize: 16,
    fontWeight: "bold",
  },
  resultArtist: {
    color: theme.text.secondary,
    fontSize: 14,
    marginTop: 2,
  },
  resultAlbum: {
    color: theme.text.secondary,
    fontSize: 12,
    marginTop: 2,
  },
  typeTag: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 12,
    alignSelf: "flex-start",
    marginTop: 4,
  },
  trackTypeTag: {
    backgroundColor: "#1e3a8a",
  },
  albumTypeTag: {
    backgroundColor: theme.button.primary,
  },
  artistTypeTag: {
    backgroundColor: "#9333ea",
  },
  typeTagText: {
    color: theme.text.primary,
    fontSize: 11,
    fontWeight: "bold",
  },
  selectedSongContainer: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: theme.background.secondary,
    backgroundColor: theme.background.secondary,
  },
  selectedSongTitle: {
    color: theme.text.primary,
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
  },
  selectedSongArtist: {
    color: theme.text.secondary,
    fontSize: 14,
    textAlign: "center",
    marginTop: 5,
  },
  reviewFormContainer: {
    padding: 20,
  },
  starsContainer: {
    flexDirection: "row",
    marginBottom: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  starContainer: {
    position: "relative",
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  starTouchable: {
    position: "absolute",
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  halfStarTouchable: {
    position: "absolute",
    width: 16,
    height: 32,
    left: 0,
    backgroundColor: "transparent",
  },
  ratingText: {
    color: "#FFD700",
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
  },
  textArea: {
    backgroundColor: theme.background.secondary,
    borderRadius: 10,
    padding: 15,
    color: theme.text.primary,
    fontSize: 16,
    height: 120,
    marginBottom: 20,
  },
  saveButton: {
    backgroundColor: theme.button.primary,
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
  },
  saveButtonText: {
    color: theme.text.primary,
    fontWeight: "bold",
    fontSize: 18,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: theme.text.primary,
    marginBottom: 10,
    marginTop: 20,
    textAlign: "center",
  },
  spotifyConnectContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  spotifyConnectTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: theme.text.primary,
    marginBottom: 10,
  },
  spotifyConnectText: {
    fontSize: 16,
    color: theme.text.secondary,
    textAlign: "center",
    marginBottom: 30,
  },
  connectButton: {
    backgroundColor: theme.button.primary,
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
  },
  connectButtonText: {
    color: theme.text.primary,
    fontWeight: "bold",
    fontSize: 16,
  },
});
