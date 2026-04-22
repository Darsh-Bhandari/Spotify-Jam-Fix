
const SONGS = [
  {title:"Blinding Lights",artist:"The Weeknd",duration:"3:20",color:"#E8115B"},
  {title:"As It Was",artist:"Harry Styles",duration:"2:37",color:"#509BF5"},
  {title:"Anti-Hero",artist:"Taylor Swift",duration:"3:20",color:"#8D67AB"},
  {title:"Flowers",artist:"Miley Cyrus",duration:"3:21",color:"#148A08"},
  {title:"Kill Bill",artist:"SZA",duration:"2:33",color:"#E91429"},
  {title:"Calm Down",artist:"Rema & Selena Gomez",duration:"3:59",color:"#FF6437"},
  {title:"Unholy",artist:"Sam Smith",duration:"2:36",color:"#4B917D"},
  {title:"Boy's a liar Pt.2",artist:"PinkPantheress",duration:"2:08",color:"#E8115B"},
  {title:"Creepin'",artist:"Metro Boomin",duration:"3:20",color:"#509BF5"},
  {title:"Escapism",artist:"RAYE",duration:"3:36",color:"#8D67AB"},
  {title:"Levitating",artist:"Dua Lipa",duration:"3:23",color:"#1DB954"},
  {title:"Stay",artist:"Kid LAROI & Bieber",duration:"2:21",color:"#E8115B"},
  {title:"Heat Waves",artist:"Glass Animals",duration:"3:59",color:"#148A08"},
  {title:"good 4 u",artist:"Olivia Rodrigo",duration:"2:58",color:"#E91429"},
  {title:"Industry Baby",artist:"Lil Nas X",duration:"3:32",color:"#FF6437"},
];
const USERS = ["You","Alex","Jordan","Sam","Riley","Casey"];
const GENRES = [
  {name:"Pop",color:"#E8115B"},{name:"Hip-Hop",color:"#509BF5"},
  {name:"R&B",color:"#8D67AB"},{name:"Electronic",color:"#148A08"},
  {name:"Rock",color:"#E91429"},{name:"Latin",color:"#FF6437"},
  {name:"K-Pop",color:"#4B917D"},{name:"Indie",color:"#1DB954"},
];
const PLAYLISTS = [
  {name:"Liked Songs 💚",count:247},{name:"Chill Vibes",count:34},
  {name:"Party Anthems",count:58},{name:"Work Focus",count:22},
  {name:"Throwbacks",count:41},{name:"Gym Mix",count:19},
];

let state = JSON.parse(localStorage.getItem('spotifyJamState') || 'null') || {
  currentSong: null,
  isPlaying: false,
  elapsed: 0,
  durationSec: 0,
  progress: 0,
  jamActive: false,
  jamCode: "",
  jamMembers: ["You"],
  queue: [],
  playingIndex: -1,
  voteSongs: [],
  voteCounts: {},
  voteActive: false,
  voteTimer: 30,
  turnUsers: ["You","Alex","Jordan","Sam"],
  turnIndex: 0,
  turnQueue: [],
  skipVotes: 0,
  skipThreshold: 3,
  skipVotedMe: false,
  skipListeners: [],
};
let tickInterval = null;
let voteJob = null;

function persist(){ localStorage.setItem('spotifyJamState', JSON.stringify(state)); }
function fmtTime(s){ return `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`; }
function rand(arr){ return arr[Math.floor(Math.random()*arr.length)]; }
function shuffle(arr){ return [...arr].sort(()=>Math.random()-0.5); }
function showToast(msg){ const t=document.getElementById('toast'); if(!t) return; t.textContent=msg; t.classList.add('show'); setTimeout(()=>t.classList.remove('show'),2500); }

