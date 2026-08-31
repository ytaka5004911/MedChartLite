const DB_NAME = "MedChartLiteDB";
const DB_VERSION = 1;
let db, currentPatientId = null, editingPatientId = null;

const $ = id => document.getElementById(id);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const today = () => new Date().toISOString().slice(0,10);
const uid = prefix => prefix + Date.now().toString(36) + Math.random().toString(36).slice(2,6);

function openDB(){
  return new Promise((resolve,reject)=>{
    const req=indexedDB.open(DB_NAME,DB_VERSION);
    req.onupgradeneeded=e=>{
      const d=e.target.result;
      if(!d.objectStoreNames.contains("patients")){
        const s=d.createObjectStore("patients",{keyPath:"id"});
        s.createIndex("name","name");
      }
      if(!d.objectStoreNames.contains("records")){
        const s=d.createObjectStore("records",{keyPath:"id"});
        s.createIndex("patientId","patientId");
        s.createIndex("visitDate","visitDate");
      }
    };
    req.onsuccess=()=>{db=req.result;resolve(db)};
    req.onerror=()=>reject(req.error);
  });
}
function store(name,mode="readonly"){return db.transaction(name,mode).objectStore(name)}
function reqP(req){return new Promise((res,rej)=>{req.onsuccess=()=>res(req.result);req.onerror=()=>rej(req.error)})}
function getAll(name){return reqP(store(name).getAll())}
function getOne(name,key){return reqP(store(name).get(key))}
function put(name,obj){return reqP(store(name,"readwrite").put(obj))}
function del(name,key){return reqP(store(name,"readwrite").delete(key))}
function toast(msg){$("toast").textContent=msg;$("toast").classList.add("show");setTimeout(()=>$("toast").classList.remove("show"),1800)}

