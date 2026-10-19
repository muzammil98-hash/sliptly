const sb=supabase.createClient(SB_URL,SB_KEY);
let me=null,ready=false,flat=null,members=[],P={},EX=[],ST=[],tab='home',mode='login',sheet=null,pop=null,view=null,msg='',ch=null,U={},payWait=null,qr=null;
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const rs=n=>'₹'+Math.round(n).toLocaleString('en-IN');
const nm=id=>me&&id===me.id?'You':(P[id]||'Flatmate');
const av=(id,x='')=>`<div class="av c${Math.max(0,members.indexOf(id))%4} ${x}">${[...nm(id)][0]}</div>`;
const ico=d=>{d=d.toLowerCase();return d.includes('groc')?'🛒':d.includes('dinner')||d.includes('lunch')?'🍴':d.includes('wi')?'📶':d.includes('gas')?'🧴':d.includes('chai')?'☕':d.includes('rent')?'🏠':'🧾'};
const err=m=>{msg=m;render();setTimeout(()=>{msg='';render()},2600)};
const fday=t=>{const d=new Date(t),n=new Date(),df=Math.round((new Date(n.getFullYear(),n.getMonth(),n.getDate())-new Date(d.getFullYear(),d.getMonth(),d.getDate()))/864e5);return df===0?'Today':df===1?'Yesterday':d.toLocaleDateString('en-IN',{month:'short',day:'numeric'})};
const ftime=t=>new Date(t).toLocaleTimeString('en-IN',{hour:'numeric',minute:'2-digit'});

async function loadAll(){
 const {data}=await sb.from('flat_members').select('flat_id, flats(id,name,invite_code)').eq('user_id',me.id);
 const fl=(data||[]).map(x=>x.flats).filter(Boolean);flat=fl[0]||null;
 if(flat){await loadFlat();live()}}
async function loadFlat(){
 const [m,e,s]=await Promise.all([
  sb.from('flat_members').select('user_id').eq('flat_id',flat.id),
  sb.from('expenses').select('*, expense_splits(user_id,share)').eq('flat_id',flat.id).order('created_at',{ascending:false}),
  sb.from('settlements').select('*').eq('flat_id',flat.id).order('created_at',{ascending:false})]);
 members=(m.data||[]).map(x=>x.user_id);
 const {data:pr}=await sb.from('profiles').select('id,name,upi_id').in('id',members);
 P={};U={};(pr||[]).forEach(p=>{P[p.id]=esc(p.name);U[p.id]=p.upi_id||''});EX=e.data||[];ST=s.data||[]}
function live(){if(ch)return;let tm;
 ch=sb.channel('db').on('postgres_changes',{event:'*',schema:'public'},()=>{clearTimeout(tm);tm=setTimeout(async()=>{if(flat&&!sheet&&!/INPUT|SELECT/.test((document.activeElement||{}).tagName)){await loadFlat();render()}},400)}).subscribe()}

function net(p){let n=0;EX.forEach(e=>{const sp=e.expense_splits;
 if(e.paid_by===me.id){const x=sp.find(s=>s.user_id===p);if(x&&p!==me.id)n+=+x.share}
 else if(e.paid_by===p){const x=sp.find(s=>s.user_id===me.id);if(x)n-=+x.share}});
 ST.filter(s=>s.status==='confirmed').forEach(s=>{if(s.from_user===p&&s.to_user===me.id)n-=+s.amount;if(s.from_user===me.id&&s.to_user===p)n+=+s.amount});
 return Math.round(n*100)/100}
function itemsOf(p){return EX.flatMap(e=>{const sp=e.expense_splits;
 if(e.paid_by===me.id){const x=sp.find(s=>s.user_id===p);return x&&p!==me.id?[{d:e.description,v:+x.share,t:e.created_at}]:[]}
 if(e.paid_by===p){const x=sp.find(s=>s.user_id===me.id);return x?[{d:e.description,v:-x.share,t:e.created_at}]:[]}return[]})}