function renderSongList(container, songs, opts={}){
  if(!container) return;
  container.innerHTML = songs.map((s,i)=>`
    <div class="song-row ${state.currentSong && state.currentSong.title===s.title?'playing':''}" onclick="${opts.queueMode?`addToQueue(${SONGS.findIndex(x=>x.title===s.title)})`:`playSong(${SONGS.findIndex(x=>x.title===s.title)})`}">
      <div class="song-num">${i+1}</div>
      <div class="song-play-icon">▶</div>
      <div class="song-icon">♪</div>
      <div class="song-info-col">
        <div class="song-title">${s.title}</div>
        <div class="song-artist">${s.artist}</div>
      </div>
      <div class="song-duration">${s.duration || ''}</div>
      ${opts.queueMode?`<button class="btn btn-dark btn-sm" onclick="event.stopPropagation();addToQueue(${SONGS.findIndex(x=>x.title===s.title)})">＋</button>`:''}
    </div>`).join('');
}

function playSong(idx){
  state.currentSong = SONGS[idx];
  state.playingIndex = idx;
  const [m,s]=state.currentSong.duration.split(':');
  state.durationSec = parseInt(m)*60+parseInt(s);
  state.elapsed=0; state.progress=0; state.isPlaying=true;
  startPlaying(); persist(); updatePlayerUI();
}
function addToQueue(idx){ state.queue.push(SONGS[idx]); persist(); showToast(`Added "${SONGS[idx].title}" to queue`); }
function startPlaying(){
  state.isPlaying=true; clearInterval(tickInterval);
  tickInterval=setInterval(()=>{
    if(!state.isPlaying) return;
    state.elapsed++;
    state.progress=Math.min(state.elapsed/state.durationSec,1);
    if(state.elapsed>=state.durationSec) nextTrack();
    persist(); updatePlayerUI();
  },1000);
  updatePlayerUI();
}
function togglePlay(){
  if(!state.currentSong){ playSong(0); return; }
  state.isPlaying=!state.isPlaying;
  if(state.isPlaying) startPlaying(); else clearInterval(tickInterval);
  persist(); updatePlayerUI();
}
function nextTrack(){
  if(state.queue.length){
    const s=state.queue.shift();
    const idx=SONGS.findIndex(x=>x.title===s.title && x.artist===s.artist);
    playSong(idx>=0?idx:0);
  } else {
    const next=(state.playingIndex+1)%SONGS.length; playSong(next);
  }
}
function seekTo(e){
  if(!state.durationSec) return;
  const rect=e.currentTarget.getBoundingClientRect();
  const pct=(e.clientX-rect.left)/rect.width;
  state.elapsed=Math.floor(pct*state.durationSec); state.progress=pct; persist(); updatePlayerUI();
}
function updatePlayerUI(){
  const s=state.currentSong;
  const byId = id => document.getElementById(id);
  if(byId('now-title')) byId('now-title').textContent=s?s.title:'No song playing';
  if(byId('now-artist')) byId('now-artist').textContent=s?s.artist:'—';
  if(byId('elapsed')) byId('elapsed').textContent=fmtTime(state.elapsed || 0);
  if(byId('duration')) byId('duration').textContent=fmtTime(state.durationSec || 0);
  if(byId('prog-fill')) byId('prog-fill').style.width=((state.progress || 0)*100)+'%';
  if(byId('play-btn')) byId('play-btn').textContent=state.isPlaying?'⏸':'▶';
  const badge=byId('jam-badge');
  if(badge){
    if(state.jamActive){
      badge.classList.add('visible');
      byId('jam-badge-text').textContent=`JAM ${state.jamCode} · ${state.jamMembers.length} listeners`;
    } else badge.classList.remove('visible');
  }
}

