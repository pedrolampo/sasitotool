import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

let app;
let db;

try {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
} catch (e) {
  console.error('Error initializing Firebase:', e);
}

export function subscribeToNotes(callback) {
  if (!db) {
    console.error('Firestore not initialized');
    return () => {};
  }

  const q = query(collection(db, 'notes'), orderBy('createdAt', 'desc'));

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const notes = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
    }));
    callback(notes);
  });

  return unsubscribe;
}

export async function updateNote(id, content) {
  if (!db) return;
  const noteRef = doc(db, 'notes', id);
  await updateDoc(noteRef, { content });
}

export async function deleteNote(id) {
  if (!db) return;
  const noteRef = doc(db, 'notes', id);
  await deleteDoc(noteRef);
}
