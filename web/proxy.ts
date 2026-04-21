import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  // Dev bypass — set DEV_BYPASS_AUTH=true in .env.local to skip auth during testing (server-only, never exposed to client)
  if (process.env.DEV_BYPASS_AUTH === 'true') {
    return supabaseResponse;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const { pathname } = request.nextUrl;

  const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/signup');
  const isProtected = pathname.startsWith('/dashboard') ||
    pathname.startsWith('/bloodwork') || pathname.startsWith('/results') ||
    pathname.startsWith('/plan') || pathname.startsWith('/journal') || pathname.startsWith('/profile') ||
    pathname.startsWith('/lab') || pathname.startsWith('/protocol') ||
    pathname.startsWith('/wellbeing') || pathname.startsWith('/upgrade');

  if (!user && isProtected) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Logged-in users on auth pages → send to home (which checks onboarding status)
  if (user && isAuthPage) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
};
