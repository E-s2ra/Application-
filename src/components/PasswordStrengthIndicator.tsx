import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { Check, Circle } from 'lucide-react-native';
import { useTheme } from '@/hooks/use-theme';
import { evaluatePasswordStrength, getPasswordRuleChecks } from '@/lib/password';

interface PasswordStrengthIndicatorProps {
  password: string;
}

export function PasswordStrengthIndicator({ password }: PasswordStrengthIndicatorProps) {
  const themeColors = useTheme();
  const strengthInfo = evaluatePasswordStrength(password);
  const ruleChecks = getPasswordRuleChecks(password);

  if (!password) {
    return (
      <View style={styles.container}>
        <View style={styles.rulesList}>
          {ruleChecks.map((rule) => (
            <View key={rule.id} style={styles.ruleRow}>
              <Circle size={13} color={themeColors.textMuted} />
              <Text style={[styles.ruleText, { color: themeColors.textSecondary }]}>
                {rule.label}
              </Text>
            </View>
          ))}
        </View>
      </View>
    );
  }

  const { score, label, emoji, color, badgeBg } = strengthInfo;

  return (
    <View style={styles.container}>
      {/* 🌸 Cute Strength Meter Bar & Pill */}
      <View style={styles.meterHeader}>
        <View style={styles.meterBars}>
          {[1, 2, 3].map((step) => {
            const isFilled = score >= step;
            return (
              <View
                key={step}
                style={[
                  styles.barSegment,
                  {
                    backgroundColor: isFilled ? color : 'rgba(255, 255, 255, 0.08)',
                  },
                ]}
              />
            );
          })}
        </View>

        <View style={[styles.badgePill, { backgroundColor: badgeBg, borderColor: color }]}>
          <Text style={[styles.badgeText, { color }]}>
            {label} {emoji}
          </Text>
        </View>
      </View>

      {/* 📋 Dynamic Condition Checklist */}
      <View style={styles.rulesList}>
        {ruleChecks.map((rule) => {
          const isPassed = rule.passed;
          return (
            <View key={rule.id} style={styles.ruleRow}>
              {isPassed ? (
                <View style={styles.checkCircle}>
                  <Check size={11} color="#10B981" strokeWidth={3} />
                </View>
              ) : (
                <Circle size={13} color={themeColors.textMuted} />
              )}
              <Text
                style={[
                  styles.ruleText,
                  {
                    color: isPassed ? '#10B981' : themeColors.textSecondary,
                    fontWeight: isPassed ? '600' : '400',
                  },
                ]}
              >
                {rule.label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginTop: 6,
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  meterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    gap: 12,
  },
  meterBars: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    height: 6,
  },
  barSegment: {
    flex: 1,
    height: 6,
    borderRadius: 3,
  },
  badgePill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  rulesList: {
    gap: 6,
  },
  ruleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkCircle: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ruleText: {
    fontSize: 12,
  },
});
