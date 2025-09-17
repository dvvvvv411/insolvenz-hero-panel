import { supabase } from "@/integrations/supabase/client";

// Default status settings with defined colors and order
const defaultStatusSettings = [
  { status: "Exchanged", color: "#10b981", order_position: 1 },
  { status: "Überwiesen", color: "#059669", order_position: 2 },
  { status: "Rechnung versendet", color: "#3b82f6", order_position: 3 },
  { status: "Möchte Rechnung", color: "#8b5cf6", order_position: 4 },
  { status: "KV versendet", color: "#f59e0b", order_position: 5 },
  { status: "Möchte KV", color: "#eab308", order_position: 6 },
  { status: "Mail raus", color: "#6b7280", order_position: 7 },
  { status: "Neu", color: "#ef4444", order_position: 8 },
  { status: "Kein Interesse", color: "#374151", order_position: 999 }
];

export interface StatusSetting {
  id?: string;
  status: string;
  color: string;
  order_position: number;
  is_active?: boolean;
}

// Fetch all user status settings from database
export async function fetchUserStatusSettings(): Promise<StatusSetting[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('user_status_settings')
    .select('id, status, color, order_position, is_active')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .order('order_position');

  if (error) {
    console.error('Error fetching user status settings:', error);
    return [];
  }

  return data || [];
}

// Update a status setting (color, name, or position)
export async function updateStatusSettings(status: string, updates: Partial<StatusSetting>): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase
    .from('user_status_settings')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('user_id', user.id)
    .eq('status', status);

  if (error) {
    console.error('Error updating status settings:', error);
    return false;
  }

  return true;
}

// Add a new status
export async function addNewStatus(status: string, color?: string, position?: number): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  // Get current max position if no position specified
  let order_position = position;
  if (!order_position) {
    const { data: maxData } = await supabase
      .from('user_status_settings')
      .select('order_position')
      .eq('user_id', user.id)
      .order('order_position', { ascending: false })
      .limit(1);
    
    order_position = (maxData?.[0]?.order_position || 0) + 1;
  }

  const { error } = await supabase
    .from('user_status_settings')
    .insert({
      user_id: user.id,
      status,
      color: color || '#6b7280',
      order_position
    });

  if (error) {
    console.error('Error adding new status:', error);
    return false;
  }

  return true;
}

// Delete a status (mark as inactive)
export async function deleteStatus(status: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase
    .from('user_status_settings')
    .update({ is_active: false })
    .eq('user_id', user.id)
    .eq('status', status);

  if (error) {
    console.error('Error deleting status:', error);
    return false;
  }

  return true;
}

// Reorder all statuses
export async function reorderStatuses(statusOrder: string[]): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  // Update each status with its new position
  const updates = statusOrder.map((status, index) => 
    supabase
      .from('user_status_settings')
      .update({ order_position: index + 1 })
      .eq('user_id', user.id)
      .eq('status', status)
  );

  try {
    await Promise.all(updates);
    return true;
  } catch (error) {
    console.error('Error reordering statuses:', error);
    return false;
  }
}

// Comprehensive migration function for all status data
export async function migrateAllUserStatusData(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  // Check if user already has status settings in new table
  const { data: existingSettings } = await supabase
    .from('user_status_settings')
    .select('id')
    .eq('user_id', user.id)
    .limit(1);

  if (existingSettings && existingSettings.length > 0) {
    // User already has status settings, skip migration
    return;
  }

  console.log('Starting migration of all status data...');

  // Step 1: Get status order from localStorage
  const localStorageOrder = localStorage.getItem('statusOrder');
  let statusOrder: string[] = [];
  if (localStorageOrder) {
    try {
      statusOrder = JSON.parse(localStorageOrder);
    } catch (error) {
      console.error('Error parsing localStorage status order:', error);
    }
  }

  // Step 2: Get colors from localStorage and old user_status_colors table
  const localStorageColors = localStorage.getItem('statusColors');
  let localColors: Record<string, string> = {};
  if (localStorageColors) {
    try {
      localColors = JSON.parse(localStorageColors);
    } catch (error) {
      console.error('Error parsing localStorage colors:', error);
    }
  }

  // Get colors from old table
  const { data: dbColors } = await supabase
    .from('user_status_colors')
    .select('status, color')
    .eq('user_id', user.id);

  const dbColorsMap: Record<string, string> = {};
  dbColors?.forEach(({ status, color }) => {
    dbColorsMap[status] = color;
  });

  // Step 3: Combine all data, prioritize localStorage order, fill missing with defaults
  const finalStatusSettings: StatusSetting[] = [];
  
  // If no localStorage order, use default order
  if (statusOrder.length === 0) {
    statusOrder = defaultStatusSettings.map(s => s.status);
  }

  // Process status order and assign colors
  statusOrder.forEach((status, index) => {
    const color = localColors[status] || dbColorsMap[status] || 
                  defaultStatusSettings.find(s => s.status === status)?.color || '#6b7280';
    
    finalStatusSettings.push({
      status,
      color,
      order_position: index + 1
    });
  });

  // Add any missing default statuses that weren't in localStorage order
  defaultStatusSettings.forEach(defaultStatus => {
    if (!statusOrder.includes(defaultStatus.status)) {
      const color = localColors[defaultStatus.status] || dbColorsMap[defaultStatus.status] || defaultStatus.color;
      finalStatusSettings.push({
        status: defaultStatus.status,
        color,
        order_position: defaultStatus.order_position
      });
    }
  });

  // Step 4: Insert all status settings into new table
  if (finalStatusSettings.length > 0) {
    const settingsToInsert = finalStatusSettings.map(setting => ({
      user_id: user.id,
      status: setting.status,
      color: setting.color,
      order_position: setting.order_position
    }));

    const { error } = await supabase
      .from('user_status_settings')
      .insert(settingsToInsert);

    if (error) {
      console.error('Error migrating status settings to database:', error);
      return;
    }

    console.log('Successfully migrated all status data to database');

    // Step 5: Clean up old data
    localStorage.removeItem('statusOrder');
    localStorage.removeItem('statusColors');
    
    // Optionally delete old user_status_colors entries
    await supabase
      .from('user_status_colors')
      .delete()
      .eq('user_id', user.id);
  }
}

// Legacy functions for compatibility - now use unified status settings
export function getStatusColors(): Record<string, string> {
  console.warn('getStatusColors() is deprecated, use fetchUserStatusSettings() instead');
  return {};
}

export function setStatusColor(status: string, color: string): void {
  console.warn('setStatusColor() is deprecated, use updateStatusSettings() instead');
  updateStatusSettings(status, { color });
}

export function saveStatusColors(colors: Record<string, string>): void {
  console.warn('saveStatusColors() is deprecated, use updateStatusSettings() for individual colors');
  Object.entries(colors).forEach(([status, color]) => {
    updateStatusSettings(status, { color });
  });
}

export function getStatusOrder(): string[] {
  console.warn('getStatusOrder() is deprecated, use fetchUserStatusSettings() instead');
  return [];
}

export function saveStatusOrder(order: string[]): void {
  console.warn('saveStatusOrder() is deprecated, use reorderStatuses() instead');
  reorderStatuses(order);
}