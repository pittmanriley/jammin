import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  Dimensions,
  Alert,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { theme } from "../../theme/theme";
import { auth, db } from "../../firebaseConfig";
import { doc, updateDoc, getDoc } from "firebase/firestore";

const windowWidth = Dimensions.get("window").width;

export default function AllSavedItems({ route, navigation }) {
  const { items } = route.params;
  const [savedItems, setSavedItems] = useState(items);

  const handleRemoveItem = async (itemToRemove) => {
    try {
      const user = auth.currentUser;
      if (!user) {
        Alert.alert("Error", "You need to be logged in to remove items");
        return;
      }

      const userRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userRef);

      if (userDoc.exists()) {
        const userData = userDoc.data();
        if (userData.savedItems && Array.isArray(userData.savedItems)) {
          // Remove the item from the array
          const updatedSavedItems = userData.savedItems.filter(
            (item) => item.id !== itemToRemove.id
          );

          // Update Firestore
          await updateDoc(userRef, {
            savedItems: updatedSavedItems,
          });

          // Update local state
          setSavedItems(updatedSavedItems);
        }
      }
    } catch (error) {
      console.error("Error removing item:", error);
      Alert.alert("Error", "Failed to remove item. Please try again.");
    }
  };

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
      <TouchableOpacity
        style={styles.itemActions}
        onPress={() => handleRemoveItem(item)}
      >
        <Ionicons name="heart" size={24} color={theme.button.primary} />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={theme.text.primary} />
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
          <Ionicons
            name="heart-outline"
            size={64}
            color={theme.text.secondary}
          />
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
  itemContainer: {
    flexDirection: "row",
    backgroundColor: theme.background.secondary,
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
    color: theme.text.primary,
    marginBottom: 4,
  },
  itemArtist: {
    fontSize: 14,
    color: theme.text.secondary,
    marginBottom: 6,
  },
  itemTypeContainer: {
    backgroundColor: theme.background.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  itemType: {
    color: theme.button.primary,
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
    color: theme.text.secondary,
    fontSize: 16,
    marginTop: 16,
    marginBottom: 24,
  },
  browseButton: {
    backgroundColor: theme.button.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
  },
  browseButtonText: {
    color: theme.text.primary,
    fontWeight: "bold",
    fontSize: 16,
  },
});
