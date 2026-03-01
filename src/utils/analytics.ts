/**
 * Send an event to Google Analytics 4
 * @param eventName Name of the event, e.g., 'validate_code', 'upload_file'
 * @param params Additional parameters for the event
 */
export const trackEvent = (eventName: string, params?: Record<string, any>) => {
    if (typeof window !== 'undefined' && typeof (window as any).gtag === 'function') {
        (window as any).gtag('event', eventName, params);
    } else {
        // Fallback or dev log
        console.debug(`[Analytics] ${eventName}`, params);
    }
};
