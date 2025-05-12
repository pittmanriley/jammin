import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { colors } from "../theme/colors";
import { auth, db } from "../firebaseConfig";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";

export default function Signup() {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation();

  const handleSignup = async () => {
    // Validate inputs
    if (!email || !username || !password || !confirmPassword) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }
    
    // Validate username (no spaces, special characters allowed)
    if (username.includes(" ")) {
      Alert.alert("Error", "Username cannot contain spaces");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }

    if (password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters long");
      return;
    }

    try {
      setLoading(true);
      // Create user with email and password
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;

      // Create user document in Firestore
      await setDoc(doc(db, "users", user.uid), {
        email: email,
        username: username,
        displayName: username, // Use username as initial display name
        createdAt: new Date().toISOString(),
        savedItems: [],
      });

      Alert.alert("Success", "Account created successfully!");
      navigation.navigate("MainTabs");
    } catch (error) {
      let errorMessage;

      switch (error.code) {
        case "auth/email-already-in-use":
          errorMessage =
            "That email is already registered. Try logging in instead";
          break;
        case "auth/invalid-email":
          errorMessage = "That's not a valid email address";
          break;
        case "auth/weak-password":
          errorMessage = "Your password needs to be at least 6 characters long";
          break;
        case "permission-denied":
          errorMessage =
            "We're having trouble creating your account. Please try again";
          break;
        default:
          errorMessage = "Something went wrong. Please try again";
      }

      Alert.alert("Error", errorMessage);
    } finally {
      setLoading(false);
    }
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
          placeholder="Email"
          placeholderTextColor={colors.input.placeholder}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          editable={!loading}
        />
        
        <TextInput
          style={styles.input}
          placeholder="Username"
          placeholderTextColor={colors.input.placeholder}
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          editable={!loading}
        />

        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor={colors.input.placeholder}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          editable={!loading}
        />

        <TextInput
          style={styles.input}
          placeholder="Confirm Password"
          placeholderTextColor={colors.input.placeholder}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          editable={!loading}
        />

        <TouchableOpacity
          style={[styles.signupButton, loading && styles.disabledButton]}
          onPress={handleSignup}
          disabled={loading}
        >
          <Text style={styles.signupButtonText}>
            {loading ? "Creating Account..." : "Create Account"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.loginButton}
          onPress={() => navigation.navigate("Login")}
          disabled={loading}
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
  disabledButton: {
    opacity: 0.7,
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
