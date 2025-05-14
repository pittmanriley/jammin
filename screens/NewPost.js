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
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { searchSpotify, isSpotifyConnected } from "../services/spotifyService";

export default function NewPost({ navigation }) {
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [spotifyConnected, setSpotifyConnected] = useState(false);
  // Remove searchType as we're not using it anymore
  const [selectedFilters, setSelectedFilters] = useState({
    songs: false,
    albums: false
  });
  
  // Add a state to track all fetched results
  const [allResults, setAllResults] = useState({
    tracks: [],
    albums: []
  });

  useEffect(() => {
    checkSpotifyConnection();
  }, []);

  const checkSpotifyConnection = async () => {
    const connected = await isSpotifyConnected();
    setSpotifyConnected(connected);
  };

  const handleSearch = async () => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setLoading(true);
      // Always search for both types to get all results
      const results = await searchSpotify(query, 'track,album', 20);
      
      // Process and store all results
      let tracks = [];
      let albums = [];
      
      if (results.tracks && results.tracks.items) {
        tracks = results.tracks.items.map(track => ({
          id: track.id,
          name: track.name,
          artist: track.artists.map((a) => a.name).join(", "),
          album: track.album.name,
          imageUri: track.album.images[0]?.url,
          spotifyUri: track.uri,
          type: 'track',
        }));
      }
      
      if (results.albums && results.albums.items) {
        albums = results.albums.items.map(album => ({
          id: album.id,
          name: album.name,
          artist: album.artists.map((a) => a.name).join(", "),
          album: null,
          imageUri: album.images[0]?.url,
          spotifyUri: album.uri,
          type: 'album',
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

  const renderSearchResults = () => {
    if (!spotifyConnected) {
      return (
        <View style={styles.spotifyConnectContainer}>
          <Text style={styles.spotifyConnectTitle}>Connect to Spotify</Text>
          <Text style={styles.spotifyConnectText}>
            You need to connect your Spotify account to search for songs and albums.
          </Text>
          <TouchableOpacity
            style={styles.connectButton}
            onPress={() => navigation.navigate("SpotifyAuth")}
          >
            <Text style={styles.connectButtonText}>Connect Spotify</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1DB954" />
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
              if (item.type === 'album') {
                navigation.navigate("AlbumScreen", {
                  id: item.id,
                  title: item.name,
                  artist: item.artist,
                  imageUri: item.imageUri,
                  spotifyUri: item.spotifyUri
                });
              } else {
                navigation.navigate("Info", {
                  id: item.id,
                  title: item.name,
                  artist: item.artist,
                  imageUri: item.imageUri,
                  type: item.type,
                  spotifyUri: item.spotifyUri
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
                <Ionicons name="musical-note" size={24} color="#666" />
              </View>
            )}
            <View style={styles.resultTextContainer}>
              <Text style={styles.songName}>{item.name}</Text>
              <Text style={styles.artist}>{item.artist}</Text>
              {item.album && <Text style={styles.albumName}>{item.album}</Text>}
              <Text style={styles.itemType}>
                {item.type === 'track' ? 'Song' : 'Album'}
              </Text>
            </View>
          </TouchableOpacity>
        )}
      />
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>New Review</Text>
      
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.input}
          placeholder="Search for songs or albums"
          placeholderTextColor="#aaa"
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />
        <TouchableOpacity 
          style={styles.searchButton}
          onPress={handleSearch}
        >
          <Ionicons name="search" size={24} color="white" />
        </TouchableOpacity>
      </View>
      
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[
            styles.filterButton,
            selectedFilters.songs && styles.filterButtonActive
          ]}
          onPress={() => {
            // Toggle songs filter
            const newSongsFilter = !selectedFilters.songs;
            
            // If turning on songs, turn off albums
            const newFilters = {
              songs: newSongsFilter,
              albums: newSongsFilter ? false : selectedFilters.albums
            };
            setSelectedFilters(newFilters);
            
            // Update displayed results immediately
            setTimeout(() => updateDisplayedResults(), 10);
          }}
        >
          <Text style={[
            styles.filterButtonText,
            selectedFilters.songs && styles.filterButtonTextActive
          ]}>
            Songs
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.filterButton,
            selectedFilters.albums && styles.filterButtonActive
          ]}
          onPress={() => {
            // Toggle albums filter
            const newAlbumsFilter = !selectedFilters.albums;
            
            // If turning on albums, turn off songs
            const newFilters = {
              songs: newAlbumsFilter ? false : selectedFilters.songs,
              albums: newAlbumsFilter
            };
            setSelectedFilters(newFilters);
            
            // Update displayed results immediately
            setTimeout(() => updateDisplayedResults(), 10);
          }}
        >
          <Text style={[
            styles.filterButtonText,
            selectedFilters.albums && styles.filterButtonTextActive
          ]}>
            Albums
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.resultsContainer}>
        {renderSearchResults()}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#121212",
    paddingTop: 50,
    paddingHorizontal: 20,
  },
  header: {
    fontSize: 28,
    fontWeight: "bold",
    color: "white",
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
    backgroundColor: "#1e1e1e",
    borderRadius: 10,
    padding: 15,
    color: "white",
    fontSize: 16,
    marginRight: 10,
  },
  searchButton: {
    backgroundColor: "#1DB954",
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
    backgroundColor: "#2A2A2A",
  },
  filterButtonActive: {
    backgroundColor: "#1DB954",
  },
  filterButtonText: {
    color: "#999",
    fontSize: 14,
  },
  filterButtonTextActive: {
    color: "#fff",
    fontWeight: "bold",
  },
  resultsContainer: {
    flex: 1,
  },
  resultCard: {
    flexDirection: "row",
    marginBottom: 15,
    alignItems: "center",
    backgroundColor: "#1e1e1e",
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
    backgroundColor: "#333",
    justifyContent: "center",
    alignItems: "center",
  },
  resultTextContainer: {
    flex: 1,
    marginLeft: 15,
  },
  songName: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  artist: {
    color: "#9ca3af",
    fontSize: 14,
    marginTop: 2,
  },
  albumName: {
    color: "#666",
    fontSize: 12,
    marginTop: 2,
  },
  itemType: {
    color: "#1DB954",
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
    color: "white",
    marginTop: 10,
  },
  noResultsContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  noResultsText: {
    color: "#9ca3af",
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
    color: "white",
    marginBottom: 10,
  },
  spotifyConnectText: {
    fontSize: 16,
    color: "#9ca3af",
    textAlign: "center",
    marginBottom: 30,
  },
  connectButton: {
    backgroundColor: "#1DB954",
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
  },
  connectButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
});
