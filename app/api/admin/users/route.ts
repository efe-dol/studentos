import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';

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

export async function GET() {
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

    let adminClient: ReturnType<typeof createAdminClient> | null = null;
    try {
      adminClient = createAdminClient();
    } catch {
      adminClient = null;
    }

    let authUsersData: { users: Array<{ id: string; email?: string | null }> } | null = null;
    if (adminClient) {
      const { data, error: usersError } = await adminClient.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      });

      if (!usersError) {
        authUsersData = {
          users: (data?.users || []).map((account) => ({ id: account.id, email: account.email })),
        };
      }
    }

    const profilesQuery = adminClient
      ? adminClient.from('profiles').select('id, first_name, last_name, class_name, role, is_blocked')
      : supabase.from('profiles').select('id, first_name, last_name, class_name, role, is_blocked');

    let { data: profiles, error: profilesError } = await profilesQuery;

    if (profilesError && isMissingIsBlockedError(profilesError)) {
      const fallbackProfiles = adminClient
        ? await adminClient.from('profiles').select('id, first_name, last_name, class_name, role')
        : await supabase.from('profiles').select('id, first_name, last_name, class_name, role');

      profiles = (fallbackProfiles.data || []).map((profile) => ({
        ...profile,
        is_blocked: false,
      }));
      profilesError = fallbackProfiles.error;
    }

    if (profilesError) {
      return NextResponse.json({ users: [], warning: profilesError.message }, { status: 200 });
    }

    const profileMap = new Map((profiles || []).map((profile) => [profile.id, profile]));

    const users = ((authUsersData?.users?.length ? authUsersData.users : (profiles || []).map((p) => ({ id: p.id, email: '' }))) || [])
      .map((authUser) => {
        const profile = profileMap.get(authUser.id);
        return {
          id: authUser.id,
          email: authUser.email || profile?.id || '',
          first_name: profile?.first_name || '',
          last_name: profile?.last_name || '',
          class_name: profile?.class_name || '',
          role: profile?.role === 'admin' ? 'admin' : 'user',
          is_blocked: Boolean(profile?.is_blocked),
        };
      })
      .sort((a, b) => a.email.localeCompare(b.email));

    return NextResponse.json({ users, serviceMode: adminClient ? 'service' : 'session' }, { status: 200 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
