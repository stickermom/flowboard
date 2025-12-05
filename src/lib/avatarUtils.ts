/**
 * Get avatar URL from user profile or user metadata
 */
export function getAvatarUrl(profile: { avatar_url?: string | null } | null, user: { user_metadata?: any } | null): string | null {
  if (profile?.avatar_url) {
    return profile.avatar_url;
  }
  
  if (user?.user_metadata?.avatar_url) {
    return user.user_metadata.avatar_url;
  }
  
  if (user?.user_metadata?.picture) {
    return user.user_metadata.picture;
  }
  
  return null;
}

/**
 * Get first letter of name for avatar fallback
 */
export function getInitials(name: string | null | undefined, email: string | null | undefined): string {
  if (name) {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.charAt(0).toUpperCase();
  }
  
  if (email) {
    return email.charAt(0).toUpperCase();
  }
  
  return 'U';
}

/**
 * Get background color for avatar based on name/email
 */
export function getAvatarColor(name: string | null | undefined, email: string | null | undefined): string {
  const str = name || email || 'user';
  const colors = [
    'bg-gradient-to-br from-purple-500 to-purple-600',
    'bg-gradient-to-br from-blue-500 to-blue-600',
    'bg-gradient-to-br from-green-500 to-green-600',
    'bg-gradient-to-br from-orange-500 to-orange-600',
    'bg-gradient-to-br from-pink-500 to-pink-600',
    'bg-gradient-to-br from-red-500 to-red-600',
    'bg-gradient-to-br from-indigo-500 to-indigo-600',
    'bg-gradient-to-br from-teal-500 to-teal-600',
  ];
  
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  return colors[Math.abs(hash) % colors.length];
}

