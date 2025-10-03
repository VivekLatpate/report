"use client";

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Upload, Camera, Video, MapPin, FileText, AlertTriangle, CheckCircle, Navigation, Loader2, Wallet } from 'lucide-react';
import { SolanaWalletDetector } from '@/components/solana-wallet-detector';
import { toast } from 'sonner';
import { PhantomWalletService } from '@/lib/services/phantom-wallet-service';
import { ClientImageAnalysisService } from '@/lib/services/client-image-analysis-service';
import { AIAnalysis } from '@/lib/types/crime-report';

export default function ReportPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [locationPermission, setLocationPermission] = useState<'granted' | 'denied' | 'prompt' | 'loading'>('prompt');
  const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number; address: string } | null>(null);
  const [formData, setFormData] = useState({
    location: '',
    description: '',
    category: '',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'critical'
  });
  const [walletInfo, setWalletInfo] = useState<{ address: string; balance: number; isValid: boolean; isConnected: boolean } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [imageAnalyses, setImageAnalyses] = useState<AIAnalysis[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const phantomWalletService = new PhantomWalletService();
  const imageAnalysisService = new ClientImageAnalysisService();

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Location handling functions
  const getCurrentLocation = async () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by this browser');
      setLocationPermission('denied');
      return;
    }

    setLocationPermission('loading');
    
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        });
      });

      const { latitude, longitude } = position.coords;
      
      // Get address from coordinates using reverse geocoding
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`
        );
        const data = await response.json();
        const address = data.display_name || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
        
        setCurrentLocation({ latitude, longitude, address });
        setFormData(prev => ({ ...prev, location: address }));
        setLocationPermission('granted');
        toast.success('Location obtained successfully!');
      } catch (error) {
        // Fallback to coordinates if reverse geocoding fails
        const address = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
        setCurrentLocation({ latitude, longitude, address });
        setFormData(prev => ({ ...prev, location: address }));
        setLocationPermission('granted');
        toast.success('Location obtained successfully!');
      }
    } catch (error) {
      console.error('Error getting location:', error);
      if (error instanceof GeolocationPositionError) {
        switch (error.code) {
          case error.PERMISSION_DENIED:
            toast.error('Location permission denied. Please enable location access to submit a report.');
            setLocationPermission('denied');
            break;
          case error.POSITION_UNAVAILABLE:
            toast.error('Location information unavailable. Please try again.');
            setLocationPermission('denied');
            break;
          case error.TIMEOUT:
            toast.error('Location request timed out. Please try again.');
            setLocationPermission('denied');
            break;
          default:
            toast.error('Failed to get location. Please try again.');
            setLocationPermission('denied');
        }
      } else {
        toast.error('Failed to get location. Please try again.');
        setLocationPermission('denied');
      }
    }
  };

  const requestLocationPermission = () => {
    getCurrentLocation();
  };

  // Check location permission on component mount
  useEffect(() => {
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: 'geolocation' }).then((result) => {
        if (result.state === 'granted') {
          setLocationPermission('granted');
          getCurrentLocation();
        } else if (result.state === 'denied') {
          setLocationPermission('denied');
        }
      });
    }
  }, []);

  const crimeCategories = [
    'Theft',
    'Assault',
    'Vandalism',
    'Fraud',
    'Drug-related',
    'Traffic violation',
    'Domestic violence',
    'Cybercrime',
    'Other'
  ];

  const priorityLevels = [
    { value: 'low', label: 'Low', color: 'bg-green-100 text-green-800' },
    { value: 'medium', label: 'Medium', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'high', label: 'High', color: 'bg-orange-100 text-orange-800' },
    { value: 'critical', label: 'Critical', color: 'bg-red-100 text-red-800' }
  ];

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const validFiles = files.filter(file => {
      const isValidType = file.type.startsWith('image/') || file.type.startsWith('video/');
      const isValidSize = file.size <= 10 * 1024 * 1024; // 10MB limit
      
      if (!isValidType) {
        toast.error(`${file.name} is not a valid image or video file`);
      }
      if (!isValidSize) {
        toast.error(`${file.name} is too large. Maximum size is 10MB`);
      }
      
      return isValidType && isValidSize;
    });

    if (validFiles.length > 0) {
      setMediaFiles(prev => [...prev, ...validFiles]);
      createPreviews(validFiles);
      
      // Analyze images immediately
      await analyzeImages(validFiles);
    }
  };

  const createPreviews = (files: File[]) => {
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrls(prev => [...prev, e.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const analyzeImages = async (files: File[]) => {
    setIsAnalyzing(true);
    const analyses: AIAnalysis[] = [];
    
    for (const file of files) {
      if (file.type.startsWith('image/')) {
        try {
          toast.info(`🔍 Analyzing ${file.name}...`);
          const analysis = await imageAnalysisService.analyzeImage(file, formData.description);
          analyses.push(analysis);
          
          console.log(`✅ Analysis complete for ${file.name}:`, analysis);
          toast.success(`Analysis complete for ${file.name} - Confidence: ${analysis.confidence}%`);
          
          // Auto-populate category field with AI crime type
          if (analysis.crimeType && analysis.crimeType !== 'Unknown') {
            setFormData(prev => ({
              ...prev,
              category: analysis.crimeType
            }));
            toast.success(`🏷️ Category auto-set to "${analysis.crimeType}"`);
          }
          
          // Auto-populate description field with AI analysis
          if (analysis.description && analysis.description !== 'No description available') {
            setFormData(prev => ({
              ...prev,
              description: analysis.description
            }));
            toast.success(`📝 Description auto-filled with AI analysis`);
          }
          
          // Auto-set priority based on severity
          const severityToPriority = {
            'LOW': 'low',
            'MEDIUM': 'medium', 
            'HIGH': 'high',
            'CRITICAL': 'critical'
          } as const;
          
          const newPriority = severityToPriority[analysis.severity] || 'medium';
          setFormData(prev => ({
            ...prev,
            priority: newPriority
          }));
          toast.success(`⚡ Priority auto-set to ${newPriority.toUpperCase()} based on AI severity`);
          
        } catch (error) {
          console.error(`❌ Analysis failed for ${file.name}:`, error);
          toast.error(`Analysis failed for ${file.name}`);
          analyses.push({
            confidence: 0,
            crimeType: 'Unknown',
            severity: 'LOW',
            description: 'Analysis failed',
            riskFactors: ['Manual review needed'],
            recommendations: ['Requires human verification'],
            extractedEntities: {
              people: [],
              vehicles: [],
              weapons: [],
              locations: [],
              objects: []
            }
          });
        }
      }
    }
    
    setImageAnalyses(prev => [...prev, ...analyses]);
    setIsAnalyzing(false);
  };

  const removeFile = (index: number) => {
    setMediaFiles(prev => prev.filter((_, i) => i !== index));
    setPreviewUrls(prev => prev.filter((_, i) => i !== index));
    setImageAnalyses(prev => prev.filter((_, i) => i !== index));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (locationPermission !== 'granted') {
      newErrors.location = 'Location permission is required. Please allow location access to submit a report.';
    }
    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }
    if (!formData.category) {
      newErrors.category = 'Category will be automatically detected by AI. Please upload an image first.';
    }
    if (mediaFiles.length === 0) {
      newErrors.mediaFiles = 'At least one photo or video is required';
    }
    if (!walletInfo || !walletInfo.isConnected) {
      newErrors.wallet = 'Phantom wallet connection is required to submit a crime report and sign the transaction.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Please fix the errors in the form');
      return;
    }

    setIsSubmitting(true);

    try {
      const submitData = new FormData();
      submitData.append('location', formData.location);
      submitData.append('description', formData.description);
      submitData.append('category', formData.category);
      submitData.append('priority', formData.priority);
      
      // Add coordinates if available
      if (currentLocation) {
        submitData.append('latitude', currentLocation.latitude.toString());
        submitData.append('longitude', currentLocation.longitude.toString());
      }

      // Add wallet information if available
      if (walletInfo) {
        submitData.append('walletAddress', walletInfo.address);
      }
      
      // Add AI analysis results if available
      if (imageAnalyses.length > 0) {
        // Use the first analysis result (or combine multiple if needed)
        const primaryAnalysis = imageAnalyses[0];
        console.log('🔍 Debug: Sending AI analysis to API:', primaryAnalysis);
        submitData.append('aiAnalysis', JSON.stringify(primaryAnalysis));
      } else {
        console.log('🔍 Debug: No AI analysis data to send');
      }
      
      mediaFiles.forEach(file => {
        submitData.append('mediaFiles', file);
      });

      const response = await fetch('/api/report', {
        method: 'POST',
        body: submitData,
      });

      const result = await response.json();

      if (response.ok) {
        toast.success('Crime report submitted successfully! Now signing transaction with your wallet...');
        
        // Create Solana transaction if wallet is connected
        if (walletInfo && walletInfo.isConnected) {
          try {
            const transactionResult = await phantomWalletService.createCrimeReportTransaction(
              walletInfo.address,
              {
                location: formData.location,
                description: formData.description,
                category: formData.category,
                priority: formData.priority,
                timestamp: new Date().toISOString()
              }
            );
            
            if (transactionResult.success) {
              console.log('✅ Transaction successful!', {
                signature: transactionResult.signature,
                explorerUrl: transactionResult.explorerUrl
              });
              
              toast.success(
                `🎉 Transaction Successfully Signed!`,
                {
                  description: `Hash: ${transactionResult.signature}\n\nYour crime report is now permanently stored on the Solana blockchain!`,
                  duration: 20000,
                  action: {
                    label: "View on Solana Explorer",
                    onClick: () => window.open(transactionResult.explorerUrl, '_blank')
                  }
                }
              );
            } else {
              toast.error(`Transaction failed: ${transactionResult.error}`);
            }
          } catch (error) {
            console.error('Error creating transaction:', error);
            toast.error('Failed to create blockchain transaction. Report submitted but not stored on-chain.');
          }
        } else {
          toast.info('Report submitted successfully! Connect a wallet to store data on blockchain.');
        }
        
        // Wait a moment for the toast to be visible before redirecting
        setTimeout(() => {
          router.push('/');
        }, 3000);
      } else {
        throw new Error(result.error || 'Failed to submit report');
      }
    } catch (error) {
      console.error('Error submitting report:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to submit report');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Report a Crime</h1>
        <p className="text-gray-600">
          Help keep your community safe by reporting suspicious activities or crimes.
          Upload photos or videos along with a detailed description.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Crime Report Form
          </CardTitle>
          <CardDescription>
            Please provide accurate information to help law enforcement respond effectively.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Media Upload Section */}
            <div className="space-y-4">
              <Label htmlFor="mediaFiles" className="text-base font-semibold">
                Upload Photos or Videos
              </Label>
              
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                <input
                  ref={fileInputRef}
                  type="file"
                  id="mediaFiles"
                  multiple
                  accept="image/*,video/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                
                <div className="space-y-4">
                  <div className="flex justify-center space-x-4">
                    <Camera className="h-8 w-8 text-gray-400" />
                    <Video className="h-8 w-8 text-gray-400" />
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-600 mb-2">
                      Drag and drop files here, or click to browse
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      className="mt-2"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Choose Files
                    </Button>
                  </div>
                  
                  <p className="text-xs text-gray-500">
                    Supported formats: JPEG, PNG, GIF, MP4, AVI, MOV, WMV (Max 10MB each)
                  </p>
                </div>
              </div>

              {errors.mediaFiles && (
                <Alert variant="destructive">
                  <AlertDescription>{errors.mediaFiles}</AlertDescription>
                </Alert>
              )}

              {/* Media Previews */}
              {previewUrls.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {previewUrls.map((url, index) => (
                    <div key={index} className="relative group">
                      <div className="aspect-square rounded-lg overflow-hidden border">
                        {mediaFiles[index]?.type.startsWith('image/') ? (
                          <img
                            src={url}
                            alt={`Preview ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <video
                            src={url}
                            className="w-full h-full object-cover"
                            controls
                          />
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => removeFile(index)}
                      >
                        ×
                      </Button>
                      <div className="absolute bottom-2 left-2">
                        <Badge variant="secondary" className="text-xs">
                          {mediaFiles[index]?.type.startsWith('image/') ? 'Photo' : 'Video'}
                        </Badge>
                      </div>
                      {/* AI Analysis Badge */}
                      {imageAnalyses[index] && (
                        <div className="absolute top-2 left-2">
                          <Badge 
                            variant={imageAnalyses[index].confidence > 70 ? "default" : "secondary"}
                            className="text-xs"
                          >
                            AI: {imageAnalyses[index].confidence}%
                          </Badge>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* AI Analysis Results */}
              {imageAnalyses.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-blue-500" />
                    AI Analysis Results
                  </h3>
                  {imageAnalyses.map((analysis, index) => (
                    <Card key={index} className="border-l-4 border-l-blue-500">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Badge variant="outline">Image {index + 1}</Badge>
                          <Badge 
                            variant={analysis.confidence > 70 ? "default" : "secondary"}
                          >
                            Confidence: {analysis.confidence}%
                          </Badge>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-gray-600 mb-2">
                              <strong>Crime Type:</strong> {analysis.crimeType}
                            </p>
                            <p className="text-sm text-gray-600 mb-2">
                              <strong>Severity:</strong> 
                              <Badge 
                                variant={
                                  analysis.severity === 'CRITICAL' ? 'destructive' :
                                  analysis.severity === 'HIGH' ? 'destructive' :
                                  analysis.severity === 'MEDIUM' ? 'secondary' : 'outline'
                                }
                                className="ml-2"
                              >
                                {analysis.severity}
                              </Badge>
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">
                              <strong>AI Analysis:</strong> {analysis.description}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Analysis Loading Indicator */}
              {isAnalyzing && (
                <Alert className="bg-blue-50 border-blue-200">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                  <AlertDescription className="text-blue-800">
                    AI is analyzing your images... This may take a few moments.
                  </AlertDescription>
                </Alert>
              )}
            </div>

            {/* Solana Wallet Detection */}
            <div className="space-y-4">
              <SolanaWalletDetector
                onWalletDetected={(wallet) => setWalletInfo(wallet)}
                onWalletCleared={() => setWalletInfo(null)}
              />
              
              {errors.wallet && (
                <Alert variant="destructive">
                  <AlertDescription>{errors.wallet}</AlertDescription>
                </Alert>
              )}
            </div>

            {/* Location Section */}
            <div className="space-y-4">
              <Label className="text-base font-semibold">
                <MapPin className="h-4 w-4 inline mr-2" />
                Location Permission *
              </Label>
              
              {locationPermission === 'prompt' && (
                <div className="border-2 border-dashed border-blue-300 rounded-lg p-6 text-center bg-blue-50">
                  <Navigation className="h-12 w-12 text-blue-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-blue-900 mb-2">Enable Location Access</h3>
                  <p className="text-blue-700 mb-4">
                    To submit a crime report, we need your current location. This helps law enforcement respond quickly and accurately.
                  </p>
                  <Button
                    type="button"
                    onClick={requestLocationPermission}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Navigation className="h-4 w-4 mr-2" />
                    Allow Location Access
                  </Button>
                </div>
              )}

              {locationPermission === 'loading' && (
                <div className="border-2 border-dashed border-yellow-300 rounded-lg p-6 text-center bg-yellow-50">
                  <Loader2 className="h-12 w-12 text-yellow-500 mx-auto mb-4 animate-spin" />
                  <h3 className="text-lg font-semibold text-yellow-900 mb-2">Getting Your Location</h3>
                  <p className="text-yellow-700">
                    Please wait while we determine your current location...
                  </p>
                </div>
              )}

              {locationPermission === 'granted' && currentLocation && (
                <div className="border-2 border-green-300 rounded-lg p-4 bg-green-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <div>
                        <h4 className="font-semibold text-green-900">Location Obtained</h4>
                        <p className="text-sm text-green-700">{currentLocation.address}</p>
                        <p className="text-xs text-green-600">
                          Coordinates: {currentLocation.latitude.toFixed(6)}, {currentLocation.longitude.toFixed(6)}
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={getCurrentLocation}
                      className="text-green-700 border-green-300 hover:bg-green-100"
                    >
                      <Navigation className="h-4 w-4 mr-2" />
                      Refresh
                    </Button>
                  </div>
                </div>
              )}

              {locationPermission === 'denied' && (
                <div className="border-2 border-red-300 rounded-lg p-6 text-center bg-red-50">
                  <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-red-900 mb-2">Location Access Required</h3>
                  <p className="text-red-700 mb-4">
                    Location permission is required to submit a crime report. Please enable location access in your browser settings.
                  </p>
                  <Button
                    type="button"
                    onClick={requestLocationPermission}
                    variant="outline"
                    className="border-red-300 text-red-700 hover:bg-red-100"
                  >
                    <Navigation className="h-4 w-4 mr-2" />
                    Try Again
                  </Button>
                </div>
              )}

              {errors.location && (
                <Alert variant="destructive">
                  <AlertDescription>{errors.location}</AlertDescription>
                </Alert>
              )}
            </div>

            {/* Form Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              <div className="space-y-2">
                <Label htmlFor="category">
                  <FileText className="h-4 w-4 inline mr-2" />
                  Category * (Auto-set by AI)
                </Label>
                <div className="flex items-center gap-2">
                  <Badge 
                    variant="outline"
                    className="text-sm px-3 py-1"
                  >
                    {formData.category || 'Not detected yet'}
                  </Badge>
                  <span className="text-sm text-gray-600">
                    Set automatically based on AI analysis
                  </span>
                </div>
                {errors.category && (
                  <p className="text-sm text-red-500">{errors.category}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">
                <AlertTriangle className="h-4 w-4 inline mr-2" />
                Priority Level (Auto-set by AI)
              </Label>
              <div className="flex items-center gap-2">
                <Badge 
                  variant={
                    formData.priority === 'critical' ? 'destructive' :
                    formData.priority === 'high' ? 'destructive' :
                    formData.priority === 'medium' ? 'secondary' : 'outline'
                  }
                  className="text-sm"
                >
                  {formData.priority.toUpperCase()}
                </Badge>
                <span className="text-sm text-gray-600">
                  Set automatically based on AI analysis
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">
                <FileText className="h-4 w-4 inline mr-2" />
                Description * (Auto-populated by AI)
              </Label>
              <Textarea
                id="description"
                placeholder="Description will be automatically filled by AI analysis..."
                rows={4}
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className={errors.description ? 'border-red-500' : ''}
              />
              {errors.description && (
                <p className="text-sm text-red-500">{errors.description}</p>
              )}
            </div>

            {/* Submit Button */}
            <div className="flex justify-end space-x-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/')}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || !walletInfo?.isConnected}
                className="min-w-[120px]"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Submitting...
                  </>
                ) : !walletInfo?.isConnected ? (
                  <>
                    <Wallet className="h-4 w-4 mr-2" />
                    Connect Wallet First
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Submit Report
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Information Alert */}
      <Alert className="mt-6">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>Important:</strong> This system uses AI analysis to help process reports, 
          but all reports are reviewed by human administrators. In case of emergency, 
          please contact local law enforcement immediately.
        </AlertDescription>
      </Alert>
    </div>
  );
}
