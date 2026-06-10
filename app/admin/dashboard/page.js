"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase, supabaseAdminAuth } from "@/lib/supabase";
import styles from "./dashboard.module.css";
import {
  IconShield,
  IconLayoutDashboard,
  IconUsers,
  IconClockCheck,
  IconPhoneCall,
  IconClock,
  IconBuildingStore,
  IconFileReport,
  IconTarget,
  IconTrophy,
  IconLogout,
  IconX,
  IconEdit,
  IconTrash,
  IconMenu2,
  IconListCheck,
} from "@tabler/icons-react";

const getLocalToday = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().split("T")[0];
};

export default function AdminDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [metricsMatrix, setMetricsMatrix] = useState([]);
  const [callsSnap, setCallsSnap] = useState(null);
  const [shopsSnap, setShopsSnap] = useState(null);
  const [repsSnap, setRepsSnap] = useState(null);
  const [attSnap, setAttSnap] = useState(null);

  const [showAddEmployee, setShowAddEmployee] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [newEmp, setNewEmp] = useState({
    name: "",
    email: "",
    phone: "",
    status: "active",
    userid: "",
    password: ""
  });
  const [empFilterSearch, setEmpFilterSearch] = useState("");
  const [attFilterFrom, setAttFilterFrom] = useState(getLocalToday());
  const [attFilterTo, setAttFilterTo] = useState(getLocalToday());
  const [attFilterSearch, setAttFilterSearch] = useState("");
  const [callFilterFrom, setCallFilterFrom] = useState(getLocalToday());
  const [callFilterTo, setCallFilterTo] = useState(getLocalToday());
  const [callFilterSearch, setCallFilterSearch] = useState("");
  const [expandedEmp, setExpandedEmp] = useState({});
  const [shopFilterFrom, setShopFilterFrom] = useState(getLocalToday());
  const [shopFilterTo, setShopFilterTo] = useState(getLocalToday());
  const [shopFilterSearch, setShopFilterSearch] = useState("");
  const [expandedShopEmp, setExpandedShopEmp] = useState({});
  const [repFilterFrom, setRepFilterFrom] = useState(getLocalToday());
  const [repFilterTo, setRepFilterTo] = useState(getLocalToday());
  const [repFilterSearch, setRepFilterSearch] = useState("");
  const [expandedRepEmp, setExpandedRepEmp] = useState({});
  const [chartEmpFilter, setChartEmpFilter] = useState("all");
  const [employeesSnap, setEmployeesSnap] = useState([]);
  const [dashFilterType, setDashFilterType] = useState("all");
  const [dashFilterFrom, setDashFilterFrom] = useState(getLocalToday());
  const [dashFilterTo, setDashFilterTo] = useState(getLocalToday());

  const [leaderFilterType, setLeaderFilterType] = useState("all");
  const [leaderFilterFrom, setLeaderFilterFrom] = useState(getLocalToday());
  const [leaderFilterTo, setLeaderFilterTo] = useState(getLocalToday());

  useEffect(() => {
    const fetchSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || session.user.email !== "admin@gmail.com") {
        router.push("/admin/login");
      } else {
        fetchData();
      }
    };
    fetchSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session || session.user.email !== "admin@gmail.com") {
        router.push("/admin/login");
      } else {
        fetchData();
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, [router]);

  const fetchData = async () => {
    try {
      const [empRes, attRes, callsRes, shopsRes, repsRes] = await Promise.all([
        supabase.from('employees').select('*'),
        supabase.from('attendance').select('*'),
        supabase.from('calls').select('*'),
        supabase.from('shops').select('*'),
        supabase.from('reports').select('*')
      ]);

      const mapCalls = callsRes.data?.map(d => ({ ...d, customerName: d.customer_name, phoneNumber: d.phone_number, durationMinutes: d.duration_minutes, loggedBy: d.logged_by?.toLowerCase(), timestamp: d.created_at ? { seconds: new Date(d.created_at).getTime() / 1000 } : null })) || [];
      const mapShops = shopsRes.data?.map(d => ({ ...d, shopName: d.shop_name, productDetail: d.product_detail, imageUrl: d.image_url, loggedBy: d.logged_by?.toLowerCase(), timestamp: d.created_at ? { seconds: new Date(d.created_at).getTime() / 1000 } : null })) || [];
      const mapReps = repsRes.data?.map(d => ({ ...d, totalSalesAmount: d.total_sales_amount, loggedBy: d.logged_by?.toLowerCase(), timestamp: d.created_at ? { seconds: new Date(d.created_at).getTime() / 1000 } : null })) || [];
      const mapAtt = attRes.data?.map(d => ({ ...d, employeeName: d.employee_name, inPhotoUrl: d.in_photo_url, outPhotoUrl: d.out_photo_url, email: d.email?.toLowerCase(), in: d.in_time ? { seconds: new Date(d.in_time).getTime() / 1000 } : null, out: d.out_time ? { seconds: new Date(d.out_time).getTime() / 1000 } : null, timestamp: d.created_at ? { seconds: new Date(d.created_at).getTime() / 1000 } : null })) || [];
      const empData = empRes.data?.map(d => ({ ...d, email: d.email?.toLowerCase() })) || [];

      setEmployeesSnap(empData);
      setAttSnap(mapAtt.map(d => ({ id: d.id, data: () => d })));
      setCallsSnap(mapCalls.map(d => ({ id: d.id, data: () => d })));
      setShopsSnap(mapShops.map(d => ({ id: d.id, data: () => d })));
      setRepsSnap(mapReps.map(d => ({ id: d.id, data: () => d })));

      const metricsMap = {};

      empData.forEach((data) => {
        if (data.role === "admin" || data.email === "admin@gmail.com") return;

        metricsMap[data.email] = {
          id: data.id,
          name: data.name || data.email.split("@")[0],
          email: data.email,
          userid: data.userid || "—",
          phone: data.phone || "",
          password: data.password || "",
          init: data.name ? data.name.substring(0, 2).toUpperCase() : "EM",
          status: data.status || "active",
          attCount: 0,
          attPts: 0,
          callCount: 0,
          callPts: 0,
          shopCount: 0,
          shopPts: 0,
          reportCount: 0,
          reportPts: 0,
          totalPoints: 0,
        };
      });

      mapAtt.forEach((d) => {
        if (metricsMap[d.email]) {
          metricsMap[d.email].attCount++;
          metricsMap[d.email].attPts += (d.points || 0);
        }
      });

      const callsByEmailAndDate = {};
      mapCalls.forEach((d) => {
        if (d.loggedBy && metricsMap[d.loggedBy]) {
          metricsMap[d.loggedBy].callCount++;
          if (!callsByEmailAndDate[d.loggedBy]) callsByEmailAndDate[d.loggedBy] = {};
          if (d.timestamp && d.timestamp.seconds) {
            const dt = new Date(d.timestamp.seconds * 1000);
            dt.setMinutes(dt.getMinutes() - dt.getTimezoneOffset());
            const dateStr = dt.toISOString().split("T")[0];
            callsByEmailAndDate[d.loggedBy][dateStr] = (callsByEmailAndDate[d.loggedBy][dateStr] || 0) + 1;
          }
        }
      });
      Object.keys(metricsMap).forEach((email) => {
        let pts = 0;
        const dailyCounts = callsByEmailAndDate[email] || {};
        for (const date in dailyCounts) {
          if (dailyCounts[date] >= 20) pts += 5;
          else if (dailyCounts[date] >= 16) pts += 3;
        }
        metricsMap[email].callPts = pts;
      });

      const getSalaryMonthRangeStr = () => {
        const d = new Date();
        d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
        let startYear = d.getFullYear();
        let startMonth = d.getMonth();
        if (d.getDate() < 11) {
          startMonth -= 1;
          if (startMonth < 0) {
            startMonth = 11;
            startYear -= 1;
          }
        }
        let endMonth = startMonth + 1;
        let endYear = startYear;
        if (endMonth > 11) {
          endMonth = 0;
          endYear += 1;
        }
        const startStr = `${startYear}-${String(startMonth + 1).padStart(2, '0')}-11`;
        const endStr = `${endYear}-${String(endMonth + 1).padStart(2, '0')}-10`;
        return { startStr, endStr };
      };

      const { startStr: currentMonthStart, endStr: currentMonthEnd } = getSalaryMonthRangeStr();

      mapShops.forEach((d) => {
        if (d.loggedBy && metricsMap[d.loggedBy] && d.status === "verified") {
          const dt = d.timestamp ? new Date(d.timestamp.seconds * 1000) : new Date();
          dt.setMinutes(dt.getMinutes() - dt.getTimezoneOffset());
          const dateStr = dt.toISOString().split("T")[0];
          if (dateStr >= currentMonthStart && dateStr <= currentMonthEnd) {
            metricsMap[d.loggedBy].shopCount++;
          }
        }
      });
      Object.keys(metricsMap).forEach((email) => {
        metricsMap[email].shopPts = Math.floor(metricsMap[email].shopCount / 100) * 50;
      });

      mapReps.forEach((d) => {
        if (d.loggedBy && metricsMap[d.loggedBy]) {
          metricsMap[d.loggedBy].reportCount++;
          if (d.status === "approved") {
            if (d.type === "weekly") metricsMap[d.loggedBy].reportPts += 15;
          }
        }
      });

      const finalLeaderboard = Object.values(metricsMap).map((emp) => {
        emp.totalPoints =
          emp.callPts +
          emp.shopPts +
          emp.reportPts;
        return emp;
      });

      setMetricsMatrix(finalLeaderboard.sort((a, b) => b.totalPoints - a.totalPoints));
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const handleAddEmployee = async (e) => {
    e.preventDefault();
    try {
      if (editId) {
        const { error } = await supabase.from('employees').update({
          name: newEmp.name,
          email: newEmp.email,
          phone: newEmp.phone,
          status: newEmp.status,
          userid: newEmp.userid,
          password: newEmp.password,
        }).eq('id', editId);
        if (error) throw error;
        alert("Employee updated successfully!");
      } else {
        const { data: authData, error: authError } = await supabaseAdminAuth.auth.signUp({
          email: newEmp.email,
          password: newEmp.password,
        });
        
        if (authError) throw authError;

        const { error } = await supabase.from('employees').insert([{
          auth_user_id: authData?.user?.id,
          name: newEmp.name,
          email: newEmp.email,
          phone: newEmp.phone,
          status: newEmp.status,
          userid: newEmp.userid,
          password: newEmp.password,
          role: "employee",
        }]);
        if (error) throw error;
        alert("Employee added successfully!");
      }

      setShowAddEmployee(false);
      setEditId(null);
      setNewEmp({ name: "", email: "", phone: "", status: "active", userid: "", password: "" });
      fetchData();
    } catch (err) {
      alert("Error saving employee: " + err.message);
    }
  };

  const handleDeleteEmployee = async (id) => {
    if (window.confirm("Are you sure you want to delete this employee?")) {
      try {
        const { error } = await supabase.from('employees').delete().eq('id', id);
        if (error) throw error;
        fetchData();
        alert("Employee deleted successfully.");
      } catch (err) {
        alert("Error deleting employee: " + err.message);
      }
    }
  };

  const handleEditEmployee = (emp) => {
    setNewEmp({
      name: emp.name,
      email: emp.email,
      phone: emp.phone,
      status: emp.status,
      userid: emp.userid === "—" ? "" : emp.userid,
      password: emp.password,
    });
    setEditId(emp.id);
    setShowAddEmployee(true);
  };

  const renderDashboard = () => {
    const today = new Date();
    today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
    const todayStr = today.toISOString().split("T")[0];

    let fromDate = null;
    let toDate = null;

    if (dashFilterType === "today") { fromDate = todayStr; toDate = todayStr; }
    else if (dashFilterType === "yesterday") {
      const y = new Date(today);
      y.setDate(y.getDate() - 1);
      const yStr = y.toISOString().split("T")[0];
      fromDate = yStr; toDate = yStr;
    } else if (dashFilterType === "week") {
      const start = new Date(today);
      start.setDate(start.getDate() - start.getDay());
      fromDate = start.toISOString().split("T")[0];
      toDate = todayStr;
    } else if (dashFilterType === "month") {
      let startYear = today.getFullYear();
      let startMonth = today.getMonth();
      if (today.getDate() < 11) {
        startMonth -= 1;
        if (startMonth < 0) {
          startMonth = 11;
          startYear -= 1;
        }
      }
      fromDate = `${startYear}-${String(startMonth + 1).padStart(2, '0')}-11`;
      
      let endMonth = startMonth + 1;
      let endYear = startYear;
      if (endMonth > 11) {
        endMonth = 0;
        endYear += 1;
      }
      toDate = `${endYear}-${String(endMonth + 1).padStart(2, '0')}-10`;
    } else if (dashFilterType === "year") {
      const start = new Date(today.getFullYear(), 0, 1);
      start.setMinutes(start.getMinutes() - start.getTimezoneOffset());
      fromDate = start.toISOString().split("T")[0];
      toDate = todayStr;
    } else if (dashFilterType === "custom") {
      fromDate = dashFilterFrom;
      toDate = dashFilterTo;
    }

    const isWithinRange = (timestamp) => {
      if (dashFilterType === "all") return true;
      if (!timestamp || !timestamp.seconds) return false;
      const dt = new Date(timestamp.seconds * 1000);
      dt.setMinutes(dt.getMinutes() - dt.getTimezoneOffset());
      const dateStr = dt.toISOString().split("T")[0];
      return dateStr >= fromDate && dateStr <= toDate;
    };

    const dMetricsMap = {};
    employeesSnap.forEach((data) => {
      if (data.role === "admin" || data.email === "admin@gmail.com") return;
      dMetricsMap[data.email] = {
        name: data.name || data.email.split("@")[0],
        email: data.email,
        init: data.name ? data.name.substring(0, 2).toUpperCase() : "EM",
        callCount: 0,
        callPts: 0,
        shopCount: 0,
        shopPts: 0,
        reportCount: 0,
        reportPts: 0,
        totalPoints: 0,
      };
    });

    let totalCalls = 0;
    let chartCalls = 0;
    const callsByEmailAndDate = {};
    if (callsSnap) {
      callsSnap.forEach(doc => {
        const d = doc.data();
        if (d.loggedBy !== "admin@gmail.com" && isWithinRange(d.timestamp)) {
          totalCalls++;
          if (chartEmpFilter === "all" || d.loggedBy === chartEmpFilter) chartCalls++;
          
          if (d.loggedBy && dMetricsMap[d.loggedBy]) {
             dMetricsMap[d.loggedBy].callCount++;
             if (!callsByEmailAndDate[d.loggedBy]) callsByEmailAndDate[d.loggedBy] = {};
             const dt = new Date(d.timestamp.seconds * 1000);
             dt.setMinutes(dt.getMinutes() - dt.getTimezoneOffset());
             const dStr = dt.toISOString().split("T")[0];
             callsByEmailAndDate[d.loggedBy][dStr] = (callsByEmailAndDate[d.loggedBy][dStr] || 0) + 1;
          }
        }
      });
    }

    Object.keys(dMetricsMap).forEach((email) => {
      let pts = 0;
      const dailyCounts = callsByEmailAndDate[email] || {};
      for (const date in dailyCounts) {
        if (dailyCounts[date] >= 20) pts += 5;
        else if (dailyCounts[date] >= 16) pts += 3;
      }
      dMetricsMap[email].callPts = pts;
    });

    let verifiedShops = 0;
    let totalShops = 0;
    let chartShops = 0;
    if (shopsSnap) {
      shopsSnap.forEach(doc => {
        const d = doc.data();
        if (isWithinRange(d.timestamp)) {
          totalShops++;
          if (d.status === 'verified') {
            verifiedShops++;
            if (chartEmpFilter === "all" || d.loggedBy === chartEmpFilter) chartShops++;
            if (d.loggedBy && dMetricsMap[d.loggedBy]) {
              dMetricsMap[d.loggedBy].shopCount++;
            }
          }
        }
      });
    }
    Object.keys(dMetricsMap).forEach((email) => {
      dMetricsMap[email].shopPts = Math.floor(dMetricsMap[email].shopCount / 100) * 50;
    });

    let approvedReports = 0;
    let totalReports = 0;
    let chartReports = 0;
    if (repsSnap) {
      repsSnap.forEach(doc => {
        const d = doc.data();
        if (isWithinRange(d.timestamp)) {
          totalReports++;
          if (d.status === 'approved') {
            approvedReports++;
            if (chartEmpFilter === "all" || d.loggedBy === chartEmpFilter) chartReports++;
            if (d.loggedBy && dMetricsMap[d.loggedBy]) {
              dMetricsMap[d.loggedBy].reportCount++;
              if (d.type === "weekly") dMetricsMap[d.loggedBy].reportPts += 15;
            }
          }
        }
      });
    }

    const dashLeaderboard = Object.values(dMetricsMap).map((emp) => {
      emp.totalPoints = emp.callPts + emp.shopPts + emp.reportPts;
      return emp;
    }).sort((a, b) => b.totalPoints - a.totalPoints);

    const totalChartActivity = chartCalls + chartShops + chartReports;
    let chartInsight = "No activity recorded.";
    if (totalChartActivity > 0) {
      if (chartCalls > chartShops && chartCalls > chartReports) {
        chartInsight = `Primary focus is on Productive Calls (${Math.round(chartCalls/totalChartActivity*100)}% of activity).`;
      } else if (chartShops > chartCalls && chartShops > chartReports) {
        chartInsight = `Strong emphasis on new Shop Registrations (${Math.round(chartShops/totalChartActivity*100)}% of activity).`;
      } else if (chartReports > chartCalls && chartReports > chartShops) {
        chartInsight = `High volume of Reporting activity (${Math.round(chartReports/totalChartActivity*100)}% of activity).`;
      } else {
        chartInsight = `Activity is balanced across multiple areas.`;
      }
    }

    const totalPoints = dashLeaderboard.reduce((acc, emp) => acc + (emp.totalPoints || 0), 0);
    const avgPoints = dashLeaderboard.length > 0 ? Math.round(totalPoints / dashLeaderboard.length) : 0;

    let recentActivities = [];
    if (callsSnap) {
      callsSnap.forEach(doc => {
        const d = doc.data();
        if (d.loggedBy !== "admin@gmail.com" && d.timestamp && isWithinRange(d.timestamp)) {
          recentActivities.push({ type: 'call', text: `New call to ${d.phoneNumber}`, subtext: `By ${d.loggedBy}`, time: d.timestamp.seconds, icon: <IconPhoneCall size={20}/>, colorClass: styles.dark });
        }
      });
    }
    if (shopsSnap) {
      shopsSnap.forEach(doc => {
        const d = doc.data();
        if (d.timestamp && isWithinRange(d.timestamp)) {
          recentActivities.push({ type: 'shop', text: `Shop ${d.status === 'verified' ? 'Verified' : 'Registered'}`, subtext: d.shopName, time: d.timestamp.seconds, icon: <IconBuildingStore size={20}/>, colorClass: d.status === 'verified' ? styles.green : styles.yellow });
        }
      });
    }
    if (repsSnap) {
      repsSnap.forEach(doc => {
        const d = doc.data();
        if (d.timestamp && isWithinRange(d.timestamp)) {
          recentActivities.push({ type: 'report', text: `Report ${d.status === 'approved' ? 'Approved' : 'Submitted'}`, subtext: d.title, time: d.timestamp.seconds, icon: <IconFileReport size={20}/>, colorClass: d.status === 'approved' ? styles.green : styles.brown });
        }
      });
    }
    recentActivities.sort((a,b) => b.time - a.time);
    const topNotifs = recentActivities.slice(0, 3);

    const formatTimeAgo = (seconds) => {
      const diff = Math.floor(Date.now()/1000) - seconds;
      if (diff < 60) return diff + "s ago";
      if (diff < 3600) return Math.floor(diff/60) + "m ago";
      if (diff < 86400) return Math.floor(diff/3600) + "h ago";
      return Math.floor(diff/86400) + "d ago";
    };

    return (
    <div className={styles.overviewContainer} style={{ margin: "-28px", borderRadius: "0 0 16px 0" }}>
      {/* Top Bar Area */}
      <div className={styles.topBar}>
        <div>
          <h2 className={styles.greeting}>{new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 18 ? 'Good afternoon' : 'Good evening'}, Admin! 👋</h2>
          <p className={styles.subtitle}>Here's the live breakdown of your field team's metrics today.</p>
        </div>
        <div className={styles.actions} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <select 
            value={dashFilterType} 
            onChange={(e) => setDashFilterType(e.target.value)} 
            style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid var(--bdr)", background: "#fff", fontWeight: 600, color: "var(--tx)", outline: "none", cursor: "pointer", height: "38px" }}
          >
            <option value="all">Overall (All Time)</option>
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="year">This Year</option>
            <option value="custom">Custom Date Range</option>
          </select>
          {dashFilterType === "custom" && (
            <div style={{ display: 'flex', gap: '8px' }}>
              <input type="date" value={dashFilterFrom} onChange={(e) => setDashFilterFrom(e.target.value)} style={{ padding: "8px", borderRadius: "8px", border: "1px solid var(--bdr)", background: "#fff", height: "38px", outline: "none", color: "var(--tx)" }} />
              <input type="date" value={dashFilterTo} onChange={(e) => setDashFilterTo(e.target.value)} style={{ padding: "8px", borderRadius: "8px", border: "1px solid var(--bdr)", background: "#fff", height: "38px", outline: "none", color: "var(--tx)" }} />
            </div>
          )}
        </div>
      </div>

      {/* Top Stats */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={`${styles.iconCircle} ${styles.orange}`}><IconUsers size={28} /></div>
          <div>
            <div className={styles.statTitle}>Total Employees</div>
            <div className={styles.statValue}>{dashLeaderboard.length}</div>
            <div className={styles.statTrend}>↑ Active Team</div>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={`${styles.iconCircle} ${styles.green}`}><IconPhoneCall size={28} /></div>
          <div>
            <div className={styles.statTitle}>Total Tracked Calls</div>
            <div className={styles.statValue}>{totalCalls}</div>
            <div className={styles.statTrend}>↑ Field Activity</div>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={`${styles.iconCircle} ${styles.brown}`}><IconBuildingStore size={28} /></div>
          <div>
            <div className={styles.statTitle}>Verified Shops</div>
            <div className={styles.statValue}>{verifiedShops}</div>
            <div className={styles.statTrend}>↑ Out of {totalShops} registered</div>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={`${styles.iconCircle} ${styles.yellow}`}><IconTarget size={28} /></div>
          <div>
            <div className={styles.statTitle}>Total Points Issued</div>
            <div className={styles.statValue}>{totalPoints}</div>
            <div className={styles.statTrend}>↑ Avg {avgPoints} per employee</div>
          </div>
        </div>
      </div>

      {/* Middle Grid (Charts) */}
      <div className={styles.middleGrid}>
        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <div className={styles.chartTitle}>Top Performing Field Operators</div>
          </div>
          <table className={styles.table}>
            <thead>
              <tr><th>Rank</th><th>Employee</th><th>Total Points</th><th>Productive Calls</th><th>Verified Shops</th></tr>
            </thead>
            <tbody>
              {dashLeaderboard.slice(0, 4).map((emp, i) => (
                <tr key={i}>
                  <td>
                    <div className={`${styles.rankBadge} ${i === 0 ? styles.gold : i === 1 ? styles.silver : i === 2 ? styles.bronze : ""}`}>
                      {i + 1}
                    </div>
                  </td>
                  <td>
                    <div className={styles.empCell}>
                      <div className={styles.empAvatar}>{emp.init}</div>
                      <div>
                        <b>{emp.name}</b><br/>
                        <span style={{ fontSize: "11px", color: "#8d6e63" }}>Field Agent</span>
                      </div>
                    </div>
                  </td>
                  <td style={{ color: "#388e3c", fontWeight: "600" }}>{emp.totalPoints || 0} pts</td>
                  <td>{emp.callCount || 0}</td>
                  <td>{emp.shopCount || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className={styles.chartCard}>
          <div className={styles.chartHeader} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div className={styles.chartTitle}>Activity Breakdown</div>
            <select 
              value={chartEmpFilter} 
              onChange={(e) => setChartEmpFilter(e.target.value)}
              style={{ padding: "4px 8px", borderRadius: "6px", border: "1px solid var(--bdr)", background: "var(--sur2)", color: "var(--tx)", fontSize: "12px", maxWidth: "120px", cursor: "pointer" }}
            >
              <option value="all">Whole Platform</option>
              {dashLeaderboard.map((emp, i) => (
                <option key={i} value={emp.email}>{emp.name}</option>
              ))}
            </select>
          </div>
          <div className={styles.donutChart}>
            <div className={styles.donutHole}>
              <span style={{ fontSize: "11px", color: "#8d6e63" }}>{chartEmpFilter === 'all' ? 'Total Logs' : 'Emp Logs'}</span>
              <span style={{ fontSize: "24px", fontWeight: "bold", color: "#3e2723" }}>{totalChartActivity}</span>
            </div>
          </div>
          <div className={styles.donutLegend}>
            <div className={styles.legendItem}><div className={styles.legendDot} style={{ background: "#5d4037" }}></div><div><b>Productive Calls</b><br/>{chartCalls}</div></div>
            <div className={styles.legendItem}><div className={styles.legendDot} style={{ background: "#a1887f" }}></div><div><b>Shop Registrations</b><br/>{chartShops}</div></div>
            <div className={styles.legendItem}><div className={styles.legendDot} style={{ background: "#e2d2c1" }}></div><div><b>Reports Filed</b><br/>{chartReports}</div></div>
          </div>
          <div style={{ marginTop: "16px", padding: "12px", background: "rgba(93, 64, 55, 0.05)", borderRadius: "8px", border: "1px solid rgba(93, 64, 55, 0.1)", fontSize: "12px", color: "#5d4037", display: "flex", alignItems: "flex-start", gap: "8px" }}>
            <IconTarget size={16} style={{ flexShrink: 0, marginTop: "2px" }} />
            <div>
              <strong>Insight:</strong> {chartInsight}
            </div>
          </div>
        </div>

      </div>

      {/* Bottom Grid */}
      <div className={styles.bottomGrid}>
        
        <div>
          <div className={styles.chartCard} style={{ marginBottom: "24px" }}>
            <div className={styles.chartHeader} style={{ marginBottom: "8px" }}>
              <div className={styles.chartTitle}>Real-time Field Operations Stream</div>
              <button style={{ background: "none", border: "none", color: "#c8972a", fontSize: "11px", cursor: "pointer" }}>Live Update</button>
            </div>
            {topNotifs.map((notif, i) => (
              <div key={i} className={styles.notifItem}>
                <div className={`${styles.notifIcon} ${notif.colorClass}`}>{notif.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "13px", fontWeight: "600", color: "#2b1c11" }}>{notif.text}</div>
                  <div style={{ fontSize: "12px", color: "#8d6e63" }}>{notif.subtext}</div>
                </div>
                <div style={{ fontSize: "11px", color: "#8d6e63" }}>{formatTimeAgo(notif.time)}</div>
              </div>
            ))}
            {topNotifs.length === 0 && <div style={{ fontSize: "13px", color: "#8d6e63", textAlign: "center", padding: "20px 0" }}>No recent activities.</div>}
          </div>

          <div className={styles.chartCard}>
            <div className={styles.chartTitle}>Today's Quick Summary</div>
            <div className={styles.quickStatsRow}>
              <div className={styles.quickStat}>
                <div className={styles.quickIcon}><IconClockCheck size={24}/></div>
                <div style={{ fontSize: "10px", color: "#8d6e63" }}>Active Employees</div>
                <div style={{ fontSize: "14px", fontWeight: "bold", color: "#2b1c11" }}>{dashLeaderboard.length}</div>
              </div>
              <div className={styles.quickStat}>
                <div className={styles.quickIcon}><IconPhoneCall size={24}/></div>
                <div style={{ fontSize: "10px", color: "#8d6e63" }}>Productive Calls</div>
                <div style={{ fontSize: "14px", fontWeight: "bold", color: "#2b1c11" }}>{totalCalls}</div>
              </div>
              <div className={styles.quickStat}>
                <div className={styles.quickIcon}><IconBuildingStore size={24}/></div>
                <div style={{ fontSize: "10px", color: "#8d6e63" }}>Shops Added</div>
                <div style={{ fontSize: "14px", fontWeight: "bold", color: "#2b1c11" }}>{totalShops}</div>
              </div>
              <div className={styles.quickStat}>
                <div className={styles.quickIcon}><IconFileReport size={24}/></div>
                <div style={{ fontSize: "10px", color: "#8d6e63" }}>Reports Due Audit</div>
                <div style={{ fontSize: "14px", fontWeight: "bold", color: "#2b1c11" }}>{totalReports - approvedReports}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};
  const renderEmployees = () => {
    const filteredEmployees = metricsMatrix.filter(emp => 
      !empFilterSearch || 
      emp.name?.toLowerCase().includes(empFilterSearch.toLowerCase()) || 
      emp.email?.toLowerCase().includes(empFilterSearch.toLowerCase()) || 
      emp.userid?.toLowerCase().includes(empFilterSearch.toLowerCase())
    );

    return (
    <>
      <div className="kg">
        <div className="kc ok"><div className="ki"><IconUsers /></div><div className="kl">Total Employees</div><div className="kv">{filteredEmployees.length}</div></div>
        <div className="kc"><div className="ki"><IconUsers /></div><div className="kl">Active Connections</div><div className="kv">{filteredEmployees.filter(e => e.status === "active").length}</div></div>
      </div>
      <div className="card">
        <div className="ctit" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
          <span>All Registered Employees</span>
          <div className="filter-row">
            <input type="text" placeholder="Search Name, Email, or ID" value={empFilterSearch} onChange={(e) => setEmpFilterSearch(e.target.value)} style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid var(--bdr)", background: "var(--sur2)", color: "var(--tx)", width: "200px" }} />
            <button className="btn btn-ok" onClick={() => setShowAddEmployee(true)}>+ Add Employee</button>
          </div>
        </div>
        
        <div className="tw">
          <table>
            <thead><tr><th>Name</th><th>User ID</th><th>Email Address</th><th>Password</th><th>Status</th><th>Action</th></tr></thead>
            <tbody>
              {filteredEmployees.length > 0 ? filteredEmployees.map((emp) => (
                <tr key={emp.email}>
                  <td><div style={{ display: "flex", alignItems: "center", gap: "8px" }}><div className="lav" style={{ width: "28px", height: "28px", fontSize: "11px" }}>{emp.init}</div><b>{emp.name}</b></div></td>
                  <td style={{ fontFamily: "var(--font-dm-mono)", color: "var(--tx2)" }}>{emp.userid}</td>
                  <td style={{ fontFamily: "var(--font-dm-mono)" }}>{emp.email}</td>
                  <td style={{ fontFamily: "var(--font-dm-mono)" }}>{emp.password || "—"}</td>
                  <td><span className={`bdg ${emp.status === "active" ? "b-ok" : "b-am"}`}>{emp.status}</span></td>
                  <td>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button className="btn" style={{ padding: "4px 8px", fontSize: "12px", background: "var(--sur2)", border: "1px solid var(--bd)", borderRadius: "6px", color: "var(--ind)" }} onClick={() => handleEditEmployee(emp)} title="Edit">
                        <IconEdit size={16} />
                      </button>
                      <button className="btn btn-no" style={{ padding: "4px 8px", fontSize: "12px" }} onClick={() => handleDeleteEmployee(emp.id)} title="Delete">
                        <IconTrash size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              )) : <tr><td colSpan="6" style={{ textAlign: "center", color: "var(--tx3)" }}>No employee records match your search.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
    );
  };

  const renderAttendance = () => {
    let filteredAttList = [];
    if (attSnap) {
      attSnap.forEach(doc => {
        const d = doc.data();
        if (d.email !== "admin@gmail.com") {
          let include = true;
          let dateStr = "";
          if (d.timestamp && d.timestamp.seconds) {
            const dt = new Date(d.timestamp.seconds * 1000);
            dt.setMinutes(dt.getMinutes() - dt.getTimezoneOffset());
            dateStr = dt.toISOString().split("T")[0];
          } else if (d.in && d.in.seconds) {
            const dt = new Date(d.in.seconds * 1000);
            dt.setMinutes(dt.getMinutes() - dt.getTimezoneOffset());
            dateStr = dt.toISOString().split("T")[0];
          }

          if (attFilterFrom && dateStr && dateStr < attFilterFrom) include = false;
          if (attFilterTo && dateStr && dateStr > attFilterTo) include = false;
          const empName = metricsMatrix.find(e => e.email === d.email)?.name || "Unknown";
          if (attFilterSearch && !d.email.toLowerCase().includes(attFilterSearch.toLowerCase()) && !empName.toLowerCase().includes(attFilterSearch.toLowerCase())) include = false;
          d.empName = empName;
          
          if (include) {
            filteredAttList.push(d);
          }
        }
      });
    }
    
    filteredAttList.sort((a,b) => {
       const tA = a.timestamp ? a.timestamp.seconds : (a.in ? a.in.seconds : 0);
       const tB = b.timestamp ? b.timestamp.seconds : (b.in ? b.in.seconds : 0);
       return tB - tA;
    });

    const uniqueEmails = new Set(filteredAttList.map(d => d.email)).size;
    const totalEmps = Math.max(metricsMatrix.length, 1);
    const attRate = Math.round((uniqueEmails / totalEmps) * 100);
    const openShifts = filteredAttList.filter(d => !d.out).length;

    return (
      <>
        <div className="kg">
          <div className="kc ok"><div className="ki"><IconClockCheck /></div><div className="kl">Logged Presences</div><div className="kv">{uniqueEmails}</div><div className="ks">Unique employees in range</div></div>
          <div className="kc gd"><div className="ki"><IconClockCheck /></div><div className="kl">Attendance Rate</div><div className="kv">{attRate}%</div><div className="ks">Of total registered</div></div>
          <div className="kc"><div className="ki"><IconClockCheck /></div><div className="kl">Active Shifts</div><div className="kv" style={{ fontSize: "18px" }}>{openShifts} Open</div><div className="ks">Not yet checked out</div></div>
        </div>
        <div className="card">
          <div className="ctit" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px", marginBottom: "16px" }}>
            <span>Attendance Log Database</span>
            <div className="filter-row">
              <input type="text" placeholder="Search Name or Email" value={attFilterSearch} onChange={(e) => setAttFilterSearch(e.target.value)} style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid var(--bdr)", background: "var(--sur2)", color: "var(--tx)", width: "150px" }} />
              <input type="date" value={attFilterFrom} onChange={(e) => setAttFilterFrom(e.target.value)} style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid var(--bdr)", background: "var(--sur2)", color: "var(--tx)" }} title="From Date" />
              <input type="date" value={attFilterTo} onChange={(e) => setAttFilterTo(e.target.value)} style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid var(--bdr)", background: "var(--sur2)", color: "var(--tx)" }} title="To Date" />
            </div>
          </div>
          <div className="tw">
            <table>
              <thead><tr><th>Date</th><th>Employee Name</th><th>Employee Email</th><th>Check In Time</th><th>In Photo</th><th>Check Out Time</th><th>Out Photo</th><th>Status</th></tr></thead>
              <tbody>
                {filteredAttList.length > 0 ? filteredAttList.map((d, i) => {
                  let dStr = "—";
                  if (d.in && d.in.seconds) {
                    dStr = new Date(d.in.seconds * 1000).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" });
                  } else if (d.timestamp && d.timestamp.seconds) {
                    dStr = new Date(d.timestamp.seconds * 1000).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" });
                  }
                  return (
                    <tr key={i}>
                      <td style={{ fontSize: "13px", color: "var(--tx2)" }}>{dStr}</td>
                      <td><b>{d.empName || "Unknown"}</b></td><td style={{ fontFamily: "var(--font-dm-mono)" }}>{d.email}</td>
                      <td style={{ fontFamily: "var(--font-dm-mono)", color: "var(--ind-md)", fontWeight: 600 }}>{d.in ? new Date(d.in.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "—"}</td>
                      <td>
                        {d.inPhotoUrl ? (
                          <a href={d.inPhotoUrl} target="_blank" rel="noopener noreferrer">
                            <img src={d.inPhotoUrl} alt="In" style={{ width: "40px", height: "40px", objectFit: "cover", borderRadius: "6px", border: "1px solid var(--bdr)" }} />
                          </a>
                        ) : "—"}
                      </td>
                      <td style={{ fontFamily: "var(--font-dm-mono)", color: "var(--no)", fontWeight: 600 }}>{d.out ? new Date(d.out.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "—"}</td>
                      <td>
                        {d.outPhotoUrl ? (
                          <a href={d.outPhotoUrl} target="_blank" rel="noopener noreferrer">
                            <img src={d.outPhotoUrl} alt="Out" style={{ width: "40px", height: "40px", objectFit: "cover", borderRadius: "6px", border: "1px solid var(--bdr)" }} />
                          </a>
                        ) : "—"}
                      </td>
                      <td><span className={`bdg ${d.out ? 'b-am' : 'b-ok'}`}>{d.out ? 'Shift Closed' : 'Active Duty'}</span></td>
                    </tr>
                  );
                }) : <tr><td colSpan="8" style={{ textAlign: "center", color: "var(--tx3)" }}>No logs found for criteria.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </>
    );
  };

  const renderCalls = () => {
    let filteredCallList = [];
    if (callsSnap) {
      callsSnap.forEach(doc => {
        const d = doc.data();
        if (d.loggedBy !== "admin@gmail.com") {
          let include = true;
          let dateStr = "";
          if (d.timestamp && d.timestamp.seconds) {
            const dt = new Date(d.timestamp.seconds * 1000);
            dt.setMinutes(dt.getMinutes() - dt.getTimezoneOffset());
            dateStr = dt.toISOString().split("T")[0];
          }

          const empName = metricsMatrix.find(e => e.email === d.loggedBy)?.name || "Unknown";
          d.empName = empName;
          d.dateStr = dateStr;

          if (callFilterFrom && dateStr && dateStr < callFilterFrom) include = false;
          if (callFilterTo && dateStr && dateStr > callFilterTo) include = false;
          if (callFilterSearch && !d.loggedBy.toLowerCase().includes(callFilterSearch.toLowerCase()) && !empName.toLowerCase().includes(callFilterSearch.toLowerCase())) include = false;
          
          if (include) {
            filteredCallList.push(d);
          }
        }
      });
    }

    filteredCallList.sort((a,b) => {
       const tA = a.timestamp ? a.timestamp.seconds : 0;
       const tB = b.timestamp ? b.timestamp.seconds : 0;
       return tB - tA;
    });

    const callsByEmp = {};
    let totalDur = 0;
    filteredCallList.forEach(c => {
      const eName = c.empName;
      if (!callsByEmp[eName]) callsByEmp[eName] = [];
      callsByEmp[eName].push(c);
    });

    const uniqueEmps = Object.keys(callsByEmp).length;

    const toggleEmp = (eName) => {
      setExpandedEmp(prev => ({ ...prev, [eName]: !prev[eName] }));
    };

    return (
      <>
        <div className="kg">
          <div className="kc gd"><div className="ki"><IconPhoneCall /></div><div className="kl">Total Productive Calls</div><div className="kv">{filteredCallList.length}</div><div className="ks">In selected range</div></div>
          <div className="kc ok"><div className="ki"><IconUsers /></div><div className="kl">Unique Agents</div><div className="kv" style={{ fontSize: "28px" }}>{uniqueEmps}</div><div className="ks">Employees who logged beats</div></div>
        </div>
        <div className="card">
          <div className="ctit" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px", marginBottom: "16px" }}>
            <span>Cross-Department Real-Time Productive Calls Pipeline</span>
            <div className="filter-row">
              <input type="text" placeholder="Search Name or Email" value={callFilterSearch} onChange={(e) => setCallFilterSearch(e.target.value)} style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid var(--bdr)", background: "var(--sur2)", color: "var(--tx)", width: "150px" }} />
              <input type="date" value={callFilterFrom} onChange={(e) => setCallFilterFrom(e.target.value)} style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid var(--bdr)", background: "var(--sur2)", color: "var(--tx)" }} title="From Date" />
              <input type="date" value={callFilterTo} onChange={(e) => setCallFilterTo(e.target.value)} style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid var(--bdr)", background: "var(--sur2)", color: "var(--tx)" }} title="To Date" />
            </div>
          </div>
          <div className="tw">
            <table>
              <thead><tr><th>Date</th><th>Employee Email</th><th>Beat (Area)</th><th>Shop Name</th><th>Shop Location</th><th>Total Sales</th></tr></thead>
              <tbody>
                {Object.keys(callsByEmp).length > 0 ? (
                  Object.keys(callsByEmp).map((eName, i) => (
                    <React.Fragment key={i}>
                      <tr onClick={() => toggleEmp(eName)} style={{ cursor: "pointer", background: "var(--sur2)" }}>
                        <td><b>{eName}</b></td>
                        <td colSpan="4"><b>{callsByEmp[eName].length} Productive Calls Logged</b></td>
                        <td style={{ textAlign: "right" }}>{expandedEmp[eName] ? "▼" : "▲"}</td>
                      </tr>
                      {expandedEmp[eName] && (() => {
                        const groupedByBeat = {};
                        callsByEmp[eName].forEach(c => {
                          const beat = c.customerName || "Unknown Beat";
                          if (!groupedByBeat[beat]) groupedByBeat[beat] = [];
                          groupedByBeat[beat].push(c);
                        });

                        return Object.keys(groupedByBeat).map((beat, bIdx) => (
                          <React.Fragment key={`${eName}-beat-${bIdx}`}>
                            <tr style={{ background: "var(--sur)" }}>
                              <td style={{ paddingLeft: "30px", fontSize: "13px", color: "var(--tx2)" }}>—</td>
                              <td colSpan="4" style={{ color: "var(--ind)", fontWeight: 600 }}>📍 Beat: {beat}</td>
                              <td style={{ fontWeight: 600, color: "var(--tx)" }}>{groupedByBeat[beat][0]?.notes || "—"}</td>
                            </tr>
                            {groupedByBeat[beat].map((d, j) => {
                              let dStr = "—";
                              if (d.timestamp && d.timestamp.seconds) {
                                dStr = new Date(d.timestamp.seconds * 1000).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" });
                              }
                              return (
                                <tr key={`${eName}-beat-${bIdx}-${j}`} style={{ background: "transparent" }}>
                                  <td style={{ fontSize: "13px", color: "var(--tx2)", paddingLeft: "30px" }}>{dStr}</td>
                                  <td style={{ fontFamily: "var(--font-dm-mono)" }}>{d.loggedBy}</td>
                                  <td style={{ color: "var(--tx3)", fontSize: "12px", paddingLeft: "20px" }}>↳ Shop</td>
                                  <td><span className="bdg b-ok">{d.status}</span></td>
                                  <td style={{ fontFamily: "var(--font-dm-mono)" }}>{d.phoneNumber}</td>
                                  <td style={{ color: "var(--tx3)" }}>—</td>
                                </tr>
                              );
                            })}
                          </React.Fragment>
                        ));
                      })()}
                    </React.Fragment>
                  ))
                ) : (
                  <tr><td colSpan="6" style={{ textAlign: "center", color: "var(--tx3)" }}>No productive calls available.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </>
    );
  };

  const handleRejectShop = async (id) => {
    try {
      await supabase.from('shops').update({ status: "rejected" }).eq('id', id);
      fetchData();
    } catch (e) { console.error(e); }
  };
  const handleVerifyShop = async (id) => {
    try {
      await supabase.from('shops').update({ status: "verified" }).eq('id', id);
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const renderShops = () => {
    let filteredShopList = [];
    let pendingCount = 0;
    let verifiedCount = 0;

    if (shopsSnap) {
      shopsSnap.forEach(doc => {
        const d = doc.data();
        d.id = doc.id;
        
        let include = true;
        let dateStr = "";
        if (d.timestamp && d.timestamp.seconds) {
          const dt = new Date(d.timestamp.seconds * 1000);
          dt.setMinutes(dt.getMinutes() - dt.getTimezoneOffset());
          dateStr = dt.toISOString().split("T")[0];
        }

        const empName = metricsMatrix.find(e => e.email === d.loggedBy)?.name || (d.loggedBy ? d.loggedBy.split('@')[0] : "Unknown");
        d.empName = empName;
        d.dateStr = dateStr;

        if (shopFilterFrom && dateStr && dateStr < shopFilterFrom) include = false;
        if (shopFilterTo && dateStr && dateStr > shopFilterTo) include = false;
        if (shopFilterSearch && !d.shopName?.toLowerCase().includes(shopFilterSearch.toLowerCase()) && !empName.toLowerCase().includes(shopFilterSearch.toLowerCase())) include = false;
        
        if (include) {
          filteredShopList.push(d);
          if (d.status === "verified") verifiedCount++;
          else pendingCount++;
        }
      });
    }

    filteredShopList.sort((a,b) => {
       const tA = a.timestamp ? a.timestamp.seconds : 0;
       const tB = b.timestamp ? b.timestamp.seconds : 0;
       return tB - tA;
    });

    const shopsByEmp = {};
    filteredShopList.forEach(c => {
      const eName = c.empName;
      if (!shopsByEmp[eName]) shopsByEmp[eName] = [];
      shopsByEmp[eName].push(c);
    });

    const uniqueEmps = Object.keys(shopsByEmp).length;

    const toggleShopEmp = (eName) => {
      setExpandedShopEmp(prev => ({ ...prev, [eName]: !prev[eName] }));
    };

    return (
      <>
        <div className="kg">
          <div className="kc gd"><div className="ki"><IconBuildingStore /></div><div className="kl">Total Shops</div><div className="kv">{filteredShopList.length}</div><div className="ks">In selected range</div></div>
          <div className="kc ok" style={{ position: "relative", overflow: "hidden" }}>
            <div className="ki"><IconShield /></div>
            <div className="kl">Verified Shops</div>
            <div className="kv" style={{ fontSize: "28px" }}>{verifiedCount}</div>
            <div className="ks">Monthly Progress (Target: 100)</div>
            <div style={{ marginTop: "12px", background: "var(--bdr)", height: "6px", borderRadius: "4px", overflow: "hidden", position: "relative" }}>
              <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${Math.min(100, (verifiedCount / 100) * 100)}%`, background: "var(--ok)", transition: "width 0.5s ease" }}></div>
            </div>
          </div>
          <div className="kc b-am"><div className="ki"><IconClockCheck /></div><div className="kl">Pending Verification</div><div className="kv">{pendingCount}</div><div className="ks">Awaiting your approval</div></div>
        </div>
        
        <div className="card" style={{ marginBottom: "16px" }}>
          <div className="ctit" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
            <span>Field Shop Records Verification Queue</span>
            <div className="filter-row">
              <input type="text" placeholder="Search Shop or Employee" value={shopFilterSearch} onChange={(e) => setShopFilterSearch(e.target.value)} style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid var(--bdr)", background: "var(--sur2)", color: "var(--tx)", width: "190px" }} />
              <input type="date" value={shopFilterFrom} onChange={(e) => setShopFilterFrom(e.target.value)} style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid var(--bdr)", background: "var(--sur2)", color: "var(--tx)" }} title="From Date" />
              <input type="date" value={shopFilterTo} onChange={(e) => setShopFilterTo(e.target.value)} style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid var(--bdr)", background: "var(--sur2)", color: "var(--tx)" }} title="To Date" />
            </div>
          </div>
          <div className="tw">
            <table>
              <thead><tr><th>Date</th><th>Shop Name</th><th>Product Detail</th><th>Location Address</th><th>Photo</th><th>Status/Action</th></tr></thead>
              <tbody>
                {Object.keys(shopsByEmp).length > 0 ? (
                  Object.keys(shopsByEmp).map((eName, i) => (
                    <React.Fragment key={i}>
                      <tr onClick={() => toggleShopEmp(eName)} style={{ cursor: "pointer", background: "var(--sur2)" }}>
                        <td><b>{eName}</b></td>
                        <td colSpan="4">
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <b>{shopsByEmp[eName].length} Shops Logged</b>
                            {shopsByEmp[eName].filter(s => s.status !== 'verified').length > 0 && (
                              <span style={{ background: "#d32f2f", color: "#fff", padding: "4px 10px", borderRadius: "12px", fontSize: "13px", fontWeight: "bold" }}>
                                {shopsByEmp[eName].filter(s => s.status !== 'verified').length} Pending Review
                              </span>
                            )}
                          </div>
                        </td>
                        <td style={{ textAlign: "right" }}>{expandedShopEmp[eName] ? "▼" : "▲"}</td>
                      </tr>
                      {expandedShopEmp[eName] && shopsByEmp[eName].map((d, j) => {
                        let dStr = "—";
                        if (d.timestamp && d.timestamp.seconds) {
                          dStr = new Date(d.timestamp.seconds * 1000).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" });
                        }
                        return (
                          <tr key={j + "-sub"} style={{ background: "transparent", opacity: d.status === 'verified' ? 0.7 : 1 }}>
                            <td style={{ fontSize: "13px", color: "var(--tx2)" }}>{dStr}</td>
                            <td><b>{d.shopName}</b></td>
                            <td>{d.productDetail || d.ownerName || '—'}</td>
                            <td>{d.address || '—'}</td>
                            <td>
                              {d.imageUrl ? (
                                <a href={d.imageUrl} target="_blank" rel="noopener noreferrer">
                                  <img src={d.imageUrl} alt="Shop" style={{ width: "60px", height: "60px", objectFit: "cover", borderRadius: "6px", border: "1px solid var(--bdr)" }} />
                                </a>
                              ) : <span style={{ color: "var(--tx3)", fontSize: "12px" }}>No Photo</span>}
                            </td>
                            <td>
                              {d.status === 'verified' ? (
                                <span className="bdg b-ok">Verified</span>
                              ) : (
                                <div style={{ display: "flex", gap: "4px" }}>
                                  <button className="btn btn-ok" style={{ padding: "4px 8px", fontSize: "12px" }} onClick={() => handleVerifyShop(d.id)}>Verify</button>
                                  <button className="btn btn-no" style={{ padding: "4px 8px", fontSize: "12px" }} onClick={() => handleRejectShop(d.id)}>Reject</button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  ))
                ) : (
                  <tr><td colSpan="5" style={{ textAlign: "center", color: "var(--tx3)" }}>No registered shops available for review.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </>
    );
  };

  const handleApproveReport = async (id) => {
    try {
      const { error } = await supabase.from('reports').update({ status: "approved" }).eq('id', id);
      if (error) {
        alert("Error approving: " + error.message);
        console.error(error);
        return;
      }
      alert("Report Approved!");
      fetchData();
    } catch (e) { alert("Error: " + e.message); console.error(e); }
  };
  const handleRejectReport = async (id) => {
    try {
      const { error } = await supabase.from('reports').update({ status: "rejected" }).eq('id', id);
      if (error) {
        alert("Error rejecting: " + error.message);
        console.error(error);
        return;
      }
      alert("Report Rejected!");
      fetchData();
    } catch (e) { alert("Error: " + e.message); console.error(e); }
  };

  const renderReports = () => {
    let filteredRepsList = [];
    let pendingCount = 0;
    let approvedCount = 0;

    if (repsSnap) {
      repsSnap.forEach(doc => {
        const d = doc.data();
        d.id = doc.id;
        
        let include = true;
        let dateStr = "";
        if (d.timestamp && d.timestamp.seconds) {
          const dt = new Date(d.timestamp.seconds * 1000);
          dt.setMinutes(dt.getMinutes() - dt.getTimezoneOffset());
          dateStr = dt.toISOString().split("T")[0];
        }
        
        const empName = metricsMatrix.find(e => e.email === d.loggedBy)?.name || (d.loggedBy ? d.loggedBy.split('@')[0] : "Unknown");
        d.empName = empName;
        d.dateStr = dateStr;

        if (repFilterFrom && dateStr && dateStr < repFilterFrom) include = false;
        if (repFilterTo && dateStr && dateStr > repFilterTo) include = false;
        if (repFilterSearch && d.loggedBy && !d.loggedBy.toLowerCase().includes(repFilterSearch.toLowerCase()) && !empName.toLowerCase().includes(repFilterSearch.toLowerCase())) include = false;
        
        if (include) {
          filteredRepsList.push(d);
          if (d.status === "approved") approvedCount++;
          else if (d.status !== "rejected") pendingCount++;
        }
      });
    }

    filteredRepsList.sort((a,b) => {
       const tA = a.timestamp ? a.timestamp.seconds : 0;
       const tB = b.timestamp ? b.timestamp.seconds : 0;
       return tB - tA;
    });

    const repsByEmp = {};
    filteredRepsList.forEach(c => {
      const eName = c.empName;
      if (!repsByEmp[eName]) repsByEmp[eName] = [];
      repsByEmp[eName].push(c);
    });

    const toggleRepEmp = (eName) => {
      setExpandedRepEmp(prev => ({ ...prev, [eName]: !prev[eName] }));
    };

    return (
      <>
        <div className="kg">
          <div className="kc gd"><div className="ki"><IconFileReport /></div><div className="kl">Total Reports</div><div className="kv">{filteredRepsList.length}</div><div className="ks">In selected range</div></div>
          <div className="kc ok"><div className="ki"><IconShield /></div><div className="kl">Approved</div><div className="kv" style={{ fontSize: "28px" }}>{approvedCount}</div><div className="ks">+15 (Weekly) pts</div></div>
          <div className="kc b-am"><div className="ki"><IconClockCheck /></div><div className="kl">Pending Audit</div><div className="kv">{pendingCount}</div><div className="ks">Awaiting review</div></div>
        </div>
        
        <div className="card" style={{ marginBottom: "16px" }}>
          <div className="ctit" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
            <span>Reports Database</span>
            <div className="filter-row">
              <input type="text" placeholder="Search Name or Email" value={repFilterSearch} onChange={(e) => setRepFilterSearch(e.target.value)} style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid var(--bdr)", background: "var(--sur2)", color: "var(--tx)", width: "150px" }} />
              <input type="date" value={repFilterFrom} onChange={(e) => setRepFilterFrom(e.target.value)} style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid var(--bdr)", background: "var(--sur2)", color: "var(--tx)" }} title="From Date" />
              <input type="date" value={repFilterTo} onChange={(e) => setRepFilterTo(e.target.value)} style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid var(--bdr)", background: "var(--sur2)", color: "var(--tx)" }} title="To Date" />
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {Object.keys(repsByEmp).length > 0 ? (
            Object.keys(repsByEmp).map((eName, i) => (
              <div key={i} className="card" style={{ padding: "0" }}>
                <div 
                  className="ctit" 
                  style={{ padding: "16px", margin: 0, cursor: "pointer", display: "flex", justifyContent: "space-between", background: "var(--sur2)" }}
                  onClick={() => toggleRepEmp(eName)}
                >
                  <span><b>{eName}</b></span>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span style={{ fontSize: "14px", color: "var(--tx2)" }}>{repsByEmp[eName].length} Reports Logged</span>
                    {repsByEmp[eName].filter(r => r.status !== 'approved' && r.status !== 'rejected').length > 0 && (
                      <span style={{ background: "#d32f2f", color: "#fff", padding: "4px 10px", borderRadius: "12px", fontSize: "13px", fontWeight: "bold" }}>
                        {repsByEmp[eName].filter(r => r.status !== 'approved' && r.status !== 'rejected').length} Pending Audit
                      </span>
                    )}
                    <span style={{ fontSize: "14px", color: "var(--tx2)", marginLeft: "4px" }}>{expandedRepEmp[eName] ? "▼" : "▲"}</span>
                  </div>
                </div>
                {expandedRepEmp[eName] && (
                  <div style={{ padding: "16px", borderTop: "1px solid var(--bdr)", display: "flex", flexDirection: "column", gap: "14px" }}>
                    {repsByEmp[eName].map((d, j) => (
                      <div key={j} className="card" style={{ textAlign: "left", opacity: d.status === 'rejected' ? 0.6 : 1, background: "var(--sur)" }}>
                        <div className="ctit">
                          <div style={{ display: "flex", flexDirection: "column" }}>
                            <span><b>{d.title}</b> <span className="bdg b-ok" style={{ marginLeft: "8px" }}>{d.type}</span></span>
                            <span style={{ fontSize: "12px", color: "var(--tx3)", marginTop: "4px", fontWeight: "normal" }}>By {d.empName} • {d.dateStr}</span>
                          </div>
                          {d.status === 'approved' ? (
                            <span className="bdg b-ok">Approved</span>
                          ) : d.status === 'rejected' ? (
                            <span className="bdg b-no">Rejected</span>
                          ) : (
                            <span className="bdg b-am">Awaiting Audit</span>
                          )}
                        </div>
                        <p style={{ color: "var(--tx2)", marginBottom: "14px", fontSize: "13.5px", whiteSpace: "pre-wrap" }}>{d.content}</p>
                        
                        {(!d.status || d.status === 'pending') && (
                          <div style={{ display: "flex", gap: "8px" }}>
                            <button className="btn btn-ok" onClick={() => handleApproveReport(d.id)}>Approve Summary</button>
                            <button className="btn btn-no" onClick={() => handleRejectReport(d.id)}>Reject</button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="card" style={{ textAlign: "center", color: "var(--tx3)" }}>No summary documents match filters.</div>
          )}
        </div>
      </>
    );
  };

  const computeLeaderboard = (filterType, filterFrom, filterTo) => {
    const isWithinRange = (timestamp) => {
      if (filterType === "all") return true;
      if (!timestamp || !timestamp.seconds) return false;
      const today = new Date();
      today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
      const todayStr = today.toISOString().split("T")[0];
      let from = null, to = null;
      if (filterType === "today") { from = todayStr; to = todayStr; }
      else if (filterType === "yesterday") {
        const y = new Date(today); y.setDate(y.getDate() - 1);
        from = y.toISOString().split("T")[0]; to = from;
      } else if (filterType === "week") {
        const s = new Date(today); s.setDate(s.getDate() - s.getDay());
        from = s.toISOString().split("T")[0]; to = todayStr;
      } else if (filterType === "month") {
        let startYear = today.getFullYear();
        let startMonth = today.getMonth();
        if (today.getDate() < 11) {
          startMonth -= 1;
          if (startMonth < 0) {
            startMonth = 11;
            startYear -= 1;
          }
        }
        from = `${startYear}-${String(startMonth + 1).padStart(2, '0')}-11`;
        
        let endMonth = startMonth + 1;
        let endYear = startYear;
        if (endMonth > 11) {
          endMonth = 0;
          endYear += 1;
        }
        to = `${endYear}-${String(endMonth + 1).padStart(2, '0')}-10`;
      } else if (filterType === "year") {
        const s = new Date(today.getFullYear(), 0, 1);
        s.setMinutes(s.getMinutes() - s.getTimezoneOffset());
        from = s.toISOString().split("T")[0]; to = todayStr;
      } else if (filterType === "custom") {
        from = filterFrom; to = filterTo;
      }
      const dt = new Date(timestamp.seconds * 1000);
      dt.setMinutes(dt.getMinutes() - dt.getTimezoneOffset());
      const dateStr = dt.toISOString().split("T")[0];
      return dateStr >= from && dateStr <= to;
    };

    const dMetricsMap = {};
    employeesSnap.forEach((data) => {
      if (data.role === "admin" || data.email === "admin@gmail.com") return;
      dMetricsMap[data.email] = {
        name: data.name || data.email.split("@")[0],
        email: data.email,
        init: data.name ? data.name.substring(0, 2).toUpperCase() : "EM",
        callCount: 0,
        callPts: 0,
        shopCount: 0,
        shopPts: 0,
        reportCount: 0,
        reportPts: 0,
        totalPoints: 0,
      };
    });

    const callsByEmailAndDate = {};
    if (callsSnap) {
      callsSnap.forEach(doc => {
        const d = doc.data();
        if (d.loggedBy !== "admin@gmail.com" && isWithinRange(d.timestamp)) {
          if (d.loggedBy && dMetricsMap[d.loggedBy]) {
             dMetricsMap[d.loggedBy].callCount++;
             if (!callsByEmailAndDate[d.loggedBy]) callsByEmailAndDate[d.loggedBy] = {};
             const dt = new Date(d.timestamp.seconds * 1000);
             dt.setMinutes(dt.getMinutes() - dt.getTimezoneOffset());
             const dStr = dt.toISOString().split("T")[0];
             callsByEmailAndDate[d.loggedBy][dStr] = (callsByEmailAndDate[d.loggedBy][dStr] || 0) + 1;
          }
        }
      });
    }

    Object.keys(dMetricsMap).forEach((email) => {
      let pts = 0;
      const dailyCounts = callsByEmailAndDate[email] || {};
      for (const date in dailyCounts) {
        if (dailyCounts[date] >= 20) pts += 5;
        else if (dailyCounts[date] >= 16) pts += 3;
      }
      dMetricsMap[email].callPts = pts;
    });

    if (shopsSnap) {
      shopsSnap.forEach(doc => {
        const d = doc.data();
        if (isWithinRange(d.timestamp)) {
          if (d.status === 'verified') {
            if (d.loggedBy && dMetricsMap[d.loggedBy]) {
              dMetricsMap[d.loggedBy].shopCount++;
            }
          }
        }
      });
    }
    Object.keys(dMetricsMap).forEach((email) => {
      dMetricsMap[email].shopPts = Math.floor(dMetricsMap[email].shopCount / 100) * 50;
    });

    if (repsSnap) {
      repsSnap.forEach(doc => {
        const d = doc.data();
        if (isWithinRange(d.timestamp)) {
          if (d.status === 'approved') {
            if (d.loggedBy && dMetricsMap[d.loggedBy]) {
              dMetricsMap[d.loggedBy].reportCount++;
              if (d.type === "weekly") dMetricsMap[d.loggedBy].reportPts += 15;
            }
          }
        }
      });
    }

    return Object.values(dMetricsMap).map((emp) => {
      emp.totalPoints = emp.callPts + emp.shopPts + emp.reportPts;
      return emp;
    }).sort((a, b) => b.totalPoints - a.totalPoints);
  };



  const renderLeaderboard = () => {
    const leaderLeaderboard = computeLeaderboard(leaderFilterType, leaderFilterFrom, leaderFilterTo);

    return (
      <>
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "16px" }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <select 
              value={leaderFilterType} 
              onChange={(e) => setLeaderFilterType(e.target.value)} 
              style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid var(--bdr)", background: "#fff", fontWeight: 600, color: "var(--tx)", outline: "none", cursor: "pointer", height: "34px", fontSize: "13px" }}
            >
              <option value="all">Overall (All Time)</option>
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="year">This Year</option>
              <option value="custom">Custom Range</option>
            </select>
            {leaderFilterType === "custom" && (
              <div style={{ display: 'flex', gap: '8px' }}>
                <input type="date" value={leaderFilterFrom} onChange={(e) => setLeaderFilterFrom(e.target.value)} style={{ padding: "6px", borderRadius: "6px", border: "1px solid var(--bdr)", background: "#fff", height: "34px", outline: "none", color: "var(--tx)", fontSize: "13px" }} />
                <input type="date" value={leaderFilterTo} onChange={(e) => setLeaderFilterTo(e.target.value)} style={{ padding: "6px", borderRadius: "6px", border: "1px solid var(--bdr)", background: "#fff", height: "34px", outline: "none", color: "var(--tx)", fontSize: "13px" }} />
              </div>
            )}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "14px", marginBottom: "20px" }}>
          {leaderLeaderboard.slice(0, 3).map((emp, index) => {
            const medal = index === 0 ? "🥇" : index === 1 ? "🥈" : "🥉";
            const borderTheme = index === 0 ? "var(--gold)" : index === 1 ? "#94a3b8" : "#f97316";
            return (
              <div key={emp.email} className="card" style={{ textAlign: "center", padding: "24px", border: `2px solid ${borderTheme}` }}>
                <div style={{ fontSize: "36px", marginBottom: "8px" }}>{medal}</div>
                <div className="lav" style={{ margin: "0 auto 10px", width: "52px", height: "52px", fontSize: "18px", background: "var(--ind-lt)", color: "var(--ind)" }}>{emp.init}</div>
                <div style={{ fontSize: "15px", fontWeight: 800 }}>{emp.name}</div>
                <div style={{ fontSize: "28px", fontWeight: 800, color: "var(--ind)", marginTop: "6px" }}>{emp.totalPoints}</div>
                <div style={{ fontSize: "12px", color: "var(--tx3)" }}>points</div>
              </div>
            );
          })}
        </div>
        <div className="card">
          <div className="ctit">Full System Departmental Ranking Directory</div>
          <div>
            {leaderLeaderboard.length > 0 ? leaderLeaderboard.map((emp, index) => {
              const medalMark = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : '#' + (index + 1);
              const rankRowClass = index === 0 ? "r1" : index === 1 ? "r2" : index === 2 ? "r3" : "";
              const badgeIconLabel = index === 0 ? "a" : index === 1 ? "b" : index === 2 ? "c" : "n";
              return (
                <div key={emp.email} className={`lbr ${rankRowClass}`}>
                  <div className={`lrk ${badgeIconLabel}`}>{medalMark}</div>
                  <div className="lav">{emp.init}</div>
                  <div style={{ flex: 1, textAlign: "left" }}>
                    <div style={{ fontWeight: 700, fontSize: "14px" }}>{emp.name}</div>
                    <div style={{ fontSize: "12px", color: "var(--tx3)" }}>Calls Logged: {emp.callCount} · Shops Tracked: {emp.shopCount}</div>
                  </div>
                  <div>
                    <div className="lpt">{emp.totalPoints}</div>
                    <div style={{ fontSize: "11px", color: "var(--tx3)", textAlign: "right" }}>pts</div>
                  </div>
                </div>
              );
            }) : <div style={{ textAlign: "center", color: "var(--tx3)" }}>No team ranking directory logs discovered.</div>}
          </div>
        </div>
      </>
    );
  };

  if (loading) return <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>Loading Matrix...</div>;

  const panelTitle = activeTab.charAt(0).toUpperCase() + activeTab.slice(1) + (activeTab === "dashboard" || activeTab === "attendance" ? " Monitoring" : "");

  return (
    <div className="shell">
      {isMobileMenuOpen && (
        <div 
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 90 }} 
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
      <nav className={`sb ${isMobileMenuOpen ? "open" : ""}`}>
        <div className="sb-brand">
          <div className="blogo" style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <img src="/logo.jpeg" alt="PCA Logo" style={{ width: "42px", height: "42px", mixBlendMode: "multiply", clipPath: "inset(3%)", objectFit: "cover", margin: 0 }} />
            <div>
              <div className="bname">Prabha Food Industries</div>
              <div className="btag">Admin Panel</div>
            </div>
          </div>
        </div>
        <div className="sb-nav">
          <div className="snl">Overview</div>
          <button className={`ni ${activeTab === 'dashboard' ? 'on' : ''}`} onClick={() => { setActiveTab('dashboard'); setIsMobileMenuOpen(false); }}><IconLayoutDashboard size={18} />Dashboard</button>
          <button className={`ni ${activeTab === 'employees' ? 'on' : ''}`} onClick={() => { setActiveTab('employees'); setIsMobileMenuOpen(false); }}><IconUsers size={18} />Employees</button>
          <div className="snl">Monitoring</div>
          <button className={`ni ${activeTab === 'attendance' ? 'on' : ''}`} onClick={() => { setActiveTab('attendance'); setIsMobileMenuOpen(false); }}><IconClockCheck size={18} />Attendance</button>
          <button className={`ni ${activeTab === 'calls' ? 'on' : ''}`} onClick={() => { setActiveTab('calls'); setIsMobileMenuOpen(false); }}><IconPhoneCall size={18} />Productive Calls</button>
          <button className={`ni ${activeTab === 'shops' ? 'on' : ''}`} onClick={() => { setActiveTab('shops'); setIsMobileMenuOpen(false); }}><IconBuildingStore size={18} />Shop Verify</button>
          <button className={`ni ${activeTab === 'reports' ? 'on' : ''}`} onClick={() => { setActiveTab('reports'); setIsMobileMenuOpen(false); }}><IconFileReport size={18} />Reports</button>
          <div className="snl">Performance</div>
          <button className={`ni ${activeTab === 'leaderboard' ? 'on' : ''}`} onClick={() => { setActiveTab('leaderboard'); setIsMobileMenuOpen(false); }}><IconTrophy size={18} />Leaderboard</button>
        </div>
        <div className="sb-foot">
          <div className="upill">
            <div className="uav">AU</div>
            <div>
              <div className="uname">Admin User</div>
              <div className="urole">Administrator</div>
            </div>
            <button className="lbtn" onClick={handleLogout} title="Logout"><IconLogout size={16} /></button>
          </div>
        </div>
      </nav>

      <div className="main">
        <header className="topbar">
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <button 
              className="mobile-menu-btn" 
              onClick={() => setIsMobileMenuOpen(true)}
              style={{ background: "none", border: "none", color: "var(--tx)", cursor: "pointer", alignItems: "center", justifyContent: "center" }}
            >
              <IconMenu2 size={24} />
            </button>
            <div>
              <h1 style={{ fontSize: "17px", fontWeight: 700, margin: 0 }}>{panelTitle}</h1>
              <div style={{ fontSize: "12px", color: "var(--tx3)" }}>Admin View • {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })}</div>
            </div>
          </div>
        </header>

        <main className="pg">
          {activeTab === "dashboard" && renderDashboard()}
          {activeTab === "employees" && renderEmployees()}
          {activeTab === "attendance" && renderAttendance()}
          {activeTab === "calls" && renderCalls()}
          {activeTab === "shops" && renderShops()}
          {activeTab === "reports" && renderReports()}
          {activeTab === "leaderboard" && renderLeaderboard()}
        </main>
      </div>

      {showAddEmployee && (
        <div className="mo" style={{ display: "flex" }}>
          <div className="md">
            <form onSubmit={handleAddEmployee}>
              <div className="mh">
                <div>{editId ? "Edit Employee" : "Add New Employee"}</div>
                <button type="button" onClick={() => { setShowAddEmployee(false); setEditId(null); setNewEmp({ name: "", email: "", phone: "", status: "active", userid: "", password: "" }); }} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--tx2)" }}><IconX size={20} /></button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                <div className="fg"><label>Name *</label><input type="text" value={newEmp.name} onChange={(e) => setNewEmp({...newEmp, name: e.target.value})} required /></div>
                <div className="fg"><label>Email *</label><input type="email" value={newEmp.email} onChange={(e) => setNewEmp({...newEmp, email: e.target.value})} required /></div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                <div className="fg"><label>Phone Number *</label><input type="tel" value={newEmp.phone} onChange={(e) => setNewEmp({...newEmp, phone: e.target.value.replace(/[^0-9]/g, '').slice(0, 10)})} required pattern="[0-9]{10}" maxLength={10} minLength={10} title="Please enter exactly 10 digits" /></div>
                <div className="fg"><label>Status</label><select value={newEmp.status} onChange={(e) => setNewEmp({...newEmp, status: e.target.value})}><option value="active">Active</option><option value="inactive">Inactive</option></select></div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                <div className="fg"><label>User ID *</label><input type="text" value={newEmp.userid} onChange={(e) => setNewEmp({...newEmp, userid: e.target.value})} required /></div>
                <div className="fg"><label>Password *</label><input type="password" value={newEmp.password} onChange={(e) => setNewEmp({...newEmp, password: e.target.value})} required /></div>
              </div>
              <button type="submit" className="btn btn-p" style={{ width: "100%", marginTop: "10px" }}>{editId ? "Update Employee" : "Save Employee"}</button>
            </form>
          </div>
        </div>
      )}


    </div>
  );
}
