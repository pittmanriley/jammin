import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Image,
  TouchableOpacity,
  StyleSheet,
  Keyboard,
  TouchableWithoutFeedback,
  FlatList,
  ActivityIndicator,
  Alert,
  Dimensions,
  ScrollView,
  RefreshControl,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import {
  searchSpotify,
  isSpotifyConnected,
  getPersonalizedRecommendations,
} from "../../services/spotifyService";
import { theme } from "../../theme/theme";
import { trackEvent } from "../../amplitude";

export default function NewPost({ navigation }) {
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [spotifyConnected, setSpotifyConnected] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilters, setSelectedFilters] = useState({
    songs: false,
    albums: false,
  });

  // Add state for recommendations
  const [recommendations, setRecommendations] = useState({
    items: [],
    recentTracks: [],
    topTracks: [],
    newReleases: [],
  });
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);

  // State to track all fetched search results
  const [allResults, setAllResults] = useState({
    tracks: [],
    albums: [],
  });
  
  // Calculate dimensions for the grid
  const screenWidth = Dimensions.get('window').width;
  const spacing = 15;
  const numColumns = 2;
  const contentPadding = 20;
  // Calculate item width to ensure proper centering
  const itemWidth = (screenWidth - (spacing * (numColumns + 1)) - (contentPadding * 2)) / numColumns;

  useEffect(() => {
    checkSpotifyConnection();
    if (spotifyConnected) {
      fetchRecommendations();
    }
  }, [spotifyConnected]);
  
  // Function to fetch personalized recommendations
  const fetchRecommendations = async () => {
    try {
      setLoadingRecommendations(true);
      // Get more recommendations for a better discovery experience
      const data = await getPersonalizedRecommendations(30);
      setRecommendations(data);
      trackEvent("viewed_recommendations", { 
        recentTracks: data.recentTracks.length,
        topTracks: data.topTracks.length,
        newReleases: data.newReleases.length
      });
    } catch (error) {
      console.error('Error fetching recommendations:', error);
    } finally {
      setLoadingRecommendations(false);
    }
  };
  
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchRecommendations();
    setRefreshing(false);
  };

  const checkSpotifyConnection = async () => {
    const connected = await isSpotifyConnected();
    setSpotifyConnected(connected);
  };

  const handleSearch = async () => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    trackEvent("user_search_new_post", {
      query: query.trim(),
      filters: selectedFilters,
    });

    try {
      setLoading(true);
      // Always search for both types to get all results
      const results = await searchSpotify(query, "track,album", 20);

      // Process and store all results
      let tracks = [];
      let albums = [];

      if (results.tracks && results.tracks.items) {
        tracks = results.tracks.items.map((track) => ({
          id: track.id,
          name: track.name,
          artist: track.artists.map((a) => a.name).join(", "),
          album: track.album.name,
          imageUri: track.album.images[0]?.url,
          spotifyUri: track.uri,
          type: "track",
        }));
      }

      if (results.albums && results.albums.items) {
        albums = results.albums.items.map((album) => ({
          id: album.id,
          name: album.name,
          artist: album.artists.map((a) => a.name).join(", "),
          album: null,
          imageUri: album.images[0]?.url,
          spotifyUri: album.uri,
          type: "album",
        }));
      }

      // Store all results
      setAllResults({ tracks, albums });

      // Apply filters to determine what to display
      updateDisplayedResults();
    } catch (error) {
      console.error("Error searching Spotify:", error);
      Alert.alert("Error", "Failed to search Spotify. Please try again.");
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  // Separate function to update displayed results based on filters
  const updateDisplayedResults = () => {
    let formattedResults = [];

    // If songs filter is active, show only songs
    if (selectedFilters.songs) {
      formattedResults = [...allResults.tracks];
    }
    // If albums filter is active, show only albums
    else if (selectedFilters.albums) {
      formattedResults = [...allResults.albums];
    }
    // If no filters are active, show both
    else {
      formattedResults = [...allResults.tracks, ...allResults.albums];
    }

    setSearchResults(formattedResults);
  };

  // Render a grid item for the vertical grid
  const renderGridItem = ({ item, index }) => {
    return (
      <TouchableOpacity
        key={`item-${item.id}-${index}`}
        style={[styles.gridItem, { width: itemWidth }]}
        onPress={() => {
          // Handle navigation based on item type
          if (item.type === "album") {
            navigation.navigate("Album", {
              id: item.id,
              title: item.name,
              artist: item.artist,
              imageUri: item.imageUri,
              spotifyUri: item.spotifyUri,
            });
          } else {
            navigation.navigate("Info", {
              id: item.id,
              title: item.name,
              artist: item.artist,
              imageUri: item.imageUri,
              type: "track", // Ensure correct type is passed
              spotifyUri: item.spotifyUri,
            });
          }
          trackEvent("selected_recommendation", { type: item.type, fromGrid: true });
        }}
      >
        <View style={styles.gridItemImageContainer}>
          <Image
            source={item.imageUri ? { uri: item.imageUri } : require("../../assets/profile.jpg")}
            style={styles.gridItemImage}
          />
          <View style={styles.gridItemTypeTag}>
            <Text style={styles.gridItemTypeText}>
              {item.type === "track" ? "SONG" : "ALBUM"}
            </Text>
          </View>
        </View>
        <View style={styles.gridItemTextContainer}>
          <Text style={styles.gridItemName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.gridItemArtist} numberOfLines={1}>{item.artist}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  // Render the explore grid
  const renderExploreGrid = () => {
    if (loadingRecommendations) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.button.primary} />
          <Text style={styles.loadingText}>Loading recommendations...</Text>
        </View>
      );
    }

    // Combine all recommendations into a single array
    let allItems = [];
    
    // Add albums from top artists
    if (recommendations.topArtistAlbums && recommendations.topArtistAlbums.length > 0) {
      allItems = [...allItems, ...recommendations.topArtistAlbums];
    }
    
    // Add albums from listening history
    if (recommendations.relatedAlbums && recommendations.relatedAlbums.length > 0) {
      allItems = [...allItems, ...recommendations.relatedAlbums];
    }
    
    // Add recommended tracks
    if (recommendations.recommendedTracks && recommendations.recommendedTracks.length > 0) {
      allItems = [...allItems, ...recommendations.recommendedTracks];
    }
    
    // Add top tracks
    if (recommendations.topTracks && recommendations.topTracks.length > 0) {
      allItems = [...allItems, ...recommendations.topTracks];
    }
    
    // Shuffle the items to create a mixed grid of albums and songs
    const shuffledItems = [...allItems].sort(() => 0.5 - Math.random());
    
    if (shuffledItems.length === 0) {
      return (
        <View style={styles.noResultsContainer}>
          <Ionicons name="musical-notes" size={50} color={theme.text.secondary} />
          <Text style={styles.noResultsText}>No recommendations available</Text>
        </View>
      );
    }

    return (
      <FlatList
        key={`grid-${numColumns}`}
        data={shuffledItems}
        renderItem={renderGridItem}
        keyExtractor={(item, index) => `item-${item.id}-${index}`}
        numColumns={numColumns}
        columnWrapperStyle={styles.columnWrapper}
        contentContainerStyle={styles.gridContentContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.button.primary]}
            tintColor={theme.button.primary}
          />
        }
      />
    );
  };

  // Render the search results
  const renderSearchResults = () => {
    if (!spotifyConnected) {
      return (
        <View style={styles.spotifyConnectContainer}>
          <Text style={styles.spotifyConnectTitle}>Connect to Spotify</Text>
          <Text style={styles.spotifyConnectText}>
            You need to connect your Spotify account to search for songs and
            albums.
          </Text>
          <TouchableOpacity
            style={styles.connectButton}
            onPress={() =>
              navigation.navigate("SpotifyAuth", { fromMain: true })
            }
          >
            <Text style={styles.connectButtonText}>Connect Spotify</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.button.primary} />
          <Text style={styles.loadingText}>Searching...</Text>
        </View>
      );
    }

    if (searchResults.length === 0 && query.trim() !== "") {
      return (
        <View style={styles.noResultsContainer}>
          <Text style={styles.noResultsText}>No results found</Text>
        </View>
      );
    }

    return (
      <FlatList
        data={searchResults}
        keyExtractor={(item) => `${item.type}-${item.id}`}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.resultCard}
            onPress={() => {
              if (item.type === "album") {
                navigation.navigate("AlbumScreen", {
                  id: item.id,
                  title: item.name,
                  artist: item.artist,
                  imageUri: item.imageUri,
                  spotifyUri: item.spotifyUri,
                });
              } else {
                navigation.navigate("Info", {
                  id: item.id,
                  title: item.name,
                  artist: item.artist,
                  imageUri: item.imageUri,
                  type: item.type,
                  spotifyUri: item.spotifyUri,
                });
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
                  name="musical-note"
                  size={24}
                  color={theme.text.secondary}
                />
              </View>
            )}
            <View style={styles.resultTextContainer}>
              <Text style={styles.songName}>{item.name}</Text>
              <Text style={styles.artist}>{item.artist}</Text>
              {item.album && <Text style={styles.albumName}>{item.album}</Text>}
              <Text style={styles.itemType}>
                {item.type === "track" ? "Song" : "Album"}
              </Text>
            </View>
          </TouchableOpacity>
        )}
      />
    );
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.container}>
        <Text style={styles.header}>New Review</Text>

        {/* Search Box */}
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.input}
            placeholder="Search for a song or album to review..."
            placeholderTextColor={theme.text.secondary}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={handleSearch}
          />
          <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
            <Ionicons name="search" size={24} color={theme.text.primary} />
          </TouchableOpacity>
        </View>

        {query ? (
          // Show search results and filters when there's a query
          <>
            {/* Filter Buttons */}
            <View style={styles.filterContainer}>
              <TouchableOpacity
                style={[
                  styles.filterButton,
                  selectedFilters.songs && styles.filterButtonActive,
                ]}
                onPress={() => {
                  const newSongsFilter = !selectedFilters.songs;
                  const newFilters = {
                    songs: newSongsFilter,
                    albums: false,
                  };
                  setSelectedFilters(newFilters);

                  setTimeout(() => {
                    if (newFilters.songs) {
                      setSearchResults([...allResults.tracks]);
                    } else {
                      setSearchResults([...allResults.tracks, ...allResults.albums]);
                    }
                  }, 10);
                }}
              >
                <Text
                  style={[
                    styles.filterButtonText,
                    selectedFilters.songs && styles.filterButtonTextActive,
                  ]}
                >
                  Songs
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.filterButton,
                  selectedFilters.albums && styles.filterButtonActive,
                ]}
                onPress={() => {
                  const newAlbumsFilter = !selectedFilters.albums;
                  const newFilters = {
                    songs: false,
                    albums: newAlbumsFilter,
                  };
                  setSelectedFilters(newFilters);

                  setTimeout(() => {
                    if (newFilters.albums) {
                      setSearchResults([...allResults.albums]);
                    } else {
                      setSearchResults([...allResults.tracks, ...allResults.albums]);
                    }
                  }, 10);
                }}
              >
                <Text
                  style={[
                    styles.filterButtonText,
                    selectedFilters.albums && styles.filterButtonTextActive,
                  ]}
                >
                  Albums
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.resultsContainer}>{renderSearchResults()}</View>
          </>
        ) : (
          // Show the recommendations grid when no search query
          <>
            <View style={styles.exploreHeaderContainer}>
              <Text style={styles.exploreHeader}>Discover & Review</Text>
              <Text style={styles.exploreSubheader}>Personalized recommendations based on your listening history</Text>
            </View>

            <View style={styles.gridContainer}>
              {renderExploreGrid()}
            </View>
          </>
        )}
      </View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background.primary,
    paddingTop: 50,
    paddingHorizontal: 20,
  },
  header: {
    fontSize: 28,
    fontWeight: "bold",
    color: theme.text.primary,
    marginTop: 10,
    marginBottom: 20,
    textAlign: "center",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  input: {
    flex: 1,
    backgroundColor: theme.background.secondary,
    borderRadius: 10,
    padding: 15,
    color: theme.text.primary,
    fontSize: 16,
    marginRight: 10,
  },
  searchButton: {
    backgroundColor: theme.button.primary,
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
  },
  filterContainer: {
    flexDirection: "row",
    marginBottom: 20,
  },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginRight: 10,
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
  resultsContainer: {
    flex: 1,
  },
  resultCard: {
    flexDirection: "row",
    marginBottom: 15,
    alignItems: "center",
    backgroundColor: theme.background.secondary,
    borderRadius: 10,
    padding: 12,
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
  },
  songName: {
    color: theme.text.primary,
    fontSize: 16,
    fontWeight: "bold",
  },
  artist: {
    color: theme.text.secondary,
    fontSize: 14,
    marginTop: 2,
  },
  albumName: {
    color: theme.text.secondary,
    fontSize: 12,
    marginTop: 2,
  },
  itemType: {
    color: theme.button.primary,
    fontSize: 12,
    marginTop: 4,
    fontWeight: "bold",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: theme.text.primary,
    marginTop: 10,
  },
  noResultsContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  noResultsText: {
    color: theme.text.secondary,
    fontSize: 16,
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
  // New styles for grid layout
  gridContainer: {
    flex: 1,
  },
  gridContentContainer: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
    width: '100%',
  },
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  gridItem: {
    marginBottom: 15,
    borderRadius: 8,
  },
  gridItemImageContainer: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 8,
    aspectRatio: 1,
    width: '100%',
    backgroundColor: theme.background.secondary,
  },
  gridItemImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  gridItemTypeTag: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  gridItemTypeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: 'bold',
  },
  gridItemTextContainer: {
    marginTop: 6,
    paddingHorizontal: 2,
  },
  gridItemName: {
    color: theme.text.primary,
    fontSize: 13,
    fontWeight: 'bold',
  },
  gridItemArtist: {
    color: theme.text.secondary,
    fontSize: 11,
    marginTop: 1,
  },
  exploreHeaderContainer: {
    marginBottom: 12,
    marginTop: 5,
  },
  exploreHeader: {
    fontSize: 22,
    fontWeight: 'bold',
    color: theme.text.primary,
  },
  exploreSubheader: {
    fontSize: 14,
    color: theme.text.secondary,
    marginTop: 2,
  },
});
