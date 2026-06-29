import { createContext, useContext } from "react";

/**
 * NeuralDocsContext — lets any nested control deep-link into the
 * interactive documentation modal without prop-drilling.
 *
 * Provided by NeuralAnalysisModal (which owns the modal's open state);
 * consumed by control panels via `useNeuralDocs()` / <DocsHelpButton>.
 *
 * value: { openDocs(sectionId?) } — opens the docs modal, optionally at
 * a specific section id from neuralDocsContent.js. `openDocs` is null
 * when no provider is present, so consumers can render nothing.
 */
export const NeuralDocsContext = createContext({ openDocs: null });

export const useNeuralDocs = () => useContext(NeuralDocsContext);
