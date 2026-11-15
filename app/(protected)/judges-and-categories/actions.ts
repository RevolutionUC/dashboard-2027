"use server";

import { revalidatePath } from "next/cache";
import { assertAuthorization } from "@/lib/auth";
import { withAuth } from "@/lib/action-wrapper";
import { db, fetchAll, must } from "@/lib/db";

export type CategoryType = "Sponsor" | "Inhouse" | "General" | "MLH";

interface CreateCategoryInput {
  id: string;
  name: string;
  type: CategoryType;
}

export async function deleteCategoryAction(categoryId: string) {
  await assertAuthorization();

  try {
    must(await db.from("categories").delete().eq("id", categoryId));
    revalidatePath("/judges-and-categories");
    return { success: true };
  } catch (error) {
    console.error("Error deleting category:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to delete category",
    };
  }
}

export const createCategory = withAuth(
  async (data: CreateCategoryInput) => {
    must(
      await db.from("categories").insert({
        id: data.id,
        name: data.name,
        type: data.type,
      }),
    );
    return {};
  },
  "create category",
  "/judges-and-categories",
);

interface BulkCreateCategoryInput {
  id: string;
  name: string;
  type: CategoryType;
}

export const createCategoriesBulk = withAuth(
  async (data: BulkCreateCategoryInput[]) => {
    must(await db.from("categories").insert(data.map(({ id, name, type }) => ({ id, name, type }))));
    return { count: data.length };
  },
  "create categories",
  "/judges-and-categories",
);

interface UpdateCategoryInput {
  id: string;
  newId?: string;
  name: string;
  type: CategoryType;
}

export const updateCategory = withAuth(
  async (data: UpdateCategoryInput) => {
    must(
      await db
        .from("categories")
        .update({
          id: data.newId ?? data.id,
          name: data.name,
          type: data.type,
        })
        .eq("id", data.id),
    );
    return { newId: data.newId || data.id };
  },
  "update category",
  "/judges-and-categories",
);

interface CreateJudgeInput {
  name: string;
  email: string;
  categoryId: string;
}

export const createJudge = withAuth(
  async (data: CreateJudgeInput) => {
    must(
      await db.from("judges").insert({
        name: data.name,
        email: data.email,
        category_id: data.categoryId,
      }),
    );
    return {};
  },
  "create judge",
  "/judges-and-categories",
);

interface BulkCreateJudgeInput {
  name: string;
  email: string;
  categoryId: string;
}

export const createJudgesBulk = withAuth(
  async (data: BulkCreateJudgeInput[]) => {
    must(
      await db
        .from("judges")
        .insert(data.map((j) => ({ name: j.name, email: j.email, category_id: j.categoryId }))),
    );
    return { count: data.length };
  },
  "create judges",
  "/judges-and-categories",
);

export async function updateJudgeAction(
  prevState: { success?: boolean; error?: string } | null,
  formData: FormData,
) {
  await assertAuthorization();

  const id = formData.get("id") as string;
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const categoryId = formData.get("categoryId") as string;

  if (!id || !name || !email || !categoryId) {
    return { error: "All fields are required" };
  }

  try {
    must(await db.from("judges").update({ name, email, category_id: categoryId }).eq("id", id));

    revalidatePath("/judges-and-categories");
    return { success: true };
  } catch (error) {
    console.error("Error updating judge:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update judge",
    };
  }
}

export async function deleteJudgeAction(judgeId: string) {
  await assertAuthorization();

  try {
    must(await db.from("judges").delete().eq("id", judgeId));
    revalidatePath("/judges-and-categories");
    return { success: true };
  } catch (error) {
    console.error("Error deleting judge:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to delete judge",
    };
  }
}

export async function toggleJudgeCheckinAction(judgeId: string) {
  await assertAuthorization();

  try {
    const judge = must(
      await db.from("judges").select("isCheckedin:is_checkedin").eq("id", judgeId).maybeSingle(),
    );

    if (!judge) {
      return { success: false, error: "Judge not found" };
    }

    must(await db.from("judges").update({ is_checkedin: !judge.isCheckedin }).eq("id", judgeId));

    revalidatePath("/judges-and-categories");
    return { success: true };
  } catch (error) {
    console.error("Error toggling judge checkin:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to toggle checkin",
    };
  }
}

