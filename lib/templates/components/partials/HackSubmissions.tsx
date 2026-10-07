import * as React from "react";
import { EmailText } from "../EmailText";
import { brandColors } from "../EmailLayout";

export const HackSubmissionsPartial: React.FC = () => {
  return (
    <EmailText>
      <strong style={{ color: brandColors.darkNavy }}>Hack Submission</strong>
      <br />
      All projects must be <em>in-person</em>, and submitted to Devpost to be considered for
      judging. Hacks must not be reused from other hackathons - only hacks started during
      RevolutionUC 2027 will be allowed. Stay tuned for more details on prizing categories and
      judging.
    </EmailText>
  );
};
