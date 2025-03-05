"use server";

import * as v from "valibot";
import { google } from "googleapis";
import { GoogleAuth } from "google-auth-library";

const sectionType = ["Beginning", "Middle", "End", "Total"];

const rowSchema = v.object({
  section: v.picklist(sectionType),
  incorrectSpaces: v.pipe(v.number(), v.toMinValue(0)),
  missingLetters: v.pipe(v.number(), v.toMinValue(0)),
  typos: v.number(),
  wpm: v.number(),
});

const rowSchemaList = v.array(rowSchema);

export async function saveInSheet(formData: FormData): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    const {
      GOOGLE_CREDENTIAL_CLIENT_EMAIL,
      GOOGLE_CREDENTIAL_CLIENT_PRIVATE_KEY,
      GOOGLE_SPREADSHEET_ID,
    } = process.env;
    if (
      !GOOGLE_CREDENTIAL_CLIENT_EMAIL ||
      !GOOGLE_CREDENTIAL_CLIENT_PRIVATE_KEY ||
      !GOOGLE_SPREADSHEET_ID
    ) {
      return { success: false, message: "environment not set" };
    }

    const overallResult = JSON.parse(
      formData.get("overallResult") as string,
    ) as unknown;
    const sections = JSON.parse(formData.get("sections") as string) as unknown;

    if (!overallResult && !sections) {
      return { success: false, message: "Missing data" };
    }

    const { success: totalValidateSucess, output: totalOutput } = v.safeParse(
      rowSchema,
      overallResult,
    );

    if (!totalValidateSucess) {
      return { success: false, message: "Invalid overall data" };
    }

    const { success: sectionsSuccess, output: sectionsOutput } = v.safeParse(
      rowSchemaList,
      sections,
    );

    if (!sectionsSuccess) {
      return { success: false, message: "Invalid sections data" };
    }

    const auth = new GoogleAuth({
      credentials: {
        client_email: GOOGLE_CREDENTIAL_CLIENT_EMAIL,
        private_key: GOOGLE_CREDENTIAL_CLIENT_PRIVATE_KEY.replace(/\\n/g, "\n"),
      },
      scopes: "https://www.googleapis.com/auth/spreadsheets",
    });

    const sheets = google.sheets({ version: "v4", auth });
    const range = "Sheet1!A:E";

    const sectionValues = sectionsOutput.map((section) =>
      Object.values(section),
    );

    const resource = {
      values: [Object.values(totalOutput), ...sectionValues],
    };

    // @ts-expect-error google api documentation and ts types are not perfect
    await sheets.spreadsheets.values.append({
      spreadsheetId: GOOGLE_SPREADSHEET_ID,
      range,
      valueInputOption: "RAW",
      resource,
    });

    return { success: true, message: "Data added!" };
  } catch (error) {
    if (error instanceof Error) {
      return {
        success: false,
        message: error.message,
      };
    }

    return { success: false, message: "something went wrong!" };
  }
}
