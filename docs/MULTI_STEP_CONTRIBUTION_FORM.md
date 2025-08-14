# Multi-Step Contribution Form

## Overview

The Multi-Step Contribution Form is a comprehensive, user-friendly interface for submitting vehicle data to the EV database. It guides users through a structured process using DaisyUI's Steps component, ensuring data quality and improving user experience.

## Features

### 🎯 Multi-Step Navigation
- **4-step process**: Basic Info → Performance → Details → Review
- **Visual progress indicator** using DaisyUI Steps component
- **Bidirectional navigation** - users can go back to edit previous steps
- **Step validation** - prevents progression with invalid data
- **Clickable completed steps** for easy navigation

### ✅ Form Validation
- **Real-time validation** at each step
- **Required field validation** for essential data
- **Data type validation** (numbers, ranges, etc.)
- **Business logic validation** (year ranges, positive values)
- **Clear error messaging** with specific guidance

### 🔍 Duplicate Detection
- **Automatic duplicate checking** after user stops typing
- **Debounced API calls** (1-second delay) to prevent excessive requests
- **Visual warnings** for potential duplicates
- **Suggestion system** for similar existing vehicles
- **Variant creation support** for legitimate duplicates

### 💾 State Management
- **Persistent form data** across step navigation
- **No data loss** when moving between steps
- **Draft state preservation** during navigation
- **Form reset** only on explicit cancel or successful submission

### 🎨 UI/UX Design
- **Consistent with application design system**
- **DaisyUI 5 components** throughout
- **Responsive design** for all screen sizes
- **Loading states** and progress indicators
- **Accessibility features** built-in

## Step Breakdown

### Step 1: Basic Information
**Purpose**: Collect essential vehicle identification data

**Fields**:
- **Make** (required) - Vehicle manufacturer with autocomplete
- **Model** (required) - Vehicle model with dynamic suggestions
- **Year** (required) - Manufacturing year (1990 - current year + 2)

**Validation**:
- All fields are required
- Year must be within valid range
- Make and model must be non-empty strings

### Step 2: Performance Specifications
**Purpose**: Collect technical performance data

**Fields**:
- **Battery Capacity** (optional) - In kWh, with decimal support
- **Range** (optional) - WLTP/EPA range in kilometers
- **Charging Speed** (optional) - Maximum DC fast charging in kW

**Validation**:
- All values must be non-negative if provided
- Decimal values supported for precision

### Step 3: Additional Details
**Purpose**: Collect supplementary vehicle information

**Fields**:
- **0-100 km/h Acceleration** (optional) - In seconds
- **Top Speed** (optional) - Maximum speed in km/h
- **Starting Price** (optional) - Base model price in USD
- **Description** (optional) - Free-text additional details

**Validation**:
- All numeric values must be non-negative if provided
- Description has no length restrictions

### Step 4: Review & Submit
**Purpose**: Final review and confirmation

**Features**:
- **Complete data summary** in organized cards
- **Duplicate warnings** if detected
- **Edit capability** - click any previous step to modify
- **Final validation** before submission
- **Clear submission button** with loading state

## Technical Implementation

### Component Structure
```
MultiStepContributionForm/
├── State Management
│   ├── Form data state
│   ├── Current step tracking
│   ├── Validation state
│   └── Duplicate check state
├── Step Components
│   ├── Basic Info form
│   ├── Performance form
│   ├── Details form
│   └── Review summary
├── Navigation
│   ├── Steps indicator
│   ├── Previous/Next buttons
│   └── Step validation
└── Integration
    ├── API calls
    ├── Error handling
    └── Success handling
```

### Key Technologies
- **React 18** with functional components and hooks
- **TypeScript** for type safety
- **DaisyUI 5** for UI components
- **Design System** integration for consistency
- **Custom hooks** for reusable logic

### API Integration
- **Vehicle suggestions** for autocomplete functionality
- **Duplicate checking** with debounced requests
- **Contribution submission** with proper error handling
- **Loading states** for all async operations

## Usage Examples

### Basic Usage
```tsx
import MultiStepContributionForm from '../components/MultiStepContributionForm';

<MultiStepContributionForm
  onSubmit={handleSubmit}
  onCancel={handleCancel}
/>
```

### With Initial Data (Edit Mode)
```tsx
<MultiStepContributionForm
  onSubmit={handleSubmit}
  onCancel={handleCancel}
  initialData={{
    make: 'Tesla',
    model: 'Model 3',
    year: 2023
  }}
  initialChangeType="UPDATE"
  initialTargetVehicleId={123}
/>
```

### Variant Creation Mode
```tsx
<MultiStepContributionForm
  onSubmit={handleSubmit}
  onCancel={handleCancel}
  isVariantMode={true}
  initialData={existingVehicleData}
/>
```

## Integration Points

### Routes
- **Main form**: `/contribute/vehicle`
- **Info page**: `/contribute` (links to main form)
- **Dashboard**: Links to form for authenticated users

### Navigation Flow
1. User visits `/contribute` (info page)
2. Clicks "Submit a Contribution" → `/contribute/vehicle`
3. Completes multi-step form
4. Successful submission → redirects to `/dashboard`
5. Cancel → returns to `/contribute`

### Authentication
- **Login required** - redirects to `/login` if not authenticated
- **User context** integration for seamless experience
- **Credit system** integration (+10 credits per approved contribution)

## Benefits

### For Users
- **Guided experience** reduces confusion and errors
- **No data loss** when navigating between steps
- **Clear validation** helps users provide correct data
- **Duplicate prevention** saves time and effort
- **Mobile-friendly** interface works on all devices

### For Administrators
- **Higher data quality** due to validation and guidance
- **Fewer duplicates** due to automatic checking
- **Structured data** makes review process easier
- **Consistent format** across all submissions
- **Reduced support requests** due to clear interface

### For the Platform
- **Better user engagement** with improved UX
- **Higher completion rates** due to step-by-step approach
- **Cleaner database** with fewer errors and duplicates
- **Scalable design** that can accommodate new fields
- **Maintainable code** following established patterns

## Future Enhancements

### Planned Features
- **Auto-save drafts** for incomplete submissions
- **Image upload** for vehicle photos
- **Bulk import** for multiple vehicles
- **Advanced validation** with external data sources
- **Collaborative editing** for community contributions

### Technical Improvements
- **Progressive enhancement** for better performance
- **Offline support** for draft saving
- **Advanced caching** for suggestions and validation
- **Real-time collaboration** features
- **Enhanced accessibility** features