function initHome(){
  const greeting = document.getElementById('greeting');
  if(greeting){
    const h=new Date().getHours();
    greeting.textContent=h<12?'Good morning':h<18?'Good afternoon':'Good evening';
  }
  const fc=document.getElementById('featured-cards');
  if(fc){
    fc.innerHTML='';
    shuffle(SONGS).slice(0,6).forEach(s=>{
      const idx = SONGS.findIndex(x=>x.title===s.title);
      fc.innerHTML += `<div class="song-card" onclick="playSong(${idx})"><div class="song-card-art" style="background:${s.color}">♪</div><div class="song-card-title">${s.title}</div><div class="song-card-artist">${s.artist}</div></div>`;
    });
  }
  renderSongList(document.getElementById('home-song-list'), SONGS);
}
function initSearch(){
  const g=document.getElementById('genre-grid');
  if(g) g.innerHTML=GENRES.map(gn=>`<div class="genre-card" style="background:${gn.color}">${gn.name}</div>`).join('');
  const input=document.getElementById('search-input');
  if(input){
    input.addEventListener('input', function(){
      const q=this.value.toLowerCase(); const target=document.getElementById('search-results');
      if(!q){ target.innerHTML=''; return; }
      const res=SONGS.filter(s=>s.title.toLowerCase().includes(q)||s.artist.toLowerCase().includes(q));
      if(res.length){ const d=document.createElement('div'); d.className='song-list'; renderSongList(d,res); target.innerHTML=''; target.appendChild(d); }
      else target.innerHTML='<div class="empty-state">No results found</div>';
    });
  }
}
function initLibrary(){
  const lib=document.getElementById('library-list');
  if(lib) lib.innerHTML=PLAYLISTS.map(p=>`<div class="library-row"><div class="library-icon">📋</div><div class="library-info"><div class="lib-title">${p.name}</div><div class="lib-sub">Playlist · ${p.count} songs</div></div></div>`).join('');
}

function renderJamPage(){
  const left=document.getElementById('jam-left'); const members=document.getElementById('jam-members');
  if(!left || !members) return;
  if(!state.jamActive){
    left.innerHTML=`<div class="info-box"><div class="section-title" style="margin-bottom:8px">Start a Jam</div><p style="font-size:13px;color:var(--gray);margin-bottom:16px;line-height:1.6">Invite friends to listen along with you in real time. Share the code and jam together!</p><button class="btn btn-green" onclick="startJam()">✦ Start Jam</button></div><div style="text-align:center;color:var(--muted);font-size:12px;margin:16px 0">— or join a session —</div><div class="join-row"><input class="join-input" id="join-code" placeholder="Enter session code…"><button class="btn btn-dark btn-sm" onclick="joinJam()">Join</button></div>`;
    members.innerHTML=`<div class="member-row"><div class="member-avatar">Y</div><div class="member-name">You</div><div class="member-role host-role">Host 👑</div></div>`;
  } else {
    left.innerHTML=`<div class="jam-code-box"><div class="info-box-title">Session Code</div><div class="jam-code">${state.jamCode}</div><div style="font-size:12px;color:var(--gray);margin-bottom:14px">Share with friends to invite them</div><div style="display:flex;gap:10px"><button class="btn btn-dark btn-sm" onclick="copyLink()">🔗 Copy Link</button><button class="btn btn-red btn-sm" onclick="endJam()">■ End Jam</button></div></div><div class="section-title" style="margin-bottom:10px">Up Next</div><div id="jam-queue">${state.queue.length ? state.queue.slice(0,5).map(s=>`<div class="queue-item"><div class="queue-item-info"><div class="queue-item-title">${s.title}</div><div class="queue-item-artist">${s.artist}</div></div></div>`).join('') : '<div class="empty-state" style="padding:16px">Queue is empty</div>'}</div><div class="section-title" style="margin:16px 0 10px">Add to Queue</div>`;
    const qList=document.createElement('div'); qList.className='song-list'; renderSongList(qList,SONGS.slice(0,8),{queueMode:true}); left.appendChild(qList);
    members.innerHTML=state.jamMembers.map(m=>`<div class="member-row"><div class="member-avatar" style="${m==='You'?'':'background:#333;color:#fff'}">${m[0].toUpperCase()}</div><div class="member-name">${m}</div><div class="member-role ${m==='You'?'host-role':''}">${m==='You'?'Host 👑':'Listening'}</div></div>`).join('');
  }
}
function startJam(){ state.jamActive=true; state.jamCode='JAM-'+Math.floor(1000+Math.random()*9000); state.jamMembers=['You',...shuffle(USERS.slice(1)).slice(0,3)]; if(!state.currentSong) playSong(0); else if(!state.isPlaying) startPlaying(); persist(); updatePlayerUI(); renderJamPage(); showToast('Jam session started!'); }
function joinJam(){ const input=document.getElementById('join-code'); const code=(input?.value||'').trim(); if(!code){showToast('Enter a session code');return;} state.jamActive=true; state.jamCode=code.toUpperCase(); state.jamMembers=['You',...shuffle(USERS.slice(1)).slice(0,2)]; persist(); updatePlayerUI(); renderJamPage(); showToast('Joined '+state.jamCode); }
function endJam(){ state.jamActive=false; state.jamMembers=['You']; persist(); updatePlayerUI(); renderJamPage(); showToast('Jam ended'); }
function copyLink(){ if(navigator.clipboard) navigator.clipboard.writeText('spotify.jam/'+state.jamCode); showToast('Link copied to clipboard!'); }