async function seed(){
  const patients=await getAll("patients");
  if(patients.length) return;
  const p={id:"P-0001",name:"サンプル 花子",birth:"1990-04-12",sex:"女性",phone:"000-0000-0000",status:"通院中",note:"デモ用の架空患者です。",createdAt:new Date().toISOString()};
  await put("patients",p);
  await put("records",{id:uid("R-"),patientId:p.id,visitDate:today(),department:"内科",clinician:"デモ担当",vitals:{temp:"36.5",bpSys:"118",bpDia:"72",pulse:"70"},chiefComplaint:"定期フォロー",history:"デモデータ",findings:"特記すべき所見なし",assessment:"経過良好",plan:"継続して経過観察",note:"これは架空データです。",createdAt:new Date().toISOString()});
}
async function renderPatients(filter=""){
  const ps=(await getAll("patients")).sort((a,b)=>a.name.localeCompare(b.name,"ja"));
  const q=filter.trim().toLowerCase();
  const list=ps.filter(p=>!q||`${p.id} ${p.name}`.toLowerCase().includes(q));
  $("patientCount").textContent=ps.length;
  $("patientList").innerHTML=list.length?list.map(p=>`
    <button class="patient-item ${p.id===currentPatientId?'active':''}" data-patient="${esc(p.id)}">
      <div class="id">${esc(p.id)}</div><div class="pname">${esc(p.name)}</div><div class="sub">${esc(p.sex||"")} ${esc(p.birth||"")}</div>
    </button>`).join(""):`<div class="muted">患者がいません</div>`;
  document.querySelectorAll("[data-patient]").forEach(b=>b.onclick=()=>selectPatient(b.dataset.patient));
}
async function selectPatient(id){
  currentPatientId=id;
  $("emptyState").classList.add("hidden");$("chart").classList.remove("hidden");
  await renderPatients($("patientSearch").value);
  await renderChart();
  activateTab("overview");
}
async function renderChart(){
  const p=await getOne("patients",currentPatientId); if(!p)return;
  $("patientName").textContent=p.name;
  $("patientStatus").textContent=p.status||"";
  $("patientMeta").textContent=`${p.id}　${p.birth||"生年月日未登録"}　${p.sex||"性別未登録"}`;
  $("basicInfo").innerHTML=`
    <dt>患者ID</dt><dd>${esc(p.id)}</dd>
    <dt>氏名</dt><dd>${esc(p.name)}</dd>
    <dt>生年月日</dt><dd>${esc(p.birth||"—")}</dd>
    <dt>性別</dt><dd>${esc(p.sex||"—")}</dd>
    <dt>電話</dt><dd>${esc(p.phone||"—")}</dd>
    <dt>備考</dt><dd>${esc(p.note||"—")}</dd>`;
  const rs=(await getAll("records")).filter(r=>r.patientId===currentPatientId).sort((a,b)=>b.visitDate.localeCompare(a.visitDate)||b.createdAt.localeCompare(a.createdAt));
  const r=rs[0];
  $("latestVitals").innerHTML=r?`
    <div class="vital"><small>体温</small><b>${esc(r.vitals.temp||"—")}<small> ℃</small></b></div>
    <div class="vital"><small>血圧</small><b>${esc(r.vitals.bpSys||"—")}/${esc(r.vitals.bpDia||"—")}</b></div>
    <div class="vital"><small>脈拍</small><b>${esc(r.vitals.pulse||"—")}<small> /分</small></b></div>
    <div class="vital"><small>診療日</small><b>${esc(r.visitDate||"—")}</b></div>`:`<div class="muted">診療記録がありません。</div>`;
  $("latestRecord").innerHTML=r?recordHTML(r,true):`<div class="muted">まだ診療記録がありません。</div>`;
  $("recordList").innerHTML=rs.length?rs.map(r=>recordHTML(r,false)).join(""):`<div class="muted">診療履歴がありません。</div>`;
  document.querySelectorAll("[data-record]").forEach(x=>x.onclick=()=>showRecord(x.dataset.record));
}
function recordHTML(r,latest){
  return `<article class="record-card">
    <div class="record-head"><div><strong>${esc(r.visitDate)}</strong>　${esc(r.department||"診療科未設定")}</div><button data-record="${esc(r.id)}">${latest?"詳細":"開く"}</button></div>
    <div class="record-body"><div class="record-grid">
      <div class="record-field"><h4>主訴</h4><p>${esc(r.chiefComplaint||"—")}</p></div>
      <div class="record-field"><h4>評価・診断</h4><p>${esc(r.assessment||"—")}</p></div>
      <div class="record-field"><h4>所見</h4><p>${esc(r.findings||"—")}</p></div>
      <div class="record-field"><h4>方針・計画</h4><p>${esc(r.plan||"—")}</p></div>
    </div></div>
  </article>`;
}
async function showRecord(id){
  const r=await getOne("records",id); if(!r)return;
  $("recordDetail").innerHTML=`
    <div class="muted">${esc(r.visitDate)}　${esc(r.department||"")}　担当：${esc(r.clinician||"—")}</div>
    <div class="card"><div class="card-title">バイタル</div>
      体温 ${esc(r.vitals.temp||"—")} ℃　／ 血圧 ${esc(r.vitals.bpSys||"—")}/${esc(r.vitals.bpDia||"—")} mmHg　／ 脈拍 ${esc(r.vitals.pulse||"—")} /分
    </div>
    ${[['主訴',r.chiefComplaint],['現病歴',r.history],['所見',r.findings],['評価・診断',r.assessment],['方針・計画',r.plan],['メモ',r.note]].map(([t,v])=>`<div class="card"><div class="card-title">${t}</div><div style="white-space:pre-wrap;line-height:1.7">${esc(v||"—")}</div></div>`).join("")}
    <div class="form-actions"><button class="danger-outline" id="deleteRecordBtn">この記録を削除</button></div>`;
  $("recordDialog").showModal();
  $("deleteRecordBtn").onclick=async()=>{if(confirm("この診療記録を削除しますか？")){await del("records",id);$("recordDialog").close();await renderChart();toast("診療記録を削除しました")}};
}
function activateTab(tab){
  document.querySelectorAll(".tab").forEach(x=>x.classList.toggle("active",x.dataset.tab===tab));
  document.querySelectorAll(".tab-panel").forEach(x=>x.classList.add("hidden"));
  $("tab-"+tab).classList.remove("hidden");
}
function clearRecordForm(){document.querySelector("#recordForm").reset();$("visitDate").value=today()}
function openPatientDialog(p=null){
  editingPatientId=p?.id||null;
  $("patientDialogTitle").textContent=p?"患者情報を編集":"新規患者";
  $("pId").value=p?.id||`P-${String((Date.now()%100000)).padStart(5,"0")}`;
  $("pName").value=p?.name||"";$("pBirth").value=p?.birth||"";$("pSex").value=p?.sex||"";
  $("pPhone").value=p?.phone||"";$("pStatus").value=p?.status||"通院中";$("pNote").value=p?.note||"";
  $("patientDialog").showModal();
}
$("patientForm").onsubmit=async e=>{
  e.preventDefault();
  const id=$("pId").value.trim()||uid("P-");
  const old=editingPatientId?await getOne("patients",editingPatientId):null;
  const p={id,name:$("pName").value.trim(),birth:$("pBirth").value,sex:$("pSex").value,phone:$("pPhone").value.trim(),status:$("pStatus").value,note:$("pNote").value.trim(),createdAt:old?.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString()};
  if(!p.name){toast("氏名を入力してください");return}
  if(editingPatientId&&editingPatientId!==id) await del("patients",editingPatientId);
  await put("patients",p);$("patientDialog").close();currentPatientId=id;await renderPatients();await selectPatient(id);toast("患者情報を保存しました");
};
$("recordForm").onsubmit=async e=>{
  e.preventDefault(); if(!currentPatientId)return;
  const r={id:uid("R-"),patientId:currentPatientId,visitDate:$("visitDate").value,department:$("department").value.trim(),clinician:$("clinician").value.trim(),
    vitals:{temp:$("temp").value,bpSys:$("bpSys").value,bpDia:$("bpDia").value,pulse:$("pulse").value},
    chiefComplaint:$("chiefComplaint").value.trim(),history:$("history").value.trim(),findings:$("findings").value.trim(),assessment:$("assessment").value.trim(),plan:$("plan").value.trim(),note:$("note").value.trim(),createdAt:new Date().toISOString()};
  await put("records",r);clearRecordForm();await renderChart();activateTab("records");toast("診療記録を保存しました");
};
$("newPatientBtn").onclick=()=>openPatientDialog();
$("editPatientBtn").onclick=async()=>openPatientDialog(await getOne("patients",currentPatientId));
$("deletePatientBtn").onclick=async()=>{if(confirm("患者情報と診療履歴をすべて削除しますか？")){const rs=(await getAll("records")).filter(r=>r.patientId===currentPatientId);for(const r of rs)await del("records",r.id);await del("patients",currentPatientId);currentPatientId=null;$("chart").classList.add("hidden");$("emptyState").classList.remove("hidden");await renderPatients();toast("患者を削除しました")}};
$("quickNewRecord").onclick=()=>{activateTab("newRecord");clearRecordForm()};
document.querySelectorAll(".tab").forEach(t=>t.onclick=()=>activateTab(t.dataset.tab));
$("clearRecordBtn").onclick=clearRecordForm;
$("patientSearch").oninput=e=>renderPatients(e.target.value);
document.querySelectorAll("[data-close]").forEach(b=>b.onclick=()=>$(b.dataset.close).close());

$("exportBtn").onclick=async()=>{
  const data={version:1,exportedAt:new Date().toISOString(),patients:await getAll("patients"),records:await getAll("records")};
  const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`medchart-backup-${today()}.json`;a.click();URL.revokeObjectURL(a.href);
  toast("バックアップを書き出しました");
};
$("importInput").onchange=async e=>{
  const file=e.target.files[0];if(!file)return;
  try{
    const data=JSON.parse(await file.text());
    if(!Array.isArray(data.patients)||!Array.isArray(data.records))throw new Error();
    for(const p of data.patients)await put("patients",p);
    for(const r of data.records)await put("records",r);
    await renderPatients();toast("バックアップを読み込みました");
  }catch{alert("読み込めるバックアップJSONではありません。")}
  e.target.value="";
};

(async()=>{
  await openDB();await seed();$("visitDate").value=today();await renderPatients();
})();
