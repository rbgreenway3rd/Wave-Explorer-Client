import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// const firebaseConfig = {
//   apiKey: "...",
//   authDomain: "...",
//   projectId: "...",
//   // ...other config from Firebase Console
// };

// const app = initializeApp(firebaseConfig);
// export const auth = getAuth(app);
// export const db = getFirestore(app);

// Import the functions you need from the SDKs you need
// import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAYeLyi_oP8zb0rqBPtkVnpetGwRJ-WSqI",
  authDomain: "waveexplorer-cf033.firebaseapp.com",
  projectId: "waveexplorer-cf033",
  storageBucket: "waveexplorer-cf033.firebasestorage.app",
  messagingSenderId: "1053432534228",
  appId: "1:1053432534228:web:ff69e5fea6f8bd97681741",
  measurementId: "G-63BNNZ4XBV",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const analytics = getAnalytics(app);
