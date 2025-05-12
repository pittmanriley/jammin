import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  FlatList,
  Alert,
  ActivityIndicator,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { auth, db } from '../firebaseConfig';
import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  orderBy,
  serverTimestamp,
  doc,
  updateDoc,
  arrayUnion,
  getDoc
} from 'firebase/firestore';
import { getTrackDetails, getAlbumDetails } from '../services/spotifyService';

const StarRating = ({ rating, setRating, editable = false }) => {
  const renderStars = () => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <TouchableOpacity
          key={i}
          onPress={() => editable && setRating(i)}
          disabled={!editable}
        >
          <Ionicons
            name={i <= rating ? 'star' : 'star-outline'}
            size={24}
            color="#FFD700"
            style={{ marginRight: 5 }}
          />
        </TouchableOpacity>
      );
    }
    return stars;
  };

  return <View style={{ flexDirection: 'row' }}>{renderStars()}</View>;
};

export default function Info() {
  const navigation = useNavigation();
  const route = useRoute();
  const { id, title, artist, image, imageUri, type, spotifyUri } = route.params;

  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState([]);
  const [reviewText, setReviewText] = useState('');
  const [rating, setRating] = useState(0);
  const [isSaved, setIsSaved] = useState(false);
  const [reviewsLoading, setReviewsLoading] = useState(true);

  useEffect(() => {
    loadDetails();
    loadReviews();
    checkIfSaved();
  }, [id, type]);

  const loadDetails = async () => {
    try {
      setLoading(true);
      let detailsData = null;

      if (type === 'track') {
        detailsData = await getTrackDetails(id);
      } else if (type === 'album') {
        detailsData = await getAlbumDetails(id);
      }

      setDetails(detailsData);
    } catch (error) {
      console.error(`Error loading ${type} details:`, error);
    } finally {
      setLoading(false);
    }
  };

  const loadReviews = async () => {
    try {
      setReviewsLoading(true);
      const reviewsRef = collection(db, 'reviews');
      const q = query(
        reviewsRef,
        where('itemId', '==', id),
        where('itemType', '==', type),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const reviewsList = [];
      
      querySnapshot.forEach((doc) => {
        reviewsList.push({
          id: doc.id,
          ...doc.data(),
        });
      });
      
      setReviews(reviewsList);
    } catch (error) {
      console.error('Error loading reviews:', error);
    } finally {
      setReviewsLoading(false);
    }
  };

  const checkIfSaved = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const userRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const savedItems = userData.savedItems || [];
        setIsSaved(savedItems.some(item => item.id === id));
      }
    } catch (error) {
      console.error('Error checking if item is saved:', error);
    }
  };

  const handleSaveItem = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        Alert.alert('Error', 'You must be logged in to save items');
        return;
      }

      const userRef = doc(db, 'users', user.uid);
      
      if (isSaved) {
        // Remove from saved items
        const userDoc = await getDoc(userRef);
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const savedItems = userData.savedItems || [];
          const updatedItems = savedItems.filter(item => item.id !== id);
          
          await updateDoc(userRef, {
            savedItems: updatedItems
          });
          
          setIsSaved(false);
          Alert.alert('Success', `${type.charAt(0).toUpperCase() + type.slice(1)} removed from your saved items`);
        }
      } else {
        // Add to saved items
        const itemToSave = {
          id,
          title,
          artist,
          imageUri: imageUri || (image && image.uri ? image.uri : null),
          type,
          spotifyUri,
          savedAt: new Date().toISOString()
        };
        
        await updateDoc(userRef, {
          savedItems: arrayUnion(itemToSave)
        });
        
        setIsSaved(true);
        Alert.alert('Success', `${type.charAt(0).toUpperCase() + type.slice(1)} saved to your profile`);
      }
    } catch (error) {
      console.error('Error saving item:', error);
      Alert.alert('Error', 'Failed to save item. Please try again.');
    }
  };

  const submitReview = async () => {
    if (rating === 0) {
      Alert.alert('Error', 'Please select a rating');
      return;
    }

    try {
      const user = auth.currentUser;
      if (!user) {
        Alert.alert('Error', 'You must be logged in to leave a review');
        return;
      }

      const reviewData = {
        itemId: id,
        itemType: type,
        itemTitle: title,
        itemArtist: artist,
        itemImageUri: imageUri || (image && image.uri ? image.uri : null),
        userId: user.uid,
        userName: user.displayName || 'Anonymous',
        userPhotoURL: user.photoURL || null,
        rating,
        review: reviewText,
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, 'reviews'), reviewData);
      
      // Add the review to the local state with a temporary ID
      const newReview = {
        ...reviewData,
        id: `temp-${Date.now()}`,
        createdAt: new Date().toISOString()
      };
      
      setReviews([newReview, ...reviews]);
      setReviewText('');
      setRating(0);
      
      Alert.alert('Success', 'Your review has been submitted');
      
      // Reload reviews to get the server-generated ID
      loadReviews();
    } catch (error) {
      console.error('Error submitting review:', error);
      Alert.alert('Error', 'Failed to submit review. Please try again.');
    }
  };

  const renderReviewItem = ({ item }) => (
    <View style={styles.reviewItem}>
      <View style={styles.reviewHeader}>
        <Text style={styles.reviewerName}>{item.userName || 'Anonymous'}</Text>
        <StarRating rating={item.rating || 0} />
      </View>
      <Text style={styles.reviewDate}>
        {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'Unknown date'}
      </Text>
      <Text style={styles.reviewText}>{item.review || 'No review text'}</Text>
    </View>
  );
  
  // Helper function to get a default image if needed
  const getImageSource = () => {
    if (imageUri) {
      return { uri: imageUri };
    } else if (image && typeof image === 'object') {
      return image;
    } else {
      // Return a default image from assets
      return require('../assets/babydoll.jpeg');
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {type.charAt(0).toUpperCase() + type.slice(1)} Details
        </Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1DB954" />
        </View>
      ) : (
        <View style={styles.content}>
          <View style={styles.itemInfoContainer}>
            <Image
              source={getImageSource()}
              style={styles.coverImage}
            />
            <View style={styles.itemDetails}>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.artist}>{artist}</Text>
              
              {details && type === 'album' && (
                <Text style={styles.detailText}>
                  {details.total_tracks} tracks • {details.release_date?.split('-')[0]}
                </Text>
              )}
              
              {details && type === 'track' && (
                <Text style={styles.detailText}>
                  {details.album?.name} • {details.album?.release_date?.split('-')[0]}
                </Text>
              )}
              
              <View style={styles.actionsContainer}>
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={handleSaveItem}
                >
                  <Ionicons
                    name={isSaved ? "bookmark" : "bookmark-outline"}
                    size={24}
                    color="#1DB954"
                  />
                  <Text style={styles.actionText}>
                    {isSaved ? "Saved" : "Save"}
                  </Text>
                </TouchableOpacity>
                
                {spotifyUri && (
                  <TouchableOpacity 
                    style={styles.actionButton}
                    onPress={() => {
                      // Open in Spotify app if available
                      Alert.alert('Open in Spotify', 'This would open the Spotify app if available');
                    }}
                  >
                    <Ionicons name="musical-notes-outline" size={24} color="#1DB954" />
                    <Text style={styles.actionText}>Play</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>

          <View style={styles.reviewSection}>
            <Text style={styles.sectionTitle}>Leave a Review</Text>
            <View style={styles.ratingContainer}>
              <Text style={styles.ratingLabel}>Your Rating:</Text>
              <StarRating rating={rating} setRating={setRating} editable={true} />
            </View>
            
            <TextInput
              style={styles.reviewInput}
              placeholder="Write your review here..."
              placeholderTextColor="#999"
              multiline
              value={reviewText}
              onChangeText={setReviewText}
            />
            
            <TouchableOpacity 
              style={styles.submitButton}
              onPress={submitReview}
            >
              <Text style={styles.submitButtonText}>Submit Review</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.reviewsListSection}>
            <Text style={styles.sectionTitle}>Reviews</Text>
            
            {reviewsLoading ? (
              <ActivityIndicator size="small" color="#1DB954" />
            ) : reviews.length > 0 ? (
              <FlatList
                data={reviews}
                renderItem={renderReviewItem}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
              />
            ) : (
              <Text style={styles.noReviewsText}>No reviews yet. Be the first to review!</Text>
            )}
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: 50,
    backgroundColor: '#121212',
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    padding: 16,
  },
  itemInfoContainer: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  coverImage: {
    width: 120,
    height: 120,
    borderRadius: 8,
  },
  itemDetails: {
    flex: 1,
    marginLeft: 16,
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  artist: {
    fontSize: 16,
    color: '#b3b3b3',
    marginBottom: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#b3b3b3',
    marginBottom: 12,
  },
  actionsContainer: {
    flexDirection: 'row',
    marginTop: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
  },
  actionText: {
    color: '#1DB954',
    marginLeft: 4,
    fontSize: 14,
  },
  reviewSection: {
    marginBottom: 24,
    padding: 16,
    backgroundColor: '#1E1E1E',
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  ratingLabel: {
    fontSize: 16,
    color: '#fff',
    marginRight: 8,
  },
  reviewInput: {
    backgroundColor: '#2A2A2A',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    height: 100,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  submitButton: {
    backgroundColor: '#1DB954',
    borderRadius: 24,
    padding: 12,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  reviewsListSection: {
    marginBottom: 24,
  },
  reviewItem: {
    padding: 16,
    backgroundColor: '#1E1E1E',
    borderRadius: 8,
    marginBottom: 12,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  reviewerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  reviewDate: {
    fontSize: 12,
    color: '#b3b3b3',
    marginBottom: 8,
  },
  reviewText: {
    fontSize: 14,
    color: '#fff',
  },
  noReviewsText: {
    fontSize: 14,
    color: '#b3b3b3',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 16,
  },
});
