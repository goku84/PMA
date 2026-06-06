"use client";

import React, { useState, useEffect, Fragment } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signOut } from "firebase/auth";
import {
  collection,
  getDocs,
  query,
  where,
  addDoc,
  serverTimestamp,
  updateDoc,
  doc,
} from "firebase/firestore";
import { auth, db, storage } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import {
  IconShield,
  IconLayoutDashboard,
  IconClockCheck,
  IconPhoneCall,
  IconBuildingStore,
  IconFileReport,
  IconTrophy,
  IconLogout,
  IconPlus,
  IconClock,
  IconPercentage,
  IconStar,
  IconCalendarCheck,
  IconPhone,
  IconCircleCheck,
  IconBuilding,
  IconDiscountCheck,
  IconHourglass,
  IconFileAnalytics,
  IconCheckbox,
  IconLock,
  IconLogin,
  IconChevronLeft,
  IconChevronRight,
  IconFilter,
  IconX,
  IconMenu2,
  IconListCheck,
} from "@tabler/icons-react";

const getLocalToday = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().split("T")[0];
};

export default function EmployeeDashboard() {
  const router = useRouter();
  const [activeUser, setActiveUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [activeLogTab, setActiveLogTab] = useState("attendance");
  const [currentTime, setCurrentTime] = useState("");
  const [reportFormType, setReportFormType] = useState("daily");
  const [isUploading, setIsUploading] = useState(false);

  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const [callFilterFrom, setCallFilterFrom] = useState(getLocalToday());
  const [callFilterTo, setCallFilterTo] = useState(getLocalToday());
  const [callFilterCustomer, setCallFilterCustomer] = useState("");
  const [callPage, setCallPage] = useState(1);
  const [expandedDates, setExpandedDates] = useState({});

  const [shopFilterFrom, setShopFilterFrom] = useState("");
  const [shopFilterTo, setShopFilterTo] = useState("");
  const [shopFilterName, setShopFilterName] = useState("");
  const [repFilterFrom, setRepFilterFrom] = useState("");
  const [repFilterTo, setRepFilterTo] = useState("");
  const [repFilterType, setRepFilterType] = useState("all");

  const [callsSnap, setCallsSnap] = useState([]);
  const [shopsSnap, setShopsSnap] = useState([]);
  const [repsSnap, setRepsSnap] = useState([]);
  const [attSnap, setAttSnap] = useState([]);
  const [tasksSnap, setTasksSnap] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);

  const [modalType, setModalType] = useState(null); // 'call', 'shop', 'report', 'task_execution'

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.push("/");
      } else {
        setActiveUser(user);
        fetchData(user);
      }
    });

    const timer = setInterval(() => {
      setCurrentTime(
        new Date().toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }).toLowerCase()
      );
    }, 1000);

    return () => {
      unsubscribe();
      clearInterval(timer);
    };
  }, [router]);

  const fetchData = async (user) => {
    try {
      const callQ = query(collection(db, "calls"), where("loggedBy", "==", user.email));
      const attQ = query(collection(db, "attendance"), where("email", "==", user.email));
      const tasksQ = query(collection(db, "tasks"), where("employeeEmail", "==", user.email));
      
      const shopsQ = query(collection(db, "shops"), where("loggedBy", "==", user.email));
      const repsQ = query(collection(db, "reports"), where("loggedBy", "==", user.email));

      const [calls, shops, reps, att, tasksRes] = await Promise.all([
        getDocs(callQ),
        getDocs(shopsQ),
        getDocs(repsQ),
        getDocs(attQ),
        getDocs(tasksQ),
      ]);

      setCallsSnap(calls.docs.map((d) => d.data()));
      setShopsSnap(shops.docs.map((d) => d.data()));
      setRepsSnap(reps.docs.map((d) => d.data()));
      setAttSnap(att.docs.map((d) => ({ id: d.id, ...d.data() })));
      setTasksSnap(tasksRes.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/");
  };

  const checkIn = async (photoUrl) => {
    try {
      const realToday = new Date();
      realToday.setMinutes(realToday.getMinutes() - realToday.getTimezoneOffset());
      const todayStr = realToday.toISOString().split("T")[0];

      await addDoc(collection(db, "attendance"), {
        uid: activeUser.uid,
        employeeName: activeUser.email.split("@")[0],
        email: activeUser.email,
        date: todayStr,
        in: serverTimestamp(),
        inPhotoUrl: photoUrl || null,
        out: null,
        status: "present",
        points: 0,
      });
      alert("Checked in successfully!");
      fetchData(activeUser);
    } catch (err) {
      alert(err.message);
    }
  };

  const checkOut = async (docObj, photoUrl) => {
    try {
      let earnedPoints = 0;

      await updateDoc(doc(db, "attendance", docObj.id), {
        out: serverTimestamp(),
        outPhotoUrl: photoUrl || null,
        points: earnedPoints,
      });
      alert(`Checked out successfully!`);
      fetchData(activeUser);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleAttendancePhoto = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const storageRef = ref(storage, `attendance/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const photoUrl = await getDownloadURL(storageRef);

      if (!todayAtt) {
        await checkIn(photoUrl);
      } else if (todayAtt && !todayAtt.out) {
        await checkOut(todayAtt, photoUrl);
      }
    } catch (err) {
      alert("Error uploading photo: " + err.message);
    } finally {
      setIsUploading(false);
      e.target.value = null;
    }
  };

  const submitCallForm = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      await addDoc(collection(db, "calls"), {
        customerName: fd.get("c_name"),
        phoneNumber: fd.get("c_phone") || "—",
        status: fd.get("c_status"),
        durationMinutes: parseInt(fd.get("c_dur")) || 5,
        notes: fd.get("c_notes"),
        loggedBy: activeUser.email,
        timestamp: serverTimestamp(),
      });
      alert("Call written live to Cloud Firestore!");
      setModalType(null);
      fetchData(activeUser);
    } catch (err) {
      alert(err.message);
    }
  };

  const submitShopForm = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    setIsUploading(true);
    try {
      let imageUrl = null;
      const photoFile = fd.get("s_photo");
      if (photoFile && photoFile.size > 0) {
        const storageRef = ref(storage, `shops/${Date.now()}_${photoFile.name}`);
        await uploadBytes(storageRef, photoFile);
        imageUrl = await getDownloadURL(storageRef);
      }

      await addDoc(collection(db, "shops"), {
        shopName: fd.get("s_name"),
        productDetail: fd.get("s_product") || "—",
        phone: fd.get("s_phone") || "—",
        address: fd.get("s_addr") || "—",
        imageUrl: imageUrl,
        status: "pending",
        loggedBy: activeUser.email,
        timestamp: serverTimestamp(),
      });
      alert("Shop successfully added!");
      setModalType(null);
      fetchData(activeUser);
    } catch (err) {
      alert(err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const submitReportForm = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const rType = fd.get("r_type");
    try {
      const reportData = {
        title: fd.get("r_title"),
        type: rType,
        content: fd.get("r_content"),
        loggedBy: activeUser.email,
        timestamp: serverTimestamp(),
      };
      if (rType === "daily") {
        reportData.totalSalesAmount = Number(fd.get("r_sales")) || 0;
      }
      await addDoc(collection(db, "reports"), reportData);
      alert("Report written directly to Firestore streams!");
      setModalType(null);
      setReportFormType("daily");
      fetchData(activeUser);
    } catch (err) {
      alert(err.message);
    }
  };

  const submitTaskExecution = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const completed = parseInt(fd.get("t_cases"), 10) || 0;
    try {
      const executionData = {
        taskId: selectedTask.id,
        agencyName: fd.get("t_agency"),
        productName: fd.get("t_product"),
        casesCompleted: completed,
        employeeEmail: activeUser.email,
        timestamp: serverTimestamp(),
      };
      
      await addDoc(collection(db, "task_executions"), executionData);
      
      const newCompleted = (selectedTask.completedCases || 0) + completed;
      const newStatus = newCompleted >= selectedTask.caseCount ? "completed" : "in progress";
      
      await updateDoc(doc(db, "tasks", selectedTask.id), {
        completedCases: newCompleted,
        status: newStatus
      });
      
      alert("Task execution logged successfully!");
      setModalType(null);
      setSelectedTask(null);
      fetchData(activeUser);
    } catch (err) {
      alert(err.message);
    }
  };

  const attPoints = attSnap.reduce((acc, curr) => acc + (curr.points || 0), 0);
  
  const callsByDate = {};
  callsSnap.forEach(c => {
    if (c.timestamp && c.timestamp.seconds) {
      const dt = new Date(c.timestamp.seconds * 1000);
      dt.setMinutes(dt.getMinutes() - dt.getTimezoneOffset());
      const dateStr = dt.toISOString().split("T")[0];
      callsByDate[dateStr] = (callsByDate[dateStr] || 0) + 1;
    }
  });
  let callTotalPoints = 0;
  for (const date in callsByDate) {
    if (callsByDate[date] >= 20) callTotalPoints += 5;
    else if (callsByDate[date] >= 16) callTotalPoints += 3;
  }

  const repPoints = repsSnap.filter(r => r.type === "weekly" && r.status === "approved").length * 15;
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  let monthlyShopsCount = 0;
  shopsSnap.forEach(s => {
    if (s.timestamp && s.timestamp.seconds) {
      const dt = new Date(s.timestamp.seconds * 1000);
      if (dt.getMonth() === currentMonth && dt.getFullYear() === currentYear) {
        monthlyShopsCount++;
      }
    }
  });
  const shopPoints = Math.floor(monthlyShopsCount / 100) * 50;
  const totalPoints = attPoints + callTotalPoints + repPoints + shopPoints;

  const renderAllocatedTasks = () => {
    const tasks = [...tasksSnap].sort((a,b) => {
       const tA = a.timestamp ? a.timestamp.seconds : 0;
       const tB = b.timestamp ? b.timestamp.seconds : 0;
       return tB - tA;
    });

    return (
      <div className="card">
        <div className="ctit">Allocated Target Tasks</div>
        <p style={{ color: "var(--tx2)", marginBottom: "16px", fontSize: "13px" }}>Manage and execute the targets assigned to you by your managers.</p>
        <div className="tw">
          <table>
            <thead>
              <tr>
                <th>Date Assigned</th>
                <th>Target Cases</th>
                <th>Completed</th>
                <th>Notes</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {tasks.length > 0 ? (
                tasks.map((t, i) => {
                  let dStr = "—";
                  if (t.timestamp && t.timestamp.seconds) {
                    dStr = new Date(t.timestamp.seconds * 1000).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" });
                  }
                  const comp = t.completedCases || 0;
                  return (
                    <tr key={i}>
                      <td style={{ fontSize: "13px", color: "var(--tx2)" }}>{dStr}</td>
                      <td><b>{t.caseCount}</b></td>
                      <td style={{ color: comp >= t.caseCount ? "var(--ok)" : "inherit" }}><b>{comp}</b></td>
                      <td>{t.notes}</td>
                      <td><span className={`bdg ${t.status === 'completed' ? 'b-ok' : 'b-am'}`}>{t.status}</span></td>
                      <td>
                        {t.status !== 'completed' ? (
                          <button className="btn btn-ok" style={{ padding: "6px 12px", fontSize: "12px" }} onClick={() => { setSelectedTask(t); setModalType("task_execution"); }}>
                            Log Execution
                          </button>
                        ) : (
                          <span style={{ fontSize: "12px", color: "var(--tx3)" }}>Fully Executed</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="6" style={{ textAlign: "center", color: "var(--tx3)" }}>
                    No tasks currently allocated to you.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderDashboard = () => {
    const realToday = new Date();
    realToday.setMinutes(realToday.getMinutes() - realToday.getTimezoneOffset());
    const todayStr = realToday.toISOString().split("T")[0];
    const todayAtt = attSnap.find((d) => d.date === todayStr);

    let shiftHrs = 0;
    if (todayAtt && todayAtt.in && todayAtt.in.seconds) {
      const inTime = todayAtt.in.seconds * 1000;
      const outTime = todayAtt.out ? todayAtt.out.seconds * 1000 : Date.now();
      shiftHrs = (outTime - inTime) / (1000 * 60 * 60);
    }
    const shiftPercent = Math.min(100, (shiftHrs / 4) * 100);

    return (
      <>
        <div style={{ marginBottom: "22px" }}>
          <h2 style={{ fontSize: "22px", fontWeight: 800 }}>
            Good Afternoon, {userName ? userName.charAt(0).toUpperCase() + userName.slice(1) : 'Agent'}! 👋
          </h2>
          <p style={{ color: "var(--tx2)" }}>
            Here's your productivity overview for today.
          </p>
        </div>
        <div className="kg">
          <div className="kc">
            <div className="ki"><IconTrophy /></div>
            <div className="kl">Total Points</div>
            <div className="kv">{totalPoints}</div>
            <div className="ks">🥈 Active Session</div>
          </div>
          <div className="kc gd">
            <div className="ki"><IconPhoneCall /></div>
            <div className="kl">Calls Today</div>
            <div className="kv">{callsByDate[todayStr] || 0}</div>
            <div className="ks">Target: 20/day</div>
          </div>
          <div className="kc ok">
            <div className="ki"><IconBuildingStore /></div>
            <div className="kl">Shops</div>
            <div className="kv">{shopsSnap.length}</div>
            <div className="ks">Live records</div>
          </div>
          <div className={`kc ${todayAtt ? "ok" : ""}`}>
            <div className="ki"><IconClock /></div>
            <div className="kl">Attendance</div>
            <div className="kv">{todayAtt ? "Present" : "—"}</div>
            <div className="ks">{todayAtt ? "Checked in today" : "Not checked in"}</div>
          </div>
        </div>
        
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "16px" }}>
          <div className="ach" style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", margin: 0, padding: "30px", background: "var(--sur)", borderRadius: "12px", border: "1px solid var(--bd)" }}>
            <div style={{ textAlign: "center", width: "100%" }}>
              <div style={{ fontSize: "36px", fontWeight: 700, color: "var(--tx)", marginBottom: "4px" }}>{currentTime}</div>
              <div style={{ fontSize: "14px", color: "var(--tx2)", marginBottom: "24px" }}>{new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</div>
              {todayAtt ? (
                todayAtt.out ? (
                  <button className="btn" disabled style={{ background: "rgba(255,255,255,0.1)", color: "var(--tx2)", padding: "12px 0", borderRadius: "30px", fontWeight: 600, width: "100%" }}>Shift Completed for Today</button>
                ) : (
                  <div style={{ position: "relative", width: "100%" }}>
                    <input type="file" accept="image/*" capture="environment" onChange={handleAttendancePhoto} disabled={isUploading} style={{ position: "absolute", opacity: 0, width: "100%", height: "100%", cursor: "pointer", top: 0, left: 0, zIndex: 10 }} />
                    <button className="btn" style={{ background: "var(--no)", color: "#fff", padding: "12px 0", borderRadius: "30px", fontWeight: 700, width: "100%", display: "flex", justifyContent: "center", gap: "6px" }}>
                      <IconLogout size={16} /> {isUploading ? "Uploading..." : "Take Photo to Check Out"}
                    </button>
                  </div>
                )
              ) : (
                <div style={{ position: "relative", width: "100%" }}>
                  <input type="file" accept="image/*" capture="environment" onChange={handleAttendancePhoto} disabled={isUploading} style={{ position: "absolute", opacity: 0, width: "100%", height: "100%", cursor: "pointer", top: 0, left: 0, zIndex: 10 }} />
                  <button className="btn" style={{ background: "#fff", color: "var(--ok)", padding: "12px 0", borderRadius: "30px", fontWeight: 700, width: "100%", display: "flex", justifyContent: "center", gap: "6px" }}>
                    <IconLogin size={16} /> {isUploading ? "Uploading..." : "Take Photo to Check In"}
                  </button>
                </div>
              )}
              
              <div style={{ marginTop: "40px", textAlign: "left" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: "var(--tx2)", marginBottom: "8px" }}>
                  <span>Shift Progress</span>
                  <span>{Math.floor(shiftHrs)}:{Math.floor((shiftHrs % 1) * 60).toString().padStart(2, '0')} / 4:00 hrs</span>
                </div>
                <div className="pt" style={{ height: "10px", background: "var(--bdr)", borderRadius: "10px", overflow: "hidden" }}>
                  <div className="pf" style={{ width: `${shiftPercent}%`, height: "100%", background: todayAtt && !todayAtt.out ? "var(--ok)" : "var(--tx2)" }}></div>
                </div>
              </div>
            </div>
          </div>
          
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div className="card" style={{ flex: 1, display: "flex", flexDirection: "column", margin: 0 }}>
              <div className="ctit">Quick Actions</div>
              <p style={{ color: "var(--tx2)", marginBottom: "16px", fontSize: "13px" }}>Create new records for your daily activities.</p>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", flex: 1, justifyContent: "center" }}>
                <button className="btn btn-p" style={{ padding: "12px", fontWeight: 600, display: "flex", justifyContent: "center", gap: "8px", width: "100%" }} onClick={() => setModalType("call")}><IconPhoneCall size={18} /> Log Call</button>
                <button className="btn btn-p" style={{ padding: "12px", fontWeight: 600, display: "flex", justifyContent: "center", gap: "8px", width: "100%" }} onClick={() => setModalType("shop")}><IconBuildingStore size={18} /> Add Shop</button>
                <button className="btn btn-p" style={{ padding: "12px", fontWeight: 600, display: "flex", justifyContent: "center", gap: "8px", width: "100%" }} onClick={() => { setModalType("report"); setReportFormType("daily"); }}><IconFileReport size={18} /> New Report</button>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  };

  const renderAttendance = () => {
    const localNow = new Date();
    const todayStart = new Date(localNow.getFullYear(), localNow.getMonth(), localNow.getDate());
    
    const realToday = new Date();
    realToday.setMinutes(realToday.getMinutes() - realToday.getTimezoneOffset());
    const todayStr = realToday.toISOString().split("T")[0];
    const todayAtt = attSnap.find((d) => d.date === todayStr);

    // Calculate shift progress
    let shiftHrs = 0;
    if (todayAtt && todayAtt.in && todayAtt.in.seconds) {
      const inTime = todayAtt.in.seconds * 1000;
      const outTime = todayAtt.out ? todayAtt.out.seconds * 1000 : Date.now();
      shiftHrs = (outTime - inTime) / (1000 * 60 * 60);
    }
    const shiftPercent = Math.min(100, (shiftHrs / 4) * 100);

    // Calendar setup
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    const firstDay = new Date(calYear, calMonth, 1).getDay();
    const monthName = new Date(calYear, calMonth).toLocaleString("default", { month: "long" });

    const changeMonth = (dir) => {
      let newM = calMonth + dir;
      let newY = calYear;
      if (newM < 0) { newM = 11; newY--; }
      else if (newM > 11) { newM = 0; newY++; }
      setCalMonth(newM);
      setCalYear(newY);
    };

    const isFuture = (d) => {
      return new Date(calYear, calMonth, d) > todayStart;
    };
    const isToday = (d) => {
      return new Date(calYear, calMonth, d).getTime() === todayStart.getTime();
    };

    const getDayStatus = (d) => {
      if (isFuture(d)) return null;
      const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const rec = attSnap.find((a) => a.date === dateStr);
      if (rec) {
        let hrs = 0;
        if (rec.in && rec.in.seconds) {
          const inTime = rec.in.seconds * 1000;
          const outTime = rec.out ? rec.out.seconds * 1000 : Date.now();
          hrs = (outTime - inTime) / (1000 * 60 * 60);
        }
        if (hrs < 4) return "Partial";
        return "Present";
      }
      return "Absent";
    };

    const filteredLogs = attSnap.filter(d => {
      if (filterFrom && d.date < filterFrom) return false;
      if (filterTo && d.date > filterTo) return false;
      if (filterStatus !== "all" && d.status !== filterStatus) return false;
      return true;
    }).sort((a,b) => new Date(b.date) - new Date(a.date));

    return (
      <>
        <div className="card" style={{ marginBottom: "20px" }}>
          <div className="ctit" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>Calendar</span>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <button className="btn" style={{ padding: "4px", background: "var(--sur2)" }} onClick={() => changeMonth(-1)}><IconChevronLeft size={16} /></button>
              <span style={{ fontSize: "14px", fontWeight: 600, minWidth: "100px", textAlign: "center" }}>{monthName} {calYear}</span>
              <button className="btn" style={{ padding: "4px", background: "var(--sur2)" }} onClick={() => changeMonth(1)}><IconChevronRight size={16} /></button>
            </div>
          </div>
          <div style={{ width: "100%", overflowX: "auto", paddingBottom: "4px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "2px", background: "var(--bdr)", border: "1px solid var(--bdr)", borderRadius: "8px", overflow: "hidden", minWidth: "300px" }}>
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
                <div key={d} style={{ padding: "8px 2px", textAlign: "center", background: "var(--sur)", fontWeight: 600, fontSize: "12px" }}>{d}</div>
              ))}
              {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} style={{ background: "var(--sur)" }}></div>)}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const d = i + 1;
                const status = getDayStatus(d);
                let bg = "var(--sur)";
                let color = "var(--tx)";
                if (status === "Present") { bg = "rgba(76, 175, 80, 0.15)"; color = "var(--ok)"; }
                else if (status === "Absent") { bg = "rgba(244, 67, 54, 0.15)"; color = "var(--no)"; }
                else if (status === "Partial") { bg = "rgba(255, 152, 0, 0.15)"; color = "var(--am)"; }
                return (
                  <div key={d} style={{ padding: "10px 2px", textAlign: "center", background: bg, minHeight: "75px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", border: isToday(d) ? "2px solid var(--ind)" : "none" }}>
                    <div style={{ fontSize: "15px", fontWeight: 700, color: "var(--tx)" }}>{String(d).padStart(2, "0")}</div>
                    {status && <div style={{ fontSize: "11px", color: color, marginTop: "4px", fontWeight: 600, wordBreak: "break-word" }}>{status}</div>}
              
      </div>
    );
  })}
            </div>
          </div>
          <div style={{ display: "flex", gap: "12px", marginTop: "16px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "12px", padding: "4px 10px", borderRadius: "12px", background: "rgba(76, 175, 80, 0.15)", color: "var(--ok)", fontWeight: 600 }}>Present</span>
            <span style={{ fontSize: "12px", padding: "4px 10px", borderRadius: "12px", background: "rgba(255, 152, 0, 0.15)", color: "var(--am)", fontWeight: 600 }}>Partial</span>
            <span style={{ fontSize: "12px", padding: "4px 10px", borderRadius: "12px", background: "rgba(244, 67, 54, 0.15)", color: "var(--no)", fontWeight: 600 }}>Absent</span>
          </div>
        </div>

        <div className="card">
          <div className="ctit" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
            <span>Attendance History Logs</span>
            <div className="filter-row">
              <input type="date" value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)} style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid var(--bdr)", background: "var(--sur2)", color: "var(--tx)" }} title="From Date" />
              <input type="date" value={filterTo} onChange={(e) => setFilterTo(e.target.value)} style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid var(--bdr)", background: "var(--sur2)", color: "var(--tx)" }} title="To Date" />
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid var(--bdr)", background: "var(--sur2)", color: "var(--tx)" }}>
                <option value="all">All</option>
                <option value="present">Present</option>
                <option value="absent">Absent</option>
              </select>
            </div>
          </div>
          <div className="tw">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Check In</th>
                  <th>Check Out</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.length > 0 ? (
                  filteredLogs.map((d, i) => (
                    <tr key={i}>
                      <td><b>{d.date}</b></td>
                      <td style={{ fontFamily: "var(--font-dm-mono)" }}>
                        {d.in ? new Date(d.in.seconds * 1000).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "—"}
                      </td>
                      <td style={{ fontFamily: "var(--font-dm-mono)" }}>
                        {d.out ? new Date(d.out.seconds * 1000).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "—"}
                      </td>
                      <td>
                        <span className={`bdg ${d.status === "present" ? "b-ok" : "b-am"}`}>{d.status}</span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" style={{ textAlign: "center", color: "var(--tx3)" }}>
                      No logs found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </>
    );
  };

  const renderCalls = () => {
    const filteredCalls = callsSnap.filter(d => {
      let dateStr = "";
      if (d.timestamp && d.timestamp.seconds) {
        const dt = new Date(d.timestamp.seconds * 1000);
        dt.setMinutes(dt.getMinutes() - dt.getTimezoneOffset());
        dateStr = dt.toISOString().split("T")[0];
      }
      if (callFilterFrom && dateStr && dateStr < callFilterFrom) return false;
      if (callFilterTo && dateStr && dateStr > callFilterTo) return false;
      if (callFilterCustomer && d.customerName && !d.customerName.toLowerCase().includes(callFilterCustomer.toLowerCase())) return false;
      return true;
    }).sort((a,b) => {
       const tA = a.timestamp ? a.timestamp.seconds : 0;
       const tB = b.timestamp ? b.timestamp.seconds : 0;
       return tB - tA;
    });

    const groupedCalls = {};
    filteredCalls.forEach(d => {
      let dStr = "—";
      if (d.timestamp && d.timestamp.seconds) {
        dStr = new Date(d.timestamp.seconds * 1000).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" });
      }
      if (!groupedCalls[dStr]) groupedCalls[dStr] = [];
      groupedCalls[dStr].push(d);
    });
    
    const dateKeys = Object.keys(groupedCalls);
    const itemsPerPage = 7;
    const totalPages = Math.ceil(dateKeys.length / itemsPerPage);
    const paginatedDates = dateKeys.slice((callPage - 1) * itemsPerPage, callPage * itemsPerPage);

    const realToday = new Date();
    realToday.setMinutes(realToday.getMinutes() - realToday.getTimezoneOffset());
    const todayStr = realToday.toISOString().split("T")[0];
    
    let callsTodayCount = 0;
    callsSnap.forEach(c => {
      if (c.timestamp && c.timestamp.seconds) {
        const dt = new Date(c.timestamp.seconds * 1000);
        dt.setMinutes(dt.getMinutes() - dt.getTimezoneOffset());
        if (dt.toISOString().split("T")[0] === todayStr) {
          callsTodayCount++;
        }
      }
    });
    
    let callPoints = 0;
    if (callsTodayCount >= 20) callPoints = 5;
    else if (callsTodayCount >= 16) callPoints = 3;

    let avgDur = 0;
    if (callsSnap.length > 0) {
      avgDur = Math.round(callsSnap.reduce((acc, curr) => acc + (curr.durationMinutes || 5), 0) / callsSnap.length);
    }

    return (
      <>
        <div className="kg">
          <div className="kc gd">
            <div className="ki"><IconPhone /></div>
            <div className="kl">Calls Today</div>
            <div className="kv">{callsTodayCount}</div>
            <div className="ks">Target: 16 (min)</div>
          </div>
          <div className="kc">
            <div className="ki"><IconClock /></div>
            <div className="kl">Avg Duration</div>
            <div className="kv">{avgDur}m</div>
            <div className="ks">Per call</div>
          </div>
          <div className="kc">
            <div className="ki"><IconStar /></div>
            <div className="kl">Call Points</div>
            <div className="kv">{callPoints}</div>
            <div className="ks">16=3, 20=5 pts</div>
          </div>
        </div>
        
        <div className="card">
          <div className="ctit" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
            <span>Call History</span>
            <div className="filter-row">
              <input type="text" placeholder="Search Customer" value={callFilterCustomer} onChange={(e) => {setCallFilterCustomer(e.target.value); setCallPage(1);}} style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid var(--bdr)", background: "var(--sur2)", color: "var(--tx)", width: "150px" }} />
              <input type="date" value={callFilterFrom} onChange={(e) => {setCallFilterFrom(e.target.value); setCallPage(1);}} style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid var(--bdr)", background: "var(--sur2)", color: "var(--tx)" }} title="From Date" />
              <input type="date" value={callFilterTo} onChange={(e) => {setCallFilterTo(e.target.value); setCallPage(1);}} style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid var(--bdr)", background: "var(--sur2)", color: "var(--tx)" }} title="To Date" />
            </div>
          </div>
          <div className="tw">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Customer</th>
                  <th>Phone</th>
                  <th>Status</th>
                  <th>Duration</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {paginatedDates.length > 0 ? (
                  paginatedDates.map((dStr, i) => {
                    const callsInDate = groupedCalls[dStr];
                    const isExpanded = expandedDates[dStr];
                    return (
                      <Fragment key={i}>
                        <tr onClick={() => setExpandedDates(prev => ({...prev, [dStr]: !prev[dStr]}))} style={{ cursor: "pointer", background: "var(--sur2)" }}>
                          <td><b>{dStr}</b></td>
                          <td colSpan="4"><b>{callsInDate.length} Calls Logged</b></td>
                          <td style={{ textAlign: "right" }}>{isExpanded ? "▲" : "▼"}</td>
                        </tr>
                        {isExpanded && callsInDate.map((d, j) => (
                          <tr key={`${i}-${j}`} style={{ background: "var(--sur)" }}>
                            <td style={{ paddingLeft: "30px", fontSize: "13px", color: "var(--tx2)" }}>—</td>
                            <td><b>{d.customerName}</b></td>
                            <td>{d.phoneNumber}</td>
                            <td><span className="bdg b-ok">{d.status}</span></td>
                            <td>{d.durationMinutes}m</td>
                            <td style={{ maxWidth: "150px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={d.notes}>{d.notes || "—"}</td>
                          </tr>
                        ))}
                      </Fragment>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="6" style={{ textAlign: "center", color: "var(--tx3)" }}>
                      No call records found matching criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {totalPages > 1 && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "20px" }}>
              <button className="btn" disabled={callPage === 1} onClick={() => setCallPage(prev => Math.max(1, prev - 1))} style={{ padding: "6px 12px", background: "var(--sur2)", color: "var(--tx)" }}>Previous</button>
              <span style={{ fontSize: "13px", color: "var(--tx2)" }}>Page {callPage} of {totalPages}</span>
              <button className="btn" disabled={callPage === totalPages} onClick={() => setCallPage(prev => Math.min(totalPages, prev + 1))} style={{ padding: "6px 12px", background: "var(--sur2)", color: "var(--tx)" }}>Next</button>
            </div>
          )}
        </div>
      </>
    );
  };

  const renderShops = () => {
    const filteredShops = shopsSnap.filter(d => {
      let dateStr = "";
      if (d.timestamp && d.timestamp.seconds) {
        const dt = new Date(d.timestamp.seconds * 1000);
        dt.setMinutes(dt.getMinutes() - dt.getTimezoneOffset());
        dateStr = dt.toISOString().split("T")[0];
      }
      if (shopFilterFrom && dateStr && dateStr < shopFilterFrom) return false;
      if (shopFilterTo && dateStr && dateStr > shopFilterTo) return false;
      if (shopFilterName && d.shopName && !d.shopName.toLowerCase().includes(shopFilterName.toLowerCase())) return false;
      return true;
    }).sort((a,b) => {
       const tA = a.timestamp ? a.timestamp.seconds : 0;
       const tB = b.timestamp ? b.timestamp.seconds : 0;
       return tB - tA;
    });

    const verifiedCount = shopsSnap.filter(s => s.status === 'verified').length;
    const pendingCount = shopsSnap.filter(s => s.status !== 'verified').length;

    return (
      <>
        <div className="kg" style={{ gridTemplateColumns: "1fr 1fr" }}>
          <div className="kc ok">
            <div className="ki"><IconDiscountCheck /></div>
            <div className="kl">Verified Shops</div>
            <div className="kv">{verifiedCount}</div>
            <div className="ks">Target: 100/mo = 50pts</div>
          </div>
          <div className="kc b-am">
            <div className="ki"><IconHourglass /></div>
            <div className="kl">Pending Verification</div>
            <div className="kv">{pendingCount}</div>
            <div className="ks">Awaiting admin review</div>
          </div>
        </div>
        <div className="card">
          <div className="ctit" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px", marginBottom: "16px" }}>
            <span>Shop Records Database List</span>
            <div className="filter-row">
              <input type="text" placeholder="Search Shop Name" value={shopFilterName} onChange={(e) => setShopFilterName(e.target.value)} style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid var(--bdr)", background: "var(--sur2)", color: "var(--tx)", width: "150px" }} />
              <input type="date" value={shopFilterFrom} onChange={(e) => setShopFilterFrom(e.target.value)} style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid var(--bdr)", background: "var(--sur2)", color: "var(--tx)" }} title="From Date" />
              <input type="date" value={shopFilterTo} onChange={(e) => setShopFilterTo(e.target.value)} style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid var(--bdr)", background: "var(--sur2)", color: "var(--tx)" }} title="To Date" />
            </div>
          </div>
          <div className="tw">
            <table>
              <thead>
                <tr>
                  <th>Shop Name</th>
                  <th>Product Detail</th>
                  <th>Contact Phone</th>
                  <th>Full Address</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredShops.length > 0 ? (
                  filteredShops.map((d, i) => (
                    <tr key={i}>
                      <td><b>{d.shopName}</b></td>
                      <td>{d.productDetail || d.ownerName}</td>
                      <td>{d.phone}</td>
                      <td>{d.address}</td>
                      <td><span className={`bdg ${d.status === 'verified' ? 'b-ok' : 'b-am'}`}>{d.status === 'verified' ? 'Verified' : 'Pending'}</span></td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" style={{ textAlign: "center", color: "var(--tx3)" }}>
                      No shops found matching filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </>
    );
  };

  const renderReports = () => {
    const filteredReps = repsSnap.filter(d => {
      let dateStr = "";
      if (d.timestamp && d.timestamp.seconds) {
        const dt = new Date(d.timestamp.seconds * 1000);
        dt.setMinutes(dt.getMinutes() - dt.getTimezoneOffset());
        dateStr = dt.toISOString().split("T")[0];
      }
      if (repFilterFrom && dateStr && dateStr < repFilterFrom) return false;
      if (repFilterTo && dateStr && dateStr > repFilterTo) return false;
      if (repFilterType !== "all" && d.type !== repFilterType) return false;
      return true;
    }).sort((a,b) => {
       const tA = a.timestamp ? a.timestamp.seconds : 0;
       const tB = b.timestamp ? b.timestamp.seconds : 0;
       return tB - tA;
    });

    const approvedCount = repsSnap.filter(r => r.status === "approved").length;
    const rejectedCount = repsSnap.filter(r => r.status === "rejected").length;
    const pendingCount = repsSnap.length - approvedCount - rejectedCount;
    const weeklyCount = repsSnap.filter(r => r.type === "weekly").length;
    const reportPoints = weeklyCount * 15;

    return (
      <>
        <div className="kg">
          <div className="kc">
            <div className="ki"><IconFileAnalytics /></div>
            <div className="kl">Submitted</div>
            <div className="kv">{repsSnap.length}</div>
          </div>
          <div className="kc ok">
            <div className="ki"><IconCheckbox /></div>
            <div className="kl">Approved</div>
            <div className="kv">{approvedCount}</div>
          </div>
          <div className="kc" style={{ borderTop: "3px solid var(--am)" }}>
            <div className="ki"><IconHourglass style={{ color: "var(--am)" }}/></div>
            <div className="kl">Pending</div>
            <div className="kv">{pendingCount}</div>
          </div>
          <div className="kc" style={{ borderTop: "3px solid var(--no)" }}>
            <div className="ki"><IconX style={{ color: "var(--no)" }}/></div>
            <div className="kl">Rejected</div>
            <div className="kv">{rejectedCount}</div>
          </div>
          <div className="kc gd">
            <div className="ki"><IconStar /></div>
            <div className="kl">Report Points</div>
            <div className="kv">{reportPoints}</div>
            <div className="ks">15 pts per weekly</div>
          </div>
        </div>
        <div className="card" style={{ marginBottom: "20px" }}>
          <div className="ctit" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px", marginBottom: "16px" }}>
            <span>Filed Reports</span>
            <div className="filter-row">
              <input type="date" value={repFilterFrom} onChange={(e) => setRepFilterFrom(e.target.value)} style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid var(--bdr)", background: "var(--sur2)", color: "var(--tx)" }} title="From Date" />
              <input type="date" value={repFilterTo} onChange={(e) => setRepFilterTo(e.target.value)} style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid var(--bdr)", background: "var(--sur2)", color: "var(--tx)" }} title="To Date" />
              <select value={repFilterType} onChange={(e) => setRepFilterType(e.target.value)} style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid var(--bdr)", background: "var(--sur2)", color: "var(--tx)" }}>
                <option value="all">All Types</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
              </select>
            </div>
          </div>
          <div>
            {filteredReps.length > 0 ? (
              filteredReps.map((d, i) => {
                let dStr = "";
                if (d.timestamp && d.timestamp.seconds) {
                  dStr = new Date(d.timestamp.seconds * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
                }
                return (
                  <div key={i} style={{ marginBottom: "12px", padding: "16px", borderRadius: "8px", border: "1px solid var(--bdr)", background: "var(--sur)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                      <h3 style={{ fontWeight: 700, margin: 0, fontSize: "15px" }}>{d.title}</h3>
                      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                        {dStr && <span style={{ fontSize: "12px", color: "var(--tx3)" }}>{dStr}</span>}
                        <span className={`bdg ${d.type === 'weekly' ? 'b-ok' : 'b-am'}`}>{d.type}</span>
                        {d.status === 'approved' ? (
                          <span className="bdg b-ok">Approved</span>
                        ) : d.status === 'rejected' ? (
                          <span className="bdg b-no">Rejected</span>
                        ) : (
                          <span className="bdg b-am">Pending</span>
                        )}
                      </div>
                    </div>
                    <p style={{ color: "var(--tx2)", margin: 0, fontSize: "13px", lineHeight: "1.5" }}>
                      {d.content}
                    </p>
                  </div>
                );
              })
            ) : (
              <div style={{ textAlign: "center", color: "var(--tx3)", padding: "20px" }}>
                No operational report items mapped for criteria.
              </div>
            )}
          </div>
        </div>
      </>
    );
  };

  const renderPoints = () => (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
      <div className="card" style={{ textAlign: "center", padding: "32px" }}>
        <div style={{ fontSize: "58px", fontWeight: 800, color: "var(--ind)", lineHeight: 1 }}>
          {totalPoints}
        </div>
        <div style={{ fontSize: "14px", color: "var(--tx2)", margin: "6px 0 14px" }}>
          Total Accumulation Points
        </div>
        <span className="bdg b-am" style={{ fontSize: "13px", padding: "6px 14px" }}>
          🥈 Rank #2 of 5
        </span>
      </div>
      <div className="card">
        <div className="ctit">Points Breakdown Map</div>
        <div style={{ marginBottom: "10px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
            <span>Attendance Track</span>
            <b>{attPoints} pts</b>
          </div>
        </div>
        <div style={{ marginBottom: "10px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
            <span>Call Conversions</span>
            <b>{callTotalPoints} pts</b>
          </div>
        </div>
        <div style={{ marginBottom: "10px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
            <span>Weekly Submissions</span>
            <b>{repPoints} pts</b>
          </div>
        </div>
        <div style={{ marginBottom: "10px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
            <span>Shop Indexing (Monthly)</span>
            <b>{shopPoints} pts</b>
          </div>
        </div>
      </div>
    </div>
  );

  if (loading)
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
        Loading Matrix...
      </div>
    );

  const userName = activeUser ? activeUser.email.split("@")[0] : "Loading...";
  const userInitials = activeUser ? activeUser.email.substring(0, 2).toUpperCase() : "AM";
  const pageTitle = activeTab === "logs" 
    ? "Logs - " + (activeLogTab.charAt(0).toUpperCase() + activeLogTab.slice(1)) 
    : activeTab.charAt(0).toUpperCase() + activeTab.slice(1);

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
            <div className="bmark" style={{ width: "30px", height: "30px", fontSize: "14px", margin: 0, background: "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <img src="/logo.jpeg" alt="PCA Logo" style={{ width: "40px", height: "auto", mixBlendMode: "multiply", clipPath: "inset(2%)" }} />
            </div>
            <div>
              <div className="bname">PMA FieldOps</div>
              <div className="btag">Employee Portal</div>
            </div>
          </div>
        </div>
        <div className="sb-nav">
          <div className="snl">Navigation</div>
          <button className={`ni ${activeTab === "dashboard" ? "on" : ""}`} onClick={() => { setActiveTab("dashboard"); setIsMobileMenuOpen(false); }}>
            <IconLayoutDashboard size={18} />
            Dashboard
          </button>
          <button className={`ni ${activeTab === "logs" ? "on" : ""}`} onClick={() => { setActiveTab("logs"); setIsMobileMenuOpen(false); }}>
            <IconFileReport size={18} />
            Logs
          </button>
          <button className={`ni ${activeTab === "allocatedTasks" ? "on" : ""}`} onClick={() => { setActiveTab("allocatedTasks"); setIsMobileMenuOpen(false); }}>
            <IconListCheck size={18} />
            Allocated Tasks
          </button>
        </div>
        <div className="sb-foot">
          <div className="upill">
            <div className="uav">{userInitials}</div>
            <div>
              <div className="uname">{userName}</div>
              <div className="urole">Field Executive</div>
            </div>
            <button className="lbtn" onClick={handleLogout} title="Sign Out">
              <IconLogout size={16} />
            </button>
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
              <h1 style={{ fontSize: "17px", fontWeight: 700, margin: 0 }}>{pageTitle}</h1>
              <div style={{ fontSize: "12px", color: "var(--tx3)" }}>
                Thursday, 28 May 2026
              </div>
            </div>
          </div>
        </header>

        <main className="pg">
          {activeTab === "dashboard" && renderDashboard()}
          {activeTab === "allocatedTasks" && renderAllocatedTasks()}
          {activeTab === "logs" && (
            <>
              <div style={{ display: "flex", gap: "10px", marginBottom: "20px", borderBottom: "1px solid var(--bdr)", paddingBottom: "15px", flexWrap: "wrap" }}>
                <button className={`btn ${activeLogTab === "attendance" ? "btn-p" : ""}`} onClick={() => setActiveLogTab("attendance")} style={activeLogTab !== "attendance" ? { background: "var(--sur2)", color: "var(--tx)", border: "1px solid var(--bdr)" } : {}}>Attendance</button>
                <button className={`btn ${activeLogTab === "calls" ? "btn-p" : ""}`} onClick={() => setActiveLogTab("calls")} style={activeLogTab !== "calls" ? { background: "var(--sur2)", color: "var(--tx)", border: "1px solid var(--bdr)" } : {}}>Call Logs</button>
                <button className={`btn ${activeLogTab === "shops" ? "btn-p" : ""}`} onClick={() => setActiveLogTab("shops")} style={activeLogTab !== "shops" ? { background: "var(--sur2)", color: "var(--tx)", border: "1px solid var(--bdr)" } : {}}>Shops</button>
                <button className={`btn ${activeLogTab === "reports" ? "btn-p" : ""}`} onClick={() => setActiveLogTab("reports")} style={activeLogTab !== "reports" ? { background: "var(--sur2)", color: "var(--tx)", border: "1px solid var(--bdr)" } : {}}>Reports</button>
                <button className={`btn ${activeLogTab === "points" ? "btn-p" : ""}`} onClick={() => setActiveLogTab("points")} style={activeLogTab !== "points" ? { background: "var(--sur2)", color: "var(--tx)", border: "1px solid var(--bdr)" } : {}}>Points</button>
              </div>
              {activeLogTab === "attendance" && renderAttendance()}
              {activeLogTab === "calls" && renderCalls()}
              {activeLogTab === "shops" && renderShops()}
              {activeLogTab === "reports" && renderReports()}
              {activeLogTab === "points" && renderPoints()}
            </>
          )}
        </main>
      </div>

      {modalType && (
        <div className="mo" style={{ display: "flex" }}>
          <div className="md">
            {modalType === "call" && (
              <form onSubmit={submitCallForm}>
                <div className="mh">
                  <div>Log Customer Interaction</div>
                  <button type="button" onClick={() => setModalType(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--tx)", padding: 0 }}><IconX size={20} /></button>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                  <div className="fg"><label>Customer Identity *</label><input type="text" name="c_name" placeholder="Ravi Kumar" required /></div>
                  <div className="fg"><label>Phone Number</label><input type="tel" name="c_phone" placeholder="9876543210" pattern="[0-9]*" onInput={(e) => e.target.value = e.target.value.replace(/[^0-9]/g, '')} /></div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                  <div className="fg"><label>Status</label><select name="c_status"><option value="productive">Productive</option><option value="follow-up">Follow-up</option></select></div>
                  <div className="fg"><label>Duration (mins)</label><input type="number" name="c_dur" defaultValue="5" /></div>
                </div>
                <div className="fg"><label>Notes</label><textarea name="c_notes" style={{ width: "100%", minHeight: "60px", borderRadius: "8px", padding: "10px", border: "1.5px solid var(--bdr)" }}></textarea></div>
                <button type="submit" className="btn btn-p" style={{ width: "100%" }}>Write Log Entry</button>
              </form>
            )}

            {modalType === "shop" && (
              <form onSubmit={submitShopForm}>
                <div className="mh">
                  <div>Register Field Shop Document</div>
                  <button type="button" onClick={() => setModalType(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--tx)", padding: 0 }}><IconX size={20} /></button>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                  <div className="fg"><label>Shop Name *</label><input type="text" name="s_name" placeholder="Raj General Store" required /></div>
                  <div className="fg"><label>Product Detail</label><input type="text" name="s_product" placeholder="Dark Chocolate Bars" /></div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                  <div className="fg"><label>Mobile Contact</label><input type="tel" name="s_phone" placeholder="9876000001" pattern="[0-9]*" onInput={(e) => e.target.value = e.target.value.replace(/[^0-9]/g, '')} /></div>
                  <div className="fg"><label>Location Area</label><input type="text" name="s_addr" placeholder="12 MG Road, Chennai" /></div>
                </div>
                <div className="fg">
                  <label>Upload Shop Photo *</label>
                  <input type="file" name="s_photo" accept="image/*" required style={{ border: "1.5px solid var(--bdr)", padding: "8px", borderRadius: "8px", width: "100%" }} />
                </div>
                <button type="submit" className="btn btn-p" style={{ width: "100%", marginTop: "10px" }} disabled={isUploading}>{isUploading ? "Uploading..." : "Commit Shop Index"}</button>
              </form>
            )}

            {modalType === "report" && (
              <form onSubmit={submitReportForm}>
                <div className="mh">
                  <div>File Field Operations Summary Report</div>
                  <button type="button" onClick={() => setModalType(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--tx)", padding: 0 }}><IconX size={20} /></button>
                </div>
                <div className="fg"><label>Report Title Context *</label><input type="text" name="r_title" placeholder="Daily Report — May 28" required /></div>
                <div className="fg"><label>Type Scope</label><select name="r_type" value={reportFormType} onChange={(e) => setReportFormType(e.target.value)}><option value="daily">Daily Log Record</option><option value="weekly">Weekly Compilation Grid</option></select></div>
                {reportFormType === "daily" && (
                  <div className="fg">
                    <label>Total Sales Amount *</label>
                    <input type="number" name="r_sales" placeholder="e.g. 5000" required />
                  </div>
                )}
                <div className="fg"><label>Detailed Core Narrative Content</label><textarea name="r_content" required style={{ width: "100%", minHeight: "80px", borderRadius: "8px", padding: "10px", border: "1.5px solid var(--bdr)" }}></textarea></div>
                <button type="submit" className="btn btn-p" style={{ width: "100%" }}>Transmit Report Log</button>
              </form>
            )}

            {modalType === "task_execution" && selectedTask && (
              <form onSubmit={submitTaskExecution}>
                <div className="mh">
                  <div>Execute Task: {selectedTask.caseCount} Cases Target</div>
                  <button type="button" onClick={() => { setModalType(null); setSelectedTask(null); }} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--tx)", padding: 0 }}><IconX size={20} /></button>
                </div>
                <div style={{ marginBottom: "16px", padding: "12px", background: "var(--sur2)", borderRadius: "8px", fontSize: "13px" }}>
                  <b>Progress:</b> {selectedTask.completedCases || 0} out of {selectedTask.caseCount} cases completed. Remaining: {Math.max(0, selectedTask.caseCount - (selectedTask.completedCases || 0))}.
                </div>
                <div className="fg"><label>Agency Name *</label><input type="text" name="t_agency" placeholder="e.g. ABC Agency" required /></div>
                <div className="fg"><label>Product Name *</label><input type="text" name="t_product" placeholder="e.g. Dark Chocolate" required /></div>
                <div className="fg">
                  <label>Cases Completed for this Agency *</label>
                  <input type="number" name="t_cases" placeholder="e.g. 12" required min="1" max={selectedTask.caseCount - (selectedTask.completedCases || 0)} onInput={(e) => {
                    const maxVal = selectedTask.caseCount - (selectedTask.completedCases || 0);
                    if (parseInt(e.target.value) > maxVal) e.target.value = maxVal;
                  }} />
                </div>
                <button type="submit" className="btn btn-p" style={{ width: "100%", marginTop: "10px" }}>Submit Execution Log</button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
