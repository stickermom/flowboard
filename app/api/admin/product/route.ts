import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.warn('Supabase service configuration missing in environment variables.');
}

const supabaseAdmin =
  supabaseUrl && serviceRoleKey
    ? createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })
    : null;

const slugify = (value = '') =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const titleCase = (value = '') =>
  value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const ensureCategory = async ({ category_id, category_slug, category_name }: {
  category_id?: string | null;
  category_slug?: string | null;
  category_name?: string | null;
}) => {
  if (category_id === null && !category_slug && !category_name) {
    return null;
  }

  const trimmedId = typeof category_id === 'string' ? category_id.trim() : '';
  if (trimmedId) {
    return trimmedId;
  }

  const rawSlug = typeof category_slug === 'string' ? category_slug : '';
  const rawName = typeof category_name === 'string' ? category_name : '';

  const slugCandidate = slugify(rawSlug) || slugify(rawName);
  const nameCandidate = rawName.trim() || titleCase(slugCandidate.replace(/-/g, ' '));

  if (!slugCandidate) {
    return undefined;
  }

  if (!supabaseAdmin) {
    throw new Error('Supabase admin client not configured');
  }

  const { data: existingBySlug } = await supabaseAdmin
    .from('categories')
    .select('id')
    .eq('slug', slugCandidate)
    .maybeSingle();

  if (existingBySlug?.id) {
    return existingBySlug.id;
  }

  const { data: existingByName } = await supabaseAdmin
    .from('categories')
    .select('id, slug')
    .eq('name', nameCandidate)
    .maybeSingle();

  if (existingByName?.id) {
    return existingByName.id;
  }

  const { data: upserted, error } = await supabaseAdmin
    .from('categories')
    .upsert(
      [
        {
          name: nameCandidate,
          slug: slugCandidate,
          is_active: true,
        },
      ],
      { onConflict: 'slug' }
    )
    .select('id')
    .single();

  if (error) {
    throw new Error(`Failed to ensure category "${slugCandidate}": ${error.message}`);
  }

  return upserted?.id ?? undefined;
};

const prepareProductPayload = async (rawPayload: any) => {
  if (!rawPayload) return rawPayload;
  const {
    category_id = undefined,
    category_slug = undefined,
    category_name = undefined,
    ...rest
  } = rawPayload;

  const resolvedCategoryId = await ensureCategory({ category_id, category_slug, category_name });

  if (resolvedCategoryId !== undefined) {
    return { ...rest, category_id: resolvedCategoryId };
  }

  return rest;
};

export async function POST(request: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: 'Supabase admin client not configured' },
      { status: 500 }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  const { action, payload = {} } = body;

  if (!action) {
    return NextResponse.json(
      { error: 'Missing action' },
      { status: 400 }
    );
  }

  try {
    switch (action) {
      case 'list': {
        const { data, error } = await supabaseAdmin
          .from('products')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          return NextResponse.json(
            { error: error.message },
            { status: 400 }
          );
        }
        return NextResponse.json({ data });
      }

      case 'create': {
        const { product } = payload;
        if (!product) {
          return NextResponse.json(
            { error: 'Missing product payload' },
            { status: 400 }
          );
        }

        let preparedProduct;
        try {
          preparedProduct = await prepareProductPayload(product);
        } catch (error: any) {
          return NextResponse.json(
            { error: error.message },
            { status: 400 }
          );
        }

        const { data, error } = await supabaseAdmin
          .from('products')
          .insert([preparedProduct])
          .select()
          .single();

        if (error) {
          return NextResponse.json(
            { error: error.message },
            { status: 400 }
          );
        }
        return NextResponse.json({ data });
      }

      case 'update': {
        const { id, updates } = payload;
        if (!id || !updates) {
          return NextResponse.json(
            { error: 'Missing update payload' },
            { status: 400 }
          );
        }

        let preparedUpdates;
        try {
          preparedUpdates = await prepareProductPayload(updates);
        } catch (error: any) {
          return NextResponse.json(
            { error: error.message },
            { status: 400 }
          );
        }

        const { data, error } = await supabaseAdmin
          .from('products')
          .update(preparedUpdates)
          .eq('id', id)
          .select()
          .single();

        if (error) {
          return NextResponse.json(
            { error: error.message },
            { status: 400 }
          );
        }
        return NextResponse.json({ data });
      }

      case 'delete': {
        const { id } = payload;
        if (!id) {
          return NextResponse.json(
            { error: 'Missing product id' },
            { status: 400 }
          );
        }

        const { error } = await supabaseAdmin.from('products').delete().eq('id', id);
        if (error) {
          return NextResponse.json(
            { error: error.message },
            { status: 400 }
          );
        }
        return NextResponse.json({ data: null });
      }

      default:
        return NextResponse.json(
          { error: `Unsupported action "${action}"` },
          { status: 400 }
        );
    }
  } catch (err: any) {
    console.error('Admin product function error:', err);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}

