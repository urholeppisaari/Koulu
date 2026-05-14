const { useState, useEffect, useRef } = React;

const KEY_TASKS = "kt-v3";
const KEY_RECURRING = "kt-recurring-v1";
const KEY_REC_DONE = "kt-rec-done-v1";
const KEY_ARCHIVED = "kt-archived-v1";
const KEY_EXAMS = "kt-exams-v1";

const DAYS = ["Maanantai","Tiistai","Keskiviikko","Torstai","Perjantai","Lauantai","Sunnuntai"];
const COURSE_COLORS = ["#4f46e5","#0891b2","#059669","#d97706","#dc2626","#7c3aed","#db2777","#65a30d"];

function courseColor(course, allCourses) {
  const i = allCourses.indexOf(course);
  return COURSE_COLORS[i % COURSE_COLORS.length] || "#888";
}

function getWeekKey() {
  const now = new Date();
  const jan1 = new Date(now.getFullYear(), 0, 1);
  const week = Math.ceil(((now - jan1) / 86400000 + jan1.getDay() + 1) / 7);
  return now.getFullYear() + "-w" + week;
}

function getStatus(due, done) {
  if (done) return "done";
  const h = (new Date(due) - Date.now()) / 3600000;
  return h < 0 ? "late" : h < 48 ? "soon" : "ok";
}

function getExamStatus(due) {
  const h = (new Date(due) - Date.now()) / 3600000;
  if (h < 0) return "past";
  if (h < 48) return "soon";
  return "ok";
}

const S_LABEL = { late:"Myöhässä", soon:"Pian", ok:"Ajoissa", done:"Valmis" };
const S_STYLE = {
  late: { background:"#fee2e2", color:"#b91c1c", border:"1px solid #fca5a5" },
  soon: { background:"#fef3c7", color:"#92400e", border:"1px solid #fcd34d" },
  ok:   { background:"#dcfce7", color:"#166534", border:"1px solid #86efac" },
  done: { background:"#f1f5f9", color:"#94a3b8", border:"1px solid #e2e8f0" },
};
const E_LABEL = { past:"Ohi", soon:"Pian", ok:"Tulossa" };
const E_STYLE = {
  past: { background:"#f1f5f9", color:"#94a3b8", border:"1px solid #e2e8f0" },
  soon: { background:"#fef3c7", color:"#92400e", border:"1px solid #fcd34d" },
  ok:   { background:"#ede9fe", color:"#5b21b6", border:"1px solid #c4b5fd" },
};

function fmt(due) {
  if (!due) return "";
  return new Date(due).toLocaleString("fi-FI", {
    day:"numeric", month:"numeric", hour:"2-digit", minute:"2-digit"
  });
}

function fmtDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("fi-FI", {
    weekday:"short", day:"numeric", month:"numeric",
    year:"numeric", hour:"2-digit", minute:"2-digit"
  });
}

function toLocal(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  function p(n) { return (n < 10 ? "0" : "") + n; }
  return d.getFullYear() + "-" + p(d.getMonth()+1) + "-" + p(d.getDate())
    + "T" + p(d.getHours()) + ":" + p(d.getMinutes());
}

function thisWeekOccurrence(dayIndex, time) {
  const now = new Date();
  const currentDay = (now.getDay() + 6) % 7;
  const diff = (dayIndex - currentDay + 7) % 7;
  const d = new Date(now);
  d.setDate(d.getDate() + diff);
  const parts = time.split(":");
  d.setHours(Number(parts[0]), Number(parts[1]), 0, 0);
  return d.toISOString();
}

const inp = {
  fontSize:14, padding:"8px 10px", borderRadius:8,
  border:"1px solid #e2e8f0", background:"#fff", color:"#111",
  width:"100%", boxSizing:"border-box", marginBottom:8, fontFamily:"inherit"
};
const btnBase = {
  cursor:"pointer", fontFamily:"inherit", fontSize:13, borderRadius:8
};

function Logo() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <rect width="28" height="28" rx="7" fill="#1e293b"/>
      <rect x="7" y="6" width="11" height="16" rx="1.5" fill="#fff"/>
      <rect x="8.5" y="7.5" width="8" height="1.5" rx=".75" fill="#e2e8f0"/>
      <rect x="8.5" y="10" width="8" height="1.5" rx=".75" fill="#e2e8f0"/>
      <rect x="8.5" y="12.5" width="5" height="1.5" rx=".75" fill="#e2e8f0"/>
      <rect x="7" y="20" width="11" height="1.5" rx=".75" fill="#94a3b8"/>
      <line x1="18" y1="6" x2="18" y2="22" stroke="#e2e8f0" strokeWidth="1"/>
      <rect x="17" y="14" width="5" height="7" rx="1" fill="#4f46e5"/>
      <path d="M19.5 16 L19.5 19" stroke="#fff" strokeWidth="1.2" strokeLinecap="round"/>
      <path d="M18 17.5 L21 17.5" stroke="#fff" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  );
}

function Badge(props) {
  const s = props.s;
  const exam = props.exam;
  const style = exam ? E_STYLE[s] : S_STYLE[s];
  const label = exam ? E_LABEL[s] : S_LABEL[s];
  const combined = Object.assign(
    { fontSize:11, fontWeight:500, padding:"3px 9px", borderRadius:999, whiteSpace:"nowrap", flexShrink:0 },
    style
  );
  return <span style={combined}>{label}</span>;
}

function IconEdit(props) {
  return (
    <button onClick={props.onClick} style={{ background:"none", border:"none", cursor:"pointer", padding:4, color:"#cbd5e1", display:"flex", alignItems:"center", flexShrink:0 }}>
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
      </svg>
    </button>
  );
}

function IconDel(props) {
  return (
    <button onClick={props.onClick} style={{ background:"none", border:"none", cursor:"pointer", padding:4, color:"#cbd5e1", display:"flex", alignItems:"center", flexShrink:0 }}>
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="3 6 5 6 21 6"/>
        <path d="M19 6l-1 14H6L5 6"/>
        <path d="M10 11v6"/>
        <path d="M14 11v6"/>
        <path d="M9 6V4h6v2"/>
      </svg>
    </button>
  );
}

function RecurIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink:0 }}>
      <path d="M23 4v6h-6"/>
      <path d="M1 20v-6h6"/>
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
    </svg>
  );
}

function ChevronIcon(props) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink:0, marginLeft:2 }}>
      {props.up ? <polyline points="18 15 12 9 6 15"/> : <polyline points="6 9 12 15 18 9"/>}
    </svg>
  );
}

function Pill(props) {
  return (
    <button
      onClick={props.onClick}
      style={{
        padding:"5px 13px", borderRadius:999, border:"none",
        background: props.active ? "#1a56db" : "#f1f5f9",
        color: props.active ? "#fff" : "#64748b",
        fontWeight: props.active ? 500 : 400,
        cursor:"pointer", fontSize:13, fontFamily:"inherit"
      }}
    >
      {props.label}
    </button>
  );
}

function SectionLabel(props) {
  return (
    <div style={{ fontSize:10, fontWeight:600, color:"#94a3b8", textTransform:"uppercase", letterSpacing:".07em", margin:"10px 0 6px" }}>
      {props.label}
    </div>
  );
}

function GroupLabel(props) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:8 }}>
      {props.color ? <span style={{ width:8, height:8, borderRadius:"50%", background:props.color, flexShrink:0 }} /> : null}
      <span style={{ fontSize:11, fontWeight:600, color:"#94a3b8", textTransform:"uppercase", letterSpacing:".06em" }}>
        {props.label}
      </span>
    </div>
  );
}

function AddButton(props) {
  return (
    <button
      onClick={props.onClick}
      style={{ width:"100%", padding:"8px", borderRadius:8, border:"1.5px dashed #e2e8f0", background:"transparent", color:"#94a3b8", fontSize:12, cursor:"pointer", marginTop:4, fontFamily:"inherit" }}
    >
      {props.label}
    </button>
  );
}

function CourseSelect(props) {
  const courses = props.courses;
  const value = props.value;
  const onChange = props.onChange;
  const isNew = value !== "" && courses.indexOf(value) === -1 && value !== "__custom__";
  const [customText, setCustomText] = useState(isNew ? value : "");
  const showInput = value === "__custom__" || isNew;
  function handleSelect(v) {
    if (v !== "__custom__") setCustomText("");
    onChange(v);
  }
  function handleCustom(v) {
    setCustomText(v);
    onChange("__CUSTOM__" + v);
  }
  return (
    <div>
      <select
        style={inp}
        value={isNew ? "__custom__" : value}
        onChange={function(e) { handleSelect(e.target.value); }}
      >
        <option value="" disabled={true}>Valitse kurssi...</option>
        {courses.map(function(c) { return <option key={c} value={c}>{c}</option>; })}
        <option value="__custom__">+ Uusi kurssi</option>
      </select>
      {showInput
        ? <input
            style={inp}
            placeholder="Kurssin nimi"
            value={customText}
            onChange={function(e) { handleCustom(e.target.value); }}
          />
        : null
      }
    </div>
  );
}

function resolveCourseName(val) {
  if (val && val.indexOf("__CUSTOM__") === 0) return val.slice(10).trim();
  if (val === "__custom__") return "";
  return val || "";
}

function FormBox(props) {
  return (
    <div style={{ background:"#f8fafc", border:"1px solid #e2e8f0", borderRadius:12, padding:"1rem 1.25rem", marginTop:8, boxShadow:"0 1px 3px rgba(0,0,0,.06)" }}>
      <div style={{ fontSize:14, fontWeight:600, marginBottom:12, color:"#1e293b" }}>{props.title}</div>
      {props.children}
    </div>
  );
}

function FormActions(props) {
  return (
    <div style={{ display:"flex", gap:8, justifyContent:"flex-end", marginTop:4 }}>
      <button
        onClick={props.onCancel}
        style={Object.assign({}, btnBase, { padding:"7px 16px", border:"1px solid #e2e8f0", background:"#fff", color:"#64748b" })}
      >
        Peruuta
      </button>
      <button
        onClick={props.onSave}
        style={Object.assign({}, btnBase, { padding:"7px 16px", border:"none", background:"#1a56db", color:"#fff", fontWeight:500 })}
      >
        {props.saveLabel || "Tallenna"}
      </button>
    </div>
  );
}

function TaskForm(props) {
  const task = props.task;
  const [name, setName] = useState(task ? task.name : "");
  const [course, setCourse] = useState(task ? task.course : "");
  const [due, setDue] = useState(task ? toLocal(task.due) : "");
  function save() {
    const c = resolveCourseName(course);
    if (!name.trim() || !c || !due) return;
    props.onSave({ name: name.trim(), course: c, due: due });
  }
  return (
    <FormBox title={task ? "Muokkaa tehtävää" : "Uusi tehtävä"}>
      <input style={inp} placeholder="Tehtävän nimi" value={name} onChange={function(e) { setName(e.target.value); }} />
      <CourseSelect courses={props.courses} value={course} onChange={setCourse} />
      <input style={inp} type="datetime-local" value={due} onChange={function(e) { setDue(e.target.value); }} />
      <FormActions onCancel={props.onCancel} onSave={save} saveLabel={task ? "Tallenna" : "Lisää tehtävä"} />
    </FormBox>
  );
}

