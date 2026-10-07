import * as React from "react";
import { EmailLayout } from "./components/EmailLayout";
import { EmailHeading } from "./components/EmailHeading";
import { EmailText } from "./components/EmailText";
import { EmailButton } from "./components/EmailButton";

export const latticeResetPasswordMeta = {
  id: "lattice-reset-password",
  name: "Lattice Password Reset",
  subject: "Reset your Lattice password",
  description: "Password reset email for Lattice app",
  requiredProps: ["resetToken"],
};

interface LatticeResetPasswordProps {
  resetToken?: string;
}

export const LatticeResetPassword: React.FC<LatticeResetPasswordProps> = ({ resetToken = "" }) => {
  const resetUrl = `https://lattice.revolutionuc.com/auth/reset/${resetToken}`;

  return (
    <EmailLayout preview="Reset your Lattice password">
      <EmailHeading as="h1">Hey, Hacker!</EmailHeading>

      <EmailText>
        We have received a password reset request for your Lattice account. Lattice is our Hacker
        matching app that you can use to find other RevolutionUC 2027 participants to team up with.
      </EmailText>

      <EmailText>Please use the link below to reset your Lattice password</EmailText>

      <EmailButton href={resetUrl}>Reset Password</EmailButton>

      <EmailText>
        If this link does not work, copy and paste this url in your browser: {resetUrl}
      </EmailText>

      <EmailText>If you did not request this password reset, please reach out to us.</EmailText>
    </EmailLayout>
  );
};

export default LatticeResetPassword;
