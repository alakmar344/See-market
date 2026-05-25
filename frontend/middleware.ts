import { NextRequest, NextResponse } from 'next/server';

const RANGE_HEADER_PATTERN = /^bytes=(?:\d*-\d*)(?:,\d*-\d*)*$/;

function isValidByteRangeHeader(value: string): boolean {
  const normalized = value.replace(/\s+/g, '').toLowerCase();
  return RANGE_HEADER_PATTERN.test(normalized);
}

export function middleware(request: NextRequest) {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return NextResponse.next();
  }

  const range = request.headers.get('range');

  if (!range || isValidByteRangeHeader(range)) {
    return NextResponse.next();
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.delete('range');

  return NextResponse.next({
    request: {
      headers: requestHeaders
    }
  });
}

export const config = {
  matcher: '/:path*'
};
