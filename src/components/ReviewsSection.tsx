import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  Pressable,
  Image,
  Alert,
  Platform,
} from 'react-native';
import { Colors } from '@/constants/theme';
import {
  Star,
  ThumbsUp,
  CheckCircle,
  MessageSquare,
  Send,
  Sparkles,
  Edit3,
  Trash2,
  X,
  Check,
  UserPlus,
  UserCheck,
} from 'lucide-react-native';
import { useReviews, Review } from '@/hooks/useReviews';
import { useAuth } from '@/hooks/useAuth';
import { useSocial } from '@/hooks/useSocial';

interface ReviewsSectionProps {
  mediaId: string;
  mediaTitle?: string;
}

const RATING_LABELS: Record<number, string> = {
  1: 'Disappointing 😞',
  2: 'Fair 😐',
  3: 'Good 🙂',
  4: 'Great 😃',
  5: 'Masterpiece 🤩',
};

export function ReviewsSection({ mediaId, mediaTitle }: ReviewsSectionProps) {
  const themeColors = Colors.dark;
  const { user } = useAuth();
  const currentUserId = user?.id || 'guest-user';

  const {
    getReviewsForMedia,
    getStatsForMedia,
    getUserReview,
    addReview,
    editReview,
    deleteReview,
    toggleHelpful,
  } = useReviews();
  const { isFollowing, toggleFollow } = useSocial();

  const reviews = getReviewsForMedia(mediaId);
  const stats = getStatsForMedia(mediaId);
  const userReview = getUserReview(mediaId);

  // Main Composer State
  const [selectedRating, setSelectedRating] = useState<number>(userReview?.rating || 5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [comment, setComment] = useState(userReview?.comment || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [activeSort, setActiveSort] = useState<'top' | 'recent'>('top');

  // Inline Review Edit State
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [inlineEditRating, setInlineEditRating] = useState<number>(5);
  const [inlineEditComment, setInlineEditComment] = useState<string>('');

  // Keep composer in sync when userReview changes
  useEffect(() => {
    if (userReview) {
      setSelectedRating(userReview.rating);
      setComment(userReview.comment);
    }
  }, [userReview]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleStarPress = (rating: number) => {
    setSelectedRating(rating);
  };

  const handleSubmitReview = async () => {
    if (!comment.trim()) return;
    setIsSubmitting(true);
    try {
      await addReview(mediaId, selectedRating, comment.trim());
      showToast(userReview ? 'Review updated successfully!' : 'Review published!');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    const performDelete = async () => {
      await deleteReview(reviewId);
      if (editingReviewId === reviewId) {
        setEditingReviewId(null);
      }
      setComment('');
      setSelectedRating(5);
      showToast('Comment deleted');
    };

    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm('Are you sure you want to delete this comment?')) {
        await performDelete();
      }
    } else {
      Alert.alert(
        'Delete Comment',
        'Are you sure you want to delete your review?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: performDelete },
        ]
      );
    }
  };

  const startInlineEdit = (rev: Review) => {
    setEditingReviewId(rev.id);
    setInlineEditRating(rev.rating);
    setInlineEditComment(rev.comment);
  };

  const cancelInlineEdit = () => {
    setEditingReviewId(null);
    setInlineEditComment('');
  };

  const saveInlineEdit = async (reviewId: string) => {
    if (!inlineEditComment.trim()) return;
    await editReview(reviewId, inlineEditRating, inlineEditComment.trim());
    setEditingReviewId(null);
    showToast('Comment updated!');
  };

  const sortedReviews = [...reviews].sort((a, b) => {
    if (activeSort === 'top') {
      return b.helpfulCount - a.helpfulCount;
    }
    return b.id.localeCompare(a.id);
  });

  const displayRating = hoverRating !== null ? hoverRating : selectedRating;

  return (
    <View style={[styles.container, { backgroundColor: themeColors.backgroundCard }]}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.titleRow}>
          <MessageSquare size={20} color={themeColors.primary} />
          <Text style={styles.sectionTitle}>Ratings & Community Reviews</Text>
        </View>
        <View style={styles.countBadge}>
          <Text style={styles.countBadgeText}>{stats.count} reviews</Text>
        </View>
      </View>

      {/* 📊 Score & Breakdown Card */}
      <View style={styles.summaryCard}>
        <View style={styles.scoreCol}>
          <Text style={styles.bigScoreText}>{stats.average.toFixed(1)}</Text>
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                size={16}
                color="#FFB800"
                fill={star <= Math.round(stats.average) ? '#FFB800' : 'transparent'}
              />
            ))}
          </View>
          <Text style={styles.totalReviewsSubText}>out of 5 stars</Text>
        </View>

        {/* Breakdown Bars */}
        <View style={styles.breakdownCol}>
          {[5, 4, 3, 2, 1].map((stars) => {
            const count = stats.breakdown[stars] || 0;
            const percentage = stats.count > 0 ? (count / stats.count) * 100 : 0;
            return (
              <View key={stars} style={styles.breakdownRow}>
                <Text style={styles.starLabel}>{stars}★</Text>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { width: `${percentage}%` }]} />
                </View>
                <Text style={styles.barCount}>{count}</Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* ⭐ Interactive "Rate This Title" & Review Box */}
      <View style={styles.composerCard}>
        <View style={styles.composerHeader}>
          <Text style={styles.composerTitle}>
            {userReview ? '✏️ Your Review (Edit or Update)' : `How was ${mediaTitle || 'this title'}?`}
          </Text>
          {userReview && (
            <Pressable
              style={styles.deleteTopBtn}
              onPress={() => handleDeleteReview(userReview.id)}
            >
              <Trash2 size={13} color="#FF5252" />
              <Text style={styles.deleteTopBtnText}>Delete</Text>
            </Pressable>
          )}
        </View>

        {/* Star Rating Selector */}
        <View style={styles.starSelectorRow}>
          {[1, 2, 3, 4, 5].map((star) => (
            <Pressable
              key={star}
              onPress={() => handleStarPress(star)}
              onHoverIn={() => setHoverRating(star)}
              onHoverOut={() => setHoverRating(null)}
              style={({ pressed }) => [
                styles.starBtn,
                pressed && { transform: [{ scale: 1.2 }] },
              ]}
            >
              <Star
                size={28}
                color="#FFB800"
                fill={star <= displayRating ? '#FFB800' : 'transparent'}
              />
            </Pressable>
          ))}
          <Text style={styles.ratingDescriptor}>
            {RATING_LABELS[displayRating] || 'Select your rating'}
          </Text>
        </View>

        {/* Comment Input */}
        <TextInput
          style={styles.commentInput}
          placeholder="Write your review... What did you like about the story, animation, or characters?"
          placeholderTextColor="#68687C"
          multiline
          numberOfLines={3}
          value={comment}
          onChangeText={setComment}
        />

        {/* Action Button */}
        <View style={styles.composerActionRow}>
          {toastMessage && (
            <View style={styles.toastSuccess}>
              <Sparkles size={14} color="#00E676" />
              <Text style={styles.toastText}>{toastMessage}</Text>
            </View>
          )}

          <Pressable
            style={({ pressed }) => [
              styles.submitBtn,
              { backgroundColor: themeColors.primary },
              (!comment.trim() || isSubmitting) && styles.submitBtnDisabled,
              pressed && { opacity: 0.8 },
            ]}
            disabled={!comment.trim() || isSubmitting}
            onPress={handleSubmitReview}
          >
            <Send size={15} color="#FFF" style={{ marginRight: 6 }} />
            <Text style={styles.submitBtnText}>
              {isSubmitting ? 'Saving...' : userReview ? 'Save Changes' : 'Post Review'}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* 🏷️ Filter Tabs */}
      <View style={styles.sortRow}>
        <Text style={styles.communitySubheader}>COMMUNITY REVIEWS</Text>
        <View style={styles.tabPills}>
          <Pressable
            style={[styles.tabPill, activeSort === 'top' && styles.tabPillActive]}
            onPress={() => setActiveSort('top')}
          >
            <Text style={[styles.tabPillText, activeSort === 'top' && styles.tabPillTextActive]}>
              Top Helpful
            </Text>
          </Pressable>
          <Pressable
            style={[styles.tabPill, activeSort === 'recent' && styles.tabPillActive]}
            onPress={() => setActiveSort('recent')}
          >
            <Text
              style={[styles.tabPillText, activeSort === 'recent' && styles.tabPillTextActive]}
            >
              Latest
            </Text>
          </Pressable>
        </View>
      </View>

      {/* 💬 Reviews List */}
      <View style={styles.reviewsList}>
        {sortedReviews.length === 0 ? (
          <View style={styles.emptyReviews}>
            <Text style={styles.emptyReviewsText}>
              No reviews yet. Be the first to share your thoughts!
            </Text>
          </View>
        ) : (
          sortedReviews.map((rev) => {
            const isUserAuthor =
              rev.userId === currentUserId ||
              (rev.userId.startsWith('guest-') && userReview?.id === rev.id);
            const isEditing = editingReviewId === rev.id;
            const avatarInitial = rev.userName?.charAt(0)?.toUpperCase() || 'A';

            return (
              <View
                key={rev.id}
                style={[
                  styles.reviewCard,
                  isUserAuthor && styles.userReviewCard,
                ]}
              >
                {/* Author Header */}
                <View style={styles.reviewHeader}>
                  <View style={styles.authorRow}>
                    {rev.userAvatar ? (
                      <Image source={{ uri: rev.userAvatar }} style={styles.avatarImg} />
                    ) : (
                      <View
                        style={[
                          styles.avatarPlaceholder,
                          isUserAuthor && { backgroundColor: '#FFB800' },
                        ]}
                      >
                        <Text style={[styles.avatarText, isUserAuthor && { color: '#000' }]}>
                          {avatarInitial}
                        </Text>
                      </View>
                    )}
                    <View>
                      <View style={styles.nameRow}>
                        <Text style={styles.userNameText}>
                          {rev.userName} {isUserAuthor ? '(You)' : ''}
                        </Text>
                        {rev.isVerified && (
                          <View style={styles.verifiedBadge}>
                            <CheckCircle size={11} color="#00D2FF" />
                            <Text style={styles.verifiedText}>Verified</Text>
                          </View>
                        )}
                        {!isUserAuthor && rev.userId && !rev.userId.startsWith('guest-') && (
                          <Pressable
                            style={[
                              styles.followBtn,
                              isFollowing(rev.userId) && styles.followingBtn,
                            ]}
                            onPress={() => toggleFollow(rev.userId)}
                          >
                            {isFollowing(rev.userId) ? (
                              <UserCheck size={10} color="#00E676" />
                            ) : (
                              <UserPlus size={10} color="#00D2FF" />
                            )}
                            <Text
                              style={[
                                styles.followBtnText,
                                isFollowing(rev.userId) && styles.followingBtnText,
                              ]}
                            >
                              {isFollowing(rev.userId) ? 'Following' : 'Follow'}
                            </Text>
                          </Pressable>
                        )}
                      </View>
                      <Text style={styles.reviewDate}>{rev.createdAt}</Text>
                    </View>
                  </View>

                  {/* Stars Rating */}
                  {!isEditing && (
                    <View style={styles.cardStars}>
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          size={13}
                          color="#FFB800"
                          fill={s <= rev.rating ? '#FFB800' : 'transparent'}
                        />
                      ))}
                    </View>
                  )}
                </View>

                {/* 📝 Inline Edit Mode vs Normal View */}
                {isEditing ? (
                  <View style={styles.inlineEditBox}>
                    {/* Inline Star Picker */}
                    <View style={styles.inlineStarsRow}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Pressable
                          key={star}
                          onPress={() => setInlineEditRating(star)}
                          style={styles.starBtnSmall}
                        >
                          <Star
                            size={20}
                            color="#FFB800"
                            fill={star <= inlineEditRating ? '#FFB800' : 'transparent'}
                          />
                        </Pressable>
                      ))}
                      <Text style={styles.inlineRatingLabel}>
                        {RATING_LABELS[inlineEditRating]}
                      </Text>
                    </View>

                    {/* Inline Comment Input */}
                    <TextInput
                      style={styles.inlineTextInput}
                      multiline
                      numberOfLines={3}
                      value={inlineEditComment}
                      onChangeText={setInlineEditComment}
                    />

                    {/* Save / Cancel buttons */}
                    <View style={styles.inlineActionsRow}>
                      <Pressable style={styles.inlineCancelBtn} onPress={cancelInlineEdit}>
                        <X size={14} color="#A0A0B8" />
                        <Text style={styles.inlineCancelText}>Cancel</Text>
                      </Pressable>
                      <Pressable
                        style={[
                          styles.inlineSaveBtn,
                          !inlineEditComment.trim() && { opacity: 0.5 },
                        ]}
                        disabled={!inlineEditComment.trim()}
                        onPress={() => saveInlineEdit(rev.id)}
                      >
                        <Check size={14} color="#FFF" />
                        <Text style={styles.inlineSaveText}>Save</Text>
                      </Pressable>
                    </View>
                  </View>
                ) : (
                  <Text style={styles.reviewComment}>{rev.comment}</Text>
                )}

                {/* Footer with Helpful Button & Author Actions (Edit / Delete) */}
                <View style={styles.reviewFooter}>
                  {/* Author Edit & Delete buttons */}
                  {isUserAuthor && !isEditing ? (
                    <View style={styles.authorActionsRow}>
                      <Pressable
                        style={styles.authorActionBtn}
                        onPress={() => startInlineEdit(rev)}
                      >
                        <Edit3 size={13} color="#00D2FF" />
                        <Text style={[styles.authorActionText, { color: '#00D2FF' }]}>Edit</Text>
                      </Pressable>
                      <Pressable
                        style={styles.authorActionBtn}
                        onPress={() => handleDeleteReview(rev.id)}
                      >
                        <Trash2 size={13} color="#FF5252" />
                        <Text style={[styles.authorActionText, { color: '#FF5252' }]}>Delete</Text>
                      </Pressable>
                    </View>
                  ) : (
                    <View />
                  )}

                  {/* Helpful Button */}
                  <Pressable
                    style={({ pressed }) => [
                      styles.helpfulBtn,
                      pressed && { opacity: 0.7 },
                    ]}
                    onPress={() => toggleHelpful(rev.id)}
                  >
                    <ThumbsUp size={13} color="#9A9AA8" />
                    <Text style={styles.helpfulText}>
                      Helpful {rev.helpfulCount > 0 ? `(${rev.helpfulCount})` : ''}
                    </Text>
                  </Pressable>
                </View>
              </View>
            );
          })
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 14,
    padding: 20,
    marginTop: 24,
    borderWidth: 1,
    borderColor: '#242436',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  countBadge: {
    backgroundColor: '#1E1E2C',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2D2D42',
  },
  countBadgeText: {
    fontSize: 12,
    color: '#9A9AA8',
    fontWeight: '600',
  },
  summaryCard: {
    flexDirection: 'row',
    backgroundColor: '#111118',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1D1D2C',
  },
  scoreCol: {
    alignItems: 'center',
    paddingRight: 20,
    borderRightWidth: 1,
    borderRightColor: '#222234',
    minWidth: 95,
  },
  bigScoreText: {
    fontSize: 36,
    fontWeight: '900',
    color: '#FFFFFF',
    lineHeight: 40,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 3,
    marginVertical: 4,
  },
  totalReviewsSubText: {
    fontSize: 11,
    color: '#7B7B90',
  },
  breakdownCol: {
    flex: 1,
    paddingLeft: 18,
    gap: 5,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  starLabel: {
    fontSize: 11,
    color: '#8C8CA2',
    width: 22,
    fontWeight: '600',
  },
  barTrack: {
    flex: 1,
    height: 6,
    backgroundColor: '#202030',
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: '#FFB800',
    borderRadius: 3,
  },
  barCount: {
    fontSize: 11,
    color: '#65657A',
    width: 20,
    textAlign: 'right',
  },
  composerCard: {
    backgroundColor: '#12121B',
    borderRadius: 12,
    padding: 16,
    marginBottom: 22,
    borderWidth: 1,
    borderColor: '#262638',
  },
  composerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  composerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFF',
  },
  deleteTopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: 'rgba(255, 82, 82, 0.12)',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 82, 82, 0.3)',
  },
  deleteTopBtnText: {
    color: '#FF5252',
    fontSize: 11,
    fontWeight: '700',
  },
  starSelectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  starBtn: {
    padding: 4,
  },
  ratingDescriptor: {
    fontSize: 13,
    color: '#FFB800',
    fontWeight: '700',
    marginLeft: 8,
  },
  commentInput: {
    backgroundColor: '#0C0C12',
    borderRadius: 10,
    padding: 12,
    color: '#FFF',
    fontSize: 14,
    minHeight: 70,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#252538',
    marginBottom: 12,
  },
  composerActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 12,
  },
  toastSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  toastText: {
    fontSize: 12,
    color: '#00E676',
    fontWeight: '600',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 8,
  },
  submitBtnDisabled: {
    opacity: 0.4,
  },
  submitBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFF',
  },
  sortRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  communitySubheader: {
    fontSize: 11,
    fontWeight: '700',
    color: '#717188',
    letterSpacing: 1.2,
  },
  tabPills: {
    flexDirection: 'row',
    gap: 6,
  },
  tabPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    backgroundColor: '#151520',
  },
  tabPillActive: {
    backgroundColor: '#27273A',
  },
  tabPillText: {
    fontSize: 11,
    color: '#78788E',
    fontWeight: '600',
  },
  tabPillTextActive: {
    color: '#FFFFFF',
  },
  reviewsList: {
    gap: 12,
  },
  emptyReviews: {
    padding: 20,
    alignItems: 'center',
  },
  emptyReviewsText: {
    color: '#6F6F84',
    fontSize: 13,
  },
  reviewCard: {
    backgroundColor: '#101018',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1D1D2C',
  },
  userReviewCard: {
    borderColor: '#3D3D58',
    backgroundColor: '#141422',
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatarImg: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  avatarPlaceholder: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#E50914',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 14,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  userNameText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(0, 210, 255, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  verifiedText: {
    fontSize: 10,
    color: '#00D2FF',
    fontWeight: '600',
  },
  followBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(0, 210, 255, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(0, 210, 255, 0.3)',
    marginLeft: 4,
  },
  followingBtn: {
    backgroundColor: 'rgba(0, 230, 118, 0.1)',
    borderColor: 'rgba(0, 230, 118, 0.3)',
  },
  followBtnText: {
    fontSize: 10,
    color: '#00D2FF',
    fontWeight: '700',
  },
  followingBtnText: {
    color: '#00E676',
  },
  reviewDate: {
    fontSize: 11,
    color: '#65657A',
    marginTop: 2,
  },
  cardStars: {
    flexDirection: 'row',
    gap: 2,
  },
  reviewComment: {
    fontSize: 13,
    color: '#D4D4E2',
    lineHeight: 19,
    marginBottom: 10,
  },
  reviewFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  authorActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  authorActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#1E1E2C',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  authorActionText: {
    fontSize: 11,
    fontWeight: '700',
  },
  helpfulBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#161622',
  },
  helpfulText: {
    fontSize: 11,
    color: '#9A9AA8',
    fontWeight: '500',
  },
  inlineEditBox: {
    backgroundColor: '#0A0A10',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#262638',
    marginBottom: 10,
    gap: 8,
  },
  inlineStarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  starBtnSmall: {
    padding: 2,
  },
  inlineRatingLabel: {
    fontSize: 12,
    color: '#FFB800',
    fontWeight: '700',
    marginLeft: 6,
  },
  inlineTextInput: {
    backgroundColor: '#12121D',
    borderRadius: 6,
    padding: 10,
    color: '#FFF',
    fontSize: 13,
    minHeight: 50,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#1F1F30',
  },
  inlineActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  inlineCancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#1C1C28',
  },
  inlineCancelText: {
    fontSize: 12,
    color: '#A0A0B8',
    fontWeight: '600',
  },
  inlineSaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#00E676',
  },
  inlineSaveText: {
    fontSize: 12,
    color: '#000',
    fontWeight: '800',
  },
});
