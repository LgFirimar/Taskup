import { useEffect } from "react";
import { uid, today } from "../utils";

// Canonical trigger word each built-in action responds to — used to rewrite a
// user-defined alias phrase into a real command the dispatcher below already
// understands (e.g. alias "תרשמי" for action "task" turns "תרשמי לקנות חלב"
// into "משימה לקנות חלב", which the existing taskQ regex then handles as usual).
const ACTION_CANON = {
  task: "משימה",
  reminder: "תזכורת",
  done: "סמני",
  read: "תקריאי",
  close: "סגור",
};

// Sets up Hebrew voice control via the Web Speech API and wires spoken commands
// (navigate tabs, open/create shopping lists & notes, add/remove items, add
// tasks/reminders, mark done, read items aloud, etc.) to the app's state.
//
// Extracted verbatim from App.jsx's voice-recognition useEffect — all refs and
// setters below are owned by the caller (App.jsx) so this hook stays a pure
// side-effect wrapper with no state of its own.
export function useVoiceCommands({
  showSplash,
  recognitionRef, voiceActiveRef, voiceModeRef,
  openListIdRef, openListTypeRef, profilesRef, tabsRef, activeTabRef, activeSubtabRef, activeProfileIdRef,
  customCommandsRef,
  setVoiceLabel, setVoiceDebug,
  setProfiles, setOpenListId, setOpenListType, setShowListsMenu, setActiveTab, setActiveSubtab,
}) {
  useEffect(()=>{
    if(showSplash) return;
    const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!SR) return;

    const r=new SR();
    r.lang="he-IL";
    r.continuous=true;
    r.interimResults=true;
    recognitionRef.current=r;

    const flash=(label,ms=2000)=>{ setVoiceLabel(label); setTimeout(()=>setVoiceLabel(""),ms); };
    const say=(text,lang="he-IL")=>{ speechSynthesis.cancel(); const u=new SpeechSynthesisUtterance(text); u.lang=lang; speechSynthesis.speak(u); };

    // helpers that always read the latest state via refs + stable setters
    const setTabsV=(updater)=>{
      setProfiles(prev=>{
        const pid=activeProfileIdRef.current;
        const cur=prev[pid]||{tabs:[]};
        const newTabs=typeof updater==="function"?updater(cur.tabs):updater;
        return{...prev,[pid]:{...cur,tabs:newTabs}};
      });
    };
    const updateProfileV=(fn)=>{
      setProfiles(prev=>{
        const pid=activeProfileIdRef.current;
        return{...prev,[pid]:fn(prev[pid]||{})};
      });
    };
    const smartUpdateV=(type,id,fn)=>{
      const key=type==="task"?"tasks":"reminders";
      setTabsV(prev=>prev.map(t=>{
        if(t.id!==activeTabRef.current)return t;
        return{...t,[key]:t[key].map(i=>i.id===id?fn(i):i),subtabs:t.subtabs.map(s=>({...s,[key]:s[key].map(i=>i.id===id?fn(i):i)}))};
      }));
    };

    const executeCommand=(text,isFinal=false,skipCustom=false)=>{
      const curTabs=tabsRef.current;
      const curActiveTab=activeTabRef.current;
      const curActiveSubtab=activeSubtabRef.current;
      const curProf=profilesRef.current?.[activeProfileIdRef.current]||{};
      const shopLists=curProf.shopping||[];
      const noteLists=curProf.notes||[];
      const curTab=curTabs.find(t=>t.id===curActiveTab)||null;
      const curSubtab=curActiveSubtab&&curTab?curTab.subtabs.find(s=>s.id===curActiveSubtab):null;
      const curCtx=curSubtab||curTab;

      // פקודות מותאמות אישית — כינויים (alias) לפעולות קיימות וקיצורי דרך (shortcut)
      // קבועים. skipCustom מונע לולאה אינסופית כשמכנים מילת-מפתח שמתאימה לעצמה.
      if(!skipCustom){
        const customCmds=customCommandsRef?.current||[];
        for(const c of customCmds){
          const p=(c.phrase||"").trim().toLowerCase();
          if(!p||!text.includes(p)) continue;
          if(c.kind==="shortcut"){
            const name=(c.targetName||"").trim();
            if(!name) continue;
            if(c.targetType==="tab"){
              const t=curTabs.find(tb=>tb.label===name||tb.label.includes(name)||name.includes(tb.label));
              if(t){ setActiveTab(t.id);setActiveSubtab(null); flash(`📑 ${t.label}`); say(t.label); return true; }
            }else if(c.targetType==="shopping"){
              const l=shopLists.find(li=>li.name===name||li.name.includes(name)||name.includes(li.name));
              if(l){ setOpenListId(l.id);setOpenListType("shopping");setShowListsMenu(null); flash(`🛒 ${l.name}`); say(l.name); return true; }
            }else if(c.targetType==="notes"){
              const n=noteLists.find(nt=>nt.name===name||nt.name.includes(name)||name.includes(nt.name));
              if(n){ setOpenListId(n.id);setOpenListType("notes");setShowListsMenu(null); flash(`📝 ${n.name}`); say(n.name); return true; }
            }
            continue;
          }else{
            const canon=ACTION_CANON[c.action];
            if(!canon) continue;
            const rest=text.split(p).join("").trim();
            const rewritten=c.action==="close"?canon:(rest?`${canon} ${rest}`:canon);
            return executeCommand(rewritten,isFinal,true);
          }
        }
      }

      // בדיקה — פקודת דיבוג
      if(text.includes("בדיקה")){
        flash(`לשוניות: ${curTabs.length} | קניות: ${shopLists.length} | פתקים: ${noteLists.length}`,5000);
        return true;
      }

      // סגור / חזרה
      if(text.includes("סגור")||text.includes("חזרה")||text.includes("אחורה")){
        setOpenListId(null);setOpenListType(null);setShowListsMenu(null);
        flash("סגור"); return true;
      }

      // מעבר לשוניות — "ליאור", "לשונית ילדים", "עברי לילדים"
      if(!text.match(/קניות|פתקים|פתק|תוסיף|הוסיף|הוסיפי|תוסיפי|משימה|תזכורת|כתבי|תכתבי|רשימת|רשימה|הסר|מחק|הוריד|למחוק|להוריד/)){
        const navMatch=text.match(/(?:לשונייה|לשונית|עברי ל|תעברי ל|כנסי ל|תכנסי ל)\s*(.+)/);
        const navTarget=navMatch?navMatch[1].trim():null;
        const tabTarget=navTarget
          ?curTabs.find(t=>t.label.includes(navTarget)||navTarget.includes(t.label))
          :curTabs.find(t=>text.includes(t.label.toLowerCase())||t.label.toLowerCase().includes(text));
        if(tabTarget){
          setActiveTab(tabTarget.id);setActiveSubtab(null);
          flash(`📑 ${tabTarget.label}`); say(tabTarget.label); return true;
        }
      }

      // כניסה לרשימת קניות — "רשימת X" / "רשימה X" / שם הרשימה ישירות
      const shopListPrefix=(text.match(/(?:רשימת|רשימה|כנסי לרשימת|תכנסי לרשימת|פתחי רשימת|פתחי את רשימת)\s+(.+)/)||[])[1];
      const shopListByName=!shopListPrefix?shopLists.find(l=>l.name.length>=2&&(text.trim()===l.name.toLowerCase()||text.trim().includes(l.name.toLowerCase())||l.name.toLowerCase().includes(text.trim()))):null;
      if(shopListPrefix||shopListByName){
        const found=shopListPrefix
          ?shopLists.find(l=>l.name.includes(shopListPrefix)||shopListPrefix.includes(l.name))
          :shopListByName;
        if(found){ setOpenListId(found.id);setOpenListType("shopping");setShowListsMenu(null); flash(`🛒 ${found.name}`); say(found.name); return true; }
        if(shopListPrefix){
          const newList={id:uid(),name:shopListPrefix.trim(),items:[]};
          updateProfileV(p=>({...p,shopping:[...(p.shopping||[]),newList]}));
          setOpenListId(newList.id);setOpenListType("shopping");setShowListsMenu(null);
          flash(`🛒 רשימה חדשה: ${shopListPrefix.trim()}`); say("רשימה חדשה"); return true;
        }
      }

      // רשימות קניות — "אילו רשימות" / "הצג רשימות"
      if(text.includes("אילו רשימות")||text.includes("הצג רשימות")||text.includes("רשימות קניות")){
        if(shopLists.length){ const u=new SpeechSynthesisUtterance(shopLists.map(l=>l.name).join(", ")); u.lang="he-IL"; speechSynthesis.speak(u); flash(shopLists.map(l=>l.name).join(" | ")); return true; }
        flash("אין רשימות קניות",3000); return true;
      }

      // תפריט קניות כללי — "קניות"
      if(text.includes("קניות")&&!text.match(/(?:תוסיף|הוסיף|הוסיפי|תוסיפי)\s/)){
        setShowListsMenu("shopping"); flash("🛒 קניות"); return true;
      }

      // הוספת פריט לרשימת קניות פתוחה
      const addItemQ=(text.match(/(?:תוסיפי|הוסיפי|הוסף|תוסיף)\s+(.+)/)||[])[1];
      if(addItemQ&&openListIdRef.current&&openListTypeRef.current==="shopping"&&isFinal){
        const lid=openListIdRef.current;
        updateProfileV(p=>({...p,shopping:(p.shopping||[]).map(l=>l.id===lid?{...l,items:[...l.items,{id:uid(),text:addItemQ.trim()}]}:l)}));
        flash(`נוסף: ${addItemQ.trim()}`); say(addItemQ.trim()); return true;
      }

      // הסרת פריט — "הסר/מחק/הוריד/להוריד/למחוק X"
      const removeQ=(text.match(/(?:הסר|הסירי|מחק|מחקי|למחוק|מחוק|תמחק|תמחקי|להוריד|הוריד|הורד|הורידי|תוריד|תורידי)\s+(.+)/)||[])[1]?.trim();
      if(removeQ&&openListIdRef.current&&openListTypeRef.current==="shopping"&&isFinal){
        const lid=openListIdRef.current;
        const curList=shopLists.find(l=>l.id===lid);
        const idx=curList?.items.findIndex(i=>i.text.includes(removeQ)||removeQ.includes(i.text))??-1;
        if(idx!==-1){
          const itemText=curList.items[idx].text;
          updateProfileV(p=>({...p,shopping:(p.shopping||[]).map(l=>l.id!==lid?l:{...l,items:l.items.filter((_,i)=>i!==idx)})}));
          flash(`הוסר: ${itemText}`); say("הוסר");
        }else{ flash(`לא נמצא: ${removeQ}`,3000); }
        return true;
      }

      // פתקים
      if(text.includes("פתקים")||text.includes("פתק")){
        const noteQ=(text.match(/(?:פתחי פתק|כנסי לפתק|תכנסי לפתק|פתק)\s+(.+)/)||[])[1];
        if(noteQ){
          const found=noteLists.find(n=>n.name.includes(noteQ)||noteQ.includes(n.name));
          if(!found){
            const newNote={id:uid(),name:noteQ.trim(),content:""};
            updateProfileV(p=>({...p,notes:[...(p.notes||[]),newNote]}));
            setOpenListId(newNote.id);setOpenListType("notes");setShowListsMenu(null);
            flash(`📝 פתק חדש: ${noteQ.trim()}`); say("פתק חדש"); return true;
          }
          setOpenListId(found.id);setOpenListType("notes");setShowListsMenu(null);
          flash(`📝 ${found.name}`); say(found.name); return true;
        }
        setShowListsMenu("notes"); flash("📝 פתקים"); return true;
      }

      // כתיבה לפתק פתוח (רק בתוצאה סופית)
      if(openListTypeRef.current==="notes"&&openListIdRef.current&&isFinal){
        const writeQ=(text.match(/(?:תכתבי|כתבי|הוסיפי|תוסיפי)\s+(.+)/)||[])[1];
        if(writeQ){
          const nid=openListIdRef.current;
          updateProfileV(p=>({...p,notes:(p.notes||[]).map(n=>n.id===nid?{...n,content:(n.content?n.content+"\n":"")+writeQ.trim()}:n)}));
          flash(`✍️ ${writeQ.trim()}`); say("נוסף"); return true;
        }
      }

      // הוספת משימה (רק בתוצאה סופית)
      const taskQ=(text.match(/(?:הוסיפי משימה|תוסיפי משימה|משימה חדשה|משימה)[:\s]+(.+)/)||[])[1];
      if(taskQ&&curCtx&&isFinal){
        const item={id:uid(),text:taskQ.trim(),done:false,createdAt:today(),subtasks:[],priority:null};
        if(curSubtab){
          setTabsV(prev=>prev.map(t=>t.id!==curActiveTab?t:{...t,subtabs:t.subtabs.map(s=>s.id!==curActiveSubtab?s:{...s,tasks:[...s.tasks,item]})}));
        }else{
          setTabsV(prev=>prev.map(t=>t.id!==curActiveTab?t:{...t,tasks:[...t.tasks,item]}));
        }
        flash(`✓ ${taskQ.trim()}`); say("נוסף"); return true;
      }

      // הוספת תזכורת (רק בתוצאה סופית)
      const remQ=(text.match(/(?:הוסיפי תזכורת|תוסיפי תזכורת|תזכורת חדשה|תזכורת)[:\s]+(.+)/)||[])[1];
      if(remQ&&curCtx&&isFinal){
        const item={id:uid(),text:remQ.trim(),done:false,createdAt:today(),startDate:null,endDate:null,alertDate:null};
        if(curSubtab){
          setTabsV(prev=>prev.map(t=>t.id!==curActiveTab?t:{...t,subtabs:t.subtabs.map(s=>s.id!==curActiveSubtab?s:{...s,reminders:[...s.reminders,item]})}));
        }else{
          setTabsV(prev=>prev.map(t=>t.id!==curActiveTab?t:{...t,reminders:[...t.reminders,item]}));
        }
        flash(`🔔 ${remQ.trim()}`); say("נוסף"); return true;
      }

      // סימון ביצוע
      const doneQ=(text.match(/(?:סמני|סיימתי|בוצע|בוצעה)\s+(.+)/)||[])[1];
      if(doneQ){
        const query=doneQ.replace(/\s*כבוצע[ת]?\s*$/,"").trim();
        const allItems=[
          ...(curCtx?.tasks||[]).filter(t=>!t.done).map(t=>({...t,itype:"task"})),
          ...(curCtx?.reminders||[]).filter(r=>!r.done).map(r=>({...r,itype:"reminder"})),
        ];
        const found=allItems.find(i=>i.text.includes(query)||query.split(" ").some(w=>w.length>2&&i.text.includes(w)));
        if(found){ smartUpdateV(found.itype,found.id,i=>({...i,done:true})); flash(`✓ ${found.text}`); say("בוצע"); return true; }
        flash(`לא נמצא: ${query}`,3000); return true;
      }

      // קריאת רשימת קניות פתוחה
      if((text.includes("הקרא")||text.includes("מה יש"))&&openListIdRef.current&&openListTypeRef.current==="shopping"){
        const pid=activeProfileIdRef.current;
        const list=(profilesRef.current?.[pid]?.shopping||[]).find(l=>l.id===openListIdRef.current);
        if(list?.items?.length){ const u=new SpeechSynthesisUtterance(list.items.map(i=>i.text).join(", ")); u.lang="he-IL"; speechSynthesis.speak(u); flash(`קורא ${list.items.length} פריטים`); return true; }
      }

      // קריאת משימות / תזכורות — "תקריא", "תקריאי", "הקרא"
      if(text.match(/תקריא|תקריאי|הקרא/)){
        const taskTxt=(curCtx?.tasks||[]).filter(t=>!t.done).map(t=>t.text);
        const remTxt=(curCtx?.reminders||[]).filter(r=>!r.done).map(r=>r.text);
        const all=[...taskTxt,...remTxt];
        if(all.length){ const u=new SpeechSynthesisUtterance(all.join(". ")); u.lang="he-IL"; speechSynthesis.speak(u); flash(`קורא ${all.length} פריטים`); return true; }
        flash("אין פריטים",2000); return true;
      }

      // פרטי משימה/תזכורת ספציפית — "תקריאי X"
      const readItemQ=(text.match(/(?:תקריאי|תקריא|הקרא)\s+(.+)/)||[])[1];
      if(readItemQ){
        const allItems=[...(curCtx?.tasks||[]),...(curCtx?.reminders||[])];
        const found=allItems.find(i=>i.text.includes(readItemQ)||readItemQ.split(" ").some(w=>w.length>2&&i.text.includes(w)));
        if(found){ const u=new SpeechSynthesisUtterance(found.text); u.lang="he-IL"; speechSynthesis.speak(u); flash(found.text); return true; }
      }

      // fallback כשרשימת קניות פתוחה — כל טקסט שלא זוהה → הוסף פריט
      if(openListIdRef.current&&openListTypeRef.current==="shopping"&&isFinal&&text.length>1){
        const lid=openListIdRef.current;
        updateProfileV(p=>({...p,shopping:(p.shopping||[]).map(l=>l.id!==lid?l:{...l,items:[...l.items,{id:uid(),text:text.trim()}]})}));
        flash(`נוסף: ${text.trim()}`); say(text.trim()); return true;
      }

      // fallback כשפתק פתוח — כל טקסט שלא זוהה → הוסף לפתק
      if(openListIdRef.current&&openListTypeRef.current==="notes"&&isFinal&&text.length>1){
        const nid=openListIdRef.current;
        updateProfileV(p=>({...p,notes:(p.notes||[]).map(n=>n.id!==nid?n:{...n,content:(n.content?n.content+"\n":"")+text.trim()})}));
        flash(`✍️ ${text.trim()}`); say("נוסף"); return true;
      }

      return false;
    };

    r.onresult=(e)=>{
      const result=e.results[e.results.length-1];
      const text=result[0].transcript.trim().toLowerCase();
      setVoiceDebug(text);
      if(voiceModeRef.current!=="listening") return;
      if(!text) return;
      let executed=false;
      try{ executed=executeCommand(text,result.isFinal)===true; }
      catch(err){ flash(`שגיאה: ${err.message.slice(0,25)}`,5000); }
      if(executed){
        setVoiceDebug("");
      }else if(result.isFinal){
        setVoiceDebug("");
        flash(`לא הבנתי: "${text}"`,4000);
      }
    };

    r.onerror=(e)=>{ flash(`שגיאת מיקרופון: ${e.error}`,4000); };
    r.onend=()=>{ if(voiceActiveRef.current){ try{ r.start(); }catch(err){ console.error("voice: failed to restart recognition",err); } } };

    if(sessionStorage.getItem("voice_on")){
      voiceActiveRef.current=true;
      try{ r.start(); }catch(err){ console.error("voice: failed to auto-start recognition",err); }
    }
    return ()=>{ voiceActiveRef.current=false; try{ r.stop(); }catch(err){ console.error("voice: failed to stop recognition on cleanup",err); } };
    // Intentionally re-runs only when showSplash changes: every ref/setter above is a stable
    // identity (useRef containers + useState setters from App.jsx) read fresh via .current at
    // call time, exactly as in the original inline effect this hook was extracted from.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[showSplash]);
}
