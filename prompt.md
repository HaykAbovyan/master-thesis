**Create a Next.js application (with app dir) using TypeScript and Tailwind CSS (shadcn ui) that implements a typing test based on a fixed reference text. The app should function as follows:**

1. **Reference Text & Timing:**
   - Display a fixed reference text that is the same for every user.
   - Start the timer with the first keystroke.
   - End the test when the user presses the "Enter" key (i.e., after typing a single paragraph).

2. **Evaluation & Reporting:**
   - **WPM Calculation:** Compute words per minute by dividing the total number of words typed by the time taken (in minutes).
   - **Mistake Analysis:** Compare the user's input to the reference text and count the following types of mistakes:
     - **Incorrect Spaces:** Instances where a space is missing or where multiple consecutive spaces occur.
     - **Missing Letters:** Each instance where a letter from the reference text is omitted.
     - **Typos:** Any other discrepancies between the user's input and the reference text.

3. **Text Division (Based on Word Count):**
   - If the input is long enough, divide it into three sections (beginning, middle, and end) based on word count to analyze performance in each part separately.
   - If the text is too short to be divided meaningfully, generate only a total report.

4. **User Interface:**
   - Build a minimal, accessible, and responsive UI with Tailwind CSS that works well on both desktop and mobile devices.

5. **Edge Case Handling:**
   - Treat empty or very short inputs as valid.
   - Provide user-friendly feedback or guidance without causing errors if the input doesn’t allow for detailed sectioning.