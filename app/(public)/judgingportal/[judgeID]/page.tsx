import { db, must } from "@/lib/db";
import { getJudgeContext } from "./lib";
import { ScoringInterface } from "./scoring-interface";

export default async function JudgingPortalPage({
  params,
}: {
  params: Promise<{ judgeID: string }>;
}) {
  const { judgeID } = await params;
  const { judgeInfo, categoryName, categoryType, judgeGroupName } =
    await getJudgeContext(judgeID);

  // Load evaluations for this judge with project details
  const evaluationRows = must(
    await db
      .from("evaluations")
      .select(
        "projectId:project_id,categoryId:category_id,scores,categoryRelevance:category_relevance,note,project:projects!inner(name,location,location2,url,status)",
      )
      .eq("judge_id", judgeID),
  )
    .map(({ project, ...row }) => ({
      ...row,
      projectName: project.name,
      projectLocation: project.location,
      projectLocation2: project.location2,
      projectUrl: project.url,
      projectStatus: project.status,
    }))
    .sort((a, b) => a.projectName.localeCompare(b.projectName));

  const assignedEvaluations = evaluationRows.map((row) => ({
    ...row,
    scores: row.scores || [null, null, null]
  }));

  return (
    <div className="min-h-screen bg-linear-to-b from-slate-50 to-slate-100 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-md">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-slate-900">Judging Portal</h1>
          <p className="mt-1 text-sm text-slate-600">
            Welcome, {judgeInfo.name}
          </p>
        </div>

        <div className="mb-4 space-y-2 rounded-lg bg-white px-4 py-3 shadow-sm">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500">Category:</span>
            <span className="font-semibold text-slate-900">{categoryName}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500">Judge Group:</span>
            <span className="font-semibold text-slate-900">
              {judgeGroupName}
            </span>
          </div>
        </div>

        <div className="mb-4 rounded-lg bg-white px-4 py-3 shadow-sm">
          <p className="text-sm text-slate-600">
            You have{" "}
            <span className="font-semibold text-slate-900">
              {assignedEvaluations.length}
            </span>{" "}
            projects to evaluate
          </p>
        </div>

        {assignedEvaluations.length === 0 ? (
          <div className="rounded-lg bg-white p-6 text-center shadow-sm">
            <p className="text-slate-600">
              No projects assigned to evaluate yet.
            </p>
          </div>
        ) : (
          <ScoringInterface
            evaluations={assignedEvaluations}
            judgeId={judgeID}
            categoryType={categoryType}
            showNoteInput={true}
          />
        )}
      </div>
    </div>
  );
}
