import { supabase } from './supabaseClient';
import { User, Company } from '../types';

// Mock mode is disabled by default; set to true only for deliberate offline testing.
const USE_MOCK = false;

// Local fallback storage keys (offline/guest mode)
const MOCK_USERS_KEY = 'vie_ride_mock_users';
const MOCK_SESSION_KEY = 'vie_ride_mock_session';
const MOCK_COMPANIES_KEY = 'vie_ride_mock_companies';

const roleForEmail = (email: string | null) => (email && email.toLowerCase().includes('admin') ? 'admin' : 'user');

const getProfile = async (userId: string): Promise<Partial<User>> => {
  if (!supabase) {
    if (!USE_MOCK) throw new Error('Supabase is not configured.');
    return {};
  }
  // Use maybeSingle to avoid 406 when no profile row exists yet
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
  if (error) {
    // Ignore "no rows" error; only log other issues
    if (error.code !== 'PGRST116') {
      console.warn('profile fetch error', error);
    }
    return {};
  }
  if (!data) return {};
  return {
    homeAddress: data.home_address,
    businessAddress: data.business_address,
    phoneNumber: data.phone,
    role: (data.role as User['role']) || 'user',
    companyId: data.company_id
  };
};

const upsertProfile = async (user: User) => {
  if (!supabase) {
    if (!USE_MOCK) throw new Error('Supabase is not configured.');
    return;
  }
  const { error } = await supabase.from('profiles').upsert({
    id: user.id,
    email: user.email,
    name: user.name,
    phone: user.phoneNumber,
    home_address: user.homeAddress,
    business_address: user.businessAddress,
    role: user.role || 'user',
    company_id: user.companyId
  });
  if (error) console.warn('profile upsert error', error);
};

const supabaseUserToAppUser = async (authUser: any): Promise<User> => {
  const profile = await getProfile(authUser.id);
  const meta = authUser.user_metadata || {};
  return {
    id: authUser.id,
    email: authUser.email || '',
    name: meta.name || authUser.email?.split('@')[0] || 'User',
    createdAt: new Date(authUser.created_at).getTime(),
    role: profile.role || roleForEmail(authUser.email),
    homeAddress: profile.homeAddress ?? meta.home_address,
    businessAddress: profile.businessAddress ?? meta.business_address,
    phoneNumber: profile.phoneNumber ?? meta.phone,
    companyId: profile.companyId ?? meta.company_id
  };
};

const basicAuthUserToAppUser = (authUser: any): User => ({
  id: authUser.id,
  email: authUser.email || '',
  name: authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'User',
  createdAt: new Date(authUser.created_at || Date.now()).getTime(),
  role: roleForEmail(authUser.email),
  homeAddress: authUser.user_metadata?.home_address,
  businessAddress: authUser.user_metadata?.business_address,
  phoneNumber: authUser.user_metadata?.phone,
  companyId: authUser.user_metadata?.company_id
});

