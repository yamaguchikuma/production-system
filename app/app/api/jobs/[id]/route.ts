import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await request.json()
  const { status } = body

  const updates: Record<string, unknown> = { status }
  if (status === 'IN_PROGRESS') updates.startedAt = new Date().toISOString()
  if (status === 'DONE') updates.completedAt = new Date().toISOString()

  const { data, error } = await supabase
    .from('ProductionJob')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
