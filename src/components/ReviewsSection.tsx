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
import { useTheme } from '@/hooks/use-theme';
import {
  Star,
  ThumbsUp,
  CheckCircle,
  Sparkles,
  Edit3,
  Trash2,
  X,
  Check,
  UserPlus,
  UserCheck,
  Crown,
  MessageSquare,
  Send,
} from 'lucide-react-native';
import { useReviews, Review } from '@/hooks/useReviews';
import { useAuth } from '@/hooks/useAuth';
import { useSocial } from '@/hooks/useSocial';
import { useResponsive } from '@/hooks/useResponsive';
import { PrimaryGradient } from './PrimaryGradient';

interface ReviewsSectionProps {
  mediaId: string;
  mediaTitle?: string;
}

const RATING_LABELS: Record<number, string> = {
  1: 'Disappointing',
  2: 'Fair',
  3: 'Good',
  4: 'Great',
  5: 'Masterpiece',
};

export function ReviewsSection({ mediaId, mediaTitle }: ReviewsSectionProps) {
  const themeColors = useTheme();
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
  const { isXS } = useResponsive();

  const reviews = getReviewsForMedia(mediaId);
  const stats = getStatsForMedia(mediaId);
  const userReview = getUserReview(mediaId);

  // Composer State
  const [selectedRating, setSelectedRating] = useState<number>(userReview?.rating || 5);
  const [commentText, setCommentText] = useState<string>(userReview?.comment || '');
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [activeSort, setActiveSort] = useState<'top' | 'recent'>('top');

  // Inline Edit State
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [inlineEditRating, setInlineEditRating] = useState<number>(5);
  const [inlineEditComment, setInlineEditComment] = useState<string>('');

  useEffect(() => {
    if (userReview) {
      setSelectedRating(userReview.rating);
      setCommentText(userReview.comment || '');
    }
  }, [userReview]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleSubmitReview = async () => {
    setIsSubmitting(true);
    try {
      await addReview(mediaId, selectedRating, commentText);
      showToast(userReview ? 'Review updated!' : 'Review posted!');
      if (!userReview) {
        setCommentText('');
      }
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to save review.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    const performDelete = async () => {
      try {
        await deleteReview(reviewId);
        if (editingReviewId === reviewId) {
          setEditingReviewId(null);
        }
        setSelectedRating(5);
        setCommentText('');
        showToast('Review deleted');
      } catch (error) {
        showToast(error instanceof Error ? error.message : 'Unable to delete review.');
      }
    };

    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm('Delete your review?')) {
        await performDelete();
      }
    } else {
      Alert.alert('Delete Review', 'Are you sure you want to delete your review?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: performDelete },
      ]);
    }
  };

  const startInlineEdit = (rev: Review) => {
    setEditingReviewId(rev.id);
    setInlineEditRating(rev.rating);
    setInlineEditComment(rev.comment || '');
  };

  const saveInlineEdit = async (reviewId: string) => {
    await editReview(reviewId, inlineEditRating, inlineEditComment);
    setEditingReviewId(null);
    showToast('Review updated!');
  };

  const sortedReviews = [...reviews].sort((a, b) => {
    if (activeSort === 'top') {
      return b.helpfulCount - a.helpfulCount;
    }
    return b.id.localeCompare(a.id);
  });

  const displayRating = hoverRating !== null ? hoverRating : selectedRating;
  const totalCount = stats.count || 1;

  return (
    <View style={[styles.container, { backgroundColor: themeColors.backgroundCard, borderColor: themeColors.border }]}>
      
      {/* 🌟 Section Header */}
      <View style={styles.headerRow}>
        <View style={styles.titleRow}>
          <MessageSquare size={20} color={themeColors.primary} />
          <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Ratings & Reviews</Text>
        </View>
        <View style={[styles.countBadge, { backgroundColor: themeColors.backgroundElement, borderColor: themeColors.border }]}>
          <Text style={[styles.countBadgeText, { color: themeColors.textSecondary }]}>{stats.count} Ratings</Text>
        </View>
      </View>

      {/* 📊 Rating Breakdown Dashboard */}
      <View style={[styles.dashboardCard, { backgroundColor: themeColors.backgroundElement, borderColor: themeColors.border }]}>
        <View style={styles.scoreBox}>
          <Text style={[styles.scoreNumber, { color: themeColors.text }]}>{stats.average.toFixed(1)}</Text>
          <View style={styles.scoreStarsRow}>
            {[1, 2, 3, 4, 5].map((s) => (
              <Star
                key={s}
                size={14}
                color="#FFB800"
                fill={s <= Math.round(stats.average) ? '#FFB800' : 'transparent'}
              />
            ))}
          </View>
          <Text style={[styles.scoreCountText, { color: themeColors.textSecondary }]}>
            {stats.count} total reviews
          </Text>
        </View>

        <View style={styles.barsContainer}>
          {[5, 4, 3, 2, 1].map((stars) => {
            const count = stats.breakdown[stars] || 0;
            const percent = Math.round((count / totalCount) * 100);
            return (
              <View key={stars} style={styles.barRow}>
                <Text style={[styles.barStarLabel, { color: themeColors.textSecondary }]}>{stars}★</Text>
                <View style={[styles.barTrack, { backgroundColor: themeColors.border }]}>
                  <View style={[styles.barFill, { width: `${percent}%`, backgroundColor: themeColors.primary }]} />
                </View>
                <Text style={[styles.barPercentText, { color: themeColors.textMuted }]}>{percent}%</Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* ✍️ Interactive Composer (Stars + Written Comment Text Input) */}
      <View style={[styles.composerCard, { backgroundColor: themeColors.backgroundElement, borderColor: themeColors.border }]}>
        <View style={styles.composerHeader}>
          <Text style={[styles.composerTitle, { color: themeColors.text }]}>
            {userReview ? 'Your Rating & Review' : `Rate & Comment on ${mediaTitle || 'this title'}`}
          </Text>
          {userReview && (
            <Pressable style={styles.deleteTopBtn} onPress={() => handleDeleteReview(userReview.id)}>
              <Trash2 size={13} color="#FF5252" />
              <Text style={styles.deleteTopBtnText}>Delete</Text>
            </Pressable>
          )}
        </View>

        {/* Star Rating Bar */}
        <View style={styles.starSelectorRow}>
          {[1, 2, 3, 4, 5].map((star) => (
            <Pressable
              key={star}
              onPress={() => setSelectedRating(star)}
              onHoverIn={() => setHoverRating(star)}
              onHoverOut={() => setHoverRating(null)}
              style={styles.starBtn}
            >
              <Star
                size={26}
                color="#FFB800"
                fill={star <= displayRating ? '#FFB800' : 'transparent'}
              />
            </Pressable>
          ))}
          <Text style={[styles.ratingDescriptor, { color: themeColors.accent || '#FFB800' }]}>
            {RATING_LABELS[displayRating] || 'Select rating'}
          </Text>
        </View>

        {/* Comment Text Input Box */}
        <View style={[styles.inputBoxContainer, { backgroundColor: themeColors.backgroundCard, borderColor: themeColors.border }]}>
          <TextInput
            style={[styles.commentInput, { color: themeColors.text }]}
            placeholder="Write your review or comment (optional)..."
            placeholderTextColor={themeColors.textMuted}
            value={commentText}
            onChangeText={setCommentText}
            multiline
            numberOfLines={3}
          />
        </View>

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
              isSubmitting && styles.submitBtnDisabled,
              pressed && { opacity: 0.8 },
            ]}
            disabled={isSubmitting}
            onPress={handleSubmitReview}
          >
            <Send size={15} color="#FFFFFF" />
            <Text style={styles.submitBtnText}>
              {isSubmitting ? 'Posting...' : userReview ? 'Update Review' : 'Post Review'}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* 🏷️ Filter Tabs */}
      <View style={styles.sortRow}>
        <Text style={[styles.communitySubheader, { color: themeColors.textSecondary }]}>COMMUNITY COMMENTS</Text>
        <View style={styles.tabPills}>
          <Pressable
            style={[
              styles.tabPill,
              { backgroundColor: themeColors.backgroundElement, borderColor: themeColors.border },
              activeSort === 'top' && { backgroundColor: themeColors.primary, borderColor: themeColors.primary }
            ]}
            onPress={() => setActiveSort('top')}
          >
            <Text style={[styles.tabPillText, { color: activeSort === 'top' ? '#FFF' : themeColors.textSecondary }]}>
              Top Helpful
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.tabPill,
              { backgroundColor: themeColors.backgroundElement, borderColor: themeColors.border },
              activeSort === 'recent' && { backgroundColor: themeColors.primary, borderColor: themeColors.primary }
            ]}
            onPress={() => setActiveSort('recent')}
          >
            <Text style={[styles.tabPillText, { color: activeSort === 'recent' ? '#FFF' : themeColors.textSecondary }]}>
              Latest
            </Text>
          </Pressable>
        </View>
      </View>

      {/* 💬 Reviews List */}
      <View style={styles.reviewsList}>
        {sortedReviews.length === 0 ? (
          <View style={[styles.emptyReviews, { backgroundColor: themeColors.backgroundElement }]}>
            <MessageSquare size={28} color={themeColors.textMuted} />
            <Text style={[styles.emptyReviewsText, { color: themeColors.textSecondary }]}>
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
                  { backgroundColor: themeColors.backgroundElement, borderColor: themeColors.border },
                  isUserAuthor && { borderColor: themeColors.primary, backgroundColor: themeColors.backgroundCard }
                ]}
              >
                {/* Author Header */}
                <View style={styles.reviewHeader}>
                  <View style={styles.authorRow}>
                    {rev.userAvatar ? (
                      <Image source={{ uri: rev.userAvatar }} style={styles.avatarImg} />
                    ) : (
                      <View style={[styles.avatarPlaceholder, { backgroundColor: themeColors.primary }]}>
                        <Text style={styles.avatarText}>{avatarInitial}</Text>
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <View style={styles.nameRow}>
                        <Text style={[styles.userNameText, { color: themeColors.text }]} numberOfLines={1}>
                          {rev.userName} {isUserAuthor ? '(You)' : ''}
                        </Text>
                        {rev.isVip && (
                          <View style={styles.vipBadge}>
                            <Crown size={11} color="#FFB800" />
                            <Text style={styles.vipText}>VIP</Text>
                          </View>
                        )}
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
                              { backgroundColor: themeColors.backgroundCard, borderColor: themeColors.border },
                              isFollowing(rev.userId) && { borderColor: '#00E676' },
                            ]}
                            onPress={() => toggleFollow(rev.userId)}
                          >
                            {isFollowing(rev.userId) ? (
                              <UserCheck size={10} color="#00E676" />
                            ) : (
                              <UserPlus size={10} color={themeColors.primary} />
                            )}
                            <Text style={[styles.followBtnText, { color: isFollowing(rev.userId) ? '#00E676' : themeColors.primary }]}>
                              {isFollowing(rev.userId) ? 'Following' : 'Follow'}
                            </Text>
                          </Pressable>
                        )}
                      </View>
                      <Text style={[styles.reviewDate, { color: themeColors.textMuted }]}>{rev.createdAt}</Text>
                    </View>
                  </View>

                  {/* Rating Stars */}
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

                {/* Written Comment Text */}
                {!isEditing && rev.comment ? (
                  <Text style={[styles.commentBodyText, { color: themeColors.text }]}>
                    {rev.comment}
                  </Text>
                ) : null}

                {/* Inline Edit Mode */}
                {isEditing && (
                  <View style={styles.inlineEditBox}>
                    <View style={styles.inlineStarsRow}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Pressable key={star} onPress={() => setInlineEditRating(star)}>
                          <Star
                            size={20}
                            color="#FFB800"
                            fill={star <= inlineEditRating ? '#FFB800' : 'transparent'}
                          />
                        </Pressable>
                      ))}
                      <Text style={styles.inlineRatingLabel}>{RATING_LABELS[inlineEditRating]}</Text>
                    </View>

                    <TextInput
                      style={[styles.inlineCommentInput, { color: themeColors.text, backgroundColor: themeColors.backgroundCard, borderColor: themeColors.border }]}
                      value={inlineEditComment}
                      onChangeText={setInlineEditComment}
                      multiline
                    />

                    <View style={styles.inlineActionsRow}>
                      <Pressable style={styles.inlineCancelBtn} onPress={() => setEditingReviewId(null)}>
                        <X size={14} color={themeColors.textMuted} />
                        <Text style={[styles.inlineCancelText, { color: themeColors.textMuted }]}>Cancel</Text>
                      </Pressable>
                      <Pressable style={[styles.inlineSaveBtn, { backgroundColor: themeColors.primary }]} onPress={() => saveInlineEdit(rev.id)}>
                        <Check size={14} color="#FFF" />
                        <Text style={styles.inlineSaveText}>Save</Text>
                      </Pressable>
                    </View>
                  </View>
                )}

                {/* Footer with Helpful & Actions */}
                <View style={styles.reviewFooter}>
                  {isUserAuthor && !isEditing ? (
                    <View style={styles.authorActionsRow}>
                      <Pressable style={styles.authorActionBtn} onPress={() => startInlineEdit(rev)}>
                        <Edit3 size={13} color={themeColors.primary} />
                        <Text style={[styles.authorActionText, { color: themeColors.primary }]}>Edit</Text>
                      </Pressable>
                      <Pressable style={styles.authorActionBtn} onPress={() => handleDeleteReview(rev.id)}>
                        <Trash2 size={13} color="#FF5252" />
                        <Text style={[styles.authorActionText, { color: '#FF5252' }]}>Delete</Text>
                      </Pressable>
                    </View>
                  ) : <View />}

                  <Pressable
                    style={[styles.helpfulBtn, { backgroundColor: themeColors.backgroundCard, borderColor: themeColors.border }]}
                    onPress={() => toggleHelpful(rev.id)}
                  >
                    <ThumbsUp size={12} color={themeColors.textSecondary} />
                    <Text style={[styles.helpfulText, { color: themeColors.textSecondary }]}>
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
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginHorizontal: 16,
    marginTop: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
  },
  countBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },

  /* DASHBOARD CARD */
  dashboardCard: {
    flexDirection: 'row',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  scoreBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingRight: 14,
    borderRightWidth: 1,
    borderRightColor: '#262C40',
  },
  scoreNumber: {
    fontSize: 32,
    fontWeight: '900',
  },
  scoreStarsRow: {
    flexDirection: 'row',
    gap: 2,
    marginVertical: 4,
  },
  scoreCountText: {
    fontSize: 10,
    fontWeight: '600',
  },
  barsContainer: {
    flex: 1,
    gap: 4,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  barStarLabel: {
    fontSize: 10,
    fontWeight: '700',
    width: 22,
  },
  barTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
  },
  barPercentText: {
    fontSize: 10,
    fontWeight: '600',
    width: 28,
    textAlign: 'right',
  },

  /* COMPOSER CARD */
  composerCard: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  composerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  composerTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  deleteTopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
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
    padding: 2,
  },
  ratingDescriptor: {
    fontSize: 12,
    fontWeight: '800',
    marginLeft: 8,
  },
  inputBoxContainer: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
    marginBottom: 12,
  },
  commentInput: {
    fontSize: 13,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  composerActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toastSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  toastText: {
    color: '#00E676',
    fontSize: 12,
    fontWeight: '700',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 8,
    marginLeft: 'auto',
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },

  /* COMMUNITY COMMENTS FILTER */
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  communitySubheader: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  tabPills: {
    flexDirection: 'row',
    gap: 6,
  },
  tabPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  tabPillText: {
    fontSize: 11,
    fontWeight: '700',
  },

  /* REVIEWS LIST */
  reviewsList: {
    gap: 10,
  },
  emptyReviews: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 12,
    gap: 8,
  },
  emptyReviewsText: {
    fontSize: 13,
    fontWeight: '600',
  },
  reviewCard: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  avatarImg: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  avatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  userNameText: {
    fontSize: 13,
    fontWeight: '800',
  },
  vipBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: 'rgba(255, 184, 0, 0.15)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  vipText: {
    color: '#FFB800',
    fontSize: 9,
    fontWeight: '900',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  verifiedText: {
    color: '#00D2FF',
    fontSize: 10,
    fontWeight: '700',
  },
  followBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  followBtnText: {
    fontSize: 9,
    fontWeight: '800',
  },
  reviewDate: {
    fontSize: 10,
    marginTop: 2,
  },
  cardStars: {
    flexDirection: 'row',
    gap: 2,
  },
  commentBodyText: {
    fontSize: 13,
    lineHeight: 19,
    marginVertical: 6,
  },
  inlineEditBox: {
    marginTop: 6,
    gap: 8,
  },
  inlineStarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  inlineRatingLabel: {
    color: '#FFB800',
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 6,
  },
  inlineCommentInput: {
    fontSize: 12,
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 50,
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
    paddingVertical: 4,
  },
  inlineCancelText: {
    fontSize: 12,
    fontWeight: '700',
  },
  inlineSaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 6,
  },
  inlineSaveText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  reviewFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  authorActionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  authorActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  authorActionText: {
    fontSize: 11,
    fontWeight: '700',
  },
  helpfulBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  helpfulText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
