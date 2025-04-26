import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useNavigation } from "@react-navigation/native";
import Feather from "@expo/vector-icons/Feather";

export default function Profile() {
  const navigation = useNavigation();

  return (
    <View style={styles.container}>
      {/* Header */}
      <Text style={styles.header}>Profile</Text>

      {/* Content */}
      <View style={styles.content}>
        <TouchableOpacity
          style={styles.profileContainer}
          // onPress={() => navigation.navigate("PersonalInfo")}
        >
          <View>
            <Text style={styles.buttonText1}>Your Name</Text>
            <Text style={styles.buttonText2}>Go to Personal Information</Text>
          </View>
          <Feather name="chevron-right" size={24} color="white" />
        </TouchableOpacity>

        <Text style={styles.subtitle}>Settings</Text>

        <TouchableOpacity
          style={styles.buttonContainer}
          // onPress={() => navigation.navigate("AthletesProfile")}
        >
          <Text style={styles.buttonText1}>Athlete's Profile</Text>
          <Feather name="chevron-right" size={24} color="white" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.buttonContainer}
          // onPress={() => navigation.navigate("Payments")}
        >
          <Text style={styles.buttonText1}>Payments</Text>
          <Feather name="chevron-right" size={24} color="white" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.buttonContainer}
          // onPress={() => navigation.navigate("CustomerSupport")}
        >
          <Text style={styles.buttonText1}>Customer Support</Text>
          <Feather name="chevron-right" size={24} color="white" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.buttonContainer}
          // onPress={() => navigation.navigate("PrivacySecurity")}
        >
          <Text style={styles.buttonText1}>Privacy & Security</Text>
          <Feather name="chevron-right" size={24} color="white" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#121212", // match dark background
    paddingTop: 50,
    paddingHorizontal: 20,
  },
  header: {
    fontSize: 28,
    fontWeight: "bold",
    color: "white",
    marginTop: 10,
    marginBottom: 30,
    textAlign: "center",
  },
  content: {
    paddingHorizontal: 0, // no extra horizontal padding inside content
  },
  subtitle: {
    color: "white",
    fontSize: 20,
    marginTop: 20,
    marginBottom: 10,
  },
  profileContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#1e1e1e", // dark box background
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#1e1e1e", // dark box background
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
  },
  buttonText1: {
    fontSize: 16,
    color: "white",
    fontWeight: "500",
  },
  buttonText2: {
    fontSize: 14,
    color: "grey",
    marginTop: 5,
  },
});
