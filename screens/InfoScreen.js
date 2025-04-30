import React from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useRoute } from "@react-navigation/native";

export default function InfoScreen() {
  const route = useRoute();
  const { title, artist, image } = route.params;
  const navigation = useNavigation();

  const reviews = [
    { user: "cjindart", text: "Not really my speed!", rating: 3 },
    { user: "rpitt", text: "I loved it!", rating: 5.0 },
  ];

  return (
    <View style={styles.container}>
      {/* Header stays fixed */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerText}>Song Info</Text>
        <TouchableOpacity onPress={() => console.log("yes")}>
          <Ionicons name="add" size={28} color="white" />
        </TouchableOpacity>
      </View>

      {/* Scrollable content below */}
      <ScrollView style={styles.scrollContent}>
        {/* Album Info */}
        <View style={styles.albumInfo}>
          <View style={styles.albumText}>
            <Text style={styles.albumTitle}>{title}</Text>
            <Text style={styles.artist}>Artist: {artist}</Text>
          </View>
          <Image source={image} style={styles.coverArt} />
        </View>

        {/* Friend Reviews */}
        <Text style={styles.sectionTitle}>Friend Reviews:</Text>
        <View style={styles.divider} />
        {reviews.map((r, i) => (
          <View key={i} style={styles.reviewBlock}>
            <View style={styles.reviewRow}>
              <View>
                <Text style={styles.reviewUser}>{r.user}</Text>
                <Text style={styles.reviewText}>"{r.text}"</Text>
              </View>
              <Text style={styles.reviewRating}>{r.rating}/5</Text>
            </View>
            {i < reviews.length - 1 && <View style={styles.dashedLine} />}
          </View>
        ))}

        {/* Overall Rating */}
        <Text style={styles.sectionTitle}>Overall Rating:</Text>
        <View style={styles.divider} />
        <View style={styles.stars}>
          {[1, 2, 3, 4, 5].map((i) => (
            <Ionicons
              key={i}
              name={i <= 4.5 ? "star" : "star-outline"}
              size={28}
              color="#FFD700"
            />
          ))}
        </View>
        <Text style={styles.overallText}>4 / 5 stars</Text>
      </ScrollView>
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  scrollContent: {
    flex: 1,
  },
  headerText: {
    color: "white",
    fontSize: 22,
    fontWeight: "bold",
    marginTop: 10,
  },
  albumInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
    marginBottom: 30,
  },
  albumText: {
    flex: 1,
    justifyContent: "center",
  },
  albumTitle: {
    fontSize: 18,
    color: "white",
    fontWeight: "bold",
    marginBottom: 5,
  },
  artist: {
    color: "#ccc",
    fontSize: 16,
  },
  coverArt: {
    width: 130,
    height: 130,
    borderRadius: 10,
    marginLeft: 10,
  },
  sectionTitle: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 8,
  },
  divider: {
    height: 1,
    backgroundColor: "#444",
    marginBottom: 15,
  },
  reviewBlock: {
    marginBottom: 20,
  },
  reviewUser: {
    color: "#ccc",
    fontWeight: "bold",
    marginBottom: 2,
  },
  reviewText: {
    color: "white",
    fontSize: 16,
  },
  reviewRating: {
    color: "white",
    fontSize: 16,
    marginTop: 4,
  },
  dashedLine: {
    borderBottomWidth: 1,
    borderBottomColor: "#888",
    borderStyle: "dashed",
    marginTop: 10,
  },
  stars: {
    flexDirection: "row",
    marginVertical: 10,
  },
  overallText: {
    color: "white",
    fontSize: 16,
    marginBottom: 40,
  },
  reviewRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
});
