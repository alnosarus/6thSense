import { createContext, useContext, useRef } from "react";

const StoryProgressContext = createContext(null);

export function StoryProgressProvider({ children }) {
  const progressRef = useRef(0);
  return (
    <StoryProgressContext.Provider value={progressRef}>
      {children}
    </StoryProgressContext.Provider>
  );
}

export function useStoryProgressRef() {
  const ctx = useContext(StoryProgressContext);
  if (!ctx) {
    throw new Error("useStoryProgressRef must be used within StoryProgressProvider");
  }
  return ctx;
}
