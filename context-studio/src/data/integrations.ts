// Beat 1 integration tiles at the Figma atom positions (stage coords).
// Monogram glyphs stand in for the real brand SVGs (storyboard open item #2);
// swap `mono` for an <img>/<svg> per logo when assets land.
export type Integration = {name: string; mono: string; x: number; y: number};

export const INTEGRATIONS: Integration[] = [
  {name: 'Jira', mono: 'J', x: 243, y: 146},
  {name: 'Zoom', mono: 'Z', x: 66, y: 237},
  {name: 'Dropbox', mono: 'D', x: 346, y: 228},
  {name: 'Slack', mono: 'S', x: 167, y: 283},
  {name: 'Notion', mono: 'N', x: 399, y: 305},
  {name: 'HubSpot', mono: 'H', x: 77, y: 360},
  {name: 'Teams', mono: 'T', x: 333, y: 363},
  {name: 'Google', mono: 'G', x: 422, y: 406},
  {name: 'Gmail', mono: 'M', x: 166, y: 475},
  {name: 'Salesforce', mono: 'SF', x: 315, y: 475},
];
