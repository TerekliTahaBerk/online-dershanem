import { createContext, useContext } from 'react';

export const PreviewReadOnlyContext = createContext(false);
export const usePreviewReadOnly = () => useContext(PreviewReadOnlyContext);
