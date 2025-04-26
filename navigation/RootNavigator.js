import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import Feed from "../screens/Feed";
import NewPost from "../screens/NewPost";
import Profile from "../screens/Profile";
import Ionicons from "react-native-vector-icons/Ionicons";

const Tab = createBottomTabNavigator();

export default function RootNavigator() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarStyle: { backgroundColor: "#121212" },
          tabBarActiveTintColor: "#1DB954",
          tabBarInactiveTintColor: "gray",
          tabBarIcon: ({ color, size }) => {
            let iconName;

            if (route.name === "Feed") {
              iconName = "home"; // filled home
            } else if (route.name === "NewPost") {
              iconName = "add-circle"; // filled plus
            } else if (route.name === "Profile") {
              iconName = "person"; // filled person
            }

            return <Ionicons name={iconName} size={size} color={color} />;
          },
        })}
      >
        <Tab.Screen name="Feed" component={Feed} />
        <Tab.Screen name="NewPost" component={NewPost} />
        <Tab.Screen name="Profile" component={Profile} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
