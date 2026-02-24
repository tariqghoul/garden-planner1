import 'react-native-gesture-handler';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { Text } from 'react-native';

// Screens
import HomeScreen from './src/screens/HomeScreen';
import BrowseScreen from './src/screens/BrowseScreen';
import PlantDetailScreen from './src/screens/PlantDetailScreen';
import MyGardenScreen from './src/screens/MyGardenScreen';
import GardenAreaScreen from './src/screens/GardenAreaScreen';
import SettingsScreen from './src/screens/SettingsScreen';

import { COLORS } from './src/theme';
import { GardenProvider } from './src/hooks/GardenContext';
import { SettingsProvider } from './src/hooks/SettingsContext';

// Tab icon using emoji (no extra icon library needed)
function TabIcon({ label, focused }) {
  const icons = { Home: '🌱', Browse: '🔍', 'My Garden': '🪴', Settings: '⚙️' };
  return (
    <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.45 }}>
      {icons[label] || '•'}
    </Text>
  );
}

// ── Stack navigators ───────────────────────────────────────
// Each tab gets its own stack so you can navigate to PlantDetail
// from anywhere without leaving the tab.

const BrowseStack = createStackNavigator();
function BrowseStackNav() {
  return (
    <BrowseStack.Navigator screenOptions={{ headerShown: false }}>
      <BrowseStack.Screen name="BrowseList" component={BrowseScreen} />
      <BrowseStack.Screen name="PlantDetail" component={PlantDetailScreen} />
    </BrowseStack.Navigator>
  );
}

const HomeStack = createStackNavigator();
function HomeStackNav() {
  return (
    <HomeStack.Navigator screenOptions={{ headerShown: false }}>
      <HomeStack.Screen name="HomeMain" component={HomeScreen} />
      <HomeStack.Screen name="PlantDetail" component={PlantDetailScreen} />
    </HomeStack.Navigator>
  );
}

const GardenStack = createStackNavigator();
function GardenStackNav() {
  return (
    <GardenStack.Navigator screenOptions={{ headerShown: false }}>
      <GardenStack.Screen name="GardenMain" component={MyGardenScreen} />
      <GardenStack.Screen name="GardenArea" component={GardenAreaScreen} />
      <GardenStack.Screen name="PlantDetail" component={PlantDetailScreen} />
    </GardenStack.Navigator>
  );
}

// ── Bottom tab bar ─────────────────────────────────────────
const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <GardenProvider>
      <SettingsProvider>
        <NavigationContainer>
          <StatusBar style="dark" />
          <Tab.Navigator
            screenOptions={({ route }) => ({
              headerShown: false,
              tabBarIcon: ({ focused }) => (
                <TabIcon label={route.name} focused={focused} />
              ),
              tabBarActiveTintColor: COLORS.tabActive,
              tabBarInactiveTintColor: COLORS.tabInactive,
              tabBarStyle: {
                backgroundColor: '#ffffff',
                borderTopColor: COLORS.border,
                paddingBottom: 6,
                height: 62,
              },
              tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
            })}
          >
            <Tab.Screen name="Home" component={HomeStackNav} />
            <Tab.Screen name="Browse" component={BrowseStackNav} />
            <Tab.Screen name="My Garden" component={GardenStackNav} />
            <Tab.Screen name="Settings" component={SettingsScreen} />
          </Tab.Navigator>
        </NavigationContainer>
      </SettingsProvider>
    </GardenProvider>
  );
}