function RecurringForm(props) {
  const initial = props.initial;
  const [name, setName] = useState(initial ? initial.name : "");
  const [course, setCourse] = useState(initial ? initial.course : "");
  const [dayIndex, setDayIndex] = useState(initial ? initial.dayIndex : 0);
  const [time, setTime] = useState(initial ? initial.time : "23:59");
  function save() {
    const c = resolveCourseName(course);
    if (!name.trim() || !c) return;
    props.onSave({ name: name.trim(), course: c, dayIndex: Number(dayIndex), time: time });
  }
  return (
    <FormBox title={initial ? "Muokkaa toistuvaa" : "Uusi toistuva tehtävä"}>
      <input style={inp} placeholder="Tehtävän nimi" value={name} onChange={function(e) { setName(e.target.value); }} />
      <CourseSelect courses={props.courses} value={course} onChange={setCourse} />
      <select style={inp} value={dayIndex} onChange={function(e) { setDayIndex(e.target.value); }}>
        {DAYS.map(function(d, i) { return <option key={i} value={i}>{d}</option>; })}
      </select>
      <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:8 }}>
        <span style={{ fontSize:13, color:"#64748b", whiteSpace:"nowrap" }}>Kellonaika:</span>
        <input
          style={Object.assign({}, inp, { marginBottom:0 })}
          type="time"
          value={time}
          onChange={function(e) { setTime(e.target.value); }}
        />
      </div>
      <FormActions onCancel={props.onCancel} onSave={save} saveLabel={initial ? "Tallenna" : "Lisää"} />
    </FormBox>
  );
}

function ExamForm(props) {
  const exam = props.exam;
  const fixedCourse = props.fixedCourse;
  const [name, setName] = useState(exam ? exam.name : "");
  const [course, setCourse] = useState(exam ? exam.course : (fixedCourse || ""));
  const [due, setDue] = useState(exam ? toLocal(exam.due) : "");
  const [place, setPlace] = useState(exam ? exam.place : "");
  const [notes, setNotes] = useState(exam ? exam.notes : "");
  function save() {
    const c = fixedCourse || resolveCourseName(course);
    if (!name.trim() || !c || !due) return;
    props.onSave({ name: name.trim(), course: c, due: due, place: place.trim(), notes: notes.trim() });
  }
  return (
    <FormBox title={exam ? "Muokkaa tenttiä" : "Uusi tentti"}>
      <input style={inp} placeholder="Tentin nimi" value={name} onChange={function(e) { setName(e.target.value); }} />
      {!fixedCourse ? <CourseSelect courses={props.courses} value={course} onChange={setCourse} /> : null}
      <input style={inp} type="datetime-local" value={due} onChange={function(e) { setDue(e.target.value); }} />
      <input style={inp} placeholder="Paikka (esim. T1, Zoom...)" value={place} onChange={function(e) { setPlace(e.target.value); }} />
      <textarea
        style={Object.assign({}, inp, { minHeight:60, resize:"vertical" })}
        placeholder="Muistiinpanot..."
        value={notes}
        onChange={function(e) { setNotes(e.target.value); }}
      />
      <FormActions onCancel={props.onCancel} onSave={save} saveLabel={exam ? "Tallenna" : "Lisää tentti"} />
    </FormBox>
  );
}

function ExamCard(props) {
  const exam = props.exam;
  const s = getExamStatus(exam.due);
  const color = courseColor(exam.course, props.allCourses);
  const [expanded, setExpanded] = useState(false);
  return (
    <div style={{ background:"#f8fafc", borderRadius:10, marginBottom:6, border:"1px solid #e2e8f0", borderLeft:"3px solid " + (s === "past" ? "#e2e8f0" : color), opacity: s === "past" ? 0.6 : 1 }}>
      <div style={{ display:"flex", alignItems:"center", gap:8, padding:"9px 12px" }}>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:13, fontWeight:500, color:"#1e293b", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
            {exam.name}
          </div>
          <div style={{ fontSize:11, color:"#94a3b8", marginTop:1 }}>
            {fmtDate(exam.due)}{exam.place ? " · " + exam.place : ""}
          </div>
        </div>
        <Badge s={s} exam={true} />
        {exam.notes
          ? <button
              onClick={function() { setExpanded(function(p) { return !p; }); }}
              style={{ background:"none", border:"none", cursor:"pointer", padding:3, color:"#94a3b8", display:"flex", alignItems:"center" }}
            >
              <ChevronIcon up={expanded} />
            </button>
          : null
        }
        <IconEdit onClick={props.onEdit} />
        <IconDel onClick={props.onDel} />
      </div>
      {expanded && exam.notes
        ? <div style={{ padding:"0 12px 9px 12px", fontSize:12, color:"#475569", lineHeight:1.6, borderTop:"1px solid #f1f5f9", paddingTop:7, whiteSpace:"pre-wrap" }}>
            {exam.notes}
          </div>
        : null
      }
    </div>
  );
}

function MiniTaskRow(props) {
  const t = props.t;
  const s = getStatus(t.due, t.done);
  return (
    <div style={{ display:"flex", alignItems:"center", gap:8, background:"#f8fafc", borderRadius:8, padding:"8px 10px", marginBottom:5, borderLeft:"3px solid " + (t.done ? "#e2e8f0" : props.color), opacity: t.done ? 0.55 : 1 }}>
      <input type="checkbox" checked={t.done} onChange={props.onToggle} style={{ width:14, height:14, flexShrink:0, cursor:"pointer", accentColor:props.color }} />
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:13, fontWeight:500, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", textDecoration: t.done ? "line-through" : "none", color:"#1e293b" }}>
          {t.name}
        </div>
        {t.due ? <div style={{ fontSize:11, color:"#94a3b8", marginTop:1 }}>{"Palautus: " + fmt(t.due)}</div> : null}
      </div>
      <Badge s={s} />
      <IconEdit onClick={props.onEdit} />
      {props.onDel ? <IconDel onClick={props.onDel} /> : null}
    </div>
  );
}

function MiniRecurRow(props) {
  const r = props.r;
  const done = props.done;
  return (
    <div style={{ display:"flex", alignItems:"center", gap:8, background:"#f8fafc", borderRadius:8, padding:"8px 10px", marginBottom:5, borderLeft:"3px solid " + (done ? "#e2e8f0" : props.color), opacity: done ? 0.55 : 1 }}>
      <input type="checkbox" checked={done} onChange={props.onToggle} style={{ width:14, height:14, flexShrink:0, cursor:"pointer", accentColor:props.color }} />
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:5 }}>
          <RecurIcon />
          <div style={{ fontSize:13, fontWeight:500, color:"#1e293b", textDecoration: done ? "line-through" : "none" }}>{r.name}</div>
        </div>
        <div style={{ fontSize:11, color:"#94a3b8", marginTop:1 }}>{DAYS[r.dayIndex] + " klo " + r.time}</div>
      </div>
      <IconEdit onClick={props.onEdit} />
      <IconDel onClick={props.onDel} />
    </div>
  );
}

