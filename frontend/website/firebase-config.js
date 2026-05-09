// ============ FIREBASE CONFIGURATION FOR VISTA ============
// This config connects both the web dashboard and the engineer app
// to the same Firestore database for real-time data sharing.

const firebaseConfig = {
    apiKey: "AIzaSyCdRQCglypSe3D_LS8ShissyVH6fKCG-vQ",
    authDomain: "vista-6070d.firebaseapp.com",
    projectId: "vista-6070d",
    storageBucket: "vista-6070d.firebasestorage.app",
    messagingSenderId: "1039402311542",
    appId: "1:1039402311542:web:61ffca60a66af2639e2457",
    measurementId: "G-LBCCJ5VHNT"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Firestore
const db = firebase.firestore();

// Collection references
const dispatchesRef = db.collection('dispatches');
const assignmentsRef = db.collection('assignments');

console.log('Firebase initialized — connected to project: vista-6070d');
