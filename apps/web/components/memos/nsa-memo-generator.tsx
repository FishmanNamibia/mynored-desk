"use client";

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface ThroughPerson {
  name: string;
  position: string;
}

interface MemoFormData {
  to: string;
  throughName?: string;
  throughPosition?: string;
  fromName: string;
  fromTitle: string;
  date: string;
  subject: string;
  purpose: string;
  financialImplication?: string;
  recommendation: string;
}

interface NSAMemoGeneratorProps {
  onSuccess?: (filename: string) => void;
  initialData?: Partial<MemoFormData>;
}

export function NSAMemoGenerator({ onSuccess, initialData }: NSAMemoGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<MemoFormData>({
    defaultValues: {
      date: new Date().toLocaleDateString('en-GB', { 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
      }).toUpperCase(),
      ...initialData,
    },
  });

  const generateMemo = async (data: MemoFormData) => {
    setIsGenerating(true);
    try {
      console.log('Generating memo through same-origin API route');
      console.log('Request data:', data);
      
      // Transform data to match backend DTO
      const requestData: any = {
        to: data.to,
        fromName: data.fromName,
        fromTitle: data.fromTitle,
        date: data.date,
        subject: data.subject,
        purpose: data.purpose,
        recommendation: data.recommendation,
      };
      
      if (data.financialImplication) {
        requestData.financialImplication = data.financialImplication;
      }
      
      if (data.throughName && data.throughPosition) {
        requestData.through = {
          name: data.throughName,
          position: data.throughPosition,
        };
      }
      
      console.log('Transformed request data:', requestData);
      
      const response = await fetch(`/api/memo-generator/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      console.log('Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Response:', errorText);
        throw new Error(`Failed to generate memo: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('API Success Response:', result);
      
      if (result.success) {
        toast.success('Memo generated successfully!');
        
        // Download the file
        const link = document.createElement('a');
        link.href = result.downloadUrl;
        link.download = result.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        if (onSuccess) {
          onSuccess(result.filename);
        }
      } else {
        throw new Error(result.message || 'Failed to generate memo');
      }
    } catch (error) {
      console.error('Error generating memo:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate memo');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-lg bg-red-100">
            <FileText className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <CardTitle>NORED Memo Generator</CardTitle>
            <CardDescription>
              Generate official NORED memorandum documents with proper formatting
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(generateMemo)} className="space-y-6">
          {/* Routing Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Routing Information</h3>
            
            <div className="space-y-2">
              <Label htmlFor="to">To *</Label>
              <Input
                id="to"
                {...register('to', { required: 'Recipient is required' })}
                placeholder="e.g., Chief Executive Officer"
              />
              {errors.to && (
                <p className="text-sm text-red-600">{errors.to.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Through (Optional)</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Input
                    id="throughName"
                    {...register('throughName')}
                    placeholder="Name (e.g., John Smith)"
                  />
                </div>
                <div className="space-y-2">
                  <Input
                    id="throughPosition"
                    {...register('throughPosition', {
                      validate: (value, formValues) => {
                        if (formValues.throughName && !value) {
                          return 'Position is required when name is provided';
                        }
                        return true;
                      }
                    })}
                    placeholder="Position (e.g., Deputy Director)"
                  />
                  {errors.throughPosition && (
                    <p className="text-sm text-red-600">{errors.throughPosition.message}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fromName">From (Name) *</Label>
                <Input
                  id="fromName"
                  {...register('fromName', { required: 'Sender name is required' })}
                  placeholder="e.g., John Doe"
                />
                {errors.fromName && (
                  <p className="text-sm text-red-600">{errors.fromName.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="fromTitle">From (Title) *</Label>
                <Input
                  id="fromTitle"
                  {...register('fromTitle', { required: 'Sender title is required' })}
                  placeholder="e.g., IT Manager"
                />
                {errors.fromTitle && (
                  <p className="text-sm text-red-600">{errors.fromTitle.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">Date *</Label>
              <Input
                id="date"
                {...register('date', { required: 'Date is required' })}
                placeholder="e.g., 26 JANUARY 2026"
              />
              {errors.date && (
                <p className="text-sm text-red-600">{errors.date.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject">Subject *</Label>
              <Input
                id="subject"
                {...register('subject', { required: 'Subject is required' })}
                placeholder="e.g., REQUEST FOR PURCHASE OF SOFTWARE"
              />
              {errors.subject && (
                <p className="text-sm text-red-600">{errors.subject.message}</p>
              )}
            </div>
          </div>

          {/* Content Sections */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Memo Content</h3>

            <div className="space-y-2">
              <Label htmlFor="purpose">1. Purpose *</Label>
              <Textarea
                id="purpose"
                {...register('purpose', { required: 'Purpose is required' })}
                placeholder="Describe the purpose of this memo..."
                rows={4}
              />
              {errors.purpose && (
                <p className="text-sm text-red-600">{errors.purpose.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="financialImplication">2. Financial Implication (Optional)</Label>
              <Textarea
                id="financialImplication"
                {...register('financialImplication')}
                placeholder="Describe any financial implications..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="recommendation">3. Recommendation *</Label>
              <Textarea
                id="recommendation"
                {...register('recommendation', { required: 'Recommendation is required' })}
                placeholder="Provide your recommendation..."
                rows={4}
              />
              {errors.recommendation && (
                <p className="text-sm text-red-600">{errors.recommendation.message}</p>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex gap-3 pt-4">
            <Button
              type="submit"
              disabled={isGenerating}
              className="flex-1"
              style={{ backgroundColor: '#b91c1c' }}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Generate & Download Memo
                </>
              )}
            </Button>
          </div>

          <p className="text-xs text-gray-500 text-center">
            * Required fields. The memo will be generated in .docx format with NORED branding and an internal memo footer.
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
