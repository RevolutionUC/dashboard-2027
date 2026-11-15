import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { db, fetchAll } from "@/lib/db";
import { AssignSubmissionsButton } from "./assign-submissions-button";
import { ClearAssignmentsButton } from "./clear-assignments-button";

export default async function AssignmentsPage() {
  // Fetch all assignments with judge group and project info
  const assignmentRows = (
    await fetchAll(() =>
      db
        .from("assignments")
        .select(
          "judgeGroupId:judge_group_id,projectId:project_id,judgeGroup:judge_groups!inner(name,categoryId:category_id,category:categories!inner(name,type)),project:projects!inner(name)",
        )
        .order("judge_group_id")
        .order("project_id"),
    )
  )
    .map((row) => ({
      judgeGroupId: row.judgeGroupId,
      projectId: row.projectId,
      judgeGroupName: row.judgeGroup.name,
      categoryId: row.judgeGroup.categoryId,
      categoryName: row.judgeGroup.category.name,
      categoryType: row.judgeGroup.category.type,
      projectName: row.project.name,
    }))
    .sort(
      (a, b) =>
        a.judgeGroupName.localeCompare(b.judgeGroupName) || a.projectName.localeCompare(b.projectName),
    );

  // Count judges in each group
  const judgesWithGroup = await fetchAll(() =>
    db.from("judges").select("id,judgeGroupId:judge_group_id").not("judge_group_id", "is", null).order("id"),
  );

  const judgeCountByGroup = judgesWithGroup.reduce(
    (acc, row) => {
      if (row.judgeGroupId !== null) {
        acc[row.judgeGroupId] = (acc[row.judgeGroupId] ?? 0) + 1;
      }
      return acc;
    },
    {} as Record<number, number>,
  );

  // Group assignments by judge group
  const assignmentsByJudgeGroup = assignmentRows.reduce(
    (acc, row) => {
      if (!acc[row.judgeGroupId]) {
        acc[row.judgeGroupId] = {
          judgeGroupId: row.judgeGroupId,
          judgeGroupName: row.judgeGroupName,
          judgeCount: judgeCountByGroup[row.judgeGroupId] || 0,
          categoryId: row.categoryId,
          categoryName: row.categoryName,
          categoryType: row.categoryType,
          projects: [],
        };
      }
      acc[row.judgeGroupId].projects.push({
        id: row.projectId,
        name: row.projectName,
      });
      return acc;
    },
    {} as Record<
      number,
      {
        judgeGroupId: number;
        judgeGroupName: string;
        judgeCount: number;
        categoryId: string;
        categoryName: string;
        categoryType: string;
        projects: Array<{ id: string; name: string }>;
      }
    >,
  );

  const judgeGroupsList = Object.values(assignmentsByJudgeGroup);
  const totalAssignments = assignmentRows.length;

  return (
    <main className="mx-auto w-full p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">
          Assignments ({totalAssignments})
        </h1>
        <p className="text-sm text-muted-foreground">
          View project assignments to judge groups
        </p>
      </div>

      <div className="mb-6 flex gap-2">
        <AssignSubmissionsButton />
        <ClearAssignmentsButton />
      </div>

      {judgeGroupsList.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">
              No assignments found. Create judge groups and assign projects
              first.
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
          {judgeGroupsList.map((judgeGroup) => (
            <Card key={judgeGroup.judgeGroupId} className="flex flex-col">
              <CardHeader className="pb-2">
                <h3 className="font-semibold text-sm">
                  {judgeGroup.judgeGroupName} ({judgeGroup.judgeCount} judges)
                </h3>
                <p className="text-xs text-muted-foreground">
                  {judgeGroup.categoryName} ({judgeGroup.projects.length} projects)
                </p>
              </CardHeader>
              <CardContent className="flex-1 pt-0">
                <div className="space-y-0.5">
                  {judgeGroup.projects.map((project) => (
                    <div
                      key={project.id}
                      className="text-xs leading-relaxed text-foreground hover:text-muted-foreground transition-colors"
                    >
                      {project.name}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}
