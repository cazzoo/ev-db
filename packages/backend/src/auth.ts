import { Hono } from 'hono';
import { db } from './db';
import { users } from './db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { sign } from 'hono/jwt';
import { jwtAuth } from './middleware/auth';
import * as fs from 'fs';
import * as path from 'path';

const auth = new Hono();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'; // Use a strong secret in production

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(process.cwd(), 'uploads', 'avatars');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

auth.post('/register', async (c) => {
  const { email, password } = await c.req.json();

  if (!email || !password) {
    return c.json({ error: 'Email and password are required' }, 400);
  }

  const existingUser = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (existingUser.length > 0) {
    return c.json({ error: 'User with this email already exists' }, 409);
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    const newUser = await db.insert(users).values({
      email,
      password: hashedPassword,
      role: 'MEMBER', // Default role
      appCurrencyBalance: 0,
      avatarUrl: null,
    }).returning();

    // Send welcome notification asynchronously
    try {
      const { AutomatedNotifications } = await import('./services/automatedNotifications');
      // Send welcome notification after a short delay
      setTimeout(() => {
        AutomatedNotifications.sendWelcomeNotification(newUser[0].id);
      }, 5000); // 5 second delay
    } catch (notificationError) {
      console.error('Failed to send welcome notification:', notificationError);
      // Don't fail registration if notification fails
    }

    return c.json({ message: 'User registered successfully', user: newUser[0] }, 201);
  } catch (error) {
    console.error('Error registering user:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

auth.post('/login', async (c) => {
  const { email, password } = await c.req.json();

  if (!email || !password) {
    return c.json({ error: 'Email and password are required' }, 400);
  }

  const user = await db.select().from(users).where(eq(users.email, email)).limit(1);

  if (user.length === 0) {
    return c.json({ error: 'Invalid credentials' }, 401);
  }

  const isPasswordValid = await bcrypt.compare(password, user[0].password);

  if (!isPasswordValid) {
    return c.json({ error: 'Invalid credentials' }, 401);
  }

  const payload = {
    userId: user[0].id,
    email: user[0].email,
    role: user[0].role,
    appCurrencyBalance: user[0].appCurrencyBalance,
    avatarUrl: user[0].avatarUrl,
  };

  const token = await sign(payload, JWT_SECRET);

  return c.json({ message: 'Login successful', token }, 200);
});

// Get current user data (authenticated)
auth.use('/me', jwtAuth);
auth.get('/me', async (c) => {
  try {
    const payload = c.get('jwtPayload');
    const userId = payload.userId;

    const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (user.length === 0) {
      return c.json({ error: 'User not found' }, 404);
    }

    const userData = {
      id: user[0].id,
      email: user[0].email,
      role: user[0].role,
      appCurrencyBalance: user[0].appCurrencyBalance,
      avatarUrl: user[0].avatarUrl,
      theme: user[0].theme,
    };

    return c.json(userData, 200);
  } catch (error) {
    console.error('Error fetching user data:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Serve avatar files (public)
auth.get('/avatar/:filename', async (c) => {
  try {
    console.log('Avatar serving request for:', c.req.param('filename'));
    const filename = c.req.param('filename');
    const filepath = path.join(uploadsDir, filename);
    console.log('Looking for file at:', filepath);

    if (!fs.existsSync(filepath)) {
      console.log('File not found:', filepath);
      return c.json({ error: 'Avatar not found' }, 404);
    }
    console.log('File found, serving...');

    const file = fs.readFileSync(filepath);
    const ext = path.extname(filename).toLowerCase();

    let contentType = 'image/jpeg';
    switch (ext) {
      case '.png': contentType = 'image/png'; break;
      case '.gif': contentType = 'image/gif'; break;
      case '.webp': contentType = 'image/webp'; break;
      case '.svg': contentType = 'image/svg+xml'; break;
    }

    return new Response(file, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000', // Cache for 1 year
      },
    });

  } catch (error) {
    console.error('Error serving avatar:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Avatar upload endpoint (authenticated)
auth.use('/avatar/upload', jwtAuth);
auth.use('/avatar', jwtAuth); // Only for DELETE

auth.post('/avatar/upload', async (c) => {
    try {
      console.log('Avatar upload request received');
      const payload = c.get('jwtPayload');
      const userId = payload.userId;
      console.log('User ID:', userId);

      const body = await c.req.parseBody();
      const file = body['avatar'] as File;
      console.log('File received:', file ? file.name : 'No file');

      if (!file) {
        return c.json({ error: 'No file provided' }, 400);
      }

      // Validate file size (2MB limit)
      if (file.size > 2 * 1024 * 1024) {
        return c.json({ error: 'File too large. Maximum size is 2MB.' }, 413);
      }

      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
      if (!allowedTypes.includes(file.type)) {
        return c.json({ error: 'Invalid file type. Only JPEG, PNG, GIF, WebP, and SVG are allowed.' }, 400);
      }

      // Generate unique filename
      const fileExtension = file.name.split('.').pop() || 'jpg';
      const filename = `${userId}_${Date.now()}.${fileExtension}`;
      const filepath = path.join(uploadsDir, filename);
      console.log('Saving file to:', filepath);

      // Save file
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      fs.writeFileSync(filepath, buffer);
      console.log('File saved successfully');

      // Update user's avatar URL in database
      const avatarUrl = `auth/avatar/${filename}`;
      console.log('Updating database with avatarUrl:', avatarUrl);
      await db.update(users)
        .set({ avatarUrl })
        .where(eq(users.id, userId));
      console.log('Database updated successfully');

      return c.json({
        message: 'Avatar uploaded successfully',
        avatarUrl
      }, 200);

    } catch (error) {
      console.error('Error uploading avatar:', error);
      return c.json({ error: 'Internal server error' }, 500);
    }
  });



// Delete avatar endpoint
auth.delete('/avatar', jwtAuth, async (c) => {
  try {
    const payload = c.get('jwtPayload');
    const userId = payload.userId;

    // Get current avatar URL
    const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (user.length === 0) {
      return c.json({ error: 'User not found' }, 404);
    }

    const currentAvatarUrl = user[0].avatarUrl;
    if (currentAvatarUrl) {
      // Extract filename from URL and delete file
      const filename = currentAvatarUrl.split('/').pop();
      if (filename) {
        const filepath = path.join(uploadsDir, filename);
        if (fs.existsSync(filepath)) {
          fs.unlinkSync(filepath);
        }
      }
    }

    // Remove avatar URL from database
    await db.update(users)
      .set({ avatarUrl: null })
      .where(eq(users.id, userId));

    return c.json({ message: 'Avatar deleted successfully' }, 200);

  } catch (error) {
    console.error('Error deleting avatar:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Update user preferences (authenticated)
auth.use('/preferences', jwtAuth);
auth.put('/preferences', async (c) => {
  try {
    const payload = c.get('jwtPayload');
    const userId = payload.userId;
    const { theme } = await c.req.json();

    // Validate theme
    const validThemes = ['light', 'dark', 'cupcake', 'bumblebee', 'emerald', 'corporate', 'synthwave', 'retro', 'cyberpunk', 'valentine', 'halloween', 'garden', 'forest', 'aqua', 'lofi', 'pastel', 'fantasy', 'wireframe', 'black', 'luxury', 'dracula', 'cmyk', 'autumn', 'business', 'acid', 'lemonade', 'night', 'coffee', 'winter', 'dim', 'nord', 'sunset', 'caramellatte', 'abyss', 'silk'];

    if (theme && !validThemes.includes(theme)) {
      return c.json({ error: 'Invalid theme' }, 400);
    }

    const updateData: any = {};
    if (theme) updateData.theme = theme;

    const updatedUser = await db.update(users)
      .set(updateData)
      .where(eq(users.id, userId))
      .returning();

    if (updatedUser.length === 0) {
      return c.json({ error: 'User not found' }, 404);
    }

    return c.json({
      message: 'Preferences updated successfully',
      theme: updatedUser[0].theme
    });
  } catch (error) {
    console.error('Error updating user preferences:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

export default auth;