const pend=(from,to)=>ST.find(s=>s.status==='pending'&&s.from_user===from&&s.to_user===to);
function acts(p,n){const pi=pend(p,me.id),po=pend(me.id,p);
 if(n<0)return po?`<span class="wait">Waiting for ${nm(p)}</span>`:`<div><button class="pill" data-a="pay" data-v="${p}">Pay</button><button class="lnk" data-a="paid" data-v="${p}">Already paid</button></div>`;
 return pi?`<button class="pill" data-a="conf" data-v="${pi.id}">Confirm ${rs(pi.amount)}</button>`:`<div><button class="pill" data-a="recv" data-v="${p}">Received</button><button class="lnk" data-a="remind" data-v="${p}">Remind</button></div>`}

const hdr=()=>`<div class="top"><div><div class="logo">Splitly</div><div class="grp">${esc(flat.name)}</div></div><button class="ico" data-a="tab" data-v="groups" aria-label="Groups">👥</button></div>`;
function others(){return members.filter(p=>p!==me.id).map(p=>[p,net(p)]).filter(x=>Math.abs(x[1])>=1)}
function home(){const o=others(),sum=a=>a.reduce((s,x)=>s+Math.abs(x[1]),0);
 const rec=sum(o.filter(x=>x[1]>0)),owe=sum(o.filter(x=>x[1]<0));
 const cards=o.sort((a,b)=>a[1]-b[1]).map(([p,n])=>`<div class="card" data-a="person" data-v="${p}" style="cursor:pointer"><div class="head">${av(p)}<div class="t">${n<0?'You owe '+nm(p):nm(p)+' owes you'}<b class="${n<0?'r':'g'}">${rs(Math.abs(n))}</b></div>${acts(p,n)}</div>
 ${itemsOf(p).filter(i=>n<0?i.v<0:i.v>0).slice(0,3).map(i=>`<div class="li"><span>${ico(i.d)} ${esc(i.d)}</span><span>${rs(Math.abs(i.v))}</span></div>`).join('')}</div>`).join('');
 const last=ST.find(s=>s.status==='confirmed'&&(s.from_user===me.id||s.to_user===me.id));
 const lb=last?`<div class="banner"><div class="tick">✓</div><div><b>${last.from_user===me.id?'You paid '+nm(last.to_user):nm(last.from_user)+' paid you'} ${rs(last.amount)}</b><span class="sub">Settled</span></div></div>`:'';
 return `${hdr()}<div class="row"><button class="sum" data-a="sum" data-v="rec"><small>You’ll receive</small><div class="big g">${rs(rec)}</div></button><button class="sum" data-a="sum" data-v="owe"><small>You owe</small><div class="big r">${rs(owe)}</div></button></div>
 ${cards||'<div class="empty">All settled up. Add an expense to get started.</div>'}${lb}<button class="cta" data-a="add">＋ Add expense</button>`}
function activity(){const a=[...EX.map(e=>({k:'e',t:e.created_at,e})),...ST.map(s=>({k:'s',t:s.created_at,s}))].sort((x,y)=>new Date(y.t)-new Date(x.t));let last='';
 return `${hdr()}<h1>Activity</h1><span class="sub">Tap one of your expenses to edit or delete it.</span>${monthly()}`+(a.map(x=>{const d=fday(x.t),h=d!==last?`<div class="day">${d}</div>`:'';last=d;
 if(x.k==='e'){const e=x.e;return h+`<div class="card act" data-a="ex" data-v="${e.id}" style="cursor:pointer">${av(e.paid_by)}<div class="t"><b>${nm(e.paid_by)} added ${esc(e.description)}</b><span class="sub">${ftime(x.t)} · Split among ${e.expense_splits.length}</span></div><div class="amt r">${rs(e.amount)}</div></div>`}
 const s=x.s;return h+`<div class="card act">${av(s.from_user)}<div class="t"><b>${nm(s.from_user)} paid ${nm(s.to_user)}</b><span class="sub">${s.status==='pending'?'Waiting for '+nm(s.to_user)+' to confirm':'Confirmed'} · ${ftime(x.t)}</span></div><div class="amt g">${rs(s.amount)}</div></div>`}).join('')||'<div class="empty">No activity yet.</div>')}
