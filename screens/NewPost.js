import React, { useState } from "react";
import { View, Text, TextInput, StyleSheet } from "react-native";

export default function NewPost() {
  const [query, setQuery] = useState("");

  const handleSearch = (text) => {
    setQuery(text);

    if (text.includes("open.spotify.com/track/")) {
      console.log("Detected a Spotify track link!");
      // You can extract the track ID from the URL here
      const trackId = extractSpotifyTrackId(text);
      console.log("Spotify Track ID:", trackId);
      // Later you could fetch metadata for this song automatically
    } else {
      console.log("Searching for song:", text);
      // Here you'd perform a song search normally
    }
  };

  const extractSpotifyTrackId = (url) => {
    // Extract the track ID from a Spotify URL
    const parts = url.split("/track/");
    if (parts.length > 1) {
      const trackId = parts[1].split("?")[0];
      return trackId;
    }
    return null;
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>New Review</Text>
      <TextInput
        style={styles.input}
        placeholder="Search song or paste Spotify link"
        placeholderTextColor="#aaa"
        value={query}
        onChangeText={handleSearch}
      />
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
    marginBottom: 30,
    textAlign: "center",
  },
  input: {
    backgroundColor: "#1e1e1e",
    borderRadius: 10,
    padding: 15,
    color: "white",
    fontSize: 16,
  },
});
