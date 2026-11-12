import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { db, fetchAll, must } from "@/lib/db";
import { CategoryFilter } from "./category-filter";

interface ProjectScore {
  projectId: string;
  projectName: string;
  totalBordaScore: number;
  numJudgesRanked: number;
  numJudgesAssigned: number;
}

export default async function CagetoryScoringsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const params = await searchParams;
  const selectedCategoryId = params.category;

  const allCategories = must(
    await db.from("categories").select("id,name").neq("type", "General").order("name"),
  );

  let projectScores: ProjectScore[] = [];

  if (selectedCategoryId) {
    const categoryExists = allCategories.find((c) => c.id === selectedCategoryId);

    if (categoryExists) {
      // Get all evaluations for projects in this category
      const allEvals = (
        await fetchAll(() =>
          db
            .from("evaluations")
            .select(
              "projectId:project_id,judgeId:judge_id,categoryBordaScore:category_borda_score,project:projects!inner(name)",
            )
            .eq("category_id", selectedCategoryId)
            .order("judge_id")
            .order("project_id"),
        )
      ).map(({ project, ...evaluation }) => ({ ...evaluation, projectName: project.name }));

      // Count assigned judges per project
      const assignedJudgeCountByProject = new Map<string, number>();
      for (const evaluation of allEvals) {
        assignedJudgeCountByProject.set(
          evaluation.projectId,
          (assignedJudgeCountByProject.get(evaluation.projectId) || 0) + 1,
        );
      }

      // Filter and aggregate ranked evaluations (bordaScore > 0)
      const rankedEvals = allEvals.filter((e) => (e.categoryBordaScore ?? 0) > 0);

      // Aggregate scores and count ranked judges per project
      const scoreMap = new Map<
        string,
        { name: string; totalScore: number; rankedCount: number }
      >();

      // Sump up the total borda score from ranked evaluations
      for (const row of rankedEvals) {
        const existing = scoreMap.get(row.projectId);
        const score = row.categoryBordaScore ?? 0;

        if (existing) {
          existing.totalScore += score;
          existing.rankedCount += 1;
        } else {
          scoreMap.set(row.projectId, {
            name: row.projectName ?? "Unknown",
            totalScore: score,
            rankedCount: 1,
          });
        }
      }

      // Build final results
      const results: ProjectScore[] = [];
      for (const [projectId, data] of scoreMap) {
        const assigned = assignedJudgeCountByProject.get(projectId) ?? 0;
        results.push({
          projectId,
          projectName: data.name,
          totalBordaScore: data.totalScore,
          numJudgesRanked: data.rankedCount,
          numJudgesAssigned: assigned,
        });
      }

      projectScores = results.sort(
        (a, b) => b.totalBordaScore - a.totalBordaScore,
      );
    }
  }

  const selectedCategory = selectedCategoryId
    ? allCategories.find((c) => c.id === selectedCategoryId)
    : null;

  return (
    <main className="mx-auto w-full max-w-6xl p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Category Scorings</h1>
        <p className="text-sm text-muted-foreground">
          View project scores by sponsor category
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Filter by Category</CardTitle>
        </CardHeader>
        <CardContent>
          <CategoryFilter
            categories={allCategories}
            selectedCategory={selectedCategoryId || ""}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            {selectedCategory
              ? `Project Scores: ${selectedCategory.name}`
              : "Select a Category"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {selectedCategoryId ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">Rank</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead className="text-right">
                      Total Borda Score
                    </TableHead>
                    <TableHead className="text-right">Judges</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projectScores.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="text-center text-muted-foreground"
                      >
                        No scores available for this category
                      </TableCell>
                    </TableRow>
                  ) : (
                    projectScores.map((score, index) => (
                      <TableRow key={score.projectId}>
                        <TableCell className="font-medium">
                          {index + 1}
                        </TableCell>
                        <TableCell>{score.projectName}</TableCell>
                        <TableCell className="text-right">
                          {score.totalBordaScore}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {score.numJudgesRanked}/{score.numJudgesAssigned}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              Please select a category to view scores
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
