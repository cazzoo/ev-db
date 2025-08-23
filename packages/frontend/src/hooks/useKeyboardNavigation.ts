import { useState, useCallback, useEffect, useRef } from 'react';

export interface KeyboardNavigationOptions {
  /** Total number of items in the list */
  itemCount: number;
  /** Whether to wrap around when reaching the end/beginning */
  wrap?: boolean;
  /** Whether navigation is currently enabled */
  enabled?: boolean;
  /** Grid dimensions for 2D navigation (optional) */
  gridColumns?: number;
  /** Callback when an item is selected (Enter/Space) */
  onSelect?: (index: number) => void;
  /** Callback when navigation is escaped */
  onEscape?: () => void;
  /** Initial focused index */
  initialIndex?: number;
}

export interface KeyboardNavigationState {
  /** Currently focused item index (-1 means no focus) */
  focusedIndex: number;
  /** Whether keyboard navigation is active */
  isActive: boolean;
}

export interface KeyboardNavigationActions {
  /** Move focus to next item */
  focusNext: () => void;
  /** Move focus to previous item */
  focusPrevious: () => void;
  /** Move focus to specific index */
  focusItem: (index: number) => void;
  /** Select the currently focused item */
  selectFocused: () => void;
  /** Clear focus and deactivate navigation */
  clearFocus: () => void;
  /** Activate navigation mode */
  activate: () => void;
  /** Handle keyboard events */
  handleKeyDown: (event: React.KeyboardEvent) => void;
  /** Reset navigation state */
  reset: () => void;
}

export interface UseKeyboardNavigationReturn extends KeyboardNavigationState, KeyboardNavigationActions {}

/**
 * Custom hook for managing keyboard navigation in lists and grids
 * Supports arrow key navigation, Enter/Space selection, and Escape handling
 * Follows WCAG accessibility guidelines
 */
