import { eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { categories, judgeGroups, judges } from "@/lib/db/schema";
import { assertJudgeApplicationApproved } from "@/lib/registration/judges";

export async function getJudgeContext(judgeID: string) {
  await assertJudgeApplicationApproved(judgeID);
  const judge = await db
    .select({
      id: judges.id,
      name: judges.name,
      judgeGroupId: judges.judgeGroupId,
      categoryId: judges.categoryId,
      judgingPhase: judges.judgingPhase,
    })
    .from(judges)
    .where(eq(judges.id, judgeID))
    .limit(1);

  if (judge.length === 0) {
    notFound();
  }

  const judgeInfo = judge[0];

  if (judgeInfo.judgingPhase === "finalized") {
    redirect("/judgingportal/finished");
  }

  const [categoryInfo, judgeGroupInfo] = await Promise.all([
    db
      .select({
        name: categories.name,
        type: categories.type,
      })
      .from(categories)
      .where(eq(categories.id, judgeInfo.categoryId))
      .limit(1),
    judgeInfo.judgeGroupId
      ? db
          .select({
            name: judgeGroups.name,
          })
          .from(judgeGroups)
          .where(eq(judgeGroups.id, judgeInfo.judgeGroupId))
          .limit(1)
      : Promise.resolve([]),
  ]);

  const categoryName = categoryInfo[0]?.name ?? "Unknown";
  const categoryType = categoryInfo[0]?.type ?? "General";
  const judgeGroupName = judgeGroupInfo[0]?.name ?? "Unknown";
  const isSponsor = categoryType === "Sponsor";

  return {
    judgeInfo,
    categoryName,
    categoryType,
    judgeGroupName,
    isSponsor,
  };
}
