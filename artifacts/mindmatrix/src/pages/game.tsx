import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useRoute } from 'wouter';
import { ArrowLeft, ArrowRight, Check, Clock3, Code2, RotateCcw, Sparkles, Target } from 'lucide-react';
import { games, useStore } from '@/lib/local-data';

type Difficulty = 'Easy' | 'Normal' | 'Hard';
type Result = { score: number; accuracy: number; duration: number };
const symbols = ['◒','◈','◉','✳','△','⬡','✦','◌'];
const sequences = [
  {shown:'2, 4, 8, 16, ?', answer:'32', rule:'Double each time'},
  {shown:'3, 6, 11, 18, ?', answer:'27', rule:'Add consecutive odd numbers'},
  {shown:'1, 1, 2, 3, 5, ?', answer:'8', rule:'Each number is the sum of the last two'},
  {shown:'5, 10, 20, 40, ?', answer:'80', rule:'Double each time'},
  {shown:'2, 5, 10, 17, ?', answer:'26', rule:'Add 3, 5, 7, then 9'},
];
const patterns = [
  {items:['●','●','●','■','●'],answer:3},{items:['△','△','▽','△','△'],answer:2},
  {items:['◆','◆','◆','◆','◇'],answer:4},{items:['○','○','○','●','○'],answer:3},
  {items:['⬡','⬡','⬡','⬡','⬢'],answer:4},{items:['↑','↑','→','↑','↑'],answer:2},
  {items:['✦','✦','✧','✦','✦'],answer:2},{items:['□','□','□','□','▣'],answer:4},
];
function shuffle<T>(items:T[]) { return [...items].sort(()=>Math.random()-.5); }
export function GamePage() {
 const [,params]=useRoute('/games/:id'); const id=params?.id??'memory-match'; const game=games.find(g=>g.id===id)??games[0];
 const [,setLocation]=useLocation(); const store=useStore(); const [difficulty,setDifficulty]=useState<Difficulty>('Normal'); const [phase,setPhase]=useState<'ready'|'playing'|'result'>('ready');
 const [seconds,setSeconds]=useState(0); const [result,setResult]=useState<Result|null>(null); const [correct,setCorrect]=useState(0); const [attempts,setAttempts]=useState(0); const [round,setRound]=useState(0); const sessionStartRef=useRef(0);const signalStartRef=useRef(0);
  const activeRef=useRef(false); const signalTimerRef=useRef<number|null>(null); const pairTimerRef=useRef<number|null>(null); const flashTimerRef=useRef<number|null>(null);
 const [cards,setCards]=useState<{value:string;revealed:boolean;matched:boolean}[]>([]); const [opened,setOpened]=useState<number[]>([]);
 const [signal,setSignal]=useState<'wait'|'ready'|'go'|'done'>('wait'); const [reaction,setReaction]=useState<number|null>(null); const [reactionTimes,setReactionTimes]=useState<number[]>([]);
 const [sequenceIndex,setSequenceIndex]=useState(0); const [answer,setAnswer]=useState(''); const [patternIndex,setPatternIndex]=useState(0); const [flash,setFlash]=useState(false);
 const targetCount=difficulty==='Easy'?4:difficulty==='Hard'?8:6;
  const clearTimer=(timer:{current:number|null})=>{if(timer.current!==null){window.clearTimeout(timer.current);timer.current=null;}};
  const reset=()=>{activeRef.current=false;clearTimer(signalTimerRef);clearTimer(pairTimerRef);clearTimer(flashTimerRef);setPhase('ready');setSeconds(0);setResult(null);setCorrect(0);setAttempts(0);setRound(0);setOpened([]);setSignal('wait');setReaction(null);setReactionTimes([]);setSequenceIndex(0);setAnswer('');setPatternIndex(0);};
  useEffect(()=>()=>{clearTimer(signalTimerRef);clearTimer(pairTimerRef);clearTimer(flashTimerRef);},[]);
 const begin=()=>{
    reset(); activeRef.current=true;sessionStartRef.current=Date.now();signalStartRef.current=sessionStartRef.current;setPhase('playing');
   if(id==='memory-match'){const pairs=difficulty==='Easy'?4:difficulty==='Hard'?8:6;setCards(shuffle([...symbols.slice(0,pairs),...symbols.slice(0,pairs)]).map(value=>({value,revealed:false,matched:false})));}
   if(id==='reaction-test') scheduleSignal(0);
   if(id==='number-sequence')setSequenceIndex(Math.floor(Math.random()*sequences.length));
   if(id==='pattern-recognition')setPatternIndex(0);
 };
 useEffect(()=>{if(phase!=='playing')return; const timer=window.setInterval(()=>{const elapsed=Math.floor((Date.now()-sessionStartRef.current)/1000);setSeconds(elapsed);if(elapsed>=60)finish(correct,Math.max(1,attempts));},200);return()=>clearInterval(timer);},[phase,correct,attempts,id]);
 useEffect(()=>{if(phase==='playing'&&id==='memory-match'&&cards.length>0&&cards.every(c=>c.matched))finish(correct,Math.max(1,attempts));},[cards,phase,correct,attempts]);
 const finish=(right:number,total:number)=>{
   if(phase!=='playing')return;
    activeRef.current=false;clearTimer(signalTimerRef);clearTimer(pairTimerRef);
   const duration=Math.max(1,Math.round((Date.now()-sessionStartRef.current)/1000));
   const accuracy=total?Math.round((right/total)*100):0;
   let score=id==='reaction-test'?Math.max(0,Math.round(2400-(reactionTimes.reduce((a,b)=>a+b,0)/Math.max(1,reactionTimes.length))*1.25)):Math.round(right*120+accuracy*2-duration*2);
   score=Math.max(0,score+(difficulty==='Hard'?180:difficulty==='Easy'?0:80));
   const final={score,accuracy,duration}; setResult(final);setPhase('result');
   store.saveRun({game:id,score,accuracy,duration,difficulty});
 };
 function scheduleSignal(index:number) {
    clearTimer(signalTimerRef);setSignal('wait');const delay=850+Math.random()*2200;
    signalTimerRef.current=window.setTimeout(()=>{signalTimerRef.current=null;if(!activeRef.current)return;setSignal('go');signalStartRef.current=Date.now();},delay);
 }
 const cardClick=(i:number)=>{
   if(phase!=='playing'||cards[i].matched||cards[i].revealed||opened.length===2)return;
   const next=[...cards];next[i]={...next[i],revealed:true};const open=[...opened,i];setCards(next);setOpened(open);
   if(open.length===2){setAttempts(x=>x+1);const matched=next[open[0]].value===next[open[1]].value;
      clearTimer(pairTimerRef);pairTimerRef.current=window.setTimeout(()=>{pairTimerRef.current=null;setCards(old=>old.map((c,j)=>open.includes(j)?{...c,revealed:matched,matched}:c));setOpened([]);if(matched)setCorrect(x=>x+1);},matched?360:700);
   }
 };
 const reactClick=()=>{
    if(signal==='wait'){activeRef.current=false;clearTimer(signalTimerRef);setSignal('done');const duration=Math.max(1,Math.round((Date.now()-sessionStartRef.current)/1000));const accuracy=Math.round(correct/Math.max(1,attempts+1)*100);const final={score:0,accuracy,duration};setResult(final);setPhase('result');store.saveRun({game:id,score:0,accuracy,duration,difficulty});return;}
   if(signal!=='go')return;
   const time=Date.now()-signalStartRef.current;const list=[...reactionTimes,time];setReactionTimes(list);setReaction(time);setCorrect(x=>x+1);setAttempts(x=>x+1);
    if(list.length>=targetCount){activeRef.current=false;const accuracy=100;const duration=Math.round((Date.now()-sessionStartRef.current)/1000);const avg=Math.round(list.reduce((a,b)=>a+b,0)/list.length);const final={score:Math.max(0,Math.round(2400-avg*1.25)+(difficulty==='Hard'?180:0)),accuracy,duration};setResult(final);setPhase('result');store.saveRun({game:id,score:final.score,accuracy,duration,difficulty});setSignal('done');}
   else {setSignal('done');window.setTimeout(()=>scheduleSignal(list.length),550);}
 };
  const submitSequence=(e:React.FormEvent)=>{e.preventDefault();if(!answer.trim())return;const ok=Number(answer)===Number(sequences[sequenceIndex].answer);setAttempts(x=>x+1);if(ok)setCorrect(x=>x+1);setFlash(ok);clearTimer(flashTimerRef);flashTimerRef.current=window.setTimeout(()=>{flashTimerRef.current=null;setFlash(false);},450);setAnswer('');if(round+1>=5){const right=correct+(ok?1:0);finish(right,5);}else {setRound(x=>x+1);setSequenceIndex(Math.floor(Math.random()*sequences.length));}};
 const selectPattern=(i:number)=>{if(phase!=='playing')return;const ok=i===patterns[patternIndex].answer;const right=correct+(ok?1:0);setAttempts(x=>x+1);if(ok)setCorrect(right);if(round+1>=targetCount){setRound(x=>x+1);finish(right,targetCount);}else{setRound(x=>x+1);setPatternIndex(x=>(x+1)%patterns.length);}};
  const sampleId=id==='reaction-test'?'score-calculation':id==='number-sequence'?'sequence-validation':id==='pattern-recognition'?'pattern-match':'result-evaluation';
 const gameLink=`/lab?game=${id}&score=${result?.score??0}&sample=${sampleId}`;
 return <div className="page-stack game-page">
  <div className="game-back"><Link href="/" className="back-link" data-testid="link-back-challenges"><ArrowLeft size={15}/> All challenges</Link><span className={`game-type ${game.color}`}>{game.skill}</span></div>
  <div className="game-heading"><div><div className="eyebrow">TRAINING ROOM / {game.skill.toUpperCase()}</div><h1>{game.title}</h1><p>{game.description}</p></div><span className={`game-heading-icon ${game.color}`}>{game.icon}</span></div>
  <div className="game-play-layout"><section className="panel game-stage">
     {phase==='ready'&&<div className="game-ready"><span className={`ready-icon ${game.color}`}>{game.icon}</span><span className="eyebrow">READY WHEN YOU ARE</span><h2>{id==='memory-match'?'Keep the pairs in mind.':id==='reaction-test'?'Wait for the green. Then move.':id==='number-sequence'?'Find the rule. Finish the line.':'Find what breaks the pattern.'}</h2><p>{id==='memory-match'?'Flip two tiles at a time. Match every pair before the clock runs out.':id==='reaction-test'?`${targetCount} signals. Tap only when the target turns mint. An early tap ends the run.`:id==='number-sequence'?'Solve five short sequences. Type the missing number and submit.': `${targetCount} quick scans. Select the one symbol that does not belong.`}</p><button className="button-primary" onClick={begin} data-testid="button-begin-game">Start challenge <ArrowRight size={16}/></button></div>}
    {phase==='playing'&&<div className="active-game">
       <div className="game-hud"><span className="hud-progress"><i style={{width:`${id==='reaction-test'?Math.min(100,round/targetCount*100):id==='memory-match'?Math.max(8,correct/(cards.length/2)*100):Math.min(100,round/(id==='number-sequence'?5:targetCount)*100)}%`}}/></span><span className="hud-round">{id==='reaction-test'?`${reactionTimes.length}/${targetCount}`:id==='memory-match'?`${correct}/${cards.length/2} pairs`:`${round+1}/${id==='number-sequence'?5:targetCount}`}</span><span className="hud-time"><Clock3 size={14}/>{seconds}s</span></div>
      {id==='memory-match'&&<div className={`memory-board cols-${cards.length>12?4:4}`}>{cards.map((card,i)=><button key={i} className={`memory-tile ${card.revealed||card.matched?'revealed':''} ${card.matched?'matched':''}`} onClick={()=>cardClick(i)} aria-label={card.revealed?'Revealed tile':'Hidden tile'} data-testid={`button-memory-tile-${i}`}>{card.revealed||card.matched?card.value:<span>?</span>}</button>)}</div>}
      {id==='reaction-test'&&<div className="reaction-field"><button className={`reaction-target ${signal==='go'?'go':''} ${signal==='done'?'wait':''}`} onClick={reactClick} data-testid="button-reaction-target">{signal==='wait'?'Wait for it':signal==='go'?'TAP NOW':signal==='done'?'Next signal':'Start over'}</button><p>{signal==='wait'?'Keep your finger ready.':signal==='go'?'As fast as you can.':'Tap only when it turns mint.'}</p>{reaction!==null&&<span className="reaction-result">{reaction} ms</span>}</div>}
      {id==='number-sequence'&&<div className={`sequence-game ${flash?'flash':''}`}><span className="eyebrow">WHAT COMES NEXT?</span><div className="sequence-numbers">{sequences[sequenceIndex].shown.split(', ').map((n,i)=><span key={i}>{n}</span>)}<b>?</b></div><form className="answer-form" onSubmit={submitSequence}><input autoFocus inputMode="numeric" value={answer} onChange={e=>setAnswer(e.target.value)} placeholder="Your number" aria-label="Missing number" data-testid="input-sequence-answer"/><button className="button-primary" type="submit" data-testid="button-submit-sequence">Check <ArrowRight size={14}/></button></form><small>The rule is yours to find.</small></div>}
      {id==='pattern-recognition'&&<div className="pattern-game"><span className="eyebrow">WHICH ONE IS DIFFERENT?</span><div className="pattern-items">{patterns[patternIndex].items.map((item,i)=><button key={i} className={`pattern-item pattern-${i}`} onClick={()=>selectPattern(i)} data-testid={`button-pattern-choice-${i}`}>{item}</button>)}</div><small>Scan {round+1} of {targetCount} · Tap the symbol that breaks the set.</small></div>}
    </div>}
    {phase==='result'&&result&&<div className="game-result"><span className="result-check"><Check size={23}/></span><span className="eyebrow">CHALLENGE COMPLETE</span><h2>Good work. That counts.</h2><p>Your run is saved in your local training history.</p><div className="result-stats"><div><strong>{result.score}</strong><small>SCORE</small></div><div><strong>{result.accuracy}%</strong><small>ACCURACY</small></div><div><strong>{result.duration}s</strong><small>TIME</small></div></div><div className="result-actions"><button className="button-primary" onClick={begin} data-testid="button-replay-game"><RotateCcw size={15}/> Play again</button><Link href={gameLink} className="outline-button" data-testid="link-evaluate-assembly"><Code2 size={15}/> Evaluate in 8085 lab <ArrowRight size={14}/></Link></div></div>}
   </section>
   <aside className="game-aside"><section className="panel setup-panel"><span className="eyebrow">SESSION SETUP</span><h3>Set your pace.</h3><div className="difficulty-options">{(['Easy','Normal','Hard'] as Difficulty[]).map(d=><button key={d} className={difficulty===d?'selected':''} disabled={phase==='playing'} onClick={()=>setDifficulty(d)} data-testid={`button-difficulty-${d.toLowerCase()}`}>{d}{difficulty===d&&<Check size={13}/>}</button>)}</div><div className="setup-divider"/><div className="setup-line"><Clock3 size={15}/><span>Session length</span><b>{id==='reaction-test'?`${targetCount} responses`:id==='memory-match'?'60 sec':id==='number-sequence'?'5 puzzles':`${targetCount} scans`}</b></div><div className="setup-line"><Target size={15}/><span>Skill in focus</span><b>{game.skill}</b></div></section><section className="tip-card"><span><Sparkles size={15}/></span><div><b>A small reminder</b><p>{id==='reaction-test'?'Stay relaxed; tension rarely makes you faster.':id==='memory-match'?'Say the positions in your head as you reveal them.':id==='number-sequence'?'Look at how the gaps change, not just the numbers.':'Scan the whole row before picking a detail.'}</p></div></section><Link href="/dashboard" className="subtle-link side-progress" data-testid="link-game-progress">View your progress <ArrowRight size={14}/></Link></aside>
  </div>
 </div>;
}
