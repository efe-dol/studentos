import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';

const isMissingAppSettingsRelationError = (error: { message?: string; details?: string; hint?: string } | null) => {
  const combined = `${error?.message || ''} ${error?.details || ''} ${error?.hint || ''}`.toLowerCase();
  return combined.includes('app_settings') && (combined.includes('does not exist') || combined.includes('relation'));
};

const isMissingMaintenanceModeColumnError = (error: { message?: string; details?: string; hint?: string } | null) => {
  const combined = `${error?.message || ''} ${error?.details || ''} ${error?.hint || ''}`.toLowerCase();
  return combined.includes('maintenance_mode') && (combined.includes('column') || combined.includes('schema cache'));
};

const isRlsError = (error: { message?: string; details?: string; hint?: string } | null) => {
  const combined = `${error?.message || ''} ${error?.details || ''} ${error?.hint || ''}`.toLowerCase();
  return combined.includes('row-level security') || combined.includes('violates row-level security');
};

const isAdmin = async (userId: string) => {
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();

  return profile?.role === 'admin';
};

export async function GET() {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('app_settings')
      .select('maintenance_mode')
      .eq('id', true)
      .single();

    if (error && !isMissingAppSettingsRelationError(error) && !isMissingMaintenanceModeColumnError(error)) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (error && (isMissingAppSettingsRelationError(error) || isMissingMaintenanceModeColumnError(error))) {
      return NextResponse.json({ maintenanceMode: false, migrationRequired: true }, { status: 200 });
    }

    return NextResponse.json({ maintenanceMode: Boolean(data?.maintenance_mode) }, { status: 200 });
  } catch {
    return NextResponse.json({ maintenanceMode: false }, { status: 200 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!(await isAdmin(user.id))) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    const maintenanceMode = body?.maintenanceMode;

    if (typeof maintenanceMode !== 'boolean') {
      return NextResponse.json({ error: 'maintenanceMode must be boolean' }, { status: 400 });
    }

    let adminClient: ReturnType<typeof createAdminClient> | null = null;
    try {
      adminClient = createAdminClient();
    } catch {
      adminClient = null;
    }

    const writeClient = adminClient ?? supabase;
    const payload = {
      maintenance_mode: maintenanceMode,
      updated_by: user.id,
    };

    const { data: updatedData, error: updateError } = await writeClient
      .from('app_settings')
      .update(payload)
      .eq('id', true)
      .select('maintenance_mode')
      .maybeSingle();

    if (updateError) {
      if (isMissingAppSettingsRelationError(updateError) || isMissingMaintenanceModeColumnError(updateError)) {
        return NextResponse.json(
          {
            error: 'app_settings fehlt oder ist unvollständig. Bitte Migration 013_add_admin_controls.sql ausführen.',
            migrationRequired: true,
          },
          { status: 400 }
        );
      }

      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    if (updatedData) {
      return NextResponse.json({ maintenanceMode: Boolean(updatedData.maintenance_mode) }, { status: 200 });
    }

    const { data: insertedData, error: insertError } = await writeClient
      .from('app_settings')
      .insert({ id: true, ...payload })
      .select('maintenance_mode')
      .single();

    if (insertError) {
      if (isMissingAppSettingsRelationError(insertError) || isMissingMaintenanceModeColumnError(insertError)) {
        return NextResponse.json(
          {
            error: 'app_settings fehlt oder ist unvollständig. Bitte Migration 013_add_admin_controls.sql ausführen.',
            migrationRequired: true,
          },
          { status: 400 }
        );
      }

      if (isRlsError(insertError) && !adminClient) {
        return NextResponse.json(
          {
            error:
              'Initialer app_settings-Datensatz fehlt. Ohne SUPABASE_SERVICE_ROLE_KEY kann er nicht automatisch angelegt werden. Bitte in Supabase SQL ausführen: INSERT INTO public.app_settings (id, maintenance_mode) VALUES (TRUE, FALSE) ON CONFLICT (id) DO NOTHING;',
          },
          { status: 403 }
        );
      }

      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ maintenanceMode: Boolean(insertedData?.maintenance_mode) }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
