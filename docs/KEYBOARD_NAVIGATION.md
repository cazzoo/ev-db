# Keyboard Navigation Implementation

## Overview

This document describes the keyboard navigation functionality implemented for the EV Database application. The implementation follows WCAG 2.1 accessibility guidelines and provides comprehensive keyboard support for vehicle lists, contribution pages, and data tables.

## Features

### 🎯 Core Navigation
- **Arrow Keys**: Navigate between items (Up/Down for lists, all directions for grids)
- **Enter/Space**: Select or activate focused items
- **Escape**: Exit navigation mode or clear selection
- **Tab**: Move focus to interactive elements within items
- **Home/End**: Jump to first/last item quickly

### 🔄 Smart Focus Management
- **Visual indicators**: Clear focus rings and highlighting for focused items
- **Scroll management**: Automatic scrolling to keep focused items visible
- **State persistence**: Navigation state maintained during list updates
- **Wrap-around**: Optional navigation from last to first item and vice versa

### 📱 Responsive Grid Support
- **2D Navigation**: Full arrow key support for grid layouts
- **Dynamic columns**: Automatically adapts to responsive breakpoints
- **Edge handling**: Smart navigation at grid boundaries

## Components

### useKeyboardNavigation Hook

A reusable custom hook that provides keyboard navigation functionality:

```typescript
const {
  focusedIndex,
  isActive,
  handleKeyDown,
  reset
} = useKeyboardNavigation({
  itemCount: items.length,
  wrap: true,
  enabled: true,
  gridColumns: 4, // Optional for 2D navigation
  onSelect: (index) => handleItemSelect(index),
  onEscape: () => clearFocus()
});
```

#### Options
- `itemCount`: Total number of navigable items
- `wrap`: Whether to wrap around at boundaries (default: true)
- `enabled`: Whether navigation is active (default: true)
- `gridColumns`: Number of columns for 2D grid navigation (optional)
- `onSelect`: Callback when item is selected (Enter/Space)
- `onEscape`: Callback when navigation is escaped
- `initialIndex`: Starting focus index (default: -1)

### Enhanced Components

#### VehicleCardGrid
- **Grid navigation**: Full 2D arrow key support
- **Responsive**: Adapts to different screen sizes (2-5 columns)
- **Focus indicators**: Clear visual feedback for focused vehicles
- **Integration**: Seamless integration with existing mouse/touch interactions

#### VehicleCard
- **Focus management**: Proper focus handling and visual indicators
- **Action support**: Tab navigation to buttons within cards
- **Accessibility**: Full ARIA support and screen reader compatibility

#### DataTable
- **Row navigation**: Up/Down arrow keys to navigate table rows
- **Selection**: Enter/Space to trigger row actions
- **Visual feedback**: Highlighted focused rows
- **Pagination**: Navigation state preserved across pages

## Usage Examples

### Basic List Navigation
```tsx
import { useKeyboardNavigation } from '../hooks/useKeyboardNavigation';

const MyList = ({ items }) => {
  const { focusedIndex, isActive, handleKeyDown } = useKeyboardNavigation({
    itemCount: items.length,
    onSelect: (index) => console.log('Selected:', items[index])
  });

  return (
    <div onKeyDown={handleKeyDown} tabIndex={0}>
      {items.map((item, index) => (
        <div 
          key={item.id}
          className={isActive && focusedIndex === index ? 'focused' : ''}
        >
          {item.name}
        </div>
      ))}
    </div>
  );
};
```

### Grid Navigation
```tsx
const MyGrid = ({ items }) => {
  const { focusedIndex, isActive, handleKeyDown } = useKeyboardNavigation({
    itemCount: items.length,
    gridColumns: 3,
    wrap: true,
    onSelect: (index) => handleItemClick(items[index])
  });

  return (
    <div 
      className="grid grid-cols-3 gap-4"
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="grid"
    >
      {items.map((item, index) => (
        <div 
          key={item.id}
          role="gridcell"
          aria-selected={isActive && focusedIndex === index}
          className={isActive && focusedIndex === index ? 'ring-2 ring-primary' : ''}
        >
          {item.content}
        </div>
      ))}
    </div>
  );
};
```

## Accessibility Compliance

### WCAG 2.1 Guidelines
- **2.1.1 Keyboard**: All functionality available via keyboard
- **2.1.2 No Keyboard Trap**: Users can navigate away from any component
- **2.4.3 Focus Order**: Logical focus order maintained
- **2.4.7 Focus Visible**: Clear visual focus indicators
- **4.1.2 Name, Role, Value**: Proper ARIA attributes

### Screen Reader Support
- **ARIA labels**: Descriptive labels for navigation context
- **Role attributes**: Proper semantic roles (grid, gridcell, table, row)
- **State announcements**: Focus and selection states announced
- **Instructions**: Clear usage instructions in aria-label attributes

### Browser Compatibility
- **Chrome**: Full support for all features
- **Firefox**: Full support for all features  
- **Safari**: Full support for all features
- **Edge**: Full support for all features

## Testing

### Manual Testing Checklist
- [ ] Arrow keys navigate between items correctly
- [ ] Enter/Space activates focused items
- [ ] Escape exits navigation mode
- [ ] Tab moves to interactive elements within items
- [ ] Home/End jump to first/last items
- [ ] Focus indicators are clearly visible
- [ ] Navigation works with screen readers
- [ ] No conflicts with existing mouse/touch interactions

### Automated Testing
```bash
# Run accessibility tests
npm run test:a11y

# Run keyboard navigation specific tests
npm run test:keyboard
```

## Implementation Notes

### Performance Considerations
- **Efficient re-renders**: Only focused items re-render when focus changes
- **Debounced updates**: Rapid key presses handled efficiently
- **Memory management**: Proper cleanup of event listeners and refs

### Edge Cases Handled
- **Empty lists**: Graceful handling when no items available
- **Dynamic content**: Navigation adapts to changing item counts
- **Responsive changes**: Grid columns update on window resize
- **Pagination**: Focus state preserved across page changes

### Future Enhancements
- **Type-ahead search**: Quick navigation by typing item names
- **Multi-selection**: Support for selecting multiple items
- **Custom key bindings**: Configurable keyboard shortcuts
- **Voice navigation**: Integration with voice control APIs

## Troubleshooting

### Common Issues
1. **Focus not visible**: Ensure CSS focus styles are not overridden
2. **Navigation not working**: Check that `enabled` prop is true
3. **Grid navigation issues**: Verify `gridColumns` matches actual layout
4. **Screen reader problems**: Validate ARIA attributes are correct

### Debug Mode
Enable debug logging by setting `DEBUG_KEYBOARD_NAV=true` in environment variables.
