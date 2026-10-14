export type RegisterName = "A" | "B" | "C" | "D" | "E" | "H" | "L";
export type RegisterPair = "B" | "D" | "H" | "SP";

export interface Registers {
  A: number;
  B: number;
  C: number;
  D: number;
  E: number;
  H: number;
  L: number;
  SP: number;
}

export interface CpuFlags {
  sign: boolean;
  zero: boolean;
  auxiliaryCarry: boolean;
  parity: boolean;
  carry: boolean;
}

export interface AssembledInstruction {
  address: number;
  bytes: number[];
  mnemonic: string;
  sourceLine: number;
  source: string;
}

export interface AssembledProgram {
  source: string;
  bytes: Uint8Array;
  instructions: AssembledInstruction[];
  labels: Record<string, number>;
}

export interface TraceEntry {
  address: number;
  opcode: number[];
  assembly: string;
  sourceLine: number;
  beforeRegisters: Registers;
  afterRegisters: Registers;
  beforeFlags: CpuFlags;
  afterFlags: CpuFlags;
}

export interface PortOutput {
  port: number;
  value: number;
}

export interface CpuState {
  registers: Registers;
  flags: CpuFlags;
  memory: Uint8Array;
  programCounter: number;
  halted: boolean;
  steps: number;
  trace: TraceEntry[];
  outputs: PortOutput[];
  inputPorts: Record<number, number>;
  error?: string;
}

export interface MachineInputs {
  registers?: Partial<Registers>;
  ports?: Record<number, number>;
  memory?: Record<number, number>;
}

interface ParsedLine {
  address: number;
  mnemonic: string;
  operands: string[];
  sourceLine: number;
  source: string;
}

const REGISTER_CODES: Record<string, number> = {
  B: 0,
  C: 1,
  D: 2,
  E: 3,
  H: 4,
  L: 5,
  M: 6,
  A: 7,
};

const INITIAL_REGISTERS: Registers = {
  A: 0,
  B: 0,
  C: 0,
  D: 0,
  E: 0,
  H: 0,
  L: 0,
  SP: 0xffff,
};

const INITIAL_FLAGS: CpuFlags = {
  sign: false,
  zero: false,
  auxiliaryCarry: false,
  parity: true,
  carry: false,
};

export class AssemblyError extends Error {
  readonly sourceLine?: number;

  constructor(message: string, sourceLine?: number) {
    super(sourceLine ? `Line ${sourceLine}: ${message}` : message);
    this.name = "AssemblyError";
    this.sourceLine = sourceLine;
  }
}

function byteValue(value: number, description: string, line: number): number {
  if (!Number.isInteger(value) || value < 0 || value > 0xff) {
    throw new AssemblyError(`${description} must be between 00H and FFH.`, line);
  }
  return value;
}

function wordValue(value: number, description: string, line: number): number {
  if (!Number.isInteger(value) || value < 0 || value > 0xffff) {
    throw new AssemblyError(`${description} must be between 0000H and FFFFH.`, line);
  }
  return value;
}

function parseLiteral(value: string, line: number): number {
  const normalized = value.trim().toUpperCase();
  if (/^0X[0-9A-F]+$/.test(normalized)) {
    return Number.parseInt(normalized.slice(2), 16);
  }
  if (/^[0-9A-F]+H$/.test(normalized)) {
    return Number.parseInt(normalized.slice(0, -1), 16);
  }
  if (/^\d+$/.test(normalized)) {
    return Number.parseInt(normalized, 10);
  }
  throw new AssemblyError(`Expected a decimal or hexadecimal value, got "${value}".`, line);
}

function parseRegister(value: string, line: number): number {
  const register = value.trim().toUpperCase();
  const code = REGISTER_CODES[register];
  if (code === undefined) {
    throw new AssemblyError(`Unsupported register "${value}". Use A, B, C, D, E, H, L, or M.`, line);
  }
  return code;
}

