import { useWindowDimensions } from 'react-native';
import { breakpoints } from '@axiom/shared';

export function useBreakpoint() {
  const { width } = useWindowDimensions();
  return { width, isMobile: width < breakpoints.tablet, isDesktop: width >= breakpoints.desktop, isTablet: width >= breakpoints.tablet && width < breakpoints.desktop };
}
