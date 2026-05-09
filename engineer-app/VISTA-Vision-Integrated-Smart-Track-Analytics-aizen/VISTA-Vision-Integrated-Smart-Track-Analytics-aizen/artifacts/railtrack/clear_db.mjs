import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, deleteDoc, doc } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyCdRQCglypSe3D_LS8ShissyVH6fKCG-vQ",
    authDomain: "vista-6070d.firebaseapp.com",
    projectId: "vista-6070d",
    storageBucket: "vista-6070d.firebasestorage.app",
    messagingSenderId: "1039402311542",
    appId: "1:1039402311542:web:61ffca60a66af2639e2457",
    measurementId: "G-LBCCJ5VHNT"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function clearCollection(colName) {
    const querySnapshot = await getDocs(collection(db, colName));
    const deletePromises = [];
    querySnapshot.forEach((d) => {
        deletePromises.push(deleteDoc(doc(db, colName, d.id)));
    });
    await Promise.all(deletePromises);
    console.log(`Cleared ${colName}`);
}

async function run() {
    await clearCollection('assignments');
    await clearCollection('dispatches');
    console.log("Database cleared successfully!");
    process.exit(0);
}

run();
