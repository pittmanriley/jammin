import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Image,
  StyleSheet,
  Dimensions,
} from "react-native";

const windowWidth = Dimensions.get("window").width;
const numColumns = 3;
const gap = 10;
const sidePadding = 16;

const totalGapSpace = gap * (numColumns - 1);
const availableWidth = windowWidth - sidePadding * 2 - totalGapSpace;
const imageSize = availableWidth / numColumns;

// Dummy images
const musicImages = Array.from({ length: 30 }, () =>
  require("../assets/the less I know the better.jpg")
);

// Dummy reviews
const reviews = [
  {
    id: "1",
    song: "The Less I Know The Better",
    stars: "★★★★½",
    text: "Finally they made a perfect song about heartbreak.",
    user: "Whayden",
    userImage: require("../assets/dummy profile.jpg"), // Replace with your profile images
    songImage: require("../assets/the less I know the better.jpg"),
  },
  {
    id: "2",
    song: "Let It Happen",
    stars: "★★★★★",
    text: "The synth solo changed my life. A masterpiece.",
    user: "Joe A",
    userImage: require("../assets/dummy profile.jpg"),
    songImage: require("../assets/the less I know the better.jpg"),
  },
  {
    id: "3",
    song: "Feels Like We Only Go Backwards",
    stars: "★★★★",
    text: "Catchy, hypnotic, emotional. Tame Impala at their best.",
    user: "Jonathan Fujii",
    userImage: require("../assets/dummy profile.jpg"),
    songImage: require("../assets/the less I know the better.jpg"),
  },
  {
    id: "4",
    song: "Borderline",
    stars: "★★★★★",
    text: "Great song.",
    user: "CJ Indart",
    userImage: require("../assets/dummy profile.jpg"),
    songImage: require("../assets/the less I know the better.jpg"),
  },
];

export default function Feed() {
  const [activeTab, setActiveTab] = useState("Music");

  return (
    <View style={styles.container}>
      {/* Header */}
      <Text style={styles.header}>Jammin'</Text>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          onPress={() => setActiveTab("Music")}
          style={[styles.tabButton, activeTab === "Music" && styles.activeTab]}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "Music" && styles.activeTabText,
            ]}
          >
            Music
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setActiveTab("Reviews")}
          style={[
            styles.tabButton,
            activeTab === "Reviews" && styles.activeTab,
          ]}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "Reviews" && styles.activeTabText,
            ]}
          >
            Reviews
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={{ flex: 1 }}>
        {/* Music Grid */}
        <View
          style={[styles.tabContent, activeTab !== "Music" && styles.hidden]}
        >
          <FlatList
            data={musicImages}
            keyExtractor={(_, index) => index.toString()}
            numColumns={numColumns}
            renderItem={({ item }) => (
              <View style={styles.imageWrapper}>
                <Image source={item} style={styles.image} />
              </View>
            )}
            contentContainerStyle={styles.grid}
          />
        </View>

        {/* Reviews List */}
        <View
          style={[styles.tabContent, activeTab !== "Reviews" && styles.hidden]}
        >
          <FlatList
            data={reviews}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={styles.reviewCard}>
                {/* Top row: Song Name, Stars, User */}
                <View style={styles.reviewHeader}>
                  {/* Left: Song name and stars */}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.songTitle}>{item.song}</Text>
                    <Text style={styles.stars}>{item.stars}</Text>
                  </View>

                  {/* Right: Username and profile pic */}
                  <View style={styles.userInfo}>
                    <Image source={item.userImage} style={styles.userImage} />
                    <Text style={styles.username}>{item.user}</Text>
                  </View>
                </View>

                {/* Image + Description */}
                <View style={styles.reviewBody}>
                  <Image source={item.songImage} style={styles.songImage} />
                  <Text style={styles.reviewText}>{item.text}</Text>
                </View>
              </View>
            )}
            contentContainerStyle={{ paddingBottom: 100 }}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#121212",
    paddingTop: 50,
  },
  header: {
    fontSize: 28,
    fontWeight: "bold",
    color: "white",
    textAlign: "center",
    marginTop: 10,
    marginBottom: 20,
  },
  tabs: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 10,
  },
  tabButton: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    marginHorizontal: 5,
    borderRadius: 20,
  },
  activeTab: {
    backgroundColor: "#1DB954",
  },
  tabText: {
    color: "white",
    fontSize: 16,
  },
  activeTabText: {
    fontWeight: "bold",
  },
  tabContent: {
    flex: 1,
  },
  hidden: {
    display: "none",
  },
  grid: {
    paddingHorizontal: sidePadding,
    paddingTop: 10,
    paddingBottom: 100,
  },
  imageWrapper: {
    width: imageSize,
    height: imageSize,
    marginBottom: gap,
    marginRight: gap,
  },
  image: {
    width: "100%",
    height: "100%",
    borderRadius: 10,
  },
  reviewCard: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  reviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  songTitle: {
    fontSize: 18,
    color: "white",
    fontWeight: "bold",
  },
  stars: {
    fontSize: 16,
    color: "#1DB954",
  },
  userImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  reviewBody: {
    flexDirection: "row",
    alignItems: "center",
  },
  songImage: {
    width: 60,
    height: 90,
    borderRadius: 5,
    marginRight: 15,
  },
  reviewText: {
    flex: 1,
    color: "white",
    fontSize: 15,
  },
  userInfo: {
    alignItems: "center",
    marginRight: 10,
  },
  username: {
    color: "#9ca3af", // light gray color like Letterboxd
    fontSize: 14,
    marginBottom: 5,
  },
  userImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
});
