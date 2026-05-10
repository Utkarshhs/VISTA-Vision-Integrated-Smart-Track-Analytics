import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyCdRQCglypSe3D_LS8ShissyVH6fKCG-vQ",
    authDomain: "vista-6070d.firebaseapp.com",
    projectId: "vista-6070d",
    storageBucket: "vista-6070d.firebasestorage.app",
    messagingSenderId: "1039402311542",
    appId: "1:1039402311542:web:61ffca60a66af2639e2457",
    measurementId: "G-LBCCJ5VHNT"
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
