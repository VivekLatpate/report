import { GoogleGenerativeAI } from '@google/generative-ai';
import { AIAnalysis } from '../types/crime-report';

export class GeminiService {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is required');
    }
    
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  }

  async analyzeImage(imageData: string, description: string): Promise<AIAnalysis> {
    try {
      const prompt = `
        Analyze this image and description for potential criminal activity. 
        Provide a detailed analysis including:
        
        Description: ${description}
        
        Please analyze the image and provide:
        1. Crime category classification (MUST be one of these exact values):
           - SEXUAL_VIOLENCE
           - DOMESTIC_VIOLENCE
           - STREET_CRIMES
           - MOB_VIOLENCE_LYNCHING
           - ROAD_RAGE_INCIDENTS
           - CYBERCRIMES
           - DRUG
        2. Severity level (low/medium/high/critical)
        3. Confidence score (0-100)
        4. Risk factors identified
        5. Recommendations for law enforcement
        6. Extracted entities (people, vehicles, weapons, locations, objects)
        
        IMPORTANT: The crimeType field MUST be exactly one of the 7 categories listed above.
        
        Respond in JSON format with the following structure:
        {
          "confidence": number,
          "crimeType": "SEXUAL_VIOLENCE|DOMESTIC_VIOLENCE|STREET_CRIMES|MOB_VIOLENCE_LYNCHING|ROAD_RAGE_INCIDENTS|CYBERCRIMES|DRUG",
          "severity": "low|medium|high|critical",
          "description": "string",
          "riskFactors": ["string"],
          "recommendations": ["string"],
          "extractedEntities": {
            "people": ["string"],
            "vehicles": ["string"],
            "weapons": ["string"],
            "locations": ["string"],
            "objects": ["string"]
          }
        }
      `;

      const imagePart = {
        inlineData: {
          data: imageData,
          mimeType: 'image/jpeg'
        }
      };

      const result = await this.model.generateContent([prompt, imagePart]);
      const response = await result.response;
      const text = response.text();
      
      // Extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Failed to parse AI response');
      }
      
      const analysis = JSON.parse(jsonMatch[0]);
      console.log(analysis);
      
      return {
        confidence: analysis.confidence || 0,
        crimeType: analysis.crimeType || 'Unknown',
        severity: (analysis.severity || 'LOW').toUpperCase(),
        description: analysis.description || 'No description available',
        riskFactors: analysis.riskFactors || [],
        recommendations: analysis.recommendations || [],
        extractedEntities: {
          people: analysis.extractedEntities?.people || [],
          vehicles: analysis.extractedEntities?.vehicles || [],
          weapons: analysis.extractedEntities?.weapons || [],
          locations: analysis.extractedEntities?.locations || [],
          objects: analysis.extractedEntities?.objects || []
        }
      };
    } catch (error) {
      console.error('Error analyzing image with Gemini:', error);
      return this.getDefaultAnalysis();
    }
  }

  async analyzeVideo(videoData: string, description: string): Promise<AIAnalysis> {
    try {
      const prompt = `
        Analyze this video and description for potential criminal activity.
        Since this is a video, focus on temporal patterns and movement.
        
        Description: ${description}
        
        Please analyze the video and provide:
        1. Crime category classification (MUST be one of these exact values):
           - SEXUAL_VIOLENCE
           - DOMESTIC_VIOLENCE
           - STREET_CRIMES
           - MOB_VIOLENCE_LYNCHING
           - ROAD_RAGE_INCIDENTS
           - CYBERCRIMES
           - DRUG
        2. Severity level (low/medium/high/critical)
        3. Confidence score (0-100)
        4. Risk factors identified
        5. Recommendations for law enforcement
        6. Extracted entities (people, vehicles, weapons, locations, objects)
        
        IMPORTANT: The crimeType field MUST be exactly one of the 7 categories listed above.
        
        Respond in JSON format with the following structure:
        {
          "confidence": number,
          "crimeType": "SEXUAL_VIOLENCE|DOMESTIC_VIOLENCE|STREET_CRIMES|MOB_VIOLENCE_LYNCHING|ROAD_RAGE_INCIDENTS|CYBERCRIMES|DRUG",
          "severity": "low|medium|high|critical",
          "description": "string",
          "riskFactors": ["string"],
          "recommendations": ["string"],
          "extractedEntities": {
            "people": ["string"],
            "vehicles": ["string"],
            "weapons": ["string"],
            "locations": ["string"],
            "objects": ["string"]
          }
        }
      `;

      const videoPart = {
        inlineData: {
          data: videoData,
          mimeType: 'video/mp4'
        }
      };

      const result = await this.model.generateContent([prompt, videoPart]);
      const response = await result.response;
      const text = response.text();
      
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Failed to parse AI response');
      }
      
      const analysis = JSON.parse(jsonMatch[0]);
      console.log(analysis);
      
      return {
        confidence: analysis.confidence || 0,
        crimeType: analysis.crimeType || 'Unknown',
        severity: (analysis.severity || 'LOW').toUpperCase(),
        description: analysis.description || 'No description available',
        riskFactors: analysis.riskFactors || [],
        recommendations: analysis.recommendations || [],
        extractedEntities: {
          people: analysis.extractedEntities?.people || [],
          vehicles: analysis.extractedEntities?.vehicles || [],
          weapons: analysis.extractedEntities?.weapons || [],
          locations: analysis.extractedEntities?.locations || [],
          objects: analysis.extractedEntities?.objects || []
        }
      };
    } catch (error) {
      console.error('Error analyzing video with Gemini:', error);
      return this.getDefaultAnalysis();
    }
  }

  private getDefaultAnalysis(): AIAnalysis {
    return {
      confidence: 0,
      crimeType: 'STREET_CRIMES',
      severity: 'LOW',
      description: 'Analysis failed - manual review required',
      riskFactors: ['Manual review needed'],
      recommendations: ['Requires human verification'],
      extractedEntities: {
        people: [],
        vehicles: [],
        weapons: [],
        locations: [],
        objects: []
      }
    };
  }
}
