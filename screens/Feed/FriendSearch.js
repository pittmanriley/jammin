import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  Image,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { auth, db } from "../../firebaseConfig";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  getDoc,
} from "firebase/firestore";
import { theme } from "../../theme/theme";

export default function FriendSearch() {
  const navigation = useNavigation();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [friends, setFriends] = useState([]);

  useEffect(() => {
    loadFriends();
  }, []);

  const loadFriends = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const userRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userRef);

      if (userDoc.exists()) {
        const userData = userDoc.data();
        setFriends(userData.friends || []);
      }
    } catch (error) {
      console.error("Error loading friends:", error);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    try {
      setLoading(true);
      const usersRef = collection(db, "users");
      const querySnapshot = await getDocs(usersRef);

      // Filter results in memory for case-insensitive search
      const results = [];
      querySnapshot.forEach((doc) => {
        if (doc.id === auth.currentUser.uid) return; // Skip current user

        const data = doc.data();
        const displayName = (data.displayName || "").toLowerCase();
        const username = (data.username || "").toLowerCase();
        const searchTerm = searchQuery.toLowerCase();

        // Check if either displayName or username contains the search term
        if (displayName.includes(searchTerm) || username.includes(searchTerm)) {
          results.push({ id: doc.id, ...data });
        }
      });

      setSearchResults(results);
    } catch (error) {
      console.error("Error searching users:", error);
      Alert.alert("Error", "Failed to search users. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const isFriend = (userId) => {
    return friends.includes(userId);
  };

  const handleAddFriend = async (user) => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        Alert.alert("Error", "You must be logged in to add friends");
        return;
      }

      const userRef = doc(db, "users", currentUser.uid);
      const isCurrentlyFriend = isFriend(user.id);

      if (isCurrentlyFriend) {
        // Remove friend
        await updateDoc(userRef, {
          friends: arrayRemove(user.id),
        });
        setFriends(friends.filter((id) => id !== user.id));
        Alert.alert(
          "Success",
          `Removed ${user.displayName || user.username} from friends`
        );
      } else {
        // Add friend
        await updateDoc(userRef, {
          friends: arrayUnion(user.id),
        });
        setFriends([...friends, user.id]);
        Alert.alert(
          "Success",
          `Added ${user.displayName || user.username} as a friend`
        );
      }
    } catch (error) {
      console.error("Error updating friends:", error);
      Alert.alert("Error", "Failed to update friends. Please try again.");
    }
  };

  const renderItem = ({ item }) => {
    const isFriend = friends.includes(item.id);

    return (
      <View style={styles.resultItem}>
        <TouchableOpacity
          style={styles.resultContent}
          onPress={() => navigation.navigate("UserProfile", { userId: item.id })}
        >
          <Image
            source={
              item.profilePicUrl
                ? { uri: item.profilePicUrl }
                : require("../../assets/babydoll.jpeg")
            }
            defaultSource={require("../../assets/babydoll.jpeg")}
            style={styles.resultImage}
            onError={() => {}}
          />
          <View style={styles.resultTextContainer}>
            <Text style={styles.resultTitle} numberOfLines={1}>
              {item.displayName || item.username}
            </Text>
            <Text style={styles.resultUsername} numberOfLines={1}>
              @{item.username}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.addButton}
          onPress={() => handleAddFriend(item)}
        >
          <Ionicons
            name={isFriend ? "person-remove" : "person-add"}
            size={24}
            color={isFriend ? theme.button.primary : theme.text.primary}
          />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={theme.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Find Users</Text>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons
            name="search"
            size={20}
            color={theme.text.secondary}
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by username..."
            placeholderTextColor={theme.text.secondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
            spellCheck={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery("")}
              style={styles.clearButton}
            >
              <Ionicons
                name="close-circle"
                size={20}
                color={theme.text.secondary}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.button.primary} />
          <Text style={styles.loadingText}>Searching...</Text>
        </View>
      ) : (
        <FlatList
          data={searchResults}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.resultsList}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              {searchQuery.length > 0 ? (
                <Text style={styles.emptyText}>
                  No users found. Try a different search.
                </Text>
              ) : (
                <Text style={styles.emptyText}>
                  Search for users by their username {'\n'}to follow them.
                </Text>
              )}
            </View>
          }
        />
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
    padding: 16,
    paddingTop: 50,
    backgroundColor: theme.background.primary,
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: theme.text.primary,
  },
  searchContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.background.secondary,
  },
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.background.secondary,
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    color: theme.text.primary,
    fontSize: 16,
  },
  clearButton: {
    padding: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    color: theme.text.primary,
    fontSize: 16,
  },
  resultsList: {
    padding: 16,
  },
  resultItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.background.secondary,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  resultContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  resultImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  resultTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  resultTitle: {
    color: theme.text.primary,
    fontSize: 16,
    fontWeight: "bold",
  },
  resultUsername: {
    color: theme.text.secondary,
    fontSize: 14,
    marginTop: 2,
  },
  addButton: {
    padding: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 40,
  },
  emptyText: {
    color: theme.text.secondary,
    fontSize: 16,
    textAlign: "center",
    paddingHorizontal: 20,
  },
});
