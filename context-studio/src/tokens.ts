export const C = {
  ink: '#121212', // Backgrounds/Page/bg-1, also primary text on cards
  inkMuted: '#616161', // card description text
  white: '#FFFFFF',
  primary: '#FF9140', // Primary-500
  success: '#2E9E5B', // beat 5 "Approved" tick — the one status colour the piece uses
  // mesh gradient stops
  g_blue: '#0D99FF',
  g_indigo: '#5860ED',
  g_orange: '#F24822',
  g_yellow: '#FFCA28',
};

export const CARD = {
  bg: 'rgba(255,255,255,0.4)',
  blur: '12.5px', // backdrop-filter, NOT filter
  radius: 20,
  padding: 16,
  shadow: '0px 8px 12px rgba(0,0,0,0.12), 0px -8px 12px rgba(0,0,0,0.08)',
  fadedOpacity: 0.4, // the design system's own "recede" state
};

export const TYPE = {
  headline: {
    family: 'Geist',
    weight: 500,
    size: 36,
    lineHeight: 38,
    tracking: -1.44,
    color: '#FFFFFF',
    align: 'center' as const,
  },
  cardTitle: {
    family: 'Geist',
    weight: 500,
    size: 16,
    lineHeight: 24,
    tracking: -0.64,
    color: '#121212',
  },
  cardDesc: {
    family: 'Geist',
    weight: 400,
    size: 14,
    lineHeight: 20,
    tracking: -0.56,
    color: '#616161',
  },
  pill: {
    family: 'Geist',
    weight: 500,
    size: 14,
    lineHeight: 20,
    tracking: -0.56,
    color: '#FFFFFF',
  },
};

export const MESH_STOPS = `#FFFFFF 18.45%, #5860ED 28.81%, #F24822 69.94%, #FFCA28 87.27%`;