function parsePair(value: string, line: number): number {
  const code: Record<string, number> = { B: 0, D: 1, H: 2, SP: 3 };
  const pair = code[value.trim().toUpperCase()];
  if (pair === undefined) {
    throw new AssemblyError(`Unsupported register pair "${value}". Use B, D, H, or SP.`, line);
  }
  return pair;
}

function operandCount(parsed: ParsedLine, count: number): void {
  if (parsed.operands.length !== count) {
    throw new AssemblyError(
      `${parsed.mnemonic} expects ${count} operand${count === 1 ? "" : "s"}.`,
      parsed.sourceLine,
    );
  }
}

function instructionSize(parsed: ParsedLine): number {
  const { mnemonic, operands } = parsed;
  switch (mnemonic) {
    case "HLT":
    case "NOP":
      operandCount(parsed, 0);
      return 1;
    case "MOV":
      operandCount(parsed, 2);
      if (operands[0].toUpperCase() === "M" && operands[1].toUpperCase() === "M") {
        throw new AssemblyError("MOV M,M is not a valid 8085 instruction.", parsed.sourceLine);
      }
      parseRegister(operands[0], parsed.sourceLine);
      parseRegister(operands[1], parsed.sourceLine);
      return 1;
    case "MVI":
      operandCount(parsed, 2);
      parseRegister(operands[0], parsed.sourceLine);
      return 2;
    case "ADD":
    case "SUB":
    case "CMP":
    case "INR":
    case "DCR":
      operandCount(parsed, 1);
      parseRegister(operands[0], parsed.sourceLine);
      return 1;
    case "LXI":
      operandCount(parsed, 2);
      parsePair(operands[0], parsed.sourceLine);
      return 3;
    case "LDA":
    case "STA":
      operandCount(parsed, 1);
      return 3;
    case "IN":
    case "OUT":
      operandCount(parsed, 1);
      return 2;
    case "JMP":
    case "JZ":
    case "JNZ":
    case "JC":
    case "JNC":
      operandCount(parsed, 1);
      return 3;
    default:
      throw new AssemblyError(
        `Unsupported instruction "${mnemonic}". See the lab guide for supported instructions.`,
        parsed.sourceLine,
      );
  }
}

function resolveWord(value: string, labels: Record<string, number>, line: number): number {
  const normalized = value.trim().toUpperCase();
  const label = labels[normalized];
  if (label === undefined && /^[A-Z_][A-Z0-9_]*$/.test(normalized)) {
    throw new AssemblyError(`Unknown label "${value.trim()}".`, line);
  }
  const address = label === undefined ? parseLiteral(value, line) : label;
  return wordValue(address, "Address", line);
}

function encode(parsed: ParsedLine, labels: Record<string, number>): number[] {
  const { mnemonic, operands, sourceLine } = parsed;
  const reg = (index: number) => parseRegister(operands[index], sourceLine);
  const immediate = (index: number) =>
    byteValue(parseLiteral(operands[index], sourceLine), "Immediate value", sourceLine);
  const addressBytes = (index: number) => {
    const address = resolveWord(operands[index], labels, sourceLine);
    return [address & 0xff, (address >> 8) & 0xff];
  };

  switch (mnemonic) {
    case "NOP":
      return [0x00];
    case "HLT":
      return [0x76];
    case "MOV":
      return [0x40 + reg(0) * 8 + reg(1)];
    case "MVI":
      return [0x06 + reg(0) * 8, immediate(1)];
    case "ADD":
      return [0x80 + reg(0)];
    case "SUB":
      return [0x90 + reg(0)];
    case "CMP":
      return [0xb8 + reg(0)];
    case "INR":
      return [0x04 + reg(0) * 8];
    case "DCR":
      return [0x05 + reg(0) * 8];
    case "LXI": {
      const pair = parsePair(operands[0], sourceLine);
      const value = wordValue(parseLiteral(operands[1], sourceLine), "Immediate value", sourceLine);
      return [0x01 + pair * 0x10, value & 0xff, (value >> 8) & 0xff];
    }
    case "LDA":
      return [0x3a, ...addressBytes(0)];
    case "STA":
      return [0x32, ...addressBytes(0)];
    case "IN":
      return [0xdb, immediate(0)];
    case "OUT":
      return [0xd3, immediate(0)];
    case "JMP":
    case "JZ":
    case "JNZ":
    case "JC":
    case "JNC": {
      const opcode: Record<string, number> = {
        JMP: 0xc3,
        JNZ: 0xc2,
        JZ: 0xca,
        JC: 0xda,
        JNC: 0xd2,
      };
      return [opcode[mnemonic], ...addressBytes(0)];
    }
    default:
      throw new AssemblyError(`Unsupported instruction "${mnemonic}".`, sourceLine);
  }
}

