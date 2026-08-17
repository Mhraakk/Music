"use client";
import{useMemo,useState}from"react";
import{create}from"zustand";
import{persist}from"zustand/middleware";
type V={d:number;w:number;o:number;e:number;m:number;s:number};
type T={id:string;title:string;artist:string;year:number;obscurity:number;why:string;v:V};
const TRACKS:T[]=[
{id:"1",title:"Midnight Black",artist:"Bohren & der Club of Gore",year:2002,obscurity:0.88,why:"Weight without aggression",v:{d:0.92,w:0.38,o:0.28,e:0.12,m:0.12,s:0.75}},
{id:"2",title:"Sliced",artist:"Roman Flügel",year:2011,obscurity:0.78,why:"Warm restraint",v:{d:0.32,w:0.86,o:0.42,e:0.52,m:0.22,s:0.25}},
{id:"3",title:"Archangel",artist:"Burial",year:2007,obscurity:0.55,why:"Vinyl rain as memory",v:{d:0.88,w:0.28,o:0.18,e:0.42,m:0.38,s:0.85}},
{id:"4",title:"Drip",artist:"Grandbrothers",year:2015,obscurity:0.8,why:"Prepared piano as weather",v:{d:0.28,w:0.52,o:0.95,e:0.32,m:0.32,s:0.45}},
{id:"5",title:"Washer",artist:"Slint",year:1991,obscurity:0.7,why:"Fragile mass",v:{d:0.82,w:0.22,o:0.72,e:0.22,m:0.18,s:0.8}},
{id:"6",title:"Resonance",artist:"Hraach",year:2019,obscurity:0.82,why:"Intimate room temperature",v:{d:0.28,w:0.9,o:0.52,e:0.48,m:0.18,s:0.3}},
{id:"7",title:"Mystery of Love",artist:"Mr. Fingers",year:1985,obscurity:0.7,why:"Origin warmth",v:{d:0.18,w:0.92,o:0.45,e:0.55,m:0.42,s:0.15}},
{id:"8",title:"Prowler",artist:"Mount Fuji Doomjazz Corp.",year:2009,obscurity:0.91,why:"Tension that never resolves",v:{d:0.94,w:0.32,o:0.22,e:0.18,m:0.08,s:0.7}},
];
type FE={kind:string;reason?:string};
const key=(a:string,t:string)=>a.toLowerCase()+"::"+t.toLowerCase();
const useFB=create(persist((set:any,get:any)=>({
byTrack:{} as Record<string,FE>,memory:[] as{at:number;label:string}[],
setFB:(k:string,e:FE|null)=>set((s:any)=>{const n={...s.byTrack};if(!e)delete n[k];else n[k]=e;return{byTrack:n};}),
pushMem:(l:string)=>set((s:any)=>({memory:[{at:Date.now(),label:l},...s.memory].slice(0,30)})),
liked:()=>Object.values(get().byTrack as Record<string,FE>).filter(v=>v.kind==="more"||v.kind==="like").length,
hated:()=>Object.values(get().byTrack as Record<string,FE>).filter(v=>v.kind==="dislike").length,
}),{name:"etg1"})) as any;
function ed(a:V,b:V){const w:any={d:1.4,w:1.5,o:1,e:1.6,m:0.8,s:1.5};let s=0;for(const k of Object.keys(w))s+=((a as any)[k]-(b as any)[k])**2*w[k];return Math.sqrt(s);}
const RS=[{id:"mainstream",label:"Too mainstream"},{id:"fast",label:"Too fast"},{id:"cold",label:"Too cold"},{id:"never",label:"Never again"},{id:"wrong-feel",label:"Wrong feeling"}];
type C={warm:number;sad:number;organic:number;energy:number;dark:number};
function graph(fb:Record<string,FE>){
const liked=TRACKS.filter(t=>["like","more"].includes(fb[key(t.artist,t.title)]?.kind||""));
const hated=TRACKS.filter(t=>fb[key(t.artist,t.title)]?.kind==="dislike");
const base=liked.length?liked:TRACKS.filter(t=>t.obscurity>0.72);const n=base.length||1;
const at:V={d:0,w:0,o:0,e:0,m:0,s:0};for(const t of base){at.d+=t.v.d;at.w+=t.v.w;at.o+=t.v.o;at.e+=t.v.e;at.m+=t.v.m;at.s+=t.v.s;}
for(const k of Object.keys(at) as(keyof V)[])at[k]/=n;
const avoids:string[]=[];
for(const t of hated){const r=fb[key(t.artist,t.title)]?.reason;if(r==="mainstream"){at.m=Math.max(0,at.m-0.18);avoids.push("chart gravity");}if(r==="cold"){at.w=Math.min(1,at.w+0.14);avoids.push("sterile cold");}if(r==="fast"){at.e=Math.max(0,at.e-0.14);avoids.push("sudden speed");}if(r==="never")avoids.push("hard veto");}
if(at.m<0.28&&!avoids.includes("chart gravity"))avoids.push("chart gravity");
const voice=at.d>0.65&&at.s>0.55?"Nocturnal archivist — weight over sparkle":at.w>0.7?"Velvet room curator — warmth under the surface":at.o>0.7?"Tactile collector — grain and breath":"Quiet listener — waits before recommending";
return{attract:at,voice,avoids:[...new Set(avoids)],liked:liked.length,hated:hated.length};
}
function rec(c:C,fb:Record<string,FE>,depth:number){
const g=graph(fb);const tg:V={d:c.dark*0.5+g.attract.d*0.5,w:c.warm*0.5+g.attract.w*0.5,o:c.organic*0.5+g.attract.o*0.5,e:c.energy*0.5+g.attract.e*0.5,m:Math.min(0.22,g.attract.m),s:c.sad*0.5+g.attract.s*0.5};
const scored=TRACKS.map(t=>{const f=fb[key(t.artist,t.title)];if(f?.kind==="dislike")return{t,s:-8,reason:"held by rejection memory"};
let s=4-ed(t.v,tg)*2.4+t.obscurity*(1+depth)-t.v.m*1.8;if(f?.kind==="more"||f?.kind==="like")s+=3;if(f?.kind==="heard")s-=1.2;
return{t,s,reason:t.why+(t.v.m<0.25?" · low chart gravity":"")};}).sort((a,b)=>b.s-a.s);
const good=scored.filter(x=>x.s>-3);
if(good.length)return{items:good.slice(0,5),message:null as string|null,graph:g};
return{items:TRACKS.map(t=>({t,s:-ed(t.v,g.attract),reason:"Fallback — nearest honest room"})).sort((a,b)=>b.s-a.s).slice(0,5),message:"No exact match. Graph opened the nearest honest room.",graph:g};
}
function flow(c:C,fb:Record<string,FE>,depth:number){
const g=graph(fb);const goal:V={d:c.dark*0.5+g.attract.d*0.5,w:c.warm*0.5+g.attract.w*0.5,o:c.organic*0.5+g.attract.o*0.5,e:c.energy*0.5+g.attract.e*0.5,m:Math.min(0.22,g.attract.m),s:c.sad*0.5+g.attract.s*0.5};
const eAt=(i:number)=>{const t=i/5;if(t<0.35)return goal.e*(0.65+t*0.9);if(t<0.65)return Math.min(1,goal.e*1.1);return goal.e*(1.1-(t-0.65)*0.85);};
const used=new Set<string>();const path:{t:T;reason:string;chapter:string;e:number}[]=[];let prev:T|null=null;
for(let i=0;i<6;i++){const eT=Math.min(1,Math.max(0,eAt(i)));const slot={...goal,e:eT};
const scored=TRACKS.map(t=>{if(used.has(t.id))return{t,s:-1e9};const f=fb[key(t.artist,t.title)];if(f?.kind==="dislike")return{t,s:-1e8};
let s=5-ed(t.v,slot)*2.8+t.obscurity*(0.9+depth)-t.v.m*1.8;if(f?.kind==="more"||f?.kind==="like")s+=2;if(prev){const j=ed(t.v,prev.v);s+=Math.max(0,2.5-j*3);if(j>1.1)s-=3;}s-=Math.abs(t.v.e-eT)*2;return{t,s};}).sort((a,b)=>b.s-a.s);
const pick=scored.find(x=>x.s>-1e7)||{t:TRACKS[i%TRACKS.length],s:0};used.add(pick.t.id);
path.push({t:pick.t,reason:pick.t.why+(prev?" · continues from "+prev.artist.split(" ")[0]:""),chapter:i===0?"Open":i===5?"Land":i<3?"Rise":"Settle",e:eT});prev=pick.t;}
return{path,graph:g};
}
function links(a:string,t:string){const q=encodeURIComponent(a+" "+t);return{spotify:"https://open.spotify.com/search/"+q,apple:"https://music.apple.com/search?term="+q,youtube:"https://music.youtube.com/search?q="+q,soundcloud:"https://soundcloud.com/search?q="+q};}
function S({label,value,onChange}:{label:string;value:number;onChange:(n:number)=>void}){
return(<label className="block space-y-1"><div className="flex justify-between text-[10px] text-white/40"><span>{label}</span><span className="text-[#e8a06a]/80">{Math.round(value*100)}</span></div>
<input type="range" min={0} max={100} value={Math.round(value*100)} onChange={e=>onChange(Number(e.target.value)/100)} className="w-full h-1.5 appearance-none rounded-full bg-white/10 accent-[#e8a06a]"/></label>);}
export default function App(){
const by=useFB((s:any)=>s.byTrack);const mem=useFB((s:any)=>s.memory)as{at:number;label:string}[];
const liked=useFB((s:any)=>s.liked());const hated=useFB((s:any)=>s.hated());
const setFB=useFB((s:any)=>s.setFB);const pushMem=useFB((s:any)=>s.pushMem);
const[tab,setTab]=useState<"graph"|"flow"|"self">("graph");
const[c,setC]=useState<C>({warm:0.55,sad:0.45,organic:0.5,energy:0.35,dark:0.55});
const[depth,setDepth]=useState(0.7);const[wk,setWk]=useState<string|null>(null);
const res=useMemo(()=>rec(c,by,depth),[c,by,depth]);
const fl=useMemo(()=>flow(c,by,depth),[c,by,depth]);
const g=useMemo(()=>graph(by),[by]);
const maxE=Math.max(...fl.path.map(p=>p.e),0.01);
const act=(a:string,t:string,kind:string,reason?:string)=>{const k=key(a,t);const cur=by[k];if(cur?.kind===kind&&!reason)setFB(k,null);else{setFB(k,{kind,reason});pushMem(kind+(reason?":"+reason:"")+" · "+t);}if(kind!=="dislike")setWk(null);};
const Row=({t,reason,chapter}:{t:T;reason:string;chapter?:string})=>{
const k=key(t.artist,t.title);const cur=by[k];const L=links(t.artist,t.title);
return(<div className="rounded-2xl border border-white/10 bg-white/[0.035] p-3 space-y-2">
{chapter&&<p className="text-[10px] uppercase tracking-[0.16em] text-[#e8a06a]/85">{chapter}</p>}
<p className="text-sm font-medium text-[#f3eee6]">{t.title}</p>
<p className="text-xs text-white/45">{t.artist} · {t.year}</p>
<p className="text-[11px] text-[#d4a574]/90">{reason}</p>
<div className="flex flex-wrap gap-1.5">
<button type="button" onClick={()=>act(t.artist,t.title,"more")} className={`text-[10px] px-2 py-1 rounded-full border ${cur?.kind==="more"?"border-emerald-500/50 text-emerald-300 bg-emerald-500/15":"border-white/10 text-white/40"}`}>more like this</button>
<button type="button" onClick={()=>act(t.artist,t.title,"less")} className={`text-[10px] px-2 py-1 rounded-full border ${cur?.kind==="less"?"border-orange-500/40 text-orange-200":"border-white/10 text-white/40"}`}>less like this</button>
<button type="button" onClick={()=>setWk(wk===k?null:k)} className={`text-[10px] px-2 py-1 rounded-full border ${cur?.kind==="dislike"?"border-red-500/50 text-red-300 bg-red-500/15":"border-white/10 text-white/40"}`}>reject</button>
<button type="button" onClick={()=>act(t.artist,t.title,"heard")} className={`text-[10px] px-2 py-1 rounded-full border ${cur?.kind==="heard"?"border-amber-500/50 text-amber-200":"border-white/10 text-white/40"}`}>heard</button>
</div>
{wk===k&&<div className="flex flex-wrap gap-1.5"><p className="w-full text-[10px] text-white/35">Why reject? Graph remembers.</p>{RS.map(r=><button key={r.id} type="button" onClick={()=>act(t.artist,t.title,"dislike",r.id)} className="text-[10px] px-2.5 py-1 rounded-full border border-white/10 text-white/45">{r.label}</button>)}</div>}
{cur?.kind==="dislike"&&cur.reason&&wk!==k&&<p className="text-[10px] text-red-300/65">Rejection memory: {RS.find(r=>r.id===cur.reason)?.label}</p>}
<div className="flex flex-wrap gap-1.5">{(["spotify","apple","youtube","soundcloud"] as const).map(x=><a key={x} href={L[x]} target="_blank" rel="noopener noreferrer" className="text-[10px] px-2 py-1 rounded-full border border-white/10 text-white/35 capitalize">{x}</a>)}</div>
</div>);};
return(<div className="relative min-h-dvh pb-24">
<div className="pointer-events-none fixed inset-0"><div className="absolute inset-0 bg-[#060504]"/><div className="absolute inset-0 bg-gradient-to-b from-[#1a0e08] via-[#0a0705] to-[#040302]"/></div>
<div className="relative z-10 mx-auto max-w-lg px-4 pt-8">
<div className="flex items-center justify-between"><div className="flex items-center gap-2"><div className="h-8 w-8 rounded-lg bg-gradient-to-br from-[#c4783a] to-[#3d1a0a] flex items-center justify-center text-xs font-bold">R</div><span className="text-[11px] font-semibold tracking-[0.18em] text-[#e8a06a]/90 uppercase">Resonant</span></div>
<div className="flex gap-3 text-[11px]"><span className="text-emerald-400/80">+{liked}</span><span className="text-red-400/80">−{hated}</span></div></div>
{tab==="graph"&&<><h1 className="text-2xl font-semibold mt-4 text-[#f3eee6]">Emotional taste graph</h1>
<p className="mt-1.5 text-white/45 text-sm">Emotional correctness, rejection memory, continuous flow.</p>
<section className="mt-5 rounded-2xl border border-white/10 bg-black/35 p-4 space-y-3"><h2 className="text-[10px] uppercase tracking-[0.18em] text-[#e8a06a]/85">Mood compass</h2>
<S label="Warm" value={c.warm} onChange={n=>setC({...c,warm:n})}/><S label="Sad" value={c.sad} onChange={n=>setC({...c,sad:n})}/>
<S label="Organic" value={c.organic} onChange={n=>setC({...c,organic:n})}/><S label="Energy" value={c.energy} onChange={n=>setC({...c,energy:n})}/>
<S label="Dark" value={c.dark} onChange={n=>setC({...c,dark:n})}/><S label="Depth" value={depth} onChange={setDepth}/></section>
<div className="mt-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-[11px] text-white/50"><span className="text-[#e8a06a]/90">Graph · </span>{res.graph.voice}{res.graph.avoids.length>0&&<span className="text-white/30"> · avoids {res.graph.avoids.slice(0,3).join(", ")}</span>}</div>
{res.message&&<div className="mt-4 rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-100/90">{res.message}</div>}
<h2 className="mt-6 text-[10px] uppercase tracking-[0.15em] text-white/35">Passes emotional test</h2>
<div className="mt-2 space-y-2">{res.items.map(({t,reason})=><Row key={t.id} t={t} reason={reason}/>)}</div></>}
{tab==="flow"&&<><h1 className="text-2xl font-semibold mt-4 text-[#f3eee6]">Continuous flow</h1>
<p className="text-sm text-white/40 mt-1">Open → rise → settle → land.</p>
<p className="text-[11px] text-[#e8a06a]/80 mt-2">{fl.graph.voice}</p>
<section className="mt-4 rounded-2xl border border-white/10 bg-black/35 p-4 space-y-3">
<S label="Warm" value={c.warm} onChange={n=>setC({...c,warm:n})}/><S label="Sad" value={c.sad} onChange={n=>setC({...c,sad:n})}/>
<S label="Energy peak" value={c.energy} onChange={n=>setC({...c,energy:n})}/><S label="Dark" value={c.dark} onChange={n=>setC({...c,dark:n})}/></section>
<div className="mt-4 flex items-end gap-1 h-14">{fl.path.map((p,i)=><div key={i} className="flex-1 flex flex-col justify-end h-full"><div className="w-full rounded-t bg-gradient-to-t from-[#8b5a2b] to-[#e8a06a]" style={{height:`${(p.e/maxE)*100}%`,minHeight:4}}/></div>)}</div>
<div className="mt-5 space-y-2">{fl.path.map(({t,reason,chapter})=><Row key={t.id+chapter} t={t} reason={reason} chapter={chapter}/>)}</div></>}
{tab==="self"&&<><h1 className="text-2xl font-semibold mt-4 text-[#f3eee6]">Knows you</h1>
<p className="text-sm text-white/40 mt-1">Every signal rewires the graph.</p>
<div className="mt-5 rounded-2xl border border-white/10 bg-black/40 p-5"><p className="text-[10px] uppercase tracking-[0.18em] text-[#e8a06a]/85 mb-2">Taste graph voice</p>
<p className="text-lg text-[#f3eee6]">{g.voice}</p>
{g.avoids.length>0&&<p className="mt-3 text-[12px] text-white/40">Avoids: {g.avoids.join(" · ")}</p>}
<p className="mt-2 text-[11px] text-white/30">+{g.liked} · −{g.hated}</p></div>
<div className="mt-6 space-y-3">{([["Dark",g.attract.d],["Warm",g.attract.w],["Organic",g.attract.o],["Energy",g.attract.e],["Sad",g.attract.s],["Mainstream",g.attract.m]] as[string,number][]).map(([l,v])=>(
<div key={l} className="space-y-1"><div className="flex justify-between text-[10px] text-white/40"><span>{l}</span><span>{Math.round(v*100)}</span></div>
<div className="h-1.5 rounded-full bg-white/5 overflow-hidden"><div className="h-full rounded-full bg-gradient-to-r from-[#6b3a18] to-[#e8a06a]" style={{width:`${Math.round(v*100)}%`}}/></div></div>))}</div>
<h2 className="mt-8 text-[10px] uppercase tracking-[0.15em] text-white/35">Signal timeline</h2>
{mem.length===0?<p className="mt-3 text-sm text-white/35">Teach the graph with more / less / reject.</p>:
<ul className="mt-3 space-y-2">{mem.slice(0,12).map((m,i)=><li key={i} className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 flex justify-between gap-3"><span className="text-sm truncate">{m.label}</span><span className="text-[10px] text-white/30">{new Date(m.at).toLocaleTimeString()}</span></li>)}</ul>}</>}
</div>
<nav className="fixed bottom-0 inset-x-0 z-50 border-t border-white/10 bg-black/85 backdrop-blur-xl">
<div className="mx-auto max-w-lg flex justify-around py-3">{(["graph","flow","self"] as const).map(t=><button key={t} type="button" onClick={()=>setTab(t)} className={`text-[11px] font-medium capitalize ${tab===t?"text-[#e8a06a]":"text-white/35"}`}>{t}</button>)}</div>
</nav></div>);
}
