# Webhook Template System

The EV Database webhook system now includes predefined templates for popular services, making it easier to set up webhook notifications for common platforms.

## Overview

The webhook template system provides:
- **Pre-configured templates** for Discord, Microsoft Teams, Slack, and generic HTTP endpoints
- **Automatic form population** with service-specific settings
- **URL validation** specific to each service
- **Template-aware testing** with service-appropriate payloads
- **Customization options** after template selection

## Available Templates

### 🎮 Discord
**Use Case**: Send notifications to Discord channels

**Configuration**:
- **URL Format**: `https://discord.com/api/webhooks/{id}/{token}`
- **Method**: POST
- **Content-Type**: application/json
- **Authentication**: None (token in URL)
- **Payload**: Discord embed format with rich formatting

**Setup Instructions**:
1. Go to your Discord server settings
2. Navigate to Integrations > Webhooks
3. Create a new webhook or copy existing webhook URL
4. Paste the URL into the webhook form

### 💼 Microsoft Teams
**Use Case**: Send notifications to Teams channels

**Configuration**:
- **URL Format**: `https://{tenant}.webhook.office.com/webhookb2/{guid}@{tenant-id}/IncomingWebhook/{webhook-id}/{guid}`
- **Method**: POST
- **Content-Type**: application/json
- **Authentication**: None (token in URL)
- **Payload**: MessageCard format with structured data

**Setup Instructions**:
1. In your Teams channel, click the three dots menu
2. Select "Connectors"
3. Find "Incoming Webhook" connector and configure
4. Copy the webhook URL provided

### 💬 Slack
**Use Case**: Send notifications to Slack channels

**Configuration**:
- **URL Format**: `https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX`
- **Method**: POST
- **Content-Type**: application/json
- **Authentication**: None (token in URL)
- **Payload**: Slack blocks format with rich formatting

**Setup Instructions**:
1. Go to your Slack workspace settings
2. Navigate to Apps > Webhooks
3. Create a new webhook for your desired channel
4. Copy the webhook URL provided

### 🌐 Generic HTTP
**Use Case**: Send notifications to any HTTP endpoint

**Configuration**:
- **URL Format**: Any valid HTTP/HTTPS URL
- **Method**: POST (configurable)
- **Content-Type**: application/json
- **Authentication**: Configurable (Bearer, Basic, API Key)
- **Payload**: Simple JSON format

**Setup Instructions**:
1. Configure your endpoint to receive POST requests
2. Set up authentication if required
3. Use the generic template and customize as needed

### ⚙️ Custom
**Use Case**: Advanced users who need full control

**Configuration**:
- All fields start empty
- Complete customization available
- Advanced payload template editing
- Custom headers support

## Using Templates

### 1. Template Selection
When creating a new webhook:
1. Choose from the available template cards
2. Each template shows an icon, name, and description
3. Click on a template to select it

### 2. Automatic Configuration
After selecting a template:
- Form fields are automatically populated
- URL placeholder shows the expected format
- Authentication is pre-configured
- Default events are selected
- Payload template is set

### 3. Customization
You can modify any pre-filled values:
- Change the webhook name and description
- Modify the URL (with real-time validation)
- Adjust authentication settings
- Select different events
- Edit advanced settings (timeout, retries)
- Customize payload template (advanced users)

### 4. URL Validation
Real-time validation ensures:
- URLs match the expected format for each service
- Invalid URLs show helpful error messages
- Service-specific guidance is provided

### 5. Testing
The test functionality:
- Uses service-specific test payloads
- Shows template-appropriate messages
- Validates the complete configuration
- Provides detailed success/error feedback

## Event Types

The following events can trigger webhook notifications:

- **contribution.approved** - When a vehicle contribution is approved
- **contribution.rejected** - When a vehicle contribution is rejected
- **contribution.submitted** - When a new contribution is submitted
- **user.registered** - When a new user registers
- **system.announcement** - System-wide announcements
- **system.maintenance** - Maintenance notifications

## Payload Variables

For custom payload templates, you can use these variables:

- `{{event}}` - The event type (e.g., "contribution.approved")
- `{{timestamp}}` - ISO timestamp of when the event occurred
- `{{data}}` - Event-specific data object

Example custom payload:
```json
{
  "event": "{{event}}",
  "timestamp": "{{timestamp}}",
  "message": "New event occurred",
  "data": {{data}}
}
```

## Advanced Features

### Custom Headers
Add custom HTTP headers for your webhook requests:
```json
{
  "X-Custom-Header": "value",
  "Authorization": "Bearer token"
}
```

### Payload Templates
Create custom payload structures using template variables. The system supports:
- Variable substitution with `{{variable}}` syntax
- JSON structure preservation
- Service-specific default templates

### Authentication Options
- **None**: No authentication (common for webhook URLs with tokens)
- **Bearer Token**: Authorization header with bearer token
- **Basic Auth**: Username and password authentication
- **API Key**: Custom header with API key

## Troubleshooting

### Common Issues

**URL Validation Errors**:
- Ensure the URL matches the expected format for your service
- Check that the webhook URL is active and accessible
- Verify any tokens or IDs in the URL are correct

**Test Failures**:
- Confirm the webhook endpoint is reachable
- Check authentication credentials
- Verify the service accepts the payload format
- Review any firewall or network restrictions

**Missing Notifications**:
- Ensure the webhook is enabled
- Check that the correct events are selected
- Verify the webhook URL hasn't expired
- Review the webhook's success/failure statistics

### Getting Help

If you encounter issues:
1. Use the "Test Connection" button to verify configuration
2. Check the webhook statistics for error patterns
3. Review the service-specific documentation
4. Ensure your webhook endpoint can handle the expected payload format

## Migration from Legacy Webhooks

Existing webhooks will continue to work unchanged. To use templates:
1. Create a new webhook using a template
2. Test the new configuration
3. Disable the old webhook
4. Delete the old webhook when satisfied

The template system is fully backward compatible with existing webhook configurations.
