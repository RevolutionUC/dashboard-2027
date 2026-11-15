import { notFound, redirect } from "next/navigation";
import { db, must } from "@/lib/db";

// Judge IDs come straight from the URL, so reject anything that isn't a UUID
// before querying (Postgres would otherwise raise an invalid-uuid error).
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function getJudgeContext(judgeID: string) {
  if (!UUID_PATTERN.test(judgeID)) {
    notFound();
  }

  const judge = must(
    await db
      .from("judges")
      .select(
        "id,name,judgeGroupId:judge_group_id,categoryId:category_id,judgingPhase:judging_phase,category:categories(name,type),judgeGroup:judge_groups(name)",
      )
      .eq("id", judgeID)
      .maybeSingle(),
  );

  if (!judge) {
    notFound();
  }

  const { category, judgeGroup, ...judgeInfo } = judge;

  if (judgeInfo.judgingPhase === "finalized") {
    redirect("/judgingportal/finished");
  }

  const categoryName = category?.name ?? "Unknown";
  const categoryType = category?.type ?? "General";
  const judgeGroupName = judgeGroup?.name ?? "Unknown";
  const isSponsor = categoryType === "Sponsor";

  return {
    judgeInfo,
    categoryName,
    categoryType,
    judgeGroupName,
    isSponsor,
  };
}
