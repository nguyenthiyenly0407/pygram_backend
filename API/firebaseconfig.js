// Import the functions you need from the SDKs you need
// import { initializeApp } from "firebase/app";
// import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const { initializeApp } = require("firebase/app");
const firebaseConfig = {
  apiKey: "AIzaSyDgTuBFX3GSON7XFYF4MFV1M1bVtfPkdqc",
  authDomain: "pygram-5399c.firebaseapp.com",
  projectId: "pygram-5399c",
  storageBucket: "pygram-5399c.appspot.com",
  messagingSenderId: "385189017876",
  appId: "1:385189017876:web:8de94b8b962e4981c8aa01",
  measurementId: "G-K1Q0NJZ7NF"
};

// Initialize Firebase
// const app = initializeApp(firebaseConfig);
// const analytics = getAnalytics(app);
const app = initializeApp(firebaseConfig);

module.exports = app;