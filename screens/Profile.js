import React from "react";
import {
  View,
  Text,
  Image,
  FlatList,
  StyleSheet,
  Dimensions,
  ScrollView,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";

const windowWidth = Dimensions.get("window").width;
const imageSize = 120; // Adjust size for albums/songs

// Dummy data
const favoriteAlbums = Array.from({ length: 10 }, () =>
  require("../assets/the less I know the better.jpg")
);
const favoriteSongs = Array.from({ length: 10 }, () =>
  require("../assets/babydoll.jpeg")
);

export default function Profile() {
  const renderHorizontalList = (data) => (
    <FlatList
      data={data}
      horizontal
      keyExtractor={(_, index) => index.toString()}
      renderItem={({ item }) => (
        <View style={styles.imageWrapper}>
          <Image source={item} style={styles.image} />
        </View>
      )}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 16 }}
    />
  );

  return (
    <View style={styles.container}>
      <View style={styles.iconRow}>
        {/* Stats Icon */}
        <Ionicons
          name="stats-chart-outline"
          size={28}
          color="white"
          // onPress={() => console.log("hi")}
        />

        {/* Settings Icon */}
        <Ionicons
          name="settings-outline"
          size={28}
          color="white"
          // onPress={() => console.log("yo")}
        />
      </View>
      {/* Header */}
      <Text style={styles.header}>Profile</Text>

      {/* Profile Picture */}
      <View style={styles.profilePicWrapper}>
        <Image
          source={require("../assets/riley.png")} // Your user's profile pic
          style={styles.profilePic}
        />
      </View>

      {/* User Name */}
      <Text style={styles.username}>Riley</Text>
      <Text style={styles.userBio}>I love all kinds of music!</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Favorite Albums</Text>
        {renderHorizontalList(favoriteAlbums)}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Favorite Songs</Text>
        {renderHorizontalList(favoriteSongs)}
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
  profilePicWrapper: {
    alignItems: "center",
    marginBottom: 10,
  },
  profilePic: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  username: {
    fontSize: 22,
    color: "white",
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 5,
  },
  sectionTitle: {
    fontSize: 20,
    color: "white",
    fontWeight: "bold",
    marginLeft: 16,
    marginTop: 20,
    marginBottom: 10,
  },
  imageWrapper: {
    width: imageSize,
    marginRight: 10,
    alignItems: "center",
  },
  image: {
    width: imageSize,
    height: imageSize,
    borderRadius: 10,
  },
  userBio: {
    fontSize: 14,
    color: "#9ca3af", // soft gray
    textAlign: "center",
    marginBottom: 20,
    paddingHorizontal: 30, // so the text doesn't hit the screen edges
  },
  section: {
    marginBottom: 30, // Control vertical spacing between sections
  },
  iconRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
  },
});
