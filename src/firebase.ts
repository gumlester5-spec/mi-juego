import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyApzzgFLUourfSyedr_3DRrvsDajorEqsE",
  authDomain: "mis-juegos-86bde.firebaseapp.com",
  projectId: "mis-juegos-86bde",
  storageBucket: "mis-juegos-86bde.firebasestorage.app",
  messagingSenderId: "431148427655",
  appId: "1:431148427655:web:0cc3d82ea174d45d9d0b22"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
