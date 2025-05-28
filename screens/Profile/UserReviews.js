import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useNavigation } from "@react-navigation/native";
import { theme } from "../../theme/theme";

export default function UserReviews({ route }) {
  const { userId, reviews } = route.params;
  const navigation = useNavigation();

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
        <Text style={styles.topBarTitle}>All Reviews</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView style={styles.reviewsList}>
        {reviews.map((review) => (
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
              {review.reviewText && review.reviewText.trim() !== '' && (
                <Text style={styles.reviewText} numberOfLines={2}>
                  {review.reviewText}
                </Text>
              )}
              <Text style={styles.reviewDate}>
                {review.createdAt?.toDate().toLocaleDateString()}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background.primary,
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
  topBarTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: theme.text.primary,
  },
  reviewsList: {
    flex: 1,
    paddingHorizontal: 16,
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
    marginBottom: 4,
  },
  reviewDate: {
    fontSize: 12,
    color: theme.text.secondary,
  },
});
