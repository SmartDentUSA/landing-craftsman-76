import { useEffect } from 'react';
import useLandingPages from './useLandingPages';
import { toast } from '@/hooks/use-toast';

export const useBlogStatusMonitor = () => {
  const landingPages = useLandingPages((state) => state.landingPages);

  useEffect(() => {
    // Monitor for status changes to approved
    const approvedPages = landingPages.filter(lp => lp.status === 'approved');
    const draftPages = landingPages.filter(lp => lp.status === 'draft');
    
    // Show notifications for new approvals
    // This would be enhanced with proper state tracking in a real implementation
    
  }, [landingPages]);

  const getConsolidatedBlogs = () => {
    return landingPages.filter(lp => lp.status === 'approved');
  };

  const getApprovedBlogsCount = () => {
    return getConsolidatedBlogs().length;
  };

  return {
    consolidatedBlogs: getConsolidatedBlogs(),
    approvedBlogsCount: getApprovedBlogsCount(),
  };
};