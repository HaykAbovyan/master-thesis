// app/page.tsx
"use client";

import { useState, useRef, KeyboardEvent, ChangeEvent } from "react";
import { Button } from "@/components/ui/button"; // shadcn‑ui component
import { Keyboard, FileText } from "lucide-react"; // Lucide icons

// Fixed reference text for the typing test.
const REFERENCE_TEXT =
"Աշակերտները դասարանում են: Նրանք սովորում են հայոց լեզու: Ուսուցչուհին գրատախտակին գրում է նոր բառեր: Աշակերտները ուշադիր լսում են ուսուսցչուհուն: Պատուհանից երևում է դպրոցի բակը: Այնտեղ մեծ ծառեր կան: Զանգը հնչում է, և դասը ավարտվում է: Երեխաները հավաքում են իրենց գրքերը: Նրանք դուրս են գալիս դասարանից: Բակում սկսում են խաղալ: Արևը պայծառ շողում է: Եղանակը տաք է և հաճելի: Շուտով կսկսվի հաջորդ դասը:";

// Pre-calculate reference text word boundaries.
const refWords = REFERENCE_TEXT.trim().split(/\s+/);
const totalRefWords = refWords.length;
const section1WordCount = Math.floor(totalRefWords / 3);
const section2WordCount = Math.floor(totalRefWords / 3);
const section2Threshold = section1WordCount + section2WordCount; // when section 2 is done

// Diff types
type DiffOp =
  | { op: "equal"; refChar: string; inputChar: string }
  | { op: "substitute"; refChar: string; inputChar: string }
  | { op: "insert"; inputChar: string }
  | { op: "delete"; refChar: string };

/**
 * Compute a simple diff between two strings using dynamic programming.
 */
function computeDiff(ref: string, input: string): DiffOp[] {
  const m = ref.length;
  const n = input.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    Array(n + 1).fill(0),
  );

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (ref[i - 1] === input[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1, // deletion
          dp[i][j - 1] + 1, // insertion
          dp[i - 1][j - 1] + 1, // substitution
        );
      }
    }
  }

  let i = m,
    j = n;
  const diff: DiffOp[] = [];
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && ref[i - 1] === input[j - 1]) {
      diff.push({ op: "equal", refChar: ref[i - 1], inputChar: input[j - 1] });
      i--;
      j--;
    } else if (i > 0 && j > 0 && dp[i][j] === dp[i - 1][j - 1] + 1) {
      diff.push({
        op: "substitute",
        refChar: ref[i - 1],
        inputChar: input[j - 1],
      });
      i--;
      j--;
    } else if (i > 0 && dp[i][j] === dp[i - 1][j] + 1) {
      diff.push({ op: "delete", refChar: ref[i - 1] });
      i--;
    } else if (j > 0 && dp[i][j] === dp[i][j - 1] + 1) {
      diff.push({ op: "insert", inputChar: input[j - 1] });
      j--;
    }
  }
  return diff.reverse();
}

/**
 * Analyze diff operations to count:
 * - Incorrect Spaces: missing spaces or extra spaces.
 * - Missing Letters: deletions of non-space characters.
 * - Typos: substitutions or insertions of non-space characters.
 */
function analyzeDiff(diff: DiffOp[]) {
  let incorrectSpaces = 0,
    missingLetters = 0,
    typos = 0;
  diff.forEach((op) => {
    if (op.op === "delete") {
      if (op.refChar === " ") {
        incorrectSpaces++;
      } else {
        missingLetters++;
      }
    } else if (op.op === "insert") {
      if (op.inputChar === " ") {
        incorrectSpaces++;
      } else {
        typos++;
      }
    } else if (op.op === "substitute") {
      if (op.refChar === " " || op.inputChar === " ") {
        incorrectSpaces++;
      } else {
        typos++;
      }
    }
  });
  return { incorrectSpaces, missingLetters, typos };
}

type SectionResult = {
  section: string;
  incorrectSpaces: number;
  missingLetters: number;
  typos: number;
  wpm: number;
};

export default function TypingTestPage() {
  const [inputValue, setInputValue] = useState("");
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [_finishTime, setFinishTime] = useState<number | null>(null);
  const [overallResult, setOverallResult] = useState<{
    wpm: number;
    incorrectSpaces: number;
    missingLetters: number;
    typos: number;
  } | null>(null);
  const [sectionResults, setSectionResults] = useState<SectionResult[]>([]);

  // Section timestamps
  const [section1Time, setSection1Time] = useState<number | null>(null);
  const [section2Time, setSection2Time] = useState<number | null>(null);

  // Use HTMLTextAreaElement as the ref type for the multi-line input.
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Called on each key press in the textarea.
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (!started) {
      setStarted(true);
      setStartTime(Date.now());
    }
    // End the test when Enter is pressed.
    if (e.key === "Enter") {
      e.preventDefault();
      if (!finished) finishTest();
    }
  };

  // Called on every change in the textarea.
  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setInputValue(value);

    // Check current word count.
    const trimmed = value.trim();
    const words = trimmed === "" ? [] : trimmed.split(/\s+/);
    const currentWordCount = words.length;

    // Capture section times if thresholds are met.
    if (!section1Time && currentWordCount >= section1WordCount) {
      setSection1Time(Date.now());
    }
    if (!section2Time && currentWordCount >= section2Threshold) {
      setSection2Time(Date.now());
    }
  };

  // Finalize the test.
  const finishTest = () => {
    const end = Date.now