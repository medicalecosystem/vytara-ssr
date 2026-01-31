import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Fetch outgoing links (people you invited)
    const { data: outgoingLinks, error: outgoingError } = await supabase
      .from('family_links')
      .select('id, recipient_id, status, created_at')
      .eq('requester_id', session.user.id);

    if (outgoingError) throw outgoingError;

    // Fetch incoming links (people who invited you)
    const { data: incomingLinks, error: incomingError } = await supabase
      .from('family_links')
      .select('id, requester_id, status, created_at')
      .eq('recipient_id', session.user.id);

    if (incomingError) throw incomingError;

    // Get display names for outgoing
    const outgoing = await Promise.all(
      (outgoingLinks || []).map(async (link) => {
        const { data: personal } = await supabase
          .from('personal')
          .select('display_name')
          .eq('id', link.recipient_id)
          .maybeSingle();

        return {
          id: link.id,
          memberId: link.recipient_id,
          status: link.status,
          displayName: personal?.display_name || 'Unknown',
          createdAt: link.created_at,
        };
      })
    );

    // Get display names for incoming
    const incoming = await Promise.all(
      (incomingLinks || []).map(async (link) => {
        const { data: personal } = await supabase
          .from('personal')
          .select('display_name')
          .eq('id', link.requester_id)
          .maybeSingle();

        return {
          id: link.id,
          memberId: link.requester_id,
          status: link.status,
          displayName: personal?.display_name || 'Unknown',
          createdAt: link.created_at,
        };
      })
    );

    return NextResponse.json({ outgoing, incoming });
  } catch (error) {
    console.error('Error fetching family links:', error);
    return NextResponse.json(
      { message: 'Failed to fetch family links' },
      { status: 500 }
    );
  }
}
