/** The sections of the client portal — kept separate so access rules can import them. */
export const PORTAL_TABS = [
  ["dashboard", "Dashboard"],
  ["roadmap", "Client Roadmap"],
  ["calls", "Weekly Group Calls"],
  ["docs", "Key Links"],
  ["requests", "Support"],
  ["settings", "Settings"],
] as const;

export type PortalTabKey = (typeof PORTAL_TABS)[number][0];

export const PORTAL_TAB_KEYS = PORTAL_TABS.map(([key]) => key) as PortalTabKey[];
