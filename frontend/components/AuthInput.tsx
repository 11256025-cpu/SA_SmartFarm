// components/AuthInput.tsx
import React from 'react';
import { View, Text, TextInput, StyleSheet, TextInputProps } from 'react-native';
import Colors from '@/constants/Colors';

interface AuthInputProps extends TextInputProps {
  label: string;
  required?: boolean;
}

export const AuthInput = ({ label, required, style, ...props }: AuthInputProps) => {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        {label}{required && <Text style={styles.requiredStar}>*</Text>}
      </Text>
      <TextInput
        style={[styles.input, style]}
        placeholderTextColor="#C7C7CD"
        {...props}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 15,
  },
  label: {
    color: Colors.dark.inputLabel,
    fontSize: 16,
    marginBottom: 5,
    fontWeight: '500',
  },
  requiredStar: {
    color: '#FF4D4F', // 紅色必需標記
  },
  input: {
    backgroundColor: Colors.dark.inputBackground,
    color: '#FFFFFF',
    height: 40,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
  },
});