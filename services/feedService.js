import {
  getNewReleases,
  getFeaturedPlaylists,
  searchSpotify,
  isSpotifyConnected,
} from "./spotifyService";
import { auth, db } from "../firebaseConfig";
import { collection, query, getDocs, limit, orderBy } from "firebase/firestore";

/**
 * Get popular albums from Spotify
 * @param {number} limit - Number of albums to return
 * @returns {Promise<Array>} - Array of album objects
 */
export const getPopularAlbums = async (itemLimit = 10) => {
  try {
    const connected = await isSpotifyConnected();

    if (connected) {
      // Get new releases from Spotify
      const newReleases = await getNewReleases(itemLimit);
      return newReleases.albums.items.map((album) => ({
        id: album.id,
        title: album.name,
        artist: album.artists[0].name,
        imageUri: album.images[0].url,
        type: "album",
        spotifyUri: album.uri,
      }));
    } else {
      // Return dummy data if not connected to Spotify
      return getDummyAlbums();
    }
  } catch (error) {
    console.error("Error getting popular albums:", error);
    return getDummyAlbums();
  }
};

/**
 * Get popular tracks from Spotify
 * @param {number} limit - Number of tracks to return
 * @returns {Promise<Array>} - Array of track objects
 */
export const getPopularTracks = async (itemLimit = 10) => {
  try {
    const connected = await isSpotifyConnected();

    if (connected) {
      try {
        // Search for popular tracks
        const popularTracksSearch = await searchSpotify(
          "year:2023-2025", // More recent tracks are likely to be popular
          "track",
          itemLimit
        );
        
        // Check if the response has the expected structure
        if (popularTracksSearch && popularTracksSearch.tracks && popularTracksSearch.tracks.items) {
          return popularTracksSearch.tracks.items.map((track) => ({
            id: track.id,
            title: track.name,
            artist: track.artists[0].name,
            imageUri: track.album.images[0].url,
            type: "track",
            spotifyUri: track.uri,
          }));
        } else {
          console.log('Unexpected popular tracks response structure:', popularTracksSearch);
          return getDummyTracks();
        }
      } catch (spotifyError) {
        console.error('Spotify API error when getting popular tracks:', spotifyError);
        return getDummyTracks();
      }
    } else {
      // Return dummy data if not connected to Spotify
      return getDummyTracks();
    }
  } catch (error) {
    console.error("Error getting popular tracks:", error);
    return getDummyTracks();
  }
};

/**
 * Get featured playlists from Spotify
 * @param {number} limit - Number of playlists to return
 * @returns {Promise<Array>} - Array of playlist objects
 */
export const getFeaturedContent = async (itemLimit = 10) => {
  try {
    const connected = await isSpotifyConnected();

    if (connected) {
      try {
        // Get featured playlists from Spotify
        const featured = await getFeaturedPlaylists(itemLimit);
        
        // Check if the response has the expected structure
        if (featured && featured.playlists && featured.playlists.items) {
          return featured.playlists.items.map((playlist) => ({
            id: playlist.id,
            title: playlist.name,
            artist: playlist.owner.display_name,
            imageUri: playlist.images[0].url,
            type: "playlist",
            spotifyUri: playlist.uri,
          }));
        } else {
          console.log('Unexpected featured playlists response structure:', featured);
          return getDummyFeatured();
        }
      } catch (spotifyError) {
        console.error('Spotify API error when getting featured playlists:', spotifyError);
        return getDummyFeatured();
      }
    } else {
      // Return dummy data if not connected to Spotify
      return getDummyFeatured();
    }
  } catch (error) {
    console.error("Error getting featured content:", error);
    return getDummyFeatured();
  }
};

/**
 * Get friend activity from Firebase
 * @param {number} limit - Number of items to return
 * @returns {Promise<Array>} - Array of friend activity objects
 */
export const getFriendActivity = async (itemLimit = 10) => {
  try {
    // Check if user is authenticated
    const currentUser = auth.currentUser;
    if (!currentUser) {
      return getDummyFriendActivity();
    }

    // Get friend activity from Firebase
    const activityRef = collection(db, "posts");
    const q = query(
      activityRef,
      orderBy("createdAt", "desc"),
      limit(itemLimit)
    );
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return getDummyFriendActivity();
    }

    const activities = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      activities.push({
        id: doc.id,
        title: data.songName || "Unknown Song",
        artist: data.artistName || "Unknown Artist",
        imageUri: data.imageUrl || require("../assets/babydoll.jpeg"),
        type: "post",
        username: data.username || "Friend",
        content: data.content || "",
        createdAt: data.createdAt || new Date().toISOString(),
      });
    });

    return activities.length > 0 ? activities : getDummyFriendActivity();
  } catch (error) {
    console.error("Error getting friend activity:", error);
    return getDummyFriendActivity();
  }
};

// Dummy data functions
const getDummyAlbums = () => {
  return Array.from({ length: 10 }, () => ({
    id: Math.random().toString(),
    title: "Currents",
    artist: "Tame Impala",
    image: require("../assets/the less I know the better.jpg"),
    type: "album",
  }));
};

const getDummyTracks = () => {
  return Array.from({ length: 10 }, () => ({
    id: Math.random().toString(),
    title: "Babydoll",
    artist: "Dominic Fike",
    image: require("../assets/babydoll.jpeg"),
    type: "track",
  }));
};

const getDummyFeatured = () => {
  return Array.from({ length: 10 }, () => ({
    id: Math.random().toString(),
    title: "Chill Vibes",
    artist: "Spotify",
    image: require("../assets/babydoll.jpeg"),
    type: "playlist",
  }));
};

const getDummyFriendActivity = () => {
  return Array.from({ length: 10 }, () => ({
    id: Math.random().toString(),
    title: "Young Dumb & Broke",
    artist: "Khalid",
    image: require("../assets/khalid.jpg"),
    type: "post",
    username: "Friend",
    content: "Loving this song!",
    createdAt: new Date().toISOString(),
  }));
};
