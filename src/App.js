import { useState, useEffect } from "react";

const API_BASE =
  (typeof process !== "undefined" && process.env?.REACT_APP_API_URL) ||
  "http://localhost:5001";

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
  try { const r = await fetch(`${API_BASE}/health`); return r.ok; } catch { return false; }
}

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

const C = {
  bg:"#0b0c14", surface:"#13141f", panel:"#181929", border:"#21233a",
  accent:"#e8431a", accentDim:"rgba(232,67,26,0.10)",
  gold:"#e09d00", green:"#1fba57", blue:"#4080f0",
  muted:"#3a3d58", text:"#dde0ef", textSub:"#6e7192",
};

const RiskPill = ({ level, prob }) => {
  const pct = prob != null ? ` ${(prob * 100).toFixed(1)}%` : "";
  const map = {
    CRITICAL: { bg:"rgba(232,67,26,0.12)", color:C.accent, label:"Critical" },
    ELEVATED: { bg:"rgba(224,157,0,0.12)",  color:C.gold,   label:"Elevated" },
    NOMINAL:  { bg:"rgba(31,186,87,0.12)",  color:C.green,  label:"Nominal"  },
  };
  const s = map[level] || map.NOMINAL;
  return (
    <span style={{background:s.bg, color:s.color, border:`1px solid ${s.color}33`,
      borderRadius:4, padding:"2px 9px", fontSize:11, fontWeight:600}}>
      {s.label}{pct}
    </span>
  );
};

const Spinner = () => (
  <span style={{display:"inline-block",width:13,height:13,border:`2px solid ${C.border}`,
    borderTop:`2px solid ${C.accent}`,borderRadius:"50%",animation:"spin 0.7s linear infinite"}}/>
);

const SectionTitle = ({ label, sub }) => (
  <div style={{marginBottom:22}}>
    <h2 style={{margin:0,fontSize:20,fontWeight:700,color:C.text}}>{label}</h2>
    {sub && <p style={{margin:"4px 0 0",fontSize:13,color:C.textSub}}>{sub}</p>}
  </div>
);

const GaugeArc = ({ prob=0, size=140 }) => {
  const r=44, cx=size/2, cy=size/2, circ=Math.PI*r;
  const offset = circ * (1 - Math.min(prob, 1));
  const color = prob>=0.5 ? C.accent : prob>=0.25 ? C.gold : C.green;
  return (
    <svg width={size} height={size*0.58} viewBox={`0 0 ${size} ${size*0.58}`}>
      <path d={`M${cx-r} ${cy} A${r} ${r} 0 0 1 ${cx+r} ${cy}`} fill="none" stroke={C.border} strokeWidth={7}/>
      <path d={`M${cx-r} ${cy} A${r} ${r} 0 0 1 ${cx+r} ${cy}`} fill="none" stroke={color} strokeWidth={7}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        style={{transition:"stroke-dashoffset 0.8s ease"}}/>
      <text x={cx} y={cy-2} textAnchor="middle" fill={color} fontSize={17} fontWeight={700} fontFamily="monospace">
        {(prob*100).toFixed(1)}%
      </text>
      <text x={cx} y={cy+13} textAnchor="middle" fill={C.textSub} fontSize={9} fontFamily="sans-serif">
        failure probability
      </text>
    </svg>
  );
};

const MiniBar = ({ value, max, color, label, unit="" }) => {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div style={{marginBottom:8}}>
      <div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:C.textSub,marginBottom:3}}>
        <span>{label}</span>
        <span style={{color:C.text,fontFamily:"monospace"}}>{value}{unit}</span>
      </div>
      <div style={{height:4,borderRadius:2,background:C.border}}>
        <div style={{height:"100%",width:`${pct}%`,borderRadius:2,background:color,transition:"width 0.6s ease"}}/>
      </div>
    </div>
  );
};

const ShapBar = ({ feature, shap_value, raw_value }) => {
  const isPos = shap_value > 0;
  const pct = Math.min(Math.abs(shap_value) / 3.5 * 100, 100);
  return (
    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:7}}>
      <div style={{width:155,fontSize:11,color:C.textSub,textAlign:"right",flexShrink:0}}>{feature}</div>
      <div style={{flex:1,height:18,position:"relative",display:"flex",alignItems:"center"}}>
        <div style={{position:"absolute",left:"50%",width:1,height:"100%",background:C.border}}/>
        {isPos
          ? <div style={{position:"absolute",left:"50%",width:`${pct/2}%`,height:12,background:C.accent,borderRadius:"0 2px 2px 0"}}/>
          : <div style={{position:"absolute",right:"50%",width:`${pct/2}%`,height:12,background:C.blue,borderRadius:"2px 0 0 2px"}}/>
        }
      </div>
      <div style={{width:62,fontSize:10,color:C.textSub,fontFamily:"monospace",textAlign:"right",flexShrink:0}}>{raw_value}</div>
      <div style={{width:40,fontSize:10,fontFamily:"monospace",color:isPos?C.accent:C.blue,textAlign:"right",flexShrink:0}}>
        {isPos?"+":""}{shap_value.toFixed(2)}
      </div>
    </div>
  );
};

