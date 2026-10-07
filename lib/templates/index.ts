import * as React from "react";
import { render } from "@react-email/render";
import * as ConfirmAttendance from "./ConfirmAttendance";
import * as ConfirmAttendanceFollowUp from "./ConfirmAttendanceFollowUp";
import * as DateChange from "./DateChange";
import * as GeneralEmail from "./GeneralEmail";
import * as InfoEmail1 from "./InfoEmail1";
import * as InfoEmail2 from "./InfoEmail2";
import * as InfoEmail3 from "./InfoEmail3";
import * as InfoEmail4 from "./InfoEmail4";
import * as InfoEmailCTF from "./InfoEmailCTF";
import * as InfoEmailJudges from "./InfoEmailJudges";
import * as InfoEmailWaitlist from "./InfoEmailWaitlist";
import * as InfoEmailWaitlist2 from "./InfoEmailWaitlist2";
import * as InfoEmailWaitlistPass1 from "./InfoEmailWaitlistPass1";
import * as IgnorePreviousEmail from "./IgnorePreviousEmail";
import * as JudgePortalLink from "./JudgePortalLink";
import * as LatticeResetPassword from "./LatticeResetPassword";
import * as MarketingEmail from "./MarketingEmail";
import * as PostEventEmail from "./PostEventEmail";
import * as PostEventJudgeEmail from "./PostEventJudgeEmail";
import * as PostEventSurveyReminder from "./PostEventSurveyReminder";
import * as RegistrationOpen from "./RegistrationOpen";
import * as SubmissionReminder from "./SubmissionReminder";
import * as VerifyEmail from "./VerifyEmail";
import * as WaiverUpdate from "./WaiverUpdate";
import * as WelcomeEmail from "./WelcomeEmail";

interface SharedEmailProps {
  firstName?: string;
}

interface GeneralEmailProps extends SharedEmailProps {
  body?: string;
}

type EmailTemplateProps = SharedEmailProps | GeneralEmailProps | Record<string, never>;

export interface EmailTemplateMeta {
  id: string;
  name: string;
  subject: string;
  description: string;
  component: React.ComponentType<any>;
  requiredProps?: string[];
}

interface TemplateMeta {
  id: string;
  name: string;
  subject: string;
  description: string;
  requiredProps?: string[];
}

interface TemplateModule {
  meta?: TemplateMeta;
  default?: React.ComponentType<any>;
}

type TemplateNamespace = {
  default?: React.ComponentType<any>;
  [key: string]: unknown;
};

function extractTemplateMeta(module: TemplateNamespace): TemplateMeta | undefined {
  if (module.meta && typeof module.meta === "object") {
    return module.meta as TemplateMeta;
  }
  const namedMeta = Object.entries(module).find(
    ([key, value]) => key.endsWith("Meta") && value && typeof value === "object",
  );
  return namedMeta?.[1] as TemplateMeta | undefined;
}

const rawModules: TemplateNamespace[] = [
  ConfirmAttendance,
  ConfirmAttendanceFollowUp,
  DateChange,
  GeneralEmail,
  InfoEmail1,
  InfoEmail2,
  InfoEmail3,
  InfoEmail4,
  InfoEmailCTF,
  InfoEmailJudges,
  InfoEmailWaitlist,
  InfoEmailWaitlist2,
  InfoEmailWaitlistPass1,
  IgnorePreviousEmail,
  JudgePortalLink,
  LatticeResetPassword,
  MarketingEmail,
  PostEventEmail,
  PostEventJudgeEmail,
  PostEventSurveyReminder,
  RegistrationOpen,
  SubmissionReminder,
  VerifyEmail,
  WaiverUpdate,
  WelcomeEmail,
];

const modules: TemplateModule[] = rawModules.map((module) => ({
  meta: extractTemplateMeta(module),
  default: module.default,
}));

export const emailTemplates: EmailTemplateMeta[] = modules
  .filter((m): m is Required<TemplateModule> => !!m.meta && !!m.default)
  .map((m) => ({ ...m.meta!, component: m.default! }));

export function getTemplateById(id: string): EmailTemplateMeta | undefined {
  return emailTemplates.find((template) => template.id === id);
}

function getAllTemplates(): EmailTemplateMeta[] {
  return emailTemplates;
}

export interface RenderEmailProps {
  [key: string]: any;
}

export async function renderTemplateToHtml(
  templateId: string,
  props: RenderEmailProps,
): Promise<string | null> {
  const template = getTemplateById(templateId);
  if (!template) return null;
  const element = React.createElement(template.component, props);
  return render(element);
}

export async function renderTemplateToText(
  templateId: string,
  props: RenderEmailProps,
): Promise<string | null> {
  const template = getTemplateById(templateId);
  if (!template) return null;
  const element = React.createElement(template.component, props);
  return render(element, { plainText: true });
}
