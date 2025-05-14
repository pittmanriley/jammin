import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { colors } from "../theme/colors";

export default function AllReviews({ route, navigation }) {
  const { reviews } = route.params;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>All My Reviews</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        {reviews.length > 0 ? (
          reviews.map((review) => (
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
                  <Text style={styles.reviewText}>
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
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: colors.background.secondary,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: colors.text.primary,
    textAlign: "center",
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  reviewItem: {
    flexDirection: "row",
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    position: "relative",
  },
  reviewImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 12,
  },
  reviewContent: {
    flex: 1,
    justifyContent: "center",
  },
  reviewTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: colors.text.primary,
    marginBottom: 4,
  },
  reviewArtist: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 6,
  },
  reviewRating: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  ratingText: {
    color: colors.text.secondary,
    fontSize: 14,
    marginLeft: 4,
  },
  reviewText: {
    fontSize: 14,
    color: colors.text.secondary,
    fontStyle: "italic",
  },
  reviewTypeContainer: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "rgba(29, 185, 84, 0.2)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  reviewType: {
    fontSize: 12,
    color: "#1DB954",
    fontWeight: "600",
  },
  emptyText: {
    textAlign: "center",
    color: colors.text.secondary,
    marginTop: 24,
    fontSize: 16,
  },
});
