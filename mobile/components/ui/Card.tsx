import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Colors } from '../../constants/Colors';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  accent?: boolean;
  gold?: boolean;
}

export function Card({ children, style, accent = false, gold = false }: CardProps) {
  return (
    <View style={[
      styles.card,
      accent && styles.accentBorder,
      gold && styles.goldBorder,
      style,
    ]}>
      {(accent || gold) && (
        <View style={[styles.topLine, gold ? styles.topLineGold : styles.topLineGreen]} />
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.bg3,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    overflow: 'hidden',
  },
  accentBorder: {
    borderColor: Colors.borderGreen,
    backgroundColor: Colors.greenDim,
  },
  goldBorder: {
    borderColor: 'rgba(255,179,0,0.25)',
    backgroundColor: Colors.goldDim,
  },
  topLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
  },
  topLineGreen: {
    backgroundColor: Colors.green,
  },
  topLineGold: {
    backgroundColor: Colors.gold,
  },
});
