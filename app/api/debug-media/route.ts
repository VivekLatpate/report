import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // Get the latest crime report
    const latestReport = await prisma.crimeReport.findFirst({
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        aiAnalysis: true
      }
    });

    if (!latestReport) {
      return NextResponse.json({ error: 'No reports found' }, { status: 404 });
    }

    // Parse media URLs
    const mediaUrls = JSON.parse(latestReport.mediaUrls || '[]');

    return NextResponse.json({
      reportId: latestReport.id,
      category: latestReport.category,
      mediaUrls: mediaUrls,
      mediaType: latestReport.mediaType,
      aiAnalysis: latestReport.aiAnalysis,
      createdAt: latestReport.createdAt
    });

  } catch (error) {
    console.error('Error fetching media URLs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch media URLs' },
      { status: 500 }
    );
  }
}
