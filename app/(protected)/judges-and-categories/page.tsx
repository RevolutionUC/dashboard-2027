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
import { CategoryBadge } from "@/components/category-badge";
import { AssignJudgesToGroupsButton } from "./assign-judges-button";
import { EditCategoryModal } from "./edit-category-modal";
import { EditJudgeModal } from "./edit-judge-modal";
import { LoginAsJudgeButton } from "./login-as-judge-button";
import { NewCategoryModal } from "./new-category-modal";
import { NewJudgeModal } from "./new-judge-modal";
import { JudgeCheckinCheckbox } from "./judge-checkin-checkbox";
import { ClearAbsentJudgesButton } from "./clear-absent-judges-button";
import { TransferJudgeModal } from "./transfer-judge-modal";
import { DeleteCategoryButton } from "./delete-category-button";
import { DeleteJudgeButton } from "./delete-judge-button";

export default async function JudgeAndCategoriesPage() {
  const [categoryRows, judgeRows, judgeGroupRows, allAssignments] = await Promise.all([
    fetchAll(() =>
      db
        .from("categories")
        .select("id,name,type,judges(id),submissions(project_id)")
        .order("name")
        .order("id"),
    ),
    fetchAll(() =>
      db
        .from("judges")
        .select(
          "id,name,email,categoryId:category_id,judgeGroupId:judge_group_id,isCheckedin:is_checkedin,createdAt:created_at,category:categories!inner(name,type),judgeGroup:judge_groups(name)",
        )
        .order("category_id")
        .order("name")
        .order("id"),
    ),
    fetchAll(() =>
      db
        .from("judge_groups")
        .select("id,name,categoryId:category_id,category:categories!inner(name,type)")
        .order("name")
        .order("id"),
    ),
    must(await db.from("assignments").select("projectId:project_id").limit(1)),
  ]);

  const allCategories = categoryRows.map(({ judges, submissions, ...category }) => ({
    ...category,
    judgeCount: judges.length,
    projectCount: submissions.length,
  }));

  const allJudges = judgeRows.map(({ category, judgeGroup, ...judge }) => ({
    ...judge,
    categoryName: category.name,
    categoryType: category.type,
    judgeGroupName: judgeGroup?.name ?? null,
  }));

  const allJudgeGroups = judgeGroupRows.map(({ category, ...group }) => ({
    ...group,
    categoryName: category.name,
    categoryType: category.type,
  }));

  return (
    <main className="mx-auto w-full max-w-6xl p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Judges & Categories</h1>
        <p className="text-sm text-muted-foreground">
          Manage judges and their assigned categories
        </p>
      </div>

      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Categories ({allCategories.length})</CardTitle>
            <NewCategoryModal />
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-30">ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="w-30">Type</TableHead>
                    <TableHead className="w-20 text-center">Judges</TableHead>
                    <TableHead className="w-20 text-center">Projects</TableHead>
                    <TableHead className="w-20">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allCategories.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-center text-muted-foreground"
                      >
                        No categories found
                      </TableCell>
                    </TableRow>
                  ) : (
                    allCategories.map((category) => (
                      <TableRow key={category.id}>
                        <TableCell className="font-mono text-xs">
                          {category.id}
                        </TableCell>
                        <TableCell className="font-medium">
                          {category.name}
                        </TableCell>
                        <TableCell>
                          <CategoryBadge type={category.type} />
                        </TableCell>
                        <TableCell className="text-center">
                          {category.judgeCount ?? 0}
                        </TableCell>
                        <TableCell className="text-center">
                          {category.projectCount ?? 0}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <EditCategoryModal category={category} />
                            <DeleteCategoryButton
                              categoryId={category.id}
                              categoryName={category.name}
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Judges ({allJudges.length})</CardTitle>
            <div className="flex gap-2">
              <ClearAbsentJudgesButton />
              <AssignJudgesToGroupsButton />
              <NewJudgeModal categories={allCategories} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-center">Checked In</TableHead>
                    <TableHead>Group</TableHead>
                    <TableHead className="w-32">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allJudges.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-center text-muted-foreground"
                      >
                        No judges found
                      </TableCell>
                    </TableRow>
                  ) : (
                    allJudges.map((judge) => (
                      <TableRow key={judge.id}>
                        <TableCell className="font-medium">
                          {judge.name}
                        </TableCell>
                        <TableCell className="text-sm">{judge.email}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <span className="text-sm font-medium">
                              {judge.categoryName}
                            </span>
                            {judge.categoryType && (
                              <CategoryBadge type={judge.categoryType} />
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <JudgeCheckinCheckbox
                            judgeId={judge.id}
                            isCheckedin={judge.isCheckedin ?? false}
                          />
                        </TableCell>
                        <TableCell>
                          {judge.judgeGroupName ? (
                            <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-800">
                              {judge.judgeGroupName}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              Not assigned
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <EditJudgeModal
                              judge={judge}
                              categories={allCategories}
                            />
                            <LoginAsJudgeButton
                              judgeId={judge.id}
                              judgeName={judge.name}
                            />
                            <DeleteJudgeButton
                              judgeId={judge.id}
                              judgeName={judge.name}
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Judge Groups ({allJudgeGroups.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {allJudgeGroups.length === 0 ? (
              <div className="rounded-md border p-8 text-center text-muted-foreground">
                No judge groups found. Click &quot;Assign Judges to Groups&quot;
                to create groups.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {allJudgeGroups.map((group) => {
                  const groupMembers = allJudges.filter(
                    (j) => j.judgeGroupId === group.id,
                  );

                  const groupsOfSameCategory = allJudgeGroups.filter(
                    (g) => g.categoryId === group.categoryId && g.id !== group.id,
                  );
                  return (
                    <div
                      key={group.id}
                      className="flex flex-col rounded-lg border bg-card text-card-foreground shadow-sm"
                    >
                      <div className="flex flex-col space-y-1.5 p-4 pb-2">
                        <div className="flex items-center justify-between">
                          <h3 className="font-mono text-lg font-semibold tracking-tight">
                            {group.name}
                          </h3>
                          <CategoryBadge type={group.categoryType} />
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {group.categoryName}
                        </p>
                      </div>
                      <div className="flex flex-1 flex-col p-4 pt-2">
                        <div className="space-y-1">
                          {groupMembers.map((member) => (
                            <div
                              key={member.id}
                              className="group flex items-center justify-between rounded-md px-2 py-1.5 transition-colors hover:bg-accent"
                            >
                              <div className="flex flex-col">
                                <span className="text-sm font-medium">
                                  {member.name}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {member.email}
                                </span>
                              </div>
                              {member.judgeGroupId && groupsOfSameCategory.length > 0 && (
                                <TransferJudgeModal
                                  judge={{
                                    id: member.id,
                                    name: member.name,
                                    judgeGroupId: member.judgeGroupId,
                                    judgeGroupName: member.judgeGroupName ?? "",
                                    categoryId: group.categoryId,
                                  }}
                                  availableGroups={groupsOfSameCategory}
                                  disabled={allAssignments.length > 0}
                                  key={member.id}
                                />
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
