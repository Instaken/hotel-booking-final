import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAHlqz-knEiIo9wKXrkLZiNbTZAdJiqxXA",
  authDomain: "hotel-booking-system-final.firebaseapp.com",
  projectId: "hotel-booking-system-final",
  storageBucket: "hotel-booking-system-final.firebasestorage.app",
  messagingSenderId: "677400217786",
  appId: "1:677400217786:web:c796350cc25405568e9a83"
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
