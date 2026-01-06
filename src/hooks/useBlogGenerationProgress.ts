import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { BlogGenerationStep, GENERATION_STEPS } from '@/types/blog-generation-progress';
import type { RealtimeChannel } from '@supabase/supabase-js';

export function useBlogGenerationProgress(productId: string | null) {
  const [currentStep, setCurrentStep] = useState<BlogGenerationStep | null>(null);
  const [isListening, setIsListening] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const startListening = useCallback(() => {
    if (!productId) return () => {};
    
    const channelName = `blog-generation-${productId}`;
    console.log(`🎧 Starting to listen on channel: ${channelName}`);
    
    const channel = supabase.channel(channelName)
      .on('broadcast', { event: 'progress' }, (payload) => {
        console.log('📡 Received progress update:', payload);
        const step = payload.payload as BlogGenerationStep;
        setCurrentStep(step);
      })
      .subscribe((status) => {
        console.log(`📡 Channel status: ${status}`);
        setIsListening(status === 'SUBSCRIBED');
      });

    channelRef.current = channel;

    return () => {
      console.log(`🔌 Cleaning up channel: ${channelName}`);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      setIsListening(false);
    };
  }, [productId]);

  const reset = useCallback(() => {
    setCurrentStep(null);
  }, []);

  const cleanup = useCallback(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    setIsListening(false);
  }, []);

  return {
    currentStep,
    isListening,
    startListening,
    reset,
    cleanup,
    stepConfig: currentStep ? GENERATION_STEPS[currentStep.step] : null
  };
}
