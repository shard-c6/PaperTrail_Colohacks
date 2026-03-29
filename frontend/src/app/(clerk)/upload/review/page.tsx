"use client";

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { Save, AlertTriangle, ArrowRight, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { useAppStore } from '@/store/useAppStore';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';

export default function ReviewPage() {
  const router = useRouter();
  const { sessionId, extractedFields, templateSchema, user } = useAppStore();
  
  const voiceModeEnabled = user?.voice_mode_enabled || false;
  const voiceAgentEnabled = user?.voice_agent_enabled || false;
  const preferredLang = user?.preferred_language || 'en-IN';
  
  const [activeFieldKey, setActiveFieldKey] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fields, setFields] = useState<any[]>([]);
  const [schemaFields, setSchemaFields] = useState<any[]>([]);
  
  const imageContainerRef = useRef<HTMLDivElement>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  useEffect(() => {
    if (!sessionId) {
      toast.error('Session expired.');
      router.push('/upload');
    } else {
      if (extractedFields) setFields(extractedFields);
      if (templateSchema) setSchemaFields(templateSchema);
      
      if (extractedFields && extractedFields.length > 0) {
        // Initialize form with the OCR values
        const defaultValues = extractedFields.reduce((acc, field) => {
          acc[field.key] = field.value;
          return acc;
        }, {} as Record<string, string>);
        reset(defaultValues);
        
        // TTS Announcement
        if (voiceModeEnabled && 'speechSynthesis' in window) {
          const uncertainFields = extractedFields.filter(f => f.confidence < 0.75);
          let msgText = 'Please review the document.';
          if (uncertainFields.length > 0) {
            msgText = `Please review ${uncertainFields.length} fields with low confidence, such as ${uncertainFields[0].key}.`;
          }
          const msg = new SpeechSynthesisUtterance(msgText);
          msg.lang = preferredLang === 'hi-IN' ? 'hi-IN' : 'en-IN';
          window.speechSynthesis.cancel();
          window.speechSynthesis.speak(msg);
        }
      }
    }
  }, [sessionId, router, extractedFields, templateSchema, reset, voiceModeEnabled, preferredLang]);

  const onSaveDraft = async () => {
    setIsSubmitting(true);
    try {
      await api.post('/pipeline/save-draft', {
        session_id: sessionId,
        fields: fields
      });
      toast.success('Draft saved successfully.');
    } catch (error: any) {
      toast.error('Failed to save draft.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const onSubmit = async (data: Record<string, string>) => {
    setIsSubmitting(true);
    try {
      // Map form data back to the payload expected by the backend
      const finalFields = fields.map(f => ({
        ...f,
        value: data[f.key] || f.value 
      }));

      await api.post('/pipeline/submit', {
        session_id: sessionId,
        fields: finalFields
      });
      
      toast.success('Document verified and submitted to records.');
      router.push('/records');
    } catch (error: any) {
      toast.error(error.response?.data?.detail?.message || 'Failed to submit document.');
      setIsSubmitting(false);
    }
  };

  const getBoundingBoxStyle = (box: any) => {
    if (!box) return { display: 'none' };
    return {
      left: `${box.x_min * 100}%`,
      top: `${box.y_min * 100}%`,
      width: `${(box.x_max - box.x_min) * 100}%`,
      height: `${(box.y_max - box.y_min) * 100}%`,
    };
  };

  // Voice Assistant logic
  const [isListening, setIsListening] = useState(false);
  const [agentResponse, setAgentResponse] = useState<string | null>(null);

  const startVoiceAssistant = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast.error("Voice recognition not supported in this browser.");
      return;
    }
    
    // @ts-ignore
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = preferredLang;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setAgentResponse("Listening...");
    };

    recognition.onresult = async (event: any) => {
      const transcript = event.results[0][0].transcript;
      setAgentResponse(`You said: "${transcript}"... Thinking...`);
      setIsListening(false);
      
      try {
         const payload = {
           session_id: sessionId,
           question: transcript,
           language: preferredLang,
           extracted_fields: fields.map(f => ({
             field_id: f.key,
             label: f.key,
             value: f.value,
             confidence: f.confidence,
             uncertain: f.confidence < 0.75,
             bounding_box: f.bounding_box
           }))
         };
         
         const res = await api.post('/voice/agent', payload);
         
         if (res.data?.success && res.data?.data) {
            const answer = res.data.data.answer;
            setAgentResponse(answer);
            
            // Speak the answer
            if (voiceModeEnabled && 'speechSynthesis' in window) {
               const msg = new SpeechSynthesisUtterance(answer);
               msg.lang = preferredLang === 'hi-IN' ? 'hi-IN' : 'en-IN';
               window.speechSynthesis.cancel();
               window.speechSynthesis.speak(msg);
            }

            // Highlight referenced field if any
            if (res.data.data.field_referenced) {
               setActiveFieldKey(res.data.data.field_referenced);
            }
         } else {
            setAgentResponse("Failed to get a clear response from the agent.");
         }
      } catch (err) {
        setAgentResponse("Failed to process voice command.");
      }
    };

    recognition.onerror = () => {
      setIsListening(false);
      setAgentResponse("Microphone error.");
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  return (
    <div className="flex-1 flex flex-col lg:flex-row h-[calc(100vh-64px)] overflow-hidden">
      
      {/* Left Pane: Image & Bounding Boxes */}
      <div className="w-full lg:w-1/2 h-1/2 lg:h-full bg-[var(--color-surface-lowest)] p-4 flex flex-col relative border-b lg:border-b-0 lg:border-r border-[var(--color-ghost-border)]">
        <div className="flex items-center justify-between mb-4 shrink-0">
          <h2 className="text-lg font-bold text-white font-serif">Original Scan</h2>
          <span className="text-xs bg-[var(--color-surface-highest)] text-[var(--color-on-surface-variant)] px-2 py-1 rounded">
            Session: {sessionId?.substring(0, 8)}...
          </span>
        </div>
        
        {/* Render Image with SVG/Div Overlays */}
        <div 
          className="flex-1 relative bg-white/5 rounded-md overflow-hidden flex items-center justify-center p-2"
          ref={imageContainerRef}
        >
          {/* Mock image container - in real app this would be an <img src={cleanedImageUrl} /> */}
          <div className="relative w-full max-w-md aspect-[3/4] bg-white text-black p-4 shadow-xl border border-gray-300 mx-auto">
            {/* Mock document visual content */}
            <div className="h-10 w-full mb-6 border-b-2 border-gray-800">
              <h1 className="text-center font-serif text-xl font-bold">Registration Form</h1>
            </div>
            
            {/* Draw Bounding Boxes */}
            {fields.map((field) => {
              const isActive = activeFieldKey === field.key;
              const isUncertain = field.confidence < 0.75;
              
              return (
                <div
                  key={field.key}
                  className={`absolute border-2 transition-all duration-200 cursor-pointer text-xs
                    ${isActive ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/20 z-10' : 
                      isUncertain ? 'border-[var(--color-warning)] bg-[var(--color-warning)]/10' : 
                      'border-[var(--color-success)]/40 bg-[var(--color-success)]/5 hover:border-[var(--color-primary)]'
                    }`}
                  style={getBoundingBoxStyle(field.bounding_box)}
                  onClick={() => setActiveFieldKey(field.key)}
                >
                  {isActive && <span className="absolute -top-5 left-0 bg-[var(--color-primary)] text-[var(--color-surface)] px-1 rounded-sm whitespace-nowrap font-bold">{field.key} {Math.round(field.confidence * 100)}%</span>}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right Pane: Form & Verification */}
      <div className="w-full lg:w-1/2 h-1/2 lg:h-full bg-[var(--color-bg)] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-[var(--color-ghost-border)] shrink-0">
          <h2 className="text-lg font-bold text-white font-serif flex items-center gap-2">
            Data Verification
          </h2>
          <div className="flex items-center gap-3">
            {voiceAgentEnabled && (
              <Button 
                variant="secondary" 
                size="sm" 
                className={`h-8 ${isListening ? 'bg-[var(--color-error)] border-[var(--color-error)] text-white animate-pulse' : ''}`} 
                onClick={startVoiceAssistant}
              >
                {isListening ? (
                   <span className="w-2 h-2 rounded-full bg-white mr-2" />
                ) : (
                   <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"/></svg>
                )}
                {isListening ? 'Listening...' : 'Voice Assistant'}
              </Button>
            )}
            <Button variant="secondary" size="sm" className="h-8" onClick={onSaveDraft} isLoading={isSubmitting}>
              <Save size={14} className="mr-1" /> Save Draft
            </Button>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar">
          {agentResponse && (
            <div className={`mb-6 p-3 rounded-md text-sm border ${agentResponse.includes('error') ? 'bg-[var(--color-error-container)]/10 border-[var(--color-error)]/50 text-[var(--color-error)]' : 'bg-[var(--color-primary-container)]/10 border-[var(--color-primary)]/50 text-[var(--color-primary)]'}`}>
              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                   <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"/></svg>
                </div>
                <p>{agentResponse}</p>
              </div>
            </div>
          )}

          <div className="mb-6 bg-[var(--color-surface-high)] border border-[var(--color-ghost-border)] rounded-md p-3 text-sm text-[var(--color-on-surface-variant)] flex items-start gap-3">
            <AlertTriangle className="text-[var(--color-warning)] shrink-0 mt-0.5" size={18} />
            <p>Please review fields marked in yellow. Confidence is below the 75% threshold mandated for government records.</p>
          </div>

          <form id="verify-form" onSubmit={handleSubmit(onSubmit)} className="space-y-5 max-w-lg mx-auto pb-20">
            {schemaFields.map((templateField) => {
              const ocrField = fields.find(f => f.key === templateField.key);
              const isUncertain = ocrField ? ocrField.confidence < 0.75 : true;
              const isActive = activeFieldKey === templateField.key;

              return (
                <div 
                  key={templateField.key}
                  className={`relative p-3 rounded-md border transition-colors ${
                    isActive ? 'border-[var(--color-primary)] bg-[var(--color-surface-high)]' : 
                    isUncertain ? 'border-[var(--color-warning)]/50 bg-[var(--color-warning-bg)]/5' : 
                    'border-[var(--color-ghost-border)] bg-[var(--color-surface-lowest)]'
                  }`}
                  onFocus={() => setActiveFieldKey(templateField.key)}
                  onClick={() => setActiveFieldKey(templateField.key)}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-sm font-medium text-[var(--color-on-surface-variant)]">
                      {templateField.label}
                    </label>
                    {ocrField && (
                      <span className={`text-xs px-1.5 py-0.5 rounded ${isUncertain ? 'bg-[var(--color-warning)] text-[var(--color-bg)]' : 'text-[var(--color-on-surface-variant)]'}`}>
                        {Math.round(ocrField.confidence * 100)}% Conf
                      </span>
                    )}
                  </div>
                  
                  <div className="relative">
                    <input
                      {...register(templateField.key)}
                      type={templateField.type}
                      className={`w-full h-10 px-3 rounded text-white outline-none ghost-input
                        ${isActive ? 'bg-[var(--color-surface)] shadow-[0_0_0_1px_var(--color-primary)]' : ''}
                      `}
                    />
                    {isUncertain && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <XCircle size={16} className="text-[var(--color-warning)]" />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </form>
        </div>

        {/* Action Bar Fixed Bottom */}
        <div className="shrink-0 font-sm p-4 bg-[var(--color-surface)] border-t border-[var(--color-ghost-border)] flex items-center justify-between">
          <p className="text-xs text-[var(--color-on-surface-variant)]">Auto-saved 1m ago</p>
          <div className="flex gap-3">
            <Button variant="ghost" onClick={() => router.push('/upload')}>Cancel</Button>
            <Button variant="primary" form="verify-form" type="submit" isLoading={isSubmitting}>
              Submit to Records
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
