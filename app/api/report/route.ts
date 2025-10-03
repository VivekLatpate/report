import { NextRequest, NextResponse } from 'next/server';
import { CrimeReportService } from '@/lib/services/crime-report-service';
import { CrimeReportRequest } from '@/lib/types/crime-report';
import { PhantomWalletService } from '@/lib/services/phantom-wallet-service';
import { CloudinaryService } from '@/lib/services/cloudinary-service';

const crimeReportService = new CrimeReportService();
const phantomWalletService = new PhantomWalletService();
const cloudinaryService = new CloudinaryService();

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    // Extract form data
    const location = formData.get('location') as string;
    const description = formData.get('description') as string;
    const category = formData.get('category') as string;
    const priority = formData.get('priority') as 'low' | 'medium' | 'high' | 'critical';
    const mediaFiles = formData.getAll('mediaFiles') as File[];
    
    // Extract coordinates if available
    const latitude = formData.get('latitude') as string;
    const longitude = formData.get('longitude') as string;
    
    // Extract wallet address if available
    const walletAddress = formData.get('walletAddress') as string;
    
    // Extract AI analysis results if available
    const aiAnalysisData = formData.get('aiAnalysis') as string;
    
    console.log('🔍 Debug: AI Analysis data received:', aiAnalysisData);
    
    // Validate required fields
    if (!location || !description || !category || !priority || mediaFiles.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate file types
    const validImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    const validVideoTypes = ['video/mp4', 'video/avi', 'video/mov', 'video/wmv'];
    
    for (const file of mediaFiles) {
      if (!validImageTypes.includes(file.type) && !validVideoTypes.includes(file.type)) {
        return NextResponse.json(
          { error: 'Invalid file type. Only images and videos are allowed.' },
          { status: 400 }
        );
      }
      
      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        return NextResponse.json(
          { error: 'File size too large. Maximum size is 10MB.' },
          { status: 400 }
        );
      }
    }

    // Upload images to Cloudinary (or fallback to base64)
    let mediaUrls: string[] = [];
    try {
      console.log('🔍 Debug: Attempting to upload images...');
      
      // Try Cloudinary first
      try {
        const uploadResults = await cloudinaryService.uploadMultipleImages(mediaFiles, 'crime-reports');
        mediaUrls = uploadResults.map(result => result.secure_url);
        console.log('✅ Debug: Images uploaded to Cloudinary successfully:', mediaUrls);
      } catch (cloudinaryError) {
        console.log('⚠️ Debug: Cloudinary upload failed, using base64 fallback:', cloudinaryError instanceof Error ? cloudinaryError.message : 'Unknown error');
        
        // Fallback to base64 storage
        for (const file of mediaFiles) {
          const buffer = await file.arrayBuffer();
          const base64 = Buffer.from(buffer).toString('base64');
          const dataUrl = `data:${file.type};base64,${base64}`;
          mediaUrls.push(dataUrl);
        }
        console.log('✅ Debug: Images stored as base64:', mediaUrls.length, 'files');
      }
    } catch (error) {
      console.error('❌ Debug: Failed to process images:', error);
      return NextResponse.json(
        { 
          error: 'Failed to process images. Please try again.',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 500 }
      );
    }

    // Create crime report request
    const crimeReportRequest: CrimeReportRequest = {
      location,
      description,
      mediaFiles,
      mediaUrls,
      category,
      priority,
      coordinates: latitude && longitude ? {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude)
      } : undefined,
      walletAddress: walletAddress || undefined,
      aiAnalysis: aiAnalysisData ? JSON.parse(aiAnalysisData) : undefined
    };

    // For demonstration, using a mock user ID
    // In production, this would come from authentication
    const userId = 'user_' + Date.now();

    // Submit the report
    const crimeReport = await crimeReportService.submitReport(crimeReportRequest, userId);

    return NextResponse.json({
      success: true,
      report: crimeReport,
      message: 'Crime report submitted successfully! Please sign the transaction with your wallet.'
    });

  } catch (error) {
    console.error('Error submitting crime report:', error);
    return NextResponse.json(
      { error: 'Failed to submit crime report' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const reports = await crimeReportService.getAllReports();
    
    return NextResponse.json({
      success: true,
      reports,
      count: reports.length
    });
  } catch (error) {
    console.error('Error fetching crime reports:', error);
    return NextResponse.json(
      { error: 'Failed to fetch crime reports' },
      { status: 500 }
    );
  }
}
