"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

export interface SignatureInfo {
  name: string;
  position: string;
  department?: string;
  signatureDate?: string;
  signed?: boolean;
  signatureImgUrl?: string;
}

interface SignatureBlockProps {
  label?: string;
  signatureInfo: SignatureInfo;
  onChange?: (info: SignatureInfo) => void;
  editable?: boolean;
  index?: number;
  showSeparator?: boolean;
}

export function SignatureBlock({
  label,
  signatureInfo,
  onChange,
  editable = true,
  index,
  showSeparator = true
}: SignatureBlockProps) {
  const formattedDate = signatureInfo.signatureDate 
    ? new Date(signatureInfo.signatureDate).toLocaleDateString('en-ZA', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      })
    : '';

  const handleChange = (field: keyof SignatureInfo, value: any) => {
    if (onChange) {
      onChange({
        ...signatureInfo,
        [field]: value,
      });
    }
  };

  const displayLabel = label || (index !== undefined ? `Signature ${index + 1}` : 'Signature');

  return (
    <div className="relative">
      {showSeparator && <Separator className="mb-4" />}
      
      <div className="space-y-3">
        <h4 className="text-xs font-semibold text-gray-700 uppercase">
          {displayLabel}
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Name */}
          <div>
            <Label className="text-xs text-gray-600 mb-1.5 block">Name</Label>
            <Input
              placeholder="Enter name"
              value={signatureInfo.name || ''}
              onChange={(e) => handleChange('name', e.target.value)}
              readOnly={!editable}
              className={`${!editable ? 'bg-gray-50' : 'bg-white'} border-gray-200`}
            />
          </div>
          
          {/* Position */}
          <div>
            <Label className="text-xs text-gray-600 mb-1.5 block">Position</Label>
            <Input
              placeholder="Enter position"
              value={signatureInfo.position || ''}
              onChange={(e) => handleChange('position', e.target.value)}
              readOnly={!editable}
              className={`${!editable ? 'bg-gray-50' : 'bg-white'} border-gray-200`}
            />
          </div>
          
          {/* Department (Optional) */}
          <div>
            <Label className="text-xs text-gray-600 mb-1.5 block">Department (Optional)</Label>
            <Input
              placeholder="Enter department"
              value={signatureInfo.department || ''}
              onChange={(e) => handleChange('department', e.target.value)}
              readOnly={!editable}
              className={`${!editable ? 'bg-gray-50' : 'bg-white'} border-gray-200`}
            />
          </div>
          
          {/* Date */}
          <div>
            <Label className="text-xs text-gray-600 mb-1.5 block">Signature Date</Label>
            <Input
              type="date"
              value={signatureInfo.signatureDate || ''}
              onChange={(e) => handleChange('signatureDate', e.target.value)}
              readOnly={!editable}
              className={`${!editable ? 'bg-gray-50' : 'bg-white'} border-gray-200`}
            />
          </div>
        </div>
        
        {/* Signature Area */}
        <div className="pt-4 mt-2 border-t border-dotted border-gray-300">
          <div className={`h-16 flex items-center justify-center ${signatureInfo.signed ? '' : 'border-2 border-dashed border-gray-200'} rounded`}>
            {signatureInfo.signed ? (
              signatureInfo.signatureImgUrl ? (
                <img 
                  src={signatureInfo.signatureImgUrl} 
                  alt="Signature" 
                  className="max-h-14 max-w-full object-contain" 
                />
              ) : (
                <div className="italic text-blue-700 font-semibold">
                  {signatureInfo.name || 'Signed'}
                </div>
              )
            ) : (
              <span className="text-gray-400 text-sm">Signature will appear here</span>
            )}
          </div>
          {editable && (
            <div className="flex justify-end mt-1">
              <label className="flex items-center text-xs text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={signatureInfo.signed || false}
                  onChange={(e) => handleChange('signed', e.target.checked)}
                  className="mr-1 h-3 w-3"
                />
                Mark as signed
              </label>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
