"use server";
import { turso } from "./client";

export async function insertData(
  userInfo: string,
  rows: Array<{
    section: string;
    incorrectSpaces: number;
    missingLetters: number;
    typos: number;
    wpm: number;
  }>,
) {
  try {
    const values = rows
      .map(
        (row) =>
          `('${userInfo}', '${row.section}', ${row.incorrectSpaces}, ${row.missingLetters}, ${row.typos}, ${row.wpm})`,
      )
      .join(", ");

    await turso.execute(`
      INSERT INTO sections (user_info, section, incorrect_spaces, missing_letters, typos, wpm)
      VALUES ${values}
    `);

    // eslint-disable-next-line
    console.log("Data inserted successfully!");
  } catch (err) {
    // eslint-disable-next-line
    console.log("Error inserting data:", err);
  }
}
