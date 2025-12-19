// navigation/RootNavigation.js
import { createNavigationContainerRef } from '@react-navigation/native';

// A global ref for navigation
export const navigationRef = createNavigationContainerRef();

/**
 * Navigate globally without navigation prop
 * @param {string} name - Screen name
 * @param {object} params - Params to send to the screen
 */
export function navigate(name, params) {
  if (navigationRef.isReady()) {
    navigationRef.navigate(name, params);
  } else {
    console.log(`[RootNavigation] Navigation not ready, cannot go to ${name}`);
  }
}
