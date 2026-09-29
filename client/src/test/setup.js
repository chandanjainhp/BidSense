import '@testing-library/jest-dom/vitest';

// jsdom lacks matchMedia used by some style logic
if (typeof window !== 'undefined' && !window.matchMedia) {
    window.matchMedia = (query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => {},
    });
}

window.scrollTo = window.scrollTo || (() => {});