function renderQuickAdd(){
  const el=document.getElementById('quick-add-list'); if(!el) return;
  el.innerHTML=SONGS.slice(0,6).map((s,i)=>`<div class="song-row" onclick="quickSuggest(${i})"><div class="song-num">${i+1}</div><div class="song-play-icon">+</div><div class="song-icon">♪</div><div class="song-info-col"><div class="song-title">${s.title}</div><div class="song-artist">${s.artist}</div></div><button class="btn btn-dark btn-sm" onclick="event.stopPropagation();quickSuggest(${i})">Add</button></div>`).join('');
}
function suggestSong(){
  const t=document.getElementById('v-title')?.value.trim();
  const a=document.getElementById('v-artist')?.value.trim();
  if(!t){ showToast('Enter a song title'); return; }
  if(state.voteSongs.find(s=>s.title===t)){ showToast('Already suggested!'); return; }
  const song={title:t,artist:a||'Unknown',color:'#1DB954'}; state.voteSongs.push(song); state.voteCounts[t]=0;
  document.getElementById('v-title').value=''; document.getElementById('v-artist').value=''; persist(); renderVoteList();
}
function quickSuggest(idx){ const s=SONGS[idx]; if(state.voteSongs.find(x=>x.title===s.title)){showToast('Already suggested!');return;} state.voteSongs.push(s); state.voteCounts[s.title]=0; persist(); renderVoteList(); showToast(`"${s.title}" added to vote`); }
function castVote(title,delta){ state.voteCounts[title]=Math.max(0,(state.voteCounts[title]||0)+delta); persist(); renderVoteList(); }
function renderVoteList(){
  const el=document.getElementById('vote-list'); if(!el) return;
  if(!state.voteSongs.length){ el.innerHTML='<div class="empty-state">No songs suggested yet.<br>Add songs to start voting!</div>'; return; }
  const sorted=[...state.voteSongs].sort((a,b)=>(state.voteCounts[b.title]||0)-(state.voteCounts[a.title]||0));
  const medals=['🥇','🥈','🥉'];
  el.innerHTML=sorted.map((s,i)=>`<div class="vote-card"><div class="rank-badge">${medals[i]||'#'+(i+1)}</div><div class="vote-info"><div class="vote-title">${s.title}</div><div class="vote-artist">${s.artist}</div></div><div class="vote-controls"><button class="vote-btn" onclick="castVote('${s.title.replace(/'/g, "\\'")}',-1)">👎</button><div class="vote-count">${state.voteCounts[s.title]||0}</div><button class="vote-btn" onclick="castVote('${s.title.replace(/'/g, "\\'")}',1)">👍</button></div></div>`).join('');
}
function startVoting(){ if(!state.voteSongs.length){showToast('Add songs first!');return;} state.voteActive=true; state.voteTimer=30; clearInterval(voteJob); voteJob=setInterval(voteTick,1000); voteTick(); persist(); }
function voteTick(){ const el=document.getElementById('vote-timer'); if(!el) return; el.textContent=state.voteTimer+'s'; el.className='timer-badge'+(state.voteTimer<=10?' urgent':''); if(state.voteTimer<=0){endVoting();return;} state.voteTimer--; persist(); }
function endVoting(){ clearInterval(voteJob); state.voteActive=false; const el=document.getElementById('vote-timer'); if(el) el.textContent='Done'; if(!state.voteSongs.length) return; const winner=state.voteSongs.reduce((a,b)=>(state.voteCounts[a.title]||0)>=(state.voteCounts[b.title]||0)?a:b); const wb=document.getElementById('vote-winner'); document.getElementById('winner-title').textContent=winner.title; document.getElementById('winner-artist').textContent=winner.artist; if(wb) wb.classList.add('visible'); const idx=SONGS.findIndex(s=>s.title===winner.title); if(idx>=0) playSong(idx); persist(); showToast(`🏆 Playing: ${winner.title}`); }
function initVoting(){ renderVoteList(); renderQuickAdd(); if(state.voteActive){ clearInterval(voteJob); voteJob=setInterval(voteTick,1000); } }

