// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBFfdcvmAcTk1naeS7fBeQYr3EK8lK5-yA",
  authDomain: "jammin-94b6e.firebaseapp.com",
  projectId: "jammin-94b6e",
  storageBucket: "jammin-94b6e.firebasestorage.com",
  messagingSenderId: "393548010733",
  appId: "1:393548010733:ios:2176b23e2e4473594628e4",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services with AsyncStorage persistence
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

const db = getFirestore(app);
const storage = getStorage(app);

export { auth, db, storage };
