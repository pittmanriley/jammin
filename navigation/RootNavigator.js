import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createStackNavigator } from "@react-navigation/stack";
import Feed from "../screens/Feed";
import NewPost from "../screens/NewPost";
import Profile from "../screens/Profile";
import LeaveReview from "../screens/LeaveReview";
import Ionicons from "react-native-vector-icons/Ionicons";

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator(); // 👈 Create a Stack Navigator

// Your bottom tabs
function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: { backgroundColor: "#121212" },
        tabBarActiveTintColor: "white",
        tabBarInactiveTintColor: "gray",
        tabBarIcon: ({ color, size }) => {
          let iconName;

          if (route.name === "Feed") {
            iconName = "home";
          } else if (route.name === "NewPost") {
            iconName = "add-circle";
          } else if (route.name === "Profile") {
            iconName = "person";
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Feed" component={Feed} />
      <Tab.Screen name="NewPost" component={NewPost} />
      <Tab.Screen name="Profile" component={Profile} />
    </Tab.Navigator>
  );
}

// Wrap the tabs inside a Stack Navigator
export default function RootNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        {/* Tabs */}
        <Stack.Screen
          name="MainTabs"
          component={TabNavigator}
          options={{ headerShown: false }}
        />
        {/* LeaveReview page */}
        <Stack.Screen
          name="LeaveReview"
          component={LeaveReview}
          options={{
            headerShown: false, // we control the header manually in LeaveReview
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
