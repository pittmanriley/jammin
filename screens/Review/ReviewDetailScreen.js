import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "../../theme/theme";

export default function ReviewDetailScreen({ route, navigation }) {
  const { review } = route.params;

  const renderStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    // Full stars
    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <Ionicons key={`full-${i}`} name="star" size={24} color="#FFD700" />
      );
    }

    // Half star
    if (hasHalfStar) {
      stars.push(
        <Ionicons key="half" name="star-half" size={24} color="#FFD700" />
      );
    }

    // Empty stars
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(
        <Ionicons
          key={`empty-${i}`}
          name="star-outline"
          size={24}
          color="#FFD700"
        />
      );
    }

    return stars;
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={theme.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Review Details</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.reviewContainer}>
          <Text style={styles.username}>@{review.username || "User"}</Text>

          <View style={styles.ratingContainer}>
            <View style={styles.starsContainer}>
              {renderStars(review.rating)}
            </View>
            <Text style={styles.ratingText}>
              {review.rating.toFixed(1)}/5.0
            </Text>
          </View>

          <Text style={styles.reviewText}>"{review.review}"</Text>

          <Text style={styles.date}>
            {new Date(review.createdAt.seconds * 1000).toLocaleDateString()}
          </Text>

          <View style={styles.itemInfo}>
            <Text style={styles.itemTitle}>{review.itemTitle}</Text>
            <Text style={styles.itemArtist}>{review.itemArtist}</Text>
          </View>
        </View>
      </ScrollView>
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
    justifyContent: "space-between",
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 10,
    backgroundColor: theme.background.primary,
  },
  headerTitle: {
    color: theme.text.primary,
    fontSize: 18,
    fontWeight: "bold",
  },
  content: {
    flex: 1,
    padding: 20,
  },
  reviewContainer: {
    backgroundColor: theme.background.secondary,
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  username: {
    color: theme.text.primary,
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 16,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  starsContainer: {
    flexDirection: "row",
    marginRight: 12,
  },
  ratingText: {
    color: "#FFD700",
    fontSize: 18,
    fontWeight: "bold",
  },
  reviewText: {
    color: theme.text.primary,
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 20,
  },
  date: {
    color: theme.text.secondary,
    fontSize: 14,
    marginBottom: 20,
  },
  itemInfo: {
    borderTopWidth: 1,
    borderTopColor: theme.background.primary,
    paddingTop: 20,
  },
  itemTitle: {
    color: theme.text.primary,
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 4,
  },
  itemArtist: {
    color: theme.text.secondary,
    fontSize: 16,
  },
});