export const authService = {
  // Attempt to rehydrate a Supabase session from the stored auth token (after refresh)
  ensureSessionFromStorage: async () => {
    if (!supabase) {
      if (!USE_MOCK) throw new Error('Supabase is not configured.');
      return null;
    }

    // Supabase client persists session automatically; just read it
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.warn('ensureSessionFromStorage error', error);
      return null;
    }
    return data.session || null;
  },

  // Fetch current session user once (helpful on page reload)
  getCurrentUser: async (): Promise<User | null> => {
    if (supabase) {
      const { data } = await supabase.auth.getSession();
      const authUser = data.session?.user;
      if (authUser) return supabaseUserToAppUser(authUser);
      return null;
    }
    const session = localStorage.getItem(MOCK_SESSION_KEY);
    return session ? JSON.parse(session) as User : null;
  },

  // Sync fallback: parse stored token user (without hitting Supabase)
  getStoredUserQuick: (): User | null => {
    const tokenKey = Object.keys(localStorage).find(k => k.endsWith('-auth-token'));
    if (!tokenKey) return null;
    try {
      const parsed = JSON.parse(localStorage.getItem(tokenKey) || '{}');
      const rawUser = parsed?.user || parsed?.currentUser;
      if (rawUser) return basicAuthUserToAppUser(rawUser);
    } catch (e) {
      console.warn('getStoredUserQuick parse error', e);
    }
    return null;
  },

  onAuthStateChange: (callback: (user: User | null) => void) => {
    if (!supabase) {
      const session = localStorage.getItem(MOCK_SESSION_KEY);
      callback(session ? JSON.parse(session) : null);
      return () => {};
    }

    // Emit current session once
    supabase.auth.getSession().then(async ({ data }) => {
      const authUser = data.session?.user;
      if (authUser) {
        const user = await supabaseUserToAppUser(authUser);
        callback(user);
      } else {
        callback(null);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const authUser = session?.user;
      if (authUser) {
        const user = await supabaseUserToAppUser(authUser);
        callback(user);
      } else {
        callback(null);
      }
    });

    return () => {
      listener?.subscription.unsubscribe();
    };
  },

  register: async (name: string, email: string, password: string, joinCode?: string): Promise<User> => {
    if (!supabase) {
      if (USE_MOCK) {
        const raw = localStorage.getItem(MOCK_USERS_KEY);
        const users = raw ? JSON.parse(raw) as User[] : [];
        const existing = users.find(u => u.email === email);
        if (existing) throw new Error('User already exists');
        const user: User = {
          id: 'local_' + Date.now(),
          email,
          name,
          createdAt: Date.now(),
          role: roleForEmail(email)
        };
        users.push(user);
        localStorage.setItem(MOCK_USERS_KEY, JSON.stringify(users));
        localStorage.setItem(MOCK_SESSION_KEY, JSON.stringify(user));
        return user;
      }
      throw new Error('Supabase is not configured.');
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name }
      }
    });
    if (error || !data.user) throw error || new Error('Registration failed');

    const user = await supabaseUserToAppUser(data.user);

    // Optional join code handling: look up company by join_code
    if (joinCode) {
      const { data: companies } = await supabase
        .from('companies')
        .select('id, name, discount')
        .eq('join_code', joinCode)
        .limit(1);
      if (companies && companies[0]) {
        user.companyId = companies[0].id;
      }
    }

    await upsertProfile(user);
    return user;
  },

  login: async (email: string, password: string): Promise<User> => {
    if (!supabase) {
      if (USE_MOCK) {
        const raw = localStorage.getItem(MOCK_USERS_KEY);
        const users = raw ? JSON.parse(raw) as User[] : [];
        const user = users.find(u => u.email === email);
        if (!user) throw new Error('User not found (mock)');
        localStorage.setItem(MOCK_SESSION_KEY, JSON.stringify(user));
        return user;
      }
      throw new Error('Supabase is not configured.');
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) throw error || new Error('Login failed');
    const user = await supabaseUserToAppUser(data.user);
    await upsertProfile(user);
    return user;
  },

  logout: async () => {
    if (supabase) {
      try {
        await supabase.auth.signOut();
      } catch (e) {
        console.warn('signOut error (ignored)', e);
      } finally {
        // Explicitly remove stored auth tokens to prevent re-hydration after logout
        const clearAll = (storage: Storage) => {
          const keys = Object.keys(storage).filter(k =>
            k.includes('sb-') ||
            k.endsWith('-auth-token') ||
            k === 'supabase.auth.token'
          );
          keys.forEach(k => storage.removeItem(k));
        };
        clearAll(localStorage);
        clearAll(sessionStorage);
      }
    } else if (USE_MOCK) {
      localStorage.removeItem(MOCK_SESSION_KEY);
    } else {
      throw new Error('Supabase is not configured.');
    }
  },

  resetPassword: async (email: string) => {
    if (!supabase) {
      if (USE_MOCK) return;
      throw new Error('Supabase is not configured.');
    }
    const redirectTo = window.location.origin + '/reset';
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) throw error;
  },

  changePassword: async (_currentPassword: string, newPassword: string) => {
    if (!supabase) {
      if (USE_MOCK) return;
      throw new Error('Supabase is not configured.');
    }

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Supabase configuration is missing.');
    }

    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        console.error('[authService] changePassword:sessionError', sessionError);
        throw sessionError;
      }

      const accessToken = sessionData.session?.access_token;
      if (!accessToken) {
        throw new Error('Failed to load the current session.');
      }

      const normalizedUrl = supabaseUrl.replace(/\/+$/, '');
      const response = await fetch(`${normalizedUrl}/auth/v1/user`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({ password: newPassword })
      });

      let payload: any = null;
      try {
        payload = await response.json();
      } catch (err) {
        console.warn('[authService] changePassword:parseResponseFailed', err);
      }

      if (!response.ok) {
        const message =
          payload?.error ||
          payload?.msg ||
          payload?.error_description ||
          payload?.message ||
          'Failed to update password';
        console.error('[authService] changePassword:updateError', message);
        throw new Error(message);
      }

      return { success: true };
    } catch (err) {
      console.error('[authService] changePassword:fail', err);
      throw err;
    }
  },

  updatePassword: async (newPassword: string) => {
    if (!supabase) {
      if (USE_MOCK) return;
      throw new Error('Supabase is not configured.');
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
  },

  updateProfile: async (user: User, updates: Partial<User>): Promise<User> => {
    const merged: User = { ...user, ...updates };
    if (supabase) {
      await upsertProfile(merged);
      return merged;
    }
    // Mock
    const raw = localStorage.getItem(MOCK_USERS_KEY);
    const users = raw ? JSON.parse(raw) as User[] : [];
    const idx = users.findIndex(u => u.id === user.id);
    if (idx !== -1) {
      users[idx] = merged;
      localStorage.setItem(MOCK_USERS_KEY, JSON.stringify(users));
      localStorage.setItem(MOCK_SESSION_KEY, JSON.stringify(merged));
    }
    return merged;
  },

  /**
   * Update a user's profile (both auth metadata and profiles table).
   * Accepts either a User object or a userId string (for backward compatibility).
   */
  updateUserProfile: async (userOrId: User | string, updates: Partial<User>): Promise<void> => {
    const base: Partial<User> = typeof userOrId === 'string' ? {} : userOrId;
    const userId = typeof userOrId === 'string' ? userOrId : userOrId.id;

    if (!supabase) {
      if (USE_MOCK) {
        const raw = localStorage.getItem(MOCK_USERS_KEY);
        const users = raw ? JSON.parse(raw) as User[] : [];
        const idx = users.findIndex(u => u.id === userId);
        if (idx !== -1) {
          users[idx] = { ...users[idx], ...updates };
          localStorage.setItem(MOCK_USERS_KEY, JSON.stringify(users));
          localStorage.setItem(MOCK_SESSION_KEY, JSON.stringify(users[idx]));
        }
        return;
      }
      throw new Error('Supabase is not configured.');
    }

    // Only call auth.updateUser when changing email; other fields live in profiles
    const emailChanged = updates.email && updates.email !== (base.email ?? updates.email);

    if (emailChanged) {
      const { error: authErr } = await supabase.auth.updateUser({ email: updates.email });
      if (authErr) {
        console.warn('auth updateUser error', authErr);
        throw authErr;
      }
    }

    // Upsert into profiles table
    const { error: profileErr } = await supabase.from('profiles').upsert({
      id: userId,
      email: updates.email ?? base.email,
      name: updates.name ?? base.name,
      phone: updates.phoneNumber ?? base.phoneNumber,
      home_address: updates.homeAddress ?? base.homeAddress,
      business_address: updates.businessAddress ?? base.businessAddress,
      role: updates.role ?? base.role,
      company_id: updates.companyId ?? base.companyId
    });
    if (profileErr) {
      console.warn('profile upsert error', profileErr);
      throw profileErr;
    }
    return;
  },

  // --- Companies ---
  getCompanies: async (): Promise<Company[]> => {
    if (!supabase) {
      if (USE_MOCK) {
        const raw = localStorage.getItem(MOCK_COMPANIES_KEY);
        return raw ? JSON.parse(raw) : [];
      }
      throw new Error('Supabase is not configured.');
    }
    const { data, error } = await supabase.from('companies').select('*');
    if (error) {
      console.warn('companies fetch error', error);
      return [];
    }
    return (data || []).map((c) => ({
      ...c,
      invoiceEnabled: c.invoice_enabled
    })) as Company[];
  },

  addCompany: async (company: Omit<Company, 'id'>) => {
    if (!supabase) {
      if (USE_MOCK) {
        const stored = await authService.getCompanies();
        const newCo = { id: 'co_' + Date.now(), ...company };
        stored.push(newCo as Company);
        localStorage.setItem(MOCK_COMPANIES_KEY, JSON.stringify(stored));
        return newCo;
      }
      throw new Error('Supabase is not configured.');
    }
    const { data, error } = await supabase
      .from('companies')
      .insert({
        name: company.name,
        domain: company.domain,
        join_code: company.joinCode,
        discount: company.discount,
        invoice_enabled: company.invoiceEnabled
      })
      .select()
      .single();
    if (error) throw error;
    return {
      id: data.id,
      name: data.name,
      domain: data.domain,
      joinCode: data.join_code,
      discount: data.discount,
      invoiceEnabled: data.invoice_enabled
    } as Company;
  },

  updateCompany: async (company: Company) => {
    if (!supabase) {
      if (USE_MOCK) {
        const stored = await authService.getCompanies();
        const idx = stored.findIndex(c => c.id === company.id);
        if (idx !== -1) {
          stored[idx] = company;
          localStorage.setItem(MOCK_COMPANIES_KEY, JSON.stringify(stored));
        }
        return;
      }
      throw new Error('Supabase is not configured.');
    }
    const { error } = await supabase
      .from('companies')
      .update({
        name: company.name,
        domain: company.domain,
        join_code: company.joinCode,
        discount: company.discount,
        invoice_enabled: company.invoiceEnabled
      })
      .eq('id', company.id);
    if (error) throw error;
    return;
  },

  deleteCompany: async (companyId: string) => {
    if (!supabase) {
      if (USE_MOCK) {
        const stored = await authService.getCompanies();
        const filtered = stored.filter(c => c.id !== companyId);
        localStorage.setItem(MOCK_COMPANIES_KEY, JSON.stringify(filtered));
        return;
      }
      throw new Error('Supabase is not configured.');
    }
    const { error } = await supabase.from('companies').delete().eq('id', companyId);
    if (error) throw error;
    return;
  },

  generateJoinCode: () => Math.random().toString(36).substring(2, 8).toUpperCase(),

  resetMockData: () => {
    localStorage.removeItem(MOCK_USERS_KEY);
    localStorage.removeItem(MOCK_COMPANIES_KEY);
    localStorage.removeItem('vie_ride_bookings');
    localStorage.removeItem('vie_ride_drivers');
    window.location.reload();
  }
};
