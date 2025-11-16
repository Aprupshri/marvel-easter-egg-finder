// lib/firebaseAdmin.js
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

import certificate from "./easter-egg-a72d1-firebase-adminsdk-fbsvc-93a6655926.json";

if (!getApps().length) {
  initializeApp({
    credential: cert(certificate),
  });
}

export const adminAuth = getAuth();
