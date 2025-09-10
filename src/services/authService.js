// src/services/authService.js
import { auth, db, getSecondaryAuth } from "../config/firebaseConfig";
import {
    signInWithEmailAndPassword,
    sendPasswordResetEmail,
    signOut as firebaseSignOut,
    createUserWithEmailAndPassword,
    updateProfile,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { acceptSellerInvite } from "./usersService";

/**
 * Faz login com e-mail/senha
 * Retorna { user, profile } onde profile é o doc em /users/{uid}
 */
export async function loginWithEmail(email, password) {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    const u = cred.user;

    const ref = doc(db, "users", u.uid);
    const snap = await getDoc(ref);
    const profile = snap.exists() ? { id: u.uid, ...snap.data() } : null;

    return { user: u, profile };
}

export async function sendReset(email) {
    return sendPasswordResetEmail(auth, email);
}

export async function signOut() {
    return firebaseSignOut(auth);
}

export async function registerFirstAdmin({ email, password, displayName }) {
    const secondaryAuth = getSecondaryAuth();
    const cred = await createUserWithEmailAndPassword(secondaryAuth, email, password);
    const u = cred.user;

    if (displayName) {
        await updateProfile(u, { displayName });
    }

    // profile no Firestore
    await setDoc(doc(db, "users", u.uid), {
        email: email.toLowerCase(),
        displayName: displayName || "",
        role: "admin",
        shopId: null,
        active: true,
        createdAt: new Date(), // (opcional trocar por serverTimestamp no futuro)
    });

    return u;
}

export async function registerSellerWithInvite({ shopId, sellerId, email, password, displayName }) {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const u = cred.user;

    if (displayName) {
        await updateProfile(u, { displayName });
    }

    // Profile do usuário
    await setDoc(doc(db, "users", u.uid), {
        email: email.toLowerCase(),
        displayName: displayName || "",
        role: "seller",
        shopId,
        active: true,
        createdAt: new Date(),
    });

    // Vincula convite -> uid
    await acceptSellerInvite(shopId, sellerId, u.uid);

    return u;
}

// Cria um MANAGER já vinculado a uma loja
export async function registerManager({ email, password, displayName, shopId }) {
    if (!shopId) throw new Error("shopId obrigatório para manager.");
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const u = cred.user;

    if (displayName) {
        await updateProfile(u, { displayName });
    }

    await setDoc(doc(db, "users", u.uid), {
        email: email.toLowerCase(),
        displayName: displayName || "",
        role: "manager",
        shopId,
        active: true,
        createdAt: new Date(),
    });

    return u;
}

export async function registerSellerByManager({ shopId, displayName, email, password }) {
    if (!shopId) throw new Error("shopId obrigatório para seller.");

    // cria a conta sem trocar a sessão atual
    const secondaryAuth = getSecondaryAuth();
    const cred = await createUserWithEmailAndPassword(secondaryAuth, email, password);
    const u = cred.user;

    if (displayName) {
        await updateProfile(u, { displayName });
    }

    // Profile global
    await setDoc(doc(db, "users", u.uid), {
        email: email.toLowerCase(),
        displayName: displayName || "",
        role: "seller",
        shopId,
        active: true,
        createdAt: new Date(),
    });

    // Registro espelhado na loja (id = uid para facilitar vínculo)
    await setDoc(doc(db, "shops", shopId, "sellers", u.uid), {
        uid: u.uid,
        email: email.toLowerCase(),
        displayName: displayName || "",
        active: true,
        createdAt: new Date(),
    });

    // opcional: secondaryAuth.signOut(); // não precisa, não afeta a sessão principal
    return u;
}
