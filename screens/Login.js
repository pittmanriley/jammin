import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  Keyboard,
  TouchableWithoutFeedback,
  Alert,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { colors } from "../theme/colors";
import { auth } from "../firebaseConfig";
import { signInWithEmailAndPassword } from "firebase/auth";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation();

  const handleLogin = async () => {
    // Validate inputs
    if (!email || !password) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    try {
      setLoading(true);
      // Sign in with email and password
      await signInWithEmailAndPassword(auth, email, password);

      // Navigate to SpotifyAuth after successful login
      navigation.navigate("SpotifyAuth");
    } catch (error) {
      let errorMessage;
      console.log(error);
      switch (error.code) {
        case "auth/invalid-email":
          errorMessage = "Not a valid email address";
          break;
        case "auth/invalid-credentials":
          errorMessage = "That's not a valid email address";
          break;
        case "auth/user-disabled":
          errorMessage = "This account has been disabled";
          break;
        case "auth/user-not-found":
          errorMessage = "We couldn't find an account with that email";
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
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.container}>
        <View style={styles.headerContainer}>
          <Text style={styles.header}>Jammin'</Text>
          <Text style={styles.subheader}>Your Music Community</Text>
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
            placeholder="Password"
            placeholderTextColor={colors.input.placeholder}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            editable={!loading}
          />

          <TouchableOpacity
            style={[styles.loginButton, loading && styles.disabledButton]}
            onPress={handleLogin}
            disabled={loading}
          >
            <Text style={styles.loginButtonText}>
              {loading ? "Logging in..." : "Login"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.signupButton}
            onPress={() => navigation.navigate("Signup")}
            disabled={loading}
          >
            <Text style={styles.signupButtonText}>
              Don't have an account? Sign up
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
    paddingTop: 50,
  },
  headerContainer: {
    alignItems: "center",
    marginBottom: 50,
  },
  header: {
    fontSize: 42,
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
  },
  input: {
    backgroundColor: colors.input.background,
    borderRadius: 10,
    padding: 15,
    color: colors.text.primary,
    fontSize: 16,
    marginBottom: 15,
  },
  loginButton: {
    backgroundColor: colors.button.primary,
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
  },
  disabledButton: {
    opacity: 0.7,
  },
  loginButtonText: {
    color: colors.text.primary,
    fontWeight: "bold",
    fontSize: 18,
  },
  signupButton: {
    marginTop: 20,
    alignItems: "center",
  },
  signupButtonText: {
    color: colors.text.secondary,
    fontSize: 16,
  },
});
