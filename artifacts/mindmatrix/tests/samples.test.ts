import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  assemble,
  createMachine,
  runMachine,
} from "../src/emulator8085/engine.ts";

function sample(name: string): string {
  return readFileSync(new URL(`../src/assembly/programs/${name}.asm`, import.meta.url), "utf8");
}

function outputFor(name: string, ports: Record<number, number> = {}) {
  const state = runMachine(createMachine(assemble(sample(name)), { ports }));
  assert.equal(state.error, undefined);
  assert.equal(state.halted, true);
  return state.outputs.at(-1)?.value;
}

test("the assembly score calculation sample adds its bonus", () => {
  assert.equal(outputFor("score-calculation", { 0: 0x2a }), 0x34);
});

test("the assembly score penalty sample subtracts its input", () => {
  assert.equal(outputFor("score-penalty", { 0: 10 }), 90);
});

test("the assembly attempt counter and countdown samples reach their endpoints", () => {
  assert.equal(outputFor("attempt-counter"), 3);
  assert.equal(outputFor("countdown"), 0);
});

test("the assembly sequence validation sample reads two ports", () => {
  assert.equal(outputFor("sequence-validation", { 0: 0x2a, 1: 0x2a }), 1);
  assert.equal(outputFor("sequence-validation", { 0: 0x2a, 1: 0x11 }), 0);
});

test("the assembly pattern sample accepts and rejects pattern keys", () => {
  assert.equal(outputFor("pattern-match", { 0: 0x2a }), 1);
  assert.equal(outputFor("pattern-match", { 0: 0x11 }), 0);
});

test("the assembly score evaluation sample compares the 70-point threshold", () => {
  assert.equal(outputFor("result-evaluation", { 0: 69 }), 0);
  assert.equal(outputFor("result-evaluation", { 0: 70 }), 1);
  assert.equal(outputFor("result-evaluation", { 0: 91 }), 1);
});
