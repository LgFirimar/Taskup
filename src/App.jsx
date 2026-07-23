import { useState, useEffect, useMemo, useRef } from "react";
import SplashScreen from "./SplashScreen";
import ProfileModal from "./components/ProfileModal";
import ReminderAlertModal from "./components/ReminderAlertModal";
import BigCelebrate from "./components/BigCelebrate";
import QuickCapture from "./components/QuickCapture";
import ListsMenu from "./components/ListsMenu";
import ListDetailOverlay from "./components/ListDetailOverlay";
import EmailOverlay from "./components/EmailOverlay";
import EmailSummariesOverview from "./components/EmailSummariesOverview";
import EmailRuleDetail from "./components/EmailRuleDetail";
import EmailFolderView from "./components/EmailFolderView";
import EmailInstructionsLog from "./components/EmailInstructionsLog";
import EmailFoldersManager from "./components/EmailFoldersManager";
import ProjectsOverlay from "./components/ProjectsOverlay";
import VoiceHelpModal from "./components/VoiceHelpModal";
import SidePills from "./components/SidePills";
import VoiceIndicator from "./components/VoiceIndicator";
import AppHeader from "./components/AppHeader";
import TabContent from "./components/TabContent";
import UndoToast from "./components/UndoToast";
import CloudBackupModal from "./components/CloudBackupModal";
import PushNotificationsModal from "./components/PushNotificationsModal";
import { APP_CSS } from "./appStyles";
import { useVoiceCommands } from "./hooks/useVoiceCommands";
import { usePushNotifications } from "./hooks/usePushNotifications";
import {
  uid, STORAGE_KEY, WORKER_URL, PRIO_CYCLE, TAB_COLORS, DEFAULT_GMAIL_CLIENT_ID,
  today, getReminderStatus, loadStorage, computeInitialAlerts, buildGmailSearchQuery,
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
  const [editDueDate,setEditDueDate] = useState(""); // optional due date, tasks only

  // ── Search ─────────────────────────────────────────────────────────────────
  const [searchQuery,setSearchQuery] = useState("");

  // ── Features ──────────────────────────────────────────────────────────────
  const [completingId,setCompletingId] = useState(null);
  const [lastDeleted,setLastDeleted] = useState(null); // {type,item,tabId,subtabId} — for the undo toast
  const undoTimeoutRef = useRef(null);
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
  // Persisted across reloads (unlike before) so marking an email done/pending
  // and the "only show what hasn't been handled yet" view survive a refresh.
  // Each entry: {id (threadId), ruleId, subject, sender, date, results, archived, status}
  // where status is null (untouched) | "pending" | "done".
  const [emailSummaries,setEmailSummaries] = useState(()=>{ try{return JSON.parse(localStorage.getItem("email_summaries"))||[];}catch{return[];} });
  const [emailLoading,setEmailLoading] = useState(false);
  const [emailStatusMsg,setEmailStatusMsg] = useState("");
  const [showNewRule,setShowNewRule] = useState(false);
  const [newRule,setNewRule] = useState({sender:"",subject:"",formats:["bullets"]});
  // A manual override (saved per-browser) always wins; otherwise fall back to
  // the app-wide Client ID baked in at build time, if one was configured.
  const [gmailClientIdOverride,setGmailClientIdOverride] = useState(()=>localStorage.getItem("gmail_client_id")||"");
  const gmailClientId = gmailClientIdOverride || DEFAULT_GMAIL_CLIENT_ID;
  const setGmailClientId = setGmailClientIdOverride;
  const [showClientIdInput,setShowClientIdInput] = useState(false);
  const [gmailAuthError,setGmailAuthError] = useState("");
  // Gmail labels (folders) — used by the "move matching mail out of the inbox"
  // feature on each rule, and by the read-only folder-contents viewer.
  const [gmailLabels,setGmailLabels] = useState([]);
  const [labelsLoading,setLabelsLoading] = useState(false);
  const [labelsError,setLabelsError] = useState("");
  const [archiveErrorMsg,setArchiveErrorMsg] = useState("");
  const [ruleSyncingId,setRuleSyncingId] = useState(null); // rule id currently being individually re-synced

  // "הוראות" — lightweight rules that ONLY sort-to-folder or trash matching
  // mail (no AI summarization, no done/pending triage). Kept as a fully
  // separate list from the summarization rules above, with its own
  // processed-mail log rather than a per-rule browsing page — there's no
  // AI content to review, just a record of what happened.
  const [emailInstructions,setEmailInstructions] = useState(()=>{ try{return JSON.parse(localStorage.getItem("email_instructions"))||[];}catch{return[];} });
  const [emailInstructionLog,setEmailInstructionLog] = useState(()=>{ try{return JSON.parse(localStorage.getItem("email_instruction_log"))||[];}catch{return[];} });
  const [showNewInstruction,setShowNewInstruction] = useState(false);
  const [newInstruction,setNewInstruction] = useState({sender:"",subject:"",action:"folder"});

  // ── Email sub-pages (מיילים מסוכמים) ──────────────────────────────────────
  // These are separate full-screen "pages" reached from the email home overlay.
  // Navigation is flat (not a stack): every sub-page has exactly two nav
  // actions — back to the email home overlay, or straight to the app's main
  // screen — so closing/opening never needs to remember how deep we are.
  const [showEmailOverview,setShowEmailOverview] = useState(false); // rules list ("מיילים מסוכמים")
  const [openRuleId,setOpenRuleId] = useState(null); // rule detail page
  const [showRuleFolder,setShowRuleFolder] = useState(false); // folder-contents viewer for the open rule
  const [folderMessages,setFolderMessages] = useState([]);
  const [folderLoading,setFolderLoading] = useState(false);
  const [folderError,setFolderError] = useState("");
  const [showInstructionsLog,setShowInstructionsLog] = useState(false); // "הוראות" processed-mail log
  const [showFoldersManager,setShowFoldersManager] = useState(false); // rename/delete Gmail labels

  // Every one of these is written to be fully exclusive — it turns off every
  // OTHER email sub-page flag, not just turns on its own. Two of these
  // full-screen overlays ever being mounted at once is more than a visual
  // glitch: each runs its own useFocusTrap, and two active traps fight over
  // focus (each pulling it back into its own container), which recurses
  // synchronously forever. Keep these as the only place that touches these
  // flags — never toggle showEmail/showEmailOverview/openRuleId/showRuleFolder/
  // showInstructionsLog/showFoldersManager directly from a component.
  const openEmailOverview = () => { setShowEmail(false); setShowEmailOverview(true); setOpenRuleId(null); setShowRuleFolder(false); setShowInstructionsLog(false); setShowFoldersManager(false); };
  const goEmailAppHome = () => { setShowEmail(false); setShowEmailOverview(false); setOpenRuleId(null); setShowRuleFolder(false); setShowInstructionsLog(false); setShowFoldersManager(false); };
  const goEmailHome = () => { setShowEmailOverview(false); setOpenRuleId(null); setShowRuleFolder(false); setShowInstructionsLog(false); setShowFoldersManager(false); setShowEmail(true); };
  const openRuleDetail = (ruleId) => { setShowEmail(false); setShowEmailOverview(false); setOpenRuleId(ruleId); setShowRuleFolder(false); setShowInstructionsLog(false); setShowFoldersManager(false); };
  const closeRuleDetail = () => { setOpenRuleId(null); setShowRuleFolder(false); setShowEmail(false); setShowEmailOverview(true); };
  const openInstructionsLog = () => { setShowEmail(false); setShowEmailOverview(false); setOpenRuleId(null); setShowRuleFolder(false); setShowInstructionsLog(true); setShowFoldersManager(false); };
  const openFoldersManager = () => { setShowEmail(false); setShowEmailOverview(false); setOpenRuleId(null); setShowRuleFolder(false); setShowInstructionsLog(false); setShowFoldersManager(true); fetchGmailLabels(); };

  // ── Cloud backup (Google Drive) ───────────────────────────────────────────
  // Reuses the same Google Client ID as the Gmail feature (a Client ID isn't
  // scope-specific — this just requests a separate token with drive.file
  // access, kept entirely independent of the Gmail token/connection).
  const [showCloudBackup,setShowCloudBackup] = useState(false);
  const [driveToken,setDriveToken] = useState(()=>localStorage.getItem("drive_token")||null);
  const [driveFileId,setDriveFileId] = useState(()=>localStorage.getItem("drive_backup_file_id")||null);
  const [lastBackupAt,setLastBackupAt] = useState(()=>localStorage.getItem("drive_last_backup")||null);
  const [backupInProgress,setBackupInProgress] = useState(false);
  const [restoreInProgress,setRestoreInProgress] = useState(false);
  const [driveAuthError,setDriveAuthError] = useState("");
  const autoBackupTimerRef = useRef(null);

  // ── Push notifications (reminders only — see usePushNotifications.js) ────
  const [showPushModal,setShowPushModal] = useState(false);
  const { pushSupported, pushSubscribed, pushBusy, pushError, setPushError, enablePush, disablePush } = usePushNotifications({ profiles });

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
    localStorage.setItem("email_summaries",JSON.stringify(emailSummaries));
  },[emailSummaries]);

  useEffect(()=>{
    localStorage.setItem("email_instructions",JSON.stringify(emailInstructions));
  },[emailInstructions]);

  useEffect(()=>{
    localStorage.setItem("email_instruction_log",JSON.stringify(emailInstructionLog));
  },[emailInstructionLog]);

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

  // Applies the user-selected subset of AI-suggested items (from
  // ProjectImportModal) to a project in one batched update, rather than
  // looping many separate add* calls.
  const applyProjectImport = (pid, selection) => {
    updateProject(pid, pj => ({
      ...pj,
      tasks: [
        ...pj.tasks,
        ...(selection.tasks||[]).filter(t=>t?.text?.trim()).map(t => ({
          id: uid(), text: t.text.trim(), done: false,
          subtasks: (t.subtasks||[]).filter(st=>st?.trim()).map(st => ({ id: uid(), text: st.trim(), done: false })),
        })),
      ],
      timeline: [
        ...(pj.timeline||[]),
        ...(selection.timeline||[]).filter(it=>it?.text?.trim()).map(it => ({ id: uid(), text: it.text.trim(), date: it.date||"" })),
      ].sort((a,b)=>(a.date||"").localeCompare(b.date||"")),
      bubbles: [
        ...(pj.bubbles||[]),
        ...(selection.bubbles||[]).filter(t=>typeof t==="string"&&t.trim()).map(text => ({ id: uid(), text: text.trim(), type: "user" })),
      ],
      board: [
        ...(pj.board||[]),
        ...(selection.board||[]).filter(t=>typeof t==="string"&&t.trim()).map(text => ({ id: uid(), text: text.trim() })),
      ],
    }));
  };

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
  const saveEmailInstructions = (list) => { setEmailInstructions(list); localStorage.setItem("email_instructions", JSON.stringify(list)); };

  const connectGmail = () => {
    const clientId = gmailClientId.trim();
    if (!clientId) { setShowClientIdInput(true); return; }
    setGmailAuthError("");

    // Load Google Identity Services script if not already loaded
    const initGIS = () => {
      try{
        const client = window.google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          // gmail.modify (read + label/organize, no permanent delete) — a superset
          // of the old gmail.readonly, needed so rules can also create Gmail labels
          // and move matching mail out of the inbox, not just read/summarize it.
          scope: "https://www.googleapis.com/auth/gmail.modify",
          callback: (response) => {
            if (response.access_token) {
              // Google's consent screen lets the user un-check individual permissions —
              // if she unchecked the Gmail one, we still get a token, but every Gmail
              // API call will fail with 403 later. Catch that here instead of leaving
              // her to hit a confusing 403 when she tries to summarize.
              if (response.scope && !response.scope.includes("gmail.modify")) {
                console.error("Gmail auth: token granted without gmail.modify scope",response.scope);
                setGmailAuthError("ההתחברות הצליחה אבל לא אישרת את ההרשאה לקריאה ועריכה של Gmail (יכול להיות שהצ'קבוקס של \"קריאת המייל שלך וניהולו\" בוטל בזמן האישור). נסי להתחבר שוב ווודאי שכל ההרשאות מסומנות.");
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

  // Note: emailSummaries (and the done/pending marks on them) are intentionally
  // NOT cleared here — they're a persisted local record of what's been
  // triaged, independent of whether Gmail happens to be connected right now.
  const disconnectGmail = (message="") => { setGmailToken(null); localStorage.removeItem("gmail_token"); setGmailAuthError(message); setGmailLabels([]); };

  const editGmailClientId = () => { setGmailAuthError(""); setShowClientIdInput(true); };

  // Gmail labels (folders) the "move out of inbox" feature can target — fetched
  // once on connect and re-fetchable manually (e.g. after creating a label
  // directly in Gmail itself, outside Taskup).
  const fetchGmailLabels = async () => {
    if (!gmailToken) return;
    setLabelsLoading(true);
    setLabelsError("");
    try {
      const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/labels", { headers: { Authorization: `Bearer ${gmailToken}` } });
      if (res.status === 401) { disconnectGmail("החיבור לחשבון Gmail פג תוקף (זה קורה אחרי כשעה) — לחצי על \"התחבר ל-Gmail\" למעלה כדי להתחבר מחדש."); return; }
      if (!res.ok) { setLabelsError("לא הצלחתי לטעון את התיקיות (תוויות) מ-Gmail."); return; }
      const data = await res.json();
      // Only "user" labels are useful move-targets — system labels like
      // INBOX/SPAM/CATEGORY_* aren't real destination folders.
      const userLabels = (data.labels || []).filter(l => l.type === "user").sort((a,b) => a.name.localeCompare(b.name, "he"));
      setGmailLabels(userLabels);
    } catch (e) {
      console.error("fetchGmailLabels failed", e);
      setLabelsError("שגיאה בטעינת התיקיות מ-Gmail.");
    } finally {
      setLabelsLoading(false);
    }
  };

  // Creates a Gmail label by name if it doesn't already exist, self-healing
  // on a 409 (name already taken — e.g. created directly in Gmail since, or
  // by another rule/instruction) by looking it up instead of failing. Pure
  // Gmail-side resolution — doesn't touch any rule/instruction state itself;
  // callers persist the resolved id onto whichever list they own.
  const resolveOrCreateLabel = async (name) => {
    try {
      const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/labels", {
        method: "POST",
        headers: { Authorization: `Bearer ${gmailToken}`, "content-type": "application/json" },
        body: JSON.stringify({ name, labelListVisibility: "labelShow", messageListVisibility: "show" }),
      });
      if (res.ok) {
        const created = await res.json();
        setGmailLabels(prev => [...prev, created].sort((a,b) => a.name.localeCompare(b.name, "he")));
        return created.id;
      }
      if (res.status === 409) {
        const listRes = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/labels", { headers: { Authorization: `Bearer ${gmailToken}` } });
        const listData = await listRes.json().catch(() => ({}));
        // Gmail enforces label-name uniqueness case-insensitively (can't have
        // both "Work" and "work"), which is exactly why we got the 409 — so
        // the lookup here has to match case-insensitively too, or a label
        // that exists with different casing than what was typed would never
        // be found, silently leaving labelId unset.
        const lower = name.toLowerCase();
        return (listData.labels || []).find(l => l.name.toLowerCase() === lower)?.id || null;
      }
      if (res.status === 401) { disconnectGmail("החיבור לחשבון Gmail פג תוקף — התחברי מחדש."); return null; }
      if (res.status === 403) { setArchiveErrorMsg("אין הרשאה ליצור תיקיות ב-Gmail — התנתקי והתחברי מחדש כדי לאשר הרשאת עריכה (לא רק קריאה)."); return null; }
      return null;
    } catch (e) {
      console.error("resolveOrCreateLabel failed", e);
      return null;
    }
  };

  // Ensures a summary rule's target label actually exists in Gmail, creating
  // it on first use if it was set up as a "new label" choice. Persists the
  // resolved id onto the rule so this only has to happen once.
  const ensureRuleLabel = async (rule) => {
    if (rule.archiveLabelId) return rule.archiveLabelId;
    if (!rule.archiveLabelName || !rule.archiveLabelName.trim()) return null;
    const id = await resolveOrCreateLabel(rule.archiveLabelName.trim());
    if (id) setEmailRules(prev => { const next = prev.map(r => r.id === rule.id ? { ...r, archiveLabelId: id } : r); localStorage.setItem("email_rules", JSON.stringify(next)); return next; });
    return id;
  };

  // Same idea for a "הוראה" instruction's target label.
  const ensureInstructionLabel = async (instruction) => {
    if (instruction.labelId) return instruction.labelId;
    if (!instruction.labelName || !instruction.labelName.trim()) return null;
    const id = await resolveOrCreateLabel(instruction.labelName.trim());
    if (id) setEmailInstructions(prev => { const next = prev.map(r => r.id === instruction.id ? { ...r, labelId: id } : r); localStorage.setItem("email_instructions", JSON.stringify(next)); return next; });
    return id;
  };

  // Renames a Gmail label in place (labels.patch — partial update, only the
  // name field is sent). Updates the local gmailLabels cache on success, plus
  // any rule/instruction that had snapshotted the old name at creation time,
  // so renames show up everywhere immediately rather than only after a
  // manual "🔄 רענני" of the labels list.
  const renameGmailLabel = async (labelId, newName) => {
    const trimmed = (newName || "").trim();
    if (!trimmed) return false;
    try {
      const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/labels/${labelId}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${gmailToken}`, "content-type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      if (res.status === 401) { disconnectGmail("החיבור לחשבון Gmail פג תוקף — התחברי מחדש."); return false; }
      if (res.status === 409) { setArchiveErrorMsg(`כבר קיימת תיקייה בשם "${trimmed}".`); return false; }
      if (res.status === 403) { setArchiveErrorMsg("אין הרשאה לשנות תיקיות ב-Gmail — התנתקי והתחברי מחדש כדי לאשר הרשאת עריכה (לא רק קריאה)."); return false; }
      if (!res.ok) { setArchiveErrorMsg("שינוי השם נכשל — נסי שוב."); return false; }
      setGmailLabels(prev => prev.map(l => l.id === labelId ? { ...l, name: trimmed } : l).sort((a,b) => a.name.localeCompare(b.name, "he")));
      setEmailRules(prev => { const next = prev.map(r => r.archiveLabelId === labelId ? { ...r, archiveLabelName: trimmed } : r); localStorage.setItem("email_rules", JSON.stringify(next)); return next; });
      setEmailInstructions(prev => { const next = prev.map(r => r.labelId === labelId ? { ...r, labelName: trimmed } : r); localStorage.setItem("email_instructions", JSON.stringify(next)); return next; });
      return true;
    } catch (e) {
      console.error("renameGmailLabel failed", e);
      setArchiveErrorMsg("שגיאה בשינוי שם התיקייה.");
      return false;
    }
  };

  // Deletes a Gmail label entirely (the mail inside it is NOT deleted — it
  // just loses that label, same as deleting a folder-only label in Gmail
  // itself). Any rule/instruction still pointing at it keeps its old id —
  // the next sync attempt to move mail there will just fail silently via
  // archiveThreadToLabel's normal !res.ok path, same as any other Gmail
  // error; the user can re-point the rule at a different folder.
  const deleteGmailLabel = async (labelId) => {
    try {
      const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/labels/${labelId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${gmailToken}` },
      });
      if (res.status === 401) { disconnectGmail("החיבור לחשבון Gmail פג תוקף — התחברי מחדש."); return false; }
      if (res.status === 403) { setArchiveErrorMsg("אין הרשאה למחוק תיקיות ב-Gmail — התנתקי והתחברי מחדש כדי לאשר הרשאת עריכה (לא רק קריאה)."); return false; }
      if (!res.ok && res.status !== 404) { setArchiveErrorMsg("מחיקת התיקייה נכשלה — נסי שוב."); return false; }
      setGmailLabels(prev => prev.filter(l => l.id !== labelId));
      return true;
    } catch (e) {
      console.error("deleteGmailLabel failed", e);
      setArchiveErrorMsg("שגיאה במחיקת התיקייה.");
      return false;
    }
  };

  // Moves an entire Gmail thread out of the inbox and files it under a label —
  // this is the actual "create folder + move mail there" action.
  const archiveThreadToLabel = async (threadId, labelId) => {
    if (!labelId) return false;
    try {
      const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/threads/${threadId}/modify`, {
        method: "POST",
        headers: { Authorization: `Bearer ${gmailToken}`, "content-type": "application/json" },
        body: JSON.stringify({ addLabelIds: [labelId], removeLabelIds: ["INBOX"] }),
      });
      if (res.status === 401) { disconnectGmail("החיבור לחשבון Gmail פג תוקף — התחברי מחדש."); return false; }
      if (res.status === 403) { setArchiveErrorMsg("אין הרשאה להעביר מיילים ב-Gmail — התנתקי והתחברי מחדש כדי לאשר הרשאת עריכה (לא רק קריאה)."); return false; }
      return res.ok;
    } catch (e) {
      console.error("archiveThreadToLabel failed", e);
      return false;
    }
  };

  // Moves a thread to Gmail's Trash (NOT permanent deletion — trash.messages
  // are recoverable there for ~30 days, same as deleting an email by hand in
  // Gmail itself). gmail.modify explicitly allows this without needing any
  // extra scope.
  const trashThread = async (threadId) => {
    try {
      const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/threads/${threadId}/trash`, {
        method: "POST",
        headers: { Authorization: `Bearer ${gmailToken}` },
      });
      if (res.status === 401) { disconnectGmail("החיבור לחשבון Gmail פג תוקף — התחברי מחדש."); return false; }
      if (res.status === 403) { setArchiveErrorMsg("אין הרשאה למחוק מיילים ב-Gmail — התנתקי והתחברי מחדש כדי לאשר הרשאת עריכה (לא רק קריאה)."); return false; }
      return res.ok;
    } catch (e) {
      console.error("trashThread failed", e);
      return false;
    }
  };

  // Manual per-email triage mark — "done" / "pending" / back to untouched.
  // This is deliberately the only per-email action exposed in the UI (no
  // delete/move-to-folder button per card) — archiving is either automatic
  // (rule.archiveAuto) or viewed read-only via the folder page.
  const setSummaryStatus = (ruleId, threadId, status) => {
    setEmailSummaries(prev => prev.map(s => (s.ruleId === ruleId && s.id === threadId) ? { ...s, status } : s));
  };

  // Lists (lightly, metadata-only — no AI summarization) the current contents
  // of a Gmail label, so the "📁 תיקייה" button can show what's actually been
  // moved there, live from Gmail, without Taskup needing to track it itself.
  const fetchFolderMessages = async (labelId) => {
    if (!gmailToken || !labelId) return;
    setFolderLoading(true);
    setFolderError("");
    try {
      const listRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?labelIds=${encodeURIComponent(labelId)}&maxResults=25`, { headers: { Authorization: `Bearer ${gmailToken}` } });
      if (listRes.status === 401) { disconnectGmail("החיבור לחשבון Gmail פג תוקף — התחברי מחדש."); return; }
      if (!listRes.ok) { setFolderError("לא הצלחתי לטעון את תוכן התיקייה."); return; }
      const listData = await listRes.json();
      const ids = (listData.messages || []).map(m => m.id);
      const messages = [];
      for (const id of ids) {
        try {
          const mRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`, { headers: { Authorization: `Bearer ${gmailToken}` } });
          if (!mRes.ok) continue;
          const mData = await mRes.json();
          const headers = mData.payload?.headers || [];
          messages.push({
            id,
            subject: headers.find(h=>h.name==="Subject")?.value || "(ללא נושא)",
            sender: headers.find(h=>h.name==="From")?.value || "",
            date: headers.find(h=>h.name==="Date")?.value || "",
          });
        } catch { /* skip a message we couldn't read metadata for */ }
      }
      setFolderMessages(messages);
    } catch (e) {
      console.error("fetchFolderMessages failed", e);
      setFolderError("שגיאה בטעינת תוכן התיקייה.");
    } finally {
      setFolderLoading(false);
    }
  };

  const openRuleFolder = (labelId) => { setShowEmail(false); setShowEmailOverview(false); setShowRuleFolder(true); setFolderMessages([]); fetchFolderMessages(labelId); };

  // Refresh the label list whenever we (re)connect, so a newly-connected user
  // (or one who just re-authed with the new scope) sees her folders right away.
  // Deferred via setTimeout (same pattern as the Drive auto-backup effect below)
  // so the fetch's setState calls happen outside the effect's synchronous body.
  useEffect(() => {
    if (!gmailToken) return;
    const t = setTimeout(() => { fetchGmailLabels(); }, 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gmailToken]);

  // Does the actual search+fetch+summarize+auto-archive work for ONE rule.
  // Threads already present in `existingKeys` (i.e. already synced before, in
  // ANY status — untouched/pending/done) are skipped entirely: no re-fetch,
  // no re-summarize, no re-archive attempt. This is what makes a sync
  // incremental ("what's new since last time") instead of replacing
  // everything and losing done/pending marks. Returns data only — doesn't
  // touch component state, so both the global sync and a single-rule
  // re-sync can share it.
  const runRuleSync = async (rule, existingKeys) => {
    const ruleLabel = [rule.sender&&`מ: ${rule.sender}`, rule.subject&&`מילים: ${rule.subject}`].filter(Boolean).join(" | ") || "(חוק ללא תנאים)";
    const newEntries = [];
    let threadsFoundCount = 0;
    let failures = 0;
    let authExpired = false;
    let debugLine = "";
    const failureDetails = [];
    try {
      const q = buildGmailSearchQuery(rule);

      const searchRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/threads?q=${encodeURIComponent(q)}&maxResults=5`,
        { headers: { Authorization: `Bearer ${gmailToken}` } }
      );
      if (searchRes.status === 401) {
        disconnectGmail("החיבור לחשבון Gmail פג תוקף (זה קורה אחרי כשעה) — לחצי על \"התחבר ל-Gmail\" למעלה כדי להתחבר מחדש, ואז נסי לסכם שוב.");
        authExpired = true;
        return { newEntries, threadsFoundCount, failures, debugLine, authExpired };
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
      threadsFoundCount = threads.length;
      debugLine = `${ruleLabel} → שאילתה: "${q}" → ${threads.length} תוצאות`;

      // Skip threads we've already synced before (in any status) — this is
      // what makes a sync incremental instead of re-summarizing (and
      // re-archiving!) the same mail every single time.
      const freshThreads = threads.filter(t => !existingKeys.has(`${rule.id}:${t.id}`));

      // Resolve (or create, on first use) this rule's target Gmail label once
      // per rule per sync, not once per thread — avoids redundant create calls.
      const ruleLabelId = (rule.archiveAuto && freshThreads.length && (rule.archiveLabelId || rule.archiveLabelName))
        ? await ensureRuleLabel(rule)
        : null;

      for (const thread of freshThreads.slice(0, 3)) {
        const tRes = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/threads/${thread.id}?format=full`,
          { headers: { Authorization: `Bearer ${gmailToken}` } }
        );
        if (!tRes.ok) { console.error(`Gmail thread fetch failed: ${tRes.status}`); failures++; continue; }
        const tData = await tRes.json();
        const msg = tData.messages?.[0];
        if (!msg) continue;
        const headers = msg.payload?.headers || [];
        const subject = headers.find(h=>h.name==="Subject")?.value || "";
        const sender = headers.find(h=>h.name==="From")?.value || "";
        const date = headers.find(h=>h.name==="Date")?.value || "";

        // Decode body. Gmail's body data is base64url without padding —
        // atob() needs it re-padded to a multiple of 4 or it can throw on
        // otherwise-valid data, so pad defensively rather than assume the
        // browser's atob() is lenient about it.
        const decodeBase64Url = (data) => {
          try {
            const b64 = data.replace(/-/g,"+").replace(/_/g,"/");
            return atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4));
          } catch (decodeErr) {
            console.error("body part decode failed", decodeErr);
            return "";
          }
        };
        const getBody = (part) => {
          if (part.body?.data) return decodeBase64Url(part.body.data);
          if (part.parts) return part.parts.map(getBody).join(" ");
          return "";
        };
        const rawBody = getBody(msg.payload);
        const cleanedBody = rawBody.replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim();
        // Fallback for the (apparently not-so-rare) messages our own MIME
        // walk fails to pull any text out of — e.g. body content that's only
        // available via a separate attachment fetch we don't do, or unusual
        // nesting. Gmail always includes a short plain-text `snippet` on the
        // message resource regardless of MIME structure, so it's a reliable
        // fallback rather than failing the summarization outright.
        const body = cleanedBody || (msg.snippet || "").trim();

        // A rule can request several summary formats at once — each one is
        // its own AI call (the worker only knows how to produce one format
        // per request) and they're kept separate so the UI can show each
        // under its own collapsible heading instead of one merged blob.
        const formats = rule.formats?.length ? rule.formats : [rule.format || "bullets"];
        const results = {};
        if (!body) {
          // Both our own MIME walk AND Gmail's own snippet came up empty —
          // this is a message with genuinely no extractable text (e.g. a
          // purely image/attachment email), not something an AI call can fix
          // no matter how many times it's retried. Show that plainly per
          // format — as a normal completed result, not an error — instead of
          // spending an AI call on it. If this is what was actually behind
          // the "Missing body" failures, it'll show up as this message on
          // the rule's page instead of the red error banner.
          for (const fmt of formats) results[fmt] = "אין תוכן טקסטואלי במייל הזה לסיכום (המייל מבוסס כנראה כולו על תמונה/קובץ מצורף).";
        } else for (const fmt of formats) {
          try {
            const sumRes = await fetch(`${WORKER_URL}/summarize-email`, {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ subject, sender, body: body.slice(0,3000), format: fmt }),
            });
            if (!sumRes.ok) {
              let detail = "";
              try { const errBody = await sumRes.json(); detail = errBody?.error || ""; } catch { /* not JSON */ }
              console.error(`summarize-email failed (${fmt}): ${sumRes.status}`, detail);
              failureDetails.push(`${fmt}: HTTP ${sumRes.status}${detail?` — ${detail}`:""}`);
              failures++; continue;
            }
            const sumData = await sumRes.json();
            // Defense in depth: the worker already retries+falls back on an
            // empty AI completion, but if an older worker deploy is still
            // live, don't let a blank section render silently either.
            results[fmt] = (sumData.result && sumData.result.trim())
              ? sumData.result
              : "לא התקבל תוכן עבור הפורמט הזה. נסי לגבות שוב.";
          } catch (fmtErr) {
            // A thrown fetch (as opposed to a non-ok response) almost always
            // means the request never reached the worker at all — a CORS
            // rejection or a network failure — which reads very differently
            // to someone debugging this than "the AI failed to summarize".
            console.error(`summarize-email error (${fmt})`, fmtErr);
            failureDetails.push(`${fmt}: ${fmtErr.message || "בקשת הרשת נכשלה (ייתכן חסימת CORS)"}`);
            failures++;
          }
        }
        if (Object.keys(results).length) {
          // If this rule auto-archives, move the thread out of the inbox right
          // away — visible later as a badge in the rule's card, and always
          // viewable (live) via the "📁 תיקייה" folder page.
          const archived = ruleLabelId ? await archiveThreadToLabel(thread.id, ruleLabelId) : false;
          newEntries.push({ id: thread.id, subject, sender, date, results, ruleId: rule.id, archived, status: null });
        }
      }
    } catch(e) {
      console.error(e);
      failures++;
      debugLine = `${ruleLabel} → שגיאה: ${e.message}`;
    }
    return { newEntries, threadsFoundCount, failures, debugLine, authExpired, failureDetails };
  };

  // Does the actual search+trash/sort work for ONE "הוראה" — mirrors
  // runRuleSync but with no AI summarization at all: matching NEW threads
  // (per existingKeys, same skip-if-already-processed pattern) just get the
  // configured action applied and logged.
  const runInstructionSync = async (instruction, existingKeys) => {
    const newLogEntries = [];
    let failures = 0;
    let authExpired = false;
    let debugLine = "";
    const label = [instruction.sender&&`מ: ${instruction.sender}`, instruction.subject&&`מילים: ${instruction.subject}`].filter(Boolean).join(" | ") || "(הוראה ללא תנאים)";
    try {
      const q = buildGmailSearchQuery(instruction);
      const searchRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/threads?q=${encodeURIComponent(q)}&maxResults=10`,
        { headers: { Authorization: `Bearer ${gmailToken}` } }
      );
      if (searchRes.status === 401) {
        disconnectGmail("החיבור לחשבון Gmail פג תוקף (זה קורה אחרי כשעה) — לחצי על \"התחבר ל-Gmail\" למעלה כדי להתחבר מחדש, ואז נסי שוב.");
        return { newLogEntries, failures, debugLine, authExpired: true };
      }
      if (!searchRes.ok) throw new Error(`Gmail search failed: ${searchRes.status}`);
      const searchData = await searchRes.json();
      const threads = searchData.threads || [];
      const freshThreads = threads.filter(t => !existingKeys.has(`${instruction.id}:${t.id}`));
      debugLine = `${label} → "${q}" → ${threads.length} תוצאות, ${freshThreads.length} חדשות`;

      let labelId = null;
      if (instruction.action === "folder") {
        labelId = instruction.labelId || (instruction.labelName ? await ensureInstructionLabel(instruction) : null);
      }

      for (const thread of freshThreads) {
        // Need Subject/From/Date for the log entry — a lightweight metadata
        // fetch, not the full message body (no summarization happening here).
        const mRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/threads/${thread.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`, { headers: { Authorization: `Bearer ${gmailToken}` } });
        if (!mRes.ok) { failures++; continue; }
        const mData = await mRes.json();
        const headers = mData.messages?.[0]?.payload?.headers || [];
        const subject = headers.find(h=>h.name==="Subject")?.value || "(ללא נושא)";
        const sender = headers.find(h=>h.name==="From")?.value || "";
        const date = headers.find(h=>h.name==="Date")?.value || "";

        const ok = instruction.action === "delete"
          ? await trashThread(thread.id)
          : (labelId ? await archiveThreadToLabel(thread.id, labelId) : false);
        if (!ok) { failures++; continue; }
        newLogEntries.push({ id: thread.id, instructionId: instruction.id, subject, sender, date, action: instruction.action, labelName: instruction.labelName || gmailLabels.find(l=>l.id===instruction.labelId)?.name || null });
      }
    } catch (e) {
      console.error(e);
      failures++;
      debugLine = `${label} → שגיאה: ${e.message}`;
    }
    return { newLogEntries, failures, debugLine, authExpired };
  };

  const syncEmail = async () => {
    if (!gmailToken || (emailRules.length === 0 && emailInstructions.length === 0)) return;
    setEmailLoading(true);
    setEmailStatusMsg("");
    let authExpired = false;

    const existingKeys = new Set(emailSummaries.map(s => `${s.ruleId}:${s.id}`));
    const allNew = [];
    let threadsFound = 0;
    let summarizeFailures = 0;
    const ruleDebug = [];
    const summarizeFailureDetails = [];
    for (const rule of emailRules) {
      const result = await runRuleSync(rule, existingKeys);
      if (result.authExpired) { authExpired = true; break; }
      threadsFound += result.threadsFoundCount;
      summarizeFailures += result.failures;
      if (result.debugLine) ruleDebug.push(result.debugLine);
      if (result.failureDetails?.length) summarizeFailureDetails.push(...result.failureDetails);
      result.newEntries.forEach(e => existingKeys.add(`${e.ruleId}:${e.id}`));
      allNew.push(...result.newEntries);
    }
    if (allNew.length) setEmailSummaries(prev => [...prev, ...allNew]);

    let instructionsProcessed = 0;
    if (!authExpired) {
      const existingInstructionKeys = new Set(emailInstructionLog.map(e => `${e.instructionId}:${e.id}`));
      const allNewLog = [];
      for (const instruction of emailInstructions) {
        const result = await runInstructionSync(instruction, existingInstructionKeys);
        if (result.authExpired) { authExpired = true; break; }
        result.newLogEntries.forEach(e => existingInstructionKeys.add(`${e.instructionId}:${e.id}`));
        allNewLog.push(...result.newLogEntries);
      }
      if (allNewLog.length) { setEmailInstructionLog(prev => [...allNewLog, ...prev]); instructionsProcessed = allNewLog.length; }
    }

    if (!authExpired) {
      let msg = "";
      if (emailRules.length > 0 && allNew.length === 0) {
        if (threadsFound === 0) {
          msg = "לא נמצאו מיילים תואמים לחוקים. בדקי שהשולח/הנושא מדויקים, או סמני \"כל המיילים\" בעריכת החוק — כברירת מחדל מחפשים רק 30 ימים אחורה.\n\nפירוט לפי חוק:\n"
            + ruleDebug.map(d=>`• ${d}`).join("\n");
        } else if (summarizeFailures > 0) {
          // Surface the actual failure (HTTP status / server error / thrown
          // network error) instead of a generic "something failed" — this is
          // the only way to tell a rate limit, a CORS rejection, and an AI
          // error on the worker apart from the phone, with no server logs.
          msg = "נמצאו מיילים תואמים, אבל הסיכום נכשל.\n\nפירוט:\n"
            + [...new Set(summarizeFailureDetails)].slice(0,5).map(d=>`• ${d}`).join("\n")
            + "\n\nנסי שוב בעוד רגע — אם זה ממשיך לקרות, שלחי את הפירוט הזה.";
        } else {
          msg = "נמצאו מיילים תואמים, אבל כבר נסרקו קודם — אין חדש. אפשר לראות אותם ב\"מיילים מסוכמים\".";
        }
      }
      if (instructionsProcessed > 0) {
        msg = (msg ? msg + "\n\n" : "") + `בנוסף: ${instructionsProcessed} מיילים טופלו לפי ההוראות. אפשר לראות אותם ב"הוראות".`;
      }
      if (msg) setEmailStatusMsg(msg);
    }
    setEmailLoading(false);
  };

  // Re-sync just one rule (used by the "🔄 עדכן" button on its detail page)
  // instead of running every rule again.
  const syncSingleRule = async (rule) => {
    if (!gmailToken) return;
    setRuleSyncingId(rule.id);
    setEmailStatusMsg("");
    const existingKeys = new Set(emailSummaries.map(s => `${s.ruleId}:${s.id}`));
    const result = await runRuleSync(rule, existingKeys);
    if (!result.authExpired && result.newEntries.length) {
      setEmailSummaries(prev => [...prev, ...result.newEntries]);
    }
    setRuleSyncingId(null);
  };

  // ── Cloud backup (Google Drive) ────────────────────────────────────────────
  const BACKUP_FILE_NAME = "taskup-backup.json";

  const connectDrive = () => {
    const clientId = gmailClientId.trim();
    if (!clientId) { setDriveAuthError("קודם צריך להגדיר Google Client ID (באותה הגדרה שמשמשת את חיבור ה-Gmail)."); setShowClientIdInput(true); return; }
    setDriveAuthError("");

    const initGIS = () => {
      try{
        const client = window.google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: "https://www.googleapis.com/auth/drive.file",
          callback: (response) => {
            if (response.access_token) {
              if (response.scope && !response.scope.includes("drive.file")) {
                setDriveAuthError("ההתחברות הצליחה אבל לא אישרת את ההרשאה לגישה ל-Drive. נסי להתחבר שוב ווודאי שכל ההרשאות מסומנות.");
                return;
              }
              localStorage.setItem("drive_token", response.access_token);
              setDriveToken(response.access_token);
              setDriveAuthError("");
            } else {
              console.error("Drive auth: no access_token in response",response);
              setDriveAuthError("החיבור נכשל — ודאי שה-Client ID נכון ונסי שוב.");
            }
          },
          error_callback: (err) => {
            console.error("Drive auth error",err);
            setDriveAuthError(err?.type==="popup_closed" ? "החלון נסגר לפני שהושלם החיבור. נסי שוב." : "החיבור ל-Google Drive נכשל. נסי שוב.");
          },
        });
        client.requestAccessToken();
      }catch(err){
        console.error("Drive auth: failed to init token client",err);
        setDriveAuthError("החיבור נכשל — ודאי שה-Client ID תקין ונסי שוב.");
      }
    };

    if (window.google?.accounts?.oauth2) {
      initGIS();
    } else {
      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.onload = initGIS;
      script.onerror = () => setDriveAuthError("לא הצלחתי לטעון את שירות ההתחברות של Google. בדקי את החיבור לאינטרנט ונסי שוב.");
      document.head.appendChild(script);
    }
  };

  const disconnectDrive = (message="") => {
    setDriveToken(null); localStorage.removeItem("drive_token");
    setDriveFileId(null); localStorage.removeItem("drive_backup_file_id");
    setDriveAuthError(message);
  };

  // Finds the existing backup file (drive.file scope only ever sees files this
  // app created, so a name search is enough — no folder/id bookkeeping needed
  // beyond caching the id once we know it).
  const findBackupFileId = async (token) => {
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(`name='${BACKUP_FILE_NAME}' and trashed=false`)}&spaces=drive&fields=files(id,modifiedTime)`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (res.status === 401) throw { driveStatus: 401 };
    if (res.status === 403) throw { driveStatus: 403, body: await res.json().catch(()=>null) };
    if (!res.ok) throw new Error(`Drive search failed: ${res.status}`);
    const data = await res.json();
    return data.files?.[0]?.id || null;
  };

  const backupToDrive = async () => {
    if (!driveToken) return;
    setBackupInProgress(true);
    setDriveAuthError("");
    try {
      const content = JSON.stringify({ profiles, activeProfile: activeProfileId, emailRules, customVoiceCommands }, null, 2);
      let fileId = driveFileId;
      if (!fileId) fileId = await findBackupFileId(driveToken);

      const metadata = { name: BACKUP_FILE_NAME, mimeType: "application/json" };
      const boundary = "taskup-backup-boundary";
      const multipartBody =
        `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(fileId?{}:metadata)}\r\n` +
        `--${boundary}\r\nContent-Type: application/json\r\n\r\n${content}\r\n--${boundary}--`;

      const uploadUrl = fileId
        ? `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`
        : `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart`;

      const res = await fetch(uploadUrl, {
        method: fileId ? "PATCH" : "POST",
        headers: { Authorization: `Bearer ${driveToken}`, "Content-Type": `multipart/related; boundary=${boundary}` },
        body: multipartBody,
      });
      if (res.status === 401) { disconnectDrive("החיבור ל-Google Drive פג תוקף (זה קורה אחרי כשעה) — לחצי על \"התחברי ל-Drive\" כדי להתחבר מחדש."); return; }
      if (res.status === 403) {
        let detail = ""; try { const errBody = await res.json(); detail = errBody?.error?.message || ""; } catch { /* ignore */ }
        setDriveAuthError(`אין הרשאה (403)${detail?`: ${detail}`:""} — ודאי ש-Google Drive API מופעל בפרויקט ב-Google Cloud Console (אותו פרויקט שבו הפעלת את Gmail API).`);
        return;
      }
      if (!res.ok) throw new Error(`Drive upload failed: ${res.status}`);
      const data = await res.json();
      setDriveFileId(data.id); localStorage.setItem("drive_backup_file_id", data.id);
      const now = new Date().toISOString();
      setLastBackupAt(now); localStorage.setItem("drive_last_backup", now);
    } catch(err) {
      if (err?.driveStatus === 401) { disconnectDrive("החיבור ל-Google Drive פג תוקף — לחצי על \"התחברי ל-Drive\" כדי להתחבר מחדש."); return; }
      if (err?.driveStatus === 403) {
        const detail = err.body?.error?.message || "";
        setDriveAuthError(`אין הרשאה (403)${detail?`: ${detail}`:""} — ודאי ש-Google Drive API מופעל בפרויקט ב-Google Cloud Console.`);
        return;
      }
      console.error("backupToDrive failed",err);
      setDriveAuthError("הגיבוי נכשל. נסי שוב בעוד רגע.");
    } finally {
      setBackupInProgress(false);
    }
  };

  const restoreFromDrive = async () => {
    if (!driveToken) return;
    if (!window.confirm("שחזור מהגיבוי בענן יחליף את כל הנתונים המקומיים שלך (כל הפרופילים, הכרטיסיות, המשימות והתזכורות) בגרסה השמורה ב-Drive. להמשיך?")) return;
    setRestoreInProgress(true);
    setDriveAuthError("");
    try {
      const fileId = driveFileId || await findBackupFileId(driveToken);
      if (!fileId) { setDriveAuthError("לא נמצא גיבוי קודם ב-Drive."); return; }
      const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, { headers: { Authorization: `Bearer ${driveToken}` } });
      if (res.status === 401) { disconnectDrive("החיבור ל-Google Drive פג תוקף — לחצי על \"התחברי ל-Drive\" כדי להתחבר מחדש."); return; }
      if (!res.ok) throw new Error(`Drive download failed: ${res.status}`);
      const data = await res.json();
      if (!data.profiles) throw new Error("invalid backup content");
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ profiles: data.profiles, activeProfile: data.activeProfile }));
      if (data.emailRules) localStorage.setItem("email_rules", JSON.stringify(data.emailRules));
      if (data.customVoiceCommands) localStorage.setItem("voice_custom_commands", JSON.stringify(data.customVoiceCommands));
      window.location.reload();
    } catch(err) {
      console.error("restoreFromDrive failed",err);
      setDriveAuthError("השחזור נכשל — ייתכן שקובץ הגיבוי פגום. נסי שוב.");
    } finally {
      setRestoreInProgress(false);
    }
  };

  // Auto-backup: after any change to the data, wait for a quiet moment (so we
  // don't fire a Drive request on every keystroke) and then back up silently.
  useEffect(() => {
    if (!driveToken) return;
    if (autoBackupTimerRef.current) clearTimeout(autoBackupTimerRef.current);
    autoBackupTimerRef.current = setTimeout(() => { backupToDrive(); }, 10000);
    return () => { if (autoBackupTimerRef.current) clearTimeout(autoBackupTimerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profiles, driveToken]);

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
    const blob=new Blob([JSON.stringify({profiles,activeProfile:activeProfileId,emailRules,customVoiceCommands},null,2)],{type:"application/json"});
    const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download=`taskup-backup-${today()}.json`; a.click();
    setShowSettingsMenu(false);
  };
  const importBackup = ()=>{
    const input=document.createElement("input"); input.type="file"; input.accept=".json";
    input.onchange=(e)=>{
      const reader=new FileReader();
      reader.onload=(ev)=>{try{
        const d=JSON.parse(ev.target.result);if(!d.profiles)throw new Error();
        localStorage.setItem(STORAGE_KEY,JSON.stringify({profiles:d.profiles,activeProfile:d.activeProfile}));
        if(d.emailRules) localStorage.setItem("email_rules",JSON.stringify(d.emailRules));
        if(d.customVoiceCommands) localStorage.setItem("voice_custom_commands",JSON.stringify(d.customVoiceCommands));
        window.location.reload();
      }catch{alert("קובץ גיבוי לא תקין");}};
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
  const addTask = ()=>{ const text=taskInput.trim(); if(!text)return; updateCtx(c=>({...c,tasks:[...c.tasks,{id:uid(),text,done:false,createdAt:today(),subtasks:[],priority:null,dueDate:null}]})); setTaskInput(""); };
  const addReminder = ()=>{
    const text=reminderInput.trim(); if(!text)return;
    updateCtx(c=>({...c,reminders:[...c.reminders,{id:uid(),text,done:false,createdAt:today(),startDate:reminderStart||null,endDate:reminderEnd||null,alertDate:reminderAlertDate||null}]}));
    setReminderInput(""); setReminderStart(""); setReminderEnd(""); setReminderAlertDate(""); setShowReminderDates(false);
  };

  const toggleDone = (type,id)=>smartUpdateItem(type,id,i=>({...i,done:!i.done}));

  // Find which array (the tab itself, or a specific subtab) currently holds
  // an item, so a delete can be reversed later without needing to search again.
  const findItemLocation = (type,id) => {
    const key=type==="task"?"tasks":"reminders";
    const t = tabs.find(x=>x.id===activeTab);
    if(!t) return null;
    const direct = t[key].find(i=>i.id===id);
    if(direct) return {item:direct, subtabId:null};
    for(const s of t.subtabs||[]){
      const found = (s[key]||[]).find(i=>i.id===id);
      if(found) return {item:found, subtabId:s.id};
    }
    return null;
  };

  const deleteItem = (type,id)=>{
    const loc = findItemLocation(type,id);
    smartDeleteItem(type,id);
    if(!loc) return; // shouldn't happen, but don't show an undo toast for nothing
    if(undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
    setLastDeleted({type, item:loc.item, tabId:activeTab, subtabId:loc.subtabId});
    undoTimeoutRef.current = setTimeout(()=>{ setLastDeleted(null); undoTimeoutRef.current=null; }, 5000);
  };

  const undoDeleteItem = () => {
    if(!lastDeleted) return;
    const {type,item,tabId,subtabId} = lastDeleted;
    const key = type==="task"?"tasks":"reminders";
    setTabs(prev=>prev.map(t=>{
      if(t.id!==tabId) return t;
      if(subtabId) return {...t, subtabs:t.subtabs.map(s=>s.id===subtabId?{...s,[key]:[...(s[key]||[]),item]}:s)};
      return {...t,[key]:[...t[key],item]};
    }));
    if(undoTimeoutRef.current){ clearTimeout(undoTimeoutRef.current); undoTimeoutRef.current=null; }
    setLastDeleted(null);
  };
  const saveEdit = (type,id)=>{
    smartUpdateItem(type,id,i=>({...i,text:editText,
      ...(type==="reminder"?{alertDate:editAlertDate||null,startDate:editStartDate||null,endDate:editEndDate||null}:{}),
      ...(type==="task"?{dueDate:editDueDate||null}:{}),
    }));
    setEditId(null); setEditText(""); setEditAlertDate(""); setEditStartDate(""); setEditEndDate(""); setEditDueDate("");
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

        {/* Undo delete toast */}
        <UndoToast lastDeleted={lastDeleted} undoDeleteItem={undoDeleteItem}/>

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

        {/* Email overlay — home page (rule management + connect) */}
        {showEmail&&(
          <EmailOverlay
            accent={accent}
            setShowEmail={setShowEmail}
            gmailClientId={gmailClientId} setGmailClientId={setGmailClientId} showClientIdInput={showClientIdInput} setShowClientIdInput={setShowClientIdInput} editGmailClientId={editGmailClientId}
            gmailToken={gmailToken} connectGmail={connectGmail} disconnectGmail={disconnectGmail} gmailAuthError={gmailAuthError} setGmailAuthError={setGmailAuthError}
            emailRules={emailRules} saveEmailRules={saveEmailRules} newRule={newRule} setNewRule={setNewRule} showNewRule={showNewRule} setShowNewRule={setShowNewRule}
            emailLoading={emailLoading} fetchAndSummarize={syncEmail} emailStatusMsg={emailStatusMsg}
            gmailLabels={gmailLabels} labelsLoading={labelsLoading} labelsError={labelsError} fetchGmailLabels={fetchGmailLabels} ensureRuleLabel={ensureRuleLabel}
            archiveErrorMsg={archiveErrorMsg} setArchiveErrorMsg={setArchiveErrorMsg}
            onOpenOverview={openEmailOverview}
            emailInstructions={emailInstructions} saveEmailInstructions={saveEmailInstructions}
            newInstruction={newInstruction} setNewInstruction={setNewInstruction}
            showNewInstruction={showNewInstruction} setShowNewInstruction={setShowNewInstruction}
            ensureInstructionLabel={ensureInstructionLabel}
            onOpenInstructionsLog={openInstructionsLog}
            onOpenFoldersManager={openFoldersManager}
          />
        )}

        {/* Email overlay — "מיילים מסוכמים" rules list */}
        {showEmailOverview&&(
          <EmailSummariesOverview
            accent={accent}
            emailRules={emailRules}
            emailSummaries={emailSummaries}
            onOpenRule={openRuleDetail}
            onBackToEmailHome={goEmailHome}
            onAppHome={goEmailAppHome}
          />
        )}

        {/* Email overlay — single rule's emails (done/pending triage) */}
        {openRuleId&&!showRuleFolder&&(() => {
          const rule = emailRules.find(r=>r.id===openRuleId);
          if (!rule) { closeRuleDetail(); return null; }
          return (
            <EmailRuleDetail
              accent={accent}
              rule={rule}
              gmailLabels={gmailLabels}
              summaries={emailSummaries.filter(s=>s.ruleId===rule.id)}
              onSetStatus={(threadId,status)=>setSummaryStatus(rule.id,threadId,status)}
              onSyncRule={()=>syncSingleRule(rule)}
              syncing={ruleSyncingId===rule.id}
              onOpenFolder={async ()=>{ const id = rule.archiveLabelId || await ensureRuleLabel(rule); openRuleFolder(id); }}
              onBackToEmailHome={goEmailHome}
              onAppHome={goEmailAppHome}
            />
          );
        })()}

        {/* Email overlay — read-only Gmail folder contents viewer */}
        {openRuleId&&showRuleFolder&&(() => {
          const rule = emailRules.find(r=>r.id===openRuleId);
          const label = rule && gmailLabels.find(l=>l.id===rule.archiveLabelId);
          return (
            <EmailFolderView
              accent={accent}
              labelName={label?.name || rule?.archiveLabelName || "?"}
              messages={folderMessages}
              loading={folderLoading}
              error={folderError}
              onRefresh={()=>fetchFolderMessages(rule?.archiveLabelId)}
              onBackToEmailHome={goEmailHome}
              onAppHome={goEmailAppHome}
            />
          );
        })()}

        {/* Email overlay — "הוראות" processed-mail log (sort/delete only, no AI) */}
        {showInstructionsLog&&(
          <EmailInstructionsLog
            accent={accent}
            emailInstructionLog={emailInstructionLog}
            onBackToEmailHome={goEmailHome}
            onAppHome={goEmailAppHome}
          />
        )}

        {/* Email overlay — rename/delete Gmail folders (labels) directly */}
        {showFoldersManager&&(
          <EmailFoldersManager
            accent={accent}
            gmailLabels={gmailLabels}
            labelsLoading={labelsLoading}
            labelsError={labelsError}
            onRefresh={fetchGmailLabels}
            onRename={renameGmailLabel}
            onDelete={deleteGmailLabel}
            onBackToEmailHome={goEmailHome}
            onAppHome={goEmailAppHome}
          />
        )}

        {/* Cloud backup overlay */}
        {showCloudBackup&&(
          <CloudBackupModal
            setShowCloudBackup={setShowCloudBackup}
            driveToken={driveToken} connectDrive={connectDrive} disconnectDrive={disconnectDrive}
            driveAuthError={driveAuthError} setDriveAuthError={setDriveAuthError}
            lastBackupAt={lastBackupAt} backupInProgress={backupInProgress} backupToDrive={backupToDrive}
            restoreInProgress={restoreInProgress} restoreFromDrive={restoreFromDrive}
          />
        )}

        {/* Push notifications overlay */}
        {showPushModal&&(
          <PushNotificationsModal
            setShowPushModal={setShowPushModal}
            pushSupported={pushSupported} pushSubscribed={pushSubscribed} pushBusy={pushBusy} pushError={pushError} setPushError={setPushError}
            enablePush={enablePush} disablePush={disablePush}
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
            applyProjectImport={applyProjectImport}
          />
        )}


        {/* Side pills — icon-only circle when closed, full pill when open */}
        <SidePills
          accent={accent}
          showListsMenu={showListsMenu} setShowListsMenu={setShowListsMenu}
          showProjects={showProjects} openProjectId={openProjectId} setShowProjects={setShowProjects} setOpenProjectId={setOpenProjectId}
          showEmail={showEmail} setShowEmail={setShowEmail}
          setShowQuickCapture={setShowQuickCapture}
        />

        {/* Voice indicator — always shown when SR available; tap to activate on first use */}
        <VoiceIndicator
          voiceAvail={voiceAvail} voiceState={voiceState} setVoiceState={setVoiceState} voiceLabel={voiceLabel} voiceDebug={voiceDebug}
          recognitionRef={recognitionRef} voiceModeRef={voiceModeRef} voiceActiveRef={voiceActiveRef}
        />

        {/* Voice commands help */}
        {showVoiceHelp&&(
          <VoiceHelpModal
            setShowVoiceHelp={setShowVoiceHelp}
            customVoiceCommands={customVoiceCommands} deleteVoiceCommand={deleteVoiceCommand}
            showAddVoiceCmd={showAddVoiceCmd} setShowAddVoiceCmd={setShowAddVoiceCmd}
            newVoiceCmd={newVoiceCmd} setNewVoiceCmd={setNewVoiceCmd} addVoiceCommand={addVoiceCommand}
          />
        )}


        {/* Header */}
        <AppHeader
          accent={accent} profiles={profiles} activeProfileId={activeProfileId} allProfiles={allProfiles}
          profileMenuRef={profileMenuRef} showProfileMenu={showProfileMenu} setShowProfileMenu={setShowProfileMenu} switchProfile={switchProfile} setNewProfileName={setNewProfileName} setShowProfileModal={setShowProfileModal} deleteCurrentProfile={deleteCurrentProfile}
          settingsMenuRef={settingsMenuRef} showSettingsMenu={showSettingsMenu} setShowSettingsMenu={setShowSettingsMenu} exportBackup={exportBackup} importBackup={importBackup} shareWhatsApp={shareWhatsApp} setShowCloudBackup={setShowCloudBackup} setShowPushModal={setShowPushModal}
          voiceAvail={voiceAvail} setShowVoiceHelp={setShowVoiceHelp}
          searchQuery={searchQuery} setSearchQuery={setSearchQuery} searchResults={searchResults} goToSearchResult={goToSearchResult}
          tabs={tabs} activeTab={activeTab} setActiveTab={setActiveTab} setActiveSubtab={setActiveSubtab} setDefaultTab={setDefaultTab} deleteTab={deleteTab}
          showNewTab={showNewTab} setShowNewTab={setShowNewTab} newTabInput={newTabInput} setNewTabInput={setNewTabInput} addTab={addTab}
        />

        <TabContent
          accent={accent}
          currentTab={currentTab} activeSubtab={activeSubtab} setActiveSubtab={setActiveSubtab}
          showNewSub={showNewSub} setShowNewSub={setShowNewSub} newSubInput={newSubInput} setNewSubInput={setNewSubInput} addSubtab={addSubtab} deleteSubtab={deleteSubtab}
          allPendingTasks={allPendingTasks} sortedReminderGroups={sortedReminderGroups}
          isAggregate={isAggregate} taskGroups={taskGroups}
          taskInput={taskInput} setTaskInput={setTaskInput} addTask={addTask}
          allDoneTasks={allDoneTasks} showDoneTasks={showDoneTasks} setShowDoneTasks={setShowDoneTasks} toggleDone={toggleDone} deleteItem={deleteItem}
          reminderInput={reminderInput} setReminderInput={setReminderInput} addReminder={addReminder}
          showReminderDates={showReminderDates} setShowReminderDates={setShowReminderDates}
          reminderStart={reminderStart} setReminderStart={setReminderStart} reminderEnd={reminderEnd} setReminderEnd={setReminderEnd} reminderAlertDate={reminderAlertDate} setReminderAlertDate={setReminderAlertDate}
          allDoneReminders={allDoneReminders} showDoneReminders={showDoneReminders} setShowDoneReminders={setShowDoneReminders}
          completingId={completingId} handleComplete={handleComplete}
          editId={editId} setEditId={setEditId} editText={editText} setEditText={setEditText} editAlertDate={editAlertDate} setEditAlertDate={setEditAlertDate} editStartDate={editStartDate} setEditStartDate={setEditStartDate} editEndDate={editEndDate} setEditEndDate={setEditEndDate} editDueDate={editDueDate} setEditDueDate={setEditDueDate} saveEdit={saveEdit}
          cyclePriority={cyclePriority} handleBigComplete={handleBigComplete}
          breakingDownId={breakingDownId} breakdownTaskDirect={breakdownTaskDirect} breakdownTask={breakdownTask} pendingBreakdown={pendingBreakdown} setPendingBreakdown={setPendingBreakdown} confirmBreakdown={confirmBreakdown}
          expandedTaskId={expandedTaskId} setExpandedTaskId={setExpandedTaskId} subtaskInput={subtaskInput} setSubtaskInput={setSubtaskInput} addSubtask={addSubtask} toggleSubtask={toggleSubtask} deleteSubtask={deleteSubtask}
        />
      </div>
    </div>
  );
}
