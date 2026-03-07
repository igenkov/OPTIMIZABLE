import React from 'react';
import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { Colors } from '../../constants/Colors';

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  const icons: Record<string, string> = {
    Home: '⬡', Plan: '☑', Journal: '◎', Results: '⚗', Profile: '◉',
  };
  return (
    <Text style={{ fontSize: 18, color: focused ? Colors.green : Colors.gray3 }}>
      {icons[label] ?? '●'}
    </Text>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.bg2,
          borderTopColor: Colors.border,
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
        },
        tabBarActiveTintColor: Colors.green,
        tabBarInactiveTintColor: Colors.gray3,
        tabBarLabelStyle: { fontSize: 10, letterSpacing: 0.5, fontWeight: '600' },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: ({ focused }) => <TabIcon label="Home" focused={focused} /> }} />
      <Tabs.Screen name="plan" options={{ title: 'Plan', tabBarIcon: ({ focused }) => <TabIcon label="Plan" focused={focused} /> }} />
      <Tabs.Screen name="journal" options={{ title: 'Journal', tabBarIcon: ({ focused }) => <TabIcon label="Journal" focused={focused} /> }} />
      <Tabs.Screen name="results" options={{ title: 'Results', tabBarIcon: ({ focused }) => <TabIcon label="Results" focused={focused} /> }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: ({ focused }) => <TabIcon label="Profile" focused={focused} /> }} />
    </Tabs>
  );
}
