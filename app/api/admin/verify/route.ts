import { NextRequest, NextResponse } from 'next/server';
import { CrimeReportService } from '@/lib/services/crime-report-service';
import { SolanaService } from '@/lib/services/solana-service';
import { PhantomWalletService } from '@/lib/services/phantom-wallet-service';

const crimeReportService = new CrimeReportService();
const solanaService = new SolanaService();
const phantomWalletService = new PhantomWalletService();

export async function POST(request: NextRequest) {
  try {
    const { reportId, adminId, isVerified, notes } = await request.json();
    
    // Validate required fields
    if (!reportId || !adminId || typeof isVerified !== 'boolean') {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify the report
    const updatedReport = await crimeReportService.verifyReport(
      reportId,
      adminId,
      isVerified,
      notes || ''
    );

    if (!updatedReport) {
      return NextResponse.json(
        { error: 'Report not found' },
        { status: 404 }
      );
    }

    // Send Solana reward if report is verified and has wallet address
    let rewardResult = null;
    if (isVerified && updatedReport.walletAddress) {
      try {
        const rewardAmount = solanaService.generateRewardAmount();
        
        // Send actual SOL transaction
        const transactionResult = await phantomWalletService.sendRewardTransaction(
          updatedReport.walletAddress, 
          rewardAmount
        );
        
        if (transactionResult.success) {
          rewardResult = {
            amount: rewardAmount,
            recipient: updatedReport.walletAddress,
            transactionId: transactionResult.signature,
            explorerUrl: transactionResult.explorerUrl,
            status: 'completed'
          };
          
          // Store reward in database
          await crimeReportService.createReward(updatedReport.id, updatedReport.walletAddress, rewardAmount, transactionResult.signature);
        } else {
          rewardResult = {
            amount: rewardAmount,
            recipient: updatedReport.walletAddress,
            status: 'failed',
            error: transactionResult.error
          };
        }
      } catch (error) {
        console.error('Error sending Solana reward:', error);
        // Don't fail the verification if reward fails
      }
    }

    return NextResponse.json({
      success: true,
      report: updatedReport,
      reward: rewardResult,
      message: `Report ${isVerified ? 'verified' : 'rejected'} successfully${rewardResult ? ` and ${rewardResult.amount} SOL reward sent` : ''}`
    });

  } catch (error) {
    console.error('Error verifying crime report:', error);
    return NextResponse.json(
      { error: 'Failed to verify crime report' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    
    let reports;
    
    if (search) {
      reports = await crimeReportService.searchReports(search);
    } else if (status && status !== 'all') {
      reports = await crimeReportService.getReportsByStatus(status as any);
    } else if (priority && priority !== 'all') {
      reports = await crimeReportService.getReportsByPriority(priority as any);
    } else if (category && category !== 'all') {
      reports = await crimeReportService.getReportsByCategory(category);
    } else {
      reports = await crimeReportService.getAllReports();
    }
    
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
