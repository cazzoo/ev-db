import { db } from '../db';
import { rssFeedItems } from '../db/schema';
import { desc, eq } from 'drizzle-orm';
import { getSetting } from './settingsService';

// RSS feed service
export class RSSFeedService {
  
  // Generate RSS 2.0 feed
  static async generateRSSFeed(): Promise<string> {
    const enabled = await getSetting('RSS', 'rss_enabled');
    if (enabled?.value !== 'true') {
      throw new Error('RSS feed is disabled');
    }

    const title = await getSetting('RSS', 'rss_title');
    const description = await getSetting('RSS', 'rss_description');
    const maxItems = await getSetting('RSS', 'rss_max_items');
    
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const feedUrl = `${baseUrl}/api/rss`;
    
    const limit = parseInt(maxItems?.value || '50');
    
    // Get published RSS feed items
    const items = await db.select()
      .from(rssFeedItems)
      .where(eq(rssFeedItems.isPublished, true))
      .orderBy(desc(rssFeedItems.pubDate))
      .limit(limit);

    const rssItems = items.map(item => `
    <item>
      <title><![CDATA[${item.title}]]></title>
      <description><![CDATA[${item.description}]]></description>
      <link>${item.link}</link>
      <guid isPermaLink="false">${item.guid}</guid>
      <pubDate>${new Date(item.pubDate).toUTCString()}</pubDate>
      ${item.author ? `<author>${item.author}</author>` : ''}
      ${item.category ? `<category>${item.category}</category>` : ''}
    </item>`).join('');

    const lastBuildDate = items.length > 0 
      ? new Date(items[0].pubDate).toUTCString()
      : new Date().toUTCString();

    return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title><![CDATA[${title?.value || 'EV Database Updates'}]]></title>
    <description><![CDATA[${description?.value || 'Latest updates from the EV Database'}]]></description>
    <link>${baseUrl}</link>
    <atom:link href="${feedUrl}" rel="self" type="application/rss+xml" />
    <language>en-us</language>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
    <generator>EV Database RSS Generator</generator>
    <webMaster>admin@evdb.com (EV Database Team)</webMaster>
    <managingEditor>admin@evdb.com (EV Database Team)</managingEditor>
    <ttl>60</ttl>
    <image>
      <url>${baseUrl}/icon-192x192.png</url>
      <title><![CDATA[${title?.value || 'EV Database Updates'}]]></title>
      <link>${baseUrl}</link>
      <width>192</width>
      <height>192</height>
    </image>${rssItems}
  </channel>
</rss>`;
  }

  // Generate Atom feed
  static async generateAtomFeed(): Promise<string> {
    const enabled = await getSetting('RSS', 'rss_enabled');
    if (enabled?.value !== 'true') {
      throw new Error('RSS feed is disabled');
    }

    const title = await getSetting('RSS', 'rss_title');
    const description = await getSetting('RSS', 'rss_description');
    const maxItems = await getSetting('RSS', 'rss_max_items');
    
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const feedUrl = `${baseUrl}/api/atom`;
    
    const limit = parseInt(maxItems?.value || '50');
    
    // Get published RSS feed items
    const items = await db.select()
      .from(rssFeedItems)
      .where(eq(rssFeedItems.isPublished, true))
      .orderBy(desc(rssFeedItems.pubDate))
      .limit(limit);

    const atomEntries = items.map(item => `
  <entry>
    <title type="text">${this.escapeXml(item.title)}</title>
    <id>${item.guid}</id>
    <link href="${item.link}" />
    <updated>${new Date(item.pubDate).toISOString()}</updated>
    <summary type="text">${this.escapeXml(item.description)}</summary>
    ${item.author ? `<author><name>${this.escapeXml(item.author)}</name></author>` : ''}
    ${item.category ? `<category term="${this.escapeXml(item.category)}" />` : ''}
  </entry>`).join('');

    const updated = items.length > 0 
      ? new Date(items[0].pubDate).toISOString()
      : new Date().toISOString();

    return `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title type="text">${this.escapeXml(title?.value || 'EV Database Updates')}</title>
  <subtitle type="text">${this.escapeXml(description?.value || 'Latest updates from the EV Database')}</subtitle>
  <id>${feedUrl}</id>
  <link href="${baseUrl}" />
  <link href="${feedUrl}" rel="self" type="application/atom+xml" />
  <updated>${updated}</updated>
  <generator uri="${baseUrl}" version="1.0">EV Database Atom Generator</generator>
  <rights>© ${new Date().getFullYear()} EV Database. All rights reserved.</rights>
  <icon>${baseUrl}/icon-192x192.png</icon>
  <logo>${baseUrl}/icon-512x512.png</logo>${atomEntries}
</feed>`;
  }

  // Get feed statistics
  static async getFeedStats(): Promise<{
    totalItems: number;
    publishedItems: number;
    lastUpdated: Date | null;
    eventTypeCounts: Record<string, number>;
  }> {
    const allItems = await db.select().from(rssFeedItems);
    const publishedItems = allItems.filter(item => item.isPublished);
    
    const eventTypeCounts: Record<string, number> = {};
    publishedItems.forEach(item => {
      eventTypeCounts[item.eventType] = (eventTypeCounts[item.eventType] || 0) + 1;
    });

    const lastUpdated = publishedItems.length > 0 
      ? new Date(Math.max(...publishedItems.map(item => new Date(item.pubDate).getTime())))
      : null;

    return {
      totalItems: allItems.length,
      publishedItems: publishedItems.length,
      lastUpdated,
      eventTypeCounts,
    };
  }

  // Clean up old feed items
  static async cleanupOldItems(keepDays = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - keepDays);

    const result = await db.delete(rssFeedItems)
      .where(eq(rssFeedItems.pubDate, cutoffDate))
      .returning();

    console.log(`Cleaned up ${result.length} old RSS feed items older than ${keepDays} days`);
    return result.length;
  }

  // Publish/unpublish feed item
  static async toggleItemPublication(itemId: number, isPublished: boolean): Promise<void> {
    await db.update(rssFeedItems)
      .set({ isPublished })
      .where(eq(rssFeedItems.id, itemId));
  }

  // Get feed items with pagination
  static async getFeedItems(
    page = 1, 
    limit = 20, 
    eventType?: string, 
    publishedOnly = true
  ): Promise<{
    items: any[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const offset = (page - 1) * limit;
    
    let query = db.select().from(rssFeedItems);
    
    if (publishedOnly) {
      query = query.where(eq(rssFeedItems.isPublished, true));
    }
    
    if (eventType) {
      query = query.where(eq(rssFeedItems.eventType, eventType));
    }
    
    const items = await query
      .orderBy(desc(rssFeedItems.pubDate))
      .limit(limit)
      .offset(offset);

    // Get total count
    let countQuery = db.select().from(rssFeedItems);
    if (publishedOnly) {
      countQuery = countQuery.where(eq(rssFeedItems.isPublished, true));
    }
    if (eventType) {
      countQuery = countQuery.where(eq(rssFeedItems.eventType, eventType));
    }
    
    const totalItems = await countQuery;
    const total = totalItems.length;
    const totalPages = Math.ceil(total / limit);

    return {
      items,
      total,
      page,
      totalPages,
    };
  }

  // Escape XML special characters
  private static escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}
