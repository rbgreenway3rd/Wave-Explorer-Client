# Neural Analysis Controls - Component Refactoring Plan

## Overview
This document outlines the complete implementation plan for refactoring Chart Controls and Neural Controls into reusable, professionally styled components.

## Progress Status

### ✅ Completed
1. **Design System Created** - `styles/controlsTheme.js`
   - Color palette for scientific UI
   - Spacing system (8px grid)
   - Typography definitions
   - Shadow and border radius values
   - Helper functions for consistent styling

2. **Controls Directory Structure** - `controls/` directory created

3. **NoiseSuppressionControls** - `controls/NoiseSuppressionControls.jsx`
   - ON/OFF toggle
   - Preprocessing method switches
   - Control well selector integration
   - Professional styling with theme

4. **ROIControls** - `controls/ROIControls.jsx`
   - Eliminates duplication between ChartControls and NeuralControls
   - ROI definition/editing/deletion
   - Color-coded visualization
   - Active state feedback

### 🔄 In Progress
5. **Remaining Components to Extract**

### ⏳ Not Started
6. **Parent Component Refactoring**
7. **Testing and Validation**

---

## Remaining Components to Create

### 1. PanZoomControls.jsx
**Purpose**: Manage pan/zoom and ROI definition toggles

**Features**:
- Enable Pan/Zoom toggle switch
- Define ROI toggle switch
- Reset Zoom button
- Grouped in a Paper component

**Props**:
```javascript
{
  defineROI,
  setDefineROI,
  enablePanZoom,
  setEnablePanZoom,
  zoomState,
  setZoomState,
  panState,
  setPanState,
  resetZoom,
}
```

**Styling**:
- Use FormControlLabel with Switch
- Reset Zoom as secondary button
- Clear section header

---

### 2. ReportGenerationControls.jsx
**Purpose**: Buttons for generating CSV reports

**Features**:
- Single-well report button (green/success)
- Full-plate report button (blue/primary)
- Disabled states when no data
- Tooltips explaining requirements

**Props**:
```javascript
{
  selectedWell,
  peakResults,
  wellArrays,
  handleGenerateReport,
  handleGenerateFullPlateReport,
}
```

**Styling**:
- Side-by-side button layout
- Success color for single-well
- Primary color for full-plate
- Prominent call-to-action styling

---

### 3. SpikeDetectionControls.jsx (Optional - for NeuralControls)
**Purpose**: Parameter inputs and detection triggers

**Features**:
- Prominence input with suggest button
- Window input with suggest button
- Min distance input
- Run Spike Detection button
- Run Burst Detection button

**Props**:
```javascript
{
  spikeProminence,
  setSpikeProminence,
  spikeWindow,
  setSpikeWindow,
  spikeMinDistance,
  setSpikeMinDistance,
  processedSignal,
  handleSuggestProminence,
  handleSuggestWindow,
  handleRunSpikeDetection,
  handleRunBurstDetection,
}
```

**Styling**:
- Grouped parameter inputs
- Suggest buttons inline with inputs
- Action buttons with distinct colors
- Clear labels and tooltips

---

## Parent Component Refactoring

### ChartControls.js Updates

**Current Structure**:
- Inline noise suppression controls
- Inline ROI controls
- Inline pan/zoom controls
- Report generation buttons
- Modal management

**New Structure**:
```javascript
import NoiseSuppressionControls from './controls/NoiseSuppressionControls';
import ROIControls from './controls/ROIControls';
import PanZoomControls from './controls/PanZoomControls';
import ReportGenerationControls from './controls/ReportGenerationControls';
import DecimationControls from './controls/DecimationControls';

const ChartControls = (props) => {
  // Keep: modal state, handler functions
  // Remove: inline control implementations

  return (
    <Box className="chart-controls">
      <NoiseSuppressionControls {...noiseProps} />
      <PanZoomControls {...panZoomProps} />
      <ROIControls {...roiProps} />
      <ReportGenerationControls {...reportProps} />
      <DecimationControls {...decimationProps} />
      
      {/* Modals stay here */}
      <NeuralReportModal {...modalProps} />
      <NeuralFullPlateReportModal {...fullPlateModalProps} />
    </Box>
  );
};
```

**Benefits**:
- Cleaner, more maintainable code
- Clear component boundaries
- Easier to test individual components
- Consistent styling across all controls

---

### NeuralControls.js Updates

**Current Structure**:
- Inline spike detection controls
- Inline burst detection controls
- Duplicate ROI controls

