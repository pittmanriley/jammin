import React from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  StyleSheet,
  Dimensions,
  ScrollView,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";

const windowWidth = Dimensions.get("window").width;
const imageSize = 120; // Adjust as needed

// Dummy images
const dummyImages1 = Array.from({ length: 10 }, () =>
  require("../assets/the less I know the better.jpg")
);
const dummyImages2 = Array.from({ length: 10 }, () =>
  require("../assets/babydoll.jpeg")
);
const dummyImages3 = Array.from({ length: 10 }, () =>
  require("../assets/khalid.jpg")
);

export default function Feed() {
  const renderHorizontalList = (data, title) => (
    <FlatList
      data={data}
      horizontal
      keyExtractor={(_, index) => index.toString()}
      renderItem={({ item, index }) => (
        <View style={styles.imageWrapper}>
          <Image source={item} style={styles.image} />
          <Text style={styles.imageLabel} numberOfLines={1}>
            {title || "Untitled"}
          </Text>
        </View>
      )}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 16 }}
    />
  );

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.header}>Jammin'</Text>
        <Ionicons
          name="search"
          size={28}
          color="white"
          style={styles.searchIcon}
          onPress={() => console.log("Search pressed")}
        />
      </View>

      {/* Scrollable content */}
      <ScrollView style={styles.scrollContainer}>
        {/* Popular Albums Section */}
        <Text style={styles.sectionTitle}>Popular albums</Text>
        {renderHorizontalList(dummyImages1, "Currents")}

        {/* Popular Songs Section */}
        <Text style={styles.sectionTitle}>Popular songs</Text>
        {renderHorizontalList(dummyImages2, "Babydoll")}

        {/* Friends' Songs Section */}
        <Text style={styles.sectionTitle}>Friends' songs</Text>
        {renderHorizontalList(dummyImages3, "Young Dumb & Broke")}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#121212",
    paddingTop: 50,
  },
  headerContainer: {
    alignItems: "center", // center the Jammin' title
    justifyContent: "center",
    position: "relative",
    marginBottom: 20,
  },
  header: {
    fontSize: 28,
    marginTop: 10,
    fontWeight: "bold",
    color: "white",
    textAlign: "center",
  },
  searchIcon: {
    position: "absolute",
    right: 20,
    top: 10,
  },
  scrollContainer: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 22,
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
  imageLabel: {
    color: "#B0B0B0",
    fontSize: 14,
    textAlign: "center",
    marginTop: 5,
    width: imageSize,
  },
});