export const useKeyboardNavigation = (options: KeyboardNavigationOptions): UseKeyboardNavigationReturn => {
  const {
    itemCount,
    wrap = true,
    enabled = true,
    gridColumns,
    onSelect,
    onEscape,
    initialIndex = -1
  } = options;

  const [focusedIndex, setFocusedIndex] = useState<number>(initialIndex);
  const [isActive, setIsActive] = useState<boolean>(false);
  const previousItemCount = useRef<number>(itemCount);

  // Reset focus when item count changes significantly (e.g., new search results)
  useEffect(() => {
    if (itemCount !== previousItemCount.current) {
      // If items were added/removed, adjust focus appropriately
      if (focusedIndex >= itemCount) {
        setFocusedIndex(itemCount > 0 ? itemCount - 1 : -1);
      }
      previousItemCount.current = itemCount;
    }
  }, [itemCount, focusedIndex]);

  // Auto-activate when enabled with items and initial index is set
  useEffect(() => {
    if (enabled && itemCount > 0 && initialIndex >= 0 && !isActive) {
      console.log(`Auto-activating navigation: enabled=${enabled}, itemCount=${itemCount}, initialIndex=${initialIndex}`);
      setIsActive(true);
    }
  }, [enabled, itemCount, initialIndex, isActive]);

  const focusNext = useCallback(() => {
    if (!enabled || itemCount === 0) return;

    setFocusedIndex(prev => {
      if (prev === -1) return 0; // First activation

      if (gridColumns && gridColumns > 1) {
        // 2D grid navigation - move down one row
        const currentRow = Math.floor(prev / gridColumns);
        const currentCol = prev % gridColumns;
        const nextRow = currentRow + 1;
        const nextIndex = nextRow * gridColumns + currentCol;

        if (nextIndex < itemCount) {
          return nextIndex;
        }

        if (wrap) {
          // Wrap to top of same column (first row)
          return currentCol < itemCount ? currentCol : 0;
        }
        return prev;
      } else {
        // 1D list navigation
        if (prev < itemCount - 1) return prev + 1;
        return wrap ? 0 : prev;
      }
    });
    setIsActive(true);
  }, [enabled, itemCount, gridColumns, wrap]);

  const focusPrevious = useCallback(() => {
    if (!enabled || itemCount === 0) return;

    setFocusedIndex(prev => {
      if (prev === -1) return itemCount - 1; // First activation from end

      if (gridColumns && gridColumns > 1) {
        // 2D grid navigation - move up one row
        const currentRow = Math.floor(prev / gridColumns);
        const currentCol = prev % gridColumns;
        const prevRow = currentRow - 1;

        if (prevRow >= 0) {
          const prevIndex = prevRow * gridColumns + currentCol;
          return prevIndex;
        }

        if (wrap) {
          // Wrap to bottom of same column (last row)
          const totalRows = Math.ceil(itemCount / gridColumns);
          const lastRow = totalRows - 1;
          const targetIndex = lastRow * gridColumns + currentCol;

          // Make sure the target index exists (last row might not be full)
          if (targetIndex < itemCount) {
            return targetIndex;
          } else {
            // If target doesn't exist, find the last item in that column
            for (let row = lastRow; row >= 0; row--) {
              const candidateIndex = row * gridColumns + currentCol;
              if (candidateIndex < itemCount) {
                return candidateIndex;
              }
            }
            return itemCount - 1; // Fallback to last item
          }
        }
        return prev;
      } else {
        // 1D list navigation
        if (prev > 0) return prev - 1;
        return wrap ? itemCount - 1 : prev;
      }
    });
    setIsActive(true);
  }, [enabled, itemCount, gridColumns, wrap]);

  const focusItem = useCallback((index: number) => {
    if (!enabled || index < -1 || index >= itemCount) return;
    setFocusedIndex(index);
    setIsActive(index >= 0);
  }, [enabled, itemCount]);

  const selectFocused = useCallback(() => {
    if (!enabled || focusedIndex === -1 || focusedIndex >= itemCount) return;
    onSelect?.(focusedIndex);
  }, [enabled, focusedIndex, itemCount, onSelect]);

  const clearFocus = useCallback(() => {
    setFocusedIndex(-1);
    setIsActive(false);
    onEscape?.();
  }, [onEscape]);

  const activate = useCallback(() => {
    if (!enabled || itemCount === 0) return;
    if (focusedIndex === -1) {
      setFocusedIndex(0);
    }
    setIsActive(true);
  }, [enabled, itemCount, focusedIndex]);

  const reset = useCallback(() => {
    setFocusedIndex(initialIndex);
    setIsActive(false);
  }, [initialIndex]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (!enabled) return;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        event.stopPropagation();
        focusNext();
        break;
      case 'ArrowUp':
        event.preventDefault();
        event.stopPropagation();
        focusPrevious();
        break;
      case 'ArrowRight':
        if (gridColumns && gridColumns > 1) {
          event.preventDefault();
          event.stopPropagation();
          // Move right in grid
          setFocusedIndex(prev => {
            if (prev === -1) return 0;

            const currentRow = Math.floor(prev / gridColumns);
            const currentCol = prev % gridColumns;
            const nextCol = currentCol + 1;

            console.log(`Right navigation: from ${prev} (row ${currentRow}, col ${currentCol}) with ${gridColumns} columns`);

            // Check if we can move right within the same row
            if (nextCol < gridColumns) {
              const nextIndex = currentRow * gridColumns + nextCol;
              if (nextIndex < itemCount) {
                console.log(`Moving right to ${nextIndex} (row ${currentRow}, col ${nextCol})`);
                return nextIndex;
              }
            }

            if (wrap) {
              // Wrap to beginning of same row
              const rowStart = currentRow * gridColumns;
              const target = rowStart < itemCount ? rowStart : prev;
              console.log(`Wrapping right to ${target}`);
              return target;
            }
            console.log(`Right navigation blocked, staying at ${prev}`);
            return prev;
          });
          setIsActive(true);
        }
        break;
      case 'ArrowLeft':
        if (gridColumns && gridColumns > 1) {
          event.preventDefault();
          event.stopPropagation();
          // Move left in grid
          setFocusedIndex(prev => {
            if (prev === -1) return itemCount - 1;

            const currentRow = Math.floor(prev / gridColumns);
            const currentCol = prev % gridColumns;
            const prevCol = currentCol - 1;

            // Check if we can move left within the same row
            if (prevCol >= 0) {
              const prevIndex = currentRow * gridColumns + prevCol;
              return prevIndex;
            }

            if (wrap) {
              // Wrap to end of same row
              const rowStart = currentRow * gridColumns;
              const rowEnd = Math.min(rowStart + gridColumns - 1, itemCount - 1);
              return rowEnd;
            }
            return prev;
          });
          setIsActive(true);
        }
        break;
      case 'Enter':
      case ' ': // Space key
        if (isActive && focusedIndex >= 0) {
          event.preventDefault();
          event.stopPropagation();
          selectFocused();
        }
        break;
      case 'Escape':
        // Only handle escape if we're actively navigating
        // Don't prevent propagation so modals can still close
        if (isActive) {
          event.preventDefault();
          clearFocus();
        }
        break;
      case 'Home':
        event.preventDefault();
        event.stopPropagation();
        focusItem(0);
        break;
      case 'End':
        event.preventDefault();
        event.stopPropagation();
        focusItem(itemCount - 1);
        break;
    }
  }, [enabled, focusNext, focusPrevious, focusItem, selectFocused, clearFocus, isActive, focusedIndex, gridColumns, itemCount, wrap]);

  return {
    focusedIndex,
    isActive,
    focusNext,
    focusPrevious,
    focusItem,
    selectFocused,
    clearFocus,
    activate,
    handleKeyDown,
    reset
  };
};

export default useKeyboardNavigation;
