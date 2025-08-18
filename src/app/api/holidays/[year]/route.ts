import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: { year: string } }
) {
  const year = params.year;
  if (!year || !/^\d{4}$/.test(year)) {
    return NextResponse.json({ error: 'Invalid year format' }, { status: 400 });
  }

  try {
    const response = await fetch(`https://api.jiejiariapi.com/v1/holidays/${year}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch holidays: ${response.statusText}`);
    }
    const holidays = await response.json();
    return NextResponse.json(holidays);
  } catch (error) {
    console.error("Error fetching holidays from external API:", error);
    return NextResponse.json({ error: 'Failed to fetch holidays' }, { status: 500 });
  }
}
