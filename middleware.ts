import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  // Vérifier si l'utilisateur a le cookie d'accès
  const hasAccess = request.cookies.get('dia360-access')
  
  // Si c'est la page de protection, laisser passer
  if (request.nextUrl.pathname === '/protection') {
    return NextResponse.next()
  }
  
  // Si pas d'accès, rediriger vers la page de protection
  if (!hasAccess) {
    return NextResponse.redirect(new URL('/protection', request.url))
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - protection (access page)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|protection).*)',
  ],
}