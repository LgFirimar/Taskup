import { useState, useEffect, useMemo, useRef } from "react";
import SplashScreen from "./SplashScreen";
import ProfileModal from "./components/ProfileModal";
import ReminderAlertModal from "./components/ReminderAlertModal";
import BigCelebrate from "./components/BigCelebrate";
import QuickCapture from "./components/QuickCapture";
import ListsMenu from "./components/ListsMenu";
import ListDetailOverlay from "./components/ListDetailOverlay";
import EmailOverlay from "./components/EmailOverlay";
import ProjectsOverlay from "./components/ProjectsOverlay";
import { APP_CSS } from "./appStyles";
import { useVoiceCommands } from "./hooks/useVoiceCommands";
import {
  uid, STORAGE_KEY, WORKER_URL, PRIO_CYCLE, PRIO_COLOR, TAB_COLORS, DEFAULT_GMAIL_CLIENT_ID,
  formatDate, today, getReminderStatus, getDaysUntil, loadStorage, computeInitialAlerts,
} from "./utils";

export default function App() {
  const [showSplash,setShowSplash] = useState(()=>!sessionStorage.getItem("splashDone"));

  // ── Profiles ───────────────────────────────────────────────────────────────
  const [profiles,setProfiles] = useState(()=>loadStorage().profiles||{});
  const [activeProfileId,setActiveProfileId] = useState(()=>{
    const d=loadStorage();
    return d.activeProfile&&d.profiles?.[d.activeProfile]?d.activeProfile:null;
  });
  const [showProfileModal,setShowProfileModal] = useState(()=>{
    const d=loadStorage(); return !d.activeProfile||!d.profiles?.[d.activeProfile];
  });
  const [newProfileName,setNewProfileName] = useState("");
  const [showProfileMenu,setShowProfileMenu] = useState(false);
  const [showSettingsMenu,setShowSettingsMenu] = useState(false);

  // ── Navigation ─────────────────────────────────────────────────────────────
  const [activeTab,setActiveTab] = useState(()=>{
    const d=loadStorage();
    const pid=d.activeProfile&&d.profiles?.[d.activeProfile]?d.activeProfile:null;
    if (!pid) return null;
    const p=d.profiles[pid]; const t=p.tabs||[];
    if (!t.length) return null;
    return p.defaultTab&&t.find(x=>x.id===p.defaultTab)?p.defaultTab:t[0].id;
  });
  const [activeSubtab,setActiveSubtab] = useState(null);
  const [newTabInput,setNewTabInput] = useState("");
  const [showNewTab,setShowNewTab] = useState(false);
  const [newSubInput,setNewSubInput] = useState("");
  const [showNewSub,setShowNewSub] = useState(false);

  // ── Task / reminder inputs ─────────────────────────────────────────────────
  const [taskInput,setTaskInput] = useState("");
  const [reminderInput,setReminderInput] = useState("");
  const [reminderStart,setReminderStart] = useState("");
  const [reminderEnd,setReminderEnd] = useState("");
  const [showReminderDates,setShowReminderDates] = useState(false);
  const [editId,setEditId] = useState(null);
  const [editText,setEditText] = useState("");
  const [editAlertDate,setEditAlertDate] = useState("");
  const [editStartDate,setEditStartDate] = useState("");
  const [editEndDate,setEditEndDate] = useState("");

  // ── Search ─────────────────────────────────────────────────────────────────
  const [searchQuery,setSearchQuery] = useState("");

  // ── Features ──────────────────────────────────────────────────────────────
  const [completingId,setCompletingId] = useState(null);
  const [showDoneTasks,setShowDoneTasks] = useState(false);
  const [showDoneReminders,setShowDoneReminders] = useState(false);
  const [bigCelebrateId,setBigCelebrateId] = useState(null);
  const [expandedTaskId,setExpandedTaskId] = useState(null);
  const [subtaskInput,setSubtaskInput] = useState("");
  const [breakingDownId,setBreakingDownId] = useState(null);
  const [pendingBreakdown,setPendingBreakdown] = useState(null); // {taskId, steps:[{id,text}]}
  const [showQuickCapture,setShowQuickCapture] = useState(false);
  const [quickText,setQuickText] = useState("");

  // ── Shopping & Notes ──────────────────────────────────────────────────────
  const [showListsMenu,setShowListsMenu] = useState(null);
  const [openListId,setOpenListId] = useState(null);
  const [openListType,setOpenListType] = useState(null);
  const [listItemInput,setListItemInput] = useState("");
  const [newListName,setNewListName] = useState("");
  const [showNewListInput,setShowNewListInput] = useState(false);
  const [parsingList,setParsingList] = useState(false);
  const [editingShoppingItem,setEditingShoppingItem] = useState(null);
  const [showBoughtItems,setShowBoughtItems] = useState(false);

  // ── Projects ──────────────────────────────────────────────────────────────
  const [showProjects,setShowProjects] = useState(false);
  const [openProjectId,setOpenProjectId] = useState(null);
  const [projectView,setProjectView] = useState("tasks"); // tasks|timeline|brainstorm|board
  const [newProjectName,setNewProjectName] = useState("");
  const [showNewProject,setShowNewProject] = useState(false);
  const [newProjTaskInput,setNewProjTaskInput] = useState("");
  const [newProjSubtaskInput,setNewProjSubtaskInput] = useState({});
  const [expandedProjTask,setExpandedProjTask] = useState(null);
  const [newTimelineItem,setNewTimelineItem] = useState({text:"",date:""});
  const [showNewTimeline,setShowNewTimeline] = useState(false);
  const [newBubbleText,setNewBubbleText] = useState("");
  const [aiThinkingProj,setAiThinkingProj] = useState(false);
  const [newBoardText,setNewBoardText] = useState("");
  const [aiBreakingProj,setAiBreakingProj] = useState(null);

  // ── Email integration ─────────────────────────────────────────────────────
  const [showEmail,setShowEmail] = useState(false);
  const [gmailToken,setGmailToken] = useState(()=>localStorage.getItem("gmail_token")||null);
  const [emailRules,setEmailRules] = useState(()=>{ try{return JSON.parse(localStorage.getItem("email_rules"))||[];}catch{return[];} });
  const [emailSummaries,setEmailSummaries] = useState([]);
  const [emailLoading,setEmailLoading] = useState(false);
  const [emailStatusMsg,setEmailStatusMsg] = useState("");
  const [showNewRule,setShowNewRule] = useState(false);
  const [newRule,setNewRule] = useState({sender:"",subject:"",format:"bullets"});
  // A manual override (saved per-browser) always wins; otherwise fall back to
  // the app-wide Client ID baked in at build time, if one was configured.
  const [gmailClientIdOverride,setGmailClientIdOverride] = useState(()=>localStorage.getItem("gmail_client_id")||"");
  const gmailClientId = gmailClientIdOverride || DEFAULT_GMAIL_CLIENT_ID;
  const setGmailClientId = setGmailClientIdOverride;
  const [showClientIdInput,setShowClientIdInput] = useState(false);
  const [gmailAuthError,setGmailAuthError] = useState("");

  // ── Reminder alerts ───────────────────────────────────────────────────────
  const [alertReminders] = useState(computeInitialAlerts);
  const [showAlertModal,setShowAlertModal] = useState(()=>computeInitialAlerts().length>0);
  const [reminderAlertDate,setReminderAlertDate] = useState("");

  // ── Voice control ─────────────────────────────────────────────────────────
  const [voiceState,setVoiceState] = useState(()=>typeof window!=="undefined"&&sessionStorage.getItem("voice_on")?"idle":"off"); // "off"|"idle"|"listening"|"processing"
  const [voiceLabel,setVoiceLabel] = useState("");
  const [voiceDebug,setVoiceDebug] = useState("");
  const [voiceAvail] = useState(()=>typeof window!=="undefined"&&!!(window.SpeechRecognition||window.webkitSpeechRecognition));
  const [showVoiceHelp,setShowVoiceHelp] = useState(false);
  const [customVoiceCommands,setCustomVoiceCommands] = useState(()=>{
    try{ return JSON.parse(localStorage.getItem("voice_custom_commands"))||[]; }catch{ return []; }
  });
  const [showAddVoiceCmd,setShowAddVoiceCmd] = useState(false);
  const [newVoiceCmd,setNewVoiceCmd] = useState({kind:"alias",phrase:"",action:"task",targetType:"tab",targetName:""});
  const customCommandsRef = useRef([]);
  const voiceModeRef = useRef("idle");
  const voiceActiveRef = useRef(false);
  const recognitionRef = useRef(null);
  const openListIdRef = useRef(null);
  const openListTypeRef = useRef(null);
  const profilesRef = useRef(null);
  const tabsRef = useRef([]);
  const activeTabRef = useRef(null);
  const activeSubtabRef = useRef(null);
  const activeProfileIdRef = useRef(null);

  const profileMenuRef = useRef(null);
  const settingsMenuRef = useRef(null);

  useEffect(()=>{
    localStorage.setItem(STORAGE_KEY,JSON.stringify({profiles,activeProfile:activeProfileId}));
  },[profiles,activeProfileId]);

  useEffect(()=>{
    const h=(e)=>{
      if(profileMenuRef.current&&!profileMenuRef.current.contains(e.target))setShowProfileMenu(false);
      if(settingsMenuRef.current&&!settingsMenuRef.current.contains(e.target))setShowSettingsMenu(false);
    };
    document.addEventListener("mousedown",h);
    return ()=>document.removeEventListener("mousedown",h);
  },[]);

  // keep refs in sync so voice callbacks have fresh values
  useEffect(()=>{ openListIdRef.current=openListId; },[openListId]);
  useEffect(()=>{ openListTypeRef.current=openListType; },[openListType]);
  useEffect(()=>{ profilesRef.current=profiles; },[profiles]);
  useEffect(()=>{ activeTabRef.current=activeTab; },[activeTab]);
  useEffect(()=>{ activeSubtabRef.current=activeSubtab; },[activeSubtab]);
  useEffect(()=>{ activeProfileIdRef.current=activeProfileId; },[activeProfileId]);
  useEffect(()=>{ customCommandsRef.current=customVoiceCommands; },[customVoiceCommands]);
  useEffect(()=>{ localStorage.setItem("voice_custom_commands",JSON.stringify(customVoiceCommands)); },[customVoiceCommands]);

  const addVoiceCommand = () => {
    const phrase=newVoiceCmd.phrase.trim();
    if(!phrase) return;
    if(newVoiceCmd.kind==="shortcut"&&!newVoiceCmd.targetName.trim()) return;
    setCustomVoiceCommands(prev=>[...prev,{id:uid(),...newVoiceCmd,phrase}]);
    setNewVoiceCmd({kind:"alias",phrase:"",action:"task",targetType:"tab",targetName:""});
    setShowAddVoiceCmd(false);
  };
  const deleteVoiceCommand = (id) => setCustomVoiceCommands(prev=>prev.filter(c=>c.id!==id));

  // ── Voice recognition — Hebrew commands via Web Speech API ────────────────
  useVoiceCommands({
    showSplash,
    recognitionRef, voiceActiveRef, voiceModeRef,
    openListIdRef, openListTypeRef, profilesRef, tabsRef, activeTabRef, activeSubtabRef, activeProfileIdRef,
    customCommandsRef,
    setVoiceLabel, setVoiceDebug,
    setProfiles, setOpenListId, setOpenListType, setShowListsMenu, setActiveTab, setActiveSubtab,
  });

  // ── Derived tabs ──────────────────────────────────────────────────────────
  const tabs = useMemo(()=>profiles[activeProfileId]?.tabs||[], [profiles, activeProfileId]);
  useEffect(()=>{ tabsRef.current=tabs; },[tabs]);

  // Search across every task/reminder in the active profile — not just the open tab —
  // so results are useful even when you don't remember which tab something is in.
  const searchResults = useMemo(()=>{
    const q=searchQuery.trim().toLowerCase();
    if(q.length<2) return [];
    const results=[];
    const scan=(items,itype,tab,subtab)=>{
      items.forEach(item=>{
        if(item.text.toLowerCase().includes(q)) results.push({itype,item,tab,subtab});
      });
    };
    tabs.forEach(tab=>{
      scan(tab.tasks||[],"task",tab,null);
      scan(tab.reminders||[],"reminder",tab,null);
      (tab.subtabs||[]).forEach(sub=>{
        scan(sub.tasks||[],"task",tab,sub);
        scan(sub.reminders||[],"reminder",tab,sub);
      });
    });
    return results.slice(0,30);
  },[searchQuery,tabs]);
  const goToSearchResult = (r) => { setActiveTab(r.tab.id); setActiveSubtab(r.subtab?r.subtab.id:null); setSearchQuery(""); };
  const setTabs = (updater) => setProfiles(prev=>{
    const cur=prev[activeProfileId]||{tabs:[]};
    const newTabs=typeof updater==="function"?updater(cur.tabs):updater;
    return {...prev,[activeProfileId]:{...cur,tabs:newTabs}};
  });

  const updateProfile = (fn) => setProfiles(prev=>({...prev,[activeProfileId]:fn(prev[activeProfileId]||{})}));
  const getProfile = () => profiles[activeProfileId]||{};

  // ── Smart item update/delete (works across tab + all subtabs by ID) ────────
  const smartUpdateItem = (type,id,fn) => {
    const key=type==="task"?"tasks":"reminders";
    setTabs(prev=>prev.map(t=>{
      if(t.id!==activeTab) return t;
      return {
        ...t,
        [key]:t[key].map(i=>i.id===id?fn(i):i),
        subtabs:t.subtabs.map(s=>({...s,[key]:s[key].map(i=>i.id===id?fn(i):i)}))
      };
    }));
  };
  const smartDeleteItem = (type,id) => {
    const key=type==="task"?"tasks":"reminders";
    setTabs(prev=>prev.map(t=>{
      if(t.id!==activeTab) return t;
      return {
        ...t,
        [key]:t[key].filter(i=>i.id!==id),
        subtabs:t.subtabs.map(s=>({...s,[key]:s[key].filter(i=>i.id!==id)}))
      };
    }));
  };

  // ── Shopping ──────────────────────────────────────────────────────────────
  const shoppingLists = getProfile().shopping||[];
  const addShoppingList = (name)=>{ if(!name.trim())return; updateProfile(p=>({...p,shopping:[...(p.shopping||[]),{id:uid(),name:name.trim(),items:[]}]})); };
  const addShoppingItem = (lid,text)=>{ if(!text.trim())return; updateProfile(p=>({...p,shopping:(p.shopping||[]).map(l=>l.id===lid?{...l,items:[...l.items,{id:uid(),text:text.trim()}]}:l)})); };
  const deleteShoppingItem = (lid,iid)=>updateProfile(p=>({...p,shopping:(p.shopping||[]).map(l=>l.id===lid?{...l,items:l.items.filter(i=>i.id!==iid)}:l)}));
  const toggleShoppingItem = (lid,iid)=>updateProfile(p=>({...p,shopping:(p.shopping||[]).map(l=>l.id===lid?{...l,items:l.items.map(i=>i.id===iid?{...i,done:!i.done}:i)}:l)}));
  const deleteShoppingList = (lid)=>{
    const list=shoppingLists.find(l=>l.id===lid);
    const n=list?.items?.length||0;
    if(!window.confirm(n>0?`למחוק את רשימת "${list?.name}"? יימחקו לצמיתות ${n} פריטים.`:`למחוק את רשימת "${list?.name}"?`))return;
    updateProfile(p=>({...p,shopping:(p.shopping||[]).filter(l=>l.id!==lid)})); if(openListId===lid){setOpenListId(null);setOpenListType(null);}
  };
  const editShoppingItem = (lid,iid,text)=>{ updateProfile(p=>({...p,shopping:(p.shopping||[]).map(l=>l.id===lid?{...l,items:l.items.map(i=>i.id===iid?{...i,text}:i)}:l)})); setEditingShoppingItem(null); };
  const shareShoppingList = (list)=>{
    // Only what's still needed — items already marked "bought" would just clutter
    // the message for whoever's picking up the list.
    const text=`*רשימת קניות - ${list.name}* 🛒\n`+(list.items||[]).filter(i=>!i.done).map(i=>`• ${i.text}`).join("\n");
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`,"_blank");
  };

  const parseAndAddItems = async (listId,text) => {
    if(!text.trim())return;
    const clientItems=text.split(/[,;\n]/).map(s=>s.trim()).filter(Boolean);
    if(clientItems.length>1){
      updateProfile(p=>({...p,shopping:(p.shopping||[]).map(l=>l.id===listId?{...l,items:[...l.items,...clientItems.map(t=>({id:uid(),text:t}))]}:l)}));
      return;
    }
    setParsingList(true);
    try{
      const res=await fetch(`${WORKER_URL}/parse-list`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({text})});
      if(!res.ok)throw new Error(`parse-list failed: ${res.status}`);
      const{items}=await res.json();
      if(items?.length){ updateProfile(p=>({...p,shopping:(p.shopping||[]).map(l=>l.id===listId?{...l,items:[...l.items,...items.map(t=>({id:uid(),text:t}))]}:l)})); setParsingList(false); return; }
    }catch(err){ console.error("parseAndAddItems: falling back to raw text",err); }
    addShoppingItem(listId,text);
    setParsingList(false);
  };

  // ── Notes ─────────────────────────────────────────────────────────────────
  const notesList = getProfile().notes||[];
  const addNote = (name)=>{ if(!name.trim())return; updateProfile(p=>({...p,notes:[...(p.notes||[]),{id:uid(),name:name.trim(),content:""}]})); };
  const deleteNote = (nid)=>{
    const note=notesList.find(n=>n.id===nid);
    if(!window.confirm(`למחוק את הפתק "${note?.name}"? התוכן שלו יימחק לצמיתות.`))return;
    updateProfile(p=>({...p,notes:(p.notes||[]).filter(n=>n.id!==nid)})); if(openListId===nid){setOpenListId(null);setOpenListType(null);}
  };

  // ── Projects ──────────────────────────────────────────────────────────────
  const projects = getProfile().projects||[];
  const openProject = projects.find(p=>p.id===openProjectId)||null;

  const addProject = (name)=>{ if(!name.trim())return; const id=uid(); updateProfile(p=>({...p,projects:[...(p.projects||[]),{id,name:name.trim(),tasks:[],timeline:[],bubbles:[],board:[]}]})); setOpenProjectId(id); setShowProjects(false); setProjectView("overview"); };
  const deleteProject = (pid)=>{
    const proj=projects.find(p=>p.id===pid);
    const n=proj?.tasks?.length||0;
    if(!window.confirm(n>0?`למחוק את הפרויקט "${proj?.name}"? יימחקו לצמיתות ${n} משימות וכל התוכן שלו (ציר זמן, רעיונות, לוח).`:`למחוק את הפרויקט "${proj?.name}"?`))return;
    updateProfile(p=>({...p,projects:(p.projects||[]).filter(pj=>pj.id!==pid)})); if(openProjectId===pid){setOpenProjectId(null);}
  };

  const updateProject = (pid,fn)=>updateProfile(p=>({...p,projects:(p.projects||[]).map(pj=>pj.id===pid?fn(pj):pj)}));

  const addProjectTask = (pid,text)=>{ if(!text.trim())return; updateProject(pid,pj=>({...pj,tasks:[...pj.tasks,{id:uid(),text:text.trim(),done:false,subtasks:[]}]})); };
  const toggleProjectTask = (pid,tid)=>updateProject(pid,pj=>({...pj,tasks:pj.tasks.map(t=>t.id===tid?{...t,done:!t.done}:t)}));
  const deleteProjectTask = (pid,tid)=>updateProject(pid,pj=>({...pj,tasks:pj.tasks.filter(t=>t.id!==tid)}));
  const addProjectSubtask = (pid,tid,text)=>{ if(!text.trim())return; updateProject(pid,pj=>({...pj,tasks:pj.tasks.map(t=>t.id===tid?{...t,subtasks:[...(t.subtasks||[]),{id:uid(),text:text.trim(),done:false}]}:t)})); };
  const toggleProjectSubtask = (pid,tid,sid)=>updateProject(pid,pj=>({...pj,tasks:pj.tasks.map(t=>t.id===tid?{...t,subtasks:(t.subtasks||[]).map(s=>s.id===sid?{...s,done:!s.done}:s)}:t)}));
  const deleteProjectSubtask = (pid,tid,sid)=>updateProject(pid,pj=>({...pj,tasks:pj.tasks.map(t=>t.id===tid?{...t,subtasks:(t.subtasks||[]).filter(s=>s.id!==sid)}:t)}));

  const addTimelineItem = (pid,text,date)=>{ if(!text.trim())return; updateProject(pid,pj=>({...pj,timeline:[...(pj.timeline||[]),{id:uid(),text:text.trim(),date:date||""}].sort((a,b)=>a.date.localeCompare(b.date))})); };
  const deleteTimelineItem = (pid,iid)=>updateProject(pid,pj=>({...pj,timeline:(pj.timeline||[]).filter(i=>i.id!==iid)}));

  const addBubble = (pid,text,type="user")=>{ if(!text.trim())return; updateProject(pid,pj=>({...pj,bubbles:[...(pj.bubbles||[]),{id:uid(),text:text.trim(),type}]})); };
  const deleteBubble = (pid,bid)=>updateProject(pid,pj=>({...pj,bubbles:(pj.bubbles||[]).filter(b=>b.id!==bid)}));

  const addBoardItem = (pid,text)=>{ if(!text.trim())return; updateProject(pid,pj=>({...pj,board:[...(pj.board||[]),{id:uid(),text:text.trim()}]})); };
  const deleteBoardItem = (pid,bid)=>updateProject(pid,pj=>({...pj,board:(pj.board||[]).filter(b=>b.id!==bid)}));

  const aiThinkBubbles = async (pid,topic)=>{
    setAiThinkingProj(true);
    try{
      const res=await fetch(`${WORKER_URL}/breakdown`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({task:`רעיונות לנושא: ${topic}`})});
      if(!res.ok)throw new Error(`breakdown failed: ${res.status}`);
      const{steps}=await res.json();
      if(steps?.length) steps.forEach(s=>addBubble(pid,s,"ai"));
    }catch(err){ console.error("aiThinkBubbles failed",err); }
    setAiThinkingProj(false);
  };

  const aiBreakProjectTask = async (pid,tid,text)=>{
    setAiBreakingProj(tid);
    try{
      const res=await fetch(`${WORKER_URL}/breakdown`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({task:text})});
      if(!res.ok)throw new Error(`breakdown failed: ${res.status}`);
      const{steps}=await res.json();
      if(steps?.length) steps.forEach(s=>addProjectSubtask(pid,tid,s));
    }catch(err){ console.error("aiBreakProjectTask failed",err); }
    setAiBreakingProj(null);
  };

  const getProjectProgress = (pj)=>{
    const all=pj.tasks.length; if(!all) return 0;
    return Math.round(pj.tasks.filter(t=>t.done).length/all*100);
  };

  // ── Email functions ────────────────────────────────────────────────────────
  const saveEmailRules = (rules) => { setEmailRules(rules); localStorage.setItem("email_rules", JSON.stringify(rules)); };

  const connectGmail = () => {
    const clientId = gmailClientId.trim();
    if (!clientId) { setShowClientIdInput(true); return; }
    setGmailAuthError("");

    // Load Google Identity Services script if not already loaded
    const initGIS = () => {
      try{
        const client = window.google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: "https://www.googleapis.com/auth/gmail.readonly",
          callback: (response) => {
            if (response.access_token) {
              // Google's consent screen lets the user un-check individual permissions —
              // if she unchecked the Gmail one, we still get a token, but every Gmail
              // API call will fail with 403 later. Catch that here instead of leaving
              // her to hit a confusing 403 when she tries to summarize.
              if (response.scope && !response.scope.includes("gmail.readonly")) {
                console.error("Gmail auth: token granted without gmail.readonly scope",response.scope);
                setGmailAuthError("ההתחברות הצליחה אבל לא אישרת את ההרשאה לקריאת Gmail (יכול להיות שהצ'קבוקס של \"קריאת המייל שלך\" בוטל בזמן האישור). נסי להתחבר שוב ווודאי שכל ההרשאות מסומנות.");
                return;
              }
              localStorage.setItem("gmail_token", response.access_token);
              setGmailToken(response.access_token);
              setGmailAuthError("");
            } else {
              console.error("Gmail auth: no access_token in response",response);
              setGmailAuthError("החיבור נכשל — ודאי שה-Client ID נכון ונסי שוב.");
              setShowClientIdInput(true);
            }
          },
          error_callback: (err) => {
            console.error("Gmail auth error",err);
            setGmailAuthError(
              err?.type==="popup_closed"
                ? "החלון נסגר לפני שהושלם החיבור. נסי שוב."
                : "החיבור ל-Gmail נכשל — כנראה שה-Client ID לא נכון. ודאי אותו ונסי שוב."
            );
            setShowClientIdInput(true);
          },
        });
        client.requestAccessToken();
      }catch(err){
        console.error("Gmail auth: failed to init token client",err);
        setGmailAuthError("החיבור נכשל — ודאי שה-Client ID תקין ונסי שוב.");
        setShowClientIdInput(true);
      }
    };

    if (window.google?.accounts?.oauth2) {
      initGIS();
    } else {
      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.onload = initGIS;
      script.onerror = (err) => {
        console.error("Gmail auth: failed to load Google Identity Services script",err);
        setGmailAuthError("לא הצלחתי לטעון את שירות ההתחברות של Google. בדקי את החיבור לאינטרנט ונסי שוב.");
      };
      document.head.appendChild(script);
    }
  };

  const disconnectGmail = (message="") => { setGmailToken(null); localStorage.removeItem("gmail_token"); setEmailSummaries([]); setGmailAuthError(message); };

  const editGmailClientId = () => { setGmailAuthError(""); setShowClientIdInput(true); };

  const fetchAndSummarize = async () => {
    if (!gmailToken || emailRules.length === 0) return;
    setEmailLoading(true);
    setEmailStatusMsg("");
    const summaries = [];
    let threadsFound = 0;
    let summarizeFailures = 0;
    const ruleDebug = []; // per-rule diagnostics: what we searched for and what came back
    for (const rule of emailRules) {
      const ruleLabel = [rule.sender&&`מ: ${rule.sender}`, rule.subject&&`מילים: ${rule.subject}`].filter(Boolean).join(" | ") || "(חוק ללא תנאים)";
      try {
        // Build Gmail search query. Note: no "in:inbox" restriction — Gmail's
        // default search already excludes Spam/Trash, but still matches mail
        // that's been archived out of the inbox (a very common case).
        let q = "";
        if (rule.dateAll) { /* no date filter */ }
        else if (rule.dateFrom) { q += `after:${rule.dateFrom.replace(/-/g,"/")} `; }
        else { q += "newer_than:30d "; }
        if (rule.sender) {
          // Quote multi-word senders (e.g. a display name) — otherwise Gmail
          // treats "from:יוסי כהן" as from:יוסי AND a separate required word
          // "כהן" anywhere in the email, which usually matches nothing.
          const senderTerm = rule.sender.includes(" ") ? `"${rule.sender}"` : rule.sender;
          q += `from:${senderTerm} `;
        }
        if (rule.subject) {
          // Quote multi-word terms so Gmail matches the phrase, not each word separately.
          const term = rule.subject.includes(" ") ? `"${rule.subject}"` : rule.subject;
          // scope "all" = also search the email body, not just the subject line.
          q += rule.searchScope === "all" ? `${term} ` : `subject:${term} `;
        }
        q = q.trim();

        const searchRes = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/threads?q=${encodeURIComponent(q)}&maxResults=5`,
          { headers: { Authorization: `Bearer ${gmailToken}` } }
        );
        if (searchRes.status === 401) {
          disconnectGmail("החיבור לחשבון Gmail פג תוקף (זה קורה אחרי כשעה) — לחצי על \"התחבר ל-Gmail\" למעלה כדי להתחבר מחדש, ואז נסי לסכם שוב.");
          setEmailLoading(false);
          return;
        }
        if (searchRes.status === 403) {
          // 403 almost always means Gmail API access itself is blocked — not a bad
          // query. Surface Google's own error message (e.g. "Gmail API has not been
          // used in project ... before or it is disabled", or "Request had
          // insufficient authentication scopes") instead of a bare status code.
          let detail = "";
          try { const errBody = await searchRes.json(); detail = errBody?.error?.message || ""; } catch { /* ignore parse failure */ }
          throw new Error(`אין הרשאה (403)${detail?`: ${detail}`:""} — ודאי ש-Gmail API מופעל בפרויקט ב-Google Cloud Console, ושאישרת את הרשאת קריאת המייל בזמן ההתחברות.`);
        }
        if (!searchRes.ok) throw new Error(`Gmail search failed: ${searchRes.status}`);
        const searchData = await searchRes.json();
        const threads = searchData.threads || [];
        threadsFound += threads.length;
        ruleDebug.push(`${ruleLabel} → שאילתה: "${q}" → ${threads.length} תוצאות`);

        for (const thread of threads.slice(0, 3)) {
          const tRes = await fetch(
            `https://gmail.googleapis.com/gmail/v1/users/me/threads/${thread.id}?format=full`,
            { headers: { Authorization: `Bearer ${gmailToken}` } }
          );
          if (!tRes.ok) { console.error(`Gmail thread fetch failed: ${tRes.status}`); summarizeFailures++; continue; }
          const tData = await tRes.json();
          const msg = tData.messages?.[0];
          if (!msg) continue;
          const headers = msg.payload?.headers || [];
          const subject = headers.find(h=>h.name==="Subject")?.value || "";
          const sender = headers.find(h=>h.name==="From")?.value || "";
          const date = headers.find(h=>h.name==="Date")?.value || "";

          // Decode body
          const getBody = (part) => {
            if (part.body?.data) return atob(part.body.data.replace(/-/g,"+").replace(/_/g,"/"));
            if (part.parts) return part.parts.map(getBody).join(" ");
            return "";
          };
          const rawBody = getBody(msg.payload);
          const body = rawBody.replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim();

          const sumRes = await fetch(`${WORKER_URL}/summarize-email`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ subject, sender, body: body.slice(0,3000), format: rule.format }),
          });
          if (!sumRes.ok) { console.error(`summarize-email failed: ${sumRes.status}`); summarizeFailures++; continue; }
          const sumData = await sumRes.json();
          summaries.push({ id: thread.id, subject, sender, date, summary: sumData.result, format: rule.format, ruleId: rule.id });
        }
      } catch(e) {
        console.error(e);
        summarizeFailures++;
        ruleDebug.push(`${ruleLabel} → שגיאה: ${e.message}`);
      }
    }
    setEmailSummaries(summaries);
    if (summaries.length === 0) {
      if (threadsFound === 0) {
        setEmailStatusMsg(
          "לא נמצאו מיילים תואמים לחוקים. בדקי שהשולח/הנושא מדויקים, או סמני \"כל המיילים\" בעריכת החוק — כברירת מחדל מחפשים רק 30 ימים אחורה.\n\nפירוט לפי חוק:\n"
          + ruleDebug.map(d=>`• ${d}`).join("\n")
        );
      } else if (summarizeFailures > 0) {
        setEmailStatusMsg("נמצאו מיילים תואמים, אבל הסיכום נכשל. נסי שוב בעוד רגע — אם זה ממשיך לקרות ייתכן שיש בעיה בשרת הסיכום.");
      } else {
        setEmailStatusMsg("נמצאו מיילים אך לא ניתן היה לקרוא את תוכנם.");
      }
    }
    setEmailLoading(false);
  };

  // ── Profile actions ────────────────────────────────────────────────────────
  const createProfile = ()=>{
    const name=newProfileName.trim(); if(!name)return; const id=uid();
    setProfiles(prev=>({...prev,[id]:{id,name,tabs:[]}}));
    setActiveProfileId(id); setActiveTab(null); setActiveSubtab(null);
    setNewProfileName(""); setShowProfileModal(false);
  };
  const switchProfile = (id)=>{
    const p=profiles[id]; const t=p?.tabs||[];
    const def=p?.defaultTab&&t.find(x=>x.id===p.defaultTab)?p.defaultTab:t[0]?.id||null;
    setActiveProfileId(id); setActiveTab(def); setActiveSubtab(null); setShowProfileMenu(false);
  };
  const deleteCurrentProfile = ()=>{
    if(!window.confirm(`למחוק את הפרופיל "${profiles[activeProfileId]?.name}"?`))return;
    const remaining=Object.keys(profiles).filter(id=>id!==activeProfileId);
    setProfiles(prev=>{const n={...prev};delete n[activeProfileId];return n;});
    if(remaining.length>0){setActiveProfileId(remaining[0]);setActiveTab(null);setActiveSubtab(null);}
    else{setActiveProfileId(null);setShowProfileModal(true);}
    setShowProfileMenu(false);
  };
  const setDefaultTab = (tabId)=>updateProfile(p=>({...p,defaultTab:tabId}));

  // ── Backup / share ─────────────────────────────────────────────────────────
  const exportBackup = ()=>{
    const blob=new Blob([JSON.stringify({profiles,activeProfile:activeProfileId},null,2)],{type:"application/json"});
    const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download=`taskup-backup-${today()}.json`; a.click();
    setShowSettingsMenu(false);
  };
  const importBackup = ()=>{
    const input=document.createElement("input"); input.type="file"; input.accept=".json";
    input.onchange=(e)=>{
      const reader=new FileReader();
      reader.onload=(ev)=>{try{const d=JSON.parse(ev.target.result);if(!d.profiles)throw new Error();localStorage.setItem(STORAGE_KEY,JSON.stringify(d));window.location.reload();}catch{alert("קובץ גיבוי לא תקין");}};
      reader.readAsText(e.target.files[0]);
    };
    input.click(); setShowSettingsMenu(false);
  };
  const shareWhatsApp = ()=>{ window.open(`https://wa.me/?text=${encodeURIComponent("לוח המשימות שלי 📋\n"+window.location.origin)}`,"_blank"); setShowSettingsMenu(false); };

  // ── Context ────────────────────────────────────────────────────────────────
  const currentTab = tabs.find(t=>t.id===activeTab);
  const currentSubtab = activeSubtab&&currentTab?currentTab.subtabs.find(s=>s.id===activeSubtab):null;
  const ctx = currentSubtab||currentTab;
  const isAggregate = activeSubtab===null&&!!currentTab;

  const updateCtx = (fn) => setTabs(prev=>prev.map(t=>{
    if(t.id!==activeTab)return t;
    if(currentSubtab)return{...t,subtabs:t.subtabs.map(s=>s.id===activeSubtab?fn(s):s)};
    return fn(t);
  }));

  // ── Tab / subtab ──────────────────────────────────────────────────────────
  const addTab = ()=>{
    const name=newTabInput.trim(); if(!name)return; const id=uid();
    setTabs(p=>[...p,{id,label:name,color:TAB_COLORS[p.length%TAB_COLORS.length],subtabs:[],tasks:[],reminders:[]}]);
    setNewTabInput(""); setShowNewTab(false); setActiveTab(id); setActiveSubtab(null);
  };
  const deleteTab = (id)=>{
    const tab=tabs.find(t=>t.id===id);
    const n=(tab?.tasks?.length||0)+(tab?.reminders?.length||0)+(tab?.subtabs?.length||0);
    if(!window.confirm(n>0?`למחוק את הכרטיסייה "${tab?.label}"? יימחקו לצמיתות ${tab?.tasks?.length||0} משימות, ${tab?.reminders?.length||0} תזכורות ו-${tab?.subtabs?.length||0} תת-כרטיסיות.`:`למחוק את הכרטיסייה "${tab?.label}"?`))return;
    setTabs(p=>p.filter(t=>t.id!==id));
    if(activeTab===id){
      const remaining=tabs.filter(t=>t.id!==id);
      const p=profiles[activeProfileId];
      const def=p?.defaultTab&&remaining.find(t=>t.id===p.defaultTab)?p.defaultTab:remaining[0]?.id||null;
      setActiveTab(def); setActiveSubtab(null);
    }
  };
  const addSubtab = ()=>{
    const name=newSubInput.trim(); if(!name)return; const id=uid();
    setTabs(prev=>prev.map(t=>t.id===activeTab?{...t,subtabs:[...t.subtabs,{id,label:name,tasks:[],reminders:[]}]}:t));
    setNewSubInput(""); setShowNewSub(false); setActiveSubtab(id);
  };
  const deleteSubtab = (id)=>{
    const sub=tabs.find(t=>t.id===activeTab)?.subtabs.find(s=>s.id===id);
    const n=(sub?.tasks?.length||0)+(sub?.reminders?.length||0);
    if(!window.confirm(n>0?`למחוק את "${sub?.label}"? יימחקו לצמיתות ${sub?.tasks?.length||0} משימות ו-${sub?.reminders?.length||0} תזכורות.`:`למחוק את "${sub?.label}"?`))return;
    setTabs(prev=>prev.map(t=>t.id===activeTab?{...t,subtabs:t.subtabs.filter(s=>s.id!==id)}:t)); if(activeSubtab===id)setActiveSubtab(null);
  };

  // ── Tasks & reminders ─────────────────────────────────────────────────────
  const addTask = ()=>{ const text=taskInput.trim(); if(!text)return; updateCtx(c=>({...c,tasks:[...c.tasks,{id:uid(),text,done:false,createdAt:today(),subtasks:[],priority:null}]})); setTaskInput(""); };
  const addReminder = ()=>{
    const text=reminderInput.trim(); if(!text)return;
    updateCtx(c=>({...c,reminders:[...c.reminders,{id:uid(),text,done:false,createdAt:today(),startDate:reminderStart||null,endDate:reminderEnd||null,alertDate:reminderAlertDate||null}]}));
    setReminderInput(""); setReminderStart(""); setReminderEnd(""); setReminderAlertDate(""); setShowReminderDates(false);
  };

  const toggleDone = (type,id)=>smartUpdateItem(type,id,i=>({...i,done:!i.done}));
  const deleteItem = (type,id)=>smartDeleteItem(type,id);
  const saveEdit = (type,id)=>{
    smartUpdateItem(type,id,i=>({...i,text:editText,...(type==="reminder"?{alertDate:editAlertDate||null,startDate:editStartDate||null,endDate:editEndDate||null}:{})}));
    setEditId(null); setEditText(""); setEditAlertDate(""); setEditStartDate(""); setEditEndDate("");
  };
  const cyclePriority = (id)=>smartUpdateItem("task",id,t=>({...t,priority:PRIO_CYCLE[(PRIO_CYCLE.indexOf(t.priority||null)+1)%4]}));

  const handleComplete = (type,id)=>{
    const key=type==="task"?"tasks":"reminders";
    const findItem = ()=>{
      for(const t of tabs){ if(t.id!==activeTab)continue; const i=t[key]?.find(x=>x.id===id); if(i)return i; for(const s of t.subtabs||[]){const si=s[key]?.find(x=>x.id===id);if(si)return si;} } return null;
    };
    const item=findItem();
    if(item&&!item.done){setCompletingId(id);setTimeout(()=>setCompletingId(null),600);}
    toggleDone(type,id);
  };
  const handleBigComplete = (id)=>{ setBigCelebrateId(id); setTimeout(()=>setBigCelebrateId(null),1000); handleComplete("task",id); };

  // ── Subtasks ──────────────────────────────────────────────────────────────
  const addSubtask = (taskId,text)=>{
    if(!text.trim())return; const newSub={id:uid(),text:text.trim(),done:false};
    setTabs(prev=>prev.map(t=>{ if(t.id!==activeTab)return t; const u=tasks=>tasks.map(task=>task.id===taskId?{...task,subtasks:[...(task.subtasks||[]),newSub]}:task); return{...t,tasks:u(t.tasks),subtabs:t.subtabs.map(s=>({...s,tasks:u(s.tasks)}))}; }));
  };
  const toggleSubtask = (taskId,stId)=>{
    setTabs(prev=>prev.map(t=>{ if(t.id!==activeTab)return t; const u=tasks=>tasks.map(task=>task.id===taskId?{...task,subtasks:(task.subtasks||[]).map(s=>s.id===stId?{...s,done:!s.done}:s)}:task); return{...t,tasks:u(t.tasks),subtabs:t.subtabs.map(s=>({...s,tasks:u(s.tasks)}))}; }));
  };
  const deleteSubtask = (taskId,stId)=>{
    setTabs(prev=>prev.map(t=>{ if(t.id!==activeTab)return t; const u=tasks=>tasks.map(task=>task.id===taskId?{...task,subtasks:(task.subtasks||[]).filter(s=>s.id!==stId)}:task); return{...t,tasks:u(t.tasks),subtabs:t.subtabs.map(s=>({...s,tasks:u(s.tasks)}))}; }));
  };

  // ── AI breakdown ──────────────────────────────────────────────────────────
  // ✂ scissors → adds directly; ✦✦ → shows editable suggestions (pendingBreakdown)
  const breakdownTaskDirect = async (taskId,taskText)=>{
    const capTab=activeTab; const capSubtab=activeSubtab; const hasSub=!!currentSubtab;
    setBreakingDownId(taskId); setExpandedTaskId(taskId);
    try{
      const res=await fetch(`${WORKER_URL}/breakdown`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({task:taskText})});
      if(!res.ok)throw new Error(`breakdown failed: ${res.status}`);
      const{steps}=await res.json();
      if(steps?.length){
        const newSubs=steps.map(text=>({id:uid(),text,done:false}));
        setTabs(prev=>prev.map(t=>{ if(t.id!==capTab)return t; const u=tasks=>tasks.map(task=>task.id===taskId?{...task,subtasks:[...(task.subtasks||[]),...newSubs]}:task); if(hasSub)return{...t,subtabs:t.subtabs.map(s=>s.id===capSubtab?{...s,tasks:u(s.tasks)}:s)}; return{...t,tasks:u(t.tasks)}; }));
      }
    }catch(err){ console.error("breakdownTaskDirect failed",err); }
    setBreakingDownId(null);
  };

  const breakdownTask = async (taskId,taskText)=>{
    setBreakingDownId(taskId);
    try{
      const res=await fetch(`${WORKER_URL}/breakdown`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({task:taskText})});
      if(!res.ok)throw new Error(`breakdown failed: ${res.status}`);
      const{steps}=await res.json();
      if(steps?.length) setPendingBreakdown({taskId, steps:steps.map(t=>({id:uid(),text:t}))});
    }catch(err){ console.error("breakdownTask failed",err); }
    setBreakingDownId(null);
  };

  const confirmBreakdown = ()=>{
    if(!pendingBreakdown) return;
    const {taskId, steps} = pendingBreakdown;
    const newSubs = steps.filter(s=>s.text.trim()).map(s=>({id:s.id,text:s.text.trim(),done:false}));
    setTabs(prev=>prev.map(t=>{ if(t.id!==activeTab)return t; const u=tasks=>tasks.map(task=>task.id===taskId?{...task,subtasks:[...(task.subtasks||[]),...newSubs]}:task); return{...t,tasks:u(t.tasks),subtabs:t.subtabs.map(s=>({...s,tasks:u(s.tasks)}))}; }));
    setPendingBreakdown(null);
  };

  // ── Quick capture ─────────────────────────────────────────────────────────
  const quickCapture = ()=>{
    if(!quickText.trim()||!ctx)return;
    updateCtx(c=>({...c,tasks:[...c.tasks,{id:uid(),text:quickText.trim(),done:false,createdAt:today(),subtasks:[],priority:null}]}));
    setQuickText(""); setShowQuickCapture(false);
  };

  // ── Aggregate display helpers ─────────────────────────────────────────────
  const accent = currentTab?.color||"#2d6a4f";
  const allProfiles = Object.values(profiles);

  // Groups for aggregate "כללי" view
  const taskGroups = isAggregate&&currentTab ? [
    {label:null, tasks:(currentTab.tasks||[])},
    ...(currentTab.subtabs||[]).map(s=>({label:s.label,tasks:s.tasks||[]}))
  ] : [{label:null,tasks:ctx?.tasks||[]}];

  const reminderGroups = isAggregate&&currentTab ? [
    {label:null, reminders:(currentTab.reminders||[])},
    ...(currentTab.subtabs||[]).map(s=>({label:s.label,reminders:s.reminders||[]}))
  ] : [{label:null,reminders:ctx?.reminders||[]}];

  const allPendingTasks = taskGroups.flatMap(g=>g.tasks.filter(t=>!t.done));
  const allDoneTasks = taskGroups.flatMap(g=>g.tasks.filter(t=>t.done));

  const sortedReminderGroups = reminderGroups.map(g=>({
    ...g,
    reminders:g.reminders.filter(r=>!r.done).sort((a,b)=>{
      const order={active:0,future:1,none:2,past:3};
      return(order[getReminderStatus(a.startDate,a.endDate)]??2)-(order[getReminderStatus(b.startDate,b.endDate)]??2)||(a.startDate||"z").localeCompare(b.startDate||"z");
    })
  }));
  const allDoneReminders = reminderGroups.flatMap(g=>g.reminders.filter(r=>r.done));

  // open list data
  const openList = openListType==="shopping"?shoppingLists.find(l=>l.id===openListId):notesList.find(n=>n.id===openListId);

  // ── Task row renderer ─────────────────────────────────────────────────────
  const renderTaskRow = (item) => {
    const prioColor = item.priority?PRIO_COLOR[item.priority]:null;
    const prioClass = item.priority?` prio-${item.priority}`:"";
    const hasPending = pendingBreakdown?.taskId===item.id;
    return (
      <div key={item.id} className={`task-row${prioClass}`} style={{flexDirection:"column",gap:0}}>
        <div style={{display:"flex",alignItems:"flex-start",gap:10,width:"100%"}}>
          {/* Priority dot */}
          <button className="prio-dot" style={{background:prioColor||"white",borderColor:prioColor||"#d8d7cf","--accent":accent}} title="הגדרי עדיפות" aria-label="הגדרי עדיפות"
            onClick={()=>cyclePriority(item.id)}/>

          <div style={{flex:1,minWidth:0}}>
            {editId===item.id
              ?<input autoFocus className="edit-inline" value={editText} onChange={e=>setEditText(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")saveEdit("task",item.id);if(e.key==="Escape")setEditId(null);}}/>
              :<span style={{fontSize:14,lineHeight:1.55,color:"#222"}}>{item.text}</span>}
          </div>

          <div style={{display:"flex",alignItems:"center",flexShrink:0,gap:2}}>
            {/* Done — checkmark SVG */}
            <button className="icon-btn done-btn" style={{"--accent":accent}} title="סיימתי!" aria-label="סיימתי!" onClick={()=>handleBigComplete(item.id)}>
              <svg width="14" height="11" viewBox="0 0 14 11" fill="none">
                <path d="M1.5 5.5L5.5 9.5L12.5 1.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            {/* Scissors — direct breakdown */}
            <button className="icon-btn" style={{color:breakingDownId===item.id?"#ffa726":"#d4a96e",fontSize:14}} title="קטן עלי — מוסיף ישירות" aria-label="קטן עלי — מוסיף ישירות"
              onClick={()=>breakdownTaskDirect(item.id,item.text)}>
              {breakingDownId===item.id?<div className="spinner" style={{borderTopColor:"#ffa726",borderColor:"#ffa72633"}}/>:"✂"}
            </button>
            {/* ✦✦ Claude suggestions — shows editable steps */}
            <button
              title="שאלי את קלוד"
              aria-label="שאלי את קלוד"
              onClick={()=>breakdownTask(item.id,item.text)}
              style={{background:"none",border:"none",cursor:"pointer",padding:"3px 5px",borderRadius:8,fontSize:13,fontWeight:700,color:hasPending?"#b45309":"#c8b090",letterSpacing:-1,minWidth:28,minHeight:28,display:"flex",alignItems:"center",justifyContent:"center"}}>
              {breakingDownId===item.id&&hasPending?<div className="spinner" style={{borderTopColor:"#b45309",borderColor:"#b4530933",width:12,height:12}}/>:"✦✦"}
            </button>
            <button className="icon-btn" style={{fontSize:17}} aria-label="ערוך משימה" onClick={()=>{setEditId(item.id);setEditText(item.text);}}>✎</button>
            <button className="icon-btn del" aria-label="מחק משימה" onClick={()=>deleteItem("task",item.id)}>✕</button>
          </div>
        </div>

        {/* Existing subtasks */}
        {(item.subtasks||[]).length>0&&(
          <div style={{marginTop:8,paddingRight:28}}>
            {(item.subtasks||[]).map(st=>(
              <div key={st.id} className="subtask-row" style={{"--accent":accent}}>
                <button className={`subtask-check${st.done?" checked":""}`} aria-label={st.done?"בטל סימון תת-משימה":"סמן תת-משימה כבוצעה"} onClick={()=>toggleSubtask(item.id,st.id)}>
                  {st.done&&<svg width="9" height="7" viewBox="0 0 9 7" fill="none"><path d="M1 3.5L3.5 6L8 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                </button>
                <span style={{fontSize:13,flex:1,color:st.done?"#bbb":"#555",textDecoration:st.done?"line-through":"none"}}>{st.text}</span>
                <button className="icon-btn del" style={{fontSize:11,minWidth:"unset",minHeight:"unset",padding:"2px 3px"}} aria-label="מחק תת-משימה" onClick={()=>deleteSubtask(item.id,st.id)}>✕</button>
              </div>
            ))}
          </div>
        )}

        {/* AI pending suggestions */}
        {hasPending&&(
          <div style={{marginTop:10,paddingRight:12,background:"#fffdf5",borderRadius:10,padding:"10px 12px",border:"1px solid #fde68a"}}>
            <div style={{fontSize:11,fontWeight:700,color:"#b45309",marginBottom:8}}>✦ הצעות קלוד — ערכי או מחקי לפני אישור</div>
            {pendingBreakdown.steps.map((s,idx)=>(
              <div key={s.id} style={{display:"flex",alignItems:"center",gap:6,marginBottom:6}}>
                <span style={{fontSize:11,color:"#bbb",minWidth:16}}>{idx+1}.</span>
                <input className="edit-inline" style={{flex:1,fontSize:13}} value={s.text}
                  onChange={e=>setPendingBreakdown(p=>({...p,steps:p.steps.map(x=>x.id===s.id?{...x,text:e.target.value}:x)}))}/>
                <button onClick={()=>setPendingBreakdown(p=>({...p,steps:p.steps.filter(x=>x.id!==s.id)}))} style={{background:"none",border:"none",color:"#ddd",cursor:"pointer",fontSize:14,flexShrink:0}} aria-label="מחק הצעה">✕</button>
              </div>
            ))}
            <div style={{display:"flex",gap:8,marginTop:10}}>
              <button className="add-btn" style={{flex:1,padding:"7px 0",fontSize:13}} onClick={confirmBreakdown}>הוסף הכל</button>
              <button onClick={()=>setPendingBreakdown(null)} style={{background:"none",border:"1px solid #e5e5e3",borderRadius:10,padding:"7px 14px",cursor:"pointer",fontFamily:"'Heebo',sans-serif",fontSize:13,color:"#888"}}>ביטול</button>
            </div>
          </div>
        )}

        {/* Manual add subtask + AI suggest button */}
        {expandedTaskId===item.id&&!hasPending&&(
          <div style={{marginTop:8,paddingRight:28,display:"flex",gap:6,alignItems:"center"}}>
            <input autoFocus className="edit-inline" style={{fontSize:13}} placeholder="הוסיפי צעד קטן..." value={subtaskInput} onChange={e=>setSubtaskInput(e.target.value)}
              onKeyDown={e=>{if(e.key==="Enter"){addSubtask(item.id,subtaskInput);setSubtaskInput("");}if(e.key==="Escape"){setExpandedTaskId(null);setSubtaskInput("");}}}/>
            <button className="add-btn" style={{padding:"4px 10px",fontSize:13}} aria-label="הוסף תת-משימה" onClick={()=>{addSubtask(item.id,subtaskInput);setSubtaskInput("");}}>+</button>
          </div>
        )}

        {/* Complete animation */}
        {completingId===item.id&&(
          <>
            <div className="ring" style={{"--accent":accent}}/>
            <div className="ring-outer" style={{"--accent":accent}}/>
          </>
        )}
      </div>
    );
  };

  // ── Splash ─────────────────────────────────────────────────────────────────
  if (showSplash) {
    return <SplashScreen onComplete={()=>{sessionStorage.setItem("splashDone","1");setShowSplash(false);}}/>;
  }

  // ── Profile modal ──────────────────────────────────────────────────────────
  if (showProfileModal) {
    return (
      <ProfileModal
        allProfiles={allProfiles} newProfileName={newProfileName} setNewProfileName={setNewProfileName} createProfile={createProfile}
        setActiveProfileId={setActiveProfileId} setActiveTab={setActiveTab} setActiveSubtab={setActiveSubtab} setShowProfileModal={setShowProfileModal}
      />
    );
  }

  return (
    <div dir="rtl" style={{minHeight:"100vh",fontFamily:"'Heebo',sans-serif",color:"#1a1a1a",animation:"appFadeIn 0.5s ease-out both"}}>
      <style>{APP_CSS}</style>
      <div style={{"--accent":accent}}>

        {/* ── Reminder alert modal ── */}
        {showAlertModal&&alertReminders.length>0&&(
          <ReminderAlertModal alertReminders={alertReminders} setShowAlertModal={setShowAlertModal}/>
        )}

        {/* Big celebrate */}
        {bigCelebrateId&&<BigCelebrate/>}

        {/* Quick capture */}
        {showQuickCapture&&(
          <QuickCapture setShowQuickCapture={setShowQuickCapture} currentTab={currentTab} quickText={quickText} setQuickText={setQuickText} quickCapture={quickCapture} ctx={ctx}/>
        )}

        {/* Lists menu */}
        {showListsMenu&&(
          <ListsMenu
            showListsMenu={showListsMenu} setShowListsMenu={setShowListsMenu}
            shoppingLists={shoppingLists} notesList={notesList}
            setOpenListId={setOpenListId} setOpenListType={setOpenListType}
            showNewListInput={showNewListInput} setShowNewListInput={setShowNewListInput}
            newListName={newListName} setNewListName={setNewListName}
            addShoppingList={addShoppingList} addNote={addNote}
          />
        )}

        {/* List detail overlay */}
        {openListId&&openList&&(
          <ListDetailOverlay
            openListId={openListId} openList={openList} openListType={openListType} accent={accent}
            setOpenListId={setOpenListId} setOpenListType={setOpenListType} setListItemInput={setListItemInput} listItemInput={listItemInput}
            shareShoppingList={shareShoppingList} deleteShoppingList={deleteShoppingList} deleteNote={deleteNote} updateProfile={updateProfile}
            toggleShoppingItem={toggleShoppingItem} editingShoppingItem={editingShoppingItem} setEditingShoppingItem={setEditingShoppingItem} editShoppingItem={editShoppingItem} deleteShoppingItem={deleteShoppingItem}
            showBoughtItems={showBoughtItems} setShowBoughtItems={setShowBoughtItems} parseAndAddItems={parseAndAddItems} parsingList={parsingList}
          />
        )}

        {/* Email overlay */}
        {showEmail&&(
          <EmailOverlay
            accent={accent}
            setShowEmail={setShowEmail}
            gmailClientId={gmailClientId} setGmailClientId={setGmailClientId} showClientIdInput={showClientIdInput} setShowClientIdInput={setShowClientIdInput} editGmailClientId={editGmailClientId}
            gmailToken={gmailToken} connectGmail={connectGmail} disconnectGmail={disconnectGmail} gmailAuthError={gmailAuthError} setGmailAuthError={setGmailAuthError}
            emailRules={emailRules} saveEmailRules={saveEmailRules} newRule={newRule} setNewRule={setNewRule} showNewRule={showNewRule} setShowNewRule={setShowNewRule}
            emailLoading={emailLoading} fetchAndSummarize={fetchAndSummarize} emailStatusMsg={emailStatusMsg} emailSummaries={emailSummaries}
          />
        )}

        {/* Projects overlay */}
        {(showProjects||openProjectId)&&(
          <ProjectsOverlay
            accent={accent}
            openProjectId={openProjectId} setOpenProjectId={setOpenProjectId} setShowProjects={setShowProjects}
            openProject={openProject} getProjectProgress={getProjectProgress}
            projects={projects} deleteProject={deleteProject}
            showNewProject={showNewProject} setShowNewProject={setShowNewProject} newProjectName={newProjectName} setNewProjectName={setNewProjectName} addProject={addProject}
            projectView={projectView} setProjectView={setProjectView}
            toggleProjectTask={toggleProjectTask} aiBreakProjectTask={aiBreakProjectTask} aiBreakingProj={aiBreakingProj} expandedProjTask={expandedProjTask} setExpandedProjTask={setExpandedProjTask} deleteProjectTask={deleteProjectTask}
            newProjTaskInput={newProjTaskInput} setNewProjTaskInput={setNewProjTaskInput} addProjectTask={addProjectTask}
            newProjSubtaskInput={newProjSubtaskInput} setNewProjSubtaskInput={setNewProjSubtaskInput} addProjectSubtask={addProjectSubtask} toggleProjectSubtask={toggleProjectSubtask} deleteProjectSubtask={deleteProjectSubtask}
            showNewTimeline={showNewTimeline} setShowNewTimeline={setShowNewTimeline} newTimelineItem={newTimelineItem} setNewTimelineItem={setNewTimelineItem} addTimelineItem={addTimelineItem} deleteTimelineItem={deleteTimelineItem}
            newBubbleText={newBubbleText} setNewBubbleText={setNewBubbleText} addBubble={addBubble} deleteBubble={deleteBubble} aiThinkBubbles={aiThinkBubbles} aiThinkingProj={aiThinkingProj}
            newBoardText={newBoardText} setNewBoardText={setNewBoardText} addBoardItem={addBoardItem} deleteBoardItem={deleteBoardItem}
          />
        )}


        {/* Side pills — icon-only circle when closed, full pill when open */}
        {[
          {key:"shopping", icon:"🛒", label:"קניות",     bottom:216, active:showListsMenu==="shopping",        fn:()=>setShowListsMenu(showListsMenu==="shopping"?null:"shopping")},
          {key:"notes",    icon:"📝", label:"פתקים",     bottom:172, active:showListsMenu==="notes",           fn:()=>setShowListsMenu(showListsMenu==="notes"?null:"notes")},
          {key:"projects", icon:"🗂", label:"פרויקטים", bottom:128, active:!!(showProjects||openProjectId),   fn:()=>{setShowProjects(true);setOpenProjectId(null);}},
          {key:"email",    icon:"📧", label:"מייל",      bottom:84,  active:showEmail,                         fn:()=>setShowEmail(true)},
        ].map(({key,icon,label,bottom,active,fn})=>(
          <button key={key}
            className={`side-pill${active?" active-pill":""}`}
            style={{bottom, ...(active?{}:{padding:"0",width:38,height:38,minWidth:38,justifyContent:"center",gap:0})}}
            aria-label={label}
            onClick={fn}
          >
            <span style={{fontSize:active?14:18}}>{icon}</span>
            {active&&<span>{label}</span>}
          </button>
        ))}
        <button className="fab" style={{background:accent}} aria-label="לכידה מהירה — הוסיפי משימה" onClick={()=>setShowQuickCapture(true)}>+</button>

        {/* Voice indicator — always shown when SR available; tap to activate on first use */}
        {voiceAvail&&(
          <div
            role="button"
            tabIndex={0}
            aria-label={voiceState==="off"?"הפעל שליטה קולית":voiceState==="listening"?"מאזין — הקש כדי להשהות":"הקש כדי לדבר"}
            style={{position:"fixed",bottom:90,right:20,zIndex:250,display:"flex",flexDirection:"column",alignItems:"center",gap:4,cursor:"pointer"}}
            onKeyDown={e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();e.currentTarget.click();}}}
            onClick={()=>{
              const r=recognitionRef.current;
              if(!r) return;
              if(voiceState==="off"){
                // First use — start recognition + enter listening immediately
                voiceActiveRef.current=true;
                sessionStorage.setItem("voice_on","1");
                voiceModeRef.current="listening";
                const sayHi=()=>{ speechSynthesis.cancel(); const u=new SpeechSynthesisUtterance("כן?"); u.lang="he-IL"; speechSynthesis.speak(u); };
                try{ r.start(); setVoiceState("listening"); sayHi(); }catch(err){ console.error("voice: failed to start recognition",err); }
              } else if(voiceModeRef.current==="listening"){
                // Already listening — pause
                voiceModeRef.current="idle"; setVoiceState("idle");
              } else {
                // Idle — enter listening
                const sayHi2=()=>{ speechSynthesis.cancel(); const u=new SpeechSynthesisUtterance("כן?"); u.lang="he-IL"; speechSynthesis.speak(u); };
                voiceModeRef.current="listening"; setVoiceState("listening"); sayHi2();
              }
            }}
          >
            {voiceLabel&&<div style={{background:"rgba(0,0,0,0.75)",color:"white",fontSize:12,padding:"5px 12px",borderRadius:20,fontFamily:"'Heebo',sans-serif",direction:"rtl",whiteSpace:"nowrap",maxWidth:220,textAlign:"center"}}>{voiceLabel}</div>}
            {voiceDebug&&!voiceLabel&&<div style={{background:"rgba(80,80,200,0.85)",color:"white",fontSize:11,padding:"4px 10px",borderRadius:20,fontFamily:"'Heebo',sans-serif",direction:"rtl",maxWidth:220,textAlign:"center",fontStyle:"italic"}}>{voiceDebug}</div>}
            <div style={{width:42,height:42,borderRadius:"50%",background:voiceState==="listening"?"#ef5350":voiceState==="processing"?"#ffa726":"white",border:"2px solid "+(voiceState==="listening"?"#ef5350":voiceState==="processing"?"#ffa726":voiceState==="off"?"#dde":"#dde"),display:"flex",alignItems:"center",justifyContent:"center",boxShadow:voiceState==="listening"?"0 0 0 6px rgba(239,83,80,0.2)":"0 2px 8px rgba(0,0,0,0.1)",transition:"all 0.3s",animation:voiceState==="listening"?"voicePulse 1s ease-in-out infinite":"none",opacity:voiceState==="off"?0.45:1}}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <rect x="6" y="1" width="6" height="10" rx="3" fill={voiceState==="listening"?"white":"#aab"}/>
                <path d="M3 9a6 6 0 0012 0" stroke={voiceState==="listening"?"white":"#aab"} strokeWidth="1.5" strokeLinecap="round"/>
                <line x1="9" y1="15" x2="9" y2="17" stroke={voiceState==="listening"?"white":"#aab"} strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <div style={{fontSize:9,color:voiceState==="listening"?"#ef5350":"#bbb",fontFamily:"'Heebo',sans-serif",whiteSpace:"nowrap"}}>
              {voiceState==="off"?"הפעל קול":voiceState==="listening"?"מאזין...":"הקש לדבר"}
            </div>
          </div>
        )}

        {/* Voice commands help */}
        {showVoiceHelp&&(
          <div className="alert-modal" onClick={()=>setShowVoiceHelp(false)}>
            <div className="alert-card" onClick={e=>e.stopPropagation()}>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <span style={{fontSize:20}}>🎙️</span>
                <span style={{fontWeight:700,fontSize:16,flex:1}}>פקודות קוליות</span>
                <button onClick={()=>setShowVoiceHelp(false)} aria-label="סגור" style={{background:"none",border:"none",cursor:"pointer",color:"#aaa",fontSize:18,lineHeight:1}}>✕</button>
              </div>
              <div style={{overflowY:"auto",flex:1,display:"flex",flexDirection:"column",gap:14,fontSize:13,lineHeight:1.6}}>
                {[
                  {title:"מעבר בין כרטיסיות", examples:['"לשונית ילדים"', '"עברי לעבודה"']},
                  {title:"רשימות קניות", examples:['"קניות" — פותח את תפריט הרשימות', '"רשימת סופר" — פותח או יוצר רשימה בשם הזה', '"אילו רשימות" / "הצג רשימות" — מקריא את שמות הרשימות']},
                  {title:"הוספה/הסרה מרשימה פתוחה", examples:['"תוסיפי חלב" — כל טקסט חופשי נחשב תוספת כשרשימה פתוחה', '"מחקי חלב" / "תורידי חלב" / "למחוק חלב"']},
                  {title:"פתקים", examples:['"פתקים" — פותח את תפריט הפתקים', '"פתק קניות לחג" — פותח או יוצר פתק', '"תכתבי X" — מוסיף שורה לפתק הפתוח']},
                  {title:"משימות ותזכורות", examples:['"משימה לקנות מתנה"', '"תזכורת להתקשר לרופא"']},
                  {title:"סימון כבוצע", examples:['"סמני לקנות מתנה"', '"סיימתי להתקשר לרופא"']},
                  {title:"הקראה", examples:['"תקריאי" / "הקרא" — מקריא את כל המשימות והתזכורות הפתוחות בכרטיסייה', '"תקריאי X" — מקריא פריט ספציפי', '"מה יש" — ברשימת קניות פתוחה, מקריא את הפריטים']},
                  {title:"ניווט כללי", examples:['"סגור" / "חזרה" / "אחורה" — סוגר רשימה/פתק פתוח']},
                ].map((g,i)=>(
                  <div key={i}>
                    <div style={{fontWeight:700,fontSize:13,marginBottom:4,color:"#1a1a2e"}}>{g.title}</div>
                    {g.examples.map((ex,j)=>(
                      <div key={j} style={{color:"#666",marginBottom:2}}>{ex}</div>
                    ))}
                  </div>
                ))}
                <div style={{fontSize:12,color:"#aaa",borderTop:"1px solid #f0f0f8",paddingTop:10}}>
                  לוחצים על סמל המיקרופון כדי להתחיל להאזין, ואז אומרים אחת מהפקודות למעלה.
                </div>

                {/* Custom voice commands — aliases for existing actions + fixed shortcuts */}
                <div style={{borderTop:"1px solid #f0f0f8",paddingTop:12,display:"flex",flexDirection:"column",gap:10}}>
                  <div style={{fontWeight:700,fontSize:13,color:"#1a1a2e"}}>פקודות מותאמות אישית</div>
                  {customVoiceCommands.length===0&&!showAddVoiceCmd&&(
                    <div style={{fontSize:12,color:"#aaa"}}>עוד לא הוספת פקודות משלך — אפשר להוסיף כינוי לפעולה קיימת (למשל "תרשמי לי" במקום "משימה") או קיצור דרך קבוע (למשל "לעבודה" שפותח ישר כרטיסייה מסוימת).</div>
                  )}
                  {customVoiceCommands.map(c=>(
                    <div key={c.id} style={{display:"flex",alignItems:"center",gap:8,background:"#f7f7fb",borderRadius:10,padding:"8px 10px"}}>
                      <div style={{flex:1,fontSize:12}}>
                        <div style={{fontWeight:600}}>"{c.phrase}"</div>
                        <div style={{color:"#888"}}>
                          {c.kind==="alias"
                            ?`כינוי ל${({task:"הוספת משימה",reminder:"הוספת תזכורת",done:"סימון כבוצע",read:"הקראה",close:"סגירה"})[c.action]||c.action}`
                            :`קיצור ל${({tab:"כרטיסייה",shopping:"רשימת קניות",notes:"פתק"})[c.targetType]||c.targetType}: ${c.targetName}`}
                        </div>
                      </div>
                      <button className="icon-btn del" aria-label={`מחק פקודה ${c.phrase}`} onClick={()=>deleteVoiceCommand(c.id)}>✕</button>
                    </div>
                  ))}
                  {showAddVoiceCmd?(
                    <div style={{display:"flex",flexDirection:"column",gap:8,background:"#f7f7fb",borderRadius:10,padding:10}}>
                      <input className="plain-input" placeholder='הביטוי שתגידי (למשל "תרשמי לי")' value={newVoiceCmd.phrase} onChange={e=>setNewVoiceCmd(v=>({...v,phrase:e.target.value}))}/>
                      <div style={{display:"flex",gap:12,fontSize:12}}>
                        <label style={{display:"flex",alignItems:"center",gap:4,cursor:"pointer"}}>
                          <input type="radio" checked={newVoiceCmd.kind==="alias"} onChange={()=>setNewVoiceCmd(v=>({...v,kind:"alias"}))}/> כינוי לפעולה קיימת
                        </label>
                        <label style={{display:"flex",alignItems:"center",gap:4,cursor:"pointer"}}>
                          <input type="radio" checked={newVoiceCmd.kind==="shortcut"} onChange={()=>setNewVoiceCmd(v=>({...v,kind:"shortcut"}))}/> קיצור דרך קבוע
                        </label>
                      </div>
                      {newVoiceCmd.kind==="alias"?(
                        <select className="plain-input" value={newVoiceCmd.action} onChange={e=>setNewVoiceCmd(v=>({...v,action:e.target.value}))}>
                          <option value="task">הוספת משימה</option>
                          <option value="reminder">הוספת תזכורת</option>
                          <option value="done">סימון כבוצע</option>
                          <option value="read">הקראה</option>
                          <option value="close">סגירה</option>
                        </select>
                      ):(
                        <>
                          <select className="plain-input" value={newVoiceCmd.targetType} onChange={e=>setNewVoiceCmd(v=>({...v,targetType:e.target.value,targetName:""}))}>
                            <option value="tab">כרטיסייה</option>
                            <option value="shopping">רשימת קניות</option>
                            <option value="notes">פתק</option>
                          </select>
                          <input className="plain-input" placeholder="שם היעד (למשל: עבודה)" value={newVoiceCmd.targetName} onChange={e=>setNewVoiceCmd(v=>({...v,targetName:e.target.value}))}/>
                        </>
                      )}
                      <div style={{display:"flex",gap:8}}>
                        <button className="add-btn" style={{"--accent":"#2d6a4f"}} onClick={addVoiceCommand}>שמור</button>
                        <button className="icon-btn" onClick={()=>setShowAddVoiceCmd(false)}>ביטול</button>
                      </div>
                    </div>
                  ):(
                    <button className="ghost-btn" style={{"--accent":"#2d6a4f",alignSelf:"flex-start"}} onClick={()=>setShowAddVoiceCmd(true)}>+ הוסף פקודה</button>
                  )}
                </div>
              </div>
              <button onClick={()=>setShowVoiceHelp(false)}
                style={{background:"#1a1a1a",color:"white",border:"none",borderRadius:10,padding:"11px 0",fontSize:15,fontWeight:600,cursor:"pointer",fontFamily:"'Heebo',sans-serif"}}>
                סגור
              </button>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="app-header">
          <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",paddingBottom:10}}>
            <div>
              <div className="greeting">שלום, {profiles[activeProfileId]?.name||"👋"}</div>
              <div className="greeting-date">{new Date().toLocaleDateString("he-IL",{weekday:"long",day:"numeric",month:"long"})}</div>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:6,marginTop:4}}>
              <div ref={profileMenuRef} style={{position:"relative"}}>
                <button onClick={()=>setShowProfileMenu(p=>!p)} aria-label="תפריט פרופיל" style={{display:"flex",alignItems:"center",justifyContent:"center",width:36,height:36,borderRadius:"50%",border:"none",background:accent,cursor:"pointer",color:"white",fontFamily:"'Heebo',sans-serif",fontSize:15,fontWeight:700}}>
                  {profiles[activeProfileId]?.name?.charAt(0)||"?"}
                </button>
                {showProfileMenu&&(
                  <div className="dropdown-menu">
                    {allProfiles.map(p=>(<button key={p.id} className="dropdown-item" style={{fontWeight:p.id===activeProfileId?600:400}} onClick={()=>switchProfile(p.id)}><span className="profile-avatar">{p.name.charAt(0)}</span>{p.name}{p.id===activeProfileId&&<span style={{marginRight:"auto",fontSize:12}}>✓</span>}</button>))}
                    <div className="dropdown-divider"/>
                    <button className="dropdown-item" onClick={()=>{setShowProfileMenu(false);setNewProfileName("");setShowProfileModal(true);}}>+ פרופיל חדש</button>
                    <button className="dropdown-item danger" onClick={deleteCurrentProfile}>מחק פרופיל נוכחי</button>
                  </div>
                )}
              </div>
            <div ref={settingsMenuRef} style={{position:"relative"}}>
              <button onClick={()=>setShowSettingsMenu(p=>!p)} style={{background:"none",border:"none",cursor:"pointer",fontSize:18,color:"#aaa",padding:"4px 6px",borderRadius:6,lineHeight:1}} aria-label="הגדרות">⚙</button>
              {showSettingsMenu&&(
                <div className="dropdown-menu settings-dropdown">
                  <button className="dropdown-item" onClick={exportBackup}>📤 גיבוי</button>
                  <button className="dropdown-item" onClick={importBackup}>📥 ייבוא גיבוי</button>
                  <div className="dropdown-divider"/>
                  <button className="dropdown-item" onClick={shareWhatsApp}>💬 שתף ב-WhatsApp</button>
                  {voiceAvail&&<>
                    <div className="dropdown-divider"/>
                    <button className="dropdown-item" onClick={()=>{setShowSettingsMenu(false);setShowVoiceHelp(true);}}>🎙️ פקודות קוליות</button>
                  </>}
                </div>
              )}
            </div>
            </div>
          </div>
          <div style={{position:"relative"}}>
            <input
              className="search-bar"
              placeholder="חיפוש משימות ותזכורות..."
              value={searchQuery}
              onChange={e=>setSearchQuery(e.target.value)}
              onKeyDown={e=>{if(e.key==="Escape")setSearchQuery("");}}
              style={searchQuery?{paddingLeft:36}:undefined}
            />
            {searchQuery&&(
              <button onClick={()=>setSearchQuery("")} aria-label="נקה חיפוש" style={{position:"absolute",left:14,top:9,background:"none",border:"none",color:"#bbb",fontSize:15,cursor:"pointer",lineHeight:1,padding:2}}>✕</button>
            )}
            {searchQuery.trim().length>=2&&(
              <div style={{position:"absolute",top:"calc(100% - 8px)",right:0,left:0,background:"white",borderRadius:14,boxShadow:"0 6px 24px rgba(0,0,0,0.12)",zIndex:50,maxHeight:320,overflowY:"auto",padding:searchResults.length?"6px 0":"14px"}}>
                {searchResults.length===0&&<div style={{color:"#bbb",fontSize:13,textAlign:"center"}}>אין תוצאות ל"{searchQuery}"</div>}
                {searchResults.map((r,i)=>(
                  <button key={r.itype+r.item.id+i} onClick={()=>goToSearchResult(r)} style={{display:"flex",alignItems:"center",gap:8,width:"100%",textAlign:"right",background:"none",border:"none",padding:"9px 16px",cursor:"pointer",fontFamily:"'Heebo',sans-serif"}}>
                    <span style={{fontSize:14}}>{r.itype==="task"?"✓":"🔔"}</span>
                    <span style={{flex:1,fontSize:14,color:"#1a1a2e",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.item.text}</span>
                    <span style={{fontSize:11,color:"#bbb",flexShrink:0}}>{r.tab.label}{r.subtab?` / ${r.subtab.label}`:""}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="tab-bar">
            {tabs.map(t=>(
              <div key={t.id} className={`tab-pill${activeTab===t.id?" active":""}`} style={{"--accent":t.color}}>
                <button onClick={()=>{setActiveTab(t.id);setActiveSubtab(null);}} style={{display:"flex",alignItems:"center",gap:5,background:"none",border:"none",padding:0,margin:0,font:"inherit",color:"inherit",cursor:"pointer"}}>
                  <span className="tab-dot" style={{background:t.color}}/>{t.label}
                </button>
                {activeTab===t.id&&(<>
                  <button aria-label="קבע ככרטיסייה ברירת מחדל" onClick={()=>setDefaultTab(t.id)} style={{fontSize:12,cursor:"pointer",color:profiles[activeProfileId]?.defaultTab===t.id?"#f4a261":"#ddd",marginRight:-2,lineHeight:1,background:"none",border:"none",padding:0}}>★</button>
                  <button className="icon-btn del" aria-label="מחק כרטיסייה" style={{fontSize:11,marginRight:-2,padding:0,minWidth:"unset",minHeight:"unset",background:"none",border:"none",cursor:"pointer"}} onClick={()=>deleteTab(t.id)}>✕</button>
                </>)}
              </div>
            ))}
            {showNewTab?(
              <div style={{display:"flex",gap:6,alignItems:"center"}}>
                <input autoFocus className="plain-input" style={{width:150,fontSize:13,padding:"6px 10px","--accent":"#2d6a4f"}} placeholder="שם הכרטיסייה" value={newTabInput} onChange={e=>setNewTabInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")addTab();if(e.key==="Escape")setShowNewTab(false);}}/>
                <button className="add-btn" style={{padding:"6px 12px",fontSize:13,"--accent":"#2d6a4f"}} onClick={addTab}>הוסף</button>
                <button className="icon-btn" aria-label="בטל כרטיסייה חדשה" onClick={()=>setShowNewTab(false)}>✕</button>
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

        {/* Category summary cards */}
        {currentTab&&(
          <div className="cat-grid">
            <div className="cat-card" style={{background:"#eaf5f0"}} onClick={()=>setActiveSubtab(null)}>
              <div className="cat-card-title" style={{color:"#2d7a5a"}}>משימות</div>
              <div className="cat-card-sub">{allPendingTasks.length} פתוחות</div>
            </div>
            <div className="cat-card" style={{background:"#ede8f8"}} onClick={()=>setActiveSubtab(null)}>
              <div className="cat-card-title" style={{color:"#6b5ca8"}}>תזכורות</div>
              <div className="cat-card-sub">{sortedReminderGroups.flatMap(g=>g.reminders).length} פעילות</div>
            </div>
          </div>
        )}

        {currentTab&&(
          <div style={{padding:"0 20px 100px"}}>
            {/* Subtabs */}
            <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:20}}>
              <button className={`sub-chip${!activeSubtab?" active":""}`} style={{"--accent":accent}} onClick={()=>setActiveSubtab(null)}>כללי</button>
              {currentTab.subtabs.map(s=>(
                <div key={s.id} style={{position:"relative"}}>
                  <button className={`sub-chip${activeSubtab===s.id?" active":""}`} style={{"--accent":accent}} onClick={()=>setActiveSubtab(s.id)}>{s.label}</button>
                  {activeSubtab===s.id&&<button className="icon-btn del" aria-label="מחק תת-כרטיסייה" style={{position:"absolute",top:-5,left:-5,fontSize:10,background:"#f5f5f4",borderRadius:"50%",width:15,height:15,display:"flex",alignItems:"center",justifyContent:"center",padding:0,minWidth:"unset",minHeight:"unset"}} onClick={()=>deleteSubtab(s.id)}>✕</button>}
                </div>
              ))}
              {showNewSub?(
                <div style={{display:"flex",gap:6,alignItems:"center"}}>
                  <input autoFocus className="plain-input" style={{width:140,fontSize:13,padding:"5px 10px"}} placeholder="שם תת-כרטיסייה" value={newSubInput} onChange={e=>setNewSubInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")addSubtab();if(e.key==="Escape")setShowNewSub(false);}}/>
                  <button className="add-btn" style={{padding:"5px 10px",fontSize:13}} onClick={addSubtab}>הוסף</button>
                  <button className="icon-btn" aria-label="בטל תת-כרטיסייה חדשה" onClick={()=>setShowNewSub(false)}>✕</button>
                </div>
              ):(
                <button className="ghost-btn" style={{padding:"4px 12px",fontSize:12}} onClick={()=>setShowNewSub(true)}>+ תת-כרטיסייה</button>
              )}
            </div>

            <div className="main-grid">
              {/* TASKS */}
              <div>
                <div className="section-header">
                  <span className="col-header">משימות</span>
                  {allPendingTasks.length>0&&<span className="section-count">{allPendingTasks.length}</span>}
                </div>
                <div style={{display:"flex",gap:8,marginBottom:14}}>
                  <input className="plain-input" style={{flex:1}} placeholder="משימה חדשה..." value={taskInput} onChange={e=>setTaskInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addTask()}/>
                  <button className="add-btn" aria-label="הוסף משימה" onClick={addTask}>+</button>
                </div>

                {allPendingTasks.length===0&&<div className="empty-state">אין משימות פתוחות</div>}

                {/* Aggregate: group by source */}
                {isAggregate ? (
                  taskGroups.map((group,gi)=>{
                    const pending=group.tasks.filter(t=>!t.done);
                    if(!pending.length&&group.label) return null;
                    return (
                      <div key={gi}>
                        {group.label&&<div className="group-label">{group.label}</div>}
                        {pending.length>0&&<div className="task-group-wrap">{pending.map(item=>renderTaskRow(item))}</div>}
                      </div>
                    );
                  })
                ) : (
                  taskGroups[0].tasks.filter(t=>!t.done).length>0
                    ? <div className="task-group-wrap">{taskGroups[0].tasks.filter(t=>!t.done).map(item=>renderTaskRow(item))}</div>
                    : null
                )}

                {allDoneTasks.length>0&&<>
                  <button className="section-label" onClick={()=>setShowDoneTasks(p=>!p)} style={{background:"none",border:"none",padding:0,width:"100%",display:"flex",alignItems:"center",gap:6,cursor:"pointer",fontFamily:"'Heebo',sans-serif"}}>
                    הושלמו ({allDoneTasks.length}) <span style={{fontSize:9}}>{showDoneTasks?"▲":"▼"}</span>
                  </button>
                  {showDoneTasks&&allDoneTasks.map(item=>(
                    <div key={item.id} className="task-row" style={{opacity:0.45}}>
                      <div style={{width:20,height:20,borderRadius:"50%",border:"2px solid #ddd",background:"white",flexShrink:0,marginTop:1}}/>
                      <div style={{flex:1}}><span style={{fontSize:14,textDecoration:"line-through",color:"#888"}}>{item.text}</span></div>
                      <button className="icon-btn" style={{color:"#bbb",fontSize:13,fontWeight:700}} aria-label="שחזר משימה" onClick={()=>toggleDone("task",item.id)}>↩</button>
                      <button className="icon-btn del" aria-label="מחק משימה" onClick={()=>deleteItem("task",item.id)}>✕</button>
                    </div>
                  ))}
                </>}
              </div>

              {/* REMINDERS */}
              <div style={{paddingLeft:52}}>
                <div className="section-header">
                  <span className="col-header">תזכורות</span>
                  {sortedReminderGroups.flatMap(g=>g.reminders).filter(r=>getReminderStatus(r.startDate,r.endDate)==="active").length>0&&(
                    <span className="section-count">
                      {sortedReminderGroups.flatMap(g=>g.reminders).filter(r=>getReminderStatus(r.startDate,r.endDate)==="active").length} פעיל
                    </span>
                  )}
                </div>
                <div style={{marginBottom:14}}>
                  <div style={{display:"flex",gap:8,marginBottom:showReminderDates?8:0}}>
                    <input className="plain-input" style={{flex:1}} placeholder="תזכורת חדשה..." value={reminderInput} onChange={e=>setReminderInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addReminder()}/>
                    <button onClick={()=>setShowReminderDates(p=>!p)} aria-label="הצג תאריכי תזכורת" style={{border:`1.5px solid ${showReminderDates?accent:"#e5e5e3"}`,borderRadius:8,background:"white",padding:"0 10px",cursor:"pointer",fontSize:15,color:showReminderDates?accent:"#aaa",transition:"all 0.15s"}}>📅</button>
                    <button className="add-btn" aria-label="הוסף תזכורת" onClick={addReminder}>+</button>
                  </div>
                  {showReminderDates&&(
                    <>
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
                    <div style={{display:"flex",alignItems:"center",gap:8,marginTop:8,background:"#fffbeb",border:"1px solid #fcd34d",borderRadius:8,padding:"8px 12px"}}>
                      <span style={{fontSize:13,color:"#92400e",fontWeight:600,whiteSpace:"nowrap"}}>🔔 התרע מ-</span>
                      <input type="date" className="plain-input" style={{flex:1,fontSize:13,padding:"6px 10px",colorScheme:"light"}} value={reminderAlertDate} onChange={e=>setReminderAlertDate(e.target.value)}/>
                    </div>
                    </>
                  )}
                </div>

                {sortedReminderGroups.flatMap(g=>g.reminders).length===0&&<div className="empty-state">אין תזכורות פתוחות</div>}

                {sortedReminderGroups.map((group,gi)=>{
                  if(!group.reminders.length&&group.label) return null;
                  return (
                    <div key={gi}>
                      {group.label&&isAggregate&&<div className="group-label">{group.label}</div>}
                      {group.reminders.map(item=>{
                        const status=getReminderStatus(item.startDate,item.endDate);
                        const daysUntilStart=getDaysUntil(item.startDate);
                        const daysUntilEnd=getDaysUntil(item.endDate);
                        const statusColor=status==="active"?accent:status==="future"?"#5c6bc0":"#bbb";
                        const statusLabel=status==="active"?"פעיל עכשיו":status==="future"?"עתידי":status==="past"?"עבר":"";
                        const cardClass=`reminder-card${status==="active"?" active-r":status==="future"?" future-r":status==="past"?" past-r":""}`;
                        return (
                          <div key={item.id} className={cardClass} style={{"--accent":accent}}>
                            <div style={{display:"flex",alignItems:"flex-start",gap:10}}>
                              <div style={{position:"relative",flexShrink:0,paddingTop:1}}>
                                <button className={`check-circle${completingId===item.id?" popping":""}`} aria-label="סיימתי!" style={{width:20,height:20,borderRadius:"50%",border:"2px solid #ddd",background:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,transition:"all 0.15s","--accent":accent}} onClick={()=>handleComplete("reminder",item.id)}/>
                                {completingId===item.id&&<div className="ring" style={{"--accent":accent}}/>}
                              </div>
                              <div style={{flex:1,minWidth:0}}>
                                {editId===item.id
                                  ?<div style={{display:"flex",flexDirection:"column",gap:6}}>
                                      <input autoFocus className="edit-inline" value={editText} onChange={e=>setEditText(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")saveEdit("reminder",item.id);if(e.key==="Escape"){setEditId(null);setEditAlertDate("");setEditStartDate("");setEditEndDate("");}}}/>
                                      <div style={{display:"flex",alignItems:"center",gap:6,background:"#f9f9f8",border:"1px solid #ebebea",borderRadius:8,padding:"6px 10px"}}>
                                        <span style={{fontSize:11,color:"#888",fontWeight:600,whiteSpace:"nowrap"}}>מ-</span>
                                        <input type="date" className="edit-inline" style={{fontSize:12,padding:"3px 8px",flex:1,colorScheme:"light"}} value={editStartDate} onChange={e=>setEditStartDate(e.target.value)}/>
                                        <span style={{fontSize:11,color:"#888",fontWeight:600,whiteSpace:"nowrap"}}>עד-</span>
                                        <input type="date" className="edit-inline" style={{fontSize:12,padding:"3px 8px",flex:1,colorScheme:"light"}} value={editEndDate} min={editStartDate} onChange={e=>setEditEndDate(e.target.value)}/>
                                      </div>
                                      <div style={{display:"flex",alignItems:"center",gap:6,background:"#fffbeb",border:"1px solid #fcd34d",borderRadius:8,padding:"6px 10px"}}>
                                        <span style={{fontSize:12,color:"#92400e",fontWeight:600,whiteSpace:"nowrap"}}>🔔 התרע מ-</span>
                                        <input type="date" className="edit-inline" style={{fontSize:12,padding:"3px 8px",flex:1,colorScheme:"light"}} value={editAlertDate} onChange={e=>setEditAlertDate(e.target.value)}/>
                                        <button onClick={()=>saveEdit("reminder",item.id)} style={{background:accent,color:"white",border:"none",borderRadius:6,padding:"4px 10px",fontSize:12,cursor:"pointer",fontFamily:"'Heebo',sans-serif",fontWeight:600,flexShrink:0}}>שמור</button>
                                      </div>
                                    </div>
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
                              <button className="icon-btn" style={{fontSize:18}} aria-label="ערוך תזכורת" onClick={()=>{setEditId(item.id);setEditText(item.text);setEditAlertDate(item.alertDate||"");setEditStartDate(item.startDate||"");setEditEndDate(item.endDate||"");}}>✎</button>
                              <button className="icon-btn del" aria-label="מחק תזכורת" onClick={()=>deleteItem("reminder",item.id)}>✕</button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}

                {allDoneReminders.length>0&&<>
                  <button className="section-label" onClick={()=>setShowDoneReminders(p=>!p)} style={{background:"none",border:"none",padding:0,width:"100%",display:"flex",alignItems:"center",gap:6,cursor:"pointer",fontFamily:"'Heebo',sans-serif"}}>
                    הושלמו ({allDoneReminders.length}) <span style={{fontSize:9}}>{showDoneReminders?"▲":"▼"}</span>
                  </button>
                  {showDoneReminders&&allDoneReminders.map(item=>(
                    <div key={item.id} className="reminder-card" style={{opacity:0.4}}>
                      <div style={{display:"flex",alignItems:"center",gap:10}}>
                        <button style={{width:20,height:20,borderRadius:"50%",border:"2px solid #aaa",background:"#aaa",color:"white",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,flexShrink:0}} aria-label="בטל סימון תזכורת" onClick={()=>toggleDone("reminder",item.id)}>✓</button>
                        <span style={{flex:1,fontSize:14,textDecoration:"line-through",color:"#888"}}>{item.text}</span>
                        <button className="icon-btn del" aria-label="מחק תזכורת" onClick={()=>deleteItem("reminder",item.id)}>✕</button>
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
