// src/services/usersService.js
import { db } from "../config/firebaseConfig";
import {
    collection, query, where, getDocs, doc, setDoc, updateDoc, addDoc,
    serverTimestamp, getDoc, deleteDoc, limit
} from "firebase/firestore";

// Estrutura recomendada:
// users/{uid} => { email, displayName, role, shopId, active }
// shops/{shopId}/sellers/{uid} => { uid?, displayName, email, active, invitedAt, inviteCode }

export async function listSellersOfShop(shopId) {
    // lê da subcoleção da loja (fonte de verdade para manager)
    const col = collection(db, "shops", shopId, "sellers");
    const snap = await getDocs(col);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
export async function hasAnyAdmin() {
    const col = collection(db, "users");
    const q = query(col, where("role", "==", "admin"), limit(1));
    const snap = await getDocs(q);
    return !snap.empty;
}

// cria “cadastro” de vendedor (ainda sem Auth) com código de convite
export async function createSellerInvite(shopId, { displayName, email }) {
    const inviteCode = crypto.randomUUID();
    const data = {
        displayName: displayName || "",
        email: (email || "").toLowerCase(),
        active: true,
        invitedAt: serverTimestamp(),
        inviteCode,
    };
    const ref = doc(collection(db, "shops", shopId, "sellers"));
    await setDoc(ref, data, { merge: true });
    return { id: ref.id, ...data };
}

// ativa/desativa
export async function toggleSellerActive(shopId, sellerId, active) {
    const ref = doc(db, "shops", shopId, "sellers", sellerId);
    await updateDoc(ref, { active: !!active });
}

// opcional: vincular a um usuário Auth depois que ele aceitar convite
export async function linkSellerToUser(shopId, sellerId, uid) {
    const ref = doc(db, "shops", shopId, "sellers", sellerId);
    await updateDoc(ref, { uid });

    // espelha no /users também (se já existir)
    const uref = doc(db, "users", uid);
    const usnap = await getDoc(uref);
    if (usnap.exists()) {
        await updateDoc(uref, { role: "seller", shopId });
    }
}

// remove registro de seller da loja (não mexe em /users)
export async function deleteSeller(shopId, sellerId) {
    const ref = doc(db, "shops", shopId, "sellers", sellerId);
    await deleteDoc(ref);
}

export async function getSellerInviteByCode(shopId, code) {
    const col = collection(db, "shops", shopId, "sellers");
    const q = query(col, where("inviteCode", "==", code), limit(1));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const d = snap.docs[0];
    return { id: d.id, ...d.data() };
}

/** Marca convite como aceito e vincula uid */
export async function acceptSellerInvite(shopId, sellerId, uid) {
    const ref = doc(db, "shops", shopId, "sellers", sellerId);
    await updateDoc(ref, {
        uid,
        inviteCode: null,
        acceptedAt: new Date(),
    });
}
