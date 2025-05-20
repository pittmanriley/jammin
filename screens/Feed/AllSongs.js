import React from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { theme } from "../../theme/theme";

export default function AllSongs({ route, navigation }) {
  const { songs } = route.params;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={theme.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>All Songs</Text>
        <View style={{ width: 24 }} />
      </View>

      <FlatList
        data={songs}
        keyExtractor={(item, index) => `${item.id || index}`}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.songItem}
            onPress={() => {
              navigation.navigate("Info", {
                id: item.id,
                title: item.title,
                artist: item.artist,
                imageUri: item.imageUri || (item.image && { uri: item.image }),
                type: item.type,
                spotifyUri: item.spotifyUri,
              });
            }}
          >
            <Image
              source={item.imageUri ? { uri: item.imageUri } : item.image}
              style={styles.songImage}
            />
            <View style={styles.songDetails}>
              <Text style={styles.songTitle} numberOfLines={1}>
                {item.title}
              </Text>
              <Text style={styles.songArtist} numberOfLines={1}>
                {item.artist}
              </Text>
            </View>
            <Ionicons
              name="play-circle-outline"
              size={24}
              color={theme.button.primary}
            />
          </TouchableOpacity>
        )}
      />
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
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: theme.background.secondary,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: theme.text.primary,
  },
  listContent: {
    padding: 16,
  },
  songItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.background.secondary,
  },
  songImage: {
    width: 50,
    height: 50,
    borderRadius: 4,
    marginRight: 12,
  },
  songDetails: {
    flex: 1,
  },
  songTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: theme.text.primary,
    marginBottom: 4,
  },
  songArtist: {
    fontSize: 14,
    color: theme.text.secondary,
  },
});
