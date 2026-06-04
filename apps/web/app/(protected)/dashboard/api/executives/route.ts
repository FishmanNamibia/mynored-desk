import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/server-auth';
import { getServerBackendApiUrl } from '@/lib/server-backend-api-url';

export async function GET(req: NextRequest) {
  try {
    const { user } = await getAuthenticatedUser(req);
    if (!user?.id) {
      console.error('[Executives API] Unauthorized - no user ID');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch executives from the NestJS API
    const apiUrl = getServerBackendApiUrl();
    const url = `${apiUrl}/api/users/executives`;
    console.log('[Executives API] Fetching from:', url);
    
    const response = await fetch(url, {
      headers: {
        'Cookie': req.headers.get('cookie') || '',
      },
    });

    console.log('[Executives API] Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Executives API] Failed to fetch executives:', response.status, errorText);
      return NextResponse.json({ executives: [] });
    }

    const executives = await response.json();
    console.log('[Executives API] Fetched executives count:', executives?.length || 0);
    console.log('[Executives API] Executives data:', JSON.stringify(executives).substring(0, 200));
    
    return NextResponse.json({ executives });
  } catch (error) {
    console.error('[Executives API] Error fetching executives:', error);
    return NextResponse.json({ executives: [] });
  }
}
