export interface WebhookTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'messaging' | 'collaboration' | 'generic' | 'custom';
  config: {
    method: string;
    contentType: string;
    authType: string;
    authToken?: string;
    authUsername?: string;
    authPassword?: string;
    authHeaderName?: string;
    timeout: number;
    retryAttempts: number;
    retryDelay: number;
    customHeaders?: Record<string, string>;
    payloadTemplate?: string;
  };
  urlPattern?: RegExp;
  urlExample: string;
  urlValidation?: (url: string) => { isValid: boolean; message?: string };
  defaultEvents: string[];
  documentation?: string;
}

// URL validation functions
export const validateDiscordUrl = (url: string): { isValid: boolean; message?: string } => {
  const discordPattern = /^https:\/\/(discord\.com|discordapp\.com)\/api\/webhooks\/\d+\/[\w-]+$/;
  if (!discordPattern.test(url)) {
    return {
      isValid: false,
      message: 'Discord webhook URL should be in format: https://discord.com/api/webhooks/{id}/{token}'
    };
  }
  return { isValid: true };
};

export const validateTeamsUrl = (url: string): { isValid: boolean; message?: string } => {
  const teamsPattern = /^https:\/\/[\w-]+\.webhook\.office\.com\/webhookb2\/[\w-]+@[\w-]+\/IncomingWebhook\/[\w-]+\/[\w-]+$/;
  if (!teamsPattern.test(url)) {
    return {
      isValid: false,
      message: 'Teams webhook URL should be from Office 365 connector configuration'
    };
  }
  return { isValid: true };
};

export const validateSlackUrl = (url: string): { isValid: boolean; message?: string } => {
  const slackPattern = /^https:\/\/hooks\.slack\.com\/services\/[A-Z0-9]+\/[A-Z0-9]+\/[\w]+$/;
  if (!slackPattern.test(url)) {
    return {
      isValid: false,
      message: 'Slack webhook URL should be in format: https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX'
    };
  }
  return { isValid: true };
};

// Discord payload template
const discordPayloadTemplate = `{
  "username": "EV Database",
  "avatar_url": "https://via.placeholder.com/64x64/0099ff/ffffff?text=EV",
  "embeds": [{
    "title": "{{event}}",
    "description": "{{data.message}}",
    "color": 65535,
    "timestamp": "{{timestamp}}",
    "footer": {
      "text": "EV Database",
      "icon_url": "https://via.placeholder.com/32x32/0099ff/ffffff?text=EV"
    },
    "fields": [
      {
        "name": "Event Type",
        "value": "{{event}}",
        "inline": true
      }
    ]
  }]
}`;

// Teams payload template
const teamsPayloadTemplate = `{
  "@type": "MessageCard",
  "@context": "http://schema.org/extensions",
  "themeColor": "0099ff",
  "summary": "EV Database Notification",
  "sections": [{
    "activityTitle": "{{event}}",
    "activitySubtitle": "EV Database",
    "activityImage": "https://via.placeholder.com/64x64/0099ff/ffffff?text=EV",
    "facts": [
      {
        "name": "Event",
        "value": "{{event}}"
      },
      {
        "name": "Timestamp",
        "value": "{{timestamp}}"
      }
    ],
    "markdown": true,
    "text": "{{data.message}}"
  }]
}`;

// Slack payload template
const slackPayloadTemplate = `{
  "username": "EV Database",
  "icon_url": "https://via.placeholder.com/64x64/0099ff/ffffff?text=EV",
  "blocks": [
    {
      "type": "header",
      "text": {
        "type": "plain_text",
        "text": "{{event}}"
      }
    },
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "{{data.message}}"
      }
    },
    {
      "type": "context",
      "elements": [
        {
          "type": "mrkdwn",
          "text": "*Event:* {{event}} | *Time:* {{timestamp}}"
        }
      ]
    }
  ]
}`;

// Generic HTTP payload template
const genericPayloadTemplate = `{
  "event": "{{event}}",
  "timestamp": "{{timestamp}}",
  "data": {{data}},
  "source": "EV Database"
}`;