export function assemble(source: string): AssembledProgram {
  const labels: Record<string, number> = {};
  const parsedLines: ParsedLine[] = [];
  let address = 0;

  source.split(/\r?\n/).forEach((rawLine, index) => {
    const uncommented = rawLine.split(";")[0].trim();
    if (!uncommented) return;

    let body = uncommented;
    const labelMatch = body.match(/^([A-Za-z_][A-Za-z0-9_]*):/);
    if (labelMatch) {
      const label = labelMatch[1].toUpperCase();
      if (labels[label] !== undefined) {
        throw new AssemblyError(`Duplicate label "${labelMatch[1]}".`, index + 1);
      }
      labels[label] = address;
      body = body.slice(labelMatch[0].length).trim();
      if (!body) return;
    }

    const firstSpace = body.search(/\s/);
    const mnemonic = (firstSpace < 0 ? body : body.slice(0, firstSpace)).toUpperCase();
    const rest = firstSpace < 0 ? "" : body.slice(firstSpace).trim();
    const operands = rest ? rest.split(",").map((part) => part.trim()) : [];
    if (operands.some((part) => !part)) {
      throw new AssemblyError("Operands must be separated by commas.", index + 1);
    }

    const parsed: ParsedLine = {
      address,
      mnemonic,
      operands,
      sourceLine: index + 1,
      source: uncommented,
    };
    address += instructionSize(parsed);
    if (address > 0x10000) {
      throw new AssemblyError("Program exceeds the 64 KB 8085 address space.", index + 1);
    }
    parsedLines.push(parsed);
  });

  if (parsedLines.length === 0) {
    throw new AssemblyError("No instructions to assemble.");
  }

  const instructions = parsedLines.map((parsed) => ({
    address: parsed.address,
    bytes: encode(parsed, labels),
    mnemonic: parsed.mnemonic,
    sourceLine: parsed.sourceLine,
    source: parsed.source,
  }));
  const bytes = new Uint8Array(address);
  for (const instruction of instructions) {
    instruction.bytes.forEach((value, offset) => {
      bytes[instruction.address + offset] = value;
    });
  }
  return { source, bytes, instructions, labels };
}

function readPair(registers: Registers, pair: number): number {
  switch (pair) {
    case 0:
      return (registers.B << 8) | registers.C;
    case 1:
      return (registers.D << 8) | registers.E;
    case 2:
      return (registers.H << 8) | registers.L;
    default:
      return registers.SP;
  }
}

function writePair(registers: Registers, pair: number, value: number): void {
  const word = value & 0xffff;
  switch (pair) {
    case 0:
      registers.B = (word >> 8) & 0xff;
      registers.C = word & 0xff;
      break;
    case 1:
      registers.D = (word >> 8) & 0xff;
      registers.E = word & 0xff;
      break;
    case 2:
      registers.H = (word >> 8) & 0xff;
      registers.L = word & 0xff;
      break;
    default:
      registers.SP = word;
  }
}

function getRegister(state: CpuState, code: number): number {
  switch (code) {
    case 6:
      return state.memory[(state.registers.H << 8) | state.registers.L];
    case 7:
      return state.registers.A;
    default: {
      const name = Object.keys(REGISTER_CODES).find((key) => REGISTER_CODES[key] === code);
      return name ? state.registers[name as RegisterName] : 0;
    }
  }
}

