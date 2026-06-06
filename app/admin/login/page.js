"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { IconShieldLock, IconLockOpen, IconArrowLeft, IconAlertCircle, IconCheck } from "@tabler/icons-react";

export default function AdminLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    if (email !== "admin@gmail.com") {
      setErrorMsg("Access Denied: Standard staff accounts must use the Employee Gateway.");
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, email, password);
      setSuccessMsg("Authentication successful. Redirecting to dashboard...");
      setTimeout(() => router.push("/admin/dashboard"), 1000);
    } catch (err) {
      let msg = "Authentication failed. Please try again.";
      if (err.code === 'auth/user-not-found') msg = "User does not exist.";
      else if (err.code === 'auth/wrong-password') msg = "Incorrect password.";
      else if (err.code === 'auth/invalid-email') msg = "Invalid email address.";
      else if (err.code === 'auth/invalid-credential') msg = "Invalid credentials provided.";
      setErrorMsg(msg);
    }
  };

  return (
    <div className="login-page">
      <div className="card login-card">
        <img src="/logo.jpeg" alt="PCA Logo" style={{ width: "80px", height: "auto", mixBlendMode: "multiply", clipPath: "inset(3%)", margin: "0 auto 16px", display: "block" }} />
        <h2 style={{ fontFamily: "var(--font-playfair), serif", fontSize: "28px", fontWeight: 700, marginBottom: "8px", color: "var(--gold)" }}>Admin Portal Login</h2>
        <p style={{ color: "var(--tx2)", fontSize: "14px", marginBottom: "32px" }}>
          Access structural oversight metrics controls
        </p>

        <form onSubmit={handleLogin}>
          <div className="fg">
            <label>Administrator Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email address"
              required
            />
          </div>
          <div className="fg">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
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
            <IconLockOpen size={18} /> Authenticate Controller
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
          style={{ display: "inline-flex", alignItems: "center", gap: "6px", marginTop: "20px", fontSize: "13px", color: "var(--tx2)", textDecoration: "none" }}
        >
          <IconArrowLeft size={16} /> Back to Homepage
        </Link>
      </div>
    </div>
  );
}
