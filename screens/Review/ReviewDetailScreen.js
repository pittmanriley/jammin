import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "../../theme/theme";
import { auth, db } from "../../firebaseConfig";
import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";
import { trackEvent } from "../../amplitude";

export default function ReviewDetailScreen({ route, navigation }) {
  const { review } = route.params;

  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState("");
  const [replyTo, setReplyTo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const getCurrentUser = async () => {
      const user = auth.currentUser;
      if (user) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          setCurrentUser({
            uid: user.uid,
            ...userDoc.data(),
          });
        }
      }
    };

    getCurrentUser();
    fetchComments();
  }, []);

  const fetchComments = async () => {
    try {
      setLoading(true);

      // Check if review has comments collection
      const commentsRef = collection(db, "reviews", review.id, "comments");
      const commentsQuery = query(commentsRef, orderBy("createdAt", "asc"));
      const commentsSnapshot = await getDocs(commentsQuery);

      if (commentsSnapshot.empty) {
        setComments([]);
        setLoading(false);
        return;
      }

      // Get all user IDs from comments to fetch usernames
      const userIds = new Set();
      commentsSnapshot.forEach((doc) => {
        const commentData = doc.data();
        userIds.add(commentData.userId);

        // Also add user IDs from replies
        if (commentData.replies && commentData.replies.length > 0) {
          commentData.replies.forEach((reply) => {
            userIds.add(reply.userId);
          });
        }
      });

      // Fetch all user documents at once
      const userDocs = await Promise.all(
        Array.from(userIds).map((uid) => getDoc(doc(db, "users", uid)))
      );

      // Create a map of user IDs to usernames
      const userMap = new Map();
      userDocs.forEach((userDoc) => {
        if (userDoc.exists()) {
          const userData = userDoc.data();
          userMap.set(
            userDoc.id,
            userData.username || userData.displayName || "User"
          );
        }
      });

      // Process comments with usernames
      const commentsData = [];
      commentsSnapshot.forEach((doc) => {
        const commentData = doc.data();
        const username = userMap.get(commentData.userId) || "User";

        // Process replies if they exist
        let replies = [];
        if (commentData.replies && commentData.replies.length > 0) {
          replies = commentData.replies.map((reply) => ({
            ...reply,
            username: userMap.get(reply.userId) || "User",
          }));
        }

        commentsData.push({
          id: doc.id,
          ...commentData,
          username,
          replies,
          upvotes: commentData.upvotes || [],
          downvotes: commentData.downvotes || [],
        });
      });

      setComments(commentsData);
    } catch (error) {
      console.error("Error fetching comments:", error);
      Alert.alert("Error", "Failed to load comments");
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (!commentText.trim()) return;
    if (!auth.currentUser) {
      Alert.alert("Error", "You need to be logged in to comment");
      return;
    }

    try {
      setSubmitting(true);

      if (replyTo) {
        // Add reply to existing comment
        const commentRef = doc(
          db,
          "reviews",
          review.id,
          "comments",
          replyTo.id
        );
        const replyData = {
          userId: auth.currentUser.uid,
          text: commentText,
          createdAt: serverTimestamp(),
          upvotes: [],
          downvotes: [],
        };

        await updateDoc(commentRef, {
          replies: arrayUnion(replyData),
        });

        trackEvent("add_comment_reply", {
          review_id: review.id,
          comment_id: replyTo.id,
        });
      } else {
        // Add new comment
        const commentData = {
          userId: auth.currentUser.uid,
          text: commentText,
          createdAt: serverTimestamp(),
          replies: [],
          upvotes: [],
          downvotes: [],
        };

        await addDoc(
          collection(db, "reviews", review.id, "comments"),
          commentData
        );

        trackEvent("add_comment", {
          review_id: review.id,
        });
      }

      // Clear input and refresh comments
      setCommentText("");
      setReplyTo(null);
      await fetchComments();
    } catch (error) {
      console.error("Error adding comment:", error);
      Alert.alert("Error", "Failed to add comment");
    } finally {
      setSubmitting(false);
    }
  };

  const handleVote = async (commentId, voteType) => {
    if (!auth.currentUser) {
      Alert.alert("Error", "You need to be logged in to vote");
      return;
    }

    try {
      const userId = auth.currentUser.uid;
      const commentRef = doc(db, "reviews", review.id, "comments", commentId);
      const commentDoc = await getDoc(commentRef);

      if (!commentDoc.exists()) {
        console.error("Comment not found");
        return;
      }

      const commentData = commentDoc.data();
      const upvotes = commentData.upvotes || [];
      const downvotes = commentData.downvotes || [];

      // Check if user already voted
      const hasUpvoted = upvotes.includes(userId);
      const hasDownvoted = downvotes.includes(userId);

      if (voteType === "upvote") {
        if (hasUpvoted) {
          // Remove upvote
          await updateDoc(commentRef, {
            upvotes: arrayRemove(userId),
          });
        } else {
          // Add upvote and remove downvote if exists
          await updateDoc(commentRef, {
            upvotes: arrayUnion(userId),
            ...(hasDownvoted && { downvotes: arrayRemove(userId) }),
          });
        }
      } else if (voteType === "downvote") {
        if (hasDownvoted) {
          // Remove downvote
          await updateDoc(commentRef, {
            downvotes: arrayRemove(userId),
          });
        } else {
          // Add downvote and remove upvote if exists
          await updateDoc(commentRef, {
            downvotes: arrayUnion(userId),
            ...(hasUpvoted && { upvotes: arrayRemove(userId) }),
          });
        }
      }

      // Refresh comments
      await fetchComments();
    } catch (error) {
      console.error("Error voting on comment:", error);
      Alert.alert("Error", "Failed to register vote");
    }
  };

  const renderStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    // Full stars
    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <Ionicons key={`full-${i}`} name="star" size={24} color="#FFD700" />
      );
    }

    // Half star
    if (hasHalfStar) {
      stars.push(
        <Ionicons key="half" name="star-half" size={24} color="#FFD700" />
      );
    }

    // Empty stars
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(
        <Ionicons
          key={`empty-${i}`}
          name="star-outline"
          size={24}
          color="#FFD700"
        />
      );
    }

    return stars;
  };

  // Helper function to render a comment
  const renderComment = (comment, isReply = false) => {
    const currentUserId = auth.currentUser?.uid;
    const hasUpvoted =
      currentUserId && comment.upvotes?.includes(currentUserId);
    const hasDownvoted =
      currentUserId && comment.downvotes?.includes(currentUserId);

    return (
      <View
        key={comment.id || comment.createdAt}
        style={[styles.commentContainer, isReply && styles.replyContainer]}
      >
        <View style={styles.commentHeader}>
          <Text style={styles.commentUsername}>@{comment.username}</Text>
          {comment.createdAt && (
            <Text style={styles.commentDate}>
              {comment.createdAt.seconds
                ? new Date(
                    comment.createdAt.seconds * 1000
                  ).toLocaleDateString()
                : "Just now"}
            </Text>
          )}
        </View>

        <Text style={styles.commentText}>{comment.text}</Text>

        <View style={styles.commentActions}>
          {/* Upvote button */}
          <TouchableOpacity
            style={styles.voteButton}
            onPress={() => !isReply && handleVote(comment.id, "upvote")}
            disabled={isReply}
          >
            <Ionicons
              name={hasUpvoted ? "thumbs-up" : "thumbs-up-outline"}
              size={18}
              color={hasUpvoted ? theme.button.primary : theme.text.secondary}
            />
            <Text style={[styles.voteCount, hasUpvoted && styles.activeVote]}>
              {comment.upvotes?.length || 0}
            </Text>
          </TouchableOpacity>

          {/* Downvote button */}
          <TouchableOpacity
            style={styles.voteButton}
            onPress={() => !isReply && handleVote(comment.id, "downvote")}
            disabled={isReply}
          >
            <Ionicons
              name={hasDownvoted ? "thumbs-down" : "thumbs-down-outline"}
              size={18}
              color={hasDownvoted ? theme.button.primary : theme.text.secondary}
            />
            <Text style={[styles.voteCount, hasDownvoted && styles.activeVote]}>
              {comment.downvotes?.length || 0}
            </Text>
          </TouchableOpacity>

          {/* Reply button (only for main comments) */}
          {!isReply && (
            <TouchableOpacity
              style={styles.replyButton}
              onPress={() => setReplyTo(comment)}
            >
              <Ionicons
                name="chatbubble-outline"
                size={18}
                color={theme.text.secondary}
              />
              <Text style={styles.replyButtonText}>Reply</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={theme.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Review Details</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.content}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* Review content - no grey box */}
        <Text style={styles.username}>@{review.username || "User"}</Text>

        <View style={styles.ratingContainer}>
          <View style={styles.starsContainer}>
            {renderStars(review.rating)}
          </View>
          <Text style={styles.ratingText}>{review.rating.toFixed(1)}/5.0</Text>
        </View>

        {review.review && review.review.trim() !== "" && (
          <Text style={styles.reviewText}>"{review.review}"</Text>
        )}

        <Text style={styles.date}>
          {new Date(review.createdAt.seconds * 1000).toLocaleDateString()}
        </Text>

        <View style={styles.itemInfo}>
          <Text style={styles.itemTitle}>{review.itemTitle}</Text>
          <Text style={styles.itemArtist}>{review.itemArtist}</Text>
        </View>

        <View style={styles.divider} />

        {/* Comments section */}
        <Text style={styles.sectionTitle}>Comments</Text>

        {loading ? (
          <ActivityIndicator
            size="small"
            color={theme.button.primary}
            style={styles.loader}
          />
        ) : (
          <View style={styles.commentsContainer}>
            {comments.length === 0 ? (
              <Text style={styles.emptyText}>
                No comments yet. Be the first to comment!
              </Text>
            ) : (
              comments.map((comment) => (
                <View key={comment.id}>
                  {renderComment(comment)}

                  {/* Render replies */}
                  {comment.replies && comment.replies.length > 0 && (
                    <View style={styles.repliesContainer}>
                      {comment.replies.map((reply) =>
                        renderComment(reply, true)
                      )}
                    </View>
                  )}
                </View>
              ))
            )}
          </View>
        )}

        {/* Reply to indicator */}
        {replyTo && (
          <View style={styles.replyingToContainer}>
            <Text style={styles.replyingToText}>
              Replying to{" "}
              <Text style={styles.replyingToUsername}>@{replyTo.username}</Text>
            </Text>
            <TouchableOpacity onPress={() => setReplyTo(null)}>
              <Ionicons
                name="close-circle"
                size={20}
                color={theme.text.secondary}
              />
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Comment input */}
      <View style={styles.commentInputContainer}>
        <TextInput
          style={styles.commentInput}
          placeholder={replyTo ? "Write a reply..." : "Write a comment..."}
          placeholderTextColor={theme.text.secondary}
          value={commentText}
          onChangeText={setCommentText}
          multiline
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            !commentText.trim() && styles.disabledButton,
          ]}
          onPress={handleAddComment}
          disabled={!commentText.trim() || submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color={theme.text.primary} />
          ) : (
            <Ionicons name="send" size={20} color={theme.text.primary} />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
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
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 10,
    backgroundColor: theme.background.primary,
    zIndex: 1,
  },
  headerTitle: {
    color: theme.text.primary,
    fontSize: 18,
    fontWeight: "bold",
  },
  content: {
    flex: 1,
    padding: 20,
  },
  username: {
    color: theme.text.primary,
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 16,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  starsContainer: {
    flexDirection: "row",
    marginRight: 12,
  },
  ratingText: {
    color: "#FFD700",
    fontSize: 18,
    fontWeight: "bold",
  },
  reviewText: {
    color: theme.text.primary,
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 20,
  },
  date: {
    color: theme.text.secondary,
    fontSize: 14,
    marginBottom: 20,
  },
  itemInfo: {
    borderTopWidth: 1,
    borderTopColor: theme.background.secondary,
    paddingTop: 20,
    marginBottom: 20,
  },
  itemTitle: {
    color: theme.text.primary,
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 4,
  },
  itemArtist: {
    color: theme.text.secondary,
    fontSize: 16,
  },
  divider: {
    height: 1,
    backgroundColor: theme.background.secondary,
    marginVertical: 20,
  },
  sectionTitle: {
    color: theme.text.primary,
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 16,
  },
  commentsContainer: {
    marginBottom: 20,
  },
  commentContainer: {
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.background.secondary,
  },
  replyContainer: {
    marginLeft: 20,
    paddingLeft: 10,
    borderLeftWidth: 2,
    borderLeftColor: theme.background.secondary,
    marginBottom: 10,
  },
  commentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  commentUsername: {
    color: theme.text.primary,
    fontWeight: "bold",
    fontSize: 14,
  },
  commentDate: {
    color: theme.text.secondary,
    fontSize: 12,
  },
  commentText: {
    color: theme.text.primary,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 10,
  },
  commentActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  voteButton: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 16,
  },
  voteCount: {
    color: theme.text.secondary,
    fontSize: 12,
    marginLeft: 4,
  },
  activeVote: {
    color: theme.button.primary,
    fontWeight: "bold",
  },
  replyButton: {
    flexDirection: "row",
    alignItems: "center",
  },
  replyButtonText: {
    color: theme.text.secondary,
    fontSize: 12,
    marginLeft: 4,
  },
  repliesContainer: {
    marginTop: 8,
    marginLeft: 16,
  },
  replyingToContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: theme.background.secondary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 10,
  },
  replyingToText: {
    color: theme.text.secondary,
    fontSize: 12,
  },
  replyingToUsername: {
    color: theme.text.primary,
    fontWeight: "bold",
  },
  commentInputContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.background.primary,
    borderTopWidth: 1,
    borderTopColor: theme.background.secondary,
    paddingHorizontal: 16,
    paddingVertical: 30,
    zIndex: 2,
  },
  commentInput: {
    flex: 1,
    backgroundColor: theme.background.secondary,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: theme.text.primary,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: theme.button.primary,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 10,
  },
  disabledButton: {
    opacity: 0.5,
  },
  loader: {
    marginVertical: 20,
  },
  emptyText: {
    color: theme.text.secondary,
    fontSize: 14,
    textAlign: "center",
    marginVertical: 20,
  },
});
