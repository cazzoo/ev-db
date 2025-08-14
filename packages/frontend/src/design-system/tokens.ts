/**
 * Design System Tokens
 * 
 * This file defines the core design tokens for the EV Database application.
 * All tokens are based on DaisyUI's design system and Tailwind CSS utilities.
 */

// Spacing System - Based on Tailwind's spacing scale
export const spacing = {
  // Base spacing units (rem)
  xs: '0.25rem',    // 4px
  sm: '0.5rem',     // 8px
  md: '0.75rem',    // 12px
  lg: '1rem',       // 16px
  xl: '1.25rem',    // 20px
  '2xl': '1.5rem',  // 24px
  '3xl': '2rem',    // 32px
  '4xl': '2.5rem',  // 40px
  '5xl': '3rem',    // 48px
  '6xl': '4rem',    // 64px
} as const;

// Component spacing - Consistent spacing for components
export const componentSpacing = {
  // Form elements
  formFieldGap: spacing.lg,
  formSectionGap: spacing['2xl'],
  labelMargin: spacing.sm,
  
  // Buttons
  buttonPadding: {
    sm: `${spacing.sm} ${spacing.md}`,
    md: `${spacing.md} ${spacing.lg}`,
    lg: `${spacing.lg} ${spacing.xl}`,
  },
  buttonGap: spacing.md,
  
  // Cards and containers
  cardPadding: spacing['2xl'],
  cardGap: spacing.lg,
  containerPadding: spacing.lg,
  
  // Layout
  sectionGap: spacing['4xl'],
  contentGap: spacing['3xl'],
} as const;

// Typography Scale - Based on DaisyUI typography
export const typography = {
  fontSize: {
    xs: '0.75rem',    // 12px
    sm: '0.875rem',   // 14px
    base: '1rem',     // 16px
    lg: '1.125rem',   // 18px
    xl: '1.25rem',    // 20px
    '2xl': '1.5rem',  // 24px
    '3xl': '1.875rem', // 30px
    '4xl': '2.25rem', // 36px
  },
  lineHeight: {
    tight: '1.25',
    normal: '1.5',
    relaxed: '1.75',
  },
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
} as const;

// Border Radius - Based on DaisyUI's border radius system
export const borderRadius = {
  none: '0',
  sm: '0.125rem',   // 2px
  md: '0.375rem',   // 6px
  lg: '0.5rem',     // 8px
  xl: '0.75rem',    // 12px
  '2xl': '1rem',    // 16px
  full: '9999px',
} as const;

// Shadow System - Based on DaisyUI's shadow utilities
export const shadows = {
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
} as const;

// Z-Index Scale - Consistent layering
export const zIndex = {
  base: 0,
  dropdown: 10,
  sticky: 20,
  fixed: 30,
  modal: 40,
  popover: 50,
  tooltip: 60,
  toast: 70,
} as const;

// Breakpoints - Based on Tailwind's responsive breakpoints
export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;

// Animation Durations - Consistent timing
export const animation = {
  fast: '150ms',
  normal: '300ms',
  slow: '500ms',
} as const;

// Component Sizes - Standardized sizing system
export const componentSizes = {
  button: {
    sm: {
      height: '2rem',     // 32px
      padding: componentSpacing.buttonPadding.sm,
      fontSize: typography.fontSize.sm,
    },
    md: {
      height: '2.5rem',   // 40px
      padding: componentSpacing.buttonPadding.md,
      fontSize: typography.fontSize.base,
    },
    lg: {
      height: '3rem',     // 48px
      padding: componentSpacing.buttonPadding.lg,
      fontSize: typography.fontSize.lg,
    },
  },
  input: {
    sm: {
      height: '2rem',     // 32px
      padding: `${spacing.sm} ${spacing.md}`,
      fontSize: typography.fontSize.sm,
    },
    md: {
      height: '2.5rem',   // 40px
      padding: `${spacing.md} ${spacing.lg}`,
      fontSize: typography.fontSize.base,
    },
    lg: {
      height: '3rem',     // 48px
      padding: `${spacing.lg} ${spacing.xl}`,
      fontSize: typography.fontSize.lg,
    },
  },
} as const;

// Grid System - Consistent grid layouts
export const grid = {
  columns: {
    1: 'repeat(1, minmax(0, 1fr))',
    2: 'repeat(2, minmax(0, 1fr))',
    3: 'repeat(3, minmax(0, 1fr))',
    4: 'repeat(4, minmax(0, 1fr))',
    6: 'repeat(6, minmax(0, 1fr))',
    12: 'repeat(12, minmax(0, 1fr))',
  },
  gap: {
    sm: spacing.md,
    md: spacing.lg,
    lg: spacing.xl,
    xl: spacing['2xl'],
  },
} as const;

// Export all tokens as a single object for easy access
export const designTokens = {
  spacing,
  componentSpacing,
  typography,
  borderRadius,
  shadows,
  zIndex,
  breakpoints,
  animation,
  componentSizes,
  grid,
} as const;

export type DesignTokens = typeof designTokens;
