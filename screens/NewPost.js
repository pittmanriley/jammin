import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Image,
  TouchableOpacity,
  StyleSheet,
} from "react-native";

const SONGS = [
  {
    name: "The Less I Know The Better",
    artist: "Tame Impala",
    image: require("../assets/the less I know the better.jpg"),
  },
  {
    name: "Babydoll",
    artist: "Dominic Fike",
    image: require("../assets/babydoll.jpeg"),
  },
  {
    name: "American Teen",
    artist: "Khalid",
    image: require("../assets/khalid.jpg"),
  },
];

export default function NewPost({ navigation }) {
  // Accept navigation prop
  const [query, setQuery] = useState("");
  const [matchedSong, setMatchedSong] = useState(null);

  const handleSearch = (text) => {
    setQuery(text);

    const match = SONGS.find((song) =>
      song.name.toLowerCase().includes(text.toLowerCase())
    );
    setMatchedSong(match || null);
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

      {matchedSong && (
        <TouchableOpacity
          style={styles.resultCard}
          onPress={() =>
            navigation.navigate("LeaveReview", { song: matchedSong })
          }
        >
          <Image source={matchedSong.image} style={styles.resultImage} />
          <View style={{ marginLeft: 15 }}>
            <Text style={styles.songName}>{matchedSong.name}</Text>
            <Text style={styles.artist}>{matchedSong.artist}</Text>
          </View>
        </TouchableOpacity>
      )}
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
  resultCard: {
    flexDirection: "row",
    marginTop: 30,
    alignItems: "center",
    backgroundColor: "#1e1e1e",
    borderRadius: 10,
    padding: 10,
  },
  resultImage: {
    width: 60,
    height: 60,
    borderRadius: 5,
  },
  songName: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
  artist: {
    color: "#9ca3af",
    fontSize: 14,
    marginTop: 4,
  },
});
