import { useState, useEffect, useRef } from "react";

const uid = () => Math.random().toString(36).slice(2, 9);
const STORAGE_KEY = "taskup_v1";
const WORKER_URL = "https://taskup-ai.lior0gal.workers.dev";

const TAB_COLORS = [
  "#2d6a4f","#1d4e89","#7b3f00","#5a189a",
  "#9d0208","#0077b6","#6a994e","#8338ec",
  "#c77dff","#e76f51","#457b9d","#e9c46a",
];

const formatDate = (s) => {
  if (!s) return null;
  return new Date(s + "T00:00:00").toLocaleDateString("he-IL", { day: "numeric", month: "short", year: "numeric" });
};
const today = () => new Date().toISOString().split("T")[0];

const getReminderStatus = (startDate, endDate) => {
  if (!startDate) return "none";
  const now = new Date(); now.setHours(0,0,0,0);
  const start = new Date(startDate + "T00:00:00");
  const end = endDate ? new Date(endDate + "T00:00:00") : null;
  if (now < start) return "future";
  if (end && now > end) return "past";
  return "active";
};
const getDaysUntil = (s) => {
  if (!s) return null;
  const now = new Date(); now.setHours(0,0,0,0);
  return Math.round((new Date(s + "T00:00:00") - now) / 86400000);
};

const loadStorage = () => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; }
  catch { return {}; }
};