function renderTurnSongs(){ const el=document.getElementById('turn-song-list'); if(!el) return; el.innerHTML=SONGS.slice(0,10).map((s,i)=>`<div class="song-row" onclick="turnPick(${i})"><div class="song-num">${i+1}</div><div class="song-play-icon">+</div><div class="song-icon">♪</div><div class="song-info-col"><div class="song-title">${s.title}</div><div class="song-artist">${s.artist}</div></div><button class="btn btn-sm" style="background:rgba(245,166,35,0.15);color:var(--gold);border:none;cursor:pointer" onclick="event.stopPropagation();turnPick(${i})">Pick</button></div>`).join(''); }
function renderTurnOrder(){ const el=document.getElementById('turn-order'); if(!el) return; el.innerHTML=state.turnUsers.map((u,i)=>`<div class="turn-card ${i===state.turnIndex?'current':''}"><div class="turn-indicator">${i===state.turnIndex?'NOW':'#'+(i+1)}</div><div class="turn-name">${u}</div>${i===state.turnIndex?'<div class="current-badge">Picking</div>':''}</div>`).join(''); }
function renderTurnQueue(){ const el=document.getElementById('turn-queue-display'); if(!el) return; if(!state.turnQueue.length){el.innerHTML='<div class="empty-state" style="padding:12px 0">No songs queued yet</div>';return;} el.innerHTML=state.turnQueue.slice(0,6).map(e=>`<div class="queue-track"><div style="width:28px;height:28px;background:var(--bg-hover2);border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:13px">♪</div><div class="qt-info"><div class="qt-title">${e.song.title}</div><div class="qt-user">← ${e.user}</div></div></div>`).join(''); }
function renderTurnLabel(){ const el=document.getElementById('turn-pick-label'); if(!el) return; const u=state.turnUsers[state.turnIndex]; el.textContent=u==='You'?'Your turn to pick!':u+"'s turn…"; }
function turnPick(idx){ const u=state.turnUsers[state.turnIndex]; if(u!=='You'){showToast(`It's ${u}'s turn, not yours!`);return;} const song=SONGS[idx]; state.turnQueue.push({user:u,song}); state.queue.push(song); if(!state.currentSong) playSong(idx); skipTurn(); persist(); showToast(`"${song.title}" added to queue!`); }
function skipTurn(){ state.turnIndex=(state.turnIndex+1)%state.turnUsers.length; renderTurnOrder(); renderTurnQueue(); renderTurnLabel(); persist(); if(state.turnUsers[state.turnIndex]!=='You'){ setTimeout(()=>{ const u=state.turnUsers[state.turnIndex]; if(u==='You') return; const song=rand(SONGS); state.turnQueue.push({user:u,song}); state.queue.push(song); state.turnIndex=(state.turnIndex+1)%state.turnUsers.length; persist(); renderTurnOrder(); renderTurnQueue(); renderTurnLabel(); },2000); } }
function initTurnBased(){ renderTurnOrder(); renderTurnQueue(); renderTurnLabel(); renderTurnSongs(); }

