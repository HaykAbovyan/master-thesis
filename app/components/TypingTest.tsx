'use client';
import { useState, useEffect, useRef, ChangeEvent } from 'react';

export const TypingTest: React.FC = () => {
    const [text, setText] = useState<string>(''); // Although `text` is declared, it's not used in the code
    const [inputText, setInputText] = useState<string>('');
    const [startTime, setStartTime] = useState<number | null>(null); // `startTime` can be null initially
    const [wpm, setWpm] = useState<number>(0);
    const [isStarted, setIsStarted] = useState<boolean>(false);
    const [isFinished, setIsFinished] = useState<boolean>(false);
    const inputRef = useRef<HTMLTextAreaElement | null>(null); // `inputRef` should be a reference to a `textarea` element

    const passage = "The quick brown fox jumps over the lazy dog. A classic pangram sentence.";

    const handleInputChange = (e: ChangeEvent<HTMLTextAreaElement>): void => {
        const newText = e.target.value;
        setInputText(newText);

        if (!isStarted) {
            setStartTime(Date.now());
            setIsStarted(true);
        }
    };

    useEffect(() => {
        if (isFinished && inputRef.current) {
            inputRef.current.disabled = true;

            const newText = inputText.trim()

            const endTime = Date.now();
            const timeTaken = (endTime - (startTime || 0)) / 1000 / 60; // Make sure to handle `null` if startTime is not set
            const wordsTyped = newText.split(' ').length;
            setWpm(Math.round(wordsTyped / timeTaken));
        }
    }, [isFinished]);

    return (
        <div className="p-5 max-w-4xl mx-auto text-center">
            <p className="italic mb-2">Type the following text:</p>
            <p className="text-xl font-bold mb-6">{passage}</p>

            <form onSubmit={(e) => {
                e.preventDefault();

                if (!isFinished) {
                    setIsFinished(true);
                }
            }}>


                <textarea
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            setIsFinished(true);
                        }
                    }}
                    ref={inputRef}
                    value={inputText}
                    onChange={handleInputChange}
                    placeholder="Start typing here..."
                    rows={6}
                    cols={50}
                    className="w-full p-4 text-lg mb-5 border border-gray-300 rounded-md text-black"
                />

            </form>

            {isFinished && (
                <div>
                    <h2 className="text-2xl font-semibold">Test Complete!</h2>
                    <p className="mt-2">Words per minute: <strong>{wpm}</strong></p>
                </div>
            )}

            {!isFinished && isStarted && (
                <p className="mt-2">Time Elapsed: {((Date.now() - (startTime || 0)) / 1000).toFixed(2)} seconds</p>
            )}
        </div>
    );
};
