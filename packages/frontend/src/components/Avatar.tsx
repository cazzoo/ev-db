import { useState, useEffect, useRef } from 'react';
import { generatePixelAvatarDataUrl } from '../utils/pixelAvatar';
import { getAvatarUrl } from '../services/api';

interface AvatarProps {
  user: {
    email: string;
    avatarUrl?: string | null;
  };
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number;
  className?: string;
  placeholder?: boolean;
}

const Avatar = ({ user, size = 'md', className = '', placeholder = false }: AvatarProps) => {
  const [usePixelAvatar, setUsePixelAvatar] = useState(!user.avatarUrl);
  const [pixelAvatarSrc, setPixelAvatarSrc] = useState<string>('');
  const imgRef = useRef<HTMLImageElement>(null);
  const previousAvatarUrl = useRef<string | null>(null);

  // Generate pixel avatar when needed
  useEffect(() => {
    const numericSize = typeof size === 'number' ? size : 64; // Default size for pixel generation
    const pixelAvatar = generatePixelAvatarDataUrl(user.email, numericSize);
    setPixelAvatarSrc(pixelAvatar);
  }, [user.email, size]);

  // Handle avatar URL changes
  useEffect(() => {
    // Only reset error state if the avatar URL actually changed
    if (user.avatarUrl !== previousAvatarUrl.current) {
      previousAvatarUrl.current = user.avatarUrl || null;
      setUsePixelAvatar(!user.avatarUrl);
    }
  }, [user.avatarUrl]);

  const handleImageError = () => {
    setUsePixelAvatar(true);
  };

  const handleImageLoad = () => {
    // Image loaded successfully, make sure we're not using pixel avatar
    if (user.avatarUrl) {
      setUsePixelAvatar(false);
    }
  };

  // Get DaisyUI size class
  const getSizeClass = () => {
    if (typeof size === 'number') {
      return `w-${Math.min(size / 4, 24)} h-${Math.min(size / 4, 24)}`;
    }
    switch (size) {
      case 'xs': return 'w-6 h-6';
      case 'sm': return 'w-8 h-8';
      case 'md': return 'w-12 h-12';
      case 'lg': return 'w-16 h-16';
      case 'xl': return 'w-20 h-20';
      default: return 'w-12 h-12';
    }
  };

  const avatarUrl = user.avatarUrl ? getAvatarUrl(user.avatarUrl) : null;

  return (
    <div className={`avatar ${placeholder ? 'placeholder' : ''} ${className}`}>
      <div className={`${getSizeClass()} rounded-full ${placeholder ? 'bg-neutral text-neutral-content' : ''}`}>
        {usePixelAvatar || !avatarUrl ? (
          // Show pixel avatar
          <img
            src={pixelAvatarSrc}
            alt={`${user.email}'s avatar`}
            className="rounded-full"
          />
        ) : (
          // Show uploaded avatar with fallback
          <img
            ref={imgRef}
            src={avatarUrl}
            alt={`${user.email}'s avatar`}
            onError={handleImageError}
            onLoad={handleImageLoad}
            className="rounded-full"
          />
        )}
      </div>
    </div>
  );
};

export default Avatar;
