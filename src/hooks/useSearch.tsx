import React, { createContext, useContext, useState } from 'react';
import { supabase } from '../lib/supabase';

interface SearchContextType {
  results: any[];
  search: (query: string) => Promise<void>;
  isSearching: boolean;
}

const SearchContext = createContext<SearchContextType>({
  results: [],
  search: async () => {},
  isSearching: false,
});

export const SearchProvider = ({ children }: { children: React.ReactNode }) => {
  const [results, setResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const search = async (query: string) => {
    if (!query) {
      setResults([]);
      return;
    }
    setIsSearching(true);
    try {
      // Context-aware search: profiles, students, institutions
      const { data: profiles } = await supabase.from('profiles').select('*').ilike('full_name', `%${query}%`).limit(5);
      const { data: students } = await supabase.from('students').select('*').ilike('full_name', `%${query}%`).limit(5);
      
      setResults([...(profiles || []), ...(students || [])]);
    } catch (e) {
      console.error('Search Error:', e);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <SearchContext.Provider value={{ results, search, isSearching }}>
      {children}
    </SearchContext.Provider>
  );
};

export const useSearch = () => useContext(SearchContext);
