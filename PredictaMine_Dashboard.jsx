/**
 * PredictaMine — React Dashboard
 * Connect to Flask backend at API_BASE (default: http://localhost:5000)
 * Set REACT_APP_API_URL env var to override.
 * ICT619 Assignment 2 | Murdoch University 2026
 */
import { useState, useEffect } from "react";

const API_BASE ="https://predictminebackned-production.up.railway.app";

// ── API helpers ───────────────────────────────────────────────────────────────
async function apiPredict(inputs) {
  const res = await fetch(`${API_BASE}/predict`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(inputs),
  });
  if (!res.ok) { const e = await res.json(); throw new Error(e.error || "API error"); }
  return res.json();
}
async function apiPerformance() {
  const res = await fetch(`${API_BASE}/model/performance`);
  if (!res.ok) throw new Error("Performance fetch failed");
  return res.json();
}
async function apiHealth() {
  console.log(API_BASE)
  try { const r = await fetch(`${API_BASE}/health`); return r.ok; } catch { return false; }
}

// ── Fleet definitions ─────────────────────────────────────────────────────────
const FLEET_DEFS = [
  { id:"EQ-001", name:"Excavator Alpha",   machine_type:"H", air_temp:300.8, process_temp:310.2, rot_speed:1421, torque:69.2, tool_wear:198, site:"Kalgoorlie North" },
  { id:"EQ-002", name:"Haul Truck Bravo",  machine_type:"M", air_temp:298.5, process_temp:309.8, rot_speed:1543, torque:44.7, tool_wear:87,  site:"Kalgoorlie North" },
  { id:"EQ-003", name:"Drill Rig Charlie", machine_type:"L", air_temp:302.1, process_temp:313.4, rot_speed:1289, torque:72.8, tool_wear:221, site:"Newman Site B" },
  { id:"EQ-004", name:"Crusher Delta",     machine_type:"H", air_temp:299.9, process_temp:311.1, rot_speed:1612, torque:38.5, tool_wear:45,  site:"Newman Site B" },
  { id:"EQ-005", name:"Loader Echo",       machine_type:"M", air_temp:301.4, process_temp:314.0, rot_speed:1355, torque:61.3, tool_wear:176, site:"Port Hedland" },
  { id:"EQ-006", name:"Conveyor Foxtrot",  machine_type:"L", air_temp:303.2, process_temp:315.7, rot_speed:1187, torque:74.5, tool_wear:235, site:"Port Hedland" },
  { id:"EQ-007", name:"Pump Station Golf", machine_type:"M", air_temp:298.0, process_temp:308.5, rot_speed:1780, torque:29.8, tool_wear:22,  site:"Pilbara Hub" },
  { id:"EQ-008", name:"Compressor Hotel",  machine_type:"L", air_temp:300.6, process_temp:312.9, rot_speed:1310, torque:68.9, tool_wear:209, site:"Pilbara Hub" },
];

// ── Theme ─────────────────────────────────────────────────────────────────────
const C = {
  bg:"#09090f", surface:"#12121c", panel:"#16182a", border:"#1e2038",
  accent:"#e8431a", accentDim:"rgba(232,67,26,0.12)", accentGlow:"rgba(232,67,26,0.35)",
  gold:"#f0a500", green:"#22c55e", blue:"#3b82f6",
  muted:"#4a4d6a", text:"#e2e4f0", textSub:"#7c7f9e",
};

