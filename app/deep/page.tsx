'use client'

import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table'

const REFERENCE_TEXT = "The quick brown fox jumps over the lazy dog. This is a sample text for typing practice. Please type this exactly as you see it."

interface Mistake {
  type: 'incorrectSpace' | 'missingLetter' | 'typo'
  position: number
}

interface SectionAnalysis {
  name: string
  incorrectSpaces: number
  missingLetters: number
  typos: number
}

export default function TypingTest() {
  const [input, setInput] = useState('')
  const [startTime, setStartTime] = useState<number | null>(null)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [isTestDone, setIsTestDone] = useState(false)
  const [mistakes, setMistakes] = useState<Mistake[]>([])
  const [sections, setSections] = useState<SectionAnalysis[]>([])

  const referenceWords = REFERENCE_TEXT.split(' ')
  const totalWords = referenceWords.length
  const wordsPerSection = Math.floor(totalWords / 3)

  // Precompute word positions and sections
  const wordInfos = referenceWords.reduce((acc, word, index) => {
    const start = index === 0 ? 0 : acc[index - 1].end + 1
    const end = start + word.length - 1
    let section = 'total'
    
    if (totalWords >= 3) {
      if (index < wordsPerSection) section = 'beginning'
      else if (index < wordsPerSection * 2) section = 'middle'
      else section = 'end'
    }
    
    return [...acc, { start, end, section }]
  }, [] as Array<{ start: number; end: number; section: string }>)

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (startTime && !isTestDone) {
      interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTime) / 1000))
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [startTime, isTestDone])

  const evaluateMistakes = (inputText: string) => {
    const newMistakes: Mistake[] = []
    const maxLength = Math.max(inputText.length, REFERENCE_TEXT.length)

    for (let i = 0; i < maxLength; i++) {
      const refChar = REFERENCE_TEXT[i] || ''
      const userChar = inputText[i] || ''

      if (i >= REFERENCE_TEXT.length) {
        newMistakes.push({ type: 'typo', position: i })
        continue
      }

      if (userChar === refChar) continue

      if (refChar === ' ') {
        newMistakes.push({ type: 'incorrectSpace', position: i })
      } else if (userChar === ' ') {
        newMistakes.push({ type: 'incorrectSpace', position: i })
      } else if (userChar === '') {
        newMistakes.push({ type: 'missingLetter', position: i })
      } else {
        newMistakes.push({ type: 'typo', position: i })
      }
    }

    return newMistakes
  }

  const analyzeSections = (mistakes: Mistake[]) => {
    const sectionMap = new Map<string, SectionAnalysis>()

    const initializeSection = (name: string) => ({
      name,
      incorrectSpaces: 0,
      missingLetters: 0,
      typos: 0
    })

    mistakes.forEach((mistake) => {
      const wordIndex = wordInfos.findIndex(w => 
        mistake.position >= w.start && mistake.position <= w.end
      )
      const section = wordIndex === -1 ? 'total' : wordInfos[wordIndex].section

      if (!sectionMap.has(section)) {
        sectionMap.set(section, initializeSection(section))
      }

      const sectionData = sectionMap.get(section)!
      switch (mistake.type) {
        case 'incorrectSpace':
          sectionData.incorrectSpaces++
          break
        case 'missingLetter':
          sectionData.missingLetters++
          break
        case 'typo':
          sectionData.typos++
          break
      }
    })

    const sectionsArray = Array.from(sectionMap.values())
    if (totalWords >= 3) {
      return ['beginning', 'middle', 'end', 'total']
        .filter(section => sectionsArray.some(s => s.name === section))
        .map(section => sectionsArray.find(s => s.name === section)!)
    }
    return [sectionsArray.find(s => s.name === 'total')!]
  }

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value
    setInput(text)

    if (!startTime) {
      setStartTime(Date.now())
    }

    if (text.includes('\n')) {
      const finalInput = text.replace('\n', '')
      setInput(finalInput)
      setIsTestDone(true)
      const detectedMistakes = evaluateMistakes(finalInput)
      setMistakes(detectedMistakes)
      setSections(analyzeSections(detectedMistakes))
    }
  }

  const wpm = Math.round(
    (input.split(/\s+/).filter(Boolean).length) / 
    (elapsedTime / 60)
  ) || 0

  return (
    <div className="container max-w-2xl py-8">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Typing Test</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 space-y-2">
            <Label>Reference Text</Label>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {REFERENCE_TEXT}
            </p>
          </div>

          <div className="space-y-2">
            <Label>Your Input</Label>
            <Textarea
              value={input}
              onChange={handleInput}
              disabled={isTestDone}
              placeholder="Start typing here..."
              className="min-h-[120px]"
            />
          </div>

          <div className="mt-4 text-sm text-muted-foreground">
            Time: {Math.floor(elapsedTime / 60)}:{String(elapsedTime % 60).padStart(2, '0')}
          </div>
        </CardContent>
      </Card>

      {isTestDone && (
        <Card>
          <CardHeader>
            <CardTitle>Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <p className="font-medium">WPM: {wpm}</p>
              <p className="text-sm text-muted-foreground">
                Total Mistakes: {mistakes.length}
              </p>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Section</TableHead>
                  <TableHead>Incorrect Spaces</TableHead>
                  <TableHead>Missing Letters</TableHead>
                  <TableHead>Typos</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sections.map((section) => (
                  <TableRow key={section.name}>
                    <TableCell className="capitalize">{section.name}</TableCell>
                    <TableCell>{section.incorrectSpaces}</TableCell>
                    <TableCell>{section.missingLetters}</TableCell>
                    <TableCell>{section.typos}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}