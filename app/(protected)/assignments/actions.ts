"use server";

import { revalidatePath } from "next/cache";
import { assertAuthorization } from "@/lib/auth";
import { db, fetchAll, must } from "@/lib/db";
import { RotatingQueue } from "@/lib/rotating-queue";
import { MinHeap } from "@/lib/min-heap";

const SUGGESTED_JUDGE_GROUP_COUNT_PER_SUBMISSION_BASED_ON_CATEGORY_TYPE = {
  General: 1,
  Inhouse: 2,
  Sponsor: 1,
  MLH: 0,
} as const;

interface JudgeGroupWithCount {
  id: number;
  categoryId: string;
  categoryType: string;
  judgeCount: number;
}

export async function assignProjectsToJudgeGroups(
  prevState: { success?: boolean; error?: string } | null,
  formData: FormData,
) {
  const minimumJudgesPerProject = Number(formData.get("minimumJudges")) || 6;

  try {
    await assertAuthorization();

    // Find General category ID
    const generalCategory = must(
      await db.from("categories").select("id").eq("type", "General").limit(1),
    );

    let generalCategoryId: string;

    if (generalCategory.length === 0) {
      // Create the General category if not exists yet
      const newGeneralCategory = must(
        await db
          .from("categories")
          .insert({ id: "general", name: "General", type: "General" })
          .select("id")
          .single(),
      );
      generalCategoryId = newGeneralCategory.id;
    } else {
      generalCategoryId = generalCategory[0].id;
    }

    // Preconditions: Check minimum General judges
    // const [{count: generalJudgesCount}] = await db
    //   .select({ count: count() })
    //   .from(judges)
    //   .where(eq(judges.categoryId, generalCategoryId));

    // if (generalJudgesCount < minimumJudgesPerProject) {
    //   return {
    //     success: false,
    //     error: `There must be at least ${minimumJudgesPerProject} General judges. Currently have ${generalJudgesCount}.`,
    //   };
    // }

    // Fetch all submissions with category info
    const allSubmissions = (
      await fetchAll(() =>
        db
          .from("submissions")
          .select("projectId:project_id,categoryId:category_id,category:categories!inner(type)")
          .order("project_id")
          .order("category_id"),
      )
    ).map(({ category, ...s }) => ({ ...s, categoryType: category.type }));

    // Fetch all judge groups with their judges and category type
    const allJudgeGroups = await fetchAll(() =>
      db
        .from("judge_groups")
        .select("id,categoryId:category_id,category:categories!inner(type),judges(id)")
        .order("id"),
    );

    const judgeGroupsWithCounts: JudgeGroupWithCount[] = allJudgeGroups.map((g) => ({
      id: g.id,
      categoryId: g.categoryId,
      categoryType: g.category.type,
      judgeCount: g.judges.length,
    }));

    if (judgeGroupsWithCounts.length === 0) {
      return {
        success: false,
        error:
          "Need judge groups before assigning projects. Please create judge groups first.",
      };
    }

    // Phase 1: Assign submissions to judge groups based on category (except General submissions)
    // We use round-robin to assign projects across judge groups.
    // So we create rotating queues of groups per category help easily distribute projects into different groups continously
    const groupsQueueByCategory = judgeGroupsWithCounts.reduce((acc, group) => {
      if (!acc.has(group.categoryId)) {
        acc.set(group.categoryId, new RotatingQueue<JudgeGroupWithCount>([]));
      }
      acc.get(group.categoryId)!.add(group);
      return acc;
    }, new Map<string, RotatingQueue<JudgeGroupWithCount>>());

    const assignmentList: Array<{ projectId: string; judgeGroup: JudgeGroupWithCount, submissionCategoryId: string }> = [];

    for (const submission of allSubmissions) {
      if (submission.categoryId === 'general') {
          continue
      }
      const groupsQueue = groupsQueueByCategory.get(submission.categoryId);
      if (!groupsQueue || groupsQueue.length === 0) {
        continue; // Skip if no judge groups for this category
      }

      // Determine how many groups to assign to this project based on its category
      const howManyGroupsOfThisCategory = groupsQueue.length;
      const suggestedGroupCount = SUGGESTED_JUDGE_GROUP_COUNT_PER_SUBMISSION_BASED_ON_CATEGORY_TYPE[submission.categoryType] || 1;
      const howManyJudgeGroupsToAssign = Math.min(howManyGroupsOfThisCategory, suggestedGroupCount);

      // Continously rotate through available groups to asign project
      for (let i = 0; i < howManyJudgeGroupsToAssign; i++) {
        assignmentList.push({ projectId: submission.projectId, judgeGroup: groupsQueue.getNext(), submissionCategoryId: submission.categoryId });
      }
    }

    // Phase 2: General-only projects will have insufficient judges so we assign additional groups for these
    const assignmentsByProject = new Map<
      string,
      Array<{ projectId: string; judgeGroup: JudgeGroupWithCount, submissionCategoryId: string }>
    >();

    // Fist, we organize assignments by projectId to see how many judges per project already
    for (const assignment of assignmentList) {
      if (!assignmentsByProject.has(assignment.projectId)) {
        assignmentsByProject.set(assignment.projectId, []);
      }
      assignmentsByProject.get(assignment.projectId)!.push(assignment);
    }

    // There might be projects that don't have any assignment yet due to being General-only, so we must init them with []
    for (const submission of allSubmissions) {
      if (!assignmentsByProject.get(submission.projectId)) {
        assignmentsByProject.set(submission.projectId, [])
      }
    }

    const generalGroupQueue = groupsQueueByCategory.get("general");

    if (generalGroupQueue && generalGroupQueue.length > 0) {
      // If there are General groups, we use them to handle insufficient-judge project
      for (const [projectId, projectAssignments] of assignmentsByProject) {
        let howManyJudgesAlready = projectAssignments.reduce((sum, a) => sum + a.judgeGroup.judgeCount, 0);
        const alreadyUsedGroupIds = new Set(projectAssignments.map((a) => a.judgeGroup.id));

        // If less judges than desired minimum, we use a while loop to continously assign additional General groups until achieved desire count
        let safetyCounterToPreventInfiniteLoop = 0;
        while (howManyJudgesAlready < minimumJudgesPerProject && safetyCounterToPreventInfiniteLoop < 100) {
          const nextGeneralGroup = generalGroupQueue.getNext();

          if (alreadyUsedGroupIds.has(nextGeneralGroup.id)) continue

          assignmentList.push({ projectId, judgeGroup: nextGeneralGroup, submissionCategoryId: "general" });
          alreadyUsedGroupIds.add(nextGeneralGroup.id);
          howManyJudgesAlready += nextGeneralGroup.judgeCount;

          safetyCounterToPreventInfiniteLoop += 1;
        }
      }
    } else {
      // With this system, Inhouse (or even Sponsor judges - but let's stay with Inhouse now) can also judge General
      // So we can use Inhouse groups when no General judges available (or when we delibrately set 0 General judges)
      // We will distribute projects into Inhouse groups prioritizing lower project-count group first
      const inhouseGroups = judgeGroupsWithCounts.filter(g => g.categoryType === "Inhouse" && g.judgeCount > 0);

      if (inhouseGroups.length === 0) {
        return {
          success: false,
          error: "No General judges and no Inhouse groups available. Cannot assign minimum judges per project.",
        };
      }

      // Track project count per Inhouse group
      const inhouseGroupProjectCounts = new Map<number, number>();
      for (const group of inhouseGroups) {
        inhouseGroupProjectCounts.set(group.id, 0);
      }

      for (const assignment of assignmentList) {
        const groupId = assignment.judgeGroup.id;
        if (inhouseGroupProjectCounts.has(groupId)) {
          inhouseGroupProjectCounts.set(groupId, (inhouseGroupProjectCounts.get(groupId) || 0) + 1);
        }
      }

      // Build min-heap prioritized by project count (ascending)
      const inhouseHeap = new MinHeap<JudgeGroupWithCount>((a, b) => {
        const countA = inhouseGroupProjectCounts.get(a.id) || 0;
        const countB = inhouseGroupProjectCounts.get(b.id) || 0;
        return countA - countB;
      });

      for (const group of inhouseGroups) {
        inhouseHeap.insert(group);
      }

      // Now we distribute projects
      for (const [projectId, projectAssignments] of assignmentsByProject) {
        let howManyJudgesAlready = projectAssignments.reduce((sum, a) => sum + a.judgeGroup.judgeCount, 0);
        const alreadyUsedGroupIds = new Set(projectAssignments.map((a) => a.judgeGroup.id));

        const skippedGroups: JudgeGroupWithCount[] = [];

        let safetyCounterToPreventInfiniteLoop = 0;
        while (howManyJudgesAlready < minimumJudgesPerProject && safetyCounterToPreventInfiniteLoop < 100) {
          const nextInhouseGroup = inhouseHeap.extractMin();

          if (!nextInhouseGroup) break;

          if (alreadyUsedGroupIds.has(nextInhouseGroup.id)) {
            skippedGroups.push(nextInhouseGroup);
            continue;
          }

          assignmentList.push({ projectId, judgeGroup: nextInhouseGroup, submissionCategoryId: "general" });
          alreadyUsedGroupIds.add(nextInhouseGroup.id);
          howManyJudgesAlready += nextInhouseGroup.judgeCount;

          // Update project count and re-heapify by re-inserting
          const newCount = (inhouseGroupProjectCounts.get(nextInhouseGroup.id) || 0) + 1;
          inhouseGroupProjectCounts.set(nextInhouseGroup.id, newCount);
          inhouseHeap.insert(nextInhouseGroup);

          safetyCounterToPreventInfiniteLoop += 1;
        }

        // Put skipped groups back into heap
        for (const group of skippedGroups) {
          inhouseHeap.insert(group);
        }
      }
    }

    // Post-condition: Check that all projects have sufficient number of judges
    const judgeCountPerProject = assignmentList.reduce((acc, assignment) => {
      const currentCount = acc.get(assignment.projectId) || 0;
      acc.set(assignment.projectId, currentCount + assignment.judgeGroup.judgeCount);
      return acc;
    }, new Map<string, number>());

    const projectsWithInsufficientJudges: string[] = [];

    for (const [projectId, judgeCount] of judgeCountPerProject) {
      if (judgeCount < minimumJudgesPerProject) {
        projectsWithInsufficientJudges.push(projectId);
      }
    }

    if (projectsWithInsufficientJudges.length > 0) {
      const projectList = projectsWithInsufficientJudges.join('\n');
      return {
        success: false,
        error: `${projectsWithInsufficientJudges.length} project(s) have less than ${minimumJudgesPerProject} judges). Projects: ${projectList}`,
      };
    }

    // De-duplicate duplicated assignment because I am paranoid
    const seen = new Set<string>();

    const dedupedAssignmentList = assignmentList.filter((assignment) => {
      const key = `${assignment.judgeGroup.id}:${assignment.projectId}`;
      if (seen.has(key)) return false;

      seen.add(key);
      return true;
    });

    const assignmentsToInsert = dedupedAssignmentList.map(
      (a) => ({
        projectId: a.projectId,
        judgeGroupId: a.judgeGroup.id,
        submissionCategoryId: a.submissionCategoryId
      }),
    );

    // Also Create evaluation records for each judge-project pair
    const judgesByGroupId = new Map(allJudgeGroups.map(g => [g.id, g.judges]));

    // Create evaluation records: From `assignments`, each (judgeId, projectId) pair is a unique evaluation
    const evaluationsToInsert = assignmentsToInsert.flatMap((assignment) => {
      const judges = judgesByGroupId.get(assignment.judgeGroupId) || [];

      return judges.map((judge) => ({
        project_id: assignment.projectId,
        judge_id: judge.id,
        category_id: assignment.submissionCategoryId,
      }));
    });

    // Atomically replace assignments and evaluations (see replace_assignments in supabase/migrations)
    must(
      await db.rpc("replace_assignments", {
        p_assignments: assignmentsToInsert.map((a) => ({
          project_id: a.projectId,
          judge_group_id: a.judgeGroupId,
        })),
        p_evaluations: evaluationsToInsert,
      }),
    );

    revalidatePath("/assignments");

    return {
      success: true,
      count: assignmentsToInsert.length,
      projectsAssigned: judgeCountPerProject.size,
      evaluationsCreated: evaluationsToInsert.length,
    };
  } catch (error) {
    console.error("Error assigning submissions to judge groups:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to assign submissions to judge groups",
    };
  }
}

export async function clearAllAssignmentsAction() {
  try {
    await assertAuthorization();

    must(await db.rpc("clear_assignments"));

    revalidatePath("/assignments");
    return { success: true };
  } catch (error) {
    console.error("Error clearing assignments:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to clear assignments",
    };
  }
}
