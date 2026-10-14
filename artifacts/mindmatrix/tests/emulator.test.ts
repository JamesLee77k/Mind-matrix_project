import assert from "node:assert/strict";
import test from "node:test";

import {
  assemble,
  createMachine,
  runMachine,
  stepMachine,
} from "../src/emulator8085/engine.ts";

test("assembles, executes, and outputs an arithmetic score calculation", () => {
  const program = assemble(`
    IN 00H
    MOV B,A
    MVI A,0AH
    ADD B
    OUT 01H
    HLT
  `);
  const finalState = runMachine(createMachine(program, { ports: { 0: 0x2a } }));

  assert.equal(finalState.halted, true);
  assert.equal(finalState.registers.A, 0x34);
  assert.deepEqual(finalState.outputs, [{ port: 1, value: 0x34 }]);
  assert.equal(finalState.trace.length, 6);
});

test("steps through a real decrement-and-branch loop", () => {
  const program = assemble(`
    MVI B,03H
  LOOP:
    DCR B
    JNZ LOOP
    HLT
  `);
  let state = createMachine(program);

  state = stepMachine(state);
  assert.equal(state.registers.B, 3);
  assert.equal(state.programCounter, 2);
  assert.equal(state.trace.length, 1);

  state = runMachine(state);
  assert.equal(state.halted, true);
  assert.equal(state.registers.B, 0);
  assert.equal(state.flags.zero, true);
  assert.equal(state.trace.length, 8);
});

test("compares against a threshold and follows carry/zero branches", () => {
  const source = `
    IN 00H
    MVI B,46H
    CMP B
    JC BELOW
    JZ PASS
  PASS:
    MVI A,01H
    JMP FINISH
  BELOW:
    MVI A,00H
  FINISH:
    OUT 02H
    HLT
  `;
  const passing = runMachine(createMachine(assemble(source), { ports: { 0: 70 } }));
  const highScore = runMachine(createMachine(assemble(source), { ports: { 0: 90 } }));
  const failing = runMachine(createMachine(assemble(source), { ports: { 0: 69 } }));

  assert.deepEqual(passing.outputs, [{ port: 2, value: 1 }]);
  assert.deepEqual(highScore.outputs, [{ port: 2, value: 1 }]);
  assert.deepEqual(failing.outputs, [{ port: 2, value: 0 }]);
});

test("validates two sequence values through input ports", () => {
  const program = assemble(`
    IN 00H
    MOV B,A
    IN 01H
    CMP B
    JNZ NOT_EQUAL
    MVI A,01H
    JMP FINISH
  NOT_EQUAL:
    MVI A,00H
  FINISH:
    OUT 02H
    HLT
  `);
  const same = runMachine(createMachine(program, { ports: { 0: 0x2a, 1: 0x2a } }));
  const different = runMachine(createMachine(program, { ports: { 0: 0x2a, 1: 0x11 } }));

  assert.equal(same.outputs.at(-1)?.value, 1);
  assert.equal(different.outputs.at(-1)?.value, 0);
});

test("updates 8085 arithmetic and compare flags", () => {
  const program = assemble("MVI A,FFH\nMVI B,01H\nADD B\nHLT");
  const state = runMachine(createMachine(program));

  assert.equal(state.registers.A, 0);
  assert.equal(state.flags.zero, true);
  assert.equal(state.flags.carry, true);
  assert.equal(state.flags.auxiliaryCarry, true);
  assert.equal(state.flags.parity, true);
});

test("subtracts register values with borrow flags", () => {
  const program = assemble("MVI A,02H\nMVI B,03H\nSUB B\nHLT");
  const state = runMachine(createMachine(program));

  assert.equal(state.registers.A, 0xff);
  assert.equal(state.flags.carry, true);
  assert.equal(state.flags.sign, true);
});

test("loads and stores through the 8085 memory map", () => {
  const program = assemble("LDA 2000H\nINR A\nSTA 2001H\nHLT");
  const state = runMachine(createMachine(program, { memory: { 8192: 0x07 } }));

  assert.equal(state.registers.A, 0x08);
  assert.equal(state.memory[0x2000], 0x07);
  assert.equal(state.memory[0x2001], 0x08);
});

test("rejects unsupported instructions and invalid assembly", () => {
  assert.throws(() => assemble("ADI 05H"), /Unsupported instruction "ADI"/);
  assert.throws(() => assemble("MOV M,M"), /not a valid 8085 instruction/);
  assert.throws(() => assemble("MVI A, 100H"), /between 00H and FFH/);
  assert.throws(() => assemble("JMP MISSING"), /Unknown label "MISSING"/);
});

test("stops accidental infinite loops at the instruction safety limit", () => {
  const state = runMachine(createMachine(assemble("JMP 0000H")), 12);

  assert.equal(state.halted, false);
  assert.match(state.error ?? "", /12-instruction safety limit/);
  assert.equal(state.steps, 12);
});
