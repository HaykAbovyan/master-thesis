'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, Clock, FileText, Check, Keyboard } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// Reference text for typing
const referenceText = "The quick brown fox jumps over the lazy dog. Packed with vitamins and minerals, the nutritional value of this ancient grain has been recognized for centuries. As technology continues to advance, we must consider its impact on society and personal privacy. Climate change remains one of the most pressing challenges of our time, requiring global cooperation and innovative solutions.";

// Define mistake types interface
interface MistakeAnalysis {
  incorrectSpaces: number;
  missingLetters: number;
  typos: number;
  total: number;
}

// Define section analysis interface
interface SectionAnalysis {
  wpm: number;
  mistakes: MistakeAnalysis;
}

// Define test result interface
interface TestResult {
  wpm: number;
  total: MistakeAnalysis;
  sections?: {
    beginning: SectionAnalysis;
    middle: SectionAnalysis;
    end: SectionAnalysis;
  };
  timeTaken: number;
}

export default function Home() {
  const [userInput, setUserInput] = useState('');
  const [testStarted, setTestStarted] = useState(false);
  const [testEnded, setTestEnded] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [endTime, setEndTime] = useState<number | null>(null);
  const [result, setResult] = useState<TestResult | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Calculate test results
  const calculateResults = (): TestResult => {
    if (!startTime || !endTime) {
      throw new Error('Test timing data missing');
    }

    const timeInSeconds = (endTime - startTime) / 1000;
    const timeInMinutes = timeInSeconds / 60;
    const words = userInput.trim().split(/\s+/);
    const wordCount = words.length;
    const wpm = Math.round(wordCount / timeInMinutes);

    // Analyze mistakes
    const mistakes = analyzeMistakes(userInput, referenceText);

    // Try to create sections if enough words
    let sections;
    if (wordCount >= 15) {  // Minimum 5 words per section
      const wordsPerSection = Math.floor(wordCount / 3);
      
      // Split input into three sections based on word boundaries
      const beginningWords = words.slice(0, wordsPerSection);
      const middleWords = words.slice(wordsPerSection, wordsPerSection * 2);
      const endWords = words.slice(wordsPerSection * 2);
      
      // Recombine into strings
      const beginningText = beginningWords.join(' ');
      const middleText = middleWords.join(' ');
      const endText = endWords.join(' ');
      
      // Split reference text proportionally
      const refWords = referenceText.split(/\s+/);
      const refBeginning = refWords.slice(0, wordsPerSection).join(' ');
      const refMiddle = refWords.slice(wordsPerSection, wordsPerSection * 2).join(' ');
      const refEnd = refWords.slice(wordsPerSection * 2, wordsPerSection * 3).join(' ');
      
      sections = {
        beginning: {
          wpm: calculateSectionWPM(beginningText, timeInMinutes / 3),
          mistakes: analyzeMistakes(beginningText, refBeginning)
        },
        middle: {
          wpm: calculateSectionWPM(middleText, timeInMinutes / 3),
          mistakes: analyzeMistakes(middleText, refMiddle)
        },
        end: {
          wpm: calculateSectionWPM(endText, timeInMinutes / 3),
          mistakes: analyzeMistakes(endText, refEnd)
        }
      };
    }

    return {
      wpm,
      total: mistakes,
      sections,
      timeTaken: timeInSeconds
    };
  };

  // Calculate WPM for a section
  const calculateSectionWPM = (text: string, timeInMinutes: number): number => {
    const words = text.trim().split(/\s+/).length;
    return Math.round(words / timeInMinutes);
  };

  // Analyze mistakes in text
  const analyzeMistakes = (input: string, reference: string): MistakeAnalysis => {
    const incorrectSpaces = countIncorrectSpaces(input, reference);
    const missingLetters = countMissingLetters(input, reference);
    
    // Calculate total typos (any other discrepancies)
    // Since we're using simple string comparison, we'll count all differences excluding spaces
    const inputNoSpaces = input.replace(/\s+/g, '');
    const referenceNoSpaces = reference.substring(0, input.length).replace(/\s+/g, '');
    
    let typos = 0;
    for (let i = 0; i < Math.min(inputNoSpaces.length, referenceNoSpaces.length); i++) {
      if (inputNoSpaces[i] !== referenceNoSpaces[i]) {
        typos++;
      }
    }
    
    // Adjust typos count by removing already counted missing letters
    typos = Math.max(0, typos - missingLetters);
    
    return {
      incorrectSpaces,
      missingLetters,
      typos,
      total: incorrectSpaces + missingLetters + typos
    };
  };

  // Count incorrect spaces
  const countIncorrectSpaces = (input: string, reference: string): number => {
    const inputSpaces = (input.match(/\s{2,}/g) || []).length + (input.match(/\S\S/g) || []).length;
    const referenceSpaces = (reference.substring(0, input.length).match(/\s{2,}/g) || []).length + 
                           (reference.substring(0, input.length).match(/\S\S/g) || []).length;
    
    return Math.abs(inputSpaces - referenceSpaces);
  };

  // Count missing letters
  const countMissingLetters = (input: string, reference: string): number => {
    const inputLength = input.replace(/\s+/g, '').length;
    const referenceLength = reference.substring(0, input.length).replace(/\s+/g, '').length;
    
    return Math.max(0, referenceLength - inputLength);
  };

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    
    // Start timer on first keystroke
    if (!testStarted && value.length > 0) {
      setTestStarted(true);
      setStartTime(Date.now());
    }
    
    setUserInput(value);
  };

  // Handle keyboard events
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // End test when Enter is pressed and test has started
    if (e.key === 'Enter' && testStarted && !testEnded) {
      e.preventDefault();
      setTestEnded(true);
      setEndTime(Date.now());
    }
  };

  // Calculate results when test ends
  useEffect(() => {
    if (testEnded && startTime && endTime) {
      const testResults = calculateResults();
      setResult(testResults);
    }
  }, [testEnded, startTime, endTime]);

  // Reset the test
  const resetTest = () => {
    setUserInput('');
    setTestStarted(false);
    setTestEnded(false);
    setStartTime(null);
    setEndTime(null);
    setResult(null);
    
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  // Get progress percentage for the indicator
  const getProgress = (): number => {
    if (!testStarted) return 0;
    if (testEnded) return 100;
    
    // Simple character count based progress
    const progress = Math.min(100, (userInput.length / referenceText.length) * 100);
    return Math.floor(progress);
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 md:p-24">
      <Card className="w-full max-w-3xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Keyboard className="h-6 w-6" />
            Typing Test
          </CardTitle>
          <CardDescription>
            Test your typing speed and accuracy
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!testEnded ? (
            <>
              <div className="mb-4">
                <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                  <FileText className="h-5 w-5" /> Reference Text
                </h3>
                <p className="p-4 bg-muted rounded-md text-muted-foreground">
                  {referenceText}
                </p>
              </div>
              
              <div className="mb-4">
                <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                  <Keyboard className="h-5 w-5" /> Your Input
                </h3>
                <textarea
                  ref={inputRef}
                  value={userInput}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  className="w-full h-32 p-4 border rounded-md bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Start typing to begin the test..."
                  disabled={testEnded}
                ></textarea>
              </div>
              
              <div className="flex items-center gap-2 mb-4">
                <Clock className="h-5 w-5" />
                <span>
                  {testStarted
                    ? `Time: ${((Date.now() - (startTime || 0)) / 1000).toFixed(1)}s`
                    : 'Timer will start with your first keystroke'}
                </span>
              </div>
              
              <div className="mb-4">
                <div className="flex justify-between mb-2">
                  <span>Progress</span>
                  <span>{getProgress()}%</span>
                </div>
                <Progress value={getProgress()} className="h-2" />
              </div>
              
              <Alert variant="default" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Tip</AlertTitle>
                <AlertDescription>
                  Press Enter when you're done to complete the test.
                </AlertDescription>
              </Alert>
            </>
          ) : (
            <div className="space-y-6">
              <div className="border-b pb-4">
                <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Check className="h-6 w-6" /> Test Results
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="bg-muted p-4 rounded-md">
                    <h4 className="font-medium mb-1">WPM</h4>
                    <p className="text-2xl font-bold">{result?.wpm}</p>
                  </div>
                  <div className="bg-muted p-4 rounded-md">
                    <h4 className="font-medium mb-1">Time</h4>
                    <p className="text-2xl font-bold">{result?.timeTaken.toFixed(1)}s</p>
                  </div>
                  <div className="bg-muted p-4 rounded-md">
                    <h4 className="font-medium mb-1">Mistakes</h4>
                    <p className="text-2xl font-bold">{result?.total.total}</p>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-3">Mistake Analysis</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span>Incorrect Spaces:</span>
                    <span className="font-medium">{result?.total.incorrectSpaces}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Missing Letters:</span>
                    <span className="font-medium">{result?.total.missingLetters}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Typos:</span>
                    <span className="font-medium">{result?.total.typos}</span>
                  </div>
                </div>
              </div>
              
              {result?.sections && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">Section Analysis</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="border p-4 rounded-md">
                      <h4 className="font-medium mb-2">Beginning</h4>
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <span>WPM:</span>
                          <span>{result.sections.beginning.wpm}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Mistakes:</span>
                          <span>{result.sections.beginning.mistakes.total}</span>
                        </div>
                      </div>
                    </div>
                    <div className="border p-4 rounded-md">
                      <h4 className="font-medium mb-2">Middle</h4>
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <span>WPM:</span>
                          <span>{result.sections.middle.wpm}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Mistakes:</span>
                          <span>{result.sections.middle.mistakes.total}</span>
                        </div>
                      </div>
                    </div>
                    <div className="border p-4 rounded-md">
                      <h4 className="font-medium mb-2">End</h4>
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <span>WPM:</span>
                          <span>{result.sections.end.wpm}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Mistakes:</span>
                          <span>{result.sections.end.mistakes.total}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              <Button onClick={resetTest} className="w-full">
                Start New Test
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}