function groups(){return `${hdr()}<h1>Groups</h1><span class="sub">People in ${esc(flat.name)}</span>
 <div class="card" style="margin-top:18px"><span class="sub" style="font-weight:600">Invite flatmates with this code</span><div class="code">${esc(flat.invite_code)}</div><button class="cta" data-a="share">Share invite</button></div>
 ${flatBal()}<div class="card"><b>Your UPI ID</b><span class="sub" style="margin-bottom:10px">Flatmates use this to pay you in one tap.</span><input class="in" id="u-upi" placeholder="name@bank" autocapitalize="none" autocomplete="off" value="${esc(U[me.id]||'')}"><button class="cta" style="padding:14px;font-size:16px" data-a="upi">Save UPI ID</button></div>
 <div class="card">${members.map(p=>`<div class="ex">${av(p)}<div class="t"><b>${nm(p)}</b><span class="sub">${U[p]?'UPI ID added':'No UPI ID yet'}</span></div></div>`).join('')}</div>
 <button class="pill" style="margin:0 auto" data-a="logout">Log out</button>`}
function flatBal(){const d={};members.forEach(a=>{d[a]={};members.forEach(b=>d[a][b]=0)});
 EX.forEach(e=>e.expense_splits.forEach(s=>{if(s.user_id!==e.paid_by&&d[s.user_id]&&d[e.paid_by])d[s.user_id][e.paid_by]+=+s.share}));
 ST.filter(s=>s.status==='confirmed').forEach(s=>{if(d[s.from_user]&&d[s.to_user])d[s.from_user][s.to_user]-=+s.amount});
 const l=[];members.forEach((a,i)=>members.slice(i+1).forEach(b=>{const x=Math.round((d[a][b]-d[b][a])*100)/100;if(Math.abs(x)>=1)l.push(x>0?[a,b,x]:[b,a,-x])}));
 return `<span class="sub" style="font-weight:600;margin:20px 0 10px">Everyone’s balances</span><div class="card" style="padding:6px 16px">${l.length?l.map(([a,b,x])=>`<div class="ex">${av(a)}<div class="t"><b>${nm(a)} ${a===me.id?'owe':'owes'} ${nm(b)}</b></div><b class="r" style="font-size:20px">${rs(x)}</b></div>`).join(''):'<div class="empty">Everyone is settled up.</div>'}</div>`}
function person(p){const n=net(p),it=itemsOf(p);
 return `<button class="back" data-a="back" aria-label="Back">‹</button>
 <div class="center">${av(p)}<div style="font-weight:700;font-size:18px">${n<0?'You owe '+nm(p):n>0?nm(p)+' owes you':'All settled with '+nm(p)}</div><div class="big ${n<0?'r':'g'}" style="font-size:46px">${rs(Math.abs(n))}</div></div>
 <span class="sub" style="margin-bottom:10px;font-weight:600">Shared expenses</span><div class="card">${it.map(i=>`<div class="ex"><div class="t"><b>${ico(i.d)} ${esc(i.d)}</b><span class="sub">${fday(i.t)}</span></div><b>${rs(Math.abs(i.v))}</b></div>`).join('')||'<div class="empty">No shared expenses yet.</div>'}</div>
 ${Math.abs(n)>=1?`<div style="display:flex;justify-content:center">${acts(p,n)}</div>`:''}`}
function popHTML(){const rec=pop==='rec',l=others().filter(x=>rec?x[1]>0:x[1]<0),tot=l.reduce((s,x)=>s+Math.abs(x[1]),0);
 return `<div class="sheet-bg"><div class="sheet" role="dialog"><div class="sh-h"><button class="cn" data-a="close">Close</button><span>${rec?'Who will pay you':'Whom you will pay'}</span><span style="width:50px"></span></div>
 <div class="center" style="margin-top:0"><span class="sub">${rec?'Total you’ll receive':'Total you owe'}</span><div class="big ${rec?'g':'r'}">${rs(tot)}</div></div>
 ${l.length?`<div class="card" style="padding:6px 16px">${l.map(([p,n])=>`<div class="ex">${av(p)}<div class="t"><b>${rec?nm(p)+' will pay you':'You will pay '+nm(p)}</b><span class="sub ${rec?'g':'r'}" style="font-weight:700;font-size:18px">${rs(Math.abs(n))}</span></div>${acts(p,n)}</div>`).join('')}</div>`:'<div class="empty">Nothing here. You’re all settled up.</div>'}</div></div>`}
function eachText(){const f=sheet;if(f.mode==='equal')return rs(f.split.length?f.amt/f.split.length:0)+' each';
 const t=f.split.reduce((q,u)=>q+(+f.vals[u]||0),0);return f.mode==='percent'?`${+t.toFixed(2)}% of 100%`:`${rs(t)} of ${rs(f.amt)}`}
