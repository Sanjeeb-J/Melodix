import React from 'react';
import { Tabs } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import MiniPlayer from '../../components/MiniPlayer';
import { View } from 'react-native';

export default function TabLayout() {
  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: '#121212',
            borderTopColor: 'rgba(255,255,255,0.06)',
            height: 60,
            paddingBottom: 8,
          },
          tabBarActiveTintColor: '#1db954',
          tabBarInactiveTintColor: '#737373',
          tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ color, size }) => <MaterialIcons name="home" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="search"
          options={{
            title: 'Search',
            tabBarIcon: ({ color, size }) => <MaterialIcons name="search" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="library"
          options={{
            title: 'Library',
            tabBarIcon: ({ color, size }) => <MaterialIcons name="library-music" size={size} color={color} />,
          }}
        />
      </Tabs>
      <MiniPlayer />
    </View>
  );
}
