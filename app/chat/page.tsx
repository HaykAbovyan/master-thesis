// app/page.tsx
'use client';

import { useState, useRef, KeyboardEvent } from 'react';
import { Button } from '@/components/ui/button'; // example shadcn‑ui import
import { Input } from '@/components/ui/input'; // example shadcn‑ui import

// A fixed reference text that every user will type.
const REFERENCE_TEXT =
  "The quick brown fox jumps over the lazy dog. This sentence is used as a typing test to evaluate speed and accuracy.";

// Types for diff operations
type DiffOp =
  | { op: 'equal'; refChar: string; inputChar: string }
  | { op: 'substitute'; refChar: string; inputChar: string }
  | { op: 'insert'; inputChar: string }
  | { op: 'delete'; refChar: string };

/**
 * Computes a simple diff between the reference and input strings using dynamic programming.
 * Returns an array of operations that transform the reference text into the user input.
 */
function computeDiff(ref: string, input: string): DiffOp[] {
  const m = ref.length;
  const n = input.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array(n + 1).fill(0)
  );

  // Initialize DP table.
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  // Fill DP table.
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (ref[i - 1] === input[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1, // deletion
          dp[i][j - 1] + 1, // insertion
          dp[i - 1][j - 1] + 1 // substitution
        );
      }
    }
  }

  // Backtrack to produce the diff.
  let i = m,
    j = n;
  const diff: DiffOp[] = [];
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && ref[i - 1] === input[j - 1]) {
      diff.push({ op: 'equal', refChar: ref[i - 1], inputChar: input[j - 1] });
      i--;
      j--;
    } else if (
      i > 0 &&
      j > 0 &&
      dp[i][j] === dp[i - 1][j - 1] + 1
    ) {
      diff.push({
        op: 'substitute',
        refChar: ref[i - 1],
        inputChar: input[j - 1],
      });
      i--;
      j--;
    } else if (i > 0 && dp[i][j] === dp[i - 1][j] + 1) {
      diff.push({ op: 'delete', refChar: ref[i - 1] });
      i--;
    } else if (j > 0 && dp[i][j] === dp[i][j - 1] + 1) {
      diff.push({ op: 'insert', inputChar: input[j - 1] });
      j--;
    }
  }
  return diff.reverse();
}

/**
 * Analyze the diff operations and count:
 * - Incorrect Spaces: missing spaces or extra/multiple spaces.
 * - Missing Letters: deletions of letters (non‑spaces).
 * - Typos: substitutions or insertions of non‑space characters.
 */
function analyzeDiff(diff: DiffOp[]) {
  let incorrectSpaces = 0,
    missingLetters = 0,
    typos = 0;
  diff.forEach((op) => {
    if (op.op === 'delete') {
      if (op.refChar === ' ') {
        incorrectSpaces++;
      } else {
        missingLetters++;
      }
    } else if (op.op === 'insert') {
      if (op.inputChar === ' ') {
        incorrectSpaces++;
      } else {
        typos++;
      }
    } else if (op.op === 'substitute') {
      if (op.refChar === ' ' || op.inputChar === ' ') {
        incorrectSpaces++;
      } else {
        typos++;
      }
    }
  });
  return { incorrectSpaces, missingLetters, typos };
}

/**
 * Splits two texts (the reference and the user input) into three sections based on word count.
 * If the texts are too short (less than 9 words), returns a single section.
 */
function splitTextsIntoSections(
  ref: string,
  input: string
): { refSections: string[]; inputSections: string[] } {
  const refWords = ref.trim().split(/\s+/);
  const inputWords = input.trim().split(/\s+/);
  // Use the smaller word count to define the sections.
  const n = Math.min(refWords.length, inputWords.length);
  if (n < 9) {
    return { refSections: [ref], inputSections: [input] };
  }
  const sectionSize = Math.floor(n / 3);
  const refSections = [
    refWords.slice(0, sectionSize).join(' '),
    refWords.slice(sectionSize, 2 * sectionSize).join(' '),
    refWords.slice(2 * sectionSize, n).join(' '),
  ];
  const inputSections = [
    inputWords.slice(0, sectionSize).join(' '),
    inputWords.slice(sectionSize, 2 * sectionSize).join(' '),
    inputWords.slice(2 * sectionSize, n).join(' '),
  ];
  return { refSections, inputSections };
}

