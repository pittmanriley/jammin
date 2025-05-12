import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { auth, db } from "../firebaseConfig";
import { collection, query, where, getDocs } from "firebase/firestore";
import { getTrackDetails, getArtist } from "../services/spotifyService";
import { useRoute } from "@react-navigation/native";

export default function InfoScreen({ route, navigation }) {
  const { id, title, artist, imageUri, type, spotifyUri, albumId, albumTitle } = route.params;
  
  const [userReview, setUserReview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [genres, setGenres] = useState([]);
  
  useEffect(() => {
    fetchUserReview();
    fetchTrackDetails();
  }, []);
  
  const fetchTrackDetails = async () => {
    try {
      if (type === 'track') {
        const trackDetails = await getTrackDetails(id);
        
        // Get artist details to fetch genres
        if (trackDetails && trackDetails.artists && trackDetails.artists.length > 0) {
          const artistId = trackDetails.artists[0].id;
          const artistDetails = await getArtist(artistId);
          
          if (artistDetails && artistDetails.genres) {
            setGenres(artistDetails.genres);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching track details:', error);
    }
  };
  
  const fetchUserReview = async () => {
    try {
      setLoading(true);
      const user = auth.currentUser;
      if (!user) return;
      
      const reviewsRef = collection(db, 'reviews');
      const q = query(
        reviewsRef, 
        where('userId', '==', user.uid),
        where('itemId', '==', id),
        where('itemType', '==', type)
      );
      
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const reviewData = querySnapshot.docs[0].data();
        setUserReview(reviewData);
      }
    } catch (error) {
      console.error('Error fetching user review:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const renderStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;
    
    // Full stars
    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <Ionicons key={`full-${i}`} name="star" size={20} color="#FFD700" />
      );
    }
    
    // Half star
    if (hasHalfStar) {
      stars.push(
        <Ionicons key="half" name="star-half" size={20} color="#FFD700" />
      );
    }
    
    // Empty stars
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(
        <Ionicons key={`empty-${i}`} name="star-outline" size={20} color="#FFD700" />
      );
    }
    
    return stars;
  };

  const friendReviews = [
    { user: "cjindart", text: "Not really my speed!", rating: 3 },
    { user: "rpitt", text: "I loved it!", rating: 5.0 },
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Song Info</Text>
        <TouchableOpacity onPress={() => console.log("yes")}>
          <Ionicons name="add" size={28} color="white" />
        </TouchableOpacity>
      </View>

      {/* Scrollable content below */}
      <ScrollView style={styles.scrollContent}>
        {/* Song/Album Info */}
        <View style={styles.itemInfo}>
          <View style={styles.itemText}>
            <Text style={styles.itemTitle}>{title}</Text>
            <Text style={styles.artist}>{artist}</Text>
            {albumTitle && (
              <Text style={styles.albumTitle}>From: {albumTitle}</Text>
            )}
            
            {/* Display genres if available */}
            {genres.length > 0 && (
              <View style={styles.genresContainer}>
                {genres.slice(0, 3).map((genre, index) => (
                  <View key={index} style={styles.genreTag}>
                    <Text style={styles.genreText}>{genre}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
          <Image 
            source={imageUri ? { uri: imageUri } : require("../assets/babydoll.jpeg")} 
            style={styles.coverArt} 
          />
        </View>

        {/* User's Review (if exists) */}
        {loading ? (
          <ActivityIndicator size="small" color="#1DB954" style={styles.loader} />
        ) : userReview && (
          <View style={styles.userReviewContainer}>
            <Text style={styles.userReviewTitle}>My Review</Text>
            <View style={styles.userReviewContent}>
              <View style={styles.starsContainer}>
                {renderStars(userReview.rating)}
                <Text style={styles.ratingText}>{userReview.rating.toFixed(1)}</Text>
              </View>
              <Text style={styles.userReviewText}>{userReview.review}</Text>
              <Text style={styles.userReviewDate}>
                {new Date(userReview.createdAt.seconds * 1000).toLocaleDateString()}
              </Text>
            </View>
          </View>
        )}

        {/* Friend Reviews */}
        <Text style={styles.sectionTitle}>Friend Reviews:</Text>
        <View style={styles.divider} />
        {friendReviews.map((r, i) => (
          <View key={i} style={styles.reviewBlock}>
            <View style={styles.reviewRow}>
              <View>
                <Text style={styles.reviewUser}>{r.user}</Text>
                <Text style={styles.reviewText}>"{r.text}"</Text>
              </View>
              <Text style={styles.reviewRating}>{r.rating}/5</Text>
            </View>
            {i < friendReviews.length - 1 && <View style={styles.dashedLine} />}
          </View>
        ))}

        {/* Overall Rating */}
        <Text style={styles.sectionTitle}>Overall Rating:</Text>
        <View style={styles.overallRatingContainer}>
          <View style={styles.starsRow}>
            {Array(5)
              .fill(0)
              .map((_, i) => (
                <Ionicons
                  key={i}
                  name={i < 4 ? "star" : "star-outline"}
                  size={24}
                  color={i < 4 ? "#FFD700" : "#444"}
                  style={{marginRight: 5}}
                />
              ))}
          </View>
          <Text style={styles.overallText}>4.0 / 5.0</Text>
        </View>

        {/* Buttons */}
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.button}
            onPress={() => navigation.navigate("LeaveReview", { 
              song: {
                id: id,
                name: title,
                artist: artist,
                imageUri: imageUri,
                spotifyUri: spotifyUri,
                type: type
              }
            })}
          >
            <Ionicons name="create-outline" size={20} color="white" />
            <Text style={styles.buttonText}>{userReview ? 'Edit Review' : 'Leave Review'}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.button}>
            <Ionicons name="heart-outline" size={20} color="white" />
            <Text style={styles.buttonText}>Save</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.button}>
            <Ionicons name="share-social-outline" size={20} color="white" />
            <Text style={styles.buttonText}>Share</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 10,
    backgroundColor: "#121212",
  },
  headerTitle: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
  scrollContent: {
    flex: 1,
    padding: 20,
  },
  itemInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  itemText: {
    flex: 1,
    paddingRight: 15,
  },
  itemTitle: {
    color: "white",
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 5,
  },
  artist: {
    color: "#b3b3b3",
    fontSize: 16,
    marginBottom: 5,
  },
  albumTitle: {
    color: "#666",
    fontSize: 14,
    marginBottom: 8,
  },
  genresContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 5,
  },
  genreTag: {
    backgroundColor: "#333",
    borderRadius: 12,
    paddingVertical: 3,
    paddingHorizontal: 8,
    marginRight: 6,
    marginBottom: 6,
  },
  genreText: {
    color: "#1DB954",
    fontSize: 12,
    fontWeight: "bold",
  },
  coverArt: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  userReviewContainer: {
    marginBottom: 20,
    backgroundColor: "#1E1E1E",
    borderRadius: 8,
    overflow: "hidden",
  },
  userReviewTitle: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
    backgroundColor: "#333",
    padding: 10,
  },
  userReviewContent: {
    padding: 15,
  },
  starsContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  ratingText: {
    color: "#FFD700",
    marginLeft: 8,
    fontWeight: "bold",
  },
  userReviewText: {
    color: "#fff",
    fontSize: 14,
    lineHeight: 20,
  },
  userReviewDate: {
    color: "#666",
    fontSize: 12,
    marginTop: 10,
    textAlign: "right",
  },
  loader: {
    marginVertical: 20,
  },
  sectionTitle: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  divider: {
    height: 1,
    backgroundColor: "#333",
    marginBottom: 15,
  },
  overallRatingContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  starsRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  overallText: {
    color: "#FFD700",
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 10,
  },
  reviewBlock: {
    marginBottom: 15,
  },
  reviewRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  reviewUser: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
    marginBottom: 5,
  },
  reviewText: {
    color: "#b3b3b3",
    fontSize: 14,
    fontStyle: "italic",
    width: "80%",
  },
  reviewRating: {
    color: "#1DB954", // Spotify green
    fontWeight: "bold",
  },
  dashedLine: {
    height: 1,
    borderStyle: "dashed",
    borderWidth: 1,
    borderColor: "#333",
    marginVertical: 10,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 30,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#333",
  },
  button: {
    backgroundColor: "#1e1e1e",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 20,
    flex: 1,
    marginHorizontal: 5,
  },
  buttonText: {
    color: "white",
    marginLeft: 5,
    fontSize: 12,
  },
});
