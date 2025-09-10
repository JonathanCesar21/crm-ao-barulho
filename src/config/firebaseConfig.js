// src/config/firebaseConfig.js
import { initializeApp } from "firebase/app";
import {
    getAuth,
    setPersistence,
    browserLocalPersistence,
} from "firebase/auth";
import {
    getFirestore,
    initializeFirestore,
} from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Lê variáveis de ambiente do Vite
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

export const app = initializeApp(firebaseConfig);

// Firestore (ignora undefined para evitar erros de update)
initializeFirestore(app, {
    ignoreUndefinedProperties: true,
});
export const db = getFirestore(app);

// Auth com persistência local
export const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence).catch(() => { });

// Storage (opcional, útil para CSVs guardados, avatares, etc.)
export const storage = getStorage(app);

// Auth secundário para criar usuários sem trocar a sessão atual
let _secondaryApp = null;
export function getSecondaryAuth() {
    if (!_secondaryApp) {
        _secondaryApp = initializeApp(firebaseConfig, "secondary");
    }
    return getAuth(_secondaryApp);
}