import WellSelectionModal from "./WellSelectionModal";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Modal from "@mui/material/Modal";
import FilterSelectionModal from "./FilterSelectionModal";
import { FilterContext } from "./FilterContext";
import { DataContext } from "../../FileHandling/DataProvider";
import { debounce } from "lodash";
import { useCallback, useMemo, useState, useEffect, useContext } from "react";
import {
  StaticRatio_Filter,
  DynamicRatio_Filter,
  Div_Filter,
} from "./FilterModels";

export const FilterControls = ({
  wellArrays,
  onFilterUpdate,
  onSelectedWellsUpdate,
}) => {
  const [selectedWells, setSelectedWells] = useState([]);
  const [enabledFilters, setEnabledFilters] = useState([]);
  const [selectedFilters, setSelectedFilters] = useState([]);
  const [highlightedFilters, setHighlightedFilters] = useState([]);
  // const { filters, toggleFilter } = useContext(FilterContext);
  const [open, setOpen] = useState(false);
  // const { selectedFilters, addFilter, removeFilter } = useFilters();
  const [selectedValue, setSelectedValue] = useState("staticRatio");

  const { project, setProject } = useContext(DataContext);

  const modalStyle = {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: "80%",
    maxWidth: 800,
    bgcolor: "background.paper",
    border: "2px solid #000",
    boxShadow: 24,
    display: "flex",
    flexDirection: "column",
    p: 2,
  };

  useEffect(() => {
    console.log("Updated selectedFilters: ", selectedFilters);
  }, [selectedFilters]);

  // Memoize selectedFilters and enabledFilters to avoid unnecessary re-renders
  const memoizedSelectedFilters = useMemo(
    () => selectedFilters,
    [selectedFilters]
  );
  const memoizedEnabledFilters = useMemo(
    () => enabledFilters,
    [enabledFilters]
  );

  // Use callback to prevent recreating debounced function on every render
  const debouncedUpdate = useCallback(
    debounce((filteredData) => {
      onFilterUpdate(filteredData);
    }, 300),
    [onFilterUpdate]
  );

  const updateProjectWells = (filteredWells) => {
    if (project) {
      const updatedProject = {
        ...project,
        plate: {
          ...project.plate,
          experiments: [
            {
              ...project.plate.experiments[0],
              wells: filteredWells,
            },
          ],
        },
      };
      setProject(updatedProject);
    }
  };

  // Memoize handleFilterApply and handleWellSelection to avoid recreating them on each render
  const handleFilterApply = useCallback((selectedFilterNames) => {
    setSelectedFilters(selectedFilterNames);
  }, []);

  const handleWellSelection = useCallback(
    (selectedCells) => {
      const newFilteredArray = wellArrays.filter((well) =>
        selectedCells.some(
          (selectedCell) =>
            well.row === selectedCell.row && well.column === selectedCell.col
        )
      );
      setSelectedWells(newFilteredArray);
      onSelectedWellsUpdate(newFilteredArray);
    },
    [wellArrays, onSelectedWellsUpdate]
  );

  // const handleCheckboxChange = (filter) => {
  //   if (enabledFilters.includes(filter)) {
  //     filter.isEnabled = false;
  //     setEnabledFilters((prevEnabledFilters) =>
  //       prevEnabledFilters.filter((name) => name.id !== filter)
  //     );
  //   } else {
  //     filter.isEnabled = true;
  //     setEnabledFilters((prevEnabledFilters) => [
  //       ...prevEnabledFilters,
  //       filter,
  //     ]);
  //     toggleFilter(filter);
  //   }
  //   console.log(filter);
  //   console.log("enabledFilters: ", enabledFilters);
  // };

  const handleCheckboxChange = (filter) => {
    const updatedFilter = { ...filter, isEnabled: !filter.isEnabled };

    // Update selectedFilters immutably
    const updatedSelectedFilters = selectedFilters.map((f) =>
      f.id === updatedFilter.id ? updatedFilter : f
    );

    setSelectedFilters(updatedSelectedFilters);

    // Update enabledFilters based on isEnabled
    if (updatedFilter.isEnabled) {
      setEnabledFilters((prevEnabledFilters) => [
        ...prevEnabledFilters,
        updatedFilter,
      ]);
    } else {
      setEnabledFilters((prevEnabledFilters) =>
        prevEnabledFilters.filter((f) => f.id !== updatedFilter.id)
      );
    }

    console.log(updatedFilter);
  };

  const handleFilterHighlight = (filterName) => {
    setHighlightedFilters((prevHighlightedFilters) => {
      if (prevHighlightedFilters.includes(filterName)) {
        return prevHighlightedFilters.filter((name) => name !== filterName);
      } else {
        return [...prevHighlightedFilters, filterName];
      }
    });
  };

  const toggleFilter = (filter) => {
    if (filter.isEnabled === true) {
      filter.isEnabled = false;
      console.log(filter);
      return filter;
    } else {
      filter.isEnabled = true;
      console.log(filter);
      return filter;
    }
  };

  const handleRemoveHighlightedFilters = () => {
    if (highlightedFilters.length > 0) {
      highlightedFilters.forEach((filter) => {
        // Deactivate the filter if it is enabled
        if (enabledFilters.includes(filter)) {
          setEnabledFilters((prevEnabledFilters) =>
            prevEnabledFilters.filter((name) => name.id !== filter)
          );
          toggleFilter(filter);
        }

        // Remove the filter from the selected filters
        setSelectedFilters((prevSelectedFilters) =>
          prevSelectedFilters.filter((name) => name.id !== filter)
        );
      });

      // Clear highlighted filters after removing them
      setHighlightedFilters([]);
    }
  };

  const handleChangeFilterOrderUp = () => {};

  const handleChangeFilterOrderDown = () => {};

  const filterSelectedWells = (selectedCells) => {
    const newFilteredArray = wellArrays.filter((well) => {
      return selectedCells.some(
        (selectedCell) =>
          well.row === selectedCell.row && well.column === selectedCell.col
      );
    });
    setSelectedWells(newFilteredArray);
    return selectedWells;
  };

  const handleOpen = () => setOpen(true);

  const handleClose = () => setOpen(false);

  // handle adding new filters to selectedFilters list on modal close
  const handleConfirm = () => {
    setOpen(false);
    // addFilterToList(selectedValue)
    if (selectedValue === "staticRatio") {
      // create instance of static ratio filter
      const newStaticRatioFilter = new StaticRatio_Filter(
        selectedFilters.length
      );
      // append it to filter list
      selectedFilters.push(newStaticRatioFilter);
      console.log(newStaticRatioFilter);
    } else if (selectedValue === "dynamicRatio") {
      // create instance of dynamic ratio filter
      const newDynamicRatioFilter = new DynamicRatio_Filter(
        selectedFilters.length
      );
      // append newDynamicRatioFilter to selectedFilters array
      selectedFilters.push(newDynamicRatioFilter);
      console.log(newDynamicRatioFilter);
    } else if (selectedValue === "divFilter") {
      // create instance of div filter
      const newDivFilter = new Div_Filter(selectedFilters.length);
      // append to selectedFilters array
      selectedFilters.push(newDivFilter);
      console.log(newDivFilter);
    }

    // Apply the list of selected filters
  };

  // handle radio button check in filter selection modal
  const handleRadioCheck = (event) => {
    setSelectedValue(event.target.value);
  };

  return (
    <Box
      sx={{
        padding: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <Typography variant="h5" gutterBottom>
        Filter Controls
      </Typography>
      <div className="filter-selection-buttons">
        {/* <FilterSelectionModal onFilterApply={handleFilterApply} /> */}
        <div>
          <Button onClick={handleOpen}>+</Button>
          <Modal
            open={open}
            onClose={handleClose}
            aria-labelledby="modal-modal-title"
            aria-describedby="modal-modal-description"
          >
            <Box sx={modalStyle}>
              <Typography id="modal-modal-title" variant="h6" component="h2">
                Select Filters
              </Typography>
              <Box
                sx={{
                  marginTop: 2,
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <div className="static-ratio">
                  <input
                    type="radio"
                    id="static-ratio"
                    className="static-ratio-radio"
                    value="staticRatio"
                    name="radio-group-2"
                    checked={selectedValue === "staticRatio"}
                    onChange={handleRadioCheck}
                  />
                  <label htmlFor="static-ratio">Static Ratio</label>
                </div>
                <div className="dynamic-ratio">
                  <input
                    type="radio"
                    id="dynamic-ratio"
                    className="dynamic-ratio-radio"
                    value="dynamicRatio"
                    name="radio-group-2"
                    checked={selectedValue === "dynamicRatio"}
                    onChange={handleRadioCheck}
                  />
                  <label htmlFor="dynamic-ratio">Dynamic Ratio</label>
                </div>
                <div className="div-filter">
                  <input
                    type="radio"
                    id="div-filter"
                    className="div-filter-radio"
                    value="divFilter"
                    name="radio-group-2"
                    checked={selectedValue === "divFilter"}
                    onChange={handleRadioCheck}
                  />
                  <label htmlFor="div-filter">Divide by 2</label>
                </div>
              </Box>
              <Button
                onClick={handleConfirm}
                variant="contained"
                sx={{ marginTop: 2, alignSelf: "flex-end" }}
              >
                Confirm Filter Selection
              </Button>
            </Box>
          </Modal>
        </div>
        <button className="filter-order-button-up">^</button>
        <button className="filter-order-button-down">v</button>
        <button
          className="filter-order-button-remove"
          onClick={handleRemoveHighlightedFilters}
        >
          x
        </button>
        <div>
          <h3>Selected Filters</h3>
          {selectedFilters.length > 0 ? (
            selectedFilters.map((filter) => (
              <div
                key={filter.id}
                style={{
                  backgroundColor: highlightedFilters.includes(filter.id)
                    ? "yellow"
                    : "transparent",
                }}
                // onClick={() => handleFilterHighlight(filter.id)}
              >
                <input
                  type="checkbox"
                  checked={filter.isEnabled || false} // Control filter enabling/disabling
                  onChange={() => handleCheckboxChange(filter)} // Toggle filter state
                />
                <label onClick={() => handleFilterHighlight(filter.id)}>
                  {filter.name}
                </label>
              </div>
            ))
          ) : (
            <Typography variant="body2">No filters selected.</Typography>
          )}
        </div>
      </div>
      <Box sx={{ mb: 0 }}>
        <Button
          variant="contained"
          color="primary"
          onClick={() => {
            setSelectedWells([]);
            onSelectedWellsUpdate([]);
            setEnabledFilters([]); // Clear enabled filters on reset
            onFilterUpdate([]); // Update graph data after reset
          }}
        >
          Reset Filters
        </Button>
      </Box>
      <WellSelectionModal onFilterApply={filterSelectedWells} />
      {/* Additional filter controls or components can be added here */}
    </Box>
  );
};

export default FilterControls;
