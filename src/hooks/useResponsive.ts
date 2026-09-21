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
  /** Width available to routed content after persistent desktop chrome. */
  contentWidth: number;
  bp: Breakpoint;
  isXS: boolean;      // < 480
  isSmallDevice: boolean; // < 360 (small Android/iPhone)
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

export interface ResponsiveOptions {
  /** Width of persistent desktop chrome reserved beside routed content. */
  desktopRailWidth?: number;
}

const DEFAULT_DESKTOP_RAIL_WIDTH = 280;

export function useResponsive(
  { desktopRailWidth = DEFAULT_DESKTOP_RAIL_WIDTH }: ResponsiveOptions = {}
): ResponsiveInfo {
  const { width, height } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';

  const bp: Breakpoint =
    width < 480 ? 'xs' :
    width < 768 ? 'sm' :
    width < 1024 ? 'md' :
    width < 1280 ? 'lg' : 'xl';

  const isSmallDevice = width < 360;
  const isXS = bp === 'xs';
  const isSM = bp === 'sm';
  const isMD = bp === 'md';
  const isLG = bp === 'lg';
  const isXL = bp === 'xl';
  const isMobile = isXS || isSM;
  const isTablet = isMD;
  const isDesktop = isLG || isXL;

  // Tab routes reserve the default persistent navigation rail. Top-level routes
  // without that chrome can opt out explicitly with { desktopRailWidth: 0 }.
  const contentWidth = isDesktop ? Math.max(width - Math.max(desktopRailWidth, 0), 0) : width;
  const maxContentWidth = Math.min(contentWidth, 1440);

  // Horizontal page padding
  const pagePad = isSmallDevice ? 10 : isXS ? 12 : isSM ? 16 : isMD ? 24 : 32;

  // Grid card gap
  const cardGap = isSmallDevice ? 8 : isXS ? 10 : isSM ? 12 : isMD ? 16 : 20;

  // Responsive column counts for search/favorites
  const numCols =
    width < 500 ? 2 :
    width < 768 ? 3 :
    width < 1024 ? 4 :
    width < 1440 ? 5 : 6;

  // Compute width for cards within maxContentWidth
  const effectiveWidth = Math.min(contentWidth, maxContentWidth);
  const cardWidth = Math.floor(
    (effectiveWidth - pagePad * 2 - cardGap * (numCols - 1)) / numCols
  );

  // Sizing for horizontal scrolling media rails
  const railCardWidth =
    isSmallDevice ? 120 :
    isXS ? 135 :
    isSM ? 150 :
    isMD ? 175 :
    isLG ? 195 : 215;

  const railCardHeight = Math.round(railCardWidth * 1.45);

  const rankedCardWidth = railCardWidth;
  const rankedCardHeight = railCardHeight;

  // Sizing for hero banner
  const heroHeight =
    isSmallDevice ? 360 :
    isXS ? 390 :
    isSM ? 430 :
    isMD ? 490 :
    isLG ? 540 : 580;

  return {
    width,
    height,
    contentWidth,
    bp,
    isXS,
    isSmallDevice,
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
