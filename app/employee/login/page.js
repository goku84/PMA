"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { collection, addDoc, serverTimestamp, query, where, getDocs } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { IconUserPlus, IconLockOpen, IconArrowLeft, IconAlertCircle, IconCheck } from "@tabler/icons-react";

export default function EmployeeLogin() {
  const router = useRouter();
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    if (!email || !password) {
      setErrorMsg("Please enter your credentials.");
      return;
    }
    if (email === "admin@gmail.com") {
      setErrorMsg("Admin identities must use the dedicated Admin Portal gateway.");
      return;
    }

    try {
      if (isSignUp) {
        if (!name) {
          setErrorMsg("Name field cannot be blank.");
          return;
        }
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await addDoc(collection(db, "employees"), {
          uid: cred.user.uid,
          name: name,
          email: email,
          status: "active",
          timestamp: serverTimestamp(),
        });
        setSuccessMsg("Registration complete! Redirecting...");
      } else {
        // Find email by userid
        const q = query(collection(db, "employees"), where("userid", "==", email));
        const querySnapshot = await getDocs(q);
        let loginEmail = email; // Fallback to what they typed if it's an email
        if (!querySnapshot.empty) {
          loginEmail = querySnapshot.docs[0].data().email;
        }
        await signInWithEmailAndPassword(auth, loginEmail, password);
        setSuccessMsg("Authentication successful. Redirecting...");
      }
      setTimeout(() => router.push("/employee/dashboard"), 1000);
    } catch (err) {
      let msg = "Authentication failed. Please try again.";
      if (err.code === 'auth/user-not-found') msg = "User does not exist.";
      else if (err.code === 'auth/wrong-password') msg = "Incorrect password.";
      else if (err.code === 'auth/invalid-email') msg = "Invalid email address.";
      else if (err.code === 'auth/invalid-credential') msg = "Invalid credentials provided.";
      else if (err.code === 'auth/email-already-in-use') msg = "Email is already in use.";
      else if (err.code === 'auth/weak-password') msg = "Password should be at least 6 characters.";
      setErrorMsg(msg);
    }
  };

  return (
    <div className="login-page">
      <div className="card login-card">
        <img src="/logo.jpeg" alt="PCA Logo" style={{ width: "80px", height: "auto", mixBlendMode: "multiply", clipPath: "inset(3%)", margin: "0 auto 16px", display: "block" }} />
        <h2 style={{ fontFamily: "var(--font-playfair), serif", fontSize: "28px", fontWeight: 700, marginBottom: "8px", color: "var(--gold)" }}>Employee Portal</h2>
        <p style={{ color: "var(--tx2)", fontSize: "14px", marginBottom: "32px" }}>
          Access your personal workspace
        </p>

        <form onSubmit={handleSubmit}>
          {isSignUp && (
            <div className="fg">
              <label>Full Employee Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                required={isSignUp}
              />
            </div>
          )}
          <div className="fg">
            <label>User ID / Email</label>
            <input
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. emp123 or name@pma.in"
              required
            />
          </div>
          <div className="fg">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          {errorMsg && (
            <div style={{ color: '#d32f2f', backgroundColor: '#ffebee', padding: '10px', borderRadius: '6px', fontSize: '13px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <IconAlertCircle size={16} />
              {errorMsg}
            </div>
          )}

          <button type="submit" className="btn btn-p" style={{ width: "100%", padding: "12px", fontSize: "15px" }}>
            {isSignUp ? (
              <><IconUserPlus size={18} /> Register Account</>
            ) : (
              <><IconLockOpen size={18} /> Secure Login</>
            )}
          </button>

          {successMsg && (
            <div style={{ color: '#2e7d32', backgroundColor: '#e8f5e9', padding: '10px', borderRadius: '6px', fontSize: '13px', marginTop: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <IconCheck size={16} />
              {successMsg}
            </div>
          )}
        </form>


        <Link
          href="/"
          style={{ display: "inline-flex", alignItems: "center", gap: "6px", marginTop: "14px", fontSize: "12px", color: "var(--tx2)", textDecoration: "none" }}
        >
          <IconArrowLeft size={16} /> Back to Homepage
        </Link>
      </div>
    </div>
  );
}