// ── Small components ──────────────────────────────────────────────────────────
const Badge = ({ children, color=C.accent }) => (
  <span style={{background:`${color}22`,color,border:`1px solid ${color}44`,borderRadius:4,padding:"2px 8px",fontSize:11,fontWeight:700,letterSpacing:"0.06em",textTransform:"uppercase"}}>{children}</span>
);
const RiskBadge = ({ level, prob }) => {
  const pct = prob!=null?` ${(prob*100).toFixed(1)}%`:"";
  if(level==="CRITICAL") return <Badge color={C.accent}>⚠ CRITICAL{pct}</Badge>;
  if(level==="ELEVATED") return <Badge color={C.gold}>⚡ ELEVATED{pct}</Badge>;
  return <Badge color={C.green}>✓ NOMINAL{pct}</Badge>;
};
const Spinner = () => <span style={{display:"inline-block",width:14,height:14,border:`2px solid ${C.border}`,borderTop:`2px solid ${C.accent}`,borderRadius:"50%",animation:"spin 0.7s linear infinite"}}/>;
const ErrorBox = ({ msg }) => (
  <div style={{background:"rgba(232,67,26,0.1)",border:`1px solid ${C.accent}55`,borderRadius:8,padding:"12px 16px",fontSize:12,color:C.accent,marginBottom:16}}>
    ⚠ {msg}
    {(msg||"").includes("localhost") && <div style={{marginTop:6,color:C.textSub,fontSize:11}}>Start backend: <code style={{background:C.panel,padding:"2px 6px",borderRadius:3}}>cd backend && python app.py</code></div>}
  </div>
);
const ApiStatus = ({ online }) => (
  <div style={{display:"flex",alignItems:"center",gap:5,fontSize:11,color:C.textSub}}>
    <div style={{width:6,height:6,borderRadius:"50%",background:online?C.green:C.accent,boxShadow:`0 0 6px ${online?C.green:C.accent}`}}/>
    {online?"Backend Connected":"Backend Offline"}
  </div>
);
const GaugeArc = ({ prob=0, size=120 }) => {
  const r=44,cx=size/2,cy=size/2,circ=Math.PI*r;
  const offset=circ*(1-Math.min(prob,1));
  const color=prob>=0.5?C.accent:prob>=0.25?C.gold:C.green;
  return (
    <svg width={size} height={size*0.58} viewBox={`0 0 ${size} ${size*0.58}`}>
      <path d={`M${cx-r} ${cy} A${r} ${r} 0 0 1 ${cx+r} ${cy}`} fill="none" stroke={C.border} strokeWidth={8}/>
      <path d={`M${cx-r} ${cy} A${r} ${r} 0 0 1 ${cx+r} ${cy}`} fill="none" stroke={color} strokeWidth={8}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        style={{filter:`drop-shadow(0 0 6px ${color})`,transition:"stroke-dashoffset 0.8s cubic-bezier(.4,0,.2,1)"}}/>
      <text x={cx} y={cy-4} textAnchor="middle" fill={color} fontSize={18} fontWeight={800} fontFamily="monospace">{(prob*100).toFixed(1)}%</text>
      <text x={cx} y={cy+12} textAnchor="middle" fill={C.textSub} fontSize={9} fontFamily="monospace" letterSpacing="0.08em">FAILURE PROB</text>
    </svg>
  );
};
const MiniBar = ({ value, max, color, label, unit="" }) => {
  const pct=Math.min((value/max)*100,100);
  return (
    <div style={{marginBottom:6}}>
      <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:C.textSub,marginBottom:3}}>
        <span>{label}</span><span style={{color:C.text,fontFamily:"monospace"}}>{value}{unit}</span>
      </div>
      <div style={{height:4,borderRadius:2,background:C.border}}>
        <div style={{height:"100%",width:`${pct}%`,borderRadius:2,background:color,transition:"width 0.6s ease",boxShadow:`0 0 6px ${color}88`}}/>
      </div>
    </div>
  );
};
const ShapBar = ({ feature, shap_value, raw_value }) => {
  const isPos=shap_value>0,pct=Math.min(Math.abs(shap_value)/3.5*100,100);
  return (
    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
      <div style={{width:160,fontSize:11,color:C.textSub,textAlign:"right",flexShrink:0}}>{feature}</div>
      <div style={{flex:1,height:20,position:"relative",display:"flex",alignItems:"center"}}>
        <div style={{position:"absolute",left:"50%",width:1,height:"100%",background:C.border}}/>
        {isPos
          ? <div style={{position:"absolute",left:"50%",width:`${pct/2}%`,height:14,background:C.accent,borderRadius:"0 2px 2px 0",boxShadow:`0 0 6px ${C.accentGlow}`}}/>
          : <div style={{position:"absolute",right:"50%",width:`${pct/2}%`,height:14,background:C.blue,borderRadius:"2px 0 0 2px",boxShadow:`0 0 6px ${C.blue}66`}}/>
        }
      </div>
      <div style={{width:64,fontSize:10,color:C.textSub,fontFamily:"monospace",textAlign:"right",flexShrink:0}}>{raw_value}</div>
      <div style={{width:42,fontSize:10,fontFamily:"monospace",color:isPos?C.accent:C.blue,textAlign:"right",flexShrink:0}}>{isPos?"+":""}{shap_value.toFixed(2)}</div>
    </div>
  );
};

