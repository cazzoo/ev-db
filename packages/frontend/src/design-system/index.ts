/**
 * Design System Index
 *
 * Central export file for the EV Database design system.
 * This file exports all components, utilities, and tokens for easy consumption.
 */

// Design Tokens
export * from './tokens';

// Utilities
export {
  cn,
  responsive,
  variant,
  conditional,
  size,
  state,
  focusVisible,
  hover,
  transition,
  flex
} from './utils';

// Components
export * from './components/Button';
export * from './components/Form';
export * from './components/Layout';
export * from './components/Card';
export * from './components/Modal';

// Re-export commonly used types
export type { VariantProps } from 'class-variance-authority';

// Design System Version
export const DESIGN_SYSTEM_VERSION = '1.0.0';

// Component Categories for Documentation
export const COMPONENT_CATEGORIES = {
  ACTIONS: ['Button', 'IconButton', 'ButtonGroup'],
  FORMS: ['Input', 'Textarea', 'Select', 'Checkbox', 'Radio', 'RadioGroup', 'Label', 'Form'],
  LAYOUT: ['Container', 'Grid', 'Flex', 'Stack', 'Section', 'Spacer'],
  DISPLAY: ['Card', 'CardHeader', 'CardBody', 'CardFooter', 'StatsCard', 'FeatureCard'],
  OVERLAY: ['Modal', 'ConfirmationModal', 'FormModal', 'Drawer'],
} as const;

// Design System Configuration
export const DESIGN_SYSTEM_CONFIG = {
  // Default theme
  defaultTheme: 'light',

  // Available themes (DaisyUI themes)
  themes: [
    'light', 'dark', 'cupcake', 'bumblebee', 'emerald', 'corporate',
    'synthwave', 'retro', 'cyberpunk', 'valentine', 'halloween', 'garden',
    'forest', 'aqua', 'lofi', 'pastel', 'fantasy', 'wireframe', 'black',
    'luxury', 'dracula', 'cmyk', 'autumn', 'business', 'acid', 'lemonade',
    'night', 'coffee', 'winter', 'dim', 'nord', 'sunset'
  ],

  // Breakpoints
  breakpoints: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },

  // Animation settings
  animations: {
    enableReducedMotion: true,
    defaultDuration: '300ms',
    defaultEasing: 'ease-in-out',
  },

  // Accessibility settings
  accessibility: {
    focusVisible: true,
    highContrast: false,
    reducedMotion: false,
  },
} as const;

// Utility functions for design system
export const designSystemUtils = {
  /**
   * Get component category
   */
  getComponentCategory: (componentName: string): string | null => {
    for (const [category, components] of Object.entries(COMPONENT_CATEGORIES)) {
      if ((components as readonly string[]).includes(componentName)) {
        return category;
      }
    }
    return null;
  },

  /**
   * Check if theme is dark
   */
  isDarkTheme: (theme: string): boolean => {
    const darkThemes = ['dark', 'synthwave', 'halloween', 'forest', 'black', 'luxury', 'dracula', 'night', 'coffee'];
    return darkThemes.includes(theme);
  },

  /**
   * Get responsive value
   */
  getResponsiveValue: <T>(
    value: T | Partial<Record<'sm' | 'md' | 'lg' | 'xl' | '2xl', T>>,
    breakpoint: 'sm' | 'md' | 'lg' | 'xl' | '2xl' = 'md'
  ): T => {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      return (value as any)[breakpoint] || (value as any).md || Object.values(value)[0];
    }
    return value as T;
  },

  /**
   * Generate component ID
   */
  generateId: (prefix: string = 'ds'): string => {
    return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
  },

  /**
   * Validate color value
   */
  isValidColor: (color: string): boolean => {
    const validColors = [
      'primary', 'secondary', 'accent', 'neutral', 'base-100', 'base-200', 'base-300',
      'info', 'success', 'warning', 'error'
    ];
    return validColors.includes(color) || /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
  },
} as const;

// Design System Hooks (for future use)
export const designSystemHooks = {
  // Placeholder for future hooks
  // useTheme: () => { ... },
  // useBreakpoint: () => { ... },
  // useReducedMotion: () => { ... },
} as const;

// Design System Constants
export const DS_CONSTANTS = {
  // Component prefixes
  COMPONENT_PREFIX: 'ds',

  // CSS custom properties prefix
  CSS_VAR_PREFIX: '--ds',

  // Default z-index values
  Z_INDEX: {
    dropdown: 1000,
    sticky: 1020,
    fixed: 1030,
    modal: 1040,
    popover: 1050,
    tooltip: 1060,
    toast: 1070,
  },

  // Animation durations
  ANIMATION_DURATION: {
    fast: 150,
    normal: 300,
    slow: 500,
  },

  // Common sizes
  SIZES: {
    sm: 'sm',
    md: 'md',
    lg: 'lg',
    xl: 'xl',
  },

  // Common variants
  VARIANTS: {
    primary: 'primary',
    secondary: 'secondary',
    tertiary: 'tertiary',
    success: 'success',
    warning: 'warning',
    error: 'error',
    info: 'info',
  },
} as const;

// Type definitions for design system
export type DesignSystemTheme = typeof DESIGN_SYSTEM_CONFIG.themes[number];
export type DesignSystemBreakpoint = keyof typeof DESIGN_SYSTEM_CONFIG.breakpoints;
export type DesignSystemSize = keyof typeof DS_CONSTANTS.SIZES;
export type DesignSystemVariant = keyof typeof DS_CONSTANTS.VARIANTS;
export type ComponentCategory = keyof typeof COMPONENT_CATEGORIES;

// Design System Provider Props (for future implementation)
export interface DesignSystemProviderProps {
  theme?: DesignSystemTheme;
  reducedMotion?: boolean;
  highContrast?: boolean;
  children: React.ReactNode;
}

// Export default configuration
export default {
  version: DESIGN_SYSTEM_VERSION,
  config: DESIGN_SYSTEM_CONFIG,
  utils: designSystemUtils,
  constants: DS_CONSTANTS,
  categories: COMPONENT_CATEGORIES,
};