function setRegister(state: CpuState, code: number, value: number): void {
  const result = value & 0xff;
  if (code === 6) {
    state.memory[(state.registers.H << 8) | state.registers.L] = result;
    return;
  }
  const name = Object.keys(REGISTER_CODES).find((key) => REGISTER_CODES[key] === code);
  if (name) state.registers[name as RegisterName] = result;
}

function signedZeroParity(flags: CpuFlags, result: number): void {
  const value = result & 0xff;
  flags.sign = (value & 0x80) !== 0;
  flags.zero = value === 0;
  let ones = 0;
  for (let bit = 0; bit < 8; bit += 1) {
    ones += (value >> bit) & 1;
  }
  flags.parity = ones % 2 === 0;
}

function flagsAfterSubtract(flags: CpuFlags, left: number, right: number, result: number): void {
  const value = result & 0xff;
  signedZeroParity(flags, value);
  flags.carry = left < right;
  flags.auxiliaryCarry = (left & 0x0f) < (right & 0x0f);
}

function cloneRegisters(registers: Registers): Registers {
  return { ...registers };
}

function cloneFlags(flags: CpuFlags): CpuFlags {
  return { ...flags };
}

export function createMachine(program: AssembledProgram, inputs: MachineInputs = {}): CpuState {
  const memory = new Uint8Array(0x10000);
  memory.set(program.bytes);
  for (const [address, value] of Object.entries(inputs.memory ?? {})) {
    const location = Number(address);
    if (!Number.isInteger(location) || location < 0 || location > 0xffff) {
      throw new Error(`Invalid memory address "${address}". Use a value from 0000H to FFFFH.`);
    }
    memory[location] = byteValue(value, `Memory value at ${address}`, 0);
  }
  const inputPorts: Record<number, number> = {};
  for (const [port, value] of Object.entries(inputs.ports ?? {})) {
    const portNumber = Number(port);
    if (!Number.isInteger(portNumber) || portNumber < 0 || portNumber > 0xff) {
      throw new Error(`Invalid input port "${port}". Use a value from 00H to FFH.`);
    }
    inputPorts[portNumber] = byteValue(value, `Input at port ${port}`, 0);
  }

  const registers: Registers = { ...INITIAL_REGISTERS, ...inputs.registers };
  for (const name of ["A", "B", "C", "D", "E", "H", "L"] as const) {
    if (!Number.isInteger(registers[name]) || registers[name] < 0 || registers[name] > 0xff) {
      throw new Error(`Initial register ${name} must be between 00H and FFH.`);
    }
  }
  if (!Number.isInteger(registers.SP) || registers.SP < 0 || registers.SP > 0xffff) {
    throw new Error("Initial register SP must be between 0000H and FFFFH.");
  }

  const state: CpuState = {
    registers,
    flags: { ...INITIAL_FLAGS },
    memory,
    programCounter: 0,
    halted: false,
    steps: 0,
    trace: [],
    outputs: [],
    inputPorts,
  };
  buildSourceMap(state, program);
  return state;
}

const SOURCE_BY_ADDRESS = new WeakMap<Uint8Array, Map<number, AssembledInstruction>>();

function sourceAtAddress(memory: Uint8Array, address: number): AssembledInstruction | undefined {
  return SOURCE_BY_ADDRESS.get(memory)?.get(address);
}

function buildSourceMap(state: CpuState, program?: AssembledProgram): void {
  if (!program) return;
  const map = new Map<number, AssembledInstruction>();
  for (const instruction of program.instructions) map.set(instruction.address, instruction);
  SOURCE_BY_ADDRESS.set(state.memory, map);
}

export function createMachineFromSource(source: string, inputs: MachineInputs = {}): CpuState {
  const program = assemble(source);
  return createMachine(program, inputs);
}

function nextAddress(state: CpuState, offset: number): number {
  return (state.programCounter + offset) & 0xffff;
}

