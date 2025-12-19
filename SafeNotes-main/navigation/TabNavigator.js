// ─── TabNavigator.js ─────────────────────
import React, { useContext } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Animated, View, Text, StyleSheet, Platform } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { Home, BookOpenText, Settings } from 'lucide-react-native';
import { TabHistoryContext } from '../contexts/TabHistoryContext';

// Screens
import HomeScreen from '../screens/MainApp/HomeScreen';
import JournalScreen from '../screens/MainApp/JournalScreen';
import InfoStackNavigator from './InfoStackNavigator';
import TutorialsScreen from '../screens/MainApp/TutorialsScreen';
import SOSLogsScreen from '../screens/MainApp/SOSLogsScreen';
import SettingsScreen from '../screens/Settings/SettingsScreen';

const Tab = createBottomTabNavigator();

export default function TabNavigator() {
  const { pushTab } = useContext(TabHistoryContext);

  // Animated Tab Icon Component
  const AnimatedIcon = ({ icon: Icon, color, focused }) => {
    const scale = React.useRef(new Animated.Value(1)).current;

    React.useEffect(() => {
      Animated.timing(scale, {
        toValue: focused ? 1.2 : 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }, [focused]);

    return (
      <Animated.View style={{ transform: [{ scale }] }}>
        <Icon color={color} size={27} />
      </Animated.View>
    );
  };

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#ffffff',
        tabBarInactiveTintColor: '#ffffffaa',
        tabBarStyle: {
          height: Platform.OS === 'ios' ? 90 : 80,
          backgroundColor: '#7c5913ff',

          shadowColor: '#000',
          shadowOpacity: 0.1,
          shadowRadius: 15,
          shadowOffset: { width: 0, height: -3 },
          elevation: 12,
          position: 'absolute',
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontFamily: 'Inter',
          marginBottom: 8,
        },
        tabBarItemStyle: {
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          paddingTop:10,
        },
      }}
    >
      {/* Home Tab */}
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ color, focused }) => <AnimatedIcon icon={Home} color={focused ? '#fff' : color} focused={focused} />,
          tabBarLabel: ({ focused }) => <Text style={[styles.label, focused && styles.focusedLabel]}>Home</Text>,
        }}
      />

      {/* Info Tab */}
      <Tab.Screen
        name="Info"
        component={InfoStackNavigator}
        listeners={({ navigation }) => ({
          tabPress: () => {
            const currentRoute = navigation.getState().routes[navigation.getState().index].name;
            if (currentRoute !== 'Info') pushTab(currentRoute);
          },
        })}
        options={{
          tabBarIcon: ({ color, focused }) => <AnimatedIcon icon={BookOpenText} color={focused ? '#fff' : color} focused={focused} />,
          tabBarLabel: ({ focused }) => <Text style={[styles.label, focused && styles.focusedLabel]}>Info</Text>,
        }}
      />

      {/* Tutorials Tab */}
      <Tab.Screen
        name="Tutorials"
        component={TutorialsScreen}
        listeners={({ navigation }) => ({
          tabPress: () => {
            const currentRoute = navigation.getState().routes[navigation.getState().index].name;
            if (currentRoute !== 'Tutorials') pushTab(currentRoute);
          },
        })}
        options={{
          tabBarIcon: ({ color, focused }) => (
            <AnimatedIcon
              icon={(props) => <MaterialCommunityIcons name="boxing-glove" {...props} />}
              color={focused ? '#fff' : color}
              focused={focused}
            />
          ),
          tabBarLabel: ({ focused }) => <Text style={[styles.label, focused && styles.focusedLabel]}>Tutorials</Text>,
        }}
      />

      {/* SOS Logs Tab */}
      <Tab.Screen
        name="SOS Logs"
        component={SOSLogsScreen}
        listeners={({ navigation }) => ({
          tabPress: () => {
            const currentRoute = navigation.getState().routes[navigation.getState().index].name;
            if (currentRoute !== 'SOS Logs') pushTab(currentRoute);
          },
        })}
        options={{
          tabBarIcon: ({ color, focused }) => (
            <AnimatedIcon
              icon={(props) => <MaterialCommunityIcons name="history" {...props} />}
              color={focused ? '#fff' : color}
              focused={focused}
            />
          ),
          tabBarLabel: ({ focused }) => <Text style={[styles.label, focused && styles.focusedLabel]}>Logs</Text>,
        }}
      />

      {/* Settings Tab */}
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        listeners={({ navigation }) => ({
          tabPress: () => {
            const currentRoute = navigation.getState().routes[navigation.getState().index].name;
            if (currentRoute !== 'Settings') pushTab(currentRoute);
          },
        })}
        options={{
          tabBarIcon: ({ color, focused }) => <AnimatedIcon icon={Settings} color={focused ? '#fff' : color} focused={focused} />,
          tabBarLabel: ({ focused }) => <Text style={[styles.label, focused && styles.focusedLabel]}>Settings</Text>,
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 12,
    fontFamily: 'Inter',
    color: '#ffffffaa',
  },
  focusedLabel: {
    color: '#ffffff',
    fontWeight: '700',
  },
});
