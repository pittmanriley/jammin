import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { colors } from "../theme/colors";

export default function Signup() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const navigation = useNavigation();

  const handleSignup = () => {
    // TODO: Handle signup
    navigation.navigate("MainTabs");
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.header}>Create Account</Text>
        <Text style={styles.subheader}>Join the Jammin' community</Text>
      </View>

      <View style={styles.formContainer}>
        <TextInput
          style={styles.input}
          placeholder="Username"
          placeholderTextColor={colors.input.placeholder}
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
        />

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={colors.input.placeholder}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor={colors.input.placeholder}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TextInput
          style={styles.input}
          placeholder="Confirm Password"
          placeholderTextColor={colors.input.placeholder}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
        />

        <TouchableOpacity style={styles.signupButton} onPress={handleSignup}>
          <Text style={styles.signupButtonText}>Create Account</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.loginButton}
          onPress={() => navigation.navigate("Login")}
        >
          <Text style={styles.loginButtonText}>
            Already have an account? Login
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  headerContainer: {
    alignItems: "center",
    marginTop: 50,
    marginBottom: 40,
  },
  header: {
    fontSize: 32,
    fontWeight: "bold",
    color: colors.text.primary,
    marginBottom: 10,
  },
  subheader: {
    fontSize: 18,
    color: colors.text.secondary,
  },
  formContainer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  input: {
    backgroundColor: colors.input.background,
    borderRadius: 10,
    padding: 15,
    color: colors.text.primary,
    fontSize: 16,
    marginBottom: 15,
  },
  signupButton: {
    backgroundColor: colors.button.primary,
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
  },
  signupButtonText: {
    color: colors.text.primary,
    fontWeight: "bold",
    fontSize: 18,
  },
  loginButton: {
    marginTop: 20,
    alignItems: "center",
  },
  loginButtonText: {
    color: colors.text.secondary,
    fontSize: 16,
  },
});
