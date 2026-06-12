"use client";

import React, { useState, useEffect, Fragment } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
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
  IconTarget,
} from "@tabler/icons-react";

const getLocalToday = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().split("T")[0];
};

const extractReportData = (rep) => {
  let from_date = rep.from_date;
  let to_date = rep.to_date;
  let cb_count = parseInt(rep.cb_count) || 0;

  if ((!from_date || !to_date || !cb_count) && rep.content) {
    const periodMatch = rep.content.match(/Period:\s*(\d{4}-\d{2}-\d{2})\s*to\s*(\d{4}-\d{2}-\d{2})/i);
    if (periodMatch) {
      if (!from_date) from_date = periodMatch[1];
      if (!to_date) to_date = periodMatch[2];
    }
    if (!cb_count) {
       const cbsMatches = [...rep.content.matchAll(/-\s*(\d+)\s*CBs/gi)];
       if (cbsMatches.length > 0) {
           cb_count = cbsMatches.reduce((sum, match) => sum + parseInt(match[1]), 0);
       } else {
           const cbMatch = rep.content.match(/(\d+)\s*CBs/i);
           if (cbMatch) cb_count = parseInt(cbMatch[1]);
       }
    }
  }
  return { from_date, to_date, cb_count };
};

export default function EmployeeDashboard() {
  const router = useRouter();
  const [activeUser, setActiveUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [activeLogTab, setActiveLogTab] = useState("attendance");
  const [currentTime, setCurrentTime] = useState("");
  const [reportFormType, setReportFormType] = useState("weekly");
  const [isUploading, setIsUploading] = useState(false);

  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [filterFrom, setFilterFrom] = useState(getLocalToday());
  const [filterTo, setFilterTo] = useState(getLocalToday());
  const [filterStatus, setFilterStatus] = useState("all");

  const [callFilterFrom, setCallFilterFrom] = useState(getLocalToday());
  const [callFilterTo, setCallFilterTo] = useState(getLocalToday());
  const [callFilterCustomer, setCallFilterCustomer] = useState("");
  const [callPage, setCallPage] = useState(1);
  const [expandedDates, setExpandedDates] = useState({});

  const [shopFilterFrom, setShopFilterFrom] = useState(getLocalToday());
  const [shopFilterTo, setShopFilterTo] = useState(getLocalToday());
  const [shopFilterName, setShopFilterName] = useState("");
  const [repFilterFrom, setRepFilterFrom] = useState(getLocalToday());
  const [repFilterTo, setRepFilterTo] = useState(getLocalToday());
  const [repFilterType, setRepFilterType] = useState("all");

  const [pointFilterPeriod, setPointFilterPeriod] = useState("all");
  const [pointFilterFrom, setPointFilterFrom] = useState(getLocalToday());
  const [pointFilterTo, setPointFilterTo] = useState(getLocalToday());

  const [callsSnap, setCallsSnap] = useState([]);
  const [shopsSnap, setShopsSnap] = useState([]);
  const [repsSnap, setRepsSnap] = useState([]);
  const [attSnap, setAttSnap] = useState([]);
  const [tasksSnap, setTasksSnap] = useState([]);

  const [modalType, setModalType] = useState(null); // 'call', 'shop', 'report'
  const [productiveShops, setProductiveShops] = useState([{ name: "", location: "" }]);
  const [reportAgencies, setReportAgencies] = useState([{ name: "", cgs: "" }]);
  const [actualName, setActualName] = useState("");

  const getTaskProgress = (task) => {
    let achievedCBs = 0;
    let unreviewedReports = 0;
    if (repsSnap) {
      repsSnap.forEach(rep => {
        const { from_date, to_date, cb_count } = extractReportData(rep);
        if (from_date && to_date && from_date >= task.from_date && to_date <= task.to_date) {
          if (rep.status === 'approved' || rep.status === 'approved_no_points') {
            achievedCBs += cb_count;
          } else if (rep.status !== 'rejected') {
            unreviewedReports++;
          }
        }
      });
    }
    const percent = task.cgs_count > 0 ? Math.floor((achievedCBs / task.cgs_count) * 100) : 0;
    
    let points = 0;
    if (percent >= 100) points = 100;
    else if (percent >= 90) points = 75;

    const todayStr = getLocalToday();
    let computedStatus = "Active";
    if (todayStr > task.to_date) {
      computedStatus = unreviewedReports > 0 ? "Pending Settlement" : "Closed";
    }

    return { achievedCBs, unreviewedReports, percent, points, status: computedStatus };
  };

  useEffect(() => {
    const fetchSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/");
      } else {
        setActiveUser(session.user);
        fetchData(session.user);
      }
    };
    fetchSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        router.push("/");
      } else {
        setActiveUser(session.user);
        fetchData(session.user);
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
      subscription?.unsubscribe();
      clearInterval(timer);
    };
  }, [router]);

  const fetchData = async (user) => {
    try {
      const [calls, shops, reps, att, employeeRes, tasksRes] = await Promise.all([
        supabase.from('calls').select('*').ilike('logged_by', user.email),
        supabase.from('shops').select('*').ilike('logged_by', user.email),
        supabase.from('reports').select('*').ilike('logged_by', user.email),
        supabase.from('attendance').select('*').ilike('email', user.email),
        supabase.from('employees').select('name').ilike('email', user.email).single(),
        supabase.from('tasks').select('*').ilike('employee_email', user.email),
      ]);

      const allCalls = calls.data || [];
      const mapCalls = allCalls.map(d => ({ ...d, customerName: d.customer_name, phoneNumber: d.phone_number, durationMinutes: d.duration_minutes, loggedBy: d.logged_by, timestamp: d.created_at ? { seconds: new Date(d.created_at).getTime() / 1000 } : null })) || [];
      const mapShops = shops.data?.map(d => ({ ...d, shopName: d.shop_name, productDetail: d.product_detail, imageUrl: d.image_url, loggedBy: d.logged_by, timestamp: d.created_at ? { seconds: new Date(d.created_at).getTime() / 1000 } : null })) || [];
      const mapReps = reps.data?.map(d => ({ ...d, totalSalesAmount: d.total_sales_amount, loggedBy: d.logged_by, timestamp: d.created_at ? { seconds: new Date(d.created_at).getTime() / 1000 } : null })) || [];
      const mapAtt = att.data?.map(d => ({ ...d, employeeName: d.employee_name, inPhotoUrl: d.in_photo_url, outPhotoUrl: d.out_photo_url, in: d.in_time ? { seconds: new Date(d.in_time).getTime() / 1000 } : null, out: d.out_time ? { seconds: new Date(d.out_time).getTime() / 1000 } : null, timestamp: d.created_at ? { seconds: new Date(d.created_at).getTime() / 1000 } : null })) || [];

      setCallsSnap(mapCalls);
      setShopsSnap(mapShops);
      setRepsSnap(mapReps);
      setAttSnap(mapAtt);
      setTasksSnap(tasksRes.data || []);
      if (employeeRes.data && employeeRes.data.name) {
        setActualName(employeeRes.data.name);
      }
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

  const checkIn = async (photoUrl) => {
    try {
      const realToday = new Date();
      realToday.setMinutes(realToday.getMinutes() - realToday.getTimezoneOffset());
      const todayStr = realToday.toISOString().split("T")[0];

      const { error } = await supabase.from("attendance").insert({
        employee_name: activeUser.email.split("@")[0],
        email: activeUser.email,
        date: todayStr,
        in_time: new Date().toISOString(),
        in_photo_url: photoUrl || null,
        out_time: null,
        status: "present",
        points: 0,
      });

      if (error) throw error;
      alert("Checked in successfully!");
      fetchData(activeUser);
    } catch (err) {
      alert(err.message);
    }
  };

  const checkOut = async (docObj, photoUrl) => {
    try {
      let earnedPoints = 0;

      const { error } = await supabase.from("attendance").update({
        out_time: new Date().toISOString(),
        out_photo_url: photoUrl || null,
        points: earnedPoints,
      }).eq('id', docObj.id);

      if (error) throw error;
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
      const fileName = `attendance/${Date.now()}_${file.name}`;
      const { data, error: uploadError } = await supabase.storage
        .from('images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('images')
        .getPublicUrl(fileName);

      const photoUrl = publicUrl;

      const realToday = new Date();
      realToday.setMinutes(realToday.getMinutes() - realToday.getTimezoneOffset());
      const todayStr = realToday.toISOString().split("T")[0];
      const todayAttRecord = attSnap.find((d) => d.date === todayStr);

      if (!todayAttRecord) {
        await checkIn(photoUrl);
      } else if (todayAttRecord && !todayAttRecord.out) {
        await checkOut(todayAttRecord, photoUrl);
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
    const beat = fd.get("beat_name");
    const totalSales = fd.get("total_sales");
    const numCalls = parseInt(fd.get("num_calls"), 10);
    const notes = fd.get("notes") || "—";

    try {
      const insertData = {
        customer_name: beat,
        phone_number: totalSales || "—",
        status: "Pending Verification",
        duration_minutes: numCalls,
        notes: notes,
        logged_by: activeUser.email,
        created_at: new Date().toISOString(),
      };

      const { error } = await supabase.from("calls").insert(insertData);

      if (error) throw error;
      alert("Productive Call logged successfully!");
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
        const fileName = `shops/${Date.now()}_${photoFile.name}`;
        const { error: uploadError } = await supabase.storage.from('images').upload(fileName, photoFile);
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from('images').getPublicUrl(fileName);
        imageUrl = publicUrl;
      }

      const { error } = await supabase.from("shops").insert({
        shop_name: fd.get("s_name"),
        product_detail: fd.get("s_product") || "—",
        phone: fd.get("s_phone") || "—",
        address: fd.get("s_addr") || "—",
        image_url: imageUrl,
        status: "pending",
        logged_by: activeUser.email,
        created_at: new Date().toISOString(),
      });
      if (error) throw error;
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

    const fromDate = fd.get("r_from_date");
    const toDate = fd.get("r_to_date");
    const note = fd.get("r_note");

    let formattedContent = `Period: ${fromDate} to ${toDate}\n\nAgencies Visited:\n`;
    reportAgencies.forEach((agency, index) => {
      formattedContent += `${index + 1}. ${agency.name} - ${agency.cgs} CBs\n`;
    });
    if (note) {
      formattedContent += `\nNote:\n${note}`;
    }

    try {
      const reportData = {
        title: fd.get("r_title"),
        type: rType,
        content: formattedContent,
        logged_by: activeUser.email,
        created_at: new Date().toISOString(),
      };
      const { error } = await supabase.from("reports").insert(reportData);
      if (error) throw error;
      alert("Report successfully filed!");
      setModalType(null);
      setReportFormType("weekly");
      setReportAgencies([{ name: "", cgs: "" }]);
      fetchData(activeUser);
    } catch (err) {
      alert(err.message);
    }
  };

  // Points Calculation for Dashboard (All Time)
  const allAttPoints = attSnap.reduce((acc, curr) => acc + (curr.points || 0), 0);
  let totalCallCount = 0;
  callsSnap.forEach(c => {
    totalCallCount += (c.durationMinutes || 0);
  });
  let allCallPoints = 0;
  if (totalCallCount >= 20) allCallPoints = 5;
  else if (totalCallCount >= 16) allCallPoints = 2;
  const allRepPoints = repsSnap.filter(r => r.type === "weekly" && r.status === "approved").length * 15;
  const allShopPoints = Math.floor(shopsSnap.length / 100) * 50;

  let allTargetPoints = 0;
  if (tasksSnap) {
    tasksSnap.forEach(task => {
      let achievedCBs = 0;
      if (repsSnap) {
        repsSnap.forEach(rep => {
          const { from_date, to_date, cb_count } = extractReportData(rep);
          if (from_date && to_date && from_date >= task.from_date && to_date <= task.to_date) {
            if (rep.status === 'approved' || rep.status === 'approved_no_points') {
              achievedCBs += cb_count;
            }
          }
        });
      }
      const percent = task.cgs_count > 0 ? Math.floor((achievedCBs / task.cgs_count) * 100) : 0;
      let points = 0;
      if (percent >= 100) points = 100;
      else if (percent >= 90) points = 75;
      allTargetPoints += points;
    });
  }

  const totalPoints = allAttPoints + allCallPoints + allRepPoints + allShopPoints + allTargetPoints;

  // Calls Today Calculation for Dashboard
  const realToday = new Date();
  realToday.setMinutes(realToday.getMinutes() - realToday.getTimezoneOffset());
  const todayStr = realToday.toISOString().split("T")[0];
  let callsTodayCount = 0;
  callsSnap.forEach(c => {
    if (
      c.status === "Verified" &&
      c.timestamp &&
      c.timestamp.seconds
    ) {
      const dt = new Date(c.timestamp.seconds * 1000);
      dt.setMinutes(dt.getMinutes() - dt.getTimezoneOffset());

      if (dt.toISOString().split("T")[0] === todayStr) {
        callsTodayCount += (c.durationMinutes || 0);
      }
    }
  });

  const renderDashboard = () => {
    const todayAtt = attSnap.find((d) => d.date === todayStr);

    let shiftHrs = 0;
    if (todayAtt && todayAtt.in && todayAtt.in.seconds) {
      const inTime = todayAtt.in.seconds * 1000;
      const outTime = todayAtt.out ? todayAtt.out.seconds * 1000 : Date.now();
      shiftHrs = (outTime - inTime) / (1000 * 60 * 60);
    }
    const shiftPercent = Math.min(100, (shiftHrs / 4) * 100);

    const hour = new Date().getHours();
    const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

    return (
      <>
        <style>{`
          .dashboard-layout {
            display: flex;
            flex-direction: column;
            gap: 16px;
          }
          .dashboard-stats-grid {
            order: 1;
            margin-bottom: 0 !important;
          }
          .dashboard-top-section {
            order: 2;
            display: grid;
            grid-template-columns: 1.2fr 1fr;
            gap: 16px;
          }
          @media (max-width: 768px) {
            .dashboard-top-section {
              display: flex;
              flex-direction: column;
              order: 1;
            }
            .dashboard-stats-grid {
              order: 2;
            }
          }
        `}</style>
        <div style={{ marginBottom: "16px" }}>
          <h2 style={{ fontSize: "22px", fontWeight: 800 }}>
            {greeting}, {userName ? userName.charAt(0).toUpperCase() + userName.slice(1) : 'Agent'}! 👋
          </h2>
          <p style={{ color: "var(--tx2)", margin: "4px 0 0 0" }}>
            Here's your productivity overview for today.
          </p>
        </div>

        <div className="dashboard-layout">
          <div className="kg dashboard-stats-grid">
            <div className="kc">
              <div className="ki"><IconTrophy /></div>
              <div className="kl">Total Points</div>
              <div className="kv">{totalPoints}</div>
              <div className="ks">🥈 Active Session</div>
            </div>
            <div className="kc gd">
              <div className="ki"><IconPhoneCall /></div>
              <div className="kl">Productive Calls</div>
              <div className="kv">{callsTodayCount}</div>
              <div className="ks">Target: 16 (min)</div>
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

          <div className="dashboard-top-section">
            <div className="ach" style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", margin: 0, padding: "30px", background: "var(--sur)", borderRadius: "12px", border: "1px solid var(--bd)" }}>
              <div style={{ textAlign: "center", width: "100%" }}>
                <div style={{ fontSize: "36px", fontWeight: 700, color: "var(--tx)", marginBottom: "4px" }}>{currentTime}</div>
                <div style={{ fontSize: "14px", color: "var(--tx2)", marginBottom: "24px" }}>{new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</div>
                {todayAtt ? (
                  todayAtt.out ? (
                    <button className="btn" disabled style={{ background: "rgba(255,255,255,0.1)", color: "var(--tx2)", padding: "12px 0", borderRadius: "30px", fontWeight: 600, width: "100%" }}>Shift Completed for Today</button>
                  ) : (
                    <div style={{ position: "relative", width: "100%" }}>
                      <input type="file" accept="image/*" onChange={handleAttendancePhoto} disabled={isUploading} style={{ position: "absolute", opacity: 0, width: "100%", height: "100%", cursor: "pointer", top: 0, left: 0, zIndex: 10 }} />
                      <button className="btn" style={{ background: "var(--no)", color: "#fff", padding: "12px 0", borderRadius: "30px", fontWeight: 700, width: "100%", display: "flex", justifyContent: "center", gap: "6px" }}>
                        <IconLogout size={16} /> {isUploading ? "Uploading..." : "Take Photo to Check Out"}
                      </button>
                    </div>
                  )
                ) : (
                  <div style={{ position: "relative", width: "100%" }}>
                    <input type="file" accept="image/*" onChange={handleAttendancePhoto} disabled={isUploading} style={{ position: "absolute", opacity: 0, width: "100%", height: "100%", cursor: "pointer", top: 0, left: 0, zIndex: 10 }} />
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
                  <button className="btn btn-p" style={{ padding: "12px", fontWeight: 600, display: "flex", justifyContent: "center", gap: "8px", width: "100%" }} onClick={() => setModalType("call")}><IconPhoneCall size={18} /> Log Productive Call</button>
                  <button className="btn btn-p" style={{ padding: "12px", fontWeight: 600, display: "flex", justifyContent: "center", gap: "8px", width: "100%" }} onClick={() => setModalType("shop")}><IconBuildingStore size={18} /> Add Shop</button>
                  <button className="btn btn-p" style={{ padding: "12px", fontWeight: 600, display: "flex", justifyContent: "center", gap: "8px", width: "100%" }} onClick={() => { setModalType("report"); setReportFormType("weekly"); }}><IconFileReport size={18} /> New Report</button>
                </div>
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
      if (new Date(calYear, calMonth, d).getDay() === 0) return "Holiday";
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

    const logsWithDynStatus = attSnap.map(d => {
      let dynStatus = d.status;
      if (d.status === "present" && d.in && d.in.seconds) {
        const inTime = d.in.seconds * 1000;
        const outTime = d.out ? d.out.seconds * 1000 : Date.now();
        const hrs = (outTime - inTime) / (1000 * 60 * 60);
        if (hrs < 4) dynStatus = "partial";
      }
      return { ...d, dynStatus };
    });

    const filteredLogs = logsWithDynStatus.filter(d => {
      if (filterFrom && d.date < filterFrom) return false;
      if (filterTo && d.date > filterTo) return false;
      if (filterStatus !== "all" && d.dynStatus !== filterStatus) return false;
      return true;
    }).sort((a, b) => new Date(b.date) - new Date(a.date));

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
                else if (status === "Holiday") { bg = "rgba(148, 163, 184, 0.15)"; color = "var(--tx2)"; }
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
            <span style={{ fontSize: "12px", padding: "4px 10px", borderRadius: "12px", background: "rgba(148, 163, 184, 0.15)", color: "var(--tx2)", fontWeight: 600 }}>Holiday</span>
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
                <option value="partial">Partial</option>
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
                        <span className={`bdg ${d.dynStatus === "present" ? "b-ok" : d.dynStatus === "partial" ? "b-am" : "b-no"}`}>{d.dynStatus}</span>
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
    }).sort((a, b) => {
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

    let callPoints = 0;
    let totalVerifiedToday = 0;

    callsSnap.forEach(c => {
      if (
        c.status === "Verified" &&
        c.timestamp &&
        c.timestamp.seconds
      ) {
        const dt = new Date(c.timestamp.seconds * 1000);
        dt.setMinutes(dt.getMinutes() - dt.getTimezoneOffset());

        if (dt.toISOString().split("T")[0] === todayStr) {
          totalVerifiedToday += (c.durationMinutes || 0);
        }
      }
    });
    if (totalVerifiedToday >= 20) callPoints = 5;
    else if (totalVerifiedToday >= 16) callPoints = 2;

    return (
      <>
        <div className="kg">
          <div className="kc gd">
            <div className="ki"><IconPhone /></div>
            <div className="kl">Productive Calls Today</div>
            <div className="kv">{callsTodayCount}</div>
            <div className="ks">Target: 16 (min)</div>
          </div>
          <div className="kc">
            <div className="ki"><IconStar /></div>
            <div className="kl">Productive Points (Today)</div>
            <div className="kv">{callPoints}</div>
            <div className="ks">16=2, 20=5 pts</div>
          </div>
        </div>

        <div className="card">
          <div className="ctit" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
            <span>Productive Calls History</span>
            <div className="filter-row">
              <input type="text" placeholder="Search Beat Area" value={callFilterCustomer} onChange={(e) => { setCallFilterCustomer(e.target.value); setCallPage(1); }} style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid var(--bdr)", background: "var(--sur2)", color: "var(--tx)", width: "150px" }} />
              <input type="date" value={callFilterFrom} onChange={(e) => { setCallFilterFrom(e.target.value); setCallPage(1); }} style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid var(--bdr)", background: "var(--sur2)", color: "var(--tx)" }} title="From Date" />
              <input type="date" value={callFilterTo} onChange={(e) => { setCallFilterTo(e.target.value); setCallPage(1); }} style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid var(--bdr)", background: "var(--sur2)", color: "var(--tx)" }} title="To Date" />
            </div>
          </div>
          <div className="tw">
            <table>
              <thead>
                <tr>
                  <th>Beat (Area) / Date</th>
                  <th>Number of Calls</th>
                  <th>Total Sales</th>
                  <th>Notes</th>
                  <th>Status</th>
                  <th>Points</th>
                </tr>
              </thead>
              <tbody>
                {paginatedDates.length > 0 ? (
                  paginatedDates.map((dStr, i) => {
                    const callsInDate = groupedCalls[dStr];
                    const isExpanded = expandedDates[dStr];
                    return (
                      <Fragment key={i}>
                        <tr onClick={() => setExpandedDates(prev => ({ ...prev, [dStr]: !prev[dStr] }))} style={{ cursor: "pointer", background: "var(--sur2)" }}>
                          <td><b>{dStr}</b></td>
                          <td colSpan="4"><b>{callsInDate.length} Beat Report(s) Logged</b></td>
                          <td style={{ textAlign: "right" }}>{isExpanded ? "▲" : "▼"}</td>
                        </tr>
                        {isExpanded && callsInDate.map((c, j) => {
                          const itemPoints = c.status === "Verified" ? (c.durationMinutes >= 20 ? 5 : c.durationMinutes >= 16 ? 2 : 0) : 0;
                          return (
                            <tr key={`${i}-${j}`} style={{ background: "var(--sur)" }}>
                              <td style={{ paddingLeft: "20px" }}>📍 {c.customerName || "—"}</td>
                              <td style={{ fontFamily: "var(--font-dm-mono)" }}>{c.durationMinutes || 0}</td>
                              <td style={{ fontWeight: 600 }}>{c.phoneNumber || "—"}</td>
                              <td style={{ color: "var(--tx2)", fontSize: "13px" }}>{c.notes || "—"}</td>
                              <td>
                                <span className={`bdg ${c.status === "Verified" ? "b-ok" : c.status === "Rejected" ? "b-no" : "b-am"}`}>
                                  {c.status || "Pending Verification"}
                                </span>
                              </td>
                              <td style={{ fontWeight: 600, color: itemPoints > 0 ? "var(--ok)" : "var(--tx3)" }}>
                                {itemPoints > 0 ? `+${itemPoints} pts` : "—"}
                              </td>
                            </tr>
                          );
                        })}
                      </Fragment>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="6" style={{ textAlign: "center", color: "var(--tx3)" }}>
                      No productive call records found matching criteria.
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
    }).sort((a, b) => {
      const tA = a.timestamp ? a.timestamp.seconds : 0;
      const tB = b.timestamp ? b.timestamp.seconds : 0;
      return tB - tA;
    });

    const verifiedCount = shopsSnap.filter(s => s.status === 'verified').length;
    const pendingCount = shopsSnap.filter(s => s.status !== 'verified').length;

    return (
      <>
        <div className="kg" style={{ gridTemplateColumns: "1fr 1fr" }}>
          <div className="kc ok" style={{ position: "relative", overflow: "hidden" }}>
            <div className="ki"><IconDiscountCheck /></div>
            <div className="kl">Verified Shops</div>
            <div className="kv">{verifiedCount}</div>
            <div className="ks">Monthly Progress (Target: 100)</div>
            <div style={{ marginTop: "12px", background: "var(--bdr)", height: "6px", borderRadius: "4px", overflow: "hidden", position: "relative" }}>
              <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${Math.min(100, (verifiedCount / 100) * 100)}%`, background: "var(--ok)", transition: "width 0.5s ease" }}></div>
            </div>
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
    }).sort((a, b) => {
      const tA = a.timestamp ? a.timestamp.seconds : 0;
      const tB = b.timestamp ? b.timestamp.seconds : 0;
      return tB - tA;
    });

    const approvedCount = repsSnap.filter(r => r.status === "approved" || r.status === "approved_no_points").length;
    const rejectedCount = repsSnap.filter(r => r.status === "rejected").length;
    const pendingCount = repsSnap.length - approvedCount - rejectedCount;
    const weeklyCount = repsSnap.filter(r => r.type === "weekly" && r.status === "approved").length;
    const reportPoints = weeklyCount * 15;

    return (
      <>
        <style>{`
          @media (max-width: 768px) {
            .reports-stats-grid {
              display: grid !important;
              grid-template-columns: repeat(6, 1fr) !important;
              gap: 10px !important;
            }
            .reports-stats-grid > .kc {
              grid-column: span 2;
              padding: 12px 8px !important;
              min-width: 0;
            }
            .reports-stats-grid > .kc:nth-child(4),
            .reports-stats-grid > .kc:nth-child(5) {
              grid-column: span 3;
            }
            .reports-stats-grid .kl {
              font-size: 11px !important;
              line-height: 1.2 !important;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }
            .reports-stats-grid .kv {
              font-size: 20px !important;
              margin: 4px 0 !important;
            }
            .reports-stats-grid .ks {
              font-size: 10px !important;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }
            .reports-stats-grid .ki {
              margin-bottom: 8px !important;
              width: 28px !important;
              height: 28px !important;
            }
            .reports-stats-grid .ki svg {
              width: 16px !important;
              height: 16px !important;
            }
          }
        `}</style>
        <div className="kg reports-stats-grid">
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
            <div className="ki"><IconHourglass style={{ color: "var(--am)" }} /></div>
            <div className="kl">Pending</div>
            <div className="kv">{pendingCount}</div>
          </div>
          <div className="kc" style={{ borderTop: "3px solid var(--no)" }}>
            <div className="ki"><IconX style={{ color: "var(--no)" }} /></div>
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
                          <span className="bdg b-ok">Approved +15 Points</span>
                        ) : d.status === 'approved_no_points' ? (
                          <span className="bdg b-am">Approved (No Points)</span>
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

  const renderTargets = () => {
    const sortedTasks = [...tasksSnap].sort((a, b) => new Date(b.from_date) - new Date(a.from_date));
    
    const currentTarget = sortedTasks.find(task => {
      const { status } = getTaskProgress(task);
      return status === "Active";
    }) || sortedTasks[0];

    const currentProgress = currentTarget ? getTaskProgress(currentTarget) : null;
    const remainingCBs = currentTarget && currentProgress ? Math.max(0, currentTarget.cgs_count - currentProgress.achievedCBs) : 0;

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        {currentTarget && currentProgress ? (
          <div className="card" style={{ padding: "28px", border: "1px solid var(--bdr)", background: "var(--sur)", position: "relative" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px", marginBottom: "20px" }}>
              <div>
                <span className="bdg b-ok" style={{ textTransform: "uppercase", fontSize: "11px", tracking: "0.05em", marginBottom: "6px" }}>Current Target Period</span>
                <h2 style={{ fontSize: "20px", fontWeight: 800, color: "var(--tx)", margin: 0 }}>
                  {new Date(currentTarget.from_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} &rarr; {new Date(currentTarget.to_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                </h2>
              </div>
              <div style={{ display: "flex", gap: "10px" }}>
                <span className={`bdg ${currentProgress.status === "Active" ? "b-ok" : currentProgress.status === "Pending Settlement" ? "b-am" : "b-no"}`} style={{ fontSize: "12px", padding: "4px 12px" }}>
                  {currentProgress.status}
                </span>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "16px", marginBottom: "24px" }}>
              <div style={{ background: "rgba(93, 64, 55, 0.03)", padding: "16px", borderRadius: "12px", border: "1px solid var(--bdr)", textAlign: "center" }}>
                <div style={{ fontSize: "11px", color: "var(--tx3)", fontWeight: 500, marginBottom: "4px" }}>Assigned Target</div>
                <div style={{ fontSize: "22px", fontWeight: 800, color: "var(--ind)" }}>{currentTarget.cgs_count} <span style={{ fontSize: "12px", color: "var(--tx3)" }}>CBs</span></div>
              </div>
              <div style={{ background: "rgba(93, 64, 55, 0.03)", padding: "16px", borderRadius: "12px", border: "1px solid var(--bdr)", textAlign: "center" }}>
                <div style={{ fontSize: "11px", color: "var(--tx3)", fontWeight: 500, marginBottom: "4px" }}>Completed</div>
                <div style={{ fontSize: "22px", fontWeight: 800, color: "var(--ok)" }}>{currentProgress.achievedCBs} <span style={{ fontSize: "12px", color: "var(--tx3)" }}>CBs</span></div>
              </div>
              <div style={{ background: "rgba(93, 64, 55, 0.03)", padding: "16px", borderRadius: "12px", border: "1px solid var(--bdr)", textAlign: "center" }}>
                <div style={{ fontSize: "11px", color: "var(--tx3)", fontWeight: 500, marginBottom: "4px" }}>Remaining</div>
                <div style={{ fontSize: "22px", fontWeight: 800, color: remainingCBs > 0 ? "var(--warn)" : "var(--ok)" }}>{remainingCBs} <span style={{ fontSize: "12px", color: "var(--tx3)" }}>CBs</span></div>
              </div>
              <div style={{ background: "rgba(93, 64, 55, 0.03)", padding: "16px", borderRadius: "12px", border: "1px solid var(--bdr)", textAlign: "center" }}>
                <div style={{ fontSize: "11px", color: "var(--tx3)", fontWeight: 500, marginBottom: "4px" }}>Achievement %</div>
                <div style={{ fontSize: "22px", fontWeight: 800, color: "var(--ind)" }}>{currentProgress.percent}%</div>
              </div>
              <div style={{ background: "rgba(93, 64, 55, 0.03)", padding: "16px", borderRadius: "12px", border: "1px solid var(--bdr)", textAlign: "center" }}>
                <div style={{ fontSize: "11px", color: "var(--tx3)", fontWeight: 500, marginBottom: "4px" }}>Target Points</div>
                <div style={{ fontSize: "22px", fontWeight: 800, color: "var(--ind)" }}>{currentProgress.points} <span style={{ fontSize: "12px", color: "var(--tx3)" }}>pts</span></div>
              </div>
            </div>

            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "13px", fontWeight: 600, color: "var(--tx2)", marginBottom: "8px" }}>
                <span>Target Progress Bar</span>
                <span>{currentProgress.achievedCBs} / {currentTarget.cgs_count} CBs ({currentProgress.percent}%)</span>
              </div>
              <div style={{ background: "var(--sur2)", height: "12px", borderRadius: "6px", overflow: "hidden", position: "relative" }}>
                <div style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  height: "100%",
                  width: `${Math.min(100, currentProgress.percent)}%`,
                  background: currentProgress.percent >= 100 ? "var(--ok)" : currentProgress.percent >= 90 ? "var(--ind)" : "var(--warn)",
                  borderRadius: "6px",
                  transition: "width 0.5s ease"
                }}></div>
              </div>
            </div>
            
            {currentTarget.notes && (
              <div style={{ marginTop: "20px", padding: "12px 16px", background: "rgba(0,0,0,0.02)", borderRadius: "8px", borderLeft: "3px solid var(--ind)", fontSize: "13px", color: "var(--tx2)" }}>
                <strong>Manager's Note:</strong> {currentTarget.notes}
              </div>
            )}
          </div>
        ) : (
          <div className="card" style={{ padding: "40px 20px", textAlign: "center", color: "var(--tx3)" }}>
            <IconTarget size={48} style={{ margin: "0 auto 12px", opacity: 0.5, display: "block" }} />
            <div style={{ fontWeight: 600, fontSize: "15px", color: "var(--tx2)" }}>No Active Targets Assigned</div>
            <p style={{ fontSize: "13px", margin: "4px 0 0" }}>When your manager assigns a target, it will appear here.</p>
          </div>
        )}

        <div className="card">
          <div className="ctit">Target History Section</div>
          <div className="tw">
            <table>
              <thead>
                <tr>
                  <th>Target Period</th>
                  <th>Target CBs</th>
                  <th>Completed CBs</th>
                  <th>Achievement %</th>
                  <th>Status</th>
                  <th>Points Earned</th>
                </tr>
              </thead>
              <tbody>
                {sortedTasks.length > 0 ? (
                  sortedTasks.map((task, i) => {
                    const prog = getTaskProgress(task);
                    return (
                      <tr key={i}>
                        <td style={{ fontWeight: 600 }}>
                          {new Date(task.from_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} &rarr; {new Date(task.to_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                        </td>
                        <td>{task.cgs_count} CBs</td>
                        <td style={{ fontWeight: 600, color: "var(--tx2)" }}>{prog.achievedCBs}</td>
                        <td>
                          <span style={{ fontWeight: "bold" }}>{prog.percent}%</span>
                        </td>
                        <td>
                          <span className={`bdg ${prog.status === "Active" ? "b-ok" : prog.status === "Pending Settlement" ? "b-am" : "b-no"}`}>
                            {prog.status}
                          </span>
                        </td>
                        <td style={{ fontWeight: 700, color: prog.points > 0 ? "var(--ok)" : "var(--tx3)" }}>
                          {prog.points > 0 ? `+${prog.points} pts` : "0 pts"}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="6" style={{ textAlign: "center", color: "var(--tx3)" }}>No target history records found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderPoints = () => {
    const isWithinPointFilter = (timestamp) => {
      if (!timestamp || !timestamp.seconds) return false;
      const dt = new Date(timestamp.seconds * 1000);
      dt.setMinutes(dt.getMinutes() - dt.getTimezoneOffset());
      const dateStr = dt.toISOString().split("T")[0];
      const d = new Date();
      d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
      const today = d.toISOString().split("T")[0];

      if (pointFilterPeriod === "today") {
        return dateStr === today;
      } else if (pointFilterPeriod === "this_week") {
        const day = d.getDay() || 7;
        const t = new Date(d);
        t.setDate(t.getDate() - (day - 1));
        const weekStart = t.toISOString().split("T")[0];
        return dateStr >= weekStart && dateStr <= today;
      } else if (pointFilterPeriod === "monthly") {
        const monthPrefix = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        return dateStr.startsWith(monthPrefix);
      } else if (pointFilterPeriod === "yearly") {
        const yearPrefix = `${d.getFullYear()}`;
        return dateStr.startsWith(yearPrefix);
      } else if (pointFilterPeriod === "custom") {
        return (!pointFilterFrom || dateStr >= pointFilterFrom) && (!pointFilterTo || dateStr <= pointFilterTo);
      }
      return true;
    };

    const isDateWithinPointFilter = (dateStr) => {
      const d = new Date();
      d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
      const today = d.toISOString().split("T")[0];

      if (pointFilterPeriod === "today") {
        return dateStr === today;
      } else if (pointFilterPeriod === "this_week") {
        const day = d.getDay() || 7;
        const t = new Date(d);
        t.setDate(t.getDate() - (day - 1));
        const weekStart = t.toISOString().split("T")[0];
        return dateStr >= weekStart && dateStr <= today;
      } else if (pointFilterPeriod === "monthly") {
        const monthPrefix = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        return dateStr.startsWith(monthPrefix);
      } else if (pointFilterPeriod === "yearly") {
        const yearPrefix = `${d.getFullYear()}`;
        return dateStr.startsWith(yearPrefix);
      } else if (pointFilterPeriod === "custom") {
        return (!pointFilterFrom || dateStr >= pointFilterFrom) && (!pointFilterTo || dateStr <= pointFilterTo);
      }
      return true;
    };

    const filteredAttPoints = attSnap.filter(a => isWithinPointFilter(a.timestamp)).reduce((acc, curr) => acc + (curr.points || 0), 0);
    let filteredVerifiedCalls = 0;
    callsSnap
      .filter(c => c.status === "Verified" && isWithinPointFilter(c.timestamp))
      .forEach(c => {
        filteredVerifiedCalls += (c.durationMinutes || 0);
      });
    let filteredCallPoints = 0;
    if (filteredVerifiedCalls >= 20) filteredCallPoints = 5;
    else if (filteredVerifiedCalls >= 16) filteredCallPoints = 2;
    const filteredRepPoints = repsSnap.filter(r => r.type === "weekly" && r.status === "approved" && isWithinPointFilter(r.timestamp)).length * 15;
    let filteredMonthlyShopsCount = 0;
    shopsSnap.filter(s => isWithinPointFilter(s.timestamp)).forEach(() => {
      filteredMonthlyShopsCount++;
    });
    const filteredShopPoints = Math.floor(filteredMonthlyShopsCount / 100) * 50;

    let filteredTargetPoints = 0;
    if (tasksSnap) {
      tasksSnap.filter(task => isDateWithinPointFilter(task.to_date)).forEach(task => {
        const { points } = getTaskProgress(task);
        filteredTargetPoints += points;
      });
    }

    const filteredTotalPoints = filteredAttPoints + filteredCallPoints + filteredRepPoints + filteredShopPoints + filteredTargetPoints;

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        <div className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px", padding: "16px 20px" }}>
          <span className="ctit" style={{ margin: 0 }}>Points Filter</span>
          <div className="filter-row" style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <select value={pointFilterPeriod} onChange={(e) => setPointFilterPeriod(e.target.value)} style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid var(--bdr)", background: "var(--sur2)", color: "var(--tx)", outline: "none" }}>
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="this_week">This Week</option>
              <option value="monthly">This Month</option>
              <option value="yearly">This Year</option>
              <option value="custom">Custom Date Range</option>
            </select>
            {pointFilterPeriod === "custom" && (
              <>
                <input type="date" value={pointFilterFrom} onChange={(e) => setPointFilterFrom(e.target.value)} style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid var(--bdr)", background: "var(--sur2)", color: "var(--tx)", outline: "none" }} />
                <input type="date" value={pointFilterTo} onChange={(e) => setPointFilterTo(e.target.value)} style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid var(--bdr)", background: "var(--sur2)", color: "var(--tx)", outline: "none" }} />
              </>
            )}
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
          <div className="card" style={{ textAlign: "center", padding: "32px" }}>
            <div style={{ fontSize: "58px", fontWeight: 800, color: "var(--ind)", lineHeight: 1 }}>
              {filteredTotalPoints}
            </div>
            <div style={{ fontSize: "14px", color: "var(--tx2)", margin: "6px 0 14px" }}>
              Total Accumulation Points
            </div>
            <span className="bdg b-am" style={{ fontSize: "13px", padding: "6px 14px" }}>
              🥈 Rank #2 of 5
            </span>
          </div>
          <div className="card" style={{ display: "flex", flexDirection: "column" }}>
            <div className="ctit" style={{ marginBottom: "16px" }}>Points Breakdown Map</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", flex: 1, justifyContent: "center" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "12px", borderBottom: "1px dashed var(--bdr)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "rgba(93, 64, 55, 0.1)", color: "var(--ind)", display: "flex", alignItems: "center", justifyContent: "center" }}><IconPhoneCall size={18} /></div>
                  <span style={{ fontSize: "14px", fontWeight: 500, color: "var(--tx)" }}>Productive Calls</span>
                </div>
                <span style={{ fontSize: "15px", fontWeight: 700, color: "var(--ind)" }}>{filteredCallPoints} <span style={{ fontSize: "12px", color: "var(--tx3)", fontWeight: 400 }}>pts</span></span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "12px", borderBottom: "1px dashed var(--bdr)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "rgba(93, 64, 55, 0.1)", color: "var(--ind)", display: "flex", alignItems: "center", justifyContent: "center" }}><IconFileReport size={18} /></div>
                  <span style={{ fontSize: "14px", fontWeight: 500, color: "var(--tx)" }}>Weekly Submissions</span>
                </div>
                <span style={{ fontSize: "15px", fontWeight: 700, color: "var(--ind)" }}>{filteredRepPoints} <span style={{ fontSize: "12px", color: "var(--tx3)", fontWeight: 400 }}>pts</span></span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "12px", borderBottom: "1px dashed var(--bdr)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "rgba(93, 64, 55, 0.1)", color: "var(--ind)", display: "flex", alignItems: "center", justifyContent: "center" }}><IconBuildingStore size={18} /></div>
                  <span style={{ fontSize: "14px", fontWeight: 500, color: "var(--tx)" }}>Shop Indexing (Monthly)</span>
                </div>
                <span style={{ fontSize: "15px", fontWeight: 700, color: "var(--ind)" }}>{filteredShopPoints} <span style={{ fontSize: "12px", color: "var(--tx3)", fontWeight: 400 }}>pts</span></span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "12px", borderBottom: "1px dashed var(--bdr)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "rgba(93, 64, 55, 0.1)", color: "var(--ind)", display: "flex", alignItems: "center", justifyContent: "center" }}><IconTarget size={18} /></div>
                  <span style={{ fontSize: "14px", fontWeight: 500, color: "var(--tx)" }}>Target Achievement</span>
                </div>
                <span style={{ fontSize: "15px", fontWeight: 700, color: "var(--ind)" }}>{filteredTargetPoints} <span style={{ fontSize: "12px", color: "var(--tx3)", fontWeight: 400 }}>pts</span></span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading)
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
        Loading Matrix...
      </div>
    );

  const userName = actualName || (activeUser ? activeUser.email.split("@")[0] : "Loading...");
  const userInitials = actualName ? actualName.substring(0, 2).toUpperCase() : (activeUser ? activeUser.email.substring(0, 2).toUpperCase() : "AM");
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
              <div className="bname">Prabha Food Industries</div>
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
          {activeTab === "logs" && (
            <>
              <div style={{ display: "flex", gap: "10px", marginBottom: "20px", borderBottom: "1px solid var(--bdr)", paddingBottom: "15px", flexWrap: "wrap" }}>
                <button className={`btn ${activeLogTab === "attendance" ? "btn-p" : ""}`} onClick={() => setActiveLogTab("attendance")} style={activeLogTab !== "attendance" ? { background: "var(--sur2)", color: "var(--tx)", border: "1px solid var(--bdr)" } : {}}>Attendance</button>
                <button className={`btn ${activeLogTab === "calls" ? "btn-p" : ""}`} onClick={() => setActiveLogTab("calls")} style={activeLogTab !== "calls" ? { background: "var(--sur2)", color: "var(--tx)", border: "1px solid var(--bdr)" } : {}}>Productive Calls</button>
                <button className={`btn ${activeLogTab === "shops" ? "btn-p" : ""}`} onClick={() => setActiveLogTab("shops")} style={activeLogTab !== "shops" ? { background: "var(--sur2)", color: "var(--tx)", border: "1px solid var(--bdr)" } : {}}>Shops</button>
                <button className={`btn ${activeLogTab === "reports" ? "btn-p" : ""}`} onClick={() => setActiveLogTab("reports")} style={activeLogTab !== "reports" ? { background: "var(--sur2)", color: "var(--tx)", border: "1px solid var(--bdr)" } : {}}>Reports</button>
                <button className={`btn ${activeLogTab === "targets" ? "btn-p" : ""}`} onClick={() => setActiveLogTab("targets")} style={activeLogTab !== "targets" ? { background: "var(--sur2)", color: "var(--tx)", border: "1px solid var(--bdr)" } : {}}>Targets</button>
                <button className={`btn ${activeLogTab === "points" ? "btn-p" : ""}`} onClick={() => setActiveLogTab("points")} style={activeLogTab !== "points" ? { background: "var(--sur2)", color: "var(--tx)", border: "1px solid var(--bdr)" } : {}}>Points</button>
              </div>
              {activeLogTab === "attendance" && renderAttendance()}
              {activeLogTab === "calls" && renderCalls()}
              {activeLogTab === "shops" && renderShops()}
              {activeLogTab === "reports" && renderReports()}
              {activeLogTab === "targets" && renderTargets()}
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
                  <div>Log Productive Call (Beat)</div>
                  <button type="button" onClick={() => setModalType(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--tx)", padding: 0 }}><IconX size={20} /></button>
                </div>
                <div className="fg">
                  <label>Beat (Area) *</label>
                  <input type="text" name="beat_name" placeholder="e.g. Chennai Inner Area" required />
                </div>
                <div className="fg">
                  <label>Number of Productive Calls *</label>
                  <input type="number" name="num_calls" placeholder="e.g. 18" required min="0" />
                </div>
                <div className="fg">
                  <label>Total Sales Value *</label>
                  <input type="number" name="total_sales" placeholder="e.g. 5000" required min="0" />
                </div>
                <div className="fg">
                  <label>Notes (Optional)</label>
                  <textarea name="notes" placeholder="Any additional comments..." style={{ width: "100%", height: "80px", padding: "10px", borderRadius: "8px", border: "1.5px solid var(--bdr)", background: "var(--sur2)", color: "var(--tx)", outline: "none", resize: "none", fontSize: "14px" }}></textarea>
                </div>
                <button type="submit" className="btn btn-p" style={{ width: "100%", marginTop: "10px" }}>Submit Productive Call</button>
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
                  <div className="fg"><label>Mobile Contact</label><input type="tel" name="s_phone" placeholder="9876000001" pattern="[0-9]{10}" maxLength={10} minLength={10} title="Please enter exactly 10 digits" onInput={(e) => e.target.value = e.target.value.replace(/[^0-9]/g, '').slice(0, 10)} /></div>
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
                  <div>File Weekly Operations Summary Report</div>
                  <button type="button" onClick={() => { setModalType(null); setReportAgencies([{ name: "", cgs: "" }]); }} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--tx)", padding: 0 }}><IconX size={20} /></button>
                </div>
                <div className="fg"><label>Report Title Context *</label><input type="text" name="r_title" required /></div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                  <div className="fg"><label>From Date *</label><input type="date" name="r_from_date" required /></div>
                  <div className="fg"><label>To Date *</label><input type="date" name="r_to_date" required /></div>
                </div>
                <input type="hidden" name="r_type" value="weekly" />
                <div style={{ margin: "16px 0", borderTop: "1px solid var(--bdr)", borderBottom: "1px solid var(--bdr)", padding: "16px 0", maxHeight: "300px", overflowY: "auto" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                    <label style={{ margin: 0 }}>Agencies Visited</label>
                    <button type="button" className="btn" style={{ padding: "4px 10px", fontSize: "12px", background: "var(--sur2)", color: "var(--tx)" }} onClick={() => setReportAgencies([...reportAgencies, { name: "", cgs: "" }])}>
                      + Add Agency
                    </button>
                  </div>
                  {reportAgencies.map((agency, i) => (
                    <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: "10px", marginBottom: "10px", alignItems: "end" }}>
                      <div className="fg" style={{ margin: 0 }}>
                        <input type="text" placeholder="Agency Name" value={agency.name} onChange={(e) => { const newA = [...reportAgencies]; newA[i].name = e.target.value; setReportAgencies(newA); }} required />
                      </div>
                      <div className="fg" style={{ margin: 0 }}>
                        <input type="number" placeholder="No of CBs" value={agency.cgs} onChange={(e) => { const newA = [...reportAgencies]; newA[i].cgs = e.target.value; setReportAgencies(newA); }} required min="0" />
                      </div>
                      <button type="button" className="btn" style={{ background: "var(--no)", color: "#fff", padding: "10px", height: "42px" }} onClick={() => { if (reportAgencies.length > 1) { const newA = [...reportAgencies]; newA.splice(i, 1); setReportAgencies(newA); } }}>
                        <IconX size={16} />
                      </button>
                    </div>
                  ))}
                  <div className="fg"><label>Note</label><textarea name="r_note" placeholder="Any additional notes..." style={{ width: "100%", minHeight: "80px", borderRadius: "8px", padding: "10px", border: "1.5px solid var(--bdr)" }}></textarea></div>
                </div>
                <div style={{ fontSize: "13px", color: "var(--am)", margin: "10px 0", fontWeight: 500, lineHeight: "1.4" }}>
                  ⚠ Weekly reports must be submitted before Monday 8:00 AM. Reports submitted after the deadline may be approved without points.
                </div>
                <button type="submit" className="btn btn-p" style={{ width: "100%", marginTop: "10px" }}>Transmit Report Log</button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
