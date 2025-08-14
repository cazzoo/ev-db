# EV Database Design System

A comprehensive UI/UX design system built on DaisyUI and Tailwind CSS to ensure consistency across the EV Database application.

## Overview

The EV Database Design System provides a cohesive set of reusable components, design tokens, and utilities that maintain visual consistency while leveraging DaisyUI's component library and Tailwind CSS utilities for efficient implementation.

## Table of Contents

- [Getting Started](#getting-started)
- [Design Tokens](#design-tokens)
- [Components](#components)
- [Layout System](#layout-system)
- [Usage Guidelines](#usage-guidelines)
- [Examples](#examples)

## Getting Started

### Installation

The design system is already integrated into the frontend package. To use components:

```tsx
import { Button, Input, Card, Grid } from '../design-system';

// Or import specific components
import { Button } from '../design-system/components/Button';
```

### Basic Usage

```tsx
import { Button, Input, Card, Container } from '../design-system';

function MyComponent() {
  return (
    <Container>
      <Card>
        <Card.Header title="Example Form" />
        <Card.Body>
          <Input
            label="Email"
            type="email"
            placeholder="Enter your email"
            required
          />
          <Button variant="primary" size="md">
            Submit
          </Button>
        </Card.Body>
      </Card>
    </Container>
  );
}
```

## Design Tokens

### Spacing System

Consistent spacing based on a 4px grid system:

```tsx
import { spacing, componentSpacing } from '../design-system/tokens';

// Base spacing units
spacing.xs   // 4px
spacing.sm   // 8px
spacing.md   // 12px
spacing.lg   // 16px
spacing.xl   // 20px
spacing['2xl'] // 24px
// ... up to 6xl (64px)

// Component-specific spacing
componentSpacing.formFieldGap    // 16px
componentSpacing.cardPadding     // 32px
componentSpacing.buttonGap       // 12px
```

### Typography Scale

Consistent typography based on DaisyUI's system:

```tsx
import { typography } from '../design-system/tokens';

typography.fontSize.xs    // 12px
typography.fontSize.sm    // 14px
typography.fontSize.base  // 16px
typography.fontSize.lg    // 18px
// ... up to 4xl (36px)
```

### Component Sizes

Standardized sizing for consistent component scaling:

```tsx
import { componentSizes } from '../design-system/tokens';

// Button sizes
componentSizes.button.sm  // height: 32px
componentSizes.button.md  // height: 40px
componentSizes.button.lg  // height: 48px

// Input sizes
componentSizes.input.sm   // height: 32px
componentSizes.input.md   // height: 40px
componentSizes.input.lg   // height: 48px
```

## Components

### Button Components

#### Basic Button

```tsx
import { Button } from '../design-system';

// Primary button (default)
<Button variant="primary" size="md">
  Primary Action
</Button>

// Secondary button
<Button variant="secondary" size="md">
  Secondary Action
</Button>

// Tertiary/Ghost button
<Button variant="tertiary" size="md">
  Tertiary Action
</Button>
```

#### Button Variants

- `primary` - Main actions (blue)
- `secondary` - Secondary actions (gray)
- `tertiary` - Subtle actions (transparent)
- `outline` - Outlined style
- `success` - Positive actions (green)
- `warning` - Caution actions (yellow)
- `error` - Destructive actions (red)
- `info` - Informational actions (blue)
- `link` - Text-like appearance

#### Button Sizes

- `sm` - Small (32px height)
- `md` - Medium (40px height) - Default
- `lg` - Large (48px height)
- `xl` - Extra large (56px height)

#### Button States

```tsx
// Loading state
<Button loading loadingText="Saving...">
  Save
</Button>

// Disabled state
<Button disabled>
  Disabled
</Button>

// With icons
<Button leftIcon={<SaveIcon />}>
  Save
</Button>

<Button rightIcon={<ArrowIcon />}>
  Next
</Button>
```

#### Button Group

```tsx
import { ButtonGroup } from '../design-system';

<ButtonGroup orientation="horizontal" size="md">
  <Button variant="outline">Option 1</Button>
  <Button variant="outline">Option 2</Button>
  <Button variant="outline">Option 3</Button>
</ButtonGroup>
```

#### Icon Button

```tsx
import { IconButton } from '../design-system';

<IconButton
  icon={<EditIcon />}
  aria-label="Edit item"
  variant="tertiary"
  size="md"
/>
```

### Form Components

#### Input Field

```tsx
import { Input } from '../design-system';

<Input
  label="Email Address"
  type="email"
  placeholder="Enter your email"
  helperText="We'll never share your email"
  required
  size="md"
/>

// With validation state
<Input
  label="Username"
  value={username}
  onChange={(e) => setUsername(e.target.value)}
  state="error"
  errorMessage="Username is already taken"
/>

// With icons
<Input
  label="Search"
  leftIcon={<SearchIcon />}
  rightIcon={<ClearIcon />}
  placeholder="Search vehicles..."
/>
```

#### Textarea

```tsx
import { Textarea } from '../design-system';

<Textarea
  label="Description"
  placeholder="Enter description..."
  rows={4}
  resize="vertical"
  helperText="Maximum 500 characters"
/>
```

#### Select

```tsx
import { Select } from '../design-system';

<Select
  label="Vehicle Type"
  placeholder="Select vehicle type"
  options={[
    { value: 'sedan', label: 'Sedan' },
    { value: 'suv', label: 'SUV' },
    { value: 'hatchback', label: 'Hatchback' },
  ]}
  required
/>
```

#### Checkbox

```tsx
import { Checkbox } from '../design-system';

<Checkbox
  label="I agree to the terms and conditions"
  required
/>

<Checkbox
  label="Enable notifications"
  helperText="Receive updates about new vehicles"
/>
```

#### Radio Group

```tsx
import { RadioGroup } from '../design-system';

<RadioGroup
  name="subscription"
  label="Subscription Plan"
  value={selectedPlan}
  onChange={setSelectedPlan}
  options={[
    { value: 'basic', label: 'Basic Plan' },
    { value: 'premium', label: 'Premium Plan' },
    { value: 'enterprise', label: 'Enterprise Plan' },
  ]}
  orientation="vertical"
/>
```

#### Form Wrapper

```tsx
import { Form } from '../design-system';

<Form spacing="md" onSubmit={handleSubmit}>
  <Input label="Name" required />
  <Input label="Email" type="email" required />
  <Textarea label="Message" />
  <Button type="submit" variant="primary">
    Submit
  </Button>
</Form>
```

### Layout Components

#### Container

```tsx
import { Container } from '../design-system';

<Container size="xl" padding="md" center>
  <h1>Page Content</h1>
</Container>
```

#### Grid

```tsx
import { Grid } from '../design-system';

// Simple grid
<Grid cols={3} gap="md">
  <div>Item 1</div>
  <div>Item 2</div>
  <div>Item 3</div>
</Grid>

// Responsive grid
<Grid
  cols={{ sm: 1, md: 2, lg: 3, xl: 4 }}
  gap="lg"
>
  {items.map(item => <Card key={item.id}>{item.content}</Card>)}
</Grid>

// Auto-fit grid
<Grid autoFit minItemWidth="300px" gap="md">
  {cards.map(card => <Card key={card.id}>{card}</Card>)}
</Grid>
```

#### Flex

```tsx
import { Flex } from '../design-system';

<Flex
  direction="row"
  align="center"
  justify="between"
  gap="md"
>
  <h2>Title</h2>
  <Button>Action</Button>
</Flex>

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
```

#### Stack

```tsx
import { Stack } from '../design-system';

<Stack spacing="lg" align="center">
  <h1>Title</h1>
  <p>Description</p>
  <Button>Action</Button>
</Stack>

// With dividers
<Stack spacing="md" divider={<hr className="border-base-300" />}>
  <div>Section 1</div>
  <div>Section 2</div>
  <div>Section 3</div>
</Stack>
```

#### Section

```tsx
import { Section } from '../design-system';

<Section spacing="lg" background="base">
  <Container>
    <h2>Section Title</h2>
    <p>Section content...</p>
  </Container>
</Section>
```

### Card Components

#### Basic Card

```tsx
import { Card } from '../design-system';

<Card variant="default" size="md">
  <Card.Header
    title="Card Title"
    subtitle="Card subtitle"
    actions={<Button size="sm">Action</Button>}
  />
  <Card.Body>
    <p>Card content goes here...</p>
  </Card.Body>
  <Card.Footer justify="end">
    <Button variant="tertiary">Cancel</Button>
    <Button variant="primary">Save</Button>
  </Card.Footer>
</Card>
```

#### Stats Card

```tsx
import { StatsCard } from '../design-system';

<StatsCard
  title="Total Vehicles"
  value={1234}
  description="Active listings"
  trend={{
    value: 12.5,
    isPositive: true,
    label: "vs last month"
  }}
  icon={<CarIcon />}
  variant="primary"
/>
```

#### Feature Card

```tsx
import { FeatureCard } from '../design-system';

<FeatureCard
  title="API Access"
  description="Get programmatic access to our vehicle database"
  icon={<ApiIcon />}
  badge="Popular"
  actions={<Button variant="primary">Learn More</Button>}
/>
```

### Modal Components

#### Basic Modal

```tsx
import { Modal } from '../design-system';

<Modal
  open={isOpen}
  onClose={() => setIsOpen(false)}
  title="Modal Title"
  description="Modal description"
  size="md"
>
  <p>Modal content...</p>
</Modal>
```

#### Confirmation Modal

```tsx
import { ConfirmationModal } from '../design-system';

<ConfirmationModal
  open={showConfirm}
  onClose={() => setShowConfirm(false)}
  title="Delete Vehicle"
  description="Are you sure you want to delete this vehicle? This action cannot be undone."
  variant="error"
  confirmText="Delete"
  cancelText="Cancel"
  onConfirm={handleDelete}
  loading={isDeleting}
/>
```

#### Form Modal

```tsx
import { FormModal } from '../design-system';

<FormModal
  open={showForm}
  onClose={() => setShowForm(false)}
  title="Add Vehicle"
  submitText="Add Vehicle"
  onSubmit={handleSubmit}
  loading={isSubmitting}
>
  <Input label="Make" required />
  <Input label="Model" required />
  <Input label="Year" type="number" required />
</FormModal>
```

#### Drawer

```tsx
import { Drawer } from '../design-system';

<Drawer
  open={showDrawer}
  onClose={() => setShowDrawer(false)}
  title="Vehicle Details"
  side="right"
  size="lg"
  actions={
    <Button variant="primary" onClick={handleSave}>
      Save Changes
    </Button>
  }
>
  <VehicleForm />
</Drawer>
```

## Usage Guidelines

### Component Composition

Always compose components using the design system rather than creating custom styled elements:

```tsx
// ✅ Good - Using design system components
<Card>
  <Card.Header title="Vehicle Details" />
  <Card.Body>
    <Grid cols={2} gap="md">
      <Input label="Make" />
      <Input label="Model" />
    </Grid>
  </Card.Body>
  <Card.Footer>
    <Button variant="primary">Save</Button>
  </Card.Footer>
</Card>

// ❌ Bad - Custom styling
<div className="bg-white p-6 rounded-lg shadow-md">
  <h3 className="text-lg font-bold mb-4">Vehicle Details</h3>
  <div className="grid grid-cols-2 gap-4">
    <input className="border rounded px-3 py-2" placeholder="Make" />
    <input className="border rounded px-3 py-2" placeholder="Model" />
  </div>
  <div className="flex justify-end mt-4">
    <button className="bg-blue-500 text-white px-4 py-2 rounded">Save</button>
  </div>
</div>
```

### Consistent Spacing

Use the design system's spacing tokens for consistent visual rhythm:

```tsx
import { spacing } from '../design-system/tokens';

// ✅ Good - Using design tokens
<Stack spacing="lg">
  <Section spacing="xl">
    <Container padding="md">
      <Grid gap="md">
        {/* content */}
      </Grid>
    </Container>
  </Section>
</Stack>

// ❌ Bad - Arbitrary spacing
<div className="space-y-7">
  <div className="py-10">
    <div className="px-5">
      <div className="gap-3">
        {/* content */}
      </div>
    </div>
  </div>
</div>
```

### Form Validation

Always use the design system's validation states and error messaging:

```tsx
// ✅ Good - Consistent validation
<Form spacing="md">
  <Input
    label="Email"
    type="email"
    value={email}
    onChange={(e) => setEmail(e.target.value)}
    state={emailError ? 'error' : 'default'}
    errorMessage={emailError}
    required
  />
  <Button
    type="submit"
    variant="primary"
    disabled={!isFormValid}
    loading={isSubmitting}
  >
    Submit
  </Button>
</Form>

// ❌ Bad - Inconsistent validation
<form>
  <div>
    <label>Email</label>
    <input
      type="email"
      className={emailError ? 'border-red-500' : 'border-gray-300'}
    />
    {emailError && <span className="text-red-500 text-sm">{emailError}</span>}
  </div>
  <button disabled={!isFormValid}>
    {isSubmitting ? 'Loading...' : 'Submit'}
  </button>
</form>
```

### Responsive Design

Use the design system's responsive utilities for consistent breakpoints:

```tsx
// ✅ Good - Using design system responsive props
<Grid
  cols={{ sm: 1, md: 2, lg: 3, xl: 4 }}
  gap="md"
>
  {items.map(item => (
    <Card key={item.id} size="md">
      {item.content}
    </Card>
  ))}
</Grid>

<Flex
  direction="col"
  responsive={{
    md: { direction: 'row', justify: 'between' },
    lg: { gap: 'lg' }
  }}
>
  <div>Main content</div>
  <div>Sidebar</div>
</Flex>

// ❌ Bad - Custom responsive classes
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
  {items.map(item => (
    <div key={item.id} className="bg-white p-4 rounded shadow">
      {item.content}
    </div>
  ))}
</div>
```

### Accessibility

The design system includes built-in accessibility features. Always use them:

```tsx
// ✅ Good - Accessible components
<Modal
  open={isOpen}
  onClose={() => setIsOpen(false)}
  title="Confirm Action"
  description="This action cannot be undone"
>
  <ConfirmationModal
    variant="warning"
    confirmText="Proceed"
    cancelText="Cancel"
    onConfirm={handleConfirm}
  />
</Modal>

<IconButton
  icon={<EditIcon />}
  aria-label="Edit vehicle details"
  variant="tertiary"
/>

<RadioGroup
  name="vehicle-type"
  label="Vehicle Type"
  options={vehicleTypes}
  value={selectedType}
  onChange={setSelectedType}
/>

// ❌ Bad - Missing accessibility
<div onClick={() => setIsOpen(false)}>
  <div>
    <h3>Confirm Action</h3>
    <p>This action cannot be undone</p>
    <button onClick={handleConfirm}>Proceed</button>
  </div>
</div>
```

## Examples

### Vehicle Listing Page

```tsx
import {
  Container,
  Grid,
  Card,
  Button,
  Input,
  Select,
  Flex,
  Stack
} from '../design-system';

function VehicleListingPage() {
  return (
    <Container size="xl" padding="md">
      <Stack spacing="xl">
        {/* Header */}
        <Flex justify="between" align="center">
          <h1 className="text-3xl font-bold">Electric Vehicles</h1>
          <Button variant="primary" leftIcon={<PlusIcon />}>
            Add Vehicle
          </Button>
        </Flex>

        {/* Filters */}
        <Card variant="outlined">
          <Card.Body padding="md">
            <Grid cols={{ sm: 1, md: 3, lg: 4 }} gap="md">
              <Input
                label="Search"
                placeholder="Search vehicles..."
                leftIcon={<SearchIcon />}
              />
              <Select
                label="Make"
                placeholder="All makes"
                options={makeOptions}
              />
              <Select
                label="Year"
                placeholder="All years"
                options={yearOptions}
              />
              <Button variant="outline" size="md">
                Clear Filters
              </Button>
            </Grid>
          </Card.Body>
        </Card>

        {/* Vehicle Grid */}
        <Grid cols={{ sm: 1, md: 2, lg: 3 }} gap="lg">
          {vehicles.map(vehicle => (
            <Card key={vehicle.id} hover interactive>
              <Card.Header
                title={`${vehicle.make} ${vehicle.model}`}
                subtitle={`${vehicle.year} • ${vehicle.range} miles range`}
                actions={
                  <Button variant="tertiary" size="sm">
                    <MoreIcon />
                  </Button>
                }
              />
              <Card.Body>
                <Stack spacing="sm">
                  <p className="text-base-content/70">
                    Battery: {vehicle.batteryCapacity} kWh
                  </p>
                  <p className="text-base-content/70">
                    Charging: {vehicle.chargingSpeed} kW
                  </p>
                </Stack>
              </Card.Body>
              <Card.Footer>
                <Button variant="outline" size="sm">
                  View Details
                </Button>
                <Button variant="primary" size="sm">
                  Edit
                </Button>
              </Card.Footer>
            </Card>
          ))}
        </Grid>
      </Stack>
    </Container>
  );
}
```

### Dashboard Stats Section

```tsx
import {
  Grid,
  StatsCard,
  Card,
  Section,
  Container
} from '../design-system';

function DashboardStats() {
  return (
    <Section spacing="lg" background="base">
      <Container>
        <Grid cols={{ sm: 1, md: 2, lg: 4 }} gap="lg">
          <StatsCard
            title="Total Vehicles"
            value={1234}
            description="Active listings"
            trend={{
              value: 12.5,
              isPositive: true,
              label: "vs last month"
            }}
            icon={<CarIcon />}
            variant="primary"
          />

          <StatsCard
            title="API Calls"
            value="45.2K"
            description="This month"
            trend={{
              value: 8.3,
              isPositive: true,
              label: "vs last month"
            }}
            icon={<ApiIcon />}
            variant="success"
          />

          <StatsCard
            title="Active Users"
            value={892}
            description="Registered users"
            trend={{
              value: 2.1,
              isPositive: false,
              label: "vs last month"
            }}
            icon={<UsersIcon />}
            variant="info"
          />

          <StatsCard
            title="Revenue"
            value="$12.4K"
            description="Monthly revenue"
            trend={{
              value: 15.7,
              isPositive: true,
              label: "vs last month"
            }}
            icon={<DollarIcon />}
            variant="warning"
          />
        </Grid>
      </Container>
    </Section>
  );
}
```

### Form Example

```tsx
import {
  Form,
  Input,
  Textarea,
  Select,
  Checkbox,
  RadioGroup,
  Button,
  Card,
  Stack
} from '../design-system';

function VehicleForm() {
  const [formData, setFormData] = useState({
    make: '',
    model: '',
    year: new Date().getFullYear(),
    batteryCapacity: '',
    range: '',
    chargingSpeed: '',
    description: '',
    isPublic: false,
    category: 'sedan'
  });

  return (
    <Card>
      <Card.Header title="Add New Vehicle" />
      <Card.Body>
        <Form spacing="lg" onSubmit={handleSubmit}>
          <Stack spacing="md">
            {/* Basic Information */}
            <h3 className="text-lg font-semibold">Basic Information</h3>
            <Grid cols={{ sm: 1, md: 2 }} gap="md">
              <Input
                label="Make"
                value={formData.make}
                onChange={(e) => setFormData({...formData, make: e.target.value})}
                placeholder="e.g., Tesla"
                required
              />
              <Input
                label="Model"
                value={formData.model}
                onChange={(e) => setFormData({...formData, model: e.target.value})}
                placeholder="e.g., Model 3"
                required
              />
            </Grid>

            <Grid cols={{ sm: 1, md: 3 }} gap="md">
              <Input
                label="Year"
                type="number"
                value={formData.year}
                onChange={(e) => setFormData({...formData, year: parseInt(e.target.value)})}
                required
              />
              <Input
                label="Battery Capacity (kWh)"
                type="number"
                value={formData.batteryCapacity}
                onChange={(e) => setFormData({...formData, batteryCapacity: e.target.value})}
                placeholder="e.g., 75"
                required
              />
              <Input
                label="Range (miles)"
                type="number"
                value={formData.range}
                onChange={(e) => setFormData({...formData, range: e.target.value})}
                placeholder="e.g., 300"
                required
              />
            </Grid>

            {/* Category */}
            <RadioGroup
              name="category"
              label="Vehicle Category"
              value={formData.category}
              onChange={(value) => setFormData({...formData, category: value})}
              options={[
                { value: 'sedan', label: 'Sedan' },
                { value: 'suv', label: 'SUV' },
                { value: 'hatchback', label: 'Hatchback' },
                { value: 'truck', label: 'Truck' }
              ]}
              orientation="horizontal"
            />

            {/* Description */}
            <Textarea
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              placeholder="Additional details about the vehicle..."
              rows={4}
              helperText="Optional: Add any additional specifications or notes"
            />

            {/* Options */}
            <Checkbox
              label="Make this vehicle listing public"
              checked={formData.isPublic}
              onChange={(e) => setFormData({...formData, isPublic: e.target.checked})}
              helperText="Public listings are visible to all users"
            />
          </Stack>
        </Form>
      </Card.Body>
      <Card.Footer>
        <Button variant="tertiary" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
          loading={isSubmitting}
          disabled={!isFormValid}
        >
          Add Vehicle
        </Button>
      </Card.Footer>
    </Card>
  );
}
```

## Migration Guide

### Updating Existing Components

To migrate existing components to use the design system:

1. **Replace custom buttons:**
   ```tsx
   // Before
   <button className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded">
     Submit
   </button>

   // After
   <Button variant="primary" size="md">
     Submit
   </Button>
   ```

2. **Replace custom form fields:**
   ```tsx
   // Before
   <div className="mb-4">
     <label className="block text-sm font-medium mb-2">Email</label>
     <input
       type="email"
       className="w-full border border-gray-300 rounded px-3 py-2"
       placeholder="Enter email"
     />
   </div>

   // After
   <Input
     label="Email"
     type="email"
     placeholder="Enter email"
   />
   ```

3. **Replace custom layouts:**
   ```tsx
   // Before
   <div className="max-w-7xl mx-auto px-4 py-8">
     <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
       {/* content */}
     </div>
   </div>

   // After
   <Container size="xl" padding="md">
     <Grid cols={{ sm: 1, md: 3 }} gap="lg">
       {/* content */}
     </Grid>
   </Container>
   ```

### Best Practices for Migration

1. **Gradual Migration**: Migrate components one at a time
2. **Test Thoroughly**: Ensure visual consistency after migration
3. **Update Tests**: Update component tests to use new design system components
4. **Documentation**: Update component documentation to reflect design system usage

## Contributing

When adding new components to the design system:

1. Follow DaisyUI conventions and classes
2. Use the established design tokens
3. Include proper TypeScript types
4. Add comprehensive documentation
5. Include accessibility features
6. Test across different themes and screen sizes

## Support

For questions about the design system:

1. Check this documentation first
2. Review the DaisyUI documentation: https://daisyui.com/components/
3. Check existing component implementations
4. Create an issue for bugs or feature requests