export default function App() {
  // ── Profiles ───────────────────────────────────────────────────────────────
  const [profiles, setProfiles] = useState(() => loadStorage().profiles || {});
  const [activeProfileId, setActiveProfileId] = useState(() => {
    const d = loadStorage();
    return d.activeProfile && d.profiles?.[d.activeProfile] ? d.activeProfile : null;
  });
  const [showProfileModal, setShowProfileModal] = useState(() => {
    const d = loadStorage();
    return !d.activeProfile || !d.profiles?.[d.activeProfile];
  });
  const [newProfileName, setNewProfileName] = useState("");
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);

  // ── Navigation ─────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState(() => {
    const d = loadStorage();
    const pid = d.activeProfile && d.profiles?.[d.activeProfile] ? d.activeProfile : null;
    if (!pid) return null;
    const profile = d.profiles[pid];
    const t = profile.tabs || [];
    if (!t.length) return null;
    return profile.defaultTab && t.find(x => x.id === profile.defaultTab)
      ? profile.defaultTab : t[0].id;
  });
  const [activeSubtab, setActiveSubtab] = useState(null);
  const [newTabInput, setNewTabInput] = useState("");
  const [showNewTab, setShowNewTab] = useState(false);
  const [newSubInput, setNewSubInput] = useState("");
  const [showNewSub, setShowNewSub] = useState(false);

  // ── Task / reminder inputs ─────────────────────────────────────────────────
  const [taskInput, setTaskInput] = useState("");
  const [reminderInput, setReminderInput] = useState("");
  const [reminderStart, setReminderStart] = useState("");
  const [reminderEnd, setReminderEnd] = useState("");
  const [showReminderDates, setShowReminderDates] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editText, setEditText] = useState("");

  // ── Features ──────────────────────────────────────────────────────────────
  const [completingId, setCompletingId] = useState(null);
  const [bigCelebrateId, setBigCelebrateId] = useState(null);
  const [expandedTaskId, setExpandedTaskId] = useState(null);
  const [subtaskInput, setSubtaskInput] = useState("");
  const [breakingDownId, setBreakingDownId] = useState(null);
  const [showQuickCapture, setShowQuickCapture] = useState(false);
  const [quickText, setQuickText] = useState("");

  // ── Shopping & Notes ──────────────────────────────────────────────────────
  const [showListsMenu, setShowListsMenu] = useState(null); // "shopping" | "notes" | null
  const [openListId, setOpenListId] = useState(null);
  const [openListType, setOpenListType] = useState(null);
  const [listItemInput, setListItemInput] = useState("");
  const [newListName, setNewListName] = useState("");
  const [showNewListInput, setShowNewListInput] = useState(false);

  const profileMenuRef = useRef(null);
  const settingsMenuRef = useRef(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ profiles, activeProfile: activeProfileId }));
  }, [profiles, activeProfileId]);

  useEffect(() => {
    const h = (e) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target)) setShowProfileMenu(false);
      if (settingsMenuRef.current && !settingsMenuRef.current.contains(e.target)) setShowSettingsMenu(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  // ── Derived tabs ──────────────────────────────────────────────────────────
  const tabs = profiles[activeProfileId]?.tabs || [];
  const setTabs = (updater) => setProfiles(prev => {
    const cur = prev[activeProfileId] || { tabs: [] };
    const newTabs = typeof updater === "function" ? updater(cur.tabs) : updater;
    return { ...prev, [activeProfileId]: { ...cur, tabs: newTabs } };
  });

  const updateProfile = (fn) => setProfiles(prev => ({
    ...prev,
    [activeProfileId]: fn(prev[activeProfileId] || {}),
  }));
  const getProfile = () => profiles[activeProfileId] || {};

  // ── Shopping ──────────────────────────────────────────────────────────────
  const shoppingLists = getProfile().shopping || [];
  const addShoppingList = (name) => { if (!name.trim()) return; updateProfile(p => ({ ...p, shopping: [...(p.shopping||[]), {id:uid(), name:name.trim(), items:[]}] })); };
  const addShoppingItem = (lid, text) => { if (!text.trim()) return; updateProfile(p => ({ ...p, shopping: (p.shopping||[]).map(l => l.id===lid ? {...l, items:[...l.items,{id:uid(),text:text.trim()}]} : l) })); };
  const deleteShoppingItem = (lid, iid) => updateProfile(p => ({ ...p, shopping: (p.shopping||[]).map(l => l.id===lid ? {...l,items:l.items.filter(i=>i.id!==iid)} : l) }));
  const deleteShoppingList = (lid) => { updateProfile(p => ({ ...p, shopping: (p.shopping||[]).filter(l=>l.id!==lid) })); if (openListId===lid) { setOpenListId(null); setOpenListType(null); } };

  // ── Notes ─────────────────────────────────────────────────────────────────
  const notesList = getProfile().notes || [];
  const addNote = (name) => { if (!name.trim()) return; updateProfile(p => ({ ...p, notes: [...(p.notes||[]), {id:uid(), name:name.trim(), items:[]}] })); };
  const addNoteItem = (nid, text) => { if (!text.trim()) return; updateProfile(p => ({ ...p, notes: (p.notes||[]).map(n => n.id===nid ? {...n,items:[...n.items,{id:uid(),text:text.trim()}]} : n) })); };
  const deleteNoteItem = (nid, iid) => updateProfile(p => ({ ...p, notes: (p.notes||[]).map(n => n.id===nid ? {...n,items:n.items.filter(i=>i.id!==iid)} : n) }));
  const deleteNote = (nid) => { updateProfile(p => ({ ...p, notes: (p.notes||[]).filter(n=>n.id!==nid) })); if (openListId===nid) { setOpenListId(null); setOpenListType(null); } };

  // ── Profile actions ────────────────────────────────────────────────────────
  const createProfile = () => {
    const name = newProfileName.trim(); if (!name) return;
    const id = uid();
    setProfiles(prev => ({ ...prev, [id]: { id, name, tabs: [] } }));
    setActiveProfileId(id); setActiveTab(null); setActiveSubtab(null);
    setNewProfileName(""); setShowProfileModal(false);
  };
  const switchProfile = (id) => {
    const profile = profiles[id];
    const t = profile?.tabs || [];
    const def = profile?.defaultTab && t.find(x=>x.id===profile.defaultTab) ? profile.defaultTab : t[0]?.id || null;
    setActiveProfileId(id); setActiveTab(def); setActiveSubtab(null); setShowProfileMenu(false);
  };
  const deleteCurrentProfile = () => {
    if (!window.confirm(`למחוק את הפרופיל "${profiles[activeProfileId]?.name}"?`)) return;
    const remaining = Object.keys(profiles).filter(id=>id!==activeProfileId);
    setProfiles(prev => { const n={...prev}; delete n[activeProfileId]; return n; });
    if (remaining.length>0) { setActiveProfileId(remaining[0]); setActiveTab(null); setActiveSubtab(null); }
    else { setActiveProfileId(null); setShowProfileModal(true); }
    setShowProfileMenu(false);
  };
  const setDefaultTab = (tabId) => updateProfile(p => ({ ...p, defaultTab: tabId }));

  // ── Backup / share ─────────────────────────────────────────────────────────
  const exportBackup = () => {
    const blob = new Blob([JSON.stringify({profiles,activeProfile:activeProfileId},null,2)],{type:"application/json"});
    const a = document.createElement("a"); a.href=URL.createObjectURL(blob); a.download=`taskup-backup-${today()}.json`; a.click();
    setShowSettingsMenu(false);
  };
  const importBackup = () => {
    const input=document.createElement("input"); input.type="file"; input.accept=".json";
    input.onchange=(e)=>{
      const reader=new FileReader();
      reader.onload=(ev)=>{ try { const d=JSON.parse(ev.target.result); if(!d.profiles) throw new Error(); localStorage.setItem(STORAGE_KEY,JSON.stringify(d)); window.location.reload(); } catch { alert("קובץ גיבוי לא תקין"); }};
      reader.readAsText(e.target.files[0]);
    };
    input.click(); setShowSettingsMenu(false);
  };
  const shareWhatsApp = () => { window.open(`https://wa.me/?text=${encodeURIComponent("לוח המשימות שלי 📋\n"+window.location.origin)}`,"_blank"); setShowSettingsMenu(false); };

  // ── Context helpers ────────────────────────────────────────────────────────
  const currentTab = tabs.find(t=>t.id===activeTab);
  const currentSubtab = activeSubtab && currentTab ? currentTab.subtabs.find(s=>s.id===activeSubtab) : null;
  const ctx = currentSubtab || currentTab;
  const updateCtx = (fn) => setTabs(prev => prev.map(t => {
    if (t.id!==activeTab) return t;
    if (currentSubtab) return {...t,subtabs:t.subtabs.map(s=>s.id===activeSubtab?fn(s):s)};
    return fn(t);
  }));

  // ── Tab / subtab ──────────────────────────────────────────────────────────
  const addTab = () => {
    const name=newTabInput.trim(); if(!name) return; const id=uid();
    setTabs(p=>[...p,{id,label:name,color:TAB_COLORS[p.length%TAB_COLORS.length],subtabs:[],tasks:[],reminders:[]}]);
    setNewTabInput(""); setShowNewTab(false); setActiveTab(id); setActiveSubtab(null);
  };
  const deleteTab = (id) => {
    setTabs(p=>p.filter(t=>t.id!==id));
    if (activeTab===id) {
      const remaining=tabs.filter(t=>t.id!==id);
      const profile=profiles[activeProfileId];
      const def=profile?.defaultTab&&remaining.find(t=>t.id===profile.defaultTab)?profile.defaultTab:remaining[0]?.id||null;
      setActiveTab(def); setActiveSubtab(null);
    }
  };
  const addSubtab = () => {
    const name=newSubInput.trim(); if(!name) return; const id=uid();
    setTabs(prev=>prev.map(t=>t.id===activeTab?{...t,subtabs:[...t.subtabs,{id,label:name,tasks:[],reminders:[]}]}:t));
    setNewSubInput(""); setShowNewSub(false); setActiveSubtab(id);
  };
  const deleteSubtab = (id) => { setTabs(prev=>prev.map(t=>t.id===activeTab?{...t,subtabs:t.subtabs.filter(s=>s.id!==id)}:t)); if(activeSubtab===id) setActiveSubtab(null); };

  // ── Tasks & reminders ─────────────────────────────────────────────────────
  const addTask = () => { const text=taskInput.trim(); if(!text) return; updateCtx(c=>({...c,tasks:[...c.tasks,{id:uid(),text,done:false,createdAt:today(),subtasks:[]}]})); setTaskInput(""); };
  const addReminder = () => {
    const text=reminderInput.trim(); if(!text) return;
    updateCtx(c=>({...c,reminders:[...c.reminders,{id:uid(),text,done:false,createdAt:today(),startDate:reminderStart||null,endDate:reminderEnd||null}]}));
    setReminderInput(""); setReminderStart(""); setReminderEnd(""); setShowReminderDates(false);
  };

  const handleComplete = (type, id) => {
    const key=type==="task"?"tasks":"reminders";
    const item=ctx?.[key]?.find(i=>i.id===id);
    if (item&&!item.done) { setCompletingId(id); setTimeout(()=>setCompletingId(null),600); }
    setTabs(prev=>prev.map(t=>{
      if(t.id!==activeTab) return t;
      if(currentSubtab) return {...t,subtabs:t.subtabs.map(s=>s.id===activeSubtab?{...s,[key]:s[key].map(i=>i.id===id?{...i,done:!i.done}:i)}:s)};
      return {...t,[key]:t[key].map(i=>i.id===id?{...i,done:!i.done}:i)};
    }));
  };

  const handleBigComplete = (id) => {
    setBigCelebrateId(id);
    setTimeout(()=>setBigCelebrateId(null),1000);
    handleComplete("task", id);
  };

  const toggleDone = (type,id) => { const key=type==="task"?"tasks":"reminders"; updateCtx(c=>({...c,[key]:c[key].map(i=>i.id===id?{...i,done:!i.done}:i)})); };
  const deleteItem = (type,id) => { const key=type==="task"?"tasks":"reminders"; updateCtx(c=>({...c,[key]:c[key].filter(i=>i.id!==id)})); };
  const saveEdit = (type,id) => { const key=type==="task"?"tasks":"reminders"; updateCtx(c=>({...c,[key]:c[key].map(i=>i.id===id?{...i,text:editText}:i)})); setEditId(null); setEditText(""); };

  // ── Subtasks ──────────────────────────────────────────────────────────────
  const addSubtask = (taskId,text) => { if(!text.trim()) return; updateCtx(c=>({...c,tasks:c.tasks.map(t=>t.id===taskId?{...t,subtasks:[...(t.subtasks||[]),{id:uid(),text:text.trim(),done:false}]}:t)})); };
  const toggleSubtask = (taskId,stId) => updateCtx(c=>({...c,tasks:c.tasks.map(t=>t.id===taskId?{...t,subtasks:(t.subtasks||[]).map(s=>s.id===stId?{...s,done:!s.done}:s)}:t)}));
  const deleteSubtask = (taskId,stId) => updateCtx(c=>({...c,tasks:c.tasks.map(t=>t.id===taskId?{...t,subtasks:(t.subtasks||[]).filter(s=>s.id!==stId)}:t)}));

  // ── AI breakdown ──────────────────────────────────────────────────────────
  const breakdownTask = async (taskId, taskText) => {
    setBreakingDownId(taskId); setExpandedTaskId(taskId);
    try {
      const res = await fetch(`${WORKER_URL}/breakdown`, {
        method: "POST", headers: {"content-type":"application/json"},
        body: JSON.stringify({task:taskText}),
      });
      if (!res.ok) throw new Error();
      const {steps} = await res.json();
      if (steps?.length) steps.forEach(s=>addSubtask(taskId,s));
    } catch { /* fall back to manual */ }
    setBreakingDownId(null);
  };

  // ── Quick capture ─────────────────────────────────────────────────────────
  const quickCapture = () => {
    if (!quickText.trim()||!ctx) return;
    updateCtx(c=>({...c,tasks:[...c.tasks,{id:uid(),text:quickText.trim(),done:false,createdAt:today(),subtasks:[]}]}));
    setQuickText(""); setShowQuickCapture(false);
  };

  // ── Display values ────────────────────────────────────────────────────────
  const accent = currentTab?.color || "#2d6a4f";
  const allProfiles = Object.values(profiles);
  const sortedReminders = (ctx?.reminders||[]).filter(r=>!r.done).sort((a,b)=>{
    const order={active:0,future:1,none:2,past:3};
    return (order[getReminderStatus(a.startDate,a.endDate)]??2)-(order[getReminderStatus(b.startDate,b.endDate)]??2)||(a.startDate||"z").localeCompare(b.startDate||"z");
  });
  const doneReminders = (ctx?.reminders||[]).filter(r=>r.done);
  const pendingTasks = (ctx?.tasks||[]).filter(t=>!t.done);
  const doneTasks = (ctx?.tasks||[]).filter(t=>t.done);

  // open list data
  const openList = openListType==="shopping"
    ? shoppingLists.find(l=>l.id===openListId)
    : notesList.find(n=>n.id===openListId);

  const CSS = `
    @import url('https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;500;600;700&display=swap');
    * { box-sizing: border-box; }
    ::-webkit-scrollbar { width: 4px; height: 4px; }
    ::-webkit-scrollbar-thumb { background: #ddd; border-radius: 4px; }
    .tab-pill { display:flex;align-items:center;gap:6px;padding:7px 14px;border-radius:8px;border:1.5px solid transparent;background:none;cursor:pointer;font-family:'Heebo',sans-serif;font-size:14px;font-weight:500;color:#888;white-space:nowrap;transition:all 0.18s; }
    .tab-pill:hover { background:#f0f0ef;color:#333; }
    .tab-pill.active { color:var(--accent);border-color:var(--accent);background:white;box-shadow:0 1px 6px rgba(0,0,0,0.07); }
    .sub-chip { padding:4px 12px;border-radius:20px;border:1.5px solid #e0e0de;background:none;cursor:pointer;font-family:'Heebo',sans-serif;font-size:13px;color:#888;transition:all 0.15s; }
    .sub-chip:hover { border-color:#bbb;color:#444; }
    .sub-chip.active { border-color:var(--accent);color:var(--accent);background:white;font-weight:600; }
    .plain-input { border:1.5px solid #e5e5e3;border-radius:8px;padding:9px 13px;font-family:'Heebo',sans-serif;font-size:14px;background:white;color:#1a1a1a;outline:none;direction:rtl;transition:border 0.15s; }
    .plain-input:focus { border-color:var(--accent); }
    .plain-input::placeholder { color:#bbb; }
    .add-btn { border:none;border-radius:8px;background:var(--accent);color:white;font-family:'Heebo',sans-serif;font-size:15px;font-weight:600;padding:9px 18px;cursor:pointer;transition:opacity 0.15s; }
    .add-btn:hover { opacity:0.85; }
    .ghost-btn { border:1.5px dashed #d0d0ce;border-radius:8px;background:none;padding:7px 14px;font-family:'Heebo',sans-serif;font-size:13px;color:#aaa;cursor:pointer;transition:all 0.15s; }
    .ghost-btn:hover { border-color:var(--accent);color:var(--accent); }
    .check-circle { width:20px;height:20px;border-radius:50%;border:2px solid #ddd;background:none;cursor:pointer;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:11px;transition:all 0.15s; }
    .check-circle:hover { border-color:var(--accent); }
    .check-circle.checked { border-color:var(--accent);background:var(--accent);color:white; }
    .task-row { display:flex;align-items:flex-start;gap:8px;padding:10px 12px;border-radius:8px;border:1px solid #ebebea;background:white;margin-bottom:6px;transition:box-shadow 0.15s; }
    .task-row:hover { box-shadow:0 1px 6px rgba(0,0,0,0.06); }
    .reminder-card { padding:12px 14px;border-radius:10px;border:1.5px solid #ebebea;background:white;margin-bottom:8px;transition:box-shadow 0.15s; }
    .reminder-card:hover { box-shadow:0 2px 10px rgba(0,0,0,0.07); }
    .reminder-card.active-r { border-color:var(--accent);background:#fafffe; }
    .reminder-card.future-r { border-color:#c5cae9; }
    .reminder-card.past-r { opacity:0.5; }
    .date-range-bar { display:flex;align-items:center;gap:6px;font-size:12px;margin-top:5px;font-weight:500;flex-wrap:wrap; }
    .date-chip { padding:2px 8px;border-radius:4px;font-size:12px;font-weight:500; }
    .status-dot { width:7px;height:7px;border-radius:50%;flex-shrink:0; }
    .icon-btn { background:none;border:none;cursor:pointer;color:#ccc;font-size:16px;padding:4px 6px;transition:color 0.15s;flex-shrink:0;line-height:1;min-width:28px;min-height:28px;display:flex;align-items:center;justify-content:center; }
    .icon-btn:hover { color:#888; }
    .icon-btn.del:hover { color:#e07070; }
    .icon-btn.done-btn { color:#bbb;font-size:15px;font-weight:700; }
    .icon-btn.done-btn:hover { color:var(--accent); }
    .section-label { font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#bbb;margin:20px 0 10px; }
    .edit-inline { border:1.5px solid var(--accent);border-radius:6px;padding:3px 8px;font-family:'Heebo',sans-serif;font-size:14px;outline:none;direction:rtl;background:white;color:#1a1a1a;width:100%; }
    .days-badge { font-size:11px;padding:1px 7px;border-radius:12px;font-weight:600; }
    .dropdown-menu { position:absolute;top:calc(100% + 6px);right:0;background:white;border:1px solid #ebebea;border-radius:10px;box-shadow:0 4px 20px rgba(0,0,0,0.1);min-width:180px;z-index:100;overflow:hidden; }
    .dropdown-item { display:flex;align-items:center;gap:8px;padding:10px 14px;cursor:pointer;font-family:'Heebo',sans-serif;font-size:13px;color:#333;background:none;border:none;width:100%;text-align:right;transition:background 0.12s; }
    .dropdown-item:hover { background:#f5f5f4; }
    .dropdown-item.danger { color:#e07070; }
    .dropdown-item.danger:hover { background:#fef2f2; }
    .dropdown-divider { height:1px;background:#f0f0ef;margin:4px 0; }
    .profile-avatar { width:26px;height:26px;border-radius:50%;background:#2d6a4f;color:white;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;flex-shrink:0; }
    .settings-dropdown { left:0;right:auto; }
    .main-grid { display:grid;grid-template-columns:1fr 1fr;gap:32px;align-items:start; }
    .subtask-row { display:flex;align-items:center;gap:8px;padding:4px 0; }
    .subtask-check { width:16px;height:16px;border-radius:50%;border:1.5px solid #ddd;background:none;cursor:pointer;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:9px;transition:all 0.15s; }
    .subtask-check:hover { border-color:var(--accent); }
    .subtask-check.checked { border-color:var(--accent);background:var(--accent);color:white; }
    .fab { position:fixed;bottom:24px;left:24px;width:52px;height:52px;border-radius:50%;border:none;color:white;font-size:26px;cursor:pointer;box-shadow:0 4px 16px rgba(0,0,0,0.22);z-index:150;display:flex;align-items:center;justify-content:center;transition:transform 0.15s,box-shadow 0.15s; }
    .fab:hover { transform:scale(1.08);box-shadow:0 6px 20px rgba(0,0,0,0.28); }
    .side-pill { position:fixed;left:24px;border-radius:24px;border:1.5px solid;padding:7px 14px 7px 10px;cursor:pointer;font-family:'Heebo',sans-serif;font-size:13px;font-weight:600;display:flex;align-items:center;gap:6px;box-shadow:0 2px 8px rgba(0,0,0,0.1);z-index:150;transition:all 0.15s; }
    .list-item-row { display:flex;align-items:center;gap:10px;padding:11px 0;border-bottom:1px solid #f5f5f4; }

    @keyframes checkPop { 0%{transform:scale(1)} 30%{transform:scale(1.7)} 65%{transform:scale(0.85)} 85%{transform:scale(1.1)} 100%{transform:scale(1)} }
    @keyframes ringOut { 0%{transform:scale(0.8);opacity:0.7} 100%{transform:scale(2.6);opacity:0} }
    @keyframes bigFly { 0%{transform:translate(0,0) scale(1.4);opacity:1} 100%{transform:translate(var(--dx),var(--dy)) scale(0);opacity:0} }
    @keyframes spin { to{transform:rotate(360deg)} }

    .check-circle.popping { animation: checkPop 0.5s cubic-bezier(0.36,0.07,0.19,0.97) both; }
    .ring { position:absolute;width:20px;height:20px;border-radius:50%;border:2px solid var(--accent);animation:ringOut 0.55s ease-out forwards;pointer-events:none; }
    .big-emoji { position:absolute;font-size:22px;animation:bigFly 0.9s ease-out forwards;pointer-events:none;z-index:10; }
    .spinner { width:14px;height:14px;border:2px solid #eee;border-top-color:#999;border-radius:50%;animation:spin 0.7s linear infinite;flex-shrink:0; }

    @media (max-width:640px) {
      .main-grid { grid-template-columns:1fr;gap:24px; }
      .dropdown-menu { max-width:calc(100vw - 24px); }
    }
  `;

  // ── Profile modal ──────────────────────────────────────────────────────────
  if (showProfileModal) {
    return (
      <div dir="rtl" style={{minHeight:"100vh",background:"#fafaf8",fontFamily:"'Heebo',sans-serif",display:"flex",alignItems:"center",justifyContent:"center"}}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;500;600;700&display=swap');*{box-sizing:border-box;}`}</style>
        <div style={{background:"white",borderRadius:16,padding:32,width:360,boxShadow:"0 8px 32px rgba(0,0,0,0.1)"}}>
          <div style={{fontSize:36,textAlign:"center",marginBottom:8}}>📋</div>
          <div style={{fontSize:22,fontWeight:700,textAlign:"center",marginBottom:4}}>TaskUp</div>
          <div style={{fontSize:14,color:"#999",textAlign:"center",marginBottom:24}}>{allProfiles.length>0?"בחרי פרופיל או צרי חדש":"ברוכה הבאה! צרי את הפרופיל שלך"}</div>
          {allProfiles.length>0&&(<div style={{marginBottom:20}}>{allProfiles.map(p=>(<button key={p.id} onClick={()=>{setActiveProfileId(p.id);setActiveTab(null);setActiveSubtab(null);setShowProfileModal(false);}} style={{width:"100%",display:"flex",alignItems:"center",gap:10,padding:"10px 14px",borderRadius:10,border:"1.5px solid #e5e5e3",background:"white",cursor:"pointer",marginBottom:8,fontFamily:"'Heebo',sans-serif",fontSize:15,fontWeight:500,color:"#1a1a1a"}}><span style={{width:32,height:32,borderRadius:"50%",background:"#2d6a4f",color:"white",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:700}}>{p.name.charAt(0)}</span>{p.name}</button>))}<div style={{borderTop:"1px solid #f0f0f0",margin:"16px 0 14px"}}/></div>)}
          <div style={{fontSize:13,fontWeight:600,color:"#888",marginBottom:8}}>{allProfiles.length>0?"פרופיל חדש":"שם הפרופיל"}</div>
          <input autoFocus style={{width:"100%",border:"1.5px solid #e5e5e3",borderRadius:8,padding:"10px 13px",fontFamily:"'Heebo',sans-serif",fontSize:15,outline:"none",direction:"rtl",marginBottom:12,color:"#1a1a1a"}} placeholder="שם הפרופיל" value={newProfileName} onChange={e=>setNewProfileName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&createProfile()}/>
          <button onClick={createProfile} style={{width:"100%",background:"#2d6a4f",color:"white",border:"none",borderRadius:8,padding:"11px 0",fontSize:15,fontWeight:600,cursor:"pointer",fontFamily:"'Heebo',sans-serif",marginBottom:allProfiles.length>0?8:0}}>{allProfiles.length>0?"צרי פרופיל":"התחלי"}</button>
          {allProfiles.length>0&&<button onClick={()=>setShowProfileModal(false)} style={{width:"100%",background:"none",color:"#aaa",border:"none",padding:"8px 0",fontSize:14,cursor:"pointer",fontFamily:"'Heebo',sans-serif"}}>ביטול</button>}
        </div>
      </div>
    );
  }

  // ── Main ───────────────────────────────────────────────────────────────────
  return (
    <div dir="rtl" style={{minHeight:"100vh",background:"#fafaf8",fontFamily:"'Heebo',sans-serif",color:"#1a1a1a"}}>
      <style>{CSS}</style>
      <div style={{"--accent":accent}}>

        {/* ── Big celebrate overlay ── */}
        {bigCelebrateId && (
          <div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:260,overflow:"hidden"}}>
            {["🎉","✨","⭐","🎊","💫","🌟","🎈"].map((emoji,i)=>{
              const dx=Math.round((i-3)*35);
              const dy=-60-Math.round(Math.random()*30);
              return <span key={i} className="big-emoji" style={{"--dx":`${dx}px`,"--dy":`${dy}px`,left:"50%",bottom:"40%",animationDelay:`${i*70}ms`}}>{emoji}</span>;
            })}
          </div>
        )}

        {/* ── Quick capture overlay ── */}
        {showQuickCapture&&(
          <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:200,direction:"rtl"}} onClick={e=>{if(e.target===e.currentTarget)setShowQuickCapture(false);}}>
            <div style={{background:"white",borderRadius:"16px 16px 0 0",padding:"24px 20px 32px",width:"100%",maxWidth:600}}>
              <div style={{fontSize:12,fontWeight:700,color:"#bbb",marginBottom:10}}>📥 לכידה מהירה {currentTab?`← ${currentTab.label}`:"← בחרי קודם כרטיסייה"}</div>
              <div style={{display:"flex",gap:10}}>
                <input autoFocus className="plain-input" style={{flex:1,fontSize:16}} placeholder="מה עלה לך בראש?" value={quickText} onChange={e=>setQuickText(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&ctx)quickCapture();if(e.key==="Escape")setShowQuickCapture(false);}}/>
                <button className="add-btn" style={{fontSize:15}} onClick={quickCapture} disabled={!ctx}>הוסיפי</button>
              </div>
              {!ctx&&<div style={{fontSize:12,color:"#e07070",marginTop:8}}>בחרי כרטיסייה כדי להוסיף משימה</div>}
            </div>
          </div>
        )}

        {/* ── Lists menu popup ── */}
        {showListsMenu&&(
          <div style={{position:"fixed",inset:0,zIndex:190}} onClick={()=>{setShowListsMenu(null);setShowNewListInput(false);setNewListName("");}}>
            <div style={{position:"absolute",bottom:96,left:24,background:"white",borderRadius:14,padding:16,minWidth:220,boxShadow:"0 4px 24px rgba(0,0,0,0.18)"}} onClick={e=>e.stopPropagation()}>
              <div style={{fontWeight:700,fontSize:15,marginBottom:14,color:"#1a1a1a"}}>
                {showListsMenu==="shopping"?"🛒 רשימות קניות":"📝 פתקים"}
              </div>
              {(showListsMenu==="shopping"?shoppingLists:notesList).map(list=>(
                <button key={list.id} onClick={()=>{setOpenListId(list.id);setOpenListType(showListsMenu);setShowListsMenu(null);setShowNewListInput(false);}}
                  style={{width:"100%",display:"flex",alignItems:"center",gap:8,padding:"9px 10px",borderRadius:8,border:"1px solid #ebebea",background:"white",cursor:"pointer",marginBottom:6,fontFamily:"'Heebo',sans-serif",fontSize:14,color:"#1a1a1a",textAlign:"right"}}>
                  <span style={{flex:1}}>{list.name}</span>
                  <span style={{fontSize:11,color:"#bbb"}}>{list.items.length}</span>
                </button>
              ))}
              {showNewListInput?(
                <div style={{display:"flex",gap:6,marginTop:8}}>
                  <input autoFocus className="plain-input" style={{flex:1,fontSize:13,padding:"6px 10px"}}
                    placeholder={showListsMenu==="shopping"?"שם הרשימה":"שם הפתק"}
                    value={newListName} onChange={e=>setNewListName(e.target.value)}
                    onKeyDown={e=>{if(e.key==="Enter"){if(showListsMenu==="shopping")addShoppingList(newListName);else addNote(newListName);setNewListName("");setShowNewListInput(false);}if(e.key==="Escape"){setShowNewListInput(false);setNewListName("");}}}/>
                  <button className="add-btn" style={{padding:"6px 10px",fontSize:13}} onClick={()=>{if(showListsMenu==="shopping")addShoppingList(newListName);else addNote(newListName);setNewListName("");setShowNewListInput(false);}}>+</button>
                </div>
              ):(
                <button className="ghost-btn" style={{width:"100%",marginTop:4,fontSize:13}} onClick={()=>setShowNewListInput(true)}>
                  + {showListsMenu==="shopping"?"רשימה חדשה":"פתק חדש"}
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── List detail overlay ── */}
        {openListId&&openList&&(
          <div style={{position:"fixed",inset:0,background:"white",zIndex:200,direction:"rtl",display:"flex",flexDirection:"column"}}>
            <div style={{padding:"14px 20px",borderBottom:"1px solid #ebebea",display:"flex",alignItems:"center",gap:12,background:"white"}}>
              <button onClick={()=>{setOpenListId(null);setOpenListType(null);setListItemInput("");}}
                style={{background:"none",border:"none",fontSize:22,cursor:"pointer",color:"#555",padding:"2px 6px",lineHeight:1}}>←</button>
              <span style={{fontWeight:700,fontSize:18,flex:1}}>{openList.name}</span>
              <button onClick={()=>{if(openListType==="shopping")deleteShoppingList(openListId);else deleteNote(openListId);}}
                style={{background:"none",border:"none",fontSize:13,color:"#e07070",cursor:"pointer",fontFamily:"'Heebo',sans-serif"}}>מחק</button>
            </div>

            <div style={{flex:1,overflowY:"auto",padding:"8px 20px"}}>
              {openList.items.length===0&&(
                <div style={{color:"#ccc",fontSize:14,textAlign:"center",padding:"40px 0"}}>
                  {openListType==="shopping"?"רשימה ריקה — הוסיפי פריט למטה":"פתק ריק — התחילי לכתוב למטה"}
                </div>
              )}
              {openList.items.map(item=>(
                <div key={item.id} className="list-item-row">
                  <span style={{width:7,height:7,borderRadius:"50%",background:accent,flexShrink:0}}/>
                  <span style={{flex:1,fontSize:15,color:"#1a1a1a",lineHeight:1.5}}>{item.text}</span>
                  <button onClick={()=>openListType==="shopping"?deleteShoppingItem(openListId,item.id):deleteNoteItem(openListId,item.id)}
                    style={{background:"none",border:"none",color:"#ccc",fontSize:16,cursor:"pointer",padding:"2px 4px",lineHeight:1}}>✕</button>
                </div>
              ))}
            </div>

            <div style={{padding:"12px 20px 28px",borderTop:"1px solid #ebebea",background:"white"}}>
              <div style={{display:"flex",gap:10}}>
                <input autoFocus className="plain-input" style={{flex:1,fontSize:15}}
                  placeholder={openListType==="shopping"?"הוסיפי פריט...":"כתבי משהו..."}
                  value={listItemInput} onChange={e=>setListItemInput(e.target.value)}
                  onKeyDown={e=>{if(e.key==="Enter"){if(openListType==="shopping")addShoppingItem(openListId,listItemInput);else addNoteItem(openListId,listItemInput);setListItemInput("");}}}/>
                <button className="add-btn" onClick={()=>{if(openListType==="shopping")addShoppingItem(openListId,listItemInput);else addNoteItem(openListId,listItemInput);setListItemInput("");}}>+</button>
              </div>
            </div>
          </div>
        )}

        {/* ── Side pills ── */}
        <button className="side-pill" style={{bottom:132,background:showListsMenu==="shopping"?accent:"white",color:showListsMenu==="shopping"?"white":"#555",borderColor:showListsMenu==="shopping"?accent:"#e5e5e3"}} onClick={()=>setShowListsMenu(showListsMenu==="shopping"?null:"shopping")}>🛒 קניות</button>
        <button className="side-pill" style={{bottom:88,background:showListsMenu==="notes"?accent:"white",color:showListsMenu==="notes"?"white":"#555",borderColor:showListsMenu==="notes"?accent:"#e5e5e3"}} onClick={()=>setShowListsMenu(showListsMenu==="notes"?null:"notes")}>📝 פתקים</button>

        {/* ── FAB ── */}
        <button className="fab" style={{background:accent}} onClick={()=>setShowQuickCapture(true)} title="לכידה מהירה">+</button>

        {/* ── Header ── */}
        <div style={{background:"white",borderBottom:"1px solid #ebebea",padding:"0 24px"}}>
          <div style={{display:"flex",alignItems:"center",gap:8,paddingTop:14,paddingBottom:4}}>
            <span style={{fontSize:19,fontWeight:700,color:"#1a1a1a"}}>לוח המשימות</span>
            <div ref={profileMenuRef} style={{position:"relative",marginRight:6}}>
              <button onClick={()=>setShowProfileMenu(p=>!p)} style={{display:"flex",alignItems:"center",gap:6,padding:"4px 10px 4px 8px",borderRadius:20,border:"1.5px solid #e5e5e3",background:"white",cursor:"pointer",fontFamily:"'Heebo',sans-serif",fontSize:13,fontWeight:500,color:"#555"}}>
                <span className="profile-avatar">{profiles[activeProfileId]?.name?.charAt(0)||"?"}</span>
                {profiles[activeProfileId]?.name||""}
                <span style={{fontSize:10,color:"#aaa"}}>▾</span>
              </button>
              {showProfileMenu&&(
                <div className="dropdown-menu">
                  {allProfiles.map(p=>(<button key={p.id} className="dropdown-item" style={{fontWeight:p.id===activeProfileId?600:400,color:p.id===activeProfileId?"#2d6a4f":"#333"}} onClick={()=>switchProfile(p.id)}><span className="profile-avatar">{p.name.charAt(0)}</span>{p.name}{p.id===activeProfileId&&<span style={{marginRight:"auto",fontSize:12}}>✓</span>}</button>))}
                  <div className="dropdown-divider"/>
                  <button className="dropdown-item" onClick={()=>{setShowProfileMenu(false);setNewProfileName("");setShowProfileModal(true);}}>+ פרופיל חדש</button>
                  <button className="dropdown-item danger" onClick={deleteCurrentProfile}>מחק פרופיל נוכחי</button>
                </div>
              )}
            </div>
            <span style={{fontSize:12,color:"#bbb",marginRight:"auto"}}>{new Date().toLocaleDateString("he-IL",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}</span>
            <div ref={settingsMenuRef} style={{position:"relative"}}>
              <button onClick={()=>setShowSettingsMenu(p=>!p)} style={{background:"none",border:"none",cursor:"pointer",fontSize:18,color:"#aaa",padding:"4px 6px",borderRadius:6,lineHeight:1}}>⚙</button>
              {showSettingsMenu&&(
                <div className="dropdown-menu settings-dropdown">
                  <button className="dropdown-item" onClick={exportBackup}>📤 גיבוי</button>
                  <button className="dropdown-item" onClick={importBackup}>📥 ייבוא גיבוי</button>
                  <div className="dropdown-divider"/>
                  <button className="dropdown-item" onClick={shareWhatsApp}>💬 שתף ב-WhatsApp</button>
                </div>
              )}
            </div>
          </div>

          <div style={{display:"flex",alignItems:"center",gap:4,overflowX:"auto",paddingBottom:12,paddingTop:8}}>
            {tabs.map(t=>(
              <button key={t.id} className={`tab-pill${activeTab===t.id?" active":""}`} style={{"--accent":t.color}} onClick={()=>{setActiveTab(t.id);setActiveSubtab(null);}}>
                <span style={{width:8,height:8,borderRadius:"50%",background:t.color,flexShrink:0}}/>
                {t.label}
                {activeTab===t.id&&(<>
                  <span onClick={e=>{e.stopPropagation();setDefaultTab(t.id);}} title="הגדרי ככרטיסייה ראשית" style={{fontSize:12,cursor:"pointer",color:profiles[activeProfileId]?.defaultTab===t.id?"#f4a261":"#ddd",marginRight:-2,lineHeight:1}}>★</span>
                  <span className="icon-btn del" style={{fontSize:11,marginRight:-2,padding:0}} onClick={e=>{e.stopPropagation();deleteTab(t.id);}}>✕</span>
                </>)}
              </button>
            ))}
            {showNewTab?(
              <div style={{display:"flex",gap:6,alignItems:"center"}}>
                <input autoFocus className="plain-input" style={{width:150,fontSize:13,padding:"6px 10px","--accent":"#2d6a4f"}} placeholder="שם הכרטיסייה" value={newTabInput} onChange={e=>setNewTabInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")addTab();if(e.key==="Escape")setShowNewTab(false);}}/>
                <button className="add-btn" style={{padding:"6px 12px",fontSize:13,"--accent":"#2d6a4f"}} onClick={addTab}>הוסף</button>
                <button className="icon-btn" onClick={()=>setShowNewTab(false)}>✕</button>
              </div>
            ):(
              <button className="ghost-btn" style={{"--accent":"#2d6a4f"}} onClick={()=>setShowNewTab(true)}>+ כרטיסייה חדשה</button>
            )}
          </div>
        </div>

        {!currentTab&&(
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"70vh",color:"#bbb",gap:16}}>
            <div style={{fontSize:48}}>📋</div>
            <div style={{fontSize:18,fontWeight:500,color:"#999"}}>אין כרטיסיות עדיין</div>
            <div style={{fontSize:14}}>לחצי על "+ כרטיסייה חדשה" כדי להתחיל</div>
          </div>
        )}

        {currentTab&&(
          <div style={{padding:"20px 24px 100px"}}>
            {/* Subtabs */}
            <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:24}}>
              <button className={`sub-chip${!activeSubtab?" active":""}`} style={{"--accent":accent}} onClick={()=>setActiveSubtab(null)}>כללי</button>
              {currentTab.subtabs.map(s=>(
                <div key={s.id} style={{position:"relative"}}>
                  <button className={`sub-chip${activeSubtab===s.id?" active":""}`} style={{"--accent":accent}} onClick={()=>setActiveSubtab(s.id)}>{s.label}</button>
                  {activeSubtab===s.id&&<button className="icon-btn del" style={{position:"absolute",top:-5,left:-5,fontSize:10,background:"#f5f5f4",borderRadius:"50%",width:15,height:15,display:"flex",alignItems:"center",justifyContent:"center",padding:0,minWidth:"unset",minHeight:"unset"}} onClick={()=>deleteSubtab(s.id)}>✕</button>}
                </div>
              ))}
              {showNewSub?(
                <div style={{display:"flex",gap:6,alignItems:"center"}}>
                  <input autoFocus className="plain-input" style={{width:140,fontSize:13,padding:"5px 10px"}} placeholder="שם תת-כרטיסייה" value={newSubInput} onChange={e=>setNewSubInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")addSubtab();if(e.key==="Escape")setShowNewSub(false);}}/>
                  <button className="add-btn" style={{padding:"5px 10px",fontSize:13}} onClick={addSubtab}>הוסף</button>
                  <button className="icon-btn" onClick={()=>setShowNewSub(false)}>✕</button>
                </div>
              ):(
                <button className="ghost-btn" style={{padding:"4px 12px",fontSize:12}} onClick={()=>setShowNewSub(true)}>+ תת-כרטיסייה</button>
              )}
            </div>

            <div className="main-grid">
              {/* TASKS */}
              <div>
                <div style={{display:"flex",alignItems:"center",marginBottom:12}}>
                  <span style={{fontWeight:700,fontSize:16}}>משימות</span>
                  {pendingTasks.length>0&&<span style={{marginRight:8,background:accent,color:"white",borderRadius:10,fontSize:11,fontWeight:700,padding:"1px 7px"}}>{pendingTasks.length}</span>}
                </div>
                <div style={{display:"flex",gap:8,marginBottom:14}}>
                  <input className="plain-input" style={{flex:1}} placeholder="משימה חדשה..." value={taskInput} onChange={e=>setTaskInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addTask()}/>
                  <button className="add-btn" onClick={addTask}>+</button>
                </div>
                {pendingTasks.length===0&&<div style={{color:"#ccc",fontSize:13,textAlign:"center",padding:"24px 0",border:"1px dashed #eee",borderRadius:8}}>אין משימות פתוחות</div>}

                {pendingTasks.map(item=>(
                  <div key={item.id} className="task-row" style={{flexDirection:"column",gap:0}}>
                    <div style={{display:"flex",alignItems:"flex-start",gap:8,width:"100%"}}>
                      <div style={{position:"relative",flexShrink:0,paddingTop:1}}>
                        <button className={`check-circle${completingId===item.id?" popping":""}`} style={{"--accent":accent}} onClick={()=>handleComplete("task",item.id)}/>
                        {completingId===item.id&&<div className="ring" style={{"--accent":accent}}/>}
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        {editId===item.id
                          ?<input autoFocus className="edit-inline" value={editText} onChange={e=>setEditText(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")saveEdit("task",item.id);if(e.key==="Escape")setEditId(null);}}/>
                          :<span style={{fontSize:14,lineHeight:1.5}}>{item.text}</span>}
                      </div>
                      <div style={{display:"flex",alignItems:"center",flexShrink:0}}>
                        {/* ✓ big celebrate */}
                        <button className="icon-btn done-btn" style={{"--accent":accent}} title="סיימתי!" onClick={()=>handleBigComplete(item.id)}>✓</button>
                        {/* ✂ AI breakdown */}
                        <button className="icon-btn" style={{color:"#c9a96e",fontSize:14}} title="קטן עלי"
                          onClick={()=>breakdownTask(item.id,item.text)}>
                          {breakingDownId===item.id?<div className="spinner"/>:"✂"}
                        </button>
                        <button className="icon-btn" style={{fontSize:18}} title="ערכי" onClick={()=>{setEditId(item.id);setEditText(item.text);}}>✎</button>
                        <button className="icon-btn del" title="מחק" onClick={()=>deleteItem("task",item.id)}>✕</button>
                      </div>
                    </div>

                    {/* Subtasks */}
                    {(item.subtasks||[]).length>0&&(
                      <div style={{marginTop:8,paddingRight:28}}>
                        {(item.subtasks||[]).map(st=>(
                          <div key={st.id} className="subtask-row" style={{"--accent":accent}}>
                            <button className={`subtask-check${st.done?" checked":""}`} onClick={()=>toggleSubtask(item.id,st.id)}>{st.done?"✓":""}</button>
                            <span style={{fontSize:13,flex:1,color:st.done?"#bbb":"#555",textDecoration:st.done?"line-through":"none"}}>{st.text}</span>
                            <button className="icon-btn del" style={{fontSize:11,minWidth:"unset",minHeight:"unset",padding:"2px 3px"}} onClick={()=>deleteSubtask(item.id,st.id)}>✕</button>
                          </div>
                        ))}
                        {/* manual add subtask */}
                        {expandedTaskId===item.id&&(
                          <div style={{display:"flex",gap:6,marginTop:4}}>
                            <input autoFocus className="edit-inline" style={{fontSize:13}} placeholder="הוסיפי צעד קטן..." value={subtaskInput} onChange={e=>setSubtaskInput(e.target.value)}
                              onKeyDown={e=>{if(e.key==="Enter"){addSubtask(item.id,subtaskInput);setSubtaskInput("");}if(e.key==="Escape"){setExpandedTaskId(null);setSubtaskInput("");}}}/>
                            <button className="add-btn" style={{padding:"4px 10px",fontSize:13}} onClick={()=>{addSubtask(item.id,subtaskInput);setSubtaskInput("");}}>+</button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* manual subtask input when no subtasks yet */}
                    {expandedTaskId===item.id&&(item.subtasks||[]).length===0&&(
                      <div style={{marginTop:8,paddingRight:28,display:"flex",gap:6}}>
                        <input autoFocus className="edit-inline" style={{fontSize:13}} placeholder="הוסיפי צעד קטן..." value={subtaskInput} onChange={e=>setSubtaskInput(e.target.value)}
                          onKeyDown={e=>{if(e.key==="Enter"){addSubtask(item.id,subtaskInput);setSubtaskInput("");}if(e.key==="Escape"){setExpandedTaskId(null);setSubtaskInput("");}}}/>
                        <button className="add-btn" style={{padding:"4px 10px",fontSize:13}} onClick={()=>{addSubtask(item.id,subtaskInput);setSubtaskInput("");}}>+</button>
                      </div>
                    )}
                  </div>
                ))}

                {doneTasks.length>0&&<>
                  <div className="section-label">הושלמו ({doneTasks.length})</div>
                  {doneTasks.map(item=>(
                    <div key={item.id} className="task-row" style={{opacity:0.45}}>
                      <button className="check-circle checked" style={{"--accent":accent}} onClick={()=>toggleDone("task",item.id)}>✓</button>
                      <div style={{flex:1}}><span style={{fontSize:14,textDecoration:"line-through",color:"#888"}}>{item.text}</span></div>
                      <button className="icon-btn del" onClick={()=>deleteItem("task",item.id)}>✕</button>
                    </div>
                  ))}
                </>}
              </div>

              {/* REMINDERS */}
              <div>
                <div style={{display:"flex",alignItems:"center",marginBottom:12}}>
                  <span style={{fontWeight:700,fontSize:16}}>תזכורות</span>
                  {sortedReminders.filter(r=>getReminderStatus(r.startDate,r.endDate)==="active").length>0&&(
                    <span style={{marginRight:8,background:accent,color:"white",borderRadius:10,fontSize:11,fontWeight:700,padding:"1px 7px"}}>{sortedReminders.filter(r=>getReminderStatus(r.startDate,r.endDate)==="active").length} פעיל</span>
                  )}
                </div>
                <div style={{marginBottom:14}}>
                  <div style={{display:"flex",gap:8,marginBottom:showReminderDates?8:0}}>
                    <input className="plain-input" style={{flex:1}} placeholder="תזכורת חדשה..." value={reminderInput} onChange={e=>setReminderInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addReminder()}/>
                    <button onClick={()=>setShowReminderDates(p=>!p)} style={{border:`1.5px solid ${showReminderDates?accent:"#e5e5e3"}`,borderRadius:8,background:"white",padding:"0 10px",cursor:"pointer",fontSize:15,color:showReminderDates?accent:"#aaa",transition:"all 0.15s"}}>📅</button>
                    <button className="add-btn" onClick={addReminder}>+</button>
                  </div>
                  {showReminderDates&&(
                    <div style={{display:"flex",gap:8,alignItems:"center",background:"#f9f9f8",border:"1px solid #ebebea",borderRadius:8,padding:"10px 12px"}}>
                      <div style={{display:"flex",flexDirection:"column",gap:3,flex:1}}>
                        <label style={{fontSize:11,color:"#aaa",fontWeight:600}}>מתאריך</label>
                        <input type="date" className="plain-input" style={{fontSize:13,padding:"6px 10px",colorScheme:"light"}} value={reminderStart} onChange={e=>setReminderStart(e.target.value)}/>
                      </div>
                      <div style={{color:"#ccc",marginTop:16}}>—</div>
                      <div style={{display:"flex",flexDirection:"column",gap:3,flex:1}}>
                        <label style={{fontSize:11,color:"#aaa",fontWeight:600}}>עד תאריך</label>
                        <input type="date" className="plain-input" style={{fontSize:13,padding:"6px 10px",colorScheme:"light"}} value={reminderEnd} min={reminderStart} onChange={e=>setReminderEnd(e.target.value)}/>
                      </div>
                    </div>
                  )}
                </div>
                {sortedReminders.length===0&&<div style={{color:"#ccc",fontSize:13,textAlign:"center",padding:"24px 0",border:"1px dashed #eee",borderRadius:8}}>אין תזכורות פתוחות</div>}
                {sortedReminders.map(item=>{
                  const status=getReminderStatus(item.startDate,item.endDate);
                  const daysUntilStart=getDaysUntil(item.startDate);
                  const daysUntilEnd=getDaysUntil(item.endDate);
                  const statusColor=status==="active"?accent:status==="future"?"#5c6bc0":status==="past"?"#bbb":"#ccc";
                  const statusLabel=status==="active"?"פעיל עכשיו":status==="future"?"עתידי":status==="past"?"עבר":"";
                  const cardClass=`reminder-card${status==="active"?" active-r":status==="future"?" future-r":status==="past"?" past-r":""}`;
                  return (
                    <div key={item.id} className={cardClass} style={{"--accent":accent}}>
                      <div style={{display:"flex",alignItems:"flex-start",gap:10}}>
                        <div style={{position:"relative",flexShrink:0,paddingTop:1}}>
                          <button className={`check-circle${item.done?" checked":""}${completingId===item.id?" popping":""}`} style={{"--accent":accent}} onClick={()=>handleComplete("reminder",item.id)}>{item.done?"✓":""}</button>
                          {completingId===item.id&&<div className="ring" style={{"--accent":accent}}/>}
                        </div>
                        <div style={{flex:1,minWidth:0}}>
                          {editId===item.id
                            ?<input autoFocus className="edit-inline" value={editText} onChange={e=>setEditText(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")saveEdit("reminder",item.id);if(e.key==="Escape")setEditId(null);}}/>
                            :<span style={{fontSize:14,fontWeight:500,lineHeight:1.4}}>{item.text}</span>}
                          {(item.startDate||item.endDate)&&(
                            <div className="date-range-bar" style={{marginTop:8}}>
                              {status!=="none"&&<><span className="status-dot" style={{background:statusColor}}/><span style={{fontSize:11,color:statusColor,fontWeight:600,marginLeft:2}}>{statusLabel}</span><span style={{color:"#ddd"}}>·</span></>}
                              {item.startDate&&<span className="date-chip" style={{background:status==="active"?`${accent}18`:"#f0f0ef",color:status==="active"?accent:"#666"}}>{formatDate(item.startDate)}</span>}
                              {item.startDate&&item.endDate&&<span style={{color:"#ccc",fontSize:11}}>←</span>}
                              {item.endDate&&<span className="date-chip" style={{background:status==="active"?`${accent}18`:"#f0f0ef",color:status==="active"?accent:"#666"}}>{formatDate(item.endDate)}</span>}
                              {status==="future"&&daysUntilStart!==null&&<span className="days-badge" style={{background:"#e8eaf6",color:"#5c6bc0",marginRight:4}}>בעוד {daysUntilStart} יום</span>}
                              {status==="active"&&daysUntilEnd!==null&&<span className="days-badge" style={{background:`${accent}18`,color:accent,marginRight:4}}>{daysUntilEnd===0?"מסתיים היום":`${daysUntilEnd} יום נותרו`}</span>}
                              {status==="active"&&!item.endDate&&<span className="days-badge" style={{background:`${accent}18`,color:accent,marginRight:4}}>פעיל</span>}
                            </div>
                          )}
                        </div>
                        <button className="icon-btn" style={{fontSize:18}} onClick={()=>{setEditId(item.id);setEditText(item.text);}}>✎</button>
                        <button className="icon-btn del" onClick={()=>deleteItem("reminder",item.id)}>✕</button>
                      </div>
                    </div>
                  );
                })}
                {doneReminders.length>0&&<>
                  <div className="section-label">הושלמו ({doneReminders.length})</div>
                  {doneReminders.map(item=>(
                    <div key={item.id} className="reminder-card" style={{opacity:0.4}}>
                      <div style={{display:"flex",alignItems:"center",gap:10}}>
                        <button className="check-circle checked" style={{"--accent":accent}} onClick={()=>toggleDone("reminder",item.id)}>✓</button>
                        <span style={{flex:1,fontSize:14,textDecoration:"line-through",color:"#888"}}>{item.text}</span>
                        <button className="icon-btn del" onClick={()=>deleteItem("reminder",item.id)}>✕</button>
                      </div>
                    </div>
                  ))}
                </>}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
