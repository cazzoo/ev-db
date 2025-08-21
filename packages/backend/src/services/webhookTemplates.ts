// Webhook template definitions for backend
export interface WebhookTemplate {
  id: string;
  name: string;
  testPayload: any;
  payloadTemplate?: string;
}

// Template-specific test payloads
const discordTestPayload = {
  username: "EV Database",
  avatar_url: "https://via.placeholder.com/64x64/0099ff/ffffff?text=EV",
  embeds: [{
    title: "Webhook Test",
    description: "This is a test webhook from EV Database",
    color: 65535,
    timestamp: new Date().toISOString(),
    footer: {
      text: "EV Database",
      icon_url: "https://via.placeholder.com/32x32/0099ff/ffffff?text=EV"
    },
    fields: [
      {
        name: "Event Type",
        value: "webhook.test",
        inline: true
      },
      {
        name: "Status",
        value: "✅ Connection successful",
        inline: true
      }
    ]
  }]
};

const teamsTestPayload = {
  "@type": "MessageCard",
  "@context": "http://schema.org/extensions",
  "themeColor": "0099ff",
  "summary": "EV Database Test Notification",
  "sections": [{
    "activityTitle": "Webhook Test",
    "activitySubtitle": "EV Database",
    "activityImage": "https://via.placeholder.com/64x64/0099ff/ffffff?text=EV",
    "facts": [
      {
        "name": "Event",
        "value": "webhook.test"
      },
      {
        "name": "Status",
        "value": "✅ Connection successful"
      },
      {
        "name": "Timestamp",
        "value": new Date().toISOString()
      }
    ],
    "markdown": true,
    "text": "This is a test webhook from EV Database. Your webhook is configured correctly!"
  }]
};

const slackTestPayload = {
  username: "EV Database",
  icon_url: "https://via.placeholder.com/64x64/0099ff/ffffff?text=EV",
  blocks: [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: "🔗 Webhook Test"
      }
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: "This is a test webhook from EV Database. Your webhook is configured correctly!"
      }
    },
    {
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: `*Event:* webhook.test | *Time:* ${new Date().toISOString()} | *Status:* ✅ Success`
        }
      ]
    }
  ]
};

const genericTestPayload = {
  event: "webhook.test",
  timestamp: new Date().toISOString(),
  data: {
    message: "This is a test webhook from EV Database",
    test_mode: true,
    status: "success"
  },
  source: "EV Database"
};

export const WEBHOOK_TEMPLATES: WebhookTemplate[] = [
  {
    id: 'discord',
    name: 'Discord',
    testPayload: discordTestPayload
  },
  {
    id: 'teams',
    name: 'Microsoft Teams',
    testPayload: teamsTestPayload
  },
  {
    id: 'slack',
    name: 'Slack',
    testPayload: slackTestPayload
  },
  {
    id: 'generic',
    name: 'Generic HTTP',
    testPayload: genericTestPayload
  },
  {
    id: 'custom',
    name: 'Custom',
    testPayload: genericTestPayload
  }
];

export const getTemplateById = (id: string): WebhookTemplate | undefined => {
  return WEBHOOK_TEMPLATES.find(template => template.id === id);
};

export const getTestPayloadForTemplate = (templateId: string): any => {
  const template = getTemplateById(templateId);
  return template ? template.testPayload : genericTestPayload;
};

// Template variable replacement
export const replaceTemplateVariables = (template: string, variables: Record<string, any>): string => {
  let result = template;
  
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{${key}}}`, 'g');
    result = result.replace(regex, typeof value === 'string' ? value : JSON.stringify(value));
  }
  
  return result;
};

// Detect template type from URL
export const detectTemplateFromUrl = (url: string): string => {
  if (url.includes('discord.com/api/webhooks') || url.includes('discordapp.com/api/webhooks')) {
    return 'discord';
  }
  if (url.includes('webhook.office.com')) {
    return 'teams';
  }
  if (url.includes('hooks.slack.com/services')) {
    return 'slack';
  }
  return 'generic';
};