// ── Fleet Overview ────────────────────────────────────────────────────────────
function FleetOverview({ fleet, loading, error, onSelect }) {
  console.log('tes')
  if(loading) return <div style={{display:"flex",gap:10,alignItems:"center",color:C.textSub,padding:40}}><Spinner/> Loading fleet predictions from real model…</div>;
  if(error)   return <ErrorBox msg={error}/>;
  if(!fleet.length) return <div style={{color:C.textSub,padding:40,textAlign:"center"}}>No fleet data</div>;
  const critical=fleet.filter(e=>e.risk_level==="CRITICAL");
  const elevated=fleet.filter(e=>e.risk_level==="ELEVATED");
  const nominal=fleet.filter(e=>e.risk_level==="NOMINAL");
  const SC=({label,value,color,sub})=>(
    <div style={{background:C.surface,border:`1px solid ${color}33`,borderRadius:10,padding:"18px 22px",flex:1,minWidth:130}}>
      <div style={{fontSize:28,fontWeight:900,color,fontFamily:"monospace",lineHeight:1}}>{value}</div>
      <div style={{fontSize:12,color:C.text,marginTop:4,fontWeight:600}}>{label}</div>
      <div style={{fontSize:10,color:C.textSub,marginTop:2}}>{sub}</div>
    </div>
  );
  return (
    <div>
      <div style={{marginBottom:24}}>
        <div style={{fontSize:11,color:C.accent,letterSpacing:"0.12em",fontWeight:700,marginBottom:6,textTransform:"uppercase"}}>Fleet Intelligence Overview</div>
        <div style={{fontSize:22,fontWeight:800,color:C.text}}>Equipment Health Status</div>
        <div style={{fontSize:13,color:C.textSub,marginTop:4}}>Real XGBoost predictions via Flask backend (AUC 0.98+) · SHAP explanations per asset</div>
      </div>
      <div style={{display:"flex",gap:12,marginBottom:28,flexWrap:"wrap"}}>
        <SC label="Critical Risk" value={critical.length} color={C.accent} sub="Immediate action required"/>
        <SC label="Elevated Risk" value={elevated.length} color={C.gold}   sub="Schedule inspection"/>
        <SC label="Nominal"       value={nominal.length}  color={C.green}  sub="Operating within range"/>
        <SC label="Total Assets"  value={fleet.length}    color={C.blue}   sub="Across 4 sites"/>
      </div>
      <div style={{display:"grid",gap:12}}>
        {[...fleet].sort((a,b)=>b.xgb_prob-a.xgb_prob).map(eq=>{
          const p=eq.xgb_prob||0;
          const color=p>=0.5?C.accent:p>=0.25?C.gold:C.green;
          return (
            <div key={eq.id} onClick={()=>onSelect(eq)}
              style={{background:C.surface,border:`1px solid ${p>=0.5?C.accent+"44":C.border}`,borderRadius:10,padding:"16px 20px",cursor:"pointer",transition:"all 0.2s",display:"flex",alignItems:"center",gap:16}}
              onMouseEnter={e=>e.currentTarget.style.borderColor=color+"88"}
              onMouseLeave={e=>e.currentTarget.style.borderColor=p>=0.5?C.accent+"44":C.border}>
              <div style={{width:44,height:44,borderRadius:10,background:color+"18",border:`1.5px solid ${color}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>
                {p>=0.5?"⚠":p>=0.25?"⚡":"✓"}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:700,color:C.text,fontSize:14}}>{eq.name}</div>
                <div style={{fontSize:11,color:C.textSub,marginTop:2}}>{eq.id} · {eq.site} · Type {eq.machine_type}</div>
              </div>
              <div style={{width:160,flexShrink:0}}>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:C.textSub,marginBottom:4}}>
                  <span>FAILURE PROBABILITY</span><span style={{color,fontFamily:"monospace",fontWeight:700}}>{(p*100).toFixed(1)}%</span>
                </div>
                <div style={{height:6,borderRadius:3,background:C.border}}>
                  <div style={{height:"100%",width:`${p*100}%`,borderRadius:3,background:color,boxShadow:`0 0 8px ${color}66`,transition:"width 0.8s ease"}}/>
                </div>
              </div>
              <RiskBadge level={eq.risk_level} prob={p}/>
              <div style={{color:C.textSub,fontSize:16,flexShrink:0}}>›</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Equipment Detail ──────────────────────────────────────────────────────────
function EquipmentDetail({ eq, onBack }) {
  const p=eq.xgb_prob||0;
  return (
    <div>
      <button onClick={onBack} style={{background:"none",border:`1px solid ${C.border}`,color:C.textSub,borderRadius:6,padding:"6px 14px",cursor:"pointer",fontSize:12,marginBottom:20}}>← Back to Fleet</button>
      <div style={{display:"flex",gap:16,flexWrap:"wrap",marginBottom:20,alignItems:"flex-start"}}>
        <div style={{flex:1,minWidth:260}}>
          <div style={{fontSize:11,color:C.accent,letterSpacing:"0.12em",fontWeight:700,marginBottom:4,textTransform:"uppercase"}}>{eq.id} · {eq.site}</div>
          <div style={{fontSize:22,fontWeight:800,color:C.text}}>{eq.name}</div>
          <div style={{marginTop:8}}><RiskBadge level={eq.risk_level} prob={p}/></div>
        </div>
        <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:"16px 24px",textAlign:"center"}}>
          <GaugeArc prob={p} size={160}/>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16}}>
        <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:18}}>
          <div style={{fontSize:11,color:C.textSub,letterSpacing:"0.1em",fontWeight:600,marginBottom:14,textTransform:"uppercase"}}>Sensor Readings</div>
          <MiniBar value={eq.tool_wear}  max={240} color={C.accent} label="Tool Wear"        unit=" min"/>
          <MiniBar value={((eq.process_temp||0)-(eq.air_temp||0)).toFixed(1)} max={15} color={C.gold} label="Temp Differential" unit=" K"/>
          <MiniBar value={eq.rot_speed}  max={2860} color={C.blue}  label="Rotational Speed" unit=" rpm"/>
          <MiniBar value={eq.torque}     max={76}   color={C.green} label="Torque"            unit=" Nm"/>
        </div>
        <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:18}}>
          <div style={{fontSize:11,color:C.textSub,letterSpacing:"0.1em",fontWeight:600,marginBottom:14,textTransform:"uppercase"}}>Model Comparison</div>
          {[{label:"XGBoost (production)",prob:eq.xgb_prob||0,color:C.accent},{label:"Random Forest",prob:eq.rf_prob||0,color:C.blue}].map(m=>(
            <div key={m.label} style={{marginBottom:16}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                <div style={{fontSize:12,fontWeight:600,color:C.text}}>{m.label}</div>
                <div style={{fontFamily:"monospace",fontWeight:800,color:m.color,fontSize:18}}>{(m.prob*100).toFixed(1)}%</div>
              </div>
              <div style={{height:8,borderRadius:4,background:C.border}}>
                <div style={{height:"100%",width:`${m.prob*100}%`,borderRadius:4,background:m.color,boxShadow:`0 0 10px ${m.color}66`}}/>
              </div>
            </div>
          ))}
          <div style={{borderTop:`1px solid ${C.border}`,paddingTop:12,marginTop:8}}>
            {[["Air Temp",`${eq.air_temp} K`],["Process Temp",`${eq.process_temp} K`],
              ["Rot. Speed",`${eq.rot_speed} rpm`],["Torque",`${eq.torque} Nm`],
              ["Tool Wear",`${eq.tool_wear} min`],["Machine Type",`Type ${eq.machine_type}`],
              ["Power (derived)",`${(eq.torque*eq.rot_speed).toFixed(0)} W`],
              ["Temp Diff (derived)",`${((eq.process_temp||0)-(eq.air_temp||0)).toFixed(1)} K`],
            ].map(([k,v])=>(
              <div key={k} style={{display:"flex",justifyContent:"space-between",fontSize:11,marginBottom:3}}>
                <span style={{color:C.textSub}}>{k}</span>
                <span style={{color:C.text,fontFamily:"monospace"}}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      {eq.shap?.length>0 && (
        <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:18}}>
          <div style={{fontSize:11,color:C.textSub,letterSpacing:"0.1em",fontWeight:600,marginBottom:4,textTransform:"uppercase"}}>SHAP Contributions — Real XGBoost Explanation</div>
          <div style={{fontSize:11,color:C.textSub,marginBottom:16}}>
            <span style={{color:C.accent}}>■ Red</span> increases risk &nbsp; <span style={{color:C.blue}}>■ Blue</span> decreases risk
          </div>
          {eq.shap.map(s=><ShapBar key={s.feature} {...s}/>)}
        </div>
      )}
    </div>
  );
}

// ── Predictor ─────────────────────────────────────────────────────────────────
function Predictor({ apiOnline }) {
  const [form,setForm]=useState({air_temp:300.0,process_temp:311.0,rot_speed:1400,torque:60.0,tool_wear:150,machine_type:"M"});
  const [result,setResult]=useState(null);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState(null);
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));
  const run=async()=>{
    setLoading(true);setError(null);setResult(null);
    try {
      const d=await apiPredict({...form,air_temp:+form.air_temp,process_temp:+form.process_temp,rot_speed:+form.rot_speed,torque:+form.torque,tool_wear:+form.tool_wear});
      setResult(d);
    } catch(e){setError(e.message);}
    finally{setLoading(false);}
  };
  const IS={background:C.panel,border:`1px solid ${C.border}`,borderRadius:6,padding:"8px 12px",color:C.text,fontSize:13,fontFamily:"monospace",width:"100%",boxSizing:"border-box"};
  const LS={fontSize:11,color:C.textSub,marginBottom:4,display:"block",letterSpacing:"0.06em"};
  return (
    <div>
      <div style={{marginBottom:24}}>
        <div style={{fontSize:11,color:C.accent,letterSpacing:"0.12em",fontWeight:700,marginBottom:6,textTransform:"uppercase"}}>Real-Time Prediction Engine</div>
        <div style={{fontSize:22,fontWeight:800,color:C.text}}>Run Failure Prediction</div>
        <div style={{fontSize:13,color:C.textSub,marginTop:4}}>Calls <code style={{background:C.panel,padding:"1px 6px",borderRadius:3,fontSize:12}}>POST /predict</code> — real XGBoost model + live SHAP</div>
      </div>
      {!apiOnline&&<ErrorBox msg="Backend offline — cd backend && python app.py"/>}
      {error&&<ErrorBox msg={error}/>}
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14,marginBottom:20}}>
        {[{key:"air_temp",label:"Air Temperature (K)",min:295,max:305,step:0.1},
          {key:"process_temp",label:"Process Temperature (K)",min:305,max:320,step:0.1},
          {key:"rot_speed",label:"Rotational Speed (RPM)",min:1168,max:2860,step:1},
          {key:"torque",label:"Torque (Nm)",min:3.8,max:76.6,step:0.1},
          {key:"tool_wear",label:"Tool Wear (min)",min:0,max:253,step:1},
        ].map(f=>(
          <div key={f.key}>
            <label style={LS}>{f.label}</label>
            <input type="number" value={form[f.key]} min={f.min} max={f.max} step={f.step}
              onChange={e=>set(f.key,e.target.value)} style={IS}/>
            <div style={{fontSize:10,color:C.muted,marginTop:3}}>Range: {f.min}–{f.max}</div>
          </div>
        ))}
        <div>
          <label style={LS}>Machine Type</label>
          <select value={form.machine_type} onChange={e=>set("machine_type",e.target.value)} style={{...IS,appearance:"none"}}>
            <option value="L">Type L — Light</option>
            <option value="M">Type M — Medium</option>
            <option value="H">Type H — Heavy</option>
          </select>
        </div>
      </div>
      <button onClick={run} disabled={loading||!apiOnline}
        style={{background:loading||!apiOnline?"#333":C.accent,color:"#fff",border:"none",borderRadius:8,padding:"12px 28px",fontWeight:800,fontSize:14,cursor:loading||!apiOnline?"not-allowed":"pointer",boxShadow:loading||!apiOnline?"none":`0 0 20px ${C.accentGlow}`,display:"flex",alignItems:"center",gap:10}}>
        {loading?<><Spinner/>Running…</>:"▶ RUN PREDICTION"}
      </button>
      {result&&(
        <div style={{marginTop:24}}>
          <div style={{display:"grid",gridTemplateColumns:"auto 1fr",gap:16}}>
            <div style={{background:C.surface,border:`1px solid ${result.xgb_prob>=0.5?C.accent+"55":C.border}`,borderRadius:12,padding:"24px 32px",textAlign:"center"}}>
              <GaugeArc prob={result.xgb_prob} size={180}/>
              <div style={{marginTop:8}}><RiskBadge level={result.risk_level} prob={result.xgb_prob}/></div>
              <div style={{marginTop:12,fontSize:11,color:C.textSub}}>
                <div>XGBoost: <span style={{color:C.accent,fontFamily:"monospace",fontWeight:700}}>{(result.xgb_prob*100).toFixed(2)}%</span></div>
                <div style={{marginTop:4}}>Random Forest: <span style={{color:C.blue,fontFamily:"monospace",fontWeight:700}}>{(result.rf_prob*100).toFixed(2)}%</span></div>
              </div>
              <div style={{marginTop:10,fontSize:10,color:C.muted,background:C.panel,borderRadius:6,padding:"6px 10px"}}>
                Power: {result.derived?.power?.toFixed(0)} W · Temp Diff: {result.derived?.temp_diff?.toFixed(1)} K
              </div>
            </div>
            <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:20}}>
              <div style={{fontSize:11,color:C.textSub,letterSpacing:"0.1em",fontWeight:600,marginBottom:4,textTransform:"uppercase"}}>SHAP — Real Model Explanation</div>
              <div style={{fontSize:11,color:C.textSub,marginBottom:16}}>
                <span style={{color:C.accent}}>■</span> increases risk &nbsp;<span style={{color:C.blue}}>■</span> decreases risk
              </div>
              {result.shap?.map(s=><ShapBar key={s.feature} {...s}/>)}
            </div>
          </div>
          {result.risk_level==="CRITICAL"&&(
            <div style={{marginTop:16,background:C.accentDim,border:`1px solid ${C.accent}55`,borderRadius:10,padding:"14px 18px",display:"flex",gap:14}}>
              <div style={{fontSize:22}}>⚠</div>
              <div>
                <div style={{fontWeight:700,color:C.accent,fontSize:14,marginBottom:4}}>MAINTENANCE ALERT — Immediate Inspection Recommended</div>
                <div style={{fontSize:12,color:C.text}}>
                  XGBoost model predicts <strong style={{color:C.accent}}>{(result.xgb_prob*100).toFixed(1)}% failure probability</strong>.
                  Primary risk drivers: {result.shap?.slice(0,2).filter(s=>s.shap_value>0).map(s=>s.feature).join(" and ")}.
                  Refer to Mines Safety and Inspection Act 1994 WA.
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Model Performance ─────────────────────────────────────────────────────────
function ModelPerformance({ apiOnline }) {
  const [data,setData]=useState(null);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState(null);
  useEffect(()=>{
    if(!apiOnline)return;
    setLoading(true);
    apiPerformance().then(setData).catch(e=>setError(e.message)).finally(()=>setLoading(false));
  },[apiOnline]);
  if(!apiOnline) return <ErrorBox msg="Backend offline — cd backend && python app.py"/>;
  if(loading)   return <div style={{display:"flex",gap:10,alignItems:"center",color:C.textSub,padding:40}}><Spinner/> Fetching metrics…</div>;
  if(error)     return <ErrorBox msg={error}/>;
  if(!data)     return null;
  const {results,xgb_fi,rf_fi,mean_shap,thresh_results}=data;
  const MC=({value,label,color,isTop})=>(
    <div style={{background:C.panel,borderRadius:8,padding:"12px 14px",border:`1px solid ${isTop?color+"55":C.border}`}}>
      <div style={{fontSize:20,fontWeight:900,color:isTop?color:C.text,fontFamily:"monospace"}}>{(value*100).toFixed(2)}%</div>
      <div style={{fontSize:10,color:C.textSub,marginTop:2,textTransform:"uppercase",letterSpacing:"0.06em"}}>{label}</div>
    </div>
  );
  return (
    <div>
      <div style={{marginBottom:24}}>
        <div style={{fontSize:11,color:C.accent,letterSpacing:"0.12em",fontWeight:700,marginBottom:6,textTransform:"uppercase"}}>Model Evaluation</div>
        <div style={{fontSize:22,fontWeight:800,color:C.text}}>Live Performance Metrics</div>
        <div style={{fontSize:13,color:C.textSub,marginTop:4}}>From <code style={{background:C.panel,padding:"1px 6px",borderRadius:3,fontSize:12}}>GET /model/performance</code> — real test set results</div>
      </div>
      {[["xgb","XGBoost",C.accent,true],["rf","Random Forest",C.blue,false]].map(([key,name,color,sel])=>{
        const m=results[key]; if(!m) return null;
        return (
          <div key={key} style={{background:C.surface,border:`1px solid ${sel?color+"44":C.border}`,borderRadius:12,padding:20,marginBottom:16}}>
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}>
              <div style={{fontWeight:800,fontSize:16,color:C.text}}>{name}</div>
              {sel&&<Badge color={C.accent}>PRODUCTION MODEL</Badge>}
              <Badge color={color}>AUC {m.auc?.toFixed(4)}</Badge>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:10,marginBottom:16}}>
              <MC value={m.accuracy}  label="Accuracy"/>
              <MC value={m.precision} label="Precision"/>
              <MC value={m.recall}    label="Recall"   color={color} isTop={m.recall>=0.7}/>
              <MC value={m.f1}        label="F1 Score" color={color} isTop/>
              <MC value={m.auc}       label="ROC AUC"  color={color} isTop/>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <div style={{background:C.panel,borderRadius:8,padding:14}}>
                <div style={{fontSize:11,color:C.textSub,marginBottom:12,textTransform:"uppercase",letterSpacing:"0.08em"}}>Confusion Matrix</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,maxWidth:220}}>
                  {[{l:"True Negative",v:m.tn,c:C.green},{l:"False Positive",v:m.fp,c:C.gold},
                    {l:"False Negative",v:m.fn,c:C.accent},{l:"True Positive",v:m.tp,c:C.green}].map(cell=>(
                    <div key={cell.l} style={{background:cell.c+"18",border:`1px solid ${cell.c}33`,borderRadius:6,padding:"8px 10px",textAlign:"center"}}>
                      <div style={{fontSize:20,fontWeight:900,color:cell.c,fontFamily:"monospace"}}>{cell.v}</div>
                      <div style={{fontSize:9,color:C.textSub,marginTop:2}}>{cell.l}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{background:C.panel,borderRadius:8,padding:14,fontSize:12,color:C.text,lineHeight:1.8}}>
                <div style={{fontSize:11,color:C.textSub,marginBottom:10,textTransform:"uppercase",letterSpacing:"0.08em"}}>Operational Summary</div>
                <div>✓ Catches <strong style={{color}}>{m.tp} of {m.tp+m.fn}</strong> failures ({m.recall?`${(m.recall*100).toFixed(1)}%`:"—"} recall)</div>
                <div>✓ <strong style={{color}}>{m.fp} false alarms</strong> per test set</div>
                <div>✓ <strong style={{color:C.accent}}>{m.fn} failures missed</strong> (critical)</div>
              </div>
            </div>
          </div>
        );
      })}
      <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:20,marginBottom:16}}>
        <div style={{fontSize:11,color:C.textSub,marginBottom:14,textTransform:"uppercase",letterSpacing:"0.08em"}}>Threshold Analysis — XGBoost</div>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
          <thead><tr>{["Threshold","Precision","Recall","F1","False Pos","False Neg"].map(h=>(
            <th key={h} style={{padding:"8px 10px",textAlign:"left",color:C.textSub,fontWeight:600,borderBottom:`1px solid ${C.border}`}}>{h}</th>
          ))}</tr></thead>
          <tbody>{thresh_results?.map((t,i)=>(
            <tr key={i} style={{background:t.threshold===0.5?"rgba(232,67,26,0.06)":"transparent",borderBottom:`1px solid ${C.border}44`}}>
              <td style={{padding:"7px 10px",fontFamily:"monospace",fontWeight:t.threshold===0.5?800:400,color:t.threshold===0.5?C.accent:C.text}}>{t.threshold}{t.threshold===0.5?" ← default":""}</td>
              <td style={{padding:"7px 10px",fontFamily:"monospace",color:C.text}}>{(t.precision*100).toFixed(1)}%</td>
              <td style={{padding:"7px 10px",fontFamily:"monospace",color:C.text}}>{(t.recall*100).toFixed(1)}%</td>
              <td style={{padding:"7px 10px",fontFamily:"monospace",color:C.text}}>{(t.f1*100).toFixed(1)}%</td>
              <td style={{padding:"7px 10px",fontFamily:"monospace",color:C.gold}}>{t.fp}</td>
              <td style={{padding:"7px 10px",fontFamily:"monospace",color:C.accent}}>{t.fn}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:20}}>
        <div style={{fontSize:11,color:C.textSub,marginBottom:16,textTransform:"uppercase",letterSpacing:"0.08em"}}>
          Feature Importance — <span style={{color:C.accent}}>XGBoost native</span> + <span style={{color:C.blue}}>SHAP mean |φ|</span>
        </div>
        {Object.entries(xgb_fi||{}).sort((a,b)=>b[1]-a[1]).map(([feat,score])=>{
          const sv=mean_shap?.[feat]||0;
          const maxS=Math.max(...Object.values(mean_shap||{1:1}));
          return (
            <div key={feat} style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
              <div style={{width:210,fontSize:12,color:C.text,flexShrink:0}}>{feat.replace(/_/g," ")}</div>
              <div style={{flex:1}}>
                <div style={{height:7,borderRadius:4,background:C.border,marginBottom:3}}>
                  <div style={{height:"100%",width:`${Math.min(score*500,100)}%`,borderRadius:4,background:C.accent}}/>
                </div>
                <div style={{height:5,borderRadius:4,background:C.border}}>
                  <div style={{height:"100%",width:`${(sv/maxS)*100}%`,borderRadius:4,background:C.blue,opacity:0.8}}/>
                </div>
              </div>
              <div style={{width:90,fontSize:10,fontFamily:"monospace",color:C.textSub,textAlign:"right",flexShrink:0}}>
                <span style={{color:C.accent}}>{score.toFixed(3)}</span> / <span style={{color:C.blue}}>{sv.toFixed(3)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Reports ───────────────────────────────────────────────────────────────────
function Reports({ fleet }) {
  const [gen,setGen]=useState(false);
  const now=new Date();
  const critical=fleet.filter(e=>e.risk_level==="CRITICAL");
  const elevated=fleet.filter(e=>e.risk_level==="ELEVATED");
  return (
    <div>
      <div style={{marginBottom:24}}>
        <div style={{fontSize:11,color:C.accent,letterSpacing:"0.12em",fontWeight:700,marginBottom:6,textTransform:"uppercase"}}>Report Centre</div>
        <div style={{fontSize:22,fontWeight:800,color:C.text}}>Maintenance Intelligence Report</div>
        <div style={{fontSize:13,color:C.textSub,marginTop:4}}>Compliance-ready report from live backend predictions</div>
      </div>
      <button onClick={()=>setGen(true)} disabled={!fleet.length}
        style={{background:fleet.length?C.accent:"#333",color:"#fff",border:"none",borderRadius:8,padding:"10px 24px",fontWeight:800,fontSize:13,cursor:fleet.length?"pointer":"not-allowed",boxShadow:fleet.length?`0 0 16px ${C.accentGlow}`:"none",marginBottom:24}}>
        Generate Report
      </button>
      {!gen&&<div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:24,textAlign:"center",color:C.textSub,fontSize:13}}>Click Generate Report to build a compliance-ready report from live predictions</div>}
      {gen&&fleet.length>0&&(
        <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:28}}>
          <div style={{borderBottom:`2px solid ${C.accent}`,paddingBottom:18,marginBottom:22}}>
            <div style={{display:"flex",justifyContent:"space-between"}}>
              <div>
                <div style={{fontSize:8,color:C.accent,letterSpacing:"0.2em",fontWeight:800,textTransform:"uppercase",marginBottom:4}}>WestMine Resources · PredictaMine AI System</div>
                <div style={{fontSize:20,fontWeight:900,color:C.text}}>EQUIPMENT HEALTH REPORT</div>
                <div style={{fontSize:12,color:C.textSub,marginTop:6}}>
                  {now.toLocaleDateString("en-AU")} {now.toLocaleTimeString("en-AU",{hour:"2-digit",minute:"2-digit"})} · XGBoost + RandomForest · AI4I 2020 dataset
                </div>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{fontSize:10,color:C.textSub}}>Compliance Ref.</div>
                <div style={{fontSize:11,color:C.text,fontFamily:"monospace"}}>MSI-ACT-1994-WA</div>
              </div>
            </div>
          </div>
          <div style={{marginBottom:22}}>
            <div style={{fontSize:12,fontWeight:700,color:C.accent,marginBottom:10,textTransform:"uppercase",letterSpacing:"0.08em"}}>Executive Summary</div>
            <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:14}}>
              {[{l:"Assets Monitored",v:fleet.length,c:C.blue},{l:"Critical Risk",v:critical.length,c:C.accent},
                {l:"Elevated Risk",v:elevated.length,c:C.gold},{l:"Model",v:"XGBoost",c:C.green}].map(s=>(
                <div key={s.l} style={{background:s.c+"14",border:`1px solid ${s.c}33`,borderRadius:8,padding:"10px 16px",minWidth:110}}>
                  <div style={{fontSize:s.l==="Model"?14:20,fontWeight:900,color:s.c,fontFamily:"monospace"}}>{s.v}</div>
                  <div style={{fontSize:10,color:C.textSub,marginTop:2}}>{s.l}</div>
                </div>
              ))}
            </div>
            {critical.length>0&&<div style={{background:C.accentDim,border:`1px solid ${C.accent}44`,borderRadius:8,padding:"10px 14px",fontSize:12,color:C.text}}>
              ⚠ <strong style={{color:C.accent}}>{critical.length} asset(s)</strong> exceed 50% failure threshold — immediate inspection required.
            </div>}
          </div>
          <div style={{marginBottom:22}}>
            <div style={{fontSize:12,fontWeight:700,color:C.accent,marginBottom:10,textTransform:"uppercase",letterSpacing:"0.08em"}}>Equipment Risk Register</div>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
              <thead><tr style={{background:C.panel}}>
                {["Asset ID","Name","Site","Type","Tool Wear","Temp Diff","XGBoost %","RF %","Status","Action"].map(h=>(
                  <th key={h} style={{padding:"8px 10px",textAlign:"left",color:C.textSub,fontWeight:600,borderBottom:`1px solid ${C.border}`}}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {[...fleet].sort((a,b)=>b.xgb_prob-a.xgb_prob).map((eq,i)=>{
                  const p=eq.xgb_prob||0;
                  const color=p>=0.5?C.accent:p>=0.25?C.gold:C.green;
                  const action=p>=0.5?"Immediate inspection":p>=0.25?"Schedule 48h":"Monitor";
                  return (
                    <tr key={eq.id} style={{background:i%2===0?"transparent":C.panel+"88",borderBottom:`1px solid ${C.border}44`}}>
                      <td style={{padding:"7px 10px",color:C.textSub,fontFamily:"monospace"}}>{eq.id}</td>
                      <td style={{padding:"7px 10px",color:C.text,fontWeight:600}}>{eq.name}</td>
                      <td style={{padding:"7px 10px",color:C.textSub}}>{eq.site}</td>
                      <td style={{padding:"7px 10px",color:C.textSub}}>{eq.machine_type}</td>
                      <td style={{padding:"7px 10px",fontFamily:"monospace",color:eq.tool_wear>200?C.accent:C.text}}>{eq.tool_wear} min</td>
                      <td style={{padding:"7px 10px",fontFamily:"monospace",color:C.text}}>{((eq.process_temp||0)-(eq.air_temp||0)).toFixed(1)} K</td>
                      <td style={{padding:"7px 10px",fontFamily:"monospace",fontWeight:800,color}}>{(p*100).toFixed(1)}%</td>
                      <td style={{padding:"7px 10px",fontFamily:"monospace",color:C.blue}}>{((eq.rf_prob||0)*100).toFixed(1)}%</td>
                      <td style={{padding:"7px 10px"}}><span style={{color,fontSize:10,fontWeight:700}}>{eq.risk_level}</span></td>
                      <td style={{padding:"7px 10px",color:C.textSub,fontSize:10}}>{action}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div style={{borderTop:`1px solid ${C.border}`,paddingTop:16,fontSize:10,color:C.muted,lineHeight:1.7}}>
            <strong style={{color:C.textSub}}>Model:</strong> XGBoost + RandomForest — AI4I 2020 (Matzka, 2020). SMOTE. Features: Air temp, Process temp, Rotational speed, Torque, Tool wear, Machine type, Power (derived), Temp differential (derived). Threshold: 0.5.
            PredictaMine — ICT619 Assignment 2, Murdoch University 2026. For WA Mines Safety and Inspection Act 1994 compliance.
          </div>
        </div>
      )}
    </div>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [page,setPage]=useState("fleet");
  const [selected,setSelected]=useState(null);
  const [fleet,setFleet]=useState([]);
  const [fleetLoading,setFleetLoading]=useState(false);
  const [fleetError,setFleetError]=useState(null);
  const [apiOnline,setApiOnline]=useState(false);

  useEffect(()=>{
    (async()=>{
      const ok=await apiHealth();
      setApiOnline(ok);
      if(!ok){setFleetError("Cannot reach backend at "+API_BASE+". Run: cd backend && python app.py");return;}
      setFleetLoading(true);
      try {
        const enriched=await Promise.all(FLEET_DEFS.map(async eq=>{
          const pred=await apiPredict({air_temp:eq.air_temp,process_temp:eq.process_temp,
            rot_speed:eq.rot_speed,torque:eq.torque,tool_wear:eq.tool_wear,machine_type:eq.machine_type});
          return {...eq,...pred};
        }));
        setFleet(enriched);
      } catch(e){setFleetError(e.message);}
      finally{setFleetLoading(false);}
    })();
  },[]);

  const now=new Date();
  const critical=fleet.filter(e=>e.risk_level==="CRITICAL");
  const navItems=[{id:"fleet",label:"Fleet Overview",icon:"◈"},{id:"predict",label:"Predictor",icon:"⚡"},{id:"performance",label:"Model Performance",icon:"◎"},{id:"reports",label:"Reports",icon:"▤"}];

  return (
    <div style={{minHeight:"100vh",background:C.bg,color:C.text,fontFamily:"'DM Sans','Segoe UI',sans-serif"}}>
      <style>{`*{box-sizing:border-box}@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* Topbar */}
      <div style={{background:C.surface,borderBottom:`1px solid ${C.border}`,padding:"0 28px",display:"flex",alignItems:"center",height:56,position:"sticky",top:0,zIndex:100}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginRight:40}}>
          <div style={{width:28,height:28,background:C.accent,borderRadius:7,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:900,boxShadow:`0 0 12px ${C.accentGlow}`}}>P</div>
          <div>
            <div style={{fontSize:14,fontWeight:800,color:C.text}}>PredictaMine</div>
            <div style={{fontSize:9,color:C.textSub,letterSpacing:"0.12em",textTransform:"uppercase",marginTop:-1}}>WestMine Resources</div>
          </div>
        </div>
        <nav style={{display:"flex",gap:4}}>
          {navItems.map(n=>(
            <button key={n.id} onClick={()=>{setPage(n.id);setSelected(null);}}
              style={{background:page===n.id?C.accentDim:"none",border:`1px solid ${page===n.id?C.accent+"44":"transparent"}`,color:page===n.id?C.accent:C.textSub,borderRadius:7,padding:"6px 14px",cursor:"pointer",fontSize:12,fontWeight:600,display:"flex",alignItems:"center",gap:6}}>
              <span style={{fontSize:10}}>{n.icon}</span>{n.label}
            </button>
          ))}
        </nav>
        <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:16,fontSize:11}}>
          <ApiStatus online={apiOnline}/>
          <div style={{color:C.textSub,fontFamily:"monospace"}}>{now.toLocaleDateString("en-AU")} {now.toLocaleTimeString("en-AU",{hour:"2-digit",minute:"2-digit"})}</div>
          <div style={{background:C.accentDim,border:`1px solid ${C.accent}33`,borderRadius:5,padding:"3px 8px",fontSize:10,color:C.accent,fontWeight:700}}>
            {apiOnline?"XGBoost · Live":"Offline"}
          </div>
        </div>
      </div>

      {critical.length>0&&(
        <div style={{background:C.accentDim,borderBottom:`1px solid ${C.accent}33`,padding:"8px 28px",display:"flex",alignItems:"center",gap:10,fontSize:12}}>
          <span style={{color:C.accent,fontWeight:800}}>⚠ ACTIVE ALERT</span>
          <span style={{color:C.text}}>{critical.map(e=>e.name).join(", ")} — critical failure risk. Immediate inspection required.</span>
          <button onClick={()=>setPage("reports")} style={{marginLeft:"auto",background:C.accent,color:"#fff",border:"none",borderRadius:5,padding:"4px 12px",cursor:"pointer",fontSize:11,fontWeight:700}}>View Report</button>
        </div>
      )}

      <div style={{maxWidth:1100,margin:"0 auto",padding:"28px 24px"}}>
        {page==="fleet"&&!selected&&<FleetOverview fleet={fleet} loading={fleetLoading} error={fleetError} onSelect={eq=>{setSelected(eq);setPage("detail");}}/>}
        {page==="detail"&&selected&&<EquipmentDetail eq={selected} onBack={()=>{setPage("fleet");setSelected(null);}}/>}
        {page==="predict"&&<Predictor apiOnline={apiOnline}/>}
        {page==="performance"&&<ModelPerformance apiOnline={apiOnline}/>}
        {page==="reports"&&<Reports fleet={fleet}/>}
      </div>
    </div>
  );
}