const Card = ({ children, style={} }) => (
  <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:18,...style}}>
    {children}
  </div>
);

const CardLabel = ({ children }) => (
  <div style={{fontSize:11,color:C.textSub,fontWeight:600,marginBottom:12,textTransform:"uppercase",letterSpacing:"0.07em"}}>
    {children}
  </div>
);

// ── Skeleton placeholder row ──────────────────────────────────────────────────
const SkeletonRow = () => (
  <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:"16px 20px",
    display:"flex",alignItems:"center",gap:16,opacity:0.5}}>
    <div style={{width:44,height:44,borderRadius:10,background:C.border,flexShrink:0}}/>
    <div style={{flex:1}}>
      <div style={{height:13,width:"40%",background:C.border,borderRadius:4,marginBottom:6}}/>
      <div style={{height:10,width:"25%",background:C.panel,borderRadius:4}}/>
    </div>
    <div style={{width:160,flexShrink:0}}>
      <div style={{height:6,background:C.border,borderRadius:3}}/>
    </div>
    <div style={{width:70,height:20,background:C.border,borderRadius:4,flexShrink:0}}/>
  </div>
);

// ── Fleet Overview ────────────────────────────────────────────────────────────
function FleetOverview({ fleet, loading, error, onSelect }) {
  const critical = fleet.filter(e => e.risk_level === "CRITICAL");
  const elevated = fleet.filter(e => e.risk_level === "ELEVATED");
  const nominal  = fleet.filter(e => e.risk_level === "NOMINAL");

  const StatBox = ({ label, value, color, sub }) => (
    <div style={{background:C.surface,border:`1px solid ${color}28`,borderRadius:10,
      padding:"16px 20px",flex:1,minWidth:120}}>
      <div style={{fontSize:26,fontWeight:700,color,fontFamily:"monospace",lineHeight:1}}>
        {loading ? "—" : value}
      </div>
      <div style={{fontSize:12,color:C.text,marginTop:4}}>{label}</div>
      <div style={{fontSize:11,color:C.textSub,marginTop:2}}>{sub}</div>
    </div>
  );

  return (
    <div>
      <SectionTitle
        label="Equipment Health Status"
        sub="Predictive failure analysis across all monitored assets. Click any asset to see a detailed breakdown."
      />

      <div style={{display:"flex",gap:12,marginBottom:28,flexWrap:"wrap"}}>
        <StatBox label="Requires attention"  value={critical.length} color={C.accent} sub="Inspect before next shift"/>
        <StatBox label="Elevated risk"        value={elevated.length} color={C.gold}   sub="Schedule within 48 hours"/>
        <StatBox label="Operating normally"   value={nominal.length}  color={C.green}  sub="No action needed"/>
        <StatBox label="Assets monitored"     value={fleet.length}    color={C.blue}   sub="Across 4 WA sites"/>
      </div>

      {error && (
        <div style={{background:C.accentDim,border:`1px solid ${C.accent}33`,borderRadius:8,
          padding:"12px 16px",fontSize:13,color:C.text,marginBottom:16}}>
          Could not load fleet data. Make sure the backend is running at{" "}
          <code style={{background:C.panel,padding:"1px 5px",borderRadius:3,fontSize:12}}>{API_BASE}</code>
        </div>
      )}

      <div style={{display:"grid",gap:10}}>
        {loading
          ? [1,2,3,4,5,6,7,8].map(i => <SkeletonRow key={i}/>)
          : [...fleet].sort((a,b) => b.xgb_prob - a.xgb_prob).map(eq => {
              const p = eq.xgb_prob || 0;
              const color = p>=0.5 ? C.accent : p>=0.25 ? C.gold : C.green;
              return (
                <div key={eq.id} onClick={() => onSelect(eq)}
                  style={{background:C.surface,border:`1px solid ${p>=0.5?C.accent+"33":C.border}`,
                    borderRadius:10,padding:"15px 20px",cursor:"pointer",
                    display:"flex",alignItems:"center",gap:16,transition:"border-color 0.15s"}}
                  onMouseEnter={e => e.currentTarget.style.borderColor = color+"55"}
                  onMouseLeave={e => e.currentTarget.style.borderColor = p>=0.5?C.accent+"33":C.border}>

                  <div style={{width:10,height:10,borderRadius:"50%",background:color,
                    flexShrink:0,boxShadow:p>=0.5?`0 0 8px ${color}`:undefined}}/>

                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontWeight:600,color:C.text,fontSize:14}}>{eq.name}</div>
                    <div style={{fontSize:11,color:C.textSub,marginTop:2}}>
                      {eq.id} &middot; {eq.site} &middot; Type {eq.machine_type}
                    </div>
                  </div>

                  <div style={{fontSize:12,color:C.textSub,flexShrink:0,display:"flex",gap:16}}>
                    <span>Tool wear: <span style={{color:eq.tool_wear>200?C.accent:C.text,fontFamily:"monospace"}}>{eq.tool_wear} min</span></span>
                    <span>Torque: <span style={{color:C.text,fontFamily:"monospace"}}>{eq.torque} Nm</span></span>
                  </div>

                  <div style={{width:140,flexShrink:0}}>
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:11,
                      color:C.textSub,marginBottom:4}}>
                      <span>Failure risk</span>
                      <span style={{color,fontFamily:"monospace",fontWeight:600}}>{(p*100).toFixed(1)}%</span>
                    </div>
                    <div style={{height:5,borderRadius:3,background:C.border}}>
                      <div style={{height:"100%",width:`${p*100}%`,borderRadius:3,background:color,transition:"width 0.8s ease"}}/>
                    </div>
                  </div>

                  <RiskPill level={eq.risk_level} prob={p}/>
                  <div style={{color:C.muted,fontSize:14,flexShrink:0}}>›</div>
                </div>
              );
            })
        }
      </div>
    </div>
  );
}