// Webhook templates
export const WEBHOOK_TEMPLATES: WebhookTemplate[] = [
  {
    id: 'discord',
    name: 'Discord',
    description: 'Send notifications to Discord channels using webhook URLs',
    icon: '🎮',
    category: 'messaging',
    config: {
      method: 'POST',
      contentType: 'application/json',
      authType: 'none',
      timeout: 30,
      retryAttempts: 3,
      retryDelay: 5,
      payloadTemplate: discordPayloadTemplate
    },
    urlExample: 'https://discord.com/api/webhooks/123456789/abcdef...',
    urlValidation: validateDiscordUrl,
    defaultEvents: ['contribution.approved', 'contribution.rejected', 'user.registered'],
    documentation: 'Get a webhook URL from your Discord server settings under Integrations > Webhooks'
  },
  {
    id: 'teams',
    name: 'Microsoft Teams',
    description: 'Send notifications to Teams channels using webhook connectors',
    icon: '💼',
    category: 'collaboration',
    config: {
      method: 'POST',
      contentType: 'application/json',
      authType: 'none',
      timeout: 30,
      retryAttempts: 3,
      retryDelay: 5,
      payloadTemplate: teamsPayloadTemplate
    },
    urlExample: 'https://outlook.office.com/webhook/...',
    urlValidation: validateTeamsUrl,
    defaultEvents: ['contribution.approved', 'contribution.rejected', 'system.announcement'],
    documentation: 'Configure a webhook connector in your Teams channel settings'
  },
  {
    id: 'slack',
    name: 'Slack',
    description: 'Send notifications to Slack channels using webhook URLs',
    icon: '💬',
    category: 'messaging',
    config: {
      method: 'POST',
      contentType: 'application/json',
      authType: 'none',
      timeout: 30,
      retryAttempts: 3,
      retryDelay: 5,
      payloadTemplate: slackPayloadTemplate
    },
    urlExample: 'https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX',
    urlValidation: validateSlackUrl,
    defaultEvents: ['contribution.approved', 'contribution.rejected', 'user.registered'],
    documentation: 'Get a webhook URL from your Slack app or workspace webhook settings'
  },
  {
    id: 'generic',
    name: 'Generic HTTP',
    description: 'Send HTTP POST requests to any endpoint with customizable authentication',
    icon: '🌐',
    category: 'generic',
    config: {
      method: 'POST',
      contentType: 'application/json',
      authType: 'none',
      timeout: 30,
      retryAttempts: 3,
      retryDelay: 5,
      payloadTemplate: genericPayloadTemplate
    },
    urlExample: 'https://api.example.com/webhooks',
    defaultEvents: ['contribution.approved', 'contribution.rejected'],
    documentation: 'Configure any HTTP endpoint to receive webhook notifications'
  },
  {
    id: 'custom',
    name: 'Custom',
    description: 'Start with a blank configuration for advanced customization',
    icon: '⚙️',
    category: 'custom',
    config: {
      method: 'POST',
      contentType: 'application/json',
      authType: 'none',
      timeout: 30,
      retryAttempts: 3,
      retryDelay: 5
    },
    urlExample: 'https://your-endpoint.com/webhook',
    defaultEvents: [],
    documentation: 'Fully customizable webhook configuration for advanced users'
  }
];

// Helper functions
export const getTemplateById = (id: string): WebhookTemplate | undefined => {
  return WEBHOOK_TEMPLATES.find(template => template.id === id);
};

export const getTemplatesByCategory = (category: string): WebhookTemplate[] => {
  return WEBHOOK_TEMPLATES.filter(template => template.category === category);
};

export const validateWebhookUrl = (url: string, templateId?: string): { isValid: boolean; message?: string } => {
  if (!url) {
    return { isValid: false, message: 'URL is required' };
  }

  try {
    new URL(url);
  } catch {
    return { isValid: false, message: 'Invalid URL format' };
  }

  if (templateId) {
    const template = getTemplateById(templateId);
    if (template?.urlValidation) {
      return template.urlValidation(url);
    }
  }

  return { isValid: true };
};
