import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createStackNavigator } from "@react-navigation/stack";
import SpotifyAuth from '../screens/SpotifyAuth';
import Feed from '../screens/Feed';
import Profile from '../screens/Profile';
import Info from '../screens/Info';
import Search from '../screens/Search';
import AlbumScreen from '../screens/AlbumScreen';
import ArtistScreen from '../screens/ArtistScreen';
import LeaveReview from "../screens/LeaveReview";
import Login from "../screens/Login";
import Signup from "../screens/Signup";
import Ionicons from "react-native-vector-icons/Ionicons";
import InfoScreen from "../screens/InfoScreen";
import NewPost from "../screens/NewPost";
import Stats from "../screens/Stats";
import AllAlbums from "../screens/AllAlbums";
import AllSongs from "../screens/AllSongs";
import AllReviews from "../screens/AllReviews";

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

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
          } else if (route.name === "Review") {
            iconName = "add-circle";
          } else if (route.name === "Profile") {
            iconName = "person";
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Feed" component={Feed} />
      <Tab.Screen name="Review" component={NewPost} />
      <Tab.Screen name="Profile" component={Profile} />
    </Tab.Navigator>
  );
}

// Wrap the tabs inside a Stack Navigator
export default function RootNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Login">
        <Stack.Screen
          name="Login"
          component={Login}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Signup"
          component={Signup}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="MainTabs"
          component={TabNavigator}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="LeaveReview"
          component={LeaveReview}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Info"
          component={InfoScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="SpotifyAuth"
          component={SpotifyAuth}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Stats"
          component={Stats}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Search"
          component={Search}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="AlbumScreen"
          component={AlbumScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Artist"
          component={ArtistScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="AllAlbums"
          component={AllAlbums}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="AllSongs"
          component={AllSongs}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="AllReviews"
          component={AllReviews}
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
