import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { contact } = await request.json();

    if (!contact) {
      return NextResponse.json({ message: 'Contact is required' }, { status: 400 });
    }

    // Find user by phone number
    const { data: users, error: userError } = await supabase
      .from('personal')
      .select('id')
      .eq('phone', contact)
      .maybeSingle();

    if (userError || !users) {
      return NextResponse.json(
        { message: 'User not found with this phone number' },
        { status: 404 }
      );
    }

    // Create family link
    const { error: linkError } = await supabase
      .from('family_links')
      .insert({
        requester_id: session.user.id,
        recipient_id: users.id,
        status: 'pending',
      });

    if (linkError) {
      if (linkError.code === '23505') { // Duplicate key error
        return NextResponse.json(
          { message: 'Invite already sent to this user' },
          { status: 409 }
        );
      }
      throw linkError;
    }

    return NextResponse.json({ message: 'Invite sent successfully' });
  } catch (error) {
    console.error('Error sending invite:', error);
    return NextResponse.json(
      { message: 'Failed to send invite' },
      { status: 500 }
    );
  }
}
