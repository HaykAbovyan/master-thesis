import { createClient } from "@libsql/client";

export async function prepareTurso() {
  try {
    const turso = createClient({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });

    await turso.execute(`
      CREATE TABLE sections (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_info TEXT NOT NULL,
          section TEXT CHECK(section IN ('Beginning', 'Middle', 'End', 'Total')) NOT NULL,
          incorrect_spaces INTEGER CHECK(incorrect_spaces >= 0) NOT NULL,
          missing_letters INTEGER CHECK(missing_letters >= 0) NOT NULL,
          typos INTEGER NOT NULL,
          wpm INTEGER NOT NULL,
          UNIQUE(user_info, section) 
      );
`);

    // eslint-disable-next-line
    console.log("preparation is done!");
  } catch (err) {
    // eslint-disable-next-line
    console.log("Error: not prepared", err);
    process.exit(1);
  }
}

prepareTurso();
