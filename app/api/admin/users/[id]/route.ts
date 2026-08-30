import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';

const isAdmin = async (userId: string) => {
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();

  return profile?.role === 'admin';
};

const isMissingIsBlockedError = (error: { message?: string; details?: string; hint?: string } | null) => {
  const combined = `${error?.message || ''} ${error?.details || ''} ${error?.hint || ''}`.toLowerCase();
  return combined.includes('is_blocked') && (combined.includes('column') || combined.includes('schema cache'));
};

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    if (id === user.id) {
      return NextResponse.json({ error: 'Du kannst dein eigenes Konto hier nicht ändern.' }, { status: 400 });
    }

    const { role, is_blocked } = await request.json();

    const updateData: { role?: 'user' | 'admin'; is_blocked?: boolean } = {};
    if (role !== undefined) {
      if (!['user', 'admin'].includes(role)) {
        return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
      }
      updateData.role = role;
    }

    if (is_blocked !== undefined) {
      if (typeof is_blocked !== 'boolean') {
        return NextResponse.json({ error: 'is_blocked must be boolean' }, { status: 400 });
      }
      updateData.is_blocked = is_blocked;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No valid fields provided' }, { status: 400 });
    }

    let adminClient: ReturnType<typeof createAdminClient> | null = null;
    try {
      adminClient = createAdminClient();
    } catch {
      adminClient = null;
    }

    const updateQuery = adminClient
      ? adminClient.from('profiles')
      : supabase.from('profiles');

    const { data, error } = await updateQuery
      .update(updateData)
      .eq('id', id)
      .select('id, role, is_blocked')
      .single();

    if (error && isMissingIsBlockedError(error) && updateData.is_blocked !== undefined) {
      return NextResponse.json(
        { error: 'is_blocked column missing. Please run migration 013_add_admin_controls.sql.' },
        { status: 400 }
      );
    }

    if (error && !isMissingIsBlockedError(error)) {
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    if (error && isMissingIsBlockedError(error)) {
      const fallbackData = { ...updateData };
      delete fallbackData.is_blocked;

      const fallbackQuery = adminClient
        ? adminClient.from('profiles')
        : supabase.from('profiles');

      const { data: fallback, error: fallbackError } = await fallbackQuery
        .update(fallbackData)
        .eq('id', id)
        .select('id, role')
        .single();

      if (fallbackError) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
      }

      return NextResponse.json(
        {
          user: {
            ...fallback,
            is_blocked: false,
          },
          migrationRequired: true,
        },
        { status: 200 }
      );
    }

    return NextResponse.json({ user: data }, { status: 200 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    if (id === user.id) {
      return NextResponse.json({ error: 'Du kannst dich nicht selbst löschen.' }, { status: 400 });
    }

    let adminClient: ReturnType<typeof createAdminClient> | null = null;
    try {
      adminClient = createAdminClient();
    } catch {
      return NextResponse.json(
        { error: 'Löschen benötigt SUPABASE_SERVICE_ROLE_KEY auf dem Server.' },
        { status: 400 }
      );
    }

    const { error } = await adminClient.auth.admin.deleteUser(id);

    if (error) {
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
