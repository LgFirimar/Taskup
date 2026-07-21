// Global CSS for the app, injected once via a <style> tag in App.jsx. Extracted
// out of the component body so App.jsx isn't carrying ~200 lines of pure CSS
// text mixed in with component logic. This string is fully static (no
// template interpolation of props/state) so it's safe to hoist to module scope.
export const APP_CSS = `
    @import url('https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;500;600;700;800&display=swap');
    *{box-sizing:border-box;}
    body{background:#f5f6fa;min-height:100vh;}
    ::-webkit-scrollbar{width:3px;height:3px;}
    ::-webkit-scrollbar-thumb{background:#dde;border-radius:4px;}

    /* ── Header ── */
    .app-header{background:white;border-bottom:1px solid #eeeef5;padding:16px 20px 0;}
    .greeting{font-size:22px;font-weight:800;color:#1a1a2e;letter-spacing:-0.02em;line-height:1.2;}
    .greeting-date{font-size:13px;color:#6b6b6b;font-weight:400;margin-top:2px;margin-bottom:14px;}
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
      background:transparent;
      font-family:'Heebo',sans-serif;font-size:13px;font-weight:500;
      color:#6b6b6b;white-space:nowrap;transition:all 0.18s;
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
      color:#6b6b6b;transition:all 0.15s;
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
      color:#6b6b6b;cursor:pointer;transition:all 0.15s;
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
      background:none;border:none;cursor:pointer;color:#8a8a8a;font-size:15px;
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
    .empty-state{color:#6b6b6b;font-size:13px;text-align:center;padding:24px;border:1.5px dashed #e8e8f2;border-radius:12px;background:white;}

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
