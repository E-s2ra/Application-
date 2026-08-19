/**
 * useResponsive — dynamic breakpoints & sizing powered by useWindowDimensions()
 *
 * Provides reactive dimensions, breakpoints, grid calculations, rail sizing,
 * and container widths across all devices:
 *   xs  < 480    (small phone)
 *   sm  480–767  (standard phone / phablet)
 *   md  768–1023 (tablet portrait / small laptop)
 *   lg  1024–1279 (desktop / tablet landscape)
 *   xl  1280+    (wide desktop / cinema display)
 */
import { useWindowDimensions, Platform } from 'react-native';

export type Breakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface ResponsiveInfo {
  width: number;
  height: number;
  bp: Breakpoint;
  isXS: boolean;      // < 480
  isSM: boolean;      // 480-767
  isMD: boolean;      // 768-1023
  isLG: boolean;      // 1024-1279
  isXL: boolean;      // 1280+
  isMobile: boolean;  // < 768
  isTablet: boolean;  // 768-1023
  isDesktop: boolean; // 1024+
  isWeb: boolean;

  /** Number of grid columns for Search & Favorites grids (2 / 3 / 4 / 5 / 6) */
  numCols: number;
  /** Exact computed card width for grids */
  cardWidth: number;
  /** Gap between grid cards */
  cardGap: number;
  /** Page horizontal padding */
  pagePad: number;
  /** Max content width for container centering on wide screens */
  maxContentWidth: number;

  /** Card dimensions for horizontal rails on Home / Watch */
  railCardWidth: number;
  railCardHeight: number;
  rankedCardWidth: number;
  rankedCardHeight: number;

  /** Hero banner height */
  heroHeight: number;
}

export function useResponsive(): ResponsiveInfo {
  const { width, height } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';

  const bp: Breakpoint =
    width < 480 ? 'xs' :
    width < 768 ? 'sm' :
    width < 1024 ? 'md' :
    width < 1280 ? 'lg' : 'xl';

  const isXS = bp === 'xs';
  const isSM = bp === 'sm';
  const isMD = bp === 'md';
  const isLG = bp === 'lg';
  const isXL = bp === 'xl';
  const isMobile = isXS || isSM;
  const isTablet = isMD;
  const isDesktop = isLG || isXL;

  // Max content width for centered desktop layouts
  const maxContentWidth = Math.min(width, 1400);

  // Horizontal page padding
  const pagePad = isXS ? 12 : isSM ? 16 : isMD ? 24 : 32;

  // Grid card gap
  const cardGap = isXS ? 10 : isSM ? 12 : isMD ? 16 : 20;

  // Responsive column counts for search/favorites
  const numCols =
    width < 500 ? 2 :
    width < 768 ? 3 :
    width < 1024 ? 4 :
    width < 1440 ? 5 : 6;

  // Compute width for cards within maxContentWidth
  const effectiveWidth = Math.min(width, maxContentWidth);
  const cardWidth = Math.floor(
    (effectiveWidth - pagePad * 2 - cardGap * (numCols - 1)) / numCols
  );

  // Sizing for horizontal scrolling media rails
  const railCardWidth =
    isXS ? 135 :
    isSM ? 150 :
    isMD ? 175 :
    isLG ? 195 : 215;

  const railCardHeight = Math.round(railCardWidth * 1.45);

  const rankedCardWidth = railCardWidth;
  const rankedCardHeight = railCardHeight;

  // Sizing for hero banner
  const heroHeight =
    isXS ? 390 :
    isSM ? 430 :
    isMD ? 490 :
    isLG ? 540 : 580;

  return {
    width,
    height,
    bp,
    isXS,
    isSM,
    isMD,
    isLG,
    isXL,
    isMobile,
    isTablet,
    isDesktop,
    isWeb,
    numCols,
    cardWidth,
    cardGap,
    pagePad,
    maxContentWidth,
    railCardWidth,
    railCardHeight,
    rankedCardWidth,
    rankedCardHeight,
    heroHeight,
  };
}
