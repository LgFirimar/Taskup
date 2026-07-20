import { useState, useEffect, useMemo, useRef } from "react";
import SplashScreen from "./SplashScreen";
import { useVoiceCommands } from "./hooks/useVoiceCommands";
import {
  uid, STORAGE_KEY, WORKER_URL, PRIO_CYCLE, PRIO_COLOR, TAB_COLORS,
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
  const [gmailClientId,setGmailClientId] = useState(()=>localStorage.getItem("gmail_client_id")||"");
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
  const deleteShoppingList = (lid)=>{ updateProfile(p=>({...p,shopping:(p.shopping||[]).filter(l=>l.id!==lid)})); if(openListId===lid){setOpenListId(null);setOpenListType(null);} };
  const editShoppingItem = (lid,iid,text)=>{ updateProfile(p=>({...p,shopping:(p.shopping||[]).map(l=>l.id===lid?{...l,items:l.items.map(i=>i.id===iid?{...i,text}:i)}:l)})); setEditingShoppingItem(null); };
  const shareShoppingList = (list)=>{
    const text=`*רשימת קניות - ${list.name}* 🛒\n`+(list.items||[]).map(i=>`• ${i.text}`).join("\n");
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
  const deleteNote = (nid)=>{ updateProfile(p=>({...p,notes:(p.notes||[]).filter(n=>n.id!==nid)})); if(openListId===nid){setOpenListId(null);setOpenListType(null);} };

  // ── Projects ──────────────────────────────────────────────────────────────
  const projects = getProfile().projects||[];
  const openProject = projects.find(p=>p.id===openProjectId)||null;

  const addProject = (name)=>{ if(!name.trim())return; const id=uid(); updateProfile(p=>({...p,projects:[...(p.projects||[]),{id,name:name.trim(),tasks:[],timeline:[],bubbles:[],board:[]}]})); setOpenProjectId(id); setShowProjects(false); setProjectView("overview"); };
  const deleteProject = (pid)=>{ updateProfile(p=>({...p,projects:(p.projects||[]).filter(pj=>pj.id!==pid)})); if(openProjectId===pid){setOpenProjectId(null);} };

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
  const deleteSubtab = (id)=>{ setTabs(prev=>prev.map(t=>t.id===activeTab?{...t,subtabs:t.subtabs.filter(s=>s.id!==id)}:t)); if(activeSubtab===id)setActiveSubtab(null); };

  // ── Tasks & reminders ─────────────────────────────────────────────────────
  const addTask = ()=>{ const text=taskInput.trim(); if(!text)return; updateCtx(c=>({...c,tasks:[...c.tasks,{id:uid(),text,done:false,createdAt:today(),subtasks:[],priority:null}]})); setTaskInput(""); };
  const addReminder = ()=>{
    const text=reminderInput.trim(); if(!text)return;
    updateCtx(c=>({...c,reminders:[...c.reminders,{id:uid(),text,done:false,createdAt:today(),startDate:reminderStart||null,endDate:reminderEnd||null,alertDate:reminderAlertDate||null}]}));
    setReminderInput(""); setReminderStart(""); setReminderEnd(""); setReminderAlertDate(""); setShowReminderDates(false);
  };

  const toggleDone = (type,id)=>smartUpdateItem(type,id,i=>({...i,done:!i.done}));
  const deleteItem = (type,id)=>smartDeleteItem(type,id);
  const saveEdit = (type,id)=>{ smartUpdateItem(type,id,i=>({...i,text:editText,...(type==="reminder"?{alertDate:editAlertDate||null}:{})})); setEditId(null); setEditText(""); setEditAlertDate(""); };
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

  const CSS = `
    @import url('https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;500;600;700;800&display=swap');
    *{box-sizing:border-box;}
    body{background:#f5f6fa;min-height:100vh;}
    ::-webkit-scrollbar{width:3px;height:3px;}
    ::-webkit-scrollbar-thumb{background:#dde;border-radius:4px;}

    /* ── Header ── */
    .app-header{background:white;border-bottom:1px solid #eeeef5;padding:16px 20px 0;}
    .greeting{font-size:22px;font-weight:800;color:#1a1a2e;letter-spacing:-0.02em;line-height:1.2;}
    .greeting-date{font-size:13px;color:#aaa;font-weight:400;margin-top:2px;margin-bottom:14px;}
    .search-bar{
      width:100%;padding:10px 16px;border-radius:100px;
      border:none;background:#f0f0f8;color:#555;
      font-family:'Heebo',sans-serif;font-size:14px;outline:none;direction:rtl;
      margin-bottom:14px;
    }
    .search-bar::placeholder{color:#bbb;}

    /* ── Tabs ── */
    .tab-bar{display:flex;align-items:center;gap:2px;overflow-x:auto;padding-bottom:14px;}
    .tab-pill{
      display:flex;align-items:center;gap:5px;
      padding:6px 14px;border-radius:100px;border:none;
      background:transparent;cursor:pointer;
      font-family:'Heebo',sans-serif;font-size:13px;font-weight:500;
      color:#aaa;white-space:nowrap;transition:all 0.18s;
    }
    .tab-pill:hover{background:#f4f4fb;color:#666;}
    .tab-pill.active{color:var(--accent);background:color-mix(in srgb,var(--accent) 10%,white);font-weight:700;}
    .tab-dot{width:6px;height:6px;border-radius:50%;flex-shrink:0;}

    /* ── Category summary cards ── */
    .cat-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:0 20px 20px;}
    .cat-card{border-radius:16px;padding:16px;cursor:pointer;transition:all 0.18s;}
    .cat-card:hover{transform:translateY(-1px);filter:brightness(0.97);}
    .cat-card-title{font-size:14px;font-weight:700;color:#1a1a2e;margin-bottom:3px;}
    .cat-card-sub{font-size:12px;font-weight:400;color:#666;}

    /* ── Sub-chips ── */
    .sub-chip{
      padding:5px 14px;border-radius:100px;
      border:1.5px solid #e8e8f2;background:white;
      cursor:pointer;font-family:'Heebo',sans-serif;font-size:12.5px;
      color:#aaa;transition:all 0.15s;
    }
    .sub-chip:hover{border-color:#c8c8e8;color:#666;}
    .sub-chip.active{border-color:var(--accent);color:var(--accent);background:color-mix(in srgb,var(--accent) 8%,white);font-weight:600;}

    /* ── Inputs ── */
    .plain-input{
      border:1.5px solid #eeeef5;border-radius:12px;
      padding:10px 14px;font-family:'Heebo',sans-serif;font-size:14px;
      background:white;color:#1a1a2e;outline:none;direction:rtl;
      transition:border 0.15s,box-shadow 0.15s;
    }
    .plain-input:focus{border-color:var(--accent);box-shadow:0 0 0 3px color-mix(in srgb,var(--accent) 10%,transparent);}
    .plain-input::placeholder{color:#ccc;}

    /* ── Buttons ── */
    .add-btn{
      border:none;border-radius:12px;background:var(--accent);color:white;
      font-family:'Heebo',sans-serif;font-size:14px;font-weight:700;
      padding:10px 20px;cursor:pointer;transition:all 0.15s;
    }
    .add-btn:hover{filter:brightness(1.07);transform:translateY(-1px);}
    .add-btn:active{transform:translateY(0);}
    .ghost-btn{
      border:1.5px dashed #dde;border-radius:12px;background:none;
      padding:7px 14px;font-family:'Heebo',sans-serif;font-size:12.5px;
      color:#bbb;cursor:pointer;transition:all 0.15s;
    }
    .ghost-btn:hover{border-color:var(--accent);color:var(--accent);}

    /* ── Priority dot ── */
    .prio-dot{
      width:16px;height:16px;border-radius:50%;
      border:2px solid #dde;background:white;
      cursor:pointer;flex-shrink:0;transition:all 0.2s;padding:0;margin-top:3px;
    }
    .prio-dot:hover{transform:scale(1.2);}

    /* ── Task rows — left accent border ── */
    .task-row{
      display:flex;align-items:flex-start;gap:10px;
      padding:12px 14px 12px 18px;
      background:white;margin-bottom:6px;
      transition:box-shadow 0.15s;position:relative;
      border-right:3px solid var(--accent);
    }
    .task-row:first-child{border-radius:14px 14px 0 0;border-right:3px solid var(--accent);}
    .task-row:last-child{border-radius:0 0 14px 14px;}
    .task-row:only-child{border-radius:14px;}
    .task-row.prio-green{border-right-color:#4caf50;}
    .task-row.prio-yellow{border-right-color:#ffa726;}
    .task-row.prio-red{border-right-color:#ef5350;}
    .task-row:hover{box-shadow:0 2px 12px rgba(0,0,0,0.08);}
    .task-group-wrap{background:white;border-radius:14px;overflow:hidden;margin-bottom:8px;box-shadow:0 1px 6px rgba(0,0,0,0.06);}

    /* ── Reminder cards ── */
    .reminder-card{
      padding:13px 16px 13px 20px;
      background:white;margin-bottom:6px;
      transition:box-shadow 0.15s;
      border-right:3px solid #c8d8f0;
    }
    .reminder-card:first-child{border-radius:14px 14px 0 0;}
    .reminder-card:last-child{border-radius:0 0 14px 14px;}
    .reminder-card:only-child{border-radius:14px;}
    .reminder-group-wrap{background:white;border-radius:14px;overflow:hidden;margin-bottom:8px;box-shadow:0 1px 6px rgba(0,0,0,0.06);}
    .reminder-card.active-r{border-right-color:var(--accent);background:color-mix(in srgb,var(--accent) 3%,white);}
    .reminder-card.future-r{border-right-color:#9c9cdf;}
    .reminder-card.past-r{opacity:0.4;}
    .reminder-card:hover{box-shadow:0 2px 12px rgba(0,0,0,0.08);}

    /* ── Date chips ── */
    .date-range-bar{display:flex;align-items:center;gap:5px;font-size:11px;margin-top:6px;flex-wrap:wrap;}
    .date-chip{padding:2px 8px;border-radius:100px;font-size:10.5px;font-weight:600;}
    .status-dot{width:5px;height:5px;border-radius:50%;flex-shrink:0;}
    .days-badge{font-size:10px;padding:2px 8px;border-radius:100px;font-weight:700;}

    /* ── Icon buttons ── */
    .icon-btn{
      background:none;border:none;cursor:pointer;color:#ccc;font-size:15px;
      padding:3px 5px;transition:color 0.12s;flex-shrink:0;line-height:1;
      min-width:26px;min-height:26px;display:flex;align-items:center;justify-content:center;border-radius:6px;
    }
    .icon-btn:hover{color:#8888aa;background:rgba(100,100,160,0.06);}
    .icon-btn.del:hover{color:#e08080;background:rgba(220,80,80,0.06);}
    .icon-btn.done-btn{
      color:#d8d8e8;width:28px;height:28px;border-radius:50%;
      border:2px solid #dde;background:white;transition:all 0.2s;
      display:flex;align-items:center;justify-content:center;
    }
    .icon-btn.done-btn:hover{border-color:var(--accent);color:var(--accent);background:color-mix(in srgb,var(--accent) 8%,white);transform:scale(1.12);}

    /* ── Labels ── */
    .section-label{font-size:10px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#c8c8d8;margin:20px 0 8px;}
    .group-label{font-size:10px;font-weight:700;color:#c0c0d8;margin:16px 0 7px;padding-bottom:5px;border-bottom:1px solid #eeeef5;letter-spacing:0.08em;text-transform:uppercase;}
    .col-header{font-size:15px;font-weight:800;color:#1a1a2e;}

    /* ── Inline edit ── */
    .edit-inline{border:1.5px solid var(--accent);border-radius:8px;padding:4px 10px;font-family:'Heebo',sans-serif;font-size:14px;outline:none;direction:rtl;background:white;color:#1a1a2e;width:100%;}

    /* ── Dropdowns ── */
    .dropdown-menu{position:absolute;top:calc(100% + 8px);right:0;background:white;border:1px solid #eeeef5;border-radius:14px;box-shadow:0 8px 32px rgba(100,100,160,0.14);min-width:190px;z-index:100;overflow:hidden;}
    .dropdown-item{display:flex;align-items:center;gap:9px;padding:11px 16px;cursor:pointer;font-family:'Heebo',sans-serif;font-size:13px;color:#3a3a5c;background:none;border:none;width:100%;text-align:right;transition:background 0.1s;}
    .dropdown-item:hover{background:#f6f6fc;}
    .dropdown-item.danger{color:#e07070;}
    .dropdown-item.danger:hover{background:#fef2f2;}
    .dropdown-divider{height:1px;background:#f0f0f8;margin:4px 0;}
    .profile-avatar{width:28px;height:28px;border-radius:50%;background:var(--accent);color:white;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;flex-shrink:0;}
    .settings-dropdown{left:0;right:auto;}

    /* ── Layout ── */
    .main-grid{display:grid;grid-template-columns:1fr 1fr;gap:24px;align-items:start;}
    .subtask-row{display:flex;align-items:center;gap:8px;padding:5px 0;}
    .subtask-check{width:15px;height:15px;border-radius:4px;border:1.5px solid #dde;background:none;cursor:pointer;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:9px;transition:all 0.12s;}
    .subtask-check:hover{border-color:var(--accent);}
    .subtask-check.checked{border-color:var(--accent);background:var(--accent);color:white;}

    /* ── FAB & side pills ── */
    .fab{position:fixed;bottom:26px;left:26px;width:52px;height:52px;border-radius:50%;border:none;color:white;font-size:26px;cursor:pointer;box-shadow:0 6px 20px color-mix(in srgb,var(--accent) 45%,transparent);z-index:150;display:flex;align-items:center;justify-content:center;transition:transform 0.15s;background:var(--accent);}
    .fab:hover{transform:scale(1.08);}
    .side-pill{position:fixed;left:26px;border-radius:100px;border:none;padding:8px 16px 8px 12px;cursor:pointer;font-family:'Heebo',sans-serif;font-size:13px;font-weight:600;display:flex;align-items:center;gap:6px;box-shadow:0 3px 12px rgba(0,0,0,0.12);z-index:150;transition:all 0.15s;background:white;color:#555;}
    .side-pill.active-pill{background:var(--accent);color:white;}
    .side-pill:hover{transform:translateX(2px);}

    /* ── Section header ── */
    .section-header{display:flex;align-items:center;margin-bottom:12px;gap:8px;}
    .section-count{background:var(--accent);color:white;border-radius:100px;font-size:11px;font-weight:700;padding:1px 7px;}

    /* ── List detail ── */
    .list-item-row{display:flex;align-items:center;gap:10px;padding:12px 0;border-bottom:1px solid #f2f2f8;}
    .back-btn{display:flex;align-items:center;gap:5px;background:none;border:none;cursor:pointer;color:#8888a0;padding:6px 10px;border-radius:10px;font-family:'Heebo',sans-serif;transition:all 0.12s;font-size:12px;font-weight:600;}
    .back-btn:hover{background:#f0f0f8;color:#555;}
    .back-btn svg{transition:transform 0.12s;}
    .back-btn:hover svg{transform:translateX(2px);}

    /* ── Alert modal ── */
    .alert-modal{position:fixed;inset:0;background:rgba(20,20,40,0.5);display:flex;align-items:center;justify-content:center;z-index:300;direction:rtl;backdrop-filter:blur(6px);}
    .alert-card{background:white;border-radius:20px;padding:28px 24px;width:min(420px,92vw);max-height:80vh;display:flex;flex-direction:column;gap:12px;box-shadow:0 20px 60px rgba(0,0,0,0.2);}
    .alert-item{display:flex;align-items:flex-start;gap:10px;padding:11px 13px;background:#fffbeb;border:1.5px solid #fde68a;border-radius:12px;}

    /* ── Empty states ── */
    .empty-state{color:#ccc;font-size:13px;text-align:center;padding:24px;border:1.5px dashed #e8e8f2;border-radius:12px;background:white;}

    /* ── Animations ── */
    @keyframes ringOut{0%{transform:scale(0.8);opacity:0.8}100%{transform:scale(3.5);opacity:0}}
    @keyframes ringOutOuter{0%{transform:scale(0.6);opacity:0.5}100%{transform:scale(5);opacity:0}}
    .ring-outer{position:absolute;top:8px;right:10px;width:24px;height:24px;border-radius:50%;border:1.5px solid var(--accent);opacity:0.4;animation:ringOutOuter 0.8s ease-out 0.1s forwards;pointer-events:none;}
    @keyframes bigFly{0%{transform:translate(0,0) scale(1.4);opacity:1}100%{transform:translate(var(--dx),var(--dy)) scale(0);opacity:0}}
    @keyframes spin{to{transform:rotate(360deg)}}
    @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
    .ring{position:absolute;top:10px;right:12px;width:20px;height:20px;border-radius:50%;border:2px solid var(--accent);animation:ringOut 0.6s ease-out forwards;pointer-events:none;}
    .big-emoji{position:absolute;font-size:22px;animation:bigFly 0.9s ease-out forwards;pointer-events:none;z-index:10;}
    .spinner{width:14px;height:14px;border:2px solid #e8e8f8;border-top-color:#9090b8;border-radius:50%;animation:spin 0.7s linear infinite;flex-shrink:0;}
    .animate-in{animation:fadeIn 0.25s ease both;}

    @media(max-width:640px){.main-grid{grid-template-columns:1fr;gap:16px;}.dropdown-menu{max-width:calc(100vw - 24px);}}
    @media screen and (-webkit-min-device-pixel-ratio:0){input,textarea,select{font-size:max(16px,1em) !important;}}
    @keyframes voicePulse{0%,100%{box-shadow:0 0 0 4px rgba(239,83,80,0.25)}50%{box-shadow:0 0 0 10px rgba(239,83,80,0.08)}}
    /* opacity-only (no transform) — a transform here, even a completed one via
       animation-fill-mode, would make this element a new containing block for
       all its position:fixed descendants (side icons, FAB, add bars, overlays),
       so they'd scroll away with the page instead of staying pinned to the screen. */
    @keyframes appFadeIn{0%{opacity:0}100%{opacity:1}}
  `;

  // ── Splash ─────────────────────────────────────────────────────────────────
  if (showSplash) {
    return <SplashScreen onComplete={()=>{sessionStorage.setItem("splashDone","1");setShowSplash(false);}}/>;
  }

  // ── Profile modal ──────────────────────────────────────────────────────────
  if (showProfileModal) {
    return (
      <div dir="rtl" style={{minHeight:"100vh",background:"linear-gradient(135deg,#e8f5f0 0%,#eee8f8 100%)",fontFamily:"'Heebo',sans-serif",display:"flex",alignItems:"center",justifyContent:"center"}}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;500;600;700&display=swap');*{box-sizing:border-box;}`}</style>
        <div style={{background:"white",borderRadius:24,padding:36,width:360,boxShadow:"0 12px 48px rgba(100,100,160,0.16)"}}>
          <div style={{textAlign:"center",marginBottom:16}}>
            <img src="/icon.png" alt="" style={{width:72,borderRadius:18,boxShadow:"0 4px 16px rgba(100,100,160,0.2)"}}/>
          </div>
          <div style={{fontSize:22,fontWeight:700,textAlign:"center",marginBottom:4,color:"#1a1a2e"}}>TaskUp</div>
          <div style={{fontSize:14,color:"#9090b0",textAlign:"center",marginBottom:28}}>{allProfiles.length>0?"בחרי פרופיל או צרי חדש":"ברוכה הבאה 👋"}</div>
          {allProfiles.length>0&&<div style={{marginBottom:20}}>{allProfiles.map(p=>(<button key={p.id} onClick={()=>{setActiveProfileId(p.id);setActiveTab(null);setActiveSubtab(null);setShowProfileModal(false);}} style={{width:"100%",display:"flex",alignItems:"center",gap:10,padding:"11px 14px",borderRadius:14,border:"1.5px solid #ededf5",background:"white",cursor:"pointer",marginBottom:8,fontFamily:"'Heebo',sans-serif",fontSize:15,fontWeight:500,color:"#1a1a2e",transition:"all 0.15s"}}><span style={{width:34,height:34,borderRadius:"50%",background:"#7bc4a4",color:"white",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:700}}>{p.name.charAt(0)}</span>{p.name}</button>))}<div style={{borderTop:"1px solid #f0f0f8",margin:"16px 0 14px"}}/></div>}
          <div style={{fontSize:12,fontWeight:700,color:"#b0b0cc",marginBottom:8,textTransform:"uppercase",letterSpacing:"0.08em"}}>{allProfiles.length>0?"פרופיל חדש":"שם הפרופיל"}</div>
          <input autoFocus className="plain-input" style={{width:"100%",marginBottom:14,fontSize:15,"--accent":"#7bc4a4"}} placeholder="שם הפרופיל" value={newProfileName} onChange={e=>setNewProfileName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&createProfile()}/>
          <button onClick={createProfile} style={{width:"100%",background:"#7bc4a4",color:"white",border:"none",borderRadius:14,padding:"13px 0",fontSize:15,fontWeight:700,cursor:"pointer",fontFamily:"'Heebo',sans-serif",marginBottom:allProfiles.length>0?8:0,boxShadow:"0 4px 14px rgba(123,196,164,0.4)"}}>{allProfiles.length>0?"צרי פרופיל":"התחלי"}</button>
          {allProfiles.length>0&&<button onClick={()=>setShowProfileModal(false)} style={{width:"100%",background:"none",color:"#b0b0cc",border:"none",padding:"8px 0",fontSize:14,cursor:"pointer",fontFamily:"'Heebo',sans-serif"}}>ביטול</button>}
        </div>
      </div>
    );
  }

  return (
    <div dir="rtl" style={{minHeight:"100vh",fontFamily:"'Heebo',sans-serif",color:"#1a1a1a",animation:"appFadeIn 0.5s ease-out both"}}>
      <style>{CSS}</style>
      <div style={{"--accent":accent}}>

        {/* ── Reminder alert modal ── */}
        {showAlertModal&&alertReminders.length>0&&(
          <div className="alert-modal">
            <div className="alert-card">
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <span style={{fontSize:22}}>🔔</span>
                <span style={{fontWeight:700,fontSize:17}}>תזכורות שממתינות לך</span>
              </div>
              <div style={{overflowY:"auto",flex:1,display:"flex",flexDirection:"column",gap:8}}>
                {alertReminders.map((r,i)=>(
                  <div key={i} className="alert-item">
                    <span style={{fontSize:16,flexShrink:0}}>⚠️</span>
                    <div style={{flex:1}}>
                      <div style={{fontWeight:600,fontSize:14}}>{r.text}</div>
                      {r.startDate&&<div style={{fontSize:12,color:"#92400e",marginTop:2}}>מ-{formatDate(r.startDate)}{r.endDate?` עד ${formatDate(r.endDate)}`:""}</div>}
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={()=>setShowAlertModal(false)}
                style={{background:"#1a1a1a",color:"white",border:"none",borderRadius:10,padding:"11px 0",fontSize:15,fontWeight:600,cursor:"pointer",fontFamily:"'Heebo',sans-serif"}}>
                סגור
              </button>
            </div>
          </div>
        )}

        {/* Big celebrate */}
        {bigCelebrateId&&(
          <div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:260,overflow:"hidden"}}>
            {["🎉","✨","⭐","🎊","💫","🌟","🎈"].map((emoji,i)=>(
              <span key={i} className="big-emoji" style={{"--dx":`${(i-3)*35}px`,"--dy":`-${60+Math.round(i*8)}px`,left:"50%",bottom:"40%",animationDelay:`${i*70}ms`}}>{emoji}</span>
            ))}
          </div>
        )}

        {/* Quick capture */}
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

        {/* Lists menu */}
        {showListsMenu&&(
          <div style={{position:"fixed",inset:0,zIndex:190}} onClick={()=>{setShowListsMenu(null);setShowNewListInput(false);setNewListName("");}}>
            <div style={{position:"absolute",bottom:96,left:24,background:"white",borderRadius:14,padding:16,minWidth:220,boxShadow:"0 4px 24px rgba(0,0,0,0.18)"}} onClick={e=>e.stopPropagation()}>
              <div style={{fontWeight:700,fontSize:15,marginBottom:14}}>{showListsMenu==="shopping"?"🛒 רשימות קניות":"📝 פתקים"}</div>
              {(showListsMenu==="shopping"?shoppingLists:notesList).map(list=>(
                <button key={list.id} onClick={()=>{setOpenListId(list.id);setOpenListType(showListsMenu);setShowListsMenu(null);setShowNewListInput(false);}}
                  style={{width:"100%",display:"flex",alignItems:"center",gap:8,padding:"9px 10px",borderRadius:8,border:"1px solid #ebebea",background:"white",cursor:"pointer",marginBottom:6,fontFamily:"'Heebo',sans-serif",fontSize:14,color:"#1a1a1a",textAlign:"right"}}>
                  <span style={{flex:1}}>{list.name}</span>
                  <span style={{fontSize:11,color:"#bbb"}}>{showListsMenu==="shopping"?(list.items?.length||0):"📄"}</span>
                </button>
              ))}
              {showNewListInput?(
                <div style={{display:"flex",gap:6,marginTop:8}}>
                  <input autoFocus className="plain-input" style={{flex:1,fontSize:13,padding:"6px 10px"}} placeholder={showListsMenu==="shopping"?"שם הרשימה":"שם הפתק"} value={newListName} onChange={e=>setNewListName(e.target.value)}
                    onKeyDown={e=>{if(e.key==="Enter"){if(showListsMenu==="shopping")addShoppingList(newListName);else addNote(newListName);setNewListName("");setShowNewListInput(false);}if(e.key==="Escape"){setShowNewListInput(false);setNewListName("");}}}/>
                  <button className="add-btn" style={{padding:"6px 10px",fontSize:13}} aria-label={showListsMenu==="shopping"?"צור רשימה":"צור פתק"} onClick={()=>{if(showListsMenu==="shopping")addShoppingList(newListName);else addNote(newListName);setNewListName("");setShowNewListInput(false);}}>+</button>
                </div>
              ):(
                <button className="ghost-btn" style={{width:"100%",marginTop:4,fontSize:13}} onClick={()=>setShowNewListInput(true)}>+ {showListsMenu==="shopping"?"רשימה חדשה":"פתק חדש"}</button>
              )}
            </div>
          </div>
        )}

        {/* List detail overlay */}
        {openListId&&openList&&(
          <div style={{position:"fixed",inset:0,background:"white",zIndex:200,direction:"rtl",display:"flex",flexDirection:"column"}}>
            <div style={{padding:"14px 20px",borderBottom:"1px solid #ebebea",display:"flex",alignItems:"center",gap:12,background:"white"}}>
              <button className="back-btn" onClick={()=>{setOpenListId(null);setOpenListType(null);setListItemInput("");}}>
                <svg width="28" height="22" viewBox="0 0 28 22" fill="none">
                  <path d="M5 11 Q9 11 11 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <path d="M11 11 H23" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <path d="M16 5 L23 11 L16 17" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx="5" cy="11" r="3" fill="currentColor" opacity="0.45"/>
                </svg>
                <span style={{fontSize:11,fontWeight:600}}>חזרה</span>
              </button>
              <span style={{fontWeight:700,fontSize:18,flex:1}}>{openList.name}</span>
              {openListType==="shopping"&&(
                <button onClick={()=>shareShoppingList(openList)} style={{background:"none",border:"none",fontSize:13,color:"#25d366",cursor:"pointer",fontFamily:"'Heebo',sans-serif",marginLeft:8}}>💬 שתף</button>
              )}
              <button onClick={()=>{if(openListType==="shopping")deleteShoppingList(openListId);else deleteNote(openListId);}} style={{background:"none",border:"none",fontSize:13,color:"#e07070",cursor:"pointer",fontFamily:"'Heebo',sans-serif"}}>מחק</button>
            </div>

            {/* Notes: free textarea */}
            {openListType==="notes"&&(
              <textarea style={{flex:1,padding:"20px",fontFamily:"'Heebo',sans-serif",fontSize:16,lineHeight:1.8,border:"none",outline:"none",resize:"none",direction:"rtl",color:"#1a1a1a",background:"white"}}
                placeholder="כתבי כאן בחופשיות..."
                value={openList.content||""}
                onChange={e=>updateProfile(p=>({...p,notes:(p.notes||[]).map(n=>n.id===openListId?{...n,content:e.target.value}:n)}))}/>
            )}

            {/* Shopping: items list */}
            {openListType==="shopping"&&<>
              <div style={{flex:1,overflowY:"auto",padding:"8px 20px 100px"}}>
                {(!openList.items||openList.items.length===0)&&<div style={{color:"#ccc",fontSize:14,textAlign:"center",padding:"40px 0"}}>רשימה ריקה — הוסיפי פריטים למטה</div>}
                {(openList.items||[]).map(item=>(
                  <div key={item.id} className="list-item-row">
                    <span style={{width:7,height:7,borderRadius:"50%",background:accent,flexShrink:0}}/>
                    {editingShoppingItem?.itemId===item.id
                      ?<input autoFocus className="edit-inline" style={{flex:1,fontSize:15}} value={editingShoppingItem.text} onChange={e=>setEditingShoppingItem(p=>({...p,text:e.target.value}))}
                          onKeyDown={e=>{if(e.key==="Enter")editShoppingItem(openListId,item.id,editingShoppingItem.text);if(e.key==="Escape")setEditingShoppingItem(null);}}/>
                      :<span style={{flex:1,fontSize:15,color:"#1a1a1a",lineHeight:1.5}}>{item.text}</span>
                    }
                    <button onClick={()=>setEditingShoppingItem({listId:openListId,itemId:item.id,text:item.text})} style={{background:"none",border:"none",color:"#ccc",fontSize:16,cursor:"pointer",padding:"2px 4px",lineHeight:1}} aria-label="ערוך פריט">✎</button>
                    <button onClick={()=>deleteShoppingItem(openListId,item.id)} style={{background:"none",border:"none",color:"#ccc",fontSize:16,cursor:"pointer",padding:"2px 4px",lineHeight:1}} aria-label="מחק פריט">✕</button>
                  </div>
                ))}
              </div>
              {/* Fixed add bar — stays above keyboard on mobile */}
              <div style={{position:"fixed",bottom:0,left:0,right:0,padding:"12px 20px",paddingBottom:"calc(12px + env(safe-area-inset-bottom, 0px))",borderTop:"1px solid #ebebea",background:"white",zIndex:201}}>
                <div style={{fontSize:11,color:"#bbb",marginBottom:6,fontWeight:600}}>פסיקים בין פריטים, או משפט חופשי</div>
                <div style={{display:"flex",gap:10}}>
                  <input autoFocus className="plain-input" style={{flex:1,fontSize:15}} placeholder='חלב, ביצים, לחם  או  "תקני גם יוגורט"' value={listItemInput} onChange={e=>setListItemInput(e.target.value)}
                    onKeyDown={e=>{if(e.key==="Enter"){parseAndAddItems(openListId,listItemInput);setListItemInput("");}}}/>
                  <button className="add-btn" style={{minWidth:52}} aria-label="הוסף פריטים" onClick={()=>{parseAndAddItems(openListId,listItemInput);setListItemInput("");}} disabled={parsingList}>
                    {parsingList?<div className="spinner" style={{borderTopColor:"white",borderColor:"rgba(255,255,255,0.3)"}}/>:"+"}
                  </button>
                </div>
              </div>
            </>}
          </div>
        )}

        {/* Email overlay */}
        {showEmail&&(
          <div style={{position:"fixed",inset:0,background:"#f5f6fa",zIndex:200,direction:"rtl",display:"flex",flexDirection:"column",fontFamily:"'Heebo',sans-serif"}}>
            <div style={{background:"white",borderBottom:"1px solid #eeeef5",padding:"14px 20px",display:"flex",alignItems:"center",gap:12}}>
              <button className="back-btn" onClick={()=>setShowEmail(false)}>
                <svg width="22" height="16" viewBox="0 0 22 16" fill="none"><path d="M3 8H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><path d="M13 2L19 8L13 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                חזרה
              </button>
              <span style={{fontWeight:800,fontSize:17,flex:1}}>📧 סיכומי מייל</span>
              {gmailClientId&&!showClientIdInput&&(
                <button onClick={editGmailClientId} aria-label="שנה Client ID" style={{background:"none",border:"none",fontSize:12,color:"#999",cursor:"pointer",fontFamily:"'Heebo',sans-serif",marginLeft:4}}>שנה Client ID</button>
              )}
              {gmailToken
                ? <button onClick={disconnectGmail} style={{background:"none",border:"none",fontSize:12,color:"#e07070",cursor:"pointer",fontFamily:"'Heebo',sans-serif"}}>התנתק</button>
                : <button onClick={connectGmail} style={{background:"#4285f4",color:"white",border:"none",borderRadius:10,padding:"6px 14px",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"'Heebo',sans-serif"}}>התחבר ל-Gmail</button>
              }
            </div>

            <div style={{flex:1,overflowY:"auto",padding:20}}>

              {/* Auth error banner */}
              {gmailAuthError&&!showClientIdInput&&(
                <div style={{background:"#fef2f2",border:"1.5px solid #fca5a5",borderRadius:12,padding:"10px 14px",marginBottom:16,fontSize:13,color:"#b91c1c",display:"flex",alignItems:"center",gap:8}}>
                  <span>⚠️</span>
                  <span style={{flex:1}}>{gmailAuthError}</span>
                  <button onClick={connectGmail} style={{background:"none",border:"none",color:"#b91c1c",fontWeight:700,cursor:"pointer",fontFamily:"'Heebo',sans-serif",fontSize:12,textDecoration:"underline",flexShrink:0}}>התחברי מחדש</button>
                </div>
              )}

              {/* Client ID setup */}
              {showClientIdInput&&(
                <div style={{background:"#fffbeb",border:"1.5px solid #fcd34d",borderRadius:14,padding:16,marginBottom:16}}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
                    <div style={{fontSize:13,fontWeight:700}}>🔑 Google OAuth Client ID</div>
                    <button onClick={()=>{setShowClientIdInput(false);setGmailAuthError("");}} aria-label="סגור" style={{background:"none",border:"none",cursor:"pointer",color:"#aaa",fontSize:16,lineHeight:1}}>✕</button>
                  </div>
                  {gmailAuthError&&(
                    <div style={{fontSize:12,color:"#b91c1c",background:"#fef2f2",border:"1px solid #fca5a5",borderRadius:8,padding:"6px 10px",marginBottom:10}}>⚠️ {gmailAuthError}</div>
                  )}
                  <div style={{fontSize:12,color:"#666",marginBottom:10,lineHeight:1.6}}>
                    נדרש Client ID מ-Google Cloud Console:<br/>
                    1. כנסי ל-console.cloud.google.com<br/>
                    2. צרי פרויקט → Enable Gmail API<br/>
                    3. Credentials → Create OAuth Client ID (Web Application)<br/>
                    4. הוסיפי <b>{window.location.origin}</b> ל-Authorized JavaScript Origins<br/>
                    5. העתיקי את ה-Client ID לכאן
                  </div>
                  <div style={{display:"flex",gap:8}}>
                    <input autoFocus className="plain-input" style={{flex:1,fontSize:13}} placeholder="xxxxxxxx.apps.googleusercontent.com" value={gmailClientId} onChange={e=>setGmailClientId(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"){localStorage.setItem("gmail_client_id",gmailClientId);setShowClientIdInput(false);connectGmail();}if(e.key==="Escape"){setShowClientIdInput(false);setGmailAuthError("");}}}/>
                    <button className="add-btn" onClick={()=>{localStorage.setItem("gmail_client_id",gmailClientId);setShowClientIdInput(false);connectGmail();}}>אישור</button>
                  </div>
                </div>
              )}

              {/* Rules */}
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
                <span style={{fontWeight:700,fontSize:14}}>חוקי סיכום</span>
                <button onClick={()=>{setNewRule({sender:"",subject:"",format:"bullets",dateFrom:"",dateAll:false});setShowNewRule(true);}} style={{background:accent,color:"white",border:"none",borderRadius:10,padding:"5px 14px",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"'Heebo',sans-serif"}}>+ חוק חדש</button>
              </div>

              {showNewRule&&(
                <div style={{background:"white",borderRadius:14,padding:16,marginBottom:12,boxShadow:"0 1px 6px rgba(0,0,0,0.06)"}}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
                    <span style={{fontSize:13,fontWeight:700}}>{newRule.id?"עריכת חוק":"חוק חדש"}</span>
                    <button onClick={()=>{setShowNewRule(false);setNewRule({sender:"",subject:"",format:"bullets",dateFrom:"",dateAll:false});}} style={{background:"none",border:"none",cursor:"pointer",color:"#aaa",fontSize:18,lineHeight:1}} aria-label="בטל">✕</button>
                  </div>
                  <div style={{display:"flex",flexDirection:"column",gap:10}}>
                    <input className="plain-input" style={{fontSize:13}} placeholder="שולח (לדוג' momence.com, אופציונלי)" value={newRule.sender} onChange={e=>setNewRule(p=>({...p,sender:e.target.value}))}/>
                    <input className="plain-input" style={{fontSize:13}} placeholder="מילות מפתח (בלי שולח — יחפש רק לפי המילים)" value={newRule.subject} onChange={e=>setNewRule(p=>({...p,subject:e.target.value}))}/>
                    {newRule.subject&&(
                      <div style={{display:"flex",alignItems:"center",gap:8,background:"#f9f9f8",borderRadius:10,padding:"8px 12px"}}>
                        <label style={{fontSize:12,color:"#888",whiteSpace:"nowrap"}}>לחפש:</label>
                        <div style={{display:"flex",gap:6}}>
                          {[["subject","רק בכותרת"],["all","גם בתוכן המייל"]].map(([v,l])=>(
                            <button key={v} onClick={()=>setNewRule(p=>({...p,searchScope:v}))} style={{padding:"4px 10px",borderRadius:20,border:`1.5px solid ${(newRule.searchScope||"subject")===v?accent:"#dde"}`,background:(newRule.searchScope||"subject")===v?`${accent}15`:"white",color:(newRule.searchScope||"subject")===v?accent:"#888",cursor:"pointer",fontFamily:"'Heebo',sans-serif",fontSize:12,fontWeight:(newRule.searchScope||"subject")===v?700:400}}>{l}</button>
                          ))}
                        </div>
                      </div>
                    )}
                    {/* Date range */}
                    <div style={{display:"flex",alignItems:"center",gap:8,background:"#f9f9f8",borderRadius:10,padding:"8px 12px"}}>
                      <label style={{fontSize:12,color:"#888",whiteSpace:"nowrap"}}>תקופה:</label>
                      <label style={{display:"flex",alignItems:"center",gap:4,fontSize:12,cursor:"pointer"}}>
                        <input type="checkbox" checked={newRule.dateAll||false} onChange={e=>setNewRule(p=>({...p,dateAll:e.target.checked,dateFrom:""}))}/> כל המיילים
                      </label>
                      {!newRule.dateAll&&<input type="date" className="plain-input" style={{flex:1,fontSize:12,padding:"4px 8px",colorScheme:"light"}} value={newRule.dateFrom||""} onChange={e=>setNewRule(p=>({...p,dateFrom:e.target.value}))} placeholder="מתאריך"/>}
                    </div>
                    {!newRule.dateAll&&!newRule.dateFrom&&<div style={{fontSize:11,color:"#aaa",marginTop:-4}}>בלי תאריך ובלי "כל המיילים" — מחפש רק 30 הימים האחרונים.</div>}
                    <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                      {[["bullets","• נקודות"],["summary","📝 סיכום"],["tasks","✅ משימות"],["dates","📅 תאריכים"]].map(([v,l])=>(
                        <button key={v} onClick={()=>setNewRule(p=>({...p,format:v}))} style={{padding:"5px 12px",borderRadius:20,border:`1.5px solid ${newRule.format===v?accent:"#dde"}`,background:newRule.format===v?`${accent}15`:"white",color:newRule.format===v?accent:"#888",cursor:"pointer",fontFamily:"'Heebo',sans-serif",fontSize:12,fontWeight:newRule.format===v?700:400}}>{l}</button>
                      ))}
                    </div>
                    <div style={{display:"flex",gap:8}}>
                      <button className="add-btn" style={{flex:1}} onClick={()=>{
                        if(!newRule.sender&&!newRule.subject)return;
                        if(newRule.id){ saveEmailRules(emailRules.map(r=>r.id===newRule.id?{...newRule}:r)); }
                        else{ saveEmailRules([...emailRules,{id:uid(),...newRule}]); }
                        setNewRule({sender:"",subject:"",format:"bullets",dateFrom:"",dateAll:false});
                        setShowNewRule(false);
                      }}>{newRule.id?"עדכן חוק":"שמור חוק"}</button>
                    </div>
                  </div>
                </div>
              )}

              {emailRules.map(rule=>(
                <div key={rule.id} style={{background:"white",borderRadius:12,padding:"12px 14px",marginBottom:8,boxShadow:"0 1px 6px rgba(0,0,0,0.05)",display:"flex",alignItems:"center",gap:10,borderRight:`3px solid ${accent}`}}>
                  <div style={{flex:1}}>
                    {rule.sender&&<div style={{fontSize:13,fontWeight:600}}>מ: {rule.sender}</div>}
                    {rule.subject&&<div style={{fontSize:12,color:"#888"}}>מילות מפתח: {rule.subject} ({rule.searchScope==="all"?"כותרת+תוכן":"כותרת בלבד"})</div>}
                    <div style={{fontSize:11,color:accent,marginTop:2}}>
                      {{"bullets":"• נקודות","summary":"סיכום","tasks":"משימות","dates":"תאריכים"}[rule.format]}
                      {" • "}
                      {rule.dateAll?"כל המיילים":rule.dateFrom?`מ-${formatDate(rule.dateFrom)}`:"30 ימים אחרונים"}
                    </div>
                  </div>
                  <button onClick={()=>{setNewRule({sender:"",subject:"",format:"bullets",dateFrom:"",dateAll:false,...rule});setShowNewRule(true);}} style={{background:"none",border:"none",color:"#bbb",cursor:"pointer",fontSize:15}} aria-label="ערוך חוק">✎</button>
                  <button onClick={()=>saveEmailRules(emailRules.filter(r=>r.id!==rule.id))} style={{background:"none",border:"none",color:"#dde",cursor:"pointer",fontSize:16}} aria-label="מחק חוק">✕</button>
                </div>
              ))}

              {emailRules.length===0&&<div className="empty-state" style={{marginBottom:16}}>הגדירי חוק כדי להתחיל</div>}

              {/* Fetch button */}
              {gmailToken&&emailRules.length>0&&(
                <button onClick={fetchAndSummarize} disabled={emailLoading} style={{width:"100%",background:accent,color:"white",border:"none",borderRadius:14,padding:"13px 0",fontSize:15,fontWeight:700,cursor:"pointer",fontFamily:"'Heebo',sans-serif",marginBottom:20,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
                  {emailLoading?<><div className="spinner" style={{borderTopColor:"white",borderColor:"rgba(255,255,255,0.3)"}}/>טוען מיילים...</>:"🔄 סכמי מיילים עכשיו"}
                </button>
              )}

              {/* Status message from the last sync attempt */}
              {emailStatusMsg&&!emailLoading&&(
                <div style={{background:"#fffbeb",border:"1.5px solid #fcd34d",borderRadius:12,padding:"10px 14px",marginBottom:16,fontSize:13,color:"#92400e",lineHeight:1.6,whiteSpace:"pre-line"}}>
                  ℹ️ {emailStatusMsg}
                </div>
              )}

              {/* Summaries */}
              {emailSummaries.map((s,i)=>(
                <div key={s.id||i} style={{background:"white",borderRadius:16,padding:"16px 18px",marginBottom:12,boxShadow:"0 1px 8px rgba(0,0,0,0.07)"}}>
                  <div style={{fontSize:11,color:"#bbb",marginBottom:4}}>{s.sender} • {s.date?new Date(s.date).toLocaleDateString("he-IL",{day:"numeric",month:"short"}):"" }</div>
                  <div style={{fontWeight:700,fontSize:14,marginBottom:10,color:"#1a1a2e"}}>{s.subject}</div>
                  <div style={{fontSize:13,color:"#444",lineHeight:1.7,whiteSpace:"pre-line"}}>{s.summary}</div>
                </div>
              ))}
              {emailSummaries.length===0&&!emailLoading&&!emailStatusMsg&&gmailToken&&emailRules.length>0&&(
                <div className="empty-state">לחצי "סכמי מיילים עכשיו" כדי לראות תוצאות</div>
              )}
            </div>
          </div>
        )}

        {/* Projects overlay */}
        {(showProjects||openProjectId)&&(
          <div style={{position:"fixed",inset:0,background:"#f5f6fa",zIndex:200,direction:"rtl",display:"flex",flexDirection:"column",fontFamily:"'Heebo',sans-serif"}}>
            {/* Projects header */}
            <div style={{background:"white",borderBottom:"1px solid #eeeef5",padding:"14px 20px",display:"flex",alignItems:"center",gap:12}}>
              <button className="back-btn" onClick={()=>{setOpenProjectId(null);setShowProjects(openProjectId?true:false);}}>
                <svg width="22" height="16" viewBox="0 0 22 16" fill="none"><path d="M3 8H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><path d="M13 2L19 8L13 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                {openProjectId?"פרויקטים":"חזרה"}
              </button>
              <span style={{fontWeight:800,fontSize:17,flex:1,color:"#1a1a2e"}}>{openProject?openProject.name:"פרויקטים"}</span>
              {openProject&&(
                <div style={{fontSize:12,color:"#aaa",fontWeight:500}}>התקדמות {getProjectProgress(openProject)}%</div>
              )}
            </div>

            {/* Progress bar for open project */}
            {openProject&&(
              <div style={{height:4,background:"#eeeef5"}}>
                <div style={{height:"100%",background:accent,width:`${getProjectProgress(openProject)}%`,transition:"width 0.4s",borderRadius:"0 4px 4px 0"}}/>
              </div>
            )}

            {/* Project list */}
            {!openProjectId&&(
              <div style={{flex:1,overflowY:"auto",padding:"20px"}}>
                {projects.map(pj=>{
                  const prog=getProjectProgress(pj);
                  return (
                    <div key={pj.id} style={{background:"white",borderRadius:16,padding:"16px 18px",marginBottom:10,boxShadow:"0 1px 6px rgba(0,0,0,0.06)",cursor:"pointer",borderRight:`4px solid ${accent}`}} onClick={()=>{setOpenProjectId(pj.id);setProjectView("tasks");}}>
                      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                        <span style={{fontWeight:700,fontSize:15,color:"#1a1a2e"}}>{pj.name}</span>
                        <button onClick={e=>{e.stopPropagation();deleteProject(pj.id);}} style={{background:"none",border:"none",color:"#ddd",cursor:"pointer",fontSize:14}} aria-label="מחק פרויקט">✕</button>
                      </div>
                      <div style={{marginTop:8,height:5,background:"#f0f0f8",borderRadius:10,overflow:"hidden"}}>
                        <div style={{height:"100%",background:accent,width:`${prog}%`,borderRadius:10,transition:"width 0.4s"}}/>
                      </div>
                      <div style={{fontSize:11,color:"#bbb",marginTop:5}}>{pj.tasks.filter(t=>t.done).length}/{pj.tasks.length} משימות • {prog}%</div>
                    </div>
                  );
                })}
                {showNewProject?(
                  <div style={{display:"flex",gap:8,marginTop:8}}>
                    <input autoFocus className="plain-input" style={{flex:1}} placeholder="שם הפרויקט" value={newProjectName} onChange={e=>setNewProjectName(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"){addProject(newProjectName);setNewProjectName("");setShowNewProject(false);}if(e.key==="Escape")setShowNewProject(false);}}/>
                    <button className="add-btn" onClick={()=>{addProject(newProjectName);setNewProjectName("");setShowNewProject(false);}}>צור</button>
                  </div>
                ):(
                  <button className="ghost-btn" style={{width:"100%",marginTop:8}} onClick={()=>setShowNewProject(true)}>+ פרויקט חדש</button>
                )}
              </div>
            )}

            {/* Project detail */}
            {openProject&&(<>
              {/* View tabs */}
              <div style={{display:"flex",gap:0,background:"white",borderBottom:"1px solid #eeeef5",padding:"0 20px",overflowX:"auto"}}>
                {[["overview","סקירה"],["tasks","משימות"],["timeline","לו״ז"],["brainstorm","Brain Storm"],["board","השראה"]].map(([v,label])=>(
                  <button key={v} onClick={()=>setProjectView(v)} style={{padding:"11px 14px",border:"none",background:"none",cursor:"pointer",fontFamily:"'Heebo',sans-serif",fontSize:13,fontWeight:projectView===v?700:400,color:projectView===v?accent:"#aaa",borderBottom:projectView===v?`2px solid ${accent}`:"2px solid transparent",transition:"all 0.15s",whiteSpace:"nowrap"}}>{label}</button>
                ))}
              </div>

              <div style={{flex:1,overflowY:"auto",padding:"20px"}}>

                {/* OVERVIEW dashboard */}
                {projectView==="overview"&&(()=>{
                  const pendingTasks=(openProject.tasks||[]).filter(t=>!t.done);
                  const doneTasks=(openProject.tasks||[]).filter(t=>t.done);
                  const tl=openProject.timeline||[];
                  const bubbles=openProject.bubbles||[];
                  const board=openProject.board||[];
                  const SectionHead=({title,view,count})=>(
                    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10,marginTop:22}}>
                      <span style={{fontWeight:700,fontSize:14,color:"#1a1a2e"}}>{title}{count>0&&<span style={{marginRight:6,background:"#f0f0f8",color:"#8888b8",borderRadius:100,fontSize:11,padding:"1px 7px",fontWeight:600}}>{count}</span>}</span>
                      <button onClick={()=>setProjectView(view)} style={{background:"none",border:"none",cursor:"pointer",fontSize:12,color:accent,fontFamily:"'Heebo',sans-serif",fontWeight:600}}>ראה הכל ←</button>
                    </div>
                  );
                  return(<>
                    {/* Tasks preview */}
                    <SectionHead title="משימות" view="tasks" count={pendingTasks.length}/>
                    {pendingTasks.length===0&&doneTasks.length===0&&<div className="empty-state">אין משימות עדיין</div>}
                    <div style={{background:"white",borderRadius:14,overflow:"hidden",boxShadow:"0 1px 6px rgba(0,0,0,0.06)"}}>
                      {pendingTasks.slice(0,3).map((t,i)=>(
                        <div key={t.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",borderBottom:i<Math.min(pendingTasks.length,3)-1?"1px solid #f5f5fc":"none",borderRight:`3px solid ${accent}`}}>
                          <button onClick={()=>toggleProjectTask(openProject.id,t.id)} aria-label="סמן משימה כבוצעה" style={{width:18,height:18,borderRadius:4,border:`2px solid #dde`,background:"white",cursor:"pointer",flexShrink:0}}/>
                          <span style={{fontSize:13,color:"#1a1a2e",flex:1}}>{t.text}</span>
                          {(t.subtasks||[]).length>0&&<span style={{fontSize:11,color:"#bbb"}}>{(t.subtasks||[]).filter(s=>s.done).length}/{(t.subtasks||[]).length}</span>}
                        </div>
                      ))}
                      {pendingTasks.length>3&&<div style={{padding:"8px 14px",fontSize:12,color:"#bbb",cursor:"pointer"}} onClick={()=>setProjectView("tasks")}>+ עוד {pendingTasks.length-3} משימות</div>}
                    </div>

                    {/* Timeline preview */}
                    <SectionHead title="לוח זמנים" view="timeline" count={tl.length}/>
                    {tl.length===0&&<div className="empty-state">אין אבני דרך עדיין</div>}
                    <div style={{background:"white",borderRadius:14,padding:"12px 16px",boxShadow:"0 1px 6px rgba(0,0,0,0.06)"}}>
                      {tl.slice(0,3).map((item,i)=>(
                        <div key={item.id} style={{display:"flex",alignItems:"center",gap:12,marginBottom:i<Math.min(tl.length,3)-1?10:0}}>
                          <div style={{width:10,height:10,borderRadius:"50%",background:accent,flexShrink:0}}/>
                          <span style={{fontSize:11,color:"#aaa",fontWeight:600,minWidth:50}}>{item.date?new Date(item.date+"T00:00:00").toLocaleDateString("he-IL",{day:"numeric",month:"short"}):""}</span>
                          <span style={{fontSize:13,color:"#1a1a2e"}}>{item.text}</span>
                        </div>
                      ))}
                      {tl.length===0&&<div style={{color:"#ccc",fontSize:12,textAlign:"center"}}>—</div>}
                    </div>

                    {/* Brainstorm preview */}
                    <SectionHead title="Brain Storm" view="brainstorm" count={bubbles.length}/>
                    {bubbles.length===0&&<div className="empty-state">אין רעיונות עדיין</div>}
                    {bubbles.length>0&&(
                      <div style={{display:"flex",flexWrap:"wrap",gap:6,background:"white",borderRadius:14,padding:"14px",boxShadow:"0 1px 6px rgba(0,0,0,0.06)"}}>
                        {bubbles.slice(0,4).map(b=>{
                          const userColors=['#d6f0ff','#c8f0e4','#d0ecd8','#bde8f8','#cceef0']; const aiColors=['#ede0ff','#fde8f0','#f5e0ff','#ffd8e8','#ffe4d8']; const palette=b.type==="ai"?aiColors:userColors; const fill=palette[(b.id.charCodeAt(0)||0)%palette.length];
                          const col=b.type==="ai"?"#7c5cb8":"#1a7a9a";
                          return(
                            <div key={b.id} style={{position:"relative",flexShrink:0}}>
                              <svg width="100" height="62" viewBox="0 0 100 62">
                                <g fill={fill}>
                                  <rect x="8" y="32" width="84" height="26" rx="13"/>
                                  <circle cx="26" cy="32" r="16"/>
                                  <circle cx="46" cy="24" r="20"/>
                                  <circle cx="68" cy="27" r="17"/>
                                  <circle cx="84" cy="34" r="13"/>
                                </g>
                              </svg>
                              <div style={{position:"absolute",top:"52%",left:"50%",transform:"translate(-50%,-50%)",fontSize:10,fontWeight:700,color:col,textAlign:"center",width:82,lineHeight:1.25,pointerEvents:"none"}}>{b.text}</div>
                            </div>
                          );
                        })}
                        {bubbles.length>4&&<div style={{fontSize:12,color:"#bbb",alignSelf:"center",paddingRight:4}}>+{bubbles.length-4}</div>}
                      </div>
                    )}

                    {/* Board preview */}
                    <SectionHead title="לוח השראה" view="board" count={board.length}/>
                    {board.length===0&&<div className="empty-state">אין פריטים עדיין</div>}
                    {board.length>0&&(
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                        {board.slice(0,2).map(item=>(
                          <div key={item.id} style={{background:"white",borderRadius:12,padding:"12px",boxShadow:"0 1px 6px rgba(0,0,0,0.06)",minHeight:70,fontSize:12,color:"#555",lineHeight:1.5}}>{item.text}</div>
                        ))}
                        {board.length>2&&<div style={{background:"#f8f8fc",borderRadius:12,padding:"12px",fontSize:12,color:"#bbb",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}} onClick={()=>setProjectView("board")}>+{board.length-2} עוד</div>}
                      </div>
                    )}
                  </>);
                })()}

                {/* TASKS view */}
                {projectView==="tasks"&&(<>
                  <div style={{display:"flex",gap:8,marginBottom:14}}>
                    <input className="plain-input" style={{flex:1}} placeholder="משימה חדשה..." value={newProjTaskInput} onChange={e=>setNewProjTaskInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&(addProjectTask(openProject.id,newProjTaskInput),setNewProjTaskInput(""))}/>
                    <button className="add-btn" onClick={()=>{addProjectTask(openProject.id,newProjTaskInput);setNewProjTaskInput("");}}>+</button>
                  </div>
                  {openProject.tasks.map(task=>{
                    const doneCount=(task.subtasks||[]).filter(s=>s.done).length;
                    const totalSubs=(task.subtasks||[]).length;
                    const subProg=totalSubs>0?Math.round(doneCount/totalSubs*100):0;
                    return (
                      <div key={task.id} style={{background:"white",borderRadius:14,marginBottom:8,overflow:"hidden",boxShadow:"0 1px 6px rgba(0,0,0,0.06)",borderRight:`3px solid ${task.done?"#4caf50":accent}`}}>
                        <div style={{padding:"12px 14px",display:"flex",alignItems:"center",gap:10}}>
                          <button onClick={()=>toggleProjectTask(openProject.id,task.id)} aria-label={task.done?"בטל סימון משימה":"סמן משימה כבוצעה"} style={{width:20,height:20,borderRadius:4,border:`2px solid ${task.done?"#4caf50":"#dde"}`,background:task.done?"#4caf50":"white",color:"white",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,flexShrink:0}}>
                            {task.done?"✓":""}
                          </button>
                          <span style={{flex:1,fontSize:14,color:task.done?"#bbb":"#1a1a2e",textDecoration:task.done?"line-through":"none",fontWeight:500}}>{task.text}</span>
                          <button onClick={()=>aiBreakProjectTask(openProject.id,task.id,task.text)} style={{background:"none",border:"none",cursor:"pointer",color:aiBreakingProj===task.id?"#ffa726":"#dde",fontSize:13,fontFamily:"'Heebo',sans-serif",fontWeight:600}}>
                            {aiBreakingProj===task.id?<div className="spinner"/>:"מה עושים?"}
                          </button>
                          <button onClick={()=>setExpandedProjTask(expandedProjTask===task.id?null:task.id)} aria-label={expandedProjTask===task.id?"כווץ":"הרחב"} style={{background:"none",border:"none",cursor:"pointer",color:"#dde",fontSize:12}}>
                            {expandedProjTask===task.id?"▲":"▼"}
                          </button>
                          <button onClick={()=>deleteProjectTask(openProject.id,task.id)} style={{background:"none",border:"none",cursor:"pointer",color:"#dde",fontSize:14}} aria-label="מחק משימת פרויקט">✕</button>
                        </div>
                        {totalSubs>0&&(
                          <div style={{height:3,background:"#f0f0f8",margin:"0 14px 8px"}}>
                            <div style={{height:"100%",background:"#4caf50",width:`${subProg}%`,borderRadius:3}}/>
                          </div>
                        )}
                        {(expandedProjTask===task.id||(task.subtasks||[]).length>0)&&(
                          <div style={{padding:"0 14px 12px 14px"}}>
                            {(task.subtasks||[]).map(st=>(
                              <div key={st.id} style={{display:"flex",alignItems:"center",gap:8,padding:"5px 0",borderRight:`2px solid ${st.done?"#4caf50":"#e8e8f2"}`,paddingRight:10,marginRight:-10}}>
                                <button onClick={()=>toggleProjectSubtask(openProject.id,task.id,st.id)} aria-label={st.done?"בטל סימון תת-משימה":"סמן תת-משימה כבוצעה"} style={{width:14,height:14,borderRadius:3,border:`1.5px solid ${st.done?"#4caf50":"#dde"}`,background:st.done?"#4caf50":"white",color:"white",cursor:"pointer",fontSize:9,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
                                  {st.done?"✓":""}
                                </button>
                                <span style={{flex:1,fontSize:13,color:st.done?"#bbb":"#555",textDecoration:st.done?"line-through":"none"}}>{st.text}</span>
                                <button onClick={()=>deleteProjectSubtask(openProject.id,task.id,st.id)} style={{background:"none",border:"none",cursor:"pointer",color:"#dde",fontSize:12}} aria-label="מחק תת-משימה">✕</button>
                              </div>
                            ))}
                            {expandedProjTask===task.id&&(
                              <div style={{display:"flex",gap:6,marginTop:6}}>
                                <input autoFocus className="edit-inline" style={{fontSize:13}} placeholder="תת-משימה..." value={newProjSubtaskInput[task.id]||""} onChange={e=>setNewProjSubtaskInput(p=>({...p,[task.id]:e.target.value}))} onKeyDown={e=>{if(e.key==="Enter"){addProjectSubtask(openProject.id,task.id,newProjSubtaskInput[task.id]||"");setNewProjSubtaskInput(p=>({...p,[task.id]:""}));}if(e.key==="Escape")setExpandedProjTask(null);}}/>
                                <button className="add-btn" style={{padding:"4px 10px",fontSize:13}} aria-label="הוסף תת-משימה" onClick={()=>{addProjectSubtask(openProject.id,task.id,newProjSubtaskInput[task.id]||"");setNewProjSubtaskInput(p=>({...p,[task.id]:""}));}}>+</button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {openProject.tasks.length===0&&<div className="empty-state">אין משימות עדיין</div>}
                </>)}

                {/* TIMELINE view */}
                {projectView==="timeline"&&(<>
                  <div style={{marginBottom:16}}>
                    {(openProject.timeline||[]).map((item,i)=>(
                      <div key={item.id} style={{display:"flex",alignItems:"flex-start",gap:14,marginBottom:16,paddingRight:8,position:"relative"}}>
                        <div style={{position:"absolute",right:0,top:6,bottom:-16,width:2,background:i<(openProject.timeline||[]).length-1?"#eeeef5":"transparent"}}/>
                        <div style={{width:12,height:12,borderRadius:"50%",background:accent,flexShrink:0,marginTop:3,position:"relative",zIndex:1}}/>
                        <div style={{flex:1}}>
                          <div style={{fontSize:11,color:"#bbb",fontWeight:600,marginBottom:2}}>{item.date?new Date(item.date+"T00:00:00").toLocaleDateString("he-IL",{day:"numeric",month:"short"}):""}</div>
                          <div style={{fontSize:14,color:"#1a1a2e",fontWeight:500}}>{item.text}</div>
                        </div>
                        <button onClick={()=>deleteTimelineItem(openProject.id,item.id)} style={{background:"none",border:"none",cursor:"pointer",color:"#dde",fontSize:13}} aria-label="מחק אבן דרך">✕</button>
                      </div>
                    ))}
                  </div>
                  {showNewTimeline?(
                    <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                      <input type="date" className="plain-input" style={{flex:"0 0 auto",fontSize:13,colorScheme:"light"}} value={newTimelineItem.date} onChange={e=>setNewTimelineItem(p=>({...p,date:e.target.value}))}/>
                      <input autoFocus className="plain-input" style={{flex:1}} placeholder="אבן דרך..." value={newTimelineItem.text} onChange={e=>setNewTimelineItem(p=>({...p,text:e.target.value}))} onKeyDown={e=>{if(e.key==="Enter"){addTimelineItem(openProject.id,newTimelineItem.text,newTimelineItem.date);setNewTimelineItem({text:"",date:""});setShowNewTimeline(false);}if(e.key==="Escape")setShowNewTimeline(false);}}/>
                      <button className="add-btn" onClick={()=>{addTimelineItem(openProject.id,newTimelineItem.text,newTimelineItem.date);setNewTimelineItem({text:"",date:""});setShowNewTimeline(false);}}>הוסף</button>
                    </div>
                  ):(
                    <button className="ghost-btn" style={{width:"100%"}} onClick={()=>setShowNewTimeline(true)}>+ הוסף אבן דרך</button>
                  )}
                </>)}

                {/* BRAINSTORM view */}
                {projectView==="brainstorm"&&(<>
                  <div style={{position:"relative",minHeight:320,background:"white",borderRadius:16,padding:"20px",boxShadow:"0 1px 6px rgba(0,0,0,0.06)",marginBottom:14,overflow:"auto"}}>
                    {/* Central topic */}
                    <div style={{textAlign:"center",marginBottom:20}}>
                      <span style={{display:"inline-block",background:`${accent}18`,color:accent,borderRadius:100,padding:"6px 18px",fontWeight:700,fontSize:15}}>{openProject.name}</span>
                    </div>
                    {/* Bubbles */}
                    <div style={{display:"flex",flexWrap:"wrap",gap:12,justifyContent:"center"}}>
                      {(openProject.bubbles||[]).map(b=>{
                        const userColors=['#d6f0ff','#c8f0e4','#d0ecd8','#bde8f8','#cceef0']; const aiColors=['#ede0ff','#fde8f0','#f5e0ff','#ffd8e8','#ffe4d8']; const palette=b.type==="ai"?aiColors:userColors; const fill=palette[(b.id.charCodeAt(0)||0)%palette.length];
                        const col=b.type==="ai"?"#7c5cb8":"#1a7a9a";
                        return(
                        <div key={b.id} style={{position:"relative",cursor:"pointer",flexShrink:0}} title="לחצי למחיקה" onClick={()=>deleteBubble(openProject.id,b.id)}>
                          <svg width="130" height="80" viewBox="0 0 130 80">
                            <g fill={fill}>
                              <rect x="10" y="40" width="110" height="32" rx="16"/>
                              <circle cx="32" cy="40" r="22"/>
                              <circle cx="56" cy="30" r="26"/>
                              <circle cx="83" cy="33" r="22"/>
                              <circle cx="104" cy="42" r="18"/>
                            </g>
                          </svg>
                          <div style={{position:"absolute",top:"55%",left:"50%",transform:"translate(-50%,-50%)",fontSize:11,fontWeight:700,color:col,textAlign:"center",width:108,lineHeight:1.3,pointerEvents:"none"}}>{b.text}</div>
                        </div>
                        );
                      })}
                    </div>
                    {(openProject.bubbles||[]).length===0&&<div style={{color:"#ccc",textAlign:"center",fontSize:13,marginTop:40}}>הוסיפי רעיונות למטה</div>}
                  </div>
                  <div style={{display:"flex",gap:8}}>
                    <input className="plain-input" style={{flex:1}} placeholder="רעיון חדש..." value={newBubbleText} onChange={e=>setNewBubbleText(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"){addBubble(openProject.id,newBubbleText,"user");setNewBubbleText("");}}}/>
                    <button className="add-btn" aria-label="הוסף רעיון" onClick={()=>{addBubble(openProject.id,newBubbleText,"user");setNewBubbleText("");}}>+</button>
                    <button onClick={()=>aiThinkBubbles(openProject.id,openProject.name)} style={{border:`1.5px solid ${accent}`,borderRadius:12,background:"white",color:accent,padding:"0 14px",cursor:"pointer",fontFamily:"'Heebo',sans-serif",fontWeight:700,fontSize:13,whiteSpace:"nowrap"}}>
                      {aiThinkingProj?<div className="spinner" style={{borderTopColor:accent,borderColor:`${accent}33`}}/>:"מה אתה חושב? 🤖"}
                    </button>
                  </div>
                </>)}

                {/* BOARD view */}
                {projectView==="board"&&(<>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
                    {(openProject.board||[]).map(item=>(
                      <div key={item.id} style={{background:"white",borderRadius:14,padding:"14px",boxShadow:"0 1px 6px rgba(0,0,0,0.06)",minHeight:100,position:"relative",fontSize:13,color:"#555",lineHeight:1.5}}>
                        {item.text}
                        <button onClick={()=>deleteBoardItem(openProject.id,item.id)} style={{position:"absolute",top:8,left:8,background:"none",border:"none",color:"#dde",cursor:"pointer",fontSize:12}} aria-label="מחק פריט השראה">✕</button>
                      </div>
                    ))}
                  </div>
                  <div style={{display:"flex",gap:8}}>
                    <input className="plain-input" style={{flex:1}} placeholder="הוסיפי השראה..." value={newBoardText} onChange={e=>setNewBoardText(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"){addBoardItem(openProject.id,newBoardText);setNewBoardText("");}}}/>
                    <button className="add-btn" aria-label="הוסף פריט השראה" onClick={()=>{addBoardItem(openProject.id,newBoardText);setNewBoardText("");}}>+</button>
                  </div>
                </>)}

              </div>
            </>)}
          </div>
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
          <input className="search-bar" placeholder="חיפוש משימות..." readOnly style={{cursor:"text"}}/>

          <div className="tab-bar">
            {tabs.map(t=>(
              <button key={t.id} className={`tab-pill${activeTab===t.id?" active":""}`} style={{"--accent":t.color}} onClick={()=>{setActiveTab(t.id);setActiveSubtab(null);}}>
                <span className="tab-dot" style={{background:t.color}}/>{t.label}
                {activeTab===t.id&&(<>
                  <span role="button" tabIndex={0} aria-label="קבע ככרטיסייה ברירת מחדל" onClick={e=>{e.stopPropagation();setDefaultTab(t.id);}} onKeyDown={e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();e.stopPropagation();setDefaultTab(t.id);}}} style={{fontSize:12,cursor:"pointer",color:profiles[activeProfileId]?.defaultTab===t.id?"#f4a261":"#ddd",marginRight:-2,lineHeight:1}}>★</span>
                  <span className="icon-btn del" role="button" tabIndex={0} aria-label="מחק כרטיסייה" style={{fontSize:11,marginRight:-2,padding:0,minWidth:"unset",minHeight:"unset"}} onClick={e=>{e.stopPropagation();deleteTab(t.id);}} onKeyDown={e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();e.stopPropagation();deleteTab(t.id);}}}>✕</span>
                </>)}
              </button>
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
                                      <input autoFocus className="edit-inline" value={editText} onChange={e=>setEditText(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")saveEdit("reminder",item.id);if(e.key==="Escape"){setEditId(null);setEditAlertDate("");}}}/>
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
                              <button className="icon-btn" style={{fontSize:18}} aria-label="ערוך תזכורת" onClick={()=>{setEditId(item.id);setEditText(item.text);setEditAlertDate(item.alertDate||"");}}>✎</button>
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
