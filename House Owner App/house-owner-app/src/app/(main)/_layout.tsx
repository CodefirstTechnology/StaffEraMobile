import { Tabs } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Stitch } from '@/theme/stitch';

export default function MainLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Stitch.colors.secondary,
        tabBarInactiveTintColor: Stitch.colors.onSurfaceVariant,
        tabBarStyle: {
          backgroundColor: 'rgba(252, 248, 255, 0.95)',
          borderTopColor: 'rgba(255,255,255,0.5)',
          height: 64,
          paddingBottom: 8,
          paddingTop: 8,
          shadowColor: Stitch.colors.primaryContainer,
          shadowOpacity: 0.1,
          shadowRadius: 12,
          elevation: 12,
        },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="home/index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="browse/index"
        options={{
          title: 'Browse',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="search" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="bookings/index"
        options={{
          title: 'Bookings',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="event" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile/index"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="person" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
