import { createContext, useContext } from 'react';

export type SidebarContextType = {
  openSidebar: () => void;
  closeSidebar: () => void;
};

export const SidebarContext = createContext<SidebarContextType>({
  openSidebar: () => {},
  closeSidebar: () => {},
});

export const useSidebar = () => useContext(SidebarContext);
