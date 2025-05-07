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
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { colors } from "../theme/colors";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigation = useNavigation();

  const handleLogin = () => {
    navigation.navigate("MainTabs");
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
          />

          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor={colors.input.placeholder}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
            <Text style={styles.loginButtonText}>Login</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.signupButton}
            onPress={() => navigation.navigate("Signup")}
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
