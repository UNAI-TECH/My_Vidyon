// ============================================================
// File: src/components/common/FormField.tsx
// Purpose: Standardized form field wrapper with editable, read-only/disabled,
// required asterisk, inline validation, and helper/tooltip states.
// ============================================================

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TextInputProps,
  ViewStyle,
  TextStyle,
  Platform,
} from 'react-native';
import { theme } from '../../theme';
import { AlertCircle, Lock, HelpCircle } from 'lucide-react-native';

export interface FormFieldProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  required?: boolean;
  readOnly?: boolean;
  disabled?: boolean;
  disabledReason?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  containerStyle?: ViewStyle;
  inputStyle?: TextStyle;
  labelStyle?: TextStyle;
  multiline?: boolean;
  rows?: number;
}

export const FormField = React.forwardRef<TextInput, FormFieldProps>(
  (
    {
      label,
      required = false,
      readOnly = false,
      disabled = false,
      disabledReason,
      error,
      helperText,
      leftIcon,
      rightIcon,
      containerStyle,
      inputStyle,
      labelStyle,
      value,
      placeholder,
      multiline = false,
      rows = 3,
      onFocus,
      onBlur,
      ...textInputProps
    },
    ref
  ) => {
    const [isFocused, setIsFocused] = useState(false);
    const isInactive = readOnly || disabled;

    const handleFocus = (e: any) => {
      if (isInactive) return;
      setIsFocused(true);
      onFocus?.(e);
    };

    const handleBlur = (e: any) => {
      setIsFocused(false);
      onBlur?.(e);
    };

    return (
      <View style={[styles.container, containerStyle]}>
        {/* Label Row */}
        {label && (
          <View style={styles.labelRow}>
            <Text
              style={[
                styles.label,
                isInactive && styles.labelDisabled,
                labelStyle,
              ]}
              accessibilityRole="text"
            >
              {label}
              {required && <Text style={styles.requiredAsterisk}> *</Text>}
            </Text>

            {isInactive && disabledReason && (
              <View style={styles.lockReasonBadge}>
                <Lock size={10} color="#64748B" {...({} as any)} />
                <Text style={styles.lockReasonText} numberOfLines={1}>
                  {disabledReason}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Input Wrapper */}
        <View
          style={[
            styles.inputWrapper,
            isInactive && styles.inputWrapperDisabled,
            isFocused && !isInactive && styles.inputWrapperFocused,
            Boolean(error) && styles.inputWrapperError,
            multiline && { minHeight: rows * 24 + 20, alignItems: 'flex-start' },
          ]}
          pointerEvents={isInactive ? 'none' : 'auto'}
          accessible={true}
          accessibilityLabel={label || placeholder}
          accessibilityState={{ disabled: isInactive }}
        >
          {leftIcon && <View style={styles.iconContainer}>{leftIcon}</View>}

          <TextInput
            ref={ref}
            value={value}
            placeholder={placeholder}
            placeholderTextColor="#94A3B8"
            editable={!isInactive}
            multiline={multiline}
            onFocus={handleFocus}
            onBlur={handleBlur}
            style={[
              styles.input,
              isInactive && styles.inputDisabledText,
              multiline && styles.multilineInput,
              inputStyle,
              Platform.OS === 'web' && (isInactive ? ({ cursor: 'not-allowed' } as any) : ({ outlineStyle: 'none' } as any)),
            ]}
            aria-required={required}
            aria-invalid={Boolean(error)}
            aria-disabled={isInactive}
            {...textInputProps}
          />

          {rightIcon && !isInactive && (
            <View style={styles.iconContainer}>{rightIcon}</View>
          )}

          {isInactive && (
            <View style={styles.iconContainer}>
              <Lock size={15} color="#94A3B8" {...({} as any)} />
            </View>
          )}
        </View>

        {/* Inline Error Message */}
        {Boolean(error) && (
          <View style={styles.errorRow}>
            <AlertCircle size={13} color="#EF4444" {...({} as any)} />
            <Text style={styles.errorText} accessibilityRole="alert">
              {error}
            </Text>
          </View>
        )}

        {/* Helper Text (when no error) */}
        {!error && helperText && (
          <View style={styles.helperRow}>
            <HelpCircle size={12} color="#94A3B8" {...({} as any)} />
            <Text style={styles.helperText}>{helperText}</Text>
          </View>
        )}
      </View>
    );
  }
);

FormField.displayName = 'FormField';

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    width: '100%',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.text, // #1E293B
  },
  labelDisabled: {
    color: '#64748B',
  },
  requiredAsterisk: {
    color: '#EF4444',
    fontWeight: '700',
  },
  lockReasonBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    maxWidth: '55%',
  },
  lockReasonText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: theme.borderRadius.m, // 12
    paddingHorizontal: 14,
    minHeight: 46,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 2,
    elevation: 1,
  },
  inputWrapperFocused: {
    borderColor: theme.colors.primary, // #FAB75A
    backgroundColor: '#FFFFFF',
    shadowColor: theme.colors.primary,
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  inputWrapperDisabled: {
    backgroundColor: '#F1F5F9', // Standard grey background for disabled/read-only
    borderColor: '#E2E8F0',
    shadowOpacity: 0,
    elevation: 0,
  },
  inputWrapperError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.text,
    paddingVertical: 10,
  },
  inputDisabledText: {
    color: '#64748B', // Standard grey text
  },
  multilineInput: {
    textAlignVertical: 'top',
    paddingTop: 10,
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 5,
    paddingHorizontal: 2,
  },
  errorText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#EF4444',
  },
  helperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 5,
    paddingHorizontal: 2,
  },
  helperText: {
    fontSize: 11,
    color: '#64748B',
  },
});
