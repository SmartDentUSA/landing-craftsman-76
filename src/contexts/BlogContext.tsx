import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { BlogData } from '@/hooks/useBlogData';
import { useBlogGenerator, BlogVersion, DualBlogVersions } from '@/hooks/useBlogGenerator';
import { useIntelligentGeneration } from '@/hooks/useIntelligentGeneration';

interface BlogState {
  currentBlog: BlogData | null;
  isGenerating: boolean;
  isPublishing: boolean;
  isSaving: boolean;
  lastGenerated: BlogVersion | DualBlogVersions | null;
  selectedLandingPageId: string | null;
  activeTab: 'editor' | 'preview' | 'auto-generation' | 'status';
}

type BlogAction =
  | { type: 'SET_CURRENT_BLOG'; payload: BlogData | null }
  | { type: 'SET_GENERATING'; payload: boolean }
  | { type: 'SET_PUBLISHING'; payload: boolean }
  | { type: 'SET_SAVING'; payload: boolean }
  | { type: 'SET_LAST_GENERATED'; payload: BlogVersion | DualBlogVersions | null }
  | { type: 'SET_SELECTED_LANDING_PAGE'; payload: string | null }
  | { type: 'SET_ACTIVE_TAB'; payload: 'editor' | 'preview' | 'auto-generation' | 'status' };

interface BlogContextType extends BlogState {
  dispatch: React.Dispatch<BlogAction>;
  generateBlog: (options: any) => Promise<any>;
  saveBlog: (data: Partial<BlogData>) => Promise<void>;
  publishBlog: (domains: string[]) => Promise<void>;
  intelligentGeneration: ReturnType<typeof useIntelligentGeneration>;
}

const BlogContext = createContext<BlogContextType | undefined>(undefined);

const blogReducer = (state: BlogState, action: BlogAction): BlogState => {
  switch (action.type) {
    case 'SET_CURRENT_BLOG':
      return { ...state, currentBlog: action.payload };
    case 'SET_GENERATING':
      return { ...state, isGenerating: action.payload };
    case 'SET_PUBLISHING':
      return { ...state, isPublishing: action.payload };
    case 'SET_SAVING':
      return { ...state, isSaving: action.payload };
    case 'SET_LAST_GENERATED':
      return { ...state, lastGenerated: action.payload };
    case 'SET_SELECTED_LANDING_PAGE':
      return { ...state, selectedLandingPageId: action.payload };
    case 'SET_ACTIVE_TAB':
      return { ...state, activeTab: action.payload };
    default:
      return state;
  }
};

const initialState: BlogState = {
  currentBlog: null,
  isGenerating: false,
  isPublishing: false,
  isSaving: false,
  lastGenerated: null,
  selectedLandingPageId: null,
  activeTab: 'editor',
};

export function BlogProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(blogReducer, initialState);
  const blogGenerator = useBlogGenerator();
  const intelligentGeneration = useIntelligentGeneration();

  const generateBlog = async (options: any) => {
    dispatch({ type: 'SET_GENERATING', payload: true });
    try {
      const result = await blogGenerator.generateBlog(options);
      dispatch({ type: 'SET_LAST_GENERATED', payload: result });
      return result;
    } finally {
      dispatch({ type: 'SET_GENERATING', payload: false });
    }
  };

  const saveBlog = async (data: Partial<BlogData>) => {
    dispatch({ type: 'SET_SAVING', payload: true });
    try {
      // Implementation for saving blog
      console.log('Saving blog:', data);
    } finally {
      dispatch({ type: 'SET_SAVING', payload: false });
    }
  };

  const publishBlog = async (domains: string[]) => {
    dispatch({ type: 'SET_PUBLISHING', payload: true });
    try {
      // Implementation for publishing blog
      console.log('Publishing blog to domains:', domains);
    } finally {
      dispatch({ type: 'SET_PUBLISHING', payload: false });
    }
  };

  return (
    <BlogContext.Provider value={{
      ...state,
      dispatch,
      generateBlog,
      saveBlog,
      publishBlog,
      intelligentGeneration,
    }}>
      {children}
    </BlogContext.Provider>
  );
}

export function useBlogContext() {
  const context = useContext(BlogContext);
  if (context === undefined) {
    throw new Error('useBlogContext must be used within a BlogProvider');
  }
  return context;
}