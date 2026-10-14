import attemptCounter from "./programs/attempt-counter.asm?raw";
import countdown from "./programs/countdown.asm?raw";
import patternMatch from "./programs/pattern-match.asm?raw";
import resultEvaluation from "./programs/result-evaluation.asm?raw";
import scoreCalculation from "./programs/score-calculation.asm?raw";
import scorePenalty from "./programs/score-penalty.asm?raw";
import sequenceValidation from "./programs/sequence-validation.asm?raw";

export interface SampleProgram {
  id: string;
  title: string;
  description: string;
  source: string;
  testPorts: Record<number, number>;
}

export const samplePrograms: SampleProgram[] = [
  {
    id: "score-calculation",
    title: "Score bonus",
    description: "Reads a score, adds a 10-point bonus, and writes the result to output port 01H.",
    source: scoreCalculation,
    testPorts: { 0: 0x2a },
  },
  {
    id: "score-penalty",
    title: "Score penalty",
    description: "Subtracts an input penalty from a 100-point starting score.",
    source: scorePenalty,
    testPorts: { 0: 10 },
  },
  {
    id: "attempt-counter",
    title: "Attempt counter",
    description: "Counts three attempts using INR, DCR, and a JNZ loop.",
    source: attemptCounter,
    testPorts: {},
  },
  {
    id: "countdown",
    title: "Countdown",
    description: "Counts down from five to zero with a conditional loop.",
    source: countdown,
    testPorts: {},
  },
  {
    id: "sequence-validation",
    title: "Sequence validation",
    description: "Compares two values entered on ports 00H and 01H.",
    source: sequenceValidation,
    testPorts: { 0: 0x2a, 1: 0x2a },
  },
  {
    id: "pattern-match",
    title: "Pattern match",
    description: "Checks whether the entered pattern key equals 2AH.",
    source: patternMatch,
    testPorts: { 0: 0x2a },
  },
  {
    id: "result-evaluation",
    title: "Result evaluation",
    description: "Compares a score with the 70-point threshold and evaluates the result.",
    source: resultEvaluation,
    testPorts: { 0: 75 },
  },
];

export function getSampleProgram(id: string): SampleProgram | undefined {
  return samplePrograms.find((program) => program.id === id);
}