function setArithmeticFlags(state: CpuState, left: number, right: number, sum: number): void {
  signedZeroParity(state.flags, sum);
  state.flags.carry = sum > 0xff;
  state.flags.auxiliaryCarry = ((left & 0x0f) + (right & 0x0f)) > 0x0f;
}

function getWord(memory: Uint8Array, address: number): number {
  return memory[address] | (memory[(address + 1) & 0xffff] << 8);
}

function registerSnapshot(registers: Registers): Registers {
  return cloneRegisters(registers);
}

function flagsSnapshot(flags: CpuFlags): CpuFlags {
  return cloneFlags(flags);
}

export function stepMachine(previous: CpuState): CpuState {
  if (previous.halted || previous.error) return previous;

  const state: CpuState = {
    ...previous,
    registers: cloneRegisters(previous.registers),
    flags: cloneFlags(previous.flags),
    trace: [...previous.trace],
    outputs: [...previous.outputs],
  };
  const address = state.programCounter;
  const opcode = state.memory[address];
  const beforeRegisters = registerSnapshot(state.registers);
  const beforeFlags = flagsSnapshot(state.flags);
  const source = sourceAtAddress(state.memory, address);
  let size = 1;
  let instructionName = source?.mnemonic ?? `DB ${opcode.toString(16).padStart(2, "0").toUpperCase()}H`;
  let branchAddress: number | undefined;

  if (opcode === 0x00) {
    instructionName = "NOP";
  } else if (opcode === 0x76) {
    instructionName = "HLT";
    state.halted = true;
  } else if (opcode >= 0x40 && opcode <= 0x7f) {
    const destination = (opcode >> 3) & 7;
    const origin = opcode & 7;
    instructionName = `MOV ${Object.keys(REGISTER_CODES).find((key) => REGISTER_CODES[key] === destination)}, ${Object.keys(REGISTER_CODES).find((key) => REGISTER_CODES[key] === origin)}`;
    setRegister(state, destination, getRegister(state, origin));
  } else if ((opcode & 0xc7) === 0x06) {
    const destination = (opcode >> 3) & 7;
    size = 2;
    instructionName = `MVI ${Object.keys(REGISTER_CODES).find((key) => REGISTER_CODES[key] === destination)}, ${state.memory[nextAddress(state, 1)].toString(16).padStart(2, "0").toUpperCase()}H`;
    setRegister(state, destination, state.memory[nextAddress(state, 1)]);
  } else if ((opcode & 0xc7) === 0x04) {
    const register = (opcode >> 3) & 7;
    const oldValue = getRegister(state, register);
    const result = (oldValue + 1) & 0xff;
    instructionName = `INR ${Object.keys(REGISTER_CODES).find((key) => REGISTER_CODES[key] === register)}`;
    setRegister(state, register, result);
    signedZeroParity(state.flags, result);
    state.flags.auxiliaryCarry = (oldValue & 0x0f) === 0x0f;
  } else if ((opcode & 0xc7) === 0x05) {
    const register = (opcode >> 3) & 7;
    const oldValue = getRegister(state, register);
    const result = (oldValue - 1) & 0xff;
    instructionName = `DCR ${Object.keys(REGISTER_CODES).find((key) => REGISTER_CODES[key] === register)}`;
    setRegister(state, register, result);
    signedZeroParity(state.flags, result);
    state.flags.auxiliaryCarry = (oldValue & 0x0f) === 0;
  } else if (opcode >= 0x80 && opcode <= 0x87) {
    const operand = getRegister(state, opcode & 7);
    const accumulator = state.registers.A;
    const sum = accumulator + operand;
    instructionName = `ADD ${Object.keys(REGISTER_CODES).find((key) => REGISTER_CODES[key] === (opcode & 7))}`;
    state.registers.A = sum & 0xff;
    setArithmeticFlags(state, accumulator, operand, sum);
  } else if (opcode >= 0x90 && opcode <= 0x97) {
    const operand = getRegister(state, opcode & 7);
    const accumulator = state.registers.A;
    const result = accumulator - operand;
    instructionName = `SUB ${Object.keys(REGISTER_CODES).find((key) => REGISTER_CODES[key] === (opcode & 7))}`;
    state.registers.A = result & 0xff;
    flagsAfterSubtract(state.flags, accumulator, operand, result);
  } else if (opcode >= 0xb8 && opcode <= 0xbf) {
    const operand = getRegister(state, opcode & 7);
    const result = state.registers.A - operand;
    instructionName = `CMP ${Object.keys(REGISTER_CODES).find((key) => REGISTER_CODES[key] === (opcode & 7))}`;
    flagsAfterSubtract(state.flags, state.registers.A, operand, result);
  } else if ((opcode & 0xcf) === 0x01) {
    const pair = (opcode >> 4) & 3;
    size = 3;
    instructionName = `LXI ${["B", "D", "H", "SP"][pair]}, ${getWord(state.memory, nextAddress(state, 1)).toString(16).padStart(4, "0").toUpperCase()}H`;
    writePair(state.registers, pair, getWord(state.memory, nextAddress(state, 1)));
  } else if ([0xc3, 0xc2, 0xca, 0xda, 0xd2].includes(opcode)) {
    size = 3;
    const target = getWord(state.memory, nextAddress(state, 1));
    const jump = opcode === 0xc3
      || (opcode === 0xc2 && !state.flags.zero)
      || (opcode === 0xca && state.flags.zero)
      || (opcode === 0xda && state.flags.carry)
      || (opcode === 0xd2 && !state.flags.carry);
    instructionName = `${({ 0xc3: "JMP", 0xc2: "JNZ", 0xca: "JZ", 0xda: "JC", 0xd2: "JNC" } as Record<number, string>)[opcode]} ${target.toString(16).padStart(4, "0").toUpperCase()}H`;
    if (jump) branchAddress = target;
  } else if (opcode === 0x3a || opcode === 0x32) {
    size = 3;
    const target = getWord(state.memory, nextAddress(state, 1));
    instructionName = `${opcode === 0x3a ? "LDA" : "STA"} ${target.toString(16).padStart(4, "0").toUpperCase()}H`;
    if (opcode === 0x3a) {
      state.registers.A = state.memory[target];
    } else {
      state.memory[target] = state.registers.A;
    }
  } else if (opcode === 0xdb) {
    size = 2;
    const port = state.memory[nextAddress(state, 1)];
    instructionName = `IN ${port.toString(16).padStart(2, "0").toUpperCase()}H`;
    state.registers.A = state.inputPorts[port] ?? 0;
  } else if (opcode === 0xd3) {
    size = 2;
    const port = state.memory[nextAddress(state, 1)];
    instructionName = `OUT ${port.toString(16).padStart(2, "0").toUpperCase()}H`;
    state.outputs.push({ port, value: state.registers.A });
  } else {
    state.halted = true;
    state.error = `Unsupported opcode ${opcode.toString(16).padStart(2, "0").toUpperCase()}H at ${address.toString(16).padStart(4, "0").toUpperCase()}H. Execution stopped.`;
  }

  state.programCounter = branchAddress ?? nextAddress(state, size);
  state.steps += 1;
  state.trace.push({
    address,
    opcode: Array.from(state.memory.slice(address, address + size)),
    assembly: source?.source ?? instructionName,
    sourceLine: source?.sourceLine ?? 0,
    beforeRegisters,
    afterRegisters: registerSnapshot(state.registers),
    beforeFlags,
    afterFlags: flagsSnapshot(state.flags),
  });
  return state;
}

export function runMachine(initial: CpuState, maxSteps = 1000): CpuState {
  if (!Number.isInteger(maxSteps) || maxSteps < 1) {
    throw new Error("Maximum instruction count must be a positive integer.");
  }
  let state = initial;
  let executed = 0;
  while (!state.halted && !state.error && executed < maxSteps) {
    state = stepMachine(state);
    executed += 1;
  }
  if (!state.halted && !state.error && executed >= maxSteps) {
    return { ...state, error: `Execution stopped after the ${maxSteps}-instruction safety limit.` };
  }
  return state;
}
