import { NextResponse } from 'next/server';

const API_BASE = process.env.API_BASE;

export async function GET() {
  const response = await fetch(
    `${API_BASE}/api/attribute-descriptions`,
    {
      cache: 'force-cache',
    }
  );

  const data = await response.json();

  return NextResponse.json(data);
}