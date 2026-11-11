/* Register-a-remote-agent flow. Run: node tests/remote-agent.test.js */
const { chromium } = require('playwright');
const ok=(n,c)=>console.log((c?'PASS':'FAIL')+'  '+n);
(async()=>{
  const b=await chromium.launch({executablePath:require('./chrome-path.js')});
  const p=await (await b.newContext({colorScheme:'dark',viewport:{width:1440,height:900},deviceScaleFactor:2})).newPage();
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  p.on('console',m=>{if(m.type()==='error')errs.push('CONSOLE:'+m.text())});
  await p.goto('file://'+require('path').resolve(__dirname,'..','ask-tiq.html')); await p.waitForTimeout(1700);
  const rc=async s=>{const x=await p.locator(s).boundingBox();await p.mouse.click(x.x+x.width/2,x.y+x.height/2);};
  const txt=s=>p.evaluate(x=>document.querySelector(x)?.textContent.trim(),s);

  await rc('#addNodeBtn'); await p.waitForTimeout(300);
  await rc('.addnode-i[data-type="agent"]'); await p.waitForTimeout(800);
  await rc('#newAgentBtn'); await p.waitForTimeout(350);

  // ── the chooser ──
  const opts = await p.evaluate(()=>[...document.querySelectorAll('.na-level[data-level="kind"] .na-i')]
    .map(b=>({nm:b.querySelector('.nm').textContent, ds:b.querySelector('.ds').textContent, kind:b.dataset.kind})));
  console.log('  options:', JSON.stringify(opts,null,0));
  ok('the menu offers three kinds', opts.length===3);
  ok('they are New agent / New orchestrator / Remote agent (A2A)',
     opts[0].nm==='New agent' && opts[1].nm==='New orchestrator' && opts[2].nm==='Remote agent (A2A)');
  ok('each carries the artifact\'s description',
     /own model, tools and skills/.test(opts[0].ds) && /routes work across sub-agents/.test(opts[1].ds) &&
     /hosted outside Cogentiq/.test(opts[2].ds));
  ok('a rule separates building from connecting',
     await p.evaluate(()=>!!document.querySelector('.na-level[data-level="kind"] .na-rule')));

  // New agent still reaches the Tiq/manual choice
  await rc('.na-i[data-kind="agent"]'); await p.waitForTimeout(300);
  ok('New agent opens the build-method level', await p.evaluate(()=>
    !document.querySelector('.na-level[data-level="how"]').hidden &&
    document.querySelectorAll('.na-level[data-level="how"] .na-i').length===2));
  ok('and it can be backed out of', await (async()=>{
    await rc('#naHowBack'); await p.waitForTimeout(250);
    return p.evaluate(()=>!document.querySelector('.na-level[data-level="kind"]').hidden);
  })());

  // ── remote flow ──
  await rc('.na-i[data-kind="remote"]'); await p.waitForTimeout(450);
  ok('Remote agent opens the wizard in the right side panel', await p.evaluate(()=>{
    const w=document.getElementById('remoteWiz'), pn=document.getElementById('agentPanel');
    const wr=w.getBoundingClientRect(), pr=pn.getBoundingClientRect();
    return !w.hidden && pn.classList.contains('wiz-open') &&
           wr.left>=pr.left-1 && wr.right<=pr.right+1 && wr.width>300;
  }));
  ok('the list and search give way to it', await p.evaluate(()=>
    getComputedStyle(document.querySelector('.agent-searchwrap')).display==='none' &&
    getComputedStyle(document.getElementById('agentList')).display==='none'));
  const steps = await p.evaluate(()=>[...document.querySelectorAll('.rw-step')].map(s=>s.textContent.trim()));
  console.log('  steps:', JSON.stringify(steps));
  ok('it shows three steps: Details, Connection, Review',
     steps.length===3 && /Details/.test(steps[0]) && /Connection/.test(steps[1]) && /Review/.test(steps[2]));
  ok('step 1 is active and Back is hidden', await p.evaluate(()=>
    document.querySelector('.rw-step[data-step="1"]').classList.contains('on') &&
    document.getElementById('rwPrev').hidden));
  ok('Continue is blocked until the agent is named', await p.evaluate(()=>
    document.getElementById('rwNext').disabled &&
    /Name the agent/.test(document.getElementById('rwHint').textContent)));

  await p.locator('#rwName').fill('Bank Ops Assistant');
  await p.locator('#rwDesc').fill('Answers operational questions about accounts.');
  await p.waitForTimeout(250);
  ok('naming it unblocks Continue', await p.evaluate(()=>!document.getElementById('rwNext').disabled));
  await rc('#rwNext'); await p.waitForTimeout(400);

  // step 2
  ok('step 2 shows the three connection choices', await p.evaluate(()=>
    document.querySelector('.rw-step[data-step="2"]').classList.contains('on') &&
    document.querySelectorAll('#rwProto .rw-choice').length===3 &&
    document.querySelector('.rw-step[data-step="1"]').classList.contains('done')));
  ok('"Connect it directly" is the default and asks for an integration', await p.evaluate(()=>
    document.querySelector('.rw-choice[data-proto="direct"]').classList.contains('on') &&
    !document.querySelector('.rw-group[data-only="direct"]').hidden &&
    document.querySelector('.rw-group[data-only="a2a"]').hidden));
  ok('it blocks until an integration is picked', await p.evaluate(()=>
    document.getElementById('rwNext').disabled && /integration/i.test(document.getElementById('rwHint').textContent)));
  ok('the help panel explains the three', await (async()=>{
    await rc('#rwHelpBtn'); await p.waitForTimeout(250);
    const open = await p.evaluate(()=>!document.getElementById('rwHelp').hidden);
    await rc('#rwHelpBtn'); await p.waitForTimeout(200);
    return open;
  })());

  // switch to A2A
  await rc('.rw-choice[data-proto="a2a"]'); await p.waitForTimeout(300);
  ok('picking A2A swaps the sub-form to the server list', await p.evaluate(()=>
    !document.querySelector('.rw-group[data-only="a2a"]').hidden &&
    document.querySelector('.rw-group[data-only="direct"]').hidden &&
    document.querySelectorAll('#rwSrvPick .rw-opt').length===3));
  await rc('#rwSrvPick .rw-opt:first-child'); await p.waitForTimeout(300);
  ok('choosing a server unblocks step 2', await p.evaluate(()=>!document.getElementById('rwNext').disabled));
  await rc('#rwNext'); await p.waitForTimeout(400);

  // step 3
  ok('step 3 offers that server\'s agent cards', await p.evaluate(()=>
    document.querySelector('.rw-step[data-step="3"]').classList.contains('on') &&
    document.querySelectorAll('#rwCardPick .rw-opt').length===2));
  ok('it blocks until a card is chosen', await p.evaluate(()=>
    document.getElementById('rwNext').disabled && /agent card/i.test(document.getElementById('rwHint').textContent)));
  await rc('#rwCardPick .rw-opt:first-child'); await p.waitForTimeout(300);
  ok('six auth types are offered, Bearer by default', await p.evaluate(()=>
    document.querySelectorAll('#rwAuth .rw-radio').length===6 &&
    document.querySelector('.rw-radio[data-auth="bearer"]').classList.contains('on')));
  ok('the bearer token is required before registering', await p.evaluate(()=>
    document.getElementById('rwNext').disabled && !!document.getElementById('rwBearer')));
  await rc('.rw-radio[data-auth="apikey"]'); await p.waitForTimeout(300);
  ok('switching auth swaps the credential fields', await p.evaluate(()=>
    !!document.getElementById('rwApiKey') && !!document.getElementById('rwApiHdr') && !document.getElementById('rwBearer')));
  await rc('.rw-radio[data-auth="none"]'); await p.waitForTimeout(300);
  ok('No Auth needs no credential and unblocks', await p.evaluate(()=>
    document.getElementById('rwCreds').children.length===0 && !document.getElementById('rwNext').disabled));
  const rev = await txt('#rwReview');
  console.log('  review:', JSON.stringify(rev));
  ok('the review summarises what is being added',
     /Bank Ops Assistant/.test(rev) && /A2A server/.test(rev) && /acmebank/.test(rev) && /No Auth/.test(rev));
  ok('the final button reads Register agent', (await txt('#rwNext'))==='Register agent');
  ok('the footer keeps its buttons inside the panel at every step', await p.evaluate(()=>{
    const pn=document.getElementById('agentPanel').getBoundingClientRect();
    return [...document.querySelectorAll('.rw-foot .rw-btn')].filter(b=>!b.hidden).every(b=>{
      const r=b.getBoundingClientRect();
      return r.left>=pn.left-0.5 && r.right<=pn.right+0.5 && r.width>40;
    });
  }));

  const before = await p.evaluate(()=>document.querySelectorAll('.agent-card').length);
  await rc('#rwNext'); await p.waitForTimeout(700);
  ok('registering adds it and returns to the list', await p.evaluate(n=>
    document.querySelectorAll('.agent-card').length===n+1 &&
    document.getElementById('remoteWiz').hidden &&
    !document.getElementById('agentPanel').classList.contains('wiz-open'), before));
  ok('it lands at the top of the library', await p.evaluate(()=>
    document.querySelector('.agent-card-title').textContent==='Bank Ops Assistant'));
  ok('a toast says it is in governance review', await p.evaluate(()=>
    /governance review/.test(document.getElementById('toast').textContent)));
  ok('the Type filter can now express Remote', await p.evaluate(()=>{
    const el=document.getElementById('agentFilterBtn'); el.click(); return true;
  }) && await (async()=>{ await p.waitForTimeout(350);
    return p.evaluate(()=>[...document.querySelectorAll('.fp-opt[data-type]')].map(o=>o.dataset.type).includes('remote')); })());
  await rc('.fp-opt[data-type="remote"]'); await p.waitForTimeout(400);
  ok('filtering by Remote finds the new agent', await p.evaluate(()=>
    document.querySelectorAll('.agent-card').length===1 &&
    document.querySelector('.agent-card-title').textContent==='Bank Ops Assistant'));

  console.log(errs.length?('JS ERRORS: '+errs.join(' | ')):'NO JS ERRORS');
  await b.close();
})();
