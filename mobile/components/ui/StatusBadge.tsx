import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../constants/Colors';
import type { MarkerStatus } from '../../types';

interface StatusBadgeProps {
  status: MarkerStatus;
  compact?: boolean;
}

const STATUS_CONFIG: Record<MarkerStatus, { label: string; color: string; bg: string }> = {
  optimal:    { label: 'Optimal',    color: Colors.green, bg: Colors.greenDim },
  suboptimal: { label: 'Suboptimal', color: Colors.gold,  bg: Colors.goldDim  },
  attention:  { label: 'Attention',  color: Colors.red,   bg: Colors.redDim   },
};

export function StatusBadge({ status, compact = false }: StatusBadgeProps) {
  const cfg = STATUS_CONFIG[status];
  return (
    <View style={[styles.badge, { backgroundColor: cfg.bg, borderColor: cfg.color + '40' }]}>
      <View style={[styles.dot, { backgroundColor: cfg.color }]} />
      {!compact && <Text style={[styles.label, { color: cfg.color }]}>{cfg.label}</Text>}
    </View>
  );
}

export function getStatusColor(status: MarkerStatus): string {
  return STATUS_CONFIG[status].color;
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
});
