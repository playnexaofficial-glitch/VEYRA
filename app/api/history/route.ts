import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'Database service not initialized', history: [] },
        { status: 503 }
      );
    }

    const { searchParams } = new URL(req.url);
    const deviceId =
      searchParams.get('deviceId') ||
      searchParams.get('device_id') ||
      req.headers.get('x-device-id') ||
      '';

    if (!deviceId) {
      return NextResponse.json({ success: true, history: [] });
    }

    // Attempt to query by device_id
    let query = supabase
      .from('search_history')
      .select('*')
      .eq('device_id', deviceId)
      .order('created_at', { ascending: false })
      .limit(50);

    let { data, error } = await query;

    // If device_id column does not exist yet or query failed due to column missing, fallback gracefully
    if (error) {
      console.warn('Supabase query error with device_id filter:', error.message);
      if (error.code === 'PGRST204' || error.message.includes('device_id')) {
        const fallback = await supabase
          .from('search_history')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(20);
        data = fallback.data;
      } else {
        return NextResponse.json(
          { success: false, error: error.message, history: [] },
          { status: 400 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      history: data || [],
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('GET /api/history error:', message);
    return NextResponse.json(
      { success: false, error: message, history: [] },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'Database service not initialized' },
        { status: 503 }
      );
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const deviceId =
      searchParams.get('deviceId') ||
      searchParams.get('device_id') ||
      req.headers.get('x-device-id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Missing record id' },
        { status: 400 }
      );
    }

    let deleteQuery = supabase.from('search_history').delete().eq('id', id);

    if (deviceId) {
      // If table supports device_id scoping
      try {
        const scopedResult = await supabase
          .from('search_history')
          .delete()
          .eq('id', id)
          .eq('device_id', deviceId);

        if (!scopedResult.error) {
          return NextResponse.json({ success: true, id });
        }
      } catch {
        // Fall back to id only
      }
    }

    const { error } = await deleteQuery;
    if (error) {
      console.error('Supabase delete error:', error.message);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, id });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('DELETE /api/history error:', message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
