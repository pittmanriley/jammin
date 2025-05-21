import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  Image,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { searchSpotify } from "../../services/spotifyService";
import { auth, db } from "../../firebaseConfig";
import { doc, updateDoc, getDoc, arrayUnion } from "firebase/firestore";
import { theme } from "../../theme/theme";

export default function Search() {
  const navigation = useNavigation();
  const route = useRoute();
  const { fromScreen } = route.params || { fromScreen: "Profile" };

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchType, setSearchType] = useState("track,album");
  const [savedItems, setSavedItems] = useState([]);

  useEffect(() => {
    loadSavedItems();
  }, []);

  const loadSavedItems = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const userRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userRef);

      if (userDoc.exists()) {
        const userData = userDoc.data();
        setSavedItems(userData.savedItems || []);
      }
    } catch (error) {
      console.error("Error loading saved items:", error);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    try {
      setLoading(true);
      const results = await searchSpotify(searchQuery, searchType, 20);

      let formattedResults = [];

      if (results.tracks && results.tracks.items) {
        const trackResults = results.tracks.items.map((track) => ({
          id: track.id,
          title: track.name,
          artist: track.artists[0].name,
          imageUri: track.album.images[0]?.url,
          type: "track",
          spotifyUri: track.uri,
        }));
        formattedResults = [...formattedResults, ...trackResults];
      }

      if (results.albums && results.albums.items) {
        const albumResults = results.albums.items.map((album) => ({
          id: album.id,
          title: album.name,
          artist: album.artists[0].name,
          imageUri: album.images[0]?.url,
          type: "album",
          spotifyUri: album.uri,
        }));
        formattedResults = [...formattedResults, ...albumResults];
      }

      setSearchResults(formattedResults);
    } catch (error) {
      console.error("Error searching Spotify:", error);
      Alert.alert("Error", "Failed to search Spotify. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const isItemSaved = (id) => {
    return savedItems.some((item) => item.id === id);
  };

  const handleSaveItem = async (item) => {
    try {
      const user = auth.currentUser;
      if (!user) {
        Alert.alert("Error", "You must be logged in to save items");
        return;
      }

      const userRef = doc(db, "users", user.uid);

      if (isItemSaved(item.id)) {
        // Remove from saved items
        const updatedItems = savedItems.filter(
          (savedItem) => savedItem.id !== item.id
        );

        await updateDoc(userRef, {
          savedItems: updatedItems,
        });

        setSavedItems(updatedItems);
        Alert.alert(
          "Success",
          `${
            item.type.charAt(0).toUpperCase() + item.type.slice(1)
          } removed from your saved items`
        );
      } else {
        // Add to saved items
        const itemToSave = {
          ...item,
          savedAt: new Date().toISOString(),
        };

        const updatedItems = [...savedItems, itemToSave];

        await updateDoc(userRef, {
          savedItems: updatedItems,
        });

        setSavedItems(updatedItems);
        Alert.alert(
          "Success",
          `${
            item.type.charAt(0).toUpperCase() + item.type.slice(1)
          } saved to your profile`
        );
      }
    } catch (error) {
      console.error("Error saving item:", error);
      Alert.alert("Error", "Failed to save item. Please try again.");
    }
  };

  const renderItem = ({ item }) => {
    const isSaved = isItemSaved(item.id);

    return (
      <View style={styles.resultItem}>
        <TouchableOpacity
          style={styles.resultContent}
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
            source={
              item.imageUri
                ? { uri: item.imageUri }
                : require("../../assets/babydoll.jpeg")
            }
            style={styles.resultImage}
          />
          <View style={styles.resultTextContainer}>
            <Text style={styles.resultTitle} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={styles.resultArtist} numberOfLines={1}>
              {item.artist}
            </Text>
            <Text style={styles.resultType}>
              {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.saveButton}
          onPress={() => handleSaveItem(item)}
        >
          <Ionicons
            name={isSaved ? "bookmark" : "bookmark-outline"}
            size={24}
            color={isSaved ? theme.button.primary : theme.text.primary}
          />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={theme.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Search</Text>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons
            name="search"
            size={20}
            color={theme.text.secondary}
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Search for songs, albums, artists..."
            placeholderTextColor={theme.text.secondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            autoCorrect={false}
            spellCheck={false}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery("")}
              style={styles.clearButton}
            >
              <Ionicons
                name="close-circle"
                size={20}
                color={theme.text.secondary}
              />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.filterContainer}>
          <TouchableOpacity
            style={[
              styles.filterButton,
              searchType.includes("track") && styles.filterButtonActive,
            ]}
            onPress={() => {
              if (searchType.includes("track")) {
                setSearchType(
                  searchType
                    .replace("track,", "")
                    .replace(",track", "")
                    .replace("track", "")
                );
              } else {
                setSearchType(searchType ? `${searchType},track` : "track");
              }
            }}
          >
            <Text
              style={[
                styles.filterButtonText,
                searchType.includes("track") && styles.filterButtonTextActive,
              ]}
            >
              Songs
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterButton,
              searchType.includes("album") && styles.filterButtonActive,
            ]}
            onPress={() => {
              if (searchType.includes("album")) {
                setSearchType(
                  searchType
                    .replace("album,", "")
                    .replace(",album", "")
                    .replace("album", "")
                );
              } else {
                setSearchType(searchType ? `${searchType},album` : "album");
              }
            }}
          >
            <Text
              style={[
                styles.filterButtonText,
                searchType.includes("album") && styles.filterButtonTextActive,
              ]}
            >
              Albums
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.button.primary} />
          <Text style={styles.loadingText}>Searching...</Text>
        </View>
      ) : (
        <FlatList
          data={searchResults}
          renderItem={renderItem}
          keyExtractor={(item) => `${item.type}-${item.id}`}
          contentContainerStyle={styles.resultsList}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              {searchQuery.length > 0 ? (
                <Text style={styles.emptyText}>
                  No results found. Try a different search.
                </Text>
              ) : (
                <Text style={styles.emptyText}>
                  Search for songs, albums, or artists to add to your profile.
                </Text>
              )}
            </View>
          }
        />
      )}
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
    padding: 16,
    paddingTop: 50,
    backgroundColor: theme.background.primary,
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: theme.text.primary,
  },
  searchContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.background.secondary,
  },
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.background.secondary,
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    color: theme.text.primary,
    fontSize: 16,
  },
  clearButton: {
    padding: 4,
  },
  filterContainer: {
    flexDirection: "row",
    marginTop: 12,
  },
  filterButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginRight: 8,
    backgroundColor: theme.background.secondary,
  },
  filterButtonActive: {
    backgroundColor: theme.button.primary,
  },
  filterButtonText: {
    color: theme.text.secondary,
    fontSize: 14,
  },
  filterButtonTextActive: {
    color: theme.text.primary,
    fontWeight: "bold",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    color: theme.text.primary,
    fontSize: 16,
  },
  resultsList: {
    padding: 16,
  },
  resultItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.background.secondary,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  resultContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  resultImage: {
    width: 60,
    height: 60,
    borderRadius: 4,
  },
  resultTextContainer: {
    flex: 1,
    marginLeft: 12,
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
  resultType: {
    color: theme.button.primary,
    fontSize: 12,
    marginTop: 4,
  },
  saveButton: {
    padding: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 40,
  },
  emptyText: {
    color: theme.text.secondary,
    fontSize: 16,
    textAlign: "center",
    paddingHorizontal: 20,
  },
});
