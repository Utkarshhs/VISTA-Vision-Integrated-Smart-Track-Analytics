// Clear all Firebase assignments and dispatches for a fresh start
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, deleteDoc, doc } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyCdRQCglypSe3D_LS8ShissyVH6fKCG-vQ",
    authDomain: "vista-6070d.firebaseapp.com",
    projectId: "vista-6070d",
    storageBucket: "vista-6070d.firebasestorage.app",
    messagingSenderId: "1039402311542",
    appId: "1:1039402311542:web:61ffca60a66af2639e2457"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function clearAll() {
    console.log('Clearing all assignments...');
    const assignSnap = await getDocs(collection(db, 'assignments'));
    let assignCount = 0;
    for (const d of assignSnap.docs) {
        await deleteDoc(doc(db, 'assignments', d.id));
        assignCount++;
    }
    console.log(`Deleted ${assignCount} assignments`);

    console.log('Clearing all dispatches...');
    const dispatchSnap = await getDocs(collection(db, 'dispatches'));
    let dispatchCount = 0;
    for (const d of dispatchSnap.docs) {
        await deleteDoc(doc(db, 'dispatches', d.id));
        dispatchCount++;
    }
    console.log(`Deleted ${dispatchCount} dispatches`);

    console.log('\nAll data cleared! The app is now fresh.');
    process.exit(0);
}

clearAll().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
