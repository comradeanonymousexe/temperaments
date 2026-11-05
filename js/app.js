/* Ma'rifah an-Nafs: local-first single-page web app. No requests, ads, trackers, or accounts. */
(() => {
  'use strict';
  const D = window.MIZAN_DATA;
  const E = window.MizanEngine;
  if (!D || !E) { document.getElementById('main').textContent = 'The questionnaire data could not be loaded.'; return; }
  const STORAGE = 'mizan-nafs-state-v1';
  const defaults = () => ({ schema: 2, tAnswers: {}, bAnswers: {}, tIndex: 0, bPage: 0,
    quizTab: 'temperament', twoMode: false, earlyViewed: false, focusCodes: [],
    planStart: null, dailyChecks: {}, weeklyChecks: {}, notes: {}, weeklyNotes: {},
    monthlyNotes: {}, monthlyChecks: {}, baselineB: null, weekIndex: 0, journalDate: null });
  let memoryOnly = false;
  const e = value => String(value == null ? '' : value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function validObj(obj) {return obj && typeof obj === 'object' && !Array.isArray(obj) ? obj : {};}
  function sanitized(original) {
    const a = validObj(original); const state = defaults();
    for (const key of ['tAnswers','bAnswers','dailyChecks','weeklyChecks','notes','weeklyNotes','monthlyNotes','monthlyChecks']) state[key] = validObj(a[key]);
    for (const key of ['tIndex','bPage','weekIndex']) if (Number.isInteger(a[key])) state[key] = Math.max(0,Math.min(key==='tIndex'?47:key==='bPage'?43:5,a[key]));
    for (const key of ['earlyViewed','twoMode']) state[key] = Boolean(a[key]);
    if ((a.schema || 1)<2) state.bPage=Math.min(43, state.bPage*4);
    if (a.quizTab === 'conduct') state.quizTab = 'conduct';
    if (a.baselineB && typeof a.baselineB==='object' && !Array.isArray(a.baselineB)) state.baselineB = validObj(a.baselineB);
    if (Array.isArray(a.focusCodes)) state.focusCodes = a.focusCodes.filter(c=>typeof c==='string' && D.domains[c]).slice(0,2);
    for (const key of ['planStart','journalDate']) if (typeof a[key]==='string' && /^\d{4}-\d{2}-\d{2}$/.test(a[key])) state[key] = a[key];
    Object.entries(state.tAnswers).forEach(([id,val]) => {
      if (!D.questions.some(q=>q.id===Number(id)) || !val || (!val.skip && !'ABCD'.includes(val.primary || '!'))) delete state.tAnswers[id];
      else if (!val.skip && val.secondary && (!'ABCD'.includes(val.secondary) || val.secondary===val.primary)) delete val.secondary;
    });
    Object.entries(state.bAnswers).forEach(([id,val])=>{
      if (Number(id)<1||Number(id)>44|| !(val==='?' || Number.isInteger(val)&&val>=0&&val<=3)) delete state.bAnswers[id];
    });
    return state;
  }
  function load() { try {let item = localStorage.getItem(STORAGE); return item ? sanitized(JSON.parse(item)) : defaults();} catch(err){memoryOnly=true;return defaults();} }
  let S = load();
  let inquiryOpen = false; // Always begin with the introduction when entering Inquiry.
  function save() {
    try {localStorage.setItem(STORAGE,JSON.stringify(S));memoryOnly=false;}
    catch(err){memoryOnly=true;}
    const indicator=document.getElementById('storage-indicator');
    if (indicator) {indicator.classList.toggle('error',memoryOnly);indicator.innerHTML='<span class="save-dot"></span> '+(memoryOnly?'Not stored':'Saved here');}
  }
  function toast(text) {const el=document.getElementById('toast');el.textContent=text;el.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove('show'),2800);}
  function today() {const now=new Date();return [now.getFullYear(),String(now.getMonth()+1).padStart(2,'0'),String(now.getDate()).padStart(2,'0')].join('-');}
  function utcDay(s) {if(!s || !/^\d{4}-\d\d-\d\d$/.test(s)) return NaN;const [y,m,d]=s.split('-').map(Number);return Date.UTC(y,m-1,d)/86400000;}
  function plusDays(s,d) {const dt=new Date((utcDay(s)+d)*86400000);return Number.isNaN(dt.getTime())?today():dt.toISOString().slice(0,10);}
  function formatDate(s) {try{return new Date(s+'T12:00:00').toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'});}catch(err){return s;}}
  function dayIndex() {return S.planStart ? Math.floor(utcDay(today())-utcDay(S.planStart))+1 : 0;}
  function tScore() {return E.scoreTemperament(D,S.tAnswers);}
  function bScore() {return E.scoreBehaviors(D,S.bAnswers);}
  function currentTheme() {const route=getRoute();if(route.startsWith('/type/'))return route.split('/')[2];const sc=tScore();return sc.answered>=8 ? sc.top : 'neutral';}
  const button=(label,href='')=>`<a class="button primary" href="${e(href)}">${e(label)} <span class="arrow" aria-hidden="true">↗</span></a>`;
  const starSvg = `<svg viewBox="0 0 600 600" fill="none" aria-hidden="true"><circle cx="300" cy="300" r="247" stroke="currentColor" stroke-opacity="1" stroke-width="2.5"/><circle cx="300" cy="300" r="218" stroke="currentColor" stroke-opacity="1" stroke-width="2.5"/><circle cx="300" cy="300" r="190" stroke="currentColor" stroke-opacity="1" stroke-width="2.5"/><circle cx="300" cy="300" r="146" stroke="currentColor" stroke-opacity="1"/><rect x="145" y="145" width="310" height="310" stroke="currentColor" stroke-width="2.5" stroke-opacity="1"/><rect x="145" y="145" width="310" height="310" stroke="currentColor" stroke-width="2.5" stroke-opacity="1" transform="rotate(45 300 300)"/><rect x="168" y="168" width="264" height="264" stroke="currentColor" stroke-opacity="1" transform="rotate(22.5 300 300)"/><rect x="168" y="168" width="264" height="264" stroke="currentColor" stroke-opacity="1" transform="rotate(67.5 300 300)"/><circle cx="300" cy="300" r="118" stroke="currentColor" stroke-opacity="1"/><circle cx="300" cy="300" r="106" stroke="currentColor" stroke-opacity="1"/>${Array.from({length:16},(_,i)=>{const a=i*Math.PI/8;return `<circle cx="${(300+247*Math.cos(a)).toFixed(2)}" cy="${(300+247*Math.sin(a)).toFixed(2)}" r="3" fill="currentColor"/>`}).join('')}</svg>`;
  const ornament = '<div class="divider-ornament" aria-hidden="true">✦</div>';
  function getRoute() {const v=location.hash.slice(1)||'/home';return /^\/(home|quiz|library|results|roadmap|journal|privacy|type\/[CSMP])$/.test(v)?v:'/home';}
  function sectionHeader(eyebrow,title,desc) {return `<div class="page-intro shell"><h1 class="h1">${title}</h1><p class="lead">${e(desc)}</p></div>`;}
  function routeTo(path) {location.hash='#'+path;}
  function highlightNav(route) {
    document.querySelectorAll('[data-nav]').forEach(a=>a.classList.toggle('active',a.dataset.nav===(route.startsWith('/type/')?'library':route.slice(1))));
    const menu=document.getElementById('mobile-nav');menu.hidden=true;document.getElementById('menu-button').setAttribute('aria-expanded','false');
  }
  function render() {
    const route=getRoute();
    document.body.dataset.theme=currentTheme();
    const main=document.getElementById('main');main.className='page';
    let html='';
    if(route==='/home')html=home();
    if(route==='/quiz')html=quiz();
    if(route==='/library')html=library();
    if(route.startsWith('/type/'))html=typeDetail(route.split('/')[2]);
    if(route==='/results')html=results();
    if(route==='/roadmap')html=roadmap();
    if(route==='/journal')html=journal();
    if(route==='/privacy')html=privacy();
    main.innerHTML=html;
    highlightNav(route);save();
  }
  // Visible prose is intentionally spare. Source wording and scoring remain in data.js / engine.js.
  const cardName = v => (v?.card?.title || '').replace(/\s+\*\(B-domain:[\s\S]*$/, '').trim();
  const portraits = {
    C: {line:'A resolute heart.', counsel:''},
    S: {line:'A luminous heart.', counsel:''},
    M: {line:'A reflective heart.', counsel:''},
    P: {line:'A calm heart.', counsel:''}
  };
  const typeCodes=['C','S','M','P'];
  function home() {
    const sc=tScore();
    return `<section class="hero"><div class="shell hero-inner"><div class="hero-copy"><h1>Know Thy Self.<br></h1><div class="actions"><a class="button gold" href="#/quiz">${sc.visited?'Resume the inquiry':'Begin the inquiry'} <span class="arrow">↗</span></a><a class="button outline" href="${S.planStart?'#/journal':'#/roadmap'}">${S.planStart?'Open the ledger':'The path of amendment'}</a></div></div><div class="hero-art"><div class="mandala"><div class="mandala-ring"></div>${starSvg}<div class="mandala-center"><span class="arabic">قَلْب</span></div></div></div></div></section>
    <section class="section shell compact-natures"><div class="section-heading"><div><h2 class="h2">The Four Temperaments</h2></div></div><div class="nature-grid">${typeCodes.map(code=>{const p=D.profiles[code];return `<a class="nature-card" href="#/type/${code}"><span class="nature-number">${e(p.arabic)}</span><h3>${e(p.name)}</h3><p>${e(portraits[code].line)}</p><span class="read-more">Read ↗</span></a>`}).join('')}</div><p class="mini compact-disclaimer">A temperament is neither virtue nor vice. Its fruits are known by deeds.</p></section>`;
  }
  function library() {
    return sectionHeader('The four dispositions','Know the natures.','The four temperaments is used to define human personality. This framework originated in ancient Greece via Hippocrates and Galen, who mapped these to principle elements (air, fire, earth, water).  Later, Islamic scholars like Ibn Sina integrated it into Unani medicine. Sufi masters adopted this system to diagnose the ego\'s flaws, using the physical Mizaj as a tool for  Tazkiyah.')+
    `<section class="shell section tight-top"><div class="library-grid">${typeCodes.map(code=>{const p=D.profiles[code];return `<article class="library-tile card"><span class="arabic">${e(p.arabic)}</span><h2>${e(p.name)}</h2><p>${e(portraits[code].line)}</p><p class="mini">${e(portraits[code].counsel)}</p><a href="#/type/${code}" class="button outline tiny">Read portrait ↗</a></article>`}).join('')}</div></section>`;
  }
  function typeDetail(code) {
    const p=D.profiles[code];if(!p)return library();
    const figures=p.figure.map(person=>`<div class="hist-person"><strong>${e(person.name)}</strong><small>${e(person.evidence)} · ${e(person.note)}</small></div>`).join('');
    return `<section class="type-hero"><div class="shell"><a href="#/library" class="type-back">← The four dispositions</a><div class="arabic type-arabic">${e(p.arabic)}</div><h1>${e(p.name)}</h1><p class="lead">${e(portraits[code].line)}</p></div></section><section class="section shell tight-top"><div class="grid-2"><article class="card card-pad"><div class="smallcaps">The nature</div><h3>${e(p.tagline)}</h3><p>${e(p.intro)}</p><p class="mini">${e(portraits[code].counsel)}</p><p class="mini">${e(p.verse)}</p></article><article class="card card-pad"><div class="smallcaps">Its movement</div><div class="profile-row"><span>Response</span><strong>${code==='C'||code==='S'?'Swift':'Measured'}</strong></div><div class="profile-row"><span>Impression</span><strong>${code==='C'||code==='M'?'Enduring':'Passing'}</strong></div><div class="profile-row"><span>Practice</span><strong>${e(p.practice)}</strong></div><div class="actions mini-gap"><a href="#/quiz" class="button primary tiny">Examine your temperament ↗</a></div></article></div><div class="grid-2 compact-gap"><div class="card card-pad"><div class="smallcaps">The gifts</div><ul class="point-list">${p.strengths.map(x=>`<li>${e(x)}</li>`).join('')}</ul></div><div class="card card-pad"><div class="smallcaps">The trials · not presumed faults</div><ul class="point-list">${p.watch.map(x=>`<li>${e(x)}</li>`).join('')}</ul></div></div>${figures?`<details class="compact-details"><summary>Historical Examples </summary>${figures}</details>`:''}</section>`;
  }
  function quiz() {
    const sc=tScore(),bs=bScore(),conduct=S.quizTab==='conduct';
    if (!inquiryOpen) return `<section class="inquiry-intro shell" aria-labelledby="inquiry-title"><div class="inquiry-intro-inner"><div class="inquiry-seal" aria-hidden="true">${starSvg}</div><h1 id="inquiry-title">The Inquiry</h1><p>Learn Find Out Your Temperament</p><div class="inquiry-totals"><span>Nature · ${sc.visited} of 48</span><span>Conduct · ${bs.answered} of 44</span></div><button class="button primary" type="button" data-action="open-inquiry">${sc.visited||bs.answered?'Resume the inquiry':'Begin the inquiry'} →</button></div></section>`;
    return `<section class="quiz-workspace"><div class="quiz-outer"><div class="quiz-topbar"><button type="button" class="return-inquiry" data-action="close-inquiry" aria-label="Return to the introduction">← The inquiry</button><div class="quiz-tabs" aria-label="Parts of the inquiry"><button type="button" class="${conduct?'':'selected'}" data-action="tab" data-value="temperament">I · Nature</button><button type="button" class="${conduct?'selected':''}" data-action="tab" data-value="conduct">II · Conduct</button></div></div><div class="quiz-meter"><span>${conduct?'Deeds · '+bs.answered+' / 44':'Scenes · '+sc.visited+' / 48'}</span><span>${conduct?'':'Reading · '+sc.readiness+'%'}</span></div><div class="progress-track" role="progressbar" aria-valuenow="${Math.round(conduct?bs.completion:sc.completion)}" aria-valuemin="0" aria-valuemax="100"><span style="width:${conduct?bs.completion:sc.completion}%"></span></div>${conduct?conductQuiz(bs):temperamentQuiz(sc)}</div></section>`;
  }
  function temperamentQuiz(sc) {
    const q=D.questions[S.tIndex],answer=S.tAnswers[q.id]||{},allowSecond=S.twoMode||!!answer.secondary;
    const options=q.options.map((val,index)=>{const letter='ABCD'[index],selected=answer.primary===letter||answer.secondary===letter;const role=answer.primary===letter?'First':answer.secondary===letter?'Second':'';return `<button type="button" data-action="pick-t" data-value="${letter}" class="option ${selected?'selected':''} ${answer.secondary===letter?'secondary-selected':''}" aria-pressed="${selected}"><span class="letter">${letter}</span><span>${role?`<span class="option-caption">${role}</span>`:''}${e(val)}</span></button>`}).join('');
    return `<section class="question-card single-question"><div class="question-kicker"><span class="smallcaps">Scene ${String(q.id).padStart(2,'0')} of 48</span><span class="readiness-inline" title="A provisional questionnaire-readiness heuristic, not the probability of a true type.">Reading ${sc.readiness}%</span></div><h2>${e(q.title)}</h2><div class="option-list">${options}</div><div class="question-mode"><button class="text-button" type="button" data-action="toggle-second">${allowSecond?'− One answer':'+ A second answer also fits'}</button>${allowSecond?`<label class="equal-choice"><input type="checkbox" data-action="equal-t" ${answer.equal?'checked':''} ${answer.secondary?'':'disabled'}> Equally true</label>`:''}</div><div class="question-toolbar"><button type="button" class="text-button" data-action="skip-t">${answer.skip?'✓ No fitting experience':'No fitting experience'}</button></div>${sc.earlyReady?`<div class="early-note"><strong>An early estimation is possible.</strong> <span>Later answers may change it.</span> <a href="#/results" data-action="early-result">View ↗</a></div>`:''}${sc.answered>=36&&!sc.earlyReady?`<a href="#/results" class="mini inline-result">View present reading ↗</a>`:''}</section><div class="quiz-actions"><button class="button outline" type="button" data-action="prev-t" ${S.tIndex===0?'disabled':''}>← Back</button><button class="button primary" type="button" data-action="next-t">${S.tIndex===47?'See the reading':'Continue'} →</button></div>`;
  }
  function conductQuiz(bs) {
    const b=D.behaviors[S.bPage],opts=[['0','Never'],['1','Rarely'],['2','Few Times'],['3','Often'],['?','Did Not Face']];
    return `<section class="question-card single-question conduct-question"><div class="question-kicker"><span class="smallcaps">Deed ${String(b.id).padStart(2,'0')} of 44</span></div><h2>${e(b.prompt)}</h2><div class="frequency-grid" role="group" aria-label="How often in the past thirty days">${opts.map(([value,label])=>`<button type="button" data-action="pick-b" data-id="${b.id}" data-value="${value}" class="${String(S.bAnswers[b.id])===value?'selected':''}" aria-pressed="${String(S.bAnswers[b.id])===value}">${e(label)}</button>`).join('')}</div></section><div class="quiz-actions"><button class="button outline" data-action="prev-b" ${S.bPage===0?'disabled':''}>← Back</button><button class="button primary" data-action="next-b">${S.bPage===43?'See thy path':'Continue'} →</button></div>`;
  }
  function histCard(profile) {
    const rows=profile.figure.length?profile.figure.map(v=>`<div class="hist-person"><strong>${e(v.name)}</strong><small>${e(v.evidence)} · ${e(v.note)}</small></div>`).join(''):'<p class="mini">Hock gives no secure example.</p>';
    return `<article class="card card-pad"><div class="smallcaps">Historical echoes</div>${rows}</article>`;
  }
  function results() {
    const sc=tScore(),bs=bScore();if(sc.answered<24)return sectionHeader('The reading','Observe further.','At least twenty-four responses are needed.')+`<section class="shell section tight-top">${button('Return to the inquiry','#/quiz')}</section>`;
    const p=D.profiles[sc.top],p2=D.profiles[sc.second];
    const status=sc.visited===48&&sc.answered>=36?'Complete':sc.earlyReady||sc.answered>=36?'Provisional':'Early view';
    return `<section class="result-hero"><div class="shell"><div class="arabic type-arabic">${e(p.arabic)}</div><h1>${e(p.name)}</h1><p class="lead">${e(portraits[sc.top].line)}</p><div class="stats-mini"><span class="tag gold">${status}</span><span class="tag ghost">${sc.readiness}% readiness</span><span class="tag ghost">${sc.answered} / 48 scored</span></div></div></section><section class="shell compact-results"><div class="result-grid"><article class="card primary-portrait"><div class="smallcaps">Leading nature</div><h3>${e(p.tagline)}</h3><p>${e(p.intro)}</p><p class="mini">${e(portraits[sc.top].counsel)}</p><a class="button outline tiny" href="#/type/${sc.top}">Read the portrait ↗</a></article>${histCard(p)}${sc.raw[sc.second]>=20?`<article class="card card-pad"><div class="smallcaps">Second nature</div><h3>${e(p2.name)} · ${sc.display[sc.second].toFixed(1)}%</h3><p>${e(portraits[sc.second].line)}</p><p class="mini">${sc.mixed?'A closely mingled disposition.':'An additional inclination.'}</p></article>`:''}<article class="card card-pad"><div class="smallcaps">Gifts to nourish</div><ul class="point-list">${p.strengths.map(t=>`<li>${e(t)}</li>`).join('')}</ul></article><article class="card card-pad"><div class="smallcaps">Trials to observe</div><ul class="point-list">${p.watch.map(t=>`<li>${e(t)}</li>`).join('')}</ul><p class="mini">These are common traits of this temperament. Not necessarily yours</p></article><article class="card card-pad"><div class="smallcaps">The fourfold measure</div><div class="bars-compact">${typeCodes.map(code=>`<div class="bar-row" data-type="${code}"><span>${e(D.profiles[code].name)}</span><div class="bar-track" role="progressbar" aria-label="${e(D.profiles[code].name)} relative fit" aria-valuenow="${sc.display[code]}" aria-valuemin="0" aria-valuemax="100"><span style="width:${sc.display[code]}%"></span></div><strong>${sc.display[code].toFixed(1)}%</strong></div>`).join('')}</div></article><article class="card card-pad wide"><div class="smallcaps">What the deeds reveal</div>${bs.answered?`<p>${bs.observed.length} reported · ${bs.excluded.length} not observed · ${bs.unknown.length} unknown</p><div class="actions">${bs.actionable.slice(0,5).map(v=>`<span class="chip">${e(cardName(v))}</span>`).join('')||'<span class="mini">No fault has been reported.</span>'}</div>${bs.distress.length?'<p class="mini">Distress asks for support, not rebuke.</p>':''}`:'<p>Examine conduct before assigning a remedy.</p>'}<div class="actions mini-gap"><a href="#/quiz" class="button outline tiny" data-action="jump-conduct">${bs.answered<44?'Examine conduct':'Revisit conduct'}</a><a href="#/roadmap" class="button primary tiny">Enter the path ↗</a></div></article></div><p class="mini compact-disclaimer">Readiness is a changing, unvalidated questionnaire measure; 100% means completion, not certainty. ${sc.repeatCompared&&sc.repeatDiff>=3?'Some answers differ across similar scenes.':''}</p></section>`;
  }
  function activeFocus(bs) {
    const baseline=S.baselineB ? E.scoreBehaviors(D,S.baselineB) : null;
    return S.focusCodes.map(code=>{const current=bs.byCode[code];if(current?.status==='observed'&&current.kind!=='distress')return current;const previous=baseline?.byCode[code];return previous?.status==='observed'&&previous.kind!=='distress'?previous:null;}).filter(Boolean);
  }
  function monthlyTasks(n) {
    return n===28 ? [
      {id:'rights',title:'Restore a neglected right, if any.'},
      {id:'pattern',title:'Name one deed that has changed.'},
      {id:'balance',title:'Guard rest and lawful obligations.'}
    ] : [
      {id:'evaluate',title:'Review deeds.'},
      {id:'recheck',title:'Consider repeating the conduct inquiry.'},
      {id:'continue',title:'Keep one practice for the month ahead.'}
    ];
  }
  function monthlyCompare() {
    if(!S.baselineB||!Object.keys(S.baselineB).length)return '';
    const before=E.scoreBehaviors(D,S.baselineB),after=bScore();
    if(after.answered<30||JSON.stringify(S.baselineB)===JSON.stringify(S.bAnswers))return '';
    return `<p class="mini compact-disclaimer">Earlier: ${before.observed.length} reported areas. Now: ${after.observed.length}. A change in reports is not proof of sanctity.</p>`;
  }
  function roadmap() {
    const sc=tScore(),bs=bScore(),primary=sc.top?D.profiles[sc.top]:null,selectables=[...bs.actionable,...activeFocus(bs).filter(v=>!bs.actionable.some(x=>x.code===v.code))],focus=activeFocus(bs),phase=E.phaseForDay(D,Math.max(1,dayIndex()));
    return sectionHeader('Riyāḍat al-nafs','Spiritual Journey','This section is dedicated to advising on individual spiritual development based on their recorded nature.')+`<section class="shell section tight-top">${bs.answered<44?`<p class="notice">${44-bs.answered} conduct answers remain unknown. <a href="#/quiz" data-action="jump-conduct"><u>Complete the inquiry ↗</u></a></p>`:''}<div class="section-heading"><div><h2 class="h2">Choose an aspect to work on</h2></div><span class="mini">${focus.length} of 2 chosen</span></div>${selectables.length?`<div class="focus-list">${selectables.map(v=>{const selected=S.focusCodes.includes(v.code);return `<button type="button" class="focus-pick ${selected?'is-selected':''}" data-action="focus" data-value="${v.code}" aria-pressed="${selected}"><span class="focus-check">${selected?'✓':''}</span><span><strong>${e(cardName(v))}</strong><small>${e(v.card.virtue)}</small></span></button>`}).join('')}</div>`:`<div class="card card-pad"><h3>No fault need be invented.</h3><p>Until a deed is known, keep prayer, service, gratitude and a brief evening reckoning.</p><a href="#/quiz" data-action="jump-conduct" class="button outline tiny">Examine conduct ↗</a></div>`}<div class="actions compact-actions"><button type="button" class="button primary" data-action="start-plan">${S.planStart?'Keep these practices':'Begin forty days'} →</button>${S.planStart?'<a class="button outline" href="#/journal">Open the ledger ↗</a>':''}</div>${bs.distress.length?'<p class="mini compact-disclaimer"></p>':''}<div class="section-heading compact-section-heading"><div><h2 class="h2">40 Days Journey.</h2></div></div><div class="timeline">${D.schedule.map(ph=>`<div class="timeline-node ${S.planStart&&ph===phase?'current':''}"><span class="range">${ph.days[0]}–${ph.days[1]}</span><div class="arabic">${e(ph.arabic)}</div><h3>${e(ph.name)}</h3><p>${e(ph.purpose)}</p></div>`).join('')}</div>${focus.length?`<div class="section-heading compact-section-heading"><div><h2 class="h2">Small acts, often done.</h2></div></div><div class="grid-2">${focus.map(v=>`<article class="card plan-card"><div class="smallcaps">${e(v.card.virtue)}</div><h3>${e(cardName(v))}</h3><p>${e(v.card.micro)}</p><details><summary>The fuller discipline</summary><ol>${v.card.steps.map(t=>`<li>${e(t)}</li>`).join('')}</ol><p class="mini">${e(v.card.track)}</p><p class="mini">${e(v.card.sources)}</p></details></article>`).join('')}</div>`:''}<p class="mini compact-disclaimer">The period of forty days bear a spiritual importance in Tasawwuf.</p></section>`;
  }
  function metricBoxes() {
    const day=dayIndex(),done=Object.values(S.dailyChecks).reduce((n,v)=>n+Object.values(validObj(v)).filter(Boolean).length,0);
    return `<span class="mini">Day ${day<1?0:Math.min(40,day)} / 40</span><span class="mini">${done} acts marked</span>`;
  }
  function dailyTasks() {
    return [
      {id:'niyyah',title:'Niyyah · renew your intention',note:'Seek help from Allah; name one fitting act.'},
      {id:'muraqabah',title:'Murāqabah · attend to a trigger',note:'Pause before answering.'},
      ...activeFocus(bScore()).map(v=>({id:'focus-'+v.code,title:v.card.virtue+' · act',note:v.card.micro})),
      {id:'muhasabah',title:'Muḥāsabah · reckon gently',note:'Note the deed and any need for repair.'},
      {id:'ihsan',title:'Iḥsān · serve without display',note:'One fitting act of benefit.'}
    ];
  }
  function weekTasks(week) {
    const phase=E.phaseForDay(D,Math.min(40,week*7-3)),step=phase.days[0]<15?0:phase.days[0]===15?1:2;
    return [
      {id:'w-notice',title:phase.action},
      ...activeFocus(bScore()).map(v=>({id:'w-'+v.code,title:v.card.steps[step]})),
      {id:'w-repair',title:'Repair a wrong, where possible and safe.'},
      {id:'w-service',title:'Perform one hidden kindness.'},
      {id:'w-review',title:'Write the weekly reckoning.'}
    ];
  }
  function checkRow(id,title,detail,checked,action,extra='') {
    return `<label class="check-line ${checked?'checked':''}"><input type="checkbox" ${checked?'checked':''} data-action="${action}" data-id="${e(id)}" ${extra}><span><strong>${e(title)}</strong>${detail?`<small>${e(detail)}</small>`:''}</span></label>`;
  }
  function journal() {
    if(!S.planStart)return sectionHeader('The ledger','Log Your Actions Here.','Consistent Muhasaba (accountability) is non-negotiable in the spiritual journey.')+`<section class="shell section tight-top">${button('Choose your path first','#/roadmap')}</section>`;
    const selected=S.journalDate||today(),week=S.weekIndex+1,day=dayIndex(),daily=S.dailyChecks[selected]||{},wchecks=S.weeklyChecks[week]||{},tasks=dailyTasks(),wtasks=weekTasks(week),phase=E.phaseForDay(D,day);
    return sectionHeader('The ledger','Daily Records & Muraqaba','')+`<section class="shell section tight-top"><div class="ledger-top">${metricBoxes()}<span class="mini">${e(phase.name)}</span><a href="#/roadmap" class="mini">The remedies ↗</a></div><div class="journal-col"><article class="card"><div class="daily-header"><div><span class="smallcaps">Daily · muḥāsabah</span><h3>${e(formatDate(selected))}</h3></div><div class="date-nav"><button class="button outline tiny" data-action="prev-day" aria-label="Previous day">←</button><input type="date" id="journal-day" aria-label="Journal date" value="${e(selected)}"><button class="button outline tiny" data-action="next-day" aria-label="Next day">→</button></div></div><div class="checklist">${tasks.map(v=>checkRow(v.id,v.title,v.note,!!daily[v.id],'toggle-daily')).join('')}</div><label class="smallcaps" for="daily-note">Evening reckoning</label><textarea class="note-area" id="daily-note" data-action="daily-note" placeholder="What was done? What requires repair?">${e(S.notes[selected]||'')}</textarea></article><article class="card"><div class="smallcaps">Past seven days</div><h3>Constancy in small things.</h3>${weekBarGraph(tasks)}<p class="mini">${e(phase.action)}</p></article></div><div class="section-heading compact-section-heading"><div><h2 class="h2">Reckon, then renew.</h2></div></div><div class="week-selector">${Array.from({length:6},(_,i)=>`<button type="button" data-action="week" data-value="${i}" class="${S.weekIndex===i?'active':''}">${i+1}</button>`).join('')}</div><div class="journal-col weekly-grid"><article class="card"><div class="smallcaps">Week ${week}</div><div class="checklist">${wtasks.map(v=>checkRow(v.id,v.title,null,!!wchecks[v.id],'toggle-week')).join('')}</div></article><article class="card"><label class="smallcaps" for="weekly-note">The week's account</label><textarea class="note-area" id="weekly-note" data-action="weekly-note" placeholder="What changed in deed? What remains?">${e(S.weeklyNotes[week]||'')}</textarea></article></div><div class="section-heading compact-section-heading"><div><h2 class="h2">Review the course.</h2></div></div><div class="month-review">${[28,40].map(n=>`<article class="card"><div class="smallcaps">Day ${n} · ${n===28?'First reckoning':'End of the cycle'}</div><div class="checklist">${monthlyTasks(n).map(t=>checkRow(t.id,t.title,null,!!S.monthlyChecks[n]?.[t.id],'toggle-month',`data-month="${n}" ${day<n?'disabled':''}`)).join('')}</div><label class="smallcaps" for="month-note-${n}">A short account</label><textarea id="month-note-${n}" class="note-area" data-action="monthly-note" data-month="${n}" placeholder="What shall be kept?" ${day<n?'disabled':''}>${e(S.monthlyNotes[n]||'')}</textarea>${day<n?`<p class="mini">Opens on ${e(formatDate(plusDays(S.planStart,n-1)))}</p>`:''}${n===40&&day>=40?'<button class="button outline tiny" data-action="retest-b">Revisit conduct ↗</button>':''}</article>`).join('')}</div>${monthlyCompare()}</section>`;
  }
  function weekBarGraph(tasks) {
    return `<div class="week-bars">${Array.from({length:7},(_,i)=>plusDays(today(),i-6)).map(date=>{const marked=tasks.filter(t=>S.dailyChecks[date]?.[t.id]).length;return `<div class="day-column"><div class="column-line"><span style="height:${Math.round(marked/tasks.length*100)}%" aria-label="${e(date)}: ${marked} practices"></span></div><small>${e(new Date(date+'T12:00:00').toLocaleDateString(undefined,{weekday:'short'}))}</small></div>`}).join('')}</div>`;
  }
  function privacy() {
    const sc=tScore(),bs=bScore();
    return sectionHeader('Safekeeping','The record is thine.','All answers and notes remain in this browser. There is no account or server.')+`<section class="shell section tight-top"><div class="privacy-layout"><div class="card card-pad"><div class="smallcaps">The store</div><h3>On this device.</h3><p>Browser storage persists across visits. It is not encrypted; others using this browser profile may see it. Clearing browser data can erase it.</p><div class="profile-row"><span>Nature</span><strong>${sc.visited}/48</strong></div><div class="profile-row"><span>Conduct</span><strong>${bs.answered}/44</strong></div><div class="profile-row"><span>Discipline</span><strong>${S.planStart?formatDate(S.planStart):'Not begun'}</strong></div></div><div class="card card-pad"><div class="smallcaps">Its proper bounds</div><h3>Its limits.</h3><p>Temperaments follow Conrad Hock; amendments draw on the supplied Islamicate manual and classical Islamic and selected Christian moral writings. This questionnaire is not validated; readiness is not a probability of truth. Historical examples follow Hock’s attributions.</p><p>Distress is not sin. Seek sound support where needed. Worship and the rights of people take precedence over this exercise.</p></div></div><div class="card card-pad compact-gap"><div class="smallcaps">Preserve or erase</div><div class="data-actions"><button class="button primary" data-action="export">Export record ↓</button><label for="import-file" class="button outline" style="cursor:pointer">Import record ↑</label><input id="import-file" type="file" accept="application/json,.json"><button class="button outline" data-action="reset">Erase record</button></div><p class="mini">A downloaded record contains private answers and notes; keep it safe.</p></div></section>`;
  }
  function selectPrimary(letter) {
    const q=D.questions[S.tIndex];let a={...(S.tAnswers[q.id]||{})};
    if(!S.twoMode){a={primary:letter};}
    else if(a.primary===letter){if(a.secondary){a.primary=a.secondary;delete a.secondary;delete a.equal;}}
    else if(!a.primary){a={primary:letter};}
    else if(a.secondary===letter){delete a.secondary;delete a.equal;}
    else {a.secondary=letter;a.equal=false;}
    delete a.skip;S.tAnswers[q.id]=a;
    save();render();
  }
  function chooseFocus(code) {
    const domains=bScore();if(!domains.actionable.some(v=>v.code===code) && !activeFocus(domains).some(v=>v.code===code)){toast('Choose only a fault already reported.');return;}
    if(S.focusCodes.includes(code))S.focusCodes=S.focusCodes.filter(x=>x!==code);
    else if(S.focusCodes.length>=2){toast('Choose no more than two.');return;}
    else S.focusCodes.push(code);
    save();render();
  }
  function downloadFile(name,content,mime) {const blob=new Blob([content],{type:mime});const href=URL.createObjectURL(blob);const a=document.createElement('a');a.href=href;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(href),3000);}
  document.addEventListener('click',ev=>{
    const btn=ev.target.closest('[data-action]');if(!btn)return;
    const act=btn.dataset.action, value=btn.dataset.value;
    if(act==='jump-conduct'){S.quizTab='conduct';inquiryOpen=false;save();}
    if(act==='early-result')S.earlyViewed=true;
    if(act==='open-inquiry'){inquiryOpen=true;render();}
    if(act==='close-inquiry'){inquiryOpen=false;render();}
    if(act==='tab'){S.quizTab=value;save();render();}
    if(act==='pick-t')selectPrimary(value);
    if(act==='toggle-second'){S.twoMode=!S.twoMode;if(!S.twoMode){let a=S.tAnswers[D.questions[S.tIndex].id];if(a){delete a.secondary;delete a.equal;}}save();render();}
    if(act==='skip-t'){S.tAnswers[D.questions[S.tIndex].id]={skip:true};save();render();}
    if(act==='prev-t'){S.tIndex=Math.max(0,S.tIndex-1);S.twoMode=!!S.tAnswers[D.questions[S.tIndex].id]?.secondary;save();render();}
    if(act==='next-t'){
      if(S.tIndex===47){const sc=tScore();if(sc.answered>=36){routeTo('/results');}else{toast('A full reading calls for 36 scored scenes.');S.tIndex=0;render();}}
      else {S.tIndex++;S.twoMode=!!S.tAnswers[D.questions[S.tIndex].id]?.secondary;save();render();}
    }
    if(act==='pick-b'){S.bAnswers[btn.dataset.id]=value==='?'?'?':Number(value);save();render();}
    if(act==='prev-b'){S.bPage=Math.max(0,S.bPage-1);save();render();}
    if(act==='next-b'){if(S.bPage===43){routeTo('/roadmap');}else{S.bPage++;save();render();}}
    if(act==='focus')chooseFocus(value);
    if(act==='start-plan'){if(!S.planStart){S.planStart=today();S.baselineB=JSON.parse(JSON.stringify(S.bAnswers));}if(!S.journalDate)S.journalDate=today();save();render();toast('The discipline has begun.');}
    if(act==='week'){S.weekIndex=Number(value);save();render();}
    if(act==='prev-day'||act==='next-day'){S.journalDate=plusDays(S.journalDate||today(),act==='prev-day'?-1:1);save();render();}
    if(act==='toggle-daily'){const date=S.journalDate||today();S.dailyChecks[date]=validObj(S.dailyChecks[date]);S.dailyChecks[date][btn.dataset.id]=btn.checked;save();render();}
    if(act==='toggle-week'){const key=String(S.weekIndex+1);S.weeklyChecks[key]=validObj(S.weeklyChecks[key]);S.weeklyChecks[key][btn.dataset.id]=btn.checked;save();render();}
    if(act==='toggle-month'){const key=btn.dataset.month;if(dayIndex()<Number(key))return;S.monthlyChecks[key]=validObj(S.monthlyChecks[key]);S.monthlyChecks[key][btn.dataset.id]=btn.checked;save();render();}
    if(act==='retest-b'){if(confirm('Start a new past-30-day conduct inventory? Your original baseline is retained in the plan. Your current conduct answers will be replaced.')){S.bAnswers={};S.bPage=0;S.quizTab='conduct';save();routeTo('/quiz');}}
    if(act==='export'){downloadFile('mizan-al-nafs-private-backup-'+today()+'.json',JSON.stringify({format:'mizan-nafs-backup',version:1,exported:today(),state:S},null,2),'application/json');toast('Private backup exported. Keep it secure.');}
    if(act==='reset'){if(confirm('Erase ALL local quiz answers, notes, practice checkmarks and settings? This cannot be undone without a separate backup.')){S=defaults();try{localStorage.removeItem(STORAGE);}catch(err){}routeTo('/home');render();toast('Saved state has been cleared from this browser.');}}
  });
  document.addEventListener('change',ev=>{
    const el=ev.target,action=el.dataset.action;
    if(action==='equal-t'){
      const a=S.tAnswers[D.questions[S.tIndex].id];if(a&&a.secondary){a.equal=el.checked;save();render();}}
    if(el.id==='journal-day'&&/^\d{4}-\d{2}-\d{2}$/.test(el.value)){S.journalDate=el.value;save();render();}
    if(el.id==='import-file' && el.files?.[0]){
      const file=el.files[0];if(file.size>8_000_000){toast('Backup is too large.');return;}
      file.text().then(t=>{
        let parsed;try{parsed=JSON.parse(t);}catch(err){toast('Invalid JSON backup.');return;}
        if(parsed.format!=='mizan-nafs-backup'||parsed.version!==1||!parsed.state||typeof parsed.state!=='object'){toast('Not a compatible Mīzān backup.');return;}
        if(!confirm('Replace your current private data with this backup? Export your current data first if needed.'))return;
        S=sanitized(parsed.state);save();render();toast('Your backup has been restored.');
      }).catch(()=>toast('Could not read the selected file.'));
    }
  });
  document.addEventListener('input',ev=>{
    const el=ev.target;
    if(el.dataset.action==='daily-note'){S.notes[S.journalDate||today()]=el.value;save();}
    if(el.dataset.action==='weekly-note'){S.weeklyNotes[S.weekIndex+1]=el.value;save();}
    if(el.dataset.action==='monthly-note'){S.monthlyNotes[el.dataset.month]=el.value;save();}
  });
  const menu=document.getElementById('menu-button');menu.addEventListener('click',()=>{const nav=document.getElementById('mobile-nav');nav.hidden=!nav.hidden;menu.setAttribute('aria-expanded',String(!nav.hidden));});
  window.addEventListener('hashchange',()=>{inquiryOpen=false;render();window.scrollTo({top:0,behavior:'instant'});});
  render();
})();
