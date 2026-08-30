import { createClient } from '@/lib/supabase/server';
import { getOrCreateActiveSchoolYearId } from '@/lib/school-years/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Cleanup endpoint für fehlerhafte oder orphaned Fächer
 * - Löscht Fächer mit null/leeren Namen
 * - Löscht Fächer mit ungültigem type
 * - Löscht Fächer mit ungültiger Farbe
 * - Löscht Fächer ohne gültigen user_id
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const activeSchoolYearId = await getOrCreateActiveSchoolYearId(supabase, user.id);

    const deletedIds: string[] = [];
    const errors: string[] = [];

    // 1. Fetch all user's subjects
    const { data: subjects, error: fetchError } = await supabase
      .from('subjects')
      .select('*')
      .eq('user_id', user.id)
      .eq('school_year_id', activeSchoolYearId);

    if (fetchError) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    // 2. Identify bad subjects
    const badSubjects = subjects?.filter((s: any) => {
      return (
        !s.name ||
        s.name.trim() === '' ||
        !['HAUPTFACH', 'NEBENFACH'].includes(s.type) ||
        !s.color ||
        !s.color.match(/^#[0-9a-f]{6}$/i)
      );
    }) || [];

    // 3. Delete bad subjects
    for (const subject of badSubjects) {
      try {
        const { error: deleteError } = await supabase
          .from('subjects')
          .delete()
          .eq('id', subject.id)
          .eq('school_year_id', activeSchoolYearId);

        if (deleteError) {
        } else {
          deletedIds.push(subject.id);
        }
      } catch (err) {
        errors.push(`Error deleting ${subject.id}: ${err instanceof Error ? err.message : 'Unknown'}`);
      }
    }

    return NextResponse.json({
      success: true,
      cleaned: deletedIds.length,
      deletedIds,
      errors: errors.length > 0 ? errors : undefined,
      message: `Cleaned up ${deletedIds.length} invalid subject(s)`,
    });
  } catch {
    console.error('Subject cleanup failed');
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
