# MindMatrix

MindMatrix is a local-first cognitive training web app with four playable games,
a progress dashboard, leaderboard, history, editable profile, saved theme
preference, and an 8085 assembly laboratory.

## Run

This app is a pnpm workspace artifact:

```sh
pnpm --filter @workspace/mindmatrix run dev
```

Run its static type check and emulator tests:

```sh
pnpm --filter @workspace/mindmatrix run typecheck
pnpm --filter @workspace/mindmatrix run test:emulator
```

The assembly tests use Node's built-in test runner and TypeScript type stripping.

## Project layout

- `src/` — React interface, game interactions, charts, and local progress UI.
- `src/emulator8085/engine.ts` — assembler, bytecode encoder, 64 KB memory,
  registers/flags, opcode fetch/decode/execute, ports, and per-instruction trace.
- `src/assembly/programs/` — editable `.asm` example source files.
- `src/assembly/programs.ts` — sample metadata and frontend imports for the
  assembly programs.
- `tests/emulator.test.ts` — executable test cases for CPU operations, branching,
  ports, memory, invalid programs, and the instruction limit.

MindMatrix stores profile settings and game progress in the browser's local
storage. The shared workspace API server is separate and is not used by this
local-first app; there are no accounts or cross-device sync in this version.
Leaderboard rival entries are labeled sample players, not live users.

## 8085 execution scope

The lab assembles source into the corresponding 8085 opcode bytes, loads those
bytes into its memory map, and fetches, decodes, and executes each instruction.
Step and Run use the same CPU state and instruction executor. Register values,
flags, memory, I/O port outputs, and trace entries are read from that execution.
This is an in-project 8085-compatible emulator, not an external emulator
dependency and not a full implementation of every 8085 feature.

Implemented instructions: `NOP`, `MOV`, `MVI`, `LXI`, `LDA`, `STA`, `ADD`,
`SUB`, `CMP`, `INR`, `DCR`, `JMP`, `JZ`, `JNZ`, `JC`, `JNC`, `IN`, `OUT`, and
`HLT`. `M` addresses memory at the HL register pair. Decimal values, hexadecimal
values ending in `H`, `0x` hexadecimal values, labels, and `;` comments are
supported. Input port values can be configured in the lab; programs can write
to output ports with `OUT`. Attempts to assemble an unsupported instruction or
execute an unsupported opcode stop with a visible error. Infinite loops stop
at the default 1,000-instruction limit.

The emulator does not currently implement stack operations, interrupts, timing
cycles, serial peripherals, a complete 8085 instruction set, or hardware
electrical behavior. It is intended for the documented instruction subset and
educational game examples, not as a replacement for a full hardware emulator.
