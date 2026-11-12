import { redirect } from "next/navigation";
import { db, must } from "@/lib/db";
import type { EvaluationWithScore } from "../../types";
import { getJudgeContext } from "../lib";
import { RankingInterface } from "./ranking-interface";

export default async function RankingPage({
  params,
}: {
  params: Promise<{ judgeID: string }>;
}) {
  const { judgeID } = await params;
  const { judgeInfo, categoryName, categoryType, judgeGroupName, isSponsor } =
    await getJudgeContext(judgeID);

  if (categoryType === "General") {
    redirect("/judgingportal/finished");
  }

  const evaluationRows = must(
    await db
      .from("evaluations")
      .select(
        "projectId:project_id,scores,categoryRelevance:category_relevance,categoryBordaScore:category_borda_score,project:projects!inner(name,location,location2)",
      )
      .eq("judge_id", judgeID)
      .neq("category_id", "general"),
  ).map(({ project, ...row }) => ({
    ...row,
    projectName: project.name,
    projectLocation: project.location,
    projectLocation2: project.location2,
  }));

  const evaluationsWithScores: EvaluationWithScore[] = evaluationRows.map(
    (row) => {
      const scores = row.scores || [0, 0, 0];
      const totalScore = scores.reduce(
        (sum: number, s: number | null) => sum + (s || 0),
        0,
      );
      const relevanceMultiplier = isSponsor
        ? (row.categoryRelevance || 0) / 5
        : 1;
      const calculatedScore = totalScore * relevanceMultiplier;

      return {
        projectId: row.projectId,
        projectName: row.projectName,
        projectLocation: row.projectLocation,
        projectLocation2: row.projectLocation2,
        scores: scores as number[],
        categoryRelevance: row.categoryRelevance,
        categoryBordaScore: row.categoryBordaScore,
        calculatedScore,
      };
    },
  );

  evaluationsWithScores.sort((a, b) => b.calculatedScore - a.calculatedScore);

  return (
    <div className="min-h-screen bg-linear-to-b from-slate-50 to-slate-100 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-md">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-slate-900">Ranking</h1>
          <p className="mt-1 text-sm text-slate-600">
            {judgeInfo.name} - {categoryName}
          </p>
        </div>

        <div className="mb-4 space-y-2 rounded-lg bg-white px-4 py-3 shadow-sm">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500">Judge Group:</span>
            <span className="font-semibold text-slate-900">
              {judgeGroupName}
            </span>
          </div>
        </div>

        <RankingInterface
          evaluations={evaluationsWithScores}
          judgeId={judgeID}
          categoryType={categoryType}
        />
      </div>
    </div>
  );
}
