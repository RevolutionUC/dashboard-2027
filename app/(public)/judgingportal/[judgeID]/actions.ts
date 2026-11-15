"use server";

import { revalidatePath } from "next/cache";
import { db, must } from "@/lib/db";
import type { TablesUpdate } from "@/lib/db/types";

async function runMutation(
  operation: () => Promise<void>,
  revalidate: () => void,
  logPrefix: string,
  fallbackErrorMessage: string,
) {
  try {
    await operation();
    revalidate();
    return { success: true };
  } catch (error) {
    console.error(logPrefix, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : fallbackErrorMessage,
    };
  }
}

async function updateEvaluationAndRevalidate(
  judgeId: string,
  projectId: string,
  patch: TablesUpdate<"evaluations">,
  logPrefix: string,
  errorMessage: string,
) {
  return runMutation(
    async () => {
      must(
        await db.from("evaluations").update(patch).eq("judge_id", judgeId).eq("project_id", projectId),
      );
    },
    () => {
      revalidatePath(`/judgingportal/${judgeId}`);
    },
    logPrefix,
    errorMessage,
  );
}

export async function saveRanking(
  judgeId: string,
  projectId: string,
  bordaScore: number,
) {
  return runMutation(
    async () => {
      must(
        await db
          .from("evaluations")
          .update({ category_borda_score: bordaScore })
          .eq("judge_id", judgeId)
          .eq("project_id", projectId),
      );
    },
    () => {
      revalidatePath(`/judgingportal/${judgeId}/ranking`);
    },
    "Error saving ranking:",
    "Failed to save ranking",
  );
}

export async function resetAllRankings(judgeId: string) {
  return runMutation(
    async () => {
      must(await db.from("evaluations").update({ category_borda_score: 0 }).eq("judge_id", judgeId));
    },
    () => {
      revalidatePath(`/judgingportal/${judgeId}/ranking`);
    },
    "Error resetting rankings:",
    "Failed to reset rankings",
  );
}

export async function finalizeRankings(judgeId: string) {
  return runMutation(
    async () => {
      must(await db.from("judges").update({ judging_phase: "finalized" }).eq("id", judgeId));
    },
    () => {
      revalidatePath(`/judgingportal/${judgeId}`);
      revalidatePath(`/judgingportal/${judgeId}/ranking`);
    },
    "Error finalizing rankings:",
    "Failed to finalize rankings",
  );
}

export async function saveEvaluationScore(
  judgeId: string,
  projectId: string,
  scoreIndex: number,
  score: number,
) {
  if (scoreIndex < 0 || scoreIndex > 2 || score < 1 || score > 5) {
    return { success: false, error: "Invalid score or scoreIndex" };
  }

  try {
    // Get existing evaluation
    const existingEval = must(
      await db
        .from("evaluations")
        .select("scores")
        .eq("judge_id", judgeId)
        .eq("project_id", projectId)
        .limit(1)
        .maybeSingle(),
    );

    if (!existingEval) {
      return {
        success: false,
        error: "Evaluation record not found",
      };
    }

    // Get current scores or initialize with nulls
    const currentScores: (number | null)[] = existingEval.scores || [null, null, null];
    const newScores = [...currentScores];
    newScores[scoreIndex] = score;

    // Update the evaluation
    must(
      await db
        .from("evaluations")
        .update({ scores: newScores as number[] })
        .eq("judge_id", judgeId)
        .eq("project_id", projectId),
    );

    revalidatePath(`/judgingportal/${judgeId}`);

    return {
      success: true,
    };
  } catch (error) {
    console.error("Error saving evaluation score:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to save evaluation score",
    };
  }
}

export async function saveCategoryRelevance(
  judgeId: string,
  projectId: string,
  relevance: number,
) {
  if (relevance < 1 || relevance > 5) {
    return { success: false, error: "Invalid relevance value" };
  }

  return updateEvaluationAndRevalidate(
    judgeId,
    projectId,
    { category_relevance: relevance },
    "Error saving category relevance:",
    "Failed to save category relevance",
  );
}

export async function saveNote(
  judgeId: string,
  projectId: string,
  note: string,
) {
  if (note.length > 10000) {
    return { success: false, error: "Note cannot exceed 10000 characters" };
  }

  return updateEvaluationAndRevalidate(
    judgeId,
    projectId,
    { note },
    "Error saving note:",
    "Failed to save note",
  );
}
