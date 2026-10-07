import {
  Body,
  Container,
  Head,
  Html,
  Img,
  Preview,
  Section,
  Text,
  Hr,
  Link,
} from "@react-email/components";
import * as React from "react";

// Brand Colors
export const brandColors = {
  lightBlue: "#EDF6FF",
  primaryBlue: "#228CF6",
  darkNavy: "#151477",
  greenAccent: "#19E363",
  white: "#ffffff",
  darkText: "#333333",
  lightText: "#666666",
};

interface EmailLayoutProps {
  preview: string;
  children: React.ReactNode;
}

export const EmailLayout: React.FC<EmailLayoutProps> = ({ preview, children }) => {
  return (
    <Html lang="en">
      <Head>
        <link href="https://fonts.googleapis.com/css?family=Lato:400,700" rel="stylesheet" />
      </Head>
      <Preview>{preview}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Link href="https://revolutionuc.com" target="_blank">
              <Img
                src={
                  process.env.NEXT_PUBLIC_LOGO_URL ??
                  `${process.env.BETTER_AUTH_URL}/revuc_2026_logo.png`
                }
                alt="RevolutionUC logo"
                width="100"
                style={logoImage}
              />
            </Link>
            <Text style={headerTitle}>
              <Link href="https://revolutionuc.com" style={headerLink}>
                RevolutionUC 2027
              </Link>
            </Text>
          </Section>

          {/* Content */}
          <Section style={content}>{children}</Section>

          {/* FAQ Section */}
          <Section style={faqSection}>
            <Text style={paragraph}>
              Questions? See the FAQ at{" "}
              <Link href="https://revolutionuc.com/faq" style={link}>
                revolutionuc.com/faq
              </Link>{" "}
              or send us an email at{" "}
              <Link href="mailto:info@revolutionuc.com" style={link}>
                info@revolutionuc.com
              </Link>
              !
            </Text>
            <Text style={signature}>
              Best Regards,
              <br />
              The RevolutionUC Team
            </Text>
          </Section>

          {/* Footer */}
          <Hr style={divider} />
          <Section style={footer}>
            <Text style={footerText}>
              You are receiving this email because you registered for{" "}
              <Link href="https://revolutionuc.com" style={footerLink}>
                RevolutionUC
              </Link>
              .
            </Text>
            <Text style={footerText}>Our mailing address is:</Text>
            <Text style={footerAddress}>
              Association for Computing Machinery @ UC
              <br />
              Rhodes 802A
              <br />
              2851 Woodside Dr.
              <br />
              Cincinnati, OH 45221
            </Text>
            <Text style={footerLinks}>
              <Link href="https://revolutionuc.com" style={footerLink}>
                Website
              </Link>
              {" • "}
              <Link href="https://twitter.com/revolution_uc" style={footerLink}>
                Twitter
              </Link>
              {" • "}
              <Link href="https://instagram.com/revolution.uc" style={footerLink}>
                Instagram
              </Link>
              {" • "}
              <Link href="https://www.tiktok.com/@revolution.uc" style={footerLink}>
                TikTok
              </Link>
            </Text>
            <Text style={copyright}>© {new Date().getFullYear()} RevolutionUC</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

// Styles using brand colors
const main = {
  backgroundColor: brandColors.lightBlue,
  fontFamily: '"Lato", "Helvetica Neue", Arial, sans-serif',
};

const container = {
  backgroundColor: brandColors.white,
  margin: "0 auto",
  padding: "0",
  marginTop: "16px",
  marginBottom: "32px",
  maxWidth: "600px",
  borderRadius: "8px",
  boxShadow: "0 2px 8px rgba(21, 20, 119, 0.1)",
  wordWrap: "break-word" as const,
};

const header = {
  padding: "32px 48px 24px",
  textAlign: "center" as const,
};

const logoImage = {
  margin: "0 auto",
};

const headerTitle = {
  fontSize: "19px",
  lineHeight: "28px",
  margin: "16px 0 0",
};

const headerLink = {
  color: brandColors.darkNavy,
  textDecoration: "none",
  fontWeight: "400" as const,
};

const content = {
  margin: "12px 12px",
  padding: "0 48px",
  wordWrap: "break-word" as const,
  overflowWrap: "break-word" as const,
};

const faqSection = {
  margin: "12px 12px",
  padding: "24px 48px 0",
  wordWrap: "break-word" as const,
  overflowWrap: "break-word" as const,
};

const paragraph = {
  color: brandColors.darkText,
  fontSize: "16px",
  lineHeight: "26px",
  margin: "0 0 16px",
  paddingLeft: "0",
  paddingRight: "0",
  wordWrap: "break-word" as const,
  overflowWrap: "break-word" as const,
};

const signature = {
  color: brandColors.darkText,
  fontSize: "16px",
  lineHeight: "26px",
  margin: "24px 0 0",
  paddingLeft: "0",
  paddingRight: "0",
  wordWrap: "break-word" as const,
  overflowWrap: "break-word" as const,
};

const link = {
  color: brandColors.primaryBlue,
  textDecoration: "none",
};

const divider = {
  borderColor: "#e6e6e6",
  margin: "32px 48px",
};

const footer = {
  padding: "0 48px 32px",
};

const footerText = {
  color: brandColors.darkNavy,
  fontSize: "14px",
  lineHeight: "20px",
  margin: "0 0 8px",
  textAlign: "center" as const,
  wordWrap: "break-word" as const,
  overflowWrap: "break-word" as const,
};

const footerAddress = {
  color: brandColors.darkNavy,
  fontSize: "14px",
  lineHeight: "20px",
  margin: "8px 0 16px",
  textAlign: "center" as const,
  wordWrap: "break-word" as const,
  overflowWrap: "break-word" as const,
};

const footerLinks = {
  color: brandColors.lightText,
  fontSize: "14px",
  lineHeight: "20px",
  margin: "16px 0 8px",
  textAlign: "center" as const,
  wordWrap: "break-word" as const,
  overflowWrap: "break-word" as const,
};

const footerLink = {
  color: brandColors.darkNavy,
  textDecoration: "none",
};

const copyright = {
  color: brandColors.lightText,
  fontSize: "12px",
  lineHeight: "16px",
  margin: "16px 0 0",
  textAlign: "center" as const,
  wordWrap: "break-word" as const,
  overflowWrap: "break-word" as const,
};
