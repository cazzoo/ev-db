# EV Database Design System

A comprehensive UI/UX design system built on DaisyUI 5 and Tailwind CSS 4 for the EV Database application.

## 🎯 Overview

This design system ensures visual consistency across the entire application by providing:

- **Standardized Components**: Button, Form, Layout, Card, and Modal components
- **Design Tokens**: Consistent spacing, typography, colors, and sizing
- **Responsive Utilities**: Mobile-first responsive design patterns
- **Accessibility**: Built-in ARIA attributes and keyboard navigation
- **Type Safety**: Full TypeScript support with variant props

## 📦 Installation

The design system is already integrated into the frontend package. Import components as needed:

```tsx
// Import all components
import { Button, Input, Card, Grid } from '../design-system';

// Import specific components
import { Button } from '../design-system/components/Button';
import { designTokens } from '../design-system/tokens';
```

## 🚀 Quick Start

### Basic Button Usage

```tsx
import { Button } from '../design-system';

function MyComponent() {
  return (
    <div>
      <Button variant="primary" size="md">
        Primary Action
      </Button>
      <Button variant="secondary" size="md">
        Secondary Action
      </Button>
    </div>
  );
}
```

### Form Components

```tsx
import { Form, Input, Button } from '../design-system';

function ContactForm() {
  return (
    <Form spacing="md" onSubmit={handleSubmit}>
      <Input
        label="Email"
        type="email"
        placeholder="Enter your email"
        required
      />
      <Input
        label="Name"
        placeholder="Enter your name"
        required
      />
      <Button type="submit" variant="primary">
        Submit
      </Button>
    </Form>
  );
}
```

### Layout Components

```tsx
import { Container, Grid, Card } from '../design-system';

function Dashboard() {
  return (
    <Container size="xl" padding="md">
      <Grid cols={{ sm: 1, md: 2, lg: 3 }} gap="lg">
        <Card>
          <Card.Header title="Stats" />
          <Card.Body>Content here</Card.Body>
        </Card>
        {/* More cards */}
      </Grid>
    </Container>
  );
}
```

## 🎨 Design Tokens

### Spacing System

Based on a 4px grid system for consistent spacing:

```tsx
import { spacing } from '../design-system/tokens';

// Available spacing values
spacing.xs   // 4px
spacing.sm   // 8px
spacing.md   // 12px (default)
spacing.lg   // 16px
spacing.xl   // 20px
spacing['2xl'] // 24px
// ... up to 6xl (64px)
```

### Typography Scale

```tsx
import { typography } from '../design-system/tokens';

typography.fontSize.xs    // 12px
typography.fontSize.sm    // 14px
typography.fontSize.base  // 16px (default)
typography.fontSize.lg    // 18px
// ... up to 4xl (36px)
```

### Component Sizes

```tsx
import { componentSizes } from '../design-system/tokens';

// Button sizes
componentSizes.button.sm  // 32px height
componentSizes.button.md  // 40px height (default)
componentSizes.button.lg  // 48px height

// Input sizes
componentSizes.input.sm   // 32px height
componentSizes.input.md   // 40px height (default)
componentSizes.input.lg   // 48px height
```

## 🧩 Components

### Button Component

Full-featured button with multiple variants and states:

```tsx
<Button
  variant="primary"     // primary | secondary | tertiary | outline | success | warning | error
  size="md"            // sm | md | lg | xl
  loading={isLoading}
  disabled={isDisabled}
  leftIcon={<Icon />}
  rightIcon={<Icon />}
  onClick={handleClick}
>
  Button Text
</Button>
```

### Form Components

Comprehensive form components with validation states:

```tsx
// Input with validation
<Input
  label="Email"
  type="email"
  value={email}
  onChange={(e) => setEmail(e.target.value)}
  state="error"
  errorMessage="Invalid email format"
  helperText="We'll never share your email"
  leftIcon={<EmailIcon />}
  required
/>

// Textarea
<Textarea
  label="Description"
  rows={4}
  resize="vertical"
  placeholder="Enter description..."
/>

// Select
<Select
  label="Country"
  placeholder="Select country"
  options={[
    { value: 'us', label: 'United States' },
    { value: 'ca', label: 'Canada' }
  ]}
/>

// Checkbox
<Checkbox
  label="I agree to the terms"
  checked={agreed}
  onChange={(e) => setAgreed(e.target.checked)}
/>

// Radio Group
<RadioGroup
  name="plan"
  label="Subscription Plan"
  value={selectedPlan}
  onChange={setSelectedPlan}
  options={planOptions}
  orientation="horizontal"
/>
```

### Layout Components

Responsive layout components for consistent spacing:

```tsx
// Container with max-width and padding
<Container size="xl" padding="md" center>
  Content
</Container>

// Responsive grid
<Grid
  cols={{ sm: 1, md: 2, lg: 3, xl: 4 }}
  gap="lg"
  autoFit={false}
>
  {items.map(item => <div key={item.id}>{item.content}</div>)}
</Grid>

// Flexible layouts
<Flex
  direction="row"
  align="center"
  justify="between"
  gap="md"
  responsive={{
    md: { direction: 'row', justify: 'between' }
  }}
>
  <h1>Title</h1>
  <Button>Action</Button>
</Flex>

// Vertical stack with consistent spacing
<Stack spacing="lg" align="center">
  <h1>Title</h1>
  <p>Description</p>
  <Button>Action</Button>
</Stack>
```

### Card Components

