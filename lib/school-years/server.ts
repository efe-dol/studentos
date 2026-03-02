import { createClient } from '@/lib/supabase/server';

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

const buildDefaultLabel = () => {
  const now = new Date();
  const startYear = now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1;
  const endYearShort = String((startYear + 1) % 100).padStart(2, '0');
  return `Schuljahr ${startYear}/${endYearShort}`;
};

export const getOrCreateActiveSchoolYearId = async (
  supabase: SupabaseClient,
  userId: string
): Promise<string> => {
  const { data: activeYear } = await supabase
    .from('school_years')
    .select('id')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (activeYear?.id) {
    return activeYear.id;
  }

  const { data: insertedYear, error: insertError } = await supabase
    .from('school_years')
    .insert({
      user_id: userId,
      label: buildDefaultLabel(),
      is_active: true,
    })
    .select('id')
    .single();

  if (insertError || !insertedYear?.id) {
    throw new Error(insertError?.message || 'Aktives Schuljahr konnte nicht erstellt werden.');
  }

  await supabase
    .from('profiles')
    .update({ active_school_year_id: insertedYear.id })
    .eq('id', userId);

  return insertedYear.id;
};
