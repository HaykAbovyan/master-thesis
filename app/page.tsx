"use client";

import {
  useState,
  useRef,
  KeyboardEvent,
  ChangeEvent,
  useActionState,
} from "react";
import { Button } from "@/components/ui/button"; // shadcn‑ui component
import { Keyboard, FileText } from "lucide-react"; // Lucide icons
import { saveInSheet } from "@/serverActions/sheets";
import { Input } from "@/components/ui/input";

// Fixed reference text for the typing test.
const REFERENCE_TEXT =
  "Աշակերտները դասարանում են։ Նրանք սովորում են հայոց լեզու։ Ուսուցչուհին գրատախտակին գրում է նոր բառեր։ Աշակերտները ուշադիր լսում են ուսուցչուհուն։ Պատուհանից երևում է դպրոցի բակը։ Այնտեղ մեծ ծառեր կան։ Զանգը հնչում է, և դասը ավարտվում է։ Երեխաները հավաքում են իրենց գրքերը։ Նրանք դուրս են գալիս դասարանից։ Բակում սկսում են խաղալ։ Արևը պայծառ շողում է։ Եղանակը տաք է և հաճելի։ Շուտով կսկսվի հաջորդ դասը։";

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

  const [state, formAction, isPending] = useActionState(
    async (
      _prev: { success: boolean; message: string } | null,
      formData: FormData,
    ) => {
      const userInfo = formData.get("userInfo");

      if (!userInfo) {
        return { success: false, message: "User info is required" };
      }

      const body = new FormData();

      body.append("userInfo", userInfo);

      if (overallResult) {
        body.append(
          "overallResult",
          JSON.stringify({
            ...overallResult,
            section: "Total",
          }),
        );
      }

      if (sectionResults.length > 0) {
        body.append("sections", JSON.stringify(sectionResults));
      }

      return saveInSheet(body);
    },
    null,
  );

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
  const finishTest = async () => {
    const end = Date.now();
    setFinishTime(end);
    setFinished(true);

    const durationMinutes =
      startTime !== null ? (end - startTime) / 60000 : 0.001;

    // Overall WPM calculation based on words typed.
    const overallWords =
      inputValue.trim() === "" ? 0 : inputValue.trim().split(/\s+/).length;
    const overallWPM = overallWords / durationMinutes;

    // Overall error analysis comparing the fixed reference to the input.
    const overallDiff = computeDiff(REFERENCE_TEXT, inputValue);
    const overallAnalysis = analyzeDiff(overallDiff);

    const overallResult = {
      wpm: overallWPM,
      incorrectSpaces: overallAnalysis.incorrectSpaces,
      missingLetters: overallAnalysis.missingLetters,
      typos: overallAnalysis.typos,
    };

    let sections = null;

    // Proceed with section analysis only if input is long enough and timestamps are set.
    const inputWords = inputValue.trim().split(/\s+/);
    if (
      inputWords.length >= totalRefWords &&
      section1Time !== null &&
      section2Time !== null
    ) {
      // Divide reference text into sections.
      const refSection1 = refWords.slice(0, section1WordCount).join(" ");
      const refSection2 = refWords
        .slice(section1WordCount, section2Threshold)
        .join(" ");
      const refSection3 = refWords.slice(section2Threshold).join(" ");

      // Divide input text into corresponding sections.
      const inputSection1 = inputWords.slice(0, section1WordCount).join(" ");
      const inputSection2 = inputWords
        .slice(section1WordCount, section2Threshold)
        .join(" ");
      const inputSection3 = inputWords
        .slice(section2Threshold, totalRefWords)
        .join(" ");

      // Compute diff and error analysis for each section.
      const analysis1 = analyzeDiff(computeDiff(refSection1, inputSection1));
      const analysis2 = analyzeDiff(computeDiff(refSection2, inputSection2));
      const analysis3 = analyzeDiff(computeDiff(refSection3, inputSection3));

      // Calculate WPM per section using the locked timestamps.
      const section1TimeTaken =
        startTime !== null ? (section1Time - startTime) / 60000 : 0.001;
      const section1WPM = section1WordCount / section1TimeTaken;

      const section2TimeTaken = (section2Time - section1Time) / 60000 || 0.001;
      const section2WPM = section2WordCount / section2TimeTaken;

      const section3WordCount = totalRefWords - section2Threshold;
      const section3TimeTaken = (end - section2Time) / 60000 || 0.001;
      const section3WPM = section3WordCount / section3TimeTaken;

      sections = [
        {
          section: "Beginning",
          incorrectSpaces: analysis1.incorrectSpaces,
          missingLetters: analysis1.missingLetters,
          typos: analysis1.typos,
          wpm: section1WPM,
        },
        {
          section: "Middle",
          incorrectSpaces: analysis2.incorrectSpaces,
          missingLetters: analysis2.missingLetters,
          typos: analysis2.typos,
          wpm: section2WPM,
        },
        {
          section: "End",
          incorrectSpaces: analysis3.incorrectSpaces,
          missingLetters: analysis3.missingLetters,
          typos: analysis3.typos,
          wpm: section3WPM,
        },
      ];
    }

    setOverallResult(overallResult);
    if (sections) {
      setSectionResults(sections);
    }
  };

  // Reset the test.
  const resetTest = () => {
    setInputValue("");
    setStarted(false);
    setFinished(false);
    setStartTime(null);
    setFinishTime(null);
    setOverallResult(null);
    setSectionResults([]);
    setSection1Time(null);
    setSection2Time(null);
    inputRef.current?.focus();
  };

  return (
    <main className="min-h-screen bg-white p-4">
      {/* Outer container with a gray border */}
      <div className="max-w-2xl mx-auto mt-8 p-6 border border-gray-300 rounded space-y-6">
        {/* Title & Description */}
        <div>
          <div className="flex items-center space-x-2">
            <Keyboard className="w-5 h-5" />
            <h1 className="text-2xl font-bold">Մուտքագրման թեստ</h1>
          </div>
          <p className="text-gray-600">
            Ստուգեք ձեր մուտքագրման արագությունը և ճշգրտությունը:
          </p>
        </div>

        {/* Reference Text */}
        <div>
          <div className="flex items-center space-x-2">
            <FileText className="w-5 h-5" />
            <h2 className="text-xl font-semibold">Տեքստ</h2>
          </div>
          <div className="mt-2 p-4 bg-gray-50 border border-gray-200 rounded">
            <p className="text-gray-800">{REFERENCE_TEXT}</p>
          </div>
        </div>

        <div>
          <div className="flex items-center space-x-2">
            <Keyboard className="w-5 h-5" />
            <h2 className="text-xl font-semibold">Մուտքագրման դաշտ</h2>
          </div>
          <p className="text-gray-600 text-sm mt-1">
            Ժամանակաչափը սկսվում է ստեղնաշարի առաջին հպումից և ավարտվում, երբ
            սեղմում եք Enter:
          </p>
          <textarea
            ref={inputRef}
            placeholder="Մուտքագրեք տեքստը այստեղ..."
            className="w-full p-2 border rounded h-40 resize-none mt-2"
            value={inputValue}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            disabled={finished}
          />
        </div>

        {isPending && (
          <div className="flex items-center justify-center">
            <p className="text-gray-600 animate-pulse">
              Processing data... Please wait for the detailed report.
            </p>
          </div>
        )}

        {/* Results Section */}
        {finished && overallResult && (
          <dialog open>
            <div className="bg-white p-4 rounded shadow space-y-4">
              <h2 className="text-2xl font-semibold">Overall Results</h2>
              <div>
                <p>
                  <span className="font-medium">WPM:</span>{" "}
                  {overallResult.wpm.toFixed(1)}
                </p>
                <p>
                  <span className="font-medium">Incorrect Spaces:</span>{" "}
                  {overallResult.incorrectSpaces}
                </p>
                <p>
                  <span className="font-medium">Missing Letters:</span>{" "}
                  {overallResult.missingLetters}
                </p>
                <p>
                  <span className="font-medium">Typos:</span>{" "}
                  {overallResult.typos}
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
                          WPM: {sec.wpm.toFixed(1)} | Incorrect Spaces:{" "}
                          {sec.incorrectSpaces}, Missing Letters:{" "}
                          {sec.missingLetters}, Typos: {sec.typos}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!state?.success && (
                <form action={formAction}>
                  <div className="flex gap-4">
                    <Input
                      type="text"
                      name="userInfo"
                      placeholder="..."
                      className="border-black"
                    />
                    <Button>Submit</Button>

                    {state?.success === false && state.message && (
                      <p className="text-red-500">{state.message}</p>
                    )}
                  </div>
                </form>
              )}

              <Button onClick={resetTest} className="mt-4 w-full">
                Reset Test
              </Button>
            </div>
          </dialog>
        )}

        {/* If test finished but input is too short for section analysis */}
        {finished && !overallResult && (
          <p className="text-center text-gray-500">
            Test completed. Please try again for a detailed report.
          </p>
        )}
      </div>
    </main>
  );
}
