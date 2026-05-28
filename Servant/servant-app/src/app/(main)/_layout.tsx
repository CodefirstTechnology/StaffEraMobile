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
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="home/index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <MaterialIcons name="home" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="schedule/index"
        options={{
          title: 'Schedule',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="calendar-today" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="time/index"
        options={{
          title: 'Time',
          tabBarIcon: ({ color, size }) => <MaterialIcons name="schedule" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="earnings/index"
        options={{
          title: 'Earnings',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="account-balance-wallet" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile/index"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <MaterialIcons name="person" size={size} color={color} />,
        }}
      />
      <Tabs.Screen name="zones/index" options={{ href: null }} />
    </Tabs>
  );
}
