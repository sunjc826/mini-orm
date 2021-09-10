import { Comparator } from "./types";

export class CompositeComparator<T> {
  private orderBy: Array<Comparator<T>> = [];

  compareWith(comparator: Comparator<T>) {
    this.orderBy.push(comparator);
    return this;
  }

  compare(obj: T, other: T) {
    for (const comparator of this.orderBy) {
      const result = comparator(obj, other);
      if (result !== 0) {
        return result;
      }
    }
    return 0;
  }
}