function monthly(){const m={};EX.forEach(e=>{const d=new Date(e.created_at),k=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');const o=m[k]||(m[k]={t:0,y:0});o.t+=+e.amount;const x=e.expense_splits.find(q=>q.user_id===me.id);if(x)o.y+=+x.share});
 const ks=Object.keys(m).sort().reverse().slice(0,6);if(!ks.length)return '';const mx=Math.max(...ks.map(k=>m[k].t));
 return `<div class="day">Monthly spending</div><div class="card">${ks.map(k=>`<div style="margin-bottom:12px"><div style="display:flex;justify-content:space-between"><b>${new Date(k+'-01T12:00:00').toLocaleDateString('en-IN',{month:'long',year:'numeric'})}</b><b>${rs(m[k].t)}</b></div><div style="height:8px;border-radius:4px;background:var(--line);margin:6px 0"><div style="height:8px;border-radius:4px;background:var(--red);width:${Math.max(4,m[k].t/mx*100)}%"></div></div><span class="sub" style="font-size:14px">Your share ${rs(m[k].y)}</span></div>`).join('')}</div>`}
function sheetHTML(){const f=sheet,each=f.amt>0&&f.split.length?f.amt/f.split.length:0;
 return `<div class="sheet-bg"><div class="sheet" role="dialog"><div class="sh-h"><button class="cn" data-a="close">Cancel</button><span>${f.id?'Edit Expense':'Add Expense'}</span><span style="width:50px"></span></div>
 <div class="card"><input class="amt-in" id="x-amt" type="number" inputmode="decimal" min="0" placeholder="₹0" value="${f.amt||''}" aria-label="Amount"><input class="desc-in" id="x-desc" placeholder="What was it for?" value="${esc(f.desc)}"></div>
 <div class="card paid">Paid by <select id="x-paid">${members.map(p=>`<option value="${p}" ${p===f.paid?'selected':''}>${nm(p)}</option>`).join('')}</select></div>
 <div class="paid" style="justify-content:space-between"><b>Split with</b><span>${f.split.length} selected</span></div>
 <div class="seg">${[['equal','Equally'],['exact','Amounts'],['percent','Percent']].map(([k,l])=>`<button class="${f.mode===k?'on':''}" data-a="smode" data-v="${k}">${l}</button>`).join('')}</div>
 <div class="card" style="padding:6px 16px">${members.map(p=>{const on=f.split.includes(p);return `<div class="pp"><button class="ppb" data-a="pick" data-v="${p}">${av(p)}<span class="n">${nm(p)}</span></button>${on&&f.mode!=='equal'?`<input class="vi" data-u="${p}" type="number" inputmode="decimal" min="0" placeholder="${f.mode==='percent'?'%':'₹'}" value="${f.vals[p]??''}" aria-label="Share for ${nm(p)}">`:''}<button class="chk ${on?'on':''}" data-a="pick" data-v="${p}" aria-label="Include ${nm(p)}">${on?'✓':''}</button></div>`}).join('')}</div>
 <div class="eq">🧾 Split equally · <b id="each">${eachText()}</b></div><button class="cta" data-a="save">Save expense</button>${f.id?`<button style="width:100%;color:var(--red);font-weight:700;padding:16px" data-a="del">${f.del?'Tap again to delete':'Delete expense'}</button>`:''}</div></div>`}
function authHTML(){return `<div style="padding-top:40px"><div class="logo" style="font-size:44px">Splitly</div><span class="sub" style="font-size:17px;margin:6px 0 26px">Split bills with your flatmates. No awkward reminders.</span>
 <div class="card"><h2 style="font-size:24px;font-weight:800;margin-bottom:14px">${mode==='login'?'Log in':'Create account'}</h2>
 ${mode==='signup'?'<input class="in" id="a-nm" placeholder="Your name" autocomplete="name">':''}
 <input class="in" id="a-em" type="email" placeholder="Email" autocomplete="email"><input class="in" id="a-pw" type="password" placeholder="Password (6+ characters)" autocomplete="${mode==='login'?'current-password':'new-password'}">
 <button class="cta" data-a="auth" style="margin-top:6px">${mode==='login'?'Log in':'Sign up'}</button></div>
 <button style="width:100%;text-align:center;color:var(--red);font-weight:600" data-a="mode" data-v="${mode==='login'?'signup':'login'}">${mode==='login'?'New here? Create an account':'Already have an account? Log in'}</button></div>`}
const setupHTML=()=>`<div style="padding-top:30px"><div class="logo">Splitly</div><h1 style="margin-top:14px">Set up your flat</h1><span class="sub">Create a new flat, or join one with a code from a flatmate.</span>
 <div class="card" style="margin-top:18px"><b>Create a flat</b><input class="in" id="s-fl" placeholder="Flat name or number, e.g. Flat 4B" style="margin:10px 0"><button class="cta" data-a="create">Create flat</button></div>
 <div class="card"><b>Join with a code</b><input class="in" id="s-cd" placeholder="6-letter invite code" maxlength="6" style="margin:10px 0;text-transform:uppercase"><button class="cta" data-a="join">Join flat</button></div>
 <button style="width:100%;text-align:center;color:var(--mute)" data-a="logout">Log out</button></div>`;

function render(){const a=document.getElementById('app'),keep=[...document.querySelectorAll('input')].map(i=>[i.id,i.value]);
 if(!ready){a.innerHTML='<div class="empty" style="padding-top:40vh">Loading…</div>';return}
 if(!me)a.innerHTML=authHTML();else if(!flat)a.innerHTML=setupHTML();
 else a.innerHTML=(view?person(view):tab==='home'?home():tab==='activity'?activity():groups())+
 `<nav class="nav">${[['home','🏠','Home'],['activity','🧾','Activity'],['groups','👥','Groups']].map(([k,i,l])=>`<button data-a="tab" data-v="${k}" class="${!view&&tab===k?'on':''}"><span>${i}</span>${l}</button>`).join('')}</nav>`+(sheet?sheetHTML():'')+(pop?popHTML():'')+(qr?qrHTML():'');
 if(!me||!flat)keep.forEach(([id,v])=>{const el=id&&document.getElementById(id);if(el&&!el.value)el.value=v});
 if(msg)a.insertAdjacentHTML('beforeend',`<div class="toast" role="status">${esc(msg)}</div>`)}

const upiLink=(p,a)=>`upi://pay?pa=${encodeURIComponent(U[p])}&pn=${encodeURIComponent(P[p]||'Flatmate')}&am=${a.toFixed(2)}&cu=INR&tn=${encodeURIComponent('Splitly '+flat.name)}`;
function qrHTML(){const p=qr,n=net(p);if(n>=0||!U[p]){qr=null;return ''}const q=qrcode(0,'M');q.addData(upiLink(p,-n));q.make();
 return `<div class="sheet-bg"><div class="sheet" role="dialog"><div class="sh-h"><button class="cn" data-a="close">Close</button><span>Pay ${nm(p)}</span><span style="width:50px"></span></div>
 <div class="center" style="margin-top:0"><div class="big r">${rs(-n)}</div><span class="sub">Scan with GPay, PhonePe or Paytm</span></div>
 <div style="background:#fff;border-radius:20px;padding:16px;width:260px;max-width:100%;margin:0 auto 12px;line-height:0">${q.createSvgTag({cellSize:6,margin:0,scalable:true})}</div>
 <span class="sub" style="text-align:center;margin-bottom:16px">${esc(U[p])}</span>
 <button class="cta" data-a="paid" data-v="${p}">I’ve paid</button><span class="sub" style="text-align:center;margin-top:10px;font-size:14px">Check the name shown in your UPI app before paying.</span></div></div>`}
async function markPaid(p){const n=net(p);if(n>=0)return;const {error}=await sb.from('settlements').insert({flat_id:flat.id,from_user:me.id,to_user:p,amount:-n,status:'pending'});if(error)throw error;pop=qr=null;await refresh();err('Sent. Waiting for them to confirm.')}
document.addEventListener('visibilitychange',()=>{if(document.visibilityState!=='visible'||!payWait)return;const p=payWait;payWait=null;
 setTimeout(async()=>{const n=net(p);if(n>=0)return;if(!confirm(`Did your payment of ${rs(-n)} to ${nm(p)} go through?`))return;try{await markPaid(p)}catch(x){err(x.message)}},400)});
async function refresh(){await loadFlat();render()}
document.addEventListener('input',e=>{if(!sheet)return;const i=e.target.id;
 if(e.target.dataset.u){sheet.vals[e.target.dataset.u]=parseFloat(e.target.value)||0;const el=document.getElementById('each');if(el)el.textContent=eachText();return}
 if(i==='x-amt'){sheet.amt=parseFloat(e.target.value)||0;const el=document.getElementById('each');if(el)el.textContent=eachText()}
 if(i==='x-desc')sheet.desc=e.target.value});
document.addEventListener('change',e=>{if(e.target.id==='x-paid'&&sheet)sheet.paid=e.target.value});
document.addEventListener('click',async e=>{
 if(e.target.classList.contains('sheet-bg')){sheet=pop=qr=null;return render()}
 const t=e.target.closest('[data-a]');if(!t)return;const a=t.dataset.a,v=t.dataset.v,val=id=>(document.getElementById(id)||{}).value||'';
 try{switch(a){
 case 'tab':tab=v;view=null;return render();
 case 'back':view=null;return render();
 case 'close':sheet=pop=qr=null;return render();
 case 'sum':pop=v;return render();
 case 'person':view=v;return render();
 case 'mode':mode=v;return render();
 case 'add':sheet={amt:0,desc:'',paid:me.id,split:[...members],mode:'equal',vals:{}};return render();
 case 'smode':sheet.mode=v;return render();
 case 'pick':sheet.split=sheet.split.includes(v)?sheet.split.filter(x=>x!==v):[...sheet.split,v];return render();
 case 'auth':{const em=val('a-em').trim(),pw=val('a-pw'),n=val('a-nm').trim();
  if(!em||pw.length<6)return err('Enter your email and a password of 6+ characters.');
  if(mode==='signup'){if(!n)return err('Enter your name.');const {data,error}=await sb.auth.signUp({email:em,password:pw,options:{data:{name:n}}});if(error)throw error;if(!data.session)return err('Check your email to confirm, then log in.')}
  else{const {error}=await sb.auth.signInWithPassword({email:em,password:pw});if(error)throw error}return}
 case 'logout':if(ch){sb.removeChannel(ch);ch=null}await sb.auth.signOut();return;
 case 'create':{const n=val('s-fl').trim();if(!n)return err('Enter a flat name.');const {error}=await sb.rpc('create_flat',{flat_name:n});if(error)throw error;await loadAll();return render()}
 case 'join':{const c=val('s-cd').trim();if(c.length<6)return err('Enter the 6-letter code.');const {error}=await sb.rpc('join_flat',{code:c});if(error)throw error;await loadAll();return render()}
 case 'share':{const txt=`Join our flat "${flat.name}" on Splitly. Invite code: ${flat.invite_code}`;try{if(navigator.share){await navigator.share({text:txt});return}await navigator.clipboard.writeText(txt);return err('Invite copied.')}catch(x){return}}
 case 'save':{const n=sheet.split.length,amt=Math.round(sheet.amt*100)/100;if(!(amt>0)||!sheet.desc.trim()||n<1)return err('Add an amount, a name and at least one person.');
  const sm=sheet.split.reduce((q,u)=>q+(+sheet.vals[u]||0),0);
  if(sheet.mode==='exact'&&Math.abs(sm-amt)>0.01)return err(`Amounts add up to ${rs(sm)}, but the expense is ${rs(amt)}.`);
  if(sheet.mode==='percent'&&Math.abs(sm-100)>0.01)return err(`Percentages add up to ${+sm.toFixed(2)}%, not 100%.`);
  const mk=id=>{const us=sheet.split;let sh;
   if(sheet.mode==='exact')sh=us.map(u=>Math.round((+sheet.vals[u]||0)*100)/100);
   else if(sheet.mode==='percent')sh=us.map(u=>Math.round(amt*(+sheet.vals[u]||0))/100);
   else{const base=Math.floor(amt/n*100)/100;sh=us.map(()=>base)}
   const diff=Math.round((amt-sh.reduce((q,w)=>q+w,0))*100)/100;sh[n-1]=Math.round((sh[n-1]+diff)*100)/100;
   return us.map((u,i)=>({expense_id:id,user_id:u,share:sh[i]}))};
  if(sheet.id){const u=await sb.from('expenses').update({description:sheet.desc.trim(),amount:amt,paid_by:sheet.paid}).eq('id',sheet.id);if(u.error)throw u.error;
   const d=await sb.from('expense_splits').delete().eq('expense_id',sheet.id);if(d.error)throw d.error;
   const i=await sb.from('expense_splits').insert(mk(sheet.id));if(i.error)throw i.error;sheet=null;await refresh();return err('Expense updated')}
  const {data:ex,error}=await sb.from('expenses').insert({flat_id:flat.id,description:sheet.desc.trim(),amount:amt,paid_by:sheet.paid}).select().single();if(error)throw error;
  const r=await sb.from('expense_splits').insert(mk(ex.id));if(r.error){await sb.from('expenses').delete().eq('id',ex.id);throw r.error}
  sheet=null;await refresh();return err('Expense saved')}
 case 'ex':{const x=EX.find(q=>q.id===v);if(!x)return;if(x.created_by!==me.id)return err('Only the person who added an expense can edit it.');const sp=x.expense_splits,eq=sp.every(q=>Math.abs(+q.share-+sp[0].share)<=0.011);sheet={id:x.id,amt:+x.amount,desc:x.description,paid:x.paid_by,split:sp.map(q=>q.user_id),mode:eq?'equal':'exact',vals:Object.fromEntries(sp.map(q=>[q.user_id,+q.share]))};return render()}
 case 'del':{if(!sheet.del){sheet.del=true;return render()}const {error}=await sb.from('expenses').delete().eq('id',sheet.id);if(error)throw error;sheet=null;await refresh();return err('Expense deleted')}
 case 'paid':{const n=net(v);if(!confirm(`Did you pay ${nm(v)} ${rs(-n)}? They will be asked to confirm.`))return;await markPaid(v);return}
 case 'pay':{const n=net(v);if(n>=0)return;if(!U[v])return err(`${P[v]||'They'} hasn’t added a UPI ID yet. Ask them to add it in the Groups tab.`);
  if(!/Android|iPhone|iPad/i.test(navigator.userAgent)){if(typeof qrcode==='undefined'){try{await navigator.clipboard.writeText(U[v])}catch(x){}return err(`UPI ID ${U[v]} copied. Open your UPI app on your phone to pay.`)}qr=v;pop=null;return render()}
  payWait=v;pop=null;location.href=upiLink(v,-n);return}
 case 'upi':{const u=val('u-upi').trim();if(u&&!/^[\w.\-]{2,}@[a-zA-Z]{2,}$/.test(u))return err('Enter a valid UPI ID, like name@bank.');
  const {error}=await sb.from('profiles').update({upi_id:u||null}).eq('id',me.id);if(error)throw error;await refresh();return err('UPI ID saved')}
 case 'recv':{const n=net(v);if(!confirm(`Did ${nm(v)} pay you ${rs(n)}? Only confirm if the money is in your account.`))return;
  const {error}=await sb.from('settlements').insert({flat_id:flat.id,from_user:v,to_user:me.id,amount:n,status:'confirmed',confirmed_at:new Date().toISOString()});if(error)throw error;pop=null;await refresh();return err('Marked as received')}
 case 'conf':{const s=ST.find(q=>q.id===v);if(!confirm(`Confirm that you received ${rs(s.amount)} from ${nm(s.from_user)}?`))return;
  const {error}=await sb.from('settlements').update({status:'confirmed',confirmed_at:new Date().toISOString()}).eq('id',v);if(error)throw error;pop=null;await refresh();return err('Payment confirmed')}
 case 'remind':{const n=net(v),txt=`Hi ${P[v]||''}, a gentle reminder from Splitly: you owe me ${rs(n)} in ${flat.name}. Thanks!`;try{if(navigator.share){await navigator.share({text:txt});return}await navigator.clipboard.writeText(txt);return err('Reminder copied. Paste it in WhatsApp.')}catch(x){return}}
 }}catch(x){err(x.message||'Something went wrong')}});

sb.auth.onAuthStateChange((ev,s)=>{setTimeout(async()=>{const u=s?s.user:null;if(ready&&(u?u.id:null)===(me?me.id:null))return;
 me=u;flat=null;members=[];EX=[];ST=[];view=null;tab='home';if(u)try{await loadAll()}catch(x){}ready=true;render()},0)});
if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}));
