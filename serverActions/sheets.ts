"use server";

import * as v from "valibot";
import { insertData } from "@/db/addRow";

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
    const userInfo = formData.get("userInfo") as string | null;

    if (!userInfo) {
      return { success: false, message: "Missing user info" };
    }

    const overallResult = JSON.parse(
      formData.get("overallResult") as string,
    ) as unknown;
    const sections = JSON.parse(formData.get("sections") as string) as unknown;

    if (!overallResult && !sections) {
      return { success: false, message: "Missing data" };
    }

    const { success: totalValidateSuccess, output: totalOutput } = v.safeParse(
      rowSchema,
      overallResult,
    );

    if (!totalValidateSuccess) {
      return { success: false, message: "Invalid overall data" };
    }

    const { success: sectionsSuccess, output: sectionsOutput } = v.safeParse(
      rowSchemaList,
      sections,
    );

    if (!sectionsSuccess) {
      return { success: false, message: "Invalid sections data" };
    }

    await insertData(userInfo, [totalOutput, ...sectionsOutput]);

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