export default function TypingTestPage() {
  const [inputValue, setInputValue] = useState('');
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [endTime, setEndTime] = useState<number | null>(null);
  const [overallResult, setOverallResult] = useState<{
    wpm: number;
    incorrectSpaces: number;
    missingLetters: number;
    typos: number;
  } | null>(null);
  const [sectionResults, setSectionResults] = useState<
    {
      section: string;
      incorrectSpaces: number;
      missingLetters: number;
      typos: number;
    }[]
  >([]);

  const inputRef = useRef<HTMLInputElement>(null);

  // Called on every key press in the input field.
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!started) {
      setStarted(true);
      setStartTime(Date.now());
    }

    // If user presses "Enter", finish the test.
    if (e.key === 'Enter') {
      e.preventDefault();
      if (!finished) finishTest();
    }
  };

  // Finalize the test: record end time, perform overall and (if applicable) section analysis.
  const finishTest = () => {
    const end = Date.now();
    setEndTime(end);
    setFinished(true);

    const durationMinutes =
      startTime !== null ? (end - startTime) / 60000 : 0.001; // avoid division by zero

    // Calculate overall WPM based on words typed.
    const wordsTyped = inputValue.trim() === '' ? 0 : inputValue.trim().split(/\s+/).length;
    const wpm = wordsTyped / durationMinutes;

    // Overall error analysis: compare the fixed reference text against the user input.
    const overallDiff = computeDiff(REFERENCE_TEXT, inputValue);
    const { incorrectSpaces, missingLetters, typos } = analyzeDiff(overallDiff);
    setOverallResult({ wpm, incorrectSpaces, missingLetters, typos });

    // If the text is long enough, split into three sections.
    const { refSections, inputSections } = splitTextsIntoSections(
      REFERENCE_TEXT,
      inputValue
    );
    if (refSections.length === 3 && inputSections.length === 3) {
      const sections = refSections.map((refSec, idx) => {
        const inpSec = inputSections[idx];
        const diff = computeDiff(refSec, inpSec);
        const analysis = analyzeDiff(diff);
        // Label sections as Beginning, Middle, End.
        const label =
          idx === 0 ? 'Beginning' : idx === 1 ? 'Middle' : 'End';
        return { section: label, ...analysis };
      });
      setSectionResults(sections);
    }
  };

  // Reset the test for a new try.
  const resetTest = () => {
    setInputValue('');
    setStarted(false);
    setFinished(false);
    setStartTime(null);
    setEndTime(null);
    setOverallResult(null);
    setSectionResults([]);
    // Optionally, focus the input.
    inputRef.current?.focus();
  };

  return (
    <main className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-center">Typing Test</h1>

        {/* Display the fixed reference text */}
        <div className="p-4 bg-white rounded shadow">
          <p className="text-gray-800">{REFERENCE_TEXT}</p>
        </div>

        {/* Input field */}
        <div className="space-y-2">
          <p className="text-gray-600">
            Start typing below. The timer starts with your first keystroke and the test ends when you press Enter.
          </p>
          <Input
            ref={inputRef}
            type="text"
            placeholder="Start typing here..."
            className="w-full p-2 border rounded"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={finished}
          />
        </div>

        {/* Results Section */}
        {finished && overallResult && (
          <div className="p-4 bg-white rounded shadow space-y-4">
            <h2 className="text-2xl font-semibold">Results</h2>
            <div>
              <p>
                <span className="font-medium">WPM:</span> {overallResult.wpm.toFixed(1)}
              </p>
              <p>
                <span className="font-medium">Incorrect Spaces:</span> {overallResult.incorrectSpaces}
              </p>
              <p>
                <span className="font-medium">Missing Letters:</span> {overallResult.missingLetters}
              </p>
              <p>
                <span className="font-medium">Typos:</span> {overallResult.typos}
              </p>
            </div>

            {sectionResults.length === 3 && (
              <div>
                <h3 className="text-xl font-medium mt-4">Section Analysis</h3>
                <div className="space-y-2">
                  {sectionResults.map((sec) => (
                    <div key={sec.section} className="border p-2 rounded">
                      <p className="font-semibold">{sec.section}:</p>
                      <p>
                        Incorrect Spaces: {sec.incorrectSpaces}, Missing Letters: {sec.missingLetters}, Typos: {sec.typos}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Button onClick={resetTest} className="mt-4">
              Reset Test
            </Button>
          </div>
        )}

        {/* Guidance if test is finished but input is very short */}
        {finished && !overallResult && (
          <p className="text-center text-gray-500">Test completed. Please try again for a detailed report.</p>
        )}
      </div>
    </main>
  );
}
