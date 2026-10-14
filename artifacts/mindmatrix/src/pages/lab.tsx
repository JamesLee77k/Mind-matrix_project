import { useState } from 'react';
import { Link } from 'wouter';
import { Activity, ArrowLeft, ArrowRight, Check, ChevronDown, CircleAlert, Cpu, Play, RotateCcw, SkipBack, SkipForward, Terminal, Zap } from 'lucide-react';
import { assemble, createMachine, runMachine, stepMachine, type AssembledProgram, type CpuState, type PortOutput, type TraceEntry } from '@/emulator8085/engine';
import { samplePrograms, type SampleProgram } from '@/assembly/programs';

const samples: SampleProgram[] = samplePrograms;

function gameLabel(id: string) {
  return id.replaceAll('-', ' ').replace(/^./, (letter) => letter.toUpperCase());
}

function formatHex(value: number, digits = 2) {
  return value.toString(16).toUpperCase().padStart(digits, '0');
}

function getSampleForGame(game: string) {
  if (game === 'reaction-test') return 'score-calculation';
  if (game === 'number-sequence') return 'sequence-validation';
  if (game === 'pattern-recognition') return 'pattern-match';
  if (game === 'memory-match') return 'result-evaluation';
  return '';
}

export function LabPage() {
  const query = new URLSearchParams(window.location.search);
  const requestedGame = query.get('game') ?? '';
  const scoreInput = Number(query.get('score') ?? 0);
  const scoreByte = Number.isFinite(scoreInput) ? ((scoreInput % 256) + 256) % 256 : 0;
  const suggestedSample = getSampleForGame(requestedGame) || samples[0]?.id || '';
  const [sampleId, setSampleId] = useState(query.get('sample') ?? suggestedSample);
  const sample = samples.find((item) => item.id === sampleId) ?? samples[0];
  const [source, setSource] = useState(sample?.source ?? '');
  const [testInput, setTestInput] = useState(String(query.has('score') ? scoreByte : sample?.testPorts[0] ?? 0));
  const [secondaryInput, setSecondaryInput] = useState(String(sample?.testPorts[1] ?? 0));
  const [inputPort, setInputPort] = useState('00');
  const [cpuState, setCpuState] = useState<CpuState | null>(null);
  const [assemblyError, setAssemblyError] = useState('');
  const [assembledProgram, setAssembledProgram] = useState<AssembledProgram | null>(null);
  const [memoryAddress, setMemoryAddress] = useState('0000');

  const clearExecution = () => {
    setCpuState(null);
    setAssembledProgram(null);
    setAssemblyError('');
  };

  const changeSource = (value: string) => {
    setSource(value);
    clearExecution();
  };

  const changeSample = (id: string) => {
    const nextSample = samples.find((item) => item.id === id);
    setSampleId(id);
    setSource(nextSample?.source ?? '');
    setTestInput(String(query.has('score') ? scoreByte : nextSample?.testPorts[0] ?? 0));
    setSecondaryInput(String(nextSample?.testPorts[1] ?? 0));
    clearExecution();
  };

  const assembleSource = (): AssembledProgram | null => {
    try {
      const program = assemble(source);
      setAssembledProgram(program);
      setAssemblyError('');
      return program;
    } catch (error) {
      setAssembledProgram(null);
      setCpuState(null);
      setAssemblyError(error instanceof Error ? error.message : String(error));
      return null;
    }
  };

  const createInitialState = (): CpuState | null => {
    const program = assembleSource();
    if (!program) return null;
    try {
      const value = Number(testInput);
      const secondValue = Number(secondaryInput);
      const port = Number.parseInt(inputPort, 16);
      if (!Number.isInteger(value) || value < 0 || value > 255) {
        throw new Error('The first test input must be a whole number from 0 to 255.');
      }
      if (!Number.isInteger(secondValue) || secondValue < 0 || secondValue > 255) {
        throw new Error('The second test input must be a whole number from 0 to 255.');
      }
      if (!Number.isInteger(port) || port < 0 || port > 255) {
        throw new Error('Enter a hexadecimal input port from 00H to FFH.');
      }
      const initialState = createMachine(program, {
        registers: { A: value },
        ports: { ...sample?.testPorts, [port]: value, 1: secondValue },
      });
      setAssemblyError('');
      return initialState;
    } catch (error) {
      setCpuState(null);
      setAssemblyError(error instanceof Error ? error.message : String(error));
      return null;
    }
  };

  const assembleAndRun = () => {
    const initialState = createInitialState();
    if (!initialState) return;
    const nextState = runMachine(initialState, 500);
    setCpuState(nextState);
    setAssemblyError(nextState.error ?? '');
  };

  const step = () => {
    const initialState = cpuState ?? createInitialState();
    if (!initialState) return;
    const nextState = cpuState ? stepMachine(initialState) : stepMachine(initialState);
    setCpuState(nextState);
    setAssemblyError(nextState.error ?? '');
  };

  const run = () => {
    const initialState = cpuState ?? createInitialState();
    if (!initialState) return;
    const nextState = runMachine(initialState, 500);
    setCpuState(nextState);
    setAssemblyError(nextState.error ?? '');
  };

  const setMemoryAddressFromInput = (value: string) => {
    const digits = value.replace(/[^0-9a-f]/gi, '').slice(0, 4).toUpperCase();
    const address = Number.parseInt(digits || '0', 16);
    setMemoryAddress(formatHex(Math.min(address, 0xff00), 4));
  };

  const memory = cpuState?.memory;
  const startAddress = Math.min(
    Math.max(Number.parseInt(memoryAddress || '0', 16) || 0, 0),
    Math.max(0, (memory?.length ?? 256) - 256),
  );
  const trace: TraceEntry[] = cpuState?.trace ?? [];
  const output: PortOutput[] = cpuState?.outputs ?? [];
  const registers = cpuState?.registers ?? { A: 0, B: 0, C: 0, D: 0, E: 0, H: 0, L: 0, SP: 0xffff };
  const flags = cpuState?.flags ?? { sign: false, zero: false, auxiliaryCarry: false, parity: false, carry: false };

  return (
    <div className="page-stack lab-page">
      <div className="game-back">
        <Link href="/" className="back-link" data-testid="link-lab-home"><ArrowLeft size={15} /> Back to practice</Link>
        <span className="lab-status"><span className="live-dot" /> LOCAL 8085 EMULATOR</span>
      </div>
      <div className="game-heading lab-heading">
        <div><div className="eyebrow">ASSEMBLY WORKBENCH / INSTRUCTION-LEVEL</div><h1>8085 assembly lab<span className="violet-dot">.</span></h1><p>Change the program. Feed it a score. Watch each instruction do its work.</p></div>
        <div className="cpu-mark"><Cpu size={28} /><span>8085<br />COMPATIBLE</span></div>
      </div>
      {requestedGame && (
        <div className="lab-score-context">
          <span><Check size={15} /></span>
          <div><b>Score loaded as a test input</b><small>{gameLabel(requestedGame)} · 8-bit test value in A and port {inputPort}H = {testInput}</small></div>
          <Link href={`/games/${requestedGame}`} className="subtle-link" data-testid="link-return-game">Return to challenge <ArrowRight size={13} /></Link>
        </div>
      )}
      <div className="lab-toolbar">
        <label className="select-wrap">
          <span>EXAMPLE</span>
          <select value={sampleId} onChange={(event) => changeSample(event.target.value)} data-testid="select-assembly-example">
            {samples.length
              ? samples.map((item) => <option value={item.id} key={item.id}>{item.title}</option>)
              : <option value="">No sample programs available</option>}
          </select>
          <ChevronDown size={14} />
        </label>
        <div className="toolbar-spacer" />
        <button className="toolbar-button" onClick={clearExecution} data-testid="button-reset-machine"><RotateCcw size={14} /> Reset</button>
        <button className="button-primary run-button" onClick={assembleAndRun} disabled={!source.trim()} data-testid="button-run-program">
          <Play size={14} fill="currentColor" /> {cpuState ? 'Assemble & run again' : 'Assemble & run'}
        </button>
      </div>

      <div className="lab-workspace">
        <section className="editor-panel panel">
          <div className="panel-heading editor-heading">
            <div><span className="eyebrow">SOURCE CODE</span><h3>{sample?.title ?? 'Assembly source'}</h3></div>
            <span className="code-lang">8085 ASM</span>
          </div>
          <div className="editor-wrap">
            <div className="line-numbers">{source.split('\n').map((_, index) => <span key={index}>{String(index + 1).padStart(2, '0')}</span>)}</div>
            <textarea className="assembly-editor" spellCheck={false} value={source} onChange={(event) => changeSource(event.target.value)} aria-label="8085 assembly source code" data-testid="input-assembly-source" />
            <div className="editor-micro">TAB · EDITABLE SAMPLE</div>
          </div>
          <div className="editor-footer">
            <span><i className="live-dot" /> {source.split('\n').filter((line) => line.trim() && !line.trim().startsWith(';')).length} source lines</span>
            <span>{sample?.description}</span>
          </div>
        </section>

        <section className="machine-panel panel">
          <div className="panel-heading machine-heading">
            <div><span className="eyebrow">INPUT / EXECUTION</span><h3>Machine controls</h3></div>
            <span className={`machine-lamp ${cpuState?.halted ? 'halted' : cpuState ? 'running' : ''}`} />
          </div>
          <div className="input-controls">
            <label><span>TEST INPUT · A / PORT {inputPort || '00'}H</span><div className="input-with-unit"><input type="number" min="0" max="255" value={testInput} onChange={(event) => setTestInput(event.target.value)} data-testid="input-test-score" /><small>DEC</small></div></label>
            <label><span>PORT ADDRESS</span><div className="input-with-unit"><input value={inputPort} maxLength={2} onChange={(event) => setInputPort(event.target.value.replace(/[^0-9a-f]/gi, '').toUpperCase())} data-testid="input-port-address" /><small>HEX</small></div></label>
            <label><span>TEST INPUT · PORT 01H</span><div className="input-with-unit"><input type="number" min="0" max="255" value={secondaryInput} onChange={(event) => setSecondaryInput(event.target.value)} data-testid="input-test-port-01" /><small>DEC</small></div></label>
          </div>
          <div className="execution-buttons">
            <button className="execution-step" onClick={step} disabled={!!cpuState?.halted} data-testid="button-step-instruction"><SkipForward size={15} /> Step</button>
            <button className="execution-run" onClick={run} disabled={!!cpuState?.halted} data-testid="button-run-machine"><Play size={14} /> Run</button>
          </div>
          <div className="machine-state">
            <div className="state-title"><span>CPU STATE</span><b>{cpuState?.halted ? 'HALTED' : cpuState ? 'ACTIVE' : 'IDLE'}</b></div>
            <div className="register-grid" data-testid="data-machine-registers">
              {Object.entries(registers).map(([register, value]) => (
                <div key={register} className="register"><small>{register}</small><b>{formatHex(Number(value))}</b><i>{Number(value)}</i></div>
              ))}
            </div>
            <div className="flag-row">
              {Object.entries({ S: flags.sign, Z: flags.zero, AC: flags.auxiliaryCarry, P: flags.parity, CY: flags.carry }).map(([name, value]) => (
                <span className={value ? 'flag-on' : ''} key={name}>{name}<i>{value ? '1' : '0'}</i></span>
              ))}
            </div>
            <div className="pc-readout"><span>PROGRAM COUNTER</span><b>{formatHex(cpuState?.programCounter ?? 0, 4)}<small>H</small></b><span>STEP <b>{cpuState?.steps ?? 0}</b></span></div>
          </div>
        </section>
      </div>

      {assemblyError && (
        <div className="lab-error" role="alert" data-testid="status-assembly-error">
          <CircleAlert size={17} /><div><b>Execution stopped</b><span>{assemblyError}</span></div>
          <button onClick={() => setAssemblyError('')} aria-label="Dismiss error" data-testid="button-dismiss-error">×</button>
        </div>
      )}

      <section className="panel memory-panel">
        <div className="panel-heading memory-heading">
          <div><span className="eyebrow">ADDRESS SPACE / 64 KB</span><h3>Memory viewer</h3></div>
          <span className="memory-live" data-testid="status-memory-viewer">{cpuState ? 'LIVE CPU MEMORY' : 'WAITING FOR CPU STATE'}</span>
        </div>
        <div className="memory-controls">
          <label htmlFor="memory-address">START ADDRESS</label>
          <div className="memory-address-control">
            <input id="memory-address" value={memoryAddress} onChange={(event) => setMemoryAddressFromInput(event.target.value)} placeholder="0000" inputMode="text" maxLength={4} aria-label="Memory viewer start address in hexadecimal" data-testid="input-memory-address" />
            <span>HEX</span>
          </div>
          <button className="toolbar-button" onClick={() => setMemoryAddress(formatHex(Math.max(0, startAddress - 256), 4))} disabled={!memory || startAddress === 0} data-testid="button-memory-previous" aria-label="Show previous 256 memory bytes"><SkipBack size={14} /> Previous</button>
          <button className="toolbar-button" onClick={() => setMemoryAddress(formatHex(Math.min(memory!.length - 256, startAddress + 256), 4))} disabled={!memory || startAddress >= memory.length - 256} data-testid="button-memory-next" aria-label="Show next 256 memory bytes">Next <SkipForward size={14} /></button>
        </div>
        {memory ? (
          <div className="memory-scroll" data-testid="data-memory-viewer">
            <div className="memory-grid">
              <div className="memory-grid-header"><span>ADDRESS</span>{Array.from({ length: 16 }, (_, index) => <span key={index}>{formatHex(index)}</span>)}</div>
              {Array.from({ length: 16 }, (_, row) => {
                const address = startAddress + row * 16;
                return (
                  <div className="memory-grid-row" key={address} data-testid={`row-memory-${formatHex(address, 4)}`}>
                    <b>{formatHex(address, 4)}</b>
                    {Array.from({ length: 16 }, (_, column) => {
                      const cellAddress = address + column;
                      const byte = memory[cellAddress];
                      return (
                        <span className={`memory-byte ${cellAddress === cpuState?.programCounter ? 'program-counter-byte' : ''}`} key={cellAddress} data-testid={`byte-memory-${formatHex(cellAddress, 4)}`} aria-label={`Address ${formatHex(cellAddress, 4)} hex contains ${formatHex(byte)}`}>
                          {formatHex(byte)}
                        </span>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="memory-empty" data-testid="empty-memory-viewer"><span><Cpu size={17} /></span><b>Memory appears when the CPU is initialized.</b><small>Step or run the program to inspect its loaded bytes and live state.</small></div>
        )}
        <div className="memory-legend"><span><i className="program-counter-key" /> Program counter</span><small>Bytes shown directly from CpuState.memory. Program code is loaded at address 0000H.</small></div>
      </section>

      <div className="lab-output-grid">
        <section className="panel trace-panel">
          <div className="panel-heading"><div><span className="eyebrow">INSTRUCTION TRACE</span><h3>What the processor did</h3></div><span className="trace-count">{trace.length} STEPS</span></div>
          {trace.length ? (
            <div className="trace-list" data-testid="data-instruction-trace">
              {trace.map((entry: TraceEntry, index) => (
                <div className="trace-entry" key={`${entry.address}-${index}`}>
                  <span className="trace-index">{String(index + 1).padStart(2, '0')}</span>
                  <span className="trace-pc">{formatHex(entry.address, 4)}</span>
                  <code>{entry.assembly}</code>
                  <span className="trace-op">{entry.opcode.map((byte) => formatHex(byte)).join(' ')}</span>
                  <span className="trace-after">A <b>{formatHex(entry.afterRegisters.A)}</b></span>
                </div>
              ))}
            </div>
          ) : (
            <div className="trace-empty"><span><Terminal size={18} /></span><b>{assembledProgram ? 'Program assembled. Ready to execute.' : 'The trace is waiting.'}</b><small>Assemble and run or step through one instruction at a time.</small></div>
          )}
        </section>
        <section className="panel output-panel">
          <div className="panel-heading"><div><span className="eyebrow">PROGRAM OUTPUT</span><h3>Result port</h3></div><Activity size={16} className="muted-icon" /></div>
          {output.length ? (
            <div className="output-list" data-testid="data-machine-outputs">
              {output.map((item: PortOutput, index) => (
                <div key={`${item.port}-${index}`}><span>PORT {formatHex(item.port)}H</span><b>{item.value} &lt;{formatHex(item.value)}H&gt;</b></div>
              ))}
            </div>
          ) : (
            <div className="output-empty"><span className="output-dash">—</span><b>{cpuState?.halted ? 'Program halted without output' : 'No output yet'}</b><small>Only real emulator output is shown here.</small></div>
          )}
          <div className="output-note"><Zap size={13} /> No simulated results. Output comes from executed instructions.</div>
        </section>
      </div>
      <section className="lab-footnote"><Cpu size={17} /><p><b>About this processor.</b> This workbench runs the documented 8085-compatible instruction subset. Unsupported assembly or execution errors are shown directly; the emulator never invents output.</p></section>
    </div>
  );
}
