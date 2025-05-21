import React from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { theme } from "../../theme/theme";

const windowWidth = Dimensions.get("window").width;

export default function TopArtists({ route, navigation }) {
  // Get the artists and timeRange from the route params
  const { artists, timeRange } = route.params;

  // Helper function to get time range title
  const getTimeRangeTitle = () => {
    switch(timeRange) {
      case "medium_term": return "6 Months";
      case "long_term": return "Last Wrapped";
      case "short_term": 
      default: return "1 Month";
    }
  };

  // Render each artist item
  const renderArtistItem = ({ item, index }) => (
    <View style={styles.artistItem}>
      <Text style={styles.artistRank}>{index + 1}</Text>
      {item.images?.[0]?.url ? (
        <Image source={{ uri: item.images[0].url }} style={styles.artistImage} />
      ) : (
        <View style={[styles.artistImage, styles.placeholderImage]} />
      )}
      <View style={styles.artistInfo}>
        <Text style={styles.artistName} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.genreName} numberOfLines={1}>
          {item.genres?.slice(0, 3).join(", ") || ""}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={28} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Your Top Artists</Text>
        <View style={{ width: 28 }} />
      </View>

      <View style={styles.timeRangeIndicator}>
        <Text style={styles.timeRangeText}>
          Based on your listening activity • {getTimeRangeTitle()}
        </Text>
      </View>

      <FlatList
        data={artists}
        renderItem={renderArtistItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#121212",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: "#121212",
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "white",
  },
  timeRangeIndicator: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  timeRangeText: {
    color: "#999",
    fontSize: 14,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  artistItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  artistRank: {
    width: 30,
    color: "#999",
    fontSize: 16,
    fontWeight: "500",
    textAlign: "center",
  },
  artistImage: {
    width: 50,
    height: 50,
    borderRadius: 25, // Make artist images circular
    marginRight: 12,
  },
  placeholderImage: {
    backgroundColor: "#333",
  },
  artistInfo: {
    flex: 1,
  },
  artistName: {
    color: "white",
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 4,
  },
  genreName: {
    color: "#999",
    fontSize: 14,
  },
});
