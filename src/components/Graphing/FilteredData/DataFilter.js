export class DataFilter {
  constructor(
    type,
    name,
    description,
    isEnabled,
    parameters,
    sourceWells,
    destinationWells
  ) {
    this.type = type;
    this.name = name;
    this.description = description;
    this.isEnabled = isEnabled;
    this.parameters = parameters;
    this.sourceWells = sourceWells;
    this.destinationWells = destinationWells;
  }
}

// NOTE: Will need to edit inherited... see other models
