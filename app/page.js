"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import styles from "./page.module.css";
import {
  IconArrowRight,
  IconUsers,
  IconShieldCheck,
} from "@tabler/icons-react";

export default function Home() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate initial loading time
    const timer = setTimeout(() => {
      setLoading(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className={styles.loaderOverlay}>
        <img
          src="/logo.jpeg"
          alt="PCA Logo Loading"
          className={styles.loaderLogo}
        />
        <div className={styles.loaderSpinner}></div>
      </div>
    );
  }
  return (
    <div className={styles.main}>
      {/* Navigation */}
      <nav className={styles.nav}>
        <div className={styles.brand}>
          <div className={styles.brandLogo}>
            <img src="/logo.jpeg" alt="PCA Logo" style={{ width: "64px", height: "auto", mixBlendMode: "multiply", clipPath: "inset(3%)" }} />
          </div>
          <div className={styles.brandText} style={{ display: 'flex', flexDirection: 'column' }}>
            <h1 className={styles.brandName} style={{ color: '#d4af37', margin: 0, fontSize: '28px', lineHeight: 1 }}>Prabha</h1>
            <p className={styles.brandSlogan} style={{ margin: 0, marginTop: '2px', fontSize: '13px', color: '#666', textTransform: 'uppercase', letterSpacing: '1px' }}>Food Industries</p>
          </div>
        </div>

      </nav>


      {/* Portals Section */}
      <section className={styles.portalsSection}>
        <h2 className={styles.sectionTitle}>Choose Your Portal</h2>
        <div className={styles.portalsGrid}>
          <Link href="/employee/login" className={styles.portalCard}>
            <div className={styles.portalIcon}><IconUsers size={32} /></div>
            <div>
              <div className={styles.portalTitle}>Employee Login</div>
              <div className={styles.portalDesc}>
                Access your tasks, updates, and performance insights.
              </div>
              <div className={styles.portalBtn}>Login <IconArrowRight size={14} /></div>
            </div>
          </Link>
          <Link href="/admin/login" className={styles.portalCard}>
            <div className={styles.portalIcon}><IconShieldCheck size={32} /></div>
            <div>
              <div className={styles.portalTitle}>Admin/Staff Login</div>
              <div className={styles.portalDesc}>
                Manage operations, teams, and factory performance.
              </div>
              <div className={styles.portalBtn}>Login <IconArrowRight size={14} /></div>
            </div>
          </Link>
        </div>
      </section>


    </div>
  );
}