function ExportImport(props) {
  const fileRef = useRef();
  function doExport() {
    try {
      const data = {
        tasks: props.tasks, recurrings: props.recurrings,
        recDone: props.recDone, exams: props.exams,
        exportedAt: new Date().toISOString()
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type:"application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "koulu.json";
      document.body.appendChild(a);
      a.click();
      setTimeout(function() { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
    } catch(e) { alert("Vienti epäonnistui: " + e.message); }
  }
  function doImport(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(ev) {
      try {
        const data = JSON.parse(ev.target.result);
        if (data.tasks && data.recurrings) props.onImport(data);
        else alert("Virheellinen tiedosto.");
      } catch(err) { alert("Tiedostoa ei voitu lukea."); }
    };
    reader.readAsText(file);
    e.target.value = "";
  }
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.4)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:100 }}>
      <div style={{ background:"#fff", borderRadius:16, padding:"1.5rem", width:"90%", maxWidth:380, boxShadow:"0 8px 32px rgba(0,0,0,.15)" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
          <div style={{ fontSize:16, fontWeight:600, color:"#1e293b" }}>Asetukset</div>
          <button onClick={props.onClose} style={{ background:"none", border:"none", cursor:"pointer", color:"#94a3b8", fontSize:20, lineHeight:1 }}>×</button>
        </div>
        <div style={{ fontSize:13, color:"#64748b", marginBottom:14, lineHeight:1.6 }}>
          Vie tai tuo kaikki tehtäväsi JSON-tiedostona. Tuonti korvaa nykyiset tiedot.
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          <button
            onClick={doExport}
            style={Object.assign({}, btnBase, { padding:"10px 16px", border:"none", background:"#1a56db", color:"#fff", fontWeight:500, fontSize:14, textAlign:"left", borderRadius:10 })}
          >
            Vie tehtävät (JSON)
          </button>
          <button
            onClick={function() { fileRef.current.click(); }}
            style={Object.assign({}, btnBase, { padding:"10px 16px", border:"1px solid #e2e8f0", background:"#fff", color:"#374151", fontSize:14, textAlign:"left", borderRadius:10 })}
          >
            Tuo tehtävät tiedostosta
          </button>
          <input ref={fileRef} type="file" accept=".json" onChange={doImport} style={{ display:"none" }} />
        </div>
      </div>
    </div>
  );
}

function CourseCard(props) {
  const c = props.c;
  const color = props.color;
  const cTasks = props.cTasks;
  const cRec = props.cRec;
  const cExams = props.cExams;
  const totalDone = props.totalDone;
  const totalAll = props.totalAll;
  const allCourses = props.allCourses;
  const recDone = props.recDone;
  const [open, setOpen] = useState(false);

  return (
    <div style={{ background:"#fff", borderRadius:14, marginBottom:12, boxShadow:"0 1px 4px rgba(0,0,0,.07)", overflow:"hidden" }}>
      <div
        style={{ display:"flex", alignItems:"center", gap:8, padding:"12px 14px", borderBottom: open ? "1px solid #f1f5f9" : "none", cursor:"pointer" }}
        onClick={function() { setOpen(function(p) { return !p; }); }}
      >
        <span style={{ width:11, height:11, borderRadius:"50%", background:color, flexShrink:0 }} />
        <span style={{ flex:1, fontSize:15, fontWeight:600, color:"#1e293b" }}>{c}</span>
        <div
          style={{ display:"flex", alignItems:"center", gap:6 }}
          onClick={function(e) { e.stopPropagation(); }}
        >
          <button
            onClick={function() { props.setAddExamOpen(props.addExamOpen === c ? null : c); setOpen(true); }}
            style={Object.assign({}, btnBase, { padding:"4px 9px", border:"1px solid #c4b5fd", background:"#ede9fe", color:"#5b21b6", fontSize:11 })}
          >
            + Tentti
          </button>
          <button
            onClick={function() { props.archiveCourse(c); }}
            style={Object.assign({}, btnBase, { padding:"4px 9px", border:"1px solid #e2e8f0", background:"#f8fafc", color:"#94a3b8", fontSize:11 })}
          >
            Arkistoi
          </button>
        </div>
        <ChevronIcon up={open} />
      </div>

      <div style={{ display:"flex" }}>
        <div style={{ flex:1, padding:"9px 14px", borderRight:"1px solid #f1f5f9", borderBottom: open ? "1px solid #f1f5f9" : "none" }}>
          <div style={{ fontSize:10, color:"#94a3b8", marginBottom:2, textTransform:"uppercase", letterSpacing:".04em" }}>
            Tehdyt tehtävät
          </div>
          <div style={{ fontSize:17, fontWeight:700, color:"#1e293b" }}>
            {totalDone}
            <span style={{ fontSize:12, fontWeight:400, color:"#94a3b8" }}>{"/" + totalAll}</span>
          </div>
        </div>
        <div style={{ flex:1, padding:"9px 14px", borderBottom: open ? "1px solid #f1f5f9" : "none" }}>
          <div style={{ fontSize:10, color:"#94a3b8", marginBottom:2, textTransform:"uppercase", letterSpacing:".04em" }}>
            Tentti
          </div>
          <div style={{ fontSize:13, fontWeight:600, color: cExams.length > 0 ? "#5b21b6" : "#94a3b8" }}>
            {cExams.length > 0 ? "Kyllä" : "Ei"}
          </div>
        </div>
      </div>

      {open ? (
        <div style={{ padding:"10px 12px" }}>
          {cRec.length > 0 ? <SectionLabel label="Toistuvat" /> : null}
          {cRec.map(function(r) {
            if (props.editRecId === r.id) {
              return (
                <RecurringForm
                  key={r.id}
                  initial={r}
                  courses={allCourses}
                  onSave={props.saveEditRec}
                  onCancel={function() { props.setEditRecId(null); }}
                />
              );
            }
            return (
              <MiniRecurRow
                key={r.id}
                r={r}
                color={color}
                done={!!recDone[r.id]}
                onToggle={function() { props.toggleRec(r.id); }}
                onEdit={function() { props.setEditRecId(r.id); }}
                onDel={function() { props.delRecurring(r.id); }}
              />
            );
          })}

          {cTasks.length > 0 ? <SectionLabel label="Muut tehtävät" /> : null}
          {cTasks.map(function(t) {
            if (props.editId === t.id) {
              return (
                <TaskForm
                  key={t.id}
                  task={t}
                  courses={allCourses}
                  onSave={props.saveEdit}
                  onCancel={function() { props.setEditId(null); }}
                />
              );
            }
            return (
              <MiniTaskRow
                key={t.id}
                t={t}
                color={color}
                onToggle={function() { props.toggle(t.id); }}
                onEdit={function() { props.setEditId(t.id); }}
                onDel={function() { props.del(t.id); }}
              />
            );
          })}

          {cExams.length > 0 ? <SectionLabel label="Tentit" /> : null}
          {cExams.map(function(e) {
            if (props.editExamId === e.id) {
              return (
                <ExamForm
                  key={e.id}
                  exam={e}
                  courses={allCourses}
                  onSave={function(data) { props.editExamFn(e.id, data); props.setEditExamId(null); }}
                  onCancel={function() { props.setEditExamId(null); }}
                />
              );
            }
            return (
              <ExamCard
                key={e.id}
                exam={e}
                allCourses={allCourses}
                onEdit={function() { props.setEditExamId(e.id); props.setAddExamOpen(null); }}
                onDel={function() { props.delExam(e.id); }}
              />
            );
          })}

          {props.addExamOpen === c ? (
            <ExamForm
              fixedCourse={c}
              courses={allCourses}
              onSave={function(data) { props.addExam(data); }}
              onCancel={function() { props.setAddExamOpen(null); }}
            />
          ) : null}

          {cTasks.length === 0 && cRec.length === 0 && cExams.length === 0 && props.addExamOpen !== c ? (
            <div style={{ fontSize:12, color:"#cbd5e1", textAlign:"center", padding:"8px 0" }}>
              Ei tehtäviä tai tenttejä vielä.
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function CoursesView(props) {
  const [showArchived, setShowArchived] = useState(false);
  const allCoursesRaw = props.allCoursesRaw;
  const archivedCourses = props.archivedCourses;
  const active = allCoursesRaw.filter(function(c) { return archivedCourses.indexOf(c) === -1; });
  const archived = allCoursesRaw.filter(function(c) { return archivedCourses.indexOf(c) !== -1; });

  return (
    <div>
      {!active.length
        ? <div style={{ textAlign:"center", padding:"3rem 0", color:"#cbd5e1", fontSize:14 }}>Ei kursseja vielä.</div>
        : null
      }
      {active.map(function(c) {
        const color = courseColor(c, props.allCourses);
        const cTasks = props.activeTasks.filter(function(t) { return t.course === c; });
        const cRec = props.activeRecurrings.filter(function(r) { return r.course === c; });
        const cExams = props.activeExams.filter(function(e) { return e.course === c; });
        const doneTasks = cTasks.filter(function(t) { return t.done; }).length;
        const doneRec = cRec.filter(function(r) { return !!props.recDone[r.id]; }).length;
        const totalDone = doneTasks + doneRec;
        const totalAll = cTasks.length + cRec.length;
        return (
          <CourseCard
            key={c}
            c={c}
            color={color}
            cTasks={cTasks}
            cRec={cRec}
            cExams={cExams}
            totalDone={totalDone}
            totalAll={totalAll}
            allCourses={props.allCourses}
            recDone={props.recDone}
            addExamOpen={props.addExamOpen}
            setAddExamOpen={props.setAddExamOpen}
            editExamId={props.editExamId}
            setEditExamId={props.setEditExamId}
            editRecId={props.editRecId}
            setEditRecId={props.setEditRecId}
            editId={props.editId}
            setEditId={props.setEditId}
            toggle={props.toggle}
            del={props.del}
            toggleRec={props.toggleRec}
            delRecurring={props.delRecurring}
            addExam={props.addExam}
            editExamFn={props.editExamFn}
            delExam={props.delExam}
            archiveCourse={props.archiveCourse}
            saveEdit={props.saveEdit}
            saveEditRec={props.saveEditRec}
          />
        );
      })}
      {archived.length > 0 ? (
        <div style={{ marginTop:8 }}>
          <button
            onClick={function() { setShowArchived(function(p) { return !p; }); }}
            style={Object.assign({}, btnBase, { padding:"5px 12px", border:"1px solid #e2e8f0", background:"#f8fafc", color:"#64748b", fontSize:12, marginBottom:10 })}
          >
            {showArchived ? "Piilota arkistoidut" : "Näytä arkistoidut (" + archived.length + ")"}
          </button>
          {showArchived ? archived.map(function(c) {
            return (
              <div key={c} style={{ display:"flex", alignItems:"center", gap:10, background:"#fff", borderRadius:12, padding:"11px 14px", marginBottom:7, opacity:0.5, boxShadow:"0 1px 4px rgba(0,0,0,.07)" }}>
                <span style={{ width:10, height:10, borderRadius:"50%", background:"#cbd5e1", flexShrink:0 }} />
                <span style={{ flex:1, fontSize:14, color:"#64748b" }}>{c}</span>
                <button
                  onClick={function() { props.unarchiveCourse(c); }}
                  style={Object.assign({}, btnBase, { padding:"5px 12px", border:"1px solid #a4c0f4", background:"#e8f0fe", color:"#1a56db", fontSize:12 })}
                >
                  Palauta
                </button>
              </div>
            );
          }) : null}
        </div>
      ) : null}
    </div>
  );
}

function App() {
  const [tasks, setTasks] = useState([]);
  const [recurrings, setRecurrings] = useState([]);
  const [recDone, setRecDone] = useState({});
  const [archivedCourses, setArchivedCourses] = useState([]);
  const [exams, setExams] = useState([]);
  const [tab, setTab] = useState("courses");
  const [filter, setFilter] = useState("all");
  const [recFilter, setRecFilter] = useState("all");
  const [view, setView] = useState("course");
  const [editId, setEditId] = useState(null);
  const [editRecId, setEditRecId] = useState(null);
  const [editExamId, setEditExamId] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addRecOpen, setAddRecOpen] = useState(false);
  const [addExamOpen, setAddExamOpen] = useState(null);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(function() {
    try { setTasks(JSON.parse(localStorage.getItem(KEY_TASKS) || "[]")); } catch(e) {}
    try { setRecurrings(JSON.parse(localStorage.getItem(KEY_RECURRING) || "[]")); } catch(e) {}
    try {
      const s = JSON.parse(localStorage.getItem(KEY_REC_DONE) || "{}");
      setRecDone(s[getWeekKey()] || {});
    } catch(e) {}
    try { setArchivedCourses(JSON.parse(localStorage.getItem(KEY_ARCHIVED) || "[]")); } catch(e) {}
    try { setExams(JSON.parse(localStorage.getItem(KEY_EXAMS) || "[]")); } catch(e) {}
  }, []);

  useEffect(function() { try { localStorage.setItem(KEY_TASKS, JSON.stringify(tasks)); } catch(e) {} }, [tasks]);
  useEffect(function() { try { localStorage.setItem(KEY_RECURRING, JSON.stringify(recurrings)); } catch(e) {} }, [recurrings]);
  useEffect(function() {
    try {
      const a = JSON.parse(localStorage.getItem(KEY_REC_DONE) || "{}");
      a[getWeekKey()] = recDone;
      localStorage.setItem(KEY_REC_DONE, JSON.stringify(a));
    } catch(e) {}
  }, [recDone]);
  useEffect(function() { try { localStorage.setItem(KEY_ARCHIVED, JSON.stringify(archivedCourses)); } catch(e) {} }, [archivedCourses]);
  useEffect(function() { try { localStorage.setItem(KEY_EXAMS, JSON.stringify(exams)); } catch(e) {} }, [exams]);

  const allCoursesRaw = (function() {
    const seen = {};
    const r = [];
    tasks.concat(recurrings).concat(exams).forEach(function(x) {
      if (x.course && !seen[x.course]) { seen[x.course] = true; r.push(x.course); }
    });
    return r;
  })();

  const allCourses = allCoursesRaw.filter(function(c) { return archivedCourses.indexOf(c) === -1; });
  const activeTasks = tasks.filter(function(t) { return archivedCourses.indexOf(t.course) === -1; });
  const activeRecurrings = recurrings.filter(function(r) { return archivedCourses.indexOf(r.course) === -1; });
  const activeExams = exams.filter(function(e) { return archivedCourses.indexOf(e.course) === -1; });
  const recurringTasks = activeRecurrings.map(function(r) {
    return { id:"rec-"+r.id, recurringId:r.id, name:r.name, course:r.course, due:thisWeekOccurrence(r.dayIndex,r.time), done:!!recDone[r.id], isRecurring:true };
  });

  function addTask(data) {
    setTasks(function(p) { return p.concat([Object.assign({ id:Date.now() }, data, { done:false })]); });
    setAddOpen(false);
  }
  function saveEdit(data) {
    setTasks(function(p) { return p.map(function(t) { return t.id === editId ? Object.assign({}, t, data) : t; }); });
    setEditId(null);
  }
  function toggle(id) {
    setTasks(function(p) { return p.map(function(t) { return t.id === id ? Object.assign({}, t, { done:!t.done }) : t; }); });
  }
  function del(id) {
    setTasks(function(p) { return p.filter(function(t) { return t.id !== id; }); });
  }
  function addRecurring(data) {
    setRecurrings(function(p) { return p.concat([Object.assign({ id:Date.now() }, data)]); });
    setAddRecOpen(false);
  }
  function saveEditRec(data) {
    setRecurrings(function(p) { return p.map(function(r) { return r.id === editRecId ? Object.assign({}, r, data) : r; }); });
    setEditRecId(null);
  }
  function delRecurring(id) {
    setRecurrings(function(p) { return p.filter(function(r) { return r.id !== id; }); });
  }
  function toggleRec(rid) {
    setRecDone(function(p) { const n = Object.assign({}, p); n[rid] = !p[rid]; return n; });
  }
  function addExam(data) {
    setExams(function(p) { return p.concat([Object.assign({ id:Date.now() }, data)]); });
    setAddExamOpen(null);
  }
  function editExamFn(id, data) {
    setExams(function(p) { return p.map(function(e) { return e.id === id ? Object.assign({}, e, data) : e; }); });
  }
  function delExam(id) {
    setExams(function(p) { return p.filter(function(e) { return e.id !== id; }); });
  }
  function archiveCourse(c) {
    setArchivedCourses(function(p) { return p.concat([c]); });
  }
  function unarchiveCourse(c) {
    setArchivedCourses(function(p) { return p.filter(function(x) { return x !== c; }); });
  }
  function handleImport(data) {
    if (!window.confirm("Korvaa kaikki nykyiset tiedot?")) return;
    setTasks(data.tasks || []);
    setRecurrings(data.recurrings || []);
    setRecDone((data.recDone || {})[getWeekKey()] || {});
    setExams(data.exams || []);
    setShowSettings(false);
  }

  function tabStyle(active) {
    return {
      padding:"8px 14px", borderRadius:999, border:"none",
      background: active ? "#1e293b" : "#f1f5f9",
      color: active ? "#fff" : "#64748b",
      fontWeight: active ? 500 : 400,
      cursor:"pointer", fontSize:13, fontFamily:"inherit"
    };
  }

  function renderTaskRow(t) {
    const color = courseColor(t.course, allCourses);
    if (!t.isRecurring && editId === t.id) {
      return <TaskForm key={t.id} task={t} courses={allCourses} onSave={saveEdit} onCancel={function() { setEditId(null); }} />;
    }
    return (
      <div key={t.id} style={{ display:"flex", alignItems:"center", gap:10, background:"#fff", borderRadius:12, padding:"11px 14px", marginBottom:7, opacity: t.done ? 0.5 : 1, boxShadow:"0 1px 4px rgba(0,0,0,.07)", borderLeft:"3.5px solid " + (t.done ? "#e2e8f0" : color) }}>
        <input
          type="checkbox"
          checked={t.done}
          onChange={function() { t.isRecurring ? toggleRec(t.recurringId) : toggle(t.id); }}
          style={{ width:16, height:16, flexShrink:0, cursor:"pointer", accentColor:color }}
        />
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:5 }}>
            {t.isRecurring ? <RecurIcon /> : null}
            <div style={{ fontSize:14, fontWeight:500, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", textDecoration: t.done ? "line-through" : "none", color:"#1e293b" }}>
              {t.name}
            </div>
          </div>
          {t.due ? <div style={{ fontSize:12, color:"#94a3b8", marginTop:2 }}>{"Palautus: " + fmt(t.due)}</div> : null}
        </div>
        <Badge s={getStatus(t.due, t.done)} />
        <IconEdit onClick={function() {
          if (t.isRecurring) { setEditRecId(t.recurringId); setTab("recurring"); }
          else { setEditId(t.id); setAddOpen(false); }
        }} />
        {!t.isRecurring ? <IconDel onClick={function() { del(t.id); }} /> : null}
      </div>
    );
  }

  function renderGroups(items) {
    const groups = [];
    const gmap = {};
    if (view === "course") {
      items.forEach(function(t) {
        if (!gmap[t.course]) { gmap[t.course] = []; groups.push(t.course); }
        gmap[t.course].push(t);
      });
      groups.forEach(function(g) {
        gmap[g].sort(function(a, b) { return new Date(a.due) - new Date(b.due); });
      });
    } else {
      items.slice().sort(function(a, b) { return new Date(a.due) - new Date(b.due); }).forEach(function(t) {
        const k = new Date(t.due).toLocaleDateString("fi-FI", { weekday:"long", day:"numeric", month:"numeric" });
        if (!gmap[k]) { gmap[k] = []; groups.push(k); }
        gmap[k].push(t);
      });
    }
    if (!groups.length) return <div style={{ textAlign:"center", padding:"3rem 0", color:"#cbd5e1", fontSize:14 }}>Ei tehtäviä.</div>;
    return groups.map(function(g) {
      return (
        <div key={g} style={{ marginBottom:"1.25rem" }}>
          <GroupLabel label={g} color={view === "course" ? courseColor(g, allCourses) : null} />
          {gmap[g].map(function(t) { return renderTaskRow(t); })}
        </div>
      );
    });
  }

  function ViewBar() {
    return (
      <div style={{ display:"flex", gap:8, marginBottom:"1.25rem" }}>
        <Pill label="Kursseittain" active={view === "course"} onClick={function() { setView("course"); }} />
        <Pill label="Palautuspäivän mukaan" active={view === "due"} onClick={function() { setView("due"); }} />
      </div>
    );
  }

  function renderAll() {
    const nActive = activeTasks.filter(function(t) { return !t.done; }).length
      + recurringTasks.filter(function(t) { return !t.done; }).length;
    const nDone = activeTasks.filter(function(t) { return t.done; }).length
      + recurringTasks.filter(function(t) { return t.done; }).length;
    const total = activeTasks.length + recurringTasks.length;
    const allItems = activeTasks
      .filter(function(t) { return filter === "active" ? !t.done : filter === "done" ? t.done : true; })
      .concat(recurringTasks.filter(function(t) { return filter === "active" ? !t.done : filter === "done" ? t.done : true; }));
    return (
      <div>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:10 }}>
          <Pill label={"Kaikki (" + total + ")"} active={filter === "all"} onClick={function() { setFilter("all"); }} />
          <Pill label={"Kesken (" + nActive + ")"} active={filter === "active"} onClick={function() { setFilter("active"); }} />
          <Pill label={"Valmiit (" + nDone + ")"} active={filter === "done"} onClick={function() { setFilter("done"); }} />
        </div>
        <ViewBar />
        {renderGroups(allItems)}
      </div>
    );
  }

  function renderOther() {
    const nActive = activeTasks.filter(function(t) { return !t.done; }).length;
    const nDone = activeTasks.filter(function(t) { return t.done; }).length;
    const nLate = activeTasks.filter(function(t) { return !t.done && getStatus(t.due, false) === "late"; }).length;
    const visible = activeTasks.filter(function(t) { return filter === "active" ? !t.done : filter === "done" ? t.done : true; });
    return (
      <div>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:10 }}>
          <Pill label={"Kaikki (" + activeTasks.length + ")"} active={filter === "all"} onClick={function() { setFilter("all"); }} />
          <Pill label={"Kesken (" + nActive + ")"} active={filter === "active"} onClick={function() { setFilter("active"); }} />
          <Pill label={"Valmiit (" + nDone + ")"} active={filter === "done"} onClick={function() { setFilter("done"); }} />
          {nLate > 0
            ? <span style={{ padding:"5px 13px", borderRadius:999, background:"#fee2e2", color:"#b91c1c", fontSize:13, fontWeight:500 }}>
                {nLate + " myöhässä"}
              </span>
            : null
          }
        </div>
        <ViewBar />
        {renderGroups(visible)}
        {addOpen
          ? <TaskForm courses={allCourses} onSave={addTask} onCancel={function() { setAddOpen(false); }} />
          : <AddButton onClick={function() { setAddOpen(true); setEditId(null); }} label="+ Lisää tehtävä" />
        }
      </div>
    );
  }

  function renderRecurring() {
    const nDone = activeRecurrings.filter(function(r) { return !!recDone[r.id]; }).length;
    const nActive = activeRecurrings.length - nDone;
    const filtered = activeRecurrings.filter(function(r) {
      return recFilter === "active" ? !recDone[r.id] : recFilter === "done" ? !!recDone[r.id] : true;
    });
    const byCourse = {};
    const courseOrder = [];
    filtered.forEach(function(r) {
      if (!byCourse[r.course]) { byCourse[r.course] = []; courseOrder.push(r.course); }
      byCourse[r.course].push(r);
    });
    return (
      <div>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:"1.25rem" }}>
          <Pill label={"Kaikki (" + activeRecurrings.length + ")"} active={recFilter === "all"} onClick={function() { setRecFilter("all"); }} />
          <Pill label={"Kesken (" + nActive + ")"} active={recFilter === "active"} onClick={function() { setRecFilter("active"); }} />
          <Pill label={"Valmiit (" + nDone + ")"} active={recFilter === "done"} onClick={function() { setRecFilter("done"); }} />
        </div>
        {!courseOrder.length
          ? <div style={{ textAlign:"center", padding:"3rem 0", color:"#cbd5e1", fontSize:14 }}>Ei toistuvia tehtäviä.</div>
          : null
        }
        {courseOrder.map(function(c) {
          return (
            <div key={c} style={{ marginBottom:"1.25rem" }}>
              <GroupLabel label={c} color={courseColor(c, allCourses)} />
              {byCourse[c].map(function(r) {
                if (editRecId === r.id) {
                  return <RecurringForm key={r.id} initial={r} courses={allCourses} onSave={saveEditRec} onCancel={function() { setEditRecId(null); }} />;
                }
                return (
                  <div key={r.id} style={{ display:"flex", alignItems:"center", gap:10, background:"#fff", borderRadius:12, padding:"11px 14px", marginBottom:7, opacity: recDone[r.id] ? 0.55 : 1, boxShadow:"0 1px 4px rgba(0,0,0,.07)", borderLeft:"3.5px solid " + (recDone[r.id] ? "#e2e8f0" : courseColor(c, allCourses)) }}>
                    <input type="checkbox" checked={!!recDone[r.id]} onChange={function() { toggleRec(r.id); }} style={{ width:16, height:16, flexShrink:0, cursor:"pointer", accentColor:courseColor(c,allCourses) }} />
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:14, fontWeight:500, color:"#1e293b", textDecoration: recDone[r.id] ? "line-through" : "none" }}>{r.name}</div>
                      <div style={{ fontSize:12, color:"#94a3b8", marginTop:2 }}>{DAYS[r.dayIndex] + " klo " + r.time}</div>
                    </div>
                    <IconEdit onClick={function() { setEditRecId(r.id); setAddRecOpen(false); }} />
                    <IconDel onClick={function() { delRecurring(r.id); }} />
                  </div>
                );
              })}
            </div>
          );
        })}
        {addRecOpen
          ? <RecurringForm courses={allCourses} onSave={addRecurring} onCancel={function() { setAddRecOpen(false); }} />
          : <AddButton onClick={function() { setAddRecOpen(true); setEditRecId(null); }} label="+ Lisää toistuva tehtävä" />
        }
      </div>
    );
  }

  return (
    <div style={{ padding:"1.25rem 1rem", maxWidth:680, margin:"0 auto", fontFamily:"system-ui,sans-serif", background:"#f8fafc", minHeight:"100vh" }}>
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:"1.25rem" }}>
        <Logo />
        <h2 style={{ fontSize:20, fontWeight:700, color:"#1e293b", margin:0, flex:1 }}>Koulu</h2>
        <button
          onClick={function() { setShowSettings(true); }}
          style={{ background:"none", border:"none", cursor:"pointer", color:"#94a3b8", padding:4, display:"flex", alignItems:"center" }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
        </button>
      </div>

      <div style={{ display:"flex", gap:8, marginBottom:"1.5rem", flexWrap:"wrap" }}>
        <button style={tabStyle(tab === "courses")} onClick={function() { setTab("courses"); }}>Kurssit</button>
        <button style={tabStyle(tab === "all")} onClick={function() { setTab("all"); }}>Kaikki tehtävät</button>
        <button style={tabStyle(tab === "recurring")} onClick={function() { setTab("recurring"); }}>Toistuvat</button>
        <button style={tabStyle(tab === "other")} onClick={function() { setTab("other"); }}>Muut tehtävät</button>
      </div>

      {tab === "courses" ? (
        <CoursesView
          allCoursesRaw={allCoursesRaw}
          archivedCourses={archivedCourses}
          allCourses={allCourses}
          activeTasks={activeTasks}
          activeRecurrings={activeRecurrings}
          activeExams={activeExams}
          recDone={recDone}
          addExamOpen={addExamOpen}
          setAddExamOpen={setAddExamOpen}
          editExamId={editExamId}
          setEditExamId={setEditExamId}
          editRecId={editRecId}
          setEditRecId={setEditRecId}
          editId={editId}
          setEditId={setEditId}
          toggle={toggle}
          del={del}
          toggleRec={toggleRec}
          delRecurring={delRecurring}
          addExam={addExam}
          editExamFn={editExamFn}
          delExam={delExam}
          archiveCourse={archiveCourse}
          unarchiveCourse={unarchiveCourse}
          saveEdit={saveEdit}
          saveEditRec={saveEditRec}
        />
      ) : null}
      {tab === "all" ? renderAll() : null}
      {tab === "recurring" ? renderRecurring() : null}
      {tab === "other" ? renderOther() : null}

      {showSettings ? (
        <ExportImport
          tasks={tasks}
          recurrings={recurrings}
          recDone={recDone}
          exams={exams}
          onImport={handleImport}
          onClose={function() { setShowSettings(false); }}
        />
      ) : null}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
