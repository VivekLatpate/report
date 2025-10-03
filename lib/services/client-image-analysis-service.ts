"use client";

import { AIAnalysis } from '@/lib/types/crime-report';

export class ClientImageAnalysisService {
  private apiKey: string;

  constructor() {
    // In production, this should come from environment variables
    // For now, we'll use the API key directly
    this.apiKey = 'AIzaSyC7kfChFFqncVELG4AooyD7jBCD1YP2v1s';
  }

  async analyzeImage(file: File, description: string): Promise<AIAnalysis> {
    try {
      // Convert file to base64
      const base64 = await this.fileToBase64(file);
      
      // Call Gemini API
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [
              {
                text: this.createAnalysisPrompt(description)
              },
              {
                inline_data: {
                  mime_type: file.type,
                  data: base64
                }
              }
            ]
          }]
        })
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = await response.json();
      const analysisText = data.candidates[0].content.parts[0].text;
      
      // Parse the JSON response
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Failed to parse AI response');
      }
      
      const analysis = JSON.parse(jsonMatch[0]);
      
      return {
        confidence: analysis.confidence || 0,
        crimeType: analysis.crimeType || 'Unknown',
        severity: (analysis.severity || 'LOW').toUpperCase() as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
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
      console.error('Error analyzing image:', error);
      return this.getDefaultAnalysis();
    }
  }

  private createAnalysisPrompt(description: string): string {
    return `
      Analyze this image and description for potential criminal activity. 
      Provide a detailed analysis including:
      
      Description: ${description}
      
      Please analyze the image and provide:
      1. Crime type classification
      2. Severity level (low/medium/high/critical)
      3. Confidence score (0-100)
      4. Risk factors identified
      5. Recommendations for law enforcement
      6. Extracted entities (people, vehicles, weapons, locations, objects)
      
      Respond in JSON format with the following structure:
      {
        "confidence": number,
        "crimeType": "string",
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
  }

  private async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64 = reader.result as string;
        // Remove data:image/jpeg;base64, prefix
        const base64Data = base64.split(',')[1];
        resolve(base64Data);
      };
      reader.onerror = error => reject(error);
    });
  }

  private getDefaultAnalysis(): AIAnalysis {
    return {
      confidence: 0,
      crimeType: 'Unknown',
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
