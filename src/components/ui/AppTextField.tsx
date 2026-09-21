import React, { forwardRef, useState } from 'react';
import {
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { ControlHeight, Radius, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type AppTextFieldProps = TextInputProps & {
  label?: string;
  helperText?: string;
  error?: string | null;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onRightIconPress?: () => void;
  rightIconLabel?: string;
  containerStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
};

export const AppTextField = forwardRef<TextInput, AppTextFieldProps>(function AppTextField(
  {
    label,
    helperText,
    error,
    leftIcon,
    rightIcon,
    onRightIconPress,
    rightIconLabel = 'Input action',
    containerStyle,
    inputStyle,
    multiline,
    onFocus,
    onBlur,
    editable = true,
    ...inputProps
  },
  ref,
) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);
  const borderColor = error ? theme.error : focused ? theme.borderFocus : theme.inputBorder;

  return (
    <View style={[styles.group, containerStyle]}>
      {label ? <Text style={[styles.label, { color: theme.textSecondary }]}>{label}</Text> : null}
      <View
        style={[
          styles.field,
          multiline && styles.fieldMultiline,
          {
            backgroundColor: theme.inputBackground,
            borderColor,
            opacity: editable ? 1 : 0.64,
          },
        ]}
      >
        {leftIcon ? <View style={styles.iconSlot}>{leftIcon}</View> : null}
        <TextInput
          ref={ref}
          {...inputProps}
          editable={editable}
          multiline={multiline}
          placeholderTextColor={theme.textMuted}
          selectionColor={theme.primary}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          style={[
            styles.input,
            multiline && styles.inputMultiline,
            { color: theme.text },
            inputStyle,
          ]}
        />
        {rightIcon ? (
          onRightIconPress ? (
            <Pressable
              onPress={onRightIconPress}
              accessibilityRole="button"
              accessibilityLabel={rightIconLabel}
              hitSlop={8}
              style={({ pressed }) => [styles.iconButton, { opacity: pressed ? 0.65 : 1 }]}
            >
              {rightIcon}
            </Pressable>
          ) : (
            <View style={styles.iconSlot}>{rightIcon}</View>
          )
        ) : null}
      </View>
      {error || helperText ? (
        <Text
          selectable={Boolean(error)}
          style={[styles.helper, { color: error ? theme.error : theme.textMuted }]}
        >
          {error ?? helperText}
        </Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  group: {
    gap: Spacing.sm,
  },
  label: {
    ...Typography.caption,
    fontWeight: '700',
  },
  field: {
    minHeight: ControlHeight.lg,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.md,
    borderCurve: 'continuous',
    paddingHorizontal: Spacing.md,
  },
  fieldMultiline: {
    alignItems: 'flex-start',
    minHeight: 112,
    paddingVertical: Spacing.md,
  },
  input: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 0,
    ...Typography.body,
  },
  inputMultiline: {
    minHeight: 84,
    textAlignVertical: 'top',
  },
  iconSlot: {
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  helper: {
    ...Typography.caption,
  },
});