function initSkipListeners(){ if(!state.skipListeners.length) state.skipListeners=shuffle(USERS).slice(0,5); persist(); }
function renderSkipListeners(){ const el=document.getElementById('skip-listener-list'); if(!el) return; const avatarColors=['#1db954','#509BF5','#8D67AB','#E8115B','#FF6437']; el.innerHTML=state.skipListeners.map((u,i)=>{ const voted=u==='You'&&state.skipVotedMe; return `<div class="listener-row"><div class="listener-avatar" style="background:${voted?'var(--red)':avatarColors[i%avatarColors.length]};color:${voted?'#fff':'#000'}">${u[0]}</div><div class="listener-name">${u}</div><div class="listener-status ${voted?'status-skip':'status-listen'}">${voted?'⏭ Skip!':'♪ Listening'}</div></div>`; }).join(''); }
function renderSkipRules(){ const el=document.getElementById('skip-rules'); if(!el) return; const rules=[['⏭',`Need ${state.skipThreshold} votes to skip`],['↻','Auto-advances to next song'],['⟲','Vote resets for each new song'],['✕',"Can't undo your skip vote"],['◉',"Everyone's vote counts equally"]]; el.innerHTML=rules.map(([icon,txt])=>`<div class="rule-row"><div class="rule-icon">${icon}</div>${txt}</div>`).join(''); }
function updateSkipMeter(){ const pct=Math.min(state.skipVotes/state.skipThreshold,1); document.getElementById('skip-fill').style.width=(pct*100)+'%'; document.getElementById('skip-votes').textContent=state.skipVotes; document.getElementById('skip-threshold').textContent=state.skipThreshold; }
function castSkipVote(){ if(state.skipVotedMe){showToast('Already voted to skip!');return;} state.skipVotedMe=true; state.skipVotes++; const btn=document.getElementById('skip-btn'); btn.textContent='✓ Voted to Skip'; btn.disabled=true; btn.style.opacity='0.6'; persist(); updateSkipMeter(); renderSkipListeners(); checkSkipThreshold(); }
function simulateGroupVote(){ const extra=Math.floor(1+Math.random()*state.skipThreshold); state.skipVotes=Math.min(state.skipVotes+extra,state.skipThreshold+1); persist(); updateSkipMeter(); checkSkipThreshold(); }
function checkSkipThreshold(){ if(state.skipVotes>=state.skipThreshold) setTimeout(doSkip,800); }
function doSkip(){ const next=rand(SONGS); showToast('Group voted to skip → Playing next!'); state.skipVotes=0; state.skipVotedMe=false; const btn=document.getElementById('skip-btn'); if(btn){btn.textContent='⏭ Vote to Skip';btn.disabled=false;btn.style.opacity='1';} document.getElementById('skip-title').textContent=next.title; document.getElementById('skip-artist').textContent=next.artist; document.getElementById('skip-art').style.background=next.color||'#1db954'; persist(); updateSkipMeter(); renderSkipListeners(); const idx=SONGS.findIndex(s=>s.title===next.title); if(idx>=0) playSong(idx); }
function initSkipPage(){ if(state.currentSong){ document.getElementById('skip-title').textContent=state.currentSong.title; document.getElementById('skip-artist').textContent=state.currentSong.artist; document.getElementById('skip-art').style.background=state.currentSong.color||'#1db954'; } const btn=document.getElementById('skip-btn'); if(btn && state.skipVotedMe){ btn.textContent='✓ Voted to Skip'; btn.disabled=true; btn.style.opacity='0.6'; } updateSkipMeter(); renderSkipListeners(); renderSkipRules(); }

function initPage(){
  initSkipListeners();
  updatePlayerUI();
  const page = document.body.dataset.page;
  if(page==='home') initHome();
  if(page==='search') initSearch();
  if(page==='library') initLibrary();
  if(page==='jam') renderJamPage();
  if(page==='voting') initVoting();
  if(page==='turnbased') initTurnBased();
  if(page==='skipvote') initSkipPage();
  if(state.isPlaying && state.currentSong) startPlaying();
}

document.addEventListener('DOMContentLoaded', initPage);
