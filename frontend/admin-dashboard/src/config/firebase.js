import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

// Firebase configuration - Replace with your actual config
const firebaseConfig = {
  apiKey: "AIzaSyAHlqz-knEiIo9wKXrkLZiNbTZAdJiqxXA",
  authDomain: "hotel-booking-system-final.firebaseapp.com",
  projectId: "hotel-booking-system-final",
  storageBucket: "hotel-booking-system-final.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export { 
  auth, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged, 
  googleProvider, 
  signInWithPopup 
};
