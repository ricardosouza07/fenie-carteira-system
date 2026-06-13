import type { Session } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

import {
  authCookieNames,
  createOptionalSupabaseAuthClient,
  loadProfileForUser,
} from "@/features/auth/core";
import {
  devProfile,
  getDefaultRouteForRole,
  isRouteAllowedForRole,
} from "@/features/auth/permissions";
import type { AuthProfile } from "@/features/auth/types";

type ResolvedAuth = {
  configured: boolean;
  profile: AuthProfile | null;
  session: Session | null;
};

const publicRoutes = ["/login"];

const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure:
    process.env.NODE_ENV === "production" &&
    process.env.NEXT_PUBLIC_SUPABASE_URL?.startsWith("https://"),
  path: "/",
};

function redirectTo(request: NextRequest, pathname: string) {
  return NextResponse.redirect(new URL(pathname, request.url));
}

function isPublicRoute(pathname: string) {
  return publicRoutes.includes(pathname);
}

function clearAuthCookies(response: NextResponse) {
  response.cookies.delete(authCookieNames.accessToken);
  response.cookies.delete(authCookieNames.refreshToken);
}

function setAuthCookies(response: NextResponse, session: Session) {
  response.cookies.set(authCookieNames.accessToken, session.access_token, {
    ...cookieOptions,
    maxAge: session.expires_in ?? 60 * 60,
  });
  response.cookies.set(authCookieNames.refreshToken, session.refresh_token, {
    ...cookieOptions,
    maxAge: 60 * 60 * 24 * 30,
  });
}

async function profileFromSession(session: Session) {
  const client = createOptionalSupabaseAuthClient(session.access_token);

  if (!client || !session.user) {
    return null;
  }

  return loadProfileForUser(client, session.user.id);
}

async function resolveAuth(request: NextRequest): Promise<ResolvedAuth> {
  const accessToken = request.cookies.get(authCookieNames.accessToken)?.value;
  const refreshToken = request.cookies.get(authCookieNames.refreshToken)?.value;
  const client = createOptionalSupabaseAuthClient(accessToken);

  if (!client) {
    return {
      configured: false,
      profile: devProfile,
      session: null,
    };
  }

  if (accessToken) {
    const {
      data: { user },
      error,
    } = await client.auth.getUser(accessToken);

    if (!error && user) {
      return {
        configured: true,
        profile: await loadProfileForUser(client, user.id),
        session: null,
      };
    }
  }

  if (refreshToken) {
    const refreshClient = createOptionalSupabaseAuthClient();
    const { data, error } =
      refreshClient?.auth
        ? await refreshClient.auth.refreshSession({
            refresh_token: refreshToken,
          })
        : { data: null, error: new Error("Supabase indisponivel") };

    if (!error && data?.session) {
      return {
        configured: true,
        profile: await profileFromSession(data.session),
        session: data.session,
      };
    }
  }

  return {
    configured: true,
    profile: null,
    session: null,
  };
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const auth = await resolveAuth(request);

  if (!auth.configured) {
    if (pathname === "/login") {
      return redirectTo(request, getDefaultRouteForRole(devProfile.role));
    }

    return NextResponse.next();
  }

  if (isPublicRoute(pathname)) {
    if (auth.profile?.active) {
      const response = redirectTo(
        request,
        getDefaultRouteForRole(auth.profile.role),
      );

      if (auth.session) {
        setAuthCookies(response, auth.session);
      }

      return response;
    }

    return NextResponse.next();
  }

  if (!auth.profile?.active) {
    const response = redirectTo(request, "/login");

    clearAuthCookies(response);

    return response;
  }

  if (pathname === "/") {
    const response = redirectTo(
      request,
      getDefaultRouteForRole(auth.profile.role),
    );

    if (auth.session) {
      setAuthCookies(response, auth.session);
    }

    return response;
  }

  if (!isRouteAllowedForRole(pathname, auth.profile.role)) {
    const url = new URL("/acesso-negado", request.url);
    url.searchParams.set("from", pathname);
    const response = NextResponse.redirect(url);

    if (auth.session) {
      setAuthCookies(response, auth.session);
    }

    return response;
  }

  const response = NextResponse.next();

  if (auth.session) {
    setAuthCookies(response, auth.session);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\..*).*)",
  ],
};
