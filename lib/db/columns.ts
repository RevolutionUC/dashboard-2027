/**
 * PostgREST select strings that alias snake_case columns to the camelCase
 * keys the app has always used, so query results keep the same shape.
 */

export const USER_COLUMNS =
  "id,name,email,emailVerified,image,createdAt,updatedAt,banned,banReason,banExpires";

export const PARTICIPANT_COLUMNS =
  "user_id,firstName:first_name,lastName:last_name,email,phone,age,gender,school,levelOfStudy:level_of_study,country,major,dietRestrictions:diet_restrictions,linkedinUrl:linkedin_url,githubUrl:github_url,shirtSize:shirt_size,hackathons,raceEthnicity:race_ethnicity,referralSource:referral_source,resumeUrl:resume_url,qrBase64:qr_base64,status,checkedIn:checked_in,createdAt:created_at,updatedAt:updated_at";

export const EVENT_COLUMNS =
  "id,name,description,eventType:event_type,startTime:start_time,endTime:end_time,location,capacity,createdAt:created_at,updatedAt:updated_at";

export const DAY_OF_SCHEDULE_COLUMNS =
  "id,name,startTime:start_time,endTime:end_time,location,capacity,visibility,createdBy:created_by,createdAt:created_at,updatedAt:updated_at";

export const ACCESS_REQUEST_COLUMNS =
  "id,userId:user_id,email,name,image,status,role,requestedAt:requested_at,reviewedAt:reviewed_at,reviewedBy:reviewed_by";

export const CATEGORY_COLUMNS = "id,name,type,createdAt:created_at,updatedAt:updated_at";

export const JUDGE_GROUP_COLUMNS = "id,name,categoryId:category_id,createdAt:created_at,updatedAt:updated_at";

export const JUDGE_COLUMNS =
  "id,name,email,categoryId:category_id,judgeGroupId:judge_group_id,judgingPhase:judging_phase,isCheckedin:is_checkedin,createdAt:created_at,updatedAt:updated_at";

export const PROJECT_COLUMNS =
  "id,name,status,url,location,location2,disqualifyReason:disqualify_reason,createdAt:created_at,updatedAt:updated_at";

export const EVALUATION_COLUMNS =
  "projectId:project_id,judgeId:judge_id,categoryId:category_id,scores,categoryRelevance:category_relevance,categoryBordaScore:category_borda_score,note";