Flexible card components for content display:

```tsx
// Basic card
<Card variant="default" size="md" hover>
  <Card.Header
    title="Card Title"
    subtitle="Card subtitle"
    actions={<Button size="sm">Action</Button>}
    avatar={<Avatar />}
  />
  <Card.Body padding="md">
    <p>Card content goes here...</p>
  </Card.Body>
  <Card.Footer justify="end">
    <Button variant="tertiary">Cancel</Button>
    <Button variant="primary">Save</Button>
  </Card.Footer>
</Card>

// Stats card for metrics
<StatsCard
  title="Total Users"
  value={1234}
  description="Active users"
  trend={{
    value: 12.5,
    isPositive: true,
    label: "vs last month"
  }}
  icon={<UsersIcon />}
  variant="primary"
/>
```

### Modal Components

Accessible modal components with different variants:

```tsx
// Basic modal
<Modal
  open={isOpen}
  onClose={() => setIsOpen(false)}
  title="Modal Title"
  description="Modal description"
  size="md"
>
  <p>Modal content...</p>
</Modal>

// Confirmation modal
<ConfirmationModal
  open={showConfirm}
  onClose={() => setShowConfirm(false)}
  title="Delete Item"
  description="Are you sure? This action cannot be undone."
  variant="error"
  confirmText="Delete"
  onConfirm={handleDelete}
  loading={isDeleting}
/>

// Form modal
<FormModal
  open={showForm}
  onClose={() => setShowForm(false)}
  title="Add Item"
  submitText="Add"
  onSubmit={handleSubmit}
  loading={isSubmitting}
>
  <Input label="Name" required />
  <Textarea label="Description" />
</FormModal>

// Drawer (side modal)
<Drawer
  open={showDrawer}
  onClose={() => setShowDrawer(false)}
  title="Settings"
  side="right"
  size="lg"
>
  <SettingsForm />
</Drawer>
```

## 🎯 Utilities

### Class Name Utilities

```tsx
import { cn, responsive, variant, conditional } from '../design-system/utils';

// Merge classes safely
const className = cn('base-class', conditionalClass && 'conditional-class');

// Responsive utilities
const responsiveClass = responsive('text-sm', {
  md: 'text-base',
  lg: 'text-lg'
});

// Variant-based classes
const variantClass = variant({
  primary: 'bg-blue-500',
  secondary: 'bg-gray-500'
}, 'primary');

// Conditional classes
const conditionalClass = conditional(isActive, 'bg-blue-500', 'bg-gray-500');
```

### Layout Utilities

```tsx
import { grid, flex, transition } from '../design-system/utils';

// Grid utilities
const gridClass = grid({ sm: 1, md: 2, lg: 3 }, 'md');

// Flex utilities
const flexClass = flex('row', 'center', 'between', 'md');

// Transition utilities
const transitionClass = transition('normal', ['colors', 'transform']);
```

## 📱 Responsive Design

All components support responsive design through props:

```tsx
// Responsive grid
<Grid cols={{ sm: 1, md: 2, lg: 3, xl: 4 }} gap="md">
  {items}
</Grid>

// Responsive flex
<Flex
  direction="col"
  responsive={{
    md: { direction: 'row', justify: 'between' },
    lg: { gap: 'lg' }
  }}
>
  <div>Content</div>
  <div>Sidebar</div>
</Flex>

// Responsive button sizes
<Button
  size="sm"
  className="md:btn-md lg:btn-lg"
>
  Responsive Button
</Button>
```

## ♿ Accessibility

All components include built-in accessibility features:

- **ARIA attributes**: Proper labeling and descriptions
- **Keyboard navigation**: Full keyboard support
- **Focus management**: Visible focus indicators
- **Screen reader support**: Semantic HTML and ARIA labels
- **Color contrast**: WCAG compliant color combinations

```tsx
// Accessible form
<Input
  label="Email"
  required
  aria-describedby="email-help"
  helperText="We'll never share your email"
/>

// Accessible modal
<Modal
  open={isOpen}
  onClose={handleClose}
  title="Confirmation"
  description="Please confirm your action"
  aria-labelledby="modal-title"
  aria-describedby="modal-description"
>
  Content
</Modal>

// Accessible button
<IconButton
  icon={<EditIcon />}
  aria-label="Edit item"
  variant="tertiary"
/>
```

## 🔧 Customization

### Extending Components

```tsx
// Extend existing components
const CustomButton = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, ...props }, ref) => {
    return (
      <Button
        ref={ref}
        className={cn('custom-styles', className)}
        {...props}
      />
    );
  }
);
```

### Custom Variants

```tsx
// Add custom variants using class-variance-authority
const customButtonVariants = cva(
  'btn',
  {
    variants: {
      variant: {
        ...buttonVariants.variants.variant,
        custom: 'bg-purple-500 hover:bg-purple-600 text-white'
      }
    }
  }
);
```

## 📚 Documentation

For complete documentation, examples, and migration guides, see:

- [Design System Documentation](../../../docs/DESIGN_SYSTEM.md)
- [DaisyUI Components](https://daisyui.com/components/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

## 🤝 Contributing

When contributing to the design system:

1. Follow existing patterns and conventions
2. Use DaisyUI classes when possible
3. Include proper TypeScript types
4. Add comprehensive documentation
5. Test across different themes and screen sizes
6. Ensure accessibility compliance

## 📄 License

This design system is part of the EV Database project and follows the same license terms.
