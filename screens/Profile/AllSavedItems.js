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
import { colors } from "../../theme/colors";

const windowWidth = Dimensions.get("window").width;

export default function AllSavedItems({ route, navigation }) {
  const { items } = route.params;
  const savedItems = items;

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.itemContainer}
      onPress={() => {
        if (item.type === "album") {
          navigation.navigate("AlbumScreen", {
            id: item.id,
            title: item.title,
            artist: item.artist,
            imageUri: item.imageUri,
            spotifyUri: item.spotifyUri,
          });
        } else {
          navigation.navigate("Info", {
            id: item.id,
            title: item.title,
            artist: item.artist,
            imageUri: item.imageUri,
            type: item.type,
            spotifyUri: item.spotifyUri,
          });
        }
      }}
    >
      <Image
        source={
          item.imageUri
            ? { uri: item.imageUri }
            : require("../../assets/babydoll.jpeg")
        }
        style={styles.itemImage}
      />
      <View style={styles.itemDetails}>
        <Text style={styles.itemTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.itemArtist} numberOfLines={1}>
          {item.artist}
        </Text>
        <View style={styles.itemTypeContainer}>
          <Text style={styles.itemType}>
            {item.type === "track" ? "Song" : "Album"}
          </Text>
        </View>
      </View>
      <View style={styles.itemActions}>
        <Ionicons name="heart" size={24} color="#1DB954" />
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My List</Text>
        <View style={{ width: 24 }} />
      </View>

      {savedItems && savedItems.length > 0 ? (
        <FlatList
          data={savedItems}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="heart-outline" size={64} color="#666" />
          <Text style={styles.emptyText}>No saved items yet</Text>
          <TouchableOpacity
            style={styles.browseButton}
            onPress={() => navigation.navigate("Feed")}
          >
            <Text style={styles.browseButtonText}>Browse Music</Text>
          </TouchableOpacity>
        </View>
      )}
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
  },
  listContent: {
    padding: 16,
  },
  itemContainer: {
    flexDirection: "row",
    backgroundColor: colors.background.tertiary,
    borderRadius: 8,
    marginBottom: 12,
    padding: 12,
    alignItems: "center",
  },
  itemImage: {
    width: 60,
    height: 60,
    borderRadius: 6,
  },
  itemDetails: {
    flex: 1,
    marginLeft: 12,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: colors.text.primary,
    marginBottom: 4,
  },
  itemArtist: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 6,
  },
  itemTypeContainer: {
    backgroundColor: "#333",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  itemType: {
    color: "#1DB954",
    fontSize: 12,
    fontWeight: "500",
  },
  itemActions: {
    marginLeft: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  emptyText: {
    color: colors.text.secondary,
    fontSize: 16,
    marginTop: 16,
    marginBottom: 24,
  },
  browseButton: {
    backgroundColor: "#1DB954",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
  },
  browseButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
});
