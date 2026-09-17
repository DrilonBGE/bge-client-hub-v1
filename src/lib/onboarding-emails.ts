/**
 * The onboarding email copy, kept here for reference and copy-paste. Amalor
 * (GHL) actually sends these off the DFY / DWY / DBY - Paid tags — the portal
 * only shows the wording so everyone works from the same script.
 */
export type OnboardingEmail = {
  key: string;
  audience: string;
  primary: string;
  secondary: string;
  body: string;
};

const TEAM_DFY = `- William - CEO - deals with your offer, strategy and copywriting.
- Drilon - Head of Operations - deals with your funnel build and oversees your project roadmap.
- Alfie - Head of Sales - deals with your sales call process.
- Victor - Head of Ads - deals with your ad account setup and reviews.`;

const TEAM_DWY = `- William - CEO - deals with your offer and strategy.
- Waleed - Head of Copywriting - assists you with VSL, ADs and other needed copy.
- Drilon - Head of Operations - deals with your funnel build and oversees your project roadmap.
- Alfie - Head of Sales - deals with your sales call process.
- Victor - Head of Ads - deals with your ad account setup and reviews.`;

function welcome(portal: string, step3Title: string, step3: string, step4?: string) {
  return `Hey [NAME],

A very warm welcome on board to Build, Grow & Exit. It's our pleasure to have you here. To keep things simple, here are your next steps:

Step 1 - Onboarding Documents

In an email straight after this one, you should receive a link to sign your agreement with us so we can proceed with the onboarding process.

Step 2 - BGE Client Portal

Once you have completed step 1, you should be receiving an email shortly afterwards giving you full access into our BGE Client Portal. Treat this as your central hub from now on where you have access to:

${portal}

${step3Title}

${step3}${
    step4
      ? `

Step 4 - Getting Started

${step4}`
      : ""
  }

We look forward to working with you on your business.

Let's scale,
BGE Team`;
}

const PORTAL_FULL = `- [1] Client Dashboard - live updates on what's required from you / the BGE team.
- [2] Client Roadmap - an interactive page where you can see exactly what's happening in real time.
- [3] BGE Course Content - all of William's knowledge, frameworks and templates.
- [4] BGE Weekly Call Portal - weekly group calls that take place Monday to Friday.`;

const PORTAL_DBY = `- [1] Client Roadmap - an interactive page where you can see exactly what's required from you for your funnel build.
- [2] BGE Course Content - all of William's knowledge, frameworks and templates.
- [3] BGE Weekly Call Portal - weekly group calls that take place Monday to Friday.`;

const GETTING_STARTED = `You will begin with watching a portion of the BGE Course Content and completing the BGE Blueprint Document (found inside the Client Portal) to prepare you for your onboarding call with William. At that point, the real work begins.`;

export const ONBOARDING_EMAILS: OnboardingEmail[] = [
  {
    key: "dfy-1",
    audience: "DFY",
    primary: "Welcome to BGE",
    secondary: "Step 1 - Your Next Steps",
    body: welcome(
      PORTAL_FULL,
      "Step 3 - Whatsapp Chat",
      `At the point of this email you should also have access into the BGE Whatsapp Group Chat where you will be introduced to the rest of the BGE Executive Team:

${TEAM_DFY}`,
      GETTING_STARTED,
    ),
  },
  {
    key: "dwy-1",
    audience: "DWY",
    primary: "Welcome to BGE",
    secondary: "Step 1 - Your Next Steps",
    body: welcome(
      PORTAL_FULL,
      "Step 3 - Whatsapp Chat",
      `At the point of this email you should also have access into the BGE Whatsapp Group Chat where you will be introduced to the rest of the BGE Executive Team:

${TEAM_DWY}`,
      GETTING_STARTED,
    ),
  },
  {
    key: "dby-1",
    audience: "DBY",
    primary: "Welcome to BGE",
    secondary: "Step 1 - Your Next Steps",
    body: welcome(
      PORTAL_DBY,
      "Step 3 - Attending The Weekly Calls",
      `For you to see success in the DBY program, it is imperative that you attend as many of the calls as possible. On there, you will meet with the BGE Executive Team:

- Waleed - Head of Copywriting - assists you with VSL, ADs and other needed copy.
- Drilon - Head of Operations - deals with your funnel strategy.
- Alfie - Head of Sales - deals with your sales call process.
- Victor - Head of Ads - deals with your ad account setup and best practices.`,
    ),
  },
  {
    key: "email-2",
    audience: "Everyone",
    primary: "Your Onboarding Agreement",
    secondary: "Step 2 - Complete This Form",
    body: `Hey [NAME],

Please review and sign the attached onboarding agreement below. Upon doing so, you will receive a copy of your completed form and an email with your BGE Client Portal login link.

[BUTTON]

See you on the other side,
BGE Team`,
  },
  {
    key: "email-3",
    audience: "Everyone",
    primary: "BGE Client Portal Access",
    secondary: "Step 3 - Here Is Your Personal Login Link",
    body: `Hey [NAME],

Success!

You're now officially enrolled. Below is your personal link to get you in to the BGE Client Portal.

[BUTTON]

If you struggle with any issues logging in or getting access, then please contact our Head of Operations by email at drilon@buildgrowandexit.com.

Kindest Regards,
BGE Team`,
  },
];