export async function deleteAbsentJudgesAction() {
  await assertAuthorization();

  try {
    must(await db.from("judges").delete().eq("is_checkedin", false));

    revalidatePath("/judges-and-categories");
    return { success: true };
  } catch (error) {
    console.error("Error deleting absent judges:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to delete absent judges",
    };
  }
}

interface JudgeWithCategory {
  id: string;
  name: string;
  email: string;
  categoryId: string;
  category: {
    id: string;
    name: string;
    type: CategoryType;
  };
}

interface JudgeGroupInfo {
  categoryId: string;
  members: JudgeWithCategory[];
  name: string;
}

export async function assignJudgesToGroups() {
  try {
    await assertAuthorization();

    const allJudges: JudgeWithCategory[] = await fetchAll(() =>
      db
        .from("judges")
        .select("id,name,email,categoryId:category_id,category:categories!inner(id,name,type)")
        .order("id"),
    );

    const allCategories = must(await db.from("categories").select("id").order("id"));

    // Group judges by category
    const judgesByCategories = allJudges.reduce(
      (acc, judge) => {
        const categoryId = judge.categoryId;
        if (!acc.has(categoryId)) {
          acc.set(categoryId, []);
        }
        acc.get(categoryId)!.push(judge);
        return acc;
      },
      new Map() as Map<string, JudgeWithCategory[]>,
    );

    // Judge group organization logic
    const judgeGroupsToCreate: JudgeGroupInfo[] = [];

    for (const [categoryId, judgesOfThisCategory] of judgesByCategories) {
      const category = judgesOfThisCategory[0].category;

      // If category type is 'Sponsor' or 'MLH', put all judges of that category into one group
      if (category.type === "Sponsor" || category.type === "MLH") {
        judgeGroupsToCreate.push({
          categoryId,
          members: judgesOfThisCategory,
          name: "PLACEHOLDER",
        });
      } else {
        // Chunk into groups of two for other categories
        for (let i = 0; i < judgesOfThisCategory.length; i += 2) {
          judgeGroupsToCreate.push({
            categoryId,
            members: judgesOfThisCategory.slice(i, i + 2),
            name: "",
          });
        }
      }
    }

    // Assign names to groups
    const judgeGroupCountByCategory: Record<string, number> = {};
    const categoryIndex = new Map(
      allCategories.map((c, index) => [c.id, index]),
    );

    for (const group of judgeGroupsToCreate) {
      const count = (judgeGroupCountByCategory[group.categoryId] || 0) + 1;
      judgeGroupCountByCategory[group.categoryId] = count;

      const firstChar = String.fromCharCode(
        65 + (categoryIndex.get(group.categoryId) ?? -1),
      );
      const secondChar = count.toString();

      group.name = `${firstChar}${secondChar}`;
    }

    // Atomically replace judge groups and assign members (see replace_judge_groups in supabase/migrations)
    must(
      await db.rpc("replace_judge_groups", {
        p_groups: judgeGroupsToCreate.map((g) => ({
          name: g.name,
          category_id: g.categoryId,
          judge_ids: g.members.map((j) => j.id),
        })),
      }),
    );

    revalidatePath("/judges-and-categories");
    return {
      success: true,
      groupCount: judgeGroupsToCreate.length,
    };
  } catch (error) {
    console.error("Error assigning judges to groups:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to assign judges to groups",
    };
  }
}

interface TransferJudgeInput {
  judgeId: string;
  targetGroupId: number;
}

export const transferJudgeToGroup = withAuth(
  async (data: TransferJudgeInput) => {
    const judge = must(
      await db.from("judges").select("judgeGroupId:judge_group_id").eq("id", data.judgeId).maybeSingle(),
    );

    if (!judge || !judge.judgeGroupId) {
      return { success: false, error: "Judge is not assigned to a group" };
    }

    const existingAssignments = must(await db.from("assignments").select("project_id").limit(1));

    if (existingAssignments.length > 0) {
      return {
        success: false,
        error: "Cannot transfer: assignments already exist",
      };
    }

    must(await db.from("judges").update({ judge_group_id: data.targetGroupId }).eq("id", data.judgeId));

    revalidatePath("/judges-and-categories");
    return { success: true };
  },
  "transfer judge to group",
  "/judges-and-categories",
);

