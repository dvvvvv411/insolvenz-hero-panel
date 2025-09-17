import { supabase } from "@/integrations/supabase/client";

// Database functions for status colors
export async function fetchStatusColors(): Promise<Record<string, string>> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return {};

  const { data, error } = await supabase
    .from('user_status_colors')
    .select('status, color')
    .eq('user_id', user.id);

  if (error) {
    console.error('Error fetching status colors:', error);
    return {};
  }

  const colors: Record<string, string> = {};
  data?.forEach(({ status, color }) => {
    colors[status] = color;
  });

  return colors;
}

export async function updateStatusColor(status: string, color: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase
    .from('user_status_colors')
    .upsert({
      user_id: user.id,
      status,
      color,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'user_id,status'
    });

  if (error) {
    console.error('Error updating status color:', error);
    return false;
  }

  return true;
}

export async function deleteStatusColor(status: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase
    .from('user_status_colors')
    .delete()
    .eq('user_id', user.id)
    .eq('status', status);

  if (error) {
    console.error('Error deleting status color:', error);
    return false;
  }

  return true;
}

// Migration function to move localStorage colors to database
export async function migrateLocalStorageColors(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  // Check if user already has colors in database
  const { data: existingColors } = await supabase
    .from('user_status_colors')
    .select('id')
    .eq('user_id', user.id)
    .limit(1);

  if (existingColors && existingColors.length > 0) {
    // User already has colors in database, skip migration
    return;
  }

  // Get colors from localStorage
  const localStorageColors = localStorage.getItem('statusColors');
  if (!localStorageColors) return;

  try {
    const colorsObject: Record<string, string> = JSON.parse(localStorageColors);
    
    // Migrate each color to database
    const colorEntries = Object.entries(colorsObject).map(([status, color]) => ({
      user_id: user.id,
      status,
      color
    }));

    if (colorEntries.length > 0) {
      const { error } = await supabase
        .from('user_status_colors')
        .insert(colorEntries);

      if (error) {
        console.error('Error migrating colors to database:', error);
      } else {
        // Migration successful, remove from localStorage
        localStorage.removeItem('statusColors');
        console.log('Successfully migrated status colors to database');
      }
    }
  } catch (error) {
    console.error('Error parsing localStorage colors:', error);
  }
}

// Legacy functions for compatibility - now use database
export function getStatusColors(): Record<string, string> {
  console.warn('getStatusColors() is deprecated, use fetchStatusColors() instead');
  return {};
}

export function setStatusColor(status: string, color: string): void {
  console.warn('setStatusColor() is deprecated, use updateStatusColor() instead');
  updateStatusColor(status, color);
}

export function saveStatusColors(colors: Record<string, string>): void {
  console.warn('saveStatusColors() is deprecated, use updateStatusColor() for individual colors');
  Object.entries(colors).forEach(([status, color]) => {
    updateStatusColor(status, color);
  });
}