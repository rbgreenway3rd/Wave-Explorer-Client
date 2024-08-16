export class DataFilter {
  constructor(type, name, desc, isEnabled) {
    this.type = type;
    this.name = name;
    this.desc = desc;
    this.isEnabled = isEnabled;
  }
  editParams() {}
  executeFilter() {}
}

export class TestFilter extends DataFilter {
  constructor(type, name, desc, isEnabled, sourceWells, destWells) {
    super(type, name, desc, isEnabled);
    this.sourceWells = sourceWells;
    this.destWells = destWells;
  }
  executeFilter(data) {
    data.forEach((well) => {
      well.forEach((value) => {
        value = value / 2;
        console.log("filtered: ", value);
        return value;
      });
    });
  }
}

// class Car {
//   constructor(brand) {
//     this.carname = brand;
//   }
//   present() {
//     return "I have a " + this.carname;
//   }
// }

// class Model extends Car {
//   constructor(brand, mod) {
//     super(brand);
//     this.model = mod;
//   }
//   show() {
//     return this.present() + ", it is a " + this.model;
//   }
// }

// let myCar = new Model("Ford", "Mustang");
// document.getElementById("demo").innerHTML = myCar.show();

// class Car {
//   constructor(brand) {
//     this.carname = brand;
//   }
//   get cnam() {
//     return this.carname;
//   }
//   set cnam(x) {
//     this.carname = x;
//   }
// }

// const myCar = new Car("Ford");

// document.getElementById("demo").innerHTML = myCar.cnam;
