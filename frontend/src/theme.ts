import { createTheme } from '@mui/material/styles';

// ── 南大紫 · 暖金 · 编辑感配色 ──
const NJU_PURPLE = '#6B2FA0';
const NJU_PURPLE_LIGHT = '#8E5CBF';
const NJU_PURPLE_DARK = '#4A1D73';
const WARM_GOLD = '#C8965C';
const WARM_GOLD_LIGHT = '#DEB887';
const WARM_RED = '#C8404B';
const WARM_GREEN = '#3A8C6E';
const WARM_ORANGE = '#D4863E';
const BG_WARM = '#FAF8FC';
const SURFACE = '#FFFFFF';
const TEXT_PRIMARY = '#2D2235';
const TEXT_SECONDARY = '#7A6F82';
const BORDER_SOFT = '#EDE8F2';

const theme = createTheme({
  palette: {
    primary: {
      main: NJU_PURPLE,
      light: NJU_PURPLE_LIGHT,
      dark: NJU_PURPLE_DARK,
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: WARM_GOLD,
      light: WARM_GOLD_LIGHT,
      dark: '#A0724A',
      contrastText: '#FFFFFF',
    },
    error: { main: WARM_RED },
    warning: { main: WARM_ORANGE },
    success: { main: WARM_GREEN },
    background: { default: BG_WARM, paper: SURFACE },
    text: { primary: TEXT_PRIMARY, secondary: TEXT_SECONDARY },
    divider: BORDER_SOFT,
  },

  typography: {
    fontFamily: '"DM Sans", "Noto Sans SC", sans-serif',
    h4: { fontWeight: 700, letterSpacing: '-0.02em' },
    h5: { fontWeight: 700, letterSpacing: '-0.015em' },
    h6: { fontWeight: 600, letterSpacing: '-0.01em' },
    subtitle1: { fontWeight: 600 },
    body1: { color: TEXT_PRIMARY },
    body2: { color: TEXT_SECONDARY },
  },

  shape: { borderRadius: 12 },

  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: BG_WARM,
        },
      },
    },

    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          borderRadius: 10,
          padding: '8px 20px',
          transition: 'all 0.2s ease',
        },
      },
      variants: [
        {
          props: { variant: 'contained', color: 'primary' },
          style: {
            boxShadow: 'none',
            '&:hover': {
              boxShadow: `0 4px 14px ${NJU_PURPLE}40`,
              backgroundColor: NJU_PURPLE_DARK,
            },
          },
        },
        {
          props: { variant: 'contained', color: 'secondary' },
          style: {
            boxShadow: 'none',
            '&:hover': {
              boxShadow: `0 4px 14px ${WARM_GOLD}50`,
            },
          },
        },
        {
          props: { variant: 'outlined', color: 'primary' },
          style: {
            borderColor: NJU_PURPLE,
            '&:hover': {
              borderColor: NJU_PURPLE_DARK,
              backgroundColor: `${NJU_PURPLE}08`,
            },
          },
        },
      ],
    },

    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          border: `1px solid ${BORDER_SOFT}`,
          boxShadow: '0 1px 3px rgba(107,47,160,0.04), 0 1px 2px rgba(107,47,160,0.02)',
          transition: 'box-shadow 0.25s ease, transform 0.25s ease',
        },
      },
    },

    MuiCardContent: {
      styleOverrides: {
        root: {
          '&:last-child': { paddingBottom: 16 },
        },
      },
    },

    MuiTextField: {
      defaultProps: { size: 'small' },
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 12,
            transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: NJU_PURPLE,
              borderWidth: 2,
            },
          },
        },
      },
    },

    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 500,
          borderRadius: 20,
        },
        outlined: {
          borderColor: BORDER_SOFT,
        },
      },
    },

    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: 'none',
        },
      },
    },

    MuiBottomNavigation: {
      styleOverrides: {
        root: {
          height: 62,
          borderTop: `1px solid ${BORDER_SOFT}`,
          backgroundColor: SURFACE,
        },
      },
    },

    MuiBottomNavigationAction: {
      styleOverrides: {
        root: {
          transition: 'color 0.2s ease',
          '&.Mui-selected': {
            color: NJU_PURPLE,
          },
        },
      },
    },

    MuiAvatar: {
      styleOverrides: {
        root: {
          fontSize: 14,
        },
      },
    },

    MuiSkeleton: {
      styleOverrides: {
        root: {
          '&::after': {
            background: `linear-gradient(90deg, ${BG_WARM}, ${BORDER_SOFT}, ${BG_WARM})`,
          },
        },
      },
    },

    MuiToggleButtonGroup: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          '& .MuiToggleButtonGroup-grouped': {
            borderRadius: 8,
            margin: 2,
            border: 'none',
            '&.Mui-selected': {
              backgroundColor: NJU_PURPLE,
              color: '#FFFFFF',
              '&:hover': {
                backgroundColor: NJU_PURPLE_DARK,
              },
            },
          },
        },
      },
    },

    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          '&.Mui-selected': {
            color: NJU_PURPLE,
          },
        },
      },
    },

    MuiTabs: {
      styleOverrides: {
        indicator: {
          backgroundColor: NJU_PURPLE,
        },
      },
    },

    MuiBadge: {
      styleOverrides: {
        badge: {
          backgroundColor: WARM_RED,
          fontWeight: 600,
        },
      },
    },
  },
});

export default theme;
