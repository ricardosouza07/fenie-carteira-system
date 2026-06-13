type BrowserSupabaseEnv = {
  url: string;
  anonKey: string;
};

type ServerSupabaseEnv = BrowserSupabaseEnv & {
  serviceRoleKey: string | null;
};

type ConfiguredServerSupabaseEnv = BrowserSupabaseEnv & {
  serviceRoleKey: string;
};

const placeholderFragments = ["copie-o-", "supabase-status", "..."];

function isConfiguredValue(value: string | null | undefined): value is string {
  if (!value) {
    return false;
  }

  return !placeholderFragments.some((fragment) => value.includes(fragment));
}

function readRequiredEnv(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Variavel de ambiente ausente: ${name}. Configure frontend/.env.local antes de usar o Supabase.`,
    );
  }

  return value;
}

export function getSupabaseBrowserEnv(): BrowserSupabaseEnv {
  return {
    url: readRequiredEnv(
      "NEXT_PUBLIC_SUPABASE_URL",
      process.env.NEXT_PUBLIC_SUPABASE_URL,
    ),
    anonKey: readRequiredEnv(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    ),
  };
}

export function getOptionalSupabaseBrowserEnv(): BrowserSupabaseEnv | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!isConfiguredValue(url) || !isConfiguredValue(anonKey)) {
    return null;
  }

  return {
    url,
    anonKey,
  };
}

export function getSupabaseServerEnv(): ServerSupabaseEnv {
  return {
    ...getSupabaseBrowserEnv(),
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? null,
  };
}

export function getOptionalSupabaseServerEnv(): ConfiguredServerSupabaseEnv | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (
    !isConfiguredValue(url) ||
    !isConfiguredValue(anonKey) ||
    !isConfiguredValue(serviceRoleKey)
  ) {
    return null;
  }

  return {
    url,
    anonKey,
    serviceRoleKey,
  };
}
