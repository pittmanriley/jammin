import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from '../../firebaseConfig';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
} from 'firebase/firestore';
import { theme } from '../../theme/theme';
import { trackEvent } from '../../amplitude';

export default function AllActivityScreen({ route, navigation }) {
  const [loading, setLoading] = useState(true);
  const [friendReviews, setFriendReviews] = useState([]);

  useEffect(() => {
    // Track screen view
    trackEvent('view_all_follower_activity');
    
    // Check if we received activity data from the route params
    if (route.params?.activity) {
      setFriendReviews(route.params.activity);
      setLoading(false);
    } else {
      // If no data was passed, fetch it
      fetchFriendReviews();
    }
  }, []);

  const fetchFriendReviews = async () => {
    try {
      setLoading(true);
      const user = auth.currentUser;
      if (!user) {
        setLoading(false);
        return;
      }
      
      const userRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        setLoading(false);
        return;
      }
      
      const userData = userDoc.data();
      const friendIds = userData.friends || [];
      
      if (friendIds.length === 0) {
        setFriendReviews([]);
        setLoading(false);
        return;
      }

      // First, fetch all friend user data to get their usernames
      const friendData = {};
      for (const fid of friendIds) {
        const friendRef = doc(db, 'users', fid);
        const friendDoc = await getDoc(friendRef);
        if (friendDoc.exists()) {
          friendData[fid] = {
            username: friendDoc.data().username || '',
            displayName: friendDoc.data().displayName || '',
          };
        }
      }

      // Fetch reviews for all friends
      let allReviews = [];
      for (const fid of friendIds) {
        const reviewsRef = collection(db, 'reviews');
        const q = query(reviewsRef, where('userId', '==', fid));
        const querySnapshot = await getDocs(q);
        
        querySnapshot.forEach((doc) => {
          const reviewData = doc.data();
          allReviews.push({
            id: doc.id,
            ...reviewData,
            username: friendData[fid]?.username || friendData[fid]?.displayName || 'User',
          });
        });
      }

      // Sort by most recent first
      allReviews.sort((a, b) => {
        const dateA = a.createdAt?.seconds || 0;
        const dateB = b.createdAt?.seconds || 0;
        return dateB - dateA;
      });

      setFriendReviews(allReviews);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching friend reviews:', error);
      setLoading(false);
    }
  };

  const navigateToReviewDetail = (review) => {
    navigation.navigate('ReviewDetail', { review });
  };

  const navigateToItemInfo = (item) => {
    if (item.itemType === 'album') {
      navigation.navigate('AlbumScreen', {
        id: item.itemId,
        title: item.itemTitle,
        artist: item.itemArtist,
        imageUri: item.itemImageUri,
        spotifyUri: item.itemSpotifyUri,
      });
    } else {
      navigation.navigate('Info', {
        id: item.itemId,
        title: item.itemTitle,
        artist: item.itemArtist,
        imageUri: item.itemImageUri,
        type: item.itemType,
        spotifyUri: item.itemSpotifyUri,
      });
    }
  };

  const renderStars = (rating) => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => {
          const fullStar = star <= Math.floor(rating);
          const halfStar = 
            !fullStar && 
            star === Math.floor(rating) + 1 && 
            rating % 1 !== 0;
          
          return (
            <Ionicons
              key={star}
              name={fullStar ? 'star' : halfStar ? 'star-half' : 'star-outline'}
              size={16}
              color="#FFD700"
              style={{ marginRight: 2 }}
            />
          );
        })}
        <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
      </View>
    );
  };

  const renderReviewItem = ({ item }) => {
    const formattedDate = item.createdAt?.seconds 
      ? new Date(item.createdAt.seconds * 1000).toLocaleDateString()
      : 'Recent';
    
    return (
      <TouchableOpacity 
        style={styles.reviewCard}
        onPress={() => navigateToReviewDetail(item)}
      >
        <View style={styles.reviewHeader}>
          <Text style={styles.username}>@{item.username}</Text>
          <Text style={styles.date}>{formattedDate}</Text>
        </View>
        
        <TouchableOpacity 
          style={styles.itemContainer}
          onPress={() => navigateToItemInfo(item)}
        >
          <Image
            source={
              item.itemImageUri
                ? { uri: item.itemImageUri }
                : require('../../assets/babydoll.jpeg')
            }
            style={styles.itemImage}
          />
          
          <View style={styles.itemDetails}>
            <Text style={styles.itemTitle} numberOfLines={1}>
              {item.itemTitle}
            </Text>
            <Text style={styles.itemArtist} numberOfLines={1}>
              {item.itemArtist}
            </Text>
            <View style={styles.itemTypeContainer}>
              <Text style={styles.itemType}>
                {item.itemType === 'album' ? 'Album' : 'Song'}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
        
        <View style={styles.reviewContent}>
          {renderStars(item.rating)}
          {item.review && item.review.trim() !== '' && (
            <Text style={styles.reviewText} numberOfLines={3}>
              "{item.review}"
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={theme.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Followers' Activity</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.button.primary} />
          <Text style={styles.loadingText}>Loading activity...</Text>
        </View>
      ) : (
        <FlatList
          data={friendReviews}
          keyExtractor={(item) => item.id}
          renderItem={renderReviewItem}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons 
                name="people-outline" 
                size={64} 
                color={theme.text.secondary} 
              />
              <Text style={styles.emptyText}>
                No follower activity yet
              </Text>
              <Text style={styles.emptySubtext}>
                Follow more users to see their reviews here
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 10,
    backgroundColor: theme.background.primary,
  },
  headerTitle: {
    color: theme.text.primary,
    fontSize: 18,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: theme.text.primary,
    marginTop: 10,
    fontSize: 16,
  },
  listContainer: {
    padding: 16,
    paddingBottom: 30,
  },
  reviewCard: {
    backgroundColor: theme.background.secondary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  username: {
    color: theme.text.primary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  date: {
    color: theme.text.secondary,
    fontSize: 14,
  },
  itemContainer: {
    flexDirection: 'row',
    marginBottom: 12,
    padding: 8,
    backgroundColor: theme.background.primary,
    borderRadius: 8,
  },
  itemImage: {
    width: 60,
    height: 60,
    borderRadius: 6,
  },
  itemDetails: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  itemTitle: {
    color: theme.text.primary,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  itemArtist: {
    color: theme.text.secondary,
    fontSize: 14,
    marginBottom: 4,
  },
  itemTypeContainer: {
    backgroundColor: `${theme.button.primary}1A`,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  itemType: {
    color: theme.button.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  reviewContent: {
    marginTop: 8,
  },
  starsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  ratingText: {
    color: '#FFD700',
    marginLeft: 6,
    fontSize: 16,
    fontWeight: 'bold',
  },
  reviewText: {
    color: theme.text.primary,
    fontSize: 15,
    fontStyle: 'italic',
    lineHeight: 22,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  emptyText: {
    color: theme.text.primary,
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    color: theme.text.secondary,
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});
