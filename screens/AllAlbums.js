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
import { colors } from "../theme/colors";

const windowWidth = Dimensions.get("window").width;
const numColumns = 2;
const imageSize = (windowWidth - 48) / numColumns;

export default function AllAlbums({ route, navigation }) {
  const { albums } = route.params;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>All Albums</Text>
        <View style={{ width: 24 }} />
      </View>

      <FlatList
        data={albums}
        numColumns={numColumns}
        keyExtractor={(item, index) => `${item.id || index}`}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.albumItem}
            onPress={() => {
              navigation.navigate("AlbumScreen", {
                id: item.id,
                title: item.title,
                artist: item.artist,
                imageUri: item.imageUri || (item.image && { uri: item.image }),
                spotifyUri: item.spotifyUri,
              });
            }}
          >
            <Image
              source={item.imageUri ? { uri: item.imageUri } : item.image}
              style={styles.albumImage}
            />
            <Text style={styles.albumTitle} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={styles.albumArtist} numberOfLines={1}>
              {item.artist}
            </Text>
          </TouchableOpacity>
        )}
      />
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
  albumItem: {
    width: imageSize,
    marginBottom: 20,
    marginHorizontal: 8,
  },
  albumImage: {
    width: imageSize,
    height: imageSize,
    borderRadius: 8,
    marginBottom: 8,
  },
  albumTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: colors.text.primary,
    marginBottom: 4,
  },
  albumArtist: {
    fontSize: 12,
    color: colors.text.secondary,
  },
});
