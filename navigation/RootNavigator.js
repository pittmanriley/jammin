import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createStackNavigator } from "@react-navigation/stack";
import SpotifyAuth from "../screens/Auth/SpotifyAuth";
import Feed from "../screens/Feed/Feed";
import Profile from "../screens/Profile/Profile";
// import Info from "../screens/Feed/Info";
import Search from "../screens/Feed/Search";
import AlbumScreen from "../screens/Feed/AlbumScreen";
import ArtistScreen from "../screens/Feed/ArtistScreen";
import LeaveReview from "../screens/Review/LeaveReview";
import Login from "../screens/Auth/Login";
import Signup from "../screens/Auth/Signup";
import Ionicons from "react-native-vector-icons/Ionicons";
import InfoScreen from "../screens/Review/InfoScreen";
import NewPost from "../screens/Review/NewPost";
import Stats from "../screens/Profile/Stats";
import TopTracks from "../screens/Profile/TopTracks";
import TopArtists from "../screens/Profile/TopArtists";
import AllAlbums from "../screens/Feed/AllAlbums";
import AllSongs from "../screens/Feed/AllSongs";
import AllReviews from "../screens/Profile/AllReviews";
import AllSavedItems from "../screens/Profile/AllSavedItems";

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
          name="TopTracks"
          component={TopTracks}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="TopArtists"
          component={TopArtists}
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
        <Stack.Screen
          name="AllSavedItems"
          component={AllSavedItems}
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