// ── Equipment Detail ──────────────────────────────────────────────────────────
function EquipmentDetail({ eq, onBack }) {
  const p = eq.xgb_prob || 0;
  return (
    <div>
      <button onClick={onBack} style={{background:"none",border:`1px solid ${C.border}`,
        color:C.textSub,borderRadius:6,padding:"6px 14px",cursor:"pointer",fontSize:12,marginBottom:22}}>
        Back to fleet
      </button>

      <div style={{display:"flex",gap:16,flexWrap:"wrap",marginBottom:20,alignItems:"flex-start"}}>
        <div style={{flex:1,minWidth:240}}>
          <div style={{fontSize:12,color:C.textSub,marginBottom:4}}>{eq.id} &middot; {eq.site}</div>
          <h2 style={{margin:0,fontSize:22,fontWeight:700,color:C.text}}>{eq.name}</h2>
          <div style={{marginTop:10}}><RiskPill level={eq.risk_level} prob={p}/></div>
        </div>
        <Card style={{textAlign:"center",padding:"18px 28px"}}>
          <GaugeArc prob={p} size={160}/>
        </Card>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
        <Card>
          <CardLabel>Sensor readings</CardLabel>
          <MiniBar value={eq.tool_wear} max={240} color={C.accent} label="Tool wear" unit=" min"/>
          <MiniBar value={((eq.process_temp||0)-(eq.air_temp||0)).toFixed(1)} max={15} color={C.gold} label="Temp differential" unit=" K"/>
          <MiniBar value={eq.rot_speed} max={2860} color={C.blue} label="Rotational speed" unit=" rpm"/>
          <MiniBar value={eq.torque} max={76} color={C.green} label="Torque" unit=" Nm"/>
        </Card>

        <Card>
          <CardLabel>Model predictions</CardLabel>
          {[
            {label:"XGBoost (primary model)", prob:eq.xgb_prob||0, color:C.accent},
            {label:"Random Forest (reference)", prob:eq.rf_prob||0, color:C.blue},
          ].map(m => (
            <div key={m.label} style={{marginBottom:16}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5}}>
                <span style={{fontSize:12,color:C.text}}>{m.label}</span>
                <span style={{fontFamily:"monospace",fontWeight:700,color:m.color,fontSize:16}}>{(m.prob*100).toFixed(1)}%</span>
              </div>
              <div style={{height:7,borderRadius:4,background:C.border}}>
                <div style={{height:"100%",width:`${m.prob*100}%`,borderRadius:4,background:m.color}}/>
              </div>
            </div>
          ))}
          <div style={{borderTop:`1px solid ${C.border}`,paddingTop:12,marginTop:4}}>
            {[
              ["Air temperature", `${eq.air_temp} K`],
              ["Process temperature", `${eq.process_temp} K`],
              ["Rotational speed", `${eq.rot_speed} rpm`],
              ["Torque", `${eq.torque} Nm`],
              ["Tool wear", `${eq.tool_wear} min`],
              ["Machine type", `Type ${eq.machine_type}`],
              ["Power (derived)", `${(eq.torque*eq.rot_speed).toFixed(0)} W`],
              ["Temp diff (derived)", `${((eq.process_temp||0)-(eq.air_temp||0)).toFixed(1)} K`],
            ].map(([k,v]) => (
              <div key={k} style={{display:"flex",justifyContent:"space-between",fontSize:11,marginBottom:4}}>
                <span style={{color:C.textSub}}>{k}</span>
                <span style={{color:C.text,fontFamily:"monospace"}}>{v}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {eq.shap?.length > 0 && (
        <Card>
          <CardLabel>Why did the model flag this asset?</CardLabel>
          <p style={{fontSize:12,color:C.textSub,margin:"0 0 14px"}}>
            Each bar shows how much a feature pushed the prediction toward failure (orange) or away from it (blue).
          </p>
          {eq.shap.map(s => <ShapBar key={s.feature} {...s}/>)}
        </Card>
      )}
    </div>
  );
}

// ── Predictor ─────────────────────────────────────────────────────────────────
function Predictor({ apiOnline }) {
  const [form, setForm] = useState({
    air_temp:300.0, process_temp:311.0, rot_speed:1400,
    torque:60.0, tool_wear:150, machine_type:"M"
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const set = (k, v) => setForm(f => ({...f, [k]: v}));
  const run = async () => {
    setLoading(true); setError(null); setResult(null);
    try {
      const d = await apiPredict({...form,
        air_temp:+form.air_temp, process_temp:+form.process_temp,
        rot_speed:+form.rot_speed, torque:+form.torque, tool_wear:+form.tool_wear
      });
      setResult(d);
    } catch(e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const IS = {background:C.panel,border:`1px solid ${C.border}`,borderRadius:6,
    padding:"8px 11px",color:C.text,fontSize:13,fontFamily:"monospace",width:"100%"};

  return (
    <div>
      <SectionTitle
        label="Run a Prediction"
        sub="Enter sensor readings for any piece of equipment and get a real-time failure probability from the trained XGBoost model."
      />

      {!apiOnline && (
        <div style={{background:C.accentDim,border:`1px solid ${C.accent}33`,borderRadius:8,
          padding:"11px 15px",fontSize:13,color:C.text,marginBottom:20}}>
          The backend is not running. Start it with:{" "}
          <code style={{background:C.panel,padding:"1px 6px",borderRadius:3,fontSize:12}}>python app.py</code>
        </div>
      )}
      {error && (
        <div style={{background:C.accentDim,border:`1px solid ${C.accent}33`,borderRadius:8,
          padding:"11px 15px",fontSize:13,color:C.text,marginBottom:16}}>{error}</div>
      )}

      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14,marginBottom:20}}>
        {[
          {key:"air_temp",      label:"Air temperature (K)",     min:295, max:305,  step:0.1, hint:"Typical range 295 – 305 K"},
          {key:"process_temp",  label:"Process temperature (K)", min:305, max:320,  step:0.1, hint:"Usually 8 – 12 K above air temp"},
          {key:"rot_speed",     label:"Rotational speed (rpm)",  min:1168,max:2860, step:1,   hint:"Normal operating range 1168 – 2860"},
          {key:"torque",        label:"Torque (Nm)",             min:3.8, max:76.6, step:0.1, hint:"Higher torque increases failure risk"},
          {key:"tool_wear",     label:"Tool wear (min)",         min:0,   max:253,  step:1,   hint:"Inspect when approaching 200 min"},
        ].map(f => (
          <div key={f.key}>
            <label style={{fontSize:12,color:C.textSub,display:"block",marginBottom:4}}>{f.label}</label>
            <input type="number" value={form[f.key]} min={f.min} max={f.max} step={f.step}
              onChange={e => set(f.key, e.target.value)} style={IS}/>
            <div style={{fontSize:10,color:C.muted,marginTop:3}}>{f.hint}</div>
          </div>
        ))}
        <div>
          <label style={{fontSize:12,color:C.textSub,display:"block",marginBottom:4}}>Machine type</label>
          <select value={form.machine_type} onChange={e => set("machine_type", e.target.value)}
            style={{...IS, appearance:"none"}}>
            <option value="L">Type L — Light duty</option>
            <option value="M">Type M — Medium duty</option>
            <option value="H">Type H — Heavy duty</option>
          </select>
          <div style={{fontSize:10,color:C.muted,marginTop:3}}>Affects overstrain failure threshold</div>
        </div>
      </div>

      <button onClick={run} disabled={loading || !apiOnline}
        style={{background:loading||!apiOnline?"#222":C.accent,color:"#fff",border:"none",
          borderRadius:7,padding:"10px 24px",fontWeight:600,fontSize:13,
          cursor:loading||!apiOnline?"not-allowed":"pointer",
          display:"flex",alignItems:"center",gap:8}}>
        {loading ? <><Spinner/> Running...</> : "Run prediction"}
      </button>

      {result && (
        <div style={{marginTop:24,display:"grid",gridTemplateColumns:"auto 1fr",gap:14}}>
          <Card style={{textAlign:"center",padding:"22px 28px"}}>
            <GaugeArc prob={result.xgb_prob} size={170}/>
            <div style={{marginTop:10}}><RiskPill level={result.risk_level} prob={result.xgb_prob}/></div>
            <div style={{marginTop:14,fontSize:12,color:C.textSub}}>
              <div>XGBoost: <span style={{color:C.accent,fontFamily:"monospace",fontWeight:700}}>{(result.xgb_prob*100).toFixed(2)}%</span></div>
              <div style={{marginTop:3}}>Random Forest: <span style={{color:C.blue,fontFamily:"monospace",fontWeight:700}}>{(result.rf_prob*100).toFixed(2)}%</span></div>
            </div>
            <div style={{marginTop:12,fontSize:11,color:C.muted,background:C.panel,
              borderRadius:6,padding:"7px 10px",textAlign:"left"}}>
              <div>Power: {result.derived?.power?.toFixed(0)} W</div>
              <div>Temp diff: {result.derived?.temp_diff?.toFixed(1)} K</div>
            </div>
          </Card>

          <Card>
            <CardLabel>What drove this prediction?</CardLabel>
            <p style={{fontSize:12,color:C.textSub,margin:"0 0 14px"}}>
              Orange bars push the score toward failure. Blue bars push it away. Longer bars have more influence.
            </p>
            {result.shap?.map(s => <ShapBar key={s.feature} {...s}/>)}
          </Card>

          {result.risk_level === "CRITICAL" && (
            <div style={{gridColumn:"1/-1",background:C.accentDim,border:`1px solid ${C.accent}44`,
              borderRadius:9,padding:"14px 18px"}}>
              <div style={{fontWeight:600,color:C.accent,fontSize:14,marginBottom:4}}>
                Maintenance action recommended
              </div>
              <div style={{fontSize:12,color:C.text}}>
                The model predicts a <strong style={{color:C.accent}}>{(result.xgb_prob*100).toFixed(1)}%</strong> probability of failure,
                which exceeds the 50% alert threshold. Primary contributing factors:{" "}
                {result.shap?.slice(0,2).filter(s=>s.shap_value>0).map(s=>s.feature).join(" and ")}.
                Schedule an inspection before the next operational shift.
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
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState(null);

  useEffect(() => {
    if (!apiOnline) return;
    setLoading(true);
    apiPerformance().then(setData).catch(e => setError(e.message)).finally(() => setLoading(false));
  }, [apiOnline]);

  if (!apiOnline) return (
    <div>
      <SectionTitle label="Model Performance" sub="Evaluation results from the held-out test set."/>
      <div style={{background:C.accentDim,border:`1px solid ${C.accent}33`,borderRadius:8,
        padding:"11px 15px",fontSize:13,color:C.text}}>
        Backend is not running. Start it to load metrics.
      </div>
    </div>
  );
  if (loading) return (
    <div>
      <SectionTitle label="Model Performance" sub="Loading results from backend..."/>
      <div style={{display:"flex",gap:10,alignItems:"center",color:C.textSub,padding:20}}><Spinner/> Fetching metrics...</div>
    </div>
  );
  if (error) return <div style={{color:C.accent,padding:20}}>{error}</div>;
  if (!data)  return null;

  const { results, xgb_fi, mean_shap, thresh_results } = data;

  const MetricBox = ({ value, label, color, highlight }) => (
    <div style={{background:C.panel,borderRadius:8,padding:"12px 14px",
      border:`1px solid ${highlight ? color+"44" : C.border}`}}>
      <div style={{fontSize:20,fontWeight:700,color:highlight?color:C.text,fontFamily:"monospace"}}>
        {(value*100).toFixed(1)}%
      </div>
      <div style={{fontSize:10,color:C.textSub,marginTop:2,textTransform:"uppercase",letterSpacing:"0.06em"}}>{label}</div>
    </div>
  );

  return (
    <div>
      <SectionTitle
        label="Model Performance"
        sub="Evaluation results on the held-out test set (1,500 samples). The primary metric is F1 score on the failure class due to class imbalance."
      />

      {[["xgb","XGBoost",C.accent,true],["rf","Random Forest",C.blue,false]].map(([key,name,color,primary]) => {
        const m = results[key]; if (!m) return null;
        return (
          <Card key={key} style={{marginBottom:14,border:`1px solid ${primary?color+"33":C.border}`}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
              <span style={{fontWeight:700,fontSize:15,color:C.text}}>{name}</span>
              {primary && <span style={{background:C.accentDim,color:C.accent,border:`1px solid ${C.accent}33`,
                borderRadius:4,padding:"2px 8px",fontSize:11}}>Primary model</span>}
              <span style={{background:`${color}15`,color,border:`1px solid ${color}33`,
                borderRadius:4,padding:"2px 8px",fontSize:11}}>AUC {m.auc?.toFixed(4)}</span>
            </div>

            <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:10,marginBottom:14}}>
              <MetricBox value={m.accuracy}  label="Accuracy"/>
              <MetricBox value={m.precision} label="Precision"/>
              <MetricBox value={m.recall}    label="Recall"   color={color} highlight={m.recall>=0.7}/>
              <MetricBox value={m.f1}        label="F1 Score" color={color} highlight/>
              <MetricBox value={m.auc}       label="ROC AUC"  color={color} highlight/>
            </div>

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <div style={{background:C.panel,borderRadius:8,padding:14}}>
                <div style={{fontSize:11,color:C.textSub,marginBottom:10,textTransform:"uppercase",letterSpacing:"0.07em"}}>Confusion matrix</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,maxWidth:200}}>
                  {[{l:"True negative",v:m.tn,c:C.green},{l:"False positive",v:m.fp,c:C.gold},
                    {l:"False negative",v:m.fn,c:C.accent},{l:"True positive",v:m.tp,c:C.green}].map(cell=>(
                    <div key={cell.l} style={{background:cell.c+"14",border:`1px solid ${cell.c}28`,
                      borderRadius:6,padding:"8px 10px",textAlign:"center"}}>
                      <div style={{fontSize:18,fontWeight:700,color:cell.c,fontFamily:"monospace"}}>{cell.v}</div>
                      <div style={{fontSize:9,color:C.textSub,marginTop:2}}>{cell.l}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{background:C.panel,borderRadius:8,padding:14,fontSize:12,color:C.text,lineHeight:1.8}}>
                <div style={{fontSize:11,color:C.textSub,marginBottom:8,textTransform:"uppercase",letterSpacing:"0.07em"}}>In plain terms</div>
                <div>Detects <strong style={{color}}>{m.tp} of {m.tp+m.fn}</strong> actual failures ({m.recall?(m.recall*100).toFixed(1):"-"}% recall)</div>
                <div><strong style={{color}}>{m.fp} false alarms</strong> per test set</div>
                <div><strong style={{color:C.accent}}>{m.fn} failures missed</strong> — the critical number</div>
              </div>
            </div>
          </Card>
        );
      })}

      <Card style={{marginBottom:14}}>
        <CardLabel>How does the alert threshold affect results?</CardLabel>
        <p style={{fontSize:12,color:C.textSub,margin:"0 0 14px"}}>
          Lowering the threshold catches more failures but also produces more false alarms. The default of 0.5 is a reasonable starting point.
        </p>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
          <thead><tr>
            {["Threshold","Precision","Recall","F1","False alarms","Missed failures"].map(h=>(
              <th key={h} style={{padding:"7px 10px",textAlign:"left",color:C.textSub,fontWeight:600,borderBottom:`1px solid ${C.border}`}}>{h}</th>
            ))}
          </tr></thead>
          <tbody>{thresh_results?.map((t,i)=>(
            <tr key={i} style={{background:t.threshold===0.5?C.accentDim:"transparent",borderBottom:`1px solid ${C.border}33`}}>
              <td style={{padding:"7px 10px",fontFamily:"monospace",color:t.threshold===0.5?C.accent:C.text}}>
                {t.threshold}{t.threshold===0.5?" (default)":""}
              </td>
              <td style={{padding:"7px 10px",fontFamily:"monospace",color:C.text}}>{(t.precision*100).toFixed(1)}%</td>
              <td style={{padding:"7px 10px",fontFamily:"monospace",color:C.text}}>{(t.recall*100).toFixed(1)}%</td>
              <td style={{padding:"7px 10px",fontFamily:"monospace",color:C.text}}>{(t.f1*100).toFixed(1)}%</td>
              <td style={{padding:"7px 10px",fontFamily:"monospace",color:C.gold}}>{t.fp}</td>
              <td style={{padding:"7px 10px",fontFamily:"monospace",color:C.accent}}>{t.fn}</td>
            </tr>
          ))}</tbody>
        </table>
      </Card>

      <Card>
        <CardLabel>Feature importance</CardLabel>
        <p style={{fontSize:12,color:C.textSub,margin:"0 0 14px"}}>
          Orange bars show the model's internal importance score. Blue bars show mean SHAP values — a more reliable measure of actual influence on predictions.
        </p>
        {Object.entries(xgb_fi||{}).sort((a,b)=>b[1]-a[1]).map(([feat,score])=>{
          const sv = mean_shap?.[feat]||0;
          const maxS = Math.max(...Object.values(mean_shap||{_:1}));
          return (
            <div key={feat} style={{display:"flex",alignItems:"center",gap:10,marginBottom:11}}>
              <div style={{width:210,fontSize:12,color:C.text,flexShrink:0}}>{feat.replace(/_/g," ")}</div>
              <div style={{flex:1}}>
                <div style={{height:6,borderRadius:3,background:C.border,marginBottom:3}}>
                  <div style={{height:"100%",width:`${Math.min(score*500,100)}%`,borderRadius:3,background:C.accent}}/>
                </div>
                <div style={{height:4,borderRadius:3,background:C.border}}>
                  <div style={{height:"100%",width:`${(sv/maxS)*100}%`,borderRadius:3,background:C.blue,opacity:0.8}}/>
                </div>
              </div>
              <div style={{width:90,fontSize:10,fontFamily:"monospace",color:C.textSub,textAlign:"right",flexShrink:0}}>
                <span style={{color:C.accent}}>{score.toFixed(3)}</span> / <span style={{color:C.blue}}>{sv.toFixed(3)}</span>
              </div>
            </div>
          );
        })}
      </Card>
    </div>
  );
}

// ── Reports ───────────────────────────────────────────────────────────────────
function Reports({ fleet }) {
  const [gen, setGen] = useState(false);
  const now = new Date();
  const critical = fleet.filter(e => e.risk_level === "CRITICAL");
  const elevated = fleet.filter(e => e.risk_level === "ELEVATED");

  return (
    <div>
      <SectionTitle
        label="Maintenance Report"
        sub="Generate a summary report from the current fleet predictions, suitable for handover or compliance records."
      />

      <button onClick={() => setGen(true)} disabled={!fleet.length}
        style={{background:fleet.length?C.accent:"#222",color:"#fff",border:"none",borderRadius:7,
          padding:"10px 22px",fontWeight:600,fontSize:13,
          cursor:fleet.length?"pointer":"not-allowed",marginBottom:24}}>
        Generate report
      </button>

      {!gen && (
        <Card>
          <p style={{margin:0,fontSize:13,color:C.textSub}}>
            The report will include a risk summary, a full equipment register with current failure probabilities,
            and recommended actions for each asset. Click the button above to generate it.
          </p>
        </Card>
      )}

      {gen && fleet.length > 0 && (
        <Card>
          <div style={{borderBottom:`1px solid ${C.border}`,paddingBottom:16,marginBottom:20}}>
            <div style={{fontSize:11,color:C.textSub,marginBottom:4}}>WestMine Resources — PredictaMine</div>
            <h2 style={{margin:0,fontSize:18,fontWeight:700,color:C.text}}>Equipment Health Report</h2>
            <div style={{fontSize:12,color:C.textSub,marginTop:5}}>
              {now.toLocaleDateString("en-AU")} {now.toLocaleTimeString("en-AU",{hour:"2-digit",minute:"2-digit"})}
              {" "}&middot; Model: XGBoost + Random Forest &middot; Dataset: AI4I 2020
            </div>
          </div>

          <div style={{marginBottom:20}}>
            <div style={{fontSize:12,fontWeight:600,color:C.text,marginBottom:10}}>Summary</div>
            <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:14}}>
              {[{l:"Assets monitored",v:fleet.length,c:C.blue},
                {l:"Require attention",v:critical.length,c:C.accent},
                {l:"Elevated risk",v:elevated.length,c:C.gold},
                {l:"Operating normally",v:fleet.length-critical.length-elevated.length,c:C.green}].map(s=>(
                <div key={s.l} style={{background:s.c+"14",border:`1px solid ${s.c}28`,
                  borderRadius:8,padding:"10px 16px",minWidth:110}}>
                  <div style={{fontSize:18,fontWeight:700,color:s.c,fontFamily:"monospace"}}>{s.v}</div>
                  <div style={{fontSize:10,color:C.textSub,marginTop:2}}>{s.l}</div>
                </div>
              ))}
            </div>
            {critical.length > 0 && (
              <div style={{background:C.accentDim,border:`1px solid ${C.accent}33`,borderRadius:7,
                padding:"10px 14px",fontSize:12,color:C.text}}>
                {critical.length} asset(s) have exceeded the 50% failure probability threshold and require inspection before the next operational shift.
              </div>
            )}
          </div>

          <div style={{marginBottom:20}}>
            <div style={{fontSize:12,fontWeight:600,color:C.text,marginBottom:10}}>Equipment register</div>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
              <thead><tr style={{background:C.panel}}>
                {["ID","Equipment","Site","Type","Tool wear","Temp diff","XGBoost","Random Forest","Status","Recommended action"].map(h=>(
                  <th key={h} style={{padding:"8px 10px",textAlign:"left",color:C.textSub,
                    fontWeight:600,borderBottom:`1px solid ${C.border}`}}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {[...fleet].sort((a,b)=>b.xgb_prob-a.xgb_prob).map((eq,i)=>{
                  const p = eq.xgb_prob || 0;
                  const color = p>=0.5?C.accent:p>=0.25?C.gold:C.green;
                  const action = p>=0.5?"Inspect before next shift":p>=0.25?"Schedule within 48 hours":"Continue monitoring";
                  return (
                    <tr key={eq.id} style={{background:i%2===0?"transparent":C.panel+"88",
                      borderBottom:`1px solid ${C.border}33`}}>
                      <td style={{padding:"7px 10px",color:C.textSub,fontFamily:"monospace"}}>{eq.id}</td>
                      <td style={{padding:"7px 10px",color:C.text,fontWeight:600}}>{eq.name}</td>
                      <td style={{padding:"7px 10px",color:C.textSub}}>{eq.site}</td>
                      <td style={{padding:"7px 10px",color:C.textSub}}>{eq.machine_type}</td>
                      <td style={{padding:"7px 10px",fontFamily:"monospace",color:eq.tool_wear>200?C.accent:C.text}}>{eq.tool_wear} min</td>
                      <td style={{padding:"7px 10px",fontFamily:"monospace",color:C.text}}>{((eq.process_temp||0)-(eq.air_temp||0)).toFixed(1)} K</td>
                      <td style={{padding:"7px 10px",fontFamily:"monospace",fontWeight:700,color}}>{(p*100).toFixed(1)}%</td>
                      <td style={{padding:"7px 10px",fontFamily:"monospace",color:C.blue}}>{((eq.rf_prob||0)*100).toFixed(1)}%</td>
                      <td style={{padding:"7px 10px"}}><RiskPill level={eq.risk_level}/></td>
                      <td style={{padding:"7px 10px",color:C.textSub,fontSize:11}}>{action}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div style={{borderTop:`1px solid ${C.border}`,paddingTop:14,fontSize:11,color:C.muted,lineHeight:1.7}}>
            Model: XGBoost classifier trained on AI4I 2020 Predictive Maintenance Dataset (Matzka, 2020).
            Preprocessing: SMOTE oversampling, MinMax scaling, one-hot encoding of machine type.
            Engineered features: Power (torque × rotational speed), Temperature differential.
            Alert threshold: 0.5. For compliance with the Mines Safety and Inspection Act 1994 (WA).
            PredictaMine — ICT619 Assignment 2, Murdoch University 2026.
          </div>
        </Card>
      )}
    </div>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [page, setPage]         = useState("fleet");
  const [selected, setSelected] = useState(null);
  const [fleet, setFleet]       = useState([]);
  const [fleetLoading, setFleetLoading] = useState(false);
  const [fleetError, setFleetError]     = useState(null);
  const [apiOnline, setApiOnline]       = useState(false);

  useEffect(() => {
    (async () => {
      const ok = await apiHealth();
      setApiOnline(ok);
      if (!ok) {
        setFleetError("Could not reach the backend at " + API_BASE);
        return;
      }
      setFleetLoading(true);
      try {
        const enriched = await Promise.all(FLEET_DEFS.map(async eq => {
          const pred = await apiPredict({
            air_temp: eq.air_temp, process_temp: eq.process_temp,
            rot_speed: eq.rot_speed, torque: eq.torque,
            tool_wear: eq.tool_wear, machine_type: eq.machine_type,
          });
          return {...eq, ...pred};
        }));
        setFleet(enriched);
      } catch(e) { setFleetError(e.message); }
      finally { setFleetLoading(false); }
    })();
  }, []);

  const now = new Date();
  const critical = fleet.filter(e => e.risk_level === "CRITICAL");

  const nav = [
    {id:"fleet",       label:"Fleet"},
    {id:"predict",     label:"Predictor"},
    {id:"performance", label:"Performance"},
    {id:"reports",     label:"Reports"},
  ];

  return (
    <div style={{minHeight:"100vh",background:C.bg,color:C.text,
      fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif"}}>
      <style>{`*{box-sizing:border-box;margin:0;padding:0}@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* Nav */}
      <div style={{background:C.surface,borderBottom:`1px solid ${C.border}`,
        padding:"0 28px",display:"flex",alignItems:"center",height:54,
        position:"sticky",top:0,zIndex:100}}>

        <div style={{display:"flex",alignItems:"center",gap:10,marginRight:36}}>
          <div style={{width:26,height:26,background:C.accent,borderRadius:6,
            display:"flex",alignItems:"center",justifyContent:"center",
            fontSize:13,fontWeight:700,color:"#fff"}}>P</div>
          <div>
            <div style={{fontSize:13,fontWeight:600,color:C.text}}>PredictaMine</div>
            <div style={{fontSize:10,color:C.textSub,marginTop:-1}}>WestMine Resources</div>
          </div>
        </div>

        <nav style={{display:"flex",gap:2}}>
          {nav.map(n => (
            <button key={n.id} onClick={() => { setPage(n.id); setSelected(null); }}
              style={{background:page===n.id?C.accentDim:"none",
                border:`1px solid ${page===n.id?C.accent+"33":"transparent"}`,
                color:page===n.id?C.accent:C.textSub,
                borderRadius:6,padding:"5px 13px",cursor:"pointer",fontSize:13}}>
              {n.label}
            </button>
          ))}
        </nav>

        <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:14,fontSize:11,color:C.textSub}}>
          <div style={{display:"flex",alignItems:"center",gap:5}}>
            <div style={{width:6,height:6,borderRadius:"50%",
              background:apiOnline?C.green:C.accent}}/>
            {apiOnline ? "Connected" : "Backend offline"}
          </div>
          <div style={{fontFamily:"monospace"}}>
            {now.toLocaleDateString("en-AU")} {now.toLocaleTimeString("en-AU",{hour:"2-digit",minute:"2-digit"})}
          </div>
        </div>
      </div>

      {/* Alert bar — only shown when real failures detected */}
      {critical.length > 0 && (
        <div style={{background:C.accentDim,borderBottom:`1px solid ${C.accent}28`,
          padding:"8px 28px",display:"flex",alignItems:"center",gap:12,fontSize:12}}>
          <span style={{color:C.accent,fontWeight:600}}>Action required:</span>
          <span style={{color:C.text}}>
            {critical.map(e => e.name).join(", ")} — predicted failure risk above threshold.
          </span>
          <button onClick={() => setPage("reports")}
            style={{marginLeft:"auto",background:C.accent,color:"#fff",border:"none",
              borderRadius:5,padding:"4px 12px",cursor:"pointer",fontSize:11,fontWeight:600}}>
            View report
          </button>
        </div>
      )}

      <div style={{maxWidth:1080,margin:"0 auto",padding:"28px 24px"}}>
        {page==="fleet" && !selected &&
          <FleetOverview fleet={fleet} loading={fleetLoading} error={fleetError}
            onSelect={eq => { setSelected(eq); setPage("detail"); }}/>}
        {page==="detail" && selected &&
          <EquipmentDetail eq={selected} onBack={() => { setPage("fleet"); setSelected(null); }}/>}
        {page==="predict"     && <Predictor apiOnline={apiOnline}/>}
        {page==="performance" && <ModelPerformance apiOnline={apiOnline}/>}
        {page==="reports"     && <Reports fleet={fleet}/>}
      </div>
    </div>
  );
}