**New Structure**:
```javascript
import ROIControls from './controls/ROIControls';
import SpikeDetectionControls from './controls/SpikeDetectionControls';

const NoiseFilterControls = (props) => {
  // Keep: handler functions
  // Remove: inline implementations, duplicate ROI logic

  return (
    <Box className="neural-controls-container">
      <SpikeDetectionControls {...spikeProps} />
      <ROIControls {...roiProps} />  {/* No more duplication! */}
    </Box>
  );
};
```

---

## CSS File Updates

### ChartControls.css
**Current**: Contains styles for inline controls
**New**: Only container-level styles

```css
.chart-controls {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
```

### NeuralControls.css
**Current**: Contains styles for inline controls
**New**: Only container-level styles

```css
.neural-controls-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
```

---

## Testing Checklist

### Component-Level Testing
- [ ] NoiseSuppressionControls
  - [ ] ON/OFF toggle works
  - [ ] Each switch toggles correctly
  - [ ] Control well selection works
  - [ ] Visual feedback for active states
  
- [ ] ROIControls
  - [ ] Define new ROI
  - [ ] Edit existing ROI
  - [ ] Delete ROI
  - [ ] Color coding works
  - [ ] Active state feedback
  
- [ ] PanZoomControls
  - [ ] Pan/Zoom toggle works
  - [ ] Define ROI toggle works
  - [ ] Reset Zoom button works
  - [ ] Mutual exclusivity (if needed)
  
- [ ] ReportGenerationControls
  - [ ] Single-well button works
  - [ ] Full-plate button works
  - [ ] Disabled states correct
  - [ ] Modals open correctly

### Integration Testing
- [ ] ChartControls renders all components
- [ ] NeuralControls renders all components
- [ ] No duplicate ROI logic
- [ ] Props flow correctly
- [ ] Styling is consistent
- [ ] No visual regressions

### Functional Testing
- [ ] All existing functionality preserved
- [ ] Spike detection works
- [ ] Burst detection works
- [ ] ROI definition works
- [ ] Report generation works
- [ ] Control well selection works

---

## Style Consistency Checklist

- [ ] All components use controlsTheme
- [ ] Consistent spacing (8px grid)
- [ ] Consistent colors (primary, secondary, success, etc.)
- [ ] Consistent typography
- [ ] Consistent border radius
- [ ] Consistent shadows
- [ ] Consistent transitions
- [ ] Consistent hover states
- [ ] Consistent disabled states
- [ ] Consistent focus states (accessibility)

---

## File Structure After Completion

```
components/NeuralAnalysis/subComponents/NeuralGraph/
├── ChartControls.js (refactored)
├── NeuralControls.js (refactored)
├── controls/
│   ├── NoiseSuppressionControls.jsx ✅
│   ├── NoiseSuppressionControls.css ✅
│   ├── ROIControls.jsx ✅
│   ├── ROIControls.css ✅
│   ├── PanZoomControls.jsx ⏳
│   ├── PanZoomControls.css ⏳
│   ├── ReportGenerationControls.jsx ⏳
│   ├── ReportGenerationControls.css ⏳
│   ├── SpikeDetectionControls.jsx ⏳ (optional)
│   ├── SpikeDetectionControls.css ⏳ (optional)
│   └── DecimationControls.js (already exists)
└── styles/
    ├── controlsTheme.js ✅
    ├── ChartControls.css (to be updated)
    └── NeuralControls.css (to be updated)
```

---

## Next Steps

1. **Create PanZoomControls** component
2. **Create ReportGenerationControls** component
3. **Optionally create SpikeDetectionControls** component
4. **Refactor ChartControls.js** to use new components
5. **Refactor NeuralControls.js** to use new components
6. **Update CSS files** to remove obsolete styles
7. **Test all functionality** end-to-end
8. **Verify styling consistency** across all components

---

## Benefits Summary

✅ **No Code Duplication** - ROI logic exists once  
✅ **Consistent Styling** - All components use same theme  
✅ **Easier Maintenance** - Changes in one place  
✅ **Better Organization** - Clear component responsibilities  
✅ **Professional Appearance** - Unified design system  
✅ **Reusable Components** - Use across different views  
✅ **Better Testing** - Test components in isolation  
✅ **Clearer Props** - Well-defined interfaces  

---

## Design Principles

1. **Scientific UI Standards**
   - Clear visual hierarchy
   - Professional color palette
   - Readable typography
   - Consistent spacing

2. **Accessibility**
   - Keyboard navigation
   - Focus indicators
   - ARIA labels where needed
   - Sufficient color contrast

3. **Responsiveness**
   - Flexible layouts
   - Appropriate breakpoints
   - Touch-friendly sizes

4. **Performance**
   - Minimal re-renders
   - Optimized animations
   - Efficient event handlers

---

**Status**: Implementation in progress  
**Last Updated**: October 29, 2025
