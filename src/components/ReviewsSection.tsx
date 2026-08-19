import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  Pressable,
  Image,
  Animated,
} from 'react-native';
import { Colors } from '@/constants/theme';
import { Star, ThumbsUp, CheckCircle, MessageSquare, Send, Sparkles } from 'lucide-react-native';
import { useReviews } from '@/hooks/useReviews';

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
  const { getReviewsForMedia, getStatsForMedia, getUserReview, addReview, toggleHelpful } =
    useReviews();

  const reviews = getReviewsForMedia(mediaId);
  const stats = getStatsForMedia(mediaId);
  const userReview = getUserReview(mediaId);

  // Form State
  const [selectedRating, setSelectedRating] = useState<number>(userReview?.rating || 5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [comment, setComment] = useState(userReview?.comment || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [activeSort, setActiveSort] = useState<'top' | 'recent'>('top');

  const handleStarPress = (rating: number) => {
    setSelectedRating(rating);
  };

  const handleSubmitReview = async () => {
    if (!comment.trim()) return;
    setIsSubmitting(true);
    try {
      await addReview(mediaId, selectedRating, comment.trim());
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 3000);
    } finally {
      setIsSubmitting(false);
    }
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
        <Text style={styles.composerTitle}>
          {userReview ? 'Edit Your Review' : `How was ${mediaTitle || 'this title'}?`}
        </Text>

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
          {showSuccessToast && (
            <View style={styles.toastSuccess}>
              <Sparkles size={14} color="#00E676" />
              <Text style={styles.toastText}>Review published!</Text>
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
              {isSubmitting ? 'Posting...' : userReview ? 'Update Review' : 'Post Review'}
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
            const avatarInitial = rev.userName?.charAt(0)?.toUpperCase() || 'A';
            return (
              <View key={rev.id} style={styles.reviewCard}>
                {/* Author Info */}
                <View style={styles.reviewHeader}>
                  <View style={styles.authorRow}>
                    {rev.userAvatar ? (
                      <Image source={{ uri: rev.userAvatar }} style={styles.avatarImg} />
                    ) : (
                      <View style={styles.avatarPlaceholder}>
                        <Text style={styles.avatarText}>{avatarInitial}</Text>
                      </View>
                    )}
                    <View>
                      <View style={styles.nameRow}>
                        <Text style={styles.userNameText}>{rev.userName}</Text>
                        {rev.isVerified && (
                          <View style={styles.verifiedBadge}>
                            <CheckCircle size={11} color="#00D2FF" />
                            <Text style={styles.verifiedText}>Verified Viewer</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.reviewDate}>{rev.createdAt}</Text>
                    </View>
                  </View>

                  {/* Stars */}
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
                </View>

                {/* Comment Body */}
                <Text style={styles.reviewComment}>{rev.comment}</Text>

                {/* Helpful Button */}
                <View style={styles.reviewFooter}>
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
  composerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 10,
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
    justifyContent: 'flex-end',
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
});
