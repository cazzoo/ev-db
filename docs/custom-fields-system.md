# Custom Fields System Documentation

## Overview

The Custom Fields System allows users to add additional metadata to vehicles beyond the standard fields (make, model, year, etc.). This system provides flexibility for capturing specialized information while maintaining data consistency and user experience.

## Architecture

### Database Schema

#### `custom_fields` Table
- `id` (INTEGER, PRIMARY KEY): Unique identifier
- `name` (TEXT, NOT NULL): Display name (e.g., "Warranty Period")
- `key` (TEXT, UNIQUE, NOT NULL): Unique slug (e.g., "warranty_period")
- `field_type` (TEXT, NOT NULL): Field type (TEXT, NUMBER, DATE, DROPDOWN, BOOLEAN, URL)
- `validation_rules` (TEXT): JSON string with validation rules
- `is_visible_on_card` (BOOLEAN, DEFAULT FALSE): Show on vehicle cards
- `is_visible_on_details` (BOOLEAN, DEFAULT TRUE): Show on vehicle details page
- `display_order` (INTEGER, DEFAULT 0): Ordering for display
- `usage_count` (INTEGER, DEFAULT 0): Track field usage frequency
- `created_at` (TIMESTAMP): Creation timestamp
- `updated_at` (TIMESTAMP): Last update timestamp
- `created_by` (INTEGER): User who created the field

#### `vehicle_custom_field_values` Table
- `id` (INTEGER, PRIMARY KEY): Unique identifier
- `vehicle_id` (INTEGER, NOT NULL): Reference to vehicles table
- `custom_field_id` (INTEGER, NOT NULL): Reference to custom_fields table
- `value` (TEXT): Field value (stored as text, converted based on field_type)
- `created_at` (TIMESTAMP): Creation timestamp
- `updated_at` (TIMESTAMP): Last update timestamp

### API Endpoints

#### Public Endpoints (API Key Required)
- `GET /custom-fields/suggestions?limit=10` - Get popular custom fields
- `GET /custom-fields/search?q=query&limit=20` - Search custom fields
- `GET /custom-fields/` - Get all custom fields (basic info)

#### Admin Endpoints (Admin Auth Required)
- `GET /custom-fields/admin` - Get all custom fields with full details
- `GET /custom-fields/admin/:id` - Get single custom field
- `POST /custom-fields/admin` - Create new custom field
- `PUT /custom-fields/admin/:id` - Update custom field
- `DELETE /custom-fields/admin/:id` - Delete custom field

## Features

### 1. Auto-Creation During Contribution
When users submit contributions with custom fields that don't exist:
- System automatically creates new custom field definitions
- Increments usage count for existing fields
- Maintains data consistency

### 2. Field Types Support
- **TEXT**: Free text input
- **NUMBER**: Numeric input with min/max validation
- **DATE**: Date picker
- **DROPDOWN**: Predefined options
- **BOOLEAN**: Checkbox/toggle
- **URL**: URL input with validation

### 3. Visibility Controls
- **Card Visibility**: Show field on vehicle cards (limited space)
- **Details Visibility**: Show field on vehicle details page
- **Display Order**: Control field ordering

### 4. Form Integration
- Integrated into Step 3 (Details) of the multi-step contribution form
- Autocomplete suggestions based on usage frequency
- Popular fields displayed as quick-add buttons
- Real-time validation based on field rules

### 5. Display Integration
- **Vehicle Cards**: Show up to 3 most important custom fields
- **Vehicle Details**: Show all custom fields in organized sections
- **Contribution Review**: Full diff support with inline editing
- **Admin Interface**: Comprehensive field management

## User Workflows

### Contributing with Custom Fields
1. User navigates to contribution form
2. In Step 3 (Details), user sees popular custom fields as buttons
3. User can click to add popular fields or search for existing ones
4. User can create new fields by typing field names
5. System auto-creates missing fields during submission
6. Fields are validated based on their type and rules

### Admin Field Management
1. Admin navigates to `/admin/custom-fields`
2. Views table of all custom fields with usage statistics
3. Can create, edit, or delete fields
4. Can configure visibility and validation rules
5. Can merge duplicate fields (future feature)

### Reviewing Contributions
1. Moderator/Admin views contribution in review modal
2. Custom fields appear in dedicated section
3. Can see diffs between original and proposed values
4. Can edit custom field values inline
5. Changes are tracked and validated

## Technical Implementation

### Backend Services
- `customFieldsService.ts`: Core business logic
- `customFields.ts`: API route handlers
- Integration with contributions and vehicles systems

### Frontend Components
- `CustomFieldInput.tsx`: Handles different field types
- `CustomFieldSelector.tsx`: Autocomplete field selection
- `CustomFieldsList.tsx`: Manages list of active fields
- Integration with form, display, and admin components

### Data Flow
1. **Submission**: Form → Auto-create fields → Store in contribution JSON
2. **Approval**: Contribution JSON → Create vehicle_custom_field_values records
3. **Display**: Join custom fields with vehicles → Format for UI
4. **Admin**: Direct CRUD operations on custom_fields table

## Configuration

### Field Validation Rules
Stored as JSON in `validation_rules` column:

```json
{
  "required": true,
  "min": 0,
  "max": 100,
  "options": ["Option 1", "Option 2"],
  "description": "Helper text for users"
}
```

### Performance Considerations
- Indexes on frequently queried columns
- Limit custom fields per vehicle (recommended: 20 max)
- Cache popular field suggestions
- Efficient bulk loading for vehicle lists

## Security

### Access Control
- Public endpoints require API key authentication
- Admin endpoints require admin role authentication
- Field creation/modification logged with user attribution

### Data Validation
- Server-side validation for all field types
- XSS prevention for text fields
- Type coercion and bounds checking for numbers
- URL validation for URL fields

## Future Enhancements

### Planned Features
1. **Field Merging**: Combine duplicate fields with data migration
2. **Advanced Validation**: Regex patterns, custom validators
3. **Field Categories**: Group related fields together
4. **Import/Export**: Bulk field management
5. **Field Templates**: Predefined field sets for vehicle types
6. **Analytics**: Field usage analytics and insights

### Scalability Considerations
- Implement field value caching for high-traffic scenarios
- Consider NoSQL storage for complex field structures
- Add field versioning for schema evolution
- Implement field deprecation workflow

## Troubleshooting

### Common Issues
1. **Field not appearing**: Check visibility settings and field type
2. **Validation errors**: Verify validation rules format
3. **Performance issues**: Check indexes and query optimization
4. **Data inconsistency**: Run field usage count recalculation

### Monitoring
- Track field creation/usage patterns
- Monitor API response times
- Alert on validation failures
- Log field management operations

## API Examples

### Create Custom Field
```javascript
POST /custom-fields/admin
{
  "name": "Warranty Period",
  "fieldType": "TEXT",
  "isVisibleOnCard": true,
  "isVisibleOnDetails": true,
  "displayOrder": 10
}
```

### Search Fields
```javascript
GET /custom-fields/search?q=warranty&limit=5
{
  "results": [
    {
      "id": 1,
      "name": "Warranty Period",
      "key": "warranty_period",
      "fieldType": "TEXT",
      "usageCount": 45
    }
  ]
}
```

This system provides a robust foundation for extending vehicle data while maintaining performance and user experience.
