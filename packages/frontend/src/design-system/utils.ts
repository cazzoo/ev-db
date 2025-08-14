import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Utility function to merge Tailwind CSS classes
 * 
 * This function combines clsx for conditional classes and tailwind-merge
 * for proper Tailwind class merging, ensuring no conflicting classes.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Utility function to create responsive class names
 * 
 * @param base - Base class name
 * @param responsive - Object with breakpoint keys and class values
 * @returns Combined responsive class string
 */
export function responsive(
  base: string,
  responsive: Partial<Record<'sm' | 'md' | 'lg' | 'xl' | '2xl', string>>
): string {
  const classes = [base];
  
  Object.entries(responsive).forEach(([breakpoint, className]) => {
    if (className) {
      classes.push(`${breakpoint}:${className}`);
    }
  });
  
  return classes.join(' ');
}

/**
 * Utility function to create variant-based class names
 * 
 * @param variants - Object mapping variant names to class names
 * @param activeVariant - Currently active variant
 * @param baseClasses - Base classes to always include
 * @returns Combined class string
 */
export function variant<T extends string>(
  variants: Record<T, string>,
  activeVariant: T,
  baseClasses?: string
): string {
  const variantClass = variants[activeVariant] || '';
  return cn(baseClasses, variantClass);
}

/**
 * Utility function to conditionally apply classes
 * 
 * @param condition - Boolean condition
 * @param trueClasses - Classes to apply when condition is true
 * @param falseClasses - Classes to apply when condition is false
 * @returns Conditional class string
 */
export function conditional(
  condition: boolean,
  trueClasses: string,
  falseClasses?: string
): string {
  return condition ? trueClasses : falseClasses || '';
}

/**
 * Utility function to create size-based class names
 * 
 * @param sizes - Object mapping size names to class names
 * @param activeSize - Currently active size
 * @param baseClasses - Base classes to always include
 * @returns Combined class string
 */
export function size<T extends string>(
  sizes: Record<T, string>,
  activeSize: T,
  baseClasses?: string
): string {
  const sizeClass = sizes[activeSize] || '';
  return cn(baseClasses, sizeClass);
}

/**
 * Utility function to create state-based class names
 * 
 * @param states - Object with state flags and their corresponding classes
 * @param baseClasses - Base classes to always include
 * @returns Combined class string
 */
export function state(
  states: Record<string, { condition: boolean; classes: string }>,
  baseClasses?: string
): string {
  const stateClasses = Object.values(states)
    .filter(({ condition }) => condition)
    .map(({ classes }) => classes);
  
  return cn(baseClasses, ...stateClasses);
}

/**
 * Utility function to create focus-visible classes for accessibility
 * 
 * @param focusClasses - Classes to apply on focus
 * @param baseClasses - Base classes to always include
 * @returns Combined class string with focus styles
 */
export function focusVisible(
  focusClasses: string = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
  baseClasses?: string
): string {
  return cn(baseClasses, focusClasses);
}

/**
 * Utility function to create hover classes
 * 
 * @param hoverClasses - Classes to apply on hover
 * @param baseClasses - Base classes to always include
 * @returns Combined class string with hover styles
 */
export function hover(
  hoverClasses: string,
  baseClasses?: string
): string {
  return cn(baseClasses, hoverClasses);
}

/**
 * Utility function to create transition classes
 * 
 * @param duration - Transition duration ('fast' | 'normal' | 'slow')
 * @param properties - CSS properties to transition
 * @param baseClasses - Base classes to always include
 * @returns Combined class string with transition styles
 */
export function transition(
  duration: 'fast' | 'normal' | 'slow' = 'normal',
  properties: string[] = ['all'],
  baseClasses?: string
): string {
  const durationMap = {
    fast: 'duration-150',
    normal: 'duration-300',
    slow: 'duration-500',
  };
  
  const propertyMap: Record<string, string> = {
    all: 'transition-all',
    colors: 'transition-colors',
    opacity: 'transition-opacity',
    shadow: 'transition-shadow',
    transform: 'transition-transform',
  };
  
  const transitionClasses = properties
    .map(prop => propertyMap[prop] || `transition-${prop}`)
    .join(' ');
  
  return cn(baseClasses, transitionClasses, durationMap[duration], 'ease-in-out');
}

/**
 * Utility function to create grid classes
 * 
 * @param columns - Number of columns or responsive column object
 * @param gap - Gap size
 * @param baseClasses - Base classes to always include
 * @returns Combined class string with grid styles
 */
export function grid(
  columns: number | Partial<Record<'sm' | 'md' | 'lg' | 'xl' | '2xl', number>>,
  gap: 'sm' | 'md' | 'lg' | 'xl' = 'md',
  baseClasses?: string
): string {
  const gapMap = {
    sm: 'gap-3',
    md: 'gap-4',
    lg: 'gap-5',
    xl: 'gap-6',
  };
  
  if (typeof columns === 'number') {
    return cn(baseClasses, 'grid', `grid-cols-${columns}`, gapMap[gap]);
  }
  
  const responsiveColumns = Object.entries(columns)
    .map(([breakpoint, cols]) => 
      breakpoint === 'sm' ? `grid-cols-${cols}` : `${breakpoint}:grid-cols-${cols}`
    )
    .join(' ');
  
  return cn(baseClasses, 'grid', responsiveColumns, gapMap[gap]);
}

/**
 * Utility function to create flex classes
 * 
 * @param direction - Flex direction
 * @param align - Align items
 * @param justify - Justify content
 * @param gap - Gap size
 * @param baseClasses - Base classes to always include
 * @returns Combined class string with flex styles
 */
export function flex(
  direction: 'row' | 'col' | 'row-reverse' | 'col-reverse' = 'row',
  align: 'start' | 'center' | 'end' | 'stretch' | 'baseline' = 'center',
  justify: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly' = 'start',
  gap: 'sm' | 'md' | 'lg' | 'xl' = 'md',
  baseClasses?: string
): string {
  const gapMap = {
    sm: 'gap-2',
    md: 'gap-3',
    lg: 'gap-4',
    xl: 'gap-5',
  };
  
  return cn(
    baseClasses,
    'flex',
    `flex-${direction}`,
    `items-${align}`,
    `justify-${justify}`,
    gapMap[gap]
  );
}
