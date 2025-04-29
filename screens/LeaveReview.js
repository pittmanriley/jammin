import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";

export default function LeaveReview({ route, navigation }) {
  const { song } = route.params;
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState("");

  const handleSave = () => {
    console.log("Saved review:", {
      song: song.name,
      artist: song.artist,
      rating,
      reviewText,
    });

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
  };

  return (
    <View style={styles.container}>
      {/* Cancel Button */}
      <TouchableOpacity onPress={() => navigation.goBack()}>
        <Text style={styles.cancelButton}>Cancel</Text>
      </TouchableOpacity>

      {/* Song Title and Artist */}
      <Text style={styles.songTitle}>{song.name}</Text>
      <Text style={styles.artist}>{song.artist}</Text>

      {/* Rate Subtitle */}
      <Text style={styles.subtitle}>Rate:</Text>
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((i) => (
          <TouchableOpacity key={i} onPress={() => setRating(i)}>
            <Text style={[styles.star, rating >= i && styles.filledStar]}>
              ★
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Add Review Subtitle */}
      <Text style={styles.subtitle}>Add Review:</Text>
      <TextInput
        style={styles.textArea}
        placeholder="Write your review..."
        placeholderTextColor="#aaa"
        multiline
        numberOfLines={6}
        value={reviewText}
        onChangeText={setReviewText}
      />

      {/* Save Button */}
      <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
        <Text style={styles.saveButtonText}>Save Review</Text>
      </TouchableOpacity>
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
  cancelButton: {
    color: "#9ca3af",
    fontSize: 16,
    marginBottom: 20,
    textDecorationLine: 'underline'
  },
  songTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "white",
    textAlign: "center",
  },
  artist: {
    fontSize: 16,
    color: "#9ca3af",
    textAlign: "center",
  },
  starsContainer: {
    flexDirection: "row",
    marginBottom: 20,
  },
  star: {
    fontSize: 32,
    color: "#444",
    marginHorizontal: 5,
  },
  filledStar: {
    color: "orange", // Gold stars
  },
  textArea: {
    backgroundColor: "#1e1e1e",
    borderRadius: 10,
    padding: 15,
    color: "white",
    fontSize: 16,
    height: 120,
    marginBottom: 20,
  },
  saveButton: {
    backgroundColor: "#9ca3af", // Spotify green
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
  },
  saveButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 18,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "white",
    marginBottom: 10,
    marginTop: 30,
    textAlign: "left",
  },
});
