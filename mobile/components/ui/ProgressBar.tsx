import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Colors } from '../../constants/Colors';

interface ProgressBarProps {
  progress: number;     // 0–1
  color?: string;
  height?: number;
  label?: string;
  showPercent?: boolean;
  style?: ViewStyle;
}

export function ProgressBar({
  progress,
  color = Colors.green,
  height = 4,
  label,
  showPercent = false,
  style,
}: ProgressBarProps) {
  const pct = Math.min(Math.max(progress, 0), 1);

  return (
    <View style={[styles.container, style]}>
      {(label || showPercent) && (
        <View style={styles.row}>
          {label && <Text style={styles.label}>{label}</Text>}
          {showPercent && (
            <Text style={[styles.pct, { color }]}>{Math.round(pct * 100)}%</Text>
          )}
        </View>
      )}
      <View style={[styles.track, { height }]}>
        <View style={[styles.fill, { width: `${pct * 100}%`, backgroundColor: color, height }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%' },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  label: { fontSize: 12, color: Colors.gray2 },
  pct: { fontSize: 12, fontWeight: '600' },
  track: { backgroundColor: Colors.border, width: '100%', overflow: 'hidden' },
  fill: {},
